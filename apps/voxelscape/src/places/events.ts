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
      (r.item === "" || isShortString(r.item, MAX_EVENT_ITEM))
    );
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
