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
export const uFront = uniformRaw("uFront", "usampler2D");
export const uBack = uniformRaw("uBack", "usampler2D");
export const uLeft = uniformRaw("uLeft", "usampler2D");
export const uRight = uniformRaw("uRight", "usampler2D");
export const uTop = uniformRaw("uTop", "usampler2D");
export const uBottom = uniformRaw("uBottom", "usampler2D");
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

/** The six panels the model is drawn on, one integer texture each. */
export type Panels = {
  front: Node<"usampler2D">;
  back: Node<"usampler2D">;
  left: Node<"usampler2D">;
  right: Node<"usampler2D">;
  top: Node<"usampler2D">;
  bottom: Node<"usampler2D">;
};

/** The voxel count along each axis in whole numbers, for indexing texels. */
export type Counts = {
  width: Node<"int">;
  height: Node<"int">;
  depth: Node<"int">;
};

// Where each panel looks when asked about a voxel. A panel sees the model along
// one axis, so it fixes the other two coordinates, and the panels that face each
// other read their shared axis from opposite ends. These six mappings are the
// whole relationship between the drawing and the model.
//
// The panels are integer textures (usampler2D), so .texture() compiles to
// texelFetch, which takes whole texel coordinates — one texel per cell — rather
// than a normalized [0,1] position. Every caller below is already working in
// whole voxel indices, so it fetches by them directly.
const cellFront = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.front.texture(ivec2(cell.x, counts.height.sub(1).sub(cell.y)).toUVec2()).r;
const cellBack = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.back.texture(
    ivec2(counts.width.sub(1).sub(cell.x), counts.height.sub(1).sub(cell.y)).toUVec2(),
  ).r;
const cellLeft = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.left.texture(ivec2(cell.z, counts.height.sub(1).sub(cell.y)).toUVec2()).r;
const cellRight = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.right.texture(
    ivec2(counts.depth.sub(1).sub(cell.z), counts.height.sub(1).sub(cell.y)).toUVec2(),
  ).r;
const cellTop = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.top.texture(ivec2(cell.x, cell.z).toUVec2()).r;
const cellBottom = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"uint"> =>
  panels.bottom.texture(ivec2(cell.x, counts.depth.sub(1).sub(cell.z)).toUVec2()).r;

const isDrawn = (colourIndex: Node<"uint">): Node<"bool"> => colourIndex.notEqual(uint(EMPTY_CELL));

// A voxel survives exactly when every panel has drawn on the cell facing it:
// each panel erases the whole run of voxels behind a cell it left empty, so one
// empty cell anywhere is enough to carve this voxel away. Nothing here depends
// on neighbouring voxels, which is why the model needs no solving pass ahead of
// the ray march.
const isSolid = (panels: Panels, counts: Counts, cell: Node<"ivec3">): Node<"bool"> =>
  isDrawn(cellFront(panels, counts, cell))
    .and(isDrawn(cellBack(panels, counts, cell)))
    .and(isDrawn(cellLeft(panels, counts, cell)))
    .and(isDrawn(cellRight(panels, counts, cell)))
    .and(isDrawn(cellTop(panels, counts, cell)))
    .and(isDrawn(cellBottom(panels, counts, cell)));

/** The side of a voxel a ray can come in through. */
export type Face = "front" | "back" | "left" | "right" | "top" | "bottom";

/**
 * Everything the marcher needs to know about a cell: whether a voxel is there,
 * and what colour the face looking in a given direction has. Asking through
 * this rather than reading the panels directly keeps the marching identical
 * however the answers are arrived at.
 */
export type CellSource = {
  isSolid(counts: Counts, cell: Node<"ivec3">): Node<"bool">;
  faceColourIndex(counts: Counts, cell: Node<"ivec3">, face: Face): Node<"uint">;
};

const PANEL_CELL = {
  front: cellFront,
  back: cellBack,
  left: cellLeft,
  right: cellRight,
  top: cellTop,
  bottom: cellBottom,
} satisfies Record<Face, (panels: Panels, counts: Counts, cell: Node<"ivec3">) => Node<"uint">>;

/** Reads the model straight off the six panels, asking each one in turn. */
export const panelCellSource = (panels: Panels): CellSource => ({
  isSolid: (counts, cell) => isSolid(panels, counts, cell),
  faceColourIndex: (counts, cell, face) => PANEL_CELL[face](panels, counts, cell),
});

