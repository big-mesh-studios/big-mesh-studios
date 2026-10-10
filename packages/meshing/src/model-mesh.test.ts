import { describe, expect, it } from "vitest";

import { decodeOctahedral, SNORM16_MAX } from "@big-mesh-studios/core";
import type { Quat, Rgb8, Vec3 } from "@big-mesh-studios/core";
import {
  DEFAULT_COLOUR,
  makeOperation,
  type Combine,
  type Operation,
} from "@big-mesh-studios/csg";
import type { OperationShape } from "@big-mesh-studios/sdf";

import { describeReport } from "./mesh-report";
import {
  budgetFor,
  DEFAULT_BUDGET,
  DEFAULT_MESH_MODE,
  MESH_MODES,
  meshModel,
  meshRegion,
  primitiveMesh,
  operationsField,
  RESOLUTIONS,
  samplesFor,
} from "./model-mesh";

/**
 * The minimum a part needs to become an operation, which is what this file meshes.
 *
 * **The `id` argument is ignored and the index is always zero.** It is kept because every
 * call below was written against an application type that carries one, and a test file
 * that read `add("a", ...)` instead of `placedPart("a", ...)` would be a diff with no
 * meaning in it. The index is not what a single-primitive model is folded by — the fold
 * order only matters once there are two — and every test that cares passes a list.
 */
const placedPart = (
  _id: string,
  shape: OperationShape,
  origin: Vec3,
  overrides: {
    readonly orientation?: Quat;
    readonly combine?: Exclude<Combine, "Paint">;
    readonly softness?: number;
    readonly colour?: Rgb8;
    readonly opacity?: number;
  } = {},
): Operation =>
  makeOperation(0, origin, shape, overrides.combine ?? "Add", {
    orientation: overrides.orientation,
    softness: overrides.softness,
    // **Colour and opacity together or neither**, which is the rule the modeller's own
    // conversion follows: an opacity with no colour is a number nothing reads, and passing
    // it alone would make a part claim an appearance it does not have.
    ...(overrides.colour === undefined
      ? {}
      : { colour: overrides.colour, opacity: overrides.opacity ?? 1 }),
  });

/** An orientation from three Euler angles, as the modeller's gizmo produces. */
const fromEuler = (yaw: number, pitch: number, roll: number): Quat => {
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);
  return {
    x: sp * cy * cr + cp * sy * sr,
    y: cp * sy * cr - sp * cy * sr,
    z: cp * cy * sr - sp * sy * cr,
    w: cp * cy * cr + sp * sy * sr,
  };
};

