// Renders the simulated monsters as ray-marched voxel figures: one group of
// part meshes per snapshot, all drawn from one bake of the figure and wearing
// one set of materials, walked in place when the monster moves. Reads the
// controller's snapshots each frame, so it holds no model of its own to keep in
// sync; a monster that appears or disappears in the snapshots gets a copy of
// the figure made or destroyed to match. Monsters the local simulation stepped
// this frame are drawn exactly where they are; monsters received from an
// owner's broadcast are dead-reckoned between deliveries (`./reckon`).
import { Group } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import {
  BakedFigure,
  VoxelModelMaterial,
  type Figure,
  type FigureCopy,
} from "@big-mesh-studios/stacker/renderer";
import { loadFigure } from "@big-mesh-studios/stacker/format";
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
/**
 * What the monsters wear before a figure has been loaded: a figure of no parts,
 * which is drawn as an empty group, so a monster is simply not seen until one
 * arrives.
 */
const NOTHING: Figure = { parts: [], palette: [] };

interface MonsterMesh {
  copy: FigureCopy;
  /** The position the copy was drawn at last frame, for the dead-reckoning blend. */
  rendered: Position3;
}

/** A monster that died and is playing its fall: its meshes, pose, and elapsed time. */
interface Corpse {
  copy: FigureCopy;
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
  /** The figure every monster is drawn from: its boxes and volumes, made once. */
  private baked = new BakedFigure(NOTHING);
  private materials: VoxelModelMaterial[] = [];
  /** What a hit monster is drawn with: the same figure, fully flashed. */
  private flashMaterials: VoxelModelMaterial[] = [];
  /** Uniform scale making the figure stand as tall as the AI cube. */
  private scale = 1;
  /** The figure the monsters wear, as one phrase for a debug console. */
  private worn = "no voxel model yet";
  /** Ids currently flashing red, with the local moment the flash ends. */
  private readonly hurtUntil = new Map<string, number>();
  /** Dying monsters still lying out, keyed by id; they survive their snapshots. */
  private readonly corpses = new Map<string, Corpse>();
  private time = 0;

  constructor(params: { getMonsters: () => Iterable<MonsterSnapshot> }) {
    this.getMonsters = params.getMonsters;
  }

  /** Number of monsters currently drawn in the scene. */
  get size(): number {
    return this.meshes.size;
  }

