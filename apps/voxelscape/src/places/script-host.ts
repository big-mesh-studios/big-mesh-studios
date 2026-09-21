// The place script host: the trusted side that runs one creator script in the
// sandbox, feeds it the replicated facts added since the last step, and applies
// whatever it asks for. What a script asks for is limited to the effect
// vocabulary (`effects.ts`), and what it is fed is the shared event log
// (`event-log.ts`), so two peers stepping the same script with the same clock
// converge to the same NPCs and the same dialogs (ADR 0026, 0027). The host is
// a plain domain object: no scene, no DOM, no network — the NPCs it keeps and
// the dialogs it reports are what a caller renders and a player acts on.
import { createQuickJSSandbox } from "./quickjs-sandbox";
import { EventLog } from "./event-log";
import {
  MAX_UI_ITEMS,
  MAX_UI_PANELS,
  parseEffect,
  type ParsedEffect,
  type UiAnchor,
} from "./effects";
import { ScriptInventory } from "./script-items";
import { poseAt, type MotionPose, type MotionSpec } from "./motion";
import {
  createPlaceData,
  type DataScope,
  type DataValue,
  type PlaceData,
} from "./place-data";
import type { CameraShot, CutsceneState } from "./cutscene";
import { bundlePlaceProject } from "./bundle";
import { raycastAabb, raycastVoxels, unitDirection } from "./raycast";
import { findVoxelPath, type PathfindOptions } from "./pathfind";
import type {
  AttributeValue,
  EntitySnapshot,
  LeaderboardEntry,
  LivePlayer,
  RaycastHit,
  RequireOnly,
  ScriptSandbox,
  WorldQuery,
} from "./sandbox";
import type { ScriptEvent, ScriptEventPayload } from "./events";

/**
 * How long, in milliseconds on the shared clock, a blast stays in the host's
 * list. A renderer needs it only long enough to start its burst, so an older
 * one is dropped rather than kept for the life of a run.
 */
const EXPLOSION_MEMORY_MS = 5_000;

/**
 * How long an NPC dispatched as `npc-die` is kept around after it, still
 * standing in `npcs` so the renderer has something to fall over and lie
 * flat with, before it is forgotten the same way `npc-remove` forgets one
 * outright.
 */
const DEATH_ANIMATION_MS = 1_000;

/**
 * How many times a step may re-run for facts authored while applying the last
 * one's effects. A script that answers a death with another death settles here
 * instead of stepping forever.
 */
const MAX_CASCADE_STEPS = 8;

/** Half the width and depth a scripted figure's query box is tested as, in world units. */
const ENTITY_HALF = 0.6;
/** How tall a figure with no declared height is tested in a query, in world units. */
const ENTITY_HEIGHT = 2;
/** Half the width, depth, and height a player's query box is tested as, in world units. */
const PLAYER_HALF = 0.5;

/** One scripted NPC: where it stands, how it faces, and what it is called. */
export interface ScriptedNpc {
  id: string;
  name: string;
  /** The place model file the NPC wears, or "" for the world's own pick. */
  model: string;
  /**
   * The NPC's model, read live from its own `at://` address, or "" to wear
   * `model` instead — takes precedence over `model` when set.
   */
  modelUri: string;
  /** Feet position, in world units; the renderer stands a figure on it. */
  x: number;
  y: number;
  z: number;
  /** Heading in radians; the renderer turns the figure to it. */
  yaw: number;
  /**
   * The clock moment `npc-die` played this NPC's death fall, or undefined
   * while it is standing. The renderer times its fall from this rather than
   * the host, which only uses it to know when `DEATH_ANIMATION_MS` has
   * passed and the NPC is finally forgotten.
   */
  dyingAt?: number;
  /** A path and spin the NPC follows over the shared clock. */
  motion?: MotionSpec;
  /** Names this NPC answers to in a query, e.g. "enemy". */
  tags: string[];
  /** Values the script hangs on this NPC under a name. */
  attributes: Record<string, AttributeValue>;
  /** A model motion this NPC plays, sampled from the shared clock. */
  animation?: FigureAnimation;
  /** A tint and fade over the colours this NPC's model wears. */
  look?: FigureLook;
}

/** One scripted prop: where it stands, and which place model it wears. */
export interface ScriptedProp {
  id: string;
  /** The model file the prop wears, as the place's manifest names it. */
  model: string;
  name: string;
  /** Feet position, in world units. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  height: number;
  /** Whether the prop blocks the player rather than being walked through. */
  solid: boolean;
  /** Whether touching the prop is a hazard the script hears about. */
  hazard: boolean;
  /** Whether a player standing on the prop is turned to the prop's heading. */
  seat: boolean;
  /** A path and spin the prop follows over the shared clock. */
  motion?: MotionSpec;
  /**
   * The horizontal velocity the prop's surface carries a player standing on
   * it, in units per second — a conveyor, standing in where a motion would.
   */
  conveyor?: { vx: number; vz: number };
  /**
   * The velocity the prop's own body moves at, in units per second, set by the
   * script each time it moves the prop, so a rider is carried by a body the
   * script drives rather than by a `motion` sampled over the clock.
   */
  velocity?: { vx: number; vy: number; vz: number };
  /** Names this prop answers to in a query, e.g. "enemy". */
  tags: string[];
  /** Values the script hangs on this prop under a name. */
  attributes: Record<string, AttributeValue>;
  /** A model motion this prop plays, sampled from the shared clock. */
  animation?: FigureAnimation;
  /** A tint and fade over the colours this prop's model wears. */
  look?: FigureLook;
}

/** One scripted field: a box that acts on a player standing inside it. */
export interface ScriptedField {
  id: string;
  kind: "push" | "quicksand";
  /** The box a player must stand in, in world units, inclusive. */
  min: [number, number, number];
  max: [number, number, number];
  /** A push's horizontal and vertical target pulls, in units per second. */
  vx: number;
  vz: number;
  /** A push's vertical target pull; undefined when the script set none. */
  vy: number | undefined;
  /** Quicksand's scale on a player's walk speed; 1 when the script set none. */
  speedScale: number;
  /** Quicksand's fastest fall, in units per second; 0 when the script set none. */
  sink: number;
}

// The blaze record the host reports lives in the world area, whose types both
// the host and the renderer may import; it is re-exported so a caller of the
// host need not know where it is kept.
import type { ScriptedFire } from "../world/fire-ember";
export type { ScriptedFire };

// The blast record, kept in the world area beside the blaze record and
// re-exported for the same reason.
import type { ScriptedExplosion } from "../world/explosion-blast";
export type { ScriptedExplosion };

// The resolved light, label, particle, and mark records, kept in the world
// area so the renderers that draw them need not reach into the place area;
// re-exported for the same reason the blaze record is.
import type { BillboardPose } from "../world/scripted-billboard";
export type { BillboardPose };
import type { LightPose } from "../world/scripted-light";
export type { LightPose };
import type { ParticlePose, ParticleStyle } from "../world/scripted-particle";
import { PARTICLE_STYLES } from "../world/scripted-particle";
export type { ParticlePose, ParticleStyle };
import type { DecalKind, DecalPose } from "../world/scripted-decal";
export type { DecalPose };
import type { BeamPose } from "../world/scripted-beam";
export type { BeamPose };

