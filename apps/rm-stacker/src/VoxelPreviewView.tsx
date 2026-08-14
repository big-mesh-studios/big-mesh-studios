import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  createTrackedEffect,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import { StackerContext } from "./context";
import { Bitmap, Dimensions3D, Matrix3x3, RGBA, Vector3D } from "./maths";
import shaders from "./shaders";
import { sideKindSet, type SideKind, type Sides } from "./types";
import { keysOf, pointer, tryCatch } from "./utils";
import styles from "./VoxelPreviewView.module.css";

const MIN_RADIUS = 2;
const MAX_RADIUS = 20;

// Directional + ambient light for the voxel preview. The direction is fixed in
// world space and the model turns beneath it, so it is rotated into the model's
// space before it is uploaded rather than being sent as it stands.
const LIGHT_DIR = Object.freeze(Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)));
const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

const TURNTABLE_SECONDS_PER_REVOLUTION = 20;
const TURNTABLE_RADIANS_PER_SECOND = -(2 * Math.PI) / TURNTABLE_SECONDS_PER_REVOLUTION;

// The shader reads the model straight off the six panels, so each one is bound
// to its own texture unit. The palette follows them, on the unit after the last
// panel. WebGL2 guarantees at least sixteen units in a fragment shader.
const SIDE_UNIFORM_NAME = {
  front: shaders.uFront,
  back: shaders.uBack,
  left: shaders.uLeft,
  right: shaders.uRight,
  top: shaders.uTop,
  bottom: shaders.uBottom,
} satisfies Record<SideKind, string>;

const SIDE_KINDS = keysOf(sideKindSet);
const PALETTE_TEXTURE_UNIT = SIDE_KINDS.length;

type WebGLState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionLocation: number;
  uResolutionLocation: WebGLUniformLocation | null;
  uSideLocations: Record<SideKind, WebGLUniformLocation | null>;
  uLightDirLocation: WebGLUniformLocation | null;
  uLightColourLocation: WebGLUniformLocation | null;
  uAmbientColourLocation: WebGLUniformLocation | null;
  uUnlitLocation: WebGLUniformLocation | null;
  uDimensions: WebGLUniformLocation | null;
  uVoxelCount: WebGLUniformLocation | null;
  uVoxelCountI: WebGLUniformLocation | null;
  uPaletteLocation: WebGLUniformLocation | null;
  uCameraPositionLocation: WebGLUniformLocation | null;
  uWorldToModelLocation: WebGLUniformLocation | null;
  sideTextures: Record<SideKind, WebGLTexture>;
  paletteTexture: WebGLTexture;
  buffer: WebGLBuffer;
  uploadPalette(palette: RGBA[]): void;
  uploadSides(sides: Sides): void;
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

  // One single-channel integer texture per panel, holding its palette indices
  // exactly as the panel stores them. Integer textures cannot be filtered, and
  // the shader fetches whole texels anyway, so nearest sampling throughout.
  // Each starts as a single empty cell until the first upload.
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const createSideTexture = (): WebGLTexture => {
    const texture = gl.createTexture();
    if (texture === null) {
      throw new Error("Failed to create side texture");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8UI,
      1,
      1,
      0,
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      new Uint8Array([Bitmap.EMPTY]),
    );
    return texture;
  };

  const sideTextures = Object.fromEntries(
    SIDE_KINDS.map(kind => [kind, createSideTexture()]),
  ) as Record<SideKind, WebGLTexture>;

  const uploadSides = (sides: Sides) => {
    SIDE_KINDS.forEach(kind => {
      const side = sides[kind];
      gl.bindTexture(gl.TEXTURE_2D, sideTextures[kind]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R8UI,
        side.width,
        side.height,
        0,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        side.data,
      );
    });
  };

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
    uResolutionLocation: gl.getUniformLocation(program, shaders.uResolution),
    uSideLocations: Object.fromEntries(
      SIDE_KINDS.map(kind => [kind, gl.getUniformLocation(program, SIDE_UNIFORM_NAME[kind])]),
    ) as Record<SideKind, WebGLUniformLocation | null>,
    uLightDirLocation: gl.getUniformLocation(program, shaders.uLightDir),
    uLightColourLocation: gl.getUniformLocation(program, shaders.uLightColour),
    uAmbientColourLocation: gl.getUniformLocation(program, shaders.uAmbientColour),
    uUnlitLocation: gl.getUniformLocation(program, shaders.uUnlit),
    uDimensions: gl.getUniformLocation(program, shaders.uDimensions),
    uVoxelCount: gl.getUniformLocation(program, shaders.uVoxelCount),
    uVoxelCountI: gl.getUniformLocation(program, shaders.uVoxelCountI),
    uPaletteLocation: gl.getUniformLocation(program, shaders.uPalette),
    uCameraPositionLocation: gl.getUniformLocation(program, shaders.uCameraPosition),
    uWorldToModelLocation: gl.getUniformLocation(program, shaders.uWorldToModel),
    sideTextures,
    paletteTexture,
    buffer,
    uploadPalette,
    uploadSides,
  };
};

