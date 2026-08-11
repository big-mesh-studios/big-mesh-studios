import { decode, encode } from "fast-png";
import JSZip from "jszip";
import { Command } from "./command/Command";
import { SideKind, sideKindSet, Sides } from "./types";
import { keysOf } from "./utils";

export async function load(blob: Blob): Promise<Sides> {
  const zip = await JSZip.loadAsync(blob);
  const result: Partial<Sides> = {};
  let seenSize: number | undefined = undefined;

  for (const [_path, entry] of Object.entries(zip.files)) {
    const m = /^(.*)\.png$/.exec(entry.name.toLowerCase());

    if (m !== null) {
      const side = m[1] as SideKind;

      if (sideKindSet[side]) {
        const blob = await entry.async("blob");
        const arrayBuffer = await blob.arrayBuffer();
        const rawDecoded = decode(new Uint8Array(arrayBuffer));
        const clampedData = new Uint8ClampedArray(rawDecoded.data.buffer as ArrayBuffer);
        result[side] = new ImageData(clampedData, rawDecoded.width, rawDecoded.height);
      }
    }
  }
  if (seenSize == undefined) {
    seenSize = 32;
  }
  for (let side of keysOf(sideKindSet)) {
    if (result[side] === undefined) {
      result[side] = new ImageData(seenSize, seenSize);
    }
  }
  return result as Sides;
}

export async function save(sides: Sides): Promise<Blob> {
  let zip = new JSZip();
  for (let side of keysOf(sideKindSet)) {
    let imageData = sides[side];
    zip.file(`${side}.png`, encode(imageData));
  }
  return zip.generateAsync({ type: "blob" });
}

const DB_NAME = "rm-stacker";
const DB_VERSION = 2;
const STORE_NAME = "Store";

const DB_KEYS = {
  zipFileData: "zipFileData",
  undoRedoData: "undoRedoData",
} as const;

export async function loadFromIndexedDB(): Promise<{
  sides: Sides;
  undoStack: { command: Command; description: string }[];
  redoStack: { command: Command; description: string }[];
} | null> {
  let blob = await loadBlobFromDB(DB_KEYS.zipFileData);
  if (blob === null) {
    return null;
  }
  let sides = await load(blob);
  let undoStack: { command: Command; description: string }[];
  let redoStack: { command: Command; description: string }[];
  let undoRedoJsonText = await loadTextFromDB(DB_KEYS.undoRedoData);
  if (undoRedoJsonText === null) {
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
  };
}

export async function saveToIndexedDB(params: {
  sides: Sides;
  undoStack: { command: Command; description: string }[];
  redoStack: { command: Command; description: string }[];
}): Promise<void> {
  let { sides, undoStack, redoStack } = params;
  let blob = await save(sides);
  await saveBlobToDB(DB_KEYS.zipFileData, blob);
  let undoStackJson = [];
  for (let { command, description } of undoStack) {
    undoStackJson.push({
      command: await Command.toJSON(command),
      description,
    });
  }
  let redoStackJson = [];
  for (let { command, description } of redoStack) {
    redoStackJson.push({
      command: await Command.toJSON(command),
      description,
    });
  }
  let undoRedoJson = {
    undoStack: undoStackJson,
    redoStack: redoStackJson,
  };
  let undoRedoJsonText = JSON.stringify(undoRedoJson);
  await saveTextToDB(DB_KEYS.undoRedoData, undoRedoJsonText);
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
    openDB().then(db => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, "readonly");
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
        reject(getRequest.error || new Error("Error retrieving data from store."));
      };
    }, reject);
  });
}

function saveBlobToDB(key: IDBValidKey, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(blob, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    }, reject);
  });
}

function loadTextFromDB(key: IDBValidKey): Promise<string | null> {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, "readonly");
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
      getRequest.onerror = () => reject(getRequest.error || new Error("Failed to read text."));
    }, reject);
  });
}

function saveTextToDB(key: IDBValidKey, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(text, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error || new Error("Failed to write text."));
    }, reject);
  });
}
