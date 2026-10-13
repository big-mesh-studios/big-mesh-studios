// CPU triangle-mesh extraction for the alternative (surface-mesh) renderer.
// Each block's surface is turned into a set of quads — one per exposed face —
// whose positions are in the block's local world space (centred at the origin,
// matching the placement the blocks are drawn at). UVs are baked into
// the atlas using exactly the same face→tile mapping as `rayMarchWorld`, so the
// terrain is lit and textured the same wherever a face is drawn.
//
// Seam faces between neighbouring blocks are culled by reading the block's own
// 1-voxel meshing border (`VoxelStore.padding`), which `fillStore` generates
// from the same world-coordinate terrain function as the interior. The border
// always matches what the neighbour will contain, so no worker needs a
// neighbour's live store to resolve a seam.
//
// Fluids are drawn at the partial height their level calls for: a water or
// lava cell resting on ground sits as thin as `1/8` of a voxel at its seventh
// level of spread, its top surface drops one level per cell, and a cell with
// open air below it is a falling column and draws full height. Water faces go
// to the translucent water pass; lava, which is opaque and textured, is
// emitted into the terrain pass so it shares the terrain material and the
// opaque draw order.
import { BufferAttribute, BufferGeometry } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import { Growable } from "./growable";
import {
  VOXEL_AIR,
  isFluidId,
  isLavaId,
  isWaterId,
  fluidLevel,
  type VoxelStore,
} from "../world/voxel-store";
import { surfaceFractionOfLevel } from "../world/fluid";
import { LIGHT_TO_UNIT, type LightStore } from "../world/light-store";
import { SlicePlane, type FaceLight } from "./plane-merge";
import {
  faceIndexOf,
  halfOfWholeNumber,
  type VertexFormat,
} from "./vertex-format";

/**
 * Vertex arrays for one mesh, at exactly the length the build wrote. Typed all
 * the way from the builder that accumulated them, so what a worker sends is
 * transferred rather than converted and copied.
 */
export interface MeshArrays {
  positions: Float32Array;
  /**
   * Four bytes a vertex: which way the face points, how lit it is, which tile
   * of the sheet it shows, and one byte spare. See `vertex-format.ts` for what
   * each lane holds and why they share one attribute.
   */
  packed: Uint8Array;
  /**
   * Texture coordinates counted in cells rather than swept nought to one, so a
   * quad covering several cells repeats its tile once per cell. Which tile each
   * vertex repeats is a lane of `packed`. Held as half floats, which carry
   * every whole number a coordinate can be exactly.
   */
  uvs: Uint16Array;
  indices: Uint32Array;
}

/**
 * The six arrays a mesh is built into, and the mesher's unit of reuse: a worker
 * keeps one of these for terrain and one for water and hands the same pair to
 * every block it builds, so the arrays grow to the largest block it meets and
 * then stop growing. `finish` copies what was written out at its exact length,
 * because that copy is transferred away and must not be a view onto the buffer
 * the next block overwrites.
 */
export class MeshBuilder {
  readonly positions = new Growable(Float32Array);
  readonly packed = new Growable(Uint8Array);
  readonly uvs = new Growable(Uint16Array);
  readonly indices = new Growable(Uint32Array);

  /** Empties every array for the next block, keeping the buffers. */
  clear(): void {
    this.positions.clear();
    this.packed.clear();
    this.uvs.clear();
    this.indices.clear();
  }

  /**
   * Writes one vertex's lane group: the direction its face points, its two
   * baked light channels, and its tile of the sheet, each as the byte the
   * shader decodes.
   */
  pushPacked(face: number, sky: number, block: number, tile: number): void {
    this.packed.pushQuad(
      face,
      Math.round(sky * 255),
      tile,
      Math.round(block * 255),
    );
  }

  /** Writes one vertex's texture coordinate, as the half floats it is held in. */
  pushUv(u: number, v: number): void {
    this.uvs.pushPair(halfOfWholeNumber(u), halfOfWholeNumber(v));
  }

  /** What was written, as arrays of their own. */
  finish(): MeshArrays {
    return {
      positions: this.positions.exact(),
      packed: this.packed.exact(),
      uvs: this.uvs.exact(),
      indices: this.indices.exact(),
    };
  }
}

