// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BufferGeometry } from "@random-mesh/rmsl/scene";
import {
  INDEX_UPLOAD_BYTES,
  Superchunk,
  VERTEX_UPLOAD_BYTES,
  meshUploadBytes,
  type GeometryPair,
} from "./superchunk";
import { emptyMesh, type MeshArrays } from "./mesh";
import type { Dim3 } from "../world/level-data";

/** A pair of geometries to fill, as the renderer's pool would hand over. */
const pair = (): GeometryPair => ({
  terrain: new BufferGeometry(),
  water: new BufferGeometry(),
});

/**
 * A mesh of `quads` quads at one point, enough for the arithmetic: four
 * vertices and six indices each, and the attributes a merged vertex carries.
 */
const meshOf = (quads: number, at = 0): MeshArrays => {
  const vertices = quads * 4;
  return {
    positions: new Float32Array(
      Array.from({ length: vertices * 3 }, (_, i) => at + i),
    ),
    packed: new Uint8Array(vertices * 4).fill(255),
    uvs: new Uint16Array(vertices * 2),
    indices: new Uint32Array(
      Array.from({ length: quads * 6 }, (_, i) => i % vertices),
    ),
  };
};

const meshes = (quads: number, at = 0) => ({
  terrain: meshOf(quads, at),
  water: emptyMesh(),
});

const CENTER: Dim3 = [0, 0, 0];

