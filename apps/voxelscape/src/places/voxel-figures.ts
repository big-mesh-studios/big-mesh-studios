// Renders scripted figures — the NPCs a place stands around and the props it
// places — as ray-marched voxel models: one group of part meshes per figure,
// each drawn from the rm-stacker model its id wears. Reads a caller-supplied
// list each frame, so a figure the script host places, turns, or retires
// appears or disappears to match. Each model file is baked once and shared by
// every figure wearing it, which is why a figure's look and the block light it
// is standing in each cost a material set of their own; a figure stands with
// its feet on the entity's grounded `y`, drawn at whatever height the entity
// asks for, eased toward its reported `x`/`z` rather than snapped to them
// (`figure-motion.ts`) since a remote figure's own position can go many frames
// between reports, and spun about its own axis after `yaw` when the entity
// names one. A figure a caller flashes plays a moment of red, wholly
// independent of whatever the script does with the hit; one dying plays a fall
// over the ground before it is gone, timed off the moment the entity's own
// `dyingAt` names.
import { Group, Quaternion, Vector3 } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import {
  BakedFigure,
  figurePlacement,
  lastFrame,
  poseFigure,
  VoxelModelMaterial,
  type Figure,
  type FigureCopy,
  type FigurePlacement,
  type Motion,
} from "@big-mesh-studios/stacker/renderer";
import { loadFigure } from "@big-mesh-studios/stacker/format";
import { LIGHT_TO_UNIT, MAX_LIGHT } from "../world/light-store";
import { FigureMotionTrack } from "./figure-motion";
import type { FigureAnimation, FigureLook } from "./script-host";

/** How tall a standing figure is drawn when its entity names no height. */
export const FIGURE_HEIGHT = 2;

/**
 * The frame of `motion` a figure playing `animation` stands at on the shared
 * clock: the clock's seconds times the motion's own rate and the animation's
 * speed, wrapped into the motion's run when it loops.
 */
const animatedFrame = (
  motion: Motion,
  animation: FigureAnimation,
  clockMs: number,
): number => {
  const raw = (clockMs / 1000) * motion.framesPerSecond * animation.speed;
  const span = lastFrame(motion) + 1;
  if (animation.loop && span > 0) {
    return ((raw % span) + span) % span;
  }
  return Math.max(0, raw);
};

/** How long a dying figure takes to fall flat, in seconds. */
const DEATH_FALL_SECONDS = 0.5;

/** How long a hit figure is drawn flashed red for, in milliseconds. */
const HURT_FLASH_MS = 180;

/** What a look comes to as a string, so an identical one finds its set again. */
const lookSignature = (look: FigureLook | undefined): string =>
  look === undefined
    ? ""
    : `${look.color[0].toFixed(3)},${look.color[1].toFixed(3)},${look.color[2].toFixed(3)}|${look.alpha.toFixed(3)}`;

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
  /**
   * The clock moment this figure started falling, or undefined while it is
   * standing — the renderer times the fall from this rather than owning any
   * notion of death itself.
   */
  dyingAt?: number;
  /**
   * A spin about a world axis, applied after `yaw`; absent when it does not
   * spin. `pivot`, when set, is the hinge the figure turns about — an offset
   * from its feet-centre origin in its own frame, before `yaw` — so a door
   * swings on its edge instead of about its middle.
   */
  spin?: {
    axis: [number, number, number];
    angle: number;
    pivot?: [number, number, number];
  };
  /** The model motion the figure plays, or absent when it stands in its rest pose. */
  animation?: FigureAnimation;
  /** The tint and fade over the figure's colours, or absent for its model's own. */
  look?: FigureLook;
}

/** The upright box the crosshair ray tests a figure against, in world units. */
export interface FigureAimBox {
  /** Half the box's width and depth, taken from the model's own proportions. */
  half: number;
  height: number;
}

