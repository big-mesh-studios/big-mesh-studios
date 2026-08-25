import {
  createMemo,
  createSignal,
  type Accessor,
  type Component,
} from "solid-js";
import * as THREE from "three";
import styles from "./createJoystick.module.css";

export function createJoystick({
  position,
  hitAreaSize,
  outerRingSize,
  knobSize,
}: {
  position: Accessor<THREE.Vector2>;
  hitAreaSize: Accessor<number>;
  outerRingSize: Accessor<number>;
  knobSize: Accessor<number>;
}): {
  value: Accessor<THREE.Vector2>;
  UI: Component;
} {
  const [dragOffset, setDragOffset] = createSignal<THREE.Vector2 | undefined>();

  const value = createMemo(() => {
    const _dragOffset = dragOffset();
    if (_dragOffset == undefined) {
      return new THREE.Vector2();
    }
    return new THREE.Vector2()
      .copy(_dragOffset)
      .multiplyScalar(1.0 / outerRingSize());
  });

  const UI: Component = () => {
    const [startPos, setStartPos] = createSignal<THREE.Vector2>();
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
      setStartPos(
        new THREE.Vector2(e.clientX - rect.left, e.clientY - rect.top),
      );
      setDragOffset(new THREE.Vector2());
    };

    const onPointerMove = (e: PointerEvent) => {
      const _hitDiv = hitDiv();
      const _startPos = startPos();

      if (_hitDiv === undefined || _startPos === undefined) {
        return;
      }

      _hitDiv.setPointerCapture(e.pointerId);

      const rect = _hitDiv.getBoundingClientRect();
      const offset = new THREE.Vector2(
        e.clientX - rect.left - _startPos.x,
        e.clientY - rect.top - _startPos.y,
      );
      const len = offset.length();

      if (len > 0.5 * outerRingSize()) {
        offset.multiplyScalar((0.5 * outerRingSize()) / len);
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
          left: `${position().x}px`,
          top: `${position().y}px`,
          width: `${hitAreaSize()}px`,
          height: `${hitAreaSize()}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        class={styles.underlay}
      >
        <div
          style={{
            left: `${startPos()?.x ?? 0.5 * hitAreaSize()}px`,
            top: `${startPos()?.y ?? 0.5 * hitAreaSize()}px`,
            width: `${outerRingSize()}px`,
            height: `${outerRingSize()}px`,
          }}
          class={styles["outer-ring"]}
        >
          <div
            style={{
              left: `calc(50% + ${dragOffset()?.x ?? 0.0}px)`,
              top: `calc(50% + ${dragOffset()?.y ?? 0.0}px)`,
              width: `${knobSize()}px`,
              height: `${knobSize()}px`,
            }}
            class={styles.knob}
          ></div>
        </div>
      </div>
    );
  };

  return {
    value,
    UI,
  };
}
