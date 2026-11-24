/**
 * View-frustum culling and a low-res GPU occlusion pass for chunks and props.
 *
 * **The frustum test runs first and runs always**, because it is the cheapest cull there is: a
 * bounding box behind the camera or past its far plane cannot be seen, and hiding it costs six
 * dot products. The occlusion pass is what catches the boxes *inside* the frustum that something
 * nearer still covers — it renders them with unique ID colors to a small offscreen target, reads
 * pixels back, and marks the IDs that never appeared as occluded. Inspired by voxelscape's culler,
 * which does the same two tests in the same order and only spends the occlusion pass on what the
 * frustum already kept.
 *
 * **The occlusion pass is off by default** (see `enabled`): on fill-rate-bound hardware it costs
 * more than it saves, and its readback lag is what makes a newly-visible mesh pop. The frustum
 * culling is the part that earns its keep, and it is independent of the flag.
 *
 * **Conservative on both counts.** A box is >= the object it stands for, so a box hidden means the
 * object is hidden; and an object neither the frustum nor the readback can prove hidden stays
 * visible. The cost of being wrong is a visible mesh, not a hole in the world.
 */

import { vec4, type Node } from "@random-mesh/rmsl";
import {
  BoxGeometry,
  Builder,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  NodeMaterial,
  Scene,
  Side,
  Vector3,
  WebGLRenderTarget,
} from "@random-mesh/rmsl/scene";
import type { WebGLRenderer } from "@random-mesh/rmsl/scene";

/** One view-frustum plane as `[a, b, c, d]` of `a*x + b*y + c*z + d`. */
export type FrustumPlane = [number, number, number, number];

/** A box in the shape every `Occludable` already carries its bounds in. */
export type FrustumBox = readonly [number, number, number];

/**
 * The six planes of a view-projection matrix, extracted the Gribb–Hartmann way (not normalized —
 * the sign tests below never need the magnitude). `out` is written in place when given, so a frame
 * loop can keep one array; the planes are named for which side of the frustum they bound.
 */
