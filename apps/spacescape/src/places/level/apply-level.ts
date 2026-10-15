/**
 * Putting a level into the running world.
 *
 * ## What this is the boundary between
 *
 * `LevelPlan` is **data** — the thing a person edited and the thing a file holds. This is
 * where it becomes **operations and figures** in a world that already has some. Everything
 * upstream of here knows nothing about `PlaceRegistry`, `FigureSet`, fold indices or the
 * mesher; everything downstream knows nothing about levels.
 *
 * ## Which edits move the fold, and which do not
 *
 * This is the whole design, and it is not obvious.
 *
 * A shape's index in the CSG fold decides what the terrain looks like: the fold combines
 * with a smooth minimum, which is symmetric but not associative, so the order operations
 * are folded in *is* the surface
 * ([ADR 0016](../../../../docs/adr/0016-a-place-is-a-named-group-of-operations.md)). So an
 * edit that changes *what* a shape is must not change *where it is in the fold* — otherwise
 * nudging a `Subtract` wall one voxel would move it past its neighbours and quietly take
 * their terrain with it.
 *
 * That is what `PlaceHandle.set` is for (Phase 0a), and it is why:
 *
 * - **Changing a shape's parameters does not move it.** `set` keeps the index it already
 *   has. This is the common case — it is every number in the inspector.
 * - **Changing which shapes there are does rebuild the place.** Adding, removing or
 *   reordering cannot be done with `set`, and `add` hands out a *new* index from a counter
 *   that never goes backwards (`FoldOrder`), so an item inserted at position 3 would fold
 *   last rather than third. Clearing the place and refilling it in file order is the only
 *   way to make "the order in the file is the order in the fold" true, and it is true of
 *   every rebuild rather than true of most edits and sometimes not.
 *
 * ## What a rebuild costs, said plainly
 *
 * A rebuild allocates every shape in the level a fresh index, so the level's band of fold
 * positions sits above anything allocated since the last rebuild — including shapes a
 * place's own script has added. **A level that is being edited tends to fold later than a
 * script that carved it once.** That is a real consequence and not a hidden one: it is why
 * a script that needs to cut into a level should keep doing it from the script, where the
 * cut is re-derived from the level on every load rather than depending on when a person
 * last dragged something.
 *
 * It is deterministic — every peer applies the same file in the same order and gets the
 * same band — which is the property that actually has to hold.
 *
 * ## Figures are not in the fold at all
 *
 * A prop or an npc is its own mesh, not an operation
 * ([ADR 0047](../../../../docs/adr/0047-a-figure-is-its-own-mesh.md)). So it is added to a
 * `FigureSet`, under an id the level namespaces for itself, and its placement never
 * interacts with a shape's.
 */

import { boundsOf } from "@big-mesh-studios/csg";
import type { Operation } from "@big-mesh-studios/csg";
import { placeOperation } from "../place-registry";
import type { PlaceRegistry } from "../place-registry";
import type { Bounds, Quat, Vec3 } from "@big-mesh-studios/core";
import type { FigureSet } from "../../figures/figure-set";
import type { FigureModel } from "../model-library";

import type {
  LevelFigure,
  LevelItem,
  LevelPlan,
  LevelShape,
  LevelWalls,
} from "./types";
import {
  isLevelFigure,
  isLevelWalls,
  levelFigureId,
  LEVEL_PLACE,
} from "./types";
import { wallParts, type WallPart } from "./walls";

/** The turn a shape that names none has. `makeOperation` would have used it too. */
const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * What a level needs from the world to be applied.
 *
 * **The same shape `HostWorld` has**, narrowed to what a level touches. The level is not
 * given the host itself because it is not a script: it has no effects to dispatch, no
 * refusals to hand back, and no business knowing a place exists.
 */
