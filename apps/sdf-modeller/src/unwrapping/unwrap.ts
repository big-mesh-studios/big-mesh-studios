/**
 * Turning a mesh into texture coordinates, through xatlas.
 *
 * ## Why this file exists at all, when the unwrapper is a library
 *
 * **Because the library speaks texels, duplicates vertices, and renames the indices.** Every one
 * of those is a small lie that has to be undone somewhere, and a place where it is undone once is
 * worth more than three places where each caller remembers to. Concretely, this file:
 *
 * - **normalises the coordinates.** xatlas returns UVs in atlas texels — measured, a sphere's
 *   largest `u` was 1224.5 in a 1225-wide atlas — and this application wants the unit square,
 *   because that is what a texture sampler expects.
 * - **maps the answer back onto the input vertices.** xatlas splits vertices along seams, so its
 *   output has *more* vertices than it was given: a sphere at 0.25 resolution came back with 5,193
 *   output vertices for 4,872 input ones, and 313 of the inputs appeared more than once. Each
 *   output vertex carries an `xref` back to the input vertex it came from, and this file walks
 *   those to produce one coordinate per input vertex — which is the shape `toGeometry` wants.
 * - **does not leak.** `destroy()` is mandatory and returns nothing to check, so an atlas left
 *   alive is WebAssembly memory nobody will ever reclaim.
 *
 * ## Why the seam choice is the bigger chart
 *
 * **Because a split vertex's copies are not the same point and one of them has to be chosen.**
 * xatlas cut an edge because the surface genuinely has a corner there; either side is a defensible
 * answer. The bigger chart is the less special side, so a stroke that crosses a seam lands on the
 * face a person was looking at rather than on a sliver, and the choice is stable between bakes of
 * the same mesh rather than depending on the order the library happened to emit vertices in.
 *
 * ## What it costs, and why the mesh it is given should be coarse
 *
 * **Measured on a sphere, at `budgetFor(0.25)`, this device:**
 *
 * | triangles | xatlas default | `maxIterations: 2` | `maxIterations: 4` |
 * | --- | --- | --- | --- |
 * | 9,740 | 1.4 s | 1.7 s | 2.2 s |
 * | 38,732 | 11.6 s | 15.9 s | 24.5 s |
 *
 * Roughly quadratic in the triangle count, and far too slow to run on a frame even at the
 * smaller size. Two consequences, both of which shape the rest of the texture work:
 *
 * - **The mesh handed to this is not the mesh on screen.** Coordinates are baked onto a
 *   deliberately coarse {@link REFERENCE_VOXEL_SIZE} reference mesh and carried onto the display
 *   mesh by `transferUvs`. A pattern does not get better because the mesh it is painted on has
 *   more triangles; the atlas gets bigger and slower and no more legible.
 * - **The unwrap runs in a worker**, because even 1.4 seconds is a long time to hold a frame.
 *
 * **And the atlas is not the size that was asked for.** Asking for 1024 produced 1225×847, 1145×
 * 1202 and 812×1270 on three different runs. `resolution` sets the scale and the packer decides
 * the shape, so whatever allocates the texture has to allocate it from the returned `width` and
 * `height` rather than from the request.
 */
/**
 * The slice of xatlas this adapter uses, declared rather than imported.
 *
 * **Because it is short, it is worth saying out loud, and because the package's own
 * declarations are not loadable from here.** Importing `xatlas-wasm`'s types was tried first and
 * breaks the importing file's resolution of every *other* package in the program — the adapter's
 * own `@big-mesh-studious/meshing` import stopped resolving, while the same import in a file that
 * did not reach the library was fine. Whatever the cause, the fix is the same shape as the fix for
 * a leaky dependency: name only what is used.
 *
 * It is also the better shape regardless. These are the nine members this file calls, so a change
 * in the library that breaks one of them is a type error here rather than a surprise at runtime.
 */
export interface XAtlas {
  addMesh(mesh: { positions: Float32Array; indices: Uint32Array }): number;
  generate(
    chartOptions?: { maxIterations?: number },
    packOptions?: { resolution?: number; padding?: number },
  ): void;
  getMesh(meshIndex: number): {
    vertexCount: number;
    indexCount: number;
    vertices: readonly {
      atlasIndex: number;
      chartIndex: number;
      uv: readonly [number, number];
      xref: number;
    }[];
    /** Output triangle indices into `vertices` — the indices of the *unwelded* mesh. */
    indices: Uint32Array;
    charts: readonly { faceCount: number }[];
  };
  getUtilization(atlasIndex: number): number;
  destroy(): void;
  readonly width: number;
  readonly height: number;
  readonly chartCount: number;
  readonly texelsPerUnit: number;
}