export const frustumPlanes = (
  viewProjection: Matrix4,
  out?: FrustumPlane[],
): FrustumPlane[] => {
  const e = viewProjection.elements;
  const planes: FrustumPlane[] =
    out ?? [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
  const set = (i: number, a: number, b: number, c: number, d: number): void => {
    const p = planes[i]!;
    p[0] = a;
    p[1] = b;
    p[2] = c;
    p[3] = d;
  };
  set(0, e[3]! - e[0]!, e[7]! - e[4]!, e[11]! - e[8]!, e[15]! - e[12]!); // right
  set(1, e[3]! + e[0]!, e[7]! + e[4]!, e[11]! + e[8]!, e[15]! + e[12]!); // left
  set(2, e[3]! + e[1]!, e[7]! + e[5]!, e[11]! + e[9]!, e[15]! + e[13]!); // bottom
  set(3, e[3]! - e[1]!, e[7]! - e[5]!, e[11]! - e[9]!, e[15]! - e[13]!); // top
  set(4, e[3]! + e[2]!, e[7]! + e[6]!, e[11]! + e[10]!, e[15]! + e[14]!); // far
  set(5, e[3]! - e[2]!, e[7]! - e[6]!, e[11]! - e[10]!, e[15]! - e[14]!); // near
  return planes;
};

/**
 * Whether the axis-aligned box between `min` and `max` is at least partly inside the frustum.
 *
 * The box is outside the moment the corner furthest along a plane's normal falls behind it — the
 * "positive vertex" test. Testing that one corner rather than all eight makes a false "outside"
 * impossible: the plane can only cut the box if its positive corner is in front of it.
 */
export const boxInFrustum = (
  min: FrustumBox,
  max: FrustumBox,
  planes: readonly FrustumPlane[],
): boolean => {
  for (const [a, b, c, d] of planes) {
    const x = a >= 0 ? max[0] : min[0];
    const y = b >= 0 ? max[1] : min[1];
    const z = c >= 0 ? max[2] : min[2];
    if (a * x + b * y + c * z + d < 0) return false;
  }
  return true;
};

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
  /** Ids the frustum kept this frame, and the frame before: the difference is what just came into view. */
  private inView = new Set<number>();
  private wasInView = new Set<number>();
  /** Reused across frames so the frustum costs no allocation in the steady state. */
  private readonly viewProjection = new Matrix4();
  private readonly planes: FrustumPlane[] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  readonly intervalFrames = 8;
  readonly moveThreshold = 8;
  readonly dirDotThreshold = 0.97;
  /**
   * Whether the occlusion pass runs. **Off by default**, because on the fill-rate-bound hardware
   * this project targets it costs more than it saves: the pass re-renders every occludable's
   * geometry at 256×144 and reads pixels back, and the triangles it hides are not the bottleneck.
   * Measured on the animal-hospital demo it was worth about 8 FPS to turn off. Its readback also
   * lands a frame or two after the frame it answers, which is where the visible pop comes from.
   *
   * Frustum culling is *not* affected by this flag — `apply` runs it either way. Turn this on to
   * re-enable the occlusion pass; `__spacescape.occlusion.enabled = true` does it at runtime.
   */
  enabled = false;

  /**
   * Shows everything, as a reset before the frame's own culling runs.
   *
   * The app calls this before the feed passes, which each cull for their own camera through
   * `cullFor`. It is kept as the floor under that: a draw path that forgets to cull shows the whole
   * world rather than whatever the previous frame's camera happened to leave visible. The main
   * pass's `apply` is what hides, and it runs after every feed.
   */
  showAll(objects: readonly Occludable[]): void {
    for (const o of objects) o.setVisible(true);
  }

  private boundsKey(o: Occludable): string {
    return `${o.min[0]},${o.min[1]},${o.min[2]},${o.max[0]},${o.max[1]},${o.max[2]}`;
  }

  /**
   * Recomputes this frame's frustum from `camera`. Called once per `update`, so the plane test and
   * the occlusion pass cannot disagree about which view they are culling for.
   */
  private cullTo(camera: any): void {
    camera?.updateMatrixWorld?.(true);
    this.viewProjection
      .copy(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse);
    frustumPlanes(this.viewProjection, this.planes);
  }

  /** Whether `o` survives the frustum test this frame. */
  private inFrustum(o: Occludable): boolean {
    return boxInFrustum(o.min, o.max, this.planes);
  }

  /**
   * Hides what the frustum alone rules out. Always runs — unlike the occlusion pass, this needs no
   * readback and no interval, so it is correct to do on every frame even when the culler is off.
   *
   * **Does not touch the came-into-view tracking.** A feed's culling is for a different eye and must
   * not make the main camera think a mesh just entered its view.
   */
  private frustumOnly(objects: readonly Occludable[]): void {
    for (const o of objects) o.setVisible(this.inFrustum(o));
  }

  /**
   * Hides what `camera` cannot see, by frustum alone.
   *
   * **For a pass drawn from a camera other than the main one** — a screen feed, a photo, a HUD
   * monitor. Those are second views of the same scene, and the occludables' `visible` flags are
   * shared, so each pass has to be culled for its own eye immediately before it draws. The main
   * pass's `update` runs after all of them and restores the main camera's answer, so a feed's
   * culling cannot leak into the frame the player sees.
   *
   * Deliberately frustum-only: the occlusion pass's readback is answered for the main camera, and a
   * feed's pixels are far too small to pay for a second one.
   */
  cullFor(camera: any, objects: readonly Occludable[]): void {
    this.cullTo(camera);
    this.frustumOnly(objects);
  }

  /**
   * Shows what the frustum kept and hides the rest, then remembers it as this frame's view.
   *
   * The "then remembers" is the flash fix. A mesh the frustum only just admitted is one the player
   * has just turned or walked onto; waiting for the next occlusion readback to agree would leave it
   * hidden for up to `intervalFrames` — the visible pop the interval exists to cause. Recording the
   * view here lets `apply` tell "was already in view and the query says covered" from "has just
   * come into view and the query has not looked at it yet".
   */
  private showInView(objects: readonly Occludable[]): void {
    for (const o of objects) o.setVisible(this.inView.has(o.id));
    const spent = this.wasInView;
    this.wasInView = this.inView;
    this.inView = spent;
  }

  apply(objects: readonly Occludable[]): void {
    this.inView.clear();
    for (const o of objects) if (this.inFrustum(o)) this.inView.add(o.id);

    if (!this.enabled || !this.lastVisible) { this.showInView(objects); return; }
    const qdx = this.curPos.x - this.lastPos.x;
    const qdy = this.curPos.y - this.lastPos.y;
    const qdz = this.curPos.z - this.lastPos.z;
    const moved2 = qdx * qdx + qdy * qdy + qdz * qdz;
    const dot = this.curDir.x * this.lastDir.x + this.curDir.y * this.lastDir.y + this.curDir.z * this.lastDir.z;
    // Stale query result: camera moved/turned too far since last query, be conservative.
    if (moved2 > 24 * 24 || dot < 0.92) { this.showInView(objects); return; }
    for (const o of objects) {
      // **The frustum decides before the readback does.** A box outside the view cannot be seen
      // whatever the last query said, and this is the one test that is always fresh.
      if (!this.inView.has(o.id)) { o.setVisible(false); continue; }
      // **Just entered the view**: the query that could have covered it has not run since, so show
      // it now rather than wait for the next readback. This is the flash, removed at its source.
      const entered = !this.wasInView.has(o.id);
      const cx = (o.min[0] + o.max[0]) / 2;
      const cy = (o.min[1] + o.max[1]) / 2;
      const cz = (o.min[2] + o.max[2]) / 2;
      const dx = cx - this.curPos.x, dy = cy - this.curPos.y, dz = cz - this.curPos.z;
      const near = dx * dx + dy * dy + dz * dz < 80 * 80;
      const queried = this.lastQueriedBounds.get(o.id);
      const dirty = queried === undefined || queried !== this.boundsKey(o);
      const seenOnce = this.everVisible.has(o.id);
      o.setVisible(entered || near || dirty || !seenOnce ? true : this.lastVisible.has(o.id));
    }
    const spent = this.wasInView;
    this.wasInView = this.inView;
    this.inView = spent;
  }

  update(
    renderer: WebGLRenderer,
    camera: any,
    objects: readonly Occludable[],
    frame: number,
    camPos: { x: number; y: number; z: number },
    camDir: { x: number; y: number; z: number },
  ): void {
    this.curPos.set(camPos.x, camPos.y, camPos.z);
    this.curDir.set(camDir.x, camDir.y, camDir.z);
    const active = objects.filter((o) => o.active !== false);
    if (active.length === 0) return;
    this.cullTo(camera);
    this.apply(active);
    if (!this.enabled) return;
    let maxId = 0;
    for (const o of active) if (o.id > maxId) maxId = o.id;

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
      // **The probe pass only draws what the frustum kept.** A box behind the camera cannot occlude
      // anything in front of it, so drawing it would be pixels spent to learn nothing — and the
      // frustum test is exactly the one voxelscape's culler runs before its own probe pass.
      if (!this.inFrustum(o)) { p.mesh.visible = false; continue; }
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
