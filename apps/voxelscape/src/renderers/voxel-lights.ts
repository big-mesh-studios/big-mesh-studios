// The point lights a place script has lit, drawn straight into the scene.
// A light is not a mesh: the renderer reads the scene's lights when it shades,
// so one `PointLight` per scripted light is the whole drawing. The set
// reconciles against the host's resolved list every tick, the same way the
// fire and figure renderers reconcile theirs, so a light a script moves,
// recolours, or puts out follows without any per-light bookkeeping here.
import { Group, PointLight } from "@random-mesh/rmsl/scene";
import type { LightPose } from "../world/scripted-light";

/** Draws the point lights the host reports, one scene light per scripted light. */
export class VoxelLights {
  /** The scene group the lights stand in; add it to the world's scene. */
  readonly group = new Group();
  private readonly lights = new Map<string, PointLight>();

  constructor(private readonly getLights: () => LightPose[]) {}

  /** Brings the scene lights in step with the host's list. */
  tick(): void {
    const current = this.getLights();
    for (const pose of current) {
      let light = this.lights.get(pose.id);
      if (light === undefined) {
        light = new PointLight(1, 1, 12, 1);
        this.group.add(light);
        this.lights.set(pose.id, light);
      }
      light.color.set(pose.color[0], pose.color[1], pose.color[2]);
      light.intensity = pose.intensity;
      light.distance = pose.range;
      light.position.set(pose.x, pose.y, pose.z);
    }
    for (const [id, light] of this.lights) {
      if (!current.some((pose) => pose.id === id)) {
        this.group.remove(light);
        this.lights.delete(id);
      }
    }
  }

  /** Removes every light, leaving the set ready for a fresh script. */
  clear(): void {
    for (const light of this.lights.values()) {
      this.group.remove(light);
    }
    this.lights.clear();
  }
}
