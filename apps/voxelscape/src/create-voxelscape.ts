import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { createSignal, type Accessor } from "solid-js";
import { AdaptiveResolution } from "./adaptive";
import { AtprotoController } from "./atproto/atproto-controller";
import type { Commander } from "./commander";
import { DayNightController } from "./day-night-controller";
import { createDebugCommands } from "./debug-commands";
import { EditingController } from "./editing-controller";
import { createInput, type InputController } from "./create-input";
import { COLLECTABLE, Inventory } from "./inventory";
import { GpuTimer } from "./perf";
import {
  createPlayer,
  lookDirection,
  placeCamera,
  PLAYER_CFG,
  updatePlayer,
  type Player,
  type PlayerWorld,
} from "./player";
import { RendererSwitch } from "./renderers/renderer-switch";
import { loadVoxelTiles } from "./renderers/tile-loader";
import { SoundController } from "./sound-controller";
import { applyWeather } from "./weather";
import { WeatherController } from "./weather-controller";
import { BlockGrid } from "./world/block-grid";
import { EditLayer, type WorldVoxel } from "./world/edit-layer";
import { createEditPersistence } from "./world/edit-persistence";
import {
  BLOCK_WORLD,
  getGroundHeightBelow,
  getWorldHeight,
  isSolidAt,
  isWaterAt,
  syncLevelFromStore,
  VOXEL_SIZE,
  type Dim3,
} from "./world/level-data";
import { DEFAULT_TERRAIN, type TerrainConfig } from "./world/noise";
import { WorldRing } from "./world/world-ring";

/** Sky blue, matching the material's default fog color so the horizon blends. */
const SKY_BLUE = 0x87ceeb;
/**
 * Distance from the origin beyond which player movement is clamped. The
 * ring is effectively unbounded, so this exists only to guard against
 * floating-point drift far outside it.
 */
const SAFE_EXTENT = 1e6;
/** Padding added to each mesh's box so adjacent meshes share a thin overlap shell. */
const PAD = 2.0;
/** Water absorption used by the raymarch water pass and, at the same value, the triangle renderer's underwater tint. */
const WATER_EXTINCTION = 0.12;
/** How many frames between each debug-perf HUD sample (a GPU readback, so throttled). */
const SAMPLE_EVERY = 24;

