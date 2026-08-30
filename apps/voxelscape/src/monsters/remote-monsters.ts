// Renders the simulated monsters as ray-marched voxel models: one mesh per
// snapshot, all sharing one `VoxelModelMaterial` and geometry baked from the
// zombie model, walked in place when the monster moves. Reads the controller's
// snapshots each frame, so it holds no model of its own to keep in sync; a
// monster that appears or disappears in the snapshots gets a mesh made or
// destroyed to match. Monsters the local simulation stepped this frame are
// drawn exactly where they are; monsters received from an owner's broadcast
// are dead-reckoned between deliveries (`./reckon`).
import { BoxGeometry, Group, Mesh } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  boxSize,
  bakeVolume,
  solveVoxels,
  VoxelModelMaterial,
  type Model,
} from "@big-mesh-studios/stacker/renderer";
import { load } from "@big-mesh-studios/stacker/format";
import { nextRenderedPosition, type Position3 } from "./reckon";
import type { MonsterSnapshot } from "./monster";

/** Cube half-height; a zombie stands a bit taller than a player. */
const HALF_HEIGHT = 1.1;
/** Walk-bob rate, radians per second. */
const BOB_RATE = 9;
/** Walk-bob height, world units above the standing pose. */
const BOB_AMPLITUDE = 0.15;
/** How long a monster stays flashed red after a hit, in ms. */
const HURT_FLASH_MS = 180;
/** How long a dead monster takes to fall flat, in seconds. */
const FALL_TIME = 0.5;
/** How long the fallen corpse lies before it is removed, in seconds. */
const LIE_TIME = 0.5;
interface MonsterMesh {
  cube: Mesh;
  /** The position the cube was drawn at last frame, for the dead-reckoning blend. */
  rendered: Position3;
}

/** A monster that died and is playing its fall: its mesh, pose, and elapsed time. */
interface Corpse {
  cube: Mesh;
  /** The feet position the corpse pivots on, in world units. */
  x: number;
  y: number;
  z: number;
  /** The heading the corpse fell from, so it falls backward relative to its facing. */
  yaw: number;
  /** Seconds the corpse has animated for, to time the fall against. */
  elapsed: number;
}

export class RemoteMonsters {
  readonly group = new Group();
  private readonly getMonsters: () => Iterable<MonsterSnapshot>;
  private readonly meshes = new Map<string, MonsterMesh>();
  private readonly material = new VoxelModelMaterial();
  /** The material a hit monster is drawn with: the same model, fully flashed. */
  private readonly flashMaterial = new VoxelModelMaterial();
  private geometry: BoxGeometry;
  /** Uniform scale making the model stand as tall as the AI cube. */
  private scale = 1;
  /** What the monsters are drawn as, or null until a model has been loaded. */
  private modelDimensions: Dimensions3D | null = null;
  /** Ids currently flashing red, with the local moment the flash ends. */
  private readonly hurtUntil = new Map<string, number>();
  /** Dying monsters still lying out, keyed by id; they survive their snapshots. */
  private readonly corpses = new Map<string, Corpse>();
  private time = 0;

  constructor(params: { getMonsters: () => Iterable<MonsterSnapshot> }) {
    this.getMonsters = params.getMonsters;
    // No model to draw with yet. The material's empty volume marches to a miss
    // on every ray, so a monster is simply not seen until one is loaded.
    this.geometry = new BoxGeometry(1, 1, 1);
    this.flashMaterial.flash = 1;
  }

  /** Number of monster meshes currently in the scene. */
  get size(): number {
    return this.meshes.size;
  }

