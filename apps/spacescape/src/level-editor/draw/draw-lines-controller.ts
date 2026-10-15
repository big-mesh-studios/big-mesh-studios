/**
 * The state of a wall being drawn: the plane, the vertices placed so far, and where the next
 * point would go.
 *
 * ## Why this is a controller and not a mode
 *
 * **Because it is a thing that runs and answers, not a screen the application is in.** It
 * holds no scene, no camera, no DOM and no level; it is asked to `begin`, `aim`, `commit`,
 * `newLine`, `undoPoint` and `finish`, and it answers with what the overlay and the store
 * need. That is the same seam `camera/CameraControl.ts` and `edit/tool.ts` are, and it is what
 * lets the whole gesture be tested against numbers rather than against a canvas — the
 * arithmetic it leans on is in `plane.ts` and is tested there.
 *
 * ## Why the device differences are *not* here
 *
 * **Because they are not differences in the flow, only in how a pointer arrives.** A mouse
 * hovers, so its aim is continuous; a finger cannot, so it presses, drags and the aim is
 * latched on release. Both commit with `commit` and end with `finish`. The caller (`app.tsx`)
 * is what knows a hover from a drag, and it is the caller's job to translate — the controller
 * would otherwise have two code paths for one state machine, which is the thing that drifts.
 *
 * ## Why several chains
 *
 * **Because a person drawing a room wants four walls and then a doorway across the room, and
 * starting the doorway from the corner they just finished at is wrong.** `newLine` begins a
 * fresh, disconnected chain; `finish` hands back every chain that has grown to a segment. One
 * level item holds all of them. This is the "next line gets a new start point" the request
 * asked for, made explicit rather than inferred from a gap in the drawing.
 *
 * ## Why the authoritative state is plain and the signal is a mirror
 *
 * **Because a controller method computes from, and then writes to, the same values.** Solid
 * answers a read-after-write with the previous value until the next flush (see
 * `LevelDocument`'s note in `level-editor-store.ts`), so a `commit` that read `vertices()`
 * after writing it would append to the list it had a moment ago. The plain values are the
 * truth a method computes on; the signal is what the overlay reads, rebuilt once per change.
 */

import type { Vec3 } from "@big-mesh-studios/core";
import { distance } from "@big-mesh-studios/core";
import type { Ray } from "@big-mesh-studios/picking";
import { createSignal, type Accessor } from "solid-js";

import {
  applyAngleLock,
  planeThrough,
  pointFromSegment,
  rayPlanePoint,
  segmentOf,
  snapAngleTo,
  snapToVertices,
  type AngleLock,
  type DrawingPlane,
  type ScreenPoint,
} from "./plane";
import { floorRefusal as floorRefusalOf, openOutline } from "./floor";

/** Below this, two points are the same point and a segment between them is not drawn. */
const EPSILON = 1e-6;

/**
 * What the controller needs from the world it is drawing in.
 *
 * **Four readers, injected rather than reached for**, so a test can stand up a flat world, a
 * projection onto the plane's own axes, and no camera. Every one of them is a pure question
 * about a point or a ray; none of them is state.
 */
export interface DrawLinesDeps {
  /** Where a ray meets the ground, or nothing when it misses. Called once, for the first point. */
  readonly groundAt: (ray: Ray) => Vec3 | undefined;
  /** Which way is up at a point. `world/up.ts`'s frame answers this. */
  readonly upAt: (point: Vec3) => Vec3;
  /** Where a world point is on the canvas, or nothing when it is behind the camera. */
  readonly projectToScreen: (point: Vec3) => ScreenPoint | undefined;
  /** How near, in CSS pixels, the aim snaps onto a placed vertex. */
  readonly snapRadius: number;
  /**
   * The free-angle magnet, in degrees. Zero is no magnet.
   *
   * **The explicit `AngleLock` is separate from this and takes priority**, because the two are
   * different promises: a lock says "hold this direction whatever I do", and a magnet says
   * "help me hold a direction when I am near one". A magnet applied on top of a lock would
   * drift the locked direction by up to half a step.
   */
  readonly angleStepDegrees?: number;
}

