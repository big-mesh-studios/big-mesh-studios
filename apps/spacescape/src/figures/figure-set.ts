/**
 * The figures standing in the world, and the one place a `Mesh` is born.
 *
 * ## What this owns
 *
 * **A placement, a `Mesh`, and a name.** Everything else about a figure — its shape, its
 * colours, its geometry — belongs to the `FigureModel` it was placed from, and several
 * placements of the same model share all of it. This is the seam ADR 0047 draws: the fold owns
 * a place's geometry and knows nothing about figures; the figures own their transforms and
 * nothing about the fold.
 *
 * ## Ids are supplied and never reused
 *
 * **The same rule `PlaceRegistry.add` follows, and for the same reason.** Under the
 * multiplayer model every peer runs every place and derives the same figure list rather than
 * receiving it, so an id this peer invented would be a different id on every peer. A generated
 * id is the one decision that cannot be made correctly here.
 *
 * ## The group is added to the scene after the terrain
 *
 * **Because rmsl has no render-order key — draw order is scene traversal order (ADR 0014) —
 * and a figure drawn behind the terrain would be a figure that only showed through the gaps.**
 * That is the same argument `places/zones.ts` makes about its wireframes, and the scene is
 * assembled by the application, so it is the application's job to add this group last.
 *
 * ## Two materials and one of them is almost never used
 *
 * **A figure is drawn with the terrain's own `SurfaceMaterial`, so a figure is lit by the same
 * shader, the same sky, the same fog and the same point lights as the ground it stands on** —
 * which is the cheapest correct answer available and the reason figures needed no new material
 * path at all.
 *
 * The *aimed* figure is the exception, and it is the exception that needed a second material
 * instance rather than a per-mesh uniform. Uniforms live on the material, every figure shares
 * one material, and rmsl's `onBeforeRender` hook takes neither the mesh nor the material — so
 * there is no seam through which "this one mesh only" could be said. A second `SurfaceMaterial`
 * with `tintStrength` set is honest about that: it is the same program, the same lighting and
 * the same geometry, and **the geometry is still shared**, because a `Mesh` holds a material
 * reference and swapping it writes one field. `Object3D.onBeforeRender` is the route that
 * would have avoided the second instance and it is not usable: the hook's signature does not
 * carry the object being drawn, and whether a uniform set in it is read by this draw or the
 * next is not something to depend on.
 */

import { Group, Mesh, Vector3 } from "@random-mesh/rmsl/scene";
import type { Material, Scene } from "@random-mesh/rmsl/scene";

import type { Vec3 } from "@big-mesh-studios/core";

import type { FigureModel } from "../places/model-library";

import {
  nearestFigureDistance,
  toWorld,
  transformYaw,
  type FigureTransform,
} from "./figure";
import {
  pickFigure,
  type FigureHit,
  type PickableFigure,
} from "./figure-picker";

/**
 * What a figure is for.
 *
 * **Two, and the difference is what the crosshair does with an empty hand.** The sibling engine
 * makes the same split and for the same reason: talking to a character is not the same gesture as
 * using a vending machine, and a world where both are "press E on the thing you are looking at"
 * cannot tell a player which one they are about to do.
 */
export type FigureKind = "prop" | "npc";

/** One standing figure. */
export interface Figure {
  /** The name a place script gave it. Unique within the set, and never reused. */
  readonly id: string;
  readonly kind: FigureKind;
  /** The model it is drawn from, and the same object every placement of it shares. */
  readonly model: FigureModel;
  readonly transform: FigureTransform;
  /** Whether the player collides with it. A coin does not; a fridge does. */
  readonly solid: boolean;
  /** What to call it in a prompt. Absent for a prop, which has no name. */
  readonly name: string | undefined;
  /** The drawn mesh, or `undefined` for a model with no surface in its own box. */
  readonly mesh: Mesh | undefined;
}

/** What it takes to put a figure in the world. */
export interface FigureSpec {
  readonly id: string;
  readonly kind: FigureKind;
  readonly model: FigureModel;
  readonly at: Vec3;
  readonly yaw?: number;
  readonly scale?: number;
  /** Solid by default, because the common case is furniture and a coin is the exception. */
  readonly solid?: boolean;
  readonly name?: string;
}

/**
 * Every figure a place has put in the world.
 *
 * **A `Map` keyed by id, for the reason `PlaceRegistry` uses one:** a figure has to be
 * addressable by a name the script chose, which an array cannot do without a second structure
 * kept in step with it.
 */
export class FigureSet {
  private readonly byId = new Map<string, Figure>();

