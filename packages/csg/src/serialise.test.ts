import { describe, expect, it } from "vitest";

import {
  parametersToFloats,
  PRIMITIVE_NAMES,
  PRIMITIVES,
  type OperationShape,
  type ShapeType,
} from "@big-mesh-studios/sdf";

import { makeOperation, type Combine, type Operation } from "./operations";
import {
  deserialiseOperations,
  FormatError,
  FORMAT_VERSION,
  serialisedSize,
  serialiseOperations,
} from "./serialise";

let seed = 0x1d7f3a9;
const next = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const randomVector = (scale: number) => ({
  x: Math.round((next() * 2 - 1) * scale * 1000) / 1000,
  y: Math.round((next() * 2 - 1) * scale * 1000) / 1000,
  z: Math.round((next() * 2 - 1) * scale * 1000) / 1000,
});
const randomRotation = () => {
  const q = {
    x: next() * 2 - 1,
    y: next() * 2 - 1,
    z: next() * 2 - 1,
    w: next() * 2 - 1,
  };
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  return {
    x: Math.round((q.x / length) * 1e6) / 1e6,
    y: Math.round((q.y / length) * 1e6) / 1e6,
    z: Math.round((q.z / length) * 1e6) / 1e6,
    w: Math.round((q.w / length) * 1e6) / 1e6,
  };
};

/**
 * Builds a shape of the given kind, with a plausible value for each of its
 * parameters.
 *
 * **The parameters come from the table rather than from a list written here.** A vec3
 * gets three components and a scalar gets one, in both cases sized so that a primitive
 * is neither degenerate nor so large it swamps the test's other coordinates.
 */
const sampleShape = (type: ShapeType): OperationShape => {
  const shape: Record<string, unknown> = { type };
  for (const parameter of PRIMITIVES[type].parameters) {
    shape[parameter.name] =
      parameter.arity === 3
        ? randomVector(80)
        : parameter.arity === "variable"
          ? /**
             * A real outline, because this is below the layer that refuses a malformed
             * one. `checkShape` is what turns a number-where-an-outline-belongs into a
             * refusal, and a file-format test that generated one would be testing the
             * wrong thing: it would write a `NaN` count and read back a shape that was
             * never written. **A random convex outline around the origin**, so the
             * half-extents a reader derives are non-zero and a truncation is visible.
             */
            Array.from({ length: 3 + Math.floor(next() * 9) }, (_, i) => {
              const angle = (2 * Math.PI * i) / 8;
              const reach = 4 + next() * 40;
              return { x: Math.cos(angle) * reach, z: Math.sin(angle) * reach };
            })
          : 1 + next() * 60;
  }
  return shape as OperationShape;
};

const randomOperation = (index: number): Operation => {
  const combine = (["Add", "Subtract", "Paint"] as const)[
    Math.floor(next() * 3)
  ] as Combine;
  // **Every primitive, drawn from the table.** This was a three-way ternary over
  // ellipsoid, box and capsule, which is a list of primitives maintained by hand in a
  // file whose subject is that the list is not maintained by hand. `sampleShape`
  // builds one from the table's parameter list, so a tenth primitive is covered here
  // without this line changing.
  const shape = sampleShape(
    PRIMITIVE_NAMES[Math.floor(next() * PRIMITIVE_NAMES.length)],
  );
  return makeOperation(index, randomVector(600), shape, combine, {
    softness: Math.round(next() * 200) / 1000,
    orientation: randomRotation(),
    colour: {
      r: Math.floor(next() * 256),
      g: Math.floor(next() * 256),
      b: Math.floor(next() * 256),
    },
    opacity: Math.round(next() * 100) / 100,
  });
};

/**
 * Compares two numbers to float32 precision.
 *
 * The format stores 32-bit floats, which carry about seven significant decimal
 * digits. So the tolerance has to be *relative*: a fixed absolute tolerance tight
 * enough for a small value is far too tight for a large one — 322.69 comes back as
 * 322.6900024, which is wrong in the eighth digit and not wrong at all.
 */
const FLOAT32_RELATIVE = 1e-6;

const expectFloat32 = (
  actual: number,
  expected: number,
  where: string,
): void => {
  const tolerance = FLOAT32_RELATIVE * Math.max(1, Math.abs(expected));
  expect(
    Math.abs(actual - expected),
    `${where}: ${actual} vs ${expected}`,
  ).toBeLessThanOrEqual(tolerance);
};

