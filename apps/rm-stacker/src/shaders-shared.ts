import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  bool,
  Break,
  float,
  For,
  If,
  int,
  ivec2,
  ivec3,
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

const FOCAL_LENGTH = 2;

// The value a panel's cell holds where nothing has been drawn, matching
// `Bitmap.EMPTY`. Panels upload as integer textures of palette indices, so this
// travels to the shader as-is.
const EMPTY_CELL = 255;

// Shared rmsl nodes. The slot names are the same in the CPU voxel picker and
// the GPU scene-graph material (both built from this module), so the two can
// never drift apart. shaders.ts ships the names to the app.
export const uPalette = uniformRaw("uPalette", "sampler2D");
export const uFrontBack = uniformRaw("uFrontBack", "usampler2D");
export const uLeftRight = uniformRaw("uLeftRight", "usampler2D");
export const uTopBottom = uniformRaw("uTopBottom", "usampler2D");
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

// Componentwise min/max of two vectors, one component at a time since rmsl only
// types the scalar variants. A ray aimed straight down an axis divides by zero
// on that axis, giving a plane distance of +/- infinity, so the components are
// compared rather than averaged: the shorthand (a + b +/- |a - b|) / 2 turns
// those infinities into NaN and loses the hit.
const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  vec3(a.x.min(b.x), a.y.min(b.y), a.z.min(b.z));
const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  vec3(a.x.max(b.x), a.y.max(b.y), a.z.max(b.z));

/**
 * The panels the model is drawn on, a pair to a texture. Panels that face each
 * other are the same size, so each pair travels in one integer texture: the near
 * panel's palette index in the red channel, the far one's in the green. One
 * lookup then answers for two panels, which is why the marcher consults three
 * textures rather than six.
 */
export type PanelPairs = {
  frontBack: Node<"usampler2D">;
  leftRight: Node<"usampler2D">;
  topBottom: Node<"usampler2D">;
};

/** The voxel count along each axis in whole numbers, for indexing texels. */
type Counts = {
  width: Node<"int">;
  height: Node<"int">;
  depth: Node<"int">;
};

/** The side of a voxel a ray can come in through. */
export type Face = "front" | "back" | "left" | "right" | "top" | "bottom";

/**
 * Everything the marcher needs to know about a cell: whether a voxel is there,
 * and what colour the face looking in a given direction has. Marching through
 * this rather than reading the textures directly keeps the walk independent of
 * how the drawing is stored. That separation is what let the storage layouts be
 * compared against each other; the benchmark on the voxel-solidity-benchmarks
 * branch plugs other ones in without touching a line of the marching.
 */
export type CellSource = {
  isSolid(counts: Counts, cell: Node<"ivec3">): Node<"bool">;
  faceColourIndex(counts: Counts, cell: Node<"ivec3">, face: Face): Node<"uint">;
};

// Where each pair looks when asked about a voxel. A panel sees the model along
// one axis, so it fixes the other two coordinates; the pair is addressed by the
// coordinates its near panel uses, and the far panel is stored already flipped
// into that same texel. These three mappings are the whole relationship between
// the drawing and the model.
//
// The pairs are integer textures (usampler2D), so .texture() compiles to
// texelFetch, which takes whole texel coordinates — one texel per cell — rather
// than a normalized [0,1] position. Every caller below is already working in
// whole voxel indices, so it fetches by them directly.
const frontBackCell = (pairs: PanelPairs, counts: Counts, cell: Node<"ivec3">): Node<"uvec4"> =>
  pairs.frontBack.texture(ivec2(cell.x, counts.height.sub(1).sub(cell.y)).toUVec2());
const leftRightCell = (pairs: PanelPairs, counts: Counts, cell: Node<"ivec3">): Node<"uvec4"> =>
  pairs.leftRight.texture(ivec2(cell.z, counts.height.sub(1).sub(cell.y)).toUVec2());
const topBottomCell = (pairs: PanelPairs, counts: Counts, cell: Node<"ivec3">): Node<"uvec4"> =>
  pairs.topBottom.texture(ivec2(cell.x, cell.z).toUVec2());

const isDrawn = (colourIndex: Node<"uint">): Node<"bool"> => colourIndex.notEqual(uint(EMPTY_CELL));

