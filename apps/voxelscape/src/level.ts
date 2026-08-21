import { bool, Break, builtinFragDepth, float, For, If, int, ivec3, max, min, uvec3, uvec4, vec2, vec3, vec4 } from "@random-mesh/rmsl";
import type { Node } from "@random-mesh/rmsl";
import { Builder, DataTexture, NodeMaterial, RedIntegerFormat, Scene, UnsignedByteType } from "@random-mesh/rmsl/scene";
import type { UniformNode } from "@random-mesh/rmsl";

export type Dim3 = [number, number, number];

// A block is a rectangular-prism volume of voxels. A full-res block is
// 512 x 256 x 512 world units at 1-unit voxels; each LOD level doubles the
// voxel size (halves the voxel count per axis).
export const CHUNK_DIM = 16;
export const BLOCK_WORLD: Dim3 = [512, 256, 512];

// per-LOD chunk slots in storage: LOD0 [16,8,16] = 2048 slots, etc.
const LOD_STORAGE_SLOTS: Dim3[] = [
  [16, 8, 16],
  [10, 5, 10],
  [6, 3, 6],
];

export const blockConfig = (lod: number): {
  voxels: Dim3,
  broadDim: Dim3,
  chunkDim: Dim3,
  storageDim: Dim3,
  dimensions: Dim3,
} => {
  const scale = 1 << lod;
  const voxels: Dim3 = [BLOCK_WORLD[0] / scale, BLOCK_WORLD[1] / scale, BLOCK_WORLD[2] / scale];
  const broadDim: Dim3 = [voxels[0] / CHUNK_DIM, voxels[1] / CHUNK_DIM, voxels[2] / CHUNK_DIM];
  const slots = LOD_STORAGE_SLOTS[Math.min(lod, LOD_STORAGE_SLOTS.length - 1)];
  const storageDim: Dim3 = [slots[0] * CHUNK_DIM, slots[1] * CHUNK_DIM, slots[2] * CHUNK_DIM];
  const chunkDim: Dim3 = [CHUNK_DIM, CHUNK_DIM, CHUNK_DIM];
  return { voxels, broadDim, chunkDim, storageDim, dimensions: BLOCK_WORLD };
};

export class Level {
  // broad cell r === 0 -> empty space; r === 1 -> non-empty space
  broadData: Uint8Array;
  broadTexture: DataTexture;
  broadDim: Dim3;
  // the size of each of the chunks in a broad cell, per axis
  chunkDim: Dim3;
  // the size of the storage, per axis
  storageDim: Dim3;
  storageCount: Dim3;
  data: Uint8Array;
  texture: DataTexture;
  //
  nextStorage: Dim3 = [0, 0, 0];
  // number of chunk slots handed out (for the storage-overflow guard)
  allocCount: number = 0;
  warnedStorageOverflow: boolean = false;
  freeSpots: {
    storageXIdx: number,
    storageYIdx: number,
    storageZIdx: number,
  }[] = [];
  // world-unit extents of the volume; a rectangular prism, not necessarily a cube
  dimensions: Dim3;

  allocChunk(out: { x: number, y: number, z: number, }) {
    {
      let freeSpot = this.freeSpots.pop();
      if (freeSpot !== undefined) {
        out.x = freeSpot.storageXIdx;
        out.y = freeSpot.storageYIdx;
        out.z = freeSpot.storageZIdx;
        return;
      }
    }
    this.allocCount++;
    const capacity = this.storageCount[0] * this.storageCount[1] * this.storageCount[2];
    if (this.allocCount > capacity && !this.warnedStorageOverflow) {
      this.warnedStorageOverflow = true;
      console.warn(
        `[Level] storage exhausted: ${this.allocCount} chunks requested, storage holds ${capacity}`,
      );
    }
    out.x = this.nextStorage[0];
    out.y = this.nextStorage[1];
    out.z = this.nextStorage[2];
    this.nextStorage[0]++;
    if (this.nextStorage[0] === this.storageCount[0]) {
      this.nextStorage[0] = 0;
      this.nextStorage[1]++;
      if (this.nextStorage[1] === this.storageCount[1]) {
        this.nextStorage[1] = 0;
        this.nextStorage[2]++;
      }
    }
  }

