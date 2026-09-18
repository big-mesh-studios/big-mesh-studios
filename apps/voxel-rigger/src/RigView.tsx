// The viewport the rig is drawn in, and the pointer that draws and drags it.
// The scene itself is a plain object; the component keeps it in step with the
// rig's signals and drives a frame from the animation loop.
import { createMediaQuery } from "@big-mesh-studios/utils/create-media-query";
import {
  createEffect,
  createSignal,
  flush,
  onSettled,
  Show,
  useContext,
  type Component,
} from "solid-js";
import { RigContext } from "./context";
import { GestureTracker } from "./input/gestures";
import { rigBounds } from "./rig/bounds";
import { RigScene } from "./scene/rig-scene";
import styles from "./EditorPage.module.css";

/** What a press on the canvas has begun, until the pointer lifts or a second
 * finger turns it into a camera gesture. */
interface Single {
  kind: "orbit" | "pan" | "bone";
  bone?: string;
  x: number;
  y: number;
}

/** How near a joint has to be to a mouse. A finger gets a wider reach. */
const JOINT_GRAB_MOUSE = 16;
const JOINT_GRAB_TOUCH = 24;

/** How much one press of a zoom button changes the distance. */
const ZOOM_STEP = 1.25;

/** How high the drawing buffer is allowed to run, to spare a phone's battery. */
const MAX_PIXEL_RATIO = 2;

