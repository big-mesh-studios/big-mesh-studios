/**
 * The solved-volume half of the experiment: a volume of "is there a voxel here"
 * laid out as a grid of z-slices in one texture, filled on the GPU from the six
 * panels. Written against raw WebGL because the scene renderer owns no render
 * targets — the same reason the bloom passes are hand-driven.
 *
 * Two ways to fill it. `solveAll` redraws every voxel. `solveCells` redraws only
 * the voxels a set of edited panel cells can have changed: a cell of the front
 * panel fixes x and y, so only the run along z behind it can differ, and one
 * point per voxel of that run is enough.
 *
 * Benchmark scaffolding, not part of the app.
 */

import type { Dimensions3D } from "./maths";
import type { SideKind } from "./types";

const SOLVE_VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Reads the six panels the same way the ray marcher does, and writes 255 where
// every one of them has been drawn on.
const SOLVE_BODY = `
uniform highp usampler2D uFront;
uniform highp usampler2D uBack;
uniform highp usampler2D uLeft;
uniform highp usampler2D uRight;
uniform highp usampler2D uTop;
uniform highp usampler2D uBottom;
uniform ivec3 uCount;
uniform int uTiles;
out uvec4 outSolid;

bool solidAt(int x, int y, int z) {
  int w = uCount.x, h = uCount.y, d = uCount.z;
  uint front = texelFetch(uFront, ivec2(x, h - 1 - y), 0).r;
  uint back = texelFetch(uBack, ivec2(w - 1 - x, h - 1 - y), 0).r;
  uint left = texelFetch(uLeft, ivec2(z, h - 1 - y), 0).r;
  uint right = texelFetch(uRight, ivec2(d - 1 - z, h - 1 - y), 0).r;
  uint top = texelFetch(uTop, ivec2(x, z), 0).r;
  uint bottom = texelFetch(uBottom, ivec2(x, d - 1 - z), 0).r;
  return front != 255u && back != 255u && left != 255u
      && right != 255u && top != 255u && bottom != 255u;
}`;