/**
 * Compares two operation lists at float32 precision.
 *
 * Losing the last bits is not a defect to work around: a 10-unit voxel is being
 * carved, so a feature a ten-millionth of a unit across is not a thing anyone can
 * observe, and float32 is half the file size of float64. What matters is that every
 * *field* comes back — a shape whose radius read back as a capsule's length would
 * pass any tolerance check and still be wrong — so the comparison is structural and
 * only the numbers are approximate.
 */
const expectSameOperations = (
  back: Operation[],
  written: Operation[],
): void => {
  expect(back).toHaveLength(written.length);
  for (const [i, operation] of written.entries()) {
    const other = back[i];
    const where = `operation ${i}`;
    expect(other.index, where).toBe(operation.index);
    expect(other.combine, where).toBe(operation.combine);
    expect(other.shape.type, where).toBe(operation.shape.type);
    expectFloat32(other.origin.x, operation.origin.x, `${where} origin.x`);
    expectFloat32(other.origin.y, operation.origin.y, `${where} origin.y`);
    expectFloat32(other.origin.z, operation.origin.z, `${where} origin.z`);
    expectFloat32(
      other.orientation.x,
      operation.orientation.x,
      `${where} orientation.x`,
    );
    expectFloat32(
      other.orientation.y,
      operation.orientation.y,
      `${where} orientation.y`,
    );
    expectFloat32(
      other.orientation.z,
      operation.orientation.z,
      `${where} orientation.z`,
    );
    expectFloat32(
      other.orientation.w,
      operation.orientation.w,
      `${where} orientation.w`,
    );
    expectFloat32(other.softness, operation.softness, `${where} softness`);
    expect(other.colour, where).toEqual(operation.colour);
    expectFloat32(other.opacity, operation.opacity, `${where} opacity`);

    // **The parameters are compared through the table, not by hand.**
    //
    // This used to be a two-branch conditional: a capsule's `len` and `radius` as
    // scalars, and everything else's `len` or `radius` as three axes. It was correct
    // for three primitives and would have silently stopped covering the shape list
    // the day a round box or a torus arrived — the comparison would fall through to
    // the vec3 branch and read `radius` off a torus, which has `minorRadius`.
    //
    // Flattening both sides through `parametersToFloats` compares the same floats the
    // file holds, in the table's own order, and covers all nine primitives without
    // this test knowing how many there are.
    const before = parametersToFloats(operation.shape);
    const after = parametersToFloats(other.shape);
    expect(after.length, `${where} parameter count`).toBe(before.length);
    for (const [i, value] of before.entries()) {
      expectFloat32(after[i], value, `${where} parameter ${i}`);
    }
  }
};

/**
 * One of every primitive that version 4 could write.
 *
 * **No `Polygon`,** because version 4 had no such type byte and a file claiming one is
 * refused rather than read.
 */
const legacyFixtures: readonly OperationShape[] = PRIMITIVE_NAMES.filter(
  (name) => name !== "Polygon",
).map((name) => sampleShape(name));

/**
 * A version 4 file, written the way version 4 wrote it.
 *
 * **Deliberately not `serialiseOperations` with the version stamped.** That would prove the
 * gate lets the number through and nothing about the layout, and it would go on passing if
 * version 5 had moved a byte. This one lays the record out the old way — the fixed part, the
 * shape's parameters counted **from the table by type**, colour, opacity, material — using the
 * width arithmetic version 4 had, which is what has to coincide with the current reader's.
 */
const writeVersion4 = (): ArrayBuffer => writeLegacy(4);

/**
 * A version 3 file, written the way version 3 wrote it.
 *
 * **The same eight primitives, minus the trailing byte.** Version 4 appended a material
 * index to every operation (ADR 0048), so a version 3 record is one byte shorter per
 * operation and has no material field at all — not a material of zero, which is the
 * distinction that matters: spreading `{ material: undefined }` would put a key in the
 * operation with nothing under it.
 */
const writeVersion3 = (): ArrayBuffer => writeLegacy(3);