interface BakedModel {
  baked: BakedFigure;
  /**
   * The material sets one combination of look and light has needed, keyed by
   * their signature. A look and a light level are both uniforms on the
   * material, and the model has one shared set that carries every other
   * figure, so a figure asking for either wears a set of its own. Made as each
   * combination is first drawn rather than up front, because a place's figures
   * rarely all stand in the same light.
   */
  sets: Map<string, FigureMaterials>;
  /** Voxels the model is tall; the divisor turning a world height into a scale. */
  modelHeight: number;
  /** Half the model's widest horizontal extent relative to its height. */
  halfRatio: number;
  /** The figure as it was drawn, for posing it at an animated frame. */
  figure: Figure;
  /** The motions saved beside the figure, by name. */
  motions: Motion[];
  /** Where every part stands unposed, to restore a copy an animation stopped on. */
  restPlacement: FigurePlacement;
}

/** One such set: a figure as it stands, and the same figure wholly flashed red. */
interface FigureMaterials {
  /** The look and light level the set was made for, so a hit can be made to match them. */
  look: FigureLook | undefined;
  level: number;
  worn: VoxelModelMaterial[];
  flash?: VoxelModelMaterial[];
}

export interface VoxelFiguresParams {
  /** The figures to draw, from the script host. */
  getFigures: () => Iterable<RenderedFigure>;
  /** Which model file a figure with `id` wears, named as it is bundled. */
  modelFor?: (id: string) => string;
  /**
   * The block light standing at a world point, 0 to 15, so a figure is shaded
   * by the glowstone and lava around it rather than by the sun alone. Read once
   * per figure per frame, where it stands; defaults to a world with nothing
   * emissive in it.
   */
  lightAt?: (x: number, y: number, z: number) => number;
  /**
   * The shared clock an animation is sampled from, in milliseconds. Every peer
   * passes the same one, so a figure posed at a frame stands the same way
   * wherever it is drawn. Defaults to the wall clock for a lone caller.
   */
  getNow?: () => number;
}

export class VoxelFigures {
  readonly group = new Group();
  private readonly getFigures: () => Iterable<RenderedFigure>;
  private readonly modelFor: (id: string) => string;
  private readonly lightAt: (x: number, y: number, z: number) => number;
  private readonly getNow: () => number;
  private readonly baked = new Map<string, BakedModel>();
  private readonly meshes = new Map<string, FigureCopy>();
  /** Figures whose copy is currently stood at an animated pose, not at rest. */
  private readonly animated = new Set<string>();
  /** The drawn height each figure's aim box and copy were last given. */
  private readonly heights = new Map<string, number>();
  /** Ids currently flashing red, with the local moment the flash ends. */
  private readonly hurtUntil = new Map<string, number>();
  /** Where each standing figure is actually drawn, eased toward its reports. */
  private readonly motion = new Map<string, FigureMotionTrack>();
  /** Scratch for the per-figure orientation, so drawing a frame allocates none. */
  private readonly spinAxis = new Vector3();
  private readonly upAxis = new Vector3(0, 1, 0);
  private readonly yawTurn = new Quaternion();
  /** Scratch for holding a hinged figure's pivot still while it turns. */
  private readonly pivotWorld = new Vector3();
  private readonly pivotSpin = new Vector3();

  constructor(params: VoxelFiguresParams) {
    this.getFigures = params.getFigures;
    this.modelFor = params.modelFor ?? (() => "zombie.zip");
    this.lightAt = params.lightAt ?? (() => 0);
    this.getNow = params.getNow ?? (() => Date.now());
  }

  /** Number of figures currently drawn in the scene. */
  get size(): number {
    return this.meshes.size;
  }

