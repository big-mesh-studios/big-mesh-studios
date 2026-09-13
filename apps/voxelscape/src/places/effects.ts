// The effect vocabulary a place script speaks: what its `engine.dispatch(tag,
// payload)` calls mean once the trusted side has applied them. A script never
// performs an effect — it queues one as a JSON payload, and this module is
// where a tag's shape and its bounds are decided, the same way
// `multiplayer/messages.ts` bounds every wire field. Anything a script asks for
// that is not a well-formed effect here is dropped, never applied.
import type { CameraShot } from "./cutscene";
import type { MotionSpec } from "./motion";
import type { ScriptEffect } from "./sandbox";

/** Every effect tag a place script may dispatch. */
export type EffectTag =
  | "npc"
  | "npc-remove"
  | "npc-die"
  | "prop"
  | "prop-remove"
  | "fire"
  | "field"
  | "field-remove"
  | "zone"
  | "zone-remove"
  | "barrier"
  | "barrier-remove"
  | "item-define"
  | "item-give"
  | "item-take"
  | "item-hold"
  | "toast"
  | "sound"
  | "dialog"
  | "dialog-close"
  | "narrate"
  | "ending"
  | "restart"
  | "time"
  | "timer"
  | "player-place"
  | "player-face"
  | "player-speed"
  | "player-jump"
  | "player-damage"
  | "player-checkpoint"
  | "player-kill"
  | "player-respawn"
  | "void"
  | "cutscene"
  | "camera"
  | "player-control"
  | "hud"
  | "hud-remove"
  | "explosion";

/** The furthest an NPC or prop may stand from the origin, in world units. */
export const MAX_NPC_COORD = 1_000_000;
/** The longest an NPC or prop's name may be. */
export const MAX_NPC_NAME = 40;
/** The longest a prop's model file name may be. */
export const MAX_PROP_MODEL = 128;
/** The tallest a prop may be drawn, in world units. */
export const MAX_PROP_HEIGHT = 64;
/** The most waypoints one motion's path may hold. */
export const MAX_MOTION_POINTS = 64;
/** The longest one motion traversal may take, in milliseconds. */
export const MAX_MOTION_MS = 86_400_000;
/** The largest spin rate a motion may ask for, per second or per metre. */
export const MAX_SPIN_RATE = 1_000;
/** The most shots one cutscene may hold. */
export const MAX_CUTSCENE_SHOTS = 64;
/** The longest one camera move or hold may last, in milliseconds. */
export const MAX_CAMERA_MS = 86_400_000;
/** The longest one HUD readout's id or label may be. */
export const MAX_HUD_LABEL = 64;
/** The longest one HUD readout's text may be. */
export const MAX_HUD_TEXT = 200;
/** The largest HUD value or maximum may read. */
export const MAX_HUD_VALUE = 1_000_000_000;
/** The longest a script item's id or name may be. */
export const MAX_ITEM_NAME = 40;
/** The longest an items-spritesheet sprite name may be. */
export const MAX_ITEM_SPRITE = 64;
/** The most of one item a `give`/`take` may move. */
export const MAX_ITEM_COUNT = 9_999;
/** The most hit points one weapon shot may deal. */
export const MAX_WEAPON_DAMAGE = 1_000;
/** The furthest a weapon shot may reach, in world units. */
export const MAX_WEAPON_REACH = 128;
/** The longest a weapon may ask a shot to wait before the next, in milliseconds. */
export const MAX_WEAPON_FIRE_INTERVAL_MS = 60_000;

/**
 * What a script item means as a weapon: holding it fires the primary button
 * instead of the wielded tool, with its own reach, rate, and damage.
 */
export interface WeaponSpec {
  /** Hit points one shot deals to the body it lands on. */
  damage: number;
  /** How far a shot reaches, in world units. */
  reach: number;
  /** The gap between shots, in milliseconds. */
  fireIntervalMs: number;
}

