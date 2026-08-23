import { Accessor, createEffect, createRoot, createSignal, untrack } from "solid-js";
import { Dimensions3D, Matrix3x3, RGBA } from "./maths";
import type { RendererKind, Sides } from "./types";
import { tryCatch } from "./utils";
import {
  createOrbitCameraState,
  getWorldToModel,
  orbitBy,
  setAutorotating,
  zoomBy,
  zoomTo,
} from "./model-camera";
import { createCpuModelRenderer } from "./model-cpu/renderer";
import { createGpuModelRenderer } from "./model-gpu/renderer";
import type { ModelRendererFactory } from "./model-renderer";

const RENDERER_FACTORIES: Record<RendererKind, ModelRendererFactory> = {
  gpu: createGpuModelRenderer,
  cpu: createCpuModelRenderer,
};

export type ModelCanvasParams = {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  rendererKind: Accessor<RendererKind>;
  dimensions: Accessor<Dimensions3D>;
  sides: Accessor<Sides>;
  sidesVersion: Accessor<number>;
  palette: Accessor<RGBA[]>;
  unlit: Accessor<boolean>;
  autorotate: Accessor<boolean>;
};

/**
 * Owns everything a model renderer needs around it but has no business
 * knowing about itself: sizing the canvas to its drawing buffer, driving a
 * frame loop, turning pointer and wheel input into orbit and zoom, and
 * constructing the renderer named by `rendererKind` (tearing down and
 * replacing it whenever that changes). The orbit camera is created once, so
 * the current framing carries over across a renderer swap instead of
 * resetting.
 */
export function createModelCanvas(params: ModelCanvasParams) {
  const orbit = createOrbitCameraState();
  createEffect(params.autorotate, rotating => setAutorotating(orbit, rotating));

  const [glError, setGlError] = createSignal<string | undefined>();
  const [pickedVoxel, setPickedVoxel] = createSignal<
    readonly [number, number, number] | undefined
  >();

  const pitchMatrix = Matrix3x3.create();
  const yawMatrix = Matrix3x3.create();
  const worldToModel = Matrix3x3.create();

  createEffect(
    () => [params.canvas(), params.rendererKind()] as const,
    ([canvas, rendererKind]) => {
      setGlError(undefined);
      setPickedVoxel(undefined);
      if (canvas === undefined) {
        return;
      }

      const renderer = tryCatch(
        () => RENDERER_FACTORIES[rendererKind](canvas),
        e => {
          setGlError(e instanceof Error ? e.message : String(e));
        },
      );
      if (!renderer) {
        return;
      }

      renderer.setModel(untrack(params.dimensions), untrack(params.sides));
      renderer.setPalette(untrack(params.palette));
      renderer.setUnlit(untrack(params.unlit));

      const sizeToCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        renderer.resize(
          Math.max(1, Math.round(rect.width * dpr)),
          Math.max(1, Math.round(rect.height * dpr)),
        );
      };
      sizeToCanvas();
      const resizeObserver = new ResizeObserver(sizeToCanvas);
      resizeObserver.observe(canvas);

      // Reactive pushes into this renderer instance live in their own root,
      // so they can be disposed together and by name rather than relying on
      // an outer effect's implicit teardown.
      const disposeBindings = createRoot(dispose => {
        createEffect(
          () => [params.dimensions(), params.sides(), params.sidesVersion()] as const,
          ([dimensions, sides]) => renderer.setModel(dimensions, sides),
        );
        createEffect(params.palette, palette => renderer.setPalette(palette));
        createEffect(params.unlit, unlit => renderer.setUnlit(unlit));
        return dispose;
      });

      const pickAt = (clientX: number, clientY: number) => {
        if (renderer.pick === undefined) {
          return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
          return;
        }
        getWorldToModel(orbit, untrack(params.autorotate), pitchMatrix, yawMatrix, worldToModel);
        const uv: [number, number] = [x / rect.width, 1 - y / rect.height];
        const picked = renderer.pick(uv, orbit, worldToModel);
        setPickedVoxel(picked?.slice() as [number, number, number] | undefined);
      };

      // One finger orbits, two fingers pinch to zoom. Every pointer is
      // tracked so the pinch can be measured from both of them regardless of
      // which raised the move; while pinching, the drag (and the pick
      // readout) is suspended.
      const activePointers = new Map<number, { x: number; y: number }>();
      let pinchDistance = 0;
      const pinchSpan = () => {
        const [a, b] = [...activePointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
      };

      const handlePointerDown = (event: PointerEvent) => {
        const first = activePointers.size === 0;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        // Keep receiving moves for this pointer even when it leaves the
        // canvas, so a drag (or a pinch) can run past its edge.
        canvas.setPointerCapture(event.pointerId);
        if (first) {
          // Pick immediately, so a tap (which produces no pointermove) still
          // selects the voxel under the finger.
          pickAt(event.clientX, event.clientY);
        } else if (activePointers.size === 2) {
          pinchDistance = pinchSpan();
        }
      };
      const handlePointerMove = (event: PointerEvent) => {
        const tracked = activePointers.get(event.pointerId);
        if (tracked === undefined) {
          return;
        }
        const delta = { x: event.clientX - tracked.x, y: event.clientY - tracked.y };
        tracked.x = event.clientX;
        tracked.y = event.clientY;

        if (activePointers.size >= 2) {
          const distance = pinchSpan();
          if (pinchDistance > 0) {
            // Spreading the fingers (distance grows) zooms in, i.e. pulls
            // the camera closer, so the radius scales by the inverse ratio.
            zoomTo(orbit, pinchDistance / distance);
          }
          pinchDistance = distance;
          return;
        }

        // Keep the readout in step with the cursor — including while
        // orbiting, where the model turns beneath the pointer.
        pickAt(event.clientX, event.clientY);
        orbitBy(orbit, delta.x, delta.y);
      };
      const handlePointerEnd = (event: PointerEvent) => {
        activePointers.delete(event.pointerId);
        if (activePointers.size < 2) {
          pinchDistance = 0;
        }
      };
      const handleWheel = (event: WheelEvent) => {
        zoomBy(orbit, Math.sign(event.deltaY));
      };

      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerup", handlePointerEnd);
      canvas.addEventListener("pointercancel", handlePointerEnd);
      canvas.addEventListener("wheel", handleWheel);

      let rafId = requestAnimationFrame(function loop() {
        getWorldToModel(orbit, untrack(params.autorotate), pitchMatrix, yawMatrix, worldToModel);
        renderer.render(orbit, worldToModel);
        rafId = requestAnimationFrame(loop);
      });

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerEnd);
        canvas.removeEventListener("pointercancel", handlePointerEnd);
        canvas.removeEventListener("wheel", handleWheel);
        disposeBindings();
        renderer.dispose();
      };
    },
  );

  return { glError, pickedVoxel };
}
