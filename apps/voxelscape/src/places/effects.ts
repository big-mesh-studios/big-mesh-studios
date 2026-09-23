// The effect vocabulary a place script speaks: what its `engine.dispatch(tag,
// payload)` calls mean once the trusted side has applied them. A script never
// performs an effect — it queues one as a JSON payload, and this module is
// where a tag's shape and its bounds are decided, the same way
// `multiplayer/messages.ts` bounds every wire field. Anything a script asks for
// that is not a well-formed effect here is dropped, never applied.
import type { CameraShot } from "./cutscene";
import type { MotionSpec } from "./motion";
import { STORM_KINDS, type StormKind } from "../world/scripted-storm";
import {
  MAX_PLAN_SHAPES,
  isPlanShape,
  type PlanShape,
} from "../world/plan-shapes";
import type {
  AttributeValue,
  DataScope,
  DataValue,
  ScriptEffect,
} from "./sandbox";

/** Every particle kind a script may name; the world draws each one its own way. */
const PARTICLE_KINDS = ["spark", "flame", "smoke", "dust"] as const;
/** Every mark shape a script may name; the world draws each one its own way. */
const DECAL_KINDS = ["arrow", "cross", "ring", "splat"] as const;

type ParticleKind = (typeof PARTICLE_KINDS)[number];
type DecalKind = (typeof DECAL_KINDS)[number];

/** Every effect tag a place script may dispatch. */
export type EffectTag =
  | "npc"
  | "npc-remove"
  | "npc-die"
  | "prop"
  | "prop-remove"
  | "entity-set"
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
  | "sound-stop"
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
  | "player-heal"
  | "player-max-health"
  | "team-define"
  | "player-team"
  | "player-value"
  | "player-push"
  | "report-hit"
  | "player-checkpoint"
  | "player-kill"
  | "player-respawn"
  | "void"
  | "cutscene"
  | "camera"
  | "camera-follow"
  | "camera-follow-clear"
  | "player-control"
  | "hud"
  | "hud-remove"
  | "explosion"
  | "block-set"
  | "block-fill"
  | "block-clear"
  | "structure"
  | "structure-remove"
  | "bind"
  | "prompt"
  | "prompt-remove"
  | "figure-animate"
  | "figure-stop"
  | "player-model"
  | "light"
  | "light-remove"
  | "billboard"
  | "billboard-remove"
  | "particle"
  | "particle-remove"
  | "storm"
  | "storm-remove"
  | "decal"
  | "decal-remove"
  | "entity-look"
  | "entity-look-clear"
  | "beam"
  | "beam-remove"
  | "data-set"
  | "data-delete"
  | "data-get"
  | "badge-award"
  | "teleport"
  | "ui-panel"
  | "ui-label"
  | "ui-bar"
  | "ui-button"
  | "ui-image"
  | "ui-remove";