/** One item a place script defines for its own game. */
export interface ScriptItemDefinition {
  id: string;
  name: string;
  /** The items-spritesheet sprite the HUD shows, or "" for none. */
  sprite: string;
  stackable: boolean;
  /** The weapon this item is when held, or none for a plain carried item. */
  weapon?: WeaponSpec;
}
/** The longest a dialog prompt may be. */
export const MAX_DIALOG_PROMPT = 500;
/** The most options one dialog may offer. */
export const MAX_DIALOG_OPTIONS = 8;
/** The longest one option's text may be. */
export const MAX_OPTION_LENGTH = 80;
/** The longest a toast line may be. */
export const MAX_TOAST_LENGTH = 300;
/** The longest a sound effect's name may be. */
export const MAX_SOUND_NAME = 32;
/** The longest an ending's title may be. */
export const MAX_ENDING_TITLE = 80;
/** The longest an ending's body may be. */
export const MAX_ENDING_TEXT = 1_000;
/** The longest a narration line or its speaker's name may be. */
export const MAX_NARRATION = 500;
/** The furthest ahead, in milliseconds, a timer may be set. */
export const MAX_TIMER_MS = 86_400_000;
/** The largest multiplier a script may apply to a player's move speed or jump. */
export const MAX_PLAYER_MULTIPLIER = 100;
/** The most hit points one `player-damage` effect may take off. */
export const MAX_PLAYER_DAMAGE = 1_000;
/** The widest an explosion may read, in world units. */
export const MAX_EXPLOSION_RADIUS = 64;
/** The longest a model's `at://` address may be. */
export const MAX_MODEL_URI = 256;
/** The furthest a field's push may pull a player, per axis, in units per second. */
export const MAX_FIELD_SPEED = 100;
/** The fastest a field's quicksand may sink a player, in units per second. */
export const MAX_FIELD_SINK = 100;
/** The fastest a conveyor may carry a player, per axis, in units per second. */
export const MAX_CONVEYOR_SPEED = 100;

