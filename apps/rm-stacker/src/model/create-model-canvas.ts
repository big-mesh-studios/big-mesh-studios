import { Accessor, createEffect, createRoot, createSignal, untrack } from "solid-js";
import { Dimensions3D, Matrix3x3, RGBA, Vector3D } from "../maths";
import type { RendererKind, Sides } from "../types";
import { tryCatch } from "../utils";
import { createCpuModelRenderer } from "./cpu/renderer";
import { createGpuModelRenderer } from "./gpu/renderer";
import {
  createOrbitCameraState,
  getWorldToModel,
  orbitBy,
  setAutorotating,
  zoomBy,
  zoomTo,
} from "./model-camera";
import { AMBIENT_COLOUR, LIGHT_COLOUR, modelSpaceLightDirection } from "./shared/lighting";
import { paletteToBytes } from "./shared/palette-texture";
import {
  PANEL_PAIR_KINDS,
  PANEL_PAIR_UNIFORM_NAME,
  toPanelPairTextures,
} from "./shared/panel-textures";
import shaders from "./shared/shaders";
import { voxelPicker } from "./shared/voxel-picker";
import type { ModelRendererFactory } from "./types";

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
 * frame loop, turning pointer and wheel input into orbit and zoom,
 * resolving a screen point to a voxel, and constructing the renderer named
 * by `rendererKind` (tearing down and replacing it whenever that changes).
 * The orbit camera is created once, so the current framing carries over
 * across a renderer swap instead of resetting.
 *
 * Picking is backend-agnostic: the panels a model is drawn from are always
 * available regardless of which renderer is mounted, so this always picks
 * the same way (the same march the GPU renderer draws with) rather than
 * asking the current renderer to resolve it — which also means the picked
 * voxel survives a renderer swap.
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
  const modelSpaceLightDirectionVec = Vector3D.create();

  // Picking data, cached from the store and rebuilt only when it changes —
  // not on every pointer move or frame.
  let pairTextures = toPanelPairTextures(untrack(params.sides));
  let paletteBytes = paletteToBytes(untrack(params.palette));

  createEffect(
    () => [params.sides(), params.sidesVersion()] as const,
    ([sides]) => {
      pairTextures = toPanelPairTextures(sides);
    },
  );
  createEffect(params.palette, palette => {
    paletteBytes = paletteToBytes(palette);
  });

  const pickAt = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return;
    }

    const dimensions = untrack(params.dimensions);
    const normalizedDimensions = Dimensions3D.normalize(dimensions);
    getWorldToModel(orbit, untrack(params.autorotate), pitchMatrix, yawMatrix, worldToModel);
    modelSpaceLightDirection(worldToModel, modelSpaceLightDirectionVec);

    const picked = voxelPicker({
      uniforms: {
        [shaders.uResolution]: [canvas.width, canvas.height],
        [shaders.uDimensions]: [
          normalizedDimensions.width,
          normalizedDimensions.height,
          normalizedDimensions.depth,
        ],
        [shaders.uVoxelCount]: [dimensions.width, dimensions.height, dimensions.depth],
        [shaders.uLightDir]: [
          modelSpaceLightDirectionVec.x,
          modelSpaceLightDirectionVec.y,
          modelSpaceLightDirectionVec.z,
        ],
        [shaders.uLightColour]: Array.from(LIGHT_COLOUR),
        [shaders.uAmbientColour]: Array.from(AMBIENT_COLOUR),
        [shaders.uCameraPosition]: [0, 0, orbit.radius],
        [shaders.uWorldToModel]: Array.from(worldToModel),
        [shaders.uUnlit]: untrack(params.unlit),
      },
      varying: { vUv: [x / rect.width, 1 - y / rect.height] },
      textures: {
        ...Object.fromEntries(
          PANEL_PAIR_KINDS.map(kind => [PANEL_PAIR_UNIFORM_NAME[kind], pairTextures[kind]]),
        ),
        [shaders.uPalette]: {
          data: paletteBytes,
          width: untrack(params.palette).length,
          height: 1,
        },
      },
    });

    // The picker is not reentrant: it returns a shared scratch array that it
    // mutates in place on every call, so it is copied before it is kept.
    setPickedVoxel(picked.slice() as [number, number, number]);
  };

  createEffect(
    () => [params.canvas(), params.rendererKind()] as const,
    ([canvas, rendererKind]) => {
      setGlError(undefined);
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
          pickAt(canvas, event.clientX, event.clientY);
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
        pickAt(canvas, event.clientX, event.clientY);
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
        renderer.render(orbit, worldToModel, pickedVoxel());
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
