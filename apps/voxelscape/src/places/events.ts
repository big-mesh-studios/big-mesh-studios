// Script events: the replicated fact vocabulary a place's derived rules fold
// over. Each event is an immutable fact — an id, the moment on a clock every
// peer in the place shares, the peer that produced it, and the kind's own
// payload — so any peer can replay the same event set in the same total order
// and compute the same rule state. An event is created once, on the peer that
// observed it, and travels with its id so a duplicate arrival is dropped
// rather than re-applied. The payload keys and their bounds are the contract
// the mesh broadcast and the atproto record both validate against, the same
// way `multiplayer/messages.ts` bounds every wire field.

/** One script event kind; the vocabulary of facts a rule may react to. */
export type ScriptEventPayload =
  | {
      kind: "block-broken";
      /** The LOD-0 world voxel that was broken. */
      voxel: [number, number, number];
      /** The voxel id that was there before the break. */
      blockId: number;
    }
  | {
      kind: "block-placed";
      /** The LOD-0 world voxel that was filled. */
      voxel: [number, number, number];
      /** The voxel id that was placed there. */
      blockId: number;
    }
  | {
      kind: "entity-killed";
      /** The id of the entity that died. */
      entityId: string;
      /** The DID of the player whose action killed it, or "" for a hazard kill. */
      by: string;
    }
  | {
      kind: "player-joined";
      /** The DID of the player who joined the place. */
      player: string;
    }
  | {
      kind: "player-left";
      /** The DID of the player who left the place. */
      player: string;
    }
  | {
      kind: "entity-used";
      /** The id of the NPC or prop the player used. */
      entityId: string;
      /** The item id the player used on it, or "" for a bare use. */
      item: string;
      /** Which control the player used, or absent where the world does not say. */
      button?: "primary" | "secondary" | "use";
    }
  | {
      kind: "input";
      /** The id a script gave the binding its key is on. */
      bindId: string;
      /** Whether the key went down or came up. */
      phase: "down" | "up";
    }
  | {
      kind: "prompt-triggered";
      /** The id a script gave the prompt the player answered. */
      promptId: string;
    }
  | {
      kind: "entity-hit";
      /** The id of the NPC a weapon struck. */
      entityId: string;
      /** Hit points the strike carried. */
      amount: number;
      /** Where the attacker stood when the strike landed, in world units. */
      attackerX: number;
      attackerZ: number;
    }
  | {
      kind: "item-used";
      /** The id of the item the player used on its own. */
      item: string;
    }
  | {
      kind: "zone-entered";
      /** The id of the zone a player stepped into. */
      zoneId: string;
    }
  | {
      kind: "zone-left";
      /** The id of the zone a player stepped out of. */
      zoneId: string;
    }
  | {
      kind: "npc-talk";
      /** The id of the NPC the player started talking to. */
      npcId: string;
    }
  | {
      kind: "npc-choose";
      /** The id of the NPC the player was talking to. */
      npcId: string;
      /** The index into the options the dialog showed, so a rule can tell one choice from another. */
      option: number;
    }
  | {
      kind: "npc-leave";
      /** The id of the NPC the player stopped talking to. */
      npcId: string;
    }
  | {
      kind: "timer";
      /** The id a script gave the deadline it set with a `timer` effect. */
      timerId: string;
    }
  | {
      kind: "player-touched";
      /** The id of the hazardous prop a player came into contact with. */
      entityId: string;
    }
  | {
      kind: "player-died";
      /** The id of the hazard that killed the player, or "" for a fall or void. */
      cause: string;
    }
  | {
      kind: "data-changed";
      /** Which players the value belongs to: one in this place, everyone, or the account. */
      scope: "player" | "global" | "account";
      /** The player the value belongs to, or "" for the global or account scope. */
      player: string;
      /** The key that changed. */
      key: string;
      /** Whether the key was forgotten rather than set. */
      deleted: boolean;
      /** The value set, or absent when the key was forgotten. */
      value?: string | number | boolean;
    }
  | {
      kind: "data-loaded";
      /** The id the script gave the `data-get` this answers. */
      requestId: string;
      /** The scope the value was read from. */
      scope: "player" | "global" | "account";
      /** The key the value was read under. */
      key: string;
      /** Whether the place remembered a value for it. */
      found: boolean;
      /** The value, present exactly when `found` is. */
      value?: string | number | boolean;
    }
  | {
      kind: "badge-earned";
      /** The player who earned it, or "" for the local player. */
      player: string;
      /** The badge earned. */
      badge: string;
    }
  | {
      kind: "player-teleported";
      /** The place the player went to. */
      place: string;
    }
  | {
      kind: "ui-clicked";
      /** The panel the button belongs to. */
      panel: string;
      /** The button the player pressed. */
      button: string;
      /** The button's value, or "" when it named none. */
      value?: string;
    };