/** What `loadXAtlas` answers with. */
export interface XAtlasModule {
  createAtlas(): XAtlas;
  addMeshErrorString(error: number): string;
}

/**
 * The world's units a voxel of the **reference mesh** is, which is the mesh that gets unwrapped.
 *
 * **A quarter of a unit, which is the application's default mesh resolution — and the reason is
 * the table above, not fidelity.** A reference at this size unwraps in about a second; one
 * resolution finer takes ten, and one finer again took seventy-four. Neither the transfer nor a
 * paint stroke can tell the difference, because both interpolate across triangles.
 *
 * Exported here rather than left to the caller so that the measurement that justifies it and the
 * number it justifies stay in the same file.
 */
export const REFERENCE_VOXEL_SIZE = 0.25;

/** How the unwrap is done. Every field is a knob xatlas already has, at a value worth having. */
export interface UnwrapOptions {
  /**
   * The atlas scale, in texels. **Not the size that comes back** — see the file header.
   *
   * A thousand and twenty-four, which is the smallest power of two that gives a figure's worth of
   * room: a sphere of radius four came out at 1,225×847 from this, and its 84,044-triangle cousin
   * at 1,145×1,202.
   */
  readonly resolution: number;

  /**
   * The gutter between charts, in texels. **Four, and not the library's zero.**
   *
   * Zero padding puts two charts' pixels side by side, and bilinear filtering samples across that
   * line, so a stroke drawn against one chart picks up its neighbour a pixel early. The measured
   * cost of four texels of padding is under two per cent of the runtime, and it is the difference
   * between a clean edge and a fringe.
   */
  readonly padding: number;

  /**
   * How many times to grow the charts. **One, which is the library's own default.**
   *
   * Two costs about forty per cent more time and four costs about twice as much, and neither
   * changed the chart count on either mesh measured — six charts at 9,740 triangles and eight at
   * 38,732, either way. Iteration buys chart quality, and the honest answer for a figure is that
   * nobody can see the difference between this and twice this.
   */
  readonly maxIterations: number;
}

export const DEFAULT_UNWRAP: UnwrapOptions = {
  resolution: 1024,
  padding: 4,
  maxIterations: 1,
};

/** What an unwrap was asked to do. Positions and indices, which is all a `ChunkMesh` holds. */
export interface UnwrapMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** How many vertices, which the arrays say in two different ways and this pins down. */
  readonly vertexCount: number;
}

/**
 * What an unwrap produced.
 *
 * **The coordinates are per input vertex and in the unit square**, whatever xatlas's own output
 * looked like; that translation is this file's whole job.
 */
export interface UnwrapResult {
  /**
   * The surface the atlas was laid out for, **unwelded**.
   *
   * **This is the fix for painting in places nobody painted, and the shape of it is the whole
   * point.** An unwrap cuts the surface into charts, and a vertex on a cut belongs to both
   * sides of it — so xatlas emits one output vertex *per chart per cut vertex*, each with its
   * own coordinate in the atlas, each with an `xref` back to the one vertex it came from. The
   * old code collapsed those back into a single coordinate per input vertex, keeping whichever
   * chart was biggest, because the display mesh wants one coordinate per vertex and something
   * had to be chosen.
   *
   * Something did have to be chosen — for the display mesh. **For painting, nothing may be.**
   * A brush hit is interpolated across a triangle, and if that triangle's three vertices have
   * been collapsed from two charts then two of them name one chart and one names another, the
   * interpolation produces a point in *neither* chart's triangle, and the dab lands wherever
   * the arithmetic put it. That is the bug: the stroke you drew is there, because most of it
   * never crossed a cut, and there is a second line somewhere else in the atlas, because the
   * part that did.
   *
   * So the coordinates are kept **unwelded — three vertices a triangle, each with its own chart
   * — and that is what the brush raycasts against.** The two uses want different shapes, and
   * this file now provides both: {@link uvs} for the display mesh, {@link reference} for the
   * brush.
   */
  readonly reference: UnwrappedMesh;