  _set_chunk: { x: number, y: number, z: number, } = { x: 0, y: 0, z: 0, };
  set(x: number, y: number, z: number, val: number) {
    const bd = this.broadDim;
    const cd = this.chunkDim;
    const sd = this.storageDim;
    let broadXIdx = Math.floor(x / cd[0]);
    let broadYIdx = Math.floor(y / cd[1]);
    let broadZIdx = Math.floor(z / cd[2]);
    let broadIdx = (
        broadZIdx * bd[1] * bd[0]
        + broadYIdx * bd[0]
        + broadXIdx
      ) << 2;
    let broadCell = this.broadData[broadIdx];
    let chunkXIdx: number;
    let chunkYIdx: number;
    let chunkZIdx: number;
    if (broadCell === 0) {
      this.allocChunk(this._set_chunk);
      chunkXIdx = this._set_chunk.x;
      chunkYIdx = this._set_chunk.y;
      chunkZIdx = this._set_chunk.z;
      this.broadData[broadIdx + 0] = 1;
      this.broadData[broadIdx + 1] = chunkXIdx;
      this.broadData[broadIdx + 2] = chunkYIdx;
      this.broadData[broadIdx + 3] = chunkZIdx;
    } else {
      chunkXIdx = this.broadData[broadIdx + 1];
      chunkYIdx = this.broadData[broadIdx + 2];
      chunkZIdx = this.broadData[broadIdx + 3];
    }
    let fineXIdx = chunkXIdx * cd[0] + (x - broadXIdx * cd[0]);
    let fineYIdx = chunkYIdx * cd[1] + (y - broadYIdx * cd[1]);
    let fineZIdx = chunkZIdx * cd[2] + (z - broadZIdx * cd[2]);
    let idx = (
        fineZIdx * sd[1] * sd[0]
        + fineYIdx * sd[0]
        + fineXIdx
      );
    this.data[idx] = val;
  }

  constructor(params?: {
    broadDim?: Dim3,
    chunkDim?: Dim3,
    storageDim?: Dim3,
    dimensions?: Dim3,
  }) {
    const def = blockConfig(0);
    const { broadDim, chunkDim, storageDim, dimensions } = params ?? {};
    const bd = broadDim ?? def.broadDim;
    const cd = chunkDim ?? def.chunkDim;
    const sd = storageDim ?? def.storageDim;
    this.broadDim = bd;
    this.chunkDim = cd;
    this.storageDim = sd;
    this.storageCount = [
      Math.floor(sd[0] / cd[0]),
      Math.floor(sd[1] / cd[1]),
      Math.floor(sd[2] / cd[2]),
    ];
    this.dimensions = dimensions ?? [bd[0] * cd[0], bd[1] * cd[1], bd[2] * cd[2]];
    this.broadData = new Uint8Array(bd[0] * bd[1] * bd[2] * 4);
    this.broadTexture = new DataTexture(this.broadData, bd[0], bd[1], bd[2]);
    this.data = new Uint8Array(sd[0] * sd[1] * sd[2]);
    this.texture = new DataTexture(this.data, sd[0], sd[1], sd[2], RedIntegerFormat, UnsignedByteType);
  }
}