/** One immutable script fact, stamped with where it came from and when. */
export type ScriptEvent = ScriptEventPayload & {
  /** Producer-unique event id; duplicates of an id are dropped on merge. */
  id: string;
  /** Milliseconds on the clock shared by every peer, which drives total order. */
  at: number;
  /** DID of the client the event originated on. */
  producer: string;
};

/** Distance from the origin an event may address a voxel, in LOD-0 grid units. */
export const MAX_EVENT_COORD = 100_000;
/** Voxel ids live in a `Uint8Array` store, so 0..255 covers every id. */
export const MAX_EVENT_BLOCK_ID = 255;
/** Longest event id and entity id a fact may name. */
export const MAX_EVENT_ID = 64;
/** Longest item id an event may name. */
export const MAX_EVENT_ITEM = 64;
/** Longest producer or player string an event may carry (a DID). */
export const MAX_EVENT_PLAYER = 256;
/** The highest option index an `npc-choose` may carry. */
export const MAX_NPC_CHOICE = 32;
/** The most hit points one `entity-hit` may carry. */
export const MAX_ENTITY_HIT_AMOUNT = 1_000;
/** The longest a string value one `data-changed` may carry. */
export const MAX_EVENT_DATA_VALUE = 512;
/** The longest a teleport address one `player-teleported` may carry. */
export const MAX_EVENT_PLACE = 256;
/** The longest a button value one `ui-clicked` may carry. */
export const MAX_EVENT_UI_VALUE = 128;
/** The furthest an `entity-hit`'s attacker position may read, in world units. */
export const MAX_ENTITY_HIT_COORD = 1_000_000;

const isVoxel = (v: unknown): v is [number, number, number] => {
  if (!Array.isArray(v) || v.length !== 3) {
    return false;
  }
  return v.every(
    (n) =>
      typeof n === "number" &&
      Number.isInteger(n) &&
      Math.abs(n) <= MAX_EVENT_COORD,
  );
};

const isShortString = (v: unknown, max: number): boolean =>
  typeof v === "string" && v.length >= 1 && v.length <= max;

const isEntityCoord = (v: unknown): boolean =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  Math.abs(v) <= MAX_ENTITY_HIT_COORD;

const isPlayer = (v: unknown): boolean => isShortString(v, MAX_EVENT_PLAYER);

/**
 * Whether `v` is a well-formed script event. A peer's event bytes are
 * untrusted input that gets applied straight to the shared log, so every field
 * is bounded the way `multiplayer/messages.ts` bounds its wire types.
 */
