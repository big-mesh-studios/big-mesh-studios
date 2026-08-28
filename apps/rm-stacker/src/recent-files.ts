// The files on disk this editor has opened or saved, so they can be shown
// alongside published models rather than being forgotten the moment the page
// reloads.
//
// What is kept is the handle itself — a live reference to a file on disk, which
// the browser can store and hand back on a later visit. Permission to read
// through it does not last that long: after a reload the browser will ask
// again, and only in answer to something the person did. That is why a picture
// of the model is kept beside the handle rather than being drawn by reading the
// file: a listing can then show every file it knows about without opening any
// of them, and the file is only ever read when somebody asks for it by name.
//
// Only browsers with the file system access interface reach any of this. Where
// it is missing, opening a file yields its contents and no handle, so there is
// nothing to remember and the listing shows published models alone.
import { Dimensions3D } from "@big-mesh-studios/maths";
import { loadValueFromDB, saveValueToDB } from "./load-save";

// Asking after and asking for permission on a handle are part of the file
// system access interface, which TypeScript's own description of the browser
// does not yet cover.
declare global {
  interface FileSystemHandle {
    queryPermission(descriptor?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
    requestPermission(descriptor?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
  }
}

const RECENT_FILES_KEY = "recentFiles";

/** How many files are remembered before the least recently opened is dropped. */
const REMEMBERED = 60;

export interface RecentFile {
  /** This editor's own name for the entry; a handle cannot be compared cheaply. */
  id: string;
  handle: FileSystemFileHandle;
  /** The file's name as it was when last seen, for showing without reading it. */
  name: string;
  /**
   * The model's picture as of the last time this editor wrote or read the file,
   * absent when there was nothing to draw it with.
   */
  thumbnail?: Uint8Array;
  dimensions: Dimensions3D;
  lastOpenedAt: number;
}

/** Whether this browser can hold on to a file between visits at all. */
export function remembersFiles(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

/** Every remembered file, most recently opened first. */
export async function listRecentFiles(): Promise<RecentFile[]> {
  const stored = await loadValueFromDB<RecentFile[]>(RECENT_FILES_KEY);

  if (stored === null || !Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter((entry) => entry?.handle !== undefined)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

/**
 * Records that `handle` was just opened or written, replacing what was known
 * about it. The same file opened twice is one entry, not two, which is what
 * `isSameEntry` is for — two handles to one file are different objects.
 */
export async function rememberFile(entry: {
  handle: FileSystemFileHandle;
  thumbnail?: Uint8Array;
  dimensions: Dimensions3D;
}): Promise<RecentFile> {
  const known = await listRecentFiles();
  const same = await Promise.all(
    known.map((other) => entry.handle.isSameEntry(other.handle)),
  );
  const existing = known.find((_, index) => same[index]);
  const remembered: RecentFile = {
    id: existing?.id ?? crypto.randomUUID(),
    handle: entry.handle,
    name: entry.handle.name,
    thumbnail: entry.thumbnail,
    dimensions: entry.dimensions,
    lastOpenedAt: Date.now(),
  };

  await saveValueToDB(RECENT_FILES_KEY, [
    remembered,
    ...known.filter((_, index) => !same[index]).slice(0, REMEMBERED - 1),
  ]);

  return remembered;
}

/** Drops one file from the listing. The file on disk is untouched. */
export async function forgetFile(id: string): Promise<void> {
  const known = await listRecentFiles();
  await saveValueToDB(
    RECENT_FILES_KEY,
    known.filter((entry) => entry.id !== id),
  );
}

/**
 * Asks for permission to read `handle`, which the browser only grants in answer
 * to something the person did — so this belongs in a click, not in a listing.
 */
export async function mayRead(handle: FileSystemFileHandle): Promise<boolean> {
  if ((await handle.queryPermission({ mode: "read" })) === "granted") {
    return true;
  }
  return (await handle.requestPermission({ mode: "read" })) === "granted";
}
