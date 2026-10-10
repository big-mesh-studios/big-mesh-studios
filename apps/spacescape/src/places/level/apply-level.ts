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
import type { Bounds, Vec3 } from "@big-mesh-studios/core";
import type { FigureSet } from "../../figures/figure-set";
import type { FigureModel } from "../model-library";

import type { LevelFigure, LevelItem, LevelPlan, LevelShape } from "./types";
import { isLevelFigure, levelFigureId, LEVEL_PLACE } from "./types";

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
export const createLevelApplier = (target: LevelTarget) => {
  let placedFigureIds: string[] = [];
  /** The operations as they were last applied, by id — so an edit can be a `set` not a rebuild. */
  let applied = new Map<string, Operation>();

  /**
   * Whether the shape *list* changed, which is the only thing that forces a rebuild.
   *
   * **Ids in order, not a set.** Two levels with the same shapes in a different order fold
   * differently, so the order is part of the question and a set would answer it wrong.
   */
  const orderChanged = (plan: LevelPlan): boolean => {
    const now = plan.items
      .filter((item) => !isLevelFigure(item))
      .map((item) => item.id);
    if (now.length !== applied.size) return true;
    return now.some((id, at) => [...applied.keys()][at] !== id);
  };

  /** The world-space point an item's array position stands for. */
  const pointOf = (at: readonly [number, number, number]): Vec3 => ({
    x: at[0],
    y: at[1],
    z: at[2],
  });

  const operationOf = (item: LevelShape): Operation =>
    placeOperation(pointOf(item.at), item.shape, item.combine, {
      ...(item.softness === undefined ? {} : { softness: item.softness }),
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
      const shapes = plan.items.filter(
        (item): item is LevelShape => !isLevelFigure(item),
      );

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
        for (const item of shapes) {
          const operation = place.add(item.id, operationOf(item));
          if (operation === undefined) {
            // The place is full. `PlaceHandle.add` refuses at
            // `MAX_OPERATIONS_PER_PLACE` and this is the place limit; the level reader
            // caps at the same number, so reaching here means the world gained shapes
            // from somewhere else, and the rest of the level is better standing than
            // stopping half way.
            break;
          }
          applied.set(item.id, operation);
          touched.push(operation);
        }
      } else {
        // Not a rebuild: the shapes are all still here, so each one that changed is a
        // `set`, which keeps the index it already had and therefore its place in the fold.
        for (const item of shapes) {
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
