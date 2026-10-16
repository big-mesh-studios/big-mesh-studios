/**
 * The reference image: choosing it, and its own properties.
 *
 * ## Why this is a panel and not a floating control
 *
 * **Because the reference behaves like an item, so it is edited like one.** It has a position,
 * a size, a turn and an opacity — the same shape of data a shape has — and the properties form
 * is where this editor edits that shape of data. It also has to work on a phone, where a
 * floating cluster over the canvas competes with the thumb; as a panel it becomes a tab, which
 * is how every other panel already survives the small screen (`LevelEditorOverlay.tsx`).
 *
 * ## Why the position is fields and not a drag on the picture
 *
 * **Because a drag on a near-horizontal quad is unstable.** The picture lies on the ground, so
 * when the camera is low the pointer's ray meets its plane at a grazing angle and a small move
 * of the finger throws the picture a long way — the "slides around" a person sees and cannot
 * aim. Moving it by its position, and by the move gizmo's world-axis arrows (which project the
 * drag onto one axis and do not depend on the angle the plane is seen at), is steady at every
 * camera angle.
 */

import { Show } from "solid-js";

import {
  Bar,
  Button,
  Checkbox,
  Empty,
  NumberField,
  Vec3Field,
} from "../components/controls";
import { MAX_IMAGE_PLANE_WIDTH } from "../../places/level/image-plane";
import type { ImagePlaneState } from "../image/image-plane-state";

/** Radians to the whole degrees the rotation field shows. */
const degreesOf = (radians: number): number =>
  Math.round((radians * 180) / Math.PI);

export const ReferencePanel = (props: {
  state: ImagePlaneState;
  /** Hands the chosen file up, which reads it and lays it down. See `app.tsx`. */
  onChoose: (file: File) => void;
}) => {
  /** The file input, clicked from the button's own gesture, as `LevelIoPanel` does. */
  let file: HTMLInputElement | undefined;
  const chosen = (): boolean => props.state.image() !== undefined;

  return (
    <>
      <Bar label="Reference image">
        <Button
          label={chosen() ? "Replace…" : "Choose image…"}
          title="Pick a picture to lay on the ground and trace walls and floors against"
          onClick={() => file?.click()}
        />
        <Show when={chosen()}>
          <Button
            label="Clear"
            title="Take the reference away"
            onClick={() => props.state.clear()}
          />
        </Show>
      </Bar>

      <input
        type="file"
        /**
         * **Filtered to images, unlike the level import.** Every platform agrees what an image
         * is, so the filter helps here rather than hiding a file the way an `application/json`
         * filter hides a level on a phone (`LevelIoPanel.tsx`).
         */
        accept="image/*"
        hidden
        ref={file}
        onChange={(event) => {
          const picked = event.currentTarget.files?.[0];
          // Cleared before the read, so choosing the same file twice is two loads rather than
          // the second being swallowed as "no change".
          event.currentTarget.value = "";
          if (picked !== undefined) props.onChoose(picked);
        }}
      />

      <Show
        when={chosen()}
        fallback={
          <Empty>
            Choose a picture to lay it on the ground and trace against it.
          </Empty>
        }
      >
        <Bar label="Placement">
          <Vec3Field
            label="Position"
            value={[props.state.at().x, props.state.at().y, props.state.at().z]}
            step={1}
            onChange={([x, y, z]) => props.state.setAt({ x, y, z })}
          />
          <NumberField
            label="Width"
            value={Math.round(props.state.width())}
            min={1}
            max={MAX_IMAGE_PLANE_WIDTH}
            step={5}
            bigStep={20}
            onChange={(value) => props.state.setWidth(value)}
          />
          <NumberField
            label="Rotate°"
            value={degreesOf(props.state.yaw())}
            step={15}
            bigStep={45}
            onChange={(value) => props.state.setYaw((value * Math.PI) / 180)}
          />
          <NumberField
            label="Opacity"
            value={props.state.opacity()}
            min={0}
            max={1}
            step={0.05}
            bigStep={0.1}
            onChange={(value) => props.state.setOpacity(value)}
          />
          <Checkbox
            label="Show"
            value={props.state.visible()}
            onChange={(value) => props.state.setVisible(value)}
          />
        </Bar>
      </Show>
    </>
  );
};