// Builds one block of the shared height field, sampled at the block's absolute
// world xz (so neighbouring blocks meet seamlessly) at `1 << lod` resolution.
export const buildBlock = (params: {
  center: Dim3,
  lod?: number,
}): Level => {
  const lod = params.lod ?? 0;
  const scale = 1 << lod;
  const { voxels, broadDim, chunkDim, storageDim, dimensions } = blockConfig(lod);
  const level = new Level({ broadDim, chunkDim, storageDim, dimensions });
  for (let vz = 0; vz < voxels[2]; ++vz) {
    for (let vx = 0; vx < voxels[0]; ++vx) {
      const worldX = params.center[0] + (vx + 0.5 - voxels[0] / 2) * scale;
      const worldZ = params.center[2] + (vz + 0.5 - voxels[2] / 2) * scale;
      const height = 50 * Math.cos(worldX * 0.01) * Math.cos(worldZ * 0.01);
      let vy = Math.round(voxels[1] / 2 + height / scale);
      vy = Math.max(0, Math.min(voxels[1] - 1, vy));
      level.set(vx, vy, vz, 1);
    }
  }
  return level;
};

const minVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> => min(a, b);
const maxVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> => max(a, b);
const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> => min(a, b);
const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> => max(a, b);

const inRegion = (minIdx: Node<"uvec3">, maxIdx: Node<"uvec3">, cell: Node<"ivec3">): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(minIdx.toVec3())
    .all()
    .and(c.lessThanEqual(maxIdx.toVec3()).all());
};

const inPaddedRegion = (minIdx: Node<"uvec3">, maxIdx: Node<"uvec3">, cell: Node<"ivec3">): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(minIdx.toVec3().sub(vec3(1)))
    .all()
    .and(c.lessThanEqual(maxIdx.toVec3().add(vec3(1))).all());
};

const intersectBox = (params: {
  rayOrigin: Node<"vec3">,
  rayDirection: Node<"vec3">,
  boxMin: Node<"vec3">,
  boxMax: Node<"vec3">,
}): {
  entryDistance: Node<"float">,
  exitDistance: Node<"float">,
  nearPlaneDistances: Node<"vec3">,
} => {
  let { rayOrigin, rayDirection, boxMin, boxMax } = params;
  const inverseRayDirection = vec3(1.0).div(rayDirection).toVar();
  const distanceToMinPlanes = inverseRayDirection.mul(boxMin.sub(rayOrigin)).toVar();
  const distanceToMaxPlanes = inverseRayDirection.mul(boxMax.sub(rayOrigin)).toVar();
  const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes);
  const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes);
  const nearPair = maxVec2(
    vec2(nearPlaneDistances.x, nearPlaneDistances.x),
    nearPlaneDistances.yz,
  ).toVar();
  const entryDistance = nearPair.x.max(nearPair.y).toVar();
  const farPair = minVec2(
    vec2(farPlaneDistances.x, farPlaneDistances.x),
    farPlaneDistances.yz,
  ).toVar();
  const exitDistance = farPair.x.min(farPair.y).toVar();
  return { entryDistance, exitDistance, nearPlaneDistances };
};