  /**
   * The figures, drawn.
   *
   * **A `Group` rather than loose `Mesh`es**, so that disposing the place takes the lot down in
   * one call and so that a caller adding it to a scene is adding one thing. The group's own
   * transform is never touched — every figure carries its placement on its own mesh, because a
   * group transform would move children a placement does not know about.
   */
  readonly group: Group;

  private readonly material: Material;
  /** The one instance every aimed figure shares, so that the tint costs one material, not many. */
  private readonly highlighted: Material;
  private highlightedId: string | undefined;

  /**
   * @param material what an ordinary figure is drawn with — normally the terrain's own.
   * @param highlighted what the figure under the crosshair is drawn with. One instance for all
   *   of them; see the note at the top of this file.
   */
  constructor(material: Material, highlighted: Material = material) {
    this.material = material;
    this.highlighted = highlighted;
    this.group = new Group();
  }

  /** The figure the crosshair is on, if any. */
  get aimed(): Figure | undefined {
    return this.highlightedId === undefined
      ? undefined
      : this.byId.get(this.highlightedId);
  }

  /** Adds the group to a scene, after whatever the caller has already added. */
  attach(scene: Scene): void {
    scene.add(this.group);
  }

  /**
   * Puts a figure in the world, or `undefined` when its id is taken.
   *
   * **Refused rather than replaced**, for the reason `PlaceRegistry.add` refuses: two peers must
   * not disagree about whether an id means the first figure or the second, and "the second one
   * wins" is exactly that disagreement. A place that wants a figure somewhere else moves it.
   */
  add(spec: FigureSpec): Figure | undefined {
    if (this.byId.has(spec.id)) return undefined;

    const transform: FigureTransform = {
      at: { ...spec.at },
      yaw: spec.yaw ?? 0,
      scale: spec.scale ?? 1,
    };
    // **`draw` and not the geometry**, so that every placement of a model shares one set of
    // buffers. See ADR 0047 — a readable `BufferGeometry` is a `BufferGeometry` somebody will
    // clone, and a clone copies every buffer and undoes the entire mechanism quietly.
    const mesh = spec.model.draw(this.material);
    if (mesh !== undefined) {
      this.applyTransform(mesh, transform);
      this.group.add(mesh);
    }

    const figure: Figure = {
      id: spec.id,
      kind: spec.kind,
      model: spec.model,
      transform,
      solid: spec.solid ?? true,
      name: spec.name,
      mesh,
    };
    this.byId.set(spec.id, figure);
    return figure;
  }

  /** Takes a figure out, and its mesh with it. */
  remove(id: string): boolean {
    const figure = this.byId.get(id);
    if (figure === undefined) return false;
    if (figure.mesh !== undefined) this.group.remove(figure.mesh);
    this.byId.delete(id);
    // **Cleared rather than left pointing at nothing**, because `aim` compares against this
    // and a removed figure still sitting here would mean the next `aim` of the same id — which
    // cannot happen, an id is never reused — short-circuits and leaves the tint on a dead mesh.
    if (this.highlightedId === id) this.highlightedId = undefined;
    return true;
  }

  /**
   * Moves a figure, and says whether there was one.
   *
   * **Three numbers written rather than a mesh rebuilt**, which is the whole reason a figure is
   * its own mesh. A character walking across a room costs this and nothing else — no operation
   * list rewritten, no BVH rebuilt, no chunk re-meshed.
   */
  move(id: string, at: Vec3, yaw?: number): boolean {
    const figure = this.byId.get(id);
    if (figure === undefined) return false;

    figure.transform.at = { ...at };
    if (yaw !== undefined) figure.transform.yaw = yaw;
    if (figure.mesh !== undefined)
      this.applyTransform(figure.mesh, figure.transform);
    return true;
  }

  /** Whether that id is taken. Cheaper than `get` for a check that only wants a yes. */
  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** The figure with that id, or `undefined`. */
  get(id: string): Figure | undefined {
    return this.byId.get(id);
  }

  /**
   * Says which figure the crosshair is on, and tints exactly that one.
   *
   * **A material swap rather than a draw, a clone or a second geometry.** One field on one mesh
   * changes; the geometry is still the model's, still shared with every other placement of it,
   * and the material is still the terrain's shader. Passing the id that is already tinted does
   * nothing, so a frame loop can call this every frame without thinking about it.
   *
   * **An id that is not there clears the tint**, which is what a frame in which the crosshair
   * left every figure should do — and is why the argument is an id rather than a figure:
   * "aimed at nothing" has to be expressible.
   */
  aim(id: string | undefined): void {
    const next = id !== undefined && this.byId.has(id) ? id : undefined;
    if (next === this.highlightedId) return;
    this.highlightedId = next;

    for (const figure of this.byId.values()) {
      if (figure.mesh === undefined) continue;
      figure.mesh.material =
        figure.id === next ? this.highlighted : this.material;
    }
  }

