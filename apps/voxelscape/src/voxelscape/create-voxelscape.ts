import { Color, PerspectiveCamera, Scene } from "@random-mesh/rmsl/scene";
import { createSignal, type Accessor } from "solid-js";
import { AtprotoController } from "../atproto/atproto-controller";
import {
  createModelLibrary,
  MONSTER_MODEL_NAME,
  WORLD_MODEL_ACCOUNT,
} from "../atproto/models";
import type { Commander } from "../commands";
import { createCommands } from "../commands";
import { createEnvironment } from "../environment/create-environment";
import { MonsterSync } from "../atproto/monster-sync";
import { MonsterController } from "../monsters/monster-controller";
import { RemoteMonsters } from "../monsters/remote-monsters";
import { MultiplayerController } from "../multiplayer/multiplayer-controller";
import { createPeerJSSignaling } from "../multiplayer/peerjs-transport";
import { createInput, type InputController } from "../player/create-input";
import { createPlayerAvatar } from "../player/create-player-avatar";
import { EditingController } from "../player/editing-controller";
import { Hand } from "../player/hand";
import { PlayerHealth } from "../player/health";
import { Inventory } from "../player/inventory";
import { ITEM_ORDER, ITEMS, type ItemId } from "../player/items";
import type { Player, PlayerConfig } from "../player/player";
import { loadSpriteModel } from "../player/sprite-model";
import type { Target, Tool, ToolContext } from "../player/tools/tool";
import { AdaptiveResolution } from "../render/adaptive";
import { createRenderLoop } from "../render/create-render-loop";
import {
  createVoxelWorld,
  type InitialDrawProgress,
} from "../world/create-voxel-world";
import type { SubTexture } from "../renderers/atlas";
import { cellsInSphere } from "../world/chunk-sphere";
import { type Dim3 } from "../world/level-data";
import { DEFAULT_TERRAIN, type TerrainConfig } from "../world/noise";

/** Sky blue, matching the material's default fog color so the horizon blends. */
const SKY_BLUE = 0x87ceeb;

