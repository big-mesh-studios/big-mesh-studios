/**
 * The wall being drawn, as lines over the world.
 *
 * ## Why this exists, when the wall itself is the point
 *
 * **Because a draw is a draft, and a draft that is only visible once it is committed is a
 * draft nobody can correct.** Every vertex placed so far, the segment being stretched from
 * the last one, and a ring at each point that the aim can snap onto — all of it drawn before
 * anything reaches the level, so `undoPoint` and pulling a point back are corrections to
 * something on screen rather than to a memory.
 *
 * ## Why the rings are part of this and not decoration
 *
 * **Because a snap that cannot be seen is a snap nobody trusts.** The aim attaches to a placed
 * vertex within `snapRadius` pixels (see `plane.ts`'s `snapToVertices`), and the ring is that
 * radius drawn — so the tolerance is a thing on screen rather than a hidden number a person
 * learns by watching walls land in the wrong place. A finger is fifty pixels across and cannot
 * report where its centre is; the ring is what says where it can land.
 *
 * The rings are drawn **in the drawing plane**, not billboarded to the camera, because that is
 * where the snap happens: a ring seen edge-on is the honest picture of a tolerance measured in
 * a plane the camera is looking along, and a ring that always faced the camera would promise a
 * grab the plane does not offer.
 *
 * ## Why it draws over the world
 *
 * **Because the draft is a control, not world geometry.** The material's depth test is off, so
 * a wall being drawn across the far side of a hill stays visible while it is placed — the same
 * treatment `view/move-handles.ts` gives its arrows, and for the same reason: a control that
 * vanishes behind the thing it is acting on cannot be aimed or corrected. That only works
 * because this overlay is added to the scene after the world's meshes (ADR 0014); `app.tsx` is
 * where that order is kept.
 *
 * ## Why it is rebuilt each frame rather than on change
 *
 * **Because the ring's size is in screen pixels and its geometry is in the world, so the two
 * meet at the camera's distance — which is a per-frame number.** `places/zones.ts` updates on
 * change and says why; that works there because a zone's box is the same at every zoom. Here a
 * fixed world radius would be a hoop you could not see from across the level and a fence around
 * your feet up close. The rebuild is a few dozen vertices, which is nothing beside the chunk
 * the same frame meshes.
 */

import {
  Color,
  LineSegments2,
  LineSegmentsGeometry,
  Line2NodeMaterial,
  type PerspectiveCamera,
  type Scene,
} from "@random-mesh/rmsl/scene";

import { add, scale, type Vec3 } from "@big-mesh-studios/core";

import type { ScreenSize } from "../view/move-handle";
import type { DrawingPlane } from "./plane";
import type { DrawLinesSnapshot } from "./draw-lines-controller";

/**
 * How many straight pieces one ring is drawn as.
 *
 * **Twenty-four, which is round at the size a ring is drawn.** The rings are a few dozen pixels
 * across; a coarser ring reads as a polygon and a finer one costs vertices no one can see.
 */
export const RING_SEGMENTS = 24;

/**
 * The colour a draft wall is drawn in.
 *
 * **A warm yellow, and deliberately not a world colour.** The lines are a thing being made
 * rather than a thing that is there, and the terrain's own palette is greens and greys — a
 * draft that shared them would read as a wall already committed.
 */
const DRAFT_COLOUR = new Color(1, 0.82, 0.35);

/** How wide the lines are, in device pixels. */
const DRAFT_WIDTH = 2;

/** A point on a ring of `radius` about `centre`, in the drawing plane's own basis. */
const pointOnRing = (
  plane: DrawingPlane,
  centre: Vec3,
  radius: number,
  angle: number,
): Vec3 =>
  add(
    centre,
    add(
      scale(plane.axisA, radius * Math.cos(angle)),
      scale(plane.axisB, radius * Math.sin(angle)),
    ),
  );

/**
 * Every line the draft is drawn with, as `xyz xyz` pairs.
 *
 * **Pure, so the part that can be wrong is testable without a scene.** The segments are the
 * committed chains, the current aim stretched from the current chain's last vertex, and a ring
 * at every point. A ring of radius zero draws nothing, which is how "no rings" is spelled.
 */