/** A mesh with nothing in it, for a block with no face to show. */
export const emptyMesh = (): MeshArrays => ({
  positions: new Float32Array(0),
  packed: new Uint8Array(0),
  uvs: new Uint16Array(0),
  indices: new Uint32Array(0),
});

/**
 * One quad's four corners as [xOffset, yOffset, zOffset, u, v] cell
 * offsets: the two tangent axes sweep 0..1 while the face axis stays 0,
 * and (u, v) are the in-plane local UVs of the face
 * mapping. Side faces flip v so the world-up axis maps to the top of the
 * source tile (grass sits on top).
 */
const FACE_CORNERS: Array<Array<[number, number, number, number, number]>> = [
  // +X/-X faces: u along +Z, v up along +Y (flipped)
  [
    [0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
  ],
  // +Y/-Y faces: u along +X, v along +Z (no flip)
  [
    [0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 1, 1, 1],
    [0, 0, 1, 0, 1],
  ],
  // +Z/-Z faces: u along +X, v up along +Y (flipped)
  [
    [0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 1, 0, 1, 0],
    [0, 1, 0, 0, 0],
  ],
];

/**
 * Whether a face on `axis` with outward normal `sign` is already wound, in
 * `FACE_CORNERS` order, toward that normal. The corner order fronts exactly
 * the +x, −y and +z faces; the other three orientations (west, top, south)
 * are emitted with reversed indices so every face fronts the side it is
 * exposed on and back faces can be culled.
 */
const windsOutward = (axis: number, sign: number): boolean =>
  axis === 1 ? sign === -1 : sign === 1;

/**
 * The two in-plane axis indices of a face, by the axis the face is on. The
 * mesher uses these to read a corner's neighbours in the face plane.
 */
/**
 * Whether a face's u axis runs along the second of its tangent axes rather
 * than the first. Only the X faces are laid out that way — their u runs along
 * Z while their v runs up Y — and a merged quad has to know, because its
 * texture repeats once per cell along each.
 */
const U_ALONG_SECOND_TANGENT = [true, false, false];

const TANGENT_AXES: Array<[number, number]> = [
  [1, 2], // +X/-X faces lie in the YZ plane
  [0, 2], // +Y/-Y faces lie in the XZ plane
  [0, 1], // +Z/-Z faces lie in the XY plane
];

/**
 * The normalized sky light (0..1) that reaches a padded voxel, for shading a
 * nearby face. This is the channel the day-night sun, moon, and ambient scale,
 * so it is kept apart from block light rather than merged with it.
 */
const cellSkyLight = (
  light: LightStore,
  x: number,
  y: number,
  z: number,
): number => LIGHT_TO_UNIT(light.skylightAt(light.paddedIndex(x, y, z)));

/**
 * The normalized block light (0..1) that reaches a padded voxel: the emitters'
 * own light, which does not change with the time of day.
 */
const cellBlockLight = (
  light: LightStore,
  x: number,
  y: number,
  z: number,
): number => LIGHT_TO_UNIT(light.blocklightAt(light.paddedIndex(x, y, z)));

/**
 * Whether a padded voxel blocks sight: anything that neither air nor water
 * transmits, and that a face's corner occlusion therefore counts against.
 * Water (of any level) stays transparent to the corner shade; lava blocks it.
 */
const isOpaque = (
  store: VoxelStore,
  x: number,
  y: number,
  z: number,
): boolean => {
  const id = store.atPadded(x, y, z);
  return id !== VOXEL_AIR && !isWaterId(id);
};

/**
 * Whether a neighbour lets a solid voxel's face show: open air, or a fluid the
 * face sits behind. A face against solid ground of any kind is culled.
 */
const openToFace = (id: number): boolean => id === VOXEL_AIR || isFluidId(id);

/**
 * The one smooth-lighting pass in this file: the four per-vertex corner
 * brightnesses (0..1) of one exposed face, in `FACE_CORNERS` vertex order, for
 * each of the two light channels. Each vertex samples the 2x2 voxel patch just
 * outside the face along its normal for light, and the three neighbours
 * wrapping its corner (two sides and the diagonal), also just outside the face,
 * for ambient occlusion; multiplying the two shades the face with smooth
 * gradients and dark niches. Sampling the occluders on the air side keeps a
 * level surface bright across its whole top — a same-height neighbour does not
 * shade a coplanar corner — while a neighbour that rises above it does. The
 * sphere is voxel-centred — tangents and normal stretch one voxel — so a seam
 * face reads its neighbour's light and occluders from the block's own generated
 * border, exactly as it reads its voxel. Sky and block light are sampled into
 * separate arrays so the shader can scale the sky channel by the time of day
 * while the block channel shines on its own.
 *
 * Returns `null` when no light store accompanies the mesh, which the caller
 * treats as a fully bright face.
 */
const faceBrightness = (
  store: VoxelStore,
  light: LightStore | null,
  x: number,
  y: number,
  z: number,
  axis: number,
  sign: number,
): FaceLight | null => {
  if (light === null) {
    return null;
  }
  const [a1, a2] = TANGENT_AXES[axis];
  const nax = [0, 0, 0] as [number, number, number];
  nax[axis] = sign;
  const sky: number[] = [];
  const block: number[] = [];
  for (const corner of FACE_CORNERS[axis]) {
    const c1 = corner[a1];
    const c2 = corner[a2];
    let litSky = 0;
    let litBlock = 0;
    for (const r of [c1, c1 - 1]) {
      for (const s of [c2, c2 - 1]) {
        const at = [x, y, z] as [number, number, number];
        at[a1] += r;
        at[a2] += s;
        at[axis] += sign;
        litSky = Math.max(litSky, cellSkyLight(light, at[0], at[1], at[2]));
        litBlock = Math.max(
          litBlock,
          cellBlockLight(light, at[0], at[1], at[2]),
        );
      }
    }
    const d1 = c1 === 0 ? -1 : 1;
    const d2 = c2 === 0 ? -1 : 1;
    let occluded = 0;
    const side1 = [x, y, z] as [number, number, number];
    side1[a1] += d1;
    side1[axis] += sign;
    occluded += isOpaque(store, side1[0], side1[1], side1[2]) ? 1 : 0;
    const side2 = [x, y, z] as [number, number, number];
    side2[a2] += d2;
    side2[axis] += sign;
    occluded += isOpaque(store, side2[0], side2[1], side2[2]) ? 1 : 0;
    const diag = [x, y, z] as [number, number, number];
    diag[a1] += d1;
    diag[a2] += d2;
    diag[axis] += sign;
    occluded += isOpaque(store, diag[0], diag[1], diag[2]) ? 1 : 0;
    const shade = (3 - occluded) / 3;
    sky.push(litSky * shade);
    block.push(litBlock * shade);
  }
  return { sky, block };
};

/**
 * Used until the atlas loads (or for voxel ids with no tile config): a
 * full texel rect so faces still map to something sane.
 */
/** The tile a voxel with no atlas entry shows: the sheet's first. */
const DEFAULT_TILE = 0;

/** The accumulators a mesh build writes into, shared by every face emitter. */
interface QuadContext {
  store: VoxelStore;
  light: LightStore | null;
  into: MeshBuilder;
}

const finishQuad = (
  ctx: QuadContext,
  base: number,
  axis: number,
  sign: number,
): void => {
  if (windsOutward(axis, sign)) {
    ctx.into.indices.pushTriple(base, base + 1, base + 2);
    ctx.into.indices.pushTriple(base, base + 2, base + 3);
  } else {
    ctx.into.indices.pushTriple(base, base + 2, base + 1);
    ctx.into.indices.pushTriple(base, base + 3, base + 2);
  }
};

/**
 * Emits a full-cube quad for a face of the voxel centred at `(wx, wy, wz)`,
 * using the shared `FACE_CORNERS` winding so the face fronts its exposure.
 */
const emitCubeFace = (
  ctx: QuadContext,
  wx: number,
  wy: number,
  wz: number,
  axis: number,
  sign: number,
  tile: number,
  x: number,
  y: number,
  z: number,
): void => {
  const { store, light } = ctx;
  const scale = store.scale;
  const h = scale / 2;
  const base = ctx.into.positions.count / 3;
  const corners = FACE_CORNERS[axis];
  const cornerLight = faceBrightness(store, light, x, y, z, axis, sign);
  for (let k = 0; k < corners.length; k++) {
    const [xo, yo, zo, u, v] = corners[k];
    ctx.into.positions.pushTriple(
      axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
      axis === 1 ? wy + sign * h : wy + (yo - 0.5) * 2 * h,
      axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
    );
    ctx.into.pushUv(u, v);
    ctx.into.pushPacked(
      faceIndexOf(axis, sign),
      cornerLight === null ? 1 : cornerLight.sky[k],
      cornerLight === null ? 0 : cornerLight.block[k],
      tile,
    );
  }
  finishQuad(ctx, base, axis, sign);
};

/**
 * Emits one quad covering a rectangle of cells that all show the same tile
 * and are all shaded flat, in the plane `slice` of `axis` facing `sign`. The
 * rectangle starts at `first` cells along the face's first tangent axis and
 * `second` along its other, and runs `wide` and `tall` cells from there.
 *
 * The texture coordinates count cells rather than sweeping nought to one, so
 * the material repeats the tile once per cell across however many the quad
 * covers.
 */
const emitMergedFace = (
  ctx: QuadContext,
  axis: number,
  sign: number,
  slice: number,
  first: number,
  second: number,
  wide: number,
  tall: number,
  tile: number,
  sky: number,
  block: number,
): void => {
  const { store } = ctx;
  const scale = store.scale;
  const voxels = store.voxels;
  const [a1, a2] = TANGENT_AXES[axis];
  const base = ctx.into.positions.count / 3;
  const facing = (slice + (sign > 0 ? 1 : 0) - voxels[axis] / 2) * scale;
  const alongU = U_ALONG_SECOND_TANGENT[axis] ? tall : wide;
  const alongV = U_ALONG_SECOND_TANGENT[axis] ? wide : tall;
  for (const corner of FACE_CORNERS[axis]) {
    const [xo, yo, zo, u, v] = corner;
    const offsets = [xo, yo, zo];
    const point = [0, 0, 0];
    point[axis] = facing;
    point[a1] = (first + offsets[a1] * wide - voxels[a1] / 2) * scale;
    point[a2] = (second + offsets[a2] * tall - voxels[a2] / 2) * scale;
    ctx.into.positions.pushTriple(point[0], point[1], point[2]);
    ctx.into.pushUv(u * alongU, v * alongV);
    ctx.into.pushPacked(faceIndexOf(axis, sign), sky, block, tile);
  }
  finishQuad(ctx, base, axis, sign);
};

/**
 * Emits a fluid quad whose world Y sits between `bottomFraction` and
 * `topFraction` of the voxel height (measured from its bottom): a surface at
 * its level's height, or the wall of the drop between two surfaces. Corner
 * order and winding are the same as `emitCubeFace`, so the quad fronts its
 * normal.
 */
const emitFluidFace = (
  ctx: QuadContext,
  wx: number,
  wy: number,
  wz: number,
  axis: number,
  sign: number,
  tile: number,
  x: number,
  y: number,
  z: number,
  bottomFraction: number,
  topFraction: number,
): void => {
  const { store, light } = ctx;
  const scale = store.scale;
  const h = scale / 2;
  const base = ctx.into.positions.count / 3;
  const corners = FACE_CORNERS[axis];
  const cornerLight = faceBrightness(store, light, x, y, z, axis, sign);
  const yAt = (fraction: number): number => wy - h + fraction * scale;
  for (let k = 0; k < corners.length; k++) {
    const [xo, yo, zo, u, v] = corners[k];
    // Top/bottom faces (axis 1) sit at the plane the face asks for; a corner
    // that lies on the top edge of a side face gets `topFraction`, the bottom
    // edge `bottomFraction`.
    const fy =
      axis === 1 ? topFraction : yo === 1 ? topFraction : bottomFraction;
    ctx.into.positions.pushTriple(
      axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
      yAt(fy),
      axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
    );
    ctx.into.pushUv(u, v);
    ctx.into.pushPacked(
      faceIndexOf(axis, sign),
      cornerLight === null ? 1 : cornerLight.sky[k],
      cornerLight === null ? 0 : cornerLight.block[k],
      tile,
    );
  }
  finishQuad(ctx, base, axis, sign);
};

/**
 * The surface fraction a fluid voxel draws at, measured from the voxel's
 * bottom. A cell that is genuinely airborne — open air directly below it — is
 * a falling head and draws full. A cell with open air above it is a surface:
 * it draws its level's fraction whether it rests on ground or on the water of
 * a body beneath it, so the sheet that flows over an edge stays level with
 * the water it came from instead of rearing up full where it meets the drop.
 * Every other cell is body (part of a vertical column) and draws full, so a
 * waterfall reads as one solid stream from its surface down to its pool.
 */
const surfaceFractionAt = (
  store: VoxelStore,
  x: number,
  y: number,
  z: number,
): number => {
  const id = store.atPadded(x, y, z);
  const above = store.atPadded(x, y + 1, z);
  const below = store.atPadded(x, y - 1, z);
  if (below === VOXEL_AIR) {
    return 1;
  }
  if (above === VOXEL_AIR) {
    return surfaceFractionOfLevel(fluidLevel(id));
  }
  return 1;
};

/**
 * Emits the exposed faces of one fluid voxel. A top surface is drawn only
 * where open air sits above it; a side wall runs from the neighbour's surface
 * down... up to this cell's own surface, appearing only when this cell stands
 * taller (a wall never shows toward a solid neighbour, nor toward a fluid
 * neighbour whose surface is at or above this one). A bottom face is drawn
 * only where open air sits below. `kindTile`, when given, supplies the tile a
 * textured fluid (lava) bakes into the face; water passes `null` and leaves
 * UVs on the full atlas, which its material never reads.
 */
const emitLiquidVoxel = (
  ctx: QuadContext,
  x: number,
  y: number,
  z: number,
  kindTile: ((id: number) => number) | null,
): void => {
  const { store } = ctx;
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;
  const at = (px: number, py: number, pz: number): number =>
    store.atPadded(px, py, pz);

  const id = at(x, y, z);
  const sameKind = isWaterId(id) ? isWaterId : isLavaId;
  const above = at(x, y + 1, z);
  const below = at(x, y - 1, z);
  const neighbours: Array<[number, number, number, number]> = [
    [x - 1, y, z, 0],
    [x + 1, y, z, 1],
    [x, y, z - 1, 2],
    [x, y, z + 1, 3],
  ];

  const topFrac = surfaceFractionAt(store, x, y, z);
  const wx = (x + 0.5 - nx / 2) * scale;
  const wy = (y + 0.5 - ny / 2) * scale;
  const wz = (z + 0.5 - nz / 2) * scale;
  const tile = kindTile === null ? DEFAULT_TILE : kindTile(id);

  if (above === VOXEL_AIR) {
    emitFluidFace(ctx, wx, wy, wz, 1, 1, tile, x, y, z, topFrac, topFrac);
  }
  if (below === VOXEL_AIR) {
    emitFluidFace(ctx, wx, wy, wz, 1, -1, tile, x, y, z, 0, 0);
  }
  for (const [nX, nY, nZ, dir] of neighbours) {
    const nid = at(nX, nY, nZ);
    if (nid !== VOXEL_AIR && !sameKind(nid)) {
      continue; // a solid wall, or a different fluid, covers the face
    }
    const nTop = sameKind(nid) ? surfaceFractionAt(store, nX, nY, nZ) : 0;
    if (nTop >= topFrac) {
      continue; // covered by a taller-or-equal same-kind neighbour
    }
    const axis = dir < 2 ? 0 : 2;
    const sign = dir % 2 === 0 ? -1 : 1;
    emitFluidFace(ctx, wx, wy, wz, axis, sign, tile, x, y, z, nTop, topFrac);
  }
};

/**
 * Emits the terrain quads for every exposed face of `store`'s solid and lava
 * voxels. `voxelTiles` maps each solid id to its top/side/bottom atlas rects;
 * when a config is missing (atlas not loaded yet) faces fall back to
 * `DEFAULT_RECT`. Lava is meshed here, into the opaque terrain pass, at the
 * partial height its level calls for, textured with the lava tile its atlas
 * entry inherits; water is meshed by `buildWaterMesh`.
 *
 * Neighbours are read from `store`'s 1-voxel meshing border (`atPadded`),
 * so seam faces against the adjacent blocks' matching voxels are culled
 * without a resolver — on faces in every axis, since chunks stack
 * vertically as well as horizontally.
 */
export const buildBlockMesh = (
  store: VoxelStore,
  voxelTiles: VoxelTileConfig[],
  light: LightStore | null = null,
  into: MeshBuilder = new MeshBuilder(),
): MeshArrays => {
  into.clear();
  const ctx: QuadContext = { store, light, into };
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;
  const tiles = new Map<number, VoxelTileConfig>();
  for (const t of voxelTiles) {
    tiles.set(t.id, t);
  }
  const tileOf = (id: number): number => tiles.get(id)?.side ?? DEFAULT_TILE;
  const at = (x: number, y: number, z: number): number =>
    store.atPadded(x, y, z);

  // Lava is drawn cell by cell, at whatever height each cell's level asks
  // for, so it is swept on its own before the solid faces are gathered.
  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        if (isLavaId(at(x, y, z))) {
          emitLiquidVoxel(ctx, x, y, z, tileOf);
        }
      }
    }
  }

  const tileFor = (id: number, axis: number, sign: number): number => {
    const tile = tiles.get(id);
    if (axis !== 1) {
      return tile?.side ?? DEFAULT_TILE;
    }
    return (sign > 0 ? tile?.top : tile?.bottom) ?? DEFAULT_TILE;
  };

  const cell = [0, 0, 0];
  const neighbour = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const [a1, a2] = TANGENT_AXES[axis];
    const plane = new SlicePlane(store.voxels[a1], store.voxels[a2]);
    for (const sign of [-1, 1]) {
      for (let slice = 0; slice < store.voxels[axis]; slice++) {
        plane.clear();
        for (let second = 0; second < store.voxels[a2]; second++) {
          for (let first = 0; first < store.voxels[a1]; first++) {
            cell[axis] = slice;
            cell[a1] = first;
            cell[a2] = second;
            const id = at(cell[0], cell[1], cell[2]);
            if (id === VOXEL_AIR || isWaterId(id) || isLavaId(id)) {
              continue;
            }
            neighbour[axis] = slice + sign;
            neighbour[a1] = first;
            neighbour[a2] = second;
            if (!openToFace(at(neighbour[0], neighbour[1], neighbour[2]))) {
              continue;
            }
            plane.set(
              first,
              second,
              id,
              faceBrightness(
                store,
                light,
                cell[0],
                cell[1],
                cell[2],
                axis,
                sign,
              ),
            );
          }
        }
        plane.eachRectangle((rectangle) => {
          const { first, second, wide, tall, id, sky, block } = rectangle;
          const tile = tileFor(id, axis, sign);
          if (sky === null) {
            cell[axis] = slice;
            cell[a1] = first;
            cell[a2] = second;
            emitCubeFace(
              ctx,
              (cell[0] + 0.5 - nx / 2) * scale,
              (cell[1] + 0.5 - ny / 2) * scale,
              (cell[2] + 0.5 - nz / 2) * scale,
              axis,
              sign,
              tile,
              cell[0],
              cell[1],
              cell[2],
            );
            return;
          }
          emitMergedFace(
            ctx,
            axis,
            sign,
            slice,
            first,
            second,
            wide,
            tall,
            tile,
            sky,
            block,
          );
        });
      }
    }
  }

  return into.finish();
};

