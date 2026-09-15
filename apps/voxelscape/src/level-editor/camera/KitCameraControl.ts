import {
  Quaternion,
  Vector2,
  Vector3,
  type Camera,
} from "@random-mesh/rmsl/scene";
import {
  createEffect,
  createRoot,
  createSignal,
  untrack,
  type Accessor,
} from "solid-js";
import {
  quatFromAxisAngle,
  quatFromUV,
  quatFromWU,
  quatRotate,
  rayPlanePoint,
  rayPointAt,
  rigLookingAt,
  rigPointTo,
  rigU,
  rigV,
  rigW,
  rigVectorFrom,
  rigVectorTo,
  v2,
  v3,
  type CameraRay,
  type Rig,
} from "./rig";
import type {
  CameraControl,
  CameraControlsKind,
  Projection,
} from "./CameraControl";

/**
 * How close, in screen pixels, a point projected to the canvas must be to the
 * cursor to count as under it.
 */
const SNAP_DIST = 10.0;
const SNAP_DIST_SQUARED = SNAP_DIST * SNAP_DIST;
/**
 * How far a wheel notch glides the camera when nothing is under the cursor,
 * in world units.
 */
const RAY_GLIDE_SPEED = 2.0;
/**
 * Degrees per pixel of orbit drag. The original controller's
 * `Quaternion.fromAxisAngle` took degrees, so its `0.6` sensitivity was
 * degrees; `@random-mesh/rmsl/scene` takes radians, so the drag is converted.
 */
const ORBIT_DEGREES_PER_PIXEL = 0.6;
const DEG_TO_RAD = Math.PI / 180;

/** A hit found under the cursor, for aiming the zoom at it. */
export interface PickingDistance {
  t: number;
  objectId: string;
}

export type PickingDist = (params: {
  projectPtToScreen: (pt: Vector3) => Vector2 | undefined;
  mousePos: Vector2;
  mouseRay: CameraRay;
  snapDistSquared: number;
}) => PickingDistance | undefined;

export interface KitControlsCoreParams {
  projectPtToScreen: (pt: Vector3) => Vector2 | undefined;
  mousePos: Accessor<Vector2 | undefined>;
  mouseRay: () => CameraRay | undefined;
  pickingDist: PickingDist;
  calcClosestKitAabbPointToPoint?: (pt: Vector3) => Vector3 | undefined;
  outerScale?: Accessor<number>;
  isEnabled?: () => boolean;
}

interface CoreState {
  projection: Projection;
  space: Rig;
  scale: number;
  orbitTarget: Vector3;
  rotatingByDrag: boolean;
  rotatingByDragLastPos: Vector2 | undefined;
  panningByDrag: boolean;
  panningSpace: Rig | undefined;
  panningStartPos: Vector2 | undefined;
  panningStartMousePos: Vector2 | undefined;
  panningCameraStartPos: Vector3 | undefined;
  panningStartOrbitTarget: Vector3 | undefined;
  multiTouchLast: { touch1: Vector2; touch2: Vector2 } | undefined;
}

const identityRig = (): Rig => ({
  origin: v3(0, 0, 0),
  orientation: new Quaternion(),
});

const xy = (v: Vector3): Vector2 => v2(v.x, v.y);

/**
 * The rig an orbit drag reaches: the camera swung around `target` by the drag
 * delta, kept upright against +y (the voxel world's up axis).
 */
const calcRigForOrbitTarget = (
  camPos: Vector3,
  target: Vector3,
  deltaDrag: Vector2,
  lastRig: Rig,
): Rig | undefined => {
  const rotation1 = quatFromAxisAngle(v3(0, 1, 0), -deltaDrag.x * DEG_TO_RAD);
  const camPos2 = quatRotate(rotation1, camPos.clone().sub(target)).add(target);
  const camU = quatRotate(rotation1, rigU(lastRig));
  const rotation2 = quatFromAxisAngle(camU, -deltaDrag.y * DEG_TO_RAD);
  const camPos3 = quatRotate(rotation2, camPos2.clone().sub(target)).add(
    target,
  );
  const rotatedU = quatRotate(rotation2, quatRotate(rotation1, rigU(lastRig)));
  const u = v3(rotatedU.x, 0, rotatedU.z).normalize();
  const rotatedW = quatRotate(rotation2, quatRotate(rotation1, rigW(lastRig)));
  const w = u.clone().cross(rotatedW.clone().cross(u)).normalize();
  let r: Rig = { origin: camPos3, orientation: quatFromWU(w, u) };
  if (rigV(r).dot(rigV(lastRig)) < 0) {
    r = {
      origin: r.origin,
      orientation: quatFromUV(
        rigU(r).multiplyScalar(-1),
        rigV(r).multiplyScalar(-1),
      ),
    };
  }
  if (rigV(r).y < 0) {
    const v = v3(rigV(r).x, 0, rigV(r).z);
    const w2 = rigU(r).clone().cross(v).normalize();
    const u2 = v.clone().cross(w2);
    r = { origin: camPos, orientation: quatFromUV(u2, v) };
  }
  return r;
};

