// Renders every connected remote player as a cube (matching the local player
// cube) with a handle label, interpolating toward each one's latest received
// pose so the mesh's deliberately low broadcast rate reads smoothly on screen.
// Owns its scene objects directly, like `WeatherController`.
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Texture,
  Vector3,
  type PerspectiveCamera,
} from "@random-mesh/rmsl/scene";
import { hashDid } from "./signal";
import type { Pose } from "./pose";

/** Cube half-size, matching the local player cube (a 2x2x2 cube). */
const AVATAR_HALF = 1;
/** Label plane size and its height above the cube centre, in world units. */
const LABEL_WIDTH = 3.2;
const LABEL_HEIGHT = 0.8;
const LABEL_OFFSET = 1.9;
/** Exponential smoothing gain: how fast an avatar catches up to its target pose. */
const SMOOTH_RATE = 8;

/** A small palette so nearby players are visually distinct. */
const AVATAR_COLORS = [
  0xe53935, 0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0x00acc1, 0x5d4037,
  0xc0ca33,
];

interface RemotePlayer {
  cube: Mesh;
  label: Mesh;
  target: Pose;
  updatedAt: number;
}

/** The readable tail of a DID (e.g. `did:plc:abc123` -> `abc123`). */
export const labelText = (did: string): string =>
  did.slice(did.lastIndexOf(":") + 1) || did;

const avatarColor = (did: string): number =>
  AVATAR_COLORS[Math.abs(parseInt(hashDid(did), 36)) % AVATAR_COLORS.length];

const makeLabelTexture = (text: string): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 12, 256, 52);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 40);
  }
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/** Shortest-arc angle interpolation, so heading never spins the long way around. */
const angleLerp = (a: number, b: number, t: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) {
    d -= Math.PI * 2;
  }
  if (d < -Math.PI) {
    d += Math.PI * 2;
  }
  return a + d * t;
};

export class RemotePlayers {
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly players = new Map<string, RemotePlayer>();

  constructor(params: { scene: Scene; camera: PerspectiveCamera }) {
    this.scene = params.scene;
    this.camera = params.camera;
  }

  /** Number of players currently rendered. */
  get size(): number {
    return this.players.size;
  }

  /** Creates (or refreshes) the avatar for a peer and targets its new pose. */
  update(did: string, pose: Pose, now = Date.now()): void {
    const player = this.players.get(did) ?? this.createPlayer(did);
    player.target = pose;
    player.updatedAt = now;
    player.cube.visible = true;
    player.label.visible = true;
  }

  /** Removes a peer's avatar from the scene entirely. */
  remove(did: string): void {
    const player = this.players.get(did);
    if (player === undefined) {
      return;
    }
    this.scene.remove(player.cube);
    this.scene.remove(player.label);
    this.players.delete(did);
  }

  /** Removes every avatar (mesh teardown). */
  clear(): void {
    for (const did of [...this.players.keys()]) {
      this.remove(did);
    }
  }

  /**
   * Called once per frame: eases every avatar toward its target pose and
   * keeps its label billboarded at the camera.
   */
  tick(dt: number): void {
    const alpha = 1 - Math.exp(-SMOOTH_RATE * dt);
    const scratch = new Vector3();
    for (const player of this.players.values()) {
      const { cube, label, target } = player;
      scratch.set(target.x, target.y, target.z);
      cube.position.lerp(scratch, alpha);
      cube.rotation.y = angleLerp(cube.rotation.y, target.yaw, alpha);
      label.position.copy(cube.position);
      label.position.y += AVATAR_HALF + LABEL_OFFSET;
      label.lookAt(this.camera.position);
    }
  }

  private createPlayer(did: string): RemotePlayer {
    const cube = new Mesh(
      new BoxGeometry(AVATAR_HALF * 2, AVATAR_HALF * 2, AVATAR_HALF * 2),
      new MeshStandardMaterial({ color: avatarColor(did), roughness: 0.8 }),
    );
    cube.visible = false;
    const label = new Mesh(
      new PlaneGeometry(LABEL_WIDTH, LABEL_HEIGHT),
      new MeshBasicMaterial({
        map: makeLabelTexture(labelText(did)),
        transparent: true,
      }),
    );
    label.visible = false;
    this.scene.add(cube);
    this.scene.add(label);
    const player: RemotePlayer = {
      cube,
      label,
      target: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 },
      updatedAt: 0,
    };
    this.players.set(did, player);
    return player;
  }
}
