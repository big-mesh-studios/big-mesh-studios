/**
 * `texture.bin`: the coordinates a painted atlas belongs to, and the surface they were measured
 * on.
 *
 * ## Why the coordinates are saved at all
 *
 * **Because a picture without them is a picture of nothing.** The atlas is a flat sheet of
 * texels; what makes it a *texture on this model* is that each of the model's vertices names a
 * place on it. Save only the image and the file is a PNG with a model attached — reopening it
 * would have to unwrap the model again, which is both slow and a different answer, because the
 * unwrapper's layout is not promised to be identical from one run to the next, let alone one
 * build to the next. So the picture and the coordinates go out together, and the file reopens
 * exactly as it was left.
 *
 * ## Why the surface goes out too, when the reference mesh could just be meshed again
 *
 * **Because "mesh it again and hope" is a promise a file format cannot make.** The coordinates
 * are per-vertex, so they mean nothing unless the vertex list they index is the same list.
 * Meshing is deterministic within a build, so within this build re-meshing does reproduce it —
 * but across a change to the mesher, the resolution ladder or the shape library it will not, and
 * a file that opens into a model whose vertices are numbered differently from its own atlas is a
 * model with a picture smeared across it at random.
 *
 * So the surface is written down, and on load it is **compared against what this build meshes
 * now**. Match, and the saved coordinates are used as they are — exact, no unwrapping, no
 * waiting. Differ, and the file is honest about it: the picture is re-projected onto a fresh
 * unwrap, which is the only thing that can be done with a picture whose coordinates are known to
 * belong to a surface that is no longer the one in front of you.
 *
 * **The indices go out as well as the positions**, which is the part that makes that second path
 * possible at all. Re-projecting asks "which point of the old surface is nearest this one", and
 * a nearest-*triangle* question needs the triangles — a bare list of positions would only support
 * nearest-*vertex*, which would snap re-projected detail to the coarse mesh's own tessellation.
 * They are a third of the file and they are what makes the difference between a picture that
 * survives a mesher change and one that survives it as a blur.
 *
 * ## The layout
 *
 * **Fixed-width and little-endian, like `serialise.ts`, and for its reasons.** Every value sits
 * at a known offset, so a wrong count cannot be misread into plausible numbers, and the file
 * compresses — which matters for something that is mostly a PNG beside it.
 *
 * ```
 * u16  version
 * u16  (padding)
 * u32  width              the atlas's own size, not the resolution asked for
 * u32  height
 * u32  sourceVertexCount  the welded vertex list the unwrap was taken over
 * u32  (reserved)
 * u32  paintedVertexCount the unwelded one the brush uses
 * u32  indexCount         painted indices, a multiple of three
 * f32  texelsPerUnit      what the packer spent per world unit
 * f32  utilization        how much of the atlas the charts fill
 * u32  chartCount         how many pieces the surface was cut into
 * u32  (padding)
 * f32  uv x, y                x paintedVertexCount
 * f32  source position x,y,z  x sourceVertexCount
 * u32  painted index          x indexCount
 * f32  painted position x,y,z x paintedVertexCount
 * u32  painted chart          x paintedVertexCount
 * ```
 *
 * **A header of forty bytes, padded at both ends.** Every `u32` and `f32` sits on a four-byte
 * boundary, which costs four bytes once per file and means nobody has to think about whether an
 * unaligned typed-array view is allowed on some engine.
 *
 * **The three atlas numbers are in the header rather than recomputed on load**, and that is the
 * point of saving them. `texelsPerUnit` in particular is the unwrapper's own arithmetic and
 * cannot be reproduced without unwrapping; so the alternative was to invent one, and a brush
 * sized from a made-up number is a brush of the wrong width. Chart count and utilization are
 * only a readout for a person, but a reopened file showing zeroes where the numbers were is a
 * file that has quietly lost something.
 *
 * **The version is checked and refused rather than coerced**, so a file from a future build says
 * so instead of being read at this build's widths — which is what `serialise.ts` does with its
 * own version, and the reason a format written this way can be revised.
 */
