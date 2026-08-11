import {
  Component,
  createMemo,
  createSignal,
  createTrackedEffect,
  flush,
  onSettled,
  useContext,
} from "solid-js";
import type { Setter as UniformSetter } from "@random-mesh/rmsl/webgl";
import { createUniformSetter, reflectUniforms } from "@random-mesh/rmsl/webgl";
import { StackerContext } from "./context";
import { Dimensions3D } from "./maths";
import shaders from "./shaders";
import { tryCatch } from "./utils";
import styles from "./VoxelPreviewView.module.css";

type WebGLState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionLocation: number;
  set: UniformSetter;
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
  const vertexShader = compileShader(gl.VERTEX_SHADER, shaders.vertexGLSL);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, shaders.fragmentGLSL);
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
    positionLocation: gl.getAttribLocation(program, shaders.positionAttr),
    set: createUniformSetter(gl, reflectUniforms(gl, program)),
    texture,
    buffer,
  };
};

// Directional + ambient light for the voxel preview (fixed in world space)
const LIGHT_DIR: readonly [number, number, number] = (() => {
  const [x, y, z] = [0.4, 0.7, 0.8];
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
})();
const LIGHT_COLOUR: readonly [number, number, number] = [1.0, 0.97, 0.9];
const AMBIENT_COLOUR: readonly [number, number, number] = [0.35, 0.35, 0.4];

const VoxelPreviewView: Component = () => {
  const { store } = useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [webgl, setWebgl] = createSignal<WebGLState>();
  const [glError, setGlError] = createSignal<string | undefined>();

  const normalizedDimensions = createMemo(() => Dimensions3D.normalize(store.dimensions));

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
    _webgl.set(shaders.uTime, performance.now() / 1000.0);
    _webgl.set(shaders.uResolution, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, _webgl.texture);
    _webgl.set(shaders.uVoxels, 0);
    _webgl.set(shaders.uLightDir, ...LIGHT_DIR);
    _webgl.set(shaders.uLightColour, ...LIGHT_COLOUR);
    _webgl.set(shaders.uAmbientColour, ...AMBIENT_COLOUR);
    _webgl.set(
      shaders.uDimensions,
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
    const gl = _canvas.getContext("webgl2", { antialias: false, alpha: true });
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
      render();
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
    <div class={styles.container}>
      {glError() === undefined ? (
        <canvas ref={setCanvas} class={styles.canvas} />
      ) : (
        <div class={styles.error}>{glError()}</div>
      )}
    </div>
  );
};

export default VoxelPreviewView;
