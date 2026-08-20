import { bool, Break, builtinFragDepth, float, For, If, int, ivec3, max, min, uvec3, uvec4, vec2, vec3, vec4 } from "@random-mesh/rmsl";
import type { Node } from "@random-mesh/rmsl";
import { Builder, DataTexture, NodeMaterial, RedIntegerFormat, Scene, UnsignedByteType, Vector3 } from "@random-mesh/rmsl/scene";
import type { UniformNode } from "@random-mesh/rmsl";

export const BROAD_DIM = 32;
export const CHUNK_DIM = 32;
export const VIRTUAL_DIM = BROAD_DIM * CHUNK_DIM;
export const STORAGE_DIM = 512;

export class Level {
  // r === 0 -> empty space; r === 1 -> non-empty space
  broadData: Uint8Array;
  broadTexture: DataTexture;
  broadDim: number;
  // the size of each of the chunks in a broad cell
  chunkDim: number;
  // the size of the storage
  storageDim: number;
  storageCount: number;
  data: Uint8Array;
  texture: DataTexture;
  //
  nextStorageXIdx: number = 0;
  nextStorageYIdx: number = 0;
  nextStorageZIdx: number = 0;
  freeSpots: {
    storageXIdx: number,
    storageYIdx: number,
    storageZIdx: number,
  }[] = [];

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
    out.x = this.nextStorageXIdx;
    out.y = this.nextStorageYIdx;
    out.z = this.nextStorageZIdx;
    this.nextStorageXIdx++;
    if (this.nextStorageXIdx === this.storageCount) {
      this.nextStorageXIdx = 0;
      this.nextStorageYIdx++;
      if (this.nextStorageYIdx === this.storageCount) {
        this.nextStorageYIdx = 0;
        this.nextStorageZIdx++;
      }
    }
  }

  _set_chunk: { x: number, y: number, z: number, } = { x: 0, y: 0, z: 0, };
  set(x: number, y: number, z: number, val: number) {
    let broadXIdx = Math.floor(x / this.chunkDim);
    let broadYIdx = Math.floor(y / this.chunkDim);
    let broadZIdx = Math.floor(z / this.chunkDim);
    let broadIdx = (
        broadZIdx * this.broadDim * this.broadDim
        + broadYIdx * this.broadDim
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
    let localX = x - broadXIdx * this.chunkDim;
    let localY = y - broadYIdx * this.chunkDim;
    let localZ = z - broadZIdx * this.chunkDim;
    let fineXIdx = chunkXIdx * this.chunkDim + localX;
    let fineYIdx = chunkYIdx * this.chunkDim + localY;
    let fineZIdx = chunkZIdx * this.chunkDim + localZ;
    let idx = (
        fineZIdx * this.storageDim * this.storageDim
        + fineYIdx * this.storageDim
        + fineXIdx
      );
    this.data[idx] = val;
  }

  constructor(params?: {
    broadDim?: number,
    chunkDim?: number,
    storageDim?: number,
  }) {
    let { broadDim, chunkDim, storageDim, } = params ?? {};
    broadDim ??= BROAD_DIM;
    chunkDim ??= CHUNK_DIM;
    storageDim ??= STORAGE_DIM;
    this.broadData = new Uint8Array(broadDim * broadDim * broadDim * 4);
    this.broadTexture = new DataTexture(this.broadData, broadDim, broadDim, broadDim);
    this.broadDim = broadDim;
    this.chunkDim = chunkDim;
    this.storageDim = storageDim;
    this.storageCount = Math.floor(storageDim / chunkDim);
    this.data = new Uint8Array(storageDim * storageDim * storageDim);
    this.texture = new DataTexture(this.data, storageDim, storageDim, storageDim, RedIntegerFormat, UnsignedByteType);
  }
}
export function makeLevel(): Level {
  let level = new Level();
  for (let z = 0; z < VIRTUAL_DIM; ++z) {
    for (let x = 0; x < VIRTUAL_DIM; ++x) {
      level.set(x, Math.floor(0.5 * VIRTUAL_DIM + 50 * Math.cos(x * 0.01) * Math.cos(z * 0.01)), z, 1);
    }
  }
  return level;
}

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
}): {
  hit: Node<"bool">,
  voxel: Node<"uvec4">,
  voxelPos: Node<"ivec3">,
  normal: Node<"vec3">,
  hitPoint: Node<"vec3">,
} => {
  let { rayOrigin, rayDirection, dimensions, voxelCount, uVoxels, marchMin, marchMax, texelOffset } = params;

  const texelShift = (texelOffset ?? vec3(0)).toVar();
  const fetchCell = (cell: Node<"ivec3">): Node<"uvec4"> =>
    uVoxels.texture(cell.toVec3().add(texelShift).toUVec3());

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
          If(fetchCell(mapPos).r.notEqual(0), () => {
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

export let rayMarchLevel = (params: {
  rayOrigin: Node<"vec3">,
  rayDirection: Node<"vec3">,
  dimension: Node<"float">,
  broadVoxels: Node<"usampler3D">,
  broadDim: Node<"float">,
  chunkDim: Node<"float">,
  fineVoxels: Node<"usampler3D">,
  outColour: Node<"vec4">,
  outHitPoint: Node<"vec3">,
}): void => {
  const ambientColour = vec3(0.2).toVar();
  const lightColour = vec3(1.0).toVar();
  const lightDir = vec3(1.0, 2.0, 1.0).normalize().toVar();
  let {
    rayOrigin,
    rayDirection,
    dimension,
    broadVoxels,
    broadDim,
    chunkDim,
    fineVoxels,
    outColour,
    outHitPoint,
  } = params;

  const dimensions = vec3(dimension).toVar();
  const virtualDim = broadDim.mul(chunkDim).toVar();
  const cellSizeBroad = dimension.div(broadDim).toVar();

  const broadDimU = broadDim.toUint();
  const chunkDimU = chunkDim.toUint();

  const hit = bool(false).toVar();
  const normal = vec3(0).toVar();

  const boxMin = dimensions.mul(float(-0.5)).sub(cellSizeBroad).toVar();
  const boxMax = dimensions.mul(float(0.5)).add(cellSizeBroad).toVar();
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
      .add(dimensions.mul(float(0.5)))
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

    const maxSteps = broadDim
      .mul(float(3))
      .add(float(8))
      .toInt();
    const broadCount = vec3(broadDim).toVar();

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
                voxelCount: vec3(virtualDim),
                uVoxels: fineVoxels,
                marchMin: virtualChunkMin,
                marchMax: virtualChunkMin.add(uvec3(chunkDimU.sub(1))),
                texelOffset,
              });
              If(fine.hit, () => {
                hit.assign(bool(true));
                normal.assign(fine.normal);
                outHitPoint.assign(fine.hitPoint);
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

  If(hit, () => {
    const diffuse = normal.dot(lightDir).max(float(0));
    outColour.rgb.assign(
      vec3(0.0, 0.0, 1.0).mul(
        ambientColour.add(lightColour.mul(diffuse)),
      ),
    );
    outColour.a.assign(float(1));
  });
};

export class LevelChunkMaterial extends NodeMaterial {
  level?: Level;

  private dimension?: UniformNode<"float">;
  private broadVoxels?: UniformNode<"usampler3D">;
  private broadDim?: UniformNode<"float">;
  private chunkDim?: UniformNode<"float">;
  private fineVoxels?: UniformNode<"usampler3D">;

  constructor() {
    super();
  }

  setLevel(level: Level): void {
    this.level = level;
  }

  protected setup(b: Builder, _scene: Scene): void {
    if (this.level === undefined) {
      return;
    }
    let level = this.level;
    this.dimension = b.materialUniform("dimension", "float", () => level.broadDim * level.chunkDim);
    this.broadVoxels = b.sampler("broadVoxels", "usampler3D", () => level.broadTexture);
    this.broadDim = b.materialUniform("broadDim", "float", () => level.broadDim);
    this.chunkDim = b.materialUniform("chunkDim", "float", () => level.chunkDim);
    this.fineVoxels = b.sampler("fineVoxels", "usampler3D", () => level.texture);
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    b.varying("vModelPos", "vec3").assign(position);
    return b.projectionMatrix.mul(b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, 1.0))));
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    if (this.level === undefined) {
      return vec4(0.0);
    }
    const vModelPos = b.varying("vModelPos", "vec3");
    const rayOrigin = b.normalMatrix.mul(b.cameraPosition);
    const rayDirection = vModelPos.sub(rayOrigin).normalize();

    const colour = vec4(0).toVar();
    const hitPoint = vec3(0).toVar();

    rayMarchLevel({
      rayOrigin,
      rayDirection,
      dimension: this.dimension!,
      broadVoxels: this.broadVoxels!,
      broadDim: this.broadDim!,
      chunkDim: this.chunkDim!,
      fineVoxels: this.fineVoxels!,
      outColour: colour,
      outHitPoint: hitPoint,
    });

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

