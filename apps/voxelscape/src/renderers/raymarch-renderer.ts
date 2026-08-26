import type { Vector3D } from "../utils/maths";
import {
  bool,
  Break,
  builtinFragDepth,
  exp,
  float,
  For,
  If,
  int,
  ivec3,
  max,
  min,
  pow,
  uvec3,
  uvec4,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";
import type { Node, UniformNode } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  Mesh,
  NodeMaterial,
  Scene,
  Side,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { VoxelTileConfig } from "./atlas";
import type { DayNight } from "./block-renderer";
import type { BlockRenderer } from "./block-renderer";
import type { Dim3, WorldBlock } from "../world/level-data";
import { VOXEL_WATER } from "../world/voxel-store";

/** Voxel identifier for water, used in raymarching shader comparisons. */
const WATER = VOXEL_WATER;

const minVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> => min(a, b);
const maxVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> => max(a, b);
const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> => min(a, b);
const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> => max(a, b);

const inRegion = (
  minIdx: Node<"uvec3">,
  maxIdx: Node<"uvec3">,
  cell: Node<"ivec3">,
): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(minIdx.toVec3())
    .all()
    .and(c.lessThanEqual(maxIdx.toVec3()).all());
};

const inPaddedRegion = (
  minIdx: Node<"uvec3">,
  maxIdx: Node<"uvec3">,
  cell: Node<"ivec3">,
): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(minIdx.toVec3().sub(vec3(1)))
    .all()
    .and(c.lessThanEqual(maxIdx.toVec3().add(vec3(1))).all());
};

