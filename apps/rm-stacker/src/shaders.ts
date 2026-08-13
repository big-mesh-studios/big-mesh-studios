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
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

const FOCAL_LENGTH = 2;

// This module is compiled once at build time by vite-precompile-shaders and
// replaced with JSON, so the rmsl graph is never built (and rmsl is never
// shipped) in the browser.
export default (() => {
  // Shared rmsl nodes. Created once so the generated slot names are the same in
  // both the vertex and fragment shaders.
  const uPalette = uniformRaw("uPalette", "sampler2D");
  const uVoxels = uniformRaw("uVoxels", "usampler3D");
  const uResolution = uniformRaw("uResolution", "vec2");
  const uDimensions = uniformRaw("uDimensions", "vec3");
  const uVoxelCount = uniformRaw("uVoxelCount", "vec3");
  const uLightDir = uniformRaw("uLightDir", "vec3");
  const uLightColour = uniformRaw("uLightColour", "vec3");
  const uAmbientColour = uniformRaw("uAmbientColour", "vec3");
  const vUv = varying("vec2");
  const positionAttr = attribute("vec2");
  const uCameraPosition = uniformRaw("uCameraPosition", "vec3");
  const uWorldToModel = uniformRaw("uWorldToModel", "mat3");

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

  // The voxel texture is an integer (usampler3D) so rmsl compiles the lookup
  // to texelFetch, which takes integer texel coordinates — one texel per voxel.
  // rmsl's .texture() call takes those texel coordinates as floats, not a
  // normalized [0,1] position, so a caller that already works in whole voxel
  // indices fetches by them directly.
  const sampleCell = (cell: Node<"ivec3">): Node<"uvec4"> => uVoxels.texture(cell.toVec3());

  // The volume fills the whole grid (one texel per voxel), so a cell is inside
  // the volume exactly when every index lies in [0, uVoxelCount).
  const inBounds = (cell: Node<"ivec3">): Node<"bool"> => {
    const c = cell.toVec3();
    return c
      .greaterThanEqual(vec3(float(0)))
      .all()
      .and(c.lessThan(uVoxelCount).all());
  };

  const readFront = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.r.bitAnd(0b00011111);
  };
  const readBack = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.r.bitAnd(0b11100000).shiftRight(5).bitOr(voxel.g.bitAnd(0b00000011).shiftLeft(3));
  };
  const readLeft = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.g.bitAnd(0b01111100).shiftRight(2);
  };
  const readRight = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.g.bitAnd(0b10000000).shiftRight(7).bitOr(voxel.b.bitAnd(0b00001111).shiftLeft(1));
  };
  const readTop = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.b.bitAnd(0b11110000).shiftRight(4).bitOr(voxel.a.bitAnd(0b00000001).shiftLeft(4));
  };
  const readBottom = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.a.bitAnd(0b00111110).shiftRight(1);
  };
  const isSolid = (voxel: Node<"uvec4">): Node<"bool"> => {
    return voxel.a.bitAnd(0b11000000).notEqual(0);
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

    const boxMin = uDimensions.mult(float(-0.5)).toVar();
    const boxMax = uDimensions.mult(float(0.5)).toVar();
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
      const cellSize = uDimensions.div(uVoxelCount).toVar();
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
          if_(inBounds(mapPos).not(), () => {
            break_();
          });
          if_(isSolid(sampleCell(mapPos)), () => {
            hit.assign(boolean(true));
            break_();
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
        const voxel = sampleCell(mapPos);
        const faceColourIndex = uint(0).toVar();
        if_(mask.x.notEqual(float(0)), () => {
          if_(rayStep.x.greaterThan(0), () => {
            faceColourIndex.assign(readLeft(voxel));
          }).else_(() => {
            faceColourIndex.assign(readRight(voxel));
          });
        })
          .elseIf(mask.y.notEqual(float(0)), () => {
            if_(rayStep.y.greaterThan(0), () => {
              faceColourIndex.assign(readBottom(voxel));
            }).else_(() => {
              faceColourIndex.assign(readTop(voxel));
            });
          })
          .else_(() => {
            if_(rayStep.z.greaterThan(0), () => {
              faceColourIndex.assign(readBack(voxel));
            }).else_(() => {
              faceColourIndex.assign(readFront(voxel));
            });
          });

        const normal = mask.mult(rayStep.toVec3()).negate().toVar();
        const diffuse = normal.dot(uLightDir).max(float(0));
        colour.rgb.assign(
          colourIndexToColour(faceColourIndex).rgb.mult(
            uAmbientColour.add(uLightColour.mult(diffuse)),
          ),
        );
        colour.a.assign(float(1));
      });
    });
    // Rays that hit nothing leave colour at its initial transparent black, so
    // whatever is painted behind the canvas shows through there. Only rays that
    // land on a voxel set alpha to 1.
    return colour;
  });
  return {
    uVoxels: uVoxels.name,
    uResolution: uResolution.name,
    uDimensions: uDimensions.name,
    uVoxelCount: uVoxelCount.name,
    uLightDir: uLightDir.name,
    uLightColour: uLightColour.name,
    uAmbientColour: uAmbientColour.name,
    uCameraPosition: uCameraPosition.name,
    uWorldToModel: uWorldToModel.name,
    uPalette: uPalette.name,
    vUv: vUv.name,
    positionAttr: positionAttr.name,
    vertexGLSL: compileGLSL.vertex(vertexFn()),
    fragmentGLSL: compileGLSL.fragment(fragmentFn()),
  };
})();