/** Reads the model off the three panel pairs. */
export const packedPairCellSource = (pairs: PanelPairs): CellSource => {
  const channel = {
    front: (counts: Counts, cell: Node<"ivec3">) => frontBackCell(pairs, counts, cell).r,
    back: (counts: Counts, cell: Node<"ivec3">) => frontBackCell(pairs, counts, cell).g,
    left: (counts: Counts, cell: Node<"ivec3">) => leftRightCell(pairs, counts, cell).r,
    right: (counts: Counts, cell: Node<"ivec3">) => leftRightCell(pairs, counts, cell).g,
    top: (counts: Counts, cell: Node<"ivec3">) => topBottomCell(pairs, counts, cell).r,
    bottom: (counts: Counts, cell: Node<"ivec3">) => topBottomCell(pairs, counts, cell).g,
  } satisfies Record<Face, (counts: Counts, cell: Node<"ivec3">) => Node<"uint">>;

  return {
    // A voxel survives exactly when every panel has drawn on the cell facing it:
    // each panel erases the whole run of voxels behind a cell it left empty, so
    // one empty cell anywhere is enough to carve this voxel away. Nothing here
    // depends on neighbouring voxels, which is why the model needs no solving
    // pass ahead of the ray march.
    isSolid: (counts, cell) => {
      const frontBack = frontBackCell(pairs, counts, cell);
      const leftRight = leftRightCell(pairs, counts, cell);
      const topBottom = topBottomCell(pairs, counts, cell);
      return isDrawn(frontBack.r)
        .and(isDrawn(frontBack.g))
        .and(isDrawn(leftRight.r))
        .and(isDrawn(leftRight.g))
        .and(isDrawn(topBottom.r))
        .and(isDrawn(topBottom.g));
    },
    faceColourIndex: (counts, cell, face) => channel[face](counts, cell),
  };
};

// The volume fills the whole grid (one texel per voxel), so a cell is inside
// the volume exactly when every index lies in [0, uVoxelCount).
const inBounds = (voxelCount: Node<"vec3">, cell: Node<"ivec3">): Node<"bool"> => {
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
const paddedInBounds = (voxelCount: Node<"vec3">, cell: Node<"ivec3">): Node<"bool"> => {
  const c = cell.toVec3();
  return c
    .greaterThanEqual(vec3(float(-2)))
    .all()
    .and(c.lessThan(voxelCount.add(vec3(float(2)))).all());
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
  cells: CellSource;
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
} => {
  const {
    rayOrigin: rayOriginIn,
    rayDirection: rayDirectionIn,
    cells,
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

  // The same voxel count the marching arithmetic uses, in whole numbers, so the
  // cell lookups can index texels without converting on every fetch.
  const voxelCountI = voxelCount.toIVec3().toVar();
  const counts: Counts = {
    width: voxelCountI.x,
    height: voxelCountI.y,
    depth: voxelCountI.z,
  };

  const cellSize = dimensions.div(voxelCount).toVar();
  const boxMin = dimensions.mul(float(-0.5)).sub(cellSize).toVar();
  const boxMax = dimensions.mul(float(0.5)).add(cellSize).toVar();
  const inverseRayDirection = vec3(float(1)).div(rayDirection);

  const distanceToMinPlanes = inverseRayDirection.mul(boxMin.sub(rayOrigin)).toVar();
  const distanceToMaxPlanes = inverseRayDirection.mul(boxMax.sub(rayOrigin)).toVar();

  const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();
  const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();

  // The ray is inside the box between the furthest of the three near planes and
  // the nearest of the three far planes.
  const entryDistance = nearPlaneDistances.x
    .max(nearPlaneDistances.y)
    .max(nearPlaneDistances.z)
    .toVar();
  const exitDistance = farPlaneDistances.x
    .min(farPlaneDistances.y)
    .min(farPlaneDistances.z)
    .toVar();

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
      i => i.lessThan(maxSteps),
      i => i.assign(i.add(1)),
      () => {
        If(paddedInBounds(voxelCount, mapPos).not(), () => {
          Break();
        });
        If(inBounds(voxelCount, mapPos), () => {
          If(cells.isSolid(counts, mapPos), () => {
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
      // The face the ray came in through takes its colour from the panel
      // looking at it. That cell is always drawn on, since an empty one would
      // have carved this voxel away, so there is no undrawn case to fall back
      // from.
      const faceColourIndex = uint(0).toVar();
      If(mask.x.notEqual(float(0)), () => {
        If(rayStep.x.greaterThan(0), () => {
          faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "left"));
        }).Else(() => {
          faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "right"));
        });
      })
        .ElseIf(mask.y.notEqual(float(0)), () => {
          If(rayStep.y.greaterThan(0), () => {
            faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "bottom"));
          }).Else(() => {
            faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "top"));
          });
        })
        .Else(() => {
          If(rayStep.z.greaterThan(0), () => {
            faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "back"));
          }).Else(() => {
            faceColourIndex.assign(cells.faceColourIndex(counts, mapPos, "front"));
          });
        });

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
  return { colour, voxelPos, normal };
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
  const screenPosition = fragmentCoord.mul(float(2)).sub(uResolution).div(uResolution.y);

  const rayOrigin = uWorldToModel.mul(uCameraPosition);
  const rayDirection = uWorldToModel.mul(
    vec3(screenPosition.x, screenPosition.y, float(-FOCAL_LENGTH)).normalize(),
  );

  return marchVolume({
    rayOrigin,
    rayDirection,
    cells: packedPairCellSource({
      frontBack: uFrontBack,
      leftRight: uLeftRight,
      topBottom: uTopBottom,
    }),
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
