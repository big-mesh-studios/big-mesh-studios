/**
 * A running session: a model, a chunk window, a pool of meshing workers, and the store
 * that holds what comes back.
 *
 * This is where the phases meet. Phases 1 to 4 each built a piece that is testable on its
 * own and useless alone; nothing here is new logic, only the wiring — and the wiring is
 * where the interesting failures live, because each piece enforces its own invariant and
 * the seam between two correct pieces is not automatically correct.
 *
 * Three of those seams carry a decision worth stating up front.
 *
 * **A mesh reply is applied at the revision recorded when it was requested, not at the
 * slot's current revision.** The slot that asked is looked up from a record made at
 * request time, not from the window's present answer. Between the two, the window may
 * have scrolled and given that slot to a different cell — and applying the mesh anyway
 * would draw one chunk's surface at another's coordinates. The store refuses it; this is
 * what it refuses.
 *
 * **A cell leaving the window is abandoned in the pool, not merely dropped.** The pool
 * queues by cell and the window forgets by slot, so without this the queue fills with work
 * for cells nobody is waiting for, and the pool's cancellation line never advances.
 *
 * **The model is sent on change, not per chunk.** Every worker builds its own field, so
 * every worker needs the operations. Sending them per chunk would re-serialise the model
 * once per chunk; sending on change makes it once per edit.
 */

import type { Vec3 } from "@big-mesh-studios/core";
import { makeOperation, serialiseOperations } from "@big-mesh-studios/csg";
import type { BaseFieldSpec, Operation } from "@big-mesh-studios/csg";
import type { Material, Scene } from "@random-mesh/rmsl/scene";

import {
  type CellCoord,
  type LodBands,
  type MeshResolution,
  ChunkWindow,
  DEFAULT_MESH_RESOLUTION,
  cellDistance,
  chunkCellOf,
  sameCell,
  sameMeshResolution,
} from "./world";
import {
  type MeshedChunk,
  type ModelMessage,
  type PoolWorker,
  type Wanted,
  WorldWorkerPool,
} from "./mesh";
import { ChunkMeshStore, hooksFor } from "./render";
import type { Bounds } from "./edit/document";

/**
 * The streaming window's radius, in chunks, when the caller does not ask for one.
 *
 * **Four is not a preference: it is the fog's far distance.** `src/render/fog.ts` closes
 * at `4 * BLOCK_WORLD` because that is where the terrain stops, and this is where the
 * terrain stops. So the two are named here and in there and `fog.test.ts` holds them
 * together — a window that grew without the fog following it would still be *correct*
 * (an exponential never stops) and would still show a seam at its edge, which is the
 * failure mode that costs a day to find from a screenshot.
 */
export const DEFAULT_WINDOW_RADIUS = 4;

/**
 * The game's window: wider and much flatter than the editor's.
 *
 * A walking player wants ground ahead and a little above, not a ball of sky, and wants
 * further than an orbit camera does because the horizon is most of what a first-person
 * frame is. Five chunks is 1600 units against the editor's 1280, which the fog has to
 * cover — so `fog.test.ts` asserts against this and not only against `FOG_FAR`.
 */
export const GAME_WINDOW = { radius: 5, yRadius: 2 } as const;

/** What a mesh request is remembered as, so its answer can be applied where it belongs. */
interface Outstanding {
  readonly slot: number;
  readonly revision: number;
  readonly wanted: Wanted;
}

