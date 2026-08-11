import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  For,
  If,
  attribute,
  boolean,
  break_,
  compileGLSL,
  float,
  mat3,
  uint,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

// This module is compiled once at build time by vite-precompile-shaders and
// replaced with JSON, so the rmsl graph is never built (and rmsl is never
// shipped) in the browser.
export default (() => {
  // Shared rmsl nodes. Created once so the generated slot names are the same in
  // both the vertex and fragment shaders.
  const uPalette = uniformRaw("uPalette", "sampler2D");
  const uVoxels = uniformRaw("uVoxels", "usampler3D");
  const uTime = uniformRaw("uTime", "float");
  const uResolution = uniformRaw("uResolution", "vec2");
  const uDimensions = uniformRaw("uDimensions", "vec3");
  const uVoxelCount = uniformRaw("uVoxelCount", "vec3");
  const uLightDir = uniformRaw("uLightDir", "vec3");
  const uLightColour = uniformRaw("uLightColour", "vec3");
  const uAmbientColour = uniformRaw("uAmbientColour", "vec3");
  const vUv = varying("vec2");
  const positionAttr = attribute("vec2");

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

  const rotationY = (angle: Node<"float">): Node<"mat3"> =>
    mat3(
      vec3(angle.cos(), float(0), angle.sin().negate()),
      vec3(float(0), float(1), float(0)),
      vec3(angle.sin(), float(0), angle.cos()),
    );

  // The voxel texture is an integer (usampler3D) so rmsl compiles the lookup
  // to texelFetch, which takes integer texel coordinates. The callers pass a
  // normalized [0,1] position, so scale it by the texel count per axis and
  // clamp, keeping the fetch on the last texel instead of running off the edge
  // when the point sits exactly on the far boundary of the volume.
  const sampleVoxels = (coordinate: Node<"vec3">): Node<"uvec4"> =>
    uVoxels.texture(
      coordinate.mult(uVoxelCount).clamp(vec3(float(0)), uVoxelCount.sub(vec3(float(1)))),
    );

  const readFront = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.r.bitAnd(0b00011111);
  };
  const readBack = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.r.bitAnd(0b11100000)
      .shiftRight(5)
      .bitOr(voxel.g.bitAnd(0b00000011).shiftLeft(3));
  };
  const readLeft = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.g.bitAnd(0b01111100).shiftRight(2);
  };
  const readRight = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.g.bitAnd(0b10000000).shiftRight(7)
      .bitOr(voxel.b.bitAnd(0b00001111).shiftLeft(1));
  };
  const readTop = (voxel: Node<"uvec4">): Node<"uint"> => {
    return voxel.b.bitAnd(0b11110000).shiftRight(4)
      .bitOr(voxel.a.bitAnd(0b00000001).shiftLeft(4));
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
      vec2(colourIndex.toFloat().div(32.0).add(float(1.0 / 64.0)), float(0.5)),
    );
  };

  const vertexFn = Fn(() => {
    vUv.assign(positionAttr.mult(vec2(0.5)).add(vec2(0.5)));
    return vec4(positionAttr, float(0), float(1));
  });

  // Port of fragment-sample.txt. The model is drawn by raymarching rather than by
  // turning voxels into triangles: the voxels live in a 3D texture (uVoxels, one
  // texel per voxel, alpha 1 where the model is solid) and this shader runs once
  // per pixel, asking "if I look through this pixel, what do I hit?".
  //
  // Each pixel works out the ray of sight leaving the camera through it, then
  // walks along that ray in small steps, sampling the texture at each step:
  //
  //   camera ---+----+----+----+----*      + = empty here, keep walking
  //                                        * = solid: shade the pixel and stop
  //
  // A pixel whose ray never hits anything keeps the background colour. Note this
  // stops at the first solid voxel; there is no blending of what lies behind it.
  const fragmentFn = Fn(() => {
    const time = uTime;

    // --- 1. Which ray of sight belongs to this pixel? ---

    // vUv is 0..1 across the canvas. Rescale to -1..1 with (0,0) in the centre,
    // dividing both axes by the height so the image is not stretched when the
    // canvas is not square.
    const fragmentCoord = vUv.mult(uResolution);
    const screenPosition = fragmentCoord.mult(float(2)).sub(uResolution).div(uResolution.y);

    // The model stays put and the camera orbits it, driven straight off the
    // clock. The camera sits 1.8 units back along -z and the rays fan out from it
    // through the screen; the z=2 below sets how wide that fan is, i.e. the field
    // of view. normalize() makes the direction exactly 1 unit long, so distances
    // along the ray are plain world units.
    const cameraRotation = rotationY(time);

    // rmsl has no vec3 * mat3, so rotate through the transpose (identical result).
    // Each of these is hoisted into a variable so the rotation matrix (and the
    // ray itself, used many times by the face test below) is built once instead
    // of being inlined at every use.
    const inverseCameraRotation = cameraRotation.transpose().toVar();
    const rayOrigin = inverseCameraRotation
      .multVec(vec3(float(0), float(0), float(-1.8)))
      .toVar();
    const rayDirection = inverseCameraRotation
      .multVec(vec3(screenPosition.x, screenPosition.y, float(2)).normalize())
      .toVar();

    // this pixel's output, black until something is hit
    const colour = vec4(float(0), float(0), float(0), float(0)).toVar();

    // --- 2. Where does the ray enter and leave the voxel box? ---

    // The voxels fill a box centred on the origin. Walking the whole ray would
    // spend most of its steps in empty space, so first trim it to the part that
    // is actually inside the box, using the standard "slab" test: treat the box
    // as three pairs of parallel planes (one pair per axis) and find how far
    // along the ray each of the six planes is crossed.
    //
    // The grid is rarely a cube, so the box is sized per axis by uDimensions:
    // the voxel counts divided by the largest of them, i.e. the longest axis
    // spans 1 unit and the others shrink in proportion. That keeps the model's
    // aspect ratio instead of stretching it to fill a cube, and it makes every
    // voxel an exact cube of side 1/maxCount in world space.
    //
    // IntersectBox, inlined since rmsl has no user functions or out params
    const boxMin = uDimensions.mult(float(-0.5)).toVar();
    const boxMax = uDimensions.mult(float(0.5)).toVar();

    // Crossing an axis-aligned plane happens at (plane - rayOrigin) / rayDirection,
    // so precompute the division once as a reciprocal to multiply by below.
    // pow(rayDirection, -1) is undefined in GLSL when a component is 0 (NaN at
    // the screen centre cross), so use the defined IEEE reciprocal instead
    const inverseRayDirection = vec3(float(1)).div(rayDirection);

    // ray distance at which each of the six box planes is crossed
    const distanceToMinPlanes = inverseRayDirection.mult(boxMin.sub(rayOrigin)).toVar();
    const distanceToMaxPlanes = inverseRayDirection.mult(boxMax.sub(rayOrigin)).toVar();

    // A ray pointing the other way crosses a pair of planes back to front, so sort
    // them per axis: which of the two the ray meets first, and which last.
    const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();
    const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();

    // Each axis gives a stretch of the ray that lies between that axis' two
    // planes. The ray is inside the cube only where all three stretches overlap:
    // from the last of the three entries to the first of the three exits.
    // (pairwise so two calls cover three axes)
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

    // If the entry lies past the exit the three stretches never overlap, meaning
    // the ray misses the cube entirely and this pixel stays background.
    If(entryDistance.lessThanEqual(exitDistance), () => {
      // --- 3. Walk the ray through the box until it hits something ---

      // How far to advance per step, in world units. Smaller catches thinner
      // details but costs a texture lookup per step, for every pixel, every frame.
      const stepSize = float(0.01);
      // The cell the ray occupied on the previous step, in whole voxel indices.
      // Comparing it with the cell at the current step tells us which face the
      // ray crossed to get here — the face is the boundary between the two
      // cells.  A sentinel far outside the volume guarantees the first solid
      // step inside always differs from it.  (voxel indices stay small, so a
      // large sentinel can never be mistaken for a real cell.)
      const prevCell = vec3(float(-1e9)).toVar();
      // rmsl's For mirrors a C for loop: start at the entry point, keep going
      // while still inside the box, advance one step, and run the body each time.
      For(
        () => entryDistance.toVar(),
        rayDistance => rayDistance.lessThan(exitDistance),
        rayDistance => {
          rayDistance.assign(rayDistance.add(stepSize));
        },
        rayDistance => {
          // where along the ray we currently stand
          const worldPosition = rayOrigin.add(rayDirection.mult(rayDistance)).toVar();
          // Guard against sampling outside the volume: the texture is set to
          // CLAMP_TO_EDGE, so a lookup past the edge keeps returning the outer
          // voxels and smears them into space. The bound is the box plus a hair
          // of slack, so rounding error on a grazing ray cannot reject a point
          // that genuinely is on the surface.
          const inside = worldPosition
            .greaterThan(boxMin.sub(vec3(float(0.01))))
            .all()
            .and(worldPosition.lessThan(boxMax.add(vec3(float(0.01)))).all());

          If(inside, () => {
            // the box spans -uDimensions/2..uDimensions/2, the texture 0..1
            const voxelCoord = worldPosition
              .div(uDimensions)
              .add(vec3(float(0.5)))
              .toVar();

            const voxel = sampleVoxels(voxelCoord).toVar();

            // alpha is 1 in a filled voxel and 0 in empty space, so anything past
            // the halfway mark counts as solid: this step hit the model.
            const voxelSolid = isSolid(voxel);

            // The whole-voxel cell this sample falls in, in voxel indices.
            // worldPosition is measured from the box centre, so a voxel's cell
            // edges run from -uDimensions/2 upward in steps of one voxel side;
            // dividing the offset-by-half-box position by the cell side gives a
            // coordinate in whole voxels.
            const cellSize = uDimensions.div(uVoxelCount).toVar();
            const curCell = worldPosition
              .add(uDimensions.mult(float(0.5)))
              .div(cellSize)
              .floor()
              .toVar();

            // Did the ray step into a new cell this step?  Face detection is
            // only meaningful at the moment of entry: it tells us which face
            // the ray crossed to get into the cell it is now in.  Marching
            // through the middle of a cell the ray is already inside, the face
            // to render was decided when it entered; re-evaluating it here
            // would pick a random near face and wrongly cull the surface.  The
            // sentinel prevCell (huge) differs from any real cell, so the first
            // solid step always counts as an entry.
            const moved = curCell.sub(prevCell);
            const enteredNewCell = moved.x
              .notEqual(float(0))
              .or(moved.y.notEqual(float(0)))
              .or(moved.z.notEqual(float(0)));

            If(voxelSolid.and(enteredNewCell), () => {
              // --- 4. Shade the hit ---

              // Which face did the ray cross? It is the boundary between the
              // cell the ray was in on the previous step and the cell it is in
              // now: the ray stepped across exactly one face to get here.
              // Which face depends on which axis the two cells differ on and in
              // which direction the ray moved along it.  Determining the face
              // this way is unambiguous even when the hit point sits right on a
              // voxel corner, where a fraction-based nearest-face test is not.

              const faceColourIndex = uint(0).toVar();
              const oneOverVoxelCount = vec3(float(1)).div(uVoxelCount).toVar();
              // Whether the chosen face is exterior (the voxel beyond it is
              // empty).  The moved-axis tests below already know this from the
              // adjXm/adjXp/… samples, so they set it directly; only the
              // nearest-face fallback has to check the neighbour itself.
              const shouldRender = boolean(false).toVar();

              // The ray moved +a to get here, so it entered through the cell's
              // min face (left / bottom / back); moved -a, through the max face
              // (right / top / front).  A step can cross two boundaries at once
              // (a diagonal step into a cell's corner), so several axes may
              // have moved — pick the face whose neighbour beyond it is empty,
              // i.e. the exterior surface of the model.  If every moved face
              // has a solid neighbour the ray crossed an interior face, and the
              // step is culled below.  On the first solid step there is no
              // previous cell (the sentinel differs on every axis by a huge
              // amount), so fall back to the nearest face behind the ray.
              const movedX = curCell.x.sub(prevCell.x);
              const movedY = curCell.y.sub(prevCell.y);
              const movedZ = curCell.z.sub(prevCell.z);
              const movedInX = movedX.abs().lessThan(float(2)).and(movedX.abs().greaterThan(float(0)));
              const movedInY = movedY.abs().lessThan(float(2)).and(movedY.abs().greaterThan(float(0)));
              const movedInZ = movedZ.abs().lessThan(float(2)).and(movedZ.abs().greaterThan(float(0)));

              // A face is exterior when the voxel beyond it is empty.  Only the
              // axes the ray actually moved on can be the one it crossed, so
              // each axis block samples its own neighbour and nothing else; the
              // first exterior face found (in X, Y, Z order, as before) is the
              // surface the ray came through.  If none is exterior the ray
              // crossed an interior face and the step is culled below.  On the
              // first solid step there is no previous cell (the sentinel differs
              // on every axis by a huge amount), so no axis counts as moved and
              // the nearest-face fallback below runs.
              const found = boolean(false).toVar();
              If(movedInX, () => {
                If(movedX.greaterThan(float(0)), () => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.sub(vec3(oneOverVoxelCount.x, float(0), float(0))))).not(),
                    () => {
                      faceColourIndex.assign(readLeft(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                }).else_(() => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.add(vec3(oneOverVoxelCount.x, float(0), float(0))))).not(),
                    () => {
                      faceColourIndex.assign(readRight(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                });
              });
              If(movedInY.and(found.not()), () => {
                If(movedY.greaterThan(float(0)), () => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.sub(vec3(float(0), oneOverVoxelCount.y, float(0))))).not(),
                    () => {
                      faceColourIndex.assign(readBottom(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                }).else_(() => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.add(vec3(float(0), oneOverVoxelCount.y, float(0))))).not(),
                    () => {
                      faceColourIndex.assign(readTop(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                });
              });
              If(movedInZ.and(found.not()), () => {
                If(movedZ.greaterThan(float(0)), () => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.sub(vec3(float(0), float(0), oneOverVoxelCount.z)))).not(),
                    () => {
                      faceColourIndex.assign(readBack(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                }).else_(() => {
                  If(
                    isSolid(sampleVoxels(voxelCoord.add(vec3(float(0), float(0), oneOverVoxelCount.z)))).not(),
                    () => {
                      faceColourIndex.assign(readFront(voxel));
                      found.assign(boolean(true));
                      shouldRender.assign(boolean(true));
                    },
                  );
                });
              });
              If(found.not(), () => {
                // No moved face has an empty neighbour: either the ray crossed
                // an interior face or this is the first solid step with no
                // previous cell.  For the first entry, the face is the nearest
                // one behind the ray: the cell's fraction is how far we sit from
                // its min faces, and the ray moving +a entered through the min
                // face, -a through the max face.  The neighbour beyond that face
                // must be checked here (unlike the moved-axis branches, which
                // already sampled it): if it is solid the face is interior and
                // the step is culled.
                const fraction = curCell.fract().toVar();
                const isNearMinX = rayDirection.x.greaterThan(float(0));
                const isNearMinY = rayDirection.y.greaterThan(float(0));
                const isNearMinZ = rayDirection.z.greaterThan(float(0));
                const tX = float(1)
                  .sub(fraction.x)
                  .mix(fraction.x, isNearMinX.toFloat())
                  .mult(cellSize.x)
                  .div(rayDirection.x.abs().max(float(0.000001)));
                const tY = float(1)
                  .sub(fraction.y)
                  .mix(fraction.y, isNearMinY.toFloat())
                  .mult(cellSize.y)
                  .div(rayDirection.y.abs().max(float(0.000001)));
                const tZ = float(1)
                  .sub(fraction.z)
                  .mix(fraction.z, isNearMinZ.toFloat())
                  .mult(cellSize.z)
                  .div(rayDirection.z.abs().max(float(0.000001)));
                If(tX.lessThanEqual(tY).and(tX.lessThanEqual(tZ)), () => {
                  If(isNearMinX, () => {
                    faceColourIndex.assign(readLeft(voxel));
                  }).else_(() => {
                    faceColourIndex.assign(readRight(voxel));
                  });
                }).elseIf(tY.lessThanEqual(tZ), () => {
                  If(isNearMinY, () => {
                    faceColourIndex.assign(readBottom(voxel));
                  }).else_(() => {
                    faceColourIndex.assign(readTop(voxel));
                  });
                }).else_(() => {
                  If(isNearMinZ, () => {
                    faceColourIndex.assign(readBack(voxel));
                  }).else_(() => {
                    faceColourIndex.assign(readFront(voxel));
                  });
                });

                // The chosen face is the one opposite the ray's movement on the
                // axis it crossed; sample its neighbour to learn whether it is
                // exterior.  At the volume edge the sample clamps to the border
                // voxel, so guard the bounds to avoid a false interior result.
                const isNearMin = vec3(
                  isNearMinX.toFloat(),
                  isNearMinY.toFloat(),
                  isNearMinZ.toFloat(),
                );
                const stepSign = isNearMin.mult(float(2)).sub(vec3(float(1)));
                const fallbackAdjacent = voxelCoord.sub(stepSign.mult(oneOverVoxelCount));
                const fallbackInBounds = fallbackAdjacent
                  .greaterThanEqual(vec3(float(0)))
                  .all()
                  .and(fallbackAdjacent.lessThanEqual(vec3(float(1))).all());
                shouldRender.assign(
                  fallbackInBounds.and(
                    isSolid(sampleVoxels(fallbackAdjacent)).not(),
                  ),
                );
              });

              If(shouldRender, () => {
                // A gradient normal from neighbouring voxels — central
                // differences on their solidity — so adjacent voxels of the
                // same colour blend into one surface instead of showing sharp
                // seams.
                const gXm = isSolid(
                  sampleVoxels(
                    voxelCoord.sub(vec3(oneOverVoxelCount.x, float(0), float(0))),
                  ),
                ).toFloat();
                const gXp = isSolid(
                  sampleVoxels(
                    voxelCoord.add(vec3(oneOverVoxelCount.x, float(0), float(0))),
                  ),
                ).toFloat();
                const gYm = isSolid(
                  sampleVoxels(
                    voxelCoord.sub(vec3(float(0), oneOverVoxelCount.y, float(0))),
                  ),
                ).toFloat();
                const gYp = isSolid(
                  sampleVoxels(
                    voxelCoord.add(vec3(float(0), oneOverVoxelCount.y, float(0))),
                  ),
                ).toFloat();
                const gZm = isSolid(
                  sampleVoxels(
                    voxelCoord.sub(vec3(float(0), float(0), oneOverVoxelCount.z)),
                  ),
                ).toFloat();
                const gZp = isSolid(
                  sampleVoxels(
                    voxelCoord.add(vec3(float(0), float(0), oneOverVoxelCount.z)),
                  ),
                ).toFloat();
                const normal = vec3(
                  gXm.sub(gXp),
                  gYm.sub(gYp),
                  gZm.sub(gZp),
                ).sub(rayDirection.mult(float(0.001))).normalize();

                // Diffuse (Lambert) shading: a surface is brightest when it faces
                // the light head-on and fades to nothing as it turns away, which is
                // what the dot product of the two directions gives. Clamped at 0 so
                // surfaces facing away are simply unlit rather than negative.
                const diffuse = normal.dot(uLightDir).max(float(0));

                // The face's own colour, dimmed by how much light reaches it. The
                // ambient term is the floor: light bouncing around the scene, so
                // unlit sides read as shadowed rather than pure black.
                colour.rgb.assign(
                  colourIndexToColour(faceColourIndex).rgb.mult(
                    uAmbientColour.add(uLightColour.mult(diffuse)),
                  ),
                );

                colour.a.assign(float(1));

                // First hit wins: stop walking, everything behind it is hidden.
                break_();
              });
            });

            // Remember which cell this step was in, so the next step can tell
            // which face it crossed by comparing cells.
            prevCell.assign(curCell);
          });
        },
      );
    });
    // Rays that hit nothing leave colour at its initial transparent black, so
    // whatever is painted behind the canvas shows through there. Only rays that
    // land on a voxel set alpha to 1.
    return colour;
  });
  return {
    uVoxels: uVoxels.name,
    uTime: uTime.name,
    uResolution: uResolution.name,
    uDimensions: uDimensions.name,
    uVoxelCount: uVoxelCount.name,
    uLightDir: uLightDir.name,
    uLightColour: uLightColour.name,
    uAmbientColour: uAmbientColour.name,
    uPalette: uPalette.name,
    vUv: vUv.name,
    positionAttr: positionAttr.name,
    vertexGLSL: compileGLSL.vertex(vertexFn()),
    fragmentGLSL: compileGLSL.fragment(fragmentFn()),
  };
})();