/**
 * The toolbox-style camera: right-drag orbits, shift+right-drag pans, the
 * wheel zooms toward whatever is under the cursor and glides along the ray when
 * nothing is. Ported from online-quote's `KitControlsCore`, retargeted at
 * `@random-mesh/rmsl/scene` and the y-up voxel world.
 */
export class KitControlsCore {
  readonly projection: Accessor<Projection>;
  readonly setProjection: (projection: Projection) => void;
  readonly space: Accessor<Rig>;
  readonly setSpace: (space: Rig) => void;
  readonly scale: Accessor<number>;
  readonly setScale: (scale: number) => void;
  readonly orbitTarget: Accessor<Vector3>;
  readonly setOrbitTarget: (pt: Vector3) => void;
  readonly lookAtTarget: () => void;
  readonly hookupEventListeners: (eventTarget: HTMLElement) => void;
  readonly removeEventListeners: () => void;
  readonly onMouseDown: (e: MouseEvent) => void;
  readonly onMouseMove: (e: MouseEvent) => void;
  readonly onMouseUp: (e: MouseEvent) => void;
  readonly onWheel: (e: WheelEvent) => void;
  readonly onTouchStart: (e: TouchEvent) => void;
  readonly onTouchMove: (e: TouchEvent) => void;
  readonly onTouchEnd: (e: TouchEvent) => void;

  constructor(private readonly params: KitControlsCoreParams) {
    const [state, setState] = createSignal<CoreState>({
      projection: "Perspective",
      space: identityRig(),
      scale: 1.0,
      orbitTarget: v3(0, 0, 0),
      rotatingByDrag: false,
      rotatingByDragLastPos: undefined,
      panningByDrag: false,
      panningSpace: undefined,
      panningStartPos: undefined,
      panningStartMousePos: undefined,
      panningCameraStartPos: undefined,
      panningStartOrbitTarget: undefined,
      multiTouchLast: undefined,
    });
    const patch = (partial: Partial<CoreState>) =>
      setState((current) => ({ ...current, ...partial }));
    // Each patch composes through the setter's updater, so a group of them is
    // already applied together; this only groups them for readability.
    const batch = (fn: () => void): void => fn();

    this.projection = () => state().projection;
    this.setProjection = (projection) => patch({ projection });
    this.space = () => state().space;
    this.setSpace = (space) => patch({ space });
    this.scale = () => state().scale;
    this.setScale = (scale) => patch({ scale });
    this.orbitTarget = () => state().orbitTarget;
    this.setOrbitTarget = (pt) => patch({ orbitTarget: pt });
    this.lookAtTarget = () => {
      const space = untrack(() => this.space());
      const orbitTarget = untrack(() => this.orbitTarget());
      const space2 = rigLookingAt(space.origin, orbitTarget);
      if (space2 === undefined) {
        return;
      }
      this.setSpace(space2);
    };

    let listeners: (() => void)[] = [];
    this.hookupEventListeners = (eventTarget) => {
      const mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);
      const mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
      const mouseUpListener = (e: MouseEvent) => this.onMouseUp(e);
      const wheelListener = (e: WheelEvent) => this.onWheel(e);
      const touchStartListener = (e: TouchEvent) => this.onTouchStart(e);
      const touchMoveListener = (e: TouchEvent) => this.onTouchMove(e);
      const touchEndListener = (e: TouchEvent) => this.onTouchEnd(e);
      const contextMenuListener = (e: MouseEvent) => e.preventDefault();
      eventTarget.addEventListener("mousedown", mouseDownListener);
      eventTarget.addEventListener("mousemove", mouseMoveListener);
      eventTarget.addEventListener("mouseup", mouseUpListener);
      eventTarget.addEventListener("wheel", wheelListener, { passive: false });
      eventTarget.addEventListener("touchstart", touchStartListener);
      eventTarget.addEventListener("touchmove", touchMoveListener, {
        passive: false,
      });
      eventTarget.addEventListener("touchend", touchEndListener);
      eventTarget.addEventListener("contextmenu", contextMenuListener);
      listeners.push(() => {
        eventTarget.removeEventListener("mousedown", mouseDownListener);
        eventTarget.removeEventListener("mousemove", mouseMoveListener);
        eventTarget.removeEventListener("mouseup", mouseUpListener);
        eventTarget.removeEventListener("wheel", wheelListener);
        eventTarget.removeEventListener("touchstart", touchStartListener);
        eventTarget.removeEventListener("touchmove", touchMoveListener);
        eventTarget.removeEventListener("touchend", touchEndListener);
        eventTarget.removeEventListener("contextmenu", contextMenuListener);
      });
    };
    this.removeEventListeners = () => {
      listeners.forEach((remove) => remove());
      listeners = [];
    };