/**
 * The same six panels, but asking only three of them whether a voxel is there.
 * Panels that face each other are drawn on in the same places — writing a cell
 * fills the cell facing it and erasing a cell erases that one too — so a panel
 * and its opposite always agree about which cells are empty, and asking one of
 * each pair is asking all six. Face colours still come from the panel that
 * looks at the face, which the pair does not share.
 */
export const mirroredPanelCellSource = (panels: Panels): CellSource => ({
  isSolid: (counts, cell) =>
    isDrawn(cellFront(panels, counts, cell))
      .and(isDrawn(cellLeft(panels, counts, cell)))
      .and(isDrawn(cellTop(panels, counts, cell))),
  faceColourIndex: (counts, cell, face) => PANEL_CELL[face](panels, counts, cell),
});

/**
 * Panels that face each other are the same size, so each pair travels in one
 * texture: the near panel in the red channel, the far one in the green. One
 * lookup then answers for two panels, which halves the lookups a cell costs
 * without assuming the two panels agree about anything.
 */
export type PanelPairs = {
  frontBack: Node<"usampler2D">;
  leftRight: Node<"usampler2D">;
  topBottom: Node<"usampler2D">;
};

export const packedPairCellSource = (pairs: PanelPairs): CellSource => {
  // Each pair is addressed by the coordinates its near panel uses; the far
  // panel of the pair is stored already flipped into that same cell, so one
  // fetch lands both.
  const frontBack = (counts: Counts, cell: Node<"ivec3">) =>
    pairs.frontBack.texture(ivec2(cell.x, counts.height.sub(1).sub(cell.y)).toUVec2());
  const leftRight = (counts: Counts, cell: Node<"ivec3">) =>
    pairs.leftRight.texture(ivec2(cell.z, counts.height.sub(1).sub(cell.y)).toUVec2());
  const topBottom = (counts: Counts, cell: Node<"ivec3">) =>
    pairs.topBottom.texture(ivec2(cell.x, cell.z).toUVec2());

  const channel = {
    front: (counts: Counts, cell: Node<"ivec3">) => frontBack(counts, cell).r,
    back: (counts: Counts, cell: Node<"ivec3">) => frontBack(counts, cell).g,
    left: (counts: Counts, cell: Node<"ivec3">) => leftRight(counts, cell).r,
    right: (counts: Counts, cell: Node<"ivec3">) => leftRight(counts, cell).g,
    top: (counts: Counts, cell: Node<"ivec3">) => topBottom(counts, cell).r,
    bottom: (counts: Counts, cell: Node<"ivec3">) => topBottom(counts, cell).g,
  } satisfies Record<Face, (counts: Counts, cell: Node<"ivec3">) => Node<"uint">>;

  return {
    isSolid: (counts, cell) => {
      const first = frontBack(counts, cell);
      const second = leftRight(counts, cell);
      const third = topBottom(counts, cell);
      return isDrawn(first.r)
        .and(isDrawn(first.g))
        .and(isDrawn(second.r))
        .and(isDrawn(second.g))
        .and(isDrawn(third.r))
        .and(isDrawn(third.g));
    },
    faceColourIndex: (counts, cell, face) => channel[face](counts, cell),
  };
};

/**
 * The same three pairs, but with each pair's texel read into a variable before
 * the six channels are tested, so the generated shader issues three texture
 * fetches rather than six.
 *
 * Reading `.r` and `.g` off the node twice expands to two identical fetches,
 * because the node graph is written out as a tree rather than shared. Against
 * that, the chain of `&&` short-circuits: a cell whose first panel is empty
 * never reaches the later fetches, and a ray crossing empty space meets a lot of
 * those. Hoisting trades that saving for issuing all three fetches at once,
 * which is worth measuring rather than assuming either way.
 */
export const packedPairHoistedCellSource = (pairs: PanelPairs): CellSource => {
  const source = packedPairCellSource(pairs);
  return {
    isSolid: (counts, cell) => {
      const frontBack = pairs.frontBack
        .texture(ivec2(cell.x, counts.height.sub(1).sub(cell.y)).toUVec2())
        .toVar();
      const leftRight = pairs.leftRight
        .texture(ivec2(cell.z, counts.height.sub(1).sub(cell.y)).toUVec2())
        .toVar();
      const topBottom = pairs.topBottom.texture(ivec2(cell.x, cell.z).toUVec2()).toVar();
      return isDrawn(frontBack.r)
        .and(isDrawn(frontBack.g))
        .and(isDrawn(leftRight.r))
        .and(isDrawn(leftRight.g))
        .and(isDrawn(topBottom.r))
        .and(isDrawn(topBottom.g));
    },
    faceColourIndex: source.faceColourIndex,
  };
};

