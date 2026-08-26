import { Color, PerspectiveCamera, Scene } from "@random-mesh/rmsl/scene";
import { createSignal, type Accessor } from "solid-js";
import { AtprotoController } from "../atproto/atproto-controller";
import type { Commander } from "../commands";
import { createCommands } from "../commands";
import { createEnvironment } from "../environment/create-environment";
import { MultiplayerController } from "../multiplayer/multiplayer-controller";
import { createPeerJSSignaling } from "../multiplayer/peerjs-transport";
import type { Pose } from "../multiplayer/pose";
import { createInput, type InputController } from "../player/create-input";
import { createPlayerAvatar } from "../player/create-player-avatar";
import { EditingController } from "../player/editing-controller";
import { Inventory } from "../player/inventory";
import type { Player, PlayerConfig } from "../player/player";
import { createRenderLoop } from "../render/create-render-loop";
import { createVoxelWorld } from "../world/create-voxel-world";
import { type Dim3 } from "../world/level-data";
import { DEFAULT_TERRAIN, type TerrainConfig } from "../world/noise";

/** Sky blue, matching the material's default fog color so the horizon blends. */
const SKY_BLUE = 0x87ceeb;

export interface VoxelscapeConfig {
  /** Width of the streamed block window, in blocks per side. Also sets the fog and camera far distances. */
  blocksPerSide?: number;
  /** Terrain noise settings shared by every block in the ring. */
  terrain?: TerrainConfig;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  surfaceOnly?: boolean;
  /** Where the player starts, in world units; the spawn height is the terrain surface there. */
  spawn?: Dim3;
  /** Movement settings for this world's player; anything omitted takes its default. */
  player?: Partial<PlayerConfig>;
  /**
   * Enables the GPU timer and the per-frame statistics passed to
   * `onDebugStats`. Defaults to whether the page URL's hash contains `perf`.
   */
  debugPerf?: boolean;
  /** Receives the statistics line once per frame while `debugPerf` is on. */
  onDebugStats?: (line: string) => void;
  /**
   * Receives lines the world reports without being asked to — currently only
   * the atproto state settled at startup, which is the answer to "am I still
   * signed in?" after a reload. Meant for the debug console.
   */
  onNotice?: (line: string) => void;
}

export interface Voxelscape {
  scene: Scene;
  camera: PerspectiveCamera;
  player: Player;
  input: InputController;
  inventory: Inventory;
  commands: Commander;
  /** Whether `onDebugStats` will be called. */
  debugPerf: boolean;
  /** Last break/place result, so the HUD can show silent failures. */
  editStatus: Accessor<string>;
  /** Whether the crosshair is currently pointing at something within reach. */
  inReach: Accessor<boolean>;
  /**
   * Attaches a renderer to `canvas` and starts the frame loop. Returns a
   * function that stops the loop and releases the renderer, leaving the world
   * itself intact so it can be mounted onto another canvas.
   */
  mount(canvas: HTMLCanvasElement): () => void;
  /** Unmounts if mounted, then releases the world, its workers, and its listeners. */
  dispose(): void;
}

/**
 * Builds a voxel world — terrain ring, renderers, player, weather, sound,
 * editing and sync — and owns its frame loop. Touches no DOM beyond the
 * canvas passed to `mount`.
 */