    this.onMouseDown = (e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      const current = state();
      if (e.button == 2 && !e.shiftKey) {
        batch(() => {
          patch({ rotatingByDrag: true });
          patch({ rotatingByDragLastPos: v2(e.clientX, e.clientY) });
        });
      } else if (e.button == 2 && e.shiftKey) {
        const targetRig: Rig = {
          origin: current.orbitTarget,
          orientation: current.space.orientation,
        };
        const normal = rigW(targetRig);
        const ray = this.params.mouseRay();
        if (ray != undefined) {
          const pt = rayPlanePoint(ray, targetRig.origin, normal);
          if (pt != undefined) {
            const pt2 = xy(rigPointTo(targetRig, pt));
            batch(() => {
              patch({ panningByDrag: true });
              patch({ panningSpace: targetRig });
              patch({ panningStartPos: pt2 });
              patch({ panningStartMousePos: v2(e.clientX, e.clientY) });
              patch({ panningCameraStartPos: current.space.origin });
              patch({ panningStartOrbitTarget: current.orbitTarget });
            });
          }
        }
      }
    };

    this.onMouseMove = (e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      const current = state();
      if (
        current.rotatingByDrag &&
        current.rotatingByDragLastPos != undefined
      ) {
        const dragPos = v2(e.clientX, e.clientY);
        const delta = dragPos.clone().sub(current.rotatingByDragLastPos);
        const space2 = calcRigForOrbitTarget(
          current.space.origin,
          current.orbitTarget,
          delta.multiplyScalar(ORBIT_DEGREES_PER_PIXEL),
          current.space,
        );
        if (space2 != undefined) {
          batch(() => {
            patch({ rotatingByDragLastPos: dragPos });
            patch({ space: space2 });
          });
        }
      } else if (
        current.panningByDrag &&
        current.panningStartPos &&
        current.panningSpace != undefined &&
        current.panningStartMousePos != undefined &&
        current.panningCameraStartPos != undefined &&
        current.panningStartOrbitTarget != undefined
      ) {
        const targetRig = current.panningSpace;
        const normal = rigW(targetRig);
        const ray = this.params.mouseRay();
        if (ray != undefined) {
          if (current.projection == "Perspective") {
            const mouseRayOldOrigin: CameraRay = {
              origin: current.panningCameraStartPos,
              direction: ray.direction,
            };
            const pt = rayPlanePoint(
              mouseRayOldOrigin,
              targetRig.origin,
              normal,
            );
            if (pt != undefined) {
              const pt2 = xy(rigPointTo(targetRig, pt));
              const local = current.panningStartPos.clone().sub(pt2);
              const delta = rigVectorFrom(targetRig, v3(local.x, local.y, 0));
              const newPos = delta.add(current.panningCameraStartPos);
              const distance = current.panningStartOrbitTarget
                .clone()
                .sub(current.panningCameraStartPos)
                .dot(normal);
              patch({
                space: {
                  origin: newPos,
                  orientation: current.space.orientation,
                },
              });
              patch({
                orbitTarget: newPos
                  .clone()
                  .add(normal.clone().multiplyScalar(distance)),
              });
            }
          } else {
            const mousePos = v2(e.clientX, e.clientY);
            const movement = mousePos.clone().sub(current.panningStartMousePos);
            const outerScale = this.params.outerScale?.() ?? 1.0;
            const delta = quatRotate(
              current.space.orientation,
              v3(
                -movement.x / current.scale / outerScale,
                movement.y / current.scale / outerScale,
                0,
              ),
            );
            patch({
              space: {
                origin: current.panningCameraStartPos
                  .clone()
                  .add(delta.multiplyScalar(1000.0)),
                orientation: current.space.orientation,
              },
            });
          }
        }
      }
    };