const intersectBox = (params: {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  boxMin: Node<"vec3">;
  boxMax: Node<"vec3">;
}): {
  entryDistance: Node<"float">;
  exitDistance: Node<"float">;
  nearPlaneDistances: Node<"vec3">;
} => {
  let { rayOrigin, rayDirection, boxMin, boxMax } = params;
  const inverseRayDirection = vec3(1.0).div(rayDirection).toVar();
  const distanceToMinPlanes = inverseRayDirection
    .mul(boxMin.sub(rayOrigin))
    .toVar();
  const distanceToMaxPlanes = inverseRayDirection
    .mul(boxMax.sub(rayOrigin))
    .toVar();
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
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  dimensions: Node<"vec3">;
  voxelCount: Node<"vec3">;
  uVoxels: Node<"usampler3D">;
  marchMin?: Node<"uvec3">;
  marchMax?: Node<"uvec3">;
  texelOffset?: Node<"vec3">;
  fetchCount?: Node<"int">;
  skipSolidStart?: Node<"bool">;
  maxDistance?: Node<"float">;
}): {
  hit: Node<"bool">;
  voxel: Node<"uvec4">;
  voxelPos: Node<"ivec3">;
  normal: Node<"vec3">;
  hitPoint: Node<"vec3">;
  skipSolid: Node<"bool">;
} => {
  let {
    rayOrigin,
    rayDirection,
    dimensions,
    voxelCount,
    uVoxels,
    marchMin,
    marchMax,
    texelOffset,
    fetchCount,
    skipSolidStart,
    maxDistance,
  } = params;

  const texelShift = (texelOffset ?? vec3(0)).toVar();
  const fetchCell = (cell: Node<"ivec3">): Node<"uvec4"> =>
    uVoxels.texture(cell.toVec3().add(texelShift).toUVec3());
  // Counts each fine-texel fetch; only active when fetch-count debugging is
  // enabled, and compiles away entirely otherwise.
  const countFetch = (): void => {
    if (fetchCount !== undefined) {
      fetchCount.assign(fetchCount.add(1));
    }
  };
  // Ray-length budget relative to the chunk entry point; the voxel-stepping
  // loop below stops early once it's exceeded, so no work is spent beyond the
  // maximum render distance.
  const maxBudget = (maxDistance ?? float(1e30)).toVar();

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
  // When the ray origin is inside a solid voxel, keep skipping solid cells
  // until the ray first reaches empty space (then resume normal hits). The
  // flag is seeded by the caller and carried back out across chunk marches.
  const skipSolid = (skipSolidStart ?? bool(false)).toVar();

  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });

  If(entryDistance.lessThanEqual(exitDistance), () => {
    // When the ray origin is inside the box, `entryDistance` is negative (the
    // entry point lies behind the camera). Clamp the march start to the camera
    // so it never samples geometry behind the near plane.
    const entryClamped = entryDistance.max(float(0)).toVar();
    const cellDir = rayDirection.div(cellSize).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryClamped)).toVar();
    const cellOrigin = entryPoint
      .add(dimensions.mul(float(0.5)))
      .div(cellSize)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0).div(cellDir.abs().max(1e-6)).toVar();
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
    // camera distance at the start of the current cell; the first cell begins
    // at the box entry. Updated each step from the boundary t we cross.
    const cellStart = entryClamped.toVar();

    For(
      () => int(0).toVar(),
      (i) => i.lessThan(maxSteps),
      (i) => i.assign(i.add(1)),
      () => {
        If(cellStart.greaterThan(maxBudget), () => {
          Break();
        });
        If(inPaddedRegion(minIdx, maxIdx, mapPos).not(), () => {
          Break();
        });
        If(inRegion(minIdx, maxIdx, mapPos), () => {
          countFetch();
          const cellValue = fetchCell(mapPos).toVar();
          // Water is passable for the terrain march: rays travel straight
          // through it to the lakebed. A separate translucent pass shades the
          // water surface itself afterward.
          If(cellValue.r.equal(WATER), () => {
            skipSolid.assign(bool(false));
          })
            .ElseIf(cellValue.r.notEqual(0), () => {
              If(skipSolid.not(), () => {
                hit.assign(bool(true));
                Break();
              });
            })
            .Else(() => {
              skipSolid.assign(bool(false));
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
        // The boundary crossed this step is where the next cell starts; it is
        // read before `sideDist` advances.
        cellStart.assign(
          entryClamped.add(sideDist.x.min(sideDist.y).min(sideDist.z)),
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
          entryClamped.add(
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
            entryClamped.add(
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
            entryClamped.add(
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
    skipSolid,
  };
};

/**
 * Marches one block's volume, testing the broad grid first and then the fine
 * chunks within it. The ray is given in the block's local space, where the
 * volume is centered at the origin. Returns results without shading;
 * `hitPoint` is local space (add the block center to get a world position).
 */
export let marchBlock = (params: {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  dimensions: Node<"vec3">;
  broadVoxels: Node<"usampler3D">;
  broadDim: Node<"vec3">;
  chunkDim: Node<"vec3">;
  fineVoxels: Node<"usampler3D">;
  fetchCount?: Node<"int">;
  maxDistance?: Node<"float">;
}): {
  hit: Node<"bool">;
  normal: Node<"vec3">;
  hitPoint: Node<"vec3">;
  voxel: Node<"uvec4">;
  cellSize: Node<"vec3">;
} => {
  let {
    rayOrigin,
    rayDirection,
    dimensions,
    broadVoxels,
    broadDim,
    chunkDim,
    fineVoxels,
    fetchCount,
    maxDistance,
  } = params;

  const volumeDimensions = dimensions.toVar();
  const virtualDim = broadDim.mul(chunkDim).toVar();
  const cellSizeBroad = volumeDimensions.div(broadDim).toVar();
  const chunkDimU = chunkDim.toUint();

  const hit = bool(false).toVar();
  const normal = vec3(0).toVar();
  const hitPoint = vec3(0).toVar();
  const voxel = uvec4().toVar();
  const cellSize = volumeDimensions.div(virtualDim).toVar();

  // Whether the ray origin sits inside a solid fine voxel. When it does, the
  // fine march skips solid cells until the ray first reaches empty space, so a
  // camera buried in the terrain sees the surface beyond instead of the voxel
  // enclosing it.
  const originSolid = bool(false).toVar();
  const originCell = rayOrigin
    .add(volumeDimensions.mul(float(0.5)))
    .div(cellSize)
    .floor()
    .toIVec3()
    .toVar();
  If(
    originCell
      .toVec3()
      .greaterThanEqual(vec3(float(0)))
      .all()
      .and(originCell.toVec3().lessThan(virtualDim).all()),
    () => {
      const originBroadCell = originCell.div(chunkDimU.toIVec3()).toVar();
      const broadValue = broadVoxels.texture(originBroadCell.toUVec3()).toVar();
      If(broadValue.r.notEqual(0), () => {
        const storageChunkMin = broadValue.yzw.mul(chunkDimU).toIVec3();
        const virtualChunkMin = originBroadCell.mul(chunkDimU.toIVec3());
        const texelOffset = storageChunkMin.sub(virtualChunkMin);
        const fineValue = fineVoxels
          .texture(originCell.add(texelOffset).toUVec3())
          .toVar();
        originSolid.assign(
          fineValue.r.notEqual(0).and(fineValue.r.notEqual(WATER)),
        );
      });
    },
  );
  const skipSolid = originSolid.toVar();

  const boxMin = volumeDimensions.mul(float(-0.5)).sub(cellSizeBroad).toVar();
  const boxMax = volumeDimensions.mul(float(0.5)).add(cellSizeBroad).toVar();
  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });
  // Camera-relative render-distance budget. `rayMarch` receives the same
  // block-local `rayOrigin` (the camera), so its own `cellStart` (entry
  // distance plus the stepping loop's boundary distance) is already measured
  // from the camera and respects this budget directly.
  const maxBudget = (maxDistance ?? float(1e30)).toVar();

  If(entryDistance.lessThanEqual(exitDistance), () => {
    // Clamp the march start to the camera when it is inside the volume, so
    // the voxel-stepping loop never samples voxels behind the camera.
    const entryClamped = entryDistance.max(float(0)).toVar();
    const cellDir = rayDirection.div(cellSizeBroad).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryClamped)).toVar();
    const cellOrigin = entryPoint
      .add(volumeDimensions.mul(float(0.5)))
      .div(cellSizeBroad)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0).div(cellDir.abs().max(1e-6)).toVar();
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
    // camera distance at the start of the current broad cell; the first cell
    // begins at the block-box entry. Updated from the boundary t we cross.
    const cellStart = entryClamped.toVar();

    For(
      () => int(0).toVar(),
      (i) => i.lessThan(maxSteps),
      (i) => i.assign(i.add(1)),
      () => {
        If(cellStart.greaterThan(maxBudget), () => {
          Break();
        });
        If(
          mapPos
            .toVec3()
            .greaterThanEqual(vec3(float(-2)))
            .all()
            .and(
              mapPos
                .toVec3()
                .lessThan(broadCount.add(vec3(float(2))))
                .all(),
            )
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
              const texelOffset = storageChunkMin
                .toVec3()
                .sub(virtualChunkMin.toVec3());
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
                skipSolidStart: skipSolid,
                maxDistance: maxBudget,
              });
              skipSolid.assign(fine.skipSolid);
              If(fine.hit, () => {
                hit.assign(bool(true));
                normal.assign(fine.normal);
                hitPoint.assign(fine.hitPoint);
                voxel.assign(fine.voxel);
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
        // The boundary crossed this step is where the next cell starts; it is
        // read before `sideDist` advances.
        cellStart.assign(
          entryClamped.add(sideDist.x.min(sideDist.y).min(sideDist.z)),
        );
        sideDist.assign(sideDist.add(mask.mul(deltaDist)));
        mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
      },
    );
  });

  return { hit, normal, hitPoint, voxel, cellSize };
};

/**
 * Steps through one chunk's voxels looking only for water. Stops at the first
 * water voxel (the stored surface layer), recording its camera-space
 * `surfaceDistance`. Sets `done` when it either finds the surface or hits
 * solid terrain first, letting the caller stop marching further chunks early.
 */
export let rayMarchWater = (params: {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  dimensions: Node<"vec3">;
  voxelCount: Node<"vec3">;
  uVoxels: Node<"usampler3D">;
  marchMin?: Node<"uvec3">;
  marchMax?: Node<"uvec3">;
  texelOffset?: Node<"vec3">;
  maxDistance?: Node<"float">;
}): {
  enteredWater: Node<"bool">;
  surfaceDistance: Node<"float">;
  done: Node<"bool">;
} => {
  let {
    rayOrigin,
    rayDirection,
    dimensions,
    voxelCount,
    uVoxels,
    marchMin,
    marchMax,
    texelOffset,
    maxDistance,
  } = params;

  const texelShift = (texelOffset ?? vec3(0)).toVar();
  const fetchCell = (cell: Node<"ivec3">): Node<"uvec4"> =>
    uVoxels.texture(cell.toVec3().add(texelShift).toUVec3());
  const maxBudget = (maxDistance ?? float(1e30)).toVar();

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

  const enteredWater = bool(false).toVar();
  const surfaceDistance = float(0).toVar();
  const done = bool(false).toVar();

  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });

  If(entryDistance.lessThanEqual(exitDistance), () => {
    const entryClamped = entryDistance.max(float(0)).toVar();
    const cellDir = rayDirection.div(cellSize).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryClamped)).toVar();
    const cellOrigin = entryPoint
      .add(dimensions.mul(float(0.5)))
      .div(cellSize)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0).div(cellDir.abs().max(1e-6)).toVar();
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
    const cellStart = entryClamped.toVar();

    For(
      () => int(0).toVar(),
      (i) => i.lessThan(maxSteps),
      (i) => i.assign(i.add(1)),
      () => {
        If(cellStart.greaterThan(maxBudget), () => {
          Break();
        });
        If(inPaddedRegion(minIdx, maxIdx, mapPos).not(), () => {
          Break();
        });
        If(inRegion(minIdx, maxIdx, mapPos), () => {
          const cellValue = fetchCell(mapPos).toVar();
          If(cellValue.r.equal(WATER), () => {
            // first water cell along the ray is the surface layer
            surfaceDistance.assign(cellStart);
            enteredWater.assign(bool(true));
            done.assign(bool(true));
            Break();
          }).ElseIf(cellValue.r.notEqual(0), () => {
            // solid terrain before any water: nothing to shade on this ray
            done.assign(bool(true));
            Break();
          });
          // air: keep marching toward the surface
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
        cellStart.assign(
          entryClamped.add(sideDist.x.min(sideDist.y).min(sideDist.z)),
        );
        sideDist.assign(sideDist.add(mask.mul(deltaDist)));
        mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
      },
    );
  });

  return { enteredWater, surfaceDistance, done };
};

/**
 * Marches one block's volume looking only for water, testing the broad grid
 * first and then the fine chunks within it, and returns where the ray first
 * crosses the water surface. `surfaceDistance` is in camera space; add the
 * block center to get a world position.
 */
export let marchWater = (params: {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  dimensions: Node<"vec3">;
  broadVoxels: Node<"usampler3D">;
  broadDim: Node<"vec3">;
  chunkDim: Node<"vec3">;
  fineVoxels: Node<"usampler3D">;
  maxDistance?: Node<"float">;
}): {
  enteredWater: Node<"bool">;
  surfaceDistance: Node<"float">;
} => {
  let {
    rayOrigin,
    rayDirection,
    dimensions,
    broadVoxels,
    broadDim,
    chunkDim,
    fineVoxels,
    maxDistance,
  } = params;

  const volumeDimensions = dimensions.toVar();
  const virtualDim = broadDim.mul(chunkDim).toVar();
  const cellSizeBroad = volumeDimensions.div(broadDim).toVar();
  const chunkDimU = chunkDim.toUint();

  const enteredWater = bool(false).toVar();
  const surfaceDistance = float(0).toVar();

  const boxMin = volumeDimensions.mul(float(-0.5)).sub(cellSizeBroad).toVar();
  const boxMax = volumeDimensions.mul(float(0.5)).add(cellSizeBroad).toVar();
  let { entryDistance, exitDistance, nearPlaneDistances } = intersectBox({
    rayOrigin,
    rayDirection,
    boxMin,
    boxMax,
  });
  const maxBudget = (maxDistance ?? float(1e30)).toVar();

  If(entryDistance.lessThanEqual(exitDistance), () => {
    const entryClamped = entryDistance.max(float(0)).toVar();
    const cellDir = rayDirection.div(cellSizeBroad).toVar();

    const entryPoint = rayOrigin.add(rayDirection.mul(entryClamped)).toVar();
    const cellOrigin = entryPoint
      .add(volumeDimensions.mul(float(0.5)))
      .div(cellSizeBroad)
      .add(cellDir.mul(float(0.001)))
      .toVar();

    const mapPos = cellOrigin.floor().toIVec3().toVar();
    const rayStep = rayDirection.sign().toIVec3().toVar();
    const deltaDist = vec3(1.0).div(cellDir.abs().max(1e-6)).toVar();
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
    const cellStart = entryClamped.toVar();

    For(
      () => int(0).toVar(),
      (i) => i.lessThan(maxSteps),
      (i) => i.assign(i.add(1)),
      () => {
        If(cellStart.greaterThan(maxBudget), () => {
          Break();
        });
        If(
          mapPos
            .toVec3()
            .greaterThanEqual(vec3(float(-2)))
            .all()
            .and(
              mapPos
                .toVec3()
                .lessThan(broadCount.add(vec3(float(2))))
                .all(),
            )
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
              const texelOffset = storageChunkMin
                .toVec3()
                .sub(virtualChunkMin.toVec3());
              const fine = rayMarchWater({
                rayOrigin,
                rayDirection,
                dimensions,
                voxelCount: virtualDim,
                uVoxels: fineVoxels,
                marchMin: virtualChunkMin,
                marchMax: virtualChunkMin.add(chunkDimU).sub(uvec3(1)),
                texelOffset,
                maxDistance: maxBudget,
              });
              If(fine.enteredWater, () => {
                surfaceDistance.assign(fine.surfaceDistance);
                enteredWater.assign(bool(true));
              });
              If(fine.done, () => {
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
        cellStart.assign(
          entryClamped.add(sideDist.x.min(sideDist.y).min(sideDist.z)),
        );
        sideDist.assign(sideDist.add(mask.mul(deltaDist)));
        mapPos.assign(mapPos.add(mask.toIVec3().mul(rayStep)));
      },
    );
  });

  return { enteredWater, surfaceDistance };
};

export interface WorldBlockShader {
  center: Node<"vec3">;
  dimensions: Node<"vec3">;
  broadVoxels: Node<"usampler3D">;
  broadDim: Node<"vec3">;
  chunkDim: Node<"vec3">;
  fineVoxels: Node<"usampler3D">;
}

/** A per-face atlas rectangle for one voxel identifier, backed by a vec4 material uniform. */
export interface TileFaceUniform {
  id: number;
  top: Node<"vec4">;
  side: Node<"vec4">;
  bottom: Node<"vec4">;
}

/**
 * Marches a world of stacked blocks: tests every block's axis-aligned
 * bounding box, runs the fine march on each one the ray enters (cheap, since
 * block broad grids skip empty space), and keeps the nearest hit. Shading is
 * applied once at the end.
 */
export let rayMarchWorld = (params: {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  blocks: WorldBlockShader[];
  outColour: Node<"vec4">;
  outHitPoint: Node<"vec3">;
  tiles?: Node<"sampler2D">;
  tileRects?: TileFaceUniform[];
  fetchCount?: Node<"int">;
  maxDistance?: Node<"float">;
  fogStart?: Node<"float">;
  fogColor?: Node<"vec3">;
  /** Time-of-day lighting inputs; when omitted, default values produce a fixed directional light. */
  sunDirection?: Node<"vec3">;
  sunLightColor?: Node<"vec3">;
  moonDirection?: Node<"vec3">;
  moonLightColor?: Node<"vec3">;
  ambientColor?: Node<"vec3">;
}): void => {
  let {
    rayOrigin,
    rayDirection,
    blocks,
    outColour,
    outHitPoint,
    tiles,
    tileRects,
    fetchCount,
    maxDistance,
    fogStart,
    fogColor,
    sunDirection,
    sunLightColor,
    moonDirection,
    moonLightColor,
    ambientColor,
  } = params;
  const ambientColour = (ambientColor ?? vec3(0.2)).toVar();
  const lightColour = (sunLightColor ?? vec3(1.0)).toVar();
  const lightDir = (sunDirection ?? vec3(1.0, 2.0, 1.0).normalize()).toVar();
  const moonLightColour = (moonLightColor ?? vec3(0)).toVar();
  const moonDir = (moonDirection ?? vec3(-1.0, -2.0, -1.0).normalize()).toVar();
  const N = blocks.length;
  // Hard render-distance cutoff: blocks entered beyond it are skipped and hits
  // past it are rejected, so nothing renders past the fog end.
  const maxDist = (maxDistance ?? float(1e30)).toVar();
  // distance-based fog: full opacity by maxDist (defaults keep the horizon a
  // flat sky blue when the material hasn't been configured).
  const fogColour = (fogColor ?? vec3(0.53, 0.81, 0.92)).toVar();
  const fogNear = (fogStart ?? maxDist.mul(float(0.4))).toVar();

  const hit = bool(false).toVar();
  const normal = vec3(0).toVar();
  const hitPoint = vec3(0).toVar();
  const voxel = uvec4().toVar();
  const localHit = vec3(0).toVar();
  const cellSize = vec3(0).toVar();
  const dimensions = vec3(0).toVar();
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
    If(
      entries[i].lessThanEqual(exits[i]).and(entries[i].lessThanEqual(maxDist)),
      () => {
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
          maxDistance: maxDist,
        });
        const dist = r.hitPoint.sub(localOrigin).length().toVar();
        If(
          r.hit.and(dist.lessThanEqual(maxDist)).and(dist.lessThan(bestDist)),
          () => {
            bestDist.assign(dist);
            hit.assign(bool(true));
            normal.assign(r.normal);
            hitPoint.assign(r.hitPoint.add(center));
            voxel.assign(r.voxel);
            localHit.assign(r.hitPoint);
            cellSize.assign(r.cellSize);
            dimensions.assign(blocks[i].dimensions);
          },
        );
      },
    );
  }

  If(hit, () => {
    const diffuse = normal.dot(lightDir).max(float(0));
    const moonDiffuse = normal.dot(moonDir).max(float(0));
    const lighting = ambientColour
      .add(lightColour.mul(diffuse))
      .add(moonLightColour.mul(moonDiffuse));
    if (
      tiles !== undefined &&
      tileRects !== undefined &&
      tileRects.length > 0
    ) {
      // cell-local coordinate of the hit; the two in-plane components sit at an
      // integer boundary, so nudge the sample point into the voxel first.
      const cellCoord = localHit
        .add(dimensions.mul(float(0.5)))
        .div(cellSize)
        .toVar();
      const p = cellCoord.add(normal.mul(vec3(0.5))).toVar();
      // The world-up axis maps to v=0 (the top of the source tile, where the
      // grass lives on side tiles), so the vertical component is flipped.
      const faceUv = vec2(0).toVar();
      If(normal.y.abs().greaterThan(0.5), () => {
        faceUv.assign(vec2(p.x.fract(), p.z.fract()));
      })
        .ElseIf(normal.x.abs().greaterThan(0.5), () => {
          faceUv.assign(vec2(p.z.fract(), p.y.fract().oneMinus()));
        })
        .Else(() => {
          faceUv.assign(vec2(p.x.fract(), p.y.fract().oneMinus()));
        });

      const albedo = vec3(0).toVar();
      for (const t of tileRects) {
        If(voxel.r.equal(t.id), () => {
          const rect = vec4(0).toVar();
          rect.assign(t.top);
          If(normal.y.lessThan(0), () => {
            rect.assign(t.bottom);
          });
          If(normal.y.abs().lessThan(0.5), () => {
            rect.assign(t.side);
          });
          const atlasUv = rect.xy.add(faceUv.mul(rect.zw.sub(rect.xy))).toVar();
          albedo.assign(tiles.texture(atlasUv).rgb);
        });
      }
      outColour.rgb.assign(albedo.mul(lighting));
    } else {
      outColour.rgb.assign(vec3(0.0, 0.0, 1.0).mul(lighting));
    }
    // distance fog toward the sky colour; fully opaque at the render distance,
    // so distant terrain blends seamlessly into the sky clear colour.
    outColour.rgb.assign(
      outColour.rgb.mix(fogColour, bestDist.smoothstep(fogNear, maxDist)),
    );
    outColour.a.assign(float(1));
    outHitPoint.assign(hitPoint);
  });
};

export class RaymarchMaterial extends NodeMaterial {
  blocks: WorldBlock[] = [];
  /**
   * When true, outputs a fetch-count heatmap instead of the shaded scene: the
   * red and green channels encode the 16-bit count of fine-texel fetches, and
   * the alpha channel is 1 when the ray entered at least one chunk.
   */
  debugFetchCount: boolean = false;
  /** The tile spritesheet uploaded as one 2D texture; set asynchronously once loaded. */
  tilesTexture: Texture | null = null;
  /** Per-voxel-identifier face tiles (normalized atlas rectangles) that drive the rect uniforms. */
  voxelTiles: VoxelTileConfig[] = [];
  /** World-space distance at which rays stop marching and fog becomes fully opaque. */
  maxDistance: number = 480;
  /** World-space distance from the camera where distance fog begins fading in. */
  fogStart: number = 200;
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  /**
   * Unit vector pointing toward the sun; its diffuse light contribution dims
   * to zero once the sun dips below the horizon, at which point
   * `moonLightColor` takes over.
   */
  sunDirection: [number, number, number] = [
    1 / Math.sqrt(6),
    2 / Math.sqrt(6),
    1 / Math.sqrt(6),
  ];
  sunLightColor: [number, number, number] = [1, 1, 1];
  moonDirection: [number, number, number] = [
    -1 / Math.sqrt(6),
    -2 / Math.sqrt(6),
    -1 / Math.sqrt(6),
  ];
  moonLightColor: [number, number, number] = [0, 0, 0];
  ambientColor: [number, number, number] = [0.2, 0.2, 0.2];

  private blockUniforms: WorldBlockShader[] = [];
  private tileUniforms: TileFaceUniform[] = [];
  private tilesSampler: UniformNode<"sampler2D"> | undefined;
  private maxDistanceUniform: UniformNode<"float"> | undefined;
  private fogStartUniform: UniformNode<"float"> | undefined;
  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private sunDirectionUniform: UniformNode<"vec3"> | undefined;
  private sunLightColorUniform: UniformNode<"vec3"> | undefined;
  private moonDirectionUniform: UniformNode<"vec3"> | undefined;
  private moonLightColorUniform: UniformNode<"vec3"> | undefined;
  private ambientColorUniform: UniformNode<"vec3"> | undefined;

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
    this.blockUniforms = [];
    this.tileUniforms = this.voxelTiles.map((v) => ({
      id: v.id,
      top: b.materialUniform(`v${v.id}_top`, "vec4", () => v.top),
      side: b.materialUniform(`v${v.id}_side`, "vec4", () => v.side),
      bottom: b.materialUniform(`v${v.id}_bottom`, "vec4", () => v.bottom),
    }));
    this.maxDistanceUniform = b.materialUniform(
      "maxDistance",
      "float",
      () => this.maxDistance,
    );
    this.fogStartUniform = b.materialUniform(
      "fogStart",
      "float",
      () => this.fogStart,
    );
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.sunDirectionUniform = b.materialUniform(
      "sunDirection",
      "vec3",
      () => this.sunDirection,
    );
    this.sunLightColorUniform = b.materialUniform(
      "sunLightColor",
      "vec3",
      () => this.sunLightColor,
    );
    this.moonDirectionUniform = b.materialUniform(
      "moonDirection",
      "vec3",
      () => this.moonDirection,
    );
    this.moonLightColorUniform = b.materialUniform(
      "moonLightColor",
      "vec3",
      () => this.moonLightColor,
    );
    this.ambientColorUniform = b.materialUniform(
      "ambientColor",
      "vec3",
      () => this.ambientColor,
    );
    if (this.tilesTexture !== null) {
      this.tilesSampler = b.sampler(
        "tilesAtlas",
        "sampler2D",
        () => this.tilesTexture,
      );
    }
    for (let i = 0; i < this.blocks.length; i++) {
      const level = this.blocks[i].level;
      const prefix = `b${i}_`;
      this.blockUniforms.push({
        center: b.materialUniform(
          prefix + "center",
          "vec3",
          () => this.blocks[i].center,
        ),
        dimensions: b.materialUniform(
          prefix + "dimensions",
          "vec3",
          () => level.dimensionsUniform,
        ),
        broadVoxels: b.sampler(
          prefix + "broadVoxels",
          "usampler3D",
          () => level.broadTexture,
        ),
        broadDim: b.materialUniform(
          prefix + "broadDim",
          "vec3",
          () => level.broadDimUniform,
        ),
        chunkDim: b.materialUniform(
          prefix + "chunkDim",
          "vec3",
          () => level.chunkDimUniform,
        ),
        fineVoxels: b.sampler(
          prefix + "fineVoxels",
          "usampler3D",
          () => level.texture,
        ),
      });
    }
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    // Meshes sit at their block's world center, so the varying must carry the
    // world-space position (ray marching happens in world space).
    const worldPos = b.modelMatrix.mul(vec4(position, 1.0)).xyz;
    b.varying("vModelPos", "vec3").assign(worldPos);
    return b.projectionMatrix.mul(
      b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, 1.0))),
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    if (
      this.blocks.length === 0 ||
      this.blockUniforms.length !== this.blocks.length
    ) {
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
      tiles: this.tilesSampler,
      tileRects: this.tileUniforms,
      fetchCount,
      maxDistance: this.maxDistanceUniform,
      fogStart: this.fogStartUniform,
      fogColor: this.fogColorUniform,
      sunDirection: this.sunDirectionUniform,
      sunLightColor: this.sunLightColorUniform,
      moonDirection: this.moonDirectionUniform,
      moonLightColor: this.moonLightColorUniform,
      ambientColor: this.ambientColorUniform,
    });

    if (this.debugFetchCount && fetchCount !== undefined) {
      const hasFetches = fetchCount.greaterThan(0);
      colour.rgb.assign(
        vec3(float(fetchCount.mod(256)), float(fetchCount.div(256)), float(0)),
      );
      colour.a.assign(hasFetches.select(float(1), float(0)));
    }

    const fragDepth = builtinFragDepth();
    If(colour.a.greaterThan(float(0.5)), () => {
      // `hitPoint` is already in world space, so skip the model matrix (the
      // mesh is translated to its block center and would double-shift it).
      const clip = b.projectionMatrix.mul(
        b.viewMatrix.mul(vec4(hitPoint, float(1))),
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

/**
 * Renders the water as a separate translucent pass. It marches the same
 * block voxels looking only for the stored water surface and alpha-blends
 * over the already-rendered opaque scene (terrain and meshes), so anything
 * behind the water — including the player cube — is correctly tinted and
 * occluded by the surface. Shading happens at the surface only; a camera
 * below `seaLevel` gets a uniform underwater tint instead.
 */
export class RaymarchWaterMaterial extends NodeMaterial {
  blocks: WorldBlock[] = [];
  /** Maximum ray-march distance for the water pass, matching the terrain material's setting. */
  maxDistance: number = 480;
  /** Fog color, matching the terrain material's so the reflected sky blends seamlessly. */
  fogColor: [number, number, number] = [0.53, 0.81, 0.92];
  waterColor: [number, number, number] = [0.1, 0.35, 0.55];
  /**
   * Surface transparency when looking straight down, in the range 0 to 1;
   * grazing angles become more opaque as the Fresnel reflection takes over.
   */
  waterOpacity: number = 0.5;
  /** World-space Y coordinate of the water surface, used to tint the view when the camera is below it. */
  seaLevel: number = 0;
  /** Per-world-unit light absorption for the underwater tint; larger values are more opaque. */
  waterExtinction: number = 0.12;

  private blockUniforms: WorldBlockShader[] = [];
  private maxDistanceUniform: UniformNode<"float"> | undefined;
  private fogColorUniform: UniformNode<"vec3"> | undefined;
  private waterColorUniform: UniformNode<"vec3"> | undefined;
  private waterOpacityUniform: UniformNode<"float"> | undefined;
  private seaLevelUniform: UniformNode<"float"> | undefined;
  private waterExtinctionUniform: UniformNode<"float"> | undefined;

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
    this.blockUniforms = [];
    this.maxDistanceUniform = b.materialUniform(
      "maxDistance",
      "float",
      () => this.maxDistance,
    );
    this.fogColorUniform = b.materialUniform(
      "fogColor",
      "vec3",
      () => this.fogColor,
    );
    this.waterColorUniform = b.materialUniform(
      "waterColor",
      "vec3",
      () => this.waterColor,
    );
    this.waterOpacityUniform = b.materialUniform(
      "waterOpacity",
      "float",
      () => this.waterOpacity,
    );
    this.seaLevelUniform = b.materialUniform(
      "seaLevel",
      "float",
      () => this.seaLevel,
    );
    this.waterExtinctionUniform = b.materialUniform(
      "waterExtinction",
      "float",
      () => this.waterExtinction,
    );
    for (let i = 0; i < this.blocks.length; i++) {
      const level = this.blocks[i].level;
      const prefix = `b${i}_`;
      this.blockUniforms.push({
        center: b.materialUniform(
          prefix + "center",
          "vec3",
          () => this.blocks[i].center,
        ),
        dimensions: b.materialUniform(
          prefix + "dimensions",
          "vec3",
          () => level.dimensionsUniform,
        ),
        broadVoxels: b.sampler(
          prefix + "broadVoxels",
          "usampler3D",
          () => level.broadTexture,
        ),
        broadDim: b.materialUniform(
          prefix + "broadDim",
          "vec3",
          () => level.broadDimUniform,
        ),
        chunkDim: b.materialUniform(
          prefix + "chunkDim",
          "vec3",
          () => level.chunkDimUniform,
        ),
        fineVoxels: b.sampler(
          prefix + "fineVoxels",
          "usampler3D",
          () => level.texture,
        ),
      });
    }
  }

  protected buildVertexBody(b: Builder): Node<"vec4"> {
    const position = b.position;
    const worldPos = b.modelMatrix.mul(vec4(position, 1.0)).xyz;
    b.varying("vModelPos", "vec3").assign(worldPos);
    return b.projectionMatrix.mul(
      b.viewMatrix.mul(b.modelMatrix.mul(vec4(position, 1.0))),
    );
  }

  protected buildFragmentBody(b: Builder): Node<"vec4"> {
    if (
      this.blocks.length === 0 ||
      this.blockUniforms.length !== this.blocks.length
    ) {
      return vec4(0.0);
    }
    const vModelPos = b.varying("vModelPos", "vec3");
    const rayOrigin = b.normalMatrix.mul(b.cameraPosition);
    const rayDirection = vModelPos.sub(rayOrigin).normalize();

    const maxDist = this.maxDistanceUniform ?? float(1e30);
    const skyColour = this.fogColorUniform ?? vec3(0.53, 0.81, 0.92);
    const waterColour = this.waterColorUniform ?? vec3(0.1, 0.35, 0.55);
    const waterOpacity = this.waterOpacityUniform ?? float(0.5);
    const seaLevel = this.seaLevelUniform ?? float(0);
    const extinction = this.waterExtinctionUniform ?? float(0.12);

    const enteredWater = bool(false).toVar();
    const surfaceDistance = float(1e30).toVar();
    const cameraInBlock = bool(false).toVar();
    // the camera is underwater when it sits below the (global) water level;
    // the whole view then gets a uniform tint instead of a surface shade
    const underwater = rayOrigin.y.lessThan(seaLevel).toVar();

    const N = this.blockUniforms.length;
    const entries: Node<"float">[] = [];
    const exits: Node<"float">[] = [];
    for (let i = 0; i < N; i++) {
      const half = this.blockUniforms[i].dimensions.mul(float(0.5));
      const pad = this.blockUniforms[i].dimensions.div(
        this.blockUniforms[i].broadDim,
      );
      const boxMin = this.blockUniforms[i].center.sub(half).sub(pad);
      const boxMax = this.blockUniforms[i].center.add(half).add(pad);
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
      If(
        entries[i]
          .lessThanEqual(exits[i])
          .and(entries[i].lessThanEqual(maxDist)),
        () => {
          // only the block containing the camera may emit the fullscreen
          // underwater tint (several blocks overlap the screen, but one camera)
          const half = this.blockUniforms[i].dimensions.mul(float(0.5));
          const pad = this.blockUniforms[i].dimensions.div(
            this.blockUniforms[i].broadDim,
          );
          const blockMin = this.blockUniforms[i].center.sub(half).sub(pad);
          const blockMax = this.blockUniforms[i].center.add(half).add(pad);
          If(
            rayOrigin
              .greaterThanEqual(blockMin)
              .all()
              .and(rayOrigin.lessThanEqual(blockMax).all()),
            () => {
              cameraInBlock.assign(bool(true));
            },
          );
          const localOrigin = rayOrigin
            .sub(this.blockUniforms[i].center)
            .toVar();
          const r = marchWater({
            rayOrigin: localOrigin,
            rayDirection,
            dimensions: this.blockUniforms[i].dimensions,
            broadVoxels: this.blockUniforms[i].broadVoxels,
            broadDim: this.blockUniforms[i].broadDim,
            chunkDim: this.blockUniforms[i].chunkDim,
            fineVoxels: this.blockUniforms[i].fineVoxels,
            maxDistance: maxDist,
          });
          If(
            r.enteredWater.and(r.surfaceDistance.lessThan(surfaceDistance)),
            () => {
              surfaceDistance.assign(r.surfaceDistance);
              enteredWater.assign(bool(true));
            },
          );
        },
      );
    }

    const colour = vec4(0).toVar();
    If(enteredWater.and(underwater.not()), () => {
      // water surface seen from above: Fresnel sky reflection + base
      // transparency (deeper water looks the same; the lakebed shows through)
      const fresnel = float(0.05)
        .add(float(0.95).mul(pow(float(1).sub(rayDirection.y.abs()), float(3))))
        .toVar();
      const rgb = waterColour.mix(skyColour, fresnel).toVar();
      const alpha = fresnel.add(waterOpacity).min(float(1)).toVar();
      colour.assign(vec4(rgb, alpha));

      // Depth of the water surface, so it occludes and is occluded correctly
      // by nearer opaque geometry such as terrain or the player.
      const surfacePoint = rayOrigin
        .add(rayDirection.mul(surfaceDistance))
        .toVar();
      const clip = b.projectionMatrix.mul(
        b.viewMatrix.mul(vec4(surfacePoint, float(1))),
      );
      const ndcZ = clip.z.div(clip.w);
      const depth = ndcZ.mul(float(0.5)).add(float(0.5));
      builtinFragDepth().assign(depth.max(float(0.0)).min(float(0.9999)));
    }).ElseIf(underwater.and(cameraInBlock), () => {
      // camera under water: uniform tint over the whole view, more opaque the
      // deeper the camera is below the surface
      const cameraDepth = seaLevel.sub(rayOrigin.y).max(float(0)).toVar();
      const alpha = float(1)
        .sub(exp(extinction.mul(float(-1)).mul(cameraDepth)))
        .min(float(1))
        .toVar();
      colour.assign(vec4(waterColour, alpha));
      builtinFragDepth().assign(float(0.0001));
    });

    return colour;
  }
}

export interface RaymarchRendererParams {
  scene: Scene;
  blocks: WorldBlock[];
  padding: number;
  blockWorld: Vector3D;
  fogDistance: number;
  fogStart: number;
  debugPerf: boolean;
  waterExtinction: number;
  seaLevel: number;
}

/**
 * Fragment-shader voxel raymarcher: one padded bounding-box mesh per
 * `WorldBlock`, ray-marched against that block's GPU voxel texture in the
 * shader. Owns its own terrain and water meshes/materials. The texture data
 * itself lives directly on the shared `WorldBlock` (`block.level`), so there
 * is nothing to re-sync here when a block's data changes — whoever refills
 * the block's data already marks the GPU texture dirty, and this material
 * reads it live every frame.
 */
export class RaymarchRenderer implements BlockRenderer {
  readonly meshes: Mesh[] = [];
  readonly materials: RaymarchMaterial[] = [];
  readonly waterMeshes: Mesh[] = [];
  readonly waterMaterials: RaymarchWaterMaterial[] = [];

  constructor(params: RaymarchRendererParams) {
    const {
      scene,
      blocks,
      padding,
      blockWorld,
      fogDistance,
      fogStart,
      debugPerf,
      waterExtinction,
      seaLevel,
    } = params;
    const geometry = new BoxGeometry(
      blockWorld.x + padding,
      blockWorld.y + padding,
      blockWorld.z + padding,
    );
    for (const block of blocks) {
      const material = new RaymarchMaterial();
      material.transparent = true;
      material.depthWrite = true;
      material.debugFetchCount = debugPerf;
      material.side = Side.DoubleSide;
      material.maxDistance = fogDistance;
      material.fogStart = fogStart;
      material.setBlocks([block]);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(block.center[0], block.center[1], block.center[2]);
      scene.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);

      // Translucent water pass: blends over the opaque scene, never writes
      // depth, and depth-tests so terrain or the player in front hide it.
      // Added to the scene later, after the player cube, since the renderer
      // draws meshes in scene-graph order.
      const waterMaterial = new RaymarchWaterMaterial();
      waterMaterial.transparent = true;
      waterMaterial.depthWrite = false;
      waterMaterial.side = Side.DoubleSide;
      waterMaterial.maxDistance = fogDistance;
      waterMaterial.fogColor = [0.53, 0.81, 0.92];
      waterMaterial.waterColor = [0.1, 0.35, 0.55];
      waterMaterial.waterOpacity = 0.5;
      waterMaterial.waterExtinction = waterExtinction;
      waterMaterial.seaLevel = seaLevel;
      waterMaterial.setBlocks([block]);
      const waterMesh = new Mesh(geometry, waterMaterial);
      waterMesh.position.set(block.center[0], block.center[1], block.center[2]);
      this.waterMeshes.push(waterMesh);
      this.waterMaterials.push(waterMaterial);
    }
  }

  /**
   * Must be called once, after the player cube is added to the scene, so the
   * translucent water pass blends over it. Scene-graph order determines
   * blending order here, since there is no depth-sorted transparency pass.
   */
  addWaterToScene(scene: Scene): void {
    for (const mesh of this.waterMeshes) {
      scene.add(mesh);
    }
  }

  setVisible(visible: boolean): void {
    for (const mesh of this.meshes) {
      mesh.visible = visible;
    }
    for (const mesh of this.waterMeshes) {
      mesh.visible = visible;
    }
  }

  repositionBlock(index: number, center: Dim3): void {
    this.meshes[index].position.set(center[0], center[1], center[2]);
    this.waterMeshes[index].position.set(center[0], center[1], center[2]);
  }

  /** No-op: the level texture lives on the shared `WorldBlock` and is already marked dirty by the data layer before this is called. */
  onBlockChanged(_index: number): void {}

  setTiles(voxelTiles: VoxelTileConfig[], texture: Texture): void {
    for (const material of this.materials) {
      material.tilesTexture = texture;
      material.voxelTiles = voxelTiles;
      material.needsUpdate = true;
    }
  }

  applyLighting(dayNight: DayNight): void {
    for (const material of this.materials) {
      material.fogColor = dayNight.skyColor;
      material.sunDirection = dayNight.sunDir;
      material.sunLightColor = dayNight.sunLight;
      material.moonDirection = dayNight.moonDir;
      material.moonLightColor = dayNight.moonLight;
      material.ambientColor = dayNight.ambient;
    }
    for (const waterMaterial of this.waterMaterials) {
      waterMaterial.fogColor = dayNight.skyColor;
    }
  }

  /** No-op: the raymarch texture sync is unconditional and handled by the data layer, not gated on this renderer being active. */
  tick(_dt: number, _camera: PerspectiveCamera): void {}

  /**
   * No-op: rmsl's geometries and materials don't expose a disposal API for
   * these per-block resources. Present for `BlockRenderer` interface
   * symmetry should that change.
   */
  dispose(): void {}
}