/**
 * Reads whether a voxel is there from a volume solved ahead of the march and
 * held in a 3D texture, one texel per voxel. Face colours still come from the
 * panels, which the solved volume does not carry.
 */
export const volumeCellSource = (volume: Node<"usampler3D">, panels: Panels): CellSource => ({
  isSolid: (_counts, cell) => volume.texture(cell.toUVec3()).r.notEqual(uint(0)),
  faceColourIndex: (counts, cell, face) => PANEL_CELL[face](panels, counts, cell),
});

/**
 * The arrangement that came before the panels: a volume solved on the CPU into
 * a 3D texture, each voxel carrying all six of its face colours packed into its
 * four bytes as five-bit palette indices, and marked solid by the top two bits
 * of the alpha byte. One lookup answers both questions, at the cost of the
 * unpacking below and of a CPU pass over every voxel on every edit.
 *
 * Kept here to be measured, not to be used.
 */
export const legacyVolumeCellSource = (volume: Node<"usampler3D">): CellSource => {
  const unpack = {
    front: (voxel: Node<"uvec4">) => voxel.r.bitAnd(0b00011111),
    back: (voxel: Node<"uvec4">) =>
      voxel.r.bitAnd(0b11100000).shiftRight(5).bitOr(voxel.g.bitAnd(0b00000011).shiftLeft(3)),
    left: (voxel: Node<"uvec4">) => voxel.g.bitAnd(0b01111100).shiftRight(2),
    right: (voxel: Node<"uvec4">) =>
      voxel.g.bitAnd(0b10000000).shiftRight(7).bitOr(voxel.b.bitAnd(0b00001111).shiftLeft(1)),
    top: (voxel: Node<"uvec4">) =>
      voxel.b.bitAnd(0b11110000).shiftRight(4).bitOr(voxel.a.bitAnd(0b00000001).shiftLeft(4)),
    bottom: (voxel: Node<"uvec4">) => voxel.a.bitAnd(0b00111110).shiftRight(1),
  } satisfies Record<Face, (voxel: Node<"uvec4">) => Node<"uint">>;

  return {
    isSolid: (_counts, cell) => volume.texture(cell.toUVec3()).a.bitAnd(0b11000000).notEqual(0),
    faceColourIndex: (_counts, cell, face) => unpack[face](volume.texture(cell.toUVec3())),
  };
};

/**
 * The same solved volume as the atlas, but with the z-slices stacked in a single
 * column rather than spread across a grid. Stacking them means the slice a voxel
 * is in *is* its z, so finding its texel is one multiply-add — where a grid has
 * to divide z by the tiles per row to work out which row of tiles it landed in,
 * and an integer division by a value only known at runtime is expensive enough
 * to matter when it happens on every step of every ray.
 */
export const columnCellSource = (atlas: Node<"usampler2D">, panels: Panels): CellSource => ({
  isSolid: (counts, cell) =>
    atlas
      .texture(ivec2(cell.x, cell.z.mul(counts.height).add(cell.y)).toUVec2())
      .r.notEqual(uint(0)),
  faceColourIndex: (counts, cell, face) => PANEL_CELL[face](panels, counts, cell),
});

/**
 * Reads whether a voxel is there from a volume solved ahead of the march, laid
 * out as a grid of z-slices in one texture: slice `z` sits at column `z % tiles`
 * and row `z / tiles` of that grid. Face colours still come from the panels,
 * which the solved volume does not carry.
 */
export const atlasCellSource = (
  atlas: Node<"usampler2D">,
  tilesPerRow: Node<"int">,
  panels: Panels,
): CellSource => ({
  isSolid: (counts, cell) => {
    const tile = cell.z.div(tilesPerRow);
    const column = cell.z.sub(tile.mul(tilesPerRow));
    return atlas.texture(
      ivec2(column.mul(counts.width).add(cell.x), tile.mul(counts.height).add(cell.y)).toUVec2(),
    ).r.notEqual(uint(0));
  },
  faceColourIndex: (counts, cell, face) => PANEL_CELL[face](panels, counts, cell),
});

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
  // panel lookups can index texels without converting on every fetch.
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
    cells: panelCellSource({
      front: uFront,
      back: uBack,
      left: uLeft,
      right: uRight,
      top: uTop,
      bottom: uBottom,
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
