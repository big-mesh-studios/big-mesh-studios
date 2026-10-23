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
import type { Operation, OperationShape } from "@big-mesh-studios/csg";
import { placeOperation } from "../place-registry";
import type { PlaceRegistry } from "../place-registry";
import type { Bounds, Quat, Vec3 } from "@big-mesh-studios/core";
import type { FigureSet } from "../../figures/figure-set";
import type { FigureModel } from "../model-library";
import { materialId } from "../../render/material-names";

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
 * A level's material name, as the id the renderer's pattern table indexes.
 *
 * **The conversion belongs here rather than in `Operation`.** ADR 0048 keeps a fold's
 * material a number because it crosses into a meshing worker, while the table it indexes
 * lives in the renderer; the level file keeps the name because that is what a person reads
 * and what the editor's dropdown offers. `parseLevelPlan` has already refused a name this
 * build does not know, so the fall-through is a guard for a live plan whose item was built
 * somewhere that skipped the reader — not a user-facing failure mode.
 */
const materialOf = (name: string | undefined): { material?: number } => {
  if (name === undefined) return {};
  const id = materialId(name);
  return id === undefined ? {} : { material: id };
};

/**
 * Whether two operations describe the same geometry, ignoring their fold index.
 *
 * **The question an apply has to ask before it marks a chunk stale.** A plan is a new object
 * on every edit, so identity cannot answer it; without a comparison every `setLevel` would
 * report *every* shape as changed, and a person resizing one cutout would re-mesh every chunk
 * the whole level reaches. Exact equality is right here: the editor writes the numbers it
 * means, and a value that did not move does not change the surface.
 *
 * The index is deliberately left out. `PlaceHandle.set` keeps the old one, because an edit must
 * not move a shape within the fold (ADR 0016), so a differing index is never a geometry change.
 */
const sameOperation = (a: Operation, b: Operation): boolean =>
  a.combine === b.combine &&
  a.softness === b.softness &&
  a.opacity === b.opacity &&
  a.material === b.material &&
  sameVec3(a.origin, b.origin) &&
  sameVec3(a.orientation, b.orientation) &&
  sameColour(a.colour, b.colour) &&
  sameShape(a.shape, b.shape);

const sameVec3 = (
  a: { readonly x: number; readonly y: number; readonly z: number },
  b: { readonly x: number; readonly y: number; readonly z: number },
): boolean => a.x === b.x && a.y === b.y && a.z === b.z;

const sameColour = (
  a: { readonly r: number; readonly g: number; readonly b: number } | undefined,
  b: { readonly r: number; readonly g: number; readonly b: number } | undefined,
): boolean =>
  a === undefined || b === undefined
    ? a === b
    : a.r === b.r && a.g === b.g && a.b === b.b;

const sameShape = (a: OperationShape, b: OperationShape): boolean => {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "Sphere": {
      const other = b as Extract<OperationShape, { type: "Sphere" }>;
      return a.radius === other.radius;
    }
    case "Ellipsoid": {
      const other = b as Extract<OperationShape, { type: "Ellipsoid" }>;
      return sameVec3(a.radius, other.radius);
    }
    case "Box": {
      const other = b as Extract<OperationShape, { type: "Box" }>;
      return sameVec3(a.len, other.len);
    }
    case "RoundBox": {
      const other = b as Extract<OperationShape, { type: "RoundBox" }>;
      return sameVec3(a.len, other.len) && a.radius === other.radius;
    }
    case "Capsule":
    case "Cone":
    case "Cylinder":
    case "HexPrism": {
      const other = b as Extract<
        OperationShape,
        { type: "Capsule" | "Cone" | "Cylinder" | "HexPrism" }
      >;
      return a.len === other.len && a.radius === other.radius;
    }
    case "Torus": {
      const other = b as Extract<OperationShape, { type: "Torus" }>;
      return (
        a.majorRadius === other.majorRadius &&
        a.minorRadius === other.minorRadius
      );
    }
    case "Polygon": {
      const other = b as Extract<OperationShape, { type: "Polygon" }>;
      return (
        a.len === other.len &&
        a.points.length === other.points.length &&
        a.points.every(
          (point, at) =>
            point.x === other.points[at]!.x && point.z === other.points[at]!.z,
        )
      );
    }
  }
};

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
 * **Colour, softness and material come off the item; the turn is the part's own.** Every
 * segment of one walls item shares its appearance, but each stands along its own line — so
 * the item is the thing with a colour and the part is the thing with a direction, and mixing
 * the two would give every segment the first segment's turn.
 *
 * **The material conversion is `materialOf`'s, the same one `operationOf` uses.** Both kinds
 * of level geometry carry a name from the same vocabulary, so both have to reach the fold the
 * same way; a walls item applying a material that a shape did not would be one truth per
 * item kind.
 */
const wallOptions = (
  item: LevelWalls,
  part: WallPart,
): {
  softness?: number;
  orientation: Quat;
  colour?: { r: number; g: number; b: number };
  material?: number;
} => ({
  ...(item.softness === undefined ? {} : { softness: item.softness }),
  orientation: part.orientation,
  ...(item.colour === undefined ? {} : { colour: item.colour }),
  ...materialOf(item.material),
});