const VoxelPreviewView: Component = () => {
  const { dimensions, sides, sidesVersion, palette, requestRender, preview } =
    useContext(StackerContext);

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [webgl, setWebgl] = createSignal<WebGLState>();
  const [glError, setGlError] = createSignal<string | undefined>();

  const normalizedDimensions = createMemo(() => Dimensions3D.normalize(dimensions()));

  let yaw = Math.PI / 4;
  let pitch = Math.PI / 6;
  let radius = 3;

  const RADIANS_PER_PIXEL = 0.005;
  const PITCH_LIMIT = Math.PI / 2 - 0.01;

  const yawMatrix = Matrix3x3.create();
  const pitchMatrix = Matrix3x3.create();
  const worldToModel = Matrix3x3.create();
  const modelSpaceLightDirection = Vector3D.create();

  let timeOffset = 0;
  let spinOffset = 0;
  let spin = 0;

  createEffect(preview.autorotate, autoRotate => {
    if (autoRotate) {
      timeOffset = performance.now();
    } else {
      spinOffset = spin;
    }
  });

  const getWorldToModel = () => {
    Matrix3x3.rotationX(-pitch, pitchMatrix);
    if (untrack(preview.autorotate)) {
      spin = ((performance.now() - timeOffset) / 1000) * TURNTABLE_RADIANS_PER_SECOND + spinOffset;
    }
    Matrix3x3.rotationY(-(yaw + spin), yawMatrix);
    return Matrix3x3.multiply(yawMatrix, pitchMatrix, worldToModel);
  };

  // The panels are only re-uploaded when one of them is drawn on, rather than
  // once a frame: `sidesVersion` counts the edits, since commands write into
  // the panels in place and so leave `sides()` itself unchanged.
  createTrackedEffect(() => {
    sidesVersion();
    const _sides = sides();
    const _webgl = webgl();
    if (_webgl === undefined) {
      return;
    }
    _webgl.uploadSides(_sides);
  });

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
    Matrix3x3.transform(getWorldToModel(), LIGHT_DIR, modelSpaceLightDirection);

    gl.viewport(0, 0, width, height);
    gl.useProgram(_webgl.program);
    gl.uniform2f(_webgl.uResolutionLocation, width, height);
    SIDE_KINDS.forEach((kind, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, _webgl.sideTextures[kind]);
      gl.uniform1i(_webgl.uSideLocations[kind], unit);
    });
    gl.uniform3f(
      _webgl.uLightDirLocation,
      modelSpaceLightDirection.x,
      modelSpaceLightDirection.y,
      modelSpaceLightDirection.z,
    );
    gl.uniform3fv(_webgl.uLightColourLocation, LIGHT_COLOUR);
    if (untrack(preview.unlit)) {
      gl.uniform1i(_webgl.uUnlitLocation, 1);
    } else {
      gl.uniform1i(_webgl.uUnlitLocation, 0);
    }
    gl.uniform3fv(_webgl.uAmbientColourLocation, AMBIENT_COLOUR);
    gl.uniform3f(
      _webgl.uDimensions,
      normalizedDimensions().width,
      normalizedDimensions().height,
      normalizedDimensions().depth,
    );
    gl.uniform3f(_webgl.uVoxelCount, _dimensions.width, _dimensions.height, _dimensions.depth);
    gl.uniform3i(_webgl.uVoxelCountI, _dimensions.width, _dimensions.height, _dimensions.depth);
    gl.uniform3f(_webgl.uCameraPositionLocation, 0, 0, radius);
    gl.uniformMatrix3fv(_webgl.uWorldToModelLocation, false, worldToModel);
    gl.activeTexture(gl.TEXTURE0 + PALETTE_TEXTURE_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, _webgl.paletteTexture);
    gl.uniform1i(_webgl.uPaletteLocation, PALETTE_TEXTURE_UNIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, _webgl.buffer);
    gl.enableVertexAttribArray(_webgl.positionLocation);
    gl.vertexAttribPointer(_webgl.positionLocation, 2, gl.FLOAT, false, 0, 0);
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
        <canvas
          ref={setCanvas}
          class={styles.canvas}
          onPointerDown={event => {
            pointer(event, ({ delta }) => {
              yaw += delta.x * RADIANS_PER_PIXEL;
              pitch = Math.max(
                -PITCH_LIMIT,
                Math.min(PITCH_LIMIT, pitch + delta.y * RADIANS_PER_PIXEL),
              );
            });
          }}
          onWheel={event => {
            const sign = Math.sign(event.deltaY);
            radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius * Math.pow(1.1, sign)));
          }}
        />
      ) : (
        <div class={styles.error}>{glError()}</div>
      )}
    </div>
  );
};

export default VoxelPreviewView;
