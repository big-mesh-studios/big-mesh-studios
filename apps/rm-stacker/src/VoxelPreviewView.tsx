import { Component, createSignal, createTrackedEffect, onSettled, useContext } from "solid-js";
import {
  Fn,
  If,
  For,
  break_,
  float,
  vec2,
  vec3,
  vec4,
  mat3,
  uniformRaw,
  varying,
  attribute,
  compileGLSL,
} from "@random-mesh/rmsl";
import type { Node } from "@random-mesh/rmsl";
import { tryCatch } from "./utils";
import { StackerContext } from "./stacker-context";

// Shared rmsl nodes. Created once so the generated slot names are the same in
// both the vertex and fragment shaders.
const uVoxels = uniformRaw("uVoxels", "sampler2D");
const uTime = uniformRaw("uTime", "float");
const uResolution = uniformRaw("uResolution", "vec2");
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

// Port of fragment-sample.txt: raymarch a voxel grid inside a box and
// alpha-composite the samples.
const fragmentFn = Fn(() => {
  const time = uTime;
  const fragmentCoord = vUv.mult(uResolution);
  // pixel position as centred, aspect-corrected screen coordinates
  const screenPosition = fragmentCoord.mult(float(2)).sub(uResolution).div(uResolution.y);
  const cameraRotation = rotationY(time);
  // rmsl has no vec3 * mat3, so rotate through the transpose (identical result)
  const rayOrigin = cameraRotation.transpose().multVec(vec3(float(0), float(0), float(-1.8)));
  const rayDirection = cameraRotation
    .transpose()
    .multVec(vec3(screenPosition.x, screenPosition.y, float(2)).normalize());
  const colour = vec4(float(0), float(0), float(0), float(0)).toVar();

  // IntersectBox, inlined since rmsl has no user functions or out params
  const boxMin = vec3(float(-0.5));
  const boxMax = vec3(float(0.5));
  // pow(rayDirection, -1) is undefined in GLSL when a component is 0 (NaN at
  // the screen centre cross), so use the defined IEEE reciprocal instead
  const inverseRayDirection = vec3(float(1)).div(rayDirection);
  // ray distance at which each of the six box planes is crossed
  const distanceToMinPlanes = inverseRayDirection.mult(boxMin.sub(rayOrigin)).toVar();
  const distanceToMaxPlanes = inverseRayDirection.mult(boxMax.sub(rayOrigin)).toVar();
  // per axis: which of the two planes the ray meets first, and which last
  const nearPlaneDistances = minVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();
  const farPlaneDistances = maxVec3(distanceToMinPlanes, distanceToMaxPlanes).toVar();
  // the box is entered at the last of the three near crossings, left at the
  // first of the three far crossings (pairwise so two calls cover three axes)
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
    const stepSize = float(0.01);
    // half a voxel in world units, for the alpha-gradient normal
    const gradientStep = float(0.015625);
    For(
      () => entryDistance.toVar(),
      rayDistance => rayDistance.lessThan(exitDistance),
      rayDistance => {
        rayDistance.assign(rayDistance.add(stepSize));
      },
      rayDistance => {
        const worldPosition = rayOrigin.add(rayDirection.mult(rayDistance)).toVar();
        const inside = worldPosition
          .greaterThan(vec3(float(-0.51)))
          .all()
          .and(worldPosition.lessThan(vec3(float(0.51))).all());
        If(inside, () => {
          // the box spans -0.5..0.5, the texture 0..1
          const voxelCoord = worldPosition.add(vec3(float(0.5))).toVar();
          const voxel = sampleVoxels(voxelCoord).toVar();
          If(voxel.a.greaterThan(float(0.5)), () => {
            // surface normal from the gradient of the alpha field (central
            // differences); negated so it points outward. The small view
            // direction term is a fallback so a zero/weak gradient (e.g. on a
            // surface at the volume boundary) never produces a NaN normal.
            const alphaGradient = vec3(
              sampleVoxels(voxelCoord.sub(vec3(gradientStep, float(0), float(0)))).a.sub(
                sampleVoxels(voxelCoord.add(vec3(gradientStep, float(0), float(0)))).a,
              ),
              sampleVoxels(voxelCoord.sub(vec3(float(0), gradientStep, float(0)))).a.sub(
                sampleVoxels(voxelCoord.add(vec3(float(0), gradientStep, float(0)))).a,
              ),
              sampleVoxels(voxelCoord.sub(vec3(float(0), float(0), gradientStep))).a.sub(
                sampleVoxels(voxelCoord.add(vec3(float(0), float(0), gradientStep))).a,
              ),
            );
            const normal = alphaGradient.sub(rayDirection.mult(float(0.001))).normalize();
            const diffuse = normal.dot(uLightDir).max(float(0));
            colour.rgb.assign(voxel.rgb.mult(uAmbientColour.add(uLightColour.mult(diffuse))));
            colour.a.assign(float(1));
            break_();
          });
        });
      },
    );
  });
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
    gl.bindBuffer(gl.ARRAY_BUFFER, _webgl.buffer);
    gl.enableVertexAttribArray(_webgl.positionLocation);
    gl.vertexAttribPointer(_webgl.positionLocation, 2, gl.FLOAT, false, 0, 0);
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