const writeLegacy = (version: number): ArrayBuffer => {
  // The old rule: a fixed handful of numbers, counted from the type. There was no per-shape
  // flattening for it to disagree with.
  //
  // Forty-two bytes of fixed part — combine and type, an origin, an orientation, a softness,
  // a colour, an opacity and a material — and the shape's floats after them. Spelled out
  // rather than imported, because the point of this file is that it does not share the
  // writer's arithmetic: a shared constant would make the test agree with the code it is
  // supposed to be checking.
  const shapeFloats = (shape: OperationShape): number => {
    let floats = 0;
    for (const parameter of PRIMITIVES[shape.type].parameters) {
      floats += parameter.arity === "variable" ? 1 : parameter.arity;
    }
    return floats;
  };
  // Version 3 wrote no material byte, so its record is one byte shorter.
  const trailing = version >= 4 ? 1 : 0;
  const FIXED = 1 + 1 + 12 + 16 + 4 + 3 + 4 + trailing;

  let bytes = 2 + 4;
  for (const shape of legacyFixtures) bytes += FIXED + shapeFloats(shape) * 4;

  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  view.setUint16(0, version, true);
  view.setUint32(2, legacyFixtures.length, true);
  let at = 6;
  for (const [index, shape] of legacyFixtures.entries()) {
    view.setUint8(at, 0); // combine: Add
    view.setUint8(at + 1, PRIMITIVES[shape.type].code);
    at += 2;
    view.setFloat32(at, index, true); // origin x, y, z
    view.setFloat32(at + 4, 2, true);
    view.setFloat32(at + 8, 3, true);
    at += 12;
    view.setFloat32(at, 0, true); // orientation x, y, z, w
    view.setFloat32(at + 4, 0, true);
    view.setFloat32(at + 8, 0, true);
    view.setFloat32(at + 12, 1, true);
    at += 16;
    view.setFloat32(at, 0.25, true); // softness
    at += 4;
    const floats = parametersToFloats(shape);
    for (const [i, value] of floats.entries()) {
      view.setFloat32(at + i * 4, value, true);
    }
    at += floats.length * 4;
    view.setUint8(at, 10); // colour r, g, b
    view.setUint8(at + 1, 20);
    view.setUint8(at + 2, 30);
    view.setFloat32(at + 3, 0.5, true); // opacity
    if (trailing > 0) {
      view.setUint8(at + 7, 3); // material
    }
    at += 3 + 4 + trailing;
  }
  return buffer;
};

