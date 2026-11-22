/**
 * Low-res GPU occlusion pass for chunks and props.
 *
 * Renders bounding-box proxies with unique ID colors to a small offscreen target,
 * reads pixels back, and marks objects whose ID never appeared as occluded.
 * Inspired by voxelscape's occlusion culler; conservative: boxes are >= object.
 */

import { vec4, type Node } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  Color,
  InstancedMesh,
  Mesh,
  NodeMaterial,
  Scene,
  Side,
  Vector3,
  WebGLRenderTarget,
} from "@random-mesh/rmsl/scene";
import type { WebGLRenderer } from "@random-mesh/rmsl/scene";

export interface Occludable {
  id: number;
  min: [number, number, number];
  max: [number, number, number];
  mesh?: any;
  setVisible(visible: boolean): void;
  /** If false, always visible and not tested. */
  active?: boolean;
}

export const packId = (id: number): [number, number, number] => [
  (id & 0xff) / 255,
  ((id >>> 8) & 0xff) / 255,
  ((id >>> 16) & 0xff) / 255,
];

export const unpackId = (r: number, g: number, b: number): number =>
  r | (g << 8) | (b << 16);

export const scanVisible = (
  pixels: Uint8Array,
  maxId: number,
  byteCount = pixels.length,
): Set<number> => {
  const seen = new Uint8Array(maxId + 1);
  const end = Math.min(byteCount, pixels.length);
  for (let i = 0; i < end; i += 4) {
    const id = unpackId(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
    if (id > 0 && id <= maxId) seen[id] = 1;
  }
  const visible = new Set<number>();
  for (let id = 1; id <= maxId; id++) if (seen[id] === 1) visible.add(id);
  return visible;
};

class OcclusionProbeMaterial extends NodeMaterial {
  slotColor: [number, number, number] = [0, 0, 0];
  constructor() {
    super();
    this.side = Side.DoubleSide;
  }

  protected override buildVertexBody(b: Builder): Node<"vec4"> {
    const worldPosition = b.modelMatrix.mul(vec4(b.position, 1));
    b.positionWorld.assign(worldPosition.xyz);
    return b.projectionMatrix.mul(b.viewMatrix.mul(worldPosition));
  }

  protected override buildFragmentBody(b: Builder): Node<"vec4"> {
    const c = b.materialUniform("slotColor", "vec3", () => this.slotColor);
    return vec4(c, 1);
  }
}

type Probe = { mesh: any; material: OcclusionProbeMaterial; kind: "box" | "mesh" | "instanced"; src?: any };

export class OcclusionCuller {
  private readonly scene = new Scene();
  private readonly geometry = new BoxGeometry(1, 1, 1);
  private readonly probes: Probe[] = [];
  private target: WebGLRenderTarget | undefined;
  private readback: Uint8Array | undefined;
  private pending = false;
  private lastFrame = -9999;
  private lastPos = new Vector3(Infinity, Infinity, Infinity);
  private curPos = new Vector3(Infinity, Infinity, Infinity);
  private curDir = new Vector3(0, 0, -1);
  private lastDir = new Vector3(0, 0, -1);
  private lastVisible: Set<number> | undefined;
  private lastQueriedBounds = new Map<number, string>();
  private readonly everVisible = new Set<number>();
  readonly intervalFrames = 8;
  readonly moveThreshold = 8;
  readonly dirDotThreshold = 0.97;
  enabled = true;

  showAll(objects: readonly Occludable[]): void {
    for (const o of objects) o.setVisible(true);
  }

  private boundsKey(o: Occludable): string {
    return `${o.min[0]},${o.min[1]},${o.min[2]},${o.max[0]},${o.max[1]},${o.max[2]}`;
  }

  apply(objects: readonly Occludable[]): void {
    if (!this.enabled || !this.lastVisible) { this.showAll(objects); return; }
    const qdx = this.curPos.x - this.lastPos.x;
    const qdy = this.curPos.y - this.lastPos.y;
    const qdz = this.curPos.z - this.lastPos.z;
    const moved2 = qdx * qdx + qdy * qdy + qdz * qdz;
    const dot = this.curDir.x * this.lastDir.x + this.curDir.y * this.lastDir.y + this.curDir.z * this.lastDir.z;
    // Stale query result: camera moved/turned too far since last query, be conservative.
    if (moved2 > 24 * 24 || dot < 0.92) { this.showAll(objects); return; }
    for (const o of objects) {
      const cx = (o.min[0] + o.max[0]) / 2;
      const cy = (o.min[1] + o.max[1]) / 2;
      const cz = (o.min[2] + o.max[2]) / 2;
      const dx = cx - this.curPos.x, dy = cy - this.curPos.y, dz = cz - this.curPos.z;
      const near = dx * dx + dy * dy + dz * dz < 80 * 80;
      const queried = this.lastQueriedBounds.get(o.id);
      const dirty = queried === undefined || queried !== this.boundsKey(o);
      const seenOnce = this.everVisible.has(o.id);
      o.setVisible(near || dirty || !seenOnce ? true : this.lastVisible.has(o.id));
    }
  }

  update(
    renderer: WebGLRenderer,
    camera: any,
    objects: readonly Occludable[],
    frame: number,
    camPos: { x: number; y: number; z: number },
    camDir: { x: number; y: number; z: number },
  ): void {
    if (!this.enabled) { this.showAll(objects); return; }
    this.curPos.set(camPos.x, camPos.y, camPos.z);
    this.curDir.set(camDir.x, camDir.y, camDir.z);
    const active = objects.filter((o) => o.active !== false);
    if (active.length === 0) return;
    let maxId = 0;
    for (const o of active) if (o.id > maxId) maxId = o.id;
    this.apply(active);

    const dx = camPos.x - this.lastPos.x;
    const dy = camPos.y - this.lastPos.y;
    const dz = camPos.z - this.lastPos.z;
    const moved2 = dx * dx + dy * dy + dz * dz;
    const dot = camDir.x * this.lastDir.x + camDir.y * this.lastDir.y + camDir.z * this.lastDir.z;
    const due = frame - this.lastFrame >= this.intervalFrames || moved2 >= this.moveThreshold * this.moveThreshold || dot <= this.dirDotThreshold;
    if (!due || this.pending) return;
    this.lastFrame = frame;
    this.lastPos.set(camPos.x, camPos.y, camPos.z);
    this.lastDir.set(camDir.x, camDir.y, camDir.z);

    while (this.probes.length < active.length) {
      const material = new OcclusionProbeMaterial();
      const mesh = new Mesh(this.geometry, material);
      this.scene.add(mesh);
      this.probes.push({ mesh, material, kind: "box" });
    }
    for (let i = 0; i < this.probes.length; i++) {
      const p = this.probes[i]!;
      if (i >= active.length) { p.mesh.visible = false; continue; }
      const o = active[i]!;
      const cx = (o.min[0] + o.max[0]) / 2;
      const cy = (o.min[1] + o.max[1]) / 2;
      const cz = (o.min[2] + o.max[2]) / 2;
      const dxo = cx - camPos.x, dyo = cy - camPos.y, dzo = cz - camPos.z;
      const near = dxo * dxo + dyo * dyo + dzo * dzo < 80 * 80;
      if (near) { p.mesh.visible = false; continue; }

      const src = o.mesh;
      const wantInstanced = !!src?.isInstancedMesh && !!src.geometry;
      const wantMesh = !wantInstanced && !!src?.geometry && src.isMesh;
      if (wantInstanced) {
        if (p.kind !== "instanced" || p.src !== src) {
          this.scene.remove(p.mesh);
          p.mesh = new InstancedMesh(src.geometry, p.material, Math.max(1, src.count || 1));
          p.kind = "instanced"; p.src = src; this.scene.add(p.mesh);
        }
        const im = p.mesh as any;
        im.count = src.count || 0;
        // copy instance matrices
        if (src.instanceMatrix && im.instanceMatrix) {
          im.instanceMatrix.array.set(src.instanceMatrix.array.subarray(0, im.count * 16));
          im.instanceMatrix.needsUpdate = true;
        }
        im.position.copy(src.position); im.quaternion.copy(src.quaternion); im.scale.copy(src.scale);
        im.visible = im.count > 0;
      } else if (wantMesh) {
        if (p.kind !== "mesh" || p.src !== src) {
          this.scene.remove(p.mesh);
          p.mesh = new Mesh(src.geometry, p.material);
          p.kind = "mesh"; p.src = src; this.scene.add(p.mesh);
        }
        p.mesh.position.copy(src.position);
        p.mesh.quaternion.copy(src.quaternion);
        p.mesh.scale.copy(src.scale);
        p.mesh.visible = true;
      } else {
        if (p.kind !== "box") {
          this.scene.remove(p.mesh);
          p.mesh = new Mesh(this.geometry, p.material);
          p.kind = "box"; p.src = undefined; this.scene.add(p.mesh);
        }
        const pad = 2;
        const sx = Math.max(0.001, o.max[0] - o.min[0] + pad);
        const sy = Math.max(0.001, o.max[1] - o.min[1] + pad);
        const sz = Math.max(0.001, o.max[2] - o.min[2] + pad);
        p.mesh.position.set(cx, cy, cz);
        p.mesh.scale.set(sx, sy, sz);
        p.mesh.quaternion.set(0, 0, 0, 1);
        p.mesh.visible = true;
      }
      p.material.slotColor = packId(o.id);
    }

    const queriedBounds = new Map<number, string>();
    for (const o of active) queriedBounds.set(o.id, this.boundsKey(o));

    const w = 256, h = 144;
    if (!this.target) this.target = new WebGLRenderTarget(w, h);
    this.target.width = w; this.target.height = h;
    if (!this.readback || this.readback.length < w * h * 4) this.readback = new Uint8Array(w * h * 4);

    const prev = (renderer as any).getClearColor?.(new Color()) ?? new Color(0, 0, 0);
    const prevAlpha = (renderer as any).getClearAlpha?.() ?? 1;
    renderer.setClearColor?.(0x000000, 1);
    renderer.render(this.scene, camera, this.target);
    renderer.setClearColor?.(prev, prevAlpha);

    this.pending = true;
    const out = this.readback;
    void renderer.readPixelsAsync(this.target, out).then((pixels) => {
      const visible = scanVisible(pixels, maxId, w * h * 4);
      this.lastQueriedBounds = queriedBounds;
      if (visible.size === 0) this.lastVisible = undefined;
      else {
        this.lastVisible = visible;
        for (const id of visible) this.everVisible.add(id);
      }
    }).catch(() => {
      this.lastVisible = undefined;
    }).finally(() => { this.pending = false; });
  }

  dispose(): void {
    for (const p of this.probes) this.scene.remove(p.mesh);
    this.probes.length = 0;
  }
}
