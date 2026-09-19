import { PerspectiveCamera, Vector3 } from "@random-mesh/rmsl/scene";
import type { InputController } from "../../player/create-input";
import {
  createPlayer,
  placeCamera,
  updatePlayer,
  type Player,
  type PlayerWorld,
} from "../../player/player";
import type {
  CameraControl,
  CameraControlsKind,
  Projection,
} from "./CameraControl";

export interface NoClipCameraControlParams {
  input: InputController;
  getActiveCamera: () => PerspectiveCamera;
  world: PlayerWorld;
  /** Movement speed, in world units per second. */
  speed?: number;
  /** Look sensitivity, in radians per pixel of pointer movement. */
  lookSensitivity?: number;
}

/**
 * The level editor's free-flying camera: the player's own no-clip movement
 * (`/player:no-clip`), driven on a throwaway player state so the camera that
 * builds the world flies through it the way a player does. The pointer lock,
 * keyboard and touch handlers are the game's `InputController`, which the
 * caller enables while this control is the active one; this control only reads
 * its snapshot.
 */
export class NoClipCameraControl implements CameraControl {
  readonly kind: CameraControlsKind = "NoClip";

  private readonly _input: InputController;
  private readonly _getActiveCamera: () => PerspectiveCamera;
  private readonly _world: PlayerWorld;
  private readonly _player: Player;
  private _onChangeCallbacks: (() => void)[] = [];
  private _enabled = false;

  constructor(params: NoClipCameraControlParams) {
    this._input = params.input;
    this._getActiveCamera = params.getActiveCamera;
    this._world = params.world;
    this._player = createPlayer(0, 0, 0, {
      ...(params.speed === undefined ? {} : { speed: params.speed }),
      ...(params.lookSensitivity === undefined
        ? {}
        : { lookSensitivity: params.lookSensitivity }),
    });
    this._player.noclip = true;
  }

  /**
   * The canvas handlers this control reads are the game's own, bound to the
   * world canvas for its whole life, so there is nothing for it to bind.
   */
  public attach(_canvas: HTMLCanvasElement): void {}

  public dispose(): void {
    this._enabled = false;
    this._onChangeCallbacks = [];
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      // Drop the look and move input gathered while this was the active
      // control, so switching back to it does not apply a stale drag at once.
      this._input.consume();
      this._player.vx = 0;
      this._player.vy = 0;
      this._player.vz = 0;
    }
  }

  public get target(): Vector3 {
    return this._player.position.clone();
  }

  public setTarget(pt: Vector3): void {
    this._player.position.copy(pt);
  }

  public setProjection(
    _camera: PerspectiveCamera,
    _projection: Projection,
  ): void {
    // The editor camera is perspective-only, so there is nothing to configure.
  }

  public syncFromCamera(camera: PerspectiveCamera, _target: Vector3): void {
    const config = this._player.config;
    this._player.position.set(
      camera.position.x,
      camera.position.y - config.eyeHeight,
      camera.position.z,
    );
    const forward = camera.getWorldDirection(new Vector3());
    this._player.yaw = Math.atan2(forward.x, forward.z);
    this._player.pitch = Math.asin(Math.max(-1, Math.min(1, forward.y)));
    this._player.vx = 0;
    this._player.vy = 0;
    this._player.vz = 0;
  }

  public update(dt: number): void {
    if (!this._enabled) {
      return;
    }
    const snapshot = this._input.consume();
    updatePlayer(this._player, dt, snapshot, this._world);
    placeCamera(this._getActiveCamera(), this._player, true);
    this._fireOnChange();
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