export const createVoxelscape = ({
  blocksPerSide = 5,
  terrain = DEFAULT_TERRAIN,
  surfaceOnly = true,
  spawn = [0, 0, 0],
  debugPerf = typeof window !== "undefined" &&
    window.location.hash.includes("perf"),
  onDebugStats,
  onNotice,
  player,
}: VoxelscapeConfig = {}): Voxelscape => {
  const [editStatus, setEditStatus] = createSignal("");
  const [inReach, setInReach] = createSignal(false);

  /**
   * Owns the keyboard/pointer listeners and the per-frame input snapshot.
   * Instance-scoped, so its listeners come off again on `dispose` and a second
   * world on the page doesn't share this one's movement state.
   */
  const input = createInput();
  const scene = new Scene();
  /**
   * The sky, the weather and their sound. Built first: its sun and moon
   * billboards are drawn with depth writes off, so the terrain has to be able
   * to overdraw them at the horizon. The ground sampler is only read when
   * lightning picks a target, by which time the world exists.
   */
  const environment = createEnvironment({
    scene,
    groundHeightAt: (x, z) => world.heightAt(x, z),
  });

  const world = createVoxelWorld({
    scene,
    blocksPerSide,
    terrain,
    surfaceOnly,
    debugPerf,
  });

  /**
   * Camera with a far plane beyond the ring's physical extent, so box
   * geometry is never clipped (fog and early ray termination hide the
   * actual cutoff).
   */
  const camera = new PerspectiveCamera(50, 1.0, 0.1, world.ringRadius + 200);
  const avatar = createPlayerAvatar({
    scene,
    camera,
    terrain: world,
    spawn,
    player,
  });
  // The rest of the scene, in draw order: water blends over every opaque
  // object, and the weather draws over the water.
  world.addTranslucentPasses();
  environment.addWeatherToScene();

  /**
   * Inventory (collected blocks + selected slot) and the edit controller that
   * turns crosshair actions into voxel edits. The look ray comes from the
   * avatar, so picking matches where the player is aiming.
   */
  const inventory = new Inventory();
  const editing = new EditingController({
    blocks: world.blocks,
    layer: world.editLayer,
    inventory,
    surfaceOnly,
    onBlockEdited: (i) => world.renderers.onBlockChanged(i),
    onEditRecorded: () => world.scheduleSave(),
    // Broadcast each recorded edit to connected peers, who apply it to their
    // overlay immediately; atproto sync remains the source of truth.
    onEdit: (w, id, updatedAt) =>
      multiplayer.broadcastEdits([
        { x: w[0], y: w[1], z: w[2], id, ts: updatedAt },
      ]),
    getLook: () => avatar.look(),
    getPlayerVoxels: () => avatar.occupiedVoxels(),
  });

  /** This player's network-relevant state: where they are and where they look. */
  const currentPose = (): Pose => ({
    x: avatar.player.position.x,
    y: avatar.player.position.y,
    z: avatar.player.position.z,
    yaw: avatar.player.yaw,
    pitch: avatar.player.pitch,
  });
  /**
   * Owns the cluster-based multiplayer mesh (see `src/multiplayer`): publishes
   * this player's coarse presence, discovers nearby players' presence, links
   * to the nearest few over WebRTC, and renders their avatars. Built before
   * `atproto` because that is what starts it — its own getters below only run
   * once the mesh is online, by which time both exist.
   */
  const multiplayer = new MultiplayerController({
    getRepoClient: () => atproto.repoClient,
    getDid: () => atproto.did,
    seed: terrain.seed,
    getPose: currentPose,
    resolveHandle: (did) => atproto.resolveHandle(did),
    resolvePicture: (did) => atproto.resolvePicture(did),
    createSignaling: createPeerJSSignaling,
    scene,
    camera,
    // A connected peer's optimistic edit broadcasts land straight in the
    // shared overlay (last-write-wins by edit time), where `applyEdits` pushes
    // them into the ring's blocks, rebuilds their meshes, and persists them.
    onRemoteEdits: (_did, edits) => {
      world.applyEdits(
        edits.map((e) => ({
          w: [e.x, e.y, e.z],
          edit: { id: e.id, updatedAt: e.ts },
        })),
      );
    },
  });
  /**
   * Owns the atproto/Bluesky connection and the edit-chunk sync (see
   * `src/atproto`). Restores any stored session at startup; `/sync` uploads
   * fresh edits and merges remote ones into the edit overlay. Signing in also
   * brings the multiplayer mesh online, and signing out takes it down.
   */
  const atproto = new AtprotoController({
    layer: world.editLayer,
    seed: terrain.seed,
    options: {},
    getHandle: () => "",
    onMerged: (changed) => {
      if (changed > 0) {
        // Remote edits just landed in the overlay; push them into the ring's
        // blocks (store + GPU level + mesh) and persist them locally so a
        // reload doesn't drop the merged world until the next `/sync`.
        world.reapplyEdits();
        world.scheduleSave();
      }
    },
    onConnected: (did) => {
      void multiplayer.start();
      // The player's own cube wears the same face the peers around them see,
      // which is only visible from third person but is how they check it.
      void atproto
        .resolvePicture(did)
        .then(async (picture) => {
          if (picture !== null) {
            avatar.setPicture(await createImageBitmap(picture));
          }
        })
        .catch(() => {
          // No picture is a look, not a failure worth reporting.
        });
    },
    onSignedOut: () => void multiplayer.stop(),
  });
  // Reported rather than discarded: restoring a session is the one thing that
  // happens on its own, so without this a reload leaves no way to tell a
  // restored session from a dropped one short of running `/atproto`.
  void atproto.init().then((line) => onNotice?.(line));

  const commands = createCommands({
    dayNight: environment.dayNight,
    rendererSwitch: world.renderers,
    weather: environment.weather,
    sound: environment.sound,
    atproto,
    multiplayer,
    setView: (mode) => {
      avatar.setFirstPerson(mode === "first");
      return `camera: ${mode}-person view`;
    },
    setPlayerVisible: (visible) => {
      avatar.setCubeVisible(visible);
      return visible ? "player cube shown" : "player cube hidden";
    },
    setMoveSpeed: (n) => {
      if (n !== undefined) {
        avatar.player.config.speed = n;
      }
      return `move speed: ${avatar.player.config.speed} units/sec`;
    },
    setLookSensitivity: (n) => {
      if (n !== undefined) {
        avatar.player.config.lookSensitivity = n;
      }
      return `look sensitivity: ${avatar.player.config.lookSensitivity} rad/px`;
    },
  });

  /** Reusable color object, updated in place each frame so sky updates don't allocate. */
  const skyColor = new Color(SKY_BLUE);

  let unmount: (() => void) | null = null;

  /** Advances everything by `dt` seconds, leaving the scene ready to draw. */
  const advance = (dt: number): void => {
    const snapshot = input.consume();
    avatar.move(dt, snapshot);
    // Editing runs before the camera catches up, so this frame's picks are
    // taken from where the eye was last frame along where the player now
    // looks. crosshair reach feedback: recompute every frame so it tracks
    // look, not just edit attempts
    setInReach(editing.pick().target !== null);
    // handle block editing input (edge-triggered dig/place + hotbar select)
    if (snapshot.break) {
      const result = editing.breakBlock();
      if (result !== null) {
        setEditStatus(result);
      }
    }
    if (snapshot.place) {
      setEditStatus(editing.placeBlock());
    }
    if (snapshot.select !== null) {
      inventory.selectSlot(snapshot.select);
    }
    // scroll the terrain ring so the player's block stays centred
    world.scrollTo(avatar.player.position.x, avatar.player.position.z);
    avatar.place();
    // republish this player's coarse presence when they move, broadcast their
    // pose to linked peers, and ease the remote avatars toward their latest
    multiplayer.tick(dt, currentPose());
    const lighting = environment.tick(dt, camera);
    skyColor.set(
      lighting.skyColor[0],
      lighting.skyColor[1],
      lighting.skyColor[2],
    );
    world.renderers.applyLighting(lighting);
    // per-frame work specific to whichever renderer is active (mesh-build
    // draining for the triangle renderer, underwater tint, etc.)
    world.renderers.tick(dt, camera);
  };

  const mount = (canvas: HTMLCanvasElement): (() => void) => {
    const loop = createRenderLoop({
      canvas,
      scene,
      camera,
      debugPerf,
      onDebugStats,
      onFrame: advance,
      clearColor: () => skyColor,
      describeStats: (gl, width, height, sample) =>
        world.renderers.describeDebugStats(gl, width, height, sample),
    });

    unmount = () => {
      unmount = null;
      loop.dispose();
    };

    return unmount;
  };

  return {
    scene,
    camera,
    player: avatar.player,
    input,
    inventory,
    commands,
    debugPerf,
    editStatus,
    inReach,
    mount,

    dispose() {
      unmount?.();
      // stop the fill worker, terminate the mesh worker, and store the edits
      world.dispose();
      // stop presence publishing, discovery, and any peer links
      multiplayer.dispose();
      // release the atproto OAuth state
      atproto.dispose();
      // release the audio hardware
      environment.dispose();
      // detach the keyboard/pointer listeners
      input.dispose();
    },
  };
};