export type ParsedEffect =
  | {
      tag: "npc";
      payload: {
        id: string;
        /** The NPC's feet, in world units; the host grounds the figure's height. */
        x: number;
        z: number;
        /** The NPC's feet height in world units; defaults to the ground. */
        y?: number;
        name?: string;
        /** The place model file the NPC wears; the world picks one when absent. */
        model?: string;
        /**
         * The NPC's model, read live from its own `at://` address instead of
         * the place's bundled files — takes precedence over `model` when set.
         */
        modelUri?: string;
        /** Heading in radians, turning the figure to face somewhere. */
        yaw?: number;
        /**
         * Marks this update as the position a script has computed itself as
         * the entity's current owner, to be broadcast to other peers rather
         * than left for each of them to compute independently. Absent or
         * false means the position is left to each peer's own deterministic
         * replay, the way every other NPC already works.
         */
        live?: boolean;
        /** A path and spin the NPC follows over the shared clock. */
        motion?: MotionSpec;
      };
    }
  | { tag: "npc-remove"; payload: { id: string } }
  | {
      tag: "npc-die";
      /** The NPC to play a death fall for, rather than removing outright —
       * left standing in the world a moment longer, lying flat, before it
       * is gone the same way `npc-remove` takes one away instantly. */
      payload: { id: string };
    }
  | {
      tag: "prop";
      payload: {
        id: string;
        /** The place model file the prop wears, as the manifest names it. */
        model: string;
        /** The prop's feet, in world units; the host grounds the figure's height. */
        x: number;
        z: number;
        /** The prop's feet height in world units; defaults to the ground. */
        y?: number;
        name?: string;
        /** Heading in radians. */
        yaw?: number;
        /** Drawn height in world units. */
        height?: number;
        /** Whether the prop blocks the player; defaults to false. */
        solid?: boolean;
        /** Whether touching the prop counts as a hazard the script hears about. */
        hazard?: boolean;
        /** A path and spin the prop follows over the shared clock. */
        motion?: MotionSpec;
        /**
         * The horizontal velocity the prop's surface carries a player standing
         * on it, in units per second. It takes the place of a `motion` — a
         * static treadmill, a rolling walkway — so the two may not both be set.
         */
        conveyor?: { vx: number; vz: number };
      };
    }
  | { tag: "prop-remove"; payload: { id: string } }
  | {
      tag: "fire";
      payload: {
        id: string;
        /** The blaze's base, in world units; the host grounds the ember. */
        x: number;
        z: number;
        /** The blaze's base height in world units; defaults to the ground. */
        y?: number;
        /** Drawn height of the flame in world units. */
        height?: number;
      };
    }
  | {
      tag: "field";
      payload: {
        id: string;
        /** What the box does to a player inside it. */
        kind: "push" | "quicksand";
        /** The box a player must stand in, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
        /**
         * For a push: the target horizontal velocity the box pulls a player's
         * movement toward, in units per second each axis; at least one of
         * `vx`, `vy`, `vz` must be present.
         */
        vx?: number;
        /** For a push: the target upward velocity pulled toward; absent leaves falling alone. */
        vy?: number;
        vz?: number;
        /**
         * For quicksand: what a player's walk speed is multiplied by while
         * stuck, from just above 0 (unmoving) to 1 (no effect).
         */
        speedScale?: number;
        /** For quicksand: the fastest a player may fall through it, units per second. */
        sink?: number;
      };
    }
  | { tag: "field-remove"; payload: { id: string } }
  | {
      tag: "zone";
      payload: {
        id: string;
        name?: string;
        /** The box a player must stand in, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | { tag: "zone-remove"; payload: { id: string } }
  | {
      tag: "barrier";
      payload: {
        id: string;
        /** The box that blocks the player, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | { tag: "barrier-remove"; payload: { id: string } }
  | { tag: "item-define"; payload: ScriptItemDefinition }
  | {
      tag: "item-give";
      payload: { player: string; item: string; count: number };
    }
  | {
      tag: "item-take";
      payload: { player: string; item: string; count: number };
    }
  | {
      tag: "item-hold";
      payload: { player: string; item: string };
    }
  | { tag: "toast"; payload: { player: string; text: string } }
  | {
      tag: "sound";
      payload: {
        /** The player meant to hear the effect; "" means everyone locally. */
        player: string;
        /**
         * One of the world's fixed sound vocabulary — an effect only names a
         * sound the world already ships, never a file or URL of its own.
         */
        name: string;
      };
    }
  | {
      tag: "dialog";
      payload: {
        player: string;
        npcId: string;
        prompt: string;
        options: string[];
      };
    }
  | { tag: "dialog-close"; payload: { player: string; npcId: string } }
  | {
      tag: "narrate";
      payload: { player: string; name: string; text: string };
    }
  | {
      tag: "ending";
      payload: { player: string; title: string; text: string };
    }
  | { tag: "restart"; payload: { player: string } }
  | {
      tag: "time";
      payload: {
        /** The moment on the day-night clock to jump to, in seconds. */
        seconds?: number;
        /** How fast the clock runs; 0 pins it. */
        speed?: number;
        /** Clears any override, returning the clock to its own cycle. */
        clear?: boolean;
      };
    }
  | {
      tag: "timer";
      payload: {
        /** Names the deadline, so the `timer` event it produces can be matched. */
        id: string;
        /** How long from now, in milliseconds on the shared clock, to fire. */
        afterMs: number;
      };
    }
  | {
      tag: "player-place";
      payload: {
        player: string;
        /** Where the player's feet are put, in world units. */
        x: number;
        z: number;
        /** The feet height to set; the current height is kept when absent. */
        y?: number;
        /** The heading to turn the player to, in radians. */
        yaw?: number;
      };
    }
  | {
      tag: "player-face";
      payload: {
        player: string;
        /** The world point the player is turned to look at, in world units. */
        x: number;
        z: number;
      };
    }
  | {
      tag: "player-speed";
      payload: {
        player: string;
        /** What to multiply the player's walk speed by; 0.01 is a crawl. */
        multiplier: number;
      };
    }
  | {
      tag: "player-jump";
      payload: {
        player: string;
        /** What to multiply the player's jump speed by. */
        multiplier: number;
      };
    }
  | {
      tag: "player-damage";
      payload: {
        player: string;
        /** Hit points to take off, before the player's own guard reduces it. */
        amount: number;
        /** The entity dealing it, if any one entity is — a diagnostic trail
         * back to what actually hit the player, not something a script's own
         * behavior depends on. */
        source?: string;
      };
    }
  | {
      tag: "player-checkpoint";
      payload: {
        player: string;
        /** Where this player respawns, in world units. */
        x: number;
        z: number;
        /** The feet height to respawn at; the current height is kept when absent. */
        y?: number;
        /** The heading to respawn facing, in radians. */
        yaw?: number;
      };
    }
  | {
      tag: "player-kill";
      payload: {
        player: string;
        /** A label the `player-died` event carries, or "" for none. */
        cause?: string;
      };
    }
  | { tag: "player-respawn"; payload: { player: string } }
  | {
      tag: "void";
      payload: {
        /** The height below which the player is killed, in world units. */
        y: number;
      };
    }
  | {
      tag: "cutscene";
      payload: {
        player: string;
        /** The camera moves to play in order. */
        shots: CameraShot[];
      };
    }
  | {
      tag: "camera";
      payload: {
        player: string;
        /** Where the camera moves to, in world units. */
        at: [number, number, number];
        /** The world point to look at; the current look is kept when absent. */
        look?: [number, number, number];
        /** How long the move takes, in milliseconds; 0 snaps. */
        durationMs?: number;
        /** How long to hold after arriving, in milliseconds. */
        holdMs?: number;
        ease?: "linear" | "smooth";
      };
    }
  | {
      tag: "player-control";
      payload: {
        player: string;
        /** Whether the script takes the player's movement and tools away. */
        locked: boolean;
      };
    }
  | {
      tag: "hud";
      payload: {
        player: string;
        /** Names the readout, so a later `hud` or `hud-remove` reaches it. */
        id: string;
        kind: "bar" | "text";
        /** The readout's caption, or "" for none. */
        label?: string;
        /** A bar's filled amount. */
        value?: number;
        /** A bar's full amount; required for a bar. */
        max?: number;
        /** A text readout's body. */
        text?: string;
      };
    }
  | { tag: "hud-remove"; payload: { player: string; id: string } }
  | {
      tag: "explosion";
      payload: {
        id: string;
        /** The blast's centre, in world units; the host grounds it. */
        x: number;
        z: number;
        /** The centre height in world units; defaults to the ground. */
        y?: number;
        /** How wide the blast reads, in world units; defaults to 4. */
        radius?: number;
      };
    };