    this.onMouseUp = (e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      const current = state();
      if (e.button == 2 && current.rotatingByDrag) {
        patch({ rotatingByDrag: false });
        patch({ rotatingByDragLastPos: undefined });
      } else if (e.button == 2 && current.panningByDrag) {
        patch({ panningByDrag: false });
        patch({ panningSpace: undefined });
        patch({ panningStartPos: undefined });
        patch({ panningStartMousePos: undefined });
        patch({ panningCameraStartPos: undefined });
        patch({ panningStartOrbitTarget: undefined });
      }
    };

    this.onWheel = (e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      const current = state();
      const mousePos = this.params.mousePos();
      const ray = this.params.mouseRay();
      let orbitTarget = current.orbitTarget;
      let hasPointUnderMouse = false;
      if (mousePos != undefined && ray != undefined) {
        const newTarget = this.params.pickingDist({
          projectPtToScreen: this.params.projectPtToScreen,
          mousePos,
          mouseRay: ray,
          snapDistSquared: SNAP_DIST_SQUARED,
        });
        if (newTarget != undefined) {
          orbitTarget = rayPointAt(ray, newTarget.t);
          patch({ orbitTarget });
          hasPointUnderMouse = true;
        }
      }
      if (current.projection == "Perspective") {
        const closestKitPoint = this.params.calcClosestKitAabbPointToPoint?.(
          current.space.origin,
        );
        let maxSpeed: number | undefined;
        if (closestKitPoint == undefined) {
          maxSpeed = undefined;
        } else {
          maxSpeed = Math.max(
            100.0,
            closestKitPoint.sub(current.space.origin).length() * 0.1,
          );
        }
        batch(() => {
          if (e.deltaY != 0 && !hasPointUnderMouse && ray != undefined) {
            const dir = ray.direction.clone().normalize();
            const movement = dir.multiplyScalar(
              e.deltaY > 0 ? -RAY_GLIDE_SPEED : RAY_GLIDE_SPEED,
            );
            const newPos = current.space.origin.clone().add(movement);
            patch({
              space: { origin: newPos, orientation: current.space.orientation },
            });
            patch({
              orbitTarget: orbitTarget.clone().add(movement),
            });
          } else if (e.deltaY > 0) {
            let newPos = current.space.origin
              .clone()
              .sub(orbitTarget)
              .multiplyScalar(1.1)
              .add(orbitTarget);
            if (maxSpeed != undefined) {
              let movement = newPos.clone().sub(current.space.origin);
              if (movement.lengthSq() > maxSpeed * maxSpeed) {
                movement = movement.normalize().multiplyScalar(maxSpeed);
                newPos = current.space.origin.clone().add(movement);
              }
            }
            patch({
              space: { origin: newPos, orientation: current.space.orientation },
            });
            if (
              current.panningByDrag &&
              current.panningCameraStartPos != undefined &&
              current.panningStartPos != undefined
            ) {
              const newCamera = current.panningCameraStartPos
                .clone()
                .sub(orbitTarget)
                .multiplyScalar(1.1)
                .add(orbitTarget);
              patch({ panningCameraStartPos: newCamera });
              patch({
                panningStartPos: current.panningStartPos
                  .clone()
                  .multiplyScalar(1.1),
              });
            }
          } else if (e.deltaY < 0) {
            let newPos = current.space.origin
              .clone()
              .sub(orbitTarget)
              .multiplyScalar(1.0 / 1.1)
              .add(orbitTarget);
            if (maxSpeed != undefined) {
              let movement = newPos.clone().sub(current.space.origin);
              if (movement.lengthSq() > maxSpeed * maxSpeed) {
                movement = movement.normalize().multiplyScalar(maxSpeed);
                newPos = current.space.origin.clone().add(movement);
              }
            }
            patch({
              space: { origin: newPos, orientation: current.space.orientation },
            });
            if (
              current.panningByDrag &&
              current.panningCameraStartPos != undefined &&
              current.panningStartPos != undefined
            ) {
              const newCamera = current.panningCameraStartPos
                .clone()
                .sub(orbitTarget)
                .multiplyScalar(1.0 / 1.1)
                .add(orbitTarget);
              patch({ panningCameraStartPos: newCamera });
              patch({
                panningStartPos: current.panningStartPos
                  .clone()
                  .multiplyScalar(1.0 / 1.1),
              });
            }
          }
        });
      } else {
        if (ray == undefined) {
          return;
        }
        const rayOrigin = ray.origin;
        const targetRig: Rig = {
          origin: orbitTarget,
          orientation: current.space.orientation,
        };
        const local = xy(
          rigVectorTo(targetRig, rayOrigin.clone().sub(current.space.origin)),
        );
        const scaleMultiplier = e.deltaY < 0 ? 1.1 : 1.0 / 1.1;
        const pt2 = local.clone().multiplyScalar(scaleMultiplier);
        const counterMovement = pt2.clone().sub(local);
        const counterMovement2 = rigVectorFrom(
          targetRig,
          v3(counterMovement.x, counterMovement.y, 0),
        );
        patch({
          space: {
            origin: current.space.origin.clone().add(counterMovement2),
            orientation: current.space.orientation,
          },
        });
        patch({ scale: current.scale * scaleMultiplier });
      }
    };

