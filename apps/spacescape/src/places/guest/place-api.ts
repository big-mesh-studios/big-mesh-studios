/**
 * The guest library: everything a place script can call.
 *
 * ## How this file reaches the interpreter
 *
 * **It is a real TypeScript file in this repository, type-checked by `tsc --noEmit` like
 * any other, and `bundle.ts` transpiles it at bundle time.** That is the part worth
 * explaining, because the obvious alternative is to keep the guest API as a string in a
 * template literal — which is what the sibling project does, and which means the guest API
 * is never type-checked, never gets a compile error, and drifts from
 * `voxelscape.d.ts` silently.
 *
 * Here the two are the same file. `voxelscape.d.ts` re-exports these types, so a place
 * author gets exactly the declarations the interpreter runs, and `bundle.test.ts` asserts
 * that what the file exports and what the declaration offers are the same names.
 *
 * ## The two rules it obeys
 *
 * 1. **Nothing crosses the boundary but strings and numbers.** Every call to `engine` is a
 *    string or a number in and a string out. `JSON.stringify` is the only serializer used,
 *    because a format the host and the guest could disagree about is a format that will.
 * 2. **It imports nothing at runtime.** The single import below is `import type`, which
 *    `transpileModule` erases — and `bundle.test.ts` asserts the transpiled output requires
 *    nothing, because a guest module that required something would fail inside the
 *    interpreter with an error about a module the place author never wrote.
 *
 * ## Why the library exists at all
 *
 * Because the alternative is a script that hand-builds JSON. `engine.dispatch("shape-add",
 * JSON.stringify({...}))` in every place, with the field names spelled out, is the vocabulary
 * of ADR 0017 leaking into every script — and the first place to spell `combine` wrong
 * writes a shape that silently does nothing.
 */

// **A type-only import, and that is load-bearing.** This file is the guest library: it
// is bundled into a program QuickJS runs, and a test asserts that bundle contains no
// `require(` and imports nothing at runtime. `PRIMITIVES` is needed only for its type —
// `typeof PRIMITIVES[K]["parameters"]` — so importing it as a value would have pulled
// the whole primitive table into every place's bundle to read nine field names, and the
// bundle test caught exactly that.
import type { PRIMITIVES, ShapeType } from "@big-mesh-studios/sdf";

import type { GuestBridge } from "../bridge";

/**
 * The host, as the interpreter passed it in.
 *
 * **Not a module-level import and not a global.** `bundle.ts` runs the entry's source as
 * the body of a function whose one parameter this name, so a script that never receives the
 * object cannot name it — including code compiled later by a `Function` constructor, which
 * happens in global scope and sees nothing.
 */
declare const engine: GuestBridge;

/**
 * Thrown when the host refuses an effect.
 *
 * A place is code, and code that is told nothing about its own failures fails somewhere
 * else. A script that adds a two-thousand-and-first shape gets a `PlaceError` naming the
 * limit at the line that caused it, rather than a world with a bridge missing from it.
 */
export class PlaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceError";
  }
}

/**
 * Sends an effect, and throws if the host refused it.
 *
 * The one place the library talks to `engine.dispatch`, so the refusal has one answer
 * rather than nineteen call sites each deciding what to do with an empty string.
 */
const ask = (tag: string, payload: unknown): void => {
  const refusal = engine.dispatch(tag, JSON.stringify(payload));
  if (refusal !== "") throw new PlaceError(`${tag}: ${refusal}`);
};

/**
 * Asks the host a question.
 *
 * **A malformed answer becomes `null` rather than an exception.** A query cannot fail — it
 * answers "no" or "nothing there" — so a script that got something unparseable is talking
 * to a host that is not this build, and the useful thing it can do is carry on rather than
 * stop. The alternative is a place that fails to load on a version skew, which is the worst
 * time to find out.
 */