export interface SessionOptions {
  readonly scene: Scene;
  readonly material: Material;
  readonly operations: readonly Operation[];
  /**
   * The landscape behind those operations, if the world has one.
   *
   * Four numbers rather than something opaque, because the main thread and every worker
   * build their field from them independently and have to arrive at the same one. That is
   * the agreement ADR 0009 is about, and a base field that could only be built on one side
   * of the thread boundary could not be checked at all.
   */
  readonly baseField?: BaseFieldSpec;
  /** Chunk radius in x and z. Defaults to `DEFAULT_WINDOW_RADIUS`. */
  readonly radius?: number;
  /** Chunk radius in y, normally smaller — see `sphereCells`. */
  readonly yRadius?: number;
  readonly bands?: LodBands;
  /**
   * The sample grid the place asked for, or absent for the engine's default.
   *
   * **Per session rather than per chunk**, because a place is the thing that knows how thin
   * its walls are and the whole window should agree about the grid it is measuring them on.
   * A place opened later can change it with {@link setMeshSettings}.
   */
  readonly mesh?: MeshResolution;
  /** How many meshing workers to run. Defaults to one per hardware thread, capped. */
  readonly workers?: number;
  /**
   * The material the sea is drawn with, or `undefined` for a world with no sea.
   *
   * **Absent rather than an empty material because a world with no sea has no sea
   * chunks**, and meshing water for an editor that has none would be a whole second pass
   * over every chunk's samples to produce geometry nothing draws. The store's two groups
   * come from this too, so it is also the answer to "does this world draw translucent
   * surfaces at all".
   */
  readonly seaMaterial?: Material;
  /**
   * How to make a meshing worker.
   *
   * Injectable because this class is where the phases meet, and a seam between two
   * correct pieces is not automatically correct: the wiring is the most bug-prone code
   * in the project and there is no way to test any of it without standing up real workers,
   * which is exactly what cannot be done in a test run. The default is the real thing.
   */
  readonly createWorker?: () => PoolWorker;
}

export interface SessionStats {
  readonly chunks: number;
  readonly filled: number;
  readonly drawn: number;
  readonly triangles: number;
  /**
   * Chunks asked for and not yet answered, whether they are being meshed or queued.
   *
   * Named `pending` rather than `outstanding` because the pool already uses
   * `outstanding` for the narrower question — chunks queued rather than in flight — and two
   * statistics with one name and different meanings is a readout nobody can trust.
   */
  readonly pending: number;
  /** Workers currently meshing something. */
  readonly busy: number;
  /**
   * Chunks the pool has been asked for and has not yet handed to a worker.
   *
   * The third number needed to tell a slow window from a stuck one. `pending` alone
   * cannot: a chunk that is pending because a worker is building it and a chunk that is
   * pending because it is sitting in the queue look identical, and only the second is
   * evidence of a stall. A healthy window drains this towards zero; a starved one holds
   * it high with `busy` at zero.
   */
  readonly queued: number;
  readonly staleRefusals: number;
  readonly failures: number;
  /**
   * Triangles of sea surface on the GPU, kept apart from `triangles`.
   *
   * **Its own number because "the world is nearly all water" and "the world is nearly all
   * ground" are the same total.** A readout that added them together could not tell a
   * coast from a mountain range, and the sea is the one whose mesh is new enough to be
   * worth watching while it streams.
   */
  readonly waterTriangles: number;
  /** Slots holding a drawable sea surface. */
  readonly waterFilled: number;
}

export class Session {
  readonly window: ChunkWindow;
  readonly store: ChunkMeshStore;
  readonly pool: WorldWorkerPool;

  /** What is outstanding, keyed by cell — never by slot, which is recycled. */
  private readonly inFlight = new Map<string, Outstanding>();

  /** Bumped on every model change, so a worker can discard a model it has passed. */
  private revision = 1;

  /**
   * The operations the workers are meshing.
   *
   * Public because the picker needs its own field built from exactly these, and a second
   * copy of the model kept alongside would be free to drift — which is the one disagreement
   * this design exists to rule out.
   */
  private currentOperations: readonly Operation[] = [];
  /**
   * The landscape, if the world has one. Held as the four numbers the workers build from,
   * for the same reason the operations are held as a list: the picker builds its own field
   * and the two must not be able to drift.
   *
   * **Assigned rather than readonly**, because a world's shape is a thing a person can change
   * while it is running — see {@link setBaseField}. It was readonly for as long as there was
   * one world, which is the ordinary reason a field ends up immutable and the wrong one here.
   */
  private baseFieldSpec: BaseFieldSpec | undefined;
  /**
   * The sample grid this session's meshers build.
   *
   * **Assigned rather than readonly**, for the same reason `baseFieldSpec` is: a place can
   * arrive while the session is running and name a grid its walls need. The default is the
   * landscape's own, so a session with no place behaves exactly as it did.
   */
  private meshSettings: MeshResolution;
  private failures = 0;
  private disposed = false;

