import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import * as THREE from "three";
import { queueJump, setTouchJump, setTouchMove } from "./input";
import { Joystick } from "./Joystick";
import { ActionButton } from "./ActionButton";

const Controls: Component = () => {
  const HIT = 150;
  const BUTTON = 100;
  const MARGIN = 24;
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
      () => new THREE.Vector2(MARGIN, viewSize().y - MARGIN - HIT),
    ),
    hitAreaSize: HIT,
    outerRingSize: () => 0.8 * HIT,
    knobSize: () => 70,
  });

  const actionButton = ActionButton({
    position: createMemo(
      () =>
        new THREE.Vector2(
          viewSize().x - MARGIN - BUTTON,
          viewSize().y - MARGIN - BUTTON,
        ),
    ),
    size: () => BUTTON,
  });

  // joystick value is -0.5..0.5 in screen axes (+y = down); convert to the
  // -1..1 input snapshot axes (+y = forward).
  createEffect(joystick.value, (value) => {
    setTouchMove(value.x * 2, -value.y * 2);
  });

  // jump: edge-triggered on press, and held state for swimming
  createEffect(actionButton.pressed, (pressed) => {
    setTouchJump(pressed);
    if (pressed) {
      queueJump();
    }
  });

  return (
    <div
      class="pointer-events-none absolute inset-0"
      style={{ "-webkit-tap-highlight-color": "transparent" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div class="pointer-events-auto">
        <joystick.UI />
      </div>

      <div class="pointer-events-auto">
        <actionButton.UI />
      </div>
    </div>
  );
};

export default Controls;
