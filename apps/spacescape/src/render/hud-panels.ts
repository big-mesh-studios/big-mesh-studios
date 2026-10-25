import {
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Side,
  Texture,
  type Scene,
} from "@random-mesh/rmsl/scene";
import type { HostHudPanel } from "../places/host";
import { screenQuaternion, type ScreenView } from "./feeds";

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

interface Entry {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly texture: Texture;
  signature: string;
}

/** Canvas-backed world-space HUD quads, reconciled against the place host's panel list. */
export interface HudPanelLayer {
  sync(panels: readonly HostHudPanel[], view: ScreenView): void;
  clear(): void;
  dispose(): void;
}

export const createHudPanelLayer = (scene: Scene): HudPanelLayer => {
  const geometry = new PlaneGeometry(1, 1);
  // Canvas uploads run bottom-to-top against a plane's default UVs.
  const uv = geometry.uv;
  if (uv !== undefined) {
    const values = Float32Array.from(uv.array);
    for (let i = 1; i < values.length; i += 2) values[i] = 1 - values[i]!;
    uv.setArray(values);
    uv.needsUpdate = true;
  }
  const entries = new Map<string, Entry>();
  const spareMaterials: MeshBasicMaterial[] = [];

  const discard = (id: string, entry: Entry): void => {
    scene.remove(entry.mesh);
    entry.material.map = null;
    spareMaterials.push(entry.material);
    entry.texture.dispose();
    entries.delete(id);
  };

  const draw = (entry: Entry, panel: HostHudPanel): void => {
    const canvas = entry.texture.image as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (context === null) return;
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "rgba(15, 22, 32, 0.94)";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "#f4f7fb";
    context.font = "600 34px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(panel.label, 28, 72, CANVAS_WIDTH - 56);
    context.fillStyle = "#344253";
    context.fillRect(28, 142, CANVAS_WIDTH - 56, 48);
    const ratio = Math.max(0, Math.min(1, panel.value / panel.max));
    context.fillStyle = "#57d38c";
    context.fillRect(28, 142, (CANVAS_WIDTH - 56) * ratio, 48);
    context.strokeStyle = "rgba(255,255,255,0.65)";
    context.lineWidth = 3;
    context.strokeRect(28, 142, CANVAS_WIDTH - 56, 48);
    entry.texture.needsUpdate = true;
  };

  return {
    sync(panels, view): void {
      const live = new Set(panels.map(({ id }) => id));
      for (const [id, entry] of entries) {
        if (!live.has(id)) discard(id, entry);
      }

      for (const panel of panels) {
        let entry = entries.get(panel.id);
        if (entry === undefined) {
          const canvas = document.createElement("canvas");
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;
          const texture = new Texture(canvas);
          const material =
            spareMaterials.pop() ??
            new MeshBasicMaterial({ side: Side.DoubleSide });
          material.map = texture;
          entry = {
            mesh: new Mesh(geometry, material),
            material,
            texture,
            signature: "",
          };
          entries.set(panel.id, entry);
          scene.add(entry.mesh);
        }
        const signature = `${panel.label}\n${panel.value}\n${panel.max}`;
        if (entry.signature !== signature) {
          draw(entry, panel);
          entry.signature = signature;
        }
        entry.mesh.position.set(panel.at.x, panel.at.y, panel.at.z);
        const rotation = screenQuaternion(view.upAt(panel.at), panel.yaw);
        entry.mesh.quaternion.set(
          rotation.x,
          rotation.y,
          rotation.z,
          rotation.w,
        );
        entry.mesh.scale.set(panel.width, panel.height, 1);
      }
    },
    clear(): void {
      for (const [id, entry] of entries) discard(id, entry);
    },
    dispose(): void {
      this.clear();
      geometry.dispose();
    },
  };
};