import {
  MAX_REFERENCE_VERTICES,
  MAX_TEXTURE_EDGE,
} from "@big-mesh-studios/csg";

import type { UnwrappedMesh } from "./unwrap";

/**
 * Bytes a header takes, including the padding that keeps every field aligned.
 *
 * **Forty rather than thirty-six, because `chartCount` ends at forty.** The fields run to byte
 * 40 and the arrays start there, and a header that ended mid-field would have the first uv pair
 * sharing memory with `chartCount` — which reads back as a plausible number rather than as
 * rubbish, and is exactly the sort of thing that ships.
 */
const HEADER_BYTES = 40;

/** The version this build writes, and the only one it reads. */
const REFERENCE_VERSION = 1;

/**
 * A saved reference: the atlas's size, where each vertex sits in it, and where each vertex is.
 *
 * **Positions and indices make this a {@link TriangleMesh}, deliberately.** That is what lets a
 * loaded file be handed straight to `TriangleBVH.of` — it is a real mesh, not a list of points,
 * and treating it as one is what keeps the re-projection honest rather than approximate.
 */
export interface ReferenceFile {
  readonly width: number;
  readonly height: number;

  /**
   * The unwelded surface the atlas was laid out for, with its cuts still open.
   *
   * **What the brush raycasts.** Every triangle's three vertices belong to one chart, so
   * interpolating across one cannot land in another chart's part of the sheet.
   */
  readonly painted: UnwrappedMesh;

  /**
   * The welded mesh the unwrapper was given, as a vertex list.
   *
   * **Not a mesh, because it is never walked.** Its only job is to be compared against what
   * this build meshes now, which is a question about positions, and storing indices for a
   * surface nothing raycasts would be the larger half of the file bought for nothing.
   */
  readonly source: {
    readonly positions: Float32Array;
    readonly vertexCount: number;
  };

  /** Two numbers a {@link painted} vertex, in `0..1`. */
  readonly uvs: Float32Array;

  /** Texels per world unit — the scale the picture was laid out at, and not recomputable. */
  readonly texelsPerUnit: number;
  /** How much of the atlas the charts fill, zero to one. */
  readonly utilization: number;
  /** How many pieces the surface was cut into. */
  readonly chartCount: number;
}

/**
 * The reference a file carries, as bytes.
 *
 * **Copies rather than views.** A `Float32Array` over an `ArrayBuffer` may start partway into
 * it and be shorter than the buffer, so writing a whole buffer and slicing views back out is
 * exactly where that goes wrong; copying through `set` says what is meant instead.
 */
export const writeReference = (
  atlas: {
    readonly width: number;
    readonly height: number;
    readonly texelsPerUnit: number;
    readonly utilization: number;
    readonly chartCount: number;
  },
  uvs: Float32Array,
  painted: UnwrappedMesh,
  source: { readonly positions: Float32Array; readonly vertexCount: number },
): ArrayBuffer => {
  checkCounts(uvs, painted, source);

  const indexCount = painted.indices.length;
  const header = HEADER_BYTES;
  const atUvs = header;
  const atSource = atUvs + painted.vertexCount * 8;
  const atIndices = atSource + source.vertexCount * 12;
  const atPainted = atIndices + indexCount * 4;
  const atCharts = atPainted + painted.vertexCount * 12;

  /**
   * **Each array copied into its own view rather than interleaved by hand.**
   *
   * The five offsets above are computed once and every write says which one it is going to,
   * so a field cannot land on the wrong array by being written in the wrong order — which is
   * the one mistake this layout can make that still reads back as plausible numbers.
   */
  const flatUvs = new Float32Array(painted.vertexCount * 2);
  flatUvs.set(uvs);

  const buffer = new ArrayBuffer(atCharts + painted.vertexCount * 4);
  const fields = new DataView(buffer);
  fields.setUint16(0, REFERENCE_VERSION, true);
  fields.setUint32(4, atlas.width, true);
  fields.setUint32(8, atlas.height, true);
  fields.setUint32(12, source.vertexCount, true);
  fields.setUint32(20, painted.vertexCount, true);
  fields.setUint32(24, indexCount, true);
  fields.setFloat32(28, atlas.texelsPerUnit, true);
  fields.setFloat32(32, atlas.utilization, true);
  fields.setUint32(36, atlas.chartCount, true);

  new Float32Array(buffer, atUvs, painted.vertexCount * 2).set(flatUvs);
  new Float32Array(buffer, atSource, source.vertexCount * 3).set(
    source.positions,
  );
  new Uint32Array(buffer, atIndices, indexCount).set(painted.indices);
  new Float32Array(buffer, atPainted, painted.vertexCount * 3).set(
    painted.positions,
  );
  new Uint32Array(buffer, atCharts, painted.vertexCount).set(painted.charts);

  return buffer;
};

