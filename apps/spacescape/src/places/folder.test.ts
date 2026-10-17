/**
 * Saving a place into a folder and reading it back.
 *
 * ## What a map stands in for
 *
 * **`FolderHandle` is declared structurally**, so these tests are a directory tree in two maps
 * rather than a browser. That is the point of the seam: the save and load rules — the manifest
 * last, stale declarations removed, a different place refused — are testable without a picker,
 * a permission prompt or a device.
 *
 * ## What is not here
 *
 * The picker itself, and the Android permission prompt. Those are browser behaviour, exercised
 * by `/folder:probe` on a device; no amount of `jsdom` makes them real.
 */

import { describe, expect, it } from "vitest";

import {
  folderLooksLikeGit,
  loadPlaceFromFolder,
  savePlaceToFolder,
  type FolderFile,
  type FolderHandle,
  type FolderWritable,
} from "./folder";
import type { PlaceProject } from "./project";

/** One file in the fake tree. Writes land on close, as the real writable does. */
class FakeFile implements FolderFile {
  constructor(
    private readonly folder: FakeFolder,
    private readonly name: string,
  ) {}

  async getFile(): Promise<File> {
    const bytes = this.folder.files.get(this.name) ?? new Uint8Array();
    return new File([bytes as unknown as BlobPart], this.name);
  }

  async createWritable(): Promise<FolderWritable> {
    let pending = new Uint8Array();
    return {
      write: async (data) => {
        pending =
          typeof data === "string"
            ? new TextEncoder().encode(data)
            : data.slice();
      },
      close: async () => {
        this.folder.files.set(this.name, pending);
      },
    };
  }
}

/** A directory in the fake tree, with just the methods the save path uses. */
class FakeFolder implements FolderHandle {
  readonly files = new Map<string, Uint8Array>();
  readonly folders = new Map<string, FakeFolder>();

  constructor(
    readonly name = "Spacescape",
    private readonly permission: PermissionState = "granted",
  ) {}

  async getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FolderFile> {
    if (this.folders.has(name)) {
      throw new DOMException(`${name} is a directory`, "TypeMismatchError");
    }
    if (!this.files.has(name)) {
      if (options?.create !== true) {
        throw new DOMException(`${name} is not here`, "NotFoundError");
      }
      this.files.set(name, new Uint8Array());
    }
    return new FakeFile(this, name);
  }

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FolderHandle> {
    const existing = this.folders.get(name);
    if (existing !== undefined) return existing;
    if (this.files.has(name)) {
      throw new DOMException(`${name} is a file`, "TypeMismatchError");
    }
    if (options?.create !== true) {
      throw new DOMException(`${name} is not here`, "NotFoundError");
    }
    const child = new FakeFolder(name, this.permission);
    this.folders.set(name, child);
    return child;
  }

  async removeEntry(
    name: string,
    options?: { recursive?: boolean },
  ): Promise<void> {
    if (this.files.delete(name)) return;

    const child = this.folders.get(name);
    if (child === undefined) {
      throw new DOMException(`${name} is not here`, "NotFoundError");
    }
    if (
      options?.recursive !== true &&
      (child.files.size > 0 || child.folders.size > 0)
    ) {
      throw new DOMException(`${name} is not empty`, "TypeMismatchError");
    }
    this.folders.delete(name);
  }

  async queryPermission(): Promise<PermissionState> {
    return this.permission;
  }

  async requestPermission(): Promise<PermissionState> {
    return this.permission;
  }
}

/** A coherent project, with the manifest's lists derived from what it holds. */
const project = (over: Partial<PlaceProject> = {}): PlaceProject => {
  const scripts = over.scripts ?? { "main.ts": "export {};" };
  const models = over.models ?? {};
  const levels = over.levels ?? {};
  return {
    manifest: {
      name: "harbour",
      seed: 1,
      entry: Object.keys(scripts)[0] ?? "main.ts",
      scripts: Object.keys(scripts),
      ...(Object.keys(models).length > 0
        ? { models: Object.keys(models) }
        : {}),
      ...(Object.keys(levels).length > 0
        ? { levels: Object.keys(levels) }
        : {}),
      ...over.manifest,
    },
    scripts,
    models,
    levels,
  };
};

