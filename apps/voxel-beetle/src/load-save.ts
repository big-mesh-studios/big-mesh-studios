// The copy of the model this browser keeps between visits.
//
// The model itself is stored as the same `.cvox` bytes the file format writes.
// A model of a few thousand voxels is a few kilobytes that way, against a zip of
// indexed images that is larger and slower to write, so the whole model — rather
// than a snapshot of it — is what sits in the history and what a stroke's undo
// puts back.
import { type RGBA } from "@big-mesh-studios/maths";
import type { Volume } from "@big-mesh-studios/stacker/volume";
import { readModel } from "./cvox-io";
import { fromJSON, toJSON, type Command } from "./command/Command";
import type { CommandEntry } from "./undo-redo";
import type { PreviewState } from "./types";

/** This application's own store, kept apart from every other one's. */
const DB_NAME = "voxel-beetle";
const DB_VERSION = 1;
const STORE_NAME = "Store";

const DB_KEYS = {
  model: "model",
  undoRedo: "undoRedo",
  preview: "preview",
} as const;

export interface IndexedDBData {
  volume: Volume;
  palette: RGBA[];
  undoStack: CommandEntry[];
  redoStack: CommandEntry[];
  preview: Partial<PreviewState>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveValueToDB(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function loadValueFromDB<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

export async function loadFromIndexedDB(
  fallbackPalette: RGBA[],
): Promise<IndexedDBData> {
  const [bytes, history, preview] = await Promise.all([
    loadValueFromDB<ArrayBuffer>(DB_KEYS.model),
    loadValueFromDB<{ undoStack: unknown[]; redoStack: unknown[] }>(
      DB_KEYS.undoRedo,
    ),
    loadValueFromDB<Partial<PreviewState>>(DB_KEYS.preview),
  ]);

  if (bytes === null) {
    throw new Error("this browser has no model saved");
  }

  const { volume, palette } = readModel(new Uint8Array(bytes));

  return {
    volume,
    palette: palette.length > 0 ? palette : fallbackPalette,
    undoStack: (history?.undoStack ?? []).map(fromJSON).map(toEntry),
    redoStack: (history?.redoStack ?? []).map(fromJSON).map(toEntry),
    preview: preview ?? {},
  };
}

const toEntry = (command: Command): CommandEntry => ({
  command,
  description: "",
});

export async function saveToIndexedDB({
  volume,
  undoStack,
  redoStack,
  preview,
}: {
  volume: ArrayBuffer;
  undoStack: CommandEntry[];
  redoStack: CommandEntry[];
  preview: Partial<PreviewState>;
}): Promise<void> {
  await Promise.all([
    saveValueToDB(DB_KEYS.model, volume),
    saveValueToDB(DB_KEYS.undoRedo, {
      undoStack: undoStack.map((entry) => ({
        command: toJSON(entry.command),
        description: entry.description,
      })),
      redoStack: redoStack.map((entry) => ({
        command: toJSON(entry.command),
        description: entry.description,
      })),
    }),
    saveValueToDB(DB_KEYS.preview, preview),
  ]);
}
