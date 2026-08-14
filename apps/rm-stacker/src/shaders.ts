import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  attribute,
  boolean,
  break_,
  compileGLSL,
  float,
  for_,
  if_,
  int,
  ivec2,
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

const FOCAL_LENGTH = 2;

// The value a panel's cell holds where nothing has been drawn, matching
// `Bitmap.EMPTY`. Panels upload as single-channel integer textures of palette
// indices, so this travels to the shader as-is.
const EMPTY_CELL = 255;

// This module is compiled once at build time by vite-precompile-shaders and
// replaced with JSON, so the rmsl graph is never built (and rmsl is never
// shipped) in the browser.
export default (() => {
  // Shared rmsl nodes. Created once so the generated slot names are the same in
  // both the vertex and fragment shaders.
  const uPalette = uniformRaw("uPalette", "sampler2D");
  const uFront = uniformRaw("uFront", "usampler2D");
  const uBack = uniformRaw("uBack", "usampler2D");
  const uLeft = uniformRaw("uLeft", "usampler2D");
  const uRight = uniformRaw("uRight", "usampler2D");
  const uTop = uniformRaw("uTop", "usampler2D");
  const uBottom = uniformRaw("uBottom", "usampler2D");
  const uResolution = uniformRaw("uResolution", "vec2");
  const uDimensions = uniformRaw("uDimensions", "vec3");
  const uVoxelCount = uniformRaw("uVoxelCount", "vec3");
  // The same voxel count the ray marching arithmetic uses, in whole numbers, so
  // that the panel lookups below can index texels without converting on every
  // fetch.
  const uVoxelCountI = uniformRaw("uVoxelCountI", "ivec3");
  const uLightDir = uniformRaw("uLightDir", "vec3");
  const uLightColour = uniformRaw("uLightColour", "vec3");
  const uAmbientColour = uniformRaw("uAmbientColour", "vec3");
  const vUv = varying("vec2");
  const positionAttr = attribute("vec2");
  const uCameraPosition = uniformRaw("uCameraPosition", "vec3");
  const uWorldToModel = uniformRaw("uWorldToModel", "mat3");
  const uUnlit = uniformRaw("uUlit", "bool");

  // Componentwise min/max of two vectors, expressed with abs since rmsl only
  // types the scalar variants: (a + b +/- |a - b|) / 2
  const minVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
    a.add(b).sub(a.sub(b).abs()).mult(float(0.5));
  const maxVec2 = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
    a.add(b).add(a.sub(b).abs()).mult(float(0.5));
  const minVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
    a.add(b).sub(a.sub(b).abs()).mult(float(0.5));
  const maxVec3 = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
    a.add(b).add(a.sub(b).abs()).mult(float(0.5));

  // Where each panel looks when asked about a voxel. A panel sees the model
  // along one axis, so it fixes the other two coordinates, and the panels that
  // face each other read their shared axis from opposite ends. These six
  // mappings are the whole relationship between the drawing and the model.
  //
  // The panels are integer textures (usampler2D), so rmsl compiles the lookup
  // to texelFetch, which takes whole texel coordinates — one texel per cell —
  // rather than a normalized [0,1] position. Every caller below is already
  // working in whole voxel indices, so it fetches by them directly.
  const width = () => uVoxelCountI.x;
  const height = () => uVoxelCountI.y;
  const depth = () => uVoxelCountI.z;

  const cellFront = (cell: Node<"ivec3">): Node<"uint"> =>
    uFront.texture(ivec2(cell.x, height().sub(1).sub(cell.y)).toUVec2()).r;
  const cellBack = (cell: Node<"ivec3">): Node<"uint"> =>
    uBack.texture(ivec2(width().sub(1).sub(cell.x), height().sub(1).sub(cell.y)).toUVec2()).r;
  const cellLeft = (cell: Node<"ivec3">): Node<"uint"> =>
    uLeft.texture(ivec2(cell.z, height().sub(1).sub(cell.y)).toUVec2()).r;
  const cellRight = (cell: Node<"ivec3">): Node<"uint"> =>
    uRight.texture(ivec2(depth().sub(1).sub(cell.z), height().sub(1).sub(cell.y)).toUVec2()).r;
  const cellTop = (cell: Node<"ivec3">): Node<"uint"> =>
    uTop.texture(ivec2(cell.x, cell.z).toUVec2()).r;
  const cellBottom = (cell: Node<"ivec3">): Node<"uint"> =>
    uBottom.texture(ivec2(cell.x, depth().sub(1).sub(cell.z)).toUVec2()).r;

  const isDrawn = (colourIndex: Node<"uint">): Node<"bool"> =>
    colourIndex.notEqual(uint(EMPTY_CELL));

  // A voxel survives exactly when every panel has drawn on the cell facing it:
  // each panel erases the whole run of voxels behind a cell it left empty, so
  // one empty cell anywhere is enough to carve this voxel away. Nothing here
  // depends on neighbouring voxels, which is why the model needs no solving
  // pass ahead of the ray march.
  const isSolid = (cell: Node<"ivec3">): Node<"bool"> =>
    isDrawn(cellFront(cell))
      .and(isDrawn(cellBack(cell)))
      .and(isDrawn(cellLeft(cell)))
      .and(isDrawn(cellRight(cell)))
      .and(isDrawn(cellTop(cell)))
      .and(isDrawn(cellBottom(cell)));

  // The volume fills the whole grid (one texel per voxel), so a cell is inside
  // the volume exactly when every index lies in [0, uVoxelCount).
  const inBounds = (cell: Node<"ivec3">): Node<"bool"> => {
    const c = cell.toVec3();
    return c
      .greaterThanEqual(vec3(float(0)))
      .all()
      .and(c.lessThan(uVoxelCount).all());
  };

  // The ray is intersected with a box padded by one voxel on each side, so its
  // start and exit land safely outside the volume instead of exactly on a wall
  // face, where float error could put them on the wrong side. The DDA therefore
  // walks from up to a cell or two outside, sampling only cells that are in the
  // volume and stopping once it leaves the padded range.
  const paddedInBounds = (cell: Node<"ivec3">): Node<"bool"> => {
    const c = cell.toVec3();
    return c
      .greaterThanEqual(vec3(float(-2)))
      .all()
      .and(c.lessThan(uVoxelCount.add(vec3(float(2)))).all());
  };

  const colourIndexToColour = (colourIndex: Node<"uint">): Node<"vec4"> => {
    // Sample the texel's centre: the palette is one row of 32 texels, so the
    // centre of texel i sits at (i + 0.5)/32.
    return uPalette.texture(
      vec2(
        colourIndex
          .toFloat()
          .div(32.0)
          .add(float(1.0 / 64.0)),
        float(0.5),
      ),
    );
  };

  const vertexFn = Fn(() => {
    vUv.assign(positionAttr.mult(vec2(0.5)).add(vec2(0.5)));
    return vec4(positionAttr, float(0), float(1));
  });

  const fragmentFn = Fn(() => {
    const fragmentCoord = vUv.mult(uResolution);
    const screenPosition = fragmentCoord.mult(float(2)).sub(uResolution).div(uResolution.y);

    const rayOrigin = uWorldToModel.multVec(uCameraPosition).toVar();
    const rayDirection = uWorldToModel
      .multVec(vec3(screenPosition.x, screenPosition.y, float(-FOCAL_LENGTH)).normalize())
      .toVar();

    const colour = vec4(float(0), float(0), float(0), float(0)).toVar();

    const cellSize = uDimensions.div(uVoxelCount).toVar();
    const boxMin = uDimensions.mult(float(-0.5)).sub(cellSize).toVar();
    const boxMax = uDimensions.mult(float(0.5)).add(cellSize).toVar();
    const inverseRayDirection = vec3(float(1)).div(rayDirection);

    const distanceToMinPlanes = inverseRayDirection.mult(boxMin.sub(rayOrigin)).toVar();
    const distanceToMaxPlanes = inverseRayDirection.mult(boxMax.sub(rayOrigin)).toVar();

    const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();
    const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();

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

    if_(entryDistance.lessThanEqual(exitDistance), () => {
      const cellDir = rayDirection.div(cellSize).toVar();

      const entryPoint = rayOrigin.add(rayDirection.mult(entryDistance)).toVar();
      const cellOrigin = entryPoint
        .add(uDimensions.mult(float(0.5)))
        .div(cellSize)
        .add(cellDir.mult(float(0.001)))
        .toVar();

      const mapPos = cellOrigin.floor().toIVec3().toVar();
      const rayStep = rayDirection.sign().toIVec3().toVar();
      const deltaDist = vec3(float(1))
        .div(cellDir.abs().max(float(1e-6)))
        .toVar();
      const sideDist = rayStep
        .toVec3()
        .mult(mapPos.toVec3().sub(cellOrigin))
        .add(rayStep.toVec3().mult(float(0.5)).add(float(0.5)))
        .mult(deltaDist)
        .toVar();

      const mask = vec3(float(0)).toVar();

      if_(nearPlaneDistances.x.equal(entryDistance), () => {
        mask.assign(vec3(float(1), float(0), float(0)));
      })
        .elseIf(nearPlaneDistances.y.equal(entryDistance), () => {
          mask.assign(vec3(float(0), float(1), float(0)));
        })
        .else_(() => {
          mask.assign(vec3(float(0), float(0), float(1)));
        });

      const maxSteps = uVoxelCount.x
        .max(uVoxelCount.y)
        .max(uVoxelCount.z)
        .mult(float(3))
        .add(float(8))
        .toInt();

      const hit = boolean(false).toVar();
      for_(
        () => int(0).toVar(),
        i => i.lessThan(maxSteps),
        i => i.assign(i.add(1)),
        () => {
          if_(paddedInBounds(mapPos).not(), () => {
            break_();
          });
          if_(inBounds(mapPos), () => {
            if_(isSolid(mapPos), () => {
              hit.assign(boolean(true));
              break_();
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
          sideDist.assign(sideDist.add(mask.mult(deltaDist)));
          mapPos.assign(mapPos.add(mask.toIVec3().mult(rayStep)));
        },
      );
      if_(hit, () => {
        // The face the ray came in through takes its colour from the panel
        // looking at it. That cell is always drawn on, since an empty one would
        // have carved this voxel away, so there is no undrawn case to fall back
        // from.
        const faceColourIndex = uint(0).toVar();
        if_(mask.x.notEqual(float(0)), () => {
          if_(rayStep.x.greaterThan(0), () => {
            faceColourIndex.assign(cellLeft(mapPos));
          }).else_(() => {
            faceColourIndex.assign(cellRight(mapPos));
          });
        })
          .elseIf(mask.y.notEqual(float(0)), () => {
            if_(rayStep.y.greaterThan(0), () => {
              faceColourIndex.assign(cellBottom(mapPos));
            }).else_(() => {
              faceColourIndex.assign(cellTop(mapPos));
            });
          })
          .else_(() => {
            if_(rayStep.z.greaterThan(0), () => {
              faceColourIndex.assign(cellBack(mapPos));
            }).else_(() => {
              faceColourIndex.assign(cellFront(mapPos));
            });
          });

        if_(uUnlit.toVar(), () => {
          colour.rgb.assign(colourIndexToColour(faceColourIndex).rgb);
        }).else_(() => {
          const normal = mask.mult(rayStep.toVec3()).negate().toVar();
          const diffuse = normal.dot(uLightDir).max(float(0));
          colour.rgb.assign(
            colourIndexToColour(faceColourIndex).rgb.mult(
              uAmbientColour.add(uLightColour.mult(diffuse)),
            ),
          );
        });
        colour.a.assign(float(1));
      });
    });
    // Rays that hit nothing leave colour at its initial transparent black, so
    // whatever is painted behind the canvas shows through there. Only rays that
    // land on a voxel set alpha to 1.
    return colour;
  });
  return {
    uFront: uFront.name,
    uBack: uBack.name,
    uLeft: uLeft.name,
    uRight: uRight.name,
    uTop: uTop.name,
    uBottom: uBottom.name,
    uResolution: uResolution.name,
    uDimensions: uDimensions.name,
    uVoxelCount: uVoxelCount.name,
    uVoxelCountI: uVoxelCountI.name,
    uLightDir: uLightDir.name,
    uLightColour: uLightColour.name,
    uAmbientColour: uAmbientColour.name,
    uCameraPosition: uCameraPosition.name,
    uWorldToModel: uWorldToModel.name,
    uPalette: uPalette.name,
    vUv: vUv.name,
    positionAttr: positionAttr.name,
    uUnlit: uUnlit.name,
    vertexGLSL: compileGLSL.vertex(vertexFn()),
    fragmentGLSL: compileGLSL.fragment(fragmentFn()),
  };
})();
