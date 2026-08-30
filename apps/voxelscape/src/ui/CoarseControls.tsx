import { Component, createSignal, onCleanup } from "solid-js";
import styles from "./CoarseControls.module.css";
import * as THREE from "three";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { ActionButton } from "./ActionButton";
import { Joystick } from "./Joystick";

const HIT = 150;
const BUTTON = 100;
const EDIT = 84;
const MARGIN = 24;

const CoarseControls: Component = () => {
  const { input } = useVoxelscape();
  const [viewSize, setViewSize] = createSignal<THREE.Vector2>(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
  );

  const controller = new AbortController();
  window.addEventListener(
    "resize",
    () => setViewSize(new THREE.Vector2(window.innerWidth, window.innerHeight)),
    { signal: controller.signal },
  );
  onCleanup(() => controller.abort());

  return (
    <div
      class={styles.overlay}
      style={{ "-webkit-tap-highlight-color": "transparent" }}
    >
      <div class={styles.control}>
        <Joystick
          left={MARGIN}
          top={viewSize().y - MARGIN - HIT}
          hitAreaSize={HIT}
          outerRingSize={0.8 * HIT}
          knobSize={70}
          // joystick value is -0.5..0.5 in screen axes (+y = down); convert to the
          // -1..1 input snapshot axes (+y = forward).
          onValue={(value) => input.setTouchMove(value.x * 2, -value.y * 2)}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={viewSize().x - MARGIN - BUTTON}
          top={viewSize().y - MARGIN - BUTTON}
          size={BUTTON}
          onPressed={(pressed) => {
            input.setTouchJump(pressed);
            if (pressed) {
              input.queueJump();
            }
          }}
        />
      </div>

      {/* the secondary button is held as well as tapped — a held sword guards —
          so a direct handler keeps it independent of Solid's reactive effect
          semantics */}
      <div
        class={styles.control}
        onPointerDown={(e) => {
          e.stopPropagation();
          input.setTouchSecondary(true);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          input.setTouchSecondary(false);
        }}
        onPointerCancel={(e) => {
          e.stopPropagation();
          input.setTouchSecondary(false);
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
