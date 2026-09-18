// The viewport: an rmsl scene holding the voxel parts, the bone tree they hang
// off, and the joints drawn over both. A view syncs the rig into it and asks
// for a frame; the camera orbits the point the last frame was fitted to.
import type { RGBA, Vector3D } from "@big-mesh-studios/maths";
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import {
  boxSize,
  VoxelModelMaterial,
  bakeVolume,
} from "@big-mesh-studios/stacker/renderer";
import type { VoxelPart } from "../rig/anchors";
import type { Binding, Skeleton } from "../skeleton/types";
import type { Transform } from "../skeleton/transform";

/** A bone the pointer landed on, and how far it was from the pointer. */
export interface BoneHit {
  bone: string;
  distance: number;
}

/** How close to a joint the pointer has to come, in pixels, to take it. */
const JOINT_GRAB = 16;

/** How thick a bone is drawn, as a share of the rig's size. */
const BONE_RADIUS = 0.35;

/** How large a joint is drawn, as a share of the rig's size. */
const JOINT_RADIUS = 0.7;

const JOINT_COLOUR = 0x5fcde4;
const JOINT_SELECTED = 0xfbf236;
const BONE_COLOUR = 0x847e87;

interface PartEntry {
  mesh: Mesh;
  material: VoxelModelMaterial;
  part: VoxelPart;
  parent: Object3D | null;
}

interface BoneEntry {
  group: Object3D;
  joint: Mesh;
  segment: Mesh;
  parent: string | null;
}

/** The viewport a rig is drawn in. */
export class RigScene {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;

  private readonly renderer: WebGLRenderer;
  private readonly rigRoot = new Group();
  private readonly overlay = new Group();

  private readonly parts = new Map<string, PartEntry>();
  private readonly bones = new Map<string, BoneEntry>();

  private yaw = Math.PI / 5;
  private pitch = Math.PI / 9;
  private distance = 90;
  private readonly target = new Vector3(0, 12, 0);

  private jointGeometry: SphereGeometry;
  private segmentGeometry: CylinderGeometry;
  private jointMaterial: MeshBasicMaterial;
  private selectedJointMaterial: MeshBasicMaterial;
  private segmentMaterial: MeshBasicMaterial;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer(canvas, {
      antialias: false,
      depth: true,
    });
    this.renderer.setClearColor(0x14161c, 1);

    this.camera = new PerspectiveCamera(45, 1, 0.1, 5000);

    this.scene.add(this.rigRoot);
    this.overlay.visible = true;
    this.scene.add(this.overlay);

    this.jointGeometry = new SphereGeometry(1, 12, 8);
    this.segmentGeometry = new CylinderGeometry(1, 1, 1, 8);
    this.jointMaterial = new MeshBasicMaterial({ color: JOINT_COLOUR });
    this.selectedJointMaterial = new MeshBasicMaterial({
      color: JOINT_SELECTED,
    });
    this.segmentMaterial = new MeshBasicMaterial({ color: BONE_COLOUR });

    // The bones are drawn over the voxels they stand inside, the way a rigging
    // tool shows a skeleton through the mesh it drives.
    for (const material of [
      this.jointMaterial,
      this.selectedJointMaterial,
      this.segmentMaterial,
    ]) {
      material.depthTest = false;
      material.depthWrite = false;
    }

