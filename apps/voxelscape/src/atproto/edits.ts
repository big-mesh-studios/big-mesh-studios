// Edit-chunk records for atproto storage: the `EditLayer` overlay is chunked
// into 32x32x32 world-voxel cells, and each chunk's sparse edits are written
// as one custom record in the user's repo. Chunking by absolute voxel (not by
// which ring block held them) keeps a record addressable by location, so any
// client can resolve it onto its own regenerated terrain.
import type { EditLayer, WorldVoxel, VoxelEdit } from "../world/edit-layer";

/** One side of an edit chunk, in voxels. */
export const EDIT_CHUNK_DIM = 32;
/** The atproto record collection for edit chunks. */
export const EDIT_COLLECTION = "app.bms.voxelscape.edit";

export interface EditChunkCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * One edit record: a sparse list of voxel ids inside one 32³ chunk. Declared
 * as a type alias rather than an interface so it stays assignable to the
 * `Record<string, unknown>` an atproto record body is typed as — TypeScript
 * infers an implicit index signature for the one and not the other.
 */
export type EditChunkRecord = {
  $type: typeof EDIT_COLLECTION;
  chunk: EditChunkCoord;
  /** Terrain seed the world was generated with, for reproducible base terrain. */
  seed: number | null;
  createdAt: string;
  edits: Array<{ x: number; y: number; z: number; id: number }>;
};

export const chunkOf = (w: WorldVoxel): EditChunkCoord => ({
  x: Math.floor(w[0] / EDIT_CHUNK_DIM),
  y: Math.floor(w[1] / EDIT_CHUNK_DIM),
  z: Math.floor(w[2] / EDIT_CHUNK_DIM),
});

export const chunkLocal = (
  w: WorldVoxel,
): { x: number; y: number; z: number } => ({
  x: w[0] - Math.floor(w[0] / EDIT_CHUNK_DIM) * EDIT_CHUNK_DIM,
  y: w[1] - Math.floor(w[1] / EDIT_CHUNK_DIM) * EDIT_CHUNK_DIM,
  z: w[2] - Math.floor(w[2] / EDIT_CHUNK_DIM) * EDIT_CHUNK_DIM,
});

export const chunkKey = (c: EditChunkCoord): string => `${c.x}/${c.y}/${c.z}`;

export const parseChunkKey = (key: string): EditChunkCoord => {
  const [x, y, z] = key.split("/");
  return { x: Number(x), y: Number(y), z: Number(z) };
};

/** Absolute world voxel of any edit chunk record. */
export const recordVoxel = (
  record: Pick<EditChunkRecord, "chunk" | "edits">,
  edit: EditChunkRecord["edits"][number],
): WorldVoxel => [
  record.chunk.x * EDIT_CHUNK_DIM + edit.x,
  record.chunk.y * EDIT_CHUNK_DIM + edit.y,
  record.chunk.z * EDIT_CHUNK_DIM + edit.z,
];

/**
 * Groups `entries` into one record per 32³ chunk, sharing a single
 * `createdAt`. Returns a map keyed by `chunkKey` of the assembled record.
 */
export const groupEditsByChunk = (
  entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>,
  seed: number | null,
  createdAt: string,
): Map<string, EditChunkRecord> => {
  const groups = new Map<string, EditChunkRecord>();
  for (const { w, edit } of entries) {
    const c = chunkOf(w);
    const key = chunkKey(c);
    let record = groups.get(key);
    if (record === undefined) {
      record = {
        $type: EDIT_COLLECTION,
        chunk: c,
        seed,
        createdAt,
        edits: [],
      };
      groups.set(key, record);
    }
    const l = chunkLocal(w);
    record.edits.push({ x: l.x, y: l.y, z: l.z, id: edit.id });
  }
  return groups;
};

/**
 * A valid atproto record key for a chunk: readable from the chunk coordinates,
 * unique per upload (timestamp plus random suffix), and free of characters the
 * atproto rkey grammar forbids ('+' and other punctuation are avoided).
 */
export const makeRkey = (c: EditChunkCoord): string =>
  `e${Math.abs(c.x)}_${Math.abs(c.y)}_${Math.abs(c.z)}_${Date.now().toString(
    36,
  )}${Math.random().toString(36).replace(".", "").slice(0, 6)}`;

/**
 * Flattens records from a repo back into overlay snapshot entries ready to
 * feed `editLayerFromSnapshot` (or merge into a live layer). Coords are
 * reassembled from chunk + local.
 */
export const recordsToEntries = (
  records: EditChunkRecord[],
): Array<{ w: WorldVoxel; edit: VoxelEdit }> => {
  const out: Array<{ w: WorldVoxel; edit: VoxelEdit }> = [];
  for (const record of records) {
    const t = Date.parse(record.createdAt);
    const updatedAt = Number.isFinite(t) ? t : 0;
    for (const edit of record.edits) {
      out.push({
        w: recordVoxel(record, edit),
        edit: { id: edit.id, updatedAt },
      });
    }
  }
  return out;
};

/**
 * Merges remote entries into `layer` with last-write-wins by `updatedAt`.
 * Returns the number of voxels whose id actually changed.
 */
export const mergeIntoLayer = (
  layer: EditLayer,
  entries: Array<{ w: WorldVoxel; edit: VoxelEdit }>,
): number => {
  let changed = 0;
  for (const { w, edit } of entries) {
    const local = layer.get(w);
    if (local !== undefined && local.updatedAt > edit.updatedAt) {
      continue;
    }
    if (layer.set(w, edit.id, edit.updatedAt)) {
      changed++;
    }
  }
  return changed;
};
