import { Component, createSignal, onCleanup } from "solid-js";
import styles from "./CoarseControls.module.css";
import * as THREE from "three";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { ActionButton } from "./ActionButton";
import { Joystick } from "./Joystick";
import { DigIcon, JumpIcon, PlaceIcon, UseIcon } from "./icons";

const HIT = 150;
const PRIMARY = 110;
const ACTION = 84;
const MARGIN = 24;
const GAP = 14;

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

  // Every action button hangs off the bottom-right corner: jump and the big
  // dig button share the bottom row, with use and place directly above.
  const bottom = () => viewSize().y - MARGIN;
  const right = () => viewSize().x - MARGIN;
  const primaryLeft = () => right() - PRIMARY;
  const primaryTop = () => bottom() - PRIMARY;
  const jumpLeft = () => primaryLeft() - GAP - ACTION;
  const jumpTop = () => bottom() - ACTION;
  const topRow = () => jumpTop() - GAP - ACTION;

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
          left={primaryLeft()}
          top={primaryTop()}
          size={PRIMARY}
          icon={<DigIcon />}
          onPressed={(pressed) => input.setTouchPrimary(pressed)}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={right() - ACTION}
          top={topRow()}
          size={ACTION}
          colour="0x35b06b"
          icon={<PlaceIcon />}
          onPressed={(pressed) => input.setTouchSecondary(pressed)}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={jumpLeft()}
          top={jumpTop()}
          size={ACTION}
          icon={<JumpIcon />}
          onPressed={(pressed) => {
            input.setTouchJump(pressed);
            if (pressed) {
              input.queueJump();
            }
          }}
        />
      </div>

      <div class={styles.control}>
        <ActionButton
          left={jumpLeft()}
          top={topRow()}
          size={ACTION}
          icon={<UseIcon />}
          onPressed={(pressed) => {
            if (pressed) {
              input.queueUse();
            }
          }}
        />
      </div>
    </div>
  );
};

export default CoarseControls;