export let rayMarch = (params: {
  rayOrigin: Node<"vec3">,
  rayDirection: Node<"vec3">,
  dimensions: Node<"vec3">,
  voxelCount: Node<"vec3">,
  uVoxels: Node<"usampler3D">,
  marchMin?: Node<"uvec3">,
  marchMax?: Node<"uvec3">,
  texelOffset?: Node<"vec3">,
  fetchCount?: Node<"int">,
}): {
  hit: Node<"bool">,
  voxel: Node<"uvec4">,
  voxelPos: Node<"ivec3">,
  normal: Node<"vec3">,
  hitPoint: Node<"vec3">,
} => {
  let { rayOrigin, rayDirection, dimensions, voxelCount, uVoxels, marchMin, marchMax, texelOffset, fetchCount } = params;

  const texelShift = (texelOffset ?? vec3(0)).toVar();
  const fetchCell = (cell: Node<"ivec3">): Node<"uvec4"> =>
    uVoxels.texture(cell.toVec3().add(texelShift).toUVec3());
  // debug-only: count every fine-texel fetch (build-time no-op when unused)
  const countFetch = (): void => {
    if (fetchCount !== undefined) {
      fetchCount.assign(fetchCount.add(1));
    }
  };

  const cellSize = dimensions.div(voxelCount).toVar();
  const minIdx = (marchMin ?? uvec3(0)).toVar();
  const maxIdx = (marchMax ?? voxelCount.sub(vec3(float(1))).toUVec3()).toVar();
  const boxMin = dimensions
    .mul(float(-0.5))
    .add(minIdx.toVec3().mul(cellSize))
    .sub(cellSize)
    .toVar();
  const boxMax = dimensions
    .mul(float(-0.5))
    .add(maxIdx.toVec3().add(vec3(1)).mul(cellSize))
    .add(cellSize)
    .toVar();

  const hit = bool(false).toVar();
  const voxel = uvec4().toVar();
  const voxelPos = ivec3(0).toVar();
  const normal = vec3(0).toVar();
  const hitPoint = vec3(0).toVar();

  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });

  If(entryDistance.lessThanEqual(exitDistance), () => {
    const cellDir = rayDirection.div(cellSize).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryDistance)).toVar();
    const cellOrigin = entryPoint
      .add(dimensions.mul(float(0.5)))
      .div(cellSize)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0)
      .div(cellDir.abs().max(1e-6))
      .toVar();
    const sideDist = rayStep
      .toVec3()
      .mul(mapPos.toVec3().sub(cellOrigin))
      .add(rayStep.toVec3().mul(float(0.5)).add(float(0.5)))
      .mul(deltaDist)
      .toVar();

    const mask = vec3(float(0)).toVar();

    If(nearPlaneDistances.x.equal(entryDistance), () => {
      mask.assign(vec3(float(1), float(0), float(0)));
    })
      .ElseIf(nearPlaneDistances.y.equal(entryDistance), () => {
        mask.assign(vec3(float(0), float(1), float(0)));
      })
      .Else(() => {
        mask.assign(vec3(float(0), float(0), float(1)));
      });

    const maxSteps = voxelCount.x
      .max(voxelCount.y)
      .max(voxelCount.z)
      .mul(float(3))
      .add(float(8))
      .toInt();

    For(
      () => int(0).toVar(),
      i => i.lessThan(maxSteps),
      i => i.assign(i.add(1)),
      () => {
        If(inPaddedRegion(minIdx, maxIdx, mapPos).not(), () => {
          Break();
        });
        If(inRegion(minIdx, maxIdx, mapPos), () => {
          countFetch();
          const cellValue = fetchCell(mapPos).toVar();
          If(cellValue.r.notEqual(0), () => {
            hit.assign(bool(true));
            Break();
          });
        });
        mask.assign(
          sideDist
            .lessThanEqual(
              vec3(
                sideDist.y.min(sideDist.z),
                sideDist.z.min(sideDist.x),
                sideDist.x.min(sideDist.y),
              ),
            )
            .toVec3(),
        );
        sideDist.assign(sideDist.add(mask.mul(deltaDist)));
        mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
      },
    );
    If(hit, () => {
      voxelPos.assign(mapPos);
      countFetch();
      voxel.assign(fetchCell(mapPos));
      normal.assign(mask.mul(rayStep.toVec3()).negate());

      const hitDistance = float(0).toVar();
      If(mask.x.notEqual(float(0)), () => {
        hitDistance.assign(
          entryDistance.add(
            rayStep.x
              .greaterThan(0)
              .select(mapPos.x, mapPos.x.add(1))
              .toFloat()
              .sub(cellOrigin.x)
              .mul(rayStep.x.toFloat())
              .mul(deltaDist.x),
          ),
        );
      })
        .ElseIf(mask.y.notEqual(float(0)), () => {
          hitDistance.assign(
            entryDistance.add(
              rayStep.y
                .greaterThan(0)
                .select(mapPos.y, mapPos.y.add(1))
                .toFloat()
                .sub(cellOrigin.y)
                .mul(rayStep.y.toFloat())
                .mul(deltaDist.y),
            ),
          );
        })
        .Else(() => {
          hitDistance.assign(
            entryDistance.add(
              rayStep.z
                .greaterThan(0)
                .select(mapPos.z, mapPos.z.add(1))
                .toFloat()
                .sub(cellOrigin.z)
                .mul(rayStep.z.toFloat())
                .mul(deltaDist.z),
            ),
          );
        });
      hitPoint.assign(rayOrigin.add(rayDirection.mul(hitDistance)));
    });
  });

  return {
    hit,
    voxel,
    voxelPos,
    normal,
    hitPoint,
  };
};