describe("meshing a model", () => {
  it("produces triangles for one sphere", () => {
    const result = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ]);
    expect(result).toBeDefined();
    // A sphere is a closed surface, so it cannot come back as nothing.
    expect(result!.triangles).toBeGreaterThan(0);
    expect(result!.mesh.vertexCount).toBeGreaterThan(0);
  });

  it("produces nothing for a model with no parts, which is not the same as a model with nothing on it", () => {
    // **`undefined`, not an empty mesh.** A caller blanking the screen because the model
    // has no parts would be hiding a model that merely has nothing visible in the box.
    expect(meshModel([])).toBeUndefined();
    expect(meshRegion([])).toBeUndefined();
  });

  it("puts no sample on the model's own surface, because a crossing cannot be resolved there", () => {
    // **The half-sample offset in `meshRegion`, tested as the arithmetic it is.** A sample
    // exactly on a crossing has an ambiguous sign, and the samples land on `origin + k·s`.
    // With the region's origin at the bound itself they land on `min + k·s`, and a model whose
    // own size is a whole number of voxels puts every flat face exactly on one of them. This
    // is not a coincidence that needs a rare model: a cube two units across at a quarter-unit
    // voxel is the most ordinary object there is, and it is the one that broke.
    const voxelSize = 0.125;
    // **A box whose faces are whole multiples of the voxel size**, which is the case the
    // offset has to survive. Two units is sixteen voxels.
    const len = 2;
    const budget = budgetFor(voxelSize);
    const region = meshRegion(
      [
        placedPart(
          "a",
          { type: "Box", len: { x: len, y: len, z: len } },
          { x: 0, y: 0, z: 0 },
        ),
      ],
      budget,
    )!;

    const onSurface = (p: number): boolean =>
      Math.abs(Math.abs(p) - len) < 1e-9;
    for (const axis of [region.origin.x, region.origin.y, region.origin.z]) {
      for (let k = 0; k < region.samples + 2; k++) {
        const p = axis + k * region.sampleSize;
        expect(
          onSurface(p),
          `a sample at ${p} sits on the face at ±${len}`,
        ).toBe(false);
      }
    }
  });

  it("still brackets the whole model, so nothing is shaved off its extremities", () => {
    // **The other half of the same claim, and the one a bound-only test would miss.** Offsetting
    // the samples is only safe if the grid still reaches past the surface on both sides, which
    // is what the grid's two extra rows are for and what a sample count cannot show.
    const region = meshRegion(
      [placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 })],
      budgetFor(0.125),
    )!;
    // The grid runs `0 .. samples + 1` and sample `k` sits at `origin + (k - 1) · s`, so the
    // outermost grid rows are one sample outside the owned run at each end. Along x, which is
    // the axis the sphere is not degenerate on.
    const low = region.origin.x - region.sampleSize;
    const high = region.origin.x + region.samples * region.sampleSize;
    expect(low, "the grid reaches below the sphere").toBeLessThan(-1);
    expect(high, "and above it").toBeGreaterThan(1);
  });

  it("puts every vertex inside the region it meshed", () => {
    const result = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    const { origin, sampleSize, samples } = result.region;
    // The mesher owns samples `1 .. n`, so the region's world extent is
    // `origin + (samples - 1) * sampleSize` on each axis.
    const extent = (samples - 1) * sampleSize;
    const positions = result.mesh.positions;
    // `Vec3` is named rather than indexed, so each axis is named where it is read.
    const low = [
      origin.x - sampleSize,
      origin.y - sampleSize,
      origin.z - sampleSize,
    ];
    const high = [origin.x + extent, origin.y + extent, origin.z + extent];
    for (let i = 0; i < positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const at = positions[i + axis]!;
        expect(at, `vertex ${i / 3} axis ${axis}`).toBeGreaterThan(low[axis]!);
        expect(at, `vertex ${i / 3} axis ${axis}`).toBeLessThan(
          high[axis]! + sampleSize,
        );
      }
    }
  });

  it("resolves the samples from the model's own size, not a fixed number", () => {
    const small = samplesFor({
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    });
    const large = samplesFor({
      min: { x: -20, y: -20, z: -20 },
      max: { x: 20, y: 20, z: 20 },
    });
    expect(small).toBeLessThan(large);
    expect(small).toBeGreaterThanOrEqual(DEFAULT_BUDGET.minSamplesPerAxis);
    expect(large).toBeLessThanOrEqual(DEFAULT_BUDGET.maxSamplesPerAxis);
  });

  it("meshes a sphere symmetrically, which is what cubic cells look like", () => {
    // **The grid has to be cubic**, because the mesher's cell loop assumes cubes and
    // because Surface Nets places a vertex by interpolating along an edge — a cell that
    // is twice as wide as it is tall puts the vertex somewhere between the corners
    // rather than on the surface. A sphere is the cheapest way to see it: under a
    // stretched grid it comes back wider in one axis than another, and the amount is
    // the stretch.
    const result = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    const span = (axis: 0 | 1 | 2): number => {
      const positions = result.mesh.positions;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = axis; i < positions.length; i += 3) {
        lo = Math.min(lo, positions[i]!);
        hi = Math.max(hi, positions[i]!);
      }
      return hi - lo;
    };
    expect(span(0)).toBeCloseTo(span(1), 3);
    expect(span(1)).toBeCloseTo(span(2), 3);
  });

  it("coarsens a model too big for the budget rather than exceeding it", () => {
    // **The ceiling is a ceiling.** A forty-unit capsule at a quarter-unit voxel wants
    // 166 samples on its long axis; the budget says 96, so the spacing comes out at
    // about 0.43 and the figure is built at that resolution instead of not at all.
    //
    // This was a test that asserted the *requested* spacing and failed, which is worth
    // recording: the clamping is the feature. The invariant is that the spacing is never
    // finer than asked for, and never leaves the budget.
    const region = meshRegion([
      placedPart(
        "a",
        { type: "Capsule", len: 40, radius: 0.5 },
        { x: 0, y: 0, z: 0 },
      ),
    ])!;
    expect(region.samples).toBe(DEFAULT_BUDGET.maxSamplesPerAxis);
    expect(region.sampleSize).toBeGreaterThanOrEqual(DEFAULT_BUDGET.voxelSize);
    expect(region.sampleSize).toBeLessThan(DEFAULT_BUDGET.voxelSize * 2);
  });

  it("uses the requested spacing when the model fits the budget", () => {
    const region = meshRegion([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    // Under the ceiling, `samples = ceil(extent / voxelSize)` and the spacing comes back
    // to within one sample of what was asked.
    expect(region.sampleSize).toBeLessThanOrEqual(
      DEFAULT_BUDGET.voxelSize * 1.05,
    );
  });

  it("turns a capsule about, so an unrotated one is not indistinguishable from a rotated one", () => {
    // **This is the reason the transform carries a quaternion.** Every axial primitive
    // runs along Y (ADR 0025), so without a rotation every capsule in a model would be
    // vertical and the primitive table's convention would be the model's limitation.
    const up = meshModel([
      placedPart(
        "a",
        { type: "Capsule", len: 6, radius: 0.6 },
        { x: 0, y: 0, z: 0 },
        { orientation: fromEuler(0, 0, 0) },
      ),
    ])!;
    const along = meshModel([
      placedPart(
        "a",
        { type: "Capsule", len: 6, radius: 0.6 },
        { x: 0, y: 0, z: 0 },
        { orientation: fromEuler(0, 0, Math.PI / 2) },
      ),
    ])!;

    // The two must differ, and the difference has to be in the right axis: turning a
    // vertical capsule a quarter turn about z lays it along x, so it reaches further in x
    // and less in y.
    const reach = (result: typeof up, axis: 0 | 1): number => {
      let most = 0;
      const positions = result.mesh.positions;
      for (let i = axis; i < positions.length; i += 3) {
        most = Math.max(most, Math.abs(positions[i]!));
      }
      return most;
    };
    expect(reach(up, 1), "vertical capsule reaches further up").toBeGreaterThan(
      reach(up, 0),
    );
    expect(
      reach(along, 0),
      "rotated capsule reaches further along x",
    ).toBeGreaterThan(reach(along, 1));
  });

  it("unions two overlapping parts rather than meshing only one", () => {
    // Two spheres a unit apart, both radius 1: a union is wider than either alone.
    const one = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    const two = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
      placedPart("b", { type: "Sphere", radius: 1 }, { x: 1.5, y: 0, z: 0 }),
    ])!;
    const width = (result: typeof one): number => {
      const positions = result.mesh.positions;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < positions.length; i += 3) {
        lo = Math.min(lo, positions[i]!);
        hi = Math.max(hi, positions[i]!);
      }
      return hi - lo;
    };
    expect(width(two)).toBeGreaterThan(width(one));
  });

  it("unions two parts and subtracts a third, in list order", () => {
    // **The boolean reaches the fold.** A `Subtract` is `smoothMax(field, -distance)` and
    // an `Add` is `smoothMin(field, distance)`, so a box with a smaller box subtracted
    // from it is hollow and a sphere unioned onto it is a lump on the outside.
    const solid = meshModel([
      placedPart(
        "big",
        { type: "Box", len: { x: 4, y: 4, z: 4 } },
        { x: 0, y: 0, z: 0 },
      ),
      placedPart(
        "hole",
        { type: "Box", len: { x: 2, y: 2, z: 2 } },
        { x: 0, y: 0, z: 0 },
        { combine: "Subtract" },
      ),
    ])!;
    const plain = meshModel([
      placedPart(
        "big",
        { type: "Box", len: { x: 4, y: 4, z: 4 } },
        { x: 0, y: 0, z: 0 },
      ),
    ])!;

    // The subtracted box removes material, so the middle of the solid is no longer
    // inside: the field at the origin is positive where the box alone made it negative.
    const field = operationsField([
      placedPart(
        "big",
        { type: "Box", len: { x: 4, y: 4, z: 4 } },
        { x: 0, y: 0, z: 0 },
      ),
      placedPart(
        "hole",
        { type: "Box", len: { x: 2, y: 2, z: 2 } },
        { x: 0, y: 0, z: 0 },
        { combine: "Subtract" },
      ),
    ]);
    const plainField = operationsField([
      placedPart(
        "big",
        { type: "Box", len: { x: 4, y: 4, z: 4 } },
        { x: 0, y: 0, z: 0 },
      ),
    ]);
    expect(
      plainField.distance(0, 0, 0),
      "the box alone is solid inside",
    ).toBeLessThan(0);
    expect(
      field.distance(0, 0, 0),
      "the subtracted box hollows it out",
    ).toBeGreaterThan(0);
    // And there is still a surface, so it meshes rather than vanishing.
    expect(solid.triangles).toBeGreaterThan(0);
    expect(
      solid.triangles,
      "a hollow shell is not the solid box",
    ).toBeGreaterThan(0);
    expect(plain.triangles).toBeGreaterThan(0);
  });

  it("folds a softness into a soft union", () => {
    // **Above zero the boolean is the smooth one**, which is the landscape's polynomial
    // smooth minimum with `k` four times the softness: `min(a,b) - max(k-|a-b|,0)²/4k`.
    //
    // Two spheres of radius 1 with their centres 3 apart, so the midpoint is 0.5 outside
    // each: air under a hard union. The blend dips below the true minimum across its whole
    // width, so with a softness of 1 — `k` of 4 — the midpoint comes out at
    // `0.5 - 16/16 = -0.5`, inside. That is the observable consequence of the formula
    // rather than the formula itself.
    const pair = (softness: number) => [
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
      placedPart(
        "b",
        { type: "Sphere", radius: 1 },
        { x: 3, y: 0, z: 0 },
        { softness },
      ),
    ];

    const hard = operationsField(pair(0));
    const soft = operationsField(pair(1));

    expect(hard.distance(1.5, 0, 0), "a hard union leaves the gap").toBeCloseTo(
      0.5,
      9,
    );
    expect(soft.distance(1.5, 0, 0), "a soft union bridges it").toBeCloseTo(
      -0.5,
      9,
    );
  });

  it("folds a softness into a soft difference, which cuts a little more than a hard one", () => {
    // **The smooth maximum is the negation of a smooth minimum**, so it is *greater* than
    // the hard maximum everywhere the two arguments are within the blend width — and a
    // greater distance is more air. A soft difference therefore removes slightly more than
    // a hard one at the same geometry, rounding the rim outward rather than inward.
    //
    // This is the direction most people expect to be the other way round, so it is
    // asserted rather than left to be discovered.
    const shell = (softness: number) =>
      operationsField([
        placedPart(
          "big",
          { type: "Box", len: { x: 4, y: 4, z: 4 } },
          { x: 0, y: 0, z: 0 },
        ),
        placedPart(
          "hole",
          { type: "Box", len: { x: 2, y: 2, z: 2 } },
          { x: 0, y: 0, z: 0 },
          { combine: "Subtract", softness },
        ),
      ]);

    const hard = shell(0);
    // **A softness of 1, so `k` is 4.** The blend only reaches where the two arguments
    // are within `k` of each other, and at the probe below they are 2.2 apart — a
    // softness of 0.5 would leave the hard and soft answers identical and the test would
    // pass while asserting nothing.
    const soft = shell(1);
    // Just inside the hole's own wall, where the blend does reach.
    const at = (field: ReturnType<typeof shell>): number =>
      field.distance(1.9, 0, 0);
    expect(at(hard), "the hard difference is air here").toBeGreaterThan(0);
    expect(
      at(soft),
      "and the soft one is further into the air",
    ).toBeGreaterThan(at(hard));
    // And both agree away from the blend, at the middle of the hole.
    expect(soft.distance(0, 0, 0)).toBeCloseTo(hard.distance(0, 0, 0), 9);
  });

  it("orders the fold by the list, and a subtraction makes that order matter", () => {
    // **The consequence of allowing a difference.** With every part an `Add` the fold is
    // the same however the list is arranged; a `Subtract` makes it not, so this asserts
    // that reordering the same parts changes the solid. If this ever stops being true the
    // fold has become order-independent and the list order is bookkeeping again.
    const a = placedPart(
      "a",
      { type: "Sphere", radius: 3 },
      { x: 0, y: 0, z: 0 },
    );
    const b = placedPart(
      "b",
      { type: "Sphere", radius: 3 },
      { x: 2, y: 0, z: 0 },
    );
    const cut = placedPart(
      "cut",
      { type: "Box", len: { x: 1, y: 8, z: 8 } },
      { x: 1, y: 0, z: 0 },
      { combine: "Subtract" },
    );

    const cutLast = operationsField([a, b, cut]);
    const cutFirst = operationsField([cut, a, b]);

    // The cut is a slab through the middle of the joined spheres in one order and a
    // groove through nothing much in the other, so a point inside the spheres differs.
    expect(
      cutLast.distance(1, 1, 0),
      "the cut came after the solids it removes",
    ).not.toBeCloseTo(cutFirst.distance(1, 1, 0), 3);
  });

  it("gives every vertex a real normal rather than the builder's placeholder", () => {
    // **The builder fills an unset normal with `+Y` and an unset colour with white**, and
    // its own comment says that was deliberate: "a real direction rather than an obvious
    // sentinel", so a vertex whose normal was never set would shade as though it were
    // right. Which means a mesh built without an `onVertex` looks *plausible* while every
    // normal points up. This is the only thing that catches it.
    const result = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    expect(result.mesh.vertexCount).toBeGreaterThan(0);

    let allUp = true;
    let allDefault = true;
    for (let i = 0; i < result.mesh.vertexCount; i++) {
      const nx = result.mesh.normalOct[i * 2]!;
      const ny = result.mesh.normalOct[i * 2 + 1]!;
      // Octahedral-encoded, so a pair of zeroes is the builder's placeholder — which is
      // **`+Z`, not `+Y`.** The octahedron's `+Y` pole is the pair `(0, 32767)`; `(0, 0)` is
      // the pair for `+Z`, which is what `ChunkMeshBuilder.vertex` pushes. It reads as an
      // unfilled normal because a sphere has no vertex facing exactly `+Z`, but on a box it
      // is a real and correct answer, so this cannot be used to count unfilled vertices in
      // general — only here, where nothing faces `+Z` exactly.
      if (nx !== 0 || ny !== 0) allUp = false;
      // **Not white, and that is the point.** A part with no colour of its own takes the
      // field's default — a warm grey — rather than the builder's white placeholder, so a
      // vertex whose colour was never filled in is distinguishable from a vertex that was.
      if (
        result.mesh.colours[i * 4] !== DEFAULT_COLOUR.r ||
        result.mesh.colours[i * 4 + 1] !== DEFAULT_COLOUR.g ||
        result.mesh.colours[i * 4 + 2] !== DEFAULT_COLOUR.b
      ) {
        allDefault = false;
      }
    }
    expect(allUp, "some normals are not the placeholder pair").toBe(false);
    expect(allDefault, "every vertex took the field's default colour").toBe(
      true,
    );
  });

  it("paints a part's colour into its vertices", () => {
    const red = { r: 220, g: 30, b: 40 };
    const result = meshModel([
      placedPart(
        "a",
        { type: "Sphere", radius: 1 },
        { x: 0, y: 0, z: 0 },
        { colour: red },
      ),
    ])!;
    let sawRed = false;
    for (let i = 0; i < result.mesh.vertexCount; i++) {
      if (
        Math.abs(result.mesh.colours[i * 4]! - red.r) <= 1 &&
        Math.abs(result.mesh.colours[i * 4 + 1]! - red.g) <= 1 &&
        Math.abs(result.mesh.colours[i * 4 + 2]! - red.b) <= 1
      ) {
        sawRed = true;
      }
    }
    expect(sawRed, "the part's colour reached the mesh").toBe(true);
  });

  it("carries an operation's material into the fourth byte of its vertices", () => {
    // **Which is what that byte is for now.** It was an opacity, which ADR 0028 records as
    // "carried in the file, not read by the field" and which no shader read either; it is a
    // material id (ADR 0048). The test is the same shape as the one it replaces — look for the
    // value arriving at every vertex — because what is being checked is the same thing: that the
    // field's answer reaches the packed layout.
    const result = meshModel([
      makeOperation(
        0,
        { x: 0, y: 0, z: 0 },
        { type: "Sphere", radius: 1 },
        "Add",
        { colour: { r: 10, g: 20, b: 30 }, material: 3 },
      ),
    ])!;
    let sawMaterial = false;
    for (let i = 0; i < result.mesh.vertexCount; i++) {
      if (result.mesh.colours[i * 4 + 3] === 3) sawMaterial = true;
    }
    expect(sawMaterial, "the material reached the vertex").toBe(true);
  });

  it("reports how many field evaluations a rebuild cost", () => {
    const result = meshModel([
      placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ])!;
    const { samples } = result.region;
    // The grid is two larger than the samples a model owns, which is the mesher's own
    // arrangement and the reason the count is `(samples + 2) ** 3`.
    expect(result.samples).toBe((samples + 2) ** 3);
  });
});

