import {
  Component,
  createMemo,
  createRenderEffect,
  createSignal,
  createTrackedEffect,
  onSettled,
  runWithOwner,
  useContext,
} from "solid-js";
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
import { solveVoxels } from "./voxel-solver";

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
const v2min = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).sub(a.sub(b).abs()).mult(float(0.5));
const v2max = (a: Node<"vec2">, b: Node<"vec2">): Node<"vec2"> =>
  a.add(b).add(a.sub(b).abs()).mult(float(0.5));
const v3min = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).sub(a.sub(b).abs()).mult(float(0.5));
const v3max = (a: Node<"vec3">, b: Node<"vec3">): Node<"vec3"> =>
  a.add(b).add(a.sub(b).abs()).mult(float(0.5));

const rotationY = (y: Node<"float">): Node<"mat3"> =>
  mat3(
    vec3(y.cos(), float(0), y.sin().negate()),
    vec3(float(0), float(1), float(0)),
    vec3(y.sin(), float(0), y.cos()),
  );

const vertexFn = Fn(() => {
  vUv.assign(positionAttr.mult(vec2(0.5)).add(vec2(0.5)));
  return vec4(positionAttr, float(0), float(1));
});

// Port of fragment-sample.txt: raymarch a voxel grid inside a box and
// alpha-composite the samples.
const fragmentFn = Fn(() => {
  const t = uTime;
  const fragCoord = vUv.mult(uResolution);
  const uv = fragCoord.mult(float(2)).sub(uResolution).div(uResolution.y);
  const rot = rotationY(t);
  // rmsl has no vec3 * mat3, so rotate through the transpose (identical result)
  const ro = rot.transpose().multVec(vec3(float(0), float(0), float(-1.8)));
  const rd = rot.transpose().multVec(vec3(uv.x, uv.y, float(2)).normalize());
  const color = vec4(float(0), float(0), float(0), float(0)).toVar();

  // IntersectBox, inlined since rmsl has no user functions or out params
  const boxMin = vec3(float(-0.5));
  const boxMax = vec3(float(0.5));
  // pow(rd, -1) is undefined in GLSL when a component is 0 (NaN at the screen
  // centre cross), so use the defined IEEE reciprocal instead
  const invR = vec3(float(1)).div(rd);
  const tbot = invR.mult(boxMin.sub(ro)).toVar();
  const ttop = invR.mult(boxMax.sub(ro)).toVar();
  const tmin = v3min(tbot, ttop).toVar();
  const tmax = v3max(tbot, ttop).toVar();
  const t0a = v2max(vec2(tmin.x, tmin.x), vec2(tmin.y, tmin.z)).toVar();
  const tnear = t0a.x.max(t0a.y).toVar();
  const t0b = v2min(vec2(tmax.x, tmax.x), vec2(tmax.y, tmax.z)).toVar();
  const tfar = t0b.x.min(t0b.y).toVar();

  If(tnear.lessThanEqual(tfar), () => {
    const stepSize = float(0.01);
    // half a voxel in world units, for the alpha-gradient normal
    const eps = float(0.015625);
    For(
      () => tnear.toVar(),
      tt => tt.lessThan(tfar),
      tt => {
        tt.assign(tt.add(stepSize));
      },
      tt => {
        const p = ro.add(rd.mult(tt)).toVar();
        const inside = p
          .greaterThan(vec3(float(-0.51)))
          .all()
          .and(p.lessThan(vec3(float(0.51))).all());
        If(inside, () => {
          const pc = p.add(vec3(float(0.5))).toVar();
          const s = ((uVoxels as any).texture(pc) as Node<"vec4">).toVar();
          If(s.a.greaterThan(float(0.5)), () => {
            // surface normal from the gradient of the alpha field (central
            // differences); negated so it points outward. The small view
            // direction term is a fallback so a zero/weak gradient (e.g. on a
            // surface at the volume boundary) never produces a NaN normal.
            const grad = vec3(
              (
                (uVoxels as any).texture(pc.sub(vec3(eps, float(0), float(0)))) as Node<"vec4">
              ).a.sub(
                ((uVoxels as any).texture(pc.add(vec3(eps, float(0), float(0)))) as Node<"vec4">).a,
              ),
              (
                (uVoxels as any).texture(pc.sub(vec3(float(0), eps, float(0)))) as Node<"vec4">
              ).a.sub(
                ((uVoxels as any).texture(pc.add(vec3(float(0), eps, float(0)))) as Node<"vec4">).a,
              ),
              (
                (uVoxels as any).texture(pc.sub(vec3(float(0), float(0), eps))) as Node<"vec4">
              ).a.sub(
                ((uVoxels as any).texture(pc.add(vec3(float(0), float(0), eps))) as Node<"vec4">).a,
              ),
            );
            const n = grad.sub(rd.mult(float(0.001))).normalize();
            const diffuse = n.dot(uLightDir).max(float(0));
            color.rgb.assign(s.rgb.mult(uAmbientColour.add(uLightColour.mult(diffuse))));
            color.a.assign(float(1));
            break_();
          });
        });
      },
    );
  });
  return vec4(color.rgb, float(1));
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
      store.dimensions.x,
      store.dimensions.y,
      store.dimensions.z,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      store.voxels,
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
