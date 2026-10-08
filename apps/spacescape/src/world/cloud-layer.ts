/**
 * The two cloud layers, and which one is drawn.
 *
 * `clouds.ts` holds the raymarch and its cheap sibling, and neither knows the other exists.
 * This file is the only place that does, and it owns the choice: the raymarch is built with
 * the field, the cheap shell is built the first time it is asked for, and exactly one is
 * `visible` at a time.
 *
 * **The cheap layer waits, because cutting its slice is real work.** The slice is the shape
 * volume resampled across the whole planet at the raymarch's own scale — hundreds of
 * milliseconds of CPU — so building it with the field would tax every load, including the
 * high-quality ones that will never draw it. It is cut on the first switch to `low`, and
 * every switch after that is a boolean write: no rebuild, no further stall.
 *
 * **The hidden mesh is not drawn**, so the layers do not stack visually and do not cost a
 * second full-frame pass. Every carrier that exists is repositioned each frame, because the
 * write is a uniform and moving only the visible one would leave the other behind the camera
 * the moment it was switched on.
 */

import { Mesh, Scene, SphereGeometry } from "@random-mesh/rmsl/scene";

import type { Vec3 } from "@big-mesh-studios/core";
import { DEFAULT_PLANET_RADIUS } from "../render/atmosphere";
import { bakeCloudField, bakeCloudSlice, type CloudField } from "./cloud-field";
import { shapeTexture, sliceTexture, weatherTexture } from "./cloud-textures";
import {
  CLOUD_EXTENT,
  CheapCloudMaterial,
  CloudMaterial,
  cloudSliceOptions,
  driftAngleAt,
} from "./clouds";
import type { DayNightState } from "./day-night";

/**
 * Which of the two techniques is drawn.
 *
 * `high` is the raymarched volume; `low` is the single-sample shell. The names are the ones
 * `/cloud:quality` accepts and nothing here derives one from the other: they are a choice,
 * not a level, and a name that sounds like a dial would invite a caller to interpolate it.
 */
export type CloudQuality = "high" | "low";

/** Either layer's material, which is all the manager needs of them. */
export type CloudMaterialLike = CloudMaterial | CheapCloudMaterial;

/**
 * A cloud layer that can be either technique, as the console and the frame loop use it.
 *
 * `material` is the **active** one, so `/cloud:coverage` and `/cloud:density` keep working
 * across a switch without either side knowing a switch happened.
 */
export interface CloudLayer {
  /** The material currently drawn, whichever technique that is. */
  readonly material: CloudMaterialLike;
  /** Which technique is drawn. */
  readonly quality: CloudQuality;
  /** Selects a technique. Switching is a visibility write, not a rebuild. */
  setQuality(quality: CloudQuality): void;
  update(camera: Vec3, state: DayNightState): void;
  dispose(): void;
}

/**
 * Builds both layers over one baked field.
 *
 * The signature mirrors `createClouds` deliberately, so the one caller can change nothing but
 * the function name. `seaRadius` places both shells and scales both fields.
 */
export const createCloudLayer = (
  scene: Scene,
  seed = 20260901,
  field: CloudField = bakeCloudField(seed),
  seaRadius = DEFAULT_PLANET_RADIUS,
): CloudLayer => {
  // **One texture upload and one geometry for both layers.** A `DataTexture` is bound per
  // material but is the same immutable bytes either way, and the carrier is a carrier in
  // both — building a second of each would be the same sphere and the same volume uploaded
  // twice. The sphere's own resolution is the raymarch's: the cheap material's fragment
  // cost does not depend on it, so lowering it would only cut vertices that are already
  // cheap.
  const shape = shapeTexture(field.shape);
  const weather = weatherTexture(field.weather);
  const geometry = new SphereGeometry(CLOUD_EXTENT, 44, Math.floor(44 / 2));

  const highMaterial = new CloudMaterial(shape, weather, seaRadius);
  const highMesh = new Mesh(geometry, highMaterial);
  highMesh.visible = true;
  // Added after the terrain, as `createClouds` was: draw order is the occlusion scheme, and
  // the cheap layer joins the high one in the same place when it is built.
  scene.add(highMesh);

  // ---- the cheap layer, cut on demand ----
  //
  // **Not built with the high one, because cutting its slice is real work.** The slice is the
  // shape volume resampled across the whole planet at the raymarch's scale — hundreds of
  // milliseconds — and a player who never leaves the default should not pay it at load. So
  // the cheap material and its mesh appear the first time `low` is selected, and every
  // selection after that is the same boolean write as before.
  let lowMaterial: CheapCloudMaterial | null = null;
  let lowMesh: Mesh | null = null;

  let quality: CloudQuality = "high";
  let disposed = false;

  const buildLow = (): void => {
    if (lowMaterial !== null || disposed) return;
    // Cut from the same field the raymarch reads, at the raymarch's own scale and a fixed
    // altitude, so the two techniques place their clouds in the same places.
    const slice = bakeCloudSlice(field, cloudSliceOptions(seaRadius));
    lowMaterial = new CheapCloudMaterial(
      sliceTexture(slice),
      weather,
      seaRadius,
    );
    lowMesh = new Mesh(geometry, lowMaterial);
    lowMesh.visible = quality === "low";
    scene.add(lowMesh);
  };

  return {
    get material() {
      return lowMaterial !== null && quality === "low"
        ? lowMaterial
        : highMaterial;
    },
    get quality() {
      return quality;
    },
    setQuality(next) {
      quality = next;
      if (next === "low") buildLow();
      highMesh.visible = next === "high";
      if (lowMesh !== null) lowMesh.visible = next === "low";
    },
    update(camera, state) {
      highMaterial.time = state.elapsed;
      highMaterial.driftAngle = driftAngleAt(state.elapsed, seaRadius);
      highMaterial.sky.lighting = state;
      if (lowMaterial !== null) {
        lowMaterial.time = state.elapsed;
        lowMaterial.driftAngle = driftAngleAt(state.elapsed, seaRadius);
        lowMaterial.sky.lighting = state;
      }
      // Dead-centre on the eye and unsnapped, every carrier. See `clouds.ts`; the reason is
      // the same for both and applies whether the cheap one exists yet.
      highMesh.position.set(camera.x, camera.y, camera.z);
      lowMesh?.position.set(camera.x, camera.y, camera.z);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(highMesh);
      if (lowMesh !== null) scene.remove(lowMesh);
      // Once, for the geometry both meshes share. The textures outlive neither and are not
      // owned here — the same convention `createClouds` uses.
      geometry.dispose();
    },
  };
};