/** The furthest an NPC or prop may stand from the origin, in world units. */
export const MAX_NPC_COORD = 1_000_000;
/** The longest an NPC or prop's name may be. */
export const MAX_NPC_NAME = 40;
/** The most tags one entity may carry. */
export const MAX_TAGS = 32;
/** The longest a tag or an attribute's name may be. */
export const MAX_TAG_LENGTH = 40;
/** The most attributes one entity may carry. */
export const MAX_ATTRIBUTES = 32;
/** The longest a string attribute value may be. */
export const MAX_ATTRIBUTE_STRING = 256;
/** The longest a prop's model file name may be. */
export const MAX_PROP_MODEL = 128;
/** The tallest a prop may be drawn, in world units. */
export const MAX_PROP_HEIGHT = 64;
/** The most waypoints one motion's path may hold. */
export const MAX_MOTION_POINTS = 64;
/** The longest one motion traversal may take, in milliseconds. */
export const MAX_MOTION_MS = 86_400_000;
/** The furthest a motion's oscillation may move a figure, in world units. */
export const MAX_MOTION_AMPLITUDE = 64;
/** The largest spin rate a motion may ask for, per second or per metre. */
export const MAX_SPIN_RATE = 1_000;
/** The most shots one cutscene may hold. */
export const MAX_CUTSCENE_SHOTS = 64;
/** The longest one camera move or hold may last, in milliseconds. */
export const MAX_CAMERA_MS = 86_400_000;
/** The narrowest and widest field of view a camera shot may ask for, in degrees. */
export const MIN_CAMERA_FOV = 1;
export const MAX_CAMERA_FOV = 179;
/** The furthest a camera may shake, in world units. */
export const MAX_CAMERA_SHAKE = 16;
/** The furthest a followed camera may sit behind or above its figure, in world units. */
export const MAX_CAMERA_DISTANCE = 200;
/** The longest one HUD readout's id or label may be. */
export const MAX_HUD_LABEL = 64;
/** The longest one HUD readout's text may be; long enough for a ranked list. */
export const MAX_HUD_TEXT = 1_000;
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
/** The largest volume a sound may play at. */
export const MAX_SOUND_VOLUME = 1;
/** The slowest and fastest a sound may be pitched. */
export const MIN_SOUND_PITCH = 0.25;
export const MAX_SOUND_PITCH = 4;
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
/** The most hit points one `player-damage` or `player-heal` effect may move. */
export const MAX_PLAYER_DAMAGE = 1_000;
/** The most hit points a player may be given with `player-max-health`. */
export const MAX_PLAYER_MAX_HEALTH = 100_000;
/** The fastest a `player-push` may throw a player, per axis, in units per second. */
export const MAX_PUSH_SPEED = 100;
/** The most hit points one `report-hit` may carry. */
export const MAX_REPORTED_HIT = 1_000;
/** The longest a bound key code may be. */
export const MAX_BIND_KEY = 32;
/** The longest a prompt's verb may be. */
export const MAX_PROMPT_VERB = 40;
/** How close, in world units, a player must be for a prompt to trigger. */
export const MAX_PROMPT_RANGE = 32;
/** The longest a model motion's name may be. */
export const MAX_ANIMATION_NAME = 64;
/** The largest multiple a figure may play its animation at. */
export const MAX_ANIMATION_SPEED = 100;
/** The furthest a scripted light reaches, in world units. */
export const MAX_LIGHT_RANGE = 64;
/** The brightest a scripted light may burn. */
export const MAX_LIGHT_INTENSITY = 20;
/** The longest a billboard's text may be. */
export const MAX_BILLBOARD_TEXT = 64;
/** The tallest a billboard may be drawn, in world units. */
export const MAX_BILLBOARD_SCALE = 8;
/** The furthest a billboard may hang above an attached figure's feet, in world units. */
export const MAX_BILLBOARD_HEIGHT = 32;
/** The largest one particle may be drawn, in world units. */
export const MAX_PARTICLE_SIZE = 4;
/** The furthest a particle may travel from its emitter, in world units. */
export const MAX_PARTICLE_SPREAD = 32;
/** The longest one particle may live, in milliseconds. */
export const MAX_PARTICLE_LIFE_MS = 30_000;
/** The widest or tallest a storm may be drawn, in world units. */
export const MAX_STORM_SIZE = 256;
/** The most turns per second a funnel may spin. */
export const MAX_STORM_SPIN = 1;
/** The widest a decal may be drawn, in world units. */
export const MAX_DECAL_SIZE = 32;
/** The widest a beam may be drawn, in world units. */
export const MAX_BEAM_WIDTH = 1;
/** The longest a data key or a badge name may be. */
export const MAX_DATA_KEY = 64;
/** The longest a string a place may remember. */
export const MAX_DATA_STRING = 512;
/** The longest a teleport address may be. */
export const MAX_PLACE_ADDRESS = 256;
/** The most keys one teleport may carry into the account scope. */
export const MAX_CARRY_KEYS = 32;
/** The most panels one player's scripted UI may show. */
export const MAX_UI_PANELS = 8;
/** The most items one panel may hold. */
export const MAX_UI_ITEMS = 32;
/** The longest a label, title, or button text may be. */
export const MAX_UI_TEXT = 200;
/** The longest a sprite name may be. */
export const MAX_UI_SPRITE = 64;
/** The longest a button's value may be. */
export const MAX_UI_VALUE = 128;

/** Which corner of the screen a scripted panel docks to. */
export type UiAnchor =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

