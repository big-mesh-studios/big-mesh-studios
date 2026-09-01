// The first-person view of what the player is holding: one ray-marched mesh
// per item that draws one, riding as children of the camera so they stay fixed
// to the lower right of the frame. Only the wielded item's mesh is visible,
// and it sits wherever that item's tool says — the hand keeps no timing of its
// own. Models are baked from the same items spritesheet the hotbar icons are
// cut from.
import { Dimensions3D } from "@big-mesh-studios/maths";
import {
  boxSize,
  encodePalette,
  solveVoxels,
  VoxelModelMaterial,
  type Model,
} from "@big-mesh-studios/stacker/renderer";
import { BoxGeometry, Mesh, PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "../environment/day-night";
import type { ItemId } from "./items";
import { handTransform, type SwingPose } from "./swing";

/** How big a held item is, scaling its unit-tall box down to hand size. */
const HAND_SCALE = 0.42;

interface HeldModel {
  mesh: Mesh;
  material: VoxelModelMaterial;
  /** The card's world size, for turning the hilt's offset into real distance. */
  cardSize: number;
}

export interface HandParams {
  /** The held meshes ride on this camera, and are only drawn when it is the eye. */
  camera: PerspectiveCamera;
}

export class Hand {
  private readonly camera: PerspectiveCamera;
  private readonly models = new Map<ItemId, HeldModel>();

  constructor(params: HandParams) {
    this.camera = params.camera;
  }

  /** Bakes `model` into a mesh this hand can hold when `id` is wielded. */
  setModel(id: ItemId, model: Model): void {
    const existing = this.models.get(id);
    if (existing !== undefined) {
      this.camera.remove(existing.mesh);
    }

    const material = new VoxelModelMaterial();
    const voxelTexture = material.voxelTexture;
    voxelTexture.image = solveVoxels(model.dimensions, model.sides);
    voxelTexture.width = model.dimensions.width;
    voxelTexture.height = model.dimensions.height;
    voxelTexture.depth = model.dimensions.depth;
    voxelTexture.needsUpdate = true;

    const paletteTexture = material.paletteTexture;
    paletteTexture.image = encodePalette(model.palette);
    paletteTexture.width = model.palette.length;
    paletteTexture.height = 1;
    paletteTexture.needsUpdate = true;

    const normalized = Dimensions3D.normalize(model.dimensions);
    material.dimensions = [
      normalized.width,
      normalized.height,
      normalized.depth,
    ];
    material.voxelCount = [
      model.dimensions.width,
      model.dimensions.height,
      model.dimensions.depth,
    ];

    const size = boxSize(model.dimensions);
    const mesh = new Mesh(
      new BoxGeometry(size.width, size.height, size.depth),
      material,
    );
    mesh.scale.set(HAND_SCALE, HAND_SCALE, HAND_SCALE);
    mesh.visible = false;
    this.camera.add(mesh);
    this.models.set(id, {
      mesh,
      material,
      cardSize: size.height * HAND_SCALE,
    });
  }

  /** Feeds the day-night lighting into every held material, as the zombies get. */
  applyLighting(state: DayNightState): void {
    for (const { material } of this.models.values()) {
      material.lightDir = [state.sunDir[0], state.sunDir[1], state.sunDir[2]];
      material.lightColour = [
        state.sunLight[0],
        state.sunLight[1],
        state.sunLight[2],
      ];
      material.ambientColour = [
        state.ambient[0],
        state.ambient[1],
        state.ambient[2],
      ];
    }
  }

  /**
   * Draws `id`'s model at `pose` and hides every other. Nothing is drawn for
   * an item with no model, for a pose of null, or while the hand is empty.
   */
  show(id: ItemId | null, pose: SwingPose | null): void {
    for (const [held, { mesh, cardSize }] of this.models) {
      const visible = held === id && pose !== null;
      mesh.visible = visible;
      if (!visible || pose === null) {
        continue;
      }
      const { position, rotation } = handTransform(pose, cardSize);
      mesh.position.set(position.x, position.y, position.z);
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  /** Removes every held mesh from the camera. */
  dispose(): void {
    for (const { mesh } of this.models.values()) {
      this.camera.remove(mesh);
    }
    this.models.clear();
  }
}