export interface LevelTarget {
  readonly places: PlaceRegistry;
  /** Absent when nothing in this world has figures — a headless test, or a level of shapes. */
  readonly figures?: FigureSet;
  /** A reader rather than the library, so a test can stand up two names and no zips. */
  readonly models?: { get(name: string): FigureModel | undefined };
  /** Told the box that changed, or nothing when everything did. */
  readonly geometryChanged: (bounds: Bounds | undefined) => void;
}

/**
 * Applies levels, remembering enough to take the last one back off.
 *
 * **A closure rather than a function, because removing figures needs to know which ones
 * were ours.** A `FigureSet` is shared by every place on the planet, so clearing it would
 * take a published place's furniture with it. The applier keeps the ids it added last time
 * and removes exactly those.
 */
/**
 * The options a walls item's part carries into the fold.
 *
 * **Colour and softness come off the item; the turn is the part's own.** Every segment of one
 * walls item shares its combine, its softness and its colour, but each stands along its own
 * line — so the item is the thing with a colour and the part is the thing with a direction,
 * and mixing the two would give every segment the first segment's turn.
 *
 * **`material` is not carried, matching `operationOf` for shapes.** A level shape's material
 * name is dropped on the way to the fold today (`operationOf` passes softness, orientation and
 * colour and nothing else), so a walls item that carried one would be the only level geometry
 * whose material applied — a difference nobody asked for. When level materials are wired, both
 * go through one conversion at once.
 */
const wallOptions = (
  item: LevelWalls,
  part: WallPart,
): {
  softness?: number;
  orientation: Quat;
  colour?: { r: number; g: number; b: number };
} => ({
  ...(item.softness === undefined ? {} : { softness: item.softness }),
  orientation: part.orientation,
  ...(item.colour === undefined ? {} : { colour: item.colour }),
});