/**
 * Emits the water surface quads: every face of a water voxel that borders air
 * or a lower neighbouring surface, drawn at the height its level calls for —
 * a source and a resting body are full cubes, while a flowing edge steps down
 * one eighth per level. UVs are unused by the water material. Seam faces
 * against adjacent blocks' water are culled by the same generated
 * `VoxelStore` border as the terrain mesh.
 */
export const buildWaterMesh = (
  store: VoxelStore,
  light: LightStore | null = null,
  into: MeshBuilder = new MeshBuilder(),
): MeshArrays => {
  into.clear();
  const ctx: QuadContext = { store, light, into };
  const [nx, ny, nz] = store.voxels;

  // A store whose fill reported no water voxel cannot expose a water face, and
  // sweeping a full volume to prove it is the point of this flag.
  if (!store.hasWater) {
    return into.finish();
  }

  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        if (isWaterId(store.atPadded(x, y, z))) {
          emitLiquidVoxel(ctx, x, y, z, null);
        }
      }
    }
  }

  return into.finish();
};

/**
 * Wraps a typed array as a `BufferAttribute` whose update ranges say which
 * slice the GPU still needs, then marks it for upload. A caller that keeps a
 * merged geometry's arrays and only appends to them passes how many vertices
 * (or indices, for the index attribute) the GPU already holds, so the next
 * draw re-sends just the tail; `committed` of 0 (or a count that no longer
 * grew) uploads nothing extra.
 */
