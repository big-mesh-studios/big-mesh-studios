/**
 * The reference mesh a model's texture coordinates are baked onto, and the atlas they live in.
 *
 * ## Why there is a second mesh at all
 *
 * **Because an unwrap is global and a rebuild is not, and because unwrapping what is on screen is
 * unaffordable.** Moving one part renumbers every chart, so coordinates cannot be re-derived on
 * every edit — they are pinned here, once, and carried onto whatever the viewport is showing. And
 * the mesh they are pinned to is deliberately *coarse*: unwrapping a 9,740-triangle sphere took
 * 1.4 s, 38,732 took 11.6 s and 84,044 took 74 s, and a pattern does not get better because the
 * mesh it is painted on has more triangles. The table is in `./unwrap`.
 *
 * So `REFERENCE_VOXEL_SIZE` is the mesh here, `budgetFor(REFERENCE_VOXEL_SIZE)` is what the
 * mesher is asked for, and the transfer in `../mesh/uv-transfer` does the carrying. The viewport
 * keeps meshing at whatever resolution the user picked and shows the same picture.
 *
 * ## Why a rebake keeps the painting
 *
 * **Because the alternative is a button that throws away somebody's work.** A new unwrap lays the
 * atlas out differently, so the old coordinates do not mean the same texels. But every vertex of
 * the new reference has a nearest point on the old one, that point had an old coordinate, and that
 * coordinate names a texel — so the picture can be read out through the old layout and written
 * back through the new one, texel by texel. It is the same nearest-point query the transfer uses,
 * run once per vertex of the coarse mesh, which is a few thousand of them.
 *
 * ## What this is not
 *
 * **Not a texture, and not a picture.** The atlas is only the coordinates' rectangle; the pixels
 * are a `PaintSurface` and the two are kept here together because they are meaningless apart.
 */
import type { ChunkMesh } from "@big-mesh-studios/meshing";

import { budgetFor } from "../model/mesh-model";
import type { Part } from "../model/part";
import { meshParts } from "../model/mesh-model";
import { TriangleBVH, type TriangleMesh } from "../mesh/triangle-bvh";
import { transferUvs, type UvTransfer } from "../mesh/uv-transfer";
import { PaintSurface } from "./paint-surface";
import { referenceMatches, type ReferenceFile } from "./reference-file";
import {
  DEFAULT_UNWRAP,
  REFERENCE_VOXEL_SIZE,
  type UnwrapResult,
  type UnwrappedMesh,
} from "./unwrap";
import { unwrapOffThread, type UnwrapProgress } from "./unwrap-client";

/** What the unwrap reported, kept because nothing else knows it. */
export interface AtlasInfo {
  readonly width: number;
  readonly height: number;
  readonly chartCount: number;
  readonly utilization: number;
  readonly texelsPerUnit: number;
}

/** A model with texture coordinates baked onto it. */
export interface TextureBake {
  /**
   * The pinned surface, **with its cuts still open**.
   *
   * **Not the mesh that was handed to the unwrapper, and that is the whole fix.** The unwrapper
   * returns its output unwelded — a vertex on a cut exists once per chart, each with its own
   * atlas coordinate — and this is that mesh rather than the welded one that went in. The
   * brush raycasts here, so a hit interpolates across a triangle whose three coordinates all
   * belong to the same chart, and the dab lands in the chart it was aimed at.
   */
  readonly reference: UnwrappedMesh;

  /**
   * The welded mesh the unwrap was taken over, kept only so a file saved from this bake can be
   * checked against the model this build meshes now. **Never raycast, never painted on** — the
   * brush uses {@link reference}, because that is the one whose cuts are open.
   */
  readonly source: {
    readonly positions: Float32Array;
    readonly vertexCount: number;
  };
  /** Over the same mesh, for carrying coordinates and for painting raycasts. */
  readonly bvh: TriangleBVH;
  /** Two numbers a reference vertex, in the unit square. */
  readonly uvs: Float32Array;
  readonly atlas: AtlasInfo;
  readonly surface: PaintSurface;

  /**
   * The coordinates for a mesh that has just been rebuilt.
   *
   * **A method rather than a function taking the bake**, because the transfer needs the reference
   * tree, and a caller holding a bake should not have to know that.
   */
  readonly carry: (display: ChunkMesh) => UvTransfer;
}

/** The budget the reference mesh is meshed at. Fixed, and deliberately not the viewport's. */
export const REFERENCE_BUDGET = budgetFor(REFERENCE_VOXEL_SIZE);

/**
 * How far the mesh may move from the surface its coordinates were baked on, in world units,
 * before a caller should offer to rebake.
 *
 * **A quarter of a unit, which is the reference mesh's own voxel.** A vertex that has wandered
 * further than the thing it was measured against is borrowing coordinates from a surface it is no
 * longer on, and that is where a painted stroke starts to smear. Below it the smear is smaller
 * than the chart it sits in.
 */
