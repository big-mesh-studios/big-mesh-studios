// The glowing lines a place script draws between two ends. A beam is one wide
// segment — a laser sight, a rope, a chain — drawn with the same `Line2` the
// weather draws its lightning with, in world units so its `width` is a width on
// the ground rather than a pixel count. The set reconciles against the host's
// resolved list every tick, rewriting each line's two endpoints so a beam that
// follows a figure moves with it.
import {
  Blending,
  Group,
  Line2,
  Line2NodeMaterial,
  LineGeometry,
} from "@random-mesh/rmsl/scene";
import type { BeamPose } from "../world/scripted-beam";

/** Draws the lines the host reports, one wide segment per beam. */
export class VoxelBeams {
  /** The scene group the lines draw in; add it to the world's scene. */
  readonly group = new Group();
  private readonly beams = new Map<string, Line2>();

  constructor(private readonly getBeams: () => BeamPose[]) {}

  /** Brings the lines in step with the host's list. */
  tick(): void {
    const current = this.getBeams();
    for (const pose of current) {
      let beam = this.beams.get(pose.id);
      if (beam === undefined) {
        const material = new Line2NodeMaterial({
          color: 0xffffff,
          linewidth: pose.width,
          worldUnits: true,
          transparent: true,
        });
        material.blending = Blending.AdditiveBlending;
        material.depthWrite = false;
        beam = new Line2(new LineGeometry(), material);
        this.group.add(beam);
        this.beams.set(pose.id, beam);
      }
      beam.material.color.set(pose.color[0], pose.color[1], pose.color[2]);
      beam.material.linewidth = pose.width;
      beam.geometry.setPositions([
        pose.ax,
        pose.ay,
        pose.az,
        pose.bx,
        pose.by,
        pose.bz,
      ]);
      beam.geometry.getAttribute("instanceStart")!.needsUpdate = true;
      beam.geometry.getAttribute("instanceEnd")!.needsUpdate = true;
    }
    for (const [id, beam] of this.beams) {
      if (!current.some((pose) => pose.id === id)) {
        this.group.remove(beam);
        beam.geometry.dispose();
        this.beams.delete(id);
      }
    }
  }

  /** Removes every line, leaving the set ready for a fresh script. */
  clear(): void {
    for (const beam of this.beams.values()) {
      this.group.remove(beam);
      beam.geometry.dispose();
    }
    this.beams.clear();
  }
}