export const overlayPositions = (
  state: DrawLinesSnapshot,
  ringRadius: number,
  ringSegments: number = RING_SEGMENTS,
): Float32Array => {
  const values: number[] = [];
  const segment = (a: Vec3, b: Vec3): void => {
    values.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  // **Nothing before there is a plane.** The chains cannot exist without one — `begin` makes
  // the plane and the first chain together and `reset` clears both — so this is the contract
  // said plainly rather than a state the controller can reach.
  const plane = state.plane;
  if (plane === undefined) return new Float32Array(0);

  for (const chain of state.chains) {
    for (let i = 0; i + 1 < chain.length; i++) {
      segment(chain[i], chain[i + 1]);
    }
  }

  const current = state.chains[state.chains.length - 1];
  const last = current === undefined ? undefined : current[current.length - 1];
  if (state.aim !== undefined && last !== undefined) {
    segment(last, state.aim);
  }

  if (ringRadius > 0 && ringSegments > 0) {
    const points: Vec3[] = [
      ...state.chains.flat(),
      ...(state.aim === undefined ? [] : [state.aim]),
    ];
    for (const point of points) {
      let previous = pointOnRing(plane, point, ringRadius, 0);
      for (let i = 1; i <= ringSegments; i++) {
        const next = pointOnRing(
          plane,
          point,
          ringRadius,
          (i / ringSegments) * Math.PI * 2,
        );
        segment(previous, next);
        previous = next;
      }
    }
  }

  return new Float32Array(values);
};

export interface DrawLinesOverlay {
  /**
   * Redraws the draft, with rings sized so they are `snapRadiusPx` pixels across.
   *
   * Called every frame, because the ring's size is a function of the camera's distance.
   */
  render(
    state: DrawLinesSnapshot,
    camera: PerspectiveCamera,
    size: ScreenSize,
    snapRadiusPx: number,
  ): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * A world radius that covers `screenRadiusPx` pixels at `distance`.
 *
 * **The same relationship `VIEW_SHARE` uses**, and the same approximation it makes: a length
 * proportional to `distance / height` covers a fixed fraction of the canvas at any distance,
 * so the ring stays the size a finger sees rather than the size a world unit is. It is
 * approximate to the camera's field of view, which is the right trade for a hit marker — the
 * snap itself is measured exactly, in `plane.ts`.
 */
export const screenRadiusToWorld = (
  screenRadiusPx: number,
  distance: number,
  size: ScreenSize,
): number =>
  size.height <= 0 || distance <= 0
    ? 0
    : (screenRadiusPx * distance) / size.height;

export const createDrawLinesOverlay = (scene: Scene): DrawLinesOverlay => {
  const geometry = new LineSegmentsGeometry();
  const material = new Line2NodeMaterial();
  material.color = DRAFT_COLOUR;
  material.linewidth = DRAFT_WIDTH;
  material.transparent = true;
  material.opacity = 0.95;
  // **Depth test off, and thereby drawn over the terrain, the way the move handles are.**
  // A draft that disappears into a hillside is a draft whose far end cannot be placed or
  // corrected — the same argument `move-handles.ts` makes for its arrows, and the same one
  // the user asked for: a control has to be visible where it is, not only where the world
  // lets it through. Depth *write* stays off so the draft's own crossing lines do not have
  // whichever drew first win. Switching the test off only shows anything because the overlay
  // is added after the world's meshes (ADR 0014), which `app.tsx` is where to keep right.
  material.depthTest = false;
  material.depthWrite = false;

  const lines = new LineSegments2(geometry, material);
  // Over the world, in the scene's traversal order, for the same reason the handles and the
  // highlight are added last (ADR 0014).
  scene.add(lines);

  return {
    render(state, camera, size, snapRadiusPx): void {
      const plane = state.plane;
      if (plane === undefined) {
        geometry.setPositions([]);
        return;
      }
      const eye = camera.position;
      const origin = plane.origin;
      const distance = Math.hypot(
        eye.x - origin.x,
        eye.y - origin.y,
        eye.z - origin.z,
      );
      const ringRadius = screenRadiusToWorld(snapRadiusPx, distance, size);
      geometry.setPositions(overlayPositions(state, ringRadius));
      lines.computeLineDistances();
    },

    setVisible(visible): void {
      lines.visible = visible;
    },

    dispose(): void {
      // The material is not disposed: `Line2NodeMaterial` has no `dispose`, which is true of
      // every material in this repository and is why none of them is disposed (`zones.ts`).
      scene.remove(lines);
      geometry.dispose();
    },
  };
};
