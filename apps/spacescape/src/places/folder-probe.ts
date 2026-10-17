/**
 * A one-shot probe for the File System Access directory picker.
 *
 * ## Why this exists
 *
 * **Because browser-support tables disagree about Android, and only the device can settle it.** A
 * browser may expose `showDirectoryPicker` and still refuse the picker, may open a picker that
 * cannot reach a useful folder, or may grant read/write and then fail on the first write. The
 * probe answers all four in one command, and leaves a handle in IndexedDB so a reload can answer
 * the fifth: whether permission survives the session.
 *
 * ## It writes only into its own folder
 *
 * **`.spacescape-probe` inside the chosen folder, removed again afterwards.** Choosing a repo root
 * should not replace `manifest.json`, and a probe that wrote one would be a probe nobody could
 * safely run twice. The folder is created, filled with a coherent pair of files, read back, and
 * deleted in `finally`.
 *
 * ## Nothing here throws
 *
 * The probe is a diagnostic: a refusal is the answer, not a failure. Every step reports what it
 * saw and carries on only where carrying on is meaningful, so the console gets one complete
 * report rather than a `failed: …` line that hides which of the five steps broke.
 */

/** The folder the probe creates inside the chosen directory, and removes again. */
const PROBE_DIR = ".spacescape-probe";

/** The probe place's two files. The manifest is valid, but nothing ever loads it. */
const PROBE_MANIFEST = {
  name: "folder probe",
  seed: 20261018,
  entry: "main.ts",
  scripts: ["main.ts"],
};
const PROBE_SOURCE = "export {};\n";

/** Where the picked handle is kept between a pick and a reload. */
const DB_NAME = "spacescape-folder-probe";
const STORE_NAME = "handles";
const HANDLE_KEY = "last";

/**
 * A directory handle plus the permission methods `lib.dom` does not declare.
 *
 * `queryPermission` and `requestPermission` are part of the File System Access API rather than
 * the older File System API the DOM types describe, so they are reached through this shape and
 * feature-detected at every call.
 */
type FolderHandle = FileSystemDirectoryHandle & {
  queryPermission?(descriptor?: {
    mode?: "read" | "readwrite";
  }): Promise<PermissionState>;
  requestPermission?(descriptor?: {
    mode?: "read" | "readwrite";
  }): Promise<PermissionState>;
};

/** The picker this browser may or may not expose. */
type FolderPicker = (options?: {
  id?: string;
  mode?: "read" | "readwrite";
}) => Promise<FolderHandle>;

/** Which half of the probe to run: choose a folder, or find the one chosen before a reload. */
export type FolderProbeMode = "pick" | "resume";

/** The window members the probe reads, none of which are in the DOM declarations. */
interface ProbeWindow {
  showDirectoryPicker?: FolderPicker;
  showOpenFilePicker?: unknown;
  showSaveFilePicker?: unknown;
}

/** A failure as the one line a console can use. */
const describeError = (error: unknown): string => {
  if (error instanceof DOMException) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
};

/** Whether a failed lookup means "there is nothing here" rather than "I could not look". */
const isMissing = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === "NotFoundError" || error.name === "TypeMismatchError");

/** The database handle, held between calls, and `null` when this browser has no IndexedDB. */
let opening: Promise<IDBDatabase | null> | undefined;

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (opening !== undefined) return opening;

  opening = new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    // **A probe that cannot store its handle has still answered the picker question**, so every
    // storage failure resolves rather than rejects and the report says which part was unavailable.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return opening;
};