const askAbout = (name: string, args: unknown[]): unknown => {
  try {
    return JSON.parse(engine.query(name, JSON.stringify(args)));
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ geometry */

/**
 * A shape a script can ask for. Each carries only the numbers its primitive uses.
 *
 * **Derived from the primitive table, not written out.** This is what
 * `@big-mesh-studios/sdf`'s parameter list exists for: the shape's own field names and
 * their arities *are* the table's, so a place script gets a new primitive the day the
 * table has it, and this file — which is read by every place author and checked by the
 * demos — does not change.
 *
 * It is still a mapped type rather than `OperationShape` itself, because a script's
 * shape is `readonly` and its vectors are the `PlaceVec3` a script writes, not the
 * `Vec3` the host works in. The *structure* is derived; the readonly-ness is added here.
 */
type ParametersOf<K extends ShapeType> =
  (typeof PRIMITIVES)[K]["parameters"][number];

/** One SDF primitive a place may add, named by its `type` and sized by the primitive's own parameters. */
export type PlaceShape = {
  readonly [K in ShapeType]: {
    readonly type: K;
  } & {
    readonly [P in ParametersOf<K> as P["name"]]: P["arity"] extends 3
      ? PlaceVec3
      : number;
  };
}[ShapeType];

/** A position, as three plain numbers — an array, because that is what JSON makes of it. */
export type Vec3Like = readonly [number, number, number];

/**
 * A shape's own dimensions, as an object.
 *
 * **Which is not the same as `Vec3Like`, and the asymmetry is a trap worth naming.** A
 * position crosses the boundary as an array, so `at` is `[x, y, z]`. A shape's dimensions are
 * part of the CSG type (`OperationShape` in `@big-mesh-studios/sdf`) where they are objects, and the
 * host copies them straight through rather than converting — so `len` is `{ x, y, z }`.
 *
 * The first version of this file typed both as arrays, and the demos under `demo/` — which are
 * type-checked, which is the whole point of ADR 0018 — refused every box they wrote. It would
 * have reached a place author as a compile error with nothing saying which of the two was
 * wrong.
 */
export type PlaceVec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/** How a shape changes the field. */
export type Combine = "Add" | "Subtract" | "Paint";

/** What `createShape` takes: which place and id the operation belongs to, where it sits, what it is, and how it joins the fold. */
export interface CreateShapeOptions {
  /** Which place it belongs to. Created if it does not exist. */
  readonly place: string;
  /**
   * Its name within that place.
   *
   * **Never optional and never generated.** Two peers run the same script and derive the
   * same operations rather than receiving them (ADR 0016), so an id this peer invented
   * would be a different id on every peer and every shape would appear once per peer.
   */
  readonly id: string;
  /** Where it is. */
  readonly at: Vec3Like;
  readonly shape: PlaceShape;
  readonly combine: Combine;
  /** How far the edge blends. Above 0.25 the stored box is smaller than the shape's reach. */
  readonly softness?: number;
  /** A unit quaternion. */
  readonly orientation?: readonly [number, number, number, number];
  /** A colour, 0 to 255 per channel. */
  readonly colour?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  /**
   * The procedural material, by name — one of `MATERIAL_NAMES`.
   *
   * **A string, and the field table is what makes it safe.** The id that goes on the wire is an
   * index into that list, so the name is checked against it before anything is built and an
   * unknown one is refused whole rather than becoming an operation that draws the wrong pattern.
   */
  readonly material?: string;
}

/**
 * Adds one operation to a place.
 *
 * **Returns nothing.** A handle would be a second identity for a thing the script already
 * has a name for, and the id *is* the handle — which is what `removeShape` takes. An object
 * identity across the boundary is exactly what ADR 0015 forbids, so a handle here could only
 * be a number, and a number the script chose is a name.
 */
export const createShape = (options: CreateShapeOptions): void => {
  ask("shape-add", {
    place: options.place,
    id: options.id,
    at: options.at,
    shape: options.shape,
    combine: options.combine,
    ...(options.softness === undefined ? {} : { softness: options.softness }),
    ...(options.orientation === undefined
      ? {}
      : { orientation: options.orientation }),
    ...(options.colour === undefined ? {} : { colour: options.colour }),
    ...(options.material === undefined ? {} : { material: options.material }),
  });
};

/* --------------------------------------------------------------------- items */

/**
 * Declares an item, so the place can hand it out.
 *
 * **A declaration and not a definition, because there is nothing to define.** An item in this
 * engine is a name and a count; it has no sprite and no slot, because there is no inventory
 * panel to put either in. The sibling engine gives every item a `stackable` flag and an empty
 * sprite, and neither means anything there either — so this takes a name and nothing else, and
 * a field that nothing can act on reads as a feature and is not one.
 *
 * **It exists for the refusal it makes possible.** `giveItem` refuses a name this has not
 * declared, and in the shop this was built for the difference between "the player has a cola"
 * and "the player has a cloa" is the entire puzzle. One declaration per item is a cheap price for
 * a misspelling being an error at the line it was written.
 *
 * Declaring the same item again changes nothing and is not an error, so a place that declares
 * from a loop reloading it is not a failure.
 */
export const defineItem = (item: string): void => {
  ask("item-define", { item });
};

/**
 * Puts items in what the player is carrying.
 *
 * **The item must have been declared**, which is what makes a typo a typo.
 */
export const giveItem = (item: string, count?: number): void => {
  ask("item-give", {
    item,
    ...(count === undefined ? {} : { count }),
  });
};

/**
 * Takes items out of what the player is carrying, and never fails.
 *
 * **Takes whatever is there, up to `count`.** A player who has already drunk the milk has none,
 * and that is an ordinary state rather than a failure — so this does not throw, and a script that
 * wanted to know how much it got keeps its own count in `saveData`.
 *
 * **A held item that runs out is dropped**, which is the reason the held slot lives inside the
 * inventory: a hand holding something the count says is gone is a hand the crosshair reads as
 * occupied.
 */
export const takeItem = (item: string, count?: number): void => {
  ask("item-take", {
    item,
    ...(count === undefined ? {} : { count }),
  });
};

/* ----------------------------------------------------------------------- talk */

/**
 * Says a line, with a name to attribute it to.
 *
 * **A name and not just text**, because a line with no speaker is a line nobody acts on: "Dad: go
 * to bed. Now." and the same words said by a vending machine are different scenes, and the name
 * is the whole of the difference.
 *
 * **It replaces the last one rather than queueing**, because two lines at once is a conversation
 * nobody is having.
 */
export const narrate = (who: string, text: string): void => {
  ask("narrate", { who, text });
};

/**
 * As the player a question with answers to click.
 *
 * **Opening a second dialog replaces the first.** A place that opened one on top of another would
 * leave the player looking at one and unable to reach the other, and the only way out would be
 * whichever one the place happened to remember to close.
 *
 * **The pointer lock is released while it is up**, which is this function's most consequential
 * side effect and the reason it exists rather than a panel the place draws itself: a locked
 * pointer swallows every click aimed anywhere but the crosshair, so a dialog nobody can click is a
 * dialog that does not exist (ADR 0010).
 *
 * **The answer arrives as `npc-choose` with an index counting from zero**, and a place that wants
 * to know which option was picked matches on it.
 */
export const openDialog = (options: {
  /** Who is asking, by the id `createNpc` gave them. */
  readonly entityId: string;
  /** The question. */
  readonly prompt: string;
  /** The answers, in the order they should be offered. */
  readonly options: readonly string[];
}): void => {
  ask("dialog", {
    entityId: options.entityId,
    prompt: options.prompt,
    options: options.options,
  });
};

/**
 * Closes the dialog, and does nothing when there is none.
 *
 * **Which is the point.** A place that closes on the way out of a conversation should not have to
 * know whether one was open, and a `dialog-close` with no dialog behind it is the same answer as
 * one with.
 */
export const closeDialog = (): void => {
  ask("dialog-close", {});
};

/**
 * Ends the game, with a title and a card, and offers to play again.
 *
 * **There is no way to take it back**, and there is deliberately no `unend`: an ending is a
 * statement about the run that just finished, and a place that could undo one would be a place
 * whose end could be undone, which is the one thing an ending is for. The card's only way on is to
 * start again, which reloads the place from the beginning rather than undoing the run.
 */
export const endGame = (options: {
  /** What to call it. */
  readonly title: string;
  /** What to say about it. */
  readonly text: string;
}): void => {
  ask("ending", { title: options.title, text: options.text });
};

/* --------------------------------------------------------------------- hands */

/**
 * Puts an item in the player's hands, or empties them.
 *
 * **Omitting the item is how a place says "put that down", and there is no other way.** Every
 * name in this API is a non-empty string, so an empty string is not available as a second way to
 * say nothing and the absence is the only one.
 *
 * **What a hand changes is the interaction, not the world.** A crosshair on a character is a
 * conversation with empty hands and a use with anything in them; a crosshair on nothing does
 * nothing at all with empty hands. So the whole of what holding a thing does is to change which
 * of those happens, and a place that never reads `item` can hold things all day without
 * consequence.
 */
export const holdItem = (item?: string): void => {
  ask("item-hold", item === undefined ? {} : { item });
};

/* ------------------------------------------------------------------- figures */

/**
 * Stands something in the world, and it is **one** operation for a prop or a character.
 *
 * **`createProp` and `createNpc` rather than one function with a `kind`, because the difference
 * between them is not expressible as a field and the script is the one place it can be held to.**
 * A character has to be given a name, because the crosshair will offer to talk to it and the
 * dialog will have to say what it is talking to; a prop has no name and offering one would be
 * a name nothing uses. `entity-add` is one tag underneath because the wire carries one id space
 * and one crosshair event — but the two functions are how the difference gets enforced rather
 * than documented.
 */
export interface CreateEntityOptions {
  /**
   * What the script calls it, which is the only handle there is.
   *
   * **Never generated**, for the reason a shape's id is never generated: every peer runs every
   * place and derives the same figures rather than receiving them, so an id this peer invented
   * would be a different id on every peer.
   */
  readonly id: string;
  /**
   * One of the place's attached models, by the name in its manifest.
   *
   * **Not a path and not a file.** A `.sdfmod` has no id of its own (ADR 0033), so the name it
   * is asked for by is the name the manifest gave it, and a name the place does not attach is
   * refused by name.
   */
  readonly model: string;
  /** Where it is. This is the model's own origin, not its base and not its middle. */
  readonly at: Vec3Like;
  /** A turn about up, in radians. Omitted means no turn. */
  readonly yaw?: number;
  /**
   * Uniform, about its own origin.
   *
   * **Not a resize.** A figure's shape is baked into its model, so this is for a place that
   * wants a small copy of a thing rather than for one redrawing its own art.
   */
  readonly scale?: number;
}

/** A prop, which is anything the player uses rather than talks to. */
export interface CreatePropOptions extends CreateEntityOptions {
  /**
   * Whether the player walks into it.
   *
   * **True unless a script says otherwise**, because the common case is furniture: a fridge,
   * a counter, a bed. The exception worth naming is a pickup, which a player should be able to
   * walk through, and which therefore has to say so.
   */
  readonly solid?: boolean;
}

/**
 * Stands a character in the world.
 *
 * **A name is required and not optional**, which is the one thing that distinguishes a
 * character from a prop in this vocabulary. Everything else — the id, the model, the place, the
 * turn, the size — is identical, and the host enforces the same rule again on the way in.
 */
export interface CreateNpcOptions extends CreateEntityOptions {
  /** What to call it, in the narration and the dialog. */
  readonly name: string;
}

/** Stands a prop in the world, from one of the place's attached models. */
export const createProp = (options: CreatePropOptions): void => {
  ask("entity-add", {
    id: options.id,
    model: options.model,
    kind: "prop",
    at: options.at,
    ...(options.yaw === undefined ? {} : { yaw: options.yaw }),
    ...(options.scale === undefined ? {} : { scale: options.scale }),
    ...(options.solid === undefined ? {} : { solid: options.solid }),
  });
};

/** Stands a character in the world, from one of the place's attached models. */
export const createNpc = (options: CreateNpcOptions): void => {
  ask("entity-add", {
    id: options.id,
    model: options.model,
    kind: "npc",
    at: options.at,
    name: options.name,
    ...(options.yaw === undefined ? {} : { yaw: options.yaw }),
    ...(options.scale === undefined ? {} : { scale: options.scale }),
  });
};

/**
 * Moves whatever is standing under `id`, and optionally turns it.
 *
 * **One function for both kinds, because there is one id space.** `moveProp` and `moveNpc`
 * would be the same function twice, and the pair would be a place for them to differ by
 * accident.
 *
 * **`yaw` is omitted rather than defaulted to zero**, so a character walking across a room
 * keeps the way it was facing. A move that turned everything to north would be a move that
 * silently did something.
 */
export const moveEntity = (id: string, at: Vec3Like, yaw?: number): void => {
  ask("entity-move", {
    id,
    at,
    ...(yaw === undefined ? {} : { yaw }),
  });
};

/**
 * Takes whatever is standing under `id` out of the world.
 *
 * **Removing something that is not there does nothing and is not an error**, which is what a
 * script that cleans up defensively needs.
 */
export const removeEntity = (id: string): void => {
  ask("entity-remove", { id });
};

/** Takes one shape out of a place by the id `createShape` was given. */
export const removeShape = (place: string, id: string): void => {
  ask("shape-remove", { place, id });
};

/** Removes a whole place, its shapes with it. Nothing it added is in the undo history. */
export const removePlace = (place: string): void => {
  ask("place-remove", { place });
};

/** Empties a place but leaves the place itself, so its name stays valid. */
export const clearPlace = (place: string): void => {
  ask("place-clear", { place });
};

/* -------------------------------------------------------------------- zones */

/**
 * A box that reports the player entering and leaving it.
 *
 * Zones are how a place built out of shapes reacts to anything: a door that opens, a lift
 * that starts, a line that says you have arrived. There is no entity system in v1, so this
 * is the whole of a place's reactivity.
 */
/** What `createZone` takes: an id, the box it fills, and the label a script sees in the event. */
export interface CreateZoneOptions {
  /** Its name. Never generated, for the same reason a shape's id is not. */
  readonly id: string;
  readonly label?: string;
  readonly box: readonly [Vec3Like, Vec3Like];
}

/** Creates a zone: a box the place is told the player entered and left. Replaces any zone with the same id. */
export const createZone = (options: CreateZoneOptions): void => {
  ask("zone-add", {
    id: options.id,
    ...(options.label === undefined ? {} : { label: options.label }),
    box: options.box,
  });
};

/** Takes a zone away. Doing nothing when there is none, so a place need not remember what it made. */
export const removeZone = (id: string): void => {
  ask("zone-remove", { id });
};

/* ------------------------------------------------------------------- lights */

/** What `createLight` takes: an id, where it is, its colour, how far it reaches, and how bright it is where it stops. */
export interface CreateLightOptions {
  /** Its name, and how it is referred to when removed. Never generated. */
  readonly id: string;
  /** Where it is, in world units. */
  readonly at: Vec3Like;
  /** Its colour, each channel 0 to 255 — as everywhere else in this library. */
  readonly colour: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  /**
   * How far it reaches, in world units.
   *
   * **The same number says how bright it is**, which is what makes it worth stating plainly: the
   * falloff is scaled so that `intensity` is the brightness *at the edge of this radius*. A light
   * of radius 100 at intensity 1 is as bright at 100 units as one of radius 20 is at 20. Neither
   * is bright in the middle — a lamp is hottest at its own centre — and the choice is made so a
   * place author tunes one number instead of reconciling brightness against whatever distance
   * the light happens to land on.
   */
  readonly radius: number;
  /**
   * How bright, up to 10. **Read alongside `radius`, not instead of it**: `1` is a bright light,
   * and what it looks like from somewhere depends on how far away that somewhere is.
   */
  readonly intensity: number;
}

/** Creates a light. Replaces any light with the same id, so re-running a script does not stack lamps. */
export const createLight = (options: CreateLightOptions): void => {
  ask("light-add", {
    id: options.id,
    at: options.at,
    colour: options.colour,
    radius: options.radius,
    intensity: options.intensity,
  });
};

/** Takes a light away. Doing nothing when there is none. */
export const removeLight = (id: string): void => {
  ask("light-remove", { id });
};

/* ------------------------------------------------------------------ fields */

/** What `createMedium` takes: an id, the box it fills, and how it pushes, slows or sinks whatever is inside it. */
export interface CreateMediumOptions {
  /** Its name, and how it is referred to when removed. Never generated. */
  readonly id: string;
  /** Two opposite corners, in any order — the field sorts them. */
  readonly box: readonly [Vec3Like, Vec3Like];
  /**
   * Sideways pull, in world units per second. **Zero on one axis makes it a one-way belt.**
   */
  readonly pushVx: number;
  /** Forward pull, in world units per second. */
  readonly pushVz: number;
  /**
   * Upward pull, positive is up. **Left out, the field does not touch falling at all** — which is
   * what makes one conveyor definition also a floor, rather than also being an updraft.
   */
  readonly pushVy?: number;
  /**
   * What walking speed becomes while inside. **0 is quicksand**: the player moves at a fraction
   * of their own speed, or not at all, and `sink` decides how fast they go down.
   */
  readonly speedScale: number;
  /**
   * The fastest this field lets a player fall, in world units per second. Left out or zero, they
   * fall at their own gravity — so a slow belt is `speedScale` alone and quicksand is this too.
   */
  readonly sink?: number;
}

/** Creates a medium: a box the player is pushed, slowed or sunk by. Replaces any medium with the same id. */
export const createMedium = (options: CreateMediumOptions): void => {
  ask("medium-add", {
    id: options.id,
    box: options.box,
    pushVx: options.pushVx,
    pushVz: options.pushVz,
    speedScale: options.speedScale,
    ...(options.pushVy === undefined ? {} : { pushVy: options.pushVy }),
    ...(options.sink === undefined ? {} : { sink: options.sink }),
  });
};

/** Takes a medium away. Doing nothing when there is none. */
export const removeMedium = (id: string): void => {
  ask("medium-remove", { id });
};

/**
 * What a scripted field at a point does to whoever is inside it, or `undefined` where none sits.
 *
 * **A query about a place rather than about the player.** "Am I standing on my belt" is a question
 * about a box and a position, and asking it that way means the answer does not change when there
 * is more than one player. There is one today (`MAX_PLAYERS`), so the two would agree; they would
 * not after.
 */
export const getMediumAt = (
  x: number,
  y: number,
  z: number,
): Medium | undefined => {
  const found = askAbout("getMediumAt", [x, y, z]);
  return isMedium(found) ? found : undefined;
};

/** What a field does to a player inside it. The same five numbers the physics reads. */
export interface Medium {
  /** Sideways pull, in world units per second. */
  readonly pushVx: number;
  readonly pushVz: number;
  /** Upward pull, positive is up. `null` when the field does not touch falling. */
  readonly pushVy: number | null;
  /** What walking speed becomes. */
  readonly speedScale: number;
  /** The fastest this field lets a player fall. Zero does not hold them down. */
  readonly sink: number;
}

/**
 * Whether an answer off the bridge is a field.
 *
 * **Every field checked, because a field with four of its five numbers is not a field** — the
 * physics would add `undefined` to a velocity and produce a NaN that travels. A query that cannot
 * fail should still refuse to hand back something that would.
 */
const isMedium = (value: unknown): value is Medium => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const isNumber = (key: string): boolean =>
    typeof candidate[key] === "number" &&
    Number.isFinite(candidate[key] as number);
  return (
    isNumber("pushVx") &&
    isNumber("pushVz") &&
    isNumber("speedScale") &&
    isNumber("sink") &&
    (candidate["pushVy"] === null || isNumber("pushVy"))
  );
};

/* -------------------------------------------------------------------- clock */

/** Jumps the clock to a mark in its cycle. The cycle is 1,200 seconds. */
export const setTime = (seconds: number): void => {
  ask("clock-set", { seconds });
};

/** Scales how fast the cycle runs. Zero stops time. */
export const setTimeSpeed = (multiplier: number): void => {
  ask("clock-speed", { multiplier });
};

/* ------------------------------------------------------------------- player */

/** Places the player at a world position, optionally facing a heading. For a spawn point, a teleport or a trapdoor. */
export const movePlayer = (
  x: number,
  y: number,
  z: number,
  yaw?: number,
): void => {
  ask("player-place", { at: [x, y, z], ...(yaw === undefined ? {} : { yaw }) });
};

/** Scales how fast the player moves, as a multiplier on their ordinary speed. */
export const setPlayerSpeed = (multiplier: number): void => {
  ask("player-speed", { multiplier });
};

/** Scales how high the player jumps, as a multiplier on their ordinary jump. */
export const setPlayerJump = (multiplier: number): void => {
  ask("player-jump", { multiplier });
};

/** Lets the player fly, or stops them doing so. The one movement verb a place owns outright. */
export const setFlying = (on: boolean): void => {
  ask("player-fly", { on });
};

/* ------------------------------------------------------------------- camera */

/** Points the camera at a world position until `clearCamera` is called, optionally with a field of view. */
export const lookAt = (x: number, y: number, z: number, fov?: number): void => {
  ask("camera-look", { at: [x, y, z], ...(fov === undefined ? {} : { fov }) });
};

/** Gives the camera back to the player. */
export const clearCamera = (): void => {
  ask("camera-clear", {});
};

/* ------------------------------------------------------------------ output */

/** Prints a line to the console's scrollback, which is where a place's own account of itself is read. */
export const log = (text: string): void => {
  ask("log", { text });
};

/** Shows a line briefly over the world, for something the player should see rather than the console. */
export const toast = (text: string): void => {
  ask("toast", { text });
};

/**
 * Schedules a `timer` event.
 *
 * **The delay and the id are separate parameters, id first**, so a script can build a name
 * from something it already has. Timers fire in sorted id order, so the order a script's timers
 * arrive in is the order they were *named* in rather than the order they were set — which is
 * what makes two peers agree about which of two that came due together came first.
 *
 * **Setting an id that is already pending does nothing.** Not "resets it", not "queues a
 * second": nothing. That is what makes the obvious pattern work —
 *
 * ```ts
 * let fired = false;
 * onTick((info) => {
 *   if (info.events.some((e) => e.kind === "timer")) { fired = true; openTheDoor(); }
 *   if (!fired) after("door", 3000);   // arms once, and fires once
 * });
 * ```
 *
 * — and it is the opposite of what a "reset the deadline" reading would suggest. A place that
 * wants a repeating timer re-arms it when the event arrives, by which point the id is free.
 */
export const after = (id: string, delayMs: number): void => {
  ask("timer", { id, afterMs: delayMs });
};

/* --------------------------------------------------------------------- data */

/**
 * Writes a value the place can read on a later visit.
 *
 * Global rather than per-player: v1 has no accounts and one local player, and `scope` is an
 * enum precisely so that adding accounts is a data change rather than a format change.
 */
export const saveData = (key: string, value: string): void => {
  ask("data-set", { scope: "global", key, value });
};

/** Reads a stored value, or undefined when there is none. */
export const loadData = (key: string): string | undefined => {
  const value = askAbout("getData", [key]);
  return typeof value === "string" ? value : undefined;
};

/** Forgets a stored value, so a later `loadData` finds nothing. */
export const deleteData = (key: string): void => {
  ask("data-delete", { scope: "global", key });
};

/* ------------------------------------------------------------------- world */

/** Whether a point is inside material. Water is not material. */
export const getSolidAt = (x: number, y: number, z: number): boolean =>
  askAbout("getSolidAt", [x, y, z]) === true;

/** The terrain's surface height at a column. */
export const getHeightAt = (x: number, z: number): number => {
  const height = askAbout("getHeightAt", [x, z]);
  return typeof height === "number" ? height : 0;
};

/** Whether a point is underwater. */
export const getWaterAt = (x: number, y: number, z: number): boolean =>
  askAbout("getWaterAt", [x, y, z]) === true;

/** What a ray found, or undefined for nothing. */
export interface RayHit {
  readonly kind: "shape" | "terrain" | "water";
  readonly point: Vec3Like;
  /** Which way the surface faced, as a unit vector. */
  readonly normal: Vec3Like;
  readonly distance: number;
}

/**
 * Casts a ray against the world and reports what it hit.
 *
 * **Traces the same field the picker does** (ADR 0009), which is why this is a query and not
 * a grid walk: there is no voxel DDA here, and no step cap, because a surface is found by
 * the sign of a distance function.
 */
export const raycast = (
  origin: Vec3Like,
  direction: Vec3Like,
  maxDistance: number,
): RayHit | undefined => {
  const hit = askAbout("raycast", [origin, direction, maxDistance]);
  return isRayHit(hit) ? hit : undefined;
};

const isRayHit = (value: unknown): value is RayHit => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate["kind"] === "string" &&
    typeof candidate["distance"] === "number" &&
    Array.isArray(candidate["point"]) &&
    Array.isArray(candidate["normal"])
  );
};