const RigView: Component = () => {
  const rig = useContext(RigContext);
  const coarse = createMediaQuery("(pointer: coarse)");

  let canvas: HTMLCanvasElement | undefined;
  const [scene, setScene] = createSignal<RigScene>();
  const tracker = new GestureTracker();
  let single: Single | null = null;

  const size = () => {
    const rect = canvas!.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  const pointer = (event: PointerEvent) => {
    const rect = canvas!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const grabRadius = () => (coarse() ? JOINT_GRAB_TOUCH : JOINT_GRAB_MOUSE);

  onSettled(() => {
    const held = new RigScene(canvas!);
    setScene(held);

    const sizeToCanvas = () => {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      held.resize(
        Math.max(1, Math.round(rect.width * dpr)),
        Math.max(1, Math.round(rect.height * dpr)),
      );
    };
    sizeToCanvas();

    const observer = new ResizeObserver(sizeToCanvas);
    observer.observe(canvas!);

    let last = performance.now();

    // A frame is not drawn and time does not pass while the tab is out of
    // sight, so a phone left on the editor does not run its battery flat.
    let paused = document.hidden;
    const onVisibility = () => {
      paused = document.hidden;
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let rafId = requestAnimationFrame(function frame(now) {
      const delta = (now - last) / 1000;
      last = now;

      if (!paused) {
        rig.advance(delta);
        // The pose a step of the transport makes has to reach the scene before
        // the frame is drawn, which the write itself only does on a later flush.
        flush();
        held.render();
      }

      rafId = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      tracker.clear();
    };
  });

  createEffect(
    () => [scene(), rig.parts(), rig.palette()] as const,
    ([held, parts, palette]) => {
      held?.setParts(parts, palette);
    },
  );

  createEffect(
    () =>
      [
        scene(),
        rig.skeleton(),
        rig.bindings(),
        rig.posed(),
        rig.selectedBone(),
      ] as const,
    ([held, skeleton, bindings, posed, selected]) => {
      held?.apply(skeleton, bindings, posed, selected);
    },
  );

  createEffect(
    () => [scene(), rig.frameToken()] as const,
    ([held]) => {
      if (held === undefined) {
        return;
      }
      const bounds = rigBounds(rig.parts(), rig.skeleton());
      held.fit(bounds.centre, bounds.radius);
    },
  );

  const handlePointerDown = (event: PointerEvent) => {
    canvas!.setPointerCapture(event.pointerId);
    const at = pointer(event);
    tracker.down({ id: event.pointerId, x: event.clientX, y: event.clientY });

    // A second finger turns whatever was begun into a camera gesture, and the
    // one finger action is let go of rather than carried on.
    if (tracker.twoFinger) {
      single = null;
      return;
    }

    if (
      event.pointerType === "mouse" &&
      (event.button === 2 || event.shiftKey)
    ) {
      single = { kind: "pan", x: event.clientX, y: event.clientY };
      return;
    }

    const mode = rig.mode();

    if (mode === "draw") {
      const point = scene()?.groundAt(at, size());
      if (point !== null && point !== undefined) {
        rig.addBoneAt(rig.selectedBone(), point);
      }
      single = null;
      return;
    }

    if (mode === "bone" || mode === "part") {
      const hit = scene()?.boneAt(at, size(), grabRadius()) ?? null;
      if (hit !== null) {
        rig.setSelectedBone(hit);
        rig.commit();
        single = {
          kind: "bone",
          bone: hit,
          x: event.clientX,
          y: event.clientY,
        };
        return;
      }
    }

    single = { kind: "orbit", x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent) => {
    const gesture = tracker.move({
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    });

    if (tracker.twoFinger) {
      if (gesture?.pan !== undefined) {
        scene()?.pan(gesture.pan.dx, gesture.pan.dy);
      }
      if (gesture?.zoom !== undefined) {
        scene()?.zoomBy(gesture.zoom);
      }
      return;
    }

    if (single === null) {
      return;
    }

    const dx = event.clientX - single.x;
    const dy = event.clientY - single.y;
    single.x = event.clientX;
    single.y = event.clientY;

    if (single.kind === "orbit") {
      scene()?.orbit(dx, dy);
    } else if (single.kind === "pan") {
      scene()?.pan(dx, dy);
    } else if (single.bone !== undefined) {
      const point = scene()?.groundAt(pointer(event), size());
      if (point !== null && point !== undefined) {
        rig.moveBone(single.bone, point);
      }
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    tracker.up(event.pointerId);

    if (tracker.pointers === 0) {
      single = null;
    } else if (single === null) {
      // A pinch that ends on one finger carries on as an orbit, from where the
      // finger actually is, rather than dropping to nothing or jumping.
      const rest = tracker.remaining();
      if (rest !== undefined) {
        single = { kind: "orbit", x: rest.x, y: rest.y };
      }
    }

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const hint = () => {
    const touch = coarse();
    switch (rig.mode()) {
      case "draw":
        return touch
          ? "Tap to drop a joint; it hangs off the selected bone."
          : "Click to drop a joint; it hangs off the selected bone.";
      case "bone":
        return touch
          ? "Tap a joint to select it, drag to move it."
          : "Click a joint to select it, drag to move it.";
      case "part":
        return touch
          ? "Tap a joint to pick the bone the selected part binds to."
          : "Click a joint to pick the bone the selected part binds to.";
      default:
        return touch
          ? "Drag to orbit · pinch to zoom · two fingers to pan."
          : "Drag to orbit, shift-drag or right-drag to pan, wheel to zoom.";
    }
  };

  return (
    <div class={styles.viewport}>
      <canvas
        ref={(element) => (canvas = element)}
        class={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(event) => event.preventDefault()}
        onWheel={(event) => {
          event.preventDefault();
          scene()?.zoom(event.deltaY);
        }}
      />
      <div class={styles.mode}>
        <ModeButton mode="orbit" label="Orbit" />
        <ModeButton mode="draw" label="Draw" />
        <ModeButton mode="bone" label="Bone" />
        <ModeButton mode="part" label="Bind" />
      </div>
      <Show when={coarse()}>
        <div class={styles.zoom}>
          <button
            class={styles.zoomButton}
            aria-label="Zoom in"
            onClick={() => scene()?.zoomBy(ZOOM_STEP)}
          >
            +
          </button>
          <button
            class={styles.zoomButton}
            aria-label="Zoom out"
            onClick={() => scene()?.zoomBy(1 / ZOOM_STEP)}
          >
            −
          </button>
        </div>
      </Show>
      <div class={styles.hint}>{hint()}</div>
    </div>
  );
};

const ModeButton: Component<{ mode: string; label: string }> = (props) => {
  const rig = useContext(RigContext);
  return (
    <button
      class={[
        styles.modeButton,
        { [styles.modeActive]: rig.mode() === props.mode },
      ]}
      onClick={() => rig.setMode(props.mode as ReturnType<typeof rig.mode>)}
    >
      {props.label}
    </button>
  );
};

export default RigView;