    this.onTouchStart = (e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      if (e.touches.length == 1) {
        const touch = e.touches[0];
        batch(() => {
          patch({ rotatingByDrag: true });
          patch({ rotatingByDragLastPos: v2(touch.clientX, touch.clientY) });
        });
      } else if (e.touches.length == 2) {
        batch(() => {
          patch({ rotatingByDrag: false });
          patch({ rotatingByDragLastPos: undefined });
          patch({
            multiTouchLast: {
              touch1: v2(e.touches[0].clientX, e.touches[0].clientY),
              touch2: v2(e.touches[1].clientX, e.touches[1].clientY),
            },
          });
        });
      }
    };

    this.onTouchMove = (e) => {
      if (this.params.isEnabled?.() === false) {
        e.preventDefault();
        return;
      }
      const current = state();
      if (
        current.rotatingByDrag &&
        current.rotatingByDragLastPos != undefined &&
        e.touches.length == 1
      ) {
        const touch = e.touches[0];
        const dragPos = v2(touch.clientX, touch.clientY);
        const delta = dragPos.clone().sub(current.rotatingByDragLastPos);
        const space2 = calcRigForOrbitTarget(
          current.space.origin,
          current.orbitTarget,
          delta.multiplyScalar(ORBIT_DEGREES_PER_PIXEL),
          current.space,
        );
        if (space2 != undefined) {
          batch(() => {
            patch({ rotatingByDragLastPos: dragPos });
            patch({ space: space2 });
          });
        }
      } else if (current.multiTouchLast != undefined && e.touches.length == 2) {
        const last = current.multiTouchLast;
        const dist1 = last.touch1.distanceTo(last.touch2);
        const nextMultiTouch = {
          touch1: v2(e.touches[0].clientX, e.touches[0].clientY),
          touch2: v2(e.touches[1].clientX, e.touches[1].clientY),
        };
        const dist2 = nextMultiTouch.touch1.distanceTo(nextMultiTouch.touch2);
        const movement = nextMultiTouch.touch1
          .clone()
          .add(nextMultiTouch.touch2)
          .multiplyScalar(0.5)
          .sub(last.touch1.clone().add(last.touch2).multiplyScalar(0.5));
        let movementScale: number;
        const target = e.currentTarget;
        if (target instanceof HTMLCanvasElement) {
          const fovY = 45.0;
          const height = target.height;
          const screenDist =
            (0.5 * height) / Math.tan((0.5 * fovY * Math.PI) / 180.0);
          movementScale =
            (2.0 * current.space.origin.distanceTo(current.orbitTarget)) /
            screenDist;
        } else {
          movementScale = 100.0;
        }
        const camMovement = rigU(current.space)
          .multiplyScalar(-movement.x)
          .add(rigV(current.space).multiplyScalar(movement.y))
          .multiplyScalar(movementScale);
        const camPos = current.space.origin
          .clone()
          .sub(current.orbitTarget)
          .multiplyScalar(dist1 / dist2)
          .add(current.orbitTarget)
          .add(camMovement);
        batch(() => {
          patch({ multiTouchLast: nextMultiTouch });
          patch({
            space: { origin: camPos, orientation: current.space.orientation },
          });
          patch({ orbitTarget: current.orbitTarget.clone().add(camMovement) });
        });
      }
      e.preventDefault();
    };

    this.onTouchEnd = (_e) => {
      if (this.params.isEnabled?.() === false) {
        return;
      }
      const current = state();
      if (current.rotatingByDrag) {
        patch({ rotatingByDrag: false });
        patch({ rotatingByDragLastPos: undefined });
      }
      patch({ multiTouchLast: undefined });
    };
  }
}

