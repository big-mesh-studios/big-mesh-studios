import type { Node } from "@random-mesh/rmsl";
import {
  Fn,
  For,
  If,
  attribute,
  break_,
  compileGLSL,
  float,
  mat3,
  uniformRaw,
  varying,
  vec2,
  vec3,
  vec4,
} from "@random-mesh/rmsl";

// This module is compiled once at build time by vite-precompile-shaders and
// replaced with JSON, so the rmsl graph is never built (and rmsl is never
// shipped) in the browser. The uniform nodes below survive that round trip:
// JSON.stringify keeps their plain data (name, _t, type) and drops their
// operator methods, which is exactly what rmsl/webgl's set() needs and all
// it needs — so the nodes are exported directly rather than just .name.
export default (() => {
  // Shared rmsl nodes. Created once so the generated slot names are the same in
  // both the vertex and fragment shaders.
  const uVoxels = uniformRaw("uVoxels", "sampler3D");
  const uTime = uniformRaw("uTime", "float");
  const uResolution = uniformRaw("uResolution", "vec2");
  const uDimensions = uniformRaw("uDimensions", "vec3");
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

  // rmsl has no sampler3D type, so the texture() call is untyped here; the
  // generated sampler2D declaration is patched to sampler3D after compiling.
  const sampleVoxels = (coordinate: Node<"vec3">): Node<"vec4"> =>
    (uVoxels as any).texture(coordinate) as Node<"vec4">;

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

    // rmsl has no vec3 * mat3, so rotate through the transpose (identical result)
    const rayOrigin = cameraRotation.transpose().multVec(vec3(float(0), float(0), float(-1.8)));
    const rayDirection = cameraRotation
      .transpose()
      .multVec(vec3(screenPosition.x, screenPosition.y, float(2)).normalize());

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
      // How far to step aside when measuring the alpha-gradient normal below.
      // The step is a world-space distance, but the sampling happens in texture
      // space, where each axis is stretched to 0..1 regardless of how many
      // voxels it holds, so divide it per axis to undo that stretch. Without
      // this the gradient is measured over different distances per axis and the
      // normals of a non-cubic model come out tilted.
      const gradientStep = vec3(float(0.015625)).div(uDimensions).toVar();
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
            If(voxel.a.greaterThan(float(0.5)), () => {
              // --- 4. Shade the hit ---

              // Lighting needs to know which way the surface faces, but a voxel
              // grid stores no normals. Since alpha is 1 inside the model and 0
              // outside, it falls off sharply exactly at the surface, and the
              // direction of that fall-off is the direction the surface faces.
              // Measure it per axis by sampling a little to each side and taking
              // the difference (central differences), before minus after so the
              // result points from solid out into empty space.
              const alphaGradient = vec3(
                sampleVoxels(voxelCoord.sub(vec3(gradientStep.x, float(0), float(0)))).a.sub(
                  sampleVoxels(voxelCoord.add(vec3(gradientStep.x, float(0), float(0)))).a,
                ),
                sampleVoxels(voxelCoord.sub(vec3(float(0), gradientStep.y, float(0)))).a.sub(
                  sampleVoxels(voxelCoord.add(vec3(float(0), gradientStep.y, float(0)))).a,
                ),
                sampleVoxels(voxelCoord.sub(vec3(float(0), float(0), gradientStep.z))).a.sub(
                  sampleVoxels(voxelCoord.add(vec3(float(0), float(0), gradientStep.z))).a,
                ),
              );

              // The tiny view-direction term is a safety net: where the gradient
              // is zero or very weak (e.g. a surface sitting on the very edge of
              // the volume) normalize() would divide by zero and give a NaN
              // normal, so nudge it towards the camera to keep it valid.
              const normal = alphaGradient.sub(rayDirection.mult(float(0.001))).normalize();

              // Diffuse (Lambert) shading: a surface is brightest when it faces
              // the light head-on and fades to nothing as it turns away, which is
              // what the dot product of the two directions gives. Clamped at 0 so
              // surfaces facing away are simply unlit rather than negative.
              const diffuse = normal.dot(uLightDir).max(float(0));

              // The voxel's own colour, dimmed by how much light reaches it. The
              // ambient term is the floor: light bouncing around the scene, so
              // unlit sides read as shadowed rather than pure black.
              colour.rgb.assign(voxel.rgb.mult(uAmbientColour.add(uLightColour.mult(diffuse))));

              colour.a.assign(float(1));

              // First hit wins: stop walking, everything behind it is hidden.
              break_();
            });
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
    uVoxels,
    uTime,
    uResolution,
    uDimensions,
    uLightDir,
    uLightColour,
    uAmbientColour,
    vUv: vUv.name,
    positionAttr: positionAttr.name,
    vertexGLSL: compileGLSL.vertex(vertexFn()),
    fragmentGLSL: compileGLSL.fragment(fragmentFn()),
  };
})();