/**
 * **Refused rather than padded.** A mismatch between the arrays and the counts is a caller that
 * has lost track of something, and writing a file with holes in it turns that into a picture
 * that is subtly wrong everywhere rather than an error at the point where it happened.
 */
const checkCounts = (
  uvs: Float32Array,
  painted: UnwrappedMesh,
  source: { readonly positions: Float32Array; readonly vertexCount: number },
): void => {
  if (painted.indices.length % 3 !== 0) {
    throw new Error(
      `${painted.indices.length} painted indices, which is not a whole number of triangles`,
    );
  }
  if (uvs.length !== painted.vertexCount * 2) {
    throw new Error(
      `${uvs.length / 2} coordinates for a painted mesh of ${painted.vertexCount}`,
    );
  }
  if (painted.charts.length !== painted.vertexCount) {
    throw new Error(
      `${painted.charts.length} charts for a painted mesh of ${painted.vertexCount}`,
    );
  }
  if (painted.positions.length !== painted.vertexCount * 3) {
    throw new Error(
      `${painted.positions.length / 3} painted positions for ${painted.vertexCount} vertices`,
    );
  }
  if (source.positions.length !== source.vertexCount * 3) {
    throw new Error(
      `${source.positions.length / 3} source positions for ${source.vertexCount} vertices`,
    );
  }
};

/**
 * The reference in a file, or a sentence about why it is not one.
 *
 * **Every bound checked before anything is allocated, in the order that protects rather than the
 * order that is natural.** The counts are read out of the same bytes that are about to size
 * allocations, so a file saying four billion vertices gets refused against the cap *before* the
 * length arithmetic is trusted to overflow safely.
 */