/* ------------------------------------------------------------------- events */

/**
 * A fact the host delivered, as the guest sees it.
 *
 * **A union over `kind`, not one type with an index signature.** The first version had
 * `[field: string]: unknown`, which meant `event.zoneId` compiled and was `unknown` — so a
 * place author had to cast every field of every event, and the type checker could not tell
 * them that `event.timerId` does not exist on a `zone-entered`. The host's own payload types
 * are the ones to reuse, since they are what the wire format is validated against.
 */
export type PlaceEvent = PlaceEventUnion;

type PlaceEventBase<K extends string> = {
  readonly kind: K;
  /** Who caused it. `"local"` for a peer acting on itself. */
  readonly producer: string;
};

type PlaceEventUnion =
  | (PlaceEventBase<"player-joined"> & { readonly player: string })
  | (PlaceEventBase<"player-left"> & { readonly player: string })
  | (PlaceEventBase<"player-died"> & {
      readonly player: string;
      readonly cause: string;
    })
  | (PlaceEventBase<"zone-entered"> & { readonly zoneId: string })
  | (PlaceEventBase<"zone-left"> & { readonly zoneId: string })
  /**
   * The player pressed use on something standing in the world.
   *
   * **`entityId` and not `propId` or `npcId`, because there is one id space.** `createProp` and
   * `createNpc` put both under the same namespace and the crosshair reports what it hit the
   * same way whichever it was, so a script branches on what it finds rather than on which of
   * two lists it is looking through.
   */
  | (PlaceEventBase<"entity-used"> & {
      readonly entityId: string;
      /**
       * What the player was holding, and absent when they were holding nothing.
       *
       * **On the event rather than asked for**, so a place's conditional vocabulary — a soda
       * goes in the machine, a sandwich does not — is written here and nowhere else. Empty hands
       * is an absent `item`, which is what every other name in this API does.
       */
      readonly item?: string;
    })
  /**
   * The player used the thing in their hands on nothing in particular.
   *
   * **Authored only when there is something in hand**, which is what makes it different from
   * `entity-used`'s optional `item`: by the time the crosshair is on nothing, empty hands mean
   * there was nothing to do and no event was written at all.
   */
  | (PlaceEventBase<"item-used"> & { readonly item: string })
  /** The player spoke to a character. */
  | (PlaceEventBase<"npc-talk"> & { readonly entityId: string })
  /** …and chose one of the options it offered, counting from zero. */
  | (PlaceEventBase<"npc-choose"> & {
      readonly entityId: string;
      readonly option: number;
    })
  | (PlaceEventBase<"timer"> & { readonly timerId: string })
  | (PlaceEventBase<"data-changed"> & {
      readonly scope: string;
      readonly player: string;
      readonly key: string;
      readonly deleted: boolean;
      readonly value?: string;
    });