const UI_ANCHORS: UiAnchor[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const isDataValue = (v: unknown): v is DataValue =>
  typeof v === "boolean" ||
  (typeof v === "string" && v.length <= MAX_DATA_STRING) ||
  (typeof v === "number" && Number.isFinite(v));

/** Whether a value is one of the scopes a remembered value may belong to. */
const isDataScope = (v: unknown): v is DataScope =>
  v === "player" || v === "global" || v === "account";
/** The longest a team's id or name, or a player-value's key, may be. */
export const MAX_TEAM_NAME = 64;
/** The largest magnitude a player-value may hold. */
export const MAX_PLAYER_VALUE = 1_000_000_000_000;
/** The widest an explosion may read, in world units. */
export const MAX_EXPLOSION_RADIUS = 64;
/** The furthest a script may address a voxel from the origin, in LOD-0 grid units. */
export const MAX_BLOCK_COORD = 1_000_000;
/** Voxel ids are a byte, so 0..255 covers every id a block effect may name. */
export const MAX_BLOCK_ID = 255;
/** The most voxels one `block-fill` or `block-clear` may touch. */
export const MAX_BLOCK_FILL = 32_768;
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
        /** Names this entity answers to in a query, e.g. "enemy". */
        tags?: string[];
        /** Values a script hangs on this entity under a name. */
        attributes?: Record<string, AttributeValue>;
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
        /** Whether a player standing on the prop is turned to the prop's heading, as a seat. */
        seat?: boolean;
        /** A path and spin the prop follows over the shared clock. */
        motion?: MotionSpec;
        /**
         * The horizontal velocity the prop's surface carries a player standing
         * on it, in units per second. It takes the place of a `motion` — a
         * static treadmill, a rolling walkway — so the two may not both be set.
         */
        conveyor?: { vx: number; vz: number };
        /**
         * The velocity the prop's own body is moving at, in units per second,
         * set by the script each time it moves the prop. Unlike a `motion`,
         * the pose is not sampled from a path: the prop stands where `x`/`y`/
         * `z` put it and this only says how fast its surface is going, so a
         * rider is carried. Takes the place of a `motion` and a `conveyor`.
         */
        velocity?: { vx: number; vy: number; vz: number };
        /** Names this entity answers to in a query, e.g. "enemy". */
        tags?: string[];
        /** Values a script hangs on this entity under a name. */
        attributes?: Record<string, AttributeValue>;
      };
    }
  | { tag: "prop-remove"; payload: { id: string } }
  | {
      tag: "entity-set";
      /** The tags and attributes to give the NPC or prop `id`, replacing what it carried. */
      payload: {
        id: string;
        tags?: string[];
        attributes?: Record<string, AttributeValue>;
      };
    }
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
        /** Names the playing sound, so a later `sound-stop` can reach it. Required to loop. */
        id?: string;
        /** How loudly to play it, 0 to 1; defaults to 1. */
        volume?: number;
        /** How fast to play it, a fifth-speed to four-times; defaults to 1. */
        pitch?: number;
        /** Whether it repeats until stopped; defaults to false. */
        loop?: boolean;
      };
    }
  | { tag: "sound-stop"; payload: { player: string; id: string } }
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
      tag: "player-heal";
      payload: {
        player: string;
        /** Hit points to restore, never past the player's maximum. */
        amount: number;
      };
    }
  | {
      tag: "player-max-health";
      payload: {
        player: string;
        /** The most hit points the player may hold from now on, at least one heart's worth. */
        maxHealth: number;
      };
    }
  | {
      tag: "team-define";
      payload: {
        /** The team's id, matched by a `player-team`. */
        id: string;
        /** Shown to players; defaults to the id. */
        name?: string;
      };
    }
  | {
      tag: "player-team";
      payload: {
        player: string;
        /** The team id to put the player on, or "" to take them off any team. */
        team: string;
      };
    }
  | {
      tag: "player-value";
      payload: {
        player: string;
        /** Names the value, so a leaderboard can rank players by it. */
        key: string;
        value: number;
      };
    }
  | {
      tag: "player-push";
      payload: {
        player: string;
        /** The velocity to add to the player, per axis, in units per second. */
        vx: number;
        vy: number;
        vz: number;
      };
    }
  | {
      tag: "report-hit";
      payload: {
        /** The player whose swing or shot this is, so the fact names them. */
        player: string;
        /** The NPC the strike landed on. */
        entityId: string;
        /** Hit points the strike carried. */
        amount: number;
        /** Where the attacker stood when it landed, in world units. */
        attackerX: number;
        attackerZ: number;
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
        /** The field of view to move to, in degrees; the current one is kept when absent. */
        fov?: number;
        /** How far the view shakes, in world units; absent for a still one. */
        shake?: number;
      };
    }
  | {
      tag: "camera-follow";
      payload: {
        player: string;
        /** The scripted figure the camera follows until it is cleared. */
        entityId: string;
        /** How far behind the figure the camera sits, in world units; defaults to 8. */
        back?: number;
        /** How far above the figure the camera sits, in world units; defaults to 3. */
        up?: number;
        /** How far ahead of the figure the camera looks, in world units; defaults to 4. */
        lookAhead?: number;
        /** The field of view to hold, in degrees; the current one is kept when absent. */
        fov?: number;
      };
    }
  | { tag: "camera-follow-clear"; payload: { player: string } }
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
    }
  | {
      tag: "block-set";
      payload: {
        /** The LOD-0 voxel to fill, in grid units. */
        voxel: [number, number, number];
        /** The voxel id to put there; 0 clears the voxel. */
        id: number;
      };
    }
  | {
      tag: "block-fill";
      payload: {
        /** The box to fill, in LOD-0 grid units, inclusive on both corners. */
        min: [number, number, number];
        max: [number, number, number];
        /** The voxel id to put through the box; 0 clears it. */
        id: number;
      };
    }
  | {
      tag: "block-clear";
      payload: {
        /** The box to clear, in LOD-0 grid units, inclusive on both corners. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | {
      tag: "structure";
      payload: {
        /** Names the group, so a later `structure-remove` reaches it, or a new one replaces it. */
        id: string;
        /** The plan shapes to stamp, in LOD-0 world voxels. */
        shapes: PlanShape[];
      };
    }
  | { tag: "structure-remove"; payload: { id: string } }
  | {
      tag: "bind";
      payload: {
        /** Names the binding, so the `input` fact can be matched to it. */
        id: string;
        /** The key code to listen on, or "" to remove the binding. */
        key: string;
        /** Shown to players; defaults to the key. */
        label?: string;
      };
    }
  | {
      tag: "prompt";
      payload: {
        /** Names the prompt, so the `prompt-triggered` fact can be matched to it. */
        id: string;
        /** The scripted figure the prompt stands on. */
        entityId: string;
        /** What the prompt invites the player to do, e.g. "Open". */
        verb: string;
        /** A key code shown as the shortcut beside the verb, or absent. */
        key?: string;
        /** How close the player must be, in world units; defaults to 5. */
        range?: number;
        /** Whether the prompt fires once and is then forgotten. */
        once?: boolean;
      };
    }
  | { tag: "prompt-remove"; payload: { id: string } }
  | {
      tag: "figure-animate";
      payload: {
        /** The scripted figure to play a motion on. */
        id: string;
        /** The model motion's name, as the model's own file names it. */
        name: string;
        /** How fast to play it; defaults to 1. */
        speed?: number;
        /** Whether it repeats; defaults to the motion's own loop. */
        loop?: boolean;
      };
    }
  | { tag: "figure-stop"; payload: { id: string } }
  | {
      tag: "player-model";
      payload: {
        /** The player whose look changes; "" for the local player. */
        player: string;
        /** The place model file the player wears, or "" to go back to the plain cube. */
        model?: string;
        /** Reads the model live from its own `at://` address; takes precedence over `model`. */
        modelUri?: string;
      };
    }
  | {
      tag: "light";
      payload: {
        /** Names the light, so a later `light-remove` reaches it. */
        id: string;
        /** The figure the light hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** The light's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The light's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** Linear RGB, 0 to 1 each; defaults to warm white. */
        color?: [number, number, number];
        /** How far the light reaches, in world units; defaults to 12. */
        range?: number;
        /** How brightly it burns; defaults to 1. */
        intensity?: number;
      };
    }
  | { tag: "light-remove"; payload: { id: string } }
  | {
      tag: "billboard";
      payload: {
        /** Names the label, so a later `billboard-remove` reaches it, or a new one replaces it. */
        id: string;
        /** The line shown. */
        text: string;
        /** The figure the label hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** The label's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The label's height in world units; docked to the ground (plus `height`) when absent. */
        y?: number;
        z?: number;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** The drawn height of the label in world units; defaults to 0.5. */
        scale?: number;
        /** How far above an attached figure's feet the label hangs; defaults to 2.2. */
        height?: number;
      };
    }
  | { tag: "billboard-remove"; payload: { id: string } }
  | {
      tag: "particle";
      payload: {
        /** Names the emitter, so a later `particle-remove` reaches it. */
        id: string;
        /** The emitter's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The emitter's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** The figure the emitter hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** One of the world's fixed particle kinds; defaults to "spark". */
        kind?: ParticleKind;
        /** Linear RGB, 0 to 1 each; defaults to the kind's own colour. */
        color?: [number, number, number];
        /** Drawn size of one particle, in world units; defaults to the kind's own. */
        size?: number;
        /** How far particles travel, in world units; defaults to the kind's own. */
        spread?: number;
        /** How long one particle lives, in milliseconds; defaults to the kind's own. */
        lifeMs?: number;
        /** Whether it keeps emitting until removed; defaults to false. */
        loop?: boolean;
      };
    }
  | { tag: "particle-remove"; payload: { id: string } }
  | {
      tag: "storm";
      payload: {
        /** Names the storm, so a later `storm-remove` reaches it, or a new one replaces it. */
        id: string;
        /** One of the world's fixed storm shapes; defaults to "wall". */
        kind?: StormKind;
        /** The storm's centre, in world units; the host grounds it when `y` is absent. */
        x: number;
        z: number;
        /** The storm's base height in world units; defaults to the ground. */
        y?: number;
        /** Heading the storm travels toward, in radians; defaults to 0. */
        yaw?: number;
        /** A wall's half-width across the heading, or a funnel's base radius; defaults to 40. */
        width?: number;
        /** Drawn height of the storm in world units; defaults to 30. */
        height?: number;
        /** How far a wall runs front to back, in world units; defaults to 30. */
        depth?: number;
        /** How thick the dust reads, 0 to 1; defaults to 1. */
        intensity?: number;
        /** Linear RGB dust colour, 0 to 1 each; defaults to a sand tan. */
        color?: [number, number, number];
        /** Turns per second a funnel spins about its axis; defaults to a slow spin. */
        spin?: number;
      };
    }
  | { tag: "storm-remove"; payload: { id: string } }
  | {
      tag: "decal";
      payload: {
        /** Names the mark, so a later `decal-remove` reaches it. */
        id: string;
        /** One of the world's fixed mark shapes. */
        kind: DecalKind;
        /** The mark's position, in world units, required when it lies on no figure. */
        x?: number;
        /** The mark's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** The figure the mark lies under; when set, the position fields are ignored. */
        entityId?: string;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** Drawn width in world units; defaults to 2. */
        size?: number;
        /** Rotation about the vertical axis, in radians; defaults to 0. */
        yaw?: number;
      };
    }
  | { tag: "decal-remove"; payload: { id: string } }
  | {
      tag: "entity-look";
      payload: {
        /** The scripted figure to tint or fade. */
        id: string;
        /** The colour the figure is multiplied by, each channel 0 to 1; defaults to white. */
        color?: [number, number, number];
        /** The share of the figure's opacity kept, 0 to 1; defaults to 1. */
        alpha?: number;
      };
    }
  | { tag: "entity-look-clear"; payload: { id: string } }
  | {
      tag: "beam";
      payload: {
        /** Names the line, so a later `beam-remove` reaches it. */
        id: string;
        /** The figure the line starts at; exactly one of this and `from` is set. */
        fromEntity?: string;
        /** The world point the line starts at, in world units. */
        from?: [number, number, number];
        /** The figure the line ends at; exactly one of this and `to` is set. */
        toEntity?: string;
        /** The world point the line ends at, in world units. */
        to?: [number, number, number];
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** How wide the line is drawn, in world units; defaults to 0.1. */
        width?: number;
      };
    }
  | { tag: "beam-remove"; payload: { id: string } }
  | {
      tag: "data-set";
      payload: {
        /** Whether the value belongs to one player or to everyone. */
        scope: DataScope;
        /** The player the value belongs to; "" means the local player; ignored for global. */
        player?: string;
        /** Names the value, so it can be read back on a later run. */
        key: string;
        /** The value to remember. */
        value: DataValue;
      };
    }
  | {
      tag: "data-delete";
      payload: {
        scope: DataScope;
        player?: string;
        key: string;
      };
    }
  | {
      tag: "data-get";
      payload: {
        scope: DataScope;
        /** The player the value belongs to; "" means the local player; ignored for global. */
        player?: string;
        key: string;
        /** Names the request, so the `data-loaded` fact can be matched to it. */
        requestId: string;
      };
    }
  | {
      tag: "badge-award";
      payload: {
        /** The player to award; "" means the local player. */
        player?: string;
        /** Names the badge, so a later run can ask whether it was earned. */
        badge: string;
      };
    }
  | {
      tag: "teleport";
      payload: {
        /** The player to send; "" means the local player. */
        player: string;
        /** Where to send them: a published place's `at://` address, or a built-in demo as `demo:<id>`. */
        place: string;
        /** The player's saved keys to copy into the account scope, so the place they go to can read them. */
        carry?: string[];
      };
    }
  | {
      tag: "ui-panel";
      payload: {
        /** The player whose overlay shows it; "" for the local player. */
        player: string;
        /** Names the panel, so later items and a remove reach it. */
        id: string;
        /** The panel's heading, or "" for none. */
        title?: string;
        /** Which corner it docks to; defaults to top-left. */
        anchor?: UiAnchor;
      };
    }
  | {
      tag: "ui-label";
      payload: {
        player: string;
        /** The panel the label belongs to. */
        panel: string;
        id: string;
        text: string;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
      };
    }
  | {
      tag: "ui-bar";
      payload: {
        player: string;
        panel: string;
        id: string;
        /** The bar's caption, or "" for none. */
        label?: string;
        value: number;
        max: number;
      };
    }
  | {
      tag: "ui-button";
      payload: {
        player: string;
        panel: string;
        id: string;
        label: string;
        /** Carried on the `ui-clicked` fact, so one handler can tell buttons apart. */
        value?: string;
      };
    }
  | {
      tag: "ui-image";
      payload: {
        player: string;
        panel: string;
        id: string;
        /** An item id whose sprite the world draws; the item's name when it has no sprite. */
        sprite: string;
      };
    }
  | {
      tag: "ui-remove";
      payload: {
        player: string;
        panel: string;
        /** The item to take off; the whole panel when absent. */
        item?: string;
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

/** Whether a value is one LOD-0 voxel coordinate this world can address. */
const isVoxel = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every(
    (n) =>
      typeof n === "number" &&
      Number.isInteger(n) &&
      Math.abs(n) <= MAX_BLOCK_COORD,
  );

/** Whether a value is a voxel id a `Uint8Array` store can hold. */
const isBlockId = (v: unknown): boolean =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_BLOCK_ID;

/** Whether a value is a voxel box this world can fill, its two corners ordered and its volume bounded. */
const isBlockBox = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (!isVoxel(p.min) || !isVoxel(p.max)) {
    return false;
  }
  const min = p.min as [number, number, number];
  const max = p.max as [number, number, number];
  if (!(min[0] <= max[0] && min[1] <= max[1] && min[2] <= max[2])) {
    return false;
  }
  return (
    (max[0] - min[0] + 1) * (max[1] - min[1] + 1) * (max[2] - min[2] + 1) <=
    MAX_BLOCK_FILL
  );
};

const isNumberIn = (v: unknown, min: number, max: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Whether a value is a string, number, or boolean a script may hang on an entity. */
const isAttributeValue = (v: unknown): v is AttributeValue =>
  typeof v === "boolean" ||
  (typeof v === "string" && v.length <= MAX_ATTRIBUTE_STRING) ||
  (typeof v === "number" && Number.isFinite(v));

/** Whether a value is a linear RGB colour, each channel from 0 to 1. */
const isColor3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => isNumberIn(n, 0, 1));

/** Whether a value is a list of names an entity may carry. */
const isTags = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= MAX_TAGS &&
  v.every((tag) => isShort(tag, MAX_TAG_LENGTH));

/** Whether a value is a table of named values an entity may carry. */
const isAttributes = (v: unknown): v is Record<string, AttributeValue> => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return false;
  }
  const entries = Object.entries(v);
  return (
    entries.length <= MAX_ATTRIBUTES &&
    entries.every(
      ([key, value]) => isShort(key, MAX_TAG_LENGTH) && isAttributeValue(value),
    )
  );
};

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

