// Every change a model can undergo, and the reverse of each. A command is the
// only way anything about a model changes, which is what lets the same change be
// undone, redone, and written into the browser's own copy between visits.
//
// The commands that address a voxel do so by its own coordinates rather than by
// a panel and a cell on it: a model here is a box of voxels, and a cell of a
// slice is two of those coordinates and one the plane stands at.
import type { Vector3D } from "@big-mesh-studios/maths";
import type { Plane } from "@big-mesh-studios/stacker/volume";

export type Command =
  | { type: "NoOperation" }
  | { type: "Sequence"; commands: Command[] }
  | { type: "WriteVoxel"; voxel: Vector3D; paletteIndex: number }
  | { type: "EraseVoxel"; voxel: Vector3D }
  | { type: "FillVoxel"; voxel: Vector3D; plane: Plane; paletteIndex: number }
  | {
      type: "FillBlock";
      min: Vector3D;
      max: Vector3D;
      paletteIndex: number;
    }
  | { type: "Resize"; dimensions: Vector3D; alignment: Alignment }
  | { type: "LoadVolume"; data: ArrayBuffer }
  | { type: "Async"; command: Promise<Command> };

/** Which end of each changed extent a resize is made at. */
export type Alignment = Partial<Record<"x" | "y" | "z", "min" | "max">>;

export const Command = {
  noOperation: (): Command => ({ type: "NoOperation" }),

  sequence: (commands: Command[]): Command => ({ type: "Sequence", commands }),

  writeVoxel: (voxel: Vector3D, paletteIndex: number): Command => ({
    type: "WriteVoxel",
    voxel: { ...voxel },
    paletteIndex,
  }),

  eraseVoxel: (voxel: Vector3D): Command => ({
    type: "EraseVoxel",
    voxel: { ...voxel },
  }),

  fillVoxel: (
    voxel: Vector3D,
    plane: Plane,
    paletteIndex: number,
  ): Command => ({
    type: "FillVoxel",
    voxel: { ...voxel },
    plane,
    paletteIndex,
  }),

  fillBlock: (min: Vector3D, max: Vector3D, paletteIndex: number): Command => ({
    type: "FillBlock",
    min: { ...min },
    max: { ...max },
    paletteIndex,
  }),

  resize: (dimensions: Vector3D, alignment: Alignment): Command => ({
    type: "Resize",
    dimensions: { ...dimensions },
    alignment: { ...alignment },
  }),

  loadVolume: (data: ArrayBuffer): Command => ({
    type: "LoadVolume",
    data,
  }),

  async: (command: Promise<Command>): Command => ({ type: "Async", command }),
};

const vectorToJSON = ({ x, y, z }: Vector3D) => ({ x, y, z });

const vectorFromJSON = (value: unknown): Vector3D => {
  const { x, y, z } = (value ?? {}) as Partial<Vector3D>;
  return { x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
};

/**
 * A command as JSON, for the browser's own copy of the undo history. Bytes
 * cannot be written into a record, so a loaded volume travels as base64.
 */
export const toJSON = (command: Command): unknown => {
  switch (command.type) {
    case "NoOperation":
      return { type: command.type };
    case "Sequence":
      return {
        type: command.type,
        commands: command.commands.map(toJSON),
      };
    case "WriteVoxel":
      return {
        type: command.type,
        voxel: vectorToJSON(command.voxel),
        paletteIndex: command.paletteIndex,
      };
    case "EraseVoxel":
      return { type: command.type, voxel: vectorToJSON(command.voxel) };
    case "FillVoxel":
      return {
        type: command.type,
        voxel: vectorToJSON(command.voxel),
        plane: command.plane,
        paletteIndex: command.paletteIndex,
      };
    case "FillBlock":
      return {
        type: command.type,
        min: vectorToJSON(command.min),
        max: vectorToJSON(command.max),
        paletteIndex: command.paletteIndex,
      };
    case "Resize":
      return {
        type: command.type,
        dimensions: vectorToJSON(command.dimensions),
        alignment: command.alignment,
      };
    case "LoadVolume":
      return {
        type: command.type,
        data: bytesToBase64(new Uint8Array(command.data)),
      };
    case "Async":
      return { type: "NoOperation" };
  }
};

/**
 * A command read back out of the browser's own copy of the undo history.
 *
 * A command this does not recognise reads as no operation at all, rather than
 * being refused: one entry written by a later build than the one reading it
 * should cost the entry, not the whole history it sits in.
 */
export const fromJSON = (value: unknown): Command => {
  const command = (value ?? {}) as Record<string, unknown>;
  const type = command.type;

  switch (type) {
    case "Sequence":
      return Command.sequence(
        (Array.isArray(command.commands) ? command.commands : []).map(fromJSON),
      );
    case "WriteVoxel":
      return Command.writeVoxel(
        vectorFromJSON(command.voxel),
        Number(command.paletteIndex) || 0,
      );
    case "EraseVoxel":
      return Command.eraseVoxel(vectorFromJSON(command.voxel));
    case "FillVoxel":
      return Command.fillVoxel(
        vectorFromJSON(command.voxel),
        command.plane === "yz" || command.plane === "zx" ? command.plane : "xy",
        Number(command.paletteIndex) || 0,
      );
    case "FillBlock":
      return Command.fillBlock(
        vectorFromJSON(command.min),
        vectorFromJSON(command.max),
        Number(command.paletteIndex) || 0,
      );
    case "Resize":
      return Command.resize(
        vectorFromJSON(command.dimensions),
        (command.alignment ?? {}) as Alignment,
      );
    case "LoadVolume":
      return Command.loadVolume(
        base64ToBytes(String(command.data)).buffer as ArrayBuffer,
      );
    default:
      return Command.noOperation();
  }
};

const BYTES =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BYTES[a >> 2];
    out += BYTES[((a & 0b11) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : BYTES[((b & 0b1111) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : BYTES[c & 0b111111];
  }
  return out;
};

export const base64ToBytes = (text: string): Uint8Array => {
  const clean = text.replace(/=+$/, "");
  const bytes = new Uint8Array((clean.length * 3) / 4);
  let at = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = BYTES.indexOf(clean[i]);
    const b = BYTES.indexOf(clean[i + 1]);
    const c = BYTES.indexOf(clean[i + 2]);
    const d = BYTES.indexOf(clean[i + 3]);
    bytes[at++] = (a << 2) | (b >> 4);
    if (c >= 0) {
      bytes[at++] = ((b & 0b1111) << 4) | (c >> 2);
    }
    if (d >= 0) {
      bytes[at++] = ((c & 0b11) << 6) | d;
    }
  }
  return bytes;
};
