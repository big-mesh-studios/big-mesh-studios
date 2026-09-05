// Renders scripted NPCs as voxel figures: one group of part meshes per NPC,
// each drawn from the model its id wears. Reads a caller-supplied list each
// frame, so an NPC that the script host places, moves, or retires appears or
// disappears to match — the same relationship the monsters' renderer has to its
// controller. Each model file is baked once and shared by every NPC wearing it;
// the figure stands with its feet on the NPC's grounded `y`.
import { Group } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import {
  BakedFigure,
  VoxelModelMaterial,
  type Figure,
  type FigureCopy,
} from "@big-mesh-studios/stacker/renderer";

/** How tall a standing NPC figure is, feet to head, in world units. */
const FIGURE_HEIGHT = 2;

/** What the renderer needs to know about an NPC, whatever provides them. */
export interface RenderedNpc {
  id: string;
  /** Feet position, in world units. */
  x: number;
  y: number;
  z: number;
}

interface BakedModel {
  baked: BakedFigure;
  materials: VoxelModelMaterial[];
  /** Uniform scale standing the model at `FIGURE_HEIGHT`. */
  scale: number;
}

export interface NpcFiguresParams {
  /** The NPCs to draw, from the script host. */
  getNpcs: () => Iterable<RenderedNpc>;
  /** Which model file an NPC with `id` wears, named as it is bundled. */
  modelFor?: (id: string) => string;
}

export class NpcFigures {
  readonly group = new Group();
  private readonly getNpcs: () => Iterable<RenderedNpc>;
  private readonly modelFor: (id: string) => string;
  private readonly baked = new Map<string, BakedModel>();
  private readonly meshes = new Map<string, FigureCopy>();

  constructor(params: NpcFiguresParams) {
    this.getNpcs = params.getNpcs;
    this.modelFor = params.modelFor ?? (() => "zombie.zip");
  }

  /** Number of NPCs currently drawn in the scene. */
  get size(): number {
    return this.meshes.size;
  }

  /** Makes every NPC of `file` wear `figure`, rebaking any already drawn. */
  setFigure(file: string, figure: Figure): void {
    const baked = new BakedFigure(figure);
    const scale = baked.size.height > 0 ? FIGURE_HEIGHT / baked.size.height : 1;
    this.baked.set(file, {
      baked,
      materials: baked.createMaterials(),
      scale,
    });
    for (const [id, mesh] of this.meshes) {
      if (this.modelFor(id) === file) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
      }
    }
  }

  /** Feeds the day-night lighting into the shared materials of every model. */
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
    for (const { materials } of this.baked.values()) {
      for (const material of materials) {
        material.lightDir = sunDir;
        material.lightColour = sunLight;
        material.ambientColour = ambient;
      }
    }
  }

  /** Reconciles the meshes against the current NPCs, placing each at its feet. */
  tick(_dt: number): void {
    const current = new Set<string>();
    for (const npc of this.getNpcs()) {
      current.add(npc.id);
      const file = this.modelFor(npc.id);
      const model = this.baked.get(file);
      if (model === undefined) {
        continue; // its figure has not arrived yet; a later frame draws it
      }
      let mesh = this.meshes.get(npc.id);
      if (mesh === undefined) {
        mesh = model.baked.copy(model.materials);
        mesh.group.scale.set(model.scale, model.scale, model.scale);
        this.group.add(mesh.group);
        this.meshes.set(npc.id, mesh);
      }
      mesh.group.position.set(npc.x, npc.y + FIGURE_HEIGHT / 2, npc.z);
    }
    for (const [id, mesh] of this.meshes) {
      if (!current.has(id)) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
      }
    }
  }

  /** Removes every NPC's meshes. */
  clear(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh.group);
    }
    this.meshes.clear();
  }
}
