// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EditLayer } from "../world/edit-layer";
import {
  EDIT_CHUNK_DIM,
  EDIT_COLLECTION,
  chunkOf,
  chunkKey,
  parseChunkKey,
  groupEditsByChunk,
  makeRkey,
  recordVoxel,
  recordsToEntries,
  mergeIntoLayer,
  type EditChunkRecord,
} from "./edits";
import { VOXEL_GRASS, VOXEL_DIRT } from "../world/voxel-store";

const layerWith = (
  entries: Array<[[number, number, number], number, number]>,
) => {
  const layer = new EditLayer();
  for (const [w, id, t] of entries) {
    layer.set(w as [number, number, number], id, t);
  }
  return layer;
};

describe("edit chunk mapping", () => {
  it("groups a world voxel into its 32³ chunk and local offset", () => {
    const c = chunkOf([64, 0, -1]);
    expect(c).toEqual({ x: 2, y: 0, z: -1 });
    expect(chunkKey(c)).toBe("2/0/-1");
    expect(parseChunkKey("2/0/-1")).toEqual({ x: 2, y: 0, z: -1 });
    expect(EDIT_CHUNK_DIM).toBe(32);
  });

  it("reassembles record-local edits back to world voxels", () => {
    const record: EditChunkRecord = {
      $type: EDIT_COLLECTION,
      chunk: { x: 2, y: -1, z: 0 },
      seed: null,
      createdAt: "2026-01-01T00:00:00Z",
      edits: [{ x: 5, y: 10, z: 20, id: VOXEL_GRASS }],
    };
    expect(recordVoxel(record, record.edits[0])).toEqual([
      2 * 32 + 5,
      -1 * 32 + 10,
      0 * 32 + 20,
    ]);
  });
});

describe("groupEditsByChunk", () => {
  it("produces exactly one record per chunk with sparse local edits", () => {
    const layer = layerWith([
      [[1, 1, 1], VOXEL_GRASS, 10],
      [[2, 1, 1], VOXEL_DIRT, 11],
      [[100, 100, 100], VOXEL_DIRT, 12],
    ]);
    const groups = groupEditsByChunk(
      layer.snapshot(),
      54321,
      "2026-05-05T00:00:00Z",
    );
    expect(groups.size).toBe(2);
    const first = groups.get(chunkKey({ x: 0, y: 0, z: 0 }))!;
    expect(first.$type).toBe(EDIT_COLLECTION);
    expect(first.seed).toBe(54321);
    expect(first.createdAt).toBe("2026-05-05T00:00:00Z");
    expect(first.edits).toContainEqual({
      x: 1,
      y: 1,
      z: 1,
      id: VOXEL_GRASS,
      ts: 10,
    });
    expect(first.edits).toContainEqual({
      x: 2,
      y: 1,
      z: 1,
      id: VOXEL_DIRT,
      ts: 11,
    });
  });

  it("carries each voxel's own edit time in its record entry", () => {
    const layer = layerWith([
      [[1, 1, 1], VOXEL_GRASS, 42],
      [[2, 1, 1], VOXEL_DIRT, 99],
    ]);
    const groups = groupEditsByChunk(
      layer.snapshot(),
      null,
      "2026-01-01T00:00:00Z",
    );
    const rec = groups.get(chunkKey({ x: 0, y: 0, z: 0 }))!;
    expect(rec.edits).toContainEqual({
      x: 1,
      y: 1,
      z: 1,
      id: VOXEL_GRASS,
      ts: 42,
    });
    expect(rec.edits).toContainEqual({
      x: 2,
      y: 1,
      z: 1,
      id: VOXEL_DIRT,
      ts: 99,
    });
  });

  it("applies the same timestamp to every voxel in a chunk", () => {
    const layer = layerWith([
      [[1, 1, 1], VOXEL_GRASS, 0],
      [[2, 1, 1], VOXEL_DIRT, 999],
    ]);
    const groups = groupEditsByChunk(
      layer.snapshot(),
      null,
      "2026-01-01T00:00:00Z",
    );
    const rec = groups.get(chunkKey({ x: 0, y: 0, z: 0 }))!;
    expect(rec.edits.length).toBe(2);
  });
});

describe("makeRkey", () => {
  it("produces distinct, grammar-safe keys", () => {
    const a = makeRkey({ x: 3, y: -2, z: 1 });
    const b = makeRkey({ x: 3, y: -2, z: 1 });
    expect(a).not.toBe(b);
    for (const key of [a, b]) {
      expect(key).toMatch(/^[a-zA-Z0-9._~:-]+$/);
      expect(key.endsWith(".")).toBe(false);
    }
  });
});

describe("recordsToEntries + mergeIntoLayer", () => {
  const records: EditChunkRecord[] = [
    {
      $type: EDIT_COLLECTION,
      chunk: { x: 0, y: 0, z: 0 },
      seed: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      edits: [
        { x: 0, y: 0, z: 0, id: VOXEL_GRASS },
        { x: 1, y: 0, z: 0, id: VOXEL_DIRT },
      ],
    },
  ];

  it("flattens remote records into layer entries", () => {
    const entries = recordsToEntries(records);
    expect(entries).toContainEqual({
      w: [0, 0, 0],
      edit: {
        id: VOXEL_GRASS,
        updatedAt: Date.parse("2026-01-01T00:00:00.000Z"),
      },
    });
    expect(entries).toContainEqual({
      w: [1, 0, 0],
      edit: {
        id: VOXEL_DIRT,
        updatedAt: Date.parse("2026-01-01T00:00:00.000Z"),
      },
    });
  });

  it("last-write-wins: a newer local edit beats an old remote edit", () => {
    // the remote record's createdAt is Jan 2026 (~1.77e12 ms); a local edit at
    // 2e12 ms is newer, so it must survive the merge
    const layer = layerWith([[[0, 0, 0], VOXEL_DIRT, 2_000_000_000_000]]);
    const changed = mergeIntoLayer(layer, recordsToEntries(records));
    expect(changed).toBe(1); // only [1,0,0] is new
    expect(layer.get([0, 0, 0])?.id).toBe(VOXEL_DIRT);
    expect(layer.get([1, 0, 0])?.id).toBe(VOXEL_DIRT);
  });

  it("a newer remote edit does overwrite the local one", () => {
    const layer = layerWith([[[0, 0, 0], VOXEL_DIRT, 1]]);
    const changed = mergeIntoLayer(layer, recordsToEntries(records));
    expect(changed).toBe(2);
    expect(layer.get([0, 0, 0])?.id).toBe(VOXEL_GRASS);
  });

  it("prefers a record's per-edit ts over the record createdAt", () => {
    const withTs: EditChunkRecord = {
      $type: EDIT_COLLECTION,
      chunk: { x: 0, y: 0, z: 0 },
      seed: 1,
      // createdAt is much older than the per-edit ts, to prove ts wins.
      createdAt: "2020-01-01T00:00:00.000Z",
      edits: [{ x: 0, y: 0, z: 0, id: VOXEL_GRASS, ts: 2_000_000_000_000 }],
    };
    const entries = recordsToEntries([withTs]);
    expect(entries[0].edit.updatedAt).toBe(2_000_000_000_000);
  });

  it("falls back to createdAt for records without a per-edit ts", () => {
    const entries = recordsToEntries(records);
    expect(entries[0].edit.updatedAt).toBe(
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
  });
});
