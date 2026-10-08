/**
 * Where a chunk's milliseconds go.
 *
 *   node --experimental-transform-types tools/mesh-profile.ts
 *   node --experimental-transform-types tools/mesh-profile.ts --ops 240 --lods 0,1 --radius 3
 *
 * Meshes real chunks through the real `SurfaceNetsChunkMesher`, over a real terrain
 * with a real number of operations clustered the way a brush stroke clusters them, and
 * reports the cost split by **which method of the field was called**. The split is the
 * whole point: the mesher's cost is not one number but a sum over `MeshField`, and the
 * only way to know which term is worth attacking is to time the terms.
 *
 * The instrumentation wraps `MeshField` rather than reaching into the mesher, because
 * `MeshField` is the seam the mesher already holds (`chunk-mesher.ts`) — a timer added
 * here measures the same calls the worker makes, with no production code carrying a
 * counter. `performance.now` around a call adds two clock reads to a function called
 * tens of thousands of times, so the per-call overhead is reported alongside the totals
 * and the absolute numbers are read as upper bounds.
 *
 * **Not a benchmark.** No warm-up discipline, no process isolation, no statistics — it is
 * a cost *breakdown*, for deciding what to look at next. Compare runs on the same machine
 * in the same process; do not compare against a number in an ADR.
 */

import {
  DEFAULT_CAVES,
  DEFAULT_TERRAIN,
  Field,
  OperationBVH,
  baseFieldFor,
  caveField,
  caveNoise,
  makeOperation,
  type Operation,
} from "@big-mesh-studios/csg";
import type { Bounds, Vec3 } from "@big-mesh-studios/core";

import {
  BLOCK_WORLD,
  CHUNK_VOXELS,
  LOD_STRIDE,
  VOXEL_SIZE,
} from "../src/constants";
import type { Lod } from "../src/world";
import type { MeshField, MeshRequest } from "../src/mesh/chunk-mesher";
import { SurfaceNetsChunkMesher } from "../src/mesh/chunk-mesher";

/** A model shaped like a sculpting session: a stroke, plus scenery left elsewhere. */
const buildOperations = (count: number): Operation[] => {
  const operations: Operation[] = [];

  // The stroke. A few hundred soft spheres in a blob, which is the shape ADR 0006 and
  // `OperationBVH` both measured against: candidates clustered rather than spread, so
  // the block partition has something to do.
  const strokes = Math.max(1, Math.round(count / 64));
  for (let stroke = 0; stroke < strokes; stroke++) {
    const sx = ((stroke * 733) % 900) - 450;
    const sz = ((stroke * 419) % 900) - 450;
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 6;
      const radius = 6 + (i % 8) * 3;
      operations.push(
        makeOperation(
          operations.length,
          {
            x: sx + Math.cos(angle) * radius,
            y: -40 + Math.sin(angle * 0.5) * 20,
            z: sz + Math.sin(angle) * radius,
          },
          { type: "Sphere", radius: 14 + (i % 3) },
          i % 3 === 0 ? "Subtract" : "Add",
          {
            softness: i % 5 === 0 ? 0.2 : 0.05,
            colour: { r: 200 - (i % 7) * 20, g: 120 + (i % 5) * 20, b: 90 },
          },
        ),
      );
    }
  }

  // Scenery elsewhere in the world, so the candidate cache is measured against a model
  // that has things in it which are not near the chunks being meshed.
  while (operations.length < count) {
    const n = operations.length;
    operations.push(
      makeOperation(
        n,
        { x: 4000 + (n % 40) * 90, y: 200 + n * 7, z: -3000 + (n % 23) * 110 },
        { type: "RoundBox", len: { x: 30, y: 50, z: 30 }, radius: 6 },
        "Add",
        { colour: { r: 120, g: 140, b: 160 } },
      ),
    );
  }

  return operations;
};

/** A `MeshField` that times itself, by method. */
class TimedField implements MeshField {
  readonly distanceCalls = 0;
  distanceNanos = 0;
  gradientCalls = 0;
  gradientNanos = 0;
  colourCalls = 0;
  colourNanos = 0;

  constructor(private readonly field: Field) {}

