/**
 * Debug-only performance instrumentation, implemented directly against raw
 * WebGL2 since RMSL doesn't expose render targets or timer queries. Enabled
 * by appending `#perf` to the URL.
 */

/**
 * Minimal typing for the `EXT_disjoint_timer_query_webgl2` WebGL extension,
 * which is missing from the TypeScript DOM library used here.
 */
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
    this.ext = gl.getExtension(
      "EXT_disjoint_timer_query_webgl2",
    ) as ExtTimerQuery | null;
    this.supported = this.ext !== null;
    this.queries = this.supported ? [gl.createQuery(), gl.createQuery()] : [];
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