/** One named box a script watches the players move through. */
export interface ScriptZone {
  id: string;
  name: string;
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * One box the player cannot walk through, stood by a script and drawn
 * nothing — a `barrier` blocks bodies but not script-steered movement or
 * bullets, so a horde can walk through the same wall gap a player cannot.
 */
export interface ScriptedBarrier {
  id: string;
  min: [number, number, number];
  max: [number, number, number];
}

/** One readout a place script shows in a player's HUD. */
export interface HudReadout {
  id: string;
  kind: "bar" | "text";
  label: string;
  /** A bar's filled amount; 0 for a text readout. */
  value: number;
  /** A bar's full amount; 0 for a text readout. */
  max: number;
  /** A text readout's body; "" for a bar. */
  text: string;
}

/**
 * A figure a place script holds the camera behind until it is cleared: where
 * the camera sits relative to the figure, and where ahead of it the view
 * looks. Only the local peer's own player camera is driven by it.
 */
export interface FollowCamera {
  entityId: string;
  /** How far behind the figure the camera sits, in world units. */
  back: number;
  /** How far above the figure the camera sits, in world units. */
  up: number;
  /** How far ahead of the figure the camera looks, in world units. */
  lookAhead: number;
  /** The field of view to hold, or null to leave the current one. */
  fov: number | null;
}

/** How a script asked for a sound to play, beyond the fixed name it chose. */
export interface SoundPlayback {
  /** The id a later `sound-stop` reaches it by, or "" for a one-shot. */
  id: string;
  volume: number;
  pitch: number;
  loop: boolean;
}

/** One model motion a script plays on a figure, sampled from the shared clock. */
export interface FigureAnimation {
  /** The motion's name, as the model's own file names it. */
  name: string;
  /** How fast to play it; 1 is the motion's own rate. */
  speed: number;
  /** Whether it repeats. */
  loop: boolean;
}

/** How a scripted figure is tinted and faded, over the colours the model wears. */
export interface FigureLook {
  /** The colour the figure is multiplied by, each channel 0 to 1. */
  color: [number, number, number];
  /** The share of the figure's opacity kept, 0 to 1. */
  alpha: number;
}

/** One glowing line a place script draws between two ends. */
export interface ScriptedBeam {
  id: string;
  /** The figure the line starts at, or "" to start at `from`. */
  fromEntity: string;
  from: [number, number, number];
  /** The figure the line ends at, or "" to end at `to`. */
  toEntity: string;
  to: [number, number, number];
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** How wide the line is drawn, in world units. */
  width: number;
}

/** One key a place script listens on, by the id the `input` fact carries. */
export interface ScriptBinding {
  id: string;
  /** The key code the binding listens on. */
  key: string;
  /** Shown to players; the key code when the script named no label. */
  label: string;
}

/** One prompt a place script stands on a figure for a player to answer. */
export interface ScriptPrompt {
  id: string;
  entityId: string;
  verb: string;
  /** A key code shown beside the verb, or "" for none. */
  key: string;
  /** How close the player must be, in world units. */
  range: number;
  /** Whether the prompt fires once and is then forgotten. */
  once: boolean;
}

/** One point light a place script has lit. */
export interface ScriptedLight {
  id: string;
  /** The figure it hangs over, or "" to stand where it was placed. */
  entityId: string;
  x: number;
  y: number;
  z: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** How far it reaches, in world units. */
  range: number;
  intensity: number;
}

/** One world-space label a place script shows. */
export interface ScriptedBillboard {
  id: string;
  text: string;
  /** The figure it hangs over, or "" to stand where it was placed. */
  entityId: string;
  x: number;
  y: number;
  z: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  /** Drawn height in world units. */
  scale: number;
  /** How far above an attached figure's feet it hangs, in world units. */
  height: number;
}

/** One particle emitter a place script runs. */
export interface ScriptedParticle {
  id: string;
  /** The figure it hangs over, or "" to stand where it was placed. */
  entityId: string;
  x: number;
  y: number;
  z: number;
  /** The resolved look the emitter draws with. */
  style: ParticleStyle;
  /** Whether it keeps emitting until removed. */
  loop: boolean;
  /** The shared-clock moment it was last started. */
  at: number;
}

/** One mark a place script has laid on the world. */
export interface ScriptedDecal {
  id: string;
  kind: DecalKind;
  /** The figure it lies under, or "" to lie where it was placed. */
  entityId: string;
  x: number;
  y: number;
  z: number;
  /** Linear RGB, 0 to 1 each. */
  color: [number, number, number];
  size: number;
  yaw: number;
}

/** One item a scripted panel shows. */
export type UiItem =
  | {
      kind: "label";
      id: string;
      text: string;
      /** Linear RGB, 0 to 1 each. */
      color: [number, number, number];
    }
  | { kind: "bar"; id: string; label: string; value: number; max: number }
  | { kind: "button"; id: string; label: string; value: string }
  | { kind: "image"; id: string; sprite: string };

/** One panel a place script shows a player. */
export interface UiPanel {
  id: string;
  title: string;
  anchor: UiAnchor;
  items: UiItem[];
}

/** A panel as the host holds it while the script builds it up, items in order. */
interface UiPanelState {
  id: string;
  title: string;
  anchor: UiAnchor;
  items: Map<string, UiItem>;
}

/** The dialog one player is currently in, as the script last set it. */
export interface DialogState {
  npcId: string;
  /** What the NPC is called, for the dialog's speaker line. */
  name: string;
  prompt: string;
  options: string[];
}

/**
 * The shared clock and world queries a script needs — the same six
 * `WorldQuery` functions the sandbox itself takes (`quickjs-sandbox.ts`),
 * with the two this host cannot run without (`getNow`, `getHeightAt`) made
 * required.
 */
export interface ScriptHostParams extends RequireOnly<
  WorldQuery,
  "getNow" | "getHeightAt"
> {
  /** Seeds the interpreter's randomness; a place's peers all pass the same one. */
  seed: number;
  /** Called with a line meant for `player` (empty means every local player). */
  onToast?: (player: string, text: string) => void;
  /**
   * Called when the place asks for a sound effect; empty `player` means every
   * local peer plays its own copy, since an effect is never replayed on the
   * wire. The name is one of the world's fixed sound vocabulary.
   */
  onSound?: (player: string, name: string, playback: SoundPlayback) => void;
  /** Called when the script stops a sound it named, by that id. */
  onSoundStop?: (player: string, id: string) => void;
  /** Called when `player`'s dialog changes; null when it closed. */
  onDialog?: (player: string, state: DialogState | null) => void;
  /** Called when a step could not run, or the script logged a line. */
  onNotice?: (message: string) => void;
  /** Called when `player`'s game reaches an ending, or null to close it. */
  onEnding?: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  /** Called when `player`'s game asks to start over. */
  onRestart?: (player: string) => void;
  /** Called when the script pins, jumps, or releases the day-night clock. */
  onTime?: (command: {
    seconds?: number;
    speed?: number;
    clear?: boolean;
  }) => void;
  /** Called when a player is shown a line with no figure speaking it. */
  onNarrate?: (player: string, line: { name: string; text: string }) => void;
  /** Called when the script moves a player, optionally turning them. */
  onPlayerPlace?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  /** Called when the script turns a player to look at a world point. */
  onPlayerFace?: (player: string, at: { x: number; z: number }) => void;
  /** Called when the script scales a player's walk speed. */
  onPlayerSpeed?: (player: string, multiplier: number) => void;
  /** Called when the script scales a player's jump. */
  onPlayerJump?: (player: string, multiplier: number) => void;
  /** Called when the script takes hit points off a player, naming the
   * entity that dealt it when the script said whose swing it was. */
  onPlayerDamage?: (player: string, amount: number, source?: string) => void;
  /** Called when the script restores hit points to a player. */
  onPlayerHeal?: (player: string, amount: number) => void;
  /** Called when the script sets how many hit points a player may hold. */
  onPlayerMaxHealth?: (player: string, maxHealth: number) => void;
  /** Called when the script adds velocity to a player, for knockback or a jump pad. */
  onPlayerPush?: (player: string, vx: number, vy: number, vz: number) => void;
  /**
   * Called when the script's current owner of a live-tracked NPC reports its
   * new position, to broadcast to other peers rather than leave them to
   * compute their own guess from the same live, latency-skewed data.
   */
  onEntityMove?: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  /**
   * Called with every fact this host itself authors — a player's own talk,
   * use, or swing — so it can be broadcast to other peers. Without this, a
   * fact this host's script folds into its NPCs and dialogs stays true only
   * here: every other peer's own script never hears of it and quietly
   * diverges.
   */
  onEvent?: (event: ScriptEvent) => void;
  /** Called when the script sets where `player` respawns. */
  onCheckpoint?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  /** Called when the script kills `player`; the world plays the fall and respawns. */
  onKill?: (player: string, cause: string) => void;
  /** Called when the script respawns `player` outright, with no fall. */
  onRespawn?: (player: string) => void;
  /** Called when the script sets the height below which the player is killed. */
  onVoid?: (y: number) => void;
  /** Called when the script lights a fire; the world seeds its ember light. */
  onFire?: (fire: ScriptedFire) => void;
  /** Called when the script sets off a blast; the world draws the burst. */
  onExplosion?: (explosion: ScriptedExplosion) => void;
  /**
   * Called when the script fills a box of voxels, `id` 0 clearing them, in
   * LOD-0 voxel coordinates — the world writes it into the shared edit layer
   * so the change reaches every peer the way a player's own edit does.
   */
  onBlockEdit?: (edit: {
    min: [number, number, number];
    max: [number, number, number];
    id: number;
  }) => void;
  /** The data the place remembers between runs; a run-scoped table when omitted. */
  data?: PlaceData;
  /** Called when the script sends a player to another place. */
  onTeleport?: (player: string, place: string) => void;
  /** Called when the script changes what a player wears; `model` "" is the plain cube. */
  onPlayerModel?: (player: string, model: string, modelUri: string) => void;
  /**
   * Called to re-read a remembered value the table does not hold, so a save
   * made on another device arrives as a `data-loaded` fact. Left out, a
   * `data-get` answers from the table alone.
   */
  refreshData?: (
    scope: DataScope,
    player: string,
    key: string,
  ) => Promise<DataValue | null>;
}

/**
 * Runs one place script and owns what it creates. Not tied to a renderer: the
 * NPC map, the dialogs, and the actions a player can take are the whole of
 * what the world needs.
 */
export class ScriptHost {
  private readonly ready: Promise<ScriptSandbox>;
  private readonly getHeightAt: (x: number, z: number) => number;
  private readonly getNow: () => number;
  private readonly getSolidAt?: (x: number, y: number, z: number) => boolean;
  private readonly getPlayers?: () => LivePlayer[];
  private readonly onToast?: (player: string, text: string) => void;
  private readonly onSound?: (
    player: string,
    name: string,
    playback: SoundPlayback,
  ) => void;
  private readonly onSoundStop?: (player: string, id: string) => void;
  private readonly onDialog?: (
    player: string,
    state: DialogState | null,
  ) => void;
  private readonly onNotice?: (message: string) => void;
  private readonly onEnding?: (
    player: string,
    state: { title: string; text: string } | null,
  ) => void;
  private readonly onRestart?: (player: string) => void;
  private readonly onTime?: (command: {
    seconds?: number;
    speed?: number;
    clear?: boolean;
  }) => void;
  private readonly onNarrate?: (
    player: string,
    line: { name: string; text: string },
  ) => void;
  private readonly onPlayerPlace?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  private readonly onPlayerFace?: (
    player: string,
    at: { x: number; z: number },
  ) => void;
  private readonly onPlayerSpeed?: (player: string, multiplier: number) => void;
  private readonly onPlayerJump?: (player: string, multiplier: number) => void;
  private readonly onPlayerDamage?: (
    player: string,
    amount: number,
    source?: string,
  ) => void;
  private readonly onPlayerHeal?: (player: string, amount: number) => void;
  private readonly onPlayerMaxHealth?: (
    player: string,
    maxHealth: number,
  ) => void;
  private readonly onPlayerPush?: (
    player: string,
    vx: number,
    vy: number,
    vz: number,
  ) => void;
  private readonly onEntityMove?: (state: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
  }) => void;
  private readonly onEvent?: (event: ScriptEvent) => void;
  private readonly onCheckpoint?: (
    player: string,
    at: { x: number; z: number; y?: number; yaw?: number },
  ) => void;
  private readonly onKill?: (player: string, cause: string) => void;
  private readonly onRespawn?: (player: string) => void;
  private readonly onVoid?: (y: number) => void;
  private readonly onFire?: (fire: ScriptedFire) => void;
  private readonly onExplosion?: (explosion: ScriptedExplosion) => void;
  private readonly onBlockEdit?: (edit: {
    min: [number, number, number];
    max: [number, number, number];
    id: number;
  }) => void;
  private readonly onTeleport?: (player: string, place: string) => void;
  private readonly onPlayerModel?: (
    player: string,
    model: string,
    modelUri: string,
  ) => void;
  private readonly refreshData?: (
    scope: DataScope,
    player: string,
    key: string,
  ) => Promise<DataValue | null>;
  /** The data the place remembers between runs. */
  private readonly data: PlaceData;

