/**
 * The editor's draft: the place a person is working on, kept across a reload.
 *
 * ## Why the project is stored as an object rather than as a zip
 *
 * **`writePlaceZip` is not used here, and that is the point.** A zip is how a place travels
 * between people; a draft is a place staying put, and making it pay for the archive would put
 * `jszip` — which ADR 0021 keeps in a lazy chunk precisely so it is not in anyone's first paint —
 * on the path a keystroke takes. Structured clone already carries every part of a `PlaceProject`:
 * the manifest and the scripts are plain objects and strings, and an attachment is a
 * `Uint8Array`, which is exactly what it is.
 *
 * So the draft is the project, `isPlaceProject` is what it is checked against on the way back, and
 * the exporter is left to the two things that actually want an archive: the Save button and
 * publishing.
 *
 * ## Nothing here ever throws
 *
 * **Autosave failing must not break the editor.** `indexedDB` is missing in a browser with it
 * disabled, unavailable in some private modes, and absent under Node — so `put` resolves having
 * done nothing and `read` resolves to `null`, and a caller cannot tell the difference. A quota
 * failure is the same case: a draft is a few kilobytes, but a phone running out of space is a
 * thing that happens, and an editor that stops accepting edits because its backup failed has the
 * priorities backwards.
 */

import { isPlaceProject, type PlaceProject } from "../project";

/** The database, and the one object store in it. */
const DB_NAME = "spacescape";
const DB_VERSION = 1;
const STORE_NAME = "Store";

/** The key the working draft is kept under. */
export const DRAFT_KEY = "place-draft";

/**
 * The database handle, held between calls.
 *
 * **Because opening it is a round trip and every operation here needs it.** The promise is cached
 * rather than the database so that a failure is cached too — otherwise a browser with no
 * `indexedDB` would attempt the open on every keystroke's worth of debounce.
 */
let opening: Promise<IDBDatabase | null> | undefined;

/** Whether there is anywhere to keep anything, asked once and remembered. */
export const available = (): boolean => typeof indexedDB !== "undefined";

const open = (): Promise<IDBDatabase | null> => {
  if (!available()) return Promise.resolve(null);
  if (opening !== undefined) return opening;

  opening = new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event: Event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    // **Blocked as well as failed**, and both resolve to nothing: another tab of this application
    // holds an older version open, and waiting for it to close would hang the one trying to save
    // somebody's work.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return opening;
};

/** Keeps the working draft, replacing whatever was there. */
export const saveDraft = async (project: PlaceProject): Promise<void> => {
  const db = await open();
  if (db === null) return;
  await new Promise<void>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(project, DRAFT_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};

/**
 * The draft a reload found, or `null` when there is none, nowhere to look, or something that is
 * not a place.
 *
 * **A read failure is `null` for the same reason a write failure is silent**, and a caller that
 * treated "the database is broken" as "you had no work" would behave exactly as it should. The
 * check on the way out is `isPlaceProject`'s rather than this module's: a draft stored by a build
 * of this engine whose manifest shape has since changed should be refused, and refused by the one
 * predicate that knows what a place is.
 */
export const readDraft = async (): Promise<PlaceProject | null> => {
  const db = await open();
  if (db === null) return null;
  const value = await new Promise<unknown>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(DRAFT_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
  return isPlaceProject(value) ? value : null;
};

/** Throws the draft away, which is what "New" means for work nobody asked to keep. */
export const forgetDraft = async (): Promise<void> => {
  const db = await open();
  if (db === null) return;
  await new Promise<void>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(DRAFT_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};

/**
 * Forgets the cached handle, for a test that wants the module to start from nothing.
 *
 * **Not a close, because nothing here opens a connection it is finished with** — the cached handle
 * is reused for the life of the page on purpose.
 */
export const release = (): void => {
  opening = undefined;
};
