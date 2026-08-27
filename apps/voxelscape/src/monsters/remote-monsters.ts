// Renders the simulated monsters as cubes mirroring the player-avatar cubes:
// one mesh per monster snapshot, walked in place when the monster moves. Reads
// the controller's snapshots each frame, so it holds no model of its own to
// keep in sync; a monster that appears or disappears in the snapshots gets a
// mesh made or destroyed to match. Monsters the local simulation stepped this
// frame are drawn exactly where they are; monsters received from an owner's
// broadcast are dead-reckoned between deliveries (`./reckon`).
import { BoxGeometry, Group, Mesh } from "@random-mesh/rmsl/scene";
import { createPlayerSkin } from "../player/player-skin";
import { nextRenderedPosition, type Position3 } from "./reckon";
import type { MonsterSnapshot } from "./monster";

/** Flat green, the zombie's look until a real texture exists. */
const ZOMBIE_COLOR = 0x4a7c2b;
/** Cube half-width and half-depth, matching the avatar cubes. */
const HALF = 1;
/** Cube half-height; a zombie stands a bit taller than a player. */
const HALF_HEIGHT = 1.1;
/** Walk-bob rate, radians per second. */
const BOB_RATE = 9;
/** Walk-bob height, world units above the standing pose. */
const BOB_AMPLITUDE = 0.15;

interface MonsterMesh {
  cube: Mesh;
  /** The position the cube was drawn at last frame, for the dead-reckoning blend. */
  rendered: Position3;
}

export class RemoteMonsters {
  readonly group = new Group();
  private readonly getMonsters: () => Iterable<MonsterSnapshot>;
  private readonly meshes = new Map<string, MonsterMesh>();
  private time = 0;

  constructor(params: { getMonsters: () => Iterable<MonsterSnapshot> }) {
    this.getMonsters = params.getMonsters;
  }

  /** Number of monster meshes currently in the scene. */
  get size(): number {
    return this.meshes.size;
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
      const moving =
        (snapshot.state === "wander" || snapshot.state === "chase") &&
        (snapshot.pose.vx !== 0 || snapshot.pose.vz !== 0);
      if (moving) {
        cube.position.y +=
          Math.abs(Math.sin(this.time * BOB_RATE)) * BOB_AMPLITUDE;
      }
      cube.visible = true;
    }
    for (const id of [...this.meshes.keys()]) {
      if (!current.has(id)) {
        this.remove(id);
      }
    }
  }

  /** Removes every monster mesh (mesh teardown). */
  clear(): void {
    for (const id of [...this.meshes.keys()]) {
      this.remove(id);
    }
  }

  private create(snapshot: MonsterSnapshot): MonsterMesh {
    const cube = new Mesh(
      new BoxGeometry(HALF * 2, HALF_HEIGHT * 2, HALF * 2),
      createPlayerSkin(ZOMBIE_COLOR).material,
    );
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
  }
}