  /** The items this place's script defines and the local player carries. */
  readonly inventory = new ScriptInventory();
  private readonly log = new EventLog();
  private readonly sent = new Set<string>();
  private readonly npcs = new Map<string, ScriptedNpc>();
  private readonly props = new Map<string, ScriptedProp>();
  /**
   * Ids of NPCs and props the script placed with no explicit height, so their
   * `y` is re-read from `getHeightAt` every step instead of fixed at the
   * moment they were placed — the column under them may not have streamed in
   * yet then, and settles on its own once it has.
   */
  private readonly groundedNpcs = new Set<string>();
  private readonly groundedProps = new Set<string>();
  private readonly fires = new Map<string, ScriptedFire>();
  private readonly explosions = new Map<string, ScriptedExplosion>();
  private readonly zones = new Map<string, ScriptZone>();
  /** The barriers the script has stood, blocking players from crossing them. */
  private readonly barriers = new Map<string, ScriptedBarrier>();
  /** The fields the script has declared, acting on players inside them. */
  private readonly fields = new Map<string, ScriptedField>();
  /** The teams the script has defined, by id to the name shown for it. */
  private readonly teams = new Map<string, string>();
  /** Which team each player is on, keyed by the player string a script uses. */
  private readonly playerTeams = new Map<string, string>();
  /** The named values the script keeps per player, player then key. */
  private readonly playerValues = new Map<string, Map<string, number>>();
  /** The keys a script listens on, keyed by binding id. */
  private readonly bindings = new Map<string, ScriptBinding>();
  /** The prompts a script stands on figures, keyed by prompt id. */
  private readonly prompts = new Map<string, ScriptPrompt>();
  /** The point lights a script has lit, keyed by light id. */
  private readonly lights = new Map<string, ScriptedLight>();
  /** The labels a script shows, keyed by billboard id. */
  private readonly billboards = new Map<string, ScriptedBillboard>();
  /** The particle emitters a script runs, keyed by emitter id. */
  private readonly particles = new Map<string, ScriptedParticle>();
  /** The marks a script has laid, keyed by mark id. */
  private readonly decals = new Map<string, ScriptedDecal>();
  /** The lines a script draws, keyed by beam id. */
  private readonly beams = new Map<string, ScriptedBeam>();
  /** Which zones each player currently stands in, keyed by player. */
  private readonly playerZones = new Map<string, Set<string>>();
  private readonly dialogs = new Map<string, DialogState>();
  /** Timer ids waiting to fire, each against the shared clock it is due at. */
  private readonly pendingTimers = new Map<string, number>();
  /** The height below which the script kills the player, or null when unset. */
  private voidHeight: number | null = null;
  /** The HUD readouts each player is showing, keyed by player then readout id. */
  private readonly readouts = new Map<string, Map<string, HudReadout>>();
  /** The scripted UI each player is showing, keyed by player then panel id. */
  private readonly panels = new Map<string, Map<string, UiPanelState>>();
  /** The camera sequence each player is watching, keyed by player. */
  private readonly cutscenes = new Map<string, CutsceneState>();
  /** The figure each player's camera follows, keyed by player. */
  private readonly follows = new Map<string, FollowCamera>();
  /** Whether each player's movement and tools are taken away, keyed by player. */
  private readonly controlLocks = new Map<string, boolean>();
  private pumping = false;
  private loaded = false;
  private sequence = 0;
  private problem: string | undefined;
  private disposed = false;

  constructor(params: ScriptHostParams) {
    this.getNow = params.getNow;
    this.getHeightAt = params.getHeightAt;
    this.getSolidAt = params.getSolidAt;
    this.getPlayers = params.getPlayers;
    this.onToast = params.onToast;
    this.onSound = params.onSound;
    this.onSoundStop = params.onSoundStop;
    this.onDialog = params.onDialog;
    this.onNotice = params.onNotice;
    this.onEnding = params.onEnding;
    this.onRestart = params.onRestart;
    this.onTime = params.onTime;
    this.onNarrate = params.onNarrate;
    this.onPlayerPlace = params.onPlayerPlace;
    this.onPlayerFace = params.onPlayerFace;
    this.onPlayerSpeed = params.onPlayerSpeed;
    this.onPlayerJump = params.onPlayerJump;
    this.onPlayerDamage = params.onPlayerDamage;
    this.onPlayerHeal = params.onPlayerHeal;
    this.onPlayerMaxHealth = params.onPlayerMaxHealth;
    this.onPlayerPush = params.onPlayerPush;
    this.onEntityMove = params.onEntityMove;
    this.onEvent = params.onEvent;
    this.onCheckpoint = params.onCheckpoint;
    this.onKill = params.onKill;
    this.onRespawn = params.onRespawn;
    this.onVoid = params.onVoid;
    this.onFire = params.onFire;
    this.onExplosion = params.onExplosion;
    this.onBlockEdit = params.onBlockEdit;
    this.onTeleport = params.onTeleport;
    this.onPlayerModel = params.onPlayerModel;
    this.refreshData = params.refreshData;
    this.data = params.data ?? createPlaceData();
    this.ready = createQuickJSSandbox({
      seed: params.seed,
      getNow: params.getNow,
      getEndings: params.getEndings,
      getHeightAt: params.getHeightAt,
      getSolidAt: params.getSolidAt,
      getWaterAt: params.getWaterAt,
      getPlayers: params.getPlayers,
      getBlockAt: params.getBlockAt,
      getEntity: (id) => this.entity(id),
      getEntitiesInBox: (min, max) => this.entitiesInBox(min, max),
      getEntitiesInSphere: (x, y, z, radius) =>
        this.entitiesInSphere(x, y, z, radius),
      getEntitiesWithTag: (tag) => this.entitiesWithTag(tag),
      getPlayer: (did) => this.player(did),
      getPlayersInBox: (min, max) => this.playersInBox(min, max),
      getLocalPlayer: () => this.localPlayer(),
      getInput: () => params.getInput?.() ?? null,
      getPlayerValue: (did, key) => this.playerValue(did, key),
      getLeaderboard: (key, count) => this.leaderboard(key, count),
      getData: (scope, player, key) =>
        this.data.get(scope, this.dataPlayer(scope, player), key),
      getDataLeaderboard: (key, count) => this.dataLeaderboard(key, count),
      raycast: (origin, direction, maxDistance) =>
        this.ray(origin, direction, maxDistance),
      findPath: (from, to, options) => this.findPath(from, to, options),
      getHeldItem: () => this.inventory.heldItem()?.id ?? "",
    });
  }

  /** Every scripted NPC currently standing in the world. */
  get npcList(): ScriptedNpc[] {
    return [...this.npcs.values()];
  }

  /**
   * Moves an NPC to where a peer reported it, without asking the local
   * script for a position of its own — the counterpart to the `npc` effect's
   * `live` flag, for whichever peer is not the one currently computing it.
   * A no-op for an id the local script has never placed, since there is
   * nothing to move.
   */
  applyRemoteNpc(
    id: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ): void {
    const npc = this.npcs.get(id);
    if (npc === undefined) {
      return;
    }
    this.npcs.set(id, { ...npc, x, y, z, yaw });
    this.groundedNpcs.delete(id);
  }

  /** The NPC with `id`, or null when the script has not placed one. */
  npc(id: string): ScriptedNpc | null {
    return this.npcs.get(id) ?? null;
  }

  /**
   * Re-reads `y` from `getHeightAt` for every NPC and prop the script placed
   * with no explicit height. Meant to be called every frame: a figure placed
   * on a column whose terrain had not streamed in yet is grounded against an
   * estimate until it has, and this is what lets it settle onto the real
   * ground the moment it does, with nothing waiting on that landing first.
   */
  regroundAuto(): void {
    for (const id of this.groundedNpcs) {
      const npc = this.npcs.get(id);
      if (npc !== undefined) {
        this.npcs.set(id, { ...npc, y: this.getHeightAt(npc.x, npc.z) });
      }
    }
    for (const id of this.groundedProps) {
      const prop = this.props.get(id);
      if (prop !== undefined) {
        this.props.set(id, { ...prop, y: this.getHeightAt(prop.x, prop.z) });
      }
    }
  }

  /**
   * Merges facts a peer authored into the shared log and, when any of them
   * are new, steps the script so it reacts to them exactly as it would to
   * one of its own — the counterpart to `author`, so every peer's script
   * folds over the same facts and converges on the same NPCs and dialogs.
   */
  async applyRemoteEvents(events: ScriptEvent[]): Promise<void> {
    if (this.disposed || this.log.apply(events) === 0) {
      return;
    }
    // A remembered value a peer changed is folded into this peer's table too,
    // so a save and a leaderboard agree wherever they are read.
    for (const event of events) {
      if (event.kind === "data-changed") {
        this.data.set(
          event.scope,
          event.player,
          event.key,
          event.deleted ? null : (event.value ?? null),
        );
      } else if (event.kind === "badge-earned") {
        this.data.set("player", event.player, "badge:" + event.badge, true);
      }
    }
    await this.step();
  }

  /** Every prop the script has placed in the world. */
  get propList(): ScriptedProp[] {
    return [...this.props.values()];
  }

  /** The prop with `id`, or null when the script has not placed one. */
  prop(id: string): ScriptedProp | null {
    return this.props.get(id) ?? null;
  }

  /** The motion the figure `id` is playing, or null when it plays none. */
  animationFor(id: string): FigureAnimation | null {
    return (
      this.npcs.get(id)?.animation ?? this.props.get(id)?.animation ?? null
    );
  }

  /** The tint and fade the figure `id` wears, or null when it wears none. */
  lookFor(id: string): FigureLook | null {
    return this.npcs.get(id)?.look ?? this.props.get(id)?.look ?? null;
  }

