import { createSignal, createMemo, createEffect, type Accessor, type Component, type Signal } from "solid-js";
import * as THREE from "three";

export function Joystick(params: {
  position: Accessor<THREE.Vector2>,
  hitAreaSize: number | Accessor<number>,
  outerRingSize: Accessor<number>,
  knobSize: Accessor<number>,
}): {
  position: Signal<THREE.Vector2>,
  hitAreaSize: Signal<number>,
  outerRingSize: Signal<number>,
  knobSize: Signal<number>,
  dragOffset: Signal<THREE.Vector2 | undefined>,
  value: Accessor<THREE.Vector2>,
  UI: Component,
} {
  let position = createSignal(params.position());
  let hitAreaSize = createSignal(typeof params.hitAreaSize === "function" ? params.hitAreaSize() : params.hitAreaSize);
  let outerRingSize = createSignal(params.outerRingSize());
  let knobSize = createSignal(params.knobSize());
  let dragOffset = createSignal<THREE.Vector2 | undefined>();

  createEffect(() => params.position(), (p) => {
    position[1](p);
  });
  createEffect(() => typeof params.hitAreaSize === "function" ? (params.hitAreaSize as Accessor<number>)() : params.hitAreaSize as number, (h) => {
    hitAreaSize[1](h);
  });
  createEffect(() => params.outerRingSize(), (o) => {
    outerRingSize[1](o);
  });
  createEffect(() => params.knobSize(), (k) => {
    knobSize[1](k);
  });

  let value = createMemo(() => {
    let dragOffset2 = dragOffset[0]();
    if (dragOffset2 == undefined) {
      return new THREE.Vector2();
    }
    return new THREE.Vector2().copy(dragOffset2).multiplyScalar(1.0 / outerRingSize[0]());
  });

  let UI: Component = () => {
    let [ dragging, setDragging, ] = createSignal(false);
    let [ startPos, setStartPos, ] = createSignal<THREE.Vector2>();
    let [ dragOffset2, setDragOffset, ] = dragOffset;
    let [ hitDiv, setHitDiv, ] = createSignal<HTMLDivElement>();
    let dragPointerId: number | undefined = undefined;
    let hitAreaOnPointerDown = (e: PointerEvent) => {
      let div = hitDiv();
      if (div == undefined) {
        return;
      }
      dragPointerId = e.pointerId;
      div.setPointerCapture(dragPointerId);
      let rect = div.getBoundingClientRect();
      setStartPos(new THREE.Vector2(
        e.clientX - rect.left,
        e.clientY - rect.top,
      ));
      setDragOffset(new THREE.Vector2());
    };
    let hitAreaOnPointerMove = (e: PointerEvent) => {
      let div = hitDiv();
      if (div == undefined) {
        return;
      }
      let startPos2 = startPos();
      if (startPos2 == undefined) {
        return;
      }
      div.setPointerCapture(e.pointerId);
      let rect = div.getBoundingClientRect();
      let offset = new THREE.Vector2(
        e.clientX - rect.left - startPos2.x,
        e.clientY - rect.top - startPos2.y,
      );
      let len = offset.length();
      if (len > 0.5 * outerRingSize[0]()) {
        offset.multiplyScalar(0.5 * outerRingSize[0]() / len);
      }
      setDragOffset(offset);
    };
    let hitAreaOnPointerUp = (e: PointerEvent) => {
      let div = hitDiv();
      if (div == undefined) {
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
          "position": "absolute",
          "left": `${position[0]().x}px`,
          "top": `${position[0]().y}px`,
          "width": `${hitAreaSize[0]()}px`,
          "height": `${hitAreaSize[0]()}px`,
          "user-select": "none",
          "touch-action": "none",
        }}
        onPointerDown={hitAreaOnPointerDown}
        onPointerMove={hitAreaOnPointerMove}
        onPointerUp={hitAreaOnPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          style={{
            "position": "absolute",
            "left": `${startPos()?.x ?? 0.5 * hitAreaSize[0]()}px`,
            "top": `${startPos()?.y ?? 0.5 * hitAreaSize[0]()}px`,
            "transform": "translate(-50%, -50%)",
            "width": `${outerRingSize[0]()}px`,
            "height": `${outerRingSize[0]()}px`,
            "border-radius": "50%",
            "border": "5px solid rgba(255,255,255,0.5)",
            "box-sizing": "content-box",
          }}
        >
          <div
            style={{
              "position": "absolute",
              "left": `calc(50% + ${dragOffset2()?.x ?? 0.0}px)`,
              "top": `calc(50% + ${dragOffset2()?.y ?? 0.0}px)`,
              "transform": "translate(-50%,-50%)",
              "width": `${knobSize[0]()}px`,
              "height": `${knobSize[0]()}px`,
              "border-radius": "50%",
              "background-color": "rgba(255,255,255,0.5)",
            }}
          >
          </div>
        </div>
      </div>
    );
  };

  return {
    position,
    hitAreaSize,
    outerRingSize,
    knobSize,
    dragOffset,
    value,
    UI,
  };
}
