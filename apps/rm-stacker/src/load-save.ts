import { decode, encode } from "fast-png";
import JSZip from "jszip";
import { Command } from "./command/Command";
import { Bitmap, RGBA } from "./maths";
import { PreviewState, SideKind, sideKindSet, Sides } from "./types";
import { keysOf } from "./utils/utils";

const PALETTE_FILE = "palette.png";
const DB_NAME = "rm-stacker";
const DB_VERSION = 2;
const STORE_NAME = "Store";

const DB_KEYS = {
  zipFileData: "zipFileData",
  undoRedoData: "undoRedoData",
  preview: "preview",
} as const;

/** The palette as the preview wants it: one row of texels, RGBA, in order. */
function encodePalette(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);

  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset + 0] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });

  return encode({ width: palette.length, height: 1, data, channels: 4, depth: 8 });
}

function decodePalette(data: Uint8Array): RGBA[] {
  const decoded = decode(data);
  const palette: RGBA[] = [];

  for (let i = 0; i < decoded.width; i++) {
    const offset = i << 2;
    palette.push({
      r: decoded.data[offset + 0],
      g: decoded.data[offset + 1],
      b: decoded.data[offset + 2],
      a: decoded.data[offset + 3],
    });
  }

  return palette;
}

/** How many colours the preview shader can address. */
const PALETTE_LENGTH = 32;

/**
 * `data` is only read a byte at a time, so an image is taken as anything
 * indexable. Decoding a png hands back sixteen-bit samples for a sixteen-bit
 * image, which would be read here as though it were eight — no model written
 * here is one, and the caller turns anything that is away.
 */
interface DecodedImage {
  width: number;
  height: number;
  channels: number;
  data: ArrayLike<number>;
}

const packColour = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

/** Every colour a model saved as colours was drawn in, packed and deduplicated. */
function collectColours(images: DecodedImage[]): Set<number> {
  const colours = new Set<number>();

  for (const image of images) {
    for (let source = 0; source < image.width * image.height * 4; source += 4) {
      if (image.data[source + 3] === 0) {
        continue;
      }

      colours.add(packColour(image.data[source], image.data[source + 1], image.data[source + 2]));
    }
  }

  return colours;
}

/**
 * Works out a palette for a model that was saved as colours, and where each of
 * its colours sits in it.
 *
 * Every colour keeps an entry of its own, so nothing is approximated. A colour
 * the given palette already holds keeps that same slot, which leaves a model
 * drawn from an unedited palette with exactly the palette it was drawn from.
 * The rest take slots holding a colour the model never used.
 *
 * A model can hold more colours than the palette has room for, by having been
 * drawn in a colour that was later edited out of the palette, over and over.
 * Whatever does not fit is left out, and the cells drawn in it are emptied
 * rather than being moved to a colour nobody chose.
 */
function buildPalette(colours: Set<number>, fallbackPalette: RGBA[]) {
  const palette = Array.from(
    { length: PALETTE_LENGTH },
    (_, i): RGBA => fallbackPalette[i] ?? { r: 0, g: 0, b: 0, a: 255 },
  );
  const packedPalette = palette.map(({ r, g, b }) => packColour(r, g, b));

  const indexOf = new Map<number, number>();
  const freeSlots: number[] = [];

  for (let i = 0; i < PALETTE_LENGTH; i++) {
    if (colours.has(packedPalette[i])) {
      // Only the first slot holding this colour can be the one it means.
      indexOf.set(packedPalette[i], indexOf.get(packedPalette[i]) ?? i);
    } else {
      freeSlots.push(i);
    }
  }

  const unplaced = [...colours].filter(colour => !indexOf.has(colour));
  const dropped: number[] = [];

  for (const colour of unplaced) {
    const slot = freeSlots.shift();

    if (slot === undefined) {
      dropped.push(colour);
      continue;
    }

    palette[slot] = {
      r: (colour >> 16) & 0xff,
      g: (colour >> 8) & 0xff,
      b: colour & 0xff,
      a: 255,
    };
    indexOf.set(colour, slot);
  }

  return { palette, indexOf, dropped };
}