/** The kinds, so a place author can write a `switch` that the compiler will check. */
export const EVENT_KINDS = [
  "player-joined",
  "player-left",
  "player-died",
  "zone-entered",
  "zone-left",
  "entity-used",
  "item-used",
  "npc-talk",
  "npc-choose",
  "timer",
  "data-changed",
] as const;

/** What a tick is given: the shared clock, and whatever arrived. */
export interface TickInfo {
  readonly now: number;
  readonly events: readonly PlaceEvent[];
}

/**
 * Registers a function to run on every step.
 *
 * Called during load, before the first step, so a place builds itself from its handlers
 * rather than from something that has to ask to be run.
 *
 * **The handler receives an object, not positional arguments**, because the event list grows
 * and a script written against two positional arguments would break silently when a third
 * appeared. It is also the only place in the library where a structured value exists, and it
 * is built *inside* the interpreter from two strings — so the object a script sees never
 * crossed the boundary.
 */
export const onTick = (handler: (info: TickInfo) => void): void => {
  engine.onTick((clockJson: string, eventsJson: string) => {
    handler(parseTick(clockJson, eventsJson));
  });
};

/** Whether a kind is one this library knows, for the drop-above. */
const isKnownKind = (kind: string): kind is PlaceEvent["kind"] =>
  (EVENT_KINDS as readonly string[]).includes(kind);

