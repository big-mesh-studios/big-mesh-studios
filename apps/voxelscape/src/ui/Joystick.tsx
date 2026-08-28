import { createSignal } from "solid-js";
import { Vector2D } from "@big-mesh-studios/maths";
import { pointer } from "@big-mesh-studios/utils/pointer";
import styles from "./Joystick.module.css";

export function Joystick(props: {
  top: number;
  left: number;
  hitAreaSize: number;
  outerRingSize: number;
  knobSize: number;
  onValue: (value: Vector2D) => void;
}) {
  const [dragOffset, setDragOffset] = createSignal<Vector2D | undefined>();
  const [startPos, setStartPos] = createSignal<Vector2D>();

  async function onPointerDown(
    e: PointerEvent & { currentTarget: HTMLElement },
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    setStartPos(Vector2D.create(e.clientX - rect.left, e.clientY - rect.top));

    await pointer(e, ({ totalDelta }) => {
      const dragOffset = Vector2D.clone(totalDelta);
      const length = Vector2D.length(dragOffset);

      if (length > 0.5 * props.outerRingSize) {
        Vector2D.multiplyScalar(
          dragOffset,
          (0.5 * props.outerRingSize) / length,
          dragOffset,
        );
      }

      setDragOffset(dragOffset);
      props.onValue(
        Vector2D.multiplyScalar(dragOffset, 1.0 / props.outerRingSize),
      );
    });

    setDragOffset(undefined);
    setStartPos(undefined);
    props.onValue({ x: 0, y: 0 });
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
      onContextMenu={(e) => e.preventDefault()}
      class={styles.underlay}
    >
      <div
        style={{
          left: `${startPos()?.x ?? 0.5 * props.hitAreaSize}px`,
          top: `${startPos()?.y ?? 0.5 * props.hitAreaSize}px`,
          width: `${props.outerRingSize}px`,
          height: `${props.outerRingSize}px`,
        }}
        class={styles["outer-ring"]}
      >
        <div
          style={{
            left: `calc(50% + ${dragOffset()?.x ?? 0.0}px)`,
            top: `calc(50% + ${dragOffset()?.y ?? 0.0}px)`,
            width: `${props.knobSize}px`,
            height: `${props.knobSize}px`,
          }}
          class={styles.knob}
        ></div>
      </div>
    </div>
  );
}