function toBitmap(image: DecodedImage, indexOf: Map<number, number>): Bitmap {
  const bitmap = Bitmap.create(image.width, image.height);

  for (let i = 0; i < bitmap.data.length; i++) {
    const source = i << 2;

    if (image.data[source + 3] === 0) {
      continue;
    }

    const index = indexOf.get(
      packColour(image.data[source], image.data[source + 1], image.data[source + 2]),
    );

    // A colour with no slot leaves its cell empty, which `create` already made it.
    if (index !== undefined) {
      bitmap.data[i] = index;
    }
  }

  return bitmap;
}

/**
 * Reads a model, in whichever of the two formats it was written in.
 *
 * `migrated` says it arrived in the older one, where a side held colours rather
 * than palette indices. Callers need to know because anything else they kept
 * beside the model — an undo history naming colours, say — was written against
 * that format too.
 */
export async function load(
  blob: Blob,
  fallbackPalette: RGBA[],
): Promise<{ sides: Sides; palette: RGBA[]; migrated: boolean }> {
  const zip = await JSZip.loadAsync(blob);
  const result: Partial<Sides> = {};
  // Sides saved as colours, held back until they have all been read: the
  // palette is worked out from every colour the whole model was drawn in, so
  // none of them can be turned into indices until all six have been seen.
  const asColours: Partial<Record<SideKind, DecodedImage>> = {};
  let palette: RGBA[] | undefined;
  let seenSize: number | undefined = undefined;

  for (const [_path, entry] of Object.entries(zip.files)) {
    const name = entry.name.toLowerCase();

    if (name === PALETTE_FILE) {
      palette = decodePalette(new Uint8Array(await (await entry.async("blob")).arrayBuffer()));
      continue;
    }

    const match = /^(.*)\.png$/.exec(name);

    if (match === null) {
      continue;
    }

    const side = match[1] as SideKind;

    if (!sideKindSet[side]) {
      continue;
    }

    const arrayBuffer = await (await entry.async("blob")).arrayBuffer();
    const decoded = decode(new Uint8Array(arrayBuffer));

    seenSize ??= decoded.width;

    // Everything written here is eight bits a sample, and every reading below
    // takes one byte at a time. Anything else would be read as though it were
    // eight and come back in colours nobody drew, so say so instead.
    if (decoded.depth !== 8) {
      throw new Error(`${side}.png holds ${decoded.depth} bits per sample, and only eight is read`);
    }

    // Four channels means a model saved before sides held indices.
    if (decoded.channels === 4) {
      asColours[side] = decoded;
      continue;
    }

    result[side] = {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8Array(decoded.data),
    };
  }

  const colourSides = keysOf(asColours);

  if (colourSides.length !== 0) {
    const images = colourSides.map(side => asColours[side]!);
    const built = buildPalette(collectColours(images), palette ?? fallbackPalette);

    if (built.dropped.length !== 0) {
      console.error(
        `This model was drawn in ${built.dropped.length + PALETTE_LENGTH} colours and a palette ` +
          `holds ${PALETTE_LENGTH}. The cells drawn in the ${built.dropped.length} that did not ` +
          `fit have been emptied.`,
      );
    }

    palette = built.palette;

    for (const side of colourSides) {
      result[side] = toBitmap(asColours[side]!, built.indexOf);
    }
  }

  seenSize ??= 32;

  for (const side of keysOf(sideKindSet)) {
    result[side] ??= Bitmap.create(seenSize, seenSize);
  }

  return {
    sides: result as Sides,
    palette: palette ?? fallbackPalette,
    migrated: colourSides.length !== 0,
  };
}

export async function save(sides: Sides, palette: RGBA[]): Promise<Blob> {
  const zip = new JSZip();

  for (const side of keysOf(sideKindSet)) {
    const { width, height, data } = sides[side];
    zip.file(`${side}.png`, encode({ width, height, data, channels: 1, depth: 8 }));
  }

  zip.file(PALETTE_FILE, encodePalette(palette));

  return zip.generateAsync({ type: "blob" });
}

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