export const createLevelApplier = (target: LevelTarget) => {
  /**
   * The figures this applier put in the world, by namespaced id.
   *
   * **A signature and the box it reached, not the item.** The signature is what tells an
   * unchanged figure from a moved one, and the box is the only record of where a figure that
   * is about to be removed used to be — which is exactly what an emptied level has to re-mesh.
   */
  let appliedFigures = new Map<string, { signature: string; bounds: Bounds }>();
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
      ...materialOf(item.material),
    });

  /**
   * Brings the figure set up to date, returning the box the *changed* figures reach.
   *
   * **Only changed figures count, and that is what keeps a shape edit local.** A figure is
   * its own mesh and does not fold with the level, so an unchanged figure under a moving wall
   * has no geometry to rebuild — but reporting its box anyway would widen the invalidation to
   * every chunk a prop happens to stand in. The signature covers everything that changes the
   * mesh or its placement; a figure that matches its previous signature is left exactly where
   * it is and reported nowhere.
   *
   * A changed figure is removed and added again rather than moved, because the model, the
   * scale and the resolution can all change as well as the position. That is cheap — a figure
   * shares its model's geometry — and it cannot leave a renamed model's old mesh standing.
   */
  const applyFigures = (plan: LevelPlan): Bounds | undefined => {
    const figures = target.figures;
    const models = target.models;
    if (figures === undefined) return undefined;

    const wanted = new Map<string, { signature: string; bounds: Bounds }>();
    let changed: Bounds | undefined;

    if (models !== undefined) {
      for (const item of plan.items) {
        if (!isLevelFigure(item)) continue;
        const model = models.get(item.model);
        // **Skipped rather than refused.** A level is being edited, not loaded from a
        // stranger's zip; a model the place has not carried yet should not stop the rest of
        // the level from standing up. `parseLevelPlan` is where a file is judged whole; this
        // is a live session, and the person editing it can see the missing model in the list.
        if (model === undefined) continue;
        const id = levelFigureId(item.id);
        const signature = figureSignature(item);
        const bounds = figureBoundsOf(item, model);
        wanted.set(id, { signature, bounds });

        const previous = appliedFigures.get(id);
        if (previous?.signature === signature) continue;
        if (previous !== undefined) {
          figures.remove(id);
          changed = unionWith(changed, previous.bounds);
        }
        figures.add(figureSpecOf(item, model, id, pointOf(item.at)));
        changed = unionWith(changed, bounds);
      }
    }

    // Any figure that was ours and is no longer in the plan. `models` being absent empties
    // the set, which is the same statement the previous version made by returning early.
    for (const [id, previous] of appliedFigures) {
      if (wanted.has(id)) continue;
      if (figures.remove(id)) changed = unionWith(changed, previous.bounds);
    }

    appliedFigures = wanted;
    return changed;
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
              const next = { ...operation, index: previous.index };
              if (sameOperation(previous, next)) continue;
              place.set(part.id, operation);
              // **Both boxes, because an edit can move or grow a shape as well as shrink
              // it.** The old one is where the surface used to be and the new one is where
              // it is now, and invalidating only the old would leave the added part
              // unmeshed until something else happened to ask for it.
              touched.push(previous, next);
              applied.set(part.id, next);
            }
            continue;
          }
          const previous = applied.get(item.id);
          if (previous === undefined) continue;
          const next = { ...operationOf(item), index: previous.index };
          if (sameOperation(previous, next)) continue;
          place.set(item.id, next);
          touched.push(previous, next);
          applied.set(item.id, next);
        }
      }

      const figureBounds = applyFigures(plan);

      // The figures are not in the fold, so their boxes are not in `boundsOf` — but a
      // figure that moved still has to be re-meshed around it, and the host cannot know
      // that from the operations alone.
      //
      // **`undefined` is not passed on unless something really changed everything.** It is
      // this codebase's word for "re-mesh the whole window", so a no-op apply — two
      // identical plans, or a change to an item that reports no box — has to say nothing
      // rather than say everything.
      const changed = unionWith(
        unionWith(boundsOf(removed), boundsOf(touched)),
        figureBounds,
      );
      if (changed !== undefined) target.geometryChanged(changed);
    },
  };
};

/** The world box one placed figure reaches, for the chunks its removal or move touches. */
const figureBoundsOf = (item: LevelFigure, model: FigureModel): Bounds => {
  const box = model.bounds;
  const at = item.at;
  return {
    min: { x: box.min.x + at[0], y: box.min.y + at[1], z: box.min.z + at[2] },
    max: { x: box.max.x + at[0], y: box.max.y + at[1], z: box.max.z + at[2] },
  };
};

/**
 * Everything about a figure that changes what stands in the world.
 *
 * **A tuple rather than the item's own JSON**, so the comparison cannot depend on the order
 * keys happen to be written in. Absent values become `null` because `undefined` disappears
 * from a JSON array — `at: [1, 2, 3], yaw: undefined` and `at: [1, 2, 3]` are the same figure.
 */
const figureSignature = (item: LevelFigure): string =>
  JSON.stringify([
    item.figure,
    item.model,
    item.at,
    item.yaw ?? null,
    item.scale ?? null,
    item.meshResolution ?? null,
    item.solid ?? null,
    item.name ?? null,
  ]);

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
  ...(item.meshResolution === undefined
    ? {}
    : { meshResolution: item.meshResolution }),
  ...(item.solid === undefined ? {} : { solid: item.solid }),
  ...(item.name === undefined ? {} : { name: item.name }),
});

/** Whether any of a level's items is a figure, for a readout or a warning. */
export const levelHasFigures = (plan: LevelPlan): boolean =>
  plan.items.some(isLevelFigure);

/** The items a level holds, in order, for a list or an export. */
export const itemsOf = (plan: LevelPlan): readonly LevelItem[] => plan.items;
