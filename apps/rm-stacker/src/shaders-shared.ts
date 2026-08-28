import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  bool,
  Break,
  float,
  For,
  If,
  int,
  ivec3,
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

const FOCAL_LENGTH = 2;

// Shared rmsl nodes. The slot names are the same in the CPU voxel picker and
// the GPU scene-graph material (both built from this module), so the two can
// never drift apart. shaders.ts ships the names to the app.
export const uPalette = uniformRaw("uPalette", "sampler2D");
export const uVoxels = uniformRaw("uVoxels", "usampler3D");
export const uResolution = uniformRaw("uResolution", "vec2");
export const uDimensions = uniformRaw("uDimensions", "vec3");
export const uVoxelCount = uniformRaw("uVoxelCount", "vec3");
export const uLightDir = uniformRaw("uLightDir", "vec3");
export const uLightColour = uniformRaw("uLightColour", "vec3");
export const uAmbientColour = uniformRaw("uAmbientColour", "vec3");
export const vUv = varying("vec2");
export const uCameraPosition = uniformRaw("uCameraPosition", "vec3");
export const uWorldToModel = uniformRaw("uWorldToModel", "mat3");
export const uUnlit = uniformRaw("uUnlit", "bool");

// Componentwise min/max of two vectors, expressed with abs since rmsl only
// types the scalar variants: (a + b +/- |a - b|) / 2
const minVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).sub(a.sub(b).abs()).mul(float(0.5));
const maxVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).add(a.sub(b).abs()).mul(float(0.5));
const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).sub(a.sub(b).abs()).mul(float(0.5));
const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).add(a.sub(b).abs()).mul(float(0.5));

// The voxel texture is an integer (usampler3D) so the lookup compiles to
// texelFetch, which takes integer texel coordinates — one texel per voxel.
// .texture() takes those integer texel coordinates directly, not a normalized
// [0,1] position, so a caller that already works in whole voxel indices
// fetches by them.
const sampleCell = (
  voxels: Node<"usampler3D">,
  cell: Node<"ivec3">,
): Node<"uvec4"> => voxels.texture(cell.toUVec3());

// The volume fills the whole grid (one texel per voxel), so a cell is inside
// the volume exactly when every index lies in [0, uVoxelCount).
const inBounds = (
  voxelCount: Node<"vec3">,
  cell: Node<"ivec3">,
): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(vec3(float(0)))
    .all()
    .and(c.lessThan(voxelCount).all());
};

// The ray is intersected with a box padded by one voxel on each side, so its
// start and exit land safely outside the volume instead of exactly on a wall
// face, where float error could put them on the wrong side. The DDA therefore
// walks from up to a cell or two outside, sampling only cells that are in the
// volume and stopping once it leaves the padded range.
const paddedInBounds = (
  voxelCount: Node<"vec3">,
  cell: Node<"ivec3">,
): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(vec3(float(-2)))
    .all()
    .and(c.lessThan(voxelCount.add(vec3(float(2)))).all());
};

const readFront = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.r.bitAnd(0b00011111);
};
const readBack = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.r
    .bitAnd(0b11100000)
    .shiftRight(5)
    .bitOr(voxel.g.bitAnd(0b00000011).shiftLeft(3));
};
const readLeft = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.g.bitAnd(0b01111100).shiftRight(2);
};
const readRight = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.g
    .bitAnd(0b10000000)
    .shiftRight(7)
    .bitOr(voxel.b.bitAnd(0b00001111).shiftLeft(1));
};
const readTop = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.b
    .bitAnd(0b11110000)
    .shiftRight(4)
    .bitOr(voxel.a.bitAnd(0b00000001).shiftLeft(4));
};
const readBottom = (voxel: Node<"uvec4">): Node<"uint"> => {
  return voxel.a.bitAnd(0b00111110).shiftRight(1);
};
const isSolid = (voxel: Node<"uvec4">): Node<"bool"> => {
  return voxel.a.bitAnd(0b11000000).notEqual(0);
};

const colourIndexToColour = (
  palette: Node<"sampler2D">,
  colourIndex: Node<"uint">,
): Node<"vec4"> => {
  // Sample the texel's centre: the palette is one row of 32 texels, so the
  // centre of texel i sits at (i + 0.5)/32.
  return palette.texture(
    vec2(
      colourIndex
        .toFloat()
        .div(32.0)
        .add(float(1.0 / 64.0)),
      float(0.5),
    ),
  );
};

export type MarchVolumeNodes = {
  rayOrigin: Node<"vec3">;
  rayDirection: Node<"vec3">;
  voxels: Node<"usampler3D">;
  palette: Node<"sampler2D">;
  dimensions: Node<"vec3">;
  voxelCount: Node<"vec3">;
  lightDir: Node<"vec3">;
  lightColour: Node<"vec3">;
  ambientColour: Node<"vec3">;
  unlit: Node<"bool">;
};

/**
 * Ray-march the voxel volume for a fragment, starting from `rayOrigin` along
 * `rayDirection` (both in model space). Shared by the GPU fragment shader (in
 * the scene-graph material) and the CPU voxel picker, so the two can never
 * drift apart. The ray is intersected with a box padded by one voxel on each
 * side and marched with a 3D DDA; rays that hit nothing leave `colour` at its
 * initial transparent black.
 */