export const isScriptEvent = (v: unknown): v is ScriptEvent => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  if (!isShortString(r.id, MAX_EVENT_ID)) {
    return false;
  }
  if (!isPlayer(r.producer)) {
    return false;
  }
  if (typeof r.at !== "number" || !Number.isFinite(r.at) || r.at < 0) {
    return false;
  }
  if (r.kind === "block-broken" || r.kind === "block-placed") {
    return (
      isVoxel(r.voxel) &&
      typeof r.blockId === "number" &&
      Number.isInteger(r.blockId) &&
      r.blockId >= 0 &&
      r.blockId <= MAX_EVENT_BLOCK_ID
    );
  }
  if (r.kind === "entity-killed") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) && (r.by === "" || isPlayer(r.by))
    );
  }
  if (r.kind === "player-joined" || r.kind === "player-left") {
    return isPlayer(r.player);
  }
  if (r.kind === "entity-used") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) &&
      (r.item === "" || isShortString(r.item, MAX_EVENT_ITEM)) &&
      (r.button === undefined ||
        r.button === "primary" ||
        r.button === "secondary" ||
        r.button === "use")
    );
  }
  if (r.kind === "input") {
    return (
      isShortString(r.bindId, MAX_EVENT_ID) &&
      (r.phase === "down" || r.phase === "up")
    );
  }
  if (r.kind === "prompt-triggered") {
    return isShortString(r.promptId, MAX_EVENT_ID);
  }
  if (r.kind === "entity-hit") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) &&
      typeof r.amount === "number" &&
      Number.isFinite(r.amount) &&
      r.amount > 0 &&
      r.amount <= MAX_ENTITY_HIT_AMOUNT &&
      isEntityCoord(r.attackerX) &&
      isEntityCoord(r.attackerZ)
    );
  }
  if (r.kind === "item-used") {
    return isShortString(r.item, MAX_EVENT_ITEM);
  }
  if (r.kind === "zone-entered" || r.kind === "zone-left") {
    return isShortString(r.zoneId, MAX_EVENT_ID);
  }
  if (r.kind === "npc-talk" || r.kind === "npc-leave") {
    return isShortString(r.npcId, MAX_EVENT_ID);
  }
  if (r.kind === "timer") {
    return isShortString(r.timerId, MAX_EVENT_ID);
  }
  if (r.kind === "player-touched") {
    return isShortString(r.entityId, MAX_EVENT_ID);
  }
  if (r.kind === "player-died") {
    return r.cause === "" || isShortString(r.cause, MAX_EVENT_ID);
  }
  if (r.kind === "data-changed") {
    return (
      (r.scope === "player" || r.scope === "global" || r.scope === "account") &&
      (r.player === "" || isPlayer(r.player)) &&
      isShortString(r.key, MAX_EVENT_ID) &&
      typeof r.deleted === "boolean" &&
      (r.deleted
        ? r.value === undefined
        : typeof r.value === "boolean" ||
          (typeof r.value === "string" &&
            r.value.length <= MAX_EVENT_DATA_VALUE) ||
          (typeof r.value === "number" && Number.isFinite(r.value)))
    );
  }
  if (r.kind === "data-loaded") {
    return (
      isShortString(r.requestId, MAX_EVENT_ID) &&
      (r.scope === "player" || r.scope === "global" || r.scope === "account") &&
      isShortString(r.key, MAX_EVENT_ID) &&
      typeof r.found === "boolean" &&
      (r.found
        ? typeof r.value === "boolean" ||
          (typeof r.value === "string" &&
            r.value.length <= MAX_EVENT_DATA_VALUE) ||
          (typeof r.value === "number" && Number.isFinite(r.value))
        : r.value === undefined)
    );
  }
  if (r.kind === "badge-earned") {
    return (
      (r.player === "" || isPlayer(r.player)) &&
      isShortString(r.badge, MAX_EVENT_ID)
    );
  }
  if (r.kind === "player-teleported") {
    return isShortString(r.place, MAX_EVENT_PLACE);
  }
  if (r.kind === "ui-clicked") {
    return (
      isShortString(r.panel, MAX_EVENT_ID) &&
      isShortString(r.button, MAX_EVENT_ID) &&
      (r.value === undefined ||
        r.value === "" ||
        isShortString(r.value, MAX_EVENT_UI_VALUE))
    );
  }
  if (r.kind === "npc-choose") {
    return (
      isShortString(r.npcId, MAX_EVENT_ID) &&
      typeof r.option === "number" &&
      Number.isInteger(r.option) &&
      r.option >= 0 &&
      r.option <= MAX_NPC_CHOICE
    );
  }
  return false;
};

/** Serializes a batch of events to the compact JSON form they travel in. */
export const encodeScriptEvents = (events: ScriptEvent[]): string =>
  JSON.stringify(events);

/**
 * Parses a serialized batch back into validated events, or null when the chunk
 * is malformed or holds an event that fails validation. The wire chunk and the
 * atproto record body both arrive here before anything applies them.
 */
export const decodeScriptEvents = (chunk: unknown): ScriptEvent[] | null => {
  let parsed: unknown;
  if (typeof chunk === "string" || chunk instanceof Uint8Array) {
    try {
      parsed = JSON.parse(
        typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
      );
    } catch {
      return null;
    }
  } else {
    parsed = chunk;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  return parsed.every(isScriptEvent) ? (parsed as ScriptEvent[]) : null;
};

const orderBy = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The deterministic total order events are folded over: by moment on the shared
 * clock, ties by producer DID, then by id, so any peer ordering the same event
 * set arrives at the same sequence.
 */
export const compareScriptEvents = (a: ScriptEvent, b: ScriptEvent): number =>
  a.at - b.at || orderBy(a.producer, b.producer) || orderBy(a.id, b.id);