  /**
   * Whether the window exists yet.
   *
   * The window places its initial cells inside its own constructor and fires
   * `onSlotsWanted` while doing so — before this constructor has assigned `this.window`.
   * A flag rather than a null check on the window itself, because the window is not
   * genuinely optional; there is a brief moment during construction when it exists and is
   * not yet reachable, and saying so plainly beats a type that invites a reader to supply
   * a fallback.
   */
  private windowReady = false;

  constructor(options: SessionOptions) {
    this.baseFieldSpec = options.baseField;
    this.meshSettings = options.mesh ?? DEFAULT_MESH_RESOLUTION;
    this.store = new ChunkMeshStore(
      options.scene,
      options.material,
      // Sized from the window's own count below, once the window exists. The store is
      // resized by the window's `onSlotCountChanged`, so the number here is only a
      // starting point.
      1,
      // **Straight through, `undefined` and all.** The store's parameter is optional for the
      // same reason this one is, so forwarding the value as it stands is the whole of it — and a
      // conditional spread here would be a second spelling of "no sea" that could disagree.
      options.seaMaterial,
    );

    const hooks = hooksFor(this.store);

    this.window = new ChunkWindow({
      radius: options.radius ?? DEFAULT_WINDOW_RADIUS,
      ...(options.yRadius !== undefined ? { yRadius: options.yRadius } : {}),
      ...(options.bands !== undefined ? { bands: options.bands } : {}),
      ...hooks,
      onSlotsWanted: (slots) => this.onSlotsWanted(slots),
      onSlotRelease: (slot) => {
        hooks.onSlotRelease(slot);
        this.forgetSlot(slot);
      },
      onSlotReposition: (slot) => {
        hooks.onSlotReposition(slot);
        this.forgetSlot(slot);
      },
      // The store keeps the slot's mesh here — the cell has not moved, only the resolution
      // it is wanted at — but the request that would fill it at the *old* resolution is
      // still superseded, so it is forgotten exactly as a release would forget it.
      onSlotRefill: (slot) => {
        hooks.onSlotRefill(slot);
        this.forgetSlot(slot);
      },
    });

    this.pool = new WorldWorkerPool({
      workers: options.workers ?? defaultWorkerCount(),
      create: options.createWorker ?? createMeshingWorker,
      handlers: {
        onMesh: (meshed, wanted) => this.onMesh(meshed, wanted),
        onEmpty: (wanted) => this.onEmpty(wanted),
        onFailed: (wanted, reason) => this.onFailed(wanted, reason),
      },
    });

    // The window's own constructor placement fired `onSlotsWanted` before there was a
    // window to read. Those requests are made explicitly here instead, which is both later
    // and clearer than relying on a callback that fires inside another object's
    // constructor.
    this.windowReady = true;

    // Resizing fixes the store's size, and — because a resize invalidates every slot —
    // leaves the store ready for the requests that follow.
    this.store.resize(this.window.capacity);
    this.setOperations(options.operations);
  }

  /** The operations currently being streamed. */
  get operations(): readonly Operation[] {
    return this.currentOperations;
  }

  /**
   * The landscape this session streams, or undefined for an operations-only world.
   *
   * Public because the picker has to build the same field and cannot ask a worker what it
   * built (ADR 0009). It is the same numbers the workers read, from the same union, so the two
   * cannot drift — and it is a *union* now, so a world can be a height field or a planet without
   * a second option and a second getter.
   */
  get baseField(): BaseFieldSpec | undefined {
    return this.baseFieldSpec;
  }

  /** The sample grid this session's meshers are building. */
  get mesh(): MeshResolution {
    return this.meshSettings;
  }

  /**
   * Rewrites every chunk at a different sample grid.
   *
   * **The geometry is dropped rather than marked out of date.** `markOutOfDate` is sound while
   * the cell has not moved because the old mesh is still a surface of that cell; at a new
   * sample spacing it is a surface of a different grid, so keeping it drawn until its
   * replacement lands would show two different tessellations of one wall at once. So this is
   * `invalidateAll` and then a model send, which cancels anything in flight and asks for the
   * whole window at the new resolution.
   *
   * **A no-op when the grid is unchanged**, because callers load a place on every restart and
   * re-meshing a window for a setting that did not move would be a visible stall on a
   * "play again".
   */
  setMeshSettings(mesh: MeshResolution): void {
    if (sameMeshResolution(this.meshSettings, mesh)) return;
    this.meshSettings = mesh;
    if (this.disposed) return;
    this.invalidateAll();
    this.setOperations(this.currentOperations);
  }

