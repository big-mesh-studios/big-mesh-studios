// The world-space labels a place script shows: an NPC's name, a score over a
// head, a sign. Each label is a single quad carrying a canvas texture drawn
// with the label's text, turned to face the camera every frame so it stays
// readable from anywhere. A label whose text or colour has not changed keeps
// the canvas it already has, so only a changing label redraws.
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Side,
  Texture,
  type PerspectiveCamera,
} from "@random-mesh/rmsl/scene";
import type { BillboardPose } from "../world/scripted-billboard";

/** The height, in canvas pixels, a label's text is drawn at. */
const FONT_PX = 48;
/** How much horizontal room the text gets either side, in canvas pixels. */
const PADDING = 16;
/** The canvas height one line of text takes, in pixels. */
const LINE_HEIGHT = Math.round(FONT_PX * 1.35);
/** The widest a label's canvas may grow before the text is clipped. */
const MAX_CANVAS_WIDTH = 1024;

/** One drawn label: its quad, its texture, and how large its canvas came out. */
interface Label {
  mesh: Mesh;
  texture: Texture;
  canvasWidth: number;
  canvasHeight: number;
  /** The text and colour the canvas was drawn with, so an unchanged label keeps it. */
  signature: string;
}

/** Draws the labels the host reports, one camera-facing quad per label. */
export class VoxelBillboards {
  /** The scene group the labels draw in; add it to the world's scene. */
  readonly group = new Group();
  private readonly labels = new Map<string, Label>();

  constructor(
    private readonly getBillboards: () => BillboardPose[],
    private readonly getCamera: () => PerspectiveCamera,
  ) {}

  /** Brings the labels in step with the host's list and turns them to the camera. */
  tick(): void {
    // A canvas is a browser object; a caller outside one draws no labels.
    if (typeof document === "undefined") {
      return;
    }
    const current = this.getBillboards();
    for (const pose of current) {
      const signature = signatureOf(pose);
      let label = this.labels.get(pose.id);
      if (label === undefined || label.signature !== signature) {
        if (label !== undefined) {
          this.discard(pose.id, label);
        }
        label = this.build(pose, signature);
        this.group.add(label.mesh);
        this.labels.set(pose.id, label);
      }
      const aspect = label.canvasWidth / label.canvasHeight;
      label.mesh.scale.set(pose.scale * aspect, pose.scale, 1);
      label.mesh.position.set(pose.x, pose.y, pose.z);
      label.mesh.quaternion.copy(this.getCamera().quaternion);
    }
    for (const [id, label] of this.labels) {
      if (!current.some((pose) => pose.id === id)) {
        this.discard(id, label);
      }
    }
  }

  /** Removes every label, leaving the set ready for a fresh script. */
  clear(): void {
    for (const [id, label] of this.labels) {
      this.discard(id, label);
    }
  }

  private discard(id: string, label: Label): void {
    this.group.remove(label.mesh);
    label.mesh.geometry.dispose();
    label.texture.dispose();
    this.labels.delete(id);
  }

  /** Draws `pose`'s text onto a fresh canvas and wraps it in a quad. */
  private build(pose: BillboardPose, signature: string): Label {
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d")!;
    measure.font = `${FONT_PX}px sans-serif`;
    const width = Math.min(
      MAX_CANVAS_WIDTH,
      Math.ceil(measure.measureText(pose.text).width) + PADDING * 2,
    );
    canvas.width = Math.max(8, width);
    canvas.height = LINE_HEIGHT;
    // Setting the canvas size clears the context, so the font is set again.
    const draw = canvas.getContext("2d")!;
    draw.font = `${FONT_PX}px sans-serif`;
    draw.textAlign = "center";
    draw.textBaseline = "middle";
    const [r, g, b] = pose.color;
    draw.lineWidth = 6;
    draw.strokeStyle = "rgba(0, 0, 0, 0.75)";
    draw.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    draw.strokeText(pose.text, canvas.width / 2, canvas.height / 2);
    draw.fillText(pose.text, canvas.width / 2, canvas.height / 2);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: Side.DoubleSide,
    });
    material.depthWrite = false;

    // A canvas uploads without a vertical flip, so a quad's own V runs opposite
    // the canvas rows: invert it once here so the label's first line sits at its
    // top rather than hanging under it.
    const geometry = new PlaneGeometry(1, 1);
    const uv = geometry.uv;
    if (uv !== undefined) {
      const values = Float32Array.from(uv.array);
      for (let i = 1; i < values.length; i += 2) {
        values[i] = 1 - values[i];
      }
      uv.setArray(values);
      uv.needsUpdate = true;
    }

    return {
      mesh: new Mesh(geometry, material),
      texture,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      signature,
    };
  }
}

/** The text and colour a label draws, so an unchanged one redraws nothing. */
const signatureOf = (pose: BillboardPose): string =>
  `${pose.text}|${pose.color[0].toFixed(3)},${pose.color[1].toFixed(3)},${pose.color[2].toFixed(3)}`;