describe("the operation list round trip", () => {
  it("reads back every field that was written", () => {
    const operations = Array.from({ length: 200 }, (_, i) =>
      randomOperation(i),
    );
    const back = deserialiseOperations(serialiseOperations(operations));
    expectSameOperations(back, operations);
  });

  it("round-trips an empty list", () => {
    expect(deserialiseOperations(serialiseOperations([]))).toEqual([]);
  });

  it("round-trips every shape type", () => {
    // Each shape has a different parameter count, so a format that assumed one size
    // would parse two of the three correctly and the third into the next operation.
    const operations = [
      makeOperation(
        0,
        { x: 1, y: 2, z: 3 },
        { type: "Ellipsoid", radius: { x: 4, y: 5, z: 6 } },
        "Add",
      ),
      makeOperation(
        1,
        { x: 1, y: 2, z: 3 },
        { type: "Box", len: { x: 4, y: 5, z: 6 } },
        "Subtract",
      ),
      makeOperation(
        2,
        { x: 1, y: 2, z: 3 },
        { type: "Capsule", len: 7, radius: 8 },
        "Add",
      ),
      makeOperation(
        3,
        { x: 1, y: 2, z: 3 },
        { type: "Capsule", len: 7, radius: 8 },
        "Paint",
        {
          colour: { r: 9, g: 10, b: 11 },
        },
      ),
    ];
    // **The one field that does not come back equal is `colour`,** and only for the
    // operations built without one: the file has three bytes for colour and no way to
    // say "absent", so they read back white. The separate test below makes that the
    // subject rather than a footnote, because under version 3 it is the reason an old
    // file is refused instead of migrated.
    const back = deserialiseOperations(serialiseOperations(operations));
    expect(back.map((operation) => operation.shape)).toEqual(
      operations.map((operation) => operation.shape),
    );
    expect(back.map((operation) => operation.combine)).toEqual(
      operations.map((operation) => operation.combine),
    );
    // The two that were given a colour keep it.
    expect(back[3]?.colour).toEqual({ r: 9, g: 10, b: 11 });
    expect(back[0]?.colour, "an absent colour reads back white").toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
  });

  it("round-trips a rotated operation, rather than losing its orientation", () => {
    // An orientation is four floats that nothing else in the file repeats, so a
    // format that forgot it would produce a correctly-shaped primitive at the right
    // position pointing the wrong way — which looks like a renderer bug, not a file
    // bug.
    // Normalised here rather than written out by hand, because a quaternion that is
    // not quite unit fails the length assertion below for reasons that have nothing
    // to do with the format — and this test is about the round trip.
    const raw = { x: 0.183, y: -0.548, z: 0.732, w: 0.361 };
    const length = Math.hypot(raw.x, raw.y, raw.z, raw.w);
    const orientation = {
      x: raw.x / length,
      y: raw.y / length,
      z: raw.z / length,
      w: raw.w / length,
    };
    const operation = makeOperation(
      0,
      { x: 0, y: 0, z: 0 },
      { type: "Box", len: { x: 1, y: 2, z: 3 } },
      "Add",
      {
        orientation,
      },
    );
    const [back] = deserialiseOperations(serialiseOperations([operation]));
    for (const axis of ["x", "y", "z", "w"] as const) {
      expectFloat32(
        back.orientation[axis],
        orientation[axis],
        `orientation ${axis}`,
      );
    }
    // And it is still a unit quaternion to float32 precision, which is what the
    // distance functions assume when they rotate by it. They are not exact even so —
    // the error is around three parts in ten thousand — and it is three parts in ten
    // thousand of a 10-unit voxel, so nothing downstream can observe it.
    const roundTripped = Math.hypot(
      back.orientation.x,
      back.orientation.y,
      back.orientation.z,
      back.orientation.w,
    );
    expectFloat32(roundTripped, 1, "quaternion length");
  });

  it("reads a version 3 file, which is one byte shorter per operation", () => {
    // **The file in the wild, reduced to its essentials.** Version 3 predates the material
    // byte (ADR 0048), so its record is 41 bytes where this reader's is 42 — and reading a
    // byte that is not there would consume the first byte of the *next* operation and put
    // every operation from the second onwards one byte out. The bounds check would not catch
    // that, because the arithmetic stays inside the buffer; only reading the fields does.
    //
    // So: every primitive, every field, and **no material key at all** on the operations.
    const legacy = writeVersion3();
    expect(new DataView(legacy).getUint16(0, true)).toBe(3);

    const back = deserialiseOperations(legacy);
    expect(back.map((operation) => operation.shape.type)).toEqual(
      legacyFixtures.map((shape) => shape.type),
    );
    for (const [i, operation] of back.entries()) {
      expectFloat32(operation.origin.x, i, `origin.x of ${i}`);
      expectFloat32(operation.softness, 0.25, `softness of ${i}`);
      expect(operation.colour, `colour of ${i}`).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
      expectFloat32(operation.opacity, 0.5, `opacity of ${i}`);
      // **Absent rather than zero, and rather than a key with nothing under it.** A version 3
      // operation never chose a material; reporting it as having chosen "none" would be a
      // claim about it, and `{ material: undefined }` would not survive a JSON round trip.
      expect(operation.material, `material of ${i}`).toBeUndefined();
      expect("material" in operation, `material key of ${i}`).toBe(false);
      const read = parametersToFloats(operation.shape);
      const wrote = parametersToFloats(legacyFixtures[i]!);
      expect(read.length, `parameter count of ${i}`).toBe(wrote.length);
      for (const [j, value] of wrote.entries()) {
        expectFloat32(read[j]!, value, `parameter ${j} of ${i}`);
      }
    }
  });

  it("reads a version 4 file, because the layout did not move", () => {
    // **The compatibility claim, checked against a file this build did not write.**
    //
    // Stamping the current bytes with a 4 is not a test of anything: it only proves the
    // version gate lets the number through, and it would keep passing if the *layout* had
    // moved. So the buffer here is written the way version 4 wrote it — the fixed part, then
    // the shape's parameters counted from the table by type, then colour, opacity and
    // material — and read back by the current reader.
    //
    // Every primitive that is not a polygon is in it, because that is the whole of the claim:
    // for those nine, the two layouts are the same bytes.
    const legacy = writeVersion4();
    expect(new DataView(legacy).getUint16(0, true)).toBe(4);

    const built = legacyFixtures.map((shape, index) =>
      makeOperation(index, { x: index, y: 2, z: 3 }, shape, "Add", {
        softness: 0.25,
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        colour: { r: 10, g: 20, b: 30 },
        opacity: 0.5,
        material: 3,
      }),
    );
    const back = deserialiseOperations(legacy);
    expect(back.map((operation) => operation.shape.type)).toEqual(
      legacyFixtures.map((shape) => shape.type),
    );
    // Every field, because "the layout did not move" is a claim about all of them and not
    // only about the type bytes.
    for (const [i, operation] of back.entries()) {
      const wanted = built[i]!;
      expectFloat32(operation.origin.x, wanted.origin.x, "origin.x");
      expectFloat32(operation.origin.y, wanted.origin.y, "origin.y");
      expectFloat32(operation.origin.z, wanted.origin.z, "origin.z");
      expectFloat32(operation.softness, 0.25, "softness");
      expect(operation.colour).toEqual({ r: 10, g: 20, b: 30 });
      expectFloat32(operation.opacity, 0.5, "opacity");
      // **And the material is read**, which is the one field version 4 has and version 3
      // does not — so this is what a byte-per-operation difference looks like from the
      // inside, and it is why version 3 needs a rule rather than this path unchanged.
      expect(operation.material).toBe(3);
      const read = parametersToFloats(operation.shape);
      const wrote = parametersToFloats(wanted.shape);
      expect(read.length, `parameter count of ${wanted.shape.type}`).toBe(
        wrote.length,
      );
      for (const [j, value] of wrote.entries()) {
        expectFloat32(read[j]!, value, `${wanted.shape.type} parameter ${j}`);
      }
    }
  });
});