export const marchVolume = (
  nodes: MarchVolumeNodes,
): {
  colour: Node<"vec4">;
  voxelPos: Node<"ivec3">;
  normal: Node<"vec3">;
  hitPoint: Node<"vec3">;
} => {
  const {
    rayOrigin: rayOriginIn,
    rayDirection: rayDirectionIn,
    voxels,
    palette,
    dimensions,
    voxelCount,
    lightDir,
    lightColour,
    ambientColour,
    unlit,
  } = nodes;

  const rayOrigin = rayOriginIn.toVar();
  const rayDirection = rayDirectionIn.toVar();

  const colour = vec4(float(0), float(0), float(0), float(0)).toVar();
  const voxelPos = ivec3(0, 0, 0).toVar();
  const normal = vec3(0, 0, 0).toVar();
  const hitPoint = vec3(0, 0, 0).toVar();

  const cellSize = dimensions.div(voxelCount).toVar();
  const boxMin = dimensions.mul(float(-0.5)).sub(cellSize).toVar();
  const boxMax = dimensions.mul(float(0.5)).add(cellSize).toVar();
  const inverseRayDirection = vec3(float(1)).div(rayDirection);

  const distanceToMinPlanes = inverseRayDirection
    .mul(boxMin.sub(rayOrigin))
    .toVar();
  const distanceToMaxPlanes = inverseRayDirection
    .mul(boxMax.sub(rayOrigin))
    .toVar();

  const nearPlaneDistances = minVec3(
    distanceToMinPlanes,
    distanceToMaxPlanes,
  ).toVar();
  const farPlaneDistances = maxVec3(
    distanceToMinPlanes,
    distanceToMaxPlanes,
  ).toVar();

  const nearPair = maxVec2(
    vec2(nearPlaneDistances.x, nearPlaneDistances.x),
    vec2(nearPlaneDistances.y, nearPlaneDistances.z),
  ).toVar();
  const entryDistance = nearPair.x.max(nearPair.y).toVar();

  const farPair = minVec2(
    vec2(farPlaneDistances.x, farPlaneDistances.x),
    vec2(farPlaneDistances.y, farPlaneDistances.z),
  ).toVar();
  const exitDistance = farPair.x.min(farPair.y).toVar();

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
    const deltaDist = vec3(float(1))
      .div(cellDir.abs().max(float(1e-6)))
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

    const hit = bool(false).toVar();
    For(
      () => int(0).toVar(),
      (i) => i.lessThan(maxSteps),
      (i) => i.assign(i.add(1)),
      () => {
        If(paddedInBounds(voxelCount, mapPos).not(), () => {
          Break();
        });
        If(inBounds(voxelCount, mapPos), () => {
          If(isSolid(sampleCell(voxels, mapPos)), () => {
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
      const voxel = sampleCell(voxels, mapPos);
      const faceColourIndex = uint(0).toVar();
      If(mask.x.notEqual(float(0)), () => {
        If(rayStep.x.greaterThan(0), () => {
          faceColourIndex.assign(readLeft(voxel));
        }).Else(() => {
          faceColourIndex.assign(readRight(voxel));
        });
      })
        .ElseIf(mask.y.notEqual(float(0)), () => {
          If(rayStep.y.greaterThan(0), () => {
            faceColourIndex.assign(readBottom(voxel));
          }).Else(() => {
            faceColourIndex.assign(readTop(voxel));
          });
        })
        .Else(() => {
          If(rayStep.z.greaterThan(0), () => {
            faceColourIndex.assign(readBack(voxel));
          }).Else(() => {
            faceColourIndex.assign(readFront(voxel));
          });
        });

      // The point where the ray crosses into the hit cell: the boundary plane
      // of the face it entered. Used by the GPU material to write an accurate
      // per-pixel fragment depth (so a line drawn on the voxel's surface is
      // neither hidden behind the box front face nor z-fighting it). The CPU
      // picker ignores it.
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

      If(unlit.toVar(), () => {
        colour.rgb.assign(colourIndexToColour(palette, faceColourIndex).rgb);
      }).Else(() => {
        normal.assign(mask.mul(rayStep.toVec3()).negate());
        const diffuse = normal.dot(lightDir).max(float(0));
        colour.rgb.assign(
          colourIndexToColour(palette, faceColourIndex).rgb.mul(
            ambientColour.add(lightColour.mul(diffuse)),
          ),
        );
      });
      colour.a.assign(float(1));
    });
  });
  // Rays that hit nothing leave colour at its initial transparent black, so
  // whatever is painted behind the canvas shows through there. Only rays that
  // land on a voxel set alpha to 1.
  return { colour, voxelPos, normal, hitPoint };
};

/**
 * The CPU voxel picker's ray: a pinhole camera at `uCameraPosition` looking
 * down -z with `FOCAL_LENGTH`, from the click's UV. `uWorldToModel` carries
 * the model's rotation, so the ray is followed in model space exactly like the
 * GPU marcher. The GPU path (VoxelPreviewMaterial) instead derives its ray
 * from the bounding box's interpolated model-space position, which matches
 * this formula when the camera's fov is 2 * atan(0.5).
 */
export const rayMarcher = () => {
  const fragmentCoord = vUv.mul(uResolution);
  const screenPosition = fragmentCoord
    .mul(float(2))
    .sub(uResolution)
    .div(uResolution.y);

  const rayOrigin = uWorldToModel.mul(uCameraPosition);
  const rayDirection = uWorldToModel.mul(
    vec3(screenPosition.x, screenPosition.y, float(-FOCAL_LENGTH)).normalize(),
  );

  return marchVolume({
    rayOrigin,
    rayDirection,
    voxels: uVoxels,
    palette: uPalette,
    dimensions: uDimensions,
    voxelCount: uVoxelCount,
    lightDir: uLightDir,
    lightColour: uLightColour,
    ambientColour: uAmbientColour,
    unlit: uUnlit,
  });
};

export const cpuVoxelPicker = Fn(() => {
  const { colour, voxelPos } = rayMarcher();
  If(colour.a.lessThan(float(0.5)), () => {
    voxelPos.assign(ivec3(-1, -1, -1));
  });
  return voxelPos;
});
