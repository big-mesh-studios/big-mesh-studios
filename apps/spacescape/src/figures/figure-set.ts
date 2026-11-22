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

import {
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "@random-mesh/rmsl/scene";
import type { Material, Scene } from "@random-mesh/rmsl/scene";

import type { Vec3 } from "@big-mesh-studios/core";

import type { FigureModel } from "../places/model-library";
import type { MeshMode } from "@big-mesh-studios/meshing";

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
  /** True when this figure is rendered as part of a static instanced batch. */
  readonly batched: boolean;
  readonly meshResolution?: number;
  readonly meshMode?: MeshMode;
}

/** What it takes to put a figure in the world. */
export interface FigureSpec {
  readonly id: string;
  readonly kind: FigureKind;
  readonly model: FigureModel;
  readonly at: Vec3;
  readonly yaw?: number;
  readonly scale?: number;
  /**
   * The voxel size to mesh the model at, when this instance wants a different one.
   *
   * **Not a size.** The model is meshed once per requested resolution and every instance at
   * that resolution shares the geometry, so this is a quality control rather than a per-figure
   * mesh. Absent means the model's own default (`FigureModel.resolution`).
   */
  readonly meshResolution?: number;
  /** Which mesher to use for this figure's model. Absent means the model's own default. */
  readonly meshMode?: MeshMode;
  /** Solid by default, because the common case is furniture and a coin is the exception. */
  readonly solid?: boolean;
  readonly name?: string;
  /** Static props can be instanced/batched for draw-call reduction. Defaults to props=true, npcs=false. */
  readonly static?: boolean;
}

/**
 * Every figure a place has put in the world.
 *
 * **A `Map` keyed by id, for the reason `PlaceRegistry` uses one:** a figure has to be
 * addressable by a name the script chose, which an array cannot do without a second structure
 * kept in step with it.
 */
