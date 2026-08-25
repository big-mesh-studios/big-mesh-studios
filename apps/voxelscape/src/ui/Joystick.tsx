import { createEffect, createSignal } from "solid-js";
import { Vector2D } from "../utils/maths";
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

  createEffect(
    () => {
      const _dragOffset = dragOffset();
      if (_dragOffset == undefined) {
        return Vector2D.create();
      }
      return Vector2D.multiplyScalar(_dragOffset, 1.0 / props.outerRingSize);
    },
    (value) => props.onValue(value),
  );

  const [startPos, setStartPos] = createSignal<Vector2D>();
  const [hitDiv, setHitDiv] = createSignal<HTMLDivElement>();
  let dragPointerId: number | undefined = undefined;

  const onPointerDown = (e: PointerEvent) => {
    let _hitDiv = hitDiv();
    if (_hitDiv == undefined) {
      return;
    }
    dragPointerId = e.pointerId;
    _hitDiv.setPointerCapture(dragPointerId);
    const rect = _hitDiv.getBoundingClientRect();
    setStartPos(Vector2D.create(e.clientX - rect.left, e.clientY - rect.top));
    setDragOffset(Vector2D.create());
  };

  const onPointerMove = (e: PointerEvent) => {
    const _hitDiv = hitDiv();
    const _startPos = startPos();

    if (_hitDiv === undefined || _startPos === undefined) {
      return;
    }

    _hitDiv.setPointerCapture(e.pointerId);

    const rect = _hitDiv.getBoundingClientRect();
    const offset = Vector2D.create(
      e.clientX - rect.left - _startPos.x,
      e.clientY - rect.top - _startPos.y,
    );
    const len = Vector2D.length(offset);

    if (len > 0.5 * props.outerRingSize) {
      Vector2D.multiplyScalar(
        offset,
        (0.5 * props.outerRingSize) / len,
        offset,
      );
    }

    setDragOffset(offset);
  };

  const onPointerUp = (e: PointerEvent) => {
    const _hitDiv = hitDiv();

    if (_hitDiv == undefined) {
      return;
    }

    if (dragPointerId == undefined) {
      return;
    }

    setStartPos(undefined);
    setDragOffset(undefined);
  };

  return (
    <div
      ref={setHitDiv}
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        width: `${props.hitAreaSize}px`,
        height: `${props.hitAreaSize}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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