describe("saving a place into a folder", () => {
  it("writes the tree, including nested paths, and reads it back", async () => {
    const folder = new FakeFolder();
    const withAttachments = project({
      manifest: {
        name: "harbour",
        seed: 7,
        entry: "src/main.ts",
        scripts: ["src/main.ts"],
        models: ["props/lamp.sdfmod"],
        levels: ["rooms/hall.json"],
      },
      scripts: { "src/main.ts": "export const harbour = 1;\n" },
      models: { "props/lamp.sdfmod": new Uint8Array([1, 2, 3, 4]) },
      levels: { "rooms/hall.json": '{"items":[]}\n' },
    });

    const saved = await savePlaceToFolder(folder, withAttachments);

    // One script, one model, one level, and the manifest.
    expect(saved).toEqual({ written: 4, deleted: 0 });
    expect(folder.folders.get("src")?.files.has("main.ts")).toBe(true);
    expect(folder.folders.get("props")?.files.has("lamp.sdfmod")).toBe(true);
    expect(folder.folders.get("rooms")?.files.has("hall.json")).toBe(true);

    await expect(loadPlaceFromFolder(folder)).resolves.toEqual(withAttachments);
  });

  it("removes a file the previous manifest named and this one does not", async () => {
    const folder = new FakeFolder();
    await savePlaceToFolder(
      folder,
      project({
        scripts: {
          "main.ts": "export {};",
          "extra.ts": "export const extra = 1;",
        },
      }),
    );

    const saved = await savePlaceToFolder(folder, project());

    expect(saved.deleted).toBe(1);
    expect(folder.files.has("extra.ts")).toBe(false);
    expect((await loadPlaceFromFolder(folder)).scripts).toEqual({
      "main.ts": "export {};",
    });
  });

  it("refuses to replace a different place already in the folder", async () => {
    const folder = new FakeFolder();
    await savePlaceToFolder(
      folder,
      project({
        manifest: {
          name: "other",
          seed: 2,
          entry: "main.ts",
          scripts: ["main.ts"],
        },
      }),
    );

    await expect(savePlaceToFolder(folder, project())).rejects.toThrow(
      /already holds "other"/,
    );
  });

  it("ignores files the manifest does not name, including tooling scripts", async () => {
    const folder = new FakeFolder();
    await savePlaceToFolder(folder, project());
    folder.files.set("README.md", new TextEncoder().encode("# harbour"));
    folder.files.set("vite.config.ts", new TextEncoder().encode("export {};"));

    await expect(loadPlaceFromFolder(folder)).resolves.toEqual(project());
  });

  it("names a declared file the folder does not hold", async () => {
    const folder = new FakeFolder();
    await savePlaceToFolder(folder, project());
    folder.files.delete("main.ts");

    await expect(loadPlaceFromFolder(folder)).rejects.toThrow(
      /"main.ts", which the folder does not hold/,
    );
  });

  it("reports a refused permission rather than writing", async () => {
    const folder = new FakeFolder("Spacescape", "denied");

    await expect(savePlaceToFolder(folder, project())).rejects.toThrow(
      /denied/,
    );
    expect(folder.files.size).toBe(0);
  });

  it("refuses a manifest that is not a place", async () => {
    const folder = new FakeFolder();
    folder.files.set(
      "manifest.json",
      new TextEncoder().encode('{"name":"not a place"}'),
    );

    await expect(loadPlaceFromFolder(folder)).rejects.toThrow(
      /not a place this can open/,
    );
  });
});

describe("recognising a repository", () => {
  it("sees a .git directory", async () => {
    const folder = new FakeFolder();
    await folder.getDirectoryHandle(".git", { create: true });

    await expect(folderLooksLikeGit(folder)).resolves.toBe(true);
  });

  it("sees the .git file a worktree or submodule uses", async () => {
    const folder = new FakeFolder();
    await folder.getFileHandle(".git", { create: true });

    await expect(folderLooksLikeGit(folder)).resolves.toBe(true);
  });

  it("does not invent a repository", async () => {
    await expect(folderLooksLikeGit(new FakeFolder())).resolves.toBe(false);
  });
});