  /**
   * Puts a different landscape under this world, and re-asks for everything.
   *
   * **The two halves are in this order and both are required.** {@link invalidateAll} runs
   * first, because it is what makes every resident chunk *wrong*: a shape change does not move
   * the player or change the cell, so `markOutOfDate` — which keeps the buffers on the grounds
   * that the cell has not changed — is exactly the wrong call, and the old sphere's geometry
   * would keep drawing a planet at a place a player can stand on it. Then the model is re-sent,
   * which is what cancels everything in flight, and `requestAll` asks for the window again.
   *
   * **The operations are not touched**, deliberately. A place's geometry is in world
   * coordinates and means the same thing on either surface, so switching shape moves the ground
   * out from under a bridge rather than moving the bridge — which is the visible, explicable
   * result, rather than a place silently losing everything it built.
   */
  setBaseField(spec: BaseFieldSpec): void {
    this.baseFieldSpec = spec;
    this.invalidateAll();
    this.setOperations(this.currentOperations);
  }

  /**
   * Rebuilds the streaming window at a different shape, around the cell it is already on.
   *
   * **The window owns the rebuild and this only asks for it.** `ChunkWindow.reshape` releases
   * every slot, tells the store its new size and places the new cells, and placing them asks for
   * their work — so there is no second `requestAll` here, which would ask for every chunk twice.
   * The level editor uses this to widen the window vertically while it is open and to put the
   * game's own shape back on close; `/window:` uses it to try a different shape at runtime.
   *
   * The bands are carried over, because this changes how *far* the window reaches and not how
   * coarsely it draws what it holds — a caller that wanted both would say so.
   *
   * @returns how many chunks the window now holds; zero once disposed.
   */
  reshapeWindow(radius: number, yRadius: number): number {
    if (this.disposed) return 0;
    return this.window.reshape(radius, yRadius, this.window.bands);
  }

  /**
   * Marks every chunk this session is holding as needing to be meshed again.
   *
   * **`markStale` and not `markOutOfDate`, and the difference is the whole method.** ADR 0007's
   * rule is that `markOutOfDate` is sound while the cell has not moved, because everything on
   * the GPU for that slot is a surface of the cell the slot still stands for — how wrong it is
   * does not matter. A shape change breaks that: the geometry in the slot was built from a field
   * that no longer exists, so it is not a wrong *version* of the right surface, it is another
   * surface entirely, and it has to leave rather than linger until its replacement lands.
   *
   * **It only marks; it does not request.** Re-asking is `requestAll`'s job, and
   * `requestAll` asks for every *unfilled* slot — so after this runs, the whole window is
   * unfilled and one call to it covers everything. Calling `requestSlot` from here as well would
   * ask for every chunk twice.
   *
   * @returns how many chunks were holding geometry.
   */
  invalidateAll(): number {
    let invalidated = 0;
    for (let slot = 0; slot < this.window.slots.length; slot++) {
      const entry = this.window.slots[slot];
      if (entry === undefined || !entry.filled) continue;
      // The store first, because the window's own `markStale` fires `onSlotStale`, which is the
      // store's `markOutOfDate`, and a freed buffer has to be freed before anything that could
      // still read it.
      this.store.markStale(slot);
      this.window.markStale(slot);
      this.forgetSlot(slot);
      invalidated++;
    }
    return invalidated;
  }

  /**
   * Points the sea at a different material, for a world whose shape has changed.
   *
   * **Not enough on its own.** A material's shape is read while its shader graph is built, so
   * the new material only affects chunks meshed *after* this — which is every chunk, because a
   * caller changing the shape has invalidated them all.
   */
  setSeaMaterial(material: Material): void {
    this.store.setSeaMaterial(material);
  }

  /** The model, as the workers need it. */
  modelMessage(): ModelMessage {
    return {
      kind: "setModel",
      revision: this.revision,
      operations: serialiseOperations(this.currentOperations),
      paint: [],
      // **One value, not a kind beside parameters.** The union carries its own parameters, so a
      // message cannot name a planet and arrive holding a landscape's four numbers.
      base: this.baseFieldSpec,
      mesh: this.meshSettings,
    };
  }

