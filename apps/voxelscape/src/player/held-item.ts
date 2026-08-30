// The sword the player holds: a single ray-marched voxel-model mesh riding as
// a child of the camera, so it stays fixed to the first-person view at the
// lower right of the frame. Baked from the same `VoxelModelMaterial` textures
// as the zombie meshes (`RemoteMonsters.setModel`), but for one mesh with a
// pose of its own. Shown only in first person and only while the sword is the
// selected inventory item; holding the place button winds it back and letting
// go swings it, per the pure transform in `./swing`.
import {
  boxSize,
  bakeVolume,
  solveVoxels,
  VoxelModelMaterial,
  type Model,
} from "@big-mesh-studios/stacker/renderer";
import { BoxGeometry, Mesh, PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import { SWORD } from "./inventory";
import {
  RECOVER_TIME,
  SWING_TIME,
  swingTransform,
  WINDUP_TIME,
  type SwingState,
  type SwingTransform,
} from "./swing";

/** How big the held sword is, scaling the model's unit-tall box down to hand size. */
const HAND_SCALE = 0.42;

export interface HeldItemParams {
  /** The sword mesh rides on this camera, and is only drawn when it is the eye. */
  camera: PerspectiveCamera;
  /** The selected inventory item id, read each frame. */
  getSelected: () => number;
  /** Whether the camera is in first person, read each frame. */
  getFirstPerson: () => boolean;
  /**
   * Called the frame a swing begins — the release edge from rest or from a
   * wind-up — so the caller can settle what the swing hits. Not called while
   * the sword is unheld, so a place that merely winds up swings nothing.
   */
  onSwing?: () => void;
}

export class HeldItem {
  private readonly camera: PerspectiveCamera;
  private readonly getSelected: () => number;
  private readonly getFirstPerson: () => boolean;
  private readonly onSwing: (() => void) | undefined;
  private readonly material = new VoxelModelMaterial();
  private readonly mesh: Mesh;
  private geometry: BoxGeometry;
  private state: SwingState = "idle";
  /** Seconds the current state has run, to time the swing against. */
  private stateTime = 0;
  /** How far the wind-up had pulled the sword when the swing started. */
  private windupProgress = 0;
  /** The card's world size, for turning the hilt's offset into real distance. */
  private cardSize = 1;

  constructor(params: HeldItemParams) {
    this.camera = params.camera;
    this.getSelected = params.getSelected;
    this.getFirstPerson = params.getFirstPerson;
    this.onSwing = params.onSwing;
    // No model to draw with yet; an empty volume marches to a miss on every
    // ray, so nothing is seen until a model is loaded.
    this.geometry = new BoxGeometry(1, 1, 1);
    this.mesh = new Mesh(this.geometry, this.material);
    this.applyTransform(swingTransform("idle", 0, 0, this.cardSize));
    this.mesh.scale.set(HAND_SCALE, HAND_SCALE, HAND_SCALE);
    this.mesh.visible = false;
    this.camera.add(this.mesh);
  }

  /** Swaps the held model for `model`, baking it into the material and geometry. */
  setModel(model: Model): void {
    bakeVolume(
      this.material,
      model.dimensions,
      solveVoxels(model.dimensions, model.sides),
      model.palette,
    );

    const size = boxSize(model.dimensions);
    this.geometry = new BoxGeometry(size.width, size.height, size.depth);
    this.cardSize = size.height * HAND_SCALE;
    this.mesh.geometry = this.geometry;
    this.mesh.scale.set(HAND_SCALE, HAND_SCALE, HAND_SCALE);
  }

  /** Feeds the day-night lighting into the material, like the zombie meshes. */
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

  /**
   * Shows the sword and advances its swing by `dt` seconds. Holding the place
   * button while the sword is selected winds it back; the button going up
   * swings it, then it recovers to rest. Dropping the sword out of the hand
   * (deselecting it, or leaving first person) settles it back to rest.
   */
  update(dt: number, placeHeld: boolean, placeReleased: boolean): void {
    const holding = this.getFirstPerson() && this.getSelected() === SWORD;
    this.mesh.visible = holding;
    if (!holding) {
      this.state = "idle";
      this.stateTime = 0;
      this.windupProgress = 0;
    } else {
      switch (this.state) {
        case "idle":
          if (placeHeld) {
            this.state = "windup";
            this.stateTime = 0;
            this.windupProgress = 0;
          } else if (placeReleased) {
            // A tap that released before its own frame winds up swings from rest.
            this.state = "swing";
            this.stateTime = 0;
            this.windupProgress = 0;
            this.onSwing?.();
          }
          break;
        case "windup":
          this.stateTime += dt;
          this.windupProgress = Math.min(1, this.stateTime / WINDUP_TIME);
          if (placeReleased) {
            this.state = "swing";
            this.stateTime = 0;
            this.onSwing?.();
          }
          break;
        case "swing":
          this.stateTime += dt;
          if (this.stateTime >= SWING_TIME) {
            this.state = "recover";
            this.stateTime = 0;
          }
          break;
        case "recover":
          this.stateTime += dt;
          if (this.stateTime >= RECOVER_TIME) {
            this.state = "idle";
            this.stateTime = 0;
          }
          break;
      }
    }

    const phase =
      this.state === "windup"
        ? this.stateTime / WINDUP_TIME
        : this.state === "swing"
          ? this.stateTime / SWING_TIME
          : this.state === "recover"
            ? this.stateTime / RECOVER_TIME
            : 0;
    this.applyTransform(
      swingTransform(this.state, phase, this.windupProgress, this.cardSize),
    );
  }

  /** Removes the mesh from the camera. */
  dispose(): void {
    this.camera.remove(this.mesh);
  }

  private applyTransform({ position, rotation }: SwingTransform): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
}