/** Whether a value is a back-and-forth offset along an axis this world can sample. */
const isOscillation = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    isNumberIn(o.amplitude, 0, MAX_MOTION_AMPLITUDE) &&
    isNumberIn(o.periodMs, 1, MAX_MOTION_MS) &&
    (o.axis === undefined || isVector(o.axis)) &&
    (o.startAfterMs === undefined ||
      isNumberIn(o.startAfterMs, 0, MAX_MOTION_MS))
  );
};

/** Whether a value is a path, spin, and oscillation this world can sample. */
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
  if (m.oscillate !== undefined && !isOscillation(m.oscillate)) {
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
  if (
    s.fov !== undefined &&
    !isNumberIn(s.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV)
  ) {
    return false;
  }
  if (s.shake !== undefined && !isNumberIn(s.shake, 0, MAX_CAMERA_SHAKE)) {
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

/** Whether a value is the velocity a script-driven prop moves its own body at. */
const isBodyVelocity = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;
  return (
    isNumberIn(c.vx, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
    isNumberIn(c.vy, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
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
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes))
      );
    case "npc-remove":
    case "npc-die":
      return isShort(p.id, 64);
    case "entity-set":
      return (
        isShort(p.id, 64) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes)) &&
        (p.tags !== undefined || p.attributes !== undefined)
      );
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
        (p.seat === undefined || typeof p.seat === "boolean") &&
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.conveyor === undefined ||
          (p.motion === undefined && isConveyor(p.conveyor))) &&
        (p.velocity === undefined ||
          (p.motion === undefined &&
            p.conveyor === undefined &&
            isBodyVelocity(p.velocity))) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes))
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
      return (
        isPlayer(p.player) &&
        isShort(p.name, MAX_SOUND_NAME) &&
        (p.id === undefined || isShort(p.id, 64)) &&
        (p.volume === undefined || isNumberIn(p.volume, 0, MAX_SOUND_VOLUME)) &&
        (p.pitch === undefined ||
          isNumberIn(p.pitch, MIN_SOUND_PITCH, MAX_SOUND_PITCH)) &&
        (p.loop === undefined || typeof p.loop === "boolean") &&
        (p.loop !== true || isShort(p.id, 64))
      );
    case "sound-stop":
      return isPlayer(p.player) && isShort(p.id, 64);
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
        (p.ease === undefined || p.ease === "linear" || p.ease === "smooth") &&
        (p.fov === undefined ||
          isNumberIn(p.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV)) &&
        (p.shake === undefined || isNumberIn(p.shake, 0, MAX_CAMERA_SHAKE))
      );
    case "camera-follow":
      return (
        isPlayer(p.player) &&
        isShort(p.entityId, 64) &&
        (p.back === undefined || isNumberIn(p.back, 0, MAX_CAMERA_DISTANCE)) &&
        (p.up === undefined ||
          isNumberIn(p.up, -MAX_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)) &&
        (p.lookAhead === undefined ||
          isNumberIn(p.lookAhead, -MAX_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)) &&
        (p.fov === undefined ||
          isNumberIn(p.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV))
      );
    case "camera-follow-clear":
      return isPlayer(p.player);
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
    case "player-heal":
      return isPlayer(p.player) && isNumberIn(p.amount, 1, MAX_PLAYER_DAMAGE);
    case "player-max-health":
      return (
        isPlayer(p.player) && isNumberIn(p.maxHealth, 1, MAX_PLAYER_MAX_HEALTH)
      );
    case "team-define":
      return (
        isShort(p.id, MAX_TEAM_NAME) &&
        (p.name === undefined || isShort(p.name, MAX_TEAM_NAME))
      );
    case "player-team":
      return (
        isPlayer(p.player) && (p.team === "" || isShort(p.team, MAX_TEAM_NAME))
      );
    case "player-value":
      return (
        isPlayer(p.player) &&
        isShort(p.key, MAX_TEAM_NAME) &&
        isNumberIn(p.value, -MAX_PLAYER_VALUE, MAX_PLAYER_VALUE)
      );
    case "player-push":
      return (
        isPlayer(p.player) &&
        isNumberIn(p.vx, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        isNumberIn(p.vy, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        isNumberIn(p.vz, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        ((p.vx as number) !== 0 ||
          (p.vy as number) !== 0 ||
          (p.vz as number) !== 0)
      );
    case "report-hit":
      return (
        isPlayer(p.player) &&
        isShort(p.entityId, 64) &&
        isNumberIn(p.amount, 1, MAX_REPORTED_HIT) &&
        isCoord(p.attackerX) &&
        isCoord(p.attackerZ)
      );
    case "block-set":
      return isVoxel(p.voxel) && isBlockId(p.id);
    case "block-fill":
      return isBlockBox(p) && isBlockId(p.id);
    case "block-clear":
      return isBlockBox(p);
    case "structure": {
      const shapes = p.shapes;
      return (
        isShort(p.id, MAX_NPC_NAME) &&
        Array.isArray(shapes) &&
        shapes.length > 0 &&
        shapes.length <= MAX_PLAN_SHAPES &&
        shapes.every(isPlanShape)
      );
    }
    case "structure-remove":
      return isShort(p.id, MAX_NPC_NAME);
    case "bind":
      return (
        isShort(p.id, 64) &&
        (p.key === "" || isShort(p.key, MAX_BIND_KEY)) &&
        (p.label === undefined || isShort(p.label, MAX_PROMPT_VERB))
      );
    case "prompt":
      return (
        isShort(p.id, 64) &&
        isShort(p.entityId, 64) &&
        isShort(p.verb, MAX_PROMPT_VERB) &&
        (p.key === undefined || isShort(p.key, MAX_BIND_KEY)) &&
        (p.range === undefined || isNumberIn(p.range, 1, MAX_PROMPT_RANGE)) &&
        (p.once === undefined || typeof p.once === "boolean")
      );
    case "prompt-remove":
      return isShort(p.id, 64);
    case "figure-animate":
      return (
        isShort(p.id, 64) &&
        isShort(p.name, MAX_ANIMATION_NAME) &&
        (p.speed === undefined ||
          isNumberIn(p.speed, 0.01, MAX_ANIMATION_SPEED)) &&
        (p.loop === undefined || typeof p.loop === "boolean")
      );
    case "figure-stop":
      return isShort(p.id, 64);
    case "player-model":
      return (
        isPlayer(p.player) &&
        (p.model === undefined ||
          p.model === "" ||
          isShort(p.model, MAX_PROP_MODEL)) &&
        (p.modelUri === undefined ||
          (p.modelUri !== "" && isShort(p.modelUri, MAX_MODEL_URI))) &&
        (p.model !== undefined || p.modelUri !== undefined)
      );
    case "light":
      return (
        isShort(p.id, 64) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.range === undefined || isNumberIn(p.range, 0, MAX_LIGHT_RANGE)) &&
        (p.intensity === undefined ||
          isNumberIn(p.intensity, 0, MAX_LIGHT_INTENSITY))
      );
    case "light-remove":
      return isShort(p.id, 64);
    case "billboard":
      return (
        isShort(p.id, 64) &&
        isShort(p.text, MAX_BILLBOARD_TEXT) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.scale === undefined ||
          isNumberIn(p.scale, 0.05, MAX_BILLBOARD_SCALE)) &&
        (p.height === undefined ||
          isNumberIn(p.height, 0, MAX_BILLBOARD_HEIGHT))
      );
    case "billboard-remove":
      return isShort(p.id, 64);
    case "particle":
      return (
        isShort(p.id, 64) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.kind === undefined ||
          PARTICLE_KINDS.includes(p.kind as ParticleKind)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.size === undefined || isNumberIn(p.size, 0.02, MAX_PARTICLE_SIZE)) &&
        (p.spread === undefined ||
          isNumberIn(p.spread, 0, MAX_PARTICLE_SPREAD)) &&
        (p.lifeMs === undefined ||
          isNumberIn(p.lifeMs, 50, MAX_PARTICLE_LIFE_MS)) &&
        (p.loop === undefined || typeof p.loop === "boolean")
      );
    case "particle-remove":
      return isShort(p.id, 64);
    case "storm":
      return (
        isShort(p.id, 64) &&
        (p.kind === undefined || STORM_KINDS.includes(p.kind as StormKind)) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.width === undefined || isNumberIn(p.width, 0.5, MAX_STORM_SIZE)) &&
        (p.height === undefined || isNumberIn(p.height, 0.5, MAX_STORM_SIZE)) &&
        (p.depth === undefined || isNumberIn(p.depth, 0.5, MAX_STORM_SIZE)) &&
        (p.intensity === undefined || isNumberIn(p.intensity, 0, 1)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.spin === undefined ||
          isNumberIn(p.spin, -MAX_STORM_SPIN, MAX_STORM_SPIN))
      );
    case "storm-remove":
      return isShort(p.id, 64);
    case "decal":
      return (
        isShort(p.id, 64) &&
        DECAL_KINDS.includes(p.kind as DecalKind) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.size === undefined || isNumberIn(p.size, 0.1, MAX_DECAL_SIZE)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "decal-remove":
      return isShort(p.id, 64);
    case "entity-look":
      return (
        isShort(p.id, 64) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.alpha === undefined || isNumberIn(p.alpha, 0, 1))
      );
    case "entity-look-clear":
      return isShort(p.id, 64);
    case "beam":
      return (
        isShort(p.id, 64) &&
        (p.fromEntity === undefined) !== (p.from === undefined) &&
        (p.toEntity === undefined) !== (p.to === undefined) &&
        (p.fromEntity === undefined || isShort(p.fromEntity, 64)) &&
        (p.toEntity === undefined || isShort(p.toEntity, 64)) &&
        (p.from === undefined || isVector(p.from)) &&
        (p.to === undefined || isVector(p.to)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.width === undefined || isNumberIn(p.width, 0.02, MAX_BEAM_WIDTH))
      );
    case "beam-remove":
      return isShort(p.id, 64);
    case "data-set":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY) &&
        isDataValue(p.value)
      );
    case "data-delete":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY)
      );
    case "data-get":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY) &&
        isShort(p.requestId, 64)
      );
    case "badge-award":
      return (
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.badge, MAX_DATA_KEY)
      );
    case "teleport":
      return (
        isPlayer(p.player) &&
        isShort(p.place, MAX_PLACE_ADDRESS) &&
        (p.carry === undefined ||
          (Array.isArray(p.carry) &&
            p.carry.length <= MAX_CARRY_KEYS &&
            p.carry.every((key) => isShort(key, MAX_DATA_KEY))))
      );
    case "ui-panel":
      return (
        isPlayer(p.player) &&
        isShort(p.id, 64) &&
        (p.title === undefined ||
          p.title === "" ||
          isShort(p.title, MAX_UI_TEXT)) &&
        (p.anchor === undefined || UI_ANCHORS.includes(p.anchor as UiAnchor))
      );
    case "ui-label":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.text, MAX_UI_TEXT) &&
        (p.color === undefined || isColor3(p.color))
      );
    case "ui-bar":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        (p.label === undefined ||
          p.label === "" ||
          isShort(p.label, MAX_UI_TEXT)) &&
        isNumberIn(p.value, -MAX_HUD_VALUE, MAX_HUD_VALUE) &&
        isNumberIn(p.max, 1, MAX_HUD_VALUE)
      );
    case "ui-button":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.label, MAX_UI_TEXT) &&
        (p.value === undefined ||
          p.value === "" ||
          isShort(p.value, MAX_UI_VALUE))
      );
    case "ui-image":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.sprite, MAX_UI_SPRITE)
      );
    case "ui-remove":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        (p.item === undefined || p.item === "" || isShort(p.item, 64))
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