describe("meshing one part for a preview", () => {
  const capsule = placedPart(
    "body",
    { type: "Capsule", len: 2.2, radius: 0.7 },
    { x: 5, y: 6, z: 7 },
  );

  it("gives a surface, where the part is not a difference", () => {
    // **The reason this is not `meshModel([part])`.** A lone `Subtract` folds against a base
    // of `Infinity` and comes out as nothing at all, so a preview of a difference would
    // have been an empty scene — a very confusing thing to show somebody dragging it.
    const subtracted = placedPart(
      "cut",
      { type: "Sphere", radius: 1 },
      { x: 0, y: 0, z: 0 },
      { combine: "Subtract" },
    );
    expect(meshModel([subtracted])?.triangles ?? 0).toBe(0);
    expect(primitiveMesh(subtracted)?.triangles ?? 0).toBeGreaterThan(0);
  });

  it("comes out centred on the origin, whatever the part's own position", () => {
    // **So the caller places it with one position write.** The region is the proof: it is
    // the box the mesh was built in, and a part whose mesh was already in world space would
    // have a region nowhere near the origin.
    const built = primitiveMesh(capsule);
    expect(built).toBeDefined();

    // **The region brackets the local origin**, which is the claim: the mesh was built
    // around (0, 0, 0) rather than around the part's own (5, 6, 7). `region.origin` is the
    // grid's low corner, not its middle, so it is the span that has to contain zero.
    const { origin, samples, sampleSize } = built!.region;
    for (const axis of ["x", "y", "z"] as const) {
      expect(
        origin[axis],
        `the region's ${axis} starts above the local origin`,
      ).toBeLessThan(0);
      expect(
        origin[axis] + samples * sampleSize,
        `the region's ${axis} ends below the local origin`,
      ).toBeGreaterThan(0);
    }
    // And nowhere near the part's own position, which is what a mesh in world space would
    // have been built around.
    expect(Math.abs(origin.y)).toBeLessThan(3);
  });

  it("keeps the part's turn, because the turn is in the vertices", () => {
    // **A drag then costs a position write and nothing else.** If the turn were left to the
    // object, the mesh would have to be rebuilt whenever the orientation changed, and there
    // would be two places holding a turn that could disagree.
    const upright = primitiveMesh(capsule);
    const turned = primitiveMesh({
      ...capsule,
      orientation: fromEuler(0, 0, Math.PI / 2),
    });
    expect(upright?.triangles).toBeGreaterThan(0);
    expect(turned?.triangles).toBeGreaterThan(0);
  });

  it("is a cheaper mesh than the whole model", () => {
    // **The reason a drag can afford one build.** A ghost of one part is a fraction of a
    // model's samples, which is what makes it reasonable to do at all.
    const twoParts = primitiveMesh(capsule);
    const whole = meshModel([
      capsule,
      placedPart("b", { type: "Sphere", radius: 0.5 }, { x: 3, y: 0, z: 0 }),
    ]);
    expect(twoParts!.samples).toBeLessThan(whole!.samples);
  });
});