  /**
   * Replaces the model, tells every worker, and re-requests what the change left undone.
   *
   * The re-request is the part that is easy to miss and matters most here. Sending a model
   * cancels everything in flight, so a sculpt — which changes the model on every dab —
   * would silently strand every chunk that happened to be mid-mesh at that instant. They
   * would stay blank until something unrelated scrolled the window, which looks like a
   * mesher that hangs.
   *
   * Chunks that are already filled are left alone: their geometry is still valid, because
   * `touched` is what says which chunks the change actually altered.
   */
  setOperations(operations: readonly Operation[], touched?: Bounds): void {
    this.currentOperations = operations;
    this.revision++;
    // `modelMessage()` rather than a second construction of the same thing, because a model
    // message that named terrain in one place and not the other would leave the workers
    // meshing an operations-only world while the header said otherwise — and the only
    // symptom would be a landscape that never appears.
    this.pool.setModel(this.modelMessage());

    // In-flight meshes were built against the old model, so they are not wanted whatever
    // their generations say. Dropping the record is enough: the store's revision has not
    // moved, so a late answer would find a record that is gone.
    this.inFlight.clear();

    this.requestAll();

    if (touched !== undefined) this.invalidateBox(touched);
  }

  /**
   * Whether every worker is free and nothing is outstanding.
   *
   * The question an edit that re-sends the model has to ask *first*, because sending
   * cancels every mesh in flight. A send per frame does not merely cost a frame: it cancels
   * the very mesh that would have shown the edit, over and over, so the chunk under the
   * brush never lands. The symptom is not a stutter — it is an edit that appears to do
   * nothing until the pointer stops moving, and chunks whose geometry goes missing and
   * comes back.
   *
   * Deliberately coarse: it asks about the whole pool rather than only the chunks this edit
   * touches, because a send throws away *everything* outstanding and not just its own, so
   * a finer question would still let each send cancel the world's streaming. Waiting on the
   * mesher's real throughput is also what sets the update rate, and that is what makes a
   * live preview affordable rather than merely possible.
   */
  get idle(): boolean {
    return this.inFlight.size === 0 && this.pool.busy === 0;
  }

  /**
   * Invalidates every resident chunk a world-space box touches, and re-requests them.
   *
   * Derived from the edit's own bounds rather than from a list of chunks the brush
   * happened to visit, because a stroke's operations know their extents and a caller
   * tracking them separately is a second thing to get wrong in the one place where being
   * wrong is invisible — the edit appears, but only partly.
   */
  invalidateBox(bounds: Bounds): number {
    let invalidated = 0;
    for (const cell of cellsInBox(bounds)) {
      // `claimedSlotOf` and not `slotOf`: a query refuses an unfilled chunk, but a chunk
      // whose mesh has not arrived is exactly the one an edit most needs to invalidate,
      // because it is the one most likely to have an answer in flight.
      const slot = this.window.claimedSlotOf(cell);
      if (slot === undefined) continue;
      // `markOutOfDate` and not `markStale`: this is the same cell with a different
      // model, so its current mesh is still the right thing to draw until the replacement
      // lands. Dropping it here would open a hole in the model for as long as the mesher
      // takes, once per edit.
      this.store.markOutOfDate(slot);
      this.window.markStale(slot);
      this.forgetSlot(slot);
      // Urgent, and this is the only place that says so. `setOperations` has just run
      // `requestAll`, which put every unfilled slot back on the queue near-to-far — so
      // without this the chunk under the brush is meshed last, behind every chunk of
      // scrolling backlog, and the edit's latency is the pool's whole backlog rather than
      // the one chunk the player is looking at.
      this.requestSlot(slot, true);
      invalidated++;
    }
    return invalidated;
  }