const attrWithRange = (
  array: Float32Array | Uint32Array | Uint16Array | Uint8Array,
  itemSize: number,
  span: Span | undefined,
  format?: VertexFormat,
  normalized = false,
): BufferAttribute => {
  const attribute = new BufferAttribute(array, itemSize, normalized);
  attribute.format = format;
  if (span !== undefined) {
    // Counted in numbers here, where the span counts vertices or indices.
    attribute.addUpdateRange(span.first * itemSize, span.count * itemSize);
  }
  attribute.needsUpdate = true;
  return attribute;
};

/** A run of one kind of thing an upload sends: where it starts, and how many. */
export interface Span {
  first: number;
  count: number;
}

/** What changed since the last upload: a run of vertices, and a run of indices. */
export interface WrittenSpans {
  vertices: Span;
  indices: Span;
}

/**
 * Applies `mesh`'s arrays to an existing geometry *in place*, replacing
 * its attributes while keeping the geometry object identity stable. The
 * renderer keys its GPU-buffer cache by geometry object, so re-uploading
 * into the same geometry reuses the buffers it already allocated (the new
 * attributes carry `needsUpdate`, which makes the next draw refresh their
 * data). Replacing `mesh.geometry` with a fresh geometry instead would
 * orphan the old entry in that cache and leak its GPU buffers on every
 * rebuild.
 *
 * `written` names the part of the arrays that changed since the last upload of
 * this same geometry — a run of vertices and a run of indices, counted in
 * vertices and indices rather than in numbers. Omitted, the whole of both is
 * sent, which is what a geometry filled for the first time needs.
 */