type FigureBatch = {
  key: string;
  model: FigureModel;
  resolution?: number;
  mode?: MeshMode;
  mesh: InstancedMesh;
  ids: string[];
};

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
  private readonly batches = new Map<string, FigureBatch>();
  private readonly batchOf = new Map<string, { key: string; index: number }>();
  private highlightMesh: Mesh | undefined;
  private hiddenBatchHighlight: { id: string; key: string; index: number } | undefined;

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

  private batchKey(spec: FigureSpec): string {
    const res = spec.meshResolution ?? spec.model.resolution;
    const mode = spec.meshMode ?? spec.model.mode ?? "marching-cubes";
    return `${spec.model.name}|${res}|${mode}`;
  }

  private isStatic(spec: FigureSpec): boolean {
    return spec.static ?? spec.kind === "prop";
  }

  private matrixFor(transform: FigureTransform): Matrix4 {
    const m = new Matrix4();
    const q = transformYaw(transform.yaw);
    m.compose(
      new Vector3(transform.at.x, transform.at.y, transform.at.z),
      new Quaternion(q.x, q.y, q.z, q.w),
      new Vector3(transform.scale, transform.scale, transform.scale),
    );
    return m;
  }

  private ensureBatch(spec: FigureSpec): FigureBatch | undefined {
    const key = this.batchKey(spec);
    const existing = this.batches.get(key);
    if (existing) return existing;
    const base = spec.model.draw(
      this.material,
      spec.meshResolution,
      spec.meshMode,
    );
    if (base === undefined) return undefined;
    // Use InstancedMesh with count 0 initially; we'll grow by recreating? rmsl InstancedMesh has fixed count.
    // We'll allocate in chunks.
    const mesh = new InstancedMesh(base.geometry, this.material, 0);
    mesh.count = 0;
    this.group.add(mesh);
    const batch: FigureBatch = {
      key,
      model: spec.model,
      resolution: spec.meshResolution,
      mode: spec.meshMode,
      mesh,
      ids: [],
    };
    this.batches.set(key, batch);
    // base mesh was just a wrapper around shared geometry; remove it, don't dispose geometry
    return batch;
  }

  private setBatchInstance(batch: FigureBatch, index: number, transform: FigureTransform): void {
    batch.mesh.setMatrixAt(index, this.matrixFor(transform));
    batch.mesh.instanceMatrix.needsUpdate = true;
  }

  private rebuildBatchMesh(batch: FigureBatch): void {
    // Recreate InstancedMesh with new count (rmsl count is fixed-ish; safest to recreate)
    const old = batch.mesh;
    this.group.remove(old);
    const base = batch.model.draw(this.material, batch.resolution, batch.mode);
    if (base === undefined) {
      batch.ids = [];
      batch.mesh = old;
      return;
    }
    const mesh = new InstancedMesh(base.geometry, this.material, Math.max(1, batch.ids.length));
    mesh.count = batch.ids.length;
    for (let i = 0; i < batch.ids.length; i++) {
      const fig = this.byId.get(batch.ids[i]!);
      if (fig) mesh.setMatrixAt(i, this.matrixFor(fig.transform));
    }
    mesh.instanceMatrix.needsUpdate = true;
    batch.mesh = mesh;
    this.group.add(mesh);
    // old mesh is gone; clear hidden highlight state so refresh doesn't restore into it
    if (this.hiddenBatchHighlight?.key === batch.key) this.hiddenBatchHighlight = undefined;
    this.refreshHighlight();
  }

  private addToBatch(spec: FigureSpec, figureId: string): boolean {
    const batch = this.ensureBatch(spec);
    if (!batch) return false;
    batch.ids.push(figureId);
    this.batchOf.set(figureId, { key: batch.key, index: batch.ids.length - 1 });
    this.rebuildBatchMesh(batch);
    return true;
  }

  private removeFromBatch(figureId: string): void {
    const info = this.batchOf.get(figureId);
    if (!info) return;
    const batch = this.batches.get(info.key);
    this.batchOf.delete(figureId);
    if (!batch) return;
    const idx = info.index;
    const lastId = batch.ids.pop();
    if (lastId && lastId !== figureId) {
      batch.ids[idx] = lastId;
      this.batchOf.set(lastId, { key: batch.key, index: idx });
    }
    // update indices for moved lastId already done
    if (batch.ids.length === 0) {
      this.group.remove(batch.mesh);
      this.batches.delete(batch.key);
    } else {
      this.rebuildBatchMesh(batch);
    }
  }

  private restoreHighlightState(): void {
    if (this.highlightMesh) {
      this.group.remove(this.highlightMesh);
      this.highlightMesh = undefined;
    }
    if (this.hiddenBatchHighlight) {
      const { id, key } = this.hiddenBatchHighlight;
      const batch = this.batches.get(key);
      const figure = this.byId.get(id);
      const info = this.batchOf.get(id);
      if (batch && figure && info && info.key === key) {
        this.setBatchInstance(batch, info.index, figure.transform);
      }
      this.hiddenBatchHighlight = undefined;
    }
    // restore non-batched material
    if (this.highlightedId) {
      const prev = this.byId.get(this.highlightedId);
      if (prev?.mesh && !prev.batched) prev.mesh.material = this.material;
    }
  }

  private applyHighlightState(): void {
    if (this.highlightedId === undefined) return;
    const figure = this.byId.get(this.highlightedId);
    if (!figure) return;
    if (figure.batched) {
      const info = this.batchOf.get(figure.id);
      const batch = info ? this.batches.get(info.key) : undefined;
      if (batch && info) {
        // hide instance in batch and show overlay
        const zero = new Matrix4().makeScale(0, 0, 0);
        batch.mesh.setMatrixAt(info.index, zero);
        batch.mesh.instanceMatrix.needsUpdate = true;
        this.hiddenBatchHighlight = { id: figure.id, key: info.key, index: info.index };
      }
      const base = figure.model.draw(this.highlighted, figure.meshResolution, figure.meshMode);
      if (base) {
        base.material = this.highlighted;
        this.applyTransform(base, {
          ...figure.transform,
          scale: figure.transform.scale * 1.002,
        });
        this.highlightMesh = base;
        this.group.add(base);
      }
      return;
    }
    if (figure.mesh) {
      figure.mesh.material = this.highlighted;
    }
  }

  private refreshHighlight(): void {
    // re-apply for current highlightedId (e.g. after move/rebuild)
    const id = this.highlightedId;
    this.restoreHighlightState();
    this.highlightedId = id;
    this.applyHighlightState();
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
    const wantsBatch = this.isStatic(spec);
    let mesh: Mesh | undefined;
    let batched = false;

    // Insert provisional figure so rebuildBatchMesh can find its transform.
    const provisional: Figure = {
      id: spec.id,
      kind: spec.kind,
      model: spec.model,
      transform,
      solid: spec.solid ?? true,
      name: spec.name,
      mesh: undefined,
      batched: wantsBatch,
      meshResolution: spec.meshResolution,
      meshMode: spec.meshMode,
    };
    this.byId.set(spec.id, provisional);

    if (wantsBatch) {
      const ok = this.addToBatch(spec, spec.id);
      if (ok) {
        batched = true;
      } else {
        this.byId.delete(spec.id);
        mesh = spec.model.draw(this.material, spec.meshResolution, spec.meshMode);
        if (mesh !== undefined) {
          this.applyTransform(mesh, transform);
          this.group.add(mesh);
        }
      }
    } else {
      this.byId.delete(spec.id);
      mesh = spec.model.draw(this.material, spec.meshResolution, spec.meshMode);
      if (mesh !== undefined) {
        this.applyTransform(mesh, transform);
        this.group.add(mesh);
      }
    }

    const figure: Figure = {
      id: spec.id,
      kind: spec.kind,
      model: spec.model,
      transform,
      solid: spec.solid ?? true,
      name: spec.name,
      mesh,
      batched,
      meshResolution: spec.meshResolution,
      meshMode: spec.meshMode,
    };
    this.byId.set(spec.id, figure);
    return figure;
  }

  /** Takes a figure out, and its mesh with it. */
  remove(id: string): boolean {
    const figure = this.byId.get(id);
    if (figure === undefined) return false;
    if (figure.batched) this.removeFromBatch(id);
    else if (figure.mesh !== undefined) this.group.remove(figure.mesh);
    this.byId.delete(id);
    if (this.highlightedId === id) {
      this.highlightedId = undefined;
      this.refreshHighlight();
    }
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
    if (figure.batched) {
      const info = this.batchOf.get(id);
      const batch = info ? this.batches.get(info.key) : undefined;
      if (batch && info) this.setBatchInstance(batch, info.index, figure.transform);
    } else if (figure.mesh !== undefined) {
      this.applyTransform(figure.mesh, figure.transform);
    }
    if (this.highlightedId === id) this.refreshHighlight();
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
    this.restoreHighlightState();
    this.highlightedId = next;
    this.applyHighlightState();
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
    for (const batch of this.batches.values()) this.group.remove(batch.mesh);
    if (this.highlightMesh) this.group.remove(this.highlightMesh);
    this.highlightMesh = undefined;
    this.hiddenBatchHighlight = undefined;
    this.batches.clear();
    this.batchOf.clear();
    this.byId.clear();
    this.highlightedId = undefined;
  }

  /** Occludable meshes/batches for low-res occlusion pass. */
  occludables(): Array<{
    key: string;
    min: [number, number, number];
    max: [number, number, number];
    mesh: Mesh;
    setVisible(visible: boolean): void;
  }> {
    const out: Array<{ key: string; min: [number, number, number]; max: [number, number, number]; mesh: Mesh; setVisible(v: boolean): void }> = [];
    const figBounds = (f: Figure) => {
      const b = f.model.bounds;
      const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2;
      const hx = (b.max.x - b.min.x) / 2, hy = (b.max.y - b.min.y) / 2, hz = (b.max.z - b.min.z) / 2;
      const c = Math.cos(f.transform.yaw), s = Math.sin(f.transform.yaw);
      const rcx = cx * c + cz * s, rcz = -cx * s + cz * c;
      const rhx = Math.abs(c) * hx + Math.abs(s) * hz;
      const rhz = Math.abs(s) * hx + Math.abs(c) * hz;
      const sc = f.transform.scale;
      const wx = f.transform.at.x + rcx * sc, wy = f.transform.at.y + cy * sc, wz = f.transform.at.z + rcz * sc;
      return { min: [wx - rhx * sc, wy - hy * sc, wz - rhz * sc] as [number, number, number], max: [wx + rhx * sc, wy + hy * sc, wz + rhz * sc] as [number, number, number] };
    };
    for (const batch of this.batches.values()) {
      let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for (const id of batch.ids) {
        const f = this.byId.get(id); if (!f) continue;
        const b = figBounds(f);
        if (b.min[0]<minX) minX=b.min[0]; if (b.min[1]<minY) minY=b.min[1]; if (b.min[2]<minZ) minZ=b.min[2];
        if (b.max[0]>maxX) maxX=b.max[0]; if (b.max[1]>maxY) maxY=b.max[1]; if (b.max[2]>maxZ) maxZ=b.max[2];
      }
      if (minX===Infinity) continue;
      out.push({ key: `batch:${batch.key}`, min: [minX,minY,minZ], max: [maxX,maxY,maxZ], mesh: batch.mesh as unknown as Mesh, setVisible: (v) => { batch.mesh.visible = v; } });
    }
    for (const f of this.byId.values()) {
      if (f.batched || !f.mesh) continue;
      const b = figBounds(f);
      out.push({ key: `fig:${f.id}`, min: b.min, max: b.max, mesh: f.mesh, setVisible: (v) => { f.mesh!.visible = v; } });
    }
    return out;
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