    this.updateCamera();
  }

  /** The canvas as it is drawn at, in device pixels. */
  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Brings the meshes in step with the parts a rig holds. */
  setParts(parts: VoxelPart[], palette: RGBA[]): void {
    const held = new Set(parts.map((part) => part.name));

    for (const [name, entry] of this.parts) {
      if (!held.has(name)) {
        entry.mesh.parent?.remove(entry.mesh);
        this.parts.delete(name);
      }
    }

    for (const part of parts) {
      let entry = this.parts.get(part.name);

      if (entry === undefined) {
        const material = new VoxelModelMaterial();
        // Flat palette colour: the raymarcher is what gives a voxel its face,
        // and a rig being posed does not need a light to show its shape.
        material.unlit = true;
        const mesh = new Mesh(
          new BoxGeometry(
            boxSize(part.solved.dimensions).width,
            boxSize(part.solved.dimensions).height,
            boxSize(part.solved.dimensions).depth,
          ),
          material,
        );
        entry = { mesh, material, part, parent: null };
        this.parts.set(part.name, entry);
      } else {
        entry.part = part;
      }

      bakeVolume(
        entry.material,
        part.solved.dimensions,
        part.solved.voxels,
        palette,
      );
    }
  }

  /** Removes every part, for a rig with none. */
  clearParts(): void {
    for (const [, entry] of this.parts) {
      entry.mesh.parent?.remove(entry.mesh);
    }
    this.parts.clear();
  }

  /**
   * Puts every bone and every part where the pose and the bindings carry them.
   * A bone's group is parented into its parent's group, and a bound part's mesh
   * into its bone's, so the scene graph does the carrying from there.
   */
  apply(
    skeleton: Skeleton,
    bindings: Binding[],
    posed: Map<string, Transform>,
    selectedBone: string | null,
  ): void {
    const held = new Set(skeleton.bones.map((bone) => bone.id));

    for (const [id, entry] of this.bones) {
      if (!held.has(id)) {
        entry.group.parent?.remove(entry.group);
        entry.joint.parent?.remove(entry.joint);
        entry.segment.parent?.remove(entry.segment);
        this.bones.delete(id);
      }
    }

    for (const bone of skeleton.bones) {
      let entry = this.bones.get(bone.id);

      if (entry === undefined) {
        const group = new Group();
        group.name = bone.id;
        const joint = new Mesh(this.jointGeometry, this.jointMaterial);
        const segment = new Mesh(this.segmentGeometry, this.segmentMaterial);
        this.overlay.add(joint, segment);
        entry = { group, joint, segment, parent: null };
        this.bones.set(bone.id, entry);
      }

      const transform = posed.get(bone.id) ?? {
        position: bone.position,
        rotation: bone.rotation,
        scale: bone.scale,
      };

      entry.group.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z,
      );
      entry.group.quaternion.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.w,
      );
      entry.group.scale.setScalar(transform.scale);

      const parent =
        bone.parent === null ? undefined : this.bones.get(bone.parent)?.group;
      this.reparent(entry.group, parent ?? this.rigRoot);
      entry.parent = bone.parent;

      entry.joint.material =
        bone.id === selectedBone
          ? this.selectedJointMaterial
          : this.jointMaterial;
    }

    for (const part of this.parts.values()) {
      const binding = bindings.find((held) => held.part === part.part.name);
      const bone =
        binding === undefined ? undefined : this.bones.get(binding.bone);

      if (binding !== undefined && bone !== undefined) {
        part.mesh.position.set(
          binding.position.x,
          binding.position.y,
          binding.position.z,
        );
        part.mesh.quaternion.set(
          binding.rotation.x,
          binding.rotation.y,
          binding.rotation.z,
          binding.rotation.w,
        );
        part.mesh.scale.setScalar(binding.scale);
        this.reparent(part.mesh, bone.group);
        part.parent = bone.group;
      } else {
        const anchor = part.part.anchor;
        part.mesh.position.set(
          anchor.position.x,
          anchor.position.y,
          anchor.position.z,
        );
        part.mesh.quaternion.set(
          anchor.rotation.x,
          anchor.rotation.y,
          anchor.rotation.z,
          anchor.rotation.w,
        );
        part.mesh.scale.setScalar(anchor.scale);
        this.reparent(part.mesh, this.rigRoot);
        part.parent = this.rigRoot;
      }
    }
  }

  /** Moves `object` under `parent`, leaving it where it is where it already is. */
  private reparent(object: Object3D, parent: Object3D): void {
    if (object.parent !== parent) {
      parent.add(object);
    }
  }

  /** Draws one frame, with the joints brought up to date first. */
  render(): void {
    this.rigRoot.updateMatrixWorld(true);
    this.updateOverlay();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  /** Stands a joint and a bone on every bone of the tree, in world space. */
  private updateOverlay(): void {
    const size = Math.max(0.6, this.distance * 0.012);

    for (const [id, entry] of this.bones) {
      const at = entry.group.getWorldPosition(new Vector3());

      entry.joint.position.copy(at);
      entry.joint.scale.setScalar(JOINT_RADIUS * size);
      entry.joint.visible = true;

      const parent =
        entry.parent === null ? undefined : this.bones.get(entry.parent);
      if (parent === undefined) {
        entry.segment.visible = false;
        continue;
      }

      const from = parent.group.getWorldPosition(new Vector3());
      orientSegment(entry.segment, from, at, BONE_RADIUS * size);
      entry.segment.visible = true;
      void id;
    }
  }

  /** Points the camera at the rig from the current orbit. */
  private updateCamera(): void {
    const cosPitch = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + this.distance * cosPitch * Math.sin(this.yaw),
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * cosPitch * Math.cos(this.yaw),
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  /** Turns the view by a drag across the canvas. */
  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.01;
    this.pitch = clamp(this.pitch + dy * 0.01, -1.5, 1.5);
  }

  /** Moves the view nearer or further by a wheel step. */
  zoom(delta: number): void {
    this.distance = clamp(this.distance * Math.exp(delta * 0.0012), 4, 4000);
  }

  /**
   * Moves the view nearer or further by a factor, which is what a pinch reads
   * its fingers as: spreading them past one comes nearer, drawing them in past
   * one goes further.
   */
  zoomBy(factor: number): void {
    const by = factor > 0 ? factor : 1;
    this.distance = clamp(this.distance / by, 4, 4000);
  }

  /** Slides the point the view is framed on across the screen. */
  pan(dx: number, dy: number): void {
    const scale = this.distance * 0.0018;
    // The camera's own axes, read off its world matrix: the first column is
    // its right, the second its up.
    const elements = this.camera.matrixWorld.elements;
    const right = new Vector3(elements[0], elements[1], elements[2]);
    const up = new Vector3(elements[4], elements[5], elements[6]);

    this.target.add(right.multiplyScalar(-dx * scale));
    this.target.add(up.multiplyScalar(dy * scale));
  }

  /** Frames a sphere: centres the view on it and pulls back to hold it. */
  fit(centre: Vector3D, radius: number): void {
    this.target.set(centre.x, centre.y, centre.z);
    const half = (this.camera.fov * Math.PI) / 360;
    this.distance = clamp((radius / Math.tan(half)) * 1.6, 4, 4000);
  }

  /**
   * The bone joint nearest the pointer, within `radius` pixels. A finger is a
   * wider pointer than a mouse, so a caller on a touch screen passes a larger
   * radius than the default.
   */
  boneAt(
    pointer: { x: number; y: number },
    size: { width: number; height: number },
    radius: number = JOINT_GRAB,
  ): string | null {
    let best: BoneHit | undefined;

    for (const [id, entry] of this.bones) {
      const at = entry.group.getWorldPosition(new Vector3());
      const screen = this.project(at, size);
      if (screen === undefined) {
        continue;
      }
      const distance = Math.hypot(screen.x - pointer.x, screen.y - pointer.y);
      if (
        distance <= radius &&
        (best === undefined || distance < best.distance)
      ) {
        best = { bone: id, distance };
      }
    }

    return best?.bone ?? null;
  }

  /**
   * Where the pointer meets the plane through the framed point that faces the
   * camera: the point a joint dropped under the pointer is placed at.
   */
  groundAt(
    pointer: { x: number; y: number },
    size: { width: number; height: number },
  ): Vector3D | null {
    const origin = new Vector3();
    const direction = new Vector3();
    this.ray(pointer, size, origin, direction);

    const normal = new Vector3()
      .subVectors(this.target, this.camera.position)
      .normalize();
    const denominator = direction.dot(normal);
    if (Math.abs(denominator) < 1e-6) {
      return null;
    }

    const toPlane = new Vector3().subVectors(this.target, origin);
    const along = toPlane.dot(normal) / denominator;
    const point = origin.clone().add(direction.clone().multiplyScalar(along));

    return { x: point.x, y: point.y, z: point.z };
  }

  /** A ray from the camera through a point on the canvas, in world space. */
  private ray(
    pointer: { x: number; y: number },
    size: { width: number; height: number },
    origin: Vector3,
    direction: Vector3,
  ): void {
    const x = (pointer.x / size.width) * 2 - 1;
    const y = 1 - (pointer.y / size.height) * 2;

    const viewProjection = new Matrix4()
      .copy(this.camera.projectionMatrix)
      .multiply(this.camera.matrixWorldInverse);
    const inverse = viewProjection.invert();

    const near = new Vector3(x, y, -1).applyMatrix4(inverse);
    const far = new Vector3(x, y, 1).applyMatrix4(inverse);
    origin.copy(near);
    direction.subVectors(far, near).normalize();
  }

  /** Where a world point lands on the canvas, in pixels from its top left. */
  private project(
    point: Vector3,
    size: { width: number; height: number },
  ): { x: number; y: number } | undefined {
    const viewProjection = new Matrix4()
      .copy(this.camera.projectionMatrix)
      .multiply(this.camera.matrixWorldInverse);
    const projected = point.clone().applyMatrix4(viewProjection);

    if (projected.z < -1 || projected.z > 1) {
      return undefined;
    }

    return {
      x: ((projected.x + 1) / 2) * size.width,
      y: ((1 - projected.y) / 2) * size.height,
    };
  }
}

/** Places a segment between two points, its length and thickness set to fit. */
function orientSegment(
  segment: Mesh,
  from: Vector3,
  to: Vector3,
  radius: number,
): void {
  const direction = new Vector3().subVectors(to, from);
  const length = direction.length();

  if (length < 1e-4) {
    segment.visible = false;
    return;
  }

  direction.multiplyScalar(1 / length);
  segment.position.copy(from).add(direction.clone().multiplyScalar(length / 2));
  segment.scale.set(radius, length, radius);
  orient(UP, direction, segment.quaternion);
}

const UP = new Vector3(0, 1, 0);

/** Turns `object` from pointing along `from` to pointing along `to`. */
function orient(from: Vector3, to: Vector3, rotation: Quaternion): void {
  const dot = clamp(from.dot(to), -1, 1);
  const axis = new Vector3().crossVectors(from, to);

  if (axis.lengthSq() < 1e-8) {
    if (dot > 0) {
      rotation.set(0, 0, 0, 1);
    } else {
      rotation.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
    }
    return;
  }

  axis.normalize();
  rotation.setFromAxisAngle(axis, Math.acos(dot));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
