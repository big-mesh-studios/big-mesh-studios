import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  attribute,
  Break,
  compileGLSL,
  float,
  For,
  If,
  int,
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
  bool,
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
  const uUnlit = uniformRaw("uUlit", "bool");

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

  // The voxel texture is an integer (usampler3D) so rmsl compiles the lookup
  // to texelFetch, which takes integer texel coordinates — one texel per voxel.
  // rmsl's .texture() call takes those integer texel coordinates directly, not
  // a normalized [0,1] position, so a caller that already works in whole voxel
  // indices fetches by them.
  const sampleCell = (cell: Node<"ivec3">): Node<"uvec4"> => uVoxels.texture(cell.toUVec3());

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
    vUv.assign(positionAttr.mul(vec2(0.5)).add(vec2(0.5)));
    return vec4(positionAttr, float(0), float(1));
  });

  const fragmentFn = Fn(() => {
    const fragmentCoord = vUv.mul(uResolution);
    const screenPosition = fragmentCoord.mul(float(2)).sub(uResolution).div(uResolution.y);

    const rayOrigin = uWorldToModel.mul(uCameraPosition).toVar();
    const rayDirection = uWorldToModel
      .mul(vec3(screenPosition.x, screenPosition.y, float(-FOCAL_LENGTH)).normalize())
      .toVar();

    const colour = vec4(float(0), float(0), float(0), float(0)).toVar();

    const cellSize = uDimensions.div(uVoxelCount).toVar();
    const boxMin = uDimensions.mul(float(-0.5)).sub(cellSize).toVar();
    const boxMax = uDimensions.mul(float(0.5)).add(cellSize).toVar();
    const inverseRayDirection = vec3(float(1)).div(rayDirection);

    const distanceToMinPlanes = inverseRayDirection.mul(boxMin.sub(rayOrigin)).toVar();
    const distanceToMaxPlanes = inverseRayDirection.mul(boxMax.sub(rayOrigin)).toVar();

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

    If(entryDistance.lessThanEqual(exitDistance), () => {
      const cellDir = rayDirection.div(cellSize).toVar();

      const entryPoint = rayOrigin.add(rayDirection.mul(entryDistance)).toVar();
      const cellOrigin = entryPoint
        .add(uDimensions.mul(float(0.5)))
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

      const maxSteps = uVoxelCount.x
        .max(uVoxelCount.y)
        .max(uVoxelCount.z)
        .mul(float(3))
        .add(float(8))
        .toInt();

      const hit = bool(false).toVar();
      For(
        () => int(0).toVar(),
        i => i.lessThan(maxSteps),
        i => i.assign(i.add(1)),
        () => {
          If(paddedInBounds(mapPos).not(), () => {
            Break();
          });
          If(inBounds(mapPos), () => {
            If(isSolid(sampleCell(mapPos)), () => {
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
        const voxel = sampleCell(mapPos);
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

        If(uUnlit.toVar(), () => {
          colour.rgb.assign(colourIndexToColour(faceColourIndex).rgb);
        }).Else(() => {
          const normal = mask.mul(rayStep.toVec3()).negate().toVar();
          const diffuse = normal.dot(uLightDir).max(float(0));
          colour.rgb.assign(
            colourIndexToColour(faceColourIndex).rgb.mul(
              uAmbientColour.add(uLightColour.mul(diffuse)),
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
    uUnlit: uUnlit.name,
    vertexGLSL: compileGLSL.vertex(vertexFn()),
    fragmentGLSL: compileGLSL.fragment(fragmentFn()),
  };
})();