  /**
   * Two numbers a vertex, for {@link reference}'s vertex order.
   *
   * **Not the input mesh's vertex order**, which is the change from before, and see
   * {@link reference} for why the two can no longer be the same array.
   */
  readonly uvs: Float32Array;

  /**
   * The atlas xatlas packed into, in texels. **Neither is `resolution`, and they are not equal to
   * each other** — measured 1225×847, 1145×1202 and 812×1270 for the same request.
   */
  readonly width: number;
  readonly height: number;

  /** Charts the mesh was cut into. More charts means more seams and less distortion each. */
  readonly chartCount: number;

  /** Texels the packer spent per world unit, which is how much the picture was scaled. */
  readonly texelsPerUnit: number;

  /** How much of the atlas the charts actually fill, zero to one. The rest is padding. */
  readonly utilization: number;

  /**
   * Input vertices that ended up with no coordinate, and so have `(0, 0)`.
   *
   * **A count rather than an exception.** A vertex no triangle uses — a seam vertex the packer
   * dropped, or a mesh with a loose vertex in it — has nowhere to be, and one of them should not
   * fail an unwrap that was otherwise fine. A caller that cares can compare it with the vertex
   * count; measured, it was zero on every mesh here.
   */
  readonly uncovered: number;
}

/**
 * A surface laid out over an atlas, with its cuts still open.
 *
 * **Structurally a mesh, plus which chart each vertex was placed for.** The chart is kept
 * because it is the one thing that makes a seam a seam rather than a mystery: every triangle's
 * three vertices carry the same chart, by construction, and a triangle where they do not would
 * be the bug this whole arrangement exists to prevent.
 */
export interface UnwrappedMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** The chart a vertex was laid out for. All three of a triangle's vertices always agree. */
  readonly charts: Uint32Array;
  readonly vertexCount: number;
  readonly triangleCount: number;
}

/**
 * The xatlas module, loaded.
 *
 * **A dynamic import in a function rather than a static one at the top**, because the library is
 * a single 288 kB ESM file with the WebAssembly inlined as a string literal — there is no side-car
 * to fetch and nothing to configure, but there is a quarter of a megabyte to parse, and only the
 * worker and the no-worker fallback ever want it. A static import would put that in the main
 * bundle for every visitor, most of whom never open the paint tool.
 */
export const loadXAtlas = async (): Promise<XAtlasModule> => {
  // **Cast, not a typed import**, for the reason the interfaces above are declared rather than
  // imported. The shapes were checked against the shipped declarations by hand; nothing here
  // depends on the library's own `.d.ts` loading.
  const module = (await import("xatlas-wasm")) as {
    default: () => Promise<unknown>;
  };
  return (await module.default()) as XAtlasModule;
};

/**
 * Unwraps a mesh, or answers `undefined` for a mesh there is nothing to unwrap.
 *
 * **`undefined` rather than a zero-sized atlas.** An empty mesh goes through xatlas without
 * complaint — `addMesh` reports success and `generate` produces a 0×0 atlas with no charts — so
 * the failure mode is not an exception to catch but a plausible-looking empty result that would
 * be used to size a texture.
 *
 * **The atlas is destroyed on every path out**, including a throw, because there is no `finally`
 * anywhere else that would and the cost of forgetting is WebAssembly memory that never comes back.
 */
export const unwrapMesh = (
  xatlas: XAtlasModule,
  mesh: UnwrapMesh,
  options: UnwrapOptions = DEFAULT_UNWRAP,
): UnwrapResult | undefined => {
  if (mesh.vertexCount < 3 || mesh.indices.length < 3) return undefined;

  const atlas = xatlas.createAtlas();
  try {
    const added = atlas.addMesh({
      positions: mesh.positions,
      indices: mesh.indices,
    });
    if (added !== 0) {
      throw new Error(
        `xatlas refused the mesh: ${xatlas.addMeshErrorString(added)}`,
      );
    }

    atlas.generate(
      { maxIterations: options.maxIterations },
      {
        resolution: options.resolution,
        padding: options.padding,
      },
    );

    const { width, height } = atlas;
    const output = atlas.getMesh(0);

    const laidOut = layout(output, mesh, width, height);

    return {
      reference: laidOut.mesh,
      uvs: laidOut.uvs,
      width,
      height,
      chartCount: atlas.chartCount,
      texelsPerUnit: atlas.texelsPerUnit,
      utilization: width * height === 0 ? 0 : atlas.getUtilization(0),
      uncovered: laidOut.uncovered,
    };
  } finally {
    atlas.destroy();
  }
};