/**
 * Turns the host's two strings into a tick.
 *
 * **Never throws.** A malformed clock or event list becomes an empty tick, because the
 * alternative is a script that cannot start — and the failure would be reported as a parse
 * error in a file the place author cannot see.
 */
const parseTick = (clockJson: string, eventsJson: string): TickInfo => {
  let now = engine.now();
  // Narrowed to `unknown[]` rather than left `unknown`: it is whatever a peer sent, and the
  // loop below is the place that decides each element is worth believing.
  let raw: readonly unknown[] = [];
  try {
    const clock = JSON.parse(clockJson) as unknown;
    if (typeof clock === "number") now = clock;
    const parsed = JSON.parse(eventsJson) as unknown;
    if (Array.isArray(parsed)) raw = parsed;
  } catch {
    // An empty tick. See above.
  }
  const events: PlaceEvent[] = [];
  for (const candidate of raw) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const { kind, producer, payload } = candidate as Record<string, unknown>;
    // **The kind is checked before anything is built, not after.** A fact from a host that
    // knows a kind this library does not would otherwise be cast into a union member whose
    // fields are not there, and the first thing the script reads would be `undefined` in a
    // field the compiler said was a string. An unknown kind is dropped instead, which is also
    // what a version skew wants.
    if (typeof kind !== "string" || !isKnownKind(kind)) continue;
    events.push({
      // The cast is honest because of what the two lines above established: the kind is one of
      // ours, and the payload came from a host that validated it against `EVENT_FIELDS` for
      // exactly that kind. TypeScript cannot see either of those from here — the union's
      // members are not distinguished by anything the compiler can trace through a spread — so
      // this is the one place in the library that asserts rather than proves, and the comment
      // says which.
      kind,
      producer: typeof producer === "string" ? producer : "local",
      // **Unwrapped, and this is the shape a script is written against.** The wire form
      // nests a fact's own fields under `payload` — that is what `events.ts` validates, and
      // nesting is what keeps an event's fields from colliding with its own `kind` and `at`.
      // So `event.zoneId` here, rather than `event.payload.zoneId`, and the flattening is
      // the one place in this library where a structured value is assembled rather than
      // parsed: it happens *inside* the interpreter, from strings the host produced, so
      // nothing crosses the boundary that did not already.
      ...(typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {}),
    } as PlaceEventUnion);
  }
  return { now, events };
};

