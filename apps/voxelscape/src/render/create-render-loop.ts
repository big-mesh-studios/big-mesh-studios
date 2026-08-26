import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { AdaptiveResolution } from "./adaptive";
import { GpuTimer } from "./perf";

/** How many frames between each debug-perf GPU readback, which stalls the pipeline. */
const SAMPLE_EVERY = 24;

/** How long the resolution is left alone after the page becomes visible again, in frames. */
const RETURN_HOLD_FRAMES = 60;

export interface RenderLoopConfig {
  canvas: HTMLCanvasElement;
  scene: Scene;
  /** Its aspect ratio is kept in step with the canvas's layout size. */
  camera: PerspectiveCamera;
  /** The colour to clear to, read once per frame after `onFrame` has run. */
  clearColor: () => Color;
  /** Enables the GPU timer and the statistics line. */
  debugPerf: boolean;
  /**
   * The scaler deciding this canvas's render resolution, shared with whatever
   * else reads or sets it and outliving any one mounted canvas. A loop given
   * none keeps a scaler of its own.
   */
  resolution?: AdaptiveResolution;
  /** Advances the world by `dt` seconds. Called once per frame, before drawing. */
  onFrame: (dt: number) => void;
  /**
   * Renderer statistics to append to the debug line. `sample` is true only on
   * the frames where a GPU readback is affordable.
   */
  describeStats?: (
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    sample: boolean,
  ) => string;
  /** Receives the assembled debug line once per frame while `debugPerf` is on. */
  onDebugStats?: (line: string) => void;
}

export interface RenderLoop {
  /** Stops the loop, stops watching the canvas, and releases the renderer's GPU resources. */
  dispose(): void;
}

/**
 * Drives one canvas: a renderer, the frame loop, and the resolution scaler it
 * feeds each frame's gap to. Knows nothing about what it draws beyond the
 * scene and camera handed to it.
 */
export const createRenderLoop = ({
  canvas,
  scene,
  camera,
  debugPerf,
  resolution,
  onFrame,
  clearColor,
  describeStats,
  onDebugStats,
}: RenderLoopConfig): RenderLoop => {
  const renderer = new WebGLRenderer(canvas);
  renderer.setClearColor(clearColor(), 1);
  const timer = debugPerf ? new GpuTimer(renderer.gl) : undefined;

  /**
   * The scaler this loop reports each frame's gap to and takes the render
   * scale from. Its own when the caller supplied none, in which case it lives
   * and dies with this loop.
   */
  const adaptive = resolution ?? new AdaptiveResolution();
  /** The canvas's layout size in device pixels; the scale is applied on top of it. */
  let baseWidth = 0;
  let baseHeight = 0;
  let lastAdaptTime = 0;
  let lastFrameTime = 0;
  let frameCounter = 0;

  /**
   * Draws one frame.
   *
   * @returns Whether this frame took a GPU readback for the statistics line.
   * Those frames stall the pipeline, so their timing can't be used to decide
   * the resolution.
   */
  const render = (): boolean => {
    if (timer === undefined) {
      renderer.render(scene, camera);
      return false;
    }
    timer.begin();
    renderer.render(scene, camera);
    timer.end();
    timer.poll();
    frameCounter++;
    const sample = frameCounter % SAMPLE_EVERY === 0;
    const stats = describeStats?.(
      renderer.gl,
      renderer.canvas.width,
      renderer.canvas.height,
      sample,
    );
    onDebugStats?.(
      `frame: ${timer.ms.toFixed(2)} ms | resolution: ${adaptive.scale.toFixed(3)}x | ${stats ?? ""}`,
    );
    return sample;
  };

  const applyResolution = (scale: number): void => {
    if (baseWidth <= 0 || baseHeight <= 0) {
      return;
    }
    const width = Math.max(1, Math.round(baseWidth * scale));
    const height = Math.max(1, Math.round(baseHeight * scale));
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
      // Resizing the canvas clears its drawing buffer to transparent, which
      // would flash the page background until the next RAF frame. Draw the new
      // resolution immediately so the compositor never shows the cleared buffer.
      render();
    }
  };

  const animate = (time: number): void => {
    const dt =
      lastFrameTime > 0
        ? Math.min(0.05, (time - lastFrameTime) / 1000)
        : 1 / 60;
    lastFrameTime = time;
    onFrame(dt);
    renderer.setClearColor(clearColor(), 1);
    const sampled = render();
    // A hidden page still gets frames, roughly one a second rather than sixty,
    // and every one of them misses its deadline by any measure taken here. The
    // resolution would walk itself down for as long as the player was in
    // another tab, so nothing is measured while they are.
    if (lastAdaptTime > 0 && !document.hidden) {
      const frameMs = time - lastAdaptTime;
      applyResolution(
        sampled ? adaptive.frame(frameMs) : adaptive.update(frameMs),
      );
    }
    lastAdaptTime = time;
  };

  /**
   * Discards the timing carried over from before the page was hidden. The
   * first frame back would otherwise report the whole time away as one
   * frame's gap, and the frames after it pay for textures and programs the
   * browser reclaimed in the background, so neither is measured.
   */
  const onVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") {
      return;
    }
    lastAdaptTime = 0;
    lastFrameTime = 0;
    adaptive.hold(RETURN_HOLD_FRAMES);
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  const resizeObserver = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    if (!Number.isFinite(aspect) || aspect <= 0) {
      return;
    }
    baseWidth = rect.width * window.devicePixelRatio;
    baseHeight = rect.height * window.devicePixelRatio;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // a layout change changes the render cost, so hold adaptation while
    // the new base resolution settles
    adaptive.hold();
    applyResolution(adaptive.scale);
  });
  resizeObserver.observe(canvas);
  renderer.setAnimationLoop(animate);

  return {
    dispose() {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      // release the renderer's GPU programs, buffers and textures
      renderer.dispose();
    },
  };
};