export const createLevelApplier = (target: LevelTarget) => {
  let placedFigureIds: string[] = [];
  /** The operations as they were last applied, by id — so an edit can be a `set` not a rebuild. */
  let applied = new Map<string, Operation>();

  /**
   * The operations a plan makes, by id, in fold order.
   *
   * **A walls item is many operations, so the id list is expanded rather than read off the
   * items.** The comparison below is about *the fold's* order, and a walls item is one entry in
   * the file and N entries in the fold — so expanding here is what keeps "the order changed"
   * a question about the fold rather than about the file. The derived ids are `id#n`, which are
   * stable while a wall's segment count is, so moving a point re-uses them and adding one does
   * not.
   */
  const operationIds = (plan: LevelPlan): string[] => {
    const ids: string[] = [];
    for (const item of plan.items) {
      if (isLevelFigure(item)) continue;
      if (isLevelWalls(item)) {
        for (const part of wallParts(item)) ids.push(part.id);
      } else {
        ids.push(item.id);
      }
    }
    return ids;
  };

  /**
   * Whether the shape *list* changed, which is the only thing that forces a rebuild.
   *
   * **Ids in order, not a set.** Two levels with the same shapes in a different order fold
   * differently, so the order is part of the question and a set would answer it wrong.
   */
  const orderChanged = (plan: LevelPlan): boolean => {
    const now = operationIds(plan);
    if (now.length !== applied.size) return true;
    const ids = [...applied.keys()];
    return now.some((id, at) => ids[at] !== id);
  };

  /** The world-space point an item's array position stands for. */
  const pointOf = (at: readonly [number, number, number]): Vec3 => ({
    x: at[0],
    y: at[1],
    z: at[2],
  });

  /**
   * A level's turn as the CSG operation's.
   *
   * **A conversion, not a pass-through, and it is the only conversion a level shape needs.**
   * `LevelShape.at` and `LevelShape.orientation` are arrays because that is what JSON makes of
   * them and what the guest takes; `Operation` holds `{x, y, z, w}` because it crosses into
   * every meshing worker and is what `@big-mesh-studios/csg` rotates by. `host.ts` makes the
   * same conversion for a `shape-add` arriving over the wire — see the note above its
   * `quat()` reader — and two conversions of one thing that must agree is worse than one.
   *
   * Absent means the identity, which is what `makeOperation` would have used anyway.
   */
  const quatOf = (
    orientation: readonly [number, number, number, number] | undefined,
  ): Quat | undefined =>
    orientation === undefined
      ? undefined
      : {
          x: orientation[0],
          y: orientation[1],
          z: orientation[2],
          w: orientation[3],
        };

  /**
   * What a level shape is, as the operation it folds into the world as.
   *
   * **The turn goes across here and nowhere else.** `boundsOf` above takes eight corners and
   * rotates each by the operation's `orientation`, so forwarding it is all that is needed for
   * chunk invalidation to follow the shape when it turns — see ADR 0051.
   */
  const operationOf = (item: LevelShape): Operation =>
    placeOperation(pointOf(item.at), item.shape, item.combine, {
      ...(item.softness === undefined ? {} : { softness: item.softness }),
      ...(item.orientation === undefined
        ? {}
        : { orientation: quatOf(item.orientation) ?? IDENTITY }),
      ...(item.colour === undefined ? {} : { colour: item.colour }),
    });

  const applyFigures = (plan: LevelPlan): void => {
    const figures = target.figures;
    const models = target.models;
    if (figures === undefined) return;

    // Take the last apply's figures down first, so a renamed model does not leave the old
    // one standing. Ids are the ones we put there, not every figure in the world.
    for (const id of placedFigureIds) figures.remove(id);
    placedFigureIds = [];

    if (models === undefined) return;
    for (const item of plan.items) {
      if (!isLevelFigure(item)) continue;
      const model = models.get(item.model);
      // **Skipped rather than refused.** A level is being edited, not loaded from a
      // stranger's zip; a model the place has not carried yet should not stop the rest of
      // the level from standing up. `parseLevelPlan` is where a file is judged whole; this
      // is a live session, and the person editing it can see the missing model in the list.
      if (model === undefined) continue;
      const id = levelFigureId(item.id);
      figures.add(figureSpecOf(item, model, id, pointOf(item.at)));
      placedFigureIds.push(id);
    }
  };

  return {
    /**
     * Puts `plan` into the world, telling the host what changed.
     *
     * **One `geometryChanged` for the whole apply**, carrying the union of the shapes'
     * boxes — not one per shape. A level of two hundred walls applied one shape at a time
     * would ask the mesher for two hundred model sends, each cancelling the last
     * (`session.ts`). The bounds are what lets the host re-mesh the chunks that actually
     * moved.
     */
    apply(plan: LevelPlan): void {
      // What the *last* apply put in the world, read before this one replaces it. An
      // emptied level still has to re-mesh what it removed, so "was there anything" is a
      // question about before, not after.
      const hadShapes = applied.size > 0;
      const hadFigures = placedFigureIds.length > 0;

      const place = target.places.create(LEVEL_PLACE);

      const touched: Operation[] = [];
      /** What the last apply put in the place, because clearing it loses the box it reached. */
      let removed: readonly Operation[] = [];

      if (orderChanged(plan)) {
        // A rebuild: everything is new, in file order, so the fold reads the file.
        // **The old operations are read before they go**, because their box is the only
        // record of where the level used to be — and an emptied level has to re-mesh what
        // it removed, or the terrain keeps the walls it no longer has.
        removed = place.operations();
        place.ids().forEach((id) => place.remove(id));
        applied = new Map();
        // **Labelled, because a walls item is a loop of adds inside a loop of items.** A
        // `break` on the inner loop would fill the place with the rest of one wall and then
        // carry on with the next item, which is the opposite of "stop when it is full".
        rebuild: for (const item of plan.items) {
          if (isLevelFigure(item)) continue;
          if (isLevelWalls(item)) {
            for (const part of wallParts(item)) {
              const operation = place.add(
                part.id,
                placeOperation(
                  part.at,
                  part.shape,
                  item.combine,
                  wallOptions(item, part),
                ),
              );
              // The place is full. `PlaceHandle.add` refuses at `MAX_OPERATIONS_PER_PLACE`
              // and this is the place limit; the rest of the level is better standing than
              // stopping half way.
              if (operation === undefined) break rebuild;
              applied.set(part.id, operation);
              touched.push(operation);
            }
            continue;
          }
          const operation = place.add(item.id, operationOf(item));
          if (operation === undefined) break rebuild;
          applied.set(item.id, operation);
          touched.push(operation);
        }
      } else {
        // Not a rebuild: the shapes are all still here, so each one that changed is a
        // `set`, which keeps the index it already had and therefore its place in the fold.
        // A walls item's parts keep their derived ids while its segment count does, so a
        // moved point or a changed height is a `set` here too.
        for (const item of plan.items) {
          if (isLevelFigure(item)) continue;
          if (isLevelWalls(item)) {
            for (const part of wallParts(item)) {
              const previous = applied.get(part.id);
              if (previous === undefined) continue;
              const operation = placeOperation(
                part.at,
                part.shape,
                item.combine,
                wallOptions(item, part),
              );
              if (place.set(part.id, operation)) {
                touched.push(previous);
                applied.set(part.id, { ...operation, index: previous.index });
              }
            }
            continue;
          }
          const previous = applied.get(item.id);
          if (previous === undefined) continue;
          const operation = operationOf(item);
          if (place.set(item.id, operation)) {
            touched.push(previous);
            applied.set(item.id, { ...operation, index: previous.index });
          }
        }
      }

      applyFigures(plan);

      // The figures are not in the fold, so their boxes are not in `boundsOf` — but a
      // figure that moved still has to be re-meshed around it, and the host cannot know
      // that from the operations alone.
      const wasEmpty = !hadShapes && !hadFigures && touched.length === 0;
      if (!wasEmpty) {
        target.geometryChanged(
          unionWith(
            unionWith(boundsOf(removed), boundsOf(touched)),
            figuresBounds(target, plan),
          ),
        );
      }
    },
  };
};