export const setGeometryData = (
  geometry: BufferGeometry,
  mesh: MeshArrays,
  written?: WrittenSpans,
): void => {
  geometry.setAttribute(
    "position",
    attrWithRange(mesh.positions, 3, written?.vertices, "float32x3"),
  );
  // The face direction, the baked light and the tile, a byte each, scaled into
  // 0..1 on the way in. A material that reads none of them (the probe, the
  // picker) simply never binds it.
  geometry.setAttribute(
    "packed",
    attrWithRange(mesh.packed, 4, written?.vertices, "unorm8x4", true),
  );
  if (mesh.uvs.length > 0) {
    // Half floats in a Uint16Array, which the array type alone cannot say.
    geometry.setAttribute(
      "uv",
      attrWithRange(mesh.uvs, 2, written?.vertices, "float16x2"),
    );
  } else {
    geometry.deleteAttribute("uv");
  }
  // wrap as a BufferAttribute so `setIndex` keeps the Uint32 type without
  // rescanning the array for the 16-bit cutoff
  geometry.setIndex(attrWithRange(mesh.indices, 1, written?.indices));
};

/**
 * Wraps extracted arrays into a fresh rmsl geometry (for tests and one-off
 * geometry); runtime block meshes should reuse a persistent geometry via
 * `setGeometryData` instead.
 */
