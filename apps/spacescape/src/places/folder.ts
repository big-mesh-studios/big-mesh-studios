/**
 * A place saved into a folder the person chose, and read back from one.
 *
 * ## Why a folder and a zip are two readers of the same shape
 *
 * **The zip is how a place travels; a folder is how it sits in a git working tree.** The manifest
 * and the files a manifest names are identical in both, and `PlaceProject` is already the one
 * shape the zip and the record convert to. This module is the third conversion: the editor hands
 * it a project and it writes the tree, or it reads the tree and hands the editor a project.
 *
 * **The folder is allowed to hold more than the place.** A repository has a `README`, a
 * `package.json`, a `vite.config.ts`; refusing every undeclared file the way the zip loader does
 * would refuse most repositories. Only the manifest and the files it names are read, and only
 * those are written or deleted. The manifest's own lists remain the source of truth.
 *
 * ## What is never touched
 *
 * **`.git`, a `README`, and every file the manifest did not name.** A save writes the manifest and
 * the declared files, then deletes only files an *earlier* version of the manifest named and this
 * one does not. A repository's own files are not this module's business.
 *
 * ## Permission is checked before a write
 *
 * A handle stored across a reload comes back with `"prompt"` permission, and `requestPermission`
 * has to be reached from a user gesture. The callers in `app.tsx` therefore open the picker on a
 * command or a click, which grants read/write for the session; this module still checks rather
 * than assuming, because a handle can be denied by the person at any time.
 */

import { MAX_PLACE_SOURCE } from "./limits";
import {
  isPlaceManifest,
  isSafePathName,
  MAX_PLACE_LEVEL_CHARS,
  MAX_PLACE_MODEL_BYTES,
  MAX_PLACE_SOUND_BYTES,
  MAX_PLACE_SOUND_BYTES_TOTAL,
  PLACE_MANIFEST_FILE,
  type PlaceManifest,
} from "./place-file";
import { isPlaceProject, type PlaceProject } from "./project";

/** The writable half of a file handle, as the save path needs it. */
export interface FolderWritable {
  write(data: string | Uint8Array): Promise<void>;
  close(): Promise<void>;
}

/** The file half of a directory handle, as the save path needs it. */
export interface FolderFile {
  getFile(): Promise<File>;
  createWritable(): Promise<FolderWritable>;
}

/**
 * The directory methods this module uses, declared structurally.
 *
 * **Narrower than `FileSystemDirectoryHandle`, because a test can then stand a map in for a
 * folder** without implementing the rest of the File System Access surface. A real handle is
 * cast at the picker boundary, where the browser is the only thing that produced it.
 */
export interface FolderHandle {
  readonly name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FolderFile>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FolderHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission?(descriptor?: {
    mode?: "read" | "readwrite";
  }): Promise<PermissionState>;
  requestPermission?(descriptor?: {
    mode?: "read" | "readwrite";
  }): Promise<PermissionState>;
}

/** How a folder is opened: for reading, or for reading and writing. */
export type FolderMode = "read" | "readwrite";

/** What the picker returns, which is the browser's wider handle. */
type FolderPicker = (options?: {
  id?: string;
  mode?: FolderMode;
}) => Promise<FileSystemDirectoryHandle>;

/** What the save wrote, for the line the console prints. */
export interface FolderSaveResult {
  /** Files written, including `manifest.json`. */
  readonly written: number;
  /** Files an earlier manifest named that this project no longer holds. */
  readonly deleted: number;
}

/** The database the chosen folder is kept in, between saves and across reloads. */
const DB_NAME = "spacescape-folder";
const STORE_NAME = "folders";
const HANDLE_KEY = "last";

/** The database handle, held between calls, and `null` when this browser has no IndexedDB. */
let opening: Promise<IDBDatabase | null> | undefined;

/** The handle last chosen or remembered, so a click can use it without an IndexedDB await. */
let remembered: FolderHandle | null = null;
let rememberedLoaded = false;