  /**
   * Swaps every monster's look for `figure`: its parts are solved, boxed and
   * given the two sets of materials — the plain one and the flashed one — that
   * every monster shares, and the whole is scaled to stand as tall as the AI
   * cube it replaces.
   *
   * Monsters already drawn are drawn again from the new bake, because the
   * meshes they hold carry the boxes and materials of the figure before it. A
   * corpse is left to finish its fall in what it is already wearing.
   */
  setFigure(figure: Figure): void {
    this.baked = new BakedFigure(figure);
    this.materials = this.baked.createMaterials();
    this.flashMaterials = this.baked.createMaterials();

    for (const material of this.flashMaterials) {
      material.flash = 1;
    }

    const { width, height, depth } = this.baked.extent;
    const parts = figure.parts.length;
    this.worn = `${width}×${height}×${depth} voxel model in ${
      parts === 1 ? "one part" : `${parts} parts`
    }`;
    // A figure of no parts fills nothing and so gives no height to divide by.
    this.scale =
      this.baked.size.height > 0
        ? (HALF_HEIGHT * 2) / this.baked.size.height
        : 1;

    for (const entry of this.meshes.values()) {
      this.group.remove(entry.copy.group);
      entry.copy = this.newCopy();
      const { x, y, z } = entry.rendered;
      entry.copy.group.position.set(x, y, z);
    }
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
    for (const material of [...this.materials, ...this.flashMaterials]) {
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

  /** One line about the model and the monsters drawn from it, for a debug console. */
  describe(): string {
    return `${this.worn} · ${this.meshes.size} mesh(es)`;
  }

  /** Reads a model zip saved from rm-stacker and applies it to every monster. */
  async loadModelFromBlob(blob: Blob): Promise<string> {
    try {
      this.setFigure(await loadFigure(blob));
      return `zombie model set: ${this.worn}`;
    } catch (err) {
      return `not a model rm-stacker saved: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  }

  /**
   * Called once per frame: reconciles the meshes against the controller's
   * snapshots, places each copy at its monster's rendered position (exact for
   * locally-stepped monsters, dead-reckoned for broadcast ones), and bobs the
   * ones that are walking.
   */
  tick(dt: number): void {
    this.time += dt;
    const now = Date.now();
    const current = new Set<string>();
    for (const snapshot of this.getMonsters()) {
      current.add(snapshot.id);
      // A monster that died starts its fall here. The corpse takes its meshes
      // out of the live set and keeps them, so it keeps animating even after
      // the controller forgets the snapshot once the tombstone has been written.
      if (snapshot.hp <= 0) {
        if (!this.corpses.has(snapshot.id)) {
          this.startCorpse(snapshot.id, snapshot);
        }
        continue;
      }
      const entry = this.meshes.get(snapshot.id) ?? this.create(snapshot);
      const { copy, rendered } = entry;
      const { position } = nextRenderedPosition({
        snapshot,
        current: rendered,
        now,
        dt,
      });
      entry.rendered = position;
      copy.group.position.set(position.x, position.y, position.z);
      copy.group.rotation.y = snapshot.pose.yaw;
      // A recently hit monster draws with the flashed materials until its flash
      // lapses; a flash that has lapsed is forgotten rather than re-tested.
      if ((this.hurtUntil.get(snapshot.id) ?? 0) > now) {
        copy.wear(this.flashMaterials);
      } else {
        copy.wear(this.materials);
        this.hurtUntil.delete(snapshot.id);
      }
      const moving =
        (snapshot.state === "wander" || snapshot.state === "chase") &&
        (snapshot.pose.vx !== 0 || snapshot.pose.vz !== 0);
      if (moving) {
        copy.group.position.y +=
          Math.abs(Math.sin(this.time * BOB_RATE)) * BOB_AMPLITUDE;
      }
      copy.group.visible = true;
    }
    this.advanceCorpses(dt);
    for (const id of [...this.meshes.keys()]) {
      if (!current.has(id)) {
        this.remove(id);
      }
    }
  }

  /** Removes every monster's meshes and every corpse's (mesh teardown). */
  clear(): void {
    for (const id of [...this.meshes.keys()]) {
      this.remove(id);
    }
    for (const { copy } of this.corpses.values()) {
      this.group.remove(copy.group);
    }
    this.corpses.clear();
  }

  /**
   * Moves a dying monster's meshes out of the live set and starts its fall: it
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
    entry.copy.wear(this.materials);
    this.corpses.set(id, {
      copy: entry.copy,
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
      corpse.copy.group.position.set(
        corpse.x + HALF_HEIGHT * sinFall * sinYaw,
        corpse.y + HALF_HEIGHT * cosFall,
        corpse.z + HALF_HEIGHT * sinFall * cosYaw,
      );
      corpse.copy.group.rotation.set(fall, corpse.yaw, 0);
      if (corpse.elapsed >= FALL_TIME + LIE_TIME) {
        this.group.remove(corpse.copy.group);
        this.corpses.delete(id);
      }
    }
  }

  /** A copy of the figure, scaled to monster height and added to the scene. */
  private newCopy(): FigureCopy {
    const copy = this.baked.copy(this.materials);
    copy.group.scale.set(this.scale, this.scale, this.scale);
    this.group.add(copy.group);
    return copy;
  }

  private create(snapshot: MonsterSnapshot): MonsterMesh {
    const copy = this.newCopy();
    copy.group.visible = false;
    const entry: MonsterMesh = {
      copy,
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
    this.group.remove(entry.copy.group);
    this.meshes.delete(id);
    this.hurtUntil.delete(id);
  }
}
