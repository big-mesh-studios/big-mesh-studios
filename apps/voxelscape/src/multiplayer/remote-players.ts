// Renders every connected remote player as a cube (matching the local player
// cube) under a floating label naming them, interpolating toward each one's
// latest received pose so the mesh's deliberately low broadcast rate reads
// smoothly on screen. A player's name is their atproto handle once the caller
// has one to give (`setHandle`); until then it is the tail of their DID, the
// only name a peer arrives with.
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
import { hashDid } from "./presence";
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

/** Label font size at its largest, in canvas pixels. */
const LABEL_FONT_PX = 40;
/** Canvas pixels kept clear on each side of the label text. */
const LABEL_PADDING_PX = 10;

const avatarColor = (did: string): number =>
  AVATAR_COLORS[Math.abs(parseInt(hashDid(did), 36)) % AVATAR_COLORS.length];

/**
 * Paints `text` over a fresh label background, replacing whatever the canvas
 * held. Everything is drawn through a vertical flip: the renderer uploads a
 * canvas top row first, where a texture's first row is its bottom, so a canvas
 * painted the right way up samples upside down on the label.
 */
const drawLabel = (canvas: HTMLCanvasElement, text: string): void => {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  ctx.setTransform(1, 0, 0, -1, 0, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 12, canvas.width, 52);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // A handle is as long as its owner's domain, so the text is shrunk to fit
  // the label rather than the label grown to fit the text: an avatar's name
  // plate stays the same size whoever is standing there.
  ctx.font = `bold ${LABEL_FONT_PX}px monospace`;
  const available = canvas.width - LABEL_PADDING_PX * 2;
  const width = ctx.measureText(text).width;
  if (width > available) {
    ctx.font = `bold ${Math.floor((LABEL_FONT_PX * available) / width)}px monospace`;
  }
  ctx.fillText(text, canvas.width / 2, 40);
};

const makeLabelTexture = (text: string): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  drawLabel(canvas, text);
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
  /** DID -> the handle to write on that player's label, once one is known. */
  private readonly handles = new Map<string, string>();

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

  /**
   * Names a peer: their label reads `handle` instead of the tail of their
   * DID, from now until this player leaves the world — including on the
   * avatar they get if they disconnect and come back.
   */
  setHandle(did: string, handle: string): void {
    this.handles.set(did, handle);
    const player = this.players.get(did);
    if (player === undefined) {
      return;
    }
    // Repainted into the label's own canvas rather than swapped for a second
    // texture: a renderer holds a GPU texture per `Texture` object it has
    // bound and frees them only when the renderer itself goes away, so a
    // replacement would strand the first one for the rest of the session.
    const texture = (player.label.material as MeshBasicMaterial).map;
    const canvas = texture?.image;
    if (
      texture === undefined ||
      texture === null ||
      !(canvas instanceof HTMLCanvasElement)
    ) {
      return;
    }
    drawLabel(canvas, handle);
    texture.needsUpdate = true;
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
        map: makeLabelTexture(this.handles.get(did) ?? labelText(did)),
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