export interface VoxelscapeConfig {
  /** Radius of the spherical streamed window, in chunks. Also sets the fog and camera far distances. */
  chunkRadius?: number;
  /** Terrain noise settings shared by every block in the ring. */
  terrain?: TerrainConfig;
  /** When true, only surface voxels are written into each block's GPU chunks instead of the full solid volume. */
  /** Where the player starts, in world units; the spawn height is the terrain surface there. */
  spawn?: Dim3;
  /** Movement settings for this world's player; anything omitted takes its default. */
  player?: Partial<PlayerConfig>;
  /**
   * Starts the world with the GPU timer and the per-frame statistics passed to
   * `onDebugStats` turned on, which `/render:perf` then toggles. Defaults to
   * whether the page URL's hash contains `perf`.
   */
  debugPerf?: boolean;
  /**
   * The account whose published models the monsters are drawn as, named by
   * handle or by account id. Defaults to the account this world publishes its
   * own drawings to; `null` keeps to the model file the site serves.
   */
  modelAccount?: string | null;
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
  /** The player's hearts and the death fall that empties them. */
  health: PlayerHealth;
  commands: Commander;
  /** Whether `onDebugStats` is being called, which `/render:perf` toggles. */
  debugPerf: Accessor<boolean>;
  /** Last strike or use result, so the HUD can show silent failures. */
  editStatus: Accessor<string>;
  /** What the crosshair is over, or null when the primary button would find nothing. */
  target: Accessor<Target | null>;
  /**
   * The spritesheet crop each item's hotbar icon is drawn from, filled in as
   * the sprites load. An item absent here is shown by name instead.
   */
  icons: Accessor<Partial<Record<ItemId, SubTexture>>>;
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
  chunkRadius = 4,
  terrain = DEFAULT_TERRAIN,
  spawn = [0, 0, 0],
  modelAccount = WORLD_MODEL_ACCOUNT,
  debugPerf: initialDebugPerf = typeof window !== "undefined" &&
    window.location.hash.includes("perf"),
  onDebugStats,
  onNotice,
  player,
}: VoxelscapeConfig = {}): Voxelscape => {
  const [editStatus, setEditStatus] = createSignal("");
  const [target, setTarget] = createSignal<Target | null>(null);
  const [icons, setIcons] = createSignal<Partial<Record<ItemId, SubTexture>>>(
    {},
  );
  const [debugPerf, setDebugPerf] = createSignal(initialDebugPerf);

  const input = createInput();
  const environment = createEnvironment({
    groundHeightAt: (x, z) => world.heightAt(x, z),
  });

  const [loading, setLoading] = createSignal<InitialDrawProgress>({
    drawn: 0,
    total: cellsInSphere(chunkRadius),
    spawnDrawn: false,
  });

  const world = createVoxelWorld({
    chunkRadius,
    terrain,
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

  /**
   * The player's hearts and the death sequence. When a zombie's swing empties
   * them, the camera plays the fall a corpse does, then this stands the
   * player back up at spawn with full hearts.
   */
  const health = new PlayerHealth({
    onFallDone: () => {
      // The fall has lain out: put the player back on their feet at spawn,
      // facing the way they started, before this frame's normal placement.
      const ground = world.heightAt(spawn[0], spawn[2]);
      avatar.player.position.set(
        spawn[0],
        ground + avatar.player.config.halfSize + 0.1,
        spawn[2],
      );
      avatar.player.yaw = 0;
      avatar.player.pitch = 0;
      avatar.player.vx = 0;
      avatar.player.vy = 0;
      avatar.player.vz = 0;
      avatar.player.onGround = false;
      avatar.player.flying = false;
      health.respawn();
    },
  });

  const monsters = new MonsterController({
    seed: terrain.seed,
    heightAt: (x, z) => world.heightAt(x, z),
    solidAt: (x, y, z) => world.solidAt(x, y, z),
    waterAt: (x, y, z) => world.inWaterAt(x, y, z),
    getDid: () => atproto.did,
    // Monsters chase and are owned by the nearest player: the local avatar
    // plus whoever the mesh has a live link to.
    getPlayers: () => [
      {
        did: atproto.did ?? "",
        x: avatar.player.position.x,
        y: avatar.player.position.y,
        z: avatar.player.position.z,
      },
      ...multiplayer.peerPositions(),
    ],
    // The optimistic path: owned monsters' state fans out over the mesh, and
    // peers render it without waiting for atproto.
    onBroadcast: (updates) => multiplayer.broadcastMonsters(updates),
    // A monster this client hurt flashes red, so the hit reads on the model.
    onHit: (id) => monsterRender.flashHit(id),
    // A zombie's swing lands on a player: the local player takes it on their
    // own health, a peer is told over the mesh so their client applies it.
    onHitPlayer: (did, amount) => {
      if (did === (atproto.did ?? "")) {
        health.takeDamage(amount);
      } else {
        multiplayer.broadcastPlayerDamage({ target: did, amount });
      }
    },
  });
  const monsterRender = new RemoteMonsters({
    getMonsters: () => monsters.monsters.values(),
  });

  const inventory = new Inventory();
  const hand = new Hand({ camera });
  const editing = new EditingController({
    blocks: world.blocks,
    layer: world.editLayer,
    inventory,
    onBlocksEdited: (indices) => world.renderer.onBlocksChanged(indices),
    onEditRecorded: () => world.scheduleSave(),
    // Peers apply these immediately; the atproto sync is still what settles
    // disagreements.
    onEdit: (w, id, updatedAt) =>
      multiplayer.broadcastEdits([
        { x: w[0], y: w[1], z: w[2], id, ts: updatedAt },
      ]),
    getLook: () => avatar.look(),
    getPlayerVoxels: () => avatar.occupiedVoxels(),
  });

  const toolContext: ToolContext = {
    editing,
    look: () => avatar.look(),
    position: () => avatar.player.position,
    monsters: () => monsters.monsters.values(),
    damageMonster: (id, amount) => monsters.damage(id, amount),
    flashMonster: (id) => monsterRender.flashHit(id),
    broadcastMonsterDamage: (damage) => multiplayer.broadcastDamage(damage),
    setGuarding: (raised) => health.setGuarding(raised),
  };
  const tools = Object.fromEntries(
    ITEM_ORDER.map((id) => [id, ITEMS[id].tool(toolContext)]),
  ) as Record<ItemId, Tool>;

  /** The item the hand holds, so the tool it names is put away when it changes. */
  let wielded: ItemId | null = null;
  const wield = (next: ItemId | null): void => {
    if (next === wielded) {
      return;
    }
    if (wielded !== null) {
      tools[wielded].stow();
    }
    wielded = next;
  };

  const atproto = new AtprotoController({
    layer: world.editLayer,
    seed: terrain.seed,
    getHandle: () => "",
    onMerged: (changed) => {
      if (changed > 0) {
        world.reapplyEdits();
        world.scheduleSave();
      }
    },
    onConnected: (did) => {
      void multiplayer.start();
      monsterSync.start();
      // Their own cube wears the face peers see, which is how they check it.
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
    onSignedOut: () => {
      void multiplayer.stop();
      monsterSync.stop();
    },
  });

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
    onRemoteEdits: (_did, edits) => {
      world.applyEdits(
        edits.map((e) => ({
          w: [e.x, e.y, e.z],
          edit: { id: e.id, updatedAt: e.ts },
        })),
      );
    },
    // A peer's monsters are theirs to simulate; we just display what they sent.
    onRemoteMonsters: (_did, updates) => {
      monsters.applyMonsterUpdates(updates);
    },
    // A peer's swing damages the monsters this client owns.
    onRemoteDamage: (_did, damage) => {
      monsters.applyRemoteDamage(damage);
    },
    // A peer's zombie swung at this player: apply it to the local health.
    onRemotePlayerDamage: (_did, damage) => {
      if (damage.target === (atproto.did ?? "")) {
        health.takeDamage(damage.amount);
      }
    },
  });

  // The durable path: owned monsters are written to atproto at a throttled
  // cadence, and every repo's records are discovered and merged back in — the
  // source of truth behind the optimistic broadcasts.
  const monsterSync = new MonsterSync({
    getRepoClient: () => atproto.repoClient,
    getDid: () => atproto.did,
    onRecords: (records) => monsters.mergeFromAtproto(records),
    getRecordsToWrite: (now) => monsters.recordsForPersistence(now),
    onPersisted: (ids) => monsters.markPersisted(ids),
  });

  const modelLibrary = createModelLibrary();

  /**
   * Puts the monsters in the best drawing this world can reach, nearest first:
   * the model file this site serves, then the one the model account published
   * under `MONSTER_MODEL_NAME` if it has one. The site's file is a small
   * same-origin fetch and the account is a walk across the network, so taking
   * them in that order is what gets the monsters dressed at all quickly;
   * whatever the account publishes then replaces it. Redrawing a monster is
   * therefore republishing it — nobody has to touch this code, this site, or
   * wait for either to deploy.
   */
  const dressMonsters = async (): Promise<string> => {
    const response = await fetch("./models/zombie.zip").catch(() => null);
    if (response !== null && response.ok) {
      const line = await monsterRender.loadModelFromBlob(await response.blob());
      onNotice?.(`${line} — served by this site`);
    }

    if (modelAccount === null) {
      return "monsters wear the model this site serves";
    }

    try {
      const model = await modelLibrary.find(modelAccount, MONSTER_MODEL_NAME);
      const line = await monsterRender.loadModelFromBlob(
        await modelLibrary.file(model),
      );
      return `${line} — published by ${modelAccount}`;
    } catch {
      // An account that has published nothing under that name is not a broken
      // world: the file this site serves is already being worn.
      return "monsters wear the model this site serves";
    }
  };

  void dressMonsters().then((line) => onNotice?.(line));

  // Every item drawn from the site's spritesheet is read once, for the mesh
  // the hand holds and the crop its hotbar icon shows; a failure to load just
  // leaves that item undrawn rather than blocking the world.
  for (const id of ITEM_ORDER) {
    const sprite = ITEMS[id].sprite;
    if (sprite === null) {
      continue;
    }
    void loadSpriteModel(sprite)
      .then(({ model, bbox }) => {
        hand.setModel(id, model);
        setIcons((current) => ({ ...current, [id]: bbox }));
      })
      .catch((err) =>
        console.warn(`[${id}] not drawn; the player holds nothing.`, err),
      );
  }

  /**
   * Everything drawn, in the order it is drawn. There is no depth-sorted pass
   * for transparency, so a group's place in this list is the whole of what
   * puts it in front of or behind another.
   */
  const scene = new Scene();
  scene.add(
    environment.sky,
    world.terrain,
    avatar.body,
    multiplayer.avatars,
    monsterRender.group,
    world.water,
    environment.weatherEffects,
    world.underwaterTint,
    // The camera carries the held sword, and it has to be part of the scene
    // for its children to be drawn; it also sits last so the sword draws over
    // the world when it overlaps the view.
    camera,
  );

  // A restored session is the one thing that happens without being asked for,
  // so it is the one thing worth saying unprompted.
  void atproto.init().then((line) => onNotice?.(line));

  /**
   * The render scale for this world, held across mounts rather than by any one
   * canvas, so a remount keeps the scale this already measured its way to.
   */
  const resolution = new AdaptiveResolution();

  const commands = createCommands({
    renderer: world.renderer,
    dayNight: environment.dayNight,
    weather: environment.weather,
    sound: environment.sound,
    atproto,
    multiplayer,
    monsters,
    monsterSync,
    monsterRender,
    health,
    models: modelLibrary,
    modelAccount,
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
    setFlying: (flying) => {
      const next = flying ?? !avatar.player.flying;
      avatar.player.flying = next;
      if (next) {
        // don't carry the fall they were in into the air
        avatar.player.vy = 0;
        avatar.player.onGround = false;
      }
      return next ? "flying" : "walking";
    },
    setNoClip: (noclip) => {
      const next = noclip ?? !avatar.player.noclip;
      avatar.player.noclip = next;
      if (next) {
        // don't carry the fall they were in into the air
        avatar.player.vy = 0;
        avatar.player.onGround = false;
      }
      return next ? "no-clip" : "collisions on";
    },
    setDebugPerf: (on) => {
      const next = on ?? !debugPerf();
      setDebugPerf(next);
      return next ? "performance readout shown" : "performance readout hidden";
    },
  });

  /** Reusable color object, updated in place each frame so sky updates don't allocate. */
  const skyColor = new Color(SKY_BLUE);

  let unmount: (() => void) | null = null;

  /** Advances everything by `dt` seconds, leaving the scene ready to draw. */
  const advance = (dt: number): void => {
    const progress = loading();
    if (progress.drawn < progress.total) {
      // These frames cost what generating terrain costs, not what drawing it
      // does, and the resolution would drop to fit a load that is about to end.
      resolution.hold();
    }
    // Only the player waits. Moving the renderers' tick in here deadlocks:
    // it is what builds the geometry this is waiting for. The world-ready
    // half holds them still while a scroll's player cell has been asked for
    // but has not landed, so physics never reads a cell that holds nothing.
    if (
      progress.spawnDrawn &&
      world.cellReady(
        avatar.player.position.x,
        avatar.player.position.y,
        avatar.player.position.z,
      )
    ) {
      health.tick(dt);
      if (health.dead) {
        // The player's body lies where it fell: no input, no editing, and no
        // swing — just the death fall the camera plays while the world keeps
        // simulating around the corpse. `onFallDone` stands them back up at
        // spawn once it has lain out, and the ordinary branch below runs
        // from this frame on.
        avatar.placeDeath(health.fallProgress);
        wield(null);
        setTarget(null);
        hand.show(null, null);
      } else {
        const snapshot = input.consume();
        avatar.move(dt, snapshot);
        // Selecting first, so the rest of the frame — the pick, both buttons,
        // and what the hand draws — all belong to the same tool.
        if (snapshot.select !== null) {
          inventory.selectSlot(snapshot.select);
        }
        if (snapshot.wheel !== 0) {
          inventory.selectStep(snapshot.wheel);
        }
        wield(inventory.selectedId);
        const tool = tools[inventory.selectedId];
        // The camera has not caught up yet, so this picks from last frame's eye
        // along this frame's look. Recomputed every frame, not just on edits, so
        // the crosshair tracks what it is over.
        const pick = tool.pick();
        setTarget(pick.primary);
        if (snapshot.primary) {
          const result = tool.primary(pick);
          if (result !== null) {
            setEditStatus(result);
          }
        }
        if (snapshot.secondary) {
          const result = tool.secondary(pick);
          if (result !== null) {
            setEditStatus(result);
          }
        }
        world.scrollTo(
          avatar.player.position.x,
          avatar.player.position.y,
          avatar.player.position.z,
        );
        avatar.place();
        tool.update(dt, snapshot);
        hand.show(
          avatar.firstPerson ? inventory.selectedId : null,
          tool.pose(),
        );
      }
      multiplayer.tick(dt);
      monsters.tick(dt);
      monsterRender.tick(dt);
    }
    const lighting = environment.tick(dt, camera);
    skyColor.set(
      lighting.skyColor[0],
      lighting.skyColor[1],
      lighting.skyColor[2],
    );
    world.renderer.applyLighting(lighting);
    // The voxel-model zombies are self-lit, so they take the same day-night
    // state the renderers apply to the terrain and the standard materials.
    monsterRender.applyLighting(lighting);
    hand.applyLighting(lighting);
    world.renderer.tick(dt, camera);
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
      describeStats: () =>
        `tris: ${world.renderer.triangleCount.toLocaleString()}`,
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
    health,
    commands,
    debugPerf,
    editStatus,
    target,
    icons,
    loading,
    mount,

    dispose() {
      unmount?.();
      world.dispose();
      multiplayer.dispose();
      atproto.dispose();
      environment.dispose();
      monsterRender.clear();
      monsterSync.dispose();
      hand.dispose();
      input.dispose();
    },
  };
};