const SOLVE_ALL_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
${SOLVE_BODY}
void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  int column = texel.x / uCount.x;
  int row = texel.y / uCount.y;
  int x = texel.x - column * uCount.x;
  int y = texel.y - row * uCount.y;
  int z = row * uTiles + column;
  if (z >= uCount.z) {
    outSolid = uvec4(0u);
    return;
  }
  outSolid = uvec4(solidAt(x, y, z) ? 255u : 0u);
}`;

// One point per voxel to redraw, placed on the atlas texel that voxel occupies.
const SOLVE_POINTS_VERTEX = `#version 300 es
in vec3 aVoxel;
uniform ivec3 uCount;
uniform int uTiles;
uniform vec2 uAtlasSize;
flat out ivec3 vVoxel;
void main() {
  ivec3 voxel = ivec3(aVoxel);
  vVoxel = voxel;
  int row = voxel.z / uTiles;
  int column = voxel.z - row * uTiles;
  vec2 texel = vec2(column * uCount.x + voxel.x, row * uCount.y + voxel.y) + 0.5;
  gl_Position = vec4(texel / uAtlasSize * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

const SOLVE_POINTS_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
flat in ivec3 vVoxel;
${SOLVE_BODY}
void main() {
  outSolid = uvec4(solidAt(vVoxel.x, vVoxel.y, vVoxel.z) ? 255u : 0u);
}`;

const compile = (gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram => {
  const make = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed to compile");
    }
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
  }
  return program;
};

export type PanelTextureSet = Record<SideKind, WebGLTexture>;

/**
 * The grid the z-slices are laid out in: as square as the slice count allows,
 * unless a caller asks for a particular number of tiles per row. One tile per
 * row stacks the slices in a single column, which is the layout that lets a
 * reader find a slice without dividing.
 */
export const atlasLayout = ({ width, height, depth }: Dimensions3D, tiles?: number) => {
  const tilesPerRow = tiles ?? Math.ceil(Math.sqrt(depth));
  const rows = Math.ceil(depth / tilesPerRow);
  return { tilesPerRow, rows, atlasWidth: width * tilesPerRow, atlasHeight: height * rows };
};

export class AtlasSolver {
  private solveAllProgram: WebGLProgram;
  private solvePointsProgram: WebGLProgram;
  private quad: WebGLBuffer;
  private points: WebGLBuffer;
  private framebuffer: WebGLFramebuffer;
  private vao: WebGLVertexArrayObject;
  private pointsVao: WebGLVertexArrayObject;

  /** `tiles` fixes the tiles per row; left out, the layout picks a square grid. */
  constructor(
    private gl: WebGL2RenderingContext,
    private tiles?: number,
  ) {
    this.solveAllProgram = compile(gl, SOLVE_VERTEX, SOLVE_ALL_FRAGMENT);
    this.solvePointsProgram = compile(gl, SOLVE_POINTS_VERTEX, SOLVE_POINTS_FRAGMENT);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.points = gl.createBuffer()!;
    this.framebuffer = gl.createFramebuffer()!;
    this.vao = gl.createVertexArray()!;
    this.pointsVao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const quadPosition = gl.getAttribLocation(this.solveAllProgram, "aPosition");
    gl.enableVertexAttribArray(quadPosition);
    gl.vertexAttribPointer(quadPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(this.pointsVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.points);
    const voxelPosition = gl.getAttribLocation(this.solvePointsProgram, "aVoxel");
    gl.enableVertexAttribArray(voxelPosition);
    gl.vertexAttribPointer(voxelPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private bindPanels(program: WebGLProgram, panels: PanelTextureSet, dimensions: Dimensions3D) {
    const gl = this.gl;
    const names: Array<[SideKind, string]> = [
      ["front", "uFront"],
      ["back", "uBack"],
      ["left", "uLeft"],
      ["right", "uRight"],
      ["top", "uTop"],
      ["bottom", "uBottom"],
    ];
    names.forEach(([kind, name], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, panels[kind]);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
    });
    const { tilesPerRow } = atlasLayout(dimensions, this.tiles);
    gl.uniform3i(
      gl.getUniformLocation(program, "uCount"),
      dimensions.width,
      dimensions.height,
      dimensions.depth,
    );
    gl.uniform1i(gl.getUniformLocation(program, "uTiles"), tilesPerRow);
  }

  private attach(atlas: WebGLTexture, dimensions: Dimensions3D) {
    const gl = this.gl;
    const { atlasWidth, atlasHeight } = atlasLayout(dimensions, this.tiles);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, atlas, 0);
    gl.viewport(0, 0, atlasWidth, atlasHeight);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`atlas framebuffer incomplete: 0x${status.toString(16)}`);
    }
  }

  /** Redraws every voxel of the volume. */
  solveAll(atlas: WebGLTexture, panels: PanelTextureSet, dimensions: Dimensions3D) {
    const gl = this.gl;
    this.attach(atlas, dimensions);
    gl.useProgram(this.solveAllProgram);
    this.bindPanels(this.solveAllProgram, panels, dimensions);
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Redraws only the voxels listed, as one point each. `voxels` holds x, y and
   * z per voxel, which is what the caller gets from expanding the runs behind
   * the panel cells an edit touched.
   */
  solveCells(
    atlas: WebGLTexture,
    panels: PanelTextureSet,
    dimensions: Dimensions3D,
    voxels: Float32Array,
  ) {
    const gl = this.gl;
    this.attach(atlas, dimensions);
    gl.useProgram(this.solvePointsProgram);
    this.bindPanels(this.solvePointsProgram, panels, dimensions);
    const { atlasWidth, atlasHeight } = atlasLayout(dimensions, this.tiles);
    gl.uniform2f(
      gl.getUniformLocation(this.solvePointsProgram, "uAtlasSize"),
      atlasWidth,
      atlasHeight,
    );
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.pointsVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.points);
    gl.bufferData(gl.ARRAY_BUFFER, voxels, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, voxels.length / 3);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

/**
 * The voxels a drawn panel cell can have changed: the run behind it, since the
 * cell fixes two of the three coordinates and leaves the third free.
 */
export const runBehind = (
  kind: SideKind,
  x: number,
  y: number,
  { width, height, depth }: Dimensions3D,
): Float32Array => {
  const out: number[] = [];
  if (kind === "front" || kind === "back") {
    const voxelX = kind === "front" ? x : width - 1 - x;
    const voxelY = height - 1 - y;
    for (let z = 0; z < depth; z++) out.push(voxelX, voxelY, z);
  } else if (kind === "left" || kind === "right") {
    const voxelZ = kind === "left" ? x : depth - 1 - x;
    const voxelY = height - 1 - y;
    for (let voxelX = 0; voxelX < width; voxelX++) out.push(voxelX, voxelY, voxelZ);
  } else {
    const voxelZ = kind === "top" ? y : depth - 1 - y;
    for (let voxelY = 0; voxelY < height; voxelY++) out.push(x, voxelY, voxelZ);
  }
  return new Float32Array(out);
};
