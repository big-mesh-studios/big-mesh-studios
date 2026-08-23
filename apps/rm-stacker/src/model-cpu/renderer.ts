import { Dimensions3D, Matrix3x3, RGBA, Vector3D } from "../maths";
import type { ModelRenderer } from "../model-renderer";
import type { Sides } from "../types";
import { solveVoxels } from "./voxel-solver";
import shaders from "./shaders";

/**
 * Directional and ambient light for the model, in world space. The model
 * turns beneath a fixed light, so the direction is rotated into the model's
 * space before it is uploaded rather than sent as it stands.
 */
const LIGHT_DIR = Object.freeze(Vector3D.normalize(Vector3D.create(0.4, 0.7, 0.8)));
const LIGHT_COLOUR = new Float32Array([1.0, 0.97, 0.9]);
const AMBIENT_COLOUR = new Float32Array([0.35, 0.35, 0.4]);

type WebGLState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionLocation: number;
  uResolutionLocation: WebGLUniformLocation | null;
  uVoxelsLocation: WebGLUniformLocation | null;
  uLightDirLocation: WebGLUniformLocation | null;
  uLightColourLocation: WebGLUniformLocation | null;
  uAmbientColourLocation: WebGLUniformLocation | null;
  uUnlitLocation: WebGLUniformLocation | null;
  uDimensions: WebGLUniformLocation | null;
  uVoxelCount: WebGLUniformLocation | null;
  uPaletteLocation: WebGLUniformLocation | null;
  uCameraPositionLocation: WebGLUniformLocation | null;
  uWorldToModelLocation: WebGLUniformLocation | null;
  texture: WebGLTexture;
  paletteTexture: WebGLTexture;
  buffer: WebGLBuffer;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
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
}

function setupWebGL(gl: WebGL2RenderingContext): WebGLState {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, shaders.vertexGLSL);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, shaders.fragmentGLSL);
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

  const paletteTexture = gl.createTexture();
  if (paletteTexture === null) {
    throw new Error("Failed to create palette texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  return {
    gl,
    program,
    positionLocation: gl.getAttribLocation(program, shaders.positionAttr),
    uResolutionLocation: gl.getUniformLocation(program, shaders.uResolution),
    uVoxelsLocation: gl.getUniformLocation(program, shaders.uVoxels),
    uLightDirLocation: gl.getUniformLocation(program, shaders.uLightDir),
    uLightColourLocation: gl.getUniformLocation(program, shaders.uLightColour),
    uAmbientColourLocation: gl.getUniformLocation(program, shaders.uAmbientColour),
    uUnlitLocation: gl.getUniformLocation(program, shaders.uUnlit),
    uDimensions: gl.getUniformLocation(program, shaders.uDimensions),
    uVoxelCount: gl.getUniformLocation(program, shaders.uVoxelCount),
    uPaletteLocation: gl.getUniformLocation(program, shaders.uPalette),
    uCameraPositionLocation: gl.getUniformLocation(program, shaders.uCameraPosition),
    uWorldToModelLocation: gl.getUniformLocation(program, shaders.uWorldToModel),
    texture,
    paletteTexture,
    buffer,
  };
}

function uploadPalette(webgl: WebGLState, palette: RGBA[]) {
  const { gl, paletteTexture } = webgl;
  const data = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, palette.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
}

/**
 * Raymarches a solved voxel volume in a raw WebGL2 shader: the six drawn
 * panels are solved into a full three-dimensional texture on the CPU, and
 * the shader casts a ray per pixel through that texture directly.
 */
export function createCpuModelRenderer(canvas: HTMLCanvasElement): ModelRenderer {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true });
  if (gl === null) {
    throw new Error("WebGL2 is not supported in this browser");
  }
  const webgl = setupWebGL(gl);

  let dimensions: Dimensions3D = { width: 1, height: 1, depth: 1 };
  let normalizedDimensions = Dimensions3D.normalize(dimensions);
  let unlit = false;
  const modelSpaceLightDirection = Vector3D.create();

  return {
    resize(width, height) {
      canvas.width = width;
      canvas.height = height;
    },

    setModel(newDimensions, sides) {
      dimensions = newDimensions;
      normalizedDimensions = Dimensions3D.normalize(dimensions);
      const voxels = solveVoxels(dimensions, sides);
      gl.bindTexture(gl.TEXTURE_3D, webgl.texture);
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA8UI,
        dimensions.width,
        dimensions.height,
        dimensions.depth,
        0,
        gl.RGBA_INTEGER,
        gl.UNSIGNED_BYTE,
        voxels,
      );
    },

    setPalette(palette) {
      uploadPalette(webgl, palette);
    },

    setUnlit(newUnlit) {
      unlit = newUnlit;
    },

    render(orbit, worldToModel) {
      const width = canvas.width;
      const height = canvas.height;
      Matrix3x3.transform(worldToModel, LIGHT_DIR, modelSpaceLightDirection);

      gl.viewport(0, 0, width, height);
      gl.useProgram(webgl.program);
      gl.uniform2f(webgl.uResolutionLocation, width, height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, webgl.texture);
      gl.uniform1i(webgl.uVoxelsLocation, 0);
      gl.uniform3f(
        webgl.uLightDirLocation,
        modelSpaceLightDirection.x,
        modelSpaceLightDirection.y,
        modelSpaceLightDirection.z,
      );
      gl.uniform3fv(webgl.uLightColourLocation, LIGHT_COLOUR);
      gl.uniform1i(webgl.uUnlitLocation, unlit ? 1 : 0);
      gl.uniform3fv(webgl.uAmbientColourLocation, AMBIENT_COLOUR);
      gl.uniform3f(
        webgl.uDimensions,
        normalizedDimensions.width,
        normalizedDimensions.height,
        normalizedDimensions.depth,
      );
      gl.uniform3f(webgl.uVoxelCount, dimensions.width, dimensions.height, dimensions.depth);
      gl.uniform3f(webgl.uCameraPositionLocation, 0, 0, orbit.radius);
      gl.uniformMatrix3fv(webgl.uWorldToModelLocation, false, worldToModel);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, webgl.paletteTexture);
      gl.uniform1i(webgl.uPaletteLocation, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, webgl.buffer);
      gl.enableVertexAttribArray(webgl.positionLocation);
      gl.vertexAttribPointer(webgl.positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.flush();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    dispose() {
      gl.deleteProgram(webgl.program);
      gl.deleteBuffer(webgl.buffer);
      gl.deleteTexture(webgl.texture);
      gl.deleteTexture(webgl.paletteTexture);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
