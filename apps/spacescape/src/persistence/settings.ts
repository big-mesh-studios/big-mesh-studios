/**
 * A tiny key/value store for preferences that should survive a reload.
 *
 * ## Why this is separate from the place draft
 *
 * **Because a preference and a draft are different lifetimes.** A draft is a thing a person is
 * working on, replaced on every keystroke's worth of debounce and thrown away when they press New;
 * a setting is a choice about how the application behaves — the cloud quality a machine can
 * afford — that is written once and read on the next visit. They share the one IndexedDB this
 * application opens (`places/editor/drafts.ts`), under different keys, rather than a second
 * database for a handful of strings.
 *
 * ## Nothing here ever throws
 *
 * **A settings failure must not break the application**, for the reasons `drafts.ts` gives in
 * full: `indexedDB` is missing in some private modes and under Node, and a quota failure should
 * cost the preference rather than the session. Every operation resolves to `undefined`/no-op when
 * there is nowhere to keep anything, and a caller cannot tell the difference — which is the same
 * bargain the draft storage makes.
 */

/** The database, shared with the place draft. The store is the same one object store. */
const DB_NAME = "spacescape";
const DB_VERSION = 1;
const STORE_NAME = "Store";

/**
 * The database handle, held between calls.
 *
 * **The promise is cached rather than the database**, so a browser without `indexedDB` does not
 * retry the open on every read — the same arrangement `drafts.ts` uses.
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
    // holds an older version open, and waiting for it would hang whoever is trying to read a
    // preference.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return opening;
};

/**
 * A value kept under `key`, or `undefined` when there is none, nowhere to look, or the read failed.
 *
 * **Not validated here**, because this module does not know what any key means: the caller owns
 * the shape of what it stored, exactly as `CloudQuality` is checked at the call site in `app.tsx`.
 */
export const readSetting = async <T>(key: string): Promise<T | undefined> => {
  const db = await open();
  if (db === null) return undefined;
  const value = await new Promise<unknown>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
  return value as T | undefined;
};

/** Keeps `value` under `key`, replacing whatever was there. */
export const writeSetting = async (
  key: string,
  value: unknown,
): Promise<void> => {
  const db = await open();
  if (db === null) return;
  await new Promise<void>((resolve) => {
    const request = db
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};

/**
 * Forgets the cached handle, for a test that wants the module to start from nothing.
 *
 * **Not a close**, for the reason `drafts.ts` gives: the cached handle is reused for the life of
 * the page on purpose.
 */
export const release = (): void => {
  opening = undefined;
};