describe("the file format's size", () => {
  it("is exactly the buffer it hands back", () => {
    // The mesher's upload budget is denominated in bytes, and a size that is an
    // estimate is a budget that is wrong by whatever the estimate missed.
    for (const count of [0, 1, 7, 200]) {
      const operations = Array.from({ length: count }, (_, i) =>
        randomOperation(i),
      );
      const buffer = serialiseOperations(operations);
      expect(buffer.byteLength, `${count} operations`).toBe(
        serialisedSize(operations),
      );
    }
  });

  it("reuses a buffer of exactly the right size", () => {
    const operations = Array.from({ length: 20 }, (_, i) => randomOperation(i));
    const size = serialisedSize(operations);
    const target = new ArrayBuffer(size);
    expect(serialiseOperations(operations, target)).toBe(target);
  });

  it("allocates a fresh buffer when handed one of the wrong size", () => {
    const operations = Array.from({ length: 20 }, (_, i) => randomOperation(i));
    const wrong = new ArrayBuffer(serialisedSize(operations) + 1);
    const result = serialiseOperations(operations, wrong);
    expect(result).not.toBe(wrong);
    expect(result.byteLength).toBe(serialisedSize(operations));
  });

  it("scales with what the user did, not with how big the model is", () => {
    // The consequence of the field being computed rather than stored: a file's size
    // is a function of the operation count alone. A thousand operations is a few
    // tens of kilobytes — a saved voxel grid for the same model would have been
    // hundreds of megabytes.
    const thousand = Array.from({ length: 1000 }, (_, i) =>
      makeOperation(
        i,
        { x: 0, y: 0, z: 0 },
        { type: "Ellipsoid", radius: { x: 1, y: 1, z: 1 } },
        "Add",
      ),
    );
    // Fifty-four bytes an ellipsoid, fifty-four for a box, fifty for a
    // capsule, plus six for the header.
    expect(serialisedSize(thousand)).toBe(1000 * 54 + 6);
  });

  it("sizes a polygon from the points it has rather than from its type", () => {
    // **The invariant version 5 rests on, and the one that fails silently.** A buffer
    // sized from the *type* and filled from the *shape* is right for the nine primitives
    // whose two agree and wrong for a polygon by two floats per point it has. Writing
    // then overruns into the next operation; the reader resumes at a plausible offset and
    // every operation after it is a plausible shape in the wrong place.
    //
    // Both halves are checked against each other here because this is the only place
    // they can be: `sdf` has the count and the sizer has the bytes, and neither knows
    // what the other did.
    const fixed = 1 + 1 + 3 * 4 + 4 * 4 + 4 + 3 + 4 + 1;
    for (const points of [3, 4, 9, 64]) {
      const outline = Array.from({ length: points }, (_, i) => ({
        x: i * 1.5,
        z: -i * 0.5,
      }));
      const shape: OperationShape = {
        type: "Polygon",
        points: outline,
        len: 0.5,
      };
      const operation = makeOperation(0, { x: 0, y: 0, z: 0 }, shape, "Add");
      expect(parametersToFloats(shape).length, `${points} points`).toBe(
        2 + points * 2,
      );
      expect(serialisedSize([operation]), `${points} points`).toBe(
        6 + fixed + (2 + points * 2) * 4,
      );
      // And the buffer really is that long, which is what makes the size an allocation
      // rather than an intention.
      expect(
        serialiseOperations([operation]).byteLength,
        `${points} points`,
      ).toBe(serialisedSize([operation]));
    }
  });

  it("round-trips a polygon next to nine fixed shapes without shifting one", () => {
    // **A polygon between two operations is the case that catches an off-by-one in the
    // width**, because the damage lands on whatever follows it rather than on the
    // polygon. The shape types are in a fixed order so a failure names which neighbour
    // it was.
    const neighbours: readonly ShapeType[] = [
      "Sphere",
      "Polygon",
      "Box",
      "Polygon",
      "Torus",
    ];
    const operations = neighbours.map((type, index) =>
      makeOperation(
        index,
        { x: index, y: 1, z: 2 },
        sampleShape(type),
        index % 2 === 0 ? "Add" : "Subtract",
        // A colour, because an operation without one is written white and read back
        // white — the one field a round trip does not preserve, and not what this test
        // is about.
        { colour: { r: 10 + index, g: 20, b: 30 } },
      ),
    );
    const back = deserialiseOperations(serialiseOperations(operations));
    expect(back.map((operation) => operation.shape.type)).toEqual(neighbours);
    expectSameOperations(back, operations);
  });
});

