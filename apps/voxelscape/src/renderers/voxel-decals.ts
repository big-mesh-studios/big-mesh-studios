// The flat marks a place script lays on the world: a road arrow, a target
// cross, a range ring, a splatter. Each mark is a single quad lying in the
// ground plane, carrying a canvas drawn with one of a fixed set of shapes in
// the mark's colour. The shape vocabulary is fixed the way the sound and
// particle vocabularies are, so a place names a mark the world already knows
// how to draw rather than supplying an image of its own.
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Side,
  Texture,
  Vector3,
} from "@random-mesh/rmsl/scene";
import type { DecalKind, DecalPose } from "../world/scripted-decal";

/** The square canvas one mark's shape is drawn on, in pixels. */
const CANVAS_PX = 128;
/** The mark drawn as an arrow pointing along -z before its yaw. */
const ARROW_POINTS: Array<readonly [number, number]> = [
  [0.5, 0.14],
  [0.78, 0.62],
  [0.6, 0.62],
  [0.5, 0.44],
  [0.4, 0.62],
  [0.22, 0.62],
];
/** The marks a splatter is made of, as `[x, y, radius]` of the canvas centre. */
const SPLAT_BLOBS: Array<readonly [number, number, number]> = [
  [0, 0, 0.26],
  [0.24, -0.14, 0.12],
  [-0.2, 0.18, 0.1],
  [0.1, 0.24, 0.08],
  [-0.24, -0.18, 0.07],
];

/** One drawn mark: its quad, texture, and what the canvas was drawn with. */
interface Mark {
  mesh: Mesh;
  texture: Texture;
  signature: string;
}

/** Draws the marks the host reports, one flat camera-independent quad each. */
export class VoxelDecals {
  /** The scene group the marks draw in; add it to the world's scene. */
  readonly group = new Group();
  private readonly geometry = new PlaneGeometry(1, 1);
  private readonly marks = new Map<string, Mark>();

  constructor(private readonly getDecals: () => DecalPose[]) {}

  /** Brings the marks in step with the host's list. */
  tick(): void {
    // A canvas is a browser object; a caller outside one draws no marks.
    if (typeof document === "undefined") {
      return;
    }
    const current = this.getDecals();
    for (const pose of current) {
      const signature = signatureOf(pose);
      let mark = this.marks.get(pose.id);
      if (mark === undefined || mark.signature !== signature) {
        if (mark !== undefined) {
          this.discard(pose.id, mark);
        }
        mark = this.build(pose, signature);
        this.group.add(mark.mesh);
        this.marks.set(pose.id, mark);
      }
      mark.mesh.position.set(pose.x, pose.y, pose.z);
      mark.mesh.scale.set(pose.size, pose.size, 1);
      // Yaw about the world's vertical axis, then lay the quad flat.
      SPIN.setFromAxisAngle(UP, pose.yaw);
      mark.mesh.quaternion.copy(SPIN).multiply(FLAT);
    }
    for (const [id, mark] of this.marks) {
      if (!current.some((pose) => pose.id === id)) {
        this.discard(id, mark);
      }
    }
  }

  /** Removes every mark, leaving the set ready for a fresh script. */
  clear(): void {
    for (const [id, mark] of this.marks) {
      this.discard(id, mark);
    }
  }

  private discard(id: string, mark: Mark): void {
    this.group.remove(mark.mesh);
    mark.texture.dispose();
    this.marks.delete(id);
  }

  /** Draws `pose`'s shape onto a fresh canvas and lays it flat. */
  private build(pose: DecalPose, signature: string): Mark {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_PX;
    canvas.height = CANVAS_PX;
    const ctx = canvas.getContext("2d")!;
    const [r, g, b] = pose.color;
    const colour = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    drawShape(ctx, pose.kind, colour, CANVAS_PX);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: Side.DoubleSide,
    });
    material.depthWrite = false;

    return {
      mesh: new Mesh(this.geometry, material),
      texture,
      signature,
    };
  }
}

/** Draws one mark kind, centred on a `size`-pixel square canvas. */
const drawShape = (
  ctx: CanvasRenderingContext2D,
  kind: DecalKind,
  colour: string,
  size: number,
): void => {
  const half = size / 2;
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "arrow") {
    ctx.beginPath();
    ARROW_POINTS.forEach(([x, y], index) => {
      const px = x * size;
      const py = y * size;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (kind === "cross") {
    ctx.lineWidth = size * 0.16;
    ctx.beginPath();
    ctx.moveTo(half - size * 0.28, half - size * 0.28);
    ctx.lineTo(half + size * 0.28, half + size * 0.28);
    ctx.moveTo(half + size * 0.28, half - size * 0.28);
    ctx.lineTo(half - size * 0.28, half + size * 0.28);
    ctx.stroke();
    return;
  }
  if (kind === "ring") {
    ctx.lineWidth = size * 0.12;
    ctx.beginPath();
    ctx.arc(half, half, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // A splatter: a cluster of fixed blobs, so it draws the same every time.
  for (const [x, y, radius] of SPLAT_BLOBS) {
    ctx.beginPath();
    ctx.arc(half + x * size, half + y * size, radius * size, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** The shape and colour a mark draws, so an unchanged one redraws nothing. */
const signatureOf = (pose: DecalPose): string =>
  `${pose.kind}|${pose.color[0].toFixed(3)},${pose.color[1].toFixed(3)},${pose.color[2].toFixed(3)}`;

/** Reused between the marks, a turn being read off them and not kept. */
const SPIN = new Quaternion();
const FLAT = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  -Math.PI / 2,
);
const UP = new Vector3(0, 1, 0);