const isShort = (v: unknown, max: number): boolean =>
  typeof v === "string" && v.length >= 1 && v.length <= max;

const isPlayer = (v: unknown): boolean =>
  typeof v === "string" && v.length <= 256;

const isCoord = (v: unknown): boolean =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_NPC_COORD;

const isVector = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every(isCoord);

const isNumberIn = (v: unknown, min: number, max: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Whether a value is a weapon spec this world can fire. */
const isWeapon = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const w = v as Record<string, unknown>;
  return (
    isNumberIn(w.damage, 1, MAX_WEAPON_DAMAGE) &&
    isNumberIn(w.reach, 1, MAX_WEAPON_REACH) &&
    isNumberIn(w.fireIntervalMs, 1, MAX_WEAPON_FIRE_INTERVAL_MS)
  );
};

/** Whether a value is a path and spin this world can sample. */
const isMotion = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const m = v as Record<string, unknown>;
  if (
    !Array.isArray(m.path) ||
    m.path.length < 1 ||
    m.path.length > MAX_MOTION_POINTS ||
    !m.path.every(isVector)
  ) {
    return false;
  }
  if (m.loop !== "once" && m.loop !== "loop" && m.loop !== "pingpong") {
    return false;
  }
  if (!isNumberIn(m.durationMs, 1, MAX_MOTION_MS)) {
    return false;
  }
  if (
    m.startAfterMs !== undefined &&
    !isNumberIn(m.startAfterMs, 0, MAX_MOTION_MS)
  ) {
    return false;
  }
  if (m.ease !== undefined && m.ease !== "linear" && m.ease !== "smooth") {
    return false;
  }
  if (m.spin === undefined) {
    return true;
  }
  if (typeof m.spin !== "object" || m.spin === null) {
    return false;
  }
  const s = m.spin as Record<string, unknown>;
  if (!isVector(s.axis)) {
    return false;
  }
  if (s.turnsPerSecond === undefined && s.degreesPerMeter === undefined) {
    return false;
  }
  if (
    s.turnsPerSecond !== undefined &&
    !isNumberIn(s.turnsPerSecond, -MAX_SPIN_RATE, MAX_SPIN_RATE)
  ) {
    return false;
  }
  if (
    s.degreesPerMeter !== undefined &&
    !isNumberIn(s.degreesPerMeter, -MAX_SPIN_RATE, MAX_SPIN_RATE)
  ) {
    return false;
  }
  return true;
};