describe("refusing a malformed file", () => {
  it("refuses a version it does not know", () => {
    // Read at this version's field widths, a later version's file would parse into a
    // list of plausible primitives at plausible positions. Refusing is better than
    // producing a model that is subtly not the one that was saved.
    const buffer = serialiseOperations([randomOperation(0)]);
    new DataView(buffer).setUint16(0, FORMAT_VERSION + 1, true);
    expect(() => deserialiseOperations(buffer)).toThrow(FormatError);
    expect(() => deserialiseOperations(buffer)).toThrow(/version/);
  });

  it("round-trips every primitive in the table, one per file", () => {
    // **Per primitive, rather than in a random mix.** A mixed round trip can pass with
    // one primitive's parameters silently swapped for another's: the reader and writer
    // would have to be wrong in the *same* place, which is the case a table removes but
    // a test should still not rely on. One file per primitive means a failure names the
    // shape rather than an index, and a primitive with no coverage is visible as a
    // missing entry in the loop rather than as a shape that happens to come up rarely.
    for (const type of PRIMITIVE_NAMES) {
      const shape = sampleShape(type);
      const written = [
        makeOperation(0, { x: 1, y: 2, z: 3 }, shape, "Add", { softness: 0 }),
      ];
      const back = deserialiseOperations(serialiseOperations(written));
      expect(back, type).toHaveLength(1);
      expect(back[0].shape.type, type).toBe(type);
      // Float32 precision, not `toEqual`: the file stores 32-bit floats and the
      // sample was generated in doubles, so an exact comparison fails on a value that
      // came back correctly.
      const before = parametersToFloats(shape);
      const after = parametersToFloats(back[0].shape);
      expect(after.length, type).toBe(before.length);
      for (const [i, value] of before.entries()) {
        expectFloat32(after[i], value, `${type} parameter ${i}`);
      }
    }
  });

  it("round-trips a material, and reads an absent one as absent", () => {
    // **The byte is new at version 4, so it is the one field with no older file behind
    // it and therefore nothing to have caught a mistake.** Two cases and both matter:
    // a material that was asked for has to survive, and an operation that never asked
    // has to come back *absent* rather than as a material zero — because a reader that
    // treated the two alike would make every operation in a model claim to have chosen
    // something, which is the same defect the colour field documents about itself.
    const shape = sampleShape("Box");
    const roundTrip = (material?: number): Operation => {
      const written = [
        makeOperation(0, { x: 0, y: 0, z: 0 }, shape, "Add", {
          ...(material === undefined ? {} : { material }),
        }),
      ];
      const back = deserialiseOperations(serialiseOperations(written));
      expect(back).toHaveLength(1);
      return back[0];
    };

    expect(roundTrip(7).material).toBe(7);

    // **Zero and absent are the same claim, and both come back absent.** The byte has
    // only 256 values and "no material" is one of them, so the writer stores a missing
    // material as zero and the reader turns a stored zero back into a missing one. What
    // that buys is that `operation.material === 0` and `operation.material === undefined`
    // cannot mean different things to two readers — the alternative is a third state
    // that only ever means what the first two already mean.
    expect(roundTrip(0).material).toBeUndefined();
    expect(roundTrip().material).toBeUndefined();
    expect("material" in roundTrip()).toBe(false);
  });

  it("writes the version it reads, and refuses an earlier file", () => {
    // **The version is now 5, because a shape's width is no longer a function of its
    // type** — a polygon writes its own point count, so a reader that derived the width
    // from the type byte would resume in the middle of an outline and read every
    // operation after it at a plausible offset. It went to 4 before that because an
    // operation says which procedural material its surface wears, one byte after the
    // opacity. It went to 3 before that because a colour counts on any operation now,
    // so a version 2 file — whose `Add` operations carry the brush's colour, whether or
    // not it was meant to — would paint a whole model on load. It went to 2 before that
    // because the capsule's axis changed.
    //
    // The refusal is the whole mechanism every time; this is the test that it is still
    // in place. A width the file carries is the case where a lenient reader does the most
    // damage: nothing about the bytes looks wrong, and the model that comes out is a list
    // of plausible shapes at plausible positions.
    expect(FORMAT_VERSION).toBe(5);

    // A file stamped with each version this build does not read, whose bytes are otherwise
    // perfectly well formed. **Versions 3 and 4 are not in this list**, because they are:
    // the only things they lack are a shape that writes its own width and a trailing byte
    // per operation, and `ABSENT_TRAILING_BYTES` says which. Version 2 and below changed
    // what the bytes *mean* — the capsule's axis, and a colour that counts everywhere — so
    // they are refused, and that refusal is the whole point of the version byte.
    for (const earlier of [1, 2]) {
      const stamped = serialiseOperations([randomOperation(0)]);
      new DataView(stamped).setUint16(0, earlier, true);
      expect(
        () => deserialiseOperations(stamped),
        `version ${earlier} must be refused`,
      ).toThrow(/version/i);
    }
  });

  it("writes the lowest version that can describe the model", () => {
    // **The other half of backwards compatibility.** Reading the older versions is half;
    // if the writer stamped 5 unconditionally then opening a project and saving it — with
    // no polygon anywhere in it — would produce a file the previous build cannot open, and
    // the compatibility would have a very short life.
    const stamped = (operations: readonly Operation[]): number =>
      new DataView(serialiseOperations(operations)).getUint16(0, true);
    const shape = (type: ShapeType): OperationShape => sampleShape(type);

    // A model of shapes version 4 could write is written at 4, which the previous build
    // reads. That is the whole point.
    expect(stamped([])).toBe(4);
    for (const type of PRIMITIVE_NAMES.filter((n) => n !== "Polygon")) {
      expect(
        stamped([makeOperation(0, { x: 0, y: 0, z: 0 }, shape(type), "Add")]),
        `${type} alone`,
      ).toBe(4);
      expect(
        stamped([
          makeOperation(0, { x: 0, y: 0, z: 0 }, shape(type), "Add"),
          makeOperation(1, { x: 1, y: 0, z: 0 }, shape("Sphere"), "Add"),
        ]),
        `${type} and a sphere`,
      ).toBe(4);
    }

    // **And one polygon anywhere in the list is enough to need the newer version**, since
    // the version describes the file rather than the operation.
    const floor: OperationShape = {
      type: "Polygon",
      len: 1,
      points: [
        { x: 0, z: 0 },
        { x: 2, z: 0 },
        { x: 2, z: 2 },
      ],
    };
    expect(
      stamped([makeOperation(0, { x: 0, y: 0, z: 0 }, floor, "Add")]),
    ).toBe(5);
    expect(
      stamped([
        makeOperation(0, { x: 0, y: 0, z: 0 }, shape("Box"), "Add"),
        makeOperation(1, { x: 1, y: 0, z: 0 }, floor, "Add"),
        makeOperation(2, { x: 2, y: 0, z: 0 }, shape("Torus"), "Add"),
      ]),
    ).toBe(5);

    // **And the two bytes are the only difference**, which is the claim the whole of this
    // rests on. A file stamped 4 is only a file the previous build can read if the rest of
    // it is byte-for-byte what that build would have written — so compare against the same
    // operations stamped 5, which is what an unconditional writer would have produced.
    const mixed = [
      makeOperation(0, { x: 0, y: 0, z: 0 }, shape("Box"), "Add"),
      makeOperation(1, { x: 1, y: 0, z: 0 }, shape("Ellipsoid"), "Add"),
    ];
    const asVersion4 = new Uint8Array(serialiseOperations(mixed));
    expect(asVersion4.byteLength).toBe(serialisedSize(mixed));
    const asVersion5 = new Uint8Array(serialiseOperations(mixed));
    new DataView(asVersion5.buffer).setUint16(0, FORMAT_VERSION, true);

    expect(asVersion4.byteLength, "the two versions size differently").toBe(
      asVersion5.byteLength,
    );
    const differing: number[] = [];
    for (let i = 0; i < asVersion4.length; i++) {
      if (asVersion4[i] !== asVersion5[i]) differing.push(i);
    }
    // **One byte, and it is the first.** A `u16` written little-endian puts its *low* byte at
    // the lower address, and 4 and 5 both fit in one, so the header reads `04 00` and `05 00`
    // and only the first byte moves. Asserted rather than glossed over, because "only the
    // version differs" is the claim and the byte list is what makes it checkable.
    expect(differing).toEqual([0]);

    // And it reads back under both stamps, which is the other half.
    expect(deserialiseOperations(asVersion4.buffer).length).toBe(mixed.length);
    expect(deserialiseOperations(asVersion5.buffer).length).toBe(mixed.length);
  });

  it("gives an operation with no colour a white one on the way back", () => {
    // **The one thing a round trip does not preserve, and the reason the version went
    // up.** An operation built with no colour is written as white and read back with
    // one, because the file format has three bytes for colour and no way to say
    // "absent". Under version 3 that difference is no longer invisible — a version 2
    // file full of brush-coloured `Add` operations would paint — which is exactly why
    // old files are refused rather than migrated.
    const built = makeOperation(
      0,
      { x: 0, y: 0, z: 0 },
      { type: "Sphere", radius: 1 },
      "Add",
    );
    expect(built.colour, "built with no colour at all").toBeUndefined();
    const back = deserialiseOperations(serialiseOperations([built]));
    expect(back[0]?.colour, "read back as white").toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
  });

  it("refuses a file too short to hold a header", () => {
    expect(() => deserialiseOperations(new ArrayBuffer(0))).toThrow(
      FormatError,
    );
    expect(() => deserialiseOperations(new ArrayBuffer(5))).toThrow(
      /at least 6 bytes/,
    );
  });

  it("refuses a count that runs past the end of the buffer", () => {
    // A truncated download, or a file whose count field is corrupt. Reading on would
    // return operations made of whatever followed.
    const operations = Array.from({ length: 10 }, (_, i) => randomOperation(i));
    const buffer = serialiseOperations(operations);
    new DataView(buffer).setUint32(2, 10000, true);
    expect(() => deserialiseOperations(buffer)).toThrow(FormatError);
    expect(() => deserialiseOperations(buffer)).toThrow(/runs past the end/);
  });

  it("refuses a shape type it does not know", () => {
    const buffer = serialiseOperations([randomOperation(0)]);
    // The shape's type byte sits after the two combine/shape bytes.
    new DataView(buffer).setUint8(6 + 1, 99);
    expect(() => deserialiseOperations(buffer)).toThrow(/shape type 99/);
  });

  it("refuses a combine mode it does not know", () => {
    const buffer = serialiseOperations([randomOperation(0)]);
    new DataView(buffer).setUint8(6, 99);
    expect(() => deserialiseOperations(buffer)).toThrow(
      /99 is not a combine mode/,
    );
  });

  it("names itself when it throws, rather than throwing a bare error", () => {
    try {
      deserialiseOperations(new ArrayBuffer(3));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(FormatError);
      expect((error as FormatError).name).toBe("FormatError");
    }
  });

  it("refuses a variable-width shape inside an older file", () => {
    // **The exception's other half, and the reason the exception is safe.** A hand-edited
    // or corrupt version 3 or 4 buffer whose type byte claims a `Polygon` has a point count
    // where the reader expects a width. Parsing it would resume after whatever followed and
    // read every operation after it at a plausible offset, which is precisely the failure the
    // version byte exists to prevent — so it is refused by name, and the message says which
    // version claimed it so the file at fault is identifiable.
    for (const [version, write] of [
      [4, writeVersion4],
      [3, writeVersion3],
    ] as const) {
      const legacy = write();
      // Type byte 9 sits at offset 7: six bytes of header, then combine and shape type.
      new DataView(legacy).setUint8(7, PRIMITIVES.Polygon.code);
      expect(() => deserialiseOperations(legacy), `version ${version}`).toThrow(
        new RegExp(`version ${version}.*carries its own width`),
      );
    }
  });
});

describe("indices after a load", () => {
  it("are assigned by position, so a loaded list orders like a live one", () => {
    // Colour resolution and undo both depend on index order. A file that disagreed
    // with a live list about it would be a bug that appears only after a save and
    // reload — the worst time for one.
    const operations = [
      makeOperation(
        17,
        { x: 0, y: 0, z: 0 },
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        "Add",
      ),
      makeOperation(
        99,
        { x: 5, y: 0, z: 0 },
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        "Add",
      ),
      makeOperation(
        3,
        { x: 9, y: 0, z: 0 },
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        "Add",
      ),
    ];
    const back = deserialiseOperations(serialiseOperations(operations));
    expect(back.map((operation) => operation.index)).toEqual([0, 1, 2]);
    // And the list order — which is what the fold runs in — survives, even though
    // the stored indices were not sequential.
    expect(back.map((operation) => operation.origin.x)).toEqual([0, 5, 9]);
  });
});