describe("Superchunk", () => {
  it("gives each member the run of indices its own mesh drew", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(2, [64, 0, 0], meshes(3));

    // Two quads is twelve indices, three is eighteen, and the second member's
    // run starts where the first one ended.
    expect(superchunk.rangeOf(1).terrain).toEqual({ start: 0, count: 12 });
    expect(superchunk.rangeOf(2).terrain).toEqual({ start: 12, count: 18 });
    expect(superchunk.members.size).toBe(2);
    expect(superchunk.holds(1)).toBe(true);
    expect(superchunk.holds(3)).toBe(false);
  });

  it("answers an empty run for a member it does not hold", () => {
    const superchunk = new Superchunk(CENTER, pair());
    expect(superchunk.rangeOf(9).terrain).toEqual({ start: 0, count: 0 });
    expect(superchunk.rangeOf(9).water).toEqual({ start: 0, count: 0 });
  });

  it("re-origins a member's vertices against the superchunk's centre", () => {
    // A member 64 units along x, joined into a superchunk centred at the
    // origin, has to draw 64 units along x — the merged geometry is one object
    // and every member's vertices are in its space.
    const superchunk = new Superchunk([0, 0, 0], pair());
    superchunk.join(1, [64, 0, 0], meshes(1));
    superchunk.upload();
    const positions = superchunk.terrain.getAttribute("position")!;
    expect(positions.array[0]).toBeCloseTo(64);
  });

  it("owes the card everything until it uploads, and nothing after", () => {
    const superchunk = new Superchunk(CENTER, pair());
    const mesh = meshes(2);
    superchunk.join(1, [0, 0, 0], mesh);

    // Four vertices a quad and six indices, both passes counted.
    const owed = meshUploadBytes(mesh.terrain) + meshUploadBytes(mesh.water);
    expect(superchunk.pendingBytes).toBe(owed);

    expect(superchunk.upload()).toBe(owed);
    expect(superchunk.pendingBytes).toBe(0);
  });

  it("sends only what it gained since the last upload", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.upload();

    const second = meshes(3, 100);
    superchunk.join(2, [64, 0, 0], second);
    const owed =
      meshUploadBytes(second.terrain) + meshUploadBytes(second.water);
    expect(superchunk.pendingBytes).toBe(owed);
    expect(superchunk.upload()).toBe(owed);

    // The tail is what the attribute is told to re-send: twelve vertices of the
    // second member's three quads, from where the first member's ended.
    const positions = superchunk.terrain.getAttribute("position")!;
    expect(positions.updateRanges).toEqual([{ start: 8 * 3, count: 12 * 3 }]);
  });

  it("uploads nothing when nothing was joined since the last one", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.upload();

    expect(superchunk.upload()).toBe(0);
    expect(superchunk.terrain.getAttribute("position")!.updateRanges).toEqual([
      { start: 0, count: 0 },
    ]);
  });

  it("stops drawing a retired member at once, and keeps its room", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(2, [64, 0, 0], meshes(3));
    superchunk.upload();
    expect(superchunk.freeBytes).toBe(0);

    superchunk.retire(1);

    expect(superchunk.rangeOf(1).terrain).toEqual({ start: 0, count: 0 });
    expect(superchunk.holds(1)).toBe(false);
    expect(superchunk.members.size).toBe(1);
    // What it was using is held for the next member that fits: eight vertices
    // and twelve indices, the two quads it drew.
    expect(superchunk.freeBytes).toBe(
      8 * VERTEX_UPLOAD_BYTES + 12 * INDEX_UPLOAD_BYTES,
    );
    // The member that stayed draws exactly what it drew before.
    expect(superchunk.rangeOf(2).terrain).toEqual({ start: 12, count: 18 });
  });

  it("writes the next member into the room a retired one left", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(2, [64, 0, 0], meshes(3));
    superchunk.upload();
    const grownTo = superchunk.indexCount;

    superchunk.retire(1);
    superchunk.join(3, [0, 64, 0], meshes(2, 500));

    // Two quads fit exactly where two quads were, and nothing grew.
    expect(superchunk.rangeOf(3).terrain).toEqual({ start: 0, count: 12 });
    expect(superchunk.freeBytes).toBe(0);
    expect(superchunk.indexCount).toBe(grownTo);
  });

  it("grows for a member too big for any room it is holding", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.upload();
    const grownTo = superchunk.indexCount;

    superchunk.retire(1);
    superchunk.join(2, [64, 0, 0], meshes(5));

    // Five quads do not fit where two were, so they go at the end and the room
    // stays free for something smaller.
    expect(superchunk.rangeOf(2).terrain.start).toBe(grownTo);
    expect(superchunk.indexCount).toBeGreaterThan(grownTo);
    expect(superchunk.freeBytes).toBeGreaterThan(0);
  });

  it("keeps what is left of a room a smaller member only half filled", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(4));
    superchunk.upload();
    const grownTo = superchunk.indexCount;

    superchunk.retire(1);
    superchunk.join(2, [64, 0, 0], meshes(1));

    // One quad into four quads' room: it takes the front, and three quads'
    // worth stays free rather than being lost.
    expect(superchunk.rangeOf(2).terrain).toEqual({ start: 0, count: 6 });
    expect(superchunk.indexCount).toBe(grownTo);
    expect(superchunk.freeBytes).toBe(
      12 * VERTEX_UPLOAD_BYTES + 18 * INDEX_UPLOAD_BYTES,
    );
  });

  it("sends only the room it refilled, not the whole of the arrays", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(2, [64, 0, 0], meshes(3));
    superchunk.upload();

    superchunk.retire(1);
    const filling = meshes(2, 500);
    superchunk.join(3, [0, 64, 0], filling);
    const owed =
      meshUploadBytes(filling.terrain) + meshUploadBytes(filling.water);
    expect(superchunk.pendingBytes).toBe(owed);
    expect(superchunk.upload()).toBe(owed);

    // A slice of the arrays rather than a tail: the eight vertices of the two
    // quads that were written, where they were written.
    expect(superchunk.terrain.getAttribute("position")!.updateRanges).toEqual([
      { start: 0, count: 8 * 3 },
    ]);
  });

  it("draws a refilled member from the vertices it wrote", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(2, [64, 0, 0], meshes(2));
    superchunk.upload();

    superchunk.retire(1);
    superchunk.join(3, [0, 0, 128], meshes(2));
    superchunk.upload();

    // Its indices point at the vertices it wrote, which are the ones the retired
    // member had — 0..7, not the end of the arrays.
    const indices = superchunk.terrain.index!.array;
    const range = superchunk.rangeOf(3).terrain;
    for (let at = range.start; at < range.start + range.count; at++) {
      expect(indices[at]).toBeLessThan(8);
    }
    // And they are at its own centre, not the retired member's: the mesh's own
    // z for that vertex, moved by the 128 between the two centres.
    const positions = superchunk.terrain.getAttribute("position")!;
    expect(positions.array[2]).toBeCloseTo(meshOf(2).positions[2] + 128);
  });

  it("joins a member once, however many times it is offered", () => {
    const superchunk = new Superchunk(CENTER, pair());
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.join(1, [0, 0, 0], meshes(2));
    expect(superchunk.rangeOf(1).terrain).toEqual({ start: 0, count: 12 });
    expect(superchunk.indexCount).toBe(12);
  });

  it("weighs its arrays at the capacity they grew to", () => {
    const superchunk = new Superchunk(CENTER, pair());
    const empty = superchunk.bytes;
    superchunk.join(1, [0, 0, 0], meshes(400));
    expect(superchunk.bytes).toBeGreaterThan(empty);
    // Growth doubles, so capacity is at least what was written.
    const written =
      400 * 4 * VERTEX_UPLOAD_BYTES + 400 * 6 * INDEX_UPLOAD_BYTES;
    expect(superchunk.bytes).toBeGreaterThanOrEqual(written);
  });

  it("hands its pair back with nothing in it", () => {
    const held = pair();
    const superchunk = new Superchunk(CENTER, held);
    superchunk.join(1, [0, 0, 0], meshes(2));
    superchunk.upload();
    expect(superchunk.terrain.getAttribute("position")!.count).toBeGreaterThan(
      0,
    );

    const back = superchunk.release();

    // The same geometries, so the renderer's GPU buffers for them survive, but
    // holding none of the arrays this superchunk grew.
    expect(back).toBe(held);
    expect(back.terrain.getAttribute("position")!.count).toBe(0);
    expect(back.water.getAttribute("position")!.count).toBe(0);
  });
});