/** Everything the overlay reads, rebuilt once per change. A value, not a set of signals. */
export interface DrawLinesSnapshot {
  /** Whether a plane has been established at all. */
  readonly active: boolean;
  /** The plane being drawn in, or nothing before `begin`. The overlay rings lie in it. */
  readonly plane: DrawingPlane | undefined;
  /** The committed vertices, one array per polyline. */
  readonly chains: readonly (readonly Vec3[])[];
  /** Where the next point would go, or nothing when nothing has aimed yet. */
  readonly aim: Vec3 | undefined;
  /** The aim on the canvas, for an overlay that follows it. */
  readonly aimScreen: ScreenPoint | undefined;
  /** The current segment's length in world units, or zero when there is no segment yet. */
  readonly length: number;
  /** The current segment's turn in degrees, or zero. */
  readonly angle: number;
  readonly lock: AngleLock;
  /** Whether `commit` would place a point. */
  readonly canCommit: boolean;
  /** Whether `finish` would make anything — a chain with two points or more. */
  readonly canFinish: boolean;
  /** Why `finishFloor` would refuse, or nothing when it would not. */
  readonly floorRefusal: string | undefined;
  /** Whether `newLine` would begin a chain. */
  readonly canNewLine: boolean;
  /** Whether `undoPoint` would take something back. */
  readonly canUndo: boolean;
}

/**
 * What a finished draw makes: the polylines, in the plane they were drawn in.
 *
 * **The height is not here**, because the controller draws in a plane and a height is a
 * property of the wall rather than of the drawing — the store defaults it and the inspector
 * edits it. The controller's answer is geometry and nothing else.
 */
export interface DrawnWalls {
  readonly plane: DrawingPlane;
  /** Every chain that reached a segment, in the order they were drawn. */
  readonly chains: readonly (readonly Vec3[])[];
}

/**
 * A finished draw that is one closed outline, which is what a floor or a roof is.
 *
 * **One chain and not several, which is the whole difference from a wall.** A wall may be a
 * dozen disjoint runs; a floor is one boundary, and two of them in one draw is a person who
 * has changed their mind about where the room is rather than a floor with a courtyard.
 *
 * **The outline is open — the repeated closing point is already gone.** A person closes a
 * loop by snapping back onto the first vertex, so the chain arrives with that vertex twice, and
 * a polygon needs three *distinct* ones. `openOutline` drops it, and the level reader refuses a
 * duplicate anyway, so keeping it would only produce a shape that could not be saved.
 */
export interface DrawnFloor {
  readonly plane: DrawingPlane;
  readonly outline: readonly Vec3[];
}

/** The gesture's state machine, over the plane arithmetic in `plane.ts`. */
export interface DrawLinesController {
  /** The state the overlay reads. */
  readonly state: Accessor<DrawLinesSnapshot>;

  /**
   * Establishes the plane from the ground under a ray and places the first point.
   *
   * **Returns false when the ray meets no ground**, which is the honest answer for a click on
   * the sky. The caller turns that into the editor's own "nothing to build on" notice. A
   * second `begin` while a plane exists is a press that wants to aim, not a new plane.
   */
  begin(pointer: ScreenPoint, ray: Ray): boolean;
  /** Moves the aim to where a ray meets the plane, snapped. Does nothing before `begin`. */
  aim(pointer: ScreenPoint, ray: Ray): void;
  /** Places the aim as the next point of the current chain. Zero-length segments are ignored. */
  commit(): void;
  /** Ends the current chain, so the next point begins a new, disconnected one. */
  newLine(): void;
  /** Takes back the last placed point, or the last empty chain. */
  undoPoint(): void;
  /** The walls this draw makes, or nothing when no chain reached a segment. */
  finish(): DrawnWalls | undefined;
  /**
   * The floor this draw makes, or nothing when the chains are not one closed outline.
   *
   * **A second answer from the same drawing rather than a separate tool.** The gesture is
   * identical — aim, commit, finish — and a person who has drawn a closed loop has drawn a
   * floor whether or not they pressed the right button first. What differs is only what
   * counts as finished, and `state().floorRefusal` says which of four reasons it is not.
   */
  finishFloor(): DrawnFloor | undefined;
  /** Throws the whole draw away, leaving no plane. */
  reset(): void;

