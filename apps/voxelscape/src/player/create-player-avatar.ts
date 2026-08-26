import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
} from "@random-mesh/rmsl/scene";
import type { Vector3D } from "../utils/maths";
import type { InputSnapshot } from "./create-input";
import {
  createPlayer,
  DEFAULT_PLAYER_CONFIG,
  lookDirection,
  placeCamera,
  updatePlayer,
  type Player,
  type PlayerConfig,
  type PlayerWorld,
} from "./player";
import type { WorldVoxel } from "../world/edit-layer";
import { VOXEL_SIZE } from "../world/level-data";

/**
 * Distance from the origin beyond which player movement is clamped. The
 * ring is effectively unbounded, so this exists only to guard against
 * floating-point drift far outside it.
 */
const SAFE_EXTENT = 1e6;

/** What the physics asks the terrain, plus the column height used to spawn. */
export interface AvatarTerrain {
  /** Highest solid surface in the column at (`x`, `z`). */
  heightAt(x: number, z: number): number;
  groundHeightAt(x: number, y: number, z: number): number;
  inWaterAt(x: number, y: number, z: number): boolean;
  solidAt(x: number, y: number, z: number): boolean;
}

export interface PlayerAvatarConfig {
  /** The player's cube is added here. */
  scene: Scene;
  /** Placed at the eye in first person, behind and above the cube otherwise. */
  camera: PerspectiveCamera;
  terrain: AvatarTerrain;
  /** Where the player starts, in world units; the height is the terrain surface there. */
  spawn: Vector3D;
  /** Movement settings for this player; anything omitted takes its default. */
  player?: Partial<PlayerConfig>;
}

export interface PlayerAvatar {
  /** Carries this player's own movement settings on `config` (`/speed`, `/look`). */
  player: Player;
  /**
   * Steps the physics. The cube and the camera still show where the player
   * was, until `place` moves them.
   */
  move(dt: number, input: InputSnapshot): void;
  /** Moves the cube and the camera onto the player's current position. */
  place(): void;
  /** The ray the crosshair points along, from the camera's eye. */
  look(): { origin: Vector3D; direction: Vector3D };
  /** Every world voxel the player's cube overlaps, so an edit can't bury them. */
  occupiedVoxels(): WorldVoxel[];
  /** First person puts the camera at the player's eye; third person hovers behind the cube. */
  setFirstPerson(firstPerson: boolean): void;
  /** Shows or hides the cube drawn for the player (hidden in first person). */
  setCubeVisible(visible: boolean): void;
}

/**
 * The player: their physics, the cube drawn for them, and the camera that
 * follows them. Owns the two pieces of view state the console can change,
 * which camera it is and whether the cube is drawn.
 */
export const createPlayerAvatar = ({
  scene,
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
    spawn.x,
    terrain.heightAt(spawn.x, spawn.z) + config.halfSize + 0.1,
    spawn.z,
    config,
  );

  /** Built once rather than per frame; the samplers read the live terrain. */
  const world: PlayerWorld = {
    groundHeightAt: (x, y, z) => terrain.groundHeightAt(x, y, z),
    inWaterAt: (x, y, z) => terrain.inWaterAt(x, y, z),
    solidAt: (x, y, z) => terrain.solidAt(x, y, z),
    halfExtent: SAFE_EXTENT,
  };

  const cube = new Mesh(
    new BoxGeometry(
      player.config.halfSize * 2,
      player.config.halfSize * 2,
      player.config.halfSize * 2,
    ),
    new MeshStandardMaterial({ color: 0xff7043, roughness: 0.8 }),
  );
  cube.position.copy(player.position);
  cube.visible = cubeVisible;
  scene.add(cube);
  placeCamera(camera, player, firstPerson);

  return {
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

    look() {
      const eye = camera.position;
      const [dx, dy, dz] = lookDirection(player);
      return {
        origin: { x: eye.x, y: eye.y, z: eye.z },
        direction: { x: dx, y: dy, z: dz },
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

    setCubeVisible(visible) {
      cubeVisible = visible;
    },
  };
};