export const meshArraysToGeometry = (mesh: MeshArrays): BufferGeometry => {
  const geometry = new BufferGeometry();
  setGeometryData(geometry, mesh);
  return geometry;
};

/**
 * The main-thread-to-worker mesh-build protocol. `data` is the block's voxel
 * data including its 1-voxel meshing border (a transferable copy), so the
 * worker can cull seam faces against the surrounding world without any
 * neighbour data of its own; the worker returns both meshes' arrays back.
 */
export interface MeshBuildRequest {
  /** The kind of message; mesh workers dispatch on it. */
  type: "mesh";
  id: number;
  voxels: [number, number, number];
  scale: number;
  data: Uint8Array;
  /** Whether `data` holds any water voxel; an empty water sweep when false. */
  hasWater: boolean;
  /** The block's two light channels, one byte per padded voxel, matching `data`. */
  light: Uint8Array;
  tileRects: VoxelTileConfig[];
}

export interface MeshBuildResult {
  /** The kind of result; mesh clients ignore every other kind a shared worker posts. */
  type: "mesh";
  id: number;
  terrain: MeshArrays;
  water: MeshArrays;
  /** The voxel buffer the worker read, echoed back so the caller can reuse it. */
  data: Uint8Array;
  /** The light channels the worker read, echoed back for reuse. */
  light: Uint8Array;
}

/**
 * A block's two surface meshes, terrain and water, built together. A fill
 * result carries one when the worker that generated the block's voxels also
 * meshed them, so the block never waits behind a separately-queued mesh job.
 */
export interface BlockMeshes {
  terrain: MeshArrays;
  water: MeshArrays;
}