// Marches one block's volume (broad grid then fine chunks). The ray is given in
// the block's local space, where the volume is centered at the origin. Returns
// results without shading; `hitPoint` is local (add the block center for world).
export let marchBlock = (params: {
  rayOrigin: Node<"vec3">,
  rayDirection: Node<"vec3">,
  dimensions: Node<"vec3">,
  broadVoxels: Node<"usampler3D">,
  broadDim: Node<"vec3">,
  chunkDim: Node<"vec3">,
  fineVoxels: Node<"usampler3D">,
  fetchCount?: Node<"int">,
}): {
  hit: Node<"bool">,
  normal: Node<"vec3">,
  hitPoint: Node<"vec3">,
} => {
  let { rayOrigin, rayDirection, dimensions, broadVoxels, broadDim, chunkDim, fineVoxels, fetchCount } = params;

  const volumeDimensions = dimensions.toVar();
  const virtualDim = broadDim.mul(chunkDim).toVar();
  const cellSizeBroad = volumeDimensions.div(broadDim).toVar();
  const chunkDimU = chunkDim.toUint();

  const hit = bool(false).toVar();
  const normal = vec3(0).toVar();
  const hitPoint = vec3(0).toVar();

  const boxMin = volumeDimensions.mul(float(-0.5)).sub(cellSizeBroad).toVar();
  const boxMax = volumeDimensions.mul(float(0.5)).add(cellSizeBroad).toVar();
  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });

  If(entryDistance.lessThanEqual(exitDistance), () => {
    const cellDir = rayDirection.div(cellSizeBroad).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryDistance)).toVar();
    const cellOrigin = entryPoint
      .add(volumeDimensions.mul(float(0.5)))
      .div(cellSizeBroad)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0)
      .div(cellDir.abs().max(1e-6))
      .toVar();
    const sideDist = rayStep
      .toVec3()
      .mul(mapPos.toVec3().sub(cellOrigin))
      .add(rayStep.toVec3().mul(float(0.5)).add(float(0.5)))
      .mul(deltaDist)
      .toVar();

    const mask = vec3(float(0)).toVar();

    If(nearPlaneDistances.x.equal(entryDistance), () => {
      mask.assign(vec3(float(1), float(0), float(0)));
    })
      .ElseIf(nearPlaneDistances.y.equal(entryDistance), () => {
        mask.assign(vec3(float(0), float(1), float(0)));
      })
      .Else(() => {
        mask.assign(vec3(float(0), float(0), float(1)));
      });

    const maxSteps = broadDim.x
      .max(broadDim.y)
      .max(broadDim.z)
      .mul(float(3))
      .add(float(8))
      .toInt();
    const broadCount = broadDim.toVar();

    For(
      () => int(0).toVar(),
      i => i.lessThan(maxSteps),
      i => i.assign(i.add(1)),
      () => {
        If(
          mapPos
            .toVec3()
            .greaterThanEqual(vec3(float(-2)))
            .all()
            .and(mapPos.toVec3().lessThan(broadCount.add(vec3(float(2)))).all())
            .not(),
          () => {
            Break();
          },
        );
        If(
          mapPos
            .toVec3()
            .greaterThanEqual(vec3(float(0)))
            .all()
            .and(mapPos.toVec3().lessThan(broadCount).all()),
          () => {
            const broadCell = broadVoxels.texture(mapPos.toUVec3()).toVar();
            If(broadCell.r.notEqual(0), () => {
              const virtualChunkMin = mapPos.toUVec3().mul(chunkDimU);
              const storageChunkMin = broadCell.yzw.mul(chunkDimU);
              const texelOffset = storageChunkMin.toVec3().sub(virtualChunkMin.toVec3());
              const fine = rayMarch({
                rayOrigin,
                rayDirection,
                dimensions,
                voxelCount: virtualDim,
                uVoxels: fineVoxels,
                marchMin: virtualChunkMin,
                marchMax: virtualChunkMin.add(chunkDimU).sub(uvec3(1)),
                texelOffset,
                fetchCount,
              });
              If(fine.hit, () => {
                hit.assign(bool(true));
                normal.assign(fine.normal);
                hitPoint.assign(fine.hitPoint);
                Break();
              });
            });
          },
        );
        mask.assign(
          sideDist
            .lessThanEqual(
              vec3(
                sideDist.y.min(sideDist.z),
                sideDist.z.min(sideDist.x),
                sideDist.x.min(sideDist.y),
              ),
            )
            .toVec3(),
        );
        sideDist.assign(sideDist.add(mask.mul(deltaDist)));
        mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
      },
    );
  });

  return { hit, normal, hitPoint };
};