  /** Every figure, in the order they were added. */
  list(): readonly Figure[] {
    return [...this.byId.values()];
  }

  /** How many figures are standing in the world, for a readout and for the limit test. */
  get size(): number {
    return this.byId.size;
  }

  /** Every id, in the order they were added. */
  ids(): readonly string[] {
    return [...this.byId.keys()];
  }

  /* ------------------------------------------------- what the player and the eye ask */

  /**
   * The distance from a point to the nearest solid figure, or `undefined` when none are solid.
   *
   * **A method rather than a held reader, and the reasoning is a trade rather than a rule.**
   * `GameWorld` wants a *function* it can call every frame, so this is reached through an arrow
   * at the application — which is how `mediumAt` works, and for the same reason: the figures do
   * not exist when the world is built. The list inside is rebuilt on each call rather than
   * cached, because a figure is added or removed a handful of times over a session and
   * `getSolidAt` runs several times a frame — so the rebuild is the cheaper side of that, and
   * a cached array is the second structure `PlaceRegistry` says it exists to avoid.
   */
  solidDistanceAt(p: Vec3): number | undefined {
    const solids = this.list().filter((figure) => figure.solid);
    if (solids.length === 0) return undefined;
    return nearestFigureDistance(
      solids.map((figure) => ({
        transform: figure.transform,
        half: figure.model.half,
      })),
    )(p);
  }

  /** The figures the crosshair can find, in the form the picker wants. */
  pickable(): readonly PickableFigure<Figure>[] {
    return this.list().map((figure) => ({
      transform: figure.transform,
      field: figure.model.field,
      half: figure.model.half,
      value: figure,
    }));
  }

  /** The figure the crosshair is on, or `undefined`. */
  pick(
    origin: Vec3,
    direction: Vec3,
    reach?: number,
  ): FigureHit<Figure> | undefined {
    return pickFigure(this.pickable(), origin, direction, reach);
  }

  /** Takes every figure out of the scene. The models' geometry is *not* freed — see `dispose`. */
  clear(): void {
    for (const figure of this.byId.values()) {
      if (figure.mesh !== undefined) this.group.remove(figure.mesh);
    }
    this.byId.clear();
    this.highlightedId = undefined;
  }

  /**
   * Frees every figure and every model's GPU buffers.
   *
   * **Both, and the models are why this is separate from `clear`.** A `Mesh` dropped from a
   * group is garbage collected; a `BufferGeometry` is not, because the renderer's buffer map is
   * keyed by object and holds it for as long as the renderer lives. `render/chunk-geometry.ts`
   * records the same rule for chunks.
   *
   * **The library is a parameter rather than something held**, so that this class has no way to
   * outlive the thing whose geometry it is disposing. The application owns both and drops them
   * together.
   */
  dispose(library: { dispose(): void }): void {
    this.clear();
    library.dispose();
  }

  /** Writes a placement onto a mesh. One place, so a move and a create cannot drift apart. */
  private applyTransform(mesh: Mesh, transform: FigureTransform): void {
    mesh.position.set(transform.at.x, transform.at.y, transform.at.z);
    // **Written through a `Quaternion` rather than a copy, because the two are different
    // types**: a `Quat` from `@big-mesh-studios/core` is four plain numbers and rmsl's is a
    // class with twenty methods. `set` takes the four numbers in the order they are stored.
    mesh.quaternion.set(
      transformYaw(transform.yaw).x,
      transformYaw(transform.yaw).y,
      transformYaw(transform.yaw).z,
      transformYaw(transform.yaw).w,
    );
    // **Uniform, and set from the transform rather than left at one.** A `Mesh`'s scale defaults
    // to one and a placement's does not, and a figure silently drawn at the wrong size is the
    // kind of thing nobody notices until two of them are side by side.
    mesh.scale.setScalar(transform.scale);
  }
}

/**
 * The world position of a figure's origin, as a `Vector3`.
 *
 * **A `Vector3` rather than the plain `{x,y,z}` this code uses everywhere else**, because that
 * is what an rmsl object wants and this is the one place that knows it. Everything inside the
 * figures layer is plain numbers so that it can be tested without a renderer.
 */
export const figurePosition = (figure: Figure): Vector3 =>
  new Vector3(
    figure.transform.at.x,
    figure.transform.at.y,
    figure.transform.at.z,
  );

/**
 * A point in a figure's own frame as a world point.
 *
 * **Re-exported rather than left for every caller to reach past this module for**, so that a
 * prop's window or a character's hand is placed by the same arithmetic the collider uses.
 */
export { toWorld };