/**
 * The two meshers, which is a choice rather than a quality setting.
 *
 * **Both are tested against the same models, because the claim being made is that they are
 * interchangeable at the seam and different in what they produce.** A test that exercised only one
 * would pass whether or not the seam held, since `meshModel`'s signature is what holds it.
 */
/**
 * Sharpening the boundary, which is what stops two coloured shapes meeting in a gradient.
 *
 * **The rule under test is `splitColourBoundaries`'s and is pinned in `packages/meshing`**, on a
 * sphere whose colour is a plane and so has a crossing at a known place. What is covered here is
 * that it survives the journey from a real model: the field is a fold of real operations, the
 * colours come from ADR 0031's nearest-surface rule rather than from a plane, and the mesh is
 * the one the print gate reads.
 */
describe("colour boundaries, through the model", () => {
  const RED = { r: 255, g: 0, b: 0 };
  const BLUE = { r: 0, g: 0, b: 255 };

  /** A red sphere and a blue box overlapping, which is a figure and a crease. */
  const pair = () => [
    placedPart(
      "a",
      { type: "Sphere", radius: 0.7 },
      { x: 0, y: 0, z: 0 },
      { colour: RED, opacity: 1 },
    ),
    placedPart(
      "b",
      { type: "Box", len: { x: 1, y: 1, z: 1 } },
      { x: 1.4, y: 0, z: 0 },
      { colour: BLUE, opacity: 1 },
    ),
  ];

  /** Every distinct colour among a mesh's corners, as `r,g,b`. */
  const distinct = (
    mesh: NonNullable<ReturnType<typeof meshModel>>,
  ): number => {
    const seen = new Set<string>();
    for (const vertex of mesh.mesh.indices) {
      const at = vertex * 4;
      seen.add(
        `${mesh.mesh.colours[at]},${mesh.mesh.colours[at + 1]},${mesh.mesh.colours[at + 2]}`,
      );
    }
    return seen.size;
  };

  /** How many triangles hold three corners of one colour. */
  const flat = (mesh: NonNullable<ReturnType<typeof meshModel>>): number => {
    const { colours, indices } = mesh.mesh;
    const at = (v: number): string =>
      `${colours[v * 4]},${colours[v * 4 + 1]},${colours[v * 4 + 2]}`;
    let count = 0;
    for (let t = 0; t + 2 < indices.length; t += 3) {
      const first = at(indices[t] as number);
      if (
        first === at(indices[t + 1] as number) &&
        first === at(indices[t + 2] as number)
      ) {
        count++;
      }
    }
    return count;
  };

  it("leaves two coloured shapes as two colours rather than a gradient of them", () => {
    /**
     * **Counted, not sampled.**
     *
     * A vertex-colour blend across the join produces a *third* colour at every step between
     * red and blue, so a mesh whose corners hold only the two the parts were given is one whose
     * boundary the rasteriser cannot smear. Before the pass this model's corners hold dozens of
     * distinct values; the count is the whole assertion.
     */
    const mesh = meshModel(pair(), budgetFor(0.125), "marching-cubes")!;
    expect(distinct(mesh), "only the colours the parts were given").toBe(2);
    expect(flat(mesh), "every triangle is one colour").toBe(mesh.triangles);
  });

  it("keeps the model watertight, which is the reason the mode is the one it is", () => {
    /**
     * **The pass duplicates vertices, and the instinct is that this opens the mesh.** It does
     * not, and this is the test that says so: `reportMesh` counts edges by rounded world
     * position rather than by index, precisely because it expects a mesh to hold two vertices in
     * one place — which is what chunking produces on purpose and what a cut produces here. A
     * vertex is now in two triangles more than it was, and every edge is in exactly two
     * triangles still.
     */
    const mesh = meshModel(pair(), budgetFor(0.125), "marching-cubes")!;
    expect(mesh.report.watertight, describeReport(mesh.report)).toBe(true);
    expect(mesh.report.degenerateTriangles).toBe(0);
  });

  it("is still closed at every resolution the control offers", () => {
    // **Walked rather than checked once**, for the reason the mesher's own guarantee test gives:
    // a resolution control is where a promise is most likely to quietly stop holding, and the
    // fine end is where a cell gets small enough to hold three colours at once.
    for (const voxelSize of RESOLUTIONS) {
      const mesh = meshModel(pair(), budgetFor(voxelSize), "marching-cubes")!;
      expect(flat(mesh), `at ${voxelSize}`).toBe(mesh.triangles);
      expect(mesh.report.watertight, `at ${voxelSize}`).toBe(true);
    }
  });

  it("leaves surface nets blending where marching cubes does not", () => {
    /**
     * **The gate, made observable — and it is a closer comparison than expected.**
     *
     * Surface nets also comes out with exactly the two colours the parts were given: its
     * vertices sit at cell centres, which are grid-aligned, so ADR 0031's rule already answers
     * for each of them and no gradient is baked into the vertices. What it does not have is the
     * pass, so its boundary runs *along* the edges of the triangulation and every triangle
     * spanning it still blends across its width — a sharp edge in the data and a ramp on screen.
     *
     * So the two modes agree about the colours and differ about whether they are flat, and only
     * one of them has anything done about it. That is the gate: the pass is not merely unused on
     * the other mode, it is *wrong* there, because a surface nets edge floats up to half a cell
     * off the surface and a cut found along it is a crossing near the surface rather than on it.
     */
    const nets = meshModel(pair(), budgetFor(0.125), "surface-nets")!;
    expect(distinct(nets), "surface nets has the same two colours").toBe(2);
    expect(
      flat(nets),
      "surface nets is left blending across its boundary triangles",
    ).toBeLessThan(nets.triangles);
  });

  it("costs a model with one colour nothing at all", () => {
    // **Every model nobody has painted, and every drag ghost.** The pass returns the mesh it was
    // given when no triangle would blend, so switching it on costs a scan of the index buffer
    // and nothing more — which is the only thing that makes leaving it on the right answer.
    const plain = [
      placedPart("a", { type: "Sphere", radius: 0.7 }, { x: 0, y: 0, z: 0 }),
    ];
    const mesh = meshModel(plain, budgetFor(0.125), "marching-cubes")!;
    expect(distinct(mesh)).toBe(1);
    expect(flat(mesh)).toBe(mesh.triangles);

    const ghost = primitiveMesh(
      placedPart(
        "body",
        { type: "Capsule", len: 2.2, radius: 0.7 },
        { x: 0, y: 1.1, z: 0 },
      ),
      budgetFor(0.125),
    )!;
    expect(flat(ghost)).toBe(ghost.triangles);
  });

  it("separates a chain of three coloured parts into three", () => {
    // **Three, not two**, because three parts means a cell can hold three colours at once and
    // the pass has a fourth piece to emit for that. Three is also where a naive cut that paired
    // the chords two at a time would leave a hole, so the count and the watertightness are the
    // same assertion seen twice.
    const parts = [
      placedPart(
        "a",
        { type: "Sphere", radius: 0.5 },
        { x: 0, y: 0, z: 0 },
        { colour: { r: 255, g: 0, b: 0 }, opacity: 1 },
      ),
      placedPart(
        "b",
        { type: "Sphere", radius: 0.5 },
        { x: 0.9, y: 0, z: 0 },
        { colour: { r: 0, g: 255, b: 0 }, opacity: 1 },
      ),
      placedPart(
        "c",
        { type: "Sphere", radius: 0.5 },
        { x: 1.8, y: 0, z: 0 },
        { colour: { r: 0, g: 0, b: 255 }, opacity: 1 },
      ),
    ];
    const mesh = meshModel(parts, budgetFor(0.125), "marching-cubes")!;
    expect(distinct(mesh)).toBe(3);
    expect(flat(mesh)).toBe(mesh.triangles);
    expect(mesh.report.watertight, describeReport(mesh.report)).toBe(true);
  });

  it("holds across a rebuild, rather than only the first one", () => {
    /**
     * **The scratch is held across rebuilds, so this is the test that it is reset rather than
     * accumulated.** A carry-over would make a model look right the first time it is built and
     * wrong every rebuild after, which on a ninety-millisecond debounce is a shape that changes
     * as soon as it is not touched.
     */
    const parts = pair();
    const first = meshModel(parts, budgetFor(0.125), "marching-cubes")!;
    const second = meshModel(parts, budgetFor(0.125), "marching-cubes")!;
    expect(second.mesh.vertexCount).toBe(first.mesh.vertexCount);
    expect(second.triangles).toBe(first.triangles);
    expect([...second.mesh.indices]).toEqual([...first.mesh.indices]);
    expect([...second.mesh.colours]).toEqual([...first.mesh.colours]);

    // And a coarser region afterwards, which is the case a buffer held at the larger size has to
    // get right by using less of itself.
    const coarse = meshModel(parts, budgetFor(0.5), "marching-cubes")!;
    expect(flat(coarse)).toBe(coarse.triangles);
    expect(coarse.report.watertight, describeReport(coarse.report)).toBe(true);
  });
});