export interface VoxelscapeConfig {
  /** Width of the streamed block window, in blocks per side. Also sets the fog and camera far distances. */
  blocksPerSide?: number;
  /** Terrain noise settings shared by every block in the ring. */
  terrain?: TerrainConfig;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  surfaceOnly?: boolean;
  /** Where the player starts, in world units; the spawn height is the terrain surface there. */
  spawn?: Dim3;
  /**
   * Enables the GPU timer and the per-frame statistics passed to
   * `onDebugStats`. Defaults to whether the page URL's hash contains `perf`.
   */
  debugPerf?: boolean;
  /** Receives the statistics line once per frame while `debugPerf` is on. */
  onDebugStats?: (line: string) => void;
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
export const createVoxelscape = (config: VoxelscapeConfig = {}): Voxelscape => {
  const blocksPerSide = config.blocksPerSide ?? 5;
  const terrain = config.terrain ?? DEFAULT_TERRAIN;
  const surfaceOnly = config.surfaceOnly ?? true;
  const spawn = config.spawn ?? [0, 0, 0];
  const debugPerf =
    config.debugPerf ??
    (typeof window !== "undefined" && window.location.hash.includes("perf"));
  const onDebugStats = config.onDebugStats;

  /** Ring half-extent: the farthest the ring's outer edge can be from the player. */
  const ringRadius = (blocksPerSide / 2) * BLOCK_WORLD[0];
  /**
   * Distance at which fog becomes fully opaque and rays stop marching. Set
   * to the ring edge's closest possible approach to the player — half a block
   * short of the ring's half-width — the distance when the player hugs the far
   * edge of their center block, so fog always hides the ring boundary before
   * it can become visible.
   */
  const fogDistance = (blocksPerSide / 2 - 0.5) * BLOCK_WORLD[0];
  const fogStart = 0.4 * fogDistance;

  /** First person by default: the camera is the player's eye, and the cube is hidden. */
  let firstPerson = true;
  let showPlayerCube = false;

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
   * Owns the sun/ambient lights, the sun/moon billboards, and the day-night
   * clock. `tick` (called from the frame loop) returns the computed day-night
   * state, which feeds both `rendererSwitch.applyLighting` and the clear
   * colour below.
   */
  const dayNight = new DayNightController({ scene });

  /** A square window of WorldBlocks, tagged with their grid coordinates. */
  const blockGrid = new BlockGrid({ blocksPerSide, terrain, surfaceOnly });

  /**
   * Builds both rendering strategies' meshes for every block above and owns
   * switching between them (`/renderer ray|tri`).
   */
  const rendererSwitch = new RendererSwitch({
    scene,
    blocks: blockGrid.blocks,
    padding: PAD,
    blockWorld: BLOCK_WORLD,
    fogDistance,
    fogStart,
    debugPerf,
    waterExtinction: WATER_EXTINCTION,
    seaLevel: terrain.seaLevel,
  });

  /**
   * The world-coordinate edit overlay: every player break/place, keyed by
   * absolute voxel, so builds survive ring refills and sync to atproto.
   * Persisted to IndexedDB and re-applied to freshly filled blocks.
   */
  const editLayer = new EditLayer();
  const editPersistence = createEditPersistence(editLayer);
  /**
   * Re-applies the edit overlay to every ring block: re-derives the GPU level
   * of each block an edit intersects and notifies the renderer switch (a
   * texture re-upload for the raymarch renderer, a queued mesh rebuild for the
   * triangle renderer). Shared by the IndexedDB load and the post-`/sync`
   * remote-edit merge, both of which change the overlay after blocks already
   * hold generated terrain.
   */
  const applyLayerToBlocks = (): void => {
    const affected: number[] = [];
    for (let i = 0; i < blockGrid.blocks.length; i++) {
      const block = blockGrid.blocks[i];
      if (editLayer.applyToBlock(block) > 0) {
        syncLevelFromStore(block.level, block.store, { surfaceOnly });
        affected.push(i);
      }
    }
    for (const i of affected) {
      rendererSwitch.onBlockChanged(i);
    }
  };

  /**
   * Keeps `blockGrid`'s window centred on the player, streamed in off the
   * main thread as it scrolls.
   */
  const worldRing = new WorldRing({
    blockGrid,
    terrain,
    surfaceOnly,
    onBlockChanged: (i) => rendererSwitch.onBlockChanged(i),
    onBlockReposition: (i, center) => rendererSwitch.repositionBlock(i, center),
    editLayer,
  });

  // Tell every block material which tile each voxel face uses once the
  // spritesheet loads. Fire-and-forget: voxels stay flat blue until it lands.
  loadVoxelTiles(rendererSwitch);
  /**
   * Camera with a far plane beyond the ring's physical extent, so box
   * geometry is never clipped (fog and early ray termination hide the
   * actual cutoff).
   */
  const camera = new PerspectiveCamera(50, 1.0, 0.1, ringRadius + 200);
  const player = createPlayer(
    spawn[0],
    getWorldHeight(blockGrid.blocks, spawn[0], spawn[2]) +
      PLAYER_CFG.halfSize +
      0.1,
    spawn[2],
  );
  const playerCube = new Mesh(
    new BoxGeometry(
      PLAYER_CFG.halfSize * 2,
      PLAYER_CFG.halfSize * 2,
      PLAYER_CFG.halfSize * 2,
    ),
    new MeshStandardMaterial({ color: 0xff7043, roughness: 0.8 }),
  );
  playerCube.position.copy(player.position);
  playerCube.visible = showPlayerCube;
  scene.add(playerCube);

  /**
   * Inventory (collected blocks + selected slot) and the edit controller that
   * turns crosshair actions into voxel edits. The camera look direction is
   * derived from the same look target `placeCamera` uses, so picking matches
   * where the player is aiming.
   */
  const inventory = new Inventory();
  const playerVoxels = (): WorldVoxel[] => {
    const h = PLAYER_CFG.halfSize;
    const bounds = (c: number): [number, number] => [
      Math.floor((c - h) / VOXEL_SIZE),
      Math.floor((c + h) / VOXEL_SIZE),
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
  };
  const editing = new EditingController({
    blocks: blockGrid.blocks,
    layer: editLayer,
    inventory,
    surfaceOnly,
    onBlockEdited: (i) => rendererSwitch.onBlockChanged(i),
    onEditRecorded: () => editPersistence.scheduleSave(),
    getLook: () => {
      const p = camera.position;
      const [dx, dy, dz] = lookDirection(player);
      return {
        origin: [p.x, p.y, p.z],
        direction: [dx, dy, dz],
      };
    },
    getPlayerVoxels: playerVoxels,
  });

  // Re-apply any previously persisted edits to the freshly built initial
  // blocks, now that the overlay has loaded.
  void editPersistence.load().then(applyLayerToBlocks);

  input.install();
  // Both renderers' translucent water passes (and the triangle renderer's
  // underwater tint) blend over the opaque scene; scene-graph draw order
  // means they must be added after the player cube.
  rendererSwitch.addTranslucentPassesToScene(scene);
  /**
   * Synthesizes the weather's sound (rain, wind, thunder) from the Web Audio
   * API. Browsers suspend audio until the first user gesture, so `unlock` is
   * bound to the first pointer/key event below.
   */
  const sound = new SoundController();
  const firstGesture = new AbortController();
  const unlockSound = (): void => {
    sound.unlock();
    firstGesture.abort();
  };
  window.addEventListener("pointerdown", unlockSound, {
    signal: firstGesture.signal,
  });
  window.addEventListener("keydown", unlockSound, {
    signal: firstGesture.signal,
  });
  /**
   * Owns the rain/snow particle systems, the thunder lightning bolts, and the
   * strike flash. Added to the scene after the translucent passes so the
   * weather draws over terrain and water; `tick` returns the current weather
   * so `applyWeather` can tint the day-night state before it reaches the
   * renderers and the clear colour. Lightning strikes are reported to the
   * sound controller so thunder can follow the flashes.
   */
  const weather = new WeatherController({
    scene,
    groundHeight: (x, z) => getWorldHeight(blockGrid.blocks, x, z),
    onStrike: (x, z) => sound.thunderStrike(x, z),
  });
  /**
   * Owns the atproto/Bluesky connection and the edit-chunk sync (see
   * `src/atproto`). Restores any stored session at startup; `/sync` uploads
   * fresh edits and merges remote ones into `editLayer`.
   */
  const atproto = new AtprotoController({
    layer: editLayer,
    seed: terrain.seed,
    options: {},
    getHandle: () => "",
    onMerged: (changed) => {
      if (changed > 0) {
        // Remote edits just landed in the overlay; push them into the ring's
        // blocks (store + GPU level + mesh) and persist them locally so a
        // reload doesn't drop the merged world until the next `/sync`.
        applyLayerToBlocks();
        editPersistence.scheduleSave();
      }
    },
  });
  void atproto.init();
  const commands = createDebugCommands({
    dayNight,
    rendererSwitch,
    weather,
    sound,
    atproto,
    setView: (mode) => {
      firstPerson = mode === "first";
      return `camera: ${mode}-person view`;
    },
    setPlayerVisible: (visible) => {
      showPlayerCube = visible;
      return visible ? "player cube shown" : "player cube hidden";
    },
    setMoveSpeed: (n) => {
      if (n !== undefined) {
        PLAYER_CFG.speed = n;
      }
      return `move speed: ${PLAYER_CFG.speed} units/sec`;
    },
    setLookSensitivity: (n) => {
      if (n !== undefined) {
        PLAYER_CFG.lookSensitivity = n;
      }
      return `look sensitivity: ${PLAYER_CFG.lookSensitivity} rad/px`;
    },
  });
  placeCamera(camera, player, firstPerson);

  /**
   * A pure scaler fed this frame's render time. It steps the render
   * resolution scale by roughly 1.25x per adjustment, so marginal devices
   * converge on a stable scale instead of thrashing between 1x and 0.5x.
   */
  const adaptive = new AdaptiveResolution();

  /** Built once rather than per frame; the samplers read the live blocks. */
  const playerWorld: PlayerWorld = {
    groundHeightAt: (x, y, z) =>
      getGroundHeightBelow(blockGrid.blocks, x, y, z),
    inWaterAt: (x, y, z) => isWaterAt(blockGrid.blocks, x, y, z),
    solidAt: (x, y, z) => isSolidAt(blockGrid.blocks, x, y, z),
    halfExtent: SAFE_EXTENT,
  };

  let unmount: (() => void) | null = null;

  const mount = (canvas: HTMLCanvasElement): (() => void) => {
    const renderer = new WebGLRenderer(canvas);
    renderer.setClearColor(SKY_BLUE, 1);
    const timer = debugPerf ? new GpuTimer(renderer.gl) : undefined;

    /** Reusable color object, updated in place each frame so sky updates don't allocate. */
    const skyColor = new Color(SKY_BLUE);
    let baseW = 0;
    let baseH = 0;
    let lastAdaptT = 0;
    let lastFrameT = 0;
    let sampleCounter = 0;

    const render = (): void => {
      if (timer !== undefined) {
        timer.begin();
      }
      renderer.render(scene, camera);
      if (timer === undefined) {
        return;
      }
      timer.end();
      timer.poll();
      sampleCounter++;
      const sample = sampleCounter % SAMPLE_EVERY === 0;
      const stats = rendererSwitch.describeDebugStats(
        renderer.gl,
        renderer.canvas.width,
        renderer.canvas.height,
        sample,
      );
      onDebugStats?.(
        `frame: ${timer.ms.toFixed(2)} ms | res: ${adaptive.scale}x | ${stats}`,
      );
    };

    const applyResolution = (scale: number): void => {
      if (baseW <= 0 || baseH <= 0) {
        return;
      }
      const w = Math.max(1, Math.round(baseW * scale));
      const h = Math.max(1, Math.round(baseH * scale));
      if (w !== canvas.width || h !== canvas.height) {
        canvas.width = w;
        canvas.height = h;
        // Resizing the canvas clears its drawing buffer to transparent, which
        // would flash the page background until the next RAF frame. Draw the new
        // resolution immediately so the compositor never shows the cleared buffer.
        render();
      }
    };

    /**
     * Called once per frame after `render()`: feeds the frame time (in
     * milliseconds) into the scaler and applies whatever scale it settles on.
     * Readback frames are skipped from the decision (they stall the GPU) but
     * still update the exponential moving average.
     */
    const adaptResolution = (t: number): void => {
      if (lastAdaptT > 0) {
        const dt = t - lastAdaptT;
        const next =
          debugPerf && sampleCounter % SAMPLE_EVERY === 0
            ? adaptive.frame(dt)
            : adaptive.update(dt);
        applyResolution(next);
      }
      lastAdaptT = t;
    };

    const animate = (t: number): void => {
      const dt =
        lastFrameT > 0 ? Math.min(0.05, (t - lastFrameT) / 1000) : 1 / 60;
      lastFrameT = t;
      const snapshot = input.consume();
      updatePlayer(player, dt, snapshot, playerWorld);
      // crosshair reach feedback: recompute every frame so it tracks look, not
      // just edit attempts
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
        inventory.setSelected(
          Object.keys(COLLECTABLE).map(Number)[snapshot.select],
        );
      }
      // scroll the terrain ring so the player's block stays centred
      worldRing.scrollToPlayer(player.position.x, player.position.z);
      playerCube.position.copy(player.position);
      // the cube's local +Z faces the heading; a Y rotation by `yaw` aligns it
      playerCube.rotation.y = player.yaw;
      playerCube.visible = showPlayerCube;
      placeCamera(camera, player, firstPerson);
      // advance the day-night clock and re-derive the scene lighting. A command
      // override pins the shown time; otherwise the real clock (scaled by speed)
      // drives the cycle. The weather schedule keys off the same shown clock
      // seconds, and its intensity then tints the day-night state before it
      // reaches the renderers and the clear colour.
      const dn = dayNight.tick(dt, camera);
      const weatherView = weather.tick(dt, camera, dn.elapsed);
      sound.tick(dt, camera, weatherView);
      const env = applyWeather(dn, weatherView.weather, weatherView.intensity);
      skyColor.set(env.skyColor[0], env.skyColor[1], env.skyColor[2]);
      renderer.setClearColor(skyColor, 1);
      rendererSwitch.applyLighting(env);
      // per-frame work specific to whichever renderer is active (mesh-build
      // draining for the triangle renderer, underwater tint, etc.)
      rendererSwitch.tick(dt, camera);
      render();
      adaptResolution(t);
    };

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      if (!Number.isFinite(aspect) || aspect <= 0) {
        return;
      }
      baseW = rect.width * window.devicePixelRatio;
      baseH = rect.height * window.devicePixelRatio;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      // a layout change changes the render cost, so hold adaptation while
      // the new base resolution settles
      adaptive.hold();
      applyResolution(adaptive.scale);
    });
    resizeObserver.observe(canvas);
    renderer.setAnimationLoop(animate);

    unmount = () => {
      unmount = null;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      // release the renderer's GPU programs, buffers and textures
      renderer.dispose();
    };
    return unmount;
  };

  return {
    scene,
    camera,
    player,
    input,
    inventory,
    commands,
    debugPerf,
    editStatus,
    inReach,
    mount,

    dispose() {
      unmount?.();
      // stop the fill worker so it doesn't keep running after unmount
      worldRing.dispose();
      // store the edit overlay before the render loop stops
      void editPersistence.saveNow();
      // release the atproto OAuth state
      atproto.dispose();
      // release the audio hardware
      sound.dispose();
      // detach the keyboard/pointer listeners
      input.dispose();
      firstGesture.abort();
    },
  };
};