export interface WorldBlockShader {
  center: Node<"vec3">,
  dimensions: Node<"vec3">,
  broadVoxels: Node<"usampler3D">,
  broadDim: Node<"vec3">,
  chunkDim: Node<"vec3">,
  fineVoxels: Node<"usampler3D">,
}

// Marches a world of stacked blocks: AABB-test every block, run the fine march
// on each one the ray enters (cheap, since block broad grids skip empty space)
// and keep the nearest hit. Shading is applied once at the end.
export let rayMarchWorld = (params: {
  rayOrigin: Node<"vec3">,
  rayDirection: Node<"vec3">,
  blocks: WorldBlockShader[],
  outColour: Node<"vec4">,
  outHitPoint: Node<"vec3">,
  fetchCount?: Node<"int">,
}): void => {
  const ambientColour = vec3(0.2).toVar();
  const lightColour = vec3(1.0).toVar();
  const lightDir = vec3(1.0, 2.0, 1.0).normalize().toVar();
  let { rayOrigin, rayDirection, blocks, outColour, outHitPoint, fetchCount } = params;
  const N = blocks.length;

  const hit = bool(false).toVar();
  const normal = vec3(0).toVar();
  const hitPoint = vec3(0).toVar();
  const bestDist = float(1e30).toVar();

  const entries: Node<"float">[] = [];
  const exits: Node<"float">[] = [];
  for (let i = 0; i < N; i++) {
    const half = blocks[i].dimensions.mul(float(0.5));
    const pad = blocks[i].dimensions.div(blocks[i].broadDim);
    const boxMin = blocks[i].center.sub(half).sub(pad);
    const boxMax = blocks[i].center.add(half).add(pad);
    const { entryDistance, exitDistance } = intersectBox({
      rayOrigin,
      rayDirection,
      boxMin,
      boxMax,
    });
    entries.push(entryDistance);
    exits.push(exitDistance);
  }

  for (let i = 0; i < N; i++) {
    If(entries[i].lessThanEqual(exits[i]), () => {
      const center = blocks[i].center;
      const localOrigin = rayOrigin.sub(center).toVar();
      const r = marchBlock({
        rayOrigin: localOrigin,
        rayDirection,
        dimensions: blocks[i].dimensions,
        broadVoxels: blocks[i].broadVoxels,
        broadDim: blocks[i].broadDim,
        chunkDim: blocks[i].chunkDim,
        fineVoxels: blocks[i].fineVoxels,
        fetchCount,
      });
      const dist = r.hitPoint.sub(localOrigin).length().toVar();
      If(r.hit.and(dist.lessThan(bestDist)), () => {
        bestDist.assign(dist);
        hit.assign(bool(true));
        normal.assign(r.normal);
        hitPoint.assign(r.hitPoint.add(center));
      });
    });
  }

  If(hit, () => {
    const diffuse = normal.dot(lightDir).max(float(0));
    outColour.rgb.assign(
      vec3(0.0, 0.0, 1.0).mul(
        ambientColour.add(lightColour.mul(diffuse)),
      ),
    );
    outColour.a.assign(float(1));
    outHitPoint.assign(hitPoint);
  });
};