  /** Moves the window to follow a world position, and asks for whatever is now missing. */
  follow(world: Vec3): void {
    if (this.disposed) return;
    if (!this.window.scrollTo(world)) return;

    // **Ask for everything unfilled, not only what the window flagged.**
    //
    // The window reports the cells that *arrived* and the ones whose level of detail
    // changed, which is what makes a pan cost a ring rather than a window. It cannot
    // report a chunk that was asked for earlier, never answered, and is still sitting in
    // the window — because from the window's side nothing distinguishes that chunk from
    // one that was never requested at all.
    //
    // That gap is why this used to be done only by sending a model. `requestAll` asks for
    // every unfilled slot, so a sculpt was the only thing that recovered a window with a
    // hole in it, and "pan fast, then sculpt, and it all appears" was the observable
    // behaviour. A window that cannot ask for its own missing chunks is relying on an
    // unrelated event to do it, which is not a recovery path.
    //
    // A scan of the window's slots on a scroll, where a scroll is a discrete movement of
    // the focus cell rather than a per-frame event: `scrollTo` returns false — and so
    // costs nothing — for every frame in which the focus cell has not changed.
    //
    // **Nearest first, and urgent, and both because this scan is the hole.** Every unfilled
    // slot on a scroll is a chunk the player can see is missing: an arrived cell whose slot
    // was standing for somewhere else has no geometry at all. Filling them in slot order
    // fills whichever corner of the window the pool happens to reach first, which is not
    // the corner anyone is looking at, and filling them at the back of the queue fills them
    // after work for chunks behind the camera. The measure is the same one
    // `ChunkWindow.scrollTo` sorts its own arrivals by, so the two agree about what
    // "nearest" means — one distance for the window's ordering and another for the pool's
    // would be two answers to one question.
    const unfilled: number[] = [];
    for (let slot = 0; slot < this.window.slots.length; slot++) {
      const entry = this.window.slots[slot];
      if (entry !== undefined && !entry.filled) unfilled.push(slot);
    }
    const distanceFrom = (entry: { centre: Vec3 }): number =>
      Math.hypot(
        entry.centre.x - world.x,
        entry.centre.y - world.y,
        entry.centre.z - world.z,
      );
    unfilled.sort(
      (a, b) =>
        distanceFrom(this.window.slots[a]!) -
        distanceFrom(this.window.slots[b]!),
    );
    for (const slot of unfilled) this.requestSlot(slot, true);
  }

  /** Reports what is on screen. */
  stats(): SessionStats {
    return {
      chunks: this.window.capacity,
      filled: this.window.slots.reduce(
        (count, slot) => count + (slot.filled ? 1 : 0),
        0,
      ),
      drawn: this.store.drawnCount,
      triangles: this.store.triangleCount,
      pending: this.inFlight.size,
      busy: this.pool.busy,
      queued: this.pool.outstanding,
      staleRefusals: this.store.staleRefusals,
      failures: this.failures,
      waterTriangles: this.store.seaTriangles,
      waterFilled: this.store.seaDrawnCount,
    };
  }

  /** Stops the workers and frees every buffer. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.inFlight.clear();
    this.pool.dispose();
    this.store.dispose();
  }

  // ---- the window's wants

  /**
   * Asks the pool for the slots the window says it needs, nearest first.
   *
   * A slot that is already `filled` is skipped, which is what stops the window re-requesting
   * every chunk every frame: the window asks for anything invalidated, not for anything
   * absent.
   *
   * **Urgent, because these are the chunks that are missing.** The window asks for two
   * kinds: a cell that has arrived, whose geometry was dropped because the slot now stands
   * for a different cell, and a cell whose level of detail moved, whose geometry is the
   * right cell at the wrong resolution. The first is a hole in the world and the second is
   * a seam along the horizon, and both are open for as long as the mesher takes — which on
   * a slow machine is long enough to read as a bug rather than as streaming.
   *
   * The window sorts them nearest-first (`ChunkWindow.scrollTo`) and the pool keeps an
   * urgent batch in the order it was given, so the chunk under the pointer is still the
   * first one asked for. It matters that this is a batch rather than one urgent request per
   * cell: unshifting each in turn would reverse that ordering and mesh the farthest chunk
   * the player just walked into first.
   */
  private onSlotsWanted(slots: readonly number[]): void {
    if (!this.windowReady) return;
    for (const slot of slots) {
      const entry = this.window.slots[slot];
      if (entry === undefined || entry.filled) continue;
      this.requestSlot(slot, true);
    }
  }