  /** Which direction the next segment is held against. */
  setLock(lock: AngleLock): void;
  /** Types an exact length for the current segment, at its current turn. */
  setLength(length: number): void;
  /** Types an exact turn for the current segment, at its current length. */
  setAngle(degrees: number): void;

  /**
   * Adopts a plane and its chains, for the inspector's "Redraw".
   *
   * **A redraw starts from what is there**, so the person edits the wall rather than drawing
   * it again from nothing. The aim is left unset, because the next thing they do is move a
   * point and a synthesised aim would be a point nobody placed.
   */
  seed(plane: DrawingPlane, chains: readonly (readonly Vec3[])[]): void;
}

export const createDrawLinesController = (
  deps: DrawLinesDeps,
): DrawLinesController => {
  /** The authoritative state. Plain values, because methods read and write them together. */
  let plane: DrawingPlane | undefined;
  let chains: Vec3[][] = [];
  let aim: Vec3 | undefined;
  let lock: AngleLock = "none";

  /** The current chain — the one the aim extends. */
  const current = (): Vec3[] | undefined => chains[chains.length - 1];

  /** The point the current segment measures from: the current chain's last vertex. */
  const start = (): Vec3 | undefined => {
    const chain = current();
    return chain === undefined ? undefined : chain[chain.length - 1];
  };

  /** The vertex before `start`, which is what the `continue` lock runs on from. */
  const previous = (): Vec3 | undefined => {
    const chain = current();
    return chain === undefined ? undefined : chain[chain.length - 2];
  };

  /** The two numbers the readout shows, or zeros when there is no segment yet. */
  const segmentNow = (): { length: number; angle: number } => {
    const from = start();
    if (plane === undefined || from === undefined || aim === undefined) {
      return { length: 0, angle: 0 };
    }
    return segmentOf(from, aim, plane);
  };

  /**
   * The turn a typed length should keep, or the last segment's if there is nothing to keep.
   *
   * **So typing a length with no aim yet still makes a segment**, running on from the previous
   * one rather than snapping to the plane's first axis — which is what a person means when
   * they carry on from a corner they just drew.
   */
  const angleOrDefault = (): number => {
    const here = segmentNow();
    if (here.length > EPSILON) return here.angle;
    const from = start();
    const prev = previous();
    if (plane === undefined || from === undefined || prev === undefined)
      return 0;
    return segmentOf(prev, from, plane).angle;
  };

  const snapshotOf = (): DrawLinesSnapshot => {
    const segment = segmentNow();
    return {
      active: plane !== undefined,
      plane,
      chains: chains.map((chain) => [...chain]),
      aim,
      aimScreen: aim === undefined ? undefined : deps.projectToScreen(aim),
      length: segment.length,
      angle: segment.angle,
      lock,
      canCommit: aim !== undefined,
      canFinish: chains.some((chain) => chain.length >= 2),
      // **A string rather than a flag**, because the four refusals call for four different
      // next presses and a person told only "no" will try the same thing again.
      floorRefusal: floorRefusalOf(chains),
      // **A chain to fork from, not just one to leave.** A single point has no direction yet,
      // so beginning a new line from it would abandon a start the person never drew from.
      canNewLine: (current()?.length ?? 0) >= 2,
      canUndo:
        chains.some((chain) => chain.length > 0) ||
        (chains.length > 1 && (current()?.length ?? 0) === 0),
    };
  };

  const [state, setState] = createSignal<DrawLinesSnapshot>(snapshotOf(), {
    equals: false,
  });

  const publish = (): void => {
    setState(snapshotOf());
  };

  /** Sets the aim, snapping it onto a placed vertex, then to a lock or the magnet. */
  const aimAt = (pointer: ScreenPoint, ray: Ray): void => {
    if (plane === undefined) return;
    const hit = rayPlanePoint(ray, plane);
    if (hit === undefined) {
      // The ray missed the plane or met it behind the eye. Leaving the aim where it was is
      // better than dropping it: a camera swung toward the horizon should not erase a point
      // a person has spent a drag placing.
      return;
    }

    const snapped = snapToVertices(
      chains.flat(),
      deps.projectToScreen,
      pointer,
      deps.snapRadius,
    );
    if (snapped !== undefined) {
      aim = snapped.point;
      publish();
      return;
    }

    const from = start();
    if (from === undefined) {
      // No start yet: this is a chain's first point, and there is no direction to snap.
      aim = hit;
      publish();
      return;
    }

    aim =
      lock === "none"
        ? snapAngleTo(from, hit, plane, deps.angleStepDegrees ?? 0)
        : applyAngleLock(from, hit, lock, plane, previous());
    publish();
  };

  return {
    state,

    begin(pointer, ray) {
      if (plane !== undefined) {
        // A second `begin` is a press that wants to aim, not a new plane. Aiming here keeps
        // the caller from having to know whether the plane exists yet.
        aimAt(pointer, ray);
        return true;
      }
      const ground = deps.groundAt(ray);
      if (ground === undefined) return false;
      plane = planeThrough(ground, deps.upAt(ground));
      chains = [[ground]];
      aim = undefined;
      publish();
      return true;
    },

    aim: aimAt,

    commit() {
      if (aim === undefined) return;
      const chain = current();
      if (chain === undefined) return;
      if (chain.length > 0) {
        const from = chain[chain.length - 1];
        if (distance(from, aim) <= EPSILON) return;
      }
      chain.push(aim);
      aim = undefined;
      publish();
    },

    newLine() {
      if ((current()?.length ?? 0) < 2) return;
      chains.push([]);
      aim = undefined;
      publish();
    },

    undoPoint() {
      const chain = current();
      if (chain === undefined) return;
      if (chain.length > 0) {
        chain.pop();
        aim = undefined;
        // A chain that was only its start and is now empty, and is not the first, is a chain
        // that `newLine` made: undo takes the whole empty chain away rather than leaving it.
        if (chain.length === 0 && chains.length > 1) chains.pop();
        publish();
        return;
      }
      if (chains.length > 1) {
        chains.pop();
        aim = undefined;
        publish();
      }
    },

    finish() {
      const kept = chains.filter((chain) => chain.length >= 2);
      if (plane === undefined || kept.length === 0) return undefined;
      return { plane, chains: kept.map((chain) => [...chain]) };
    },

    finishFloor() {
      if (plane === undefined || floorRefusalOf(chains) !== undefined) {
        return undefined;
      }
      const outline = openOutline(
        chains.filter((chain) => chain.length > 0)[0]!,
      );
      // **Unreachable while `floorRefusal` is clear**, and the check is here because the two
      // are separate answers to the same question and a caller should not have to know that.
      if (outline === undefined) return undefined;
      return { plane, outline: outline.map((point) => ({ ...point })) };
    },

    reset() {
      plane = undefined;
      chains = [];
      aim = undefined;
      lock = "none";
      publish();
    },

    setLock(next) {
      if (lock === next) return;
      lock = next;
      // The aim is re-derived on the next `aim` call, because applying a lock needs a pointer
      // position and there is one on every move. Publishing now updates the buttons.
      publish();
    },

    setLength(length) {
      const from = start();
      if (plane === undefined || from === undefined) return;
      if (!(length > 0)) return;
      aim = pointFromSegment(from, length, angleOrDefault(), plane);
      publish();
    },

    setAngle(degrees) {
      const from = start();
      if (plane === undefined || from === undefined) return;
      const length = segmentNow().length;
      if (length <= EPSILON) return;
      aim = pointFromSegment(from, length, degrees, plane);
      publish();
    },

    seed(nextPlane, nextChains) {
      plane = nextPlane;
      chains = nextChains.map((chain) => [...chain]);
      aim = undefined;
      lock = "none";
      publish();
    },
  };
};