export const readReference = (buffer: ArrayBuffer): ReferenceFile => {
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error(
      `texture.bin is ${buffer.byteLength} bytes and a header is ${HEADER_BYTES}`,
    );
  }

  const fields = new DataView(buffer);
  const version = fields.getUint16(0, true);
  if (version !== REFERENCE_VERSION) {
    throw new Error(
      `texture.bin is version ${version} and this build reads version ${REFERENCE_VERSION}`,
    );
  }

  const width = fields.getUint32(4, true);
  const height = fields.getUint32(8, true);
  /**
   * **The edges checked here as well as in the manifest**, because this entry is read on its
   * own in a test and on the manifest's word in production, and a check that lives in one of
   * the two places is a check that is gone the moment somebody uses the other.
   */
  if (
    width === 0 ||
    height === 0 ||
    width > MAX_TEXTURE_EDGE ||
    height > MAX_TEXTURE_EDGE
  ) {
    throw new Error(
      `texture.bin names a ${width} by ${height} atlas and the limit is ${MAX_TEXTURE_EDGE}`,
    );
  }

  const sourceVertices = fields.getUint32(12, true);
  const paintedVertices = fields.getUint32(20, true);
  const indexCount = fields.getUint32(24, true);

  for (const [name, count] of [
    ["source", sourceVertices],
    ["painted", paintedVertices],
  ] as const) {
    if (count === 0 || count > MAX_REFERENCE_VERTICES) {
      throw new Error(
        `texture.bin names ${count} ${name} vertices and the limit is ${MAX_REFERENCE_VERTICES}`,
      );
    }
  }

  /**
   * **The length is the last word, and it is the one that cannot be argued with.** Everything
   * above is a bound; this is the file saying what it actually holds. Both meshes are checked
   * because a file with one of them wrong is a file that would be read as a model with the
   * wrong surface, which is the failure this whole entry exists to make impossible.
   */
  const atUvs = HEADER_BYTES;
  const atSource = atUvs + paintedVertices * 8;
  const atIndices = atSource + sourceVertices * 12;
  const atPainted = atIndices + indexCount * 4;
  const atCharts = atPainted + paintedVertices * 12;

  if (
    indexCount === 0 ||
    indexCount % 3 !== 0 ||
    atCharts + paintedVertices * 4 !== buffer.byteLength
  ) {
    throw new Error(
      `texture.bin holds ${buffer.byteLength} bytes and ${paintedVertices} painted vertices with ${indexCount} indices over ${sourceVertices} source vertices need ${atCharts + paintedVertices * 4}`,
    );
  }

  const uvs = new Float32Array(
    buffer.slice(atUvs, atSource),
    0,
    paintedVertices * 2,
  );
  const sourcePositions = new Float32Array(
    buffer.slice(atSource, atIndices),
    0,
    sourceVertices * 3,
  );
  const indices = new Uint32Array(
    buffer.slice(atIndices, atPainted),
    0,
    indexCount,
  );
  const paintedPositions = new Float32Array(
    buffer.slice(atPainted, atCharts),
    0,
  );
  const charts = new Uint32Array(buffer.slice(atCharts), 0);

  /**
   * **Indices are bounds-checked here rather than trusted to be in range.** They are the one
   * array in this file that indexes another, and a tree built over an index past the end of
   * the positions reads whatever is next in memory and reports it as a triangle.
   */
  for (const index of indices) {
    if (index >= paintedVertices) {
      throw new Error(
        `texture.bin names painted vertex ${index} of ${paintedVertices}`,
      );
    }
  }

  return {
    width,
    height,
    uvs,
    painted: {
      positions: paintedPositions,
      indices: new Uint32Array(indices),
      charts,
      vertexCount: paintedVertices,
      triangleCount: indexCount / 3,
    },
    source: { positions: sourcePositions, vertexCount: sourceVertices },
    texelsPerUnit: fields.getFloat32(28, true),
    utilization: fields.getFloat32(32, true),
    chartCount: fields.getUint32(36, true),
  };
};

/**
 * Whether a saved reference describes the mesh this build just produced.
 *
 * **An exact comparison, and exactness is the point.** The alternative is a tolerance, and a
 * tolerance is a guess about how far a coordinate may move before a picture stops landing where
 * it was painted — a guess nobody has measured and everybody would have to reason about.
 * Identical positions mean the saved coordinates still mean what they meant. Anything else means
 * re-projecting, which is slow and lossy and always correct, so the only question is how often
 * that happens and the answer should be almost never.
 *
 * **The welded mesh, in full, rather than the unwelded one that is painted on.** The unwelded
 * mesh has a different vertex count for the same surface — one per cut — so comparing it would
 * be comparing two things that are not the same shape. The welded mesh is the one the mesher
 * produces, and the question is whether it still produces the same one.
 *
 * **Every vertex compared, not a sample and not a digest.** A count would pass on a model that
 * had grown by exactly one vertex; a digest would pass on one that had been rearranged. The
 * whole check is a few hundred thousand `===` on an array that is already in memory, and it runs
 * once per file opened.
 */
export const referenceMatches = (
  saved: ReferenceFile,
  source: { readonly positions: Float32Array; readonly vertexCount: number },
): boolean => {
  if (saved.source.vertexCount !== source.vertexCount) return false;
  if (saved.source.positions.length !== source.positions.length) return false;

  // **`===` and not `Object.is`, which would treat two NaNs as the same vertex.** A NaN in a
  // position is a corrupt file rather than a position, and the two answers this can give —
  // "same surface" and "go and re-project" — are both safe, so the comparison is allowed to
  // simply say no.
  for (let at = 0; at < source.positions.length; at++) {
    if (!(saved.source.positions[at] === source.positions[at])) return false;
  }
  return true;
};