/** Whether a value is one camera move this world can play. */
const isShot = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const s = v as Record<string, unknown>;
  if (!isVector(s.at)) {
    return false;
  }
  if (s.look !== undefined && !isVector(s.look)) {
    return false;
  }
  if (
    s.durationMs !== undefined &&
    !isNumberIn(s.durationMs, 0, MAX_CAMERA_MS)
  ) {
    return false;
  }
  if (s.holdMs !== undefined && !isNumberIn(s.holdMs, 0, MAX_CAMERA_MS)) {
    return false;
  }
  if (s.ease !== undefined && s.ease !== "linear" && s.ease !== "smooth") {
    return false;
  }
  return true;
};

/** Whether a value is a surface velocity a prop carries its rider at. */
const isConveyor = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;
  return (
    isNumberIn(c.vx, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
    isNumberIn(c.vz, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED)
  );
};

/** Whether a value is a field box this world can sample on a player. */
const isField = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (isShort(p.id, 64) === false) {
    return false;
  }
  if (p.kind === "push") {
    if (p.speedScale !== undefined || p.sink !== undefined) {
      return false;
    }
    if (p.vx === undefined && p.vy === undefined && p.vz === undefined) {
      return false;
    }
    return (
      (p.vx === undefined ||
        isNumberIn(p.vx, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      (p.vy === undefined ||
        isNumberIn(p.vy, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      (p.vz === undefined ||
        isNumberIn(p.vz, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      ((p.vx ?? 0) !== 0 || (p.vy ?? 0) !== 0 || (p.vz ?? 0) !== 0)
    );
  }
  if (p.kind === "quicksand") {
    if (p.vx !== undefined || p.vy !== undefined || p.vz !== undefined) {
      return false;
    }
    const scaleOk =
      p.speedScale === undefined ||
      (typeof p.speedScale === "number" &&
        Number.isFinite(p.speedScale) &&
        p.speedScale > 0 &&
        p.speedScale <= 1);
    const sinkOk =
      p.sink === undefined || isNumberIn(p.sink, 0, MAX_FIELD_SINK);
    return (
      scaleOk && sinkOk && (p.speedScale !== undefined || p.sink !== undefined)
    );
  }
  return false;
};

/** Whether a value is a box its two corners bound, small corner first. */
const isFieldBox = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (!isVector(p.min) || !isVector(p.max)) {
    return false;
  }
  return p.min[0] <= p.max[0] && p.min[1] <= p.max[1] && p.min[2] <= p.max[2];
};

/** Whether a JSON-parsed payload fits the shape of its tag. */
const isPayload = (tag: EffectTag, value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const p = value as Record<string, unknown>;
  switch (tag) {
    case "npc":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        (p.model === undefined || isShort(p.model, MAX_PROP_MODEL)) &&
        (p.modelUri === undefined || isShort(p.modelUri, MAX_MODEL_URI)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.live === undefined || typeof p.live === "boolean") &&
        (p.motion === undefined || isMotion(p.motion))
      );
    case "npc-remove":
    case "npc-die":
      return isShort(p.id, 64);
    case "prop":
      return (
        isShort(p.id, 64) &&
        isShort(p.model, MAX_PROP_MODEL) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.height === undefined ||
          (typeof p.height === "number" &&
            Number.isFinite(p.height) &&
            p.height > 0 &&
            p.height <= MAX_PROP_HEIGHT)) &&
        (p.solid === undefined || typeof p.solid === "boolean") &&
        (p.hazard === undefined || typeof p.hazard === "boolean") &&
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.conveyor === undefined ||
          (p.motion === undefined && isConveyor(p.conveyor)))
      );
    case "prop-remove":
      return isShort(p.id, 64);
    case "fire":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.height === undefined ||
          (typeof p.height === "number" &&
            Number.isFinite(p.height) &&
            p.height > 0 &&
            p.height <= MAX_PROP_HEIGHT))
      );
    case "zone": {
      const { min, max } = p;
      return (
        isShort(p.id, 64) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        isVector(min) &&
        isVector(max) &&
        min[0] <= max[0] &&
        min[1] <= max[1] &&
        min[2] <= max[2]
      );
    }
    case "zone-remove":
      return isShort(p.id, 64);
    case "barrier": {
      const { min, max } = p;
      return (
        isShort(p.id, 64) &&
        isVector(min) &&
        isVector(max) &&
        min[0] <= max[0] &&
        min[1] <= max[1] &&
        min[2] <= max[2]
      );
    }
    case "barrier-remove":
      return isShort(p.id, 64);
    case "field":
      return isField(p) && isFieldBox(p);
    case "field-remove":
      return isShort(p.id, 64);
    case "item-define":
      return (
        isShort(p.id, MAX_ITEM_NAME) &&
        isShort(p.name, MAX_ITEM_NAME) &&
        (p.sprite === "" || isShort(p.sprite, MAX_ITEM_SPRITE)) &&
        typeof p.stackable === "boolean" &&
        (p.weapon === undefined || isWeapon(p.weapon))
      );
    case "item-give":
    case "item-take":
      return (
        isPlayer(p.player) &&
        isShort(p.item, MAX_ITEM_NAME) &&
        typeof p.count === "number" &&
        Number.isInteger(p.count) &&
        p.count >= 1 &&
        p.count <= MAX_ITEM_COUNT
      );
    case "item-hold":
      return (
        isPlayer(p.player) && (p.item === "" || isShort(p.item, MAX_ITEM_NAME))
      );
    case "toast":
      return isPlayer(p.player) && isShort(p.text, MAX_TOAST_LENGTH);
    case "sound":
      return isPlayer(p.player) && isShort(p.name, MAX_SOUND_NAME);
    case "dialog":
      return (
        isPlayer(p.player) &&
        isShort(p.npcId, 64) &&
        isShort(p.prompt, MAX_DIALOG_PROMPT) &&
        Array.isArray(p.options) &&
        p.options.length >= 1 &&
        p.options.length <= MAX_DIALOG_OPTIONS &&
        p.options.every((o) => isShort(o, MAX_OPTION_LENGTH))
      );
    case "dialog-close":
      return isPlayer(p.player) && isShort(p.npcId, 64);
    case "narrate":
      return (
        isPlayer(p.player) &&
        isShort(p.name, MAX_NARRATION) &&
        isShort(p.text, MAX_NARRATION)
      );
    case "ending":
      return (
        isPlayer(p.player) &&
        isShort(p.title, MAX_ENDING_TITLE) &&
        isShort(p.text, MAX_ENDING_TEXT)
      );
    case "restart":
      return isPlayer(p.player);
    case "time":
      return (
        (p.seconds === undefined ||
          (typeof p.seconds === "number" &&
            Number.isFinite(p.seconds) &&
            p.seconds >= 0)) &&
        (p.speed === undefined ||
          (typeof p.speed === "number" && Number.isFinite(p.speed))) &&
        (p.clear === undefined || typeof p.clear === "boolean") &&
        (p.seconds !== undefined || p.speed !== undefined || p.clear === true)
      );
    case "timer":
      return (
        isShort(p.id, 64) &&
        typeof p.afterMs === "number" &&
        Number.isFinite(p.afterMs) &&
        p.afterMs >= 0 &&
        p.afterMs <= MAX_TIMER_MS
      );
    case "player-place":
      return (
        isPlayer(p.player) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "player-face":
      return isPlayer(p.player) && isCoord(p.x) && isCoord(p.z);
    case "player-speed":
    case "player-jump":
      return (
        isPlayer(p.player) &&
        typeof p.multiplier === "number" &&
        Number.isFinite(p.multiplier) &&
        p.multiplier > 0 &&
        p.multiplier <= MAX_PLAYER_MULTIPLIER
      );
    case "player-checkpoint":
      return (
        isPlayer(p.player) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "player-kill":
      return (
        isPlayer(p.player) &&
        (p.cause === undefined || p.cause === "" || isShort(p.cause, 64))
      );
    case "player-respawn":
      return isPlayer(p.player);
    case "void":
      return isCoord(p.y);
    case "cutscene":
      return (
        isPlayer(p.player) &&
        Array.isArray(p.shots) &&
        p.shots.length >= 1 &&
        p.shots.length <= MAX_CUTSCENE_SHOTS &&
        p.shots.every(isShot)
      );
    case "camera":
      return (
        isPlayer(p.player) &&
        isVector(p.at) &&
        (p.look === undefined || isVector(p.look)) &&
        (p.durationMs === undefined ||
          isNumberIn(p.durationMs, 0, MAX_CAMERA_MS)) &&
        (p.holdMs === undefined || isNumberIn(p.holdMs, 0, MAX_CAMERA_MS)) &&
        (p.ease === undefined || p.ease === "linear" || p.ease === "smooth")
      );
    case "player-control":
      return isPlayer(p.player) && typeof p.locked === "boolean";
    case "hud":
      return (
        isPlayer(p.player) &&
        isShort(p.id, MAX_HUD_LABEL) &&
        (p.kind === "bar" || p.kind === "text") &&
        (p.label === undefined ||
          p.label === "" ||
          isShort(p.label, MAX_HUD_LABEL)) &&
        (p.value === undefined ||
          isNumberIn(p.value, -MAX_HUD_VALUE, MAX_HUD_VALUE)) &&
        (p.max === undefined || isNumberIn(p.max, 1, MAX_HUD_VALUE)) &&
        (p.text === undefined ||
          p.text === "" ||
          isShort(p.text, MAX_HUD_TEXT)) &&
        (p.kind !== "bar" || p.max !== undefined)
      );
    case "hud-remove":
      return isPlayer(p.player) && isShort(p.id, MAX_HUD_LABEL);
    case "explosion":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.radius === undefined ||
          (typeof p.radius === "number" &&
            Number.isFinite(p.radius) &&
            p.radius > 0 &&
            p.radius <= MAX_EXPLOSION_RADIUS))
      );
    case "player-damage":
      return (
        isPlayer(p.player) &&
        typeof p.amount === "number" &&
        Number.isFinite(p.amount) &&
        p.amount > 0 &&
        p.amount <= MAX_PLAYER_DAMAGE &&
        (p.source === undefined || isShort(p.source, 64))
      );
  }
};

/**
 * Parses and validates one queued effect. An effect whose tag is unknown or
 * whose payload does not fit its tag is refused, so a broken or hostile script
 * cannot slip anything past the boundary.
 */
export const parseEffect = (effect: ScriptEffect): ParsedEffect | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(effect.payload);
  } catch {
    return null;
  }
  if (!isPayload(effect.tag as EffectTag, parsed)) {
    return null;
  }
  return { tag: effect.tag as EffectTag, payload: parsed } as ParsedEffect;
};
