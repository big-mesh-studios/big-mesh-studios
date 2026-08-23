import { compileGLSL } from "@random-mesh/rmsl";
import type { PassGraph } from "@random-mesh/rmsl/effects";

// Fullscreen quad vertex buffer, drawn as a triangle strip of four vertices
// spanning NDC [-1, 1].
const QUAD_VERTS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

const FULLSCREEN_VERT = `#version 300 es
precision highp float;
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// A color target (with optional depth) that a pass renders into.
export type RenderTarget = {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  depth: WebGLRenderbuffer | null;
  width: number;
  height: number;
};

// Plain RGBA8 everywhere: always renderable as a color attachment, and plenty
// for the 8-bit voxel colors and the soft glow blur.
export const createRenderTarget = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  withDepth: boolean,
): RenderTarget => {
  const texture = gl.createTexture();
  if (texture === null) {
    throw new Error("Failed to create render target texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depth = withDepth ? gl.createRenderbuffer() : null;
  if (withDepth) {
    if (depth === null) {
      throw new Error("Failed to create render target depth buffer");
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
  }

  const fbo = gl.createFramebuffer();
  if (fbo === null) {
    throw new Error("Failed to create render target framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (depth !== null) {
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  }
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Failed to create a complete render target");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { fbo, texture, depth, width, height };
};

/**
 * Executes a `PassGraph` from `@random-mesh/rmsl/effects` on a raw WebGL2
 * context: one fullscreen quad per pass, render targets sized by each pass's
 * `scale`, inputs bound by the producer pass named in `pass.inputs`. Ported
 * from the rmsl `bomb-bloom` demo.
 */
export class BloomExecutor {
  private gl: WebGL2RenderingContext;
  private graph: PassGraph;
  private programs = new Map<string, WebGLProgram>();
  private targets = new Map<
    string,
    { tex: WebGLTexture; w: number; h: number; fbo: WebGLFramebuffer }
  >();
  private quadVao: WebGLVertexArrayObject;
  private owned: Array<{ fbo: WebGLFramebuffer; tex: WebGLTexture }> = [];

  constructor(gl: WebGL2RenderingContext, graph: PassGraph) {
    this.gl = gl;
    this.graph = graph;
    this.quadVao = createQuadVao(gl);
    for (const pass of graph.passes) {
      const fragment = compileGLSL.fragment(pass.color);
      this.programs.set(pass.name, createProgram(gl, FULLSCREEN_VERT, fragment, "aPos"));
    }
  }

  /**
   * Runs every pass against `input.scene` and returns the composite output
   * texture (the glow), which the caller adds to its scene in the present
   * pass.
   */
  run(input: { scene: WebGLTexture; sceneWidth: number; sceneHeight: number }): {
    tex: WebGLTexture;
    width: number;
    height: number;
  } {
    const gl = this.gl;
    for (const pass of this.graph.passes) {
      const first = Object.entries(pass.inputs)[0];
      const firstKey = first[0];
      const firstSize =
        firstKey === "input" ? [input.sceneWidth, input.sceneHeight] : this.sizeOf(firstKey);
      const w = pass.size
        ? pass.size[0]
        : Math.max(1, Math.round(firstSize[0] * (pass.scale ?? 1)));
      const h = pass.size
        ? pass.size[1]
        : Math.max(1, Math.round(firstSize[1] * (pass.scale ?? 1)));

      const target = this.targetFor(pass.name, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.DEPTH_TEST);

      const program = this.programs.get(pass.name);
      if (program === undefined) {
        throw new Error(`[bloom] no program for pass "${pass.name}"`);
      }
      gl.useProgram(program);

      const slotToTex = new Map<string, WebGLTexture>();
      for (const [key, sampler] of Object.entries(pass.inputs)) {
        const slot = (sampler as { name?: string }).name as string;
        slotToTex.set(slot, key === "input" ? input.scene : this.targets.get(key)!.tex);
      }
      this.bindUniforms(program, slotToTex, w, h);

      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    const output = this.targets.get(this.graph.output);
    if (output === undefined) {
      throw new Error(`[bloom] no output target "${this.graph.output}"`);
    }
    return { tex: output.tex, width: output.w, height: output.h };
  }

  dispose(): void {
    for (const t of this.owned) {
      this.gl.deleteFramebuffer(t.fbo);
      this.gl.deleteTexture(t.tex);
    }
    for (const p of this.programs.values()) {
      this.gl.deleteProgram(p);
    }
    this.gl.deleteVertexArray(this.quadVao);
  }

  private sizeOf(name: string): [number, number] {
    const t = this.targets.get(name);
    if (!t) throw new Error(`[bloom] no target for pass "${name}"`);
    return [t.w, t.h];
  }

  private targetFor(name: string, w: number, h: number) {
    const existing = this.targets.get(name);
    if (existing && existing.w === w && existing.h === h) return existing;
    if (existing) {
      this.gl.deleteFramebuffer(existing.fbo);
      this.gl.deleteTexture(existing.tex);
    }
    const t = this.createTarget(w, h);
    this.targets.set(name, t);
    return t;
  }

  private createTarget(w: number, h: number) {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (tex === null) throw new Error("Failed to create bloom texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    if (fbo === null) throw new Error("Failed to create bloom framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const target = { tex, w, h, fbo };
    this.owned.push({ fbo, tex });
    return target;
  }

  private bindUniforms(
    program: WebGLProgram,
    slotToTex: Map<string, WebGLTexture>,
    w: number,
    h: number,
  ): void {
    const gl = this.gl;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    let unit = 0;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(program, info.name);
      if (loc === null) continue;
      if (info.type === gl.SAMPLER_2D) {
        gl.uniform1i(loc, unit);
        gl.activeTexture(gl.TEXTURE0 + unit);
        const tex = slotToTex.get(info.name);
        if (tex !== undefined) gl.bindTexture(gl.TEXTURE_2D, tex);
        unit++;
      } else if (info.type === gl.FLOAT_VEC2) {
        gl.uniform2f(loc, w, h);
      }
    }
  }
}

/**
 * Draws the bloom glow over the drawing buffer additively: a fullscreen quad
 * blended with `ONE, ONE` (premultiplied) so the glow adds light over both the
 * rendered scene and the transparent background. The scene itself is drawn
 * straight to the canvas before this runs.
 */
export class GlowPass {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private quadVao: WebGLVertexArrayObject;
  private uGlow: WebGLUniformLocation | null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vert = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;
    const frag = `#version 300 es
