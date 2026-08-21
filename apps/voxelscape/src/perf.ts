// Debug-only performance instrumentation (raw WebGL2; RMSL doesn't expose
// render targets or timer queries). Enabled by appending `#perf` to the URL.

// Minimal typing for EXT_disjoint_timer_query_webgl2 (missing from the TS dom
// lib used here).
interface ExtTimerQuery {
  readonly TIME_ELAPSED_EXT: GLenum;
  readonly QUERY_RESULT_AVAILABLE: GLenum;
  readonly QUERY_RESULT: GLenum;
}

/**
 * Double-buffered GPU frame timer using EXT_disjoint_timer_query_webgl2.
 * Results are polled a frame late to avoid stalling the GPU pipeline.
 */
export class GpuTimer {
  readonly supported: boolean;
  private gl: WebGL2RenderingContext;
  private ext: ExtTimerQuery | null;
  private queries: WebGLQuery[];
  private frame: number = 0;
  ms: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as ExtTimerQuery | null;
    this.supported = this.ext !== null;
    this.queries = this.supported
      ? [gl.createQuery(), gl.createQuery()]
      : [];
  }

  /** Call right before `renderer.render(...)`. */
  begin(): void {
    if (!this.ext) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.queries[this.frame % 2]);
  }

  /** Call right after `renderer.render(...)`. */
  end(): void {
    if (!this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
  }

  /** Call once per frame after `end()` to collect last frame's time. */
  poll(): void {
    if (!this.ext) return;
    if (this.frame > 0) {
      const q = this.queries[(this.frame - 1) % 2];
      if (this.gl.getQueryParameter(q, this.ext.QUERY_RESULT_AVAILABLE)) {
        const nanos = this.gl.getQueryParameter(q, this.ext.QUERY_RESULT);
        this.ms = Number(nanos) / 1e6;
      }
    }
    this.frame++;
  }
}

export interface FetchCountSample {
  /** average fine-texel fetches per ray that entered at least one chunk */
  fetchesPerRay: number;
  /** number of sampled rays that entered a chunk */
  rays: number;
  /** total fine fetches across the sampled rays */
  fetches: number;
}

/**
 * Reads back the debug heatmap produced by `LevelChunkMaterial.debugFetchCount`
 * (RG = 16-bit fetch count, A = 1 when the ray entered a chunk) and averages it
 * over a strided subset of pixels. Cheap enough to call occasionally.
 */
export function sampleFetchCount(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  stride: number = 8,
): FetchCountSample {
  // Sample a bounded central region so the readback stays cheap on high-DPR
  // mobile screens; the orbit camera keeps the volume near the screen centre.
  const rw = Math.min(Math.floor(width / 2), 1280);
  const rh = Math.min(Math.floor(height / 2), 720);
  const x0 = Math.floor((width - rw) / 2);
  const y0 = Math.floor((height - rh) / 2);
  const buf = new Uint8Array(rw * rh * 4);
  gl.readPixels(x0, y0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let rays = 0;
  let fetches = 0;
  for (let y = 0; y < rh; y += stride) {
    for (let x = 0; x < rw; x += stride) {
      const i = (y * rw + x) * 4;
      if (buf[i + 3] > 127) {
        rays++;
        fetches += buf[i + 1] * 256 + buf[i];
      }
    }
  }
  return {
    fetchesPerRay: rays > 0 ? fetches / rays : 0,
    rays,
    fetches,
  };
}
