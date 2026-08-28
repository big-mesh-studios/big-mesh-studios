// Where a model lives between visits: the browser's own database, holding the
// same zip the file format writes plus the undo history and view state that
// only mean anything inside this editor.
import { RGBA } from "@big-mesh-studios/maths";
import { load, save } from "@big-mesh-studios/stacker/format";
import type { Sides } from "@big-mesh-studios/stacker/renderer";
import { Command } from "./command/Command";
import { PreviewState } from "./types";

const DB_NAME = "rm-stacker";
const DB_VERSION = 2;
const STORE_NAME = "Store";

const DB_KEYS = {
  zipFileData: "zipFileData",
  undoRedoData: "undoRedoData",
  preview: "preview",
} as const;

type CommandStack = { command: Command; description: string }[];

export async function loadFromIndexedDB(fallbackPalette: RGBA[]): Promise<{
  sides: Sides;
  undoStack: { command: Command; description: string }[];
  redoStack: { command: Command; description: string }[];
  palette: RGBA[];
  preview: PreviewState;
} | null> {
  let blob = await loadBlobFromDB(DB_KEYS.zipFileData);
  if (blob === null) {
    return null;
  }
  const { sides, palette, migrated } = await load(blob, fallbackPalette);

  const previewText = await loadTextFromDB(DB_KEYS.preview);

  const preview =
    previewText === null
      ? { unlit: false, autorotate: true }
      : (JSON.parse(previewText) as PreviewState);

  let undoStack: CommandStack;
  let redoStack: CommandStack;
  let undoRedoJsonText = await loadTextFromDB(DB_KEYS.undoRedoData);

  if (migrated) {
    undoStack = [];
    redoStack = [];
  } else if (undoRedoJsonText === null) {
    undoStack = [];
    redoStack = [];
  } else {
    let undoRedoJson = JSON.parse(undoRedoJsonText);
    undoStack = undoRedoJson.undoStack.map((x: any) => ({
      command: Command.fromJSON(x.command),
      description: x.description,
    }));
    redoStack = undoRedoJson.redoStack.map((x: any) => ({
      command: Command.fromJSON(x.command),
      description: x.description,
    }));
  }

  return {
    sides,
    undoStack,
    redoStack,
    palette,
    preview,
  };
}

export async function saveToIndexedDB({
  sides,
  undoStack,
  redoStack,
  palette,
  unlit,
  autorotate,
}: {
  sides: Sides;
  undoStack: { command: Command; description: string }[];
  redoStack: { command: Command; description: string }[];
  palette: RGBA[];
  unlit: boolean;
  autorotate: boolean;
}): Promise<void> {
  const blob = await save(sides, palette);
  await saveBlobToDB(DB_KEYS.zipFileData, blob);
  const undoStackJson = [];
  for (const { command, description } of undoStack) {
    undoStackJson.push({
      command: await Command.toJSON(command),
      description,
    });
  }
  const redoStackJson = [];
  for (const { command, description } of redoStack) {
    redoStackJson.push({
      command: await Command.toJSON(command),
      description,
    });
  }
  const undoRedoJson = {
    undoStack: undoStackJson,
    redoStack: redoStackJson,
  };
  const undoRedoJsonText = JSON.stringify(undoRedoJson);
  await saveTextToDB(DB_KEYS.undoRedoData, undoRedoJsonText);
  await saveTextToDB(DB_KEYS.preview, JSON.stringify({ unlit, autorotate }));
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB."));
    };
    request.onblocked = () => {
      reject(new Error("IndexedDB upgrade was blocked."));
    };
  });
}

function loadBlobFromDB(key: IDBValidKey): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction: IDBTransaction = db.transaction(
        STORE_NAME,
        "readonly",
      );
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME);
      const getRequest: IDBRequest<unknown> = store.get(key);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record instanceof Blob) {
          resolve(record);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => {
        reject(
          getRequest.error || new Error("Error retrieving data from store."),
        );
      };
    }, reject);
  });
}

function saveBlobToDB(key: IDBValidKey, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(blob, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    }, reject);
  });
}

/**
 * Anything else kept alongside the model: whatever is handed in is stored as
 * the browser clones it, which is what lets a file handle — a live reference to
 * a file on disk, not something that survives being written out as text — be
 * kept from one visit to the next.
 */
export function saveValueToDB(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const putRequest = transaction.objectStore(STORE_NAME).put(value, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () =>
        reject(putRequest.error || new Error("Failed to write value."));
    }, reject);
  });
}

/** Reads back what `saveValueToDB` kept, or null when nothing is under `key`. */
export function loadValueFromDB<T>(key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const getRequest = transaction.objectStore(STORE_NAME).get(key);
      getRequest.onsuccess = () =>
        resolve((getRequest.result as T | undefined) ?? null);
      getRequest.onerror = () =>
        reject(getRequest.error || new Error("Failed to read value."));
    }, reject);
  });
}

function loadTextFromDB(key: IDBValidKey): Promise<string | null> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction: IDBTransaction = db.transaction(
        STORE_NAME,
        "readonly",
      );
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME);
      const getRequest: IDBRequest<unknown> = store.get(key);
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () =>
        reject(getRequest.error || new Error("Failed to read text."));
    }, reject);
  });
}

function saveTextToDB(key: IDBValidKey, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(text, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () =>
        reject(putRequest.error || new Error("Failed to write text."));
    }, reject);
  });
}