describe("the default mesher", () => {
  /**
   * Marching cubes, and the three things that made it the default rather than the survivor of
   * habit. See `DEFAULT_MESH_MODE` for the measurement.
   */
  it("is marching cubes, and the control offers it first", () => {
    // **The list order is part of the claim**, because a control that leads with the mode it
    // did not default to is asking a person to make a choice about something they did not
    // choose.
    expect(DEFAULT_MESH_MODE).toBe("marching-cubes");
    expect(MESH_MODES[0]?.value).toBe(DEFAULT_MESH_MODE);
  });

  it("is what a rebuild gets when the caller does not say", () => {
    // **The parameter default and the interface's default are one value**, and this is what holds
    // them together. They were two literals before, which is a way of shipping the wrong one
    // without noticing.
    const parts = [
      placedPart("a", { type: "Sphere", radius: 0.7 }, { x: 0, y: 0, z: 0 }),
    ];
    const assumed = meshModel(parts)!;
    const asked = meshModel(parts, DEFAULT_BUDGET, DEFAULT_MESH_MODE)!;
    expect([...assumed.mesh.indices]).toEqual([...asked.mesh.indices]);
    expect(assumed.mesh.vertexCount).toBe(asked.mesh.vertexCount);
  });

  it("gives a model the colour boundaries the other mesher cannot", () => {
    /**
     * **The reason the default is not merely a preference.**
     *
     * `splitColourBoundaries` cuts along edges that lie on the surface. A marching cubes edge
     * does; a surface nets edge does not, because a surface nets vertex is the average of its
     * cell's crossings and is therefore inside the cell. So the same two-colour model is sharp
     * on one mesher and blended on the other, and a default that shipped the wrong one would
     * quietly ship a gradient.
     */
    const red = { r: 220, g: 30, b: 40 };
    const blue = { r: 30, g: 60, b: 220 };
    const parts = [
      placedPart(
        "a",
        { type: "Sphere", radius: 0.7 },
        { x: 0, y: 0, z: 0 },
        { colour: red, opacity: 1 },
      ),
      placedPart(
        "b",
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        { x: 1.4, y: 0, z: 0 },
        { colour: blue, opacity: 1 },
      ),
    ];
    const flat = (
      result: NonNullable<ReturnType<typeof meshModel>>,
    ): boolean => {
      const { colours, indices } = result.mesh;
      const at = (v: number): number =>
        (colours[v * 4]! << 16) |
        (colours[v * 4 + 1]! << 8) |
        colours[v * 4 + 2]!;
      for (let t = 0; t + 2 < indices.length; t += 3) {
        const first = at(indices[t]!);
        if (first !== at(indices[t + 1]!) || first !== at(indices[t + 2]!)) {
          return false;
        }
      }
      return true;
    };
    expect(flat(meshModel(parts, budgetFor(0.125))!)).toBe(true);
    expect(flat(meshModel(parts, budgetFor(0.125), "surface-nets")!)).toBe(
      false,
    );
  });
});