  /**
   * Swaps every monster's look for `model`, baking it into the shared material
   * and geometry: the packed volume and palette textures, the normalized
   * dimensions, and the padded box sized to the new grid. Existing meshes take
   * the new geometry and scale.
   */
  setModel(model: Model): void {
    this.bakeInto(this.material, model);
    this.bakeInto(this.flashMaterial, model);

    this.modelDimensions = {
      width: model.dimensions.width,
      height: model.dimensions.height,
      depth: model.dimensions.depth,
    };
    const size = boxSize(model.dimensions);
    this.geometry = new BoxGeometry(size.width, size.height, size.depth);
    // Uniform scale so the model stands as tall as the AI cube it replaces.
    this.scale = (HALF_HEIGHT * 2) / size.height;
    for (const { cube } of this.meshes.values()) {
      cube.geometry = this.geometry;
      cube.scale.set(this.scale, this.scale, this.scale);
    }
  }

  /** Bakes a model's volume, palette, and grid into one material's uniforms. */
  private bakeInto(material: VoxelModelMaterial, model: Model): void {
    bakeVolume(
      material,
      model.dimensions,
      solveVoxels(model.dimensions, model.sides),
      model.palette,
    );
  }

  /**
   * Feeds the day-night lighting into the shared materials, so the self-lit
   * voxels darken at night and tint under weather like the rest of the scene.
   */
  applyLighting(state: DayNightState): void {
    const sunDir: [number, number, number] = [
      state.sunDir[0],
      state.sunDir[1],
      state.sunDir[2],
    ];
    const sunLight: [number, number, number] = [
      state.sunLight[0],
      state.sunLight[1],
      state.sunLight[2],
    ];
    const ambient: [number, number, number] = [
      state.ambient[0],
      state.ambient[1],
      state.ambient[2],
    ];
    for (const material of [this.material, this.flashMaterial]) {
      material.lightDir = sunDir;
      material.lightColour = sunLight;
      material.ambientColour = ambient;
    }
  }

  /**
   * Flashes the monster with `id` red for a moment, so a landed hit reads on
   * the model. A no-op for a monster that is not being drawn.
   */
  flashHit(id: string): void {
    this.hurtUntil.set(id, Date.now() + HURT_FLASH_MS);
  }

  /** One line about the model and the meshes, for a debug console. */
  describe(): string {
    const dimensions = this.modelDimensions;
    const model =
      dimensions === null
        ? "no voxel model yet"
        : `voxel model ${dimensions.width}×${dimensions.height}×${dimensions.depth}`;
    return `${model} · ${this.meshes.size} mesh(es)`;
  }

