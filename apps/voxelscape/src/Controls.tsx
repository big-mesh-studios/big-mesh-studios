import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import * as THREE from "three";
import { queueJump, setTouchMove } from "./input";
import { Joystick } from "./Joystick";

const BTN_CLS =
  "pointer-events-auto flex items-center justify-center rounded-xl border border-white/40 " +
  "bg-white/15 text-white select-none touch-none active:bg-white/30";

const Controls: Component = () => {
  const HIT = 150;
  const [viewSize, setViewSize] = createSignal<THREE.Vector2>(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
  );
  const onResize = (): void => {
    setViewSize(new THREE.Vector2(window.innerWidth, window.innerHeight));
  };
  window.addEventListener("resize", onResize);
  onCleanup(() => window.removeEventListener("resize", onResize));

  const joystick = Joystick({
    position: createMemo(
      () => new THREE.Vector2(24, viewSize().y - 24 - HIT),
    ),
    hitAreaSize: HIT,
    outerRingSize: () => 0.8 * HIT,
    knobSize: () => 70,
  });

  // joystick value is -0.5..0.5 in screen axes (+y = down); convert to the
  // -1..1 input snapshot axes (+y = forward).
  createEffect(
    joystick.value,
    (value) => {
      setTouchMove(value.x * 2, -value.y * 2);
    },
  );

  return (
    <div
      class="pointer-events-none absolute inset-0"
      style={{ "-webkit-tap-highlight-color": "transparent" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div class="pointer-events-auto">
        <joystick.UI />
      </div>

      <button
        type="button"
        class={`${BTN_CLS} absolute bottom-10 right-8 h-20 w-20 rounded-full text-lg font-bold`}
        onPointerDown={(e) => {
          e.preventDefault();
          queueJump();
        }}
      >
        JUMP
      </button>
    </div>
  );
};

export default Controls;
