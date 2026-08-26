import { Color, PerspectiveCamera, Scene } from "@random-mesh/rmsl/scene";
import { createSignal, type Accessor } from "solid-js";
import { AtprotoController } from "../atproto/atproto-controller";
import type { Commander } from "../commands";
import { createCommands } from "../commands";
import { createEnvironment } from "../environment/create-environment";
import { MultiplayerController } from "../multiplayer/multiplayer-controller";
import { createPeerJSSignaling } from "../multiplayer/peerjs-transport";
import { createInput, type InputController } from "../player/create-input";
import { createPlayerAvatar } from "../player/create-player-avatar";
import { EditingController } from "../player/editing-controller";
import { Inventory } from "../player/inventory";
import type { Player, PlayerConfig } from "../player/player";
import { AdaptiveResolution } from "../render/adaptive";
import { createRenderLoop } from "../render/create-render-loop";
import {
  createVoxelWorld,
  type InitialDrawProgress,
} from "../world/create-voxel-world";
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
  /** How much of the world is on screen, for a loading screen to show and dismiss on. */
  loading: Accessor<InitialDrawProgress>;
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

  const input = createInput();
  // Reading `world` here is safe because the sampler is only called when
  // lightning picks a target, by which time the world exists.
  const environment = createEnvironment({
    groundHeightAt: (x, z) => world.heightAt(x, z),
  });

  const [loading, setLoading] = createSignal<InitialDrawProgress>({
    drawn: 0,
    total: blocksPerSide * blocksPerSide,
    spawnDrawn: false,
  });

  const world = createVoxelWorld({
    blocksPerSide,
    terrain,
    surfaceOnly,
    debugPerf,
    spawn,
    onInitialDraw: setLoading,
  });

  /**
   * Camera with a far plane beyond the ring's physical extent, so box
   * geometry is never clipped (fog and early ray termination hide the
   * actual cutoff).
   */
  const camera = new PerspectiveCamera(50, 1.0, 0.1, world.ringRadius + 200);
  const avatar = createPlayerAvatar({
    camera,
    terrain: world,
    spawn,
    player,
  });

  const inventory = new Inventory();
  // Picks run along the avatar's look ray, so what the crosshair is over is
  // what an edit lands on.
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

  // Built before `atproto`, because signing in is what starts the mesh. Its
  // getters read `atproto` before that variable is assigned, which holds
  // because they only run once the mesh is online and both exist by then.
  const multiplayer = new MultiplayerController({
    getRepoClient: () => atproto.repoClient,
    getDid: () => atproto.did,
    seed: terrain.seed,
    getPose: () => ({
      x: avatar.player.position.x,
      y: avatar.player.position.y,
      z: avatar.player.position.z,
      yaw: avatar.player.yaw,
      pitch: avatar.player.pitch,
    }),
    resolveHandle: (did) => atproto.resolveHandle(did),
    resolvePicture: (did) => atproto.resolvePicture(did),
    createSignaling: createPeerJSSignaling,
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
   * Everything drawn, in the order it is drawn. The renderer walks the scene
   * graph and draws what it finds, with no depth-sorted pass for transparency,
   * so a group's place in this list is what puts it in front of or behind
   * another. Each group is owned by whatever fills it, so peers joining an
   * hour from now still land in the place their group was given here.
   */
  const scene = new Scene();
  scene.add(
    // The terrain overdraws the sun and moon squares wherever solid ground
    // lies, which is what occludes them at the horizon.
    environment.sky,
    world.terrain,
    avatar.body,
    multiplayer.avatars,
    // Water writes no depth and blends over whatever is already drawn, so
    // every solid body that can be seen through it comes first.
    world.water,
    environment.weatherEffects,
    // Drawn last with depth testing off, washing the whole view.
    world.underwaterTint,
  );

  // Wired here so that signing in brings the multiplayer mesh online and
  // signing out takes it down, and so a merge from `/sync` reaches the ring's
  // blocks — none of which the controller itself knows about.
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

  /**
   * The render scale for this world, held across mounts rather than by any one
   * canvas, so a remount keeps the scale this already measured its way to.
   */
  const resolution = new AdaptiveResolution();

  const commands = createCommands({
    dayNight: environment.dayNight,
    rendererSwitch: world.renderers,
    weather: environment.weather,
    sound: environment.sound,
    atproto,
    multiplayer,
    resolution,
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
    const progress = loading();
    if (progress.drawn < progress.total) {
      // Frames while the window is still being generated and meshed cost what
      // that work costs, not what drawing the finished world costs. Judging
      // them would drop the resolution to fit a load that is about to end.
      resolution.hold();
    }
    // The player waits for ground to stand on; the world does not wait for the
    // player. Nothing below this block may be skipped while the world is still
    // arriving, because arriving is something the renderers do here — the
    // triangle renderer builds a block's geometry from its `tick`, and it is
    // that geometry the player is being held back for.
    if (progress.spawnDrawn) {
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
      // republish this player's coarse presence when they move, broadcast
      // their pose to linked peers, and ease the remote avatars toward their
      // latest
      multiplayer.tick(dt);
    }
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
      resolution,
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
    loading,
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
