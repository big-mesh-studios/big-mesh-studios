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
import type { TileRect, VoxelTileConfig } from "./atlas";
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

/**
 * Vertex arrays for one mesh. The CPU builders produce plain arrays; the
 * web worker converts them to typed arrays so they can be transferred back
 * without a copy. `meshArraysToGeometry` consumes either.
 */
export interface MeshArrays {
  positions: number[] | Float32Array;
  normals: number[] | Float32Array;
  uvs: number[] | Float32Array;
  indices: number[] | Uint32Array;
  /** One 0..1 brightness per vertex, baked from the block's light + corner occlusion. */
  brightness: number[] | Float32Array;
}

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
const TANGENT_AXES: Array<[number, number]> = [
  [1, 2], // +X/-X faces lie in the YZ plane
  [0, 2], // +Y/-Y faces lie in the XZ plane
  [0, 1], // +Z/-Z faces lie in the XY plane
];

/**
 * The combined, normalized light (the brighter of sky and block light, as a
 * 0..1 fraction) that reaches a padded voxel, for shading a nearby face.
 */
const cellLight = (
  light: LightStore,
  x: number,
  y: number,
  z: number,
): number =>
  Math.max(
    LIGHT_TO_UNIT(light.skylight[light.paddedIndex(x, y, z)]),
    LIGHT_TO_UNIT(light.blocklight[light.paddedIndex(x, y, z)]),
  );

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
 * The one smooth-lighting pass in this file: the four per-vertex brightness
 * values (0..1) of one exposed face, in `FACE_CORNERS` vertex order. Each
 * vertex samples the 2x2 voxel patch just outside the face along its normal
 * for light, and the three neighbours wrapping its corner (two sides and the
 * diagonal), also just outside the face, for ambient occlusion; multiplying
 * the two shades the face with smooth gradients and dark niches. Sampling the
 * occluders on the air side keeps a level surface bright across its whole
 * top — a same-height neighbour does not shade a coplanar corner — while a
 * neighbour that rises above it does. The sphere is voxel-centred — tangents
 * and normal stretch one voxel — so a seam face reads its neighbour's light
 * and occluders from the block's own generated border, exactly as it reads
 * its voxel.
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
): number[] | null => {
  if (light === null) {
    return null;
  }
  const [a1, a2] = TANGENT_AXES[axis];
  const nax = [0, 0, 0] as [number, number, number];
  nax[axis] = sign;
  const brightness: number[] = [];
  for (const corner of FACE_CORNERS[axis]) {
    const c1 = corner[a1];
    const c2 = corner[a2];
    let lit = 0;
    for (const r of [c1, c1 - 1]) {
      for (const s of [c2, c2 - 1]) {
        const at = [x, y, z] as [number, number, number];
        at[a1] += r;
        at[a2] += s;
        at[axis] += sign;
        lit = Math.max(lit, cellLight(light, at[0], at[1], at[2]));
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
    brightness.push(lit * ((3 - occluded) / 3));
  }
  return brightness;
};

/**
 * Used until the atlas loads (or for voxel ids with no tile config): a
 * full texel rect so faces still map to something sane.
 */
const DEFAULT_RECT: TileRect = [0, 0, 1, 1];

/** The accumulators a mesh build writes into, shared by every face emitter. */
interface QuadContext {
  store: VoxelStore;
  light: LightStore | null;
  positions: number[];
  normals: number[];
  uvs: number[];
  brightness: number[];
  indices: number[];
}

const emptyQuadContext = (
  store: VoxelStore,
  light: LightStore | null,
): QuadContext => ({
  store,
  light,
  positions: [],
  normals: [],
  uvs: [],
  brightness: [],
  indices: [],
});

const finishQuad = (
  ctx: QuadContext,
  base: number,
  axis: number,
  sign: number,
): void => {
  if (windsOutward(axis, sign)) {
    ctx.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  } else {
    ctx.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
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
  rect: TileRect,
  x: number,
  y: number,
  z: number,
): void => {
  const { store, light } = ctx;
  const scale = store.scale;
  const h = scale / 2;
  const base = ctx.positions.length / 3;
  const corners = FACE_CORNERS[axis];
  const cornerLight = faceBrightness(store, light, x, y, z, axis, sign);
  for (let k = 0; k < corners.length; k++) {
    const [xo, yo, zo, u, v] = corners[k];
    ctx.positions.push(
      axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
      axis === 1 ? wy + sign * h : wy + (yo - 0.5) * 2 * h,
      axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
    );
    ctx.normals.push(
      axis === 0 ? sign : 0,
      axis === 1 ? sign : 0,
      axis === 2 ? sign : 0,
    );
    ctx.uvs.push(
      rect[0] + u * (rect[2] - rect[0]),
      rect[1] + v * (rect[3] - rect[1]),
    );
    ctx.brightness.push(cornerLight === null ? 1 : cornerLight[k]);
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
  rect: TileRect,
  x: number,
  y: number,
  z: number,
  bottomFraction: number,
  topFraction: number,
): void => {
  const { store, light } = ctx;
  const scale = store.scale;
  const h = scale / 2;
  const base = ctx.positions.length / 3;
  const corners = FACE_CORNERS[axis];
  const cornerLight = faceBrightness(store, light, x, y, z, axis, sign);
  const yAt = (fraction: number): number => wy - h + fraction * scale;
  for (let k = 0; k < corners.length; k++) {
    const [xo, yo, zo, u, v] = corners[k];
    // Top/bottom faces (axis 1) sit at the plane the face asks for; a corner
    // that lies on the top edge of a side face gets `topFraction`, the bottom
    // edge `bottomFraction`.
    const fy = axis === 1 ? topFraction : yo === 1 ? topFraction : bottomFraction;
    ctx.positions.push(
      axis === 0 ? wx + sign * h : wx + (xo - 0.5) * 2 * h,
      yAt(fy),
      axis === 2 ? wz + sign * h : wz + (zo - 0.5) * 2 * h,
    );
    ctx.normals.push(
      axis === 0 ? sign : 0,
      axis === 1 ? sign : 0,
      axis === 2 ? sign : 0,
    );
    ctx.uvs.push(
      rect[0] + u * (rect[2] - rect[0]),
      rect[1] + v * (rect[3] - rect[1]),
    );
    ctx.brightness.push(cornerLight === null ? 1 : cornerLight[k]);
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
 * only where open air sits below. `kindRect`, when given, supplies the tile a
 * textured fluid (lava) bakes into the face; water passes `null` and leaves
 * UVs on the full atlas, which its material never reads.
 */
const emitLiquidVoxel = (
  ctx: QuadContext,
  x: number,
  y: number,
  z: number,
  kindRect: ((id: number) => TileRect) | null,
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
  const rect = kindRect === null ? DEFAULT_RECT : kindRect(id);

  if (above === VOXEL_AIR) {
    emitFluidFace(ctx, wx, wy, wz, 1, 1, rect, x, y, z, topFrac, topFrac);
  }
  if (below === VOXEL_AIR) {
    emitFluidFace(ctx, wx, wy, wz, 1, -1, rect, x, y, z, 0, 0);
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
    emitFluidFace(ctx, wx, wy, wz, axis, sign, rect, x, y, z, nTop, topFrac);
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
): MeshArrays => {
  const ctx = emptyQuadContext(store, light);
  const [nx, ny, nz] = store.voxels;
  const scale = store.scale;
  const tiles = new Map<number, VoxelTileConfig>();
  for (const t of voxelTiles) {
    tiles.set(t.id, t);
  }
  const rectOf = (id: number): TileRect => {
    const tile = tiles.get(id);
    return tile?.side ?? DEFAULT_RECT;
  };
  const at = (x: number, y: number, z: number): number =>
    store.atPadded(x, y, z);

  for (let z = 0; z < nz; ++z) {
    for (let y = 0; y < ny; ++y) {
      for (let x = 0; x < nx; ++x) {
        const id = at(x, y, z);
        if (id === VOXEL_AIR || isWaterId(id)) {
          continue;
        }
        if (isLavaId(id)) {
          emitLiquidVoxel(ctx, x, y, z, rectOf);
          continue;
        }
        const below = at(x, y - 1, z);
        const above = at(x, y + 1, z);
        const left = at(x - 1, y, z);
        const right = at(x + 1, y, z);
        const front = at(x, y, z - 1);
        const back = at(x, y, z + 1);
        const exposedTop = openToFace(above);
        const exposedBottom = openToFace(below);
        const exposedLeft = openToFace(left);
        const exposedRight = openToFace(right);
        const exposedFront = openToFace(front);
        const exposedBack = openToFace(back);
        if (
          !exposedTop &&
          !exposedBottom &&
          !exposedLeft &&
          !exposedRight &&
          !exposedFront &&
          !exposedBack
        ) {
          continue;
        }
        const wx = (x + 0.5 - nx / 2) * scale;
        const wy = (y + 0.5 - ny / 2) * scale;
        const wz = (z + 0.5 - nz / 2) * scale;
        const tile = tiles.get(id);
        const top = tile?.top ?? DEFAULT_RECT;
        const side = tile?.side ?? DEFAULT_RECT;
        const bottom = tile?.bottom ?? DEFAULT_RECT;
        if (exposedTop) emitCubeFace(ctx, wx, wy, wz, 1, 1, top, x, y, z);
        if (exposedBottom)
          emitCubeFace(ctx, wx, wy, wz, 1, -1, bottom, x, y, z);
        if (exposedLeft) emitCubeFace(ctx, wx, wy, wz, 0, -1, side, x, y, z);
        if (exposedRight) emitCubeFace(ctx, wx, wy, wz, 0, 1, side, x, y, z);
        if (exposedFront) emitCubeFace(ctx, wx, wy, wz, 2, -1, side, x, y, z);
        if (exposedBack) emitCubeFace(ctx, wx, wy, wz, 2, 1, side, x, y, z);
      }
    }
  }

  return {
    positions: ctx.positions,
    normals: ctx.normals,
    uvs: ctx.uvs,
    brightness: ctx.brightness,
    indices: ctx.indices,
  };
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
): MeshArrays => {
  const ctx = emptyQuadContext(store, light);
  const [nx, ny, nz] = store.voxels;

  // A store whose fill reported no water voxel cannot expose a water face, and
  // sweeping a full volume to prove it is the point of this flag.
  if (!store.hasWater) {
    return {
      positions: ctx.positions,
      normals: ctx.normals,
      uvs: ctx.uvs,
      brightness: ctx.brightness,
      indices: ctx.indices,
    };
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

  return {
    positions: ctx.positions,
    normals: ctx.normals,
    uvs: ctx.uvs,
    brightness: ctx.brightness,
    indices: ctx.indices,
  };
};

/**
 * Applies `mesh`'s arrays to an existing geometry *in place*, replacing
 * its attributes while keeping the geometry object identity stable. The
 * renderer keys its GPU-buffer cache by geometry object, so re-uploading
 * into the same geometry reuses the buffers it already allocated (the new
 * attributes carry `needsUpdate`, which makes the next draw refresh their
 * data). Replacing `mesh.geometry` with a fresh geometry instead would
 * orphan the old entry in that cache and leak its GPU buffers on every
 * rebuild.
 */
export const setGeometryData = (
  geometry: BufferGeometry,
  mesh: MeshArrays,
): void => {
  const toF32 = (a: number[] | Float32Array): Float32Array =>
    a instanceof Float32Array ? a : new Float32Array(a);
  const attr = (
    name: string,
    array: number[] | Float32Array,
    itemSize: number,
  ): void => {
    const a = new BufferAttribute(toF32(array), itemSize);
    a.needsUpdate = true;
    geometry.setAttribute(name, a);
  };
  attr("position", mesh.positions, 3);
  attr("normal", mesh.normals, 3);
  if (mesh.uvs.length > 0) {
    attr("uv", mesh.uvs, 2);
  } else {
    geometry.deleteAttribute("uv");
  }
  // The per-vertex brightness mults the surface colour; a material that does
  // not reference it (the probe, the picker) simply never binds it.
  attr("brightness", mesh.brightness, 1);
  // wrap as a BufferAttribute so `setIndex` keeps the Uint32 type without
  // rescanning the array for the 16-bit cutoff
  const idx =
    mesh.indices instanceof Uint32Array
      ? mesh.indices
      : new Uint32Array(mesh.indices);
  geometry.setIndex(new BufferAttribute(idx, 1));
};

/**
 * Applies the per-vertex probe colours (three floats per vertex, one 0..1
 * channel each) to a geometry already uploaded with `setGeometryData`. The
 * occlusion-culled probe material reads the `occlusionColor` attribute; a
 * material that does not reference it — every other material in the world —
 * never has it bound.
 */
export const setOcclusionColors = (
  geometry: BufferGeometry,
  colors: number[] | Float32Array,
): void => {
  const attr = new BufferAttribute(
    colors instanceof Float32Array ? colors : new Float32Array(colors),
    3,
  );
  attr.needsUpdate = true;
  geometry.setAttribute("occlusionColor", attr);
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
  id: number;
  voxels: [number, number, number];
  scale: number;
  data: Uint8Array;
  /** Whether `data` holds any water voxel; an empty water sweep when false. */
  hasWater: boolean;
  /** The block's sky light, one byte per padded voxel, matching `data`. */
  skyLight: Uint8Array;
  /** The block's block light, one byte per padded voxel, matching `data`. */
  blockLight: Uint8Array;
  tileRects: VoxelTileConfig[];
}

export interface MeshBuildResult {
  id: number;
  terrain: MeshArrays;
  water: MeshArrays;
  /** The voxel buffer the worker read, echoed back so the caller can reuse it. */
  data: Uint8Array;
  /** The sky light channel the worker read, echoed back for reuse. */
  skyLight: Uint8Array;
  /** The block light channel the worker read, echoed back for reuse. */
  blockLight: Uint8Array;
}