/* --------------------------------------------------------------- small maths */

/** Holds `value` between `low` and `high`. */
export const clamp = (value: number, low: number, high: number): number =>
  value < low ? low : value > high ? high : value;

/** The value `t` of the way from `a` to `b`, for interpolating a number. */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** A number from the seeded generator, so two peers drawing the same place agree. */
export const random = (): number => engine.random();

/** A whole number in `[low, high]`, from the seeded generator. */
export const randint = (low: number, high: number): number =>
  low + Math.floor(engine.random() * (high - low + 1));

/** A number in `[low, high)`, from the seeded generator. */
export const randFloat = (low: number, high: number): number =>
  low + engine.random() * (high - low);

/** One of the entries, or undefined for an empty array. From the seeded generator. */
export const choice = <T>(items: readonly T[]): T | undefined =>
  items.length === 0 ? undefined : items[randint(0, items.length - 1)];

/**
 * A three-component vector, for a place that is mostly arithmetic on positions.
 *
 * **Guest-side only and never crosses the boundary**: every function that takes a position
 * takes a `Vec3Like`, which a `Vector3` converts into with `toArray`. A vector object sent
 * to the host would be object identity crossing (ADR 0015), and would have to be
 * re-validated there — the same numbers, checked twice.
 */
export class Vector3 {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  static fromArray(values: Vec3Like): Vector3 {
    return new Vector3(values[0], values[1], values[2]);
  }

  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(factor: number): Vector3 {
    return new Vector3(this.x * factor, this.y * factor, this.z * factor);
  }

