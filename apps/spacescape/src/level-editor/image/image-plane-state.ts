/**
 * The reference image an editor session is tracing against, and where it is laid.
 *
 * ## Why this is its own store and not part of `LevelPlan`
 *
 * The image is **editor chrome, not geometry**. It never becomes a `LevelItem`, never folds
 * into the CSG, and never reaches `apply-level.ts` — a tracing aid that changed the terrain
 * would be a tracing aid that changed the thing being traced. Only when it is written to a
 * file does it become a top-level annotation on the level document (see `docs/image-plane-plan.md`),
 * and that is a separate concern from the live state kept here.
 *
 * ## Why the bytes are kept rather than just a decoded texture
 *
 * **Because the file is the one that has to round-trip.** The requirement is that a saved
 * reference keeps the exact bytes and media type the picker reported, so the untouched
 * `Uint8Array` and `mime` are the truth; the texture is a derived, disposable view of them,
 * built by `image-loader.ts` and owned by the overlay. Keeping only decoded pixels would lose
 * the original format and the ability to re-serialize it faithfully.
 *
 * ## Why `up` is derived and not stored
 *
 * **Because up is a function of position** ([ADR 0037](../../../../docs/adr/0037-up-is-a-function-of-where-you-are.md)):
 * the image has to lie on the local ground wherever it is moved, so its normal follows `at`.
 * A stored normal would be a second truth that drifts the moment the image is dragged across a
 * planet. On a flat world `upAt` answers `+Y` everywhere and this is world XZ.
 */

import { createMemo, createSignal, type Accessor } from "solid-js";
import type { Vec3 } from "@big-mesh-studios/core";

import type { ImagePlanePose } from "../view/image-plane";
import type { LevelImagePlane } from "../../places/level/image-plane";

/** The untouched bytes of a chosen image, and the media type the picker reported. */
export interface ReferenceImage {
  readonly bytes: Uint8Array;
  /** The file's own `type`, kept verbatim — `image/png`, `image/jpeg`, or empty if it had none. */
  readonly mime: string;
}

/**
 * How wide a reference image is when it is first laid down, in world units.
 *
 * **Twenty voxels at this world's `VOXEL_SIZE` of ten**, which is a building-sized plan and a
 * sensible thing to trace a room against before it is scaled to fit. The panel adjusts it.
 */
export const DEFAULT_IMAGE_PLANE_WIDTH = 200;

/** How see-through a reference is by default: readable, but the world shows through it. */
export const DEFAULT_IMAGE_PLANE_OPACITY = 0.5;

/** What the state needs from the world to lay an image on the local ground. */
export interface ImagePlaneStateDeps {
  /** Up at a point, so the image lies on the local ground anywhere on the planet. */
  upAt(point: Vec3): Vec3;
}

/**
 * The live reference image: what it is, where it lies, and how it is shown.
 *
 * Every accessor is a signal, so a panel and the renderer both follow edits without a second
 * subscription. `pose` is `undefined` when there is no image — a pose for an image that is not
 * there is a quad drawn at the origin on nothing.
 */
export interface ImagePlaneState {
  image: Accessor<ReferenceImage | undefined>;
  at: Accessor<Vec3>;
  yaw: Accessor<number>;
  width: Accessor<number>;
  opacity: Accessor<number>;
  visible: Accessor<boolean>;
  /** The plane's pose, or `undefined` when there is no image to lay. */
  pose: Accessor<ImagePlanePose | undefined>;
  setImage(image: ReferenceImage): void;
  clear(): void;
  setAt(at: Vec3): void;
  setYaw(radians: number): void;
  setWidth(width: number): void;
  setOpacity(opacity: number): void;
  setVisible(visible: boolean): void;
  /**
   * The live reference as a level file's `imagePlane`, or `undefined` when there is none.
   *
   * **This is the seam the store serializes through** (`LevelReferenceSeam`), so the picture
   * and its placement are written with the level by one object rather than two that must agree.
   */
  reference(): LevelImagePlane | undefined;
  /** Adopts a reference read from a file, replacing the image and its placement entirely. */
  load(reference: LevelImagePlane): void;
}

/**
 * Makes the reference-image state.
 *
 * **Made under an owner**, like every other signal in the editor — `app.tsx` calls it through
 * `runWithOwner` and keeps the write out of the owned scope, the same split the draw controller
 * documents.
 */
export const createImagePlaneState = (
  deps: ImagePlaneStateDeps,
): ImagePlaneState => {
  const [image, setImage] = createSignal<ReferenceImage | undefined>();
  const [at, setAt] = createSignal<Vec3>({ x: 0, y: 0, z: 0 });
  const [yaw, setYaw] = createSignal(0);
  const [width, setWidth] = createSignal(DEFAULT_IMAGE_PLANE_WIDTH);
  const [opacity, setOpacity] = createSignal(DEFAULT_IMAGE_PLANE_OPACITY);
  const [visible, setVisible] = createSignal(true);

  const up = createMemo(() => deps.upAt(at()));
  const pose = createMemo<ImagePlanePose | undefined>(() =>
    image() === undefined
      ? undefined
      : { at: at(), up: up(), yaw: yaw(), width: width() },
  );

  return {
    image,
    at,
    yaw,
    width,
    opacity,
    visible,
    pose,
    setImage,
    clear: () => setImage(undefined),
    setAt,
    setYaw,
    setWidth,
    setOpacity,
    setVisible,

    reference(): LevelImagePlane | undefined {
      const picture = image();
      if (picture === undefined) return undefined;
      const point = at();
      return {
        at: [point.x, point.y, point.z],
        yaw: yaw(),
        width: width(),
        opacity: opacity(),
        mime: picture.mime,
        bytes: picture.bytes,
      };
    },

    load(next): void {
      setAt({ x: next.at[0], y: next.at[1], z: next.at[2] });
      setYaw(next.yaw);
      setWidth(next.width);
      setOpacity(next.opacity);
      setImage({ bytes: next.bytes, mime: next.mime });
    },
  };
};
