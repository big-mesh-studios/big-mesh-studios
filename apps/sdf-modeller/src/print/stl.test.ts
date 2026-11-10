import { describe, expect, it } from "vitest";

import { encodeStl } from "./stl";

/** One triangle, with three corners given as nine numbers. */
const triangle = (corners: readonly number[]) => ({
  vertices: new Float32Array(corners),
  indices: new Uint32Array([0, 1, 2]),
});

/** A file's bytes, read as the little-endian binary a binary STL is. */
const read = async (blob: Blob) => {
  const view = new DataView(await blob.arrayBuffer());
  return {
    view,
    bytes: view.byteLength,
    triangles: view.getUint32(80, true),
  };
};

/** Offset of the first triangle's record, which follows the header and the count. */
const FIRST = 84;

describe("encodeStl", () => {
  it("writes the 80-byte header and count a binary STL begins with", async () => {
    // **The count is the whole of the structure**, since an STL is a triangle list and nothing
    // else. A reader that gets it wrong either stops early or walks off the end of the file.
    const { view, triangles } = await read(
      encodeStl(triangle([0, 0, 0, 1, 0, 0, 0, 1, 0])),
    );
    const header = new TextDecoder().decode(
      new Uint8Array(view.buffer, view.byteOffset, 80),
    );

    expect(header.startsWith("sdf-modeller binary STL")).toBe(true);
    expect(triangles).toBe(1);
  });

  it("writes fifty bytes a triangle, as the format specifies", async () => {
    // **The size is what makes a binary STL readable without parsing it**, so it is asserted
    // against the format's own arithmetic rather than against whatever the writer happens to do.
    const one = await read(encodeStl(triangle([0, 0, 0, 1, 0, 0, 0, 1, 0])));
    expect(one.bytes).toBe(84 + 50);

    const two = await read(
      encodeStl({
        vertices: new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1,
        ]),
        indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
      }),
    );
    expect(two.triangles).toBe(2);
    expect(two.bytes).toBe(84 + 50 * 2);
  });

  it("points each normal out of the triangle by its winding", async () => {
    // **The normal is the only statement the format makes about which side is outside**, and a
    // corner-ordered mesh gives it for free. A slicer that trusts the stored normal rather than
    // recomputing it would print a model inside out if this were zero or reversed.
    const upward = await read(encodeStl(triangle([0, 0, 0, 1, 0, 0, 0, 1, 0])));
    expect(upward.view.getFloat32(FIRST, true)).toBeCloseTo(0);
    expect(upward.view.getFloat32(FIRST + 4, true)).toBeCloseTo(0);
    expect(upward.view.getFloat32(FIRST + 8, true)).toBeCloseTo(1);

    // The same corners the other way round face the other way, which is what keeps the normal
    // a fact about the mesh rather than a constant.
    const downward = await read(
      encodeStl(triangle([0, 0, 0, 0, 1, 0, 1, 0, 0])),
    );
    expect(downward.view.getFloat32(FIRST + 8, true)).toBeCloseTo(-1);
  });

  it("normalises the normal, so a large triangle is not a larger direction", async () => {
    const small = await read(encodeStl(triangle([0, 0, 0, 1, 0, 0, 0, 1, 0])));
    const large = await read(
      encodeStl(triangle([0, 0, 0, 100, 0, 0, 0, 100, 0])),
    );

    for (const view of [small.view, large.view]) {
      const length = Math.hypot(
        view.getFloat32(FIRST, true),
        view.getFloat32(FIRST + 4, true),
        view.getFloat32(FIRST + 8, true),
      );
      expect(length).toBeCloseTo(1, 5);
    }
  });

  it("writes three corners in order, in the same millimetres as the 3MF", async () => {
    // **Corners, not vertices.** An STL has no vertex table: every triangle repeats its three
    // corners, and a writer that assumed otherwise would produce a file of one triangle.
    const { view } = await read(
      encodeStl(triangle([1, 2, 3, 4, 5, 6, 7, 8, 9])),
    );

    for (let corner = 0; corner < 3; corner++) {
      for (let axis = 0; axis < 3; axis++) {
        expect(
          view.getFloat32(FIRST + 12 + corner * 12 + axis * 4, true),
        ).toBeCloseTo(1 + corner * 3 + axis);
      }
    }
  });

  it("writes a zero normal for a triangle with no area", async () => {
    // **A normal divided by a length of zero is not a direction.** Marching cubes can clip a
    // triangle to a line, and NaN in a normal is the kind of value a slicer rejects the whole
    // file for rather than the one triangle.
    const { view } = await read(
      encodeStl(triangle([0, 0, 0, 1, 1, 1, 2, 2, 2])),
    );

    expect(view.getFloat32(FIRST, true)).toBe(0);
    expect(view.getFloat32(FIRST + 4, true)).toBe(0);
    expect(view.getFloat32(FIRST + 8, true)).toBe(0);
  });

  it("writes no colour, because the format has nowhere to put one", async () => {
    // **The attribute byte count is the only place a colour could hide.** It is written as
    // zero, which every slicer reads as "use your own colour" rather than as black.
    const { view } = await read(
      encodeStl(triangle([0, 0, 0, 1, 0, 0, 0, 1, 0])),
    );

    expect(view.getUint16(FIRST + 48, true)).toBe(0);
  });
});