precision highp float;
uniform sampler2D uGlow;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 glow = texture(uGlow, vUv);
  // The bloom passes write opaque alpha, so how much this pixel glows comes
  // from its brightness. The output is premultiplied for the ONE, ONE blend.
  float intensity = max(max(glow.r, glow.g), glow.b);
  outColor = vec4(glow.rgb * intensity, intensity);
}
`;
    this.program = createProgram(gl, vert, frag, "aPos");
    this.quadVao = createQuadVao(gl);
    this.uGlow = gl.getUniformLocation(this.program, "uGlow");
  }

  draw(glow: WebGLTexture, width: number, height: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glow);
    gl.uniform1i(this.uGlow, 0);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.quadVao);
  }
}

function createQuadVao(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (vao === null) throw new Error("Failed to create quad vertex array");
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  if (buf === null) throw new Error("Failed to create quad buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);
  // aPos is bound to location 0 in every fullscreen program.
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
  attribName: string,
): WebGLProgram {
  const vs = compile(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compile(gl, fsSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (program === null) throw new Error("Failed to create program");
  gl.bindAttribLocation(program, 0, attribName);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error(`[bloom] program link failed:\n${log}\n--- fragment ---\n${fsSource}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function compile(gl: WebGL2RenderingContext, src: string, type: number): WebGLShader {
  const s = gl.createShader(type);
  if (s === null) throw new Error("Failed to create shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`[bloom] shader compile failed:\n${log}\n--- source ---\n${src}`);
  }
  return s;
}