  /** Every light the script has lit, each at the position it stands at now. */
  get lightList(): LightPose[] {
    const out: LightPose[] = [];
    for (const light of this.lights.values()) {
      if (light.entityId === "") {
        out.push({
          id: light.id,
          x: light.x,
          y: light.y,
          z: light.z,
          color: light.color,
          range: light.range,
          intensity: light.intensity,
        });
        continue;
      }
      const figure = this.entity(light.entityId);
      if (figure === null) {
        continue;
      }
      out.push({
        id: light.id,
        x: figure.x,
        y: figure.y + 1.2,
        z: figure.z,
        color: light.color,
        range: light.range,
        intensity: light.intensity,
      });
    }
    return out;
  }

  /** Every emitter the script runs, each at the position it stands at now. */
  get particleList(): ParticlePose[] {
    const out: ParticlePose[] = [];
    for (const particle of this.particles.values()) {
      const base = {
        id: particle.id,
        ...particle.style,
        loop: particle.loop,
        at: particle.at,
      };
      if (particle.entityId === "") {
        out.push({
          ...base,
          x: particle.x,
          y: particle.y,
          z: particle.z,
        });
        continue;
      }
      const figure = this.entity(particle.entityId);
      if (figure === null) {
        continue;
      }
      out.push({ ...base, x: figure.x, y: figure.y + 0.5, z: figure.z });
    }
    return out;
  }

  /** Every mark the script has laid, each at the position it lies at now. */
  get decalList(): DecalPose[] {
    const out: DecalPose[] = [];
    for (const decal of this.decals.values()) {
      const base = {
        id: decal.id,
        kind: decal.kind,
        color: decal.color,
        size: decal.size,
        yaw: decal.yaw,
      };
      if (decal.entityId === "") {
        out.push({ ...base, x: decal.x, y: decal.y, z: decal.z });
        continue;
      }
      const figure = this.entity(decal.entityId);
      if (figure === null) {
        continue;
      }
      out.push({ ...base, x: figure.x, y: figure.y + 0.05, z: figure.z });
    }
    return out;
  }

  /** Every line the script draws, each at the endpoints it spans now. */
  get beamList(): BeamPose[] {
    const out: BeamPose[] = [];
    for (const beam of this.beams.values()) {
      const a = this.beamEnd(beam.fromEntity, beam.from);
      const b = this.beamEnd(beam.toEntity, beam.to);
      if (a === null || b === null) {
        continue;
      }
      out.push({
        id: beam.id,
        ax: a[0],
        ay: a[1],
        az: a[2],
        bx: b[0],
        by: b[1],
        bz: b[2],
        color: beam.color,
        width: beam.width,
      });
    }
    return out;
  }

  /** Where one end of a beam stands: its fixed point, or above the figure it names. */
  private beamEnd(
    entityId: string,
    point: [number, number, number],
  ): [number, number, number] | null {
    if (entityId === "") {
      return point;
    }
    const figure = this.entity(entityId);
    return figure === null ? null : [figure.x, figure.y + 1, figure.z];
  }

  /** Every label the script shows, each at the position it hangs at now. */
  get billboardList(): BillboardPose[] {
    const out: BillboardPose[] = [];
    for (const label of this.billboards.values()) {
      if (label.entityId === "") {
        out.push({
          id: label.id,
          x: label.x,
          y: label.y,
          z: label.z,
          text: label.text,
          color: label.color,
          scale: label.scale,
        });
        continue;
      }
      const figure = this.entity(label.entityId);
      if (figure === null) {
        continue;
      }
      out.push({
        id: label.id,
        x: figure.x,
        y: figure.y + label.height,
        z: figure.z,
        text: label.text,
        color: label.color,
        scale: label.scale,
      });
    }
    return out;
  }

  /** The figure `id` names, NPC or prop, as a script's own query sees it. */
  private entity(id: string): EntitySnapshot | null {
    const npc = this.npcs.get(id);
    if (npc !== undefined) {
      return this.npcSnapshot(npc);
    }
    const prop = this.props.get(id);
    return prop === undefined ? null : this.propSnapshot(prop);
  }

