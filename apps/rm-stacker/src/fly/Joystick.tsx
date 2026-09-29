import { createSignal } from "solid-js";
import { Vector2D } from "@big-mesh-studios/maths";
import { pointer } from "@big-mesh-studios/utils/pointer";
import styles from "./Joystick.module.css";

/**
 * A thumb stick for a camera in flight: a ring that appears wherever the
 * thumb lands and a knob that follows it, reporting a direction rather than a
 * place.
 */
export function Joystick(props: {
  left: number;
  top: number;
  hitAreaSize: number;
  outerRingSize: number;
  knobSize: number;
  /**
   * The direction the thumb is pushed, from -1 to 1 on each axis, with a
   * positive y being forwards — which is the way up a screen runs the other way
   * round from, so the sign is flipped here rather than at every call.
   */
  onValue: (value: Vector2D) => void;
}) {
  const [dragOffset, setDragOffset] = createSignal<Vector2D | undefined>();
  const [startPos, setStartPos] = createSignal<Vector2D>();

  async function onPointerDown(
    event: PointerEvent & { currentTarget: HTMLElement },
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    setStartPos(
      Vector2D.create(event.clientX - rect.left, event.clientY - rect.top),
    );

    await pointer(event, ({ totalDelta }) => {
      const pushed = Vector2D.clone(totalDelta);
      const reach = 0.5 * props.outerRingSize;
      const length = Vector2D.length(pushed);

      // The knob stops at the ring rather than sliding out of it, so a thumb
      // pushed past the end of its travel asks for the most there is and no
      // more.
      if (length > reach) {
        Vector2D.multiplyScalar(pushed, reach / length, pushed);
      }

      setDragOffset(pushed);
      props.onValue(
        Vector2D.create(
          pushed.x / props.outerRingSize,
          -pushed.y / props.outerRingSize,
        ),
      );
    });

    setDragOffset(undefined);
    setStartPos(undefined);
    props.onValue(Vector2D.create());
  }

  return (
    <div
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        width: `${props.hitAreaSize}px`,
        height: `${props.hitAreaSize}px`,
      }}
      onPointerDown={onPointerDown}
      onContextMenu={(event) => event.preventDefault()}
      class={styles.underlay}
    >
      <div
        style={{
          left: `${startPos()?.x ?? 0.5 * props.hitAreaSize}px`,
          top: `${startPos()?.y ?? 0.5 * props.hitAreaSize}px`,
          width: `${props.outerRingSize}px`,
          height: `${props.outerRingSize}px`,
        }}
        class={styles.ring}
      >
        <div
          style={{
            left: `calc(50% + ${dragOffset()?.x ?? 0}px)`,
            top: `calc(50% + ${dragOffset()?.y ?? 0}px)`,
            width: `${props.knobSize}px`,
            height: `${props.knobSize}px`,
          }}
          class={styles.knob}
        />
      </div>
    </div>
  );
}
