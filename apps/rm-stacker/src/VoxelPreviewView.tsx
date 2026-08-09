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
import {
  Component,
  createMemo,
  createSignal,
  createTrackedEffect,
  flush,
  onSettled,
  useContext,
} from "solid-js";
import { StackerContext } from "./stacker-context";
import { normalizeDimensions, tryCatch } from "./utils";

// Shared rmsl nodes. Created once so the generated slot names are the same in
// both the vertex and fragment shaders.
const uVoxels = uniformRaw("uVoxels", "sampler2D");
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
  // Rays that hit nothing leave colour at its initial black, which is the
  // background. Alpha is forced to 1 since the canvas itself is opaque.
  return vec4(colour.rgb, float(1));
});

let vertexGLSL = compileGLSL.vertex(vertexFn());
let fragmentGLSL = compileGLSL.fragment(fragmentFn());
// rmsl has no sampler3D type, so patch the generated declaration for the
// voxel texture (this is the "plain GLSL" bit). The rest of the shader is rmsl.
if (!fragmentGLSL.includes("uniform sampler2D uVoxels;")) {
  throw new Error(
    "RMSL output changed: expected the uVoxels sampler2D declaration to patch to sampler3D",
  );
}
fragmentGLSL = fragmentGLSL.replace("uniform sampler2D uVoxels;", "uniform sampler3D uVoxels;");
// rmsl emits no default precision for samplers, so declare it for the patched sampler3D
fragmentGLSL = fragmentGLSL.replace(
  "precision highp float;",
  "precision highp float;\nprecision highp sampler3D;",
);

type WebGLState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionLocation: number;
  uTimeLocation: WebGLUniformLocation | null;
  uResolutionLocation: WebGLUniformLocation | null;
  uVoxelsLocation: WebGLUniformLocation | null;
  uLightDirLocation: WebGLUniformLocation | null;
  uLightColourLocation: WebGLUniformLocation | null;
  uAmbientColourLocation: WebGLUniformLocation | null;
  uDimensions: WebGLUniformLocation | null;
  texture: WebGLTexture;
  buffer: WebGLBuffer;
};

const setupWebGL = (gl: WebGL2RenderingContext): WebGLState => {
  const compileShader = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (shader === null) {
      throw new Error("Failed to create shader");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${info}`);
    }
    return shader;
  };
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexGLSL);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentGLSL);
  const program = gl.createProgram();
  if (program === null) {
    throw new Error("Failed to create program");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const buffer = gl.createBuffer();
  if (buffer === null) {
    throw new Error("Failed to create buffer");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  if (texture === null) {
    throw new Error("Failed to create texture");
  }
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(
    gl.TEXTURE_3D,
    0,
    gl.RGBA8,
    1,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  return {
    gl,
    program,
    positionLocation: gl.getAttribLocation(program, positionAttr.name),
    uTimeLocation: gl.getUniformLocation(program, uTime.name),
    uResolutionLocation: gl.getUniformLocation(program, uResolution.name),
    uVoxelsLocation: gl.getUniformLocation(program, uVoxels.name),
    uLightDirLocation: gl.getUniformLocation(program, uLightDir.name),
    uLightColourLocation: gl.getUniformLocation(program, uLightColour.name),
    uAmbientColourLocation: gl.getUniformLocation(program, uAmbientColour.name),
    uDimensions: gl.getUniformLocation(program, uDimensions.name),
    texture,
    buffer,
  };
};

// Directional + ambient light for the voxel preview (fixed in world space)
const LIGHT_DIR = (() => {
  const d = [0.4, 0.7, 0.8];
  const len = Math.hypot(d[0], d[1], d[2]);
  return new Float32Array([d[0] / len, d[1] / len, d[2] / len]);
})();
const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

const VoxelPreviewView: Component = () => {
  const { store } = useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [webgl, setWebgl] = createSignal<WebGLState>();
  const [glError, setGlError] = createSignal<string | undefined>();

  const normalizedDimensions = createMemo(() => normalizeDimensions(store.dimensions));

  const loadVoxelArrayToWebGL = () => {
    const dimensions = store.dimensions;
    const voxels = store.voxels;
    const _webgl = webgl();
    if (_webgl === undefined) {
      return;
    }
    const gl = _webgl.gl;
    gl.bindTexture(gl.TEXTURE_3D, _webgl.texture);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA8,
      dimensions.width,
      dimensions.height,
      dimensions.depth,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      voxels,
    );
  };

  createTrackedEffect(loadVoxelArrayToWebGL);

  const render = () => {
    const _webgl = webgl();
    const _canvas = canvas();
    if (_webgl === undefined || _canvas === undefined) {
      return;
    }
    const gl = _webgl.gl;
    const width = _canvas.width;
    const height = _canvas.height;
    gl.viewport(0, 0, width, height);
    gl.useProgram(_webgl.program);
    gl.uniform1f(_webgl.uTimeLocation, performance.now() / 1000.0);
    gl.uniform2f(_webgl.uResolutionLocation, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, _webgl.texture);
    gl.uniform1i(_webgl.uVoxelsLocation, 0);
    gl.uniform3fv(_webgl.uLightDirLocation, LIGHT_DIR);
    gl.uniform3fv(_webgl.uLightColourLocation, LIGHT_COLOUR);
    gl.uniform3fv(_webgl.uAmbientColourLocation, AMBIENT_COLOUR);
    gl.uniform3f(
      _webgl.uDimensions,
      normalizedDimensions().width,
      normalizedDimensions().height,
      normalizedDimensions().depth,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, _webgl.buffer);
    gl.enableVertexAttribArray(_webgl.positionLocation);
    gl.vertexAttribPointer(_webgl.positionLocation, 2, gl.FLOAT, false, 0, 0);
    flush();
    loadVoxelArrayToWebGL();
    gl.flush();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  onSettled(() => {
    const _canvas = canvas();
    if (_canvas === undefined) {
      return;
    }
    const gl = _canvas.getContext("webgl2", { antialias: false });
    if (gl === null) {
      setGlError("WebGL2 is not supported in this browser");
      return;
    }

    const webglState = tryCatch(
      () => setupWebGL(gl),
      e => {
        setGlError(e instanceof Error ? e.message : String(e));
      },
    );

    if (!webglState) {
      return;
    }

    setWebgl(webglState);

    const resizeObserver = new ResizeObserver(() => {
      const rect = _canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      _canvas.width = Math.max(1, Math.round(rect.width * dpr));
      _canvas.height = Math.max(1, Math.round(rect.height * dpr));
    });
    resizeObserver.observe(_canvas);

    let rafId = requestAnimationFrame(function renderLoop() {
      render();
      rafId = requestAnimationFrame(renderLoop);
    });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {glError() === undefined ? (
        <canvas
          ref={setCanvas}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            "touch-action": "none",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            height: "100%",
          }}
        >
          {glError()}
        </div>
      )}
    </div>
  );
};

export default VoxelPreviewView;
