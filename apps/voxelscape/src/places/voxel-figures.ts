// Renders scripted figures — the NPCs a place stands around and the props it
// places — as ray-marched voxel models: one group of part meshes per figure,
// each drawn from the rm-stacker model its id wears. Reads a caller-supplied
// list each frame, so a figure the script host places, turns, or retires
// appears or disappears to match. Each model file is baked once and shared by
// every figure wearing it; a figure stands with its feet on the entity's
// grounded `y`, drawn at whatever height the entity asks for.
import { Group } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import {
  BakedFigure,
  VoxelModelMaterial,
  type Figure,
  type FigureCopy,
} from "@big-mesh-studios/stacker/renderer";
import { loadFigure } from "@big-mesh-studios/stacker/format";

/** How tall a standing figure is drawn when its entity names no height. */
export const FIGURE_HEIGHT = 2;

/** What the renderer needs to know about one figure, whatever provides it. */
export interface RenderedFigure {
  id: string;
  /** Feet position, in world units. */
  x: number;
  y: number;
  z: number;
  /** Heading in radians, turning a prop to face somewhere; defaults to 0. */
  yaw?: number;
  /** Drawn height in world units; defaults to `FIGURE_HEIGHT`. */
  height?: number;
}

/** The upright box the crosshair ray tests a figure against, in world units. */
export interface FigureAimBox {
  /** Half the box's width and depth, taken from the model's own proportions. */
  half: number;
  height: number;
}

interface BakedModel {
  baked: BakedFigure;
  materials: VoxelModelMaterial[];
  /** Voxels the model is tall; the divisor turning a world height into a scale. */
  modelHeight: number;
  /** Half the model's widest horizontal extent relative to its height. */
  halfRatio: number;
}

export interface VoxelFiguresParams {
  /** The figures to draw, from the script host. */
  getFigures: () => Iterable<RenderedFigure>;
  /** Which model file a figure with `id` wears, named as it is bundled. */
  modelFor?: (id: string) => string;
}

export class VoxelFigures {
  readonly group = new Group();
  private readonly getFigures: () => Iterable<RenderedFigure>;
  private readonly modelFor: (id: string) => string;
  private readonly baked = new Map<string, BakedModel>();
  private readonly meshes = new Map<string, FigureCopy>();
  /** The drawn height each figure's aim box and copy were last given. */
  private readonly heights = new Map<string, number>();

  constructor(params: VoxelFiguresParams) {
    this.getFigures = params.getFigures;
    this.modelFor = params.modelFor ?? (() => "zombie.zip");
  }

  /** Number of figures currently drawn in the scene. */
  get size(): number {
    return this.meshes.size;
  }

  /** Makes every figure of `model` wear `figure`, rebaking any already drawn. */
  setFigure(model: string, figure: Figure): void {
    const baked = new BakedFigure(figure);
    const modelHeight = baked.size.height;
    const { width, depth } = baked.bounds.dimensions;
    this.baked.set(model, {
      baked,
      materials: baked.createMaterials(),
      modelHeight,
      halfRatio:
        modelHeight > 0 ? (0.5 * Math.max(width, depth)) / modelHeight : 0,
    });
    for (const [id, mesh] of this.meshes) {
      if (this.modelFor(id) === model) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
        this.heights.delete(id);
      }
    }
  }

  /** Reads a model zip saved from rm-stacker and remembers it under `model`. */
  async loadModel(model: string, bytes: Blob): Promise<void> {
    this.setFigure(model, await loadFigure(bytes));
  }

  /**
   * The aim box a figure with `id` presents to the crosshair, from its model's
   * proportions and the height its entity asked for, or null before its model
   * has loaded.
   */
  aimBounds(id: string): FigureAimBox | null {
    const baked = this.baked.get(this.modelFor(id));
    if (baked === undefined) {
      return null;
    }
    const height = this.heights.get(id) ?? FIGURE_HEIGHT;
    return { half: baked.halfRatio * height, height };
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

  /** Reconciles the meshes against the current figures, placing each at its feet. */
  tick(_dt: number): void {
    const current = new Set<string>();
    for (const figure of this.getFigures()) {
      current.add(figure.id);
      const model = this.modelFor(figure.id);
      const baked = this.baked.get(model);
      if (baked === undefined || baked.modelHeight <= 0) {
        continue; // its figure has not arrived yet; a later frame draws it
      }
      const height = figure.height ?? FIGURE_HEIGHT;
      this.heights.set(figure.id, height);
      let mesh = this.meshes.get(figure.id);
      if (mesh === undefined) {
        mesh = baked.baked.copy(baked.materials);
        this.group.add(mesh.group);
        this.meshes.set(figure.id, mesh);
      }
      const scale = height / baked.modelHeight;
      mesh.group.scale.set(scale, scale, scale);
      mesh.group.position.set(figure.x, figure.y + height / 2, figure.z);
      mesh.group.rotation.y = figure.yaw ?? 0;
    }
    for (const [id, mesh] of this.meshes) {
      if (!current.has(id)) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
        this.heights.delete(id);
      }
    }
  }

  /** Removes every figure's meshes. */
  clear(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh.group);
    }
    this.meshes.clear();
    this.heights.clear();
  }
}