  /** Makes every figure of `model` wear `figure`, with the motions saved beside it, rebaking any already drawn. */
  setFigure(model: string, figure: Figure, motions: Motion[] = []): void {
    const baked = new BakedFigure(figure);
    const modelHeight = baked.size.height;
    const { width, depth } = baked.bounds.dimensions;
    this.baked.set(model, {
      baked,
      modelHeight,
      halfRatio:
        modelHeight > 0 ? (0.5 * Math.max(width, depth)) / modelHeight : 0,
      figure,
      motions,
      restPlacement: figurePlacement(figure),
      sets: new Map(),
    });
    for (const [id, mesh] of this.meshes) {
      if (this.modelFor(id) === model) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
        this.heights.delete(id);
        this.animated.delete(id);
      }
    }
  }

  /**
   * Flashes the figure with `id` red for a moment, so a landed hit reads on
   * the model. A no-op for a figure that is not being drawn.
   */
  flashHit(id: string): void {
    this.hurtUntil.set(id, Date.now() + HURT_FLASH_MS);
  }

  /** Reads a model zip saved from rm-stacker and remembers it under `model`. */
  async loadModel(model: string, bytes: Blob): Promise<void> {
    const loaded = await loadFigure(bytes);
    this.setFigure(
      model,
      { parts: loaded.parts, palette: loaded.palette },
      loaded.motions,
    );
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

  /** Feeds the day-night lighting into every material set any of its models has made. */
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
    /** Hands one material the sun's direction and both of the day's colours. */
    const lit = (material: VoxelModelMaterial): void => {
      material.lightDir = sunDir;
      material.lightColour = sunLight;
      material.ambientColour = ambient;
    };
    for (const { sets } of this.baked.values()) {
      for (const { worn, flash } of sets.values()) {
        worn.forEach(lit);
        // A set made for a hit is only worn alongside one of these, so it
        // stands or falls with the set beside it.
        flash?.forEach(lit);
      }
    }
  }

  /** Reconciles the meshes against the current figures, placing each at its feet. */
  tick(dt: number): void {
    const now = Date.now();
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
      // Sampled where the figure is reported to stand, at the height its mesh
      // is centred on, so a figure that walks out from under a fitting is
      // relit on the frame it steps out.
      const materials = this.materialsFor(
        baked,
        figure.look,
        this.lightAt(figure.x, figure.y + height / 2, figure.z),
      );
      let mesh = this.meshes.get(figure.id);
      if (mesh === undefined) {
        mesh = baked.baked.copy(materials.worn);
        this.group.add(mesh.group);
        this.meshes.set(figure.id, mesh);
      }
      const animation = figure.animation;
      const motion =
        animation === undefined
          ? undefined
          : baked.motions.find((held) => held.name === animation.name);
      if (animation !== undefined && motion !== undefined) {
        mesh.stand(
          figurePlacement(
            poseFigure(
              baked.figure,
              motion,
              animatedFrame(motion, animation, this.getNow()),
            ),
          ),
        );
        this.animated.add(figure.id);
      } else if (this.animated.delete(figure.id)) {
        // It was playing a motion and now is not: stand it back at rest.
        mesh.stand(baked.restPlacement);
      }
      const scale = height / baked.modelHeight;
      mesh.group.scale.set(scale, scale, scale);
      const yaw = figure.yaw ?? 0;
      if (figure.dyingAt === undefined) {
        let track = this.motion.get(figure.id);
        if (track === undefined) {
          track = new FigureMotionTrack({ x: figure.x, z: figure.z }, now);
          this.motion.set(figure.id, track);
        }
        const drawn = track.next({ x: figure.x, z: figure.z }, now, dt);
        mesh.group.position.set(drawn.x, figure.y + height / 2, drawn.z);
        if (figure.spin === undefined) {
          mesh.group.rotation.set(0, yaw, 0);
        } else {
          // The spin turns about a world axis after the figure has been turned to
          // its heading, so the two compose as `spin * yaw`.
          this.spinAxis
            .set(figure.spin.axis[0], figure.spin.axis[1], figure.spin.axis[2])
            .normalize();
          mesh.group.quaternion.setFromAxisAngle(
            this.spinAxis,
            figure.spin.angle,
          );
          this.yawTurn.setFromAxisAngle(this.upAxis, yaw);
          mesh.group.quaternion.multiply(this.yawTurn);
          const pivot = figure.spin.pivot;
          if (pivot !== undefined) {
            // Shift the group so the hinge, not the model's middle, is the
            // fixed point: the point turns to `spin * yaw * pivot`, so the
            // group moves by the difference between that and where the pivot
            // already stood.
            this.pivotWorld
              .set(pivot[0], pivot[1], pivot[2])
              .applyQuaternion(this.yawTurn);
            this.pivotSpin.copy(this.pivotWorld);
            this.pivotSpin.applyQuaternion(mesh.group.quaternion);
            mesh.group.position.add(this.pivotWorld.sub(this.pivotSpin));
          }
        }
      } else {
        // Tips backward about the feet, the same arc a player's own death
        // fall plays: the half-height offset follows the tip down to the
        // ground rather than the model sinking through it.
        const progress = Math.min(
          1,
          (now - figure.dyingAt) / 1000 / DEATH_FALL_SECONDS,
        );
        const fall = (-Math.PI / 2) * progress;
        const half = height / 2;
        mesh.group.position.set(
          figure.x + half * Math.sin(fall) * Math.sin(yaw),
          figure.y + half * Math.cos(fall),
          figure.z + half * Math.sin(fall) * Math.cos(yaw),
        );
        mesh.group.rotation.set(fall, yaw, 0);
      }
      // A recently hit figure draws with the flashed materials until its
      // flash lapses, then falls back to its own set — a flash that has lapsed
      // is forgotten rather than re-tested next frame. The flashed set is keyed
      // by the same look and light as the one it replaces, so hitting a figure
      // does not also move it out of the light it is standing in.
      if ((this.hurtUntil.get(figure.id) ?? 0) > now) {
        mesh.wear(this.flashed(baked, materials));
      } else {
        this.hurtUntil.delete(figure.id);
        mesh.wear(materials.worn);
      }
    }
    for (const [id, mesh] of this.meshes) {
      if (!current.has(id)) {
        this.group.remove(mesh.group);
        this.meshes.delete(id);
        this.heights.delete(id);
        this.hurtUntil.delete(id);
        this.motion.delete(id);
        this.animated.delete(id);
      }
    }
  }

  /**
   * The material set a figure wearing `look` and standing in `level` of block
   * light draws with, made once per distinct combination.
   */
  private materialsFor(
    baked: BakedModel,
    look: FigureLook | undefined,
    level: number,
  ): FigureMaterials {
    const signature = `${lookSignature(look)}|${level}`;
    const existing = baked.sets.get(signature);
    if (existing !== undefined) {
      return existing;
    }
    const entry: FigureMaterials = {
      look,
      level,
      worn: this.buildSet(baked, look, level),
    };
    baked.sets.set(signature, entry);
    return entry;
  }

  /**
   * The set the same figure wears wholly flashed red, made the first time a
   * figure in this combination of look and light is hit — a place nobody hits
   * never pays for a second set it will not draw.
   */
  private flashed(
    baked: BakedModel,
    entry: FigureMaterials,
  ): VoxelModelMaterial[] {
    if (entry.flash === undefined) {
      const flash = this.buildSet(baked, entry.look, entry.level);
      for (const material of flash) {
        material.flash = 1;
      }
      entry.flash = flash;
    }
    return entry.flash;
  }

  /**
   * A set of materials for one part each, carrying the tint and opacity of
   * `look` and the normalized `level` of block light the figure stands in.
   */
  private buildSet(
    baked: BakedModel,
    look: FigureLook | undefined,
    level: number,
  ): VoxelModelMaterial[] {
    const set = baked.baked.createMaterials();
    const blockLight = LIGHT_TO_UNIT(Math.min(Math.max(level, 0), MAX_LIGHT));
    for (const material of set) {
      material.blockLight = blockLight;
      if (look !== undefined) {
        material.tint = [look.color[0], look.color[1], look.color[2]];
        material.alpha = look.alpha;
        if (look.alpha < 1) {
          material.transparent = true;
        }
      }
    }
    return set;
  }

  /** Removes every figure's meshes. */
  clear(): void {
    for (const mesh of this.meshes.values()) {
      this.group.remove(mesh.group);
    }
    this.meshes.clear();
    this.heights.clear();
    this.hurtUntil.clear();
    this.motion.clear();
    this.animated.clear();
  }
}