export interface KitCameraControlParams {
  getActiveCamera: () => Camera;
  getProjection: () => Projection;
  mousePos: Accessor<Vector2 | undefined>;
  mouseRay: () => CameraRay | undefined;
  projectPtToScreen: (pt: Vector3) => Vector2 | undefined;
  pickingDist?: PickingDist;
  calcClosestKitAabbPointToPoint?: (pt: Vector3) => Vector3 | undefined;
}

/**
 * A `CameraControl` wrapping `KitControlsCore`: the core's `space` is written
 * onto the active `@random-mesh/rmsl/scene` camera by an effect, then the
 * change callbacks fire.
 */
export class KitCameraControl implements CameraControl {
  readonly kind: CameraControlsKind = "ToolBoxStyle";

  private readonly _core: KitControlsCore;
  private readonly _getActiveCamera: () => Camera;
  private readonly _enabled: Accessor<boolean>;
  private readonly _setEnabled: (v: boolean) => void;
  private _onChangeCallbacks: (() => void)[] = [];
  private readonly _disposeEffect: () => void;
  private _disposeListeners: () => void = () => {};
  private _attached = false;

  constructor(params: KitCameraControlParams) {
    const [enabled, setEnabled] = createSignal(false);
    this._enabled = enabled;
    this._setEnabled = setEnabled;
    this._getActiveCamera = params.getActiveCamera;
    this._core = new KitControlsCore({
      mousePos: params.mousePos,
      mouseRay: params.mouseRay,
      projectPtToScreen: params.projectPtToScreen,
      pickingDist: (pickingParams) =>
        params.pickingDist?.(pickingParams) ?? undefined,
      calcClosestKitAabbPointToPoint: params.calcClosestKitAabbPointToPoint,
      outerScale: undefined,
      isEnabled: () => this._enabled(),
    });
    this._disposeEffect = createRoot((dispose) => {
      createEffect(
        () => {
          if (!this._enabled()) {
            return undefined;
          }
          return {
            space: this._core.space(),
            camera: this._getActiveCamera(),
          };
        },
        (value) => {
          if (value === undefined) {
            return;
          }
          const { space, camera } = value;
          camera.position.set(space.origin.x, space.origin.y, space.origin.z);
          camera.quaternion.set(
            space.orientation.x,
            space.orientation.y,
            space.orientation.z,
            space.orientation.w,
          );
          camera.updateMatrixWorld();
          this._fireOnChange();
        },
      );
      return dispose;
    });
  }

  public attach(canvas: HTMLCanvasElement): void {
    if (this._attached) {
      return;
    }
    this._attached = true;
    this._core.hookupEventListeners(canvas);
    this._disposeListeners = () => this._core.removeEventListeners();
  }

  /** Detaches the input handlers, leaving the control usable after a re-attach. */
  public detach(): void {
    this._disposeListeners();
    this._disposeListeners = () => {};
    this._attached = false;
  }

  public dispose(): void {
    this.detach();
    this._disposeEffect();
    this._onChangeCallbacks = [];
  }

  public get enabled(): boolean {
    return this._enabled();
  }

  public set enabled(value: boolean) {
    this._setEnabled(value);
  }

  public get target(): Vector3 {
    const t = this._core.orbitTarget();
    return v3(t.x, t.y, t.z);
  }

  public setTarget(pt: Vector3): void {
    this._core.setOrbitTarget(v3(pt.x, pt.y, pt.z));
  }

  public setProjection(_camera: Camera, projection: Projection): void {
    this._core.setProjection(projection);
  }

  public syncFromCamera(camera: Camera, target: Vector3): void {
    const origin = v3(camera.position.x, camera.position.y, camera.position.z);
    const orientation = new Quaternion(
      camera.quaternion.x,
      camera.quaternion.y,
      camera.quaternion.z,
      camera.quaternion.w,
    );
    this._core.setSpace({ origin, orientation });
    this._core.setOrbitTarget(v3(target.x, target.y, target.z));
  }

  public update(): void {
    // The core is reactive; the camera is driven by a createEffect.
  }

  public onChange(cb: () => void): () => void {
    this._onChangeCallbacks.push(cb);
    return () => {
      this._onChangeCallbacks = this._onChangeCallbacks.filter((x) => x !== cb);
    };
  }

  private _fireOnChange(): void {
    const callbacks = this._onChangeCallbacks;
    for (let i = 0; i < callbacks.length; ++i) {
      callbacks[i]();
    }
  }
}
