import {
  BoxGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
} from "@random-mesh/rmsl/scene";
import { createPlayerSkin } from "./player-skin";
import type { InputSnapshot } from "./create-input";
import {
  createPlayer,
  DEFAULT_PLAYER_CONFIG,
  deathCameraPose,
  lookDirection,
  placeCamera,
  updatePlayer,
  type Player,
  type PlayerConfig,
  type PlayerWorld,
} from "./player";
import type { WorldVoxel } from "../world/edit-layer";
import { VOXEL_SIZE, type Dim3 } from "../world/level-data";

/**
 * Distance from the origin beyond which player movement is clamped. The
 * ring is effectively unbounded, so this exists only to guard against
 * floating-point drift far outside it.
 */
const SAFE_EXTENT = 1e6;

/** The player cube's colour until the signed-in account's picture replaces it. */
const CUBE_COLOR = 0xff7043;

/** What the physics asks the terrain, plus the column height used to spawn. */
export interface AvatarTerrain {
  /** Highest solid surface in the column at (`x`, `z`). */
  heightAt(x: number, z: number): number;
  groundHeightAt(x: number, y: number, z: number): number;
  inWaterAt(x: number, y: number, z: number): boolean;
  solidAt(x: number, y: number, z: number): boolean;
}

export interface PlayerAvatarConfig {
  /** Placed at the eye in first person, behind and above the cube otherwise. */
  camera: PerspectiveCamera;
  terrain: AvatarTerrain;
  /** Where the player starts, in world units; the height is the terrain surface there. */
  spawn: Dim3;
  /** Movement settings for this player; anything omitted takes its default. */
  player?: Partial<PlayerConfig>;
}

export interface PlayerAvatar {
  /** The cube drawn for the player, for the scene to place in its draw order. */
  body: Group;
  /**
   * Carries this player's own movement settings on `config` (`/player:speed`,
   * `/player:sensitivity`).
   */
  player: Player;
  /**
   * Steps the physics. The cube and the camera still show where the player
   * was, until `place` moves them.
   */
  move(dt: number, input: InputSnapshot): void;
  /** Moves the cube and the camera onto the player's current position. */
  place(): void;
  /**
   * Moves the cube and the camera into the death fall's pose at `progress`
   * (0 standing, 1 fallen flat): in first person the eye sweeps down the
   * backward arc while the view tips to the sky; in third person the cube
   * tips backward over its feet like a corpse.
   */
  placeDeath(progress: number): void;
  /** The ray the crosshair points along, from the camera's eye. */
  look(): { origin: Dim3; direction: Dim3 };
  /** Every world voxel the player's cube overlaps, so an edit can't bury them. */
  occupiedVoxels(): WorldVoxel[];
  /** First person puts the camera at the player's eye; third person hovers behind the cube. */
  setFirstPerson(firstPerson: boolean): void;
  /** Whether the camera is the player's eye right now. */
  get firstPerson(): boolean;
  /** Shows or hides the cube drawn for the player (hidden in first person). */
  setCubeVisible(visible: boolean): void;
  /**
   * Paints `picture` — the one the signed-in account shows for itself — over
   * the cube, so the player sees in third person the face other players see.
   */
  setPicture(picture: ImageBitmap): void;
}

/**
 * The player: their physics, the cube drawn for them, and the camera that
 * follows them. Owns the two pieces of view state the console can change,
 * which camera it is and whether the cube is drawn.
 */
export const createPlayerAvatar = ({
  camera,
  terrain,
  spawn,
  player: playerConfig,
}: PlayerAvatarConfig): PlayerAvatar => {
  /** First person by default: the camera is the player's eye, and the cube is hidden. */
  let firstPerson = true;
  let cubeVisible = false;

  const config = { ...DEFAULT_PLAYER_CONFIG, ...playerConfig };
  const player = createPlayer(
    spawn[0],
    terrain.heightAt(spawn[0], spawn[2]) + config.halfSize + 0.1,
    spawn[2],
    config,
  );

  /** Built once rather than per frame; the samplers read the live terrain. */
  const world: PlayerWorld = {
    groundHeightAt: (x, y, z) => terrain.groundHeightAt(x, y, z),
    inWaterAt: (x, y, z) => terrain.inWaterAt(x, y, z),
    solidAt: (x, y, z) => terrain.solidAt(x, y, z),
    halfExtent: SAFE_EXTENT,
  };

  const skin = createPlayerSkin(CUBE_COLOR);
  const cube = new Mesh(
    new BoxGeometry(
      player.config.halfSize * 2,
      player.config.halfSize * 2,
      player.config.halfSize * 2,
    ),
    skin.material,
  );
  cube.position.copy(player.position);
  cube.visible = cubeVisible;
  const body = new Group();
  body.add(cube);
  placeCamera(camera, player, firstPerson);

  return {
    body,
    player,

    move(dt, input) {
      updatePlayer(player, dt, input, world);
    },

    place() {
      cube.position.copy(player.position);
      // the cube's local +Z faces the heading; a Y rotation by `yaw` aligns it
      cube.rotation.y = player.yaw;
      cube.visible = cubeVisible;
      placeCamera(camera, player, firstPerson);
    },

    placeDeath(progress) {
      if (firstPerson) {
        const pose = deathCameraPose(progress, player);
        camera.position.set(
          pose.position[0],
          pose.position[1],
          pose.position[2],
        );
        const [dx, dy, dz] = lookDirection({
          ...player,
          pitch: pose.pitch,
        });
        camera.lookAt(
          pose.position[0] + dx,
          pose.position[1] + dy,
          pose.position[2] + dz,
        );
      } else {
        // The cube plays the same fall a corpse does: tip backward about the
        // planted feet, following the arc the zombie meshes draw.
        const p = Math.max(0, Math.min(1, progress));
        const fall = (-Math.PI / 2) * p;
        const sinFall = Math.sin(fall);
        const cosFall = Math.cos(fall);
        const sinYaw = Math.sin(player.yaw);
        const cosYaw = Math.cos(player.yaw);
        const half = player.config.halfSize;
        cube.rotation.set(fall, player.yaw, 0);
        cube.position.set(
          player.position.x + half * sinFall * sinYaw,
          player.position.y - half + half * cosFall,
          player.position.z + half * sinFall * cosYaw,
        );
      }
    },

    look() {
      const eye = camera.position;
      const [dx, dy, dz] = lookDirection(player);
      return {
        origin: [eye.x, eye.y, eye.z],
        direction: [dx, dy, dz],
      };
    },

    occupiedVoxels() {
      const half = player.config.halfSize;
      const bounds = (centre: number): [number, number] => [
        Math.floor((centre - half) / VOXEL_SIZE),
        Math.floor((centre + half) / VOXEL_SIZE),
      ];
      const [x0, x1] = bounds(player.position.x);
      const [y0, y1] = bounds(player.position.y);
      const [z0, z1] = bounds(player.position.z);
      const out: WorldVoxel[] = [];
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            out.push([x, y, z]);
          }
        }
      }
      return out;
    },

    setFirstPerson(next) {
      firstPerson = next;
    },

    get firstPerson() {
      return firstPerson;
    },

    setCubeVisible(visible) {
      cubeVisible = visible;
    },

    setPicture(picture) {
      skin.setPicture(picture);
    },
  };
};
