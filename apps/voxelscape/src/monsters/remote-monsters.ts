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
import { Dimensions3D, type RGBA } from "@big-mesh-studios/maths";
import {
  boxSize,
  encodePalette,
  solveVoxels,
  VoxelModelMaterial,
  type Sides,
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
interface MonsterMesh {
  cube: Mesh;
  /** The position the cube was drawn at last frame, for the dead-reckoning blend. */
  rendered: Position3;
}

export class RemoteMonsters {
  readonly group = new Group();
  private readonly getMonsters: () => Iterable<MonsterSnapshot>;
  private readonly meshes = new Map<string, MonsterMesh>();
  private readonly material = new VoxelModelMaterial();
  private geometry: BoxGeometry;
  /** Uniform scale making the model stand as tall as the AI cube. */
  private scale = 1;
  /** What the monsters are drawn as, or null until a model has been loaded. */
  private modelDimensions: Dimensions3D | null = null;
  private time = 0;

  constructor(params: { getMonsters: () => Iterable<MonsterSnapshot> }) {
    this.getMonsters = params.getMonsters;
    // No model to draw with yet. The material's empty volume marches to a miss
    // on every ray, so a monster is simply not seen until one is loaded.
    this.geometry = new BoxGeometry(1, 1, 1);
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
  setModel(model: {
    sides: Sides;
    palette: RGBA[];
    dimensions: Dimensions3D;
  }): void {
    const voxels = solveVoxels(model.dimensions, model.sides);
    const voxelTexture = this.material.voxelTexture;
    voxelTexture.image = voxels;
    voxelTexture.width = model.dimensions.width;
    voxelTexture.height = model.dimensions.height;
    voxelTexture.depth = model.dimensions.depth;
    voxelTexture.needsUpdate = true;

    const paletteData = encodePalette(model.palette);
    const paletteTexture = this.material.paletteTexture;
    paletteTexture.image = paletteData;
    paletteTexture.width = model.palette.length;
    paletteTexture.height = 1;
    paletteTexture.needsUpdate = true;

    const normalized = Dimensions3D.normalize(model.dimensions);
    this.material.dimensions = [
      normalized.width,
      normalized.height,
      normalized.depth,
    ];
    this.material.voxelCount = [
      model.dimensions.width,
      model.dimensions.height,
      model.dimensions.depth,
    ];

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

  /**
   * Feeds the day-night lighting into the shared material, so the self-lit
   * voxels darken at night and tint under weather like the rest of the scene.
   */
  applyLighting(state: DayNightState): void {
    this.material.lightDir = [
      state.sunDir[0],
      state.sunDir[1],
      state.sunDir[2],
    ];
    this.material.lightColour = [
      state.sunLight[0],
      state.sunLight[1],
      state.sunLight[2],
    ];
    this.material.ambientColour = [
      state.ambient[0],
      state.ambient[1],
      state.ambient[2],
    ];
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
  }
}