  distance(x: number, y: number, z: number): number {
    const t0 = performance.now();
    const value = this.field.distance(x, y, z);
    this.distanceNanos += (performance.now() - t0) * 1e6;
    (this as { distanceCalls: number }).distanceCalls++;
    return value;
  }

  distanceForStepping(x: number, y: number, z: number): number {
    return this.field.distanceForStepping(x, y, z);
  }

  gradient(x: number, y: number, z: number, step?: number): Vec3 {
    const t0 = performance.now();
    const value = this.field.gradient(x, y, z, step);
    this.gradientNanos += (performance.now() - t0) * 1e6;
    this.gradientCalls++;
    return value;
  }

  colourAt(x: number, y: number, z: number) {
    const t0 = performance.now();
    const value = this.field.colourAt(x, y, z);
    this.colourNanos += (performance.now() - t0) * 1e6;
    this.colourCalls++;
    return value;
  }

  beginRegion(bounds: Bounds): () => void | undefined {
    return this.field.beginRegion(bounds);
  }

  couldHoldSurface(bounds: Bounds): boolean {
    return this.field.couldHoldSurface(bounds);
  }

  reset(): void {
    (this as { distanceCalls: number }).distanceCalls = 0;
    this.distanceNanos = 0;
    this.gradientCalls = 0;
    this.gradientNanos = 0;
    this.colourCalls = 0;
    this.colourNanos = 0;
  }
}

/**
 * What the cave field actually produced, since every constant in it is a starting guess.
 *
 * **Thickness is the number that decides whether caves are worth having at all.** Below about two
 * voxels they are a sub-voxel sliver that surface nets renders as a non-manifold sheet (ADR 0003
 * scopes that case) and that a coarser level drops entirely; above a few tens of voxels they stop
 * being tunnels and become rooms. So it is measured, along with how much rock they remove and how
 * deep they reach, rather than asserted anywhere.
 */
const reportCaves = (): void => {
  const base = baseFieldFor({
    kind: "terrain",
    params: { ...DEFAULT_TERRAIN, caves: DEFAULT_CAVES },
  });
  if (base === undefined) throw new Error("cave terrain did not build");
  const cave = caveField(
    DEFAULT_CAVES,
    caveNoise(DEFAULT_CAVES, DEFAULT_TERRAIN.seed),
  );

  let carved = 0;
  let rock = 0;
  for (let i = 0; i < 120_000; i++) {
    const x = ((i * 7919) % 12_000) - 6_000;
    const z = ((i * 4409) % 12_000) - 6_000;
    const y = -700 + ((i * 6271) % 2_400);
    if (y > 0) continue;
    rock++;
    if (cave(x, y, z, 0) < 0) carved++;
  }

  // Thickness, as a whole distribution rather than one number: a world of tunnels and one
  // occasional cavern need different constants, and the maximum alone would describe only the
  // cavern. Sampled along several lines so a single unlucky one does not decide it.
  const STEP = 0.4;
  const runs: number[] = [];
  for (let line = 0; line < 9; line++) {
    let run = 0;
    for (let i = 0; i < 150_000; i++) {
      const x = i * STEP;
      const z = 500 + line * 700;
      const y = -120 - line * 45;
      if (cave(x, y, z, 0) < 0) {
        run++;
      } else if (run > 0) {
        runs.push(run * STEP);
        run = 0;
      }
    }
    if (run > 0) runs.push(run * STEP);
  }
  runs.sort((a, b) => a - b);
  const at = (q: number): number =>
    runs[Math.floor(q * (runs.length - 1))] ?? 0;

  console.log(
    `caves: lattice ${DEFAULT_CAVES.feature} units, threshold ${DEFAULT_CAVES.threshold}, ` +
      `floor ${DEFAULT_CAVES.floor}`,
  );
  console.log(
    `  carved ${((carved / rock) * 100).toFixed(1)}% of sampled rock, ` +
      `${runs.length} runs over 9 lines`,
  );
  console.log(
    `  run length: p25 ${at(0.25).toFixed(0)}  p50 ${at(0.5).toFixed(0)}  ` +
      `p90 ${at(0.9).toFixed(0)}  max ${at(1).toFixed(0)} world units`,
  );
  console.log(
    `  at LOD 0 that is p50 ${(at(0.5) / VOXEL_SIZE).toFixed(1)} voxels and ` +
      `max ${(at(1) / VOXEL_SIZE).toFixed(0)}; at LOD 2, p50 ` +
      `${(at(0.5) / (VOXEL_SIZE * 4)).toFixed(1)} and max ${(at(1) / (VOXEL_SIZE * 4)).toFixed(0)}`,
  );
  console.log();
};

