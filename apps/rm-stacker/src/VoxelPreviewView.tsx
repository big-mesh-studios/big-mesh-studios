import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  createTrackedEffect,
  flush,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import { StackerContext } from "./context";
import { Dimensions3D, RGBA } from "./maths";
import shaders from "./shaders";
import { tryCatch } from "./utils";
import styles from "./VoxelPreviewView.module.css";

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
  uVoxelCount: WebGLUniformLocation | null;
  uPaletteLocation: WebGLUniformLocation | null;
  texture: WebGLTexture;
  paletteTexture: WebGLTexture;
  buffer: WebGLBuffer;
  uploadPalette(palette: RGBA[]): void;
};

const setupWebGL = (gl: WebGL2RenderingContext, palette: RGBA[]): WebGLState => {
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
    gl.RGBA8UI,
    1,
    1,
    1,
    0,
    gl.RGBA_INTEGER,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  // One row of 32 texels, one per palette colour. The shader looks a colour
  // index up at its texel's centre, so the texel must span exactly 1/32 of the
  // texture.
  const paletteTexture = gl.createTexture();
  if (paletteTexture === null) {
    throw new Error("Failed to create palette texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const paletteData = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    paletteData[offset] = r;
    paletteData[offset + 1] = g;
    paletteData[offset + 2] = b;
    paletteData[offset + 3] = a;
  });
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    palette.length,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    paletteData,
  );

  const uploadPalette = (palette: RGBA[]) => {
    const paletteData = new Uint8Array(palette.length * 4);

    palette.forEach(({ r, g, b, a }, i) => {
      const offset = i << 2;
      paletteData[offset] = r;
      paletteData[offset + 1] = g;
      paletteData[offset + 2] = b;
      paletteData[offset + 3] = a;
    });

    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      palette.length,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paletteData,
    );
  };

  uploadPalette(palette);

  return {
    gl,
    program,
    positionLocation: gl.getAttribLocation(program, shaders.positionAttr),
    uTimeLocation: gl.getUniformLocation(program, shaders.uTime),
    uResolutionLocation: gl.getUniformLocation(program, shaders.uResolution),
    uVoxelsLocation: gl.getUniformLocation(program, shaders.uVoxels),
    uLightDirLocation: gl.getUniformLocation(program, shaders.uLightDir),
    uLightColourLocation: gl.getUniformLocation(program, shaders.uLightColour),
    uAmbientColourLocation: gl.getUniformLocation(program, shaders.uAmbientColour),
    uDimensions: gl.getUniformLocation(program, shaders.uDimensions),
    uVoxelCount: gl.getUniformLocation(program, shaders.uVoxelCount),
    uPaletteLocation: gl.getUniformLocation(program, shaders.uPalette),
    texture,
    paletteTexture,
    buffer,
    uploadPalette,
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
  const { dimensions, voxels, palette, requestRender } = useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [webgl, setWebgl] = createSignal<WebGLState>();
  const [glError, setGlError] = createSignal<string | undefined>();

  const normalizedDimensions = createMemo(() => Dimensions3D.normalize(dimensions()));

  const loadVoxelArrayToWebGL = () => {
    const _dimensions = dimensions();
    const _voxels = voxels();
    const _webgl = webgl();
    if (_webgl === undefined) {
      return;
    }
    const gl = _webgl.gl;
    gl.bindTexture(gl.TEXTURE_3D, _webgl.texture);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA8UI,
      _dimensions.width,
      _dimensions.height,
      _dimensions.depth,
      0,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_BYTE,
      _voxels,
    );
  };

  createTrackedEffect(loadVoxelArrayToWebGL);

  const render = () => {
    const _dimensions = untrack(dimensions);
    const _webgl = untrack(webgl);
    const _canvas = untrack(canvas);
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
    gl.uniform3f(_webgl.uVoxelCount, _dimensions.width, _dimensions.height, _dimensions.depth);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, _webgl.paletteTexture);
    gl.uniform1i(_webgl.uPaletteLocation, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, _webgl.buffer);
    gl.enableVertexAttribArray(_webgl.positionLocation);
    gl.vertexAttribPointer(_webgl.positionLocation, 2, gl.FLOAT, false, 0, 0);
    flush();
    untrack(loadVoxelArrayToWebGL);
    gl.flush();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  createEffect(
    () => [palette(), webgl()] as const,
    ([palette, webgl]) => {
      if (webgl === undefined) {
        return;
      }
      webgl.uploadPalette(palette);
      requestRender();
    },
  );

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
      () => setupWebGL(gl, palette()),
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