  /** Reads a model zip saved from rm-stacker and applies it to every monster. */
  async loadModelFromBlob(blob: Blob): Promise<string> {
    try {
      const model = await load(blob);
      this.setModel(model);
      const { width, height, depth } = model.dimensions;
      return `zombie model set: ${width}×${height}×${depth}`;
    } catch (err) {
      return `not a model rm-stacker saved: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /**
   * Called once per frame: reconciles the meshes against the controller's
   * snapshots, places each cube at its monster's rendered position (exact for
   * locally-stepped monsters, dead-reckoned for broadcast ones), and bobs the
   * ones that are walking.
   */
  tick(dt: number): void {
    this.time += dt;
    const now = Date.now();
    const current = new Set<string>();
    for (const snapshot of this.getMonsters()) {
      current.add(snapshot.id);
      // A monster that died starts its fall here. The corpse takes its mesh
      // out of the live set and keeps it, so it keeps animating even after the
      // controller forgets the snapshot once the tombstone has been written.
      if (snapshot.hp <= 0) {
        if (!this.corpses.has(snapshot.id)) {
          this.startCorpse(snapshot.id, snapshot);
        }
        continue;
      }
      const entry = this.meshes.get(snapshot.id) ?? this.create(snapshot);
      const { cube, rendered } = entry;
      const { position } = nextRenderedPosition({
        snapshot,
        current: rendered,
        now,
        dt,
      });
      entry.rendered = position;
      cube.position.set(position.x, position.y, position.z);
      cube.rotation.y = snapshot.pose.yaw;
      // A recently hit monster draws with the flashed material until its flash
      // lapses; a flash that has lapsed is forgotten rather than re-tested.
      if ((this.hurtUntil.get(snapshot.id) ?? 0) > now) {
        cube.material = this.flashMaterial;
      } else {
        cube.material = this.material;
        this.hurtUntil.delete(snapshot.id);
      }
      const moving =
        (snapshot.state === "wander" || snapshot.state === "chase") &&
        (snapshot.pose.vx !== 0 || snapshot.pose.vz !== 0);
      if (moving) {
        cube.position.y +=
          Math.abs(Math.sin(this.time * BOB_RATE)) * BOB_AMPLITUDE;
      }
      cube.visible = true;
    }
    this.advanceCorpses(dt);
    for (const id of [...this.meshes.keys()]) {
      if (!current.has(id)) {
        this.remove(id);
      }
    }
  }

  /** Removes every monster mesh and corpse (mesh teardown). */
  clear(): void {
    for (const id of [...this.meshes.keys()]) {
      this.remove(id);
    }
    for (const { cube } of this.corpses.values()) {
      this.group.remove(cube);
    }
    this.corpses.clear();
  }

  /**
   * Moves a dying monster's mesh out of the live set and starts its fall: it
   * rotates backward (about its own left-right axis) about its feet over
   * `FALL_TIME`, lies still for `LIE_TIME`, then is removed.
   */
  private startCorpse(id: string, snapshot: MonsterSnapshot): void {
    const entry = this.meshes.get(id);
    if (entry === undefined) {
      return;
    }
    this.meshes.delete(id);
    this.hurtUntil.delete(id);
    entry.cube.material = this.material;
    this.corpses.set(id, {
      cube: entry.cube,
      x: snapshot.pose.x,
      y: snapshot.pose.y - HALF_HEIGHT,
      z: snapshot.pose.z,
      yaw: snapshot.pose.yaw,
      elapsed: 0,
    });
  }

  /** Advances every corpse by `dt`, removing the ones that have lain out. */
  private advanceCorpses(dt: number): void {
    for (const [id, corpse] of this.corpses) {
      corpse.elapsed += dt;
      // The rotation about the monster's own x-axis (its left-right, before
      // the yaw in the XYZ Euler order) tips it backward; the centre follows
      // the arc about the planted feet so the body pivots down to the ground.
      const fallProgress = Math.min(1, corpse.elapsed / FALL_TIME);
      const fall = (-Math.PI / 2) * fallProgress;
      const sinFall = Math.sin(fall);
      const cosFall = Math.cos(fall);
      const sinYaw = Math.sin(corpse.yaw);
      const cosYaw = Math.cos(corpse.yaw);
      corpse.cube.position.set(
        corpse.x + HALF_HEIGHT * sinFall * sinYaw,
        corpse.y + HALF_HEIGHT * cosFall,
        corpse.z + HALF_HEIGHT * sinFall * cosYaw,
      );
      corpse.cube.rotation.set(fall, corpse.yaw, 0);
      if (corpse.elapsed >= FALL_TIME + LIE_TIME) {
        this.group.remove(corpse.cube);
        this.corpses.delete(id);
      }
    }
  }

  private create(snapshot: MonsterSnapshot): MonsterMesh {
    const cube = new Mesh(this.geometry, this.material);
    cube.scale.set(this.scale, this.scale, this.scale);
    cube.visible = false;
    this.group.add(cube);
    const entry: MonsterMesh = {
      cube,
      rendered: { x: snapshot.pose.x, y: snapshot.pose.y, z: snapshot.pose.z },
    };
    this.meshes.set(snapshot.id, entry);
    return entry;
  }

  private remove(id: string): void {
    const entry = this.meshes.get(id);
    if (entry === undefined) {
      return;
    }
    this.group.remove(entry.cube);
    this.meshes.delete(id);
    this.hurtUntil.delete(id);
  }
}