/** A failure as the one line a caller can print. */
const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/**
 * Whether the folder looks like a git working tree.
 *
 * **Both shapes `.git` takes**, because a worktree and a submodule use a file with that name
 * rather than a directory. A folder without one is still a perfectly good place to save; it just
 * is not yet somewhere a push can make the save durable, and the status line says so.
 */
export const folderLooksLikeGit = async (
  folder: FolderHandle,
): Promise<boolean> => {
  try {
    await folder.getDirectoryHandle(".git");
    return true;
  } catch {
    // A directory lookup can fail because `.git` is a file, or because the name is not there;
    // the file lookup below tells those apart.
  }
  try {
    await folder.getFileHandle(".git");
    return true;
  } catch {
    return false;
  }
};

/** Whether a failed lookup means "there is nothing here" rather than "I could not look". */
const isMissing = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "NotFoundError";

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
    // **A folder that cannot be remembered is still usable for this session**, so every storage
    // failure resolves to null and the caller keeps the in-memory handle.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return opening;
};

/** The remembered handle without an await, for a click that must open the picker immediately. */
export const cachedFolder = (): FolderHandle | null => remembered;

/**
 * Keeps `handle` as the folder future saves go to, in memory now and in IndexedDB for a reload.
 *
 * **The in-memory copy is set before the database write and is not rolled back if the write
 * fails.** A browser that refuses to clone a handle can still save to the folder this session;
 * the cost is picking it again after a reload, not losing the save.
 */
