import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Side,
  Texture,
} from "@random-mesh/rmsl/scene";
import type { HudPanelPose } from "../world/scripted-hud-panel";

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

interface Entry {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly texture: Texture;
  signature: string;
}

/** Fixed-orientation world quads carrying a place's text and progress panels. */
export class VoxelHudPanels {
  readonly group = new Group();
  private readonly panels = new Map<string, Entry>();
  private readonly spareMaterials: MeshBasicMaterial[] = [];

  constructor(private readonly getPanels: () => HudPanelPose[]) {}

  tick(): void {
    if (typeof document === "undefined") return;
    const current = this.getPanels();
    const live = new Set(current.map(({ id }) => id));
    for (const [id, entry] of this.panels) {
      if (!live.has(id)) this.discard(id, entry);
    }
    for (const pose of current) {
      let entry = this.panels.get(pose.id);
      if (entry === undefined) {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const texture = new Texture(canvas);
        const material =
          this.spareMaterials.pop() ??
          new MeshBasicMaterial({ side: Side.DoubleSide });
        material.map = texture;
        const geometry = new PlaneGeometry(1, 1);
        // Canvas uploads run bottom-to-top against a plane's default UVs.
        const uv = geometry.uv;
        if (uv !== undefined) {
          const values = Float32Array.from(uv.array);
          for (let i = 1; i < values.length; i += 2) {
            values[i] = 1 - values[i]!;
          }
          uv.setArray(values);
          uv.needsUpdate = true;
        }
        entry = {
          mesh: new Mesh(geometry, material),
          material,
          texture,
          signature: "",
        };
        this.panels.set(pose.id, entry);
        this.group.add(entry.mesh);
      }
      const signature = `${pose.label}\n${pose.value}\n${pose.max}`;
      if (entry.signature !== signature) {
        this.draw(entry, pose);
        entry.signature = signature;
      }
      entry.mesh.position.set(pose.x, pose.y, pose.z);
      entry.mesh.rotation.set(0, pose.yaw, 0);
      entry.mesh.scale.set(pose.width, pose.height, 1);
    }
  }

  clear(): void {
    for (const [id, entry] of this.panels) this.discard(id, entry);
  }

  private discard(id: string, entry: Entry): void {
    this.group.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.material.map = null;
    this.spareMaterials.push(entry.material);
    entry.texture.dispose();
    this.panels.delete(id);
  }

  private draw(entry: Entry, pose: HudPanelPose): void {
    const canvas = entry.texture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (context === null) return;
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "rgba(15, 22, 32, 0.94)";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "#f4f7fb";
    context.font = "600 34px sans-serif";
    context.textBaseline = "middle";
    context.fillText(pose.label, 28, 72, CANVAS_WIDTH - 56);
    context.fillStyle = "#344253";
    context.fillRect(28, 142, CANVAS_WIDTH - 56, 48);
    context.fillStyle = "#57d38c";
    context.fillRect(
      28,
      142,
      (CANVAS_WIDTH - 56) * Math.max(0, Math.min(1, pose.value / pose.max)),
      48,
    );
    context.strokeStyle = "rgba(255,255,255,0.65)";
    context.lineWidth = 3;
    context.strokeRect(28, 142, CANVAS_WIDTH - 56, 48);
    entry.texture.needsUpdate = true;
  }
}
