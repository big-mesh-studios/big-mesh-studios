/**
 * Photos: a frame rendered once, kept as a canvas, and shown without asking the GPU again.
 *
 * ## Why a photo is a canvas and not a render target
 *
 * A live feed stays on the GPU because it changes every frame and a readback would cost a hundred
 * kilobytes each time. A photo is the opposite: it is taken once and then shown as a still, on a
 * screen or in the HUD, for as long as the place wants it. So the one place a readback is exactly
 * right is here — **read the pixels once, and everything afterwards is a `drawImage`**.
 *
 * The canvas is also what makes a photo safe to hand around inside the engine. The guest API gets
 * an id and a size; the canvas never crosses the sandbox, so a script can show a photo, put it on a
 * screen or offer it for saving, and cannot read it, hash it or send it anywhere.
 *
 * ## Why the picture is of the world and not of the screen
 *
 * A photo is rendered into a throwaway target from a camera, not read off the canvas. That is what
 * keeps the crosshair, the HUD, a dialog and the console out of it: none of those are in the GL
 * scene, and none of them can be, because `Renderer.render` draws the scene and nothing else. The
 * same call gives the same picture whatever the player had open.
 *
 * ## The pixels arrive after the id does
 *
 * `takePhoto` returns an id immediately and the host allocates it. The canvas is black until the
 * frame is captured, which is a state a place can observe but not a failure: a screen showing that
 * id fills in a frame or two later, exactly as a `toast` appears on the next frame. There is no
 * event and no promise to await, because nothing in a place script can act on completion anyway.
 */

import {
  Texture,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "@random-mesh/rmsl/scene";

import type { HostPhoto, PhotoRequest } from "../places/host";

/** One photo to render this frame, and the target to render it into. */
export interface PhotoJob {
  readonly request: PhotoRequest;
  readonly target: WebGLRenderTarget;
}

interface PhotoEntry {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly texture: Texture;
}

export interface PhotoLayer {
  /** Allocates a photo and queues it. The same id twice replaces the queued job, not the photo. */
  request(request: PhotoRequest): void;
  /** The next photo to render, or `undefined` when there is none or one is still being read. */
  next(): PhotoJob | undefined;
  /**
   * Reads a rendered job back into its canvas.
   *
   * **Call immediately after drawing into `job.target`**, and do not draw into that target again
   * until the promise resolves: the readback is fenced, and the next job takes the target only when
   * it is free.
   */
  capture(
    job: PhotoJob,
    renderer: Pick<WebGLRenderer, "readPixelsAsync">,
  ): Promise<void>;
  /** The texture a screen draws a photo from, if the pixels have been captured. */
  texture(id: string): Texture | undefined;
  /** The canvas the HUD draws a photo from, whether or not it has been captured yet. */
  canvas(id: string): CanvasImageSource | undefined;
  /** Drops photos the host no longer knows about, and any queued job for them. */
  reconcile(photos: readonly HostPhoto[]): void;
  dispose(): void;
}

export const createPhotoLayer = (): PhotoLayer => {
  const entries = new Map<string, PhotoEntry>();
  const queue: PhotoRequest[] = [];
  /**
   * The one target every photo is drawn through.
   *
   * **One rather than one per photo**, because photos are captured one at a time and a target is
   * only a surface: it is resized to whatever the next request asks for. A target per photo would
   * be a framebuffer per photo held for as long as the place keeps the picture, which is the
   * opposite of what a photo is for.
   */
  const target = new WebGLRenderTarget(1, 1);
  /**
   * Whether a readback is in flight.
   *
   * **Because the target cannot be drawn into again until it is read**, and a second pass between
   * the read and the fence would put the next photo's pixels in the first photo's canvas. One job
   * a frame is already more than enough for a photo.
   */
  let busy = false;

  const remove = (id: string): void => {
    const entry = entries.get(id);
    if (entry === undefined) return;
    entry.texture.dispose();
    entries.delete(id);
    const at = queue.findIndex((request) => request.id === id);
    if (at >= 0) queue.splice(at, 1);
  };

  return {
    request(request): void {
      if (entries.has(request.id)) {
        // The host refuses a duplicate id, so this is a second request for an id that already
        // exists — which can only be a route that bypassed the host. Keep the first picture and
        // drop the duplicate rather than silently taking a second one.
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(request.width));
      canvas.height = Math.max(1, Math.round(request.height));
      const context = canvas.getContext("2d");
      if (context === null) return;
      // **Filled black rather than left transparent.** A photo that has not been captured is a
      // black rectangle, which is a state a place can explain; a transparent one shows whatever is
      // behind it, which looks like a hole in the screen.
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const texture = new Texture(canvas);
      texture.needsUpdate = true;
      entries.set(request.id, {
        canvas,
        context,
        texture,
      });
      queue.push(request);
    },

    next(): PhotoJob | undefined {
      if (busy) return undefined;
      while (queue.length > 0) {
        const request = queue.shift()!;
        const entry = entries.get(request.id);
        if (entry === undefined) continue;
        target.width = Math.max(1, Math.round(request.width));
        target.height = Math.max(1, Math.round(request.height));
        return { request, target };
      }
      return undefined;
    },

    async capture(job, renderer): Promise<void> {
      const entry = entries.get(job.request.id);
      if (entry === undefined) return;
      busy = true;
      try {
        const pixels = await renderer.readPixelsAsync(job.target);
        const width = job.target.width;
        const height = job.target.height;
        // **Flipped once, here.** `readPixels` returns the bottom row first and `putImageData`
        // expects the top row first, so the two disagree by exactly one reversal. Doing it in the
        // shader, in the camera's projection or by flipping the texture's UVs all cost more and
        // all make the mistake harder to find.
        const flipped = new Uint8ClampedArray(pixels.length);
        const row = width * 4;
        for (let y = 0; y < height; y++) {
          flipped.set(
            pixels.subarray(y * row, y * row + row),
            (height - 1 - y) * row,
          );
        }
        entry.context.putImageData(new ImageData(flipped, width, height), 0, 0);
        entry.texture.needsUpdate = true;
      } finally {
        busy = false;
      }
    },

    texture(id): Texture | undefined {
      return entries.get(id)?.texture;
    },

    canvas(id): CanvasImageSource | undefined {
      return entries.get(id)?.canvas;
    },

    reconcile(photos): void {
      const live = new Set(photos.map((photo) => photo.id));
      for (const id of [...entries.keys()]) {
        if (!live.has(id)) remove(id);
      }
      for (let at = queue.length - 1; at >= 0; at--) {
        if (!live.has(queue[at]!.id)) queue.splice(at, 1);
      }
    },

    dispose(): void {
      for (const id of [...entries.keys()]) remove(id);
      queue.length = 0;
    },
  };
};