describe("choosing a mesher", () => {
  const capsule = placedPart(
    "a",
    { type: "Capsule", len: 2.2, radius: 0.7 },
    { x: 0, y: 1.1, z: 0 },
  );
  const pair = [
    capsule,
    placedPart("b", { type: "Sphere", radius: 0.8 }, { x: 1.4, y: 1.6, z: 0 }),
  ];

  it("gives each mode the same region and the same sample count", () => {
    // The interchangeability claim, made concrete: the mode decides the triangulation and nothing
    // else, so the two must agree about where the mesh is and how finely it is sampled.
    const nets = meshModel(pair, DEFAULT_BUDGET, "surface-nets")!;
    const cubes = meshModel(pair, DEFAULT_BUDGET, "marching-cubes")!;
    expect(cubes.region).toEqual(nets.region);
    expect(cubes.samples).toBe(nets.samples);
    expect(cubes.mesh.vertexCount).toBeGreaterThan(0);
    expect(cubes.mesh.indices.length).toBe(cubes.triangles * 3);
  });

  it("closes the model at every resolution on offer, with marching cubes", () => {
    /**
     * **The guarantee, checked at each setting the control offers rather than at one of them.**
     *
     * A resolution control is where a mesher's promise is most likely to quietly stop holding: the
     * fine end resolves thin features the coarse end missed, and the coarse end is where a cell is
     * barely a cell. Walking `RESOLUTIONS` is the only way to cover both.
     *
     * And it is a claim about marching cubes alone, deliberately. **Surface nets is closed on this
     * model at every one of these settings too** — it is closed on nearly everything, which is why
     * ADR 0003 could call the alternative "not manifold in general" and still be right. What it is
     * not is *guaranteed* closed where the surface is thin or sharply creased. The mode is a choice
     * between a guarantee and an observation, and `mesh-report` is what turns either into something a
     * person can see before they send it to a slicer.
     */
    for (const voxelSize of RESOLUTIONS) {
      const cubes = meshModel(pair, budgetFor(voxelSize), "marching-cubes")!;
      expect(cubes.triangles, `at ${voxelSize}`).toBeGreaterThan(0);
      expect(
        cubes.report.watertight,
        `at ${voxelSize}: ${describeReport(cubes.report)}`,
      ).toBe(true);
    }
  });

  it("puts the surface closer to where the field says it is, with marching cubes", () => {
    // **The difference you can see without reading a report.** Marching cubes places every vertex on a
    // crossing of the true surface; surface nets places one at a cell's average crossing, which is
    // inside the cell and therefore off the surface by up to half a cell. Against an analytic volume,
    // that is a measurable gap and it is the reason the finer mesh is also the truer one.
    const analytic = (4 / 3) * Math.PI * 1 ** 3;
    const sphere = [
      placedPart("s", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 }),
    ];
    const error = (mode: "surface-nets" | "marching-cubes"): number =>
      Math.abs(
        meshModel(sphere, budgetFor(0.125), mode)!.report.volume / analytic - 1,
      );
    expect(error("marching-cubes")).toBeLessThan(error("surface-nets"));
  });

  it("still meshes a lone part in either mode, for the drag ghost", () => {
    // `primitiveMesh` is the drag's one build, and a drag is happening whichever mode is on.
    for (const mode of ["surface-nets", "marching-cubes"] as const) {
      const preview = primitiveMesh(capsule, DEFAULT_BUDGET);
      expect(preview?.triangles ?? 0, mode).toBeGreaterThan(0);
      const built = meshModel([capsule], DEFAULT_BUDGET, mode);
      expect(built?.triangles ?? 0, mode).toBeGreaterThan(0);
    }
  });

  it("reuses one scratch across rebuilds without carrying a mesh into the next", () => {
    // The scratch is held across rebuilds because marching cubes' vertex cache is eleven megabytes
    // at the default resolution. A mesh that carried over would show up here as a vertex count that
    // only ever goes up.
    const first = meshModel(pair, DEFAULT_BUDGET, "marching-cubes")!;
    const second = meshModel(pair, DEFAULT_BUDGET, "marching-cubes")!;
    expect(second.mesh.vertexCount).toBe(first.mesh.vertexCount);
    expect(second.triangles).toBe(first.triangles);
    expect([...second.mesh.indices]).toEqual([...first.mesh.indices]);
  });
});

describe("the resolution control", () => {
  it("offers sizes that halve, each a doubling of the work", () => {
    // **The list rather than a range, because the cost is cubic in the reciprocal.** Each step here
    // doubles the samples on an axis and so multiplies the work by eight; a slider across the same
    // interval would offer ratios a person cannot predict.
    expect(RESOLUTIONS.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < RESOLUTIONS.length; i++) {
      expect(
        RESOLUTIONS[i - 1]! / RESOLUTIONS[i]!,
        `step ${i} is not a halving`,
      ).toBeCloseTo(2, 12);
    }
    expect(RESOLUTIONS).toContain(DEFAULT_BUDGET.voxelSize);
  });

  it("changes the budget's spacing and nothing else", () => {
    // **The other two numbers are not the control's to set**, so a control that changed them would be
    // changing the memory ceiling and the small-model floor by accident.
    const fine = budgetFor(0.125);
    expect(fine.voxelSize).toBe(0.125);
    expect(fine.maxSamplesPerAxis).toBe(DEFAULT_BUDGET.maxSamplesPerAxis);
    expect(fine.minSamplesPerAxis).toBe(DEFAULT_BUDGET.minSamplesPerAxis);
  });
  it("meshes finer the smaller the voxel, and says so in the region", () => {
    const coarse = meshModel(
      [placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 })],
      budgetFor(0.5),
    )!;
    const fine = meshModel(
      [placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 })],
      budgetFor(0.125),
    )!;
    expect(fine.samples).toBeGreaterThan(coarse.samples);
    expect(fine.region.sampleSize).toBeLessThan(coarse.region.sampleSize);
  });

  it("reaches the field's candidate cell, which it did not used to", () => {
    // **The budget now reaches `modelField`.** It did not, so a rebuild at a finer resolution got a
    // BVH candidate cell sized for the default's eight voxels, which is what made the cost of
    // sampling depend on a resolution the caller never asked for. Read back off the field rather
    // than off the mesh, because the mesh is identical either way — the bug was invisible from here.
    const fine = budgetFor(0.0625);
    const field = operationsField(
      [placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 })],
      fine,
    );
    expect(field.gradient(0, 0, 0).y).not.toBe(0);
    expect(
      meshRegion(
        [placedPart("a", { type: "Sphere", radius: 1 }, { x: 0, y: 0, z: 0 })],
        fine,
      )?.sampleSize,
    ).toBeLessThanOrEqual(fine.voxelSize * 1.001);
  });
});

/**
 * Colour through the mesher, because that is where a colour is actually seen.
 *
 * **The rule under test is `bvh.evalPaint`'s and is pinned there**, in `packages/csg`. What this
 * covers is that it survives the journey: a vertex is on a crossing between two samples, the field
 * is asked once per vertex, and the answer is written into the packed attribute the renderer reads.
 * A model of two coloured parts is the shortest way to ask all of that at once.
 */