/**
 * xatlas's output, as a mesh that can be raycast and interpolated.
 *
 * **Two passes, because the second one depends on the first.** An output vertex with no place
 * in the atlas is dropped, and a triangle is only usable if all three of its vertices survived
 * — so the surviving indices cannot be known until every vertex has been counted. Doing it in
 * one pass would mean either keeping the holes and remapping afterwards, or keeping a growing
 * list of arrays that are copied on every growth.
 *
 * **Positions are copied out of the input mesh by `xref` rather than carried through**, because
 * xatlas does not emit positions at all — only coordinates and a reference back. Copying is
 * what makes the result a standalone mesh that a file can hold and a tree can walk.
 *
 * **The chart is kept per vertex** so that "every triangle's three vertices agree" is a thing
 * the result can be asked about rather than a thing the reader has to take on trust. It is one
 * number a vertex and it is the only direct evidence that the seams in here are real seams
 * rather than a smear.
 */
const layout = (
  output: ReturnType<XAtlas["getMesh"]>,
  mesh: UnwrapMesh,
  width: number,
  height: number,
): { mesh: UnwrappedMesh; uvs: Float32Array; uncovered: number } => {
  /**
   * **The two sentinels are the library's own.** A vertex can exist in no atlas
   * (`atlasIndex` of -1) or in no chart (`chartIndex` of -1), and either way it has no
   * coordinate — so it cannot be laid out, and anything that used it would be inventing one.
   */
  const placed = (index: number): boolean => {
    const vertex = output.vertices[index];
    if (vertex === undefined) return false;
    return (
      vertex.xref >= 0 &&
      vertex.xref < mesh.vertexCount &&
      vertex.atlasIndex >= 0 &&
      vertex.chartIndex >= 0
    );
  };

  let kept = 0;
  for (let index = 0; index < output.vertexCount; index++) {
    if (placed(index)) kept++;
  }

  /** Where each output vertex ended up, or -1 for one that was dropped. */
  const moved = new Int32Array(output.vertexCount).fill(-1);
  const positions = new Float32Array(kept * 3);
  const uvs = new Float32Array(kept * 2);
  const charts = new Uint32Array(kept);

  /** Input vertices that produced at least one output vertex, for `uncovered`. */
  const reached = new Uint8Array(mesh.vertexCount);
  let at = 0;

  for (let index = 0; index < output.vertexCount; index++) {
    if (!placed(index)) continue;
    const vertex = output.vertices[index]!;
    const source = vertex.xref * 3;

    moved[index] = at;
    positions[at * 3] = mesh.positions[source]!;
    positions[at * 3 + 1] = mesh.positions[source + 1]!;
    positions[at * 3 + 2] = mesh.positions[source + 2]!;
    uvs[at * 2] = vertex.uv[0] / width;
    uvs[at * 2 + 1] = vertex.uv[1] / height;
    charts[at] = vertex.chartIndex;
    reached[vertex.xref] = 1;
    at++;
  }

  /**
   * **A triangle is kept only if all three of its vertices were.** The alternative — keeping it
   * and pointing the missing corner at something — would put a vertex at (0, 0), which is the
   * bottom-left corner of the atlas, and would smear a chart's picture across the seam next to
   * it. Dropping the triangle loses that sliver of surface and loses nothing else.
   */
  let triangles = 0;
  for (let index = 0; index + 2 < output.indexCount; index += 3) {
    const a = moved[output.indices[index]!]!;
    const b = moved[output.indices[index + 1]!]!;
    const c = moved[output.indices[index + 2]!]!;
    if (a >= 0 && b >= 0 && c >= 0) triangles++;
  }

  const indices = new Uint32Array(triangles * 3);
  let write = 0;
  for (let index = 0; index + 2 < output.indexCount; index += 3) {
    const a = moved[output.indices[index]!]!;
    const b = moved[output.indices[index + 1]!]!;
    const c = moved[output.indices[index + 2]!]!;
    if (a < 0 || b < 0 || c < 0) continue;
    indices[write++] = a;
    indices[write++] = b;
    indices[write++] = c;
  }

  let uncovered = 0;
  for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
    if (reached[vertex] === 0) uncovered++;
  }

  return {
    mesh: {
      positions,
      indices,
      charts,
      vertexCount: kept,
      triangleCount: triangles,
    },
    uvs,
    uncovered,
  };
};