/** Keeps `handle` for `/folder:probe:resume`, and says whether it was kept. */
const storeHandle = async (handle: FolderHandle): Promise<boolean> => {
  const db = await openDatabase();
  if (db === null) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

/** The handle kept by an earlier probe, or null when there is none. */
const readHandle = async (): Promise<FolderHandle | null> => {
  const db = await openDatabase();
  if (db === null) return null;

  return new Promise<FolderHandle | null>((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(HANDLE_KEY);
      request.onsuccess = () =>
        resolve((request.result as FolderHandle | undefined) ?? null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

/**
 * Writes `text` into `dir`, and closes the writable even when the write throws.
 *
 * **A stream left open holds the file**, and the next step of the probe would then fail with a
 * different error than the one that caused it.
 */
const writeText = async (
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string,
): Promise<void> => {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
};

const readText = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<string> => {
  const file = await dir.getFileHandle(name);
  return (await file.getFile()).text();
};

/**
 * Asks for read/write permission, reporting the state before and after.
 *
 * **`queryPermission` first, because a picker opened with `mode: "readwrite"` normally grants it**
 * and an unnecessary `requestPermission` is a second prompt. The request is still there for the
 * resume path, where a reload demotes the grant to `prompt`.
 */
const ensurePermission = async (
  handle: FolderHandle,
  lines: string[],
): Promise<boolean> => {
  if (typeof handle.queryPermission !== "function") {
    lines.push("  permission unavailable (queryPermission is missing)");
    return true;
  }

  let state = await handle.queryPermission({ mode: "readwrite" });
  lines.push(`  permission ${state}`);
  if (state === "granted") return true;

  if (typeof handle.requestPermission !== "function") {
    lines.push(
      "  permission request unavailable (requestPermission is missing)",
    );
    return false;
  }

  try {
    state = await handle.requestPermission({ mode: "readwrite" });
    lines.push(`  permission ${state} (after request)`);
    return state === "granted";
  } catch (error) {
    lines.push(`  permission request failed: ${describeError(error)}`);
    return false;
  }
};

/** Whether the chosen folder looks like a git working tree, by the two shapes `.git` takes. */
const detectGit = async (dir: FileSystemDirectoryHandle): Promise<string> => {
  try {
    await dir.getDirectoryHandle(".git");
    return "directory";
  } catch (error) {
    if (!isMissing(error)) return `unreadable (${describeError(error)})`;
  }

  try {
    await dir.getFileHandle(".git");
    return "file (worktree or submodule)";
  } catch (error) {
    if (!isMissing(error)) return `unreadable (${describeError(error)})`;
  }

  return "absent";
};

/**
 * Creates, fills, reads back and removes `.spacescape-probe`.
 *
 * **The manifest and script are the smallest coherent pair the zip format would accept**, so this
 * is a real test of nested-file writes rather than a single `writeFile` that stops at the first
 * permission boundary.
 */
const exerciseFolder = async (
  dir: FileSystemDirectoryHandle,
  lines: string[],
): Promise<void> => {
  let probe: FileSystemDirectoryHandle | undefined;

  try {
    probe = await dir.getDirectoryHandle(PROBE_DIR, { create: true });
    try {
      await writeText(probe, "manifest.json", JSON.stringify(PROBE_MANIFEST));
      await writeText(probe, "main.ts", PROBE_SOURCE);
      lines.push("  write      ok (manifest.json, main.ts)");

      const manifestBack = await readText(probe, "manifest.json");
      const sourceBack = await readText(probe, "main.ts");
      lines.push(
        `  read       ${
          manifestBack === JSON.stringify(PROBE_MANIFEST) &&
          sourceBack === PROBE_SOURCE
            ? "ok"
            : "mismatch"
        }`,
      );
    } finally {
      // **Files first, then the directory without `recursive`.** Android Chrome rejects a
      // recursive directory removal with `TypeMismatchError` even when the directory is ours and
      // empty, but removing the two files and then the now-empty directory works. The recursive
      // call is kept as the fallback for a browser where the other order is the one that works.
      let cleanup: string | undefined;
      try {
        for (const name of ["manifest.json", "main.ts"]) {
          await probe.removeEntry(name).catch((error: unknown) => {
            if (!isMissing(error)) throw error;
          });
        }
        try {
          await dir.removeEntry(PROBE_DIR);
        } catch (first) {
          // The fallback for a browser whose directory removal needs `recursive` even when the
          // directory is empty. If this also fails, the original error is the one worth showing.
          try {
            await dir.removeEntry(PROBE_DIR, { recursive: true });
          } catch {
            throw first;
          }
        }
        cleanup = "ok";
      } catch (error) {
        cleanup = `failed: ${describeError(error)}`;
      }
      lines.push(`  cleanup    ${cleanup ?? "not run"}`);
    }
  } catch (error) {
    lines.push(`  write      failed: ${describeError(error)}`);
  }
};

/** The user-agent line, last, because it is the longest and the least urgent. */
const userAgentLine = (): string => `  ua         ${navigator.userAgent}`;

/**
 * Runs the folder probe and returns the lines the console prints.
 *
 * **The picker is called before the first `await` in `pick` mode.** The console command arrives
 * from a keypress, and a directory picker needs that transient user activation; an `await` first
 * would spend it before the browser ever saw the picker call.
 *
 * @param mode - `"pick"` to choose a folder and test it, `"resume"` to find the one chosen before.
 */
export const runFolderProbe = async (
  mode: FolderProbeMode,
): Promise<string> => {
  const lines: string[] = ["folder picker probe"];
  const target = window as unknown as ProbeWindow;
  const picker = target.showDirectoryPicker;

  lines.push(
    `  api        showDirectoryPicker: ${typeof picker}; showOpenFilePicker: ${typeof target.showOpenFilePicker}; showSaveFilePicker: ${typeof target.showSaveFilePicker}`,
  );
  lines.push(`  secure     ${String(isSecureContext)}`);
  lines.push(`  origin     ${location.origin}`);

  let handle: FolderHandle | null = null;

  if (mode === "pick") {
    if (typeof picker !== "function") {
      lines.push(
        "  result     this browser does not expose a directory picker",
      );
      lines.push(userAgentLine());
      return lines.join("\n");
    }

    try {
      handle = await picker({ id: "spacescape-probe", mode: "readwrite" });
    } catch (error) {
      lines.push(`  picker     failed: ${describeError(error)}`);
      lines.push(userAgentLine());
      return lines.join("\n");
    }

    lines.push(`  folder     ${handle.name}`);
    const stored = await storeHandle(handle);
    lines.push(
      `  stored     ${
        stored
          ? "yes — reload, then run /folder:probe:resume"
          : "failed (no IndexedDB, or the handle was not cloneable)"
      }`,
    );
  } else {
    handle = await readHandle();
    if (handle === null) {
      lines.push(
        "  result     no stored folder — run /folder:probe first, in this browser",
      );
      lines.push(userAgentLine());
      return lines.join("\n");
    }
    lines.push(`  folder     ${handle.name} (restored)`);
  }

  const permitted = await ensurePermission(handle, lines);
  if (!permitted) {
    lines.push("  result     no read/write permission");
    lines.push(userAgentLine());
    return lines.join("\n");
  }

  await exerciseFolder(handle, lines);
  lines.push(`  .git       ${await detectGit(handle)}`);
  lines.push("  result     done");
  lines.push(userAgentLine());
  return lines.join("\n");
};