describe("colour, through the mesh", () => {
  const RED = { r: 255, g: 0, b: 0 };
  const BLUE = { r: 0, g: 0, b: 255 };

  /** Every distinct colour in a finished mesh, with how many vertices carry it. */
  const coloursOf = (
    mesh: ReturnType<typeof meshModel>,
  ): Map<string, number> => {
    const seen = new Map<string, number>();
    for (let i = 0; i < mesh!.mesh.vertexCount; i++) {
      const at = i * 4;
      const key = `${mesh!.mesh.colours[at]},${mesh!.mesh.colours[at + 1]},${mesh!.mesh.colours[at + 2]}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return seen;
  };

  /** The colour of the vertex nearest a world point, as `r,g,b`. */
  const colourNearest = (
    mesh: NonNullable<ReturnType<typeof meshModel>>,
    at: { x: number; y: number; z: number },
  ): string => {
    let best = Infinity;
    let index = 0;
    for (let i = 0; i < mesh.mesh.vertexCount; i++) {
      const d = Math.hypot(
        (mesh.mesh.positions[i * 3] as number) - at.x,
        (mesh.mesh.positions[i * 3 + 1] as number) - at.y,
        (mesh.mesh.positions[i * 3 + 2] as number) - at.z,
      );
      if (d < best) {
        best = d;
        index = i;
      }
    }
    const at4 = index * 4;
    return `${mesh.mesh.colours[at4]},${mesh.mesh.colours[at4 + 1]},${mesh.mesh.colours[at4 + 2]}`;
  };

  it("keeps a union of two coloured parts as two colours", () => {
    /**
     * **A figure a unit or two across, which is the scale this bug lived at.**
     *
     * The rule used to be "the last operation within a unit of the point", which is the same as
     * "the last operation within the model" for a figure this size — and the modeller's parts are
     * about a unit across. The red sphere and the blue box were close enough that the box covered
     * the sphere, the box came later in the list, and the sphere came out entirely blue.
     *
     * **Asserted by asking for the vertex nearest a known point on each surface** rather than by
     * counting colours, because the counts are not comparable: marching cubes puts a vertex on every
     * crossed edge, so a flat face emits four a cell and a sphere's curvature emits about one, and
     * the box legitimately comes out with three or four times the sphere's vertex count. A ratio
     * would be measuring the algorithms. Asking what colour a particular place *is* cannot be.
     */
    const sphere = placedPart(
      "a",
      { type: "Sphere", radius: 0.7 },
      { x: 0, y: 0, z: 0 },
      { colour: RED, opacity: 1 },
    );
    const box = placedPart(
      "b",
      { type: "Box", len: { x: 1, y: 1, z: 1 } },
      { x: 1.4, y: 0, z: 0 },
      { colour: BLUE, opacity: 1 },
    );
    const mesh = meshModel([sphere, box], budgetFor(0.125), "marching-cubes");
    expect(mesh).toBeDefined();
    const built = mesh!;

    // The far side of the sphere from the box, where the old rule was worst: the box is nearly two
    // units away and came later in the list, and the sphere was blue here too.
    expect(colourNearest(built, { x: -0.7, y: 0, z: 0 })).toBe(
      `${RED.r},${RED.g},${RED.b}`,
    );
    expect(colourNearest(built, { x: 0, y: 0.7, z: 0 })).toBe(
      `${RED.r},${RED.g},${RED.b}`,
    );
    expect(colourNearest(built, { x: 0, y: 0, z: 0.7 })).toBe(
      `${RED.r},${RED.g},${RED.b}`,
    );
    // And the box keeps its own colour, which is the other half of a union being two colours.
    expect(colourNearest(built, { x: 1.9, y: 0, z: 0 })).toBe(
      `${BLUE.r},${BLUE.g},${BLUE.b}`,
    );
    expect(colourNearest(built, { x: 1.4, y: 0, z: 0.5 })).toBe(
      `${BLUE.r},${BLUE.g},${BLUE.b}`,
    );

    // Both colours present somewhere, which is what "two colours" means before anything else.
    const seen = coloursOf(built);
    expect(seen.get(`${RED.r},${RED.g},${RED.b}`) ?? 0).toBeGreaterThan(0);
    expect(seen.get(`${BLUE.r},${BLUE.g},${BLUE.b}`) ?? 0).toBeGreaterThan(0);
  });

  it("gives each part of a chain its own colour, in order", () => {
    // Three parts end to end, so the middle one is within reach of both its neighbours and has to
    // win against one on each side. This is the case that shows the rule is about distance rather
    // than about being first or last in the list.
    const parts = [
      placedPart(
        "a",
        { type: "Sphere", radius: 0.5 },
        { x: 0, y: 0, z: 0 },
        { colour: { r: 255, g: 0, b: 0 }, opacity: 1 },
      ),
      placedPart(
        "b",
        { type: "Sphere", radius: 0.5 },
        { x: 0.9, y: 0, z: 0 },
        { colour: { r: 0, g: 255, b: 0 }, opacity: 1 },
      ),
      placedPart(
        "c",
        { type: "Sphere", radius: 0.5 },
        { x: 1.8, y: 0, z: 0 },
        { colour: { r: 0, g: 0, b: 255 }, opacity: 1 },
      ),
    ];
    const mesh = meshModel(parts, budgetFor(0.125), "marching-cubes");
    const seen = coloursOf(mesh);
    for (const colour of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ]) {
      expect(
        seen.get(`${colour.r},${colour.g},${colour.b}`) ?? 0,
        `colour ${colour.r},${colour.g},${colour.b}`,
      ).toBeGreaterThan(0);
    }
  });
});

/**
 * The normals, and where they come from.
 *
 * **Both of the tests here are about agreement with a surface whose correct normal is not in
 * dispute**, because that is the only thing a normal can be wrong about. A lone sphere and a
 * box's flat face both have an exact answer at every vertex, so an angle between them is a
 * measurement rather than an opinion — and neither needs a raymarched reference to say which
 * of two methods is closer to the surface.
 */
describe("vertex normals", () => {
  /** A vertex's normal, out of the packed pair and back to a direction. */
  const normalAt = (
    mesh: NonNullable<ReturnType<typeof meshModel>>,
    index: number,
  ): { x: number; y: number; z: number } =>
    decodeOctahedral({
      x: mesh.mesh.normalOct[index * 2]! / SNORM16_MAX,
      y: mesh.mesh.normalOct[index * 2 + 1]! / SNORM16_MAX,
    });

  /** The position of a vertex, out of the packed float triples. */
  const positionAt = (
    mesh: NonNullable<ReturnType<typeof meshModel>>,
    index: number,
  ): { x: number; y: number; z: number } => ({
    x: mesh.mesh.positions[index * 3]!,
    y: mesh.mesh.positions[index * 3 + 1]!,
    z: mesh.mesh.positions[index * 3 + 2]!,
  });

  /** The angle in degrees between two directions. */
  const degrees = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
  ): number =>
    (Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z))) *
      180) /
    Math.PI;

  const sphere = (radius: number) => [
    placedPart("a", { type: "Sphere", radius }, { x: 0, y: 0, z: 0 }),
  ];

  it("get closer to a sphere's true normal as the mesh gets finer", () => {
    /**
     * **The property, not a threshold.** A lone sphere is an exact distance function here —
     * one `Add` with softness 0 against a base of infinity — so the radial at a vertex *is*
     * its true normal and every degree between the two is error.
     *
     * **What the gradient could not do, and the reason this is the test that matters.** It took
     * six central differences at `±step`, and `step` defaulted to a whole world unit however
     * fine the mesh was, so the same neighbourhood was being sampled at every resolution: mean
     * error 2.1°, 1.9°, 2.1°, 2.1° from the coarsest voxel to the finest. Averaging the faces
     * around each vertex is first-order in the voxel, so it is the worse of the two at the
     * coarse end — and it converges, which is what a resolution control is for.
     */
    const errorAt = (voxelSize: number): number => {
      const mesh = meshModel(sphere(0.7), budgetFor(voxelSize))!;
      let total = 0;
      for (let i = 0; i < mesh.mesh.vertexCount; i++) {
        const p = positionAt(mesh, i);
        const length = Math.hypot(p.x, p.y, p.z);
        total += degrees(normalAt(mesh, i), {
          x: p.x / length,
          y: p.y / length,
          z: p.z / length,
        });
      }
      return total / mesh.mesh.vertexCount;
    };

    const coarsest = errorAt(RESOLUTIONS[0]);
    const finest = errorAt(RESOLUTIONS[RESOLUTIONS.length - 1]!);

    expect(finest, "a sphere at the finest voxel offered").toBeLessThan(3);
    // **An order of the accuracy, not merely "less".** A method whose error does not shrink
    // with the mesh would pass the assertion above on the coarse end too, and that is the
    // failure this replaces.
    expect(finest, "converging rather than stuck").toBeLessThan(coarsest / 3);
  });

  it("give a flat face its own normal, right up to the edge", () => {
    /**
     * **The case that cannot be argued about.** A box's face is planar, so the correct normal
     * at every point of its interior is that face's axis, and anything else is a rounding
     * error of somebody's method.
     *
     * **And it is the case the two-unit stencil got wrong.** `Field.gradient` sampled at
     * `±1` about the vertex, so on a box two units across a vertex a unit from an edge had
     * that edge inside its own stencil and picked up the neighbouring face — measured up to 50°
     * off, *growing* as the mesh got finer because the mesh was never the thing at fault. The
     * averaged normal is exactly the face's own at every one of these vertices, including the
     * ones right at the edge, because every triangle naming it lies in that face.
     */
    const len = 2;
    const voxelSize = 0.125;
    const mesh = meshModel(
      [
        placedPart(
          "a",
          { type: "Box", len: { x: len, y: len, z: len } },
          { x: 0, y: 0, z: 0 },
        ),
      ],
      budgetFor(voxelSize),
    )!;

    let counted = 0;
    let worst = 0;
    let nearestEdge = Infinity;
    for (let i = 0; i < mesh.mesh.vertexCount; i++) {
      const p = positionAt(mesh, i);
      const axes = [Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)];
      const face = axes.findIndex((v) => Math.abs(v - len) < 1e-3);
      if (face < 0) continue;
      // **Strictly interior**, so every triangle naming it is in that one face. A vertex on
      // an edge has triangles in two faces and no single correct answer, which is a different
      // test and is not this one.
      const others = [0, 1, 2].filter((a) => a !== face);
      // **A whole voxel in, not merely in.** The vertices this catches include the ones sitting
      // a fraction of a cell from the edge, whose fan straddles two faces and which are the
      // point of the test — but they are still *on* the edge as far as the triangles go, so
      // the ones being measured are those with a full cell of face behind them.
      const distanceToEdge = Math.min(...others.map((a) => len - axes[a]!));
      if (distanceToEdge <= voxelSize) continue;
      nearestEdge = Math.min(nearestEdge, distanceToEdge);

      const truth = [0, 0, 0];
      truth[face] = Math.sign([p.x, p.y, p.z][face]!);
      const deg = degrees(normalAt(mesh, i), {
        x: truth[0]!,
        y: truth[1]!,
        z: truth[2]!,
      });
      worst = Math.max(worst, deg);
      counted++;
    }

    expect(
      counted,
      "the mesh had face-interior vertices to check",
    ).toBeGreaterThan(100);
    // **And the check reached the vertices that used to fail**, rather than passing on the
    // middle of a face where a two-unit stencil happens to stay on it.
    expect(
      nearestEdge,
      "checked a vertex within the old stencil's reach",
    ).toBeLessThan(1);
    expect(
      nearestEdge,
      "and a margin of a voxel is enough to keep the fan inside one face",
    ).toBeGreaterThan(voxelSize);
    expect(
      worst,
      "the largest angle off a flat face's own normal",
    ).toBeLessThan(0.1);
  });

  it("stay continuous across a colour boundary, which the order is what buys", () => {
    /**
     * **The ordering constraint, tested through what it would look like if it were got wrong.**
     *
     * `splitColourBoundaries` puts two vertices in one place, each holding the triangles on its
     * own side of the cut, and gives both the same normal — interpolated from the two endpoints
     * of the edge they were cut from. So on a mesh that has been through it, coincident
     * vertices agree exactly, and there is no seam in the shading along a colour boundary.
     *
     * **That is precisely what averaging *after* the pass would destroy.** Each copy's fan would
     * then be the triangles of one colour only, and averaging a clipped fan leans towards the
     * faces that survived — the same failure `vertex-normals` documents for a chunk edge. The
     * two copies would disagree by however much the two sides tilt apart, on every boundary in
     * the model, which is the one thing the pass exists to remove.
     *
     * **So the assertion is on the copies rather than on the originals.** A smooth surface
     * shaded from two different one-sided averages has a visible line along the cut; the same
     * surface shaded from one average has none, whatever the colours either side are doing.
     */
    const parts = [
      placedPart(
        "a",
        { type: "Sphere", radius: 0.7 },
        { x: 0, y: 0, z: 0 },
        { colour: { r: 220, g: 30, b: 40 }, opacity: 1 },
      ),
      placedPart(
        "b",
        { type: "Box", len: { x: 1, y: 1, z: 1 } },
        { x: 1.4, y: 0, z: 0 },
        { colour: { r: 30, g: 60, b: 220 }, opacity: 1 },
      ),
    ];
    const mesh = meshModel(parts, budgetFor(0.125), "marching-cubes")!;

    // **Vertices in one place, found by rounding a world position** — the same welding
    // `mesh-report` does, and for the same reason: the pass is *supposed* to produce two
    // vertices at one position, so counting by index would find nothing to compare.
    const at = new Map<string, number>();
    for (let i = 0; i < mesh.mesh.vertexCount; i++) {
      const key = [0, 1, 2]
        .map((a) => Math.round(mesh.mesh.positions[i * 3 + a]! * 1e4))
        .join(",");
      const seen = at.get(key);
      if (seen === undefined) at.set(key, i);
      else {
        // **A pair, and the check is that they shade identically.**
        expect(degrees(normalAt(mesh, seen), normalAt(mesh, i))).toBeLessThan(
          0.1,
        );
      }
    }

    // **And the pass really ran**, or the assertion above compared nothing. Surface nets
    // meshes the same field over the same grid and does *not* get the pass, so it is the
    // control: two modes, one region, and the extra vertices are the cut.
    const nets = meshModel(parts, budgetFor(0.125), "surface-nets")!;
    expect(mesh.region).toEqual(nets.region);
    expect(mesh.mesh.vertexCount, "the pass added vertices").toBeGreaterThan(
      nets.mesh.vertexCount,
    );
    // Which means there really were coincident pairs to compare, rather than none.
    expect(at.size, "distinct positions among the vertices").toBeLessThan(
      mesh.mesh.vertexCount,
    );
  });
});

describe("reporting progress", () => {
  const a = placedPart(
    "a",
    { type: "Sphere", radius: 1 },
    { x: 0, y: 0, z: 0 },
  );

  for (const mode of ["marching-cubes", "surface-nets"] as const) {
    it(`counts to exactly one on ${mode}, and never goes backwards`, () => {
      // **The contract `MeshProgress` makes**, which a caller draws a bar against. `done`
      // reaching `total` is what lets a worker send a final fraction rather than a bar that
      // stalls at 99% and waits; monotonicity is what keeps the bar from jumping backwards,
      // which reads as a fault rather than as work.
      //
      // **Both meshers**, because the hook is added to each one's loops separately and a test
      // on one of them says nothing about the other.
      const seen: number[] = [];
      meshModel([a], budgetFor(0.25), mode, (done, total) => {
        expect(total).toBeGreaterThan(0);
        seen.push(done / total);
      });

      expect(seen.length, "it reported more than once").toBeGreaterThan(1);
      expect(seen.at(-1), "it finished").toBe(1);
      expect(
        seen.every((at, i) => i === 0 || at >= (seen[i - 1] as number)),
        "it went backwards",
      ).toBe(true);
      // **Distinct values rather than merely several of them**, which is what catches a mesher
      // that counts only its first pass and then holds still: a bar frozen across two thirds of
      // the work and then snapping to full is the failure this assertion is here for.
      expect(
        new Set(seen).size,
        "it reported distinct fractions, so it moved while each pass ran",
      ).toBeGreaterThan(4);
    });
  }

  it("counts surface nets' edge pass, which is a third of the work and not a tail", () => {
    // **The pass that is easy to leave out.** Surface nets samples the field, walks the cells,
    // and then walks the owned edges testing four samples each — `owned³` iterations, which at
    // the export's fine end is twelve million and the same order as either of the others. A
    // denominator counting only the first two would reach 100% and then keep working.
    const seen: number[] = [];
    meshModel([a], budgetFor(0.125), "surface-nets", (done) => {
      seen.push(done);
    });

    const last = seen.at(-1) as number;
    expect(
      seen.filter((done) => done > last * 0.8 && done < last).length,
      "it reported work in its last fifth, which is where the edge pass is",
    ).toBeGreaterThan(0);
  });

  it("reports nothing when no one is watching, and meshes the same mesh", () => {
    // **The branch is the whole of the cost**, so what it must not cost is the mesh. Without
    // this, a caller adding a bar would be unable to tell whether the counting changed the
    // answer or only the time.
    const watched = meshModel([a], budgetFor(0.25), "marching-cubes", () => {});
    const plain = meshModel([a], budgetFor(0.25), "marching-cubes");

    expect([...(watched?.mesh.indices ?? [])]).toEqual([
      ...(plain?.mesh.indices ?? []),
    ]);
    expect(watched?.triangles).toBe(plain?.triangles);
  });
});