const ms = (nanos: number): string => (nanos / 1e6).toFixed(1).padStart(7);
const pad = (label: string, width = 24): string => label.padEnd(width);

/**
 * What one `performance.now()` costs here, measured rather than guessed.
 *
 * Every timed call pays two of them, and there are a million calls, so the overhead is
 * not noise against the totals — it is a term in them. Measured over the same number of
 * reads the run makes, so it can be subtracted rather than argued about.
 */
const clockCostPerRead = (reads: number): number => {
  const t0 = performance.now();
  for (let i = 0; i < reads; i++) performance.now();
  return ((performance.now() - t0) * 1e6) / reads;
};

/**
 * The cells whose meshes are built: a square footprint and a taller column.
 *
 * **`yRadius` is not a free parameter — it is the real window's.** `GAME_WINDOW` is
 * `{radius: 5, yRadius: 2}`, so a standing player is meshed five chunk layers deep. That
 * number is what makes the sampling waste visible: the landscape occupies about two of those
 * five layers, so three fifths of everything streamed is air or deep rock, and a three-layer
 * window would have hidden it entirely.
 */
const cellsAround = (
  radius: number,
  yRadius: number,
): { x: number; y: number; z: number }[] => {
  const cells: { x: number; y: number; z: number }[] = [];
  for (let x = -radius; x <= radius; x++)
    for (let y = -yRadius; y <= yRadius; y++)
      for (let z = -radius; z <= radius; z++) cells.push({ x, y, z });
  return cells;
};

const args = process.argv.slice(2);
const number = (flag: string, fallback: number): number => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] !== undefined
    ? Number(args[at + 1])
    : fallback;
};

const opCount = number("--ops", 240);
const radius = number("--radius", 3);
// `GAME_WINDOW`'s own values, so the profile is of the window the player actually has.
const yRadius = number("--yradius", 2);
const repeat = number("--repeat", 1);
const lods = (
  args.includes("--lods") ? (args[args.indexOf("--lods") + 1] ?? "0,1") : "0,1"
)
  .split(",")
  .map(Number) as Lod[];

const withCaves = args.includes("--caves");
if (withCaves) reportCaves();

const terrainParams = withCaves
  ? { ...DEFAULT_TERRAIN, caves: DEFAULT_CAVES }
  : DEFAULT_TERRAIN;
const base = baseFieldFor({ kind: "terrain", params: terrainParams });
if (base === undefined) throw new Error("terrain base field did not build");

const field = new Field(new OperationBVH(buildOperations(opCount)), {
  base,
  extent: base,
  lipschitz: base.lipschitz,
  fallbackNormal: base.fallbackNormal,
});
const timed = new TimedField(field);
const mesher = new SurfaceNetsChunkMesher(timed, CHUNK_VOXELS);

console.log(
  `model: ${opCount} operations, terrain scale ${DEFAULT_TERRAIN.scale}, ` +
    `chunk ${BLOCK_WORLD} units${withCaves ? ", caves" : ""}`,
);
console.log(
  `cells: ${cellsAround(radius, yRadius).length} per level ` +
    `(radius ${radius}, yRadius ${yRadius}), ${repeat} repeat(s), lods ${lods.join(",")}\n`,
);