  dot(other: Vector3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  get length(): number {
    return Math.sqrt(this.dot(this));
  }

  unit(): Vector3 {
    const length = this.length;
    return length === 0 ? Vector3.zero() : this.scale(1 / length);
  }

  lerp(other: Vector3, t: number): Vector3 {
    return new Vector3(
      lerp(this.x, other.x, t),
      lerp(this.y, other.y, t),
      lerp(this.z, other.z, t),
    );
  }

  /** The plain triple every crossing to the host takes. */
  toArray(): Vec3Like {
    return [this.x, this.y, this.z];
  }

  equals(other: Vector3): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }
}

/* ------------------------------------------------------------------------ level */

/**
 * The levels this place carries, injected into this module by `bundle.ts`.
 *
 * **A bare module-scope binding rather than a property of `globalThis`.** The interpreter
 * deliberately does not put anything on the context global (`interpreter.ts`), and it should
 * not: this file is compiled to a CommonJS module body, so a `const __levels` appended after
 * it is a local that `level()` closes over. A declaration, so `ts.transpileModule` erases it and
 * nothing about it reaches the sandbox.
 */
declare const __levels: Record<string, string> | undefined;

/**
 * The level document this place carries under `name`, as the JSON text it was written as.
 *
 * **A string, and not a parsed object.** The bridge carries strings (ADR 0015), so anything
 * structured has to cross as text and be parsed on the far side; returning a parsed object here
 * would mean the boundary rules for exactly one call. A script that wants the level's items
 * parses this once, and one place is not going to parse the same level in a loop.
 *
 * **Compiled in rather than asked for.** The levels are baked into this module by
 * `bundle.ts` when the place is bundled, so this is a lookup in a table that is already there —
 * not a query, and not a new member on the bridge. A place carrying no level under this name
 * throws, naming the level, the way `createProp` throws on a model the place does not hold.
 */
export const level = (name: string): string => {
  // `?.` on an undeclared-at-runtime binding would throw a ReferenceError rather than answer
  // "none", and a place carrying no levels is the ordinary case rather than an error.
  const found = typeof __levels === "undefined" ? undefined : __levels[name];
  if (found === undefined) {
    throw new PlaceError(`this place carries no level called "${name}"`);
  }
  return found;
};