export interface WorldBlock {
  level: Level,
  center: Dim3,
}

export class LevelWorldMaterial extends NodeMaterial {
  blocks: WorldBlock[] = [];
  // debug: output a fetch-count heatmap (RG = 16-bit fine-texel fetches,
  // A = 1 when the ray entered at least one chunk) instead of the shaded scene.
  debugFetchCount: boolean = false;

  private blockUniforms: WorldBlockShader[] = [];

  constructor() {
    super();
  }

  setBlocks(blocks: WorldBlock[]): void {
    this.blocks = blocks;
    this.blockUniforms = [];
  }

  protected setup(b: Builder, _scene: Scene): void {
    if (this.blocks.length === 0) {
      return;
    }
    for (let i = 0; i < this.blocks.length; i++) {
      const level = this.blocks[i].level;
      const prefix = `b${i}_`;
      this.blockUniforms.push({
        center: b.materialUniform(prefix + "center", "vec3", () => this.blocks[i].center),
        dimensions: b.materialUniform(prefix + "dimensions", "vec3", () => level.dimensions),
        broadVoxels: b.sampler(prefix + "broadVoxels", "usampler3D", () => level.broadTexture),
        broadDim: b.materialUniform(prefix + "broadDim", "vec3", () => level.broadDim),
        chunkDim: b.materialUniform(prefix + "chunkDim", "vec3", () => level.chunkDim),
        fineVoxels: b.sampler(prefix + "fineVoxels", "usampler3D", () => level.texture),
      });
    }
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    b.varying("vModelPos", "vec3").assign(position);
    return b.projectionMatrix.mul(b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, 1.0))));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    if (this.blocks.length === 0 || this.blockUniforms.length !== this.blocks.length) {
      return vec4(0.0);
    }
    const vModelPos = b.varying("vModelPos", "vec3");
    const rayOrigin = b.normalMatrix.mul(b.cameraPosition);
    const rayDirection = vModelPos.sub(rayOrigin).normalize();

    const colour = vec4(0).toVar();
    const hitPoint = vec3(0).toVar();
    const fetchCount = this.debugFetchCount ? int(0).toVar() : undefined;

    rayMarchWorld({
      rayOrigin,
      rayDirection,
      blocks: this.blockUniforms,
      outColour: colour,
      outHitPoint: hitPoint,
      fetchCount,
    });

    if (this.debugFetchCount && fetchCount !== undefined) {
      const hasFetches = fetchCount.greaterThan(0);
      colour.rgb.assign(
        vec3(
          float(fetchCount.mod(256)),
          float(fetchCount.div(256)),
          float(0),
        ),
      );
      colour.a.assign(hasFetches.select(float(1), float(0)));
    }

    const fragDepth = builtinFragDepth();
    If(colour.a.greaterThan(float(0.5)), () => {
      const clip = b.projectionMatrix.mul(
        b.viewMatrix.mul(b.modelMatrix.mul(vec4(hitPoint, float(1)))),
      );
      const ndcZ = clip.z.div(clip.w);
      const depth = ndcZ.mul(float(0.5)).add(float(0.5));
      fragDepth.assign(depth.max(float(0.0)).min(float(0.9999)));
    }).Else(() => {
      fragDepth.assign(float(1));
    });

    return colour;
  }
}