  /**
   * Asks for every unfilled slot, nearest first.
   *
   * Sorted here rather than left to the window because the window does not sort: its
   * `sphereCells` documents that callers order by distance, and `scrollTo` does — but the
   * initial placement does not, since it happens inside its own constructor before anything
   * can ask for a particular order. Left unsorted, startup meshes the far corners of the
   * window while the chunk the player is standing in waits its turn.
   */
  private requestAll(): void {
    const focus = this.window.focusCell;
    const order = this.window.slots
      .map((_, slot) => slot)
      .sort((a, b) => {
        const here = this.window.slots[a];
        const there = this.window.slots[b];
        return cellDistance(here.cell, focus) - cellDistance(there.cell, focus);
      });
    for (const slot of order) {
      const entry = this.window.slots[slot];
      // Filled slots are left alone, which is what stops a model change re-mesh chunks
      // whose geometry is still perfectly good. Every chunk is *unfilled* after one, since
      // sending a model cancels the work in flight — so this asks for the whole window
      // again, not just the edit's.
      if (entry !== undefined && !entry.filled) this.requestSlot(slot);
    }
  }

  /**
   * Requests one slot's mesh, recording where the answer belongs.
   *
   * The record is keyed by cell and holds the slot and the revision captured *now*.
   * Looking the slot up again when the answer arrives would find whichever cell holds
   * that slot number by then, which after a scroll is a different cell entirely.
   *
   * `urgent` is the difference between an edit appearing and an edit waiting. It is set by
   * `invalidateBox` alone, because that is the only caller whose chunk a player is
   * watching change, and it costs nothing when the queue is empty.
   */
  private requestSlot(slot: number, urgent = false): void {
    const entry = this.window.slots[slot];
    if (entry === undefined) return;

    const cell = entry.cell;
    const key = this.key(cell);

    // Re-requesting supersedes: the pool drops the queued one, and the record is
    // replaced rather than kept, so a reply to the older request finds nothing.
    const existing = this.inFlight.get(key);
    if (existing !== undefined) this.inFlight.delete(key);

    const revision = this.store.revisionOf(slot);
    // The overlap mask comes from the window, which chose the level from the same
    // `lodAt`; passing it here is what keeps the mask and the level from being decided
    // twice.
    const wanted = this.pool.request(
      cell,
      entry.targetLod,
      entry.targetOverlap,
      urgent,
    );
    this.inFlight.set(key, { slot, revision, wanted });
  }

  // ---- the pool's answers

  /**
   * Applies a chunk's surfaces — a ground, a sea, both or neither.
   *
   * **One request, one slot, one filled mark, whatever came back.** The two surfaces are
   * meshed together in one worker pass and arrive in one message, so there is no second
   * answer to wait for and no state in which a slot is filled with ground and still owed
   * water. That is what keeps the window's single `filled` flag honest, and it is why the
   * sea rides the existing slot rather than needing a window of its own.
   */
  private onMesh(meshed: MeshedChunk, wanted: Wanted): void {
    this.settle(wanted, (request) => {
      const outcome = this.store.apply(request.slot, meshed, request.revision);
      if (!outcome.accepted) return;
      this.window.markFilled(request.slot);
    });
  }

  private onEmpty(wanted: Wanted): void {
    // An air chunk is an answer, not a failure, and the slot must be marked filled so the
    // window stops asking and the picker stops being refused.
    this.settle(wanted, (request) => {
      this.store.apply(request.slot, {}, request.revision);
      this.window.markFilled(request.slot);
    });
  }

  private onFailed(wanted: Wanted, reason: string): void {
    this.failures++;
    console.warn(
      `chunk ${this.key(wanted.cell)} could not be meshed: ${reason}`,
    );
    // Deliberately leaves the slot unfilled, so it stays answerable-as-no and the window
    // will ask again. Marking it filled with nothing on the GPU would be a lie that the
    // window believes.
    this.settle(wanted, () => {});
  }

  /**
   * Applies an answer to the request it belongs to, and forgets it.
   *
   * The pool has already checked the generation (ADR 0008); this checks that the cell is
   * still the one being waited on, and hands the recorded slot and revision to the store,
   * which is where an overtaken answer is refused.
   */
  private settle(wanted: Wanted, apply: (request: Outstanding) => void): void {
    const key = this.key(wanted.cell);
    const request = this.inFlight.get(key);
    this.inFlight.delete(key);
    if (request === undefined) return;
    if (request.wanted.generation !== wanted.generation) return;
    if (!sameCell(request.wanted.cell, wanted.cell)) return;
    apply(request);
  }