  /** Every figure whose box overlaps the world-unit box `min` to `max`, in id order. */
  private entitiesInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): EntitySnapshot[] {
    const inside = (snapshot: EntitySnapshot, height: number): boolean =>
      snapshot.x + ENTITY_HALF >= min[0] &&
      snapshot.x - ENTITY_HALF <= max[0] &&
      snapshot.y + height >= min[1] &&
      snapshot.y <= max[1] &&
      snapshot.z + ENTITY_HALF >= min[2] &&
      snapshot.z - ENTITY_HALF <= max[2];
    return this.snapshots()
      .filter((entry) => inside(entry.snapshot, entry.height))
      .map((entry) => entry.snapshot);
  }

  /** Every figure whose box comes within `radius` of a world-unit point, in id order. */
  private entitiesInSphere(
    x: number,
    y: number,
    z: number,
    radius: number,
  ): EntitySnapshot[] {
    const near = (snapshot: EntitySnapshot, height: number): boolean => {
      const dx = Math.max(0, Math.abs(x - snapshot.x) - ENTITY_HALF);
      const dy = Math.max(0, snapshot.y - y, y - (snapshot.y + height));
      const dz = Math.max(0, Math.abs(z - snapshot.z) - ENTITY_HALF);
      return dx * dx + dy * dy + dz * dz <= radius * radius;
    };
    return this.snapshots()
      .filter((entry) => near(entry.snapshot, entry.height))
      .map((entry) => entry.snapshot);
  }

  /** Every figure carrying `tag`, in id order. */
  private entitiesWithTag(tag: string): EntitySnapshot[] {
    return this.snapshots()
      .filter((entry) => entry.snapshot.tags.includes(tag))
      .map((entry) => entry.snapshot);
  }

  /** The player `did` names, with the team this script put them on, or null. */
  private player(did: string): LivePlayer | null {
    const found = this.getPlayers?.().find((entry) => entry.did === did);
    if (found === undefined) {
      return null;
    }
    const team = this.playerTeams.get(did);
    return team === undefined ? found : { ...found, team };
  }

  /** Every player standing in the world-unit box `min` to `max`, each with their team. */
  private playersInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): LivePlayer[] {
    return (this.getPlayers?.() ?? [])
      .filter(
        (entry) =>
          entry.x >= min[0] &&
          entry.x <= max[0] &&
          entry.y >= min[1] &&
          entry.y <= max[1] &&
          entry.z >= min[2] &&
          entry.z <= max[2],
      )
      .map((entry) => {
        const team = this.playerTeams.get(entry.did);
        return team === undefined ? entry : { ...entry, team };
      });
  }

  /** The DID of the player on this peer, or "" when they are not signed in. */
  private localPlayer(): string {
    return this.getPlayers?.()[0]?.did ?? "";
  }

  /** The value the script set for `did` under `key`, or null when none. */
  private playerValue(did: string, key: string): number | null {
    return this.playerValues.get(did)?.get(key) ?? null;
  }

  /**
   * Answers a `data-get` with a `data-loaded` fact: from the table when it
   * holds the value, or from `refreshData` for a save made elsewhere.
   */
  private async loadData(
    scope: DataScope,
    player: string,
    key: string,
    requestId: string,
  ): Promise<void> {
    let value = this.data.get(scope, player, key);
    if (value === undefined && this.refreshData !== undefined) {
      value = (await this.refreshData(scope, player, key)) ?? undefined;
    }
    if (this.disposed) {
      return;
    }
    this.author(
      {
        kind: "data-loaded",
        requestId,
        scope,
        key,
        found: value !== undefined,
        ...(value === undefined ? {} : { value }),
      },
      this.localPlayer(),
    );
    await this.step();
  }

  /** Which player a data write belongs to: the local one for "", nobody for global or account. */
  private dataPlayer(scope: DataScope, player: string | undefined): string {
    if (scope === "global" || scope === "account") {
      return "";
    }
    return player === undefined || player === "" ? this.localPlayer() : player;
  }

  /** The players whose remembered number under `key` ranks, highest first. */
  private dataLeaderboard(
    key: string,
    count: number,
  ): Array<{ player: string; value: DataValue }> {
    const limit = Math.max(1, Math.min(32, Math.floor(count)));
    const entries: Array<{ player: string; value: number }> = [];
    for (const player of this.data.players()) {
      const value = this.data.get("player", player, key);
      if (typeof value === "number") {
        entries.push({ player, value });
      }
    }
    entries.sort(
      (a, b) =>
        b.value - a.value ||
        (a.player < b.player ? -1 : a.player > b.player ? 1 : 0),
    );
    return entries.slice(0, limit);
  }

  /** The players ranked by `key`, highest first, ties by player string, at most `count`. */
  private leaderboard(key: string, count: number): LeaderboardEntry[] {
    const limit = Math.max(1, Math.min(32, Math.floor(count)));
    const entries: LeaderboardEntry[] = [];
    for (const [player, values] of this.playerValues) {
      const value = values.get(key);
      if (value !== undefined) {
        entries.push({ player, value });
      }
    }
    entries.sort(
      (a, b) =>
        b.value - a.value ||
        (a.player < b.player ? -1 : a.player > b.player ? 1 : 0),
    );
    return entries.slice(0, limit);
  }

  /**
   * The first thing a ray meets: terrain, a scripted figure, or a player. The
   * figure and player boxes are tested in world axes, the approximation the
   * crosshair pick also makes for a body it does not turn.
   */
  private ray(
    origin: readonly [number, number, number],
    direction: readonly [number, number, number],
    maxDistance: number,
  ): RaycastHit | null {
    const unit = unitDirection(direction[0], direction[1], direction[2]);
    if (unit === null) {
      return null;
    }
    let best: RaycastHit | null = null;
    const consider = (
      contact: { distance: number; nx: number; ny: number; nz: number } | null,
      kind: RaycastHit["kind"],
      id: string,
    ): void => {
      if (
        contact === null ||
        (best !== null && contact.distance >= best.distance)
      ) {
        return;
      }
      best = {
        kind,
        x: origin[0] + unit[0] * contact.distance,
        y: origin[1] + unit[1] * contact.distance,
        z: origin[2] + unit[2] * contact.distance,
        nx: contact.nx,
        ny: contact.ny,
        nz: contact.nz,
        distance: contact.distance,
        id,
      };
    };
    if (this.getSolidAt !== undefined) {
      consider(
        raycastVoxels(
          origin,
          unit[0],
          unit[1],
          unit[2],
          maxDistance,
          this.getSolidAt,
        ),
        "block",
        "",
      );
    }
    for (const entry of this.snapshots()) {
      const snapshot = entry.snapshot;
      consider(
        raycastAabb(
          origin,
          unit[0],
          unit[1],
          unit[2],
          {
            min: [
              snapshot.x - ENTITY_HALF,
              snapshot.y,
              snapshot.z - ENTITY_HALF,
            ],
            max: [
              snapshot.x + ENTITY_HALF,
              snapshot.y + entry.height,
              snapshot.z + ENTITY_HALF,
            ],
          },
          maxDistance,
        ),
        snapshot.kind,
        snapshot.id,
      );
    }
    for (const entry of this.getPlayers?.() ?? []) {
      consider(
        raycastAabb(
          origin,
          unit[0],
          unit[1],
          unit[2],
          {
            min: [
              entry.x - PLAYER_HALF,
              entry.y - PLAYER_HALF,
              entry.z - PLAYER_HALF,
            ],
            max: [
              entry.x + PLAYER_HALF,
              entry.y + PLAYER_HALF,
              entry.z + PLAYER_HALF,
            ],
          },
          maxDistance,
        ),
        "player",
        entry.did,
      );
    }
    return best;
  }

  /** The walkable route from one world point to another, or null when none exists. */
  private findPath(
    from: readonly [number, number, number],
    to: readonly [number, number, number],
    options?: PathfindOptions,
  ): Array<[number, number, number]> | null {
    return findVoxelPath(
      from,
      to,
      this.getHeightAt,
      this.getSolidAt ?? (() => false),
      options,
    );
  }

  /** Every scripted figure and the height its query box stands, in id order. */
  private snapshots(): Array<{ snapshot: EntitySnapshot; height: number }> {
    const entries: Array<{ snapshot: EntitySnapshot; height: number }> = [];
    for (const npc of this.npcs.values()) {
      entries.push({ snapshot: this.npcSnapshot(npc), height: ENTITY_HEIGHT });
    }
    for (const prop of this.props.values()) {
      entries.push({ snapshot: this.propSnapshot(prop), height: prop.height });
    }
    entries.sort((a, b) => (a.snapshot.id < b.snapshot.id ? -1 : 1));
    return entries;
  }

  private npcSnapshot(npc: ScriptedNpc): EntitySnapshot {
    const pose =
      npc.motion === undefined ? null : poseAt(npc.motion, this.getNow());
    return {
      id: npc.id,
      kind: "npc",
      x: npc.x + (pose?.dx ?? 0),
      y: npc.y + (pose?.dy ?? 0),
      z: npc.z + (pose?.dz ?? 0),
      yaw: npc.yaw + (pose?.yaw ?? 0),
      model: npc.model,
      name: npc.name,
      tags: npc.tags,
      attributes: npc.attributes,
    };
  }

  private propSnapshot(prop: ScriptedProp): EntitySnapshot {
    const pose =
      prop.motion === undefined ? null : poseAt(prop.motion, this.getNow());
    return {
      id: prop.id,
      kind: "prop",
      x: prop.x + (pose?.dx ?? 0),
      y: prop.y + (pose?.dy ?? 0),
      z: prop.z + (pose?.dz ?? 0),
      yaw: prop.yaw + (pose?.yaw ?? 0),
      model: prop.model,
      name: prop.name,
      tags: prop.tags,
      attributes: prop.attributes,
    };
  }

  /** Every field the script has declared in the world. */
  get fieldList(): ScriptedField[] {
    return [...this.fields.values()];
  }

  /** The field with `id`, or null when the script has not declared one. */
  field(id: string): ScriptedField | null {
    return this.fields.get(id) ?? null;
  }

  /** Every barrier the script has stood in the world. */
  get barrierList(): ScriptedBarrier[] {
    return [...this.barriers.values()];
  }

  /** The barrier with `id`, or null when the script has not stood one. */
  barrier(id: string): ScriptedBarrier | null {
    return this.barriers.get(id) ?? null;
  }

  /** Where the NPC `id` is at the shared clock, or null when it does not move. */
  npcPose(id: string): MotionPose | null {
    const motion = this.npcs.get(id)?.motion;
    return motion === undefined ? null : poseAt(motion, this.getNow());
  }

  /**
   * Where the prop `id` is and how fast it is going at the shared clock, or
   * null when it neither moves by a motion nor is driven by the script. A
   * script-driven prop stands at its declared pose and reports the velocity
   * the script last set, so a rider is carried the way a platform carries one.
   */
  propPose(id: string): MotionPose | null {
    const prop = this.props.get(id);
    if (prop === undefined) {
      return null;
    }
    if (prop.motion !== undefined) {
      return poseAt(prop.motion, this.getNow());
    }
    if (prop.velocity === undefined) {
      return null;
    }
    return {
      dx: 0,
      dy: 0,
      dz: 0,
      yaw: 0,
      spinAxis: [0, 1, 0],
      spinAngle: 0,
      vx: prop.velocity.vx,
      vy: prop.velocity.vy,
      vz: prop.velocity.vz,
    };
  }

  /** Every blaze the script has lit in the world. */
  get fireList(): ScriptedFire[] {
    return [...this.fires.values()];
  }

  /** The blaze with `id`, or null when the script has not lit one. */
  fire(id: string): ScriptedFire | null {
    return this.fires.get(id) ?? null;
  }

  /** Every blast the script has set off that the world may still be drawing. */
  get explosionList(): ScriptedExplosion[] {
    return [...this.explosions.values()];
  }

  /** The blast with `id`, or null when the script has not set one off. */
  explosion(id: string): ScriptedExplosion | null {
    return this.explosions.get(id) ?? null;
  }

  /** The dialog `player` is in, or null when they are not talking. */
  dialogFor(player: string): DialogState | null {
    return this.dialogs.get(player) ?? null;
  }

  /** The height below which the script kills the player, or null when unset. */
  get voidY(): number | null {
    return this.voidHeight;
  }

  /** The readouts `player`'s HUD shows, in the order the script set them. */
  hudFor(player: string): HudReadout[] {
    return [...(this.readouts.get(player)?.values() ?? [])];
  }

  /** The panels `player`'s scripted UI shows, in the order the script made them. */
  uiFor(player: string): UiPanel[] {
    const panels = this.panels.get(player);
    if (panels === undefined) {
      return [];
    }
    return [...panels.values()].map((panel) => ({
      id: panel.id,
      title: panel.title,
      anchor: panel.anchor,
      items: [...panel.items.values()],
    }));
  }

  /** Reports `player` pressing a button, authoring the `ui-clicked` fact. */
  async clickUi(player: string, panel: string, button: string): Promise<void> {
    this.assertAlive();
    const item = this.panels.get(player)?.get(panel)?.items.get(button);
    if (item === undefined || item.kind !== "button") {
      return;
    }
    this.author(
      { kind: "ui-clicked", panel, button, value: item.value },
      player,
    );
    await this.step();
  }

  /** The panel with `id` for `player`, made when absent and within the caps. */
  private panelFor(player: string, id: string): UiPanelState | null {
    let panels = this.panels.get(player);
    if (panels === undefined) {
      panels = new Map();
      this.panels.set(player, panels);
    }
    let panel = panels.get(id);
    if (panel === undefined) {
      if (panels.size >= MAX_UI_PANELS) {
        return null;
      }
      panel = { id, title: "", anchor: "top-left", items: new Map() };
      panels.set(id, panel);
    }
    return panel;
  }

  /** Whether adding an item under `id` would exceed the panel's cap. */
  private panelFull(panel: UiPanelState, id: string): boolean {
    return panel.items.size >= MAX_UI_ITEMS && !panel.items.has(id);
  }

  /** The cutscene `player` is watching, or null when none is running. */
  cutsceneFor(player: string): CutsceneState | null {
    return this.cutscenes.get(player) ?? null;
  }

  /** Clears `player`'s cutscene, called once the world has played it out. */
  clearCutscene(player: string): void {
    this.cutscenes.delete(player);
  }

  /** The figure `player`'s camera follows, or null when it follows nothing. */
  followCameraFor(player: string): FollowCamera | null {
    return this.follows.get(player) ?? null;
  }

  /** Whether the script has taken `player`'s movement and tools away. */
  controlsLocked(player: string): boolean {
    return this.controlLocks.get(player) === true || this.cutscenes.has(player);
  }

  /** What the last step said, if anything — a script error or a log line. */
  get lastError(): string | undefined {
    return this.problem;
  }

  /**
   * Compiles the project's scripts, loads the bundle into the sandbox, applies
   * anything it did while loading, and steps it once. The entry file is where
   * execution starts; it or a file it imports registers with `engine.onTick`.
   */
  async loadProject(
    files: Record<string, string>,
    entry: string,
    models: Record<string, Uint8Array> = {},
  ): Promise<void> {
    const sandbox = await this.ready;
    this.assertAlive();
    const code = await bundlePlaceProject(files, entry, models);
    sandbox.load(code);
    this.loaded = true;
    await this.drain(sandbox);
    await this.step();
  }

  /** The player started talking to `npcId`: a fact for the script to answer. */
  async talk(npcId: string, player: string): Promise<void> {
    this.assertAlive();
    this.dialogs.delete(player);
    this.notifyDialog(player, null);
    this.author({ kind: "npc-talk", npcId }, player);
    await this.step();
  }

  /** The player picked option `option` of the dialog `npcId` is showing. */
  async choose(npcId: string, option: number, player: string): Promise<void> {
    const dialog = this.dialogs.get(player);
    if (dialog === undefined || dialog.npcId !== npcId) {
      return;
    }
    this.author({ kind: "npc-choose", npcId, option }, player);
    await this.step();
  }

  /** The player walked away from `npcId`, ending the dialog. */
  async leave(npcId: string, player: string): Promise<void> {
    this.assertAlive();
    this.author({ kind: "npc-leave", npcId }, player);
    this.dialogs.delete(player);
    this.notifyDialog(player, null);
    await this.step();
  }

  /** The key codes scripts are listening on, so the input layer can report them. */
  get bindingKeys(): string[] {
    return [...new Set([...this.bindings.values()].map((b) => b.key))];
  }

  /**
   * Reports a bound key's edge, authoring the `input` fact a script folds over.
   * A key no script has bound is ignored, so the input layer may report every
   * key without the world having to know which ones matter.
   */
  async input(
    key: string,
    phase: "down" | "up",
    player: string,
  ): Promise<void> {
    this.assertAlive();
    const binding = [...this.bindings.values()].find((b) => b.key === key);
    if (binding === undefined) {
      return;
    }
    this.author({ kind: "input", bindId: binding.id, phase }, player);
    await this.step();
  }

  /** The prompt standing on the figure `entityId`, or null when there is none. */
  promptFor(entityId: string): ScriptPrompt | null {
    for (const prompt of this.prompts.values()) {
      if (prompt.entityId === entityId) {
        return prompt;
      }
    }
    return null;
  }

  /**
   * The player used the NPC or prop with `entityId`, optionally while holding
   * `item` — a fact the script's rules answer, such as a vending machine taking
   * a soda. A prompt standing on the same figure answers with its own fact
   * instead, so a script can give the same figure a labelled interaction.
   */
  async use(
    entityId: string,
    player: string,
    item = "",
    button: "primary" | "secondary" | "use" = "use",
  ): Promise<void> {
    this.assertAlive();
    const prompt = this.promptFor(entityId);
    if (prompt !== null) {
      this.author({ kind: "prompt-triggered", promptId: prompt.id }, player);
      if (prompt.once) {
        this.prompts.delete(prompt.id);
      }
      await this.step();
      return;
    }
    this.author({ kind: "entity-used", entityId, item, button }, player);
    await this.step();
  }

  /**
   * A weapon struck the NPC `entityId` for `amount` hit points, from an
   * attacker standing at (`attackerX`, `attackerZ`) — a fact for the
   * script's own rules to apply, the same way a vending machine answers
   * `entity-used`.
   */
  async hit(
    entityId: string,
    player: string,
    amount: number,
    attackerX: number,
    attackerZ: number,
  ): Promise<void> {
    this.assertAlive();
    this.author(
      { kind: "entity-hit", entityId, amount, attackerX, attackerZ },
      player,
    );
    await this.step();
  }

  /** The player used the item with `itemId` on its own, away from any object. */
  async useItem(itemId: string, player: string): Promise<void> {
    this.assertAlive();
    this.author({ kind: "item-used", item: itemId }, player);
    await this.step();
  }

  /**
   * The world reports `player` came into contact with the hazardous prop
   * `entityId` — a fact the script's rules answer, the way an `entity-used` is.
   */
  async touched(player: string, entityId: string): Promise<void> {
    this.assertAlive();
    this.author({ kind: "player-touched", entityId }, player);
    await this.step();
  }

  /**
   * The world reports `player` died from a cause it observed — a fall or a
   * hazard — so the script can fold the death into its rules.
   */
  async died(player: string, cause = ""): Promise<void> {
    this.assertAlive();
    this.author({ kind: "player-died", cause }, player);
    await this.step();
  }

  /**
   * Tells the host where a player now stands, so it can author the
   * `zone-entered` and `zone-left` facts for the zones they crossed. A step
   * that crosses nothing is not run, so walking around costs nothing.
   */
  async movePlayer(
    player: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    this.assertAlive();
    const inside = new Set<string>();
    for (const zone of this.zones.values()) {
      if (
        x >= zone.min[0] &&
        x <= zone.max[0] &&
        y >= zone.min[1] &&
        y <= zone.max[1] &&
        z >= zone.min[2] &&
        z <= zone.max[2]
      ) {
        inside.add(zone.id);
      }
    }
    const was = this.playerZones.get(player) ?? new Set<string>();
    const entered = [...inside].filter((id) => !was.has(id));
    const left = [...was].filter((id) => !inside.has(id));
    if (entered.length === 0 && left.length === 0) {
      return;
    }
    this.playerZones.set(player, inside);
    for (const id of left) {
      this.author({ kind: "zone-left", zoneId: id }, player);
    }
    for (const id of entered) {
      this.author({ kind: "zone-entered", zoneId: id }, player);
    }
    await this.step();
  }

  /**
   * Fires every timer the shared clock has reached, in id order so peers agree,
   * and steps the script once if any fired. A script that sets no timer costs
   * nothing to pump, so the world may call this every frame.
   */
  async pump(): Promise<void> {
    if (!this.loaded || this.pendingTimers.size === 0 || this.pumping) {
      return;
    }
    const now = this.getNow();
    const due = [...this.pendingTimers]
      .filter(([, at]) => at <= now)
      .map(([id]) => id)
      .sort();
    if (due.length === 0) {
      return;
    }
    this.pumping = true;
    try {
      for (const id of due) {
        this.pendingTimers.delete(id);
        this.author({ kind: "timer", timerId: id }, "");
      }
      await this.step();
    } finally {
      this.pumping = false;
    }
  }

  /** One line about the script and what it has created, for a debug console. */
  describe(): string {
    return `script: ${this.loaded ? "loaded" : "not loaded"} · ${this.npcs.size} NPC(s), ${this.props.size} prop(s), ${this.fires.size} fire(s), ${this.fields.size} field(s), ${this.explosions.size} blast(s), ${this.dialogs.size} dialog(s), ${this.barriers.size} barrier(s)${
      this.problem === undefined ? "" : ` — ${this.problem}`
    }`;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    void this.ready.then((sandbox) => sandbox.dispose());
  }

  /** Advances the script one step: new facts in, effects out and applied. */
  private async step(depth = 0): Promise<void> {
    if (!this.loaded) {
      return;
    }
    const dyingCutoff = this.getNow() - DEATH_ANIMATION_MS;
    for (const [id, npc] of this.npcs) {
      if (npc.dyingAt !== undefined && npc.dyingAt < dyingCutoff) {
        this.npcs.delete(id);
      }
    }
    const sandbox = await this.ready;
    const events = this.log
      .inOrder()
      .filter((event) => !this.sent.has(event.id));
    for (const event of events) {
      this.sent.add(event.id);
    }
    this.problem = undefined;
    try {
      sandbox.tick(this.getNow(), JSON.stringify(events));
    } catch (cause) {
      this.problem = cause instanceof Error ? cause.message : String(cause);
      this.onNotice?.(this.problem);
    } finally {
      await this.drain(sandbox);
    }
    // An effect applied during the drain can author a fact of its own — a kill
    // is the case this exists for. Step again so the script sees it this turn
    // rather than whenever some unrelated action next pumps it.
    if (depth < MAX_CASCADE_STEPS && this.hasUnsentEvents()) {
      await this.step(depth + 1);
    }
  }

  /** Whether any fact in the log has not yet been handed to the script. */
  private hasUnsentEvents(): boolean {
    return this.log.inOrder().some((event) => !this.sent.has(event.id));
  }

  /** Applies whatever the script queued since the last drain. */
  private async drain(sandbox: ScriptSandbox): Promise<void> {
    const { effects, logs } = sandbox.drain();
    for (const line of logs) {
      this.onNotice?.(line);
    }
    for (const effect of effects) {
      const parsed = parseEffect(effect);
      if (parsed !== null) {
        this.apply(parsed);
      }
    }
  }

  /**
   * A fact the local player caused, stamped, added to the shared log, and
   * handed to `onEvent` so it reaches every other peer's copy of it too.
   */
  private author(payload: ScriptEventPayload, producer: string): void {
    const at = this.getNow();
    this.sequence += 1;
    const event: ScriptEvent = {
      ...payload,
      id: `${producer === "" ? "local" : producer}:${at}:${this.sequence}`,
      at,
      producer,
    };
    this.log.add(event);
    this.onEvent?.(event);
  }

  private apply(effect: ParsedEffect): void {
    switch (effect.tag) {
      case "npc": {
        const {
          id,
          x,
          y,
          z,
          name,
          model,
          modelUri,
          yaw,
          live,
          motion,
          tags,
          attributes,
        } = effect.payload;
        const grounded = y ?? this.getHeightAt(x, z);
        const heading = yaw ?? 0;
        const previous = this.npcs.get(id);
        this.npcs.set(id, {
          id,
          name: name ?? "NPC",
          model: model ?? "",
          modelUri: modelUri ?? "",
          x,
          y: grounded,
          z,
          yaw: heading,
          tags: [...(tags ?? [])],
          attributes: { ...(attributes ?? {}) },
          ...(motion !== undefined ? { motion } : {}),
          ...(previous?.animation !== undefined
            ? { animation: previous.animation }
            : {}),
          ...(previous?.look !== undefined ? { look: previous.look } : {}),
        });
        if (y === undefined) {
          this.groundedNpcs.add(id);
        } else {
          this.groundedNpcs.delete(id);
        }
        if (live === true) {
          this.onEntityMove?.({ id, x, y: grounded, z, yaw: heading });
        }
        break;
      }
      case "npc-remove":
        this.npcs.delete(effect.payload.id);
        this.groundedNpcs.delete(effect.payload.id);
        break;
      case "npc-die": {
        const npc = this.npcs.get(effect.payload.id);
        if (npc !== undefined) {
          this.npcs.set(npc.id, { ...npc, dyingAt: this.getNow() });
          this.groundedNpcs.delete(effect.payload.id);
        }
        break;
      }
      case "prop": {
        const {
          id,
          model,
          x,
          y,
          z,
          name,
          yaw,
          height,
          solid,
          hazard,
          seat,
          motion,
          conveyor,
          velocity,
          tags,
          attributes,
        } = effect.payload;
        const previous = this.props.get(id);
        this.props.set(id, {
          id,
          model,
          name: name ?? id,
          x,
          y: y ?? this.getHeightAt(x, z),
          z,
          yaw: yaw ?? 0,
          height: height ?? 2,
          solid: solid ?? false,
          hazard: hazard ?? false,
          seat: seat ?? false,
          tags: [...(tags ?? [])],
          attributes: { ...(attributes ?? {}) },
          ...(motion !== undefined ? { motion } : {}),
          ...(conveyor !== undefined ? { conveyor } : {}),
          ...(velocity !== undefined ? { velocity } : {}),
          ...(previous?.animation !== undefined
            ? { animation: previous.animation }
            : {}),
          ...(previous?.look !== undefined ? { look: previous.look } : {}),
        });
        if (y === undefined) {
          this.groundedProps.add(id);
        } else {
          this.groundedProps.delete(id);
        }
        break;
      }
      case "prop-remove":
        this.props.delete(effect.payload.id);
        this.groundedProps.delete(effect.payload.id);
        break;
      case "entity-set": {
        const { id, tags, attributes } = effect.payload;
        const npc = this.npcs.get(id);
        if (npc !== undefined) {
          this.npcs.set(id, {
            ...npc,
            ...(tags !== undefined ? { tags: [...tags] } : {}),
            ...(attributes !== undefined
              ? { attributes: { ...attributes } }
              : {}),
          });
          break;
        }
        const prop = this.props.get(id);
        if (prop !== undefined) {
          this.props.set(id, {
            ...prop,
            ...(tags !== undefined ? { tags: [...tags] } : {}),
            ...(attributes !== undefined
              ? { attributes: { ...attributes } }
              : {}),
          });
        }
        break;
      }
      case "field": {
        const { id, kind, min, max, vx, vy, vz, speedScale, sink } =
          effect.payload;
        this.fields.set(id, {
          id,
          kind,
          min,
          max,
          vx: vx ?? 0,
          vz: vz ?? 0,
          vy,
          speedScale: speedScale ?? 1,
          sink: sink ?? 0,
        });
        break;
      }
      case "field-remove":
        this.fields.delete(effect.payload.id);
        break;
      case "fire": {
        const { id, x, y, z, height } = effect.payload;
        const fire: ScriptedFire = {
          id,
          x,
          y: y ?? this.getHeightAt(x, z),
          z,
          height: height ?? 2,
        };
        this.fires.set(id, fire);
        this.onFire?.(fire);
        break;
      }
      case "explosion": {
        const { id, x, y, z, radius } = effect.payload;
        const cutoff = this.getNow() - EXPLOSION_MEMORY_MS;
        for (const [held, blast] of this.explosions) {
          if (blast.at < cutoff) {
            this.explosions.delete(held);
          }
        }
        const explosion: ScriptedExplosion = {
          id,
          x,
          y: y ?? this.getHeightAt(x, z),
          z,
          radius: radius ?? 4,
          at: this.getNow(),
        };
        this.explosions.set(id, explosion);
        this.onExplosion?.(explosion);
        break;
      }
      case "item-define":
        this.inventory.define(effect.payload);
        break;
      case "item-give":
        this.inventory.give(effect.payload.item, effect.payload.count);
        break;
      case "item-take":
        this.inventory.take(effect.payload.item, effect.payload.count);
        break;
      case "item-hold":
        this.inventory.hold(
          effect.payload.item === "" ? null : effect.payload.item,
        );
        break;
      case "toast":
        this.onToast?.(effect.payload.player, effect.payload.text);
        break;
      case "sound": {
        const { player, name, id, volume, pitch, loop } = effect.payload;
        this.onSound?.(player, name, {
          id: id ?? "",
          volume: volume ?? 1,
          pitch: pitch ?? 1,
          loop: loop ?? false,
        });
        break;
      }
      case "sound-stop":
        this.onSoundStop?.(effect.payload.player, effect.payload.id);
        break;
      case "dialog": {
        const { player, npcId, prompt, options } = effect.payload;
        const state = {
          npcId,
          name: this.npcs.get(npcId)?.name ?? npcId,
          prompt,
          options,
        };
        this.dialogs.set(player, state);
        this.notifyDialog(player, state);
        break;
      }
      case "dialog-close":
        this.dialogs.delete(effect.payload.player);
        this.notifyDialog(effect.payload.player, null);
        break;
      case "zone": {
        const { id, name, min, max } = effect.payload;
        this.zones.set(id, { id, name: name ?? id, min, max });
        break;
      }
      case "zone-remove":
        this.zones.delete(effect.payload.id);
        break;
      case "barrier": {
        const { id, min, max } = effect.payload;
        this.barriers.set(id, { id, min, max });
        break;
      }
      case "barrier-remove":
        this.barriers.delete(effect.payload.id);
        break;
      case "narrate":
        this.onNarrate?.(effect.payload.player, {
          name: effect.payload.name,
          text: effect.payload.text,
        });
        break;
      case "ending":
        this.onEnding?.(effect.payload.player, {
          title: effect.payload.title,
          text: effect.payload.text,
        });
        break;
      case "restart":
        this.onRestart?.(effect.payload.player);
        break;
      case "time":
        this.onTime?.({
          seconds: effect.payload.seconds,
          speed: effect.payload.speed,
          clear: effect.payload.clear,
        });
        break;
      case "timer":
        this.pendingTimers.set(
          effect.payload.id,
          this.getNow() + effect.payload.afterMs,
        );
        break;
      case "player-place": {
        const { player, x, y, z, yaw } = effect.payload;
        this.onPlayerPlace?.(player, { x, z, y, yaw });
        break;
      }
      case "player-face": {
        const { player, x, z } = effect.payload;
        this.onPlayerFace?.(player, { x, z });
        break;
      }
      case "player-speed":
        this.onPlayerSpeed?.(effect.payload.player, effect.payload.multiplier);
        break;
      case "player-jump":
        this.onPlayerJump?.(effect.payload.player, effect.payload.multiplier);
        break;
      case "player-damage":
        this.onPlayerDamage?.(
          effect.payload.player,
          effect.payload.amount,
          effect.payload.source,
        );
        break;
      case "player-heal":
        this.onPlayerHeal?.(effect.payload.player, effect.payload.amount);
        break;
      case "player-max-health":
        this.onPlayerMaxHealth?.(
          effect.payload.player,
          effect.payload.maxHealth,
        );
        break;
      case "team-define":
        this.teams.set(
          effect.payload.id,
          effect.payload.name ?? effect.payload.id,
        );
        break;
      case "player-team": {
        const { player, team } = effect.payload;
        if (team === "") {
          this.playerTeams.delete(player);
        } else {
          this.playerTeams.set(player, team);
        }
        break;
      }
      case "player-value": {
        const { player, key, value } = effect.payload;
        let values = this.playerValues.get(player);
        if (values === undefined) {
          values = new Map();
          this.playerValues.set(player, values);
        }
        values.set(key, value);
        break;
      }
      case "player-push":
        this.onPlayerPush?.(
          effect.payload.player,
          effect.payload.vx,
          effect.payload.vy,
          effect.payload.vz,
        );
        break;
      case "report-hit": {
        const { player, entityId, amount, attackerX, attackerZ } =
          effect.payload;
        this.author(
          { kind: "entity-hit", entityId, amount, attackerX, attackerZ },
          player,
        );
        break;
      }
      case "bind": {
        const { id, key, label } = effect.payload;
        if (key === "") {
          this.bindings.delete(id);
        } else {
          this.bindings.set(id, { id, key, label: label ?? key });
        }
        break;
      }
      case "prompt": {
        const { id, entityId, verb, key, range, once } = effect.payload;
        this.prompts.set(id, {
          id,
          entityId,
          verb,
          key: key ?? "",
          range: range ?? 5,
          once: once ?? false,
        });
        break;
      }
      case "prompt-remove":
        this.prompts.delete(effect.payload.id);
        break;
      case "figure-animate": {
        const { id, name, speed, loop } = effect.payload;
        const animation: FigureAnimation = {
          name,
          speed: speed ?? 1,
          loop: loop ?? true,
        };
        const npc = this.npcs.get(id);
        if (npc !== undefined) {
          this.npcs.set(id, { ...npc, animation });
          break;
        }
        const prop = this.props.get(id);
        if (prop !== undefined) {
          this.props.set(id, { ...prop, animation });
        }
        break;
      }
      case "player-model": {
        const { player, model, modelUri } = effect.payload;
        this.onPlayerModel?.(player, model ?? "", modelUri ?? "");
        break;
      }
      case "figure-stop": {
        const id = effect.payload.id;
        const npc = this.npcs.get(id);
        if (npc !== undefined) {
          const rest = { ...npc };
          delete rest.animation;
          this.npcs.set(id, rest);
          break;
        }
        const prop = this.props.get(id);
        if (prop !== undefined) {
          const rest = { ...prop };
          delete rest.animation;
          this.props.set(id, rest);
        }
        break;
      }
      case "light": {
        const { id, entityId, x, y, z, color, range, intensity } =
          effect.payload;
        const entity = entityId ?? "";
        this.lights.set(id, {
          id,
          entityId: entity,
          x: x ?? 0,
          y: y ?? (entity === "" ? this.getHeightAt(x ?? 0, z ?? 0) + 1 : 0),
          z: z ?? 0,
          color: color ?? [1, 0.9, 0.75],
          range: range ?? 12,
          intensity: intensity ?? 1,
        });
        break;
      }
      case "light-remove":
        this.lights.delete(effect.payload.id);
        break;
      case "billboard": {
        const { id, text, entityId, x, y, z, color, scale, height } =
          effect.payload;
        const entity = entityId ?? "";
        const lift = height ?? 2.2;
        this.billboards.set(id, {
          id,
          text,
          entityId: entity,
          x: x ?? 0,
          y: y ?? (entity === "" ? this.getHeightAt(x ?? 0, z ?? 0) + lift : 0),
          z: z ?? 0,
          color: color ?? [1, 1, 1],
          scale: scale ?? 0.5,
          height: lift,
        });
        break;
      }
      case "billboard-remove":
        this.billboards.delete(effect.payload.id);
        break;
      case "particle": {
        const {
          id,
          x,
          y,
          z,
          entityId,
          kind,
          color,
          size,
          spread,
          lifeMs,
          loop,
        } = effect.payload;
        const style = PARTICLE_STYLES[kind ?? "spark"];
        const entity = entityId ?? "";
        this.particles.set(id, {
          id,
          entityId: entity,
          x: x ?? 0,
          y: y ?? (entity === "" ? this.getHeightAt(x ?? 0, z ?? 0) + 0.2 : 0),
          z: z ?? 0,
          style: {
            ...style,
            ...(color !== undefined ? { color } : {}),
            ...(size !== undefined ? { size } : {}),
            ...(spread !== undefined ? { spread } : {}),
            ...(lifeMs !== undefined ? { lifeMs } : {}),
          },
          loop: loop ?? false,
          at: this.getNow(),
        });
        break;
      }
      case "particle-remove":
        this.particles.delete(effect.payload.id);
        break;
      case "decal": {
        const { id, kind, x, y, z, entityId, color, size, yaw } =
          effect.payload;
        const entity = entityId ?? "";
        this.decals.set(id, {
          id,
          kind,
          entityId: entity,
          x: x ?? 0,
          y: y ?? (entity === "" ? this.getHeightAt(x ?? 0, z ?? 0) + 0.03 : 0),
          z: z ?? 0,
          color: color ?? [1, 1, 1],
          size: size ?? 2,
          yaw: yaw ?? 0,
        });
        break;
      }
      case "decal-remove":
        this.decals.delete(effect.payload.id);
        break;
      case "entity-look": {
        const { id, color, alpha } = effect.payload;
        const look: FigureLook = {
          color: color ?? [1, 1, 1],
          alpha: alpha ?? 1,
        };
        const npc = this.npcs.get(id);
        if (npc !== undefined) {
          this.npcs.set(id, { ...npc, look });
          break;
        }
        const prop = this.props.get(id);
        if (prop !== undefined) {
          this.props.set(id, { ...prop, look });
        }
        break;
      }
      case "entity-look-clear": {
        const id = effect.payload.id;
        const npc = this.npcs.get(id);
        if (npc !== undefined) {
          const rest = { ...npc };
          delete rest.look;
          this.npcs.set(id, rest);
          break;
        }
        const prop = this.props.get(id);
        if (prop !== undefined) {
          const rest = { ...prop };
          delete rest.look;
          this.props.set(id, rest);
        }
        break;
      }
      case "beam": {
        const { id, fromEntity, from, toEntity, to, color, width } =
          effect.payload;
        this.beams.set(id, {
          id,
          fromEntity: fromEntity ?? "",
          from: from ?? [0, 0, 0],
          toEntity: toEntity ?? "",
          to: to ?? [0, 0, 0],
          color: color ?? [1, 1, 1],
          width: width ?? 0.1,
        });
        break;
      }
      case "beam-remove":
        this.beams.delete(effect.payload.id);
        break;
      case "data-set": {
        const { scope, player, key, value } = effect.payload;
        const who = this.dataPlayer(scope, player);
        this.data.set(scope, who, key, value);
        this.author(
          {
            kind: "data-changed",
            scope,
            player: who,
            key,
            deleted: false,
            value,
          },
          this.localPlayer(),
        );
        break;
      }
      case "data-delete": {
        const { scope, player, key } = effect.payload;
        const who = this.dataPlayer(scope, player);
        this.data.set(scope, who, key, null);
        this.author(
          { kind: "data-changed", scope, player: who, key, deleted: true },
          this.localPlayer(),
        );
        break;
      }
      case "data-get": {
        const { scope, player, key, requestId } = effect.payload;
        void this.loadData(
          scope,
          this.dataPlayer(scope, player),
          key,
          requestId,
        );
        break;
      }
      case "badge-award": {
        const { player, badge } = effect.payload;
        const who =
          player === undefined || player === "" ? this.localPlayer() : player;
        this.data.set("player", who, "badge:" + badge, true);
        this.author(
          { kind: "badge-earned", player: who, badge },
          this.localPlayer(),
        );
        break;
      }
      case "teleport": {
        const { player, place, carry } = effect.payload;
        const who = player === "" ? this.localPlayer() : player;
        // What the player carries goes into the account scope, which the place
        // they arrive in reads: the value is copied, so nothing is lost here if
        // the jump is refused.
        if (carry !== undefined) {
          for (const key of carry) {
            const value = this.data.get("player", who, key);
            if (value !== undefined) {
              this.data.set("account", "", key, value);
            }
          }
        }
        this.author({ kind: "player-teleported", place }, who);
        this.onTeleport?.(who, place);
        break;
      }
      case "ui-panel": {
        const { player, id, title, anchor } = effect.payload;
        const panel = this.panelFor(player, id);
        if (panel === null) {
          break;
        }
        if (title !== undefined) {
          panel.title = title;
        }
        if (anchor !== undefined) {
          panel.anchor = anchor;
        }
        break;
      }
      case "ui-label": {
        const { player, panel: panelId, id, text, color } = effect.payload;
        const panel = this.panelFor(player, panelId);
        if (panel === null || this.panelFull(panel, id)) {
          break;
        }
        panel.items.set(id, {
          kind: "label",
          id,
          text,
          color: color ?? [1, 1, 1],
        });
        break;
      }
      case "ui-bar": {
        const {
          player,
          panel: panelId,
          id,
          label,
          value,
          max,
        } = effect.payload;
        const panel = this.panelFor(player, panelId);
        if (panel === null || this.panelFull(panel, id)) {
          break;
        }
        panel.items.set(id, {
          kind: "bar",
          id,
          label: label ?? "",
          value,
          max,
        });
        break;
      }
      case "ui-button": {
        const { player, panel: panelId, id, label, value } = effect.payload;
        const panel = this.panelFor(player, panelId);
        if (panel === null || this.panelFull(panel, id)) {
          break;
        }
        panel.items.set(id, {
          kind: "button",
          id,
          label,
          value: value ?? "",
        });
        break;
      }
      case "ui-image": {
        const { player, panel: panelId, id, sprite } = effect.payload;
        const panel = this.panelFor(player, panelId);
        if (panel === null || this.panelFull(panel, id)) {
          break;
        }
        panel.items.set(id, { kind: "image", id, sprite });
        break;
      }
      case "ui-remove": {
        const { player, panel: panelId, item } = effect.payload;
        const panels = this.panels.get(player);
        if (panels === undefined) {
          break;
        }
        if (item === undefined) {
          panels.delete(panelId);
          break;
        }
        panels.get(panelId)?.items.delete(item);
        break;
      }
      case "player-checkpoint": {
        const { player, x, z, y, yaw } = effect.payload;
        this.onCheckpoint?.(player, { x, z, y, yaw });
        break;
      }
      case "player-kill": {
        const { player, cause } = effect.payload;
        this.author({ kind: "player-died", cause: cause ?? "" }, player);
        this.onKill?.(player, cause ?? "");
        break;
      }
      case "player-respawn":
        this.onRespawn?.(effect.payload.player);
        break;
      case "void":
        this.voidHeight = effect.payload.y;
        this.onVoid?.(effect.payload.y);
        break;
      case "cutscene":
        this.cutscenes.set(effect.payload.player, {
          startMs: this.getNow(),
          shots: effect.payload.shots,
        });
        break;
      case "camera": {
        const { player, at, look, durationMs, holdMs, ease, fov, shake } =
          effect.payload;
        const shot: CameraShot = {
          at,
          ...(look !== undefined ? { look } : {}),
          ...(durationMs !== undefined ? { durationMs } : {}),
          ...(holdMs !== undefined ? { holdMs } : {}),
          ...(ease !== undefined ? { ease } : {}),
          ...(fov !== undefined ? { fov } : {}),
          ...(shake !== undefined ? { shake } : {}),
        };
        this.cutscenes.set(player, { startMs: this.getNow(), shots: [shot] });
        break;
      }
      case "camera-follow": {
        const { player, entityId, back, up, lookAhead, fov } = effect.payload;
        this.follows.set(player, {
          entityId,
          back: back ?? 8,
          up: up ?? 3,
          lookAhead: lookAhead ?? 4,
          fov: fov ?? null,
        });
        break;
      }
      case "camera-follow-clear":
        this.follows.delete(effect.payload.player);
        break;
      case "player-control":
        this.controlLocks.set(effect.payload.player, effect.payload.locked);
        break;
      case "hud": {
        const { player, id, kind, label, value, max, text } = effect.payload;
        let readouts = this.readouts.get(player);
        if (readouts === undefined) {
          readouts = new Map();
          this.readouts.set(player, readouts);
        }
        readouts.set(id, {
          id,
          kind,
          label: label ?? "",
          value: value ?? 0,
          max: max ?? 0,
          text: text ?? "",
        });
        break;
      }
      case "hud-remove": {
        const { player, id } = effect.payload;
        const readouts = this.readouts.get(player);
        readouts?.delete(id);
        if (readouts !== undefined && readouts.size === 0) {
          this.readouts.delete(player);
        }
        break;
      }
      case "block-set":
        this.onBlockEdit?.({
          min: effect.payload.voxel,
          max: effect.payload.voxel,
          id: effect.payload.id,
        });
        break;
      case "block-fill":
        this.onBlockEdit?.({
          min: effect.payload.min,
          max: effect.payload.max,
          id: effect.payload.id,
        });
        break;
      case "block-clear":
        this.onBlockEdit?.({
          min: effect.payload.min,
          max: effect.payload.max,
          id: 0,
        });
        break;
    }
  }

  private notifyDialog(player: string, state: DialogState | null): void {
    if (this.onDialog !== undefined) {
      this.onDialog(player, state);
    }
  }

  private assertAlive(): void {
    if (this.disposed) {
      throw new Error("script host disposed");
    }
  }
}
