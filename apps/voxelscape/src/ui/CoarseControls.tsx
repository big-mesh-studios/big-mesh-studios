import { Component, createSignal, onCleanup } from "solid-js";
import * as THREE from "three";
import type { InputController } from "../input";
import { ActionButton } from "./ActionButton";
import { Joystick } from "./Joystick";

const HIT = 150;
const BUTTON = 100;
const EDIT = 84;
const MARGIN = 24;

const CoarseControls: Component<{ input: InputController }> = (props) => {
  const [viewSize, setViewSize] = createSignal<THREE.Vector2>(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
  );

  const controller = new AbortController();
  window.addEventListener(
    "resize",
    () => setViewSize(new THREE.Vector2(window.innerWidth, window.innerHeight)),
    controller,
  );
  onCleanup(() => controller.abort());

  return (
    <div
      class="pointer-events-none absolute inset-0"
      style={{ "-webkit-tap-highlight-color": "transparent" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div class="pointer-events-auto">
        <Joystick
          left={MARGIN}
          top={viewSize().y - MARGIN - HIT}
          hitAreaSize={HIT}
          outerRingSize={0.8 * HIT}
          knobSize={70}
          // joystick value is -0.5..0.5 in screen axes (+y = down); convert to the
          // -1..1 input snapshot axes (+y = forward).
          onValue={(value) =>
            props.input.setTouchMove(value.x * 2, -value.y * 2)
          }
        />
      </div>

      <div class="pointer-events-auto">
        <ActionButton
          left={viewSize().x - MARGIN - BUTTON}
          top={viewSize().y - MARGIN - BUTTON}
          size={BUTTON}
          onPressed={(pressed) => {
            props.input.setTouchJump(pressed);
            if (pressed) {
              props.input.queueJump();
            }
          }}
        />
      </div>

      {/* place fires once on the last pointer that lifts off the button; a
          direct handler keeps it independent of Solid's reactive effect
          semantics */}
      <div
        class="pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => {
          e.stopPropagation();
          props.input.queuePlace();
        }}
      >
        <ActionButton
          left={viewSize().x - MARGIN - BUTTON - EDIT - 12}
          top={viewSize().y - MARGIN - BUTTON + (BUTTON - EDIT) / 2}
          size={EDIT}
          colour="0x35b06b"
        />
      </div>
    </div>
  );
};

export default CoarseControls;