export const DRIFT_LIMIT = REFERENCE_VOXEL_SIZE;

/** How a caller hears about a bake going on. */
export type BakeProgress = UnwrapProgress;

/**
 * Bakes coordinates onto a model, or answers nothing for a model with no surface.
 *
 * **The reference is meshed here rather than passed in**, so that the budget and the coordinate
 * count cannot come apart: a caller that supplied its own mesh could hand over one meshed at the
 * viewport's resolution and get back a minute of unwrapping it did not ask for.
 */
export const bakeTexture = async (
  parts: readonly Part[],
  onProgress?: BakeProgress,
): Promise<TextureBake | undefined> => {
  const meshed = meshParts(parts, REFERENCE_BUDGET);
  if (meshed === undefined) return undefined;

  const result = await unwrapReference(meshed.mesh, onProgress);
  if (result === undefined) return undefined;

  return assemble(result, meshed.mesh);
};

/**
 * A texture that was reopened, and whether it came back the way it went in.
 *
 * **`exact` is false when the picture had to be re-projected onto a fresh unwrap.** The caller
 * has to be able to say so — a file the user reopens and finds subtly rearranged is a bug
 * report, and "approximately" is the difference between a file they can rely on and one they
 * have to check by eye. Nothing else about the two cases differs, so they are one return value
 * rather than two functions.
 */
export interface LoadedTexture {
  readonly bake: TextureBake | undefined;
  readonly exact: boolean;
}

/**
 * Reopens a texture that was saved in a file.
 *
 * **Two paths, and which one runs is decided by an exact comparison of the saved surface against
 * the one this build meshes now.** Match, and the saved coordinates are used as they are: no
 * unwrapping, no waiting, and the picture lands exactly where it was left. Mismatch — a build
 * whose mesher changed underneath the file — and the coordinates belong to a surface that is no
 * longer there, so the only honest thing is to unwrap again and re-project the picture onto the
 * new layout.
 *
 * **The picture's own size is checked before it is used, and only on the exact path.** On the
 * other path it is resampled into whatever atlas the new unwrap produced, so its dimensions do
 * not need to survive; here they *are* the atlas, and a PNG that is not the size the file said
 * it was is a file that does not match its own description.
 *
 * **Takes a `PaintSurface` rather than an `ImageData`.** The decoded PNG is an image buffer and
 * that is exactly what a surface is, so this function needs no knowledge that the buffer came
 * from a canvas — which keeps the canvas out of everything between the decoder and the pixels.
 */
export const loadTexture = async (
  parts: readonly Part[],
  saved: ReferenceFile,
  picture: PaintSurface,
  onProgress?: BakeProgress,
): Promise<LoadedTexture> => {
  const meshed = meshParts(parts, REFERENCE_BUDGET);
  if (meshed === undefined) return { bake: undefined, exact: true };

  const welded = meshed.mesh;

  if (referenceMatches(saved, welded)) {
    if (picture.width !== saved.width || picture.height !== saved.height) {
      throw new Error(
        `texture.png is ${picture.width} by ${picture.height} and the manifest says ${saved.width} by ${saved.height}`,
      );
    }
    return { bake: assembleExact(saved, picture), exact: true };
  }

  const result = await unwrapReference(welded, onProgress);
  if (result === undefined) return { bake: undefined, exact: false };

  const surface = new PaintSurface(result.width, result.height);
  reproject(
    { bvh: TriangleBVH.of(saved.painted), uvs: saved.uvs, surface: picture },
    result.reference,
    result.uvs,
    surface,
  );

  return { bake: assemble(result, welded, surface), exact: false };
};

/**
 * A bake whose coordinates were read out of a file rather than computed here.
 *
 * **Separate from `assemble` rather than the unwrap's answer passed into it**, because the whole
 * claim of this path is that these coordinates were checked against this mesh rather than
 * produced for it — and one function that took "the numbers" for both would make them
 * indistinguishable at the call site, which is exactly the distinction somebody reading it later
 * needs to be able to see.
 */
const assembleExact = (
  saved: ReferenceFile,
  surface: PaintSurface,
): TextureBake => {
  // **The unwelded surface out of the file**, which is the one the brush needs and the one the
  // exact path exists to avoid recomputing.
  const reference = saved.painted;
  const bvh = TriangleBVH.of(reference);
  const uvs = saved.uvs;

  return {
    reference,
    source: saved.source,
    bvh,
    uvs,
    atlas: {
      width: surface.width,
      height: surface.height,
      // **Read back out of the file rather than estimated.** The three numbers the unwrapper
      // produced are in the header, because `texelsPerUnit` in particular is its own arithmetic
      // and cannot be recovered without unwrapping — so a brush sized from an invented one is a
      // brush of the wrong width, and a panel showing a made-up chart count is worse than a
      // blank one.
      chartCount: saved.chartCount,
      utilization: saved.utilization,
      texelsPerUnit: saved.texelsPerUnit,
    },
    surface,
    carry: (display) => transferUvs(bvh, uvs, display),
  };
};