export const rememberFolder = async (
  handle: FolderHandle,
): Promise<boolean> => {
  remembered = handle;
  rememberedLoaded = true;

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

/**
 * The folder chosen before a reload, or null when there is none.
 *
 * **Read once and cached**, because a click that follows must not spend its user activation on an
 * IndexedDB round trip before deciding whether to open the picker.
 */
export const restoredFolder = async (): Promise<FolderHandle | null> => {
  if (rememberedLoaded) return remembered;

  const db = await openDatabase();
  if (db === null) {
    rememberedLoaded = true;
    return null;
  }

  const handle = await new Promise<FolderHandle | null>((resolve) => {
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

  // **A choice made while the read was in flight wins.** Picking a new folder calls
  // `rememberFolder`, which sets `rememberedLoaded` before its own await; overwriting that with
  // the older database value would send the next save to the folder the person just replaced.
  if (!rememberedLoaded) {
    remembered = handle;
    rememberedLoaded = true;
  }
  return remembered;
};

/** Forgets the remembered folder, in memory and in the database. */
export const forgetFolder = async (): Promise<void> => {
  remembered = null;
  rememberedLoaded = true;

  const db = await openDatabase();
  if (db === null) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
};

/** Whether this browser exposes the directory picker at all. */
export const hasFolderPicker = (): boolean =>
  typeof (window as unknown as { showDirectoryPicker?: unknown })
    .showDirectoryPicker === "function";

/**
 * Asks the person for a folder, or resolves to null when they dismiss the picker.
 *
 * **The picker is called before the first `await`**, so a console command or a click still has
 * the transient activation the browser requires. A caller that awaits something first will get a
 * `SecurityError` rather than a picker.
 *
 * @throws When this browser has no directory picker, or the picker fails for a reason other than
 *   dismissal.
 */
export const pickFolder = async (
  mode: FolderMode,
): Promise<FolderHandle | null> => {
  const picker = (window as unknown as { showDirectoryPicker?: FolderPicker })
    .showDirectoryPicker;

  if (typeof picker !== "function") {
    throw new Error("this browser does not expose a folder picker");
  }

  try {
    const handle = await picker({ id: "spacescape-place", mode });
    return handle as unknown as FolderHandle;
  } catch (error) {
    // **A dismissed picker is a value, not a failure.** The console's pending line has to settle
    // either way, and "no folder chosen" is the sentence a person can act on.
    if (error instanceof DOMException && error.name === "AbortError")
      return null;
    throw error;
  }
};

/**
 * Read or read/write permission for `folder`, asking only when the browser says it is needed.
 *
 * @throws When the person refuses, or the request cannot be made from this gesture.
 */
const requirePermission = async (
  folder: FolderHandle,
  mode: FolderMode,
): Promise<void> => {
  if (typeof folder.queryPermission !== "function") return;

  let state = await folder.queryPermission({ mode });
  if (state === "granted") return;
  if (state === "denied") {
    throw new Error(`permission to ${mode} "${folder.name}" was denied`);
  }

  if (typeof folder.requestPermission !== "function") {
    throw new Error(`"${folder.name}" needs permission to be ${mode}`);
  }

  try {
    state = await folder.requestPermission({ mode });
  } catch (error) {
    throw new Error(
      `permission to ${mode} "${folder.name}" was not granted: ${describeError(error)}`,
    );
  }
  if (state !== "granted") {
    throw new Error(`permission to ${mode} "${folder.name}" was not granted`);
  }
};

/**
 * Asks for permission to read or write `folder`, for a caller that wants to know before saving.
 *
 * **The save path asks again**, but by then the answer is cached by the browser and costs no
 * prompt. Exported because the editor decides whether a remembered folder is still usable before
 * it offers to save into it.
 */
export const ensureFolderPermission = async (
  folder: FolderHandle,
  mode: FolderMode,
): Promise<void> => requirePermission(folder, mode);

/** A path split into the directory names leading to it and its own name. */
const splitPath = (name: string): { directories: string[]; file: string } => {
  if (!isSafePathName(name)) {
    throw new Error(`"${name}" is not a path this can read or write`);
  }
  const parts = name.split("/");
  const file = parts.pop();
  if (file === undefined) {
    throw new Error(`"${name}" is not a file name`);
  }
  return { directories: parts, file };
};

/** The directory holding `name`, creating it on a write and refusing to on a read. */
const parentOf = async (
  root: FolderHandle,
  name: string,
  create: boolean,
): Promise<{ directory: FolderHandle; file: string }> => {
  const { directories, file } = splitPath(name);
  let directory = root;
  for (const part of directories) {
    directory = await directory.getDirectoryHandle(
      part,
      create ? { create: true } : undefined,
    );
  }
  return { directory, file };
};

const readText = async (root: FolderHandle, name: string): Promise<string> => {
  const { directory, file } = await parentOf(root, name, false);
  const handle = await directory.getFileHandle(file);
  return (await handle.getFile()).text();
};

const readBytes = async (
  root: FolderHandle,
  name: string,
): Promise<Uint8Array> => {
  const { directory, file } = await parentOf(root, name, false);
  const handle = await directory.getFileHandle(file);
  return new Uint8Array(await (await handle.getFile()).arrayBuffer());
};

const writeText = async (
  root: FolderHandle,
  name: string,
  text: string,
): Promise<void> => {
  const { directory, file } = await parentOf(root, name, true);
  const handle = await directory.getFileHandle(file, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
};

const writeBytes = async (
  root: FolderHandle,
  name: string,
  bytes: Uint8Array,
): Promise<void> => {
  const { directory, file } = await parentOf(root, name, true);
  const handle = await directory.getFileHandle(file, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(bytes);
  } finally {
    await writable.close();
  }
};

/** Removes one declared file. A file that is already gone is not an error. */
const removeFile = async (
  root: FolderHandle,
  name: string,
): Promise<boolean> => {
  try {
    const { directory, file } = await parentOf(root, name, false);
    await directory.removeEntry(file);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
};

/** The manifest at the folder's root, or null when there is none. */
const readManifest = async (
  folder: FolderHandle,
): Promise<PlaceManifest | null> => {
  let text: string;
  try {
    text = await readText(folder, PLACE_MANIFEST_FILE);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`"${PLACE_MANIFEST_FILE}" in "${folder.name}" is not JSON`);
  }

  if (!isPlaceManifest(value)) {
    throw new Error(
      `"${PLACE_MANIFEST_FILE}" in "${folder.name}" is not a place this can open`,
    );
  }
  return value;
};

/**
 * Writes `project` into `folder` and removes the files an earlier manifest named and this one
 * does not.
 *
 * **The manifest is written last.** A failure halfway through leaves the previous manifest in
 * place and the new files undeclared, which is recoverable; writing the manifest first would
 * leave a folder that claims files it does not hold.
 *
 * **A folder already holding a different place is refused rather than overwritten.** Choosing a
 * repository root by mistake should not replace the place that was there, and a same-named folder
 * is the one case where the user's intent is unambiguous.
 *
 * @returns How many files were written and how many stale declarations were removed.
 * @throws When the project is incoherent, the folder holds a different place, permission is
 *   refused, or a file cannot be written.
 */
export const savePlaceToFolder = async (
  folder: FolderHandle,
  project: PlaceProject,
): Promise<FolderSaveResult> => {
  if (!isPlaceProject(project)) {
    throw new Error(
      "this project is not one a place can be written from — its manifest and its files disagree",
    );
  }

  const declared = [
    ...project.manifest.scripts,
    ...(project.manifest.models ?? []),
    ...(project.manifest.levels ?? []),
    ...(project.manifest.sounds ?? []),
  ];

  if (declared.includes(PLACE_MANIFEST_FILE)) {
    throw new Error(
      `"${PLACE_MANIFEST_FILE}" is the place's manifest, not a file it can carry`,
    );
  }
  for (const name of declared) {
    if (!isSafePathName(name)) {
      throw new Error(
        `the manifest names "${name}", which is not a path this can write`,
      );
    }
  }

  await requirePermission(folder, "readwrite");

  const existing = await readManifest(folder);
  if (existing !== null && existing.name !== project.manifest.name) {
    throw new Error(
      `"${folder.name}" already holds "${existing.name}", not "${project.manifest.name}" — choose an empty folder or the place's own folder`,
    );
  }

  const previous =
    existing === null
      ? []
      : [
          ...existing.scripts,
          ...(existing.models ?? []),
          ...(existing.levels ?? []),
          ...(existing.sounds ?? []),
        ];

  let written = 0;
  for (const [name, source] of Object.entries(project.scripts)) {
    await writeText(folder, name, source);
    written += 1;
  }
  for (const [name, bytes] of Object.entries(project.models)) {
    await writeBytes(folder, name, bytes);
    written += 1;
  }
  for (const [name, text] of Object.entries(project.levels)) {
    await writeText(folder, name, text);
    written += 1;
  }
  for (const [name, bytes] of Object.entries(project.sounds ?? {})) {
    await writeBytes(folder, name, bytes);
    written += 1;
  }

  const manifest: PlaceManifest = {
    ...project.manifest,
    scripts: Object.keys(project.scripts),
    ...(Object.keys(project.models).length > 0
      ? { models: Object.keys(project.models) }
      : {}),
    ...(Object.keys(project.levels).length > 0
      ? { levels: Object.keys(project.levels) }
      : {}),
    ...(Object.keys(project.sounds ?? {}).length > 0
      ? { sounds: Object.keys(project.sounds ?? {}) }
      : {}),
  };
  await writeText(
    folder,
    PLACE_MANIFEST_FILE,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  written += 1;

  let deleted = 0;
  for (const name of previous) {
    if (declared.includes(name)) continue;
    if (await removeFile(folder, name)) deleted += 1;
  }

  return { written, deleted };
};

/**
 * Reads the place in `folder`, using the manifest as the whole of what belongs to it.
 *
 * **Undeclared files are ignored, including undeclared `.ts`.** The zip loader refuses an
 * undeclared script because an archive's manifest and contents were written by two tools and
 * "what is actually here" should be answerable. A repository is different: `vite.config.ts` and
 * `src/` are ordinary neighbours of a place, and refusing them would make a folder that is also a
 * project unusable. The manifest still names every file that runs.
 *
 * @throws When there is no manifest, it is not a place this can open, it names a file the folder
 *   does not hold, or a file exceeds the same limits a zip is held to.
 */
export const loadPlaceFromFolder = async (
  folder: FolderHandle,
): Promise<PlaceProject> => {
  await requirePermission(folder, "read");

  const manifest = await readManifest(folder);
  if (manifest === null) {
    throw new Error(
      `no "${PLACE_MANIFEST_FILE}" at the root of "${folder.name}"`,
    );
  }

  const scripts: Record<string, string> = {};
  let characters = 0;
  for (const name of manifest.scripts) {
    let source: string;
    try {
      source = await readText(folder, name);
    } catch (error) {
      if (isMissing(error)) {
        throw new Error(
          `the manifest names "${name}", which the folder does not hold`,
        );
      }
      throw error;
    }
    characters += source.length;
    if (characters > MAX_PLACE_SOURCE) {
      throw new Error(
        `the place's source is over the ${MAX_PLACE_SOURCE} character limit`,
      );
    }
    scripts[name] = source;
  }

  const models: Record<string, Uint8Array> = {};
  for (const name of manifest.models ?? []) {
    let bytes: Uint8Array;
    try {
      bytes = await readBytes(folder, name);
    } catch (error) {
      if (isMissing(error)) {
        throw new Error(
          `the manifest names "${name}", which the folder does not hold`,
        );
      }
      throw error;
    }
    if (bytes.byteLength > MAX_PLACE_MODEL_BYTES) {
      throw new Error(
        `"${name}" is over the ${MAX_PLACE_MODEL_BYTES} byte limit on one attachment`,
      );
    }
    models[name] = bytes;
  }

  const levels: Record<string, string> = {};
  for (const name of manifest.levels ?? []) {
    let text: string;
    try {
      text = await readText(folder, name);
    } catch (error) {
      if (isMissing(error)) {
        throw new Error(
          `the manifest names "${name}", which the folder does not hold`,
        );
      }
      throw error;
    }
    if (text.length > MAX_PLACE_LEVEL_CHARS) {
      throw new Error(
        `"${name}" is over the ${MAX_PLACE_LEVEL_CHARS} character limit on one level`,
      );
    }
    levels[name] = text;
  }

  const sounds: Record<string, Uint8Array> = {};
  let totalSoundBytes = 0;
  for (const name of manifest.sounds ?? []) {
    let bytes: Uint8Array;
    try {
      bytes = await readBytes(folder, name);
    } catch (error) {
      if (isMissing(error)) {
        throw new Error(
          `the manifest names "${name}", which the folder does not hold`,
        );
      }
      throw error;
    }
    if (bytes.byteLength > MAX_PLACE_SOUND_BYTES) {
      throw new Error(
        `"${name}" is over the ${MAX_PLACE_SOUND_BYTES} byte limit on one sound`,
      );
    }
    totalSoundBytes += bytes.byteLength;
    if (totalSoundBytes > MAX_PLACE_SOUND_BYTES_TOTAL) {
      throw new Error(
        `the place's sounds are over the ${MAX_PLACE_SOUND_BYTES_TOTAL} byte total limit`,
      );
    }
    sounds[name] = bytes;
  }

  const project: PlaceProject = {
    manifest,
    scripts,
    models,
    levels,
    ...(Object.keys(sounds).length > 0 ? { sounds } : {}),
  };
  if (!isPlaceProject(project)) {
    throw new Error(
      `"${folder.name}" holds a manifest and files that disagree — no place can be read from it`,
    );
  }
  return project;
};