  /** Drops a slot's outstanding request, and abandons its cell in the pool. */
  private forgetSlot(slot: number): void {
    if (!this.windowReady) return;
    const entry = this.window.slots[slot];
    if (entry === undefined) return;
    const key = this.key(entry.cell);
    if (this.inFlight.delete(key)) this.pool.abandon(entry.cell);
  }

  private key(cell: CellCoord): string {
    return `${cell.x},${cell.y},${cell.z}`;
  }
}

/**
 * A meshing worker, as a module worker.
 *
 * The `new URL(..., import.meta.url)` form is what the bundler recognises to emit the
 * worker as its own chunk with its own dependencies, rather than inlining it into the
 * main bundle where it would pull the CSG and the mesher into the page.
 */
const createMeshingWorker = (): PoolWorker => {
  const worker = new Worker(new URL("./mesh/mesh-worker.ts", import.meta.url), {
    type: "module",
    name: "spacescape-mesh",
  });
  // Adapted rather than passed straight in, because `Worker`'s own overloads are wider
  // than what the pool uses — and a `PoolWorker` that named `Worker` directly could not
  // be stood in for by a fake, which is the only reason it is an interface.
  return {
    post: (message) => worker.postMessage(message),
    addEventListener: (type, listener) =>
      worker.addEventListener(type, (event) =>
        listener({ data: (event as MessageEvent).data }),
      ),
    terminate: () => worker.terminate(),
  };
};

/**
 * One worker per hardware thread, capped.
 *
 * Capped because each worker holds a whole copy of the operation list and a set of scratch
 * buffers sized for a whole chunk, and because meshing is CPU-bound: a fifth worker on four
 * cores costs context switches and memory and buys nothing.
 */
const defaultWorkerCount = (): number => {
  const cores =
    typeof navigator === "undefined"
      ? 4
      : Math.max(1, navigator.hardwareConcurrency || 4);
  return Math.max(1, Math.min(4, cores - 1));
};

/** A model to look at: a few primitives spread over enough chunks to stream. */
export const starterOperations = (): Operation[] => [
  makeOperation(
    0,
    { x: 0, y: 0, z: 0 },
    { type: "Ellipsoid", radius: { x: 90, y: 90, z: 90 } },
    "Add",
    { colour: { r: 214, g: 150, b: 96 } },
  ),
  makeOperation(
    1,
    { x: 220, y: -40, z: 60 },
    { type: "Box", len: { x: 120, y: 70, z: 120 } },
    "Add",
    { colour: { r: 150, g: 180, b: 214 } },
  ),
  makeOperation(
    2,
    { x: -200, y: 30, z: -80 },
    { type: "Capsule", len: 260, radius: 46 },
    "Add",
    { colour: { r: 200, g: 120, b: 130 } },
  ),
  makeOperation(
    3,
    { x: 80, y: 120, z: -220 },
    { type: "Ellipsoid", radius: { x: 70, y: 110, z: 70 } },
    "Subtract",
    { colour: { r: 120, g: 200, b: 170 } },
  ),
];

/** Every chunk cell a world-space box overlaps. */
const cellsInBox = (bounds: Bounds): CellCoord[] => {
  const min = chunkCellOf(bounds.min);
  const max = chunkCellOf({
    // The far corner is exclusive: a box ending exactly on a chunk boundary does not reach
    // into the next chunk, and including it would invalidate a chunk the edit did not
    // touch — which costs a re-mesh of something that did not change.
    x: bounds.max.x - 1e-6,
    y: bounds.max.y - 1e-6,
    z: bounds.max.z - 1e-6,
  });

  const cells: CellCoord[] = [];
  for (let x = Math.min(min.x, max.x); x <= Math.max(min.x, max.x); x++) {
    for (let y = Math.min(min.y, max.y); y <= Math.max(min.y, max.y); y++) {
      for (let z = Math.min(min.z, max.z); z <= Math.max(min.z, max.z); z++) {
        cells.push({ x, y, z });
      }
    }
  }
  return cells;
};