/** The unwrap and the objects that hold its answer, once the numbers are in. */
const assemble = (
  result: UnwrapResult,
  source: { positions: Float32Array; vertexCount: number },
  previous?: PaintSurface,
): TextureBake => {
  const reference = result.reference;
  const uvs = result.uvs;
  const bvh = TriangleBVH.of(reference);

  const surface = new PaintSurface(result.width, result.height);
  if (previous !== undefined)
    reproject({ bvh, uvs, surface: previous }, reference, uvs, surface);

  return {
    reference,
    source,
    bvh,
    uvs,
    atlas: {
      width: result.width,
      height: result.height,
      chartCount: result.chartCount,
      utilization: result.utilization,
      texelsPerUnit: result.texelsPerUnit,
    },
    surface,
    carry: (display) => transferUvs(bvh, uvs, display),
  };
};

/** The unwrap itself, over an already-meshed reference. Split out so both entries share it. */
const unwrapReference = async (
  reference: ChunkMesh,
  onProgress?: BakeProgress,
): Promise<UnwrapResult | undefined> =>
  unwrapOffThread(
    {
      positions: reference.positions,
      indices: reference.indices,
      vertexCount: reference.vertexCount,
    },
    DEFAULT_UNWRAP,
    onProgress,
  );

/**
 * Rebakes onto a changed model, carrying the painting across.
 *
 * **The same shape as {@link bakeTexture} and the same reason for it** — the caller is asking to
 * change the layout deliberately, usually because a prompt told them the coordinates had drifted,
 * and the picture is the reason they were painting.
 */
export const rebakeTexture = async (
  previous: TextureBake,
  parts: readonly Part[],
  onProgress?: BakeProgress,
): Promise<TextureBake | undefined> => {
  const meshed = meshParts(parts, REFERENCE_BUDGET);
  if (meshed === undefined) return undefined;

  const result = await unwrapReference(meshed.mesh, onProgress);
  if (result === undefined) return undefined;

  return assemble(result, meshed.mesh, previous.surface);
};

/**
 * Copies the old picture into the new layout, texel by texel.
 *
 * **For each new vertex, the nearest old point's coordinate names an old texel**, and that texel
 * is written to the new coordinate. A vertex of the coarse reference mesh is a sample of the
 * surface a little over a texel apart, so this resamples rather than blurs — which is honest
 * about what happened to the picture and keeps it recognisable.
 *
 * **Nearest neighbour rather than a filtered tap**, because the old texels are being read at
 * coordinates that are themselves interpolated, and interpolating twice would soften a stroke
 * that was sharp before somebody rebaked.
 */
const reproject = (
  from: { bvh: TriangleBVH; uvs: Float32Array; surface: PaintSurface },
  reference: TriangleMesh,
  uvs: Float32Array,
  surface: PaintSurface,
): void => {
  const source = from.bvh;

  for (let vertex = 0; vertex < reference.vertexCount; vertex++) {
    const at = vertex * 3;
    const found = source.closestPoint({
      x: reference.positions[at]!,
      y: reference.positions[at + 1]!,
      z: reference.positions[at + 2]!,
    });
    if (found === undefined) continue;

    const old = from.uvs;
    const [first, second, third] = found.vertices;
    const [w0, w1, w2] = found.weights;
    const oldU =
      old[first * 2]! * w0 + old[second * 2]! * w1 + old[third * 2]! * w2;
    const oldV =
      old[first * 2 + 1]! * w0 +
      old[second * 2 + 1]! * w1 +
      old[third * 2 + 1]! * w2;

    const colour = from.surface.sample(oldU, oldV);
    writeTexel(surface, uvs[vertex * 2]!, uvs[vertex * 2 + 1]!, colour);
  }
};

/** Puts one colour into the atlas, clipped, as a stamp of a single texel would. */
const writeTexel = (
  surface: PaintSurface,
  u: number,
  v: number,
  colour: { r: number; g: number; b: number; a: number },
): void => {
  const x = Math.floor(u * surface.width);
  const y = Math.floor(v * surface.height);
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height) return;
  const at = (y * surface.width + x) * 4;
  surface.pixels[at] = colour.r;
  surface.pixels[at + 1] = colour.g;
  surface.pixels[at + 2] = colour.b;
  surface.pixels[at + 3] = colour.a;
};

/**
 * Whether a rebuild's carried coordinates have drifted far enough to be worth a rebake.
 *
 * **A question about the model, asked of a transfer, rather than a check the transfer does.**
 * `UvTransfer.drift` is a length and this is a policy, and the policy belongs with the bake
 * rather than with the arithmetic that produced the number.
 */
export const drifted = (
  carried: UvTransfer,
  limit: number = DRIFT_LIMIT,
): boolean => carried.drift > limit;