/** How wide a level's figures reach, so a moved one re-meshes what is under it. */
const figuresBounds = (
  target: LevelTarget,
  plan: LevelPlan,
): Bounds | undefined => {
  const { figures, models } = target;
  if (figures === undefined || models === undefined) return undefined;
  let bounds: Bounds | undefined;
  for (const item of plan.items) {
    if (!isLevelFigure(item)) continue;
    const model = models.get(item.model);
    if (model === undefined) continue;
    const box = model.bounds;
    const at = item.at;
    bounds = unionWith(bounds, {
      min: { x: box.min.x + at[0], y: box.min.y + at[1], z: box.min.z + at[2] },
      max: { x: box.max.x + at[0], y: box.max.y + at[1], z: box.max.z + at[2] },
    });
  }
  return bounds;
};

const unionWith = (
  a: Bounds | undefined,
  b: Bounds | undefined,
): Bounds | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
};

/** The `FigureSpec` a level item stands for. */
const figureSpecOf = (
  item: LevelFigure,
  model: FigureModel,
  id: string,
  at: Vec3,
) => ({
  id,
  kind: item.figure,
  model,
  at,
  ...(item.yaw === undefined ? {} : { yaw: item.yaw }),
  ...(item.scale === undefined ? {} : { scale: item.scale }),
  ...(item.solid === undefined ? {} : { solid: item.solid }),
  ...(item.name === undefined ? {} : { name: item.name }),
});

/** Whether any of a level's items is a figure, for a readout or a warning. */
export const levelHasFigures = (plan: LevelPlan): boolean =>
  plan.items.some(isLevelFigure);

/** The items a level holds, in order, for a list or an export. */
export const itemsOf = (plan: LevelPlan): readonly LevelItem[] => plan.items;