for (const lod of lods) {
  const cells = cellsAround(radius, yRadius);
  const requests: MeshRequest[] = cells.map((cell) => ({ cell, lod }));

  // Warm-up, thrown away: the first pass pays for JIT tiering and for the candidate
  // cache's first build, and the first pass is the one whose numbers nobody believes.
  mesher.mesh({ cell: { x: 0, y: 0, z: 0 }, lod });
  timed.reset();

  const clock = clockCostPerRead(200000);

  let meshNanos = 0;
  let attempted = 0;
  let gated = 0;
  let meshed = 0;
  let empty = 0;
  let vertices = 0;
  let triangles = 0;

  for (let pass = 0; pass < repeat; pass++) {
    for (const request of requests) {
      if (!mesher.couldHaveMesh(request.cell, request.lod)) {
        gated++;
        continue;
      }
      attempted++;
      const t0 = performance.now();
      const mesh = mesher.mesh(request);
      meshNanos += (performance.now() - t0) * 1e6;
      if (mesh.vertexCount === 0) empty++;
      else {
        meshed++;
        vertices += mesh.vertexCount;
        triangles += mesh.triangleCount;
      }
    }
  }

  // `gradient` folds the field six times through `Field.distance` rather than through the
  // wrapper, so those folds are attributed here rather than missed. Counting them is what
  // makes "what fraction of the work is normals" answerable at all.
  const gradientFolds = timed.gradientCalls * 6;
  const calls = timed.distanceCalls + gradientFolds + timed.colourCalls;
  const foldNanos =
    timed.distanceNanos + timed.gradientNanos + timed.colourNanos;
  // **Divided by the chunks meshed, not the chunks with geometry in them.** A chunk that
  // samples the field and comes back empty paid the whole grid and belongs in the average;
  // the first version of this divided by the non-empty count and under-reported every
  // per-chunk figure by the empty fraction.
  const perChunk = Math.max(attempted, 1);

  console.log(
    `LOD ${lod}  (${CHUNK_VOXELS / (LOD_STRIDE[lod] ?? 1)} samples a side)`,
  );
  console.log(
    `  ${pad("chunks")}${requests.length} requested, ${gated} gated out, ` +
      `${attempted} sampled, ${empty} of those empty, ${meshed} with geometry`,
  );
  console.log(
    `  ${pad("geometry")}${vertices} verts, ${triangles} tris, ` +
      `${(vertices / Math.max(meshed, 1)).toFixed(0)} verts/chunk`,
  );
  console.log(`  ${pad("wall clock, whole mesh")}${ms(meshNanos)} ms`);
  console.log(
    `  ${pad("  grid: field.distance")}${ms(timed.distanceNanos)} ms  ` +
      `${(timed.distanceCalls / perChunk).toFixed(0)} calls/chunk`,
  );
  console.log(
    `  ${pad("  normals: field.gradient")}${ms(timed.gradientNanos)} ms  ` +
      `${(gradientFolds / perChunk).toFixed(0)} folds/chunk`,
  );
  console.log(
    `  ${pad("  colour: field.colourAt")}${ms(timed.colourNanos)} ms  ` +
      `${(timed.colourCalls / perChunk).toFixed(0)} calls/chunk`,
  );
  console.log(
    `  ${pad("field total")}${ms(foldNanos)} ms  ` +
      `(${((foldNanos / meshNanos) * 100).toFixed(1)}% of wall clock)`,
  );
  console.log(
    `  ${pad("mesher internals")}${ms(meshNanos - foldNanos)} ms  ` +
      `(${(((meshNanos - foldNanos) / meshNanos) * 100).toFixed(1)}%) — cell walk, crossings, vertex write`,
  );
  console.log(
    `  ${pad("per sampled chunk")}${(meshNanos / perChunk / 1e6).toFixed(2)} ms   ` +
      `grid ${(timed.distanceNanos / perChunk / 1e6).toFixed(2)}   ` +
      `normals ${(timed.gradientNanos / perChunk / 1e6).toFixed(2)}   ` +
      `colour ${(timed.colourNanos / perChunk / 1e6).toFixed(2)}   ` +
      `internals ${((meshNanos - foldNanos) / perChunk / 1e6).toFixed(2)}`,
  );
  if (empty > 0) {
    const wasted = (empty / perChunk) * 100;
    console.log(
      `  ${pad("paid for nothing")}${empty} of ${perChunk} sampled chunks produced no ` +
        `triangle — ${wasted.toFixed(0)}% of the grid work`,
    );
  }
  console.log(
    `  ${pad("clock overhead")}${((calls * 2 * clock) / 1e6).toFixed(1)} ms  ` +
      `(${clock.toFixed(0)} ns per read, ${calls} reads)`,
  );
  console.log();
}
