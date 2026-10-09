/**
 * "Get a Snack at 4 AM", ported from `apps/voxelscape/src/places/demo-scripts/gasa4.ts`.
 *
 * ## The shape of the port
 *
 * The sibling is 1340 lines and this is about the same, because the demo *is* its state machine:
 * a house, a shop, a stove, a breakfast machine and thirteen ways for a night to go wrong. What
 * changed is the vocabulary, and there are four differences worth knowing before reading:
 *
 * - **The structure is explicit boxes rather than a voxel plan.** The sibling hands a `region` a
 *   list of `{kind: "box", id}` in block coordinates and the world stamps it; here every wall is
 *   a `createShape` in world units. `buildNeighbourhood()` is that translation, and the numbers
 *   in it are the sibling's voxel rows times ten — one voxel was two gasa4 units and this port is
 *   five times the sibling's scale, so a voxel is ten.
 * - **A placement is a model's centre, not its base.** Phase 8 puts a model's origin at the
 *   middle of its own box, so standing a fridge on the floor means adding half its height. That
 *   is `HALF` in `snack-tables.ts`, and it is the one number the port cannot derive.
 * - **There are no display names for items.** An item is a name and a count; `ITEM_NAMES` is a
 *   map this script keeps so the toasts can say "Bloxy Cola" rather than "cola".
 * - **One id space.** The sibling's `prop-remove` is `removeEntity`, and its `npcId` event field
 *   is `entityId` — a prop and a character are the same kind of thing here.
 *
 * ## What is deliberately *not* ported
 *
 * - **The voxel plan's block-light trick.** The store's ceiling panels are four point lights
 *   rather than glowing voxels that fill their block, so the "everything inside one chunk cell"
 *   test in the sibling has no counterpart and is not missed.
 * - **Fire as particles.** The sibling spawns fire figures; here a fire is a light that flickers,
 *   driven from `onTick`. The plan's risk list records that `MAX_DRAWN_LIGHTS` is eight and the
 *   four panels plus six fires are ten, so a fire across the house may not light — nearest-first
 *   selection picks the ones worth seeing.
 *
 * ## Scale
 *
 * `LAYOUT_SCALE` is five, everywhere, and it is the sibling's own measurement: gasa4's 28×26-unit
 * room becomes 140×130, its four-unit doorway becomes twenty, and both are checked against
 * `DEFAULT_PLAYER_CONFIG`'s `halfSize: 5` and `collisionRadius: 3`.
 */

import {
  after,
  closeDialog,
  createLight,
  createNpc,
  createProp,
  createShape,
  createZone,
  defineItem,
  endGame,
  getHeightAt,
  giveItem,
  holdItem,
  moveEntity,
  narrate as speak,
  openDialog,
  onTick,
  removeEntity,
  setTime,
  setTimeSpeed,
  takeItem,
  toast,
} from "voxelscape";

import { machineResult } from "./snack-combos";
import {
  BATHROOM,
  BEDROOM,
  BREAK_MS,
  CASHIER,
  DAD,
  DAD_SPOTS,
  FIRE_SPOTS,
  FURNITURE,
  HALF,
  ITEM_MODELS,
  ITEM_NAMES,
  KITCHEN,
  LAYOUT_SCALE,
  LIVING,
  PARKING,
  PICKUPS,
  ROOMS,
  SIBLING_FLOOR,
  SODAS_TO_FLOOD,
  STORE,
  STORE_PICKUPS,
  STORE_PRICES,
} from "./snack-tables";

/* ------------------------------------------------------------------ geometry */

/**
 * The port's floor, one voxel above whatever the world's ground is.
 *
 * **Asked rather than assumed**, because the built-in places run on the world's own ground and a
 * number written here would be right for exactly one terrain. In the running game the base field
 * is a planet and this asks the host, which falls back to zero; on a height field it is the
 * surface. Either way the house is not in the floor.
 */
const GROUND_Y = getHeightAt(0, 0);
/**
 * The walkable floor, which is the terrain's own surface.
 *
 * **Not one voxel above it.** The sibling's plan puts its floor at the *top of the row-32 slab*
 * — `FLOOR = 66` is the grass row's top edge, and the walls start there — so the house floor and
 * the outdoor ground are the same height. Raising this by a voxel put the floor ten units above
 * the ground the app spawns the player on, which is four units above the player's own feet: the
 * demo started with the player standing in the floor slab.
 */
const FLOOR = GROUND_Y;
/** Row zero of the sibling's plan, so that row `n` is at `FLOOR + (n - 33) * 10`. */
const BASE = FLOOR - 330;

/** A voxel row of the sibling's plan, in this port's world units. */
const row = (voxels: number): number => BASE + voxels * 10;

/** One world coordinate from a sibling voxel coordinate. */
const at = (voxels: number): number => voxels * LAYOUT_SCALE * 2;

/** The sibling's `GROUND`, in voxels, and its `walls()` height. */
const GROUND = 32;

/** A block's colour, and the procedural material it wears. */
interface Block {
  readonly colour: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  readonly material?: string;
}

const BRICK: Block = { colour: { r: 150, g: 78, b: 60 }, material: "brick" };
const GREYSTONE: Block = {
  colour: { r: 132, g: 132, b: 128 },
  material: "concrete",
};
const WOOD: Block = { colour: { r: 124, g: 86, b: 54 }, material: "timber" };
const ICE: Block = { colour: { r: 206, g: 228, b: 240 }, material: "tile" };
const GLOWSTONE: Block = { colour: { r: 252, g: 232, b: 150 } };
const GRASS: Block = { colour: { r: 96, g: 150, b: 72 }, material: "plaster" };
const DIRT: Block = { colour: { r: 112, g: 82, b: 56 }, material: "plaster" };

/**
 * One box, in the sibling's **voxel** coordinates, where `max` is inclusive.
 *
 * **Inclusive because the sibling's plan is**, and that is exactly the kind of off-by-one that
 * makes a house a voxel short: a wall from `-14` to `14` is twenty-nine voxels, not twenty-eight.
 */
const voxelBox = (
  id: string,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
  block: Block,
  combine: "Add" | "Subtract" = "Add",
): void => {
  const lowX = at(min[0]);
  const lowY = row(min[1]);
  const lowZ = at(min[2]);
  const highX = at(max[0] + 1);
  const highY = row(max[1] + 1);
  const highZ = at(max[2] + 1);
  createShape({
    place: "house",
    id,
    at: [(lowX + highX) / 2, (lowY + highY) / 2, (lowZ + highZ) / 2],
    shape: {
      type: "Box",
      len: {
        x: (highX - lowX) / 2,
        y: (highY - lowY) / 2,
        z: (highZ - lowZ) / 2,
      },
    },
    combine,
    colour: block.colour,
    ...(block.material === undefined ? {} : { material: block.material }),
  });
};

/** A box in **gasa4 world units**, which is what the road and the props are placed in. */
const worldBox = (
  id: string,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
  block: Block,
): void => {
  const low = [
    min[0] * LAYOUT_SCALE,
    FLOOR + (min[1] - SIBLING_FLOOR) * LAYOUT_SCALE,
    min[2] * LAYOUT_SCALE,
  ] as const;
  const high = [
    max[0] * LAYOUT_SCALE,
    FLOOR + (max[1] - SIBLING_FLOOR) * LAYOUT_SCALE,
    max[2] * LAYOUT_SCALE,
  ] as const;
  createShape({
    place: "house",
    id,
    at: [
      (low[0] + high[0]) / 2,
      (low[1] + high[1]) / 2,
      (low[2] + high[2]) / 2,
    ],
    shape: {
      type: "Box",
      len: {
        x: (high[0] - low[0]) / 2,
        y: (high[1] - low[1]) / 2,
        z: (high[2] - low[2]) / 2,
      },
    },
    combine: "Add",
    colour: block.colour,
    ...(block.material === undefined ? {} : { material: block.material }),
  });
};

/**
 * The house and the store: their outer shells, with a doorway in each.
 *
 * **Every coordinate is the sibling's**, voxel for voxel, so this can be read against
 * `walls()` over there. The front door is a gap in the house's east wall and the store's door is
 * a gap in its west wall, both facing the drive that joins them.
 */
const buildShells = (): void => {
  const wall = (
    id: string,
    block: Block,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
  ): void =>
    voxelBox(id, [minX, GROUND + 1, minZ], [maxX, GROUND + 3, maxZ], block);

  // The house shell, in red brick, with the front door on the east wall.
  wall("house-nw", BRICK, -14, -13, -14, 13);
  wall("house-n", BRICK, -14, -13, 14, -13);
  wall("house-s", BRICK, -14, 13, 14, 13);
  wall("house-e1", BRICK, 14, -13, 14, 2);
  wall("house-e2", BRICK, 14, 6, 14, 13);

  // The interior cross, in a lighter stone, with a two-voxel doorway on each arm.
  wall("cross-w1", GREYSTONE, 0, -13, 0, -11);
  wall("cross-w2", GREYSTONE, 0, -9, 0, 9);
  wall("cross-w3", GREYSTONE, 0, 11, 0, 13);
  wall("cross-n1", GREYSTONE, -14, 0, -11, 0);
  wall("cross-n2", GREYSTONE, -9, 0, 9, 0);
  wall("cross-n3", GREYSTONE, 11, 0, 14, 0);

  // The store shell, in grey stone, door on the west wall facing the drive.
  wall("store-w1", GREYSTONE, 24, -6, 24, 2);
  wall("store-w2", GREYSTONE, 24, 6, 24, 6);
  wall("store-e", GREYSTONE, 34, -6, 34, 6);
  wall("store-n", GREYSTONE, 24, -6, 34, -6);
  wall("store-s", GREYSTONE, 24, 6, 34, 6);
};

/**
 * The whole neighbourhood: the ground it stands on, the shells, the roofs, and the lit panels.
 *
 * **The order matters and it is the sibling's.** A plan is stamped in order and the last thing
 * over a voxel is what holds, so the panels come after the roof and the roof after the walls. The
 * one place that is load-bearing here rather than cosmetic is the raze: a `Subtract` that clears
 * whatever the terrain raised over the neighbourhood, which has to come before the floors or it
 * would take those too.
 */
const buildNeighbourhood = (): void => {
  const ROW = GROUND;
  // The ground, and the buildable column above it cut clear of whatever was there.
  voxelBox("dirt", [-96, 0, -96], [96, ROW - 1, 96], DIRT);
  voxelBox("grass", [-96, ROW, -96], [96, ROW, 96], GRASS);
  voxelBox("raze", [-96, ROW + 1, -96], [96, 176, 96], GRASS, "Subtract");

  // The floors: the house's is ice, the store's and the drive are stone.
  voxelBox("house-floor", [-14, ROW, -13], [14, ROW, 13], ICE);
  voxelBox("store-floor", [24, ROW, -6], [34, ROW, 6], GREYSTONE);
  // The road is a box in the sibling because a voxel world had a `road` primitive; here the
  // drive between the two doors is the same box with the width folded in.
  worldBox(
    "drive",
    [14, SIBLING_FLOOR, 2],
    [24, SIBLING_FLOOR + 0.4, 6],
    GREYSTONE,
  );
  voxelBox("parking", [15, ROW, 7], [23, ROW, 11], GREYSTONE);
  voxelBox("yard-earth", [15, ROW, -11], [24, ROW, -7], DIRT);

  buildShells();

  // The roofs, one voxel thick, and then the four glowstone panels set into the store's.
  voxelBox("house-roof", [-14, ROW + 4, -13], [14, ROW + 4, 13], WOOD);
  voxelBox("store-roof", [24, ROW + 4, -6], [34, ROW + 4, 6], WOOD);
  const panels = [
    [27, -3],
    [27, 3],
    [31, -3],
    [31, 3],
  ] as const;
  for (const [index, [x, z]] of panels.entries()) {
    voxelBox(`panel-${index}`, [x, ROW + 4, z], [x, ROW + 4, z], GLOWSTONE);
    // **A light where the sibling had a block that glowed.** The panel is a surface and this is
    // what actually reaches the floor, and it is the whole of what replaced voxel block-light.
    createLight({
      id: `store-panel-${index}`,
      at: [at(x), row(ROW + 3) + 10, at(z)],
      colour: { r: 255, g: 236, b: 170 },
      radius: at(16),
      intensity: 2.4,
    });
  }
};

/* -------------------------------------------------------------------- state */

let cash = 0;
let chipsEaten = false;
let dadAwake = false;
let fridgeUsed = false;
let sodas = 0;
/** What the breakfast machine is holding, one slot per item. */
const machine: Array<string | null> = [null, null];
let stoveItem: string | null = null;
let stoveOn = false;
let stoveCooked = false;
let fireLit = false;
/** The store good sitting on the counter waiting to be bought. */
let counterItem: string | null = null;
let cashierOnBreak = false;
/** The store goods the player has legitimately got hold of. */
const paid = new Set<string>();
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};
/** The item the script last told the world the player is holding. */
let held = "";

/** Fire lights, so the flicker has something to hold and the burn can take them away. */
const fires: Array<{
  id: string;
  x: number;
  z: number;
  height: number;
  phase: number;
}> = [];

/* ------------------------------------------------------------------ helpers */

const say = (text: string): void => toast(text);

const narrate = (name: string, text: string): void => speak(name, text);

const hold = (item: string): void => {
  holdItem(item === "" ? undefined : item);
  held = item;
};

const give = (item: string, text: string): void => {
  giveItem(item, 1);
  hold(item);
  if (text !== "") say(text);
};

const ending = (title: string, text: string): void => endGame({ title, text });

/** The first of the rooms the player is standing in, or `"outside"`. */
const room = (): string => {
  for (const [id] of ROOMS) {
    if (inZone[id] === true) return id;
  }
  return "outside";
};

/**
 * The good a store item is a form of, so a cooked egg is still "the egg".
 *
 * **Because the shop's rule is about the *good* and not the item.** A fried egg is an egg that
 * has been cooked, so it was still paid for; without this, cooking a bought egg and walking out
 * would read as shoplifting.
 */
const goodOf = (item: string): string => {
  if (item === "friedegg") return "egg";
  if (item === "hotbrew") return "witchbrew";
  return item;
};

/** Whether the player is carrying a store good they never paid for. */
const stealing = (item: string): boolean =>
  item !== "" &&
  STORE_PRICES[goodOf(item)] !== undefined &&
  !paid.has(goodOf(item));

/** A figure's placement from a sibling `[x, z, baseY]`, in gasa4 units, plus its model. */
const place = (
  id: string,
  model: string,
  x: number,
  z: number,
  baseY: number,
  solid: boolean,
): void => {
  createProp({
    id,
    model,
    at: [
      x * LAYOUT_SCALE,
      FLOOR + (baseY - SIBLING_FLOOR) * LAYOUT_SCALE + (HALF[model] ?? 0),
      z * LAYOUT_SCALE,
    ],
    solid,
  });
};

/* -------------------------------------------------------------------- build */

/**
 * Opens the place: the clock, the items, the rooms, everything standing in them, and the alarm.
 *
 * **Everything the sibling's `open()` does, in its order.** The zones come before the props
 * because a prop's `createProp` is cheap and a zone's first event is not, and the cashier's timer
 * comes last because it is the only thing here that is about the future.
 */
const open = (): void => {
  setTime(900);
  setTimeSpeed(0);
  for (const id of Object.keys(ITEM_NAMES)) defineItem(id);

  for (const [id, minX, minZ, maxX, maxZ] of ROOMS) {
    createZone({
      id,
      label: id,
      box: [
        [minX * LAYOUT_SCALE, FLOOR - 5, minZ * LAYOUT_SCALE],
        [maxX * LAYOUT_SCALE, FLOOR + 60, maxZ * LAYOUT_SCALE],
      ],
    });
  }

  buildNeighbourhood();

  for (const [id, model, x, z] of FURNITURE) {
    // **Every fixture stands on the floor.** Grounding by `getHeightAt` would land a prop on the
    // roof once the house is built, which is what the sibling's own restart showed.
    place(id, model, x, z, SIBLING_FLOOR, true);
  }
  for (const [id, model, x, z, baseY] of PICKUPS) {
    place(id, model, x, z, baseY, false);
  }

  createNpc({
    id: DAD,
    model: "npc-sable",
    at: [18 * LAYOUT_SCALE, FLOOR + HALF["npc-sable"], -18 * LAYOUT_SCALE],
    name: "Father Figure",
    yaw: Math.PI,
  });
  createNpc({
    id: CASHIER,
    model: "npc-rook",
    at: [60 * LAYOUT_SCALE, FLOOR + HALF["npc-rook"], 7 * LAYOUT_SCALE],
    name: "Cashier",
    yaw: Math.atan2(56 - 60, 6 - 7),
  });

  // The cashier works for a while, then an alarm sends him outside on an indefinite break. Once
  // he is gone the shelves are unattended and nothing counts as theft.
  after("cashier-break", BREAK_MS);
};

/** A hint the first time the player stands in each room. */
const hintFor = (zone: string): void => {
  if (zone === BEDROOM) {
    narrate(
      "You",
      "It is 4 AM and I am starving. Find a snack... and try not to wake Dad.",
    );
  } else if (zone === BATHROOM) {
    narrate("You", "Dad is asleep in the bathtub. Keep it down.");
  } else if (zone === KITCHEN) {
    narrate(
      "You",
      "The kitchen. Chips on the counter, an orange on the table, a stove, and the breakfast machine.",
    );
  } else if (zone === LIVING) {
    narrate("You", "The front door is open. The store is down the road.");
  } else if (zone === PARKING) {
    narrate(
      "You",
      'The cashier\'s car, with a note on the window: "this is my car."',
    );
  } else if (zone === STORE) {
    narrate(
      "Cashier",
      "Welcome to a generic convenience store. We are open 24 hours.",
    );
  }
};

/* --------------------------------------------------------------------- shop */

/** Picks a store good up; it is still unpaid until the cashier rings it up. */
const takeStoreGood = (entityId: string): void => {
  const item = STORE_PICKUPS[entityId];
  removeEntity(entityId);
  give(item, `You take the ${ITEM_NAMES[item]}. Set it on the counter to pay.`);
};

/** Puts a sold good back on the shelf: the shop never runs out of anything. */
const restock = (entityId: string): void => {
  for (const [id, model, x, z, baseY] of PICKUPS) {
    if (id === entityId) {
      place(id, model, x, z, baseY, false);
      return;
    }
  }
};

/** Sets the held store good on the counter, ready for the cashier to ring up. */
const useStoreCounter = (item: string): void => {
  if (item === "") {
    narrate("You", "The counter is empty.");
    return;
  }
  if (STORE_PRICES[item] === undefined) {
    say("The cashier only rings up store items.");
    return;
  }
  if (counterItem !== null) {
    say("There is already something on the counter.");
    return;
  }
  takeItem(item, 1);
  hold("");
  place("counter-item", ITEM_MODELS[item], 56, 6, SIBLING_FLOOR + 1.5, false);
  counterItem = item;
  say(`You set the ${ITEM_NAMES[item]} on the counter. Talk to the cashier.`);
};

/** Rings up whatever sits on the counter, if the player can afford it. */
const purchase = (): void => {
  const good = counterItem;
  if (good === null) return;
  const price = STORE_PRICES[good];
  if (cash < price) {
    closeDialog();
    say(`You do not have enough cash for the ${ITEM_NAMES[good]}.`);
    return;
  }
  cash -= price;
  paid.add(good);
  counterItem = null;
  removeEntity("counter-item");
  closeDialog();
  restock(`buy-${good}`);
  give(good, `The cashier takes your money. (-$${price}, $${cash} left)`);
};

/* ------------------------------------------------------------------ machine */

/** Feeds the breakfast machine: two items in, one breakfast out. */
const useMachine = (item: string): void => {
  const filled = machine.findIndex((what) => what !== null);
  if (item === "") {
    if (filled === -1) {
      narrate("You", "The machine is empty. It really does work.");
      return;
    }
    const taken = machine[filled] as string;
    removeEntity(`machine-item-${filled}`);
    machine[filled] = null;
    give(taken, `You take the ${ITEM_NAMES[taken]} back out.`);
    return;
  }
  const free = machine.findIndex((what) => what === null);
  if (free === -1) {
    narrate("You", "The machine is full. Take something out first.");
    return;
  }
  takeItem(item, 1);
  hold("");
  place(
    "machine-item-" + free,
    ITEM_MODELS[item],
    -13.4 + free * 0.8,
    18,
    67.5,
    false,
  );
  machine[free] = item;
  if (filled === -1) {
    say(`You put the ${ITEM_NAMES[item]} in. One more to go.`);
    return;
  }
  const first = machine[filled] as string;
  machine[filled] = null;
  removeEntity(`machine-item-${filled}`);
  const [text, title] = machineResult(first, item);
  ending(title, text);
};

/* -------------------------------------------------------------------- stove */

/** Puts a held item on the stove, turns it on, or takes a cooked one back. */
const useStove = (item: string): void => {
  if (item !== "") {
    if (stoveItem !== null) {
      say("There is already something on the stove.");
      return;
    }
    takeItem(item, 1);
    hold("");
    place("stove-item", ITEM_MODELS[item], -20, 18, 67.5, false);
    stoveItem = item;
    stoveCooked = false;
    stoveOn = true;
    narrate(
      "You",
      `You set the ${ITEM_NAMES[item]} on the stove and turn it on.`,
    );
    // An egg fries and a brew steams; anything else catches and takes the kitchen.
    const cooks = item === "egg" || item === "witchbrew";
    after(cooks ? "cook" : "fire", cooks ? 6_000 : 5_000);
    return;
  }
  if (stoveOn) {
    stoveOn = false;
    narrate("You", "You turn the stove off.");
    return;
  }
  if (stoveItem !== null) {
    const picked = stoveCooked
      ? stoveItem === "egg"
        ? "friedegg"
        : "hotbrew"
      : stoveItem;
    removeEntity("stove-item");
    stoveItem = null;
    stoveCooked = false;
    give(picked, `You take the ${ITEM_NAMES[picked]} off the stove.`);
    return;
  }
  narrate("You", "The stove is off and empty.");
};

/** What was on the stove has been on long enough: it is cooked. */
const cookEgg = (): void => {
  if (!stoveOn || stoveCooked || stoveItem === null) return;
  if (stoveItem !== "egg" && stoveItem !== "witchbrew") return;
  const cooked = stoveItem === "egg" ? "friedegg" : "hotbrew";
  stoveCooked = true;
  // **Removed before it is replaced.** The sibling re-issues `createProp` with the same id and its
  // host takes the second as the new one; this engine refuses a duplicate id, which is the safer
  // rule and means "change what is standing there" has to be said as a remove and an add.
  removeEntity("stove-item");
  place("stove-item", ITEM_MODELS[cooked], -20, 18, 67.5, false);
  narrate(
    "You",
    stoveItem === "egg"
      ? "The egg sizzles and fries."
      : "The brew starts to steam, and goes hot.",
  );
};

/** The stove has been on long enough: the kitchen catches fire. */
const ignite = (): void => {
  if (!stoveOn || stoveItem === null) return;
  if (stoveItem === "egg" || stoveItem === "witchbrew") return;
  removeEntity("stove-item");
  stoveItem = null;
  stoveCooked = false;
  fireLit = true;
  for (const [index, [x, z, height]] of FIRE_SPOTS.entries()) {
    // **A fire is a light here**, because this engine has no particles and a light is the thing
    // that makes a burning room read as burning. `fire-figures.ts` over there is a whole renderer.
    fires.push({ id: `fire-${index}`, x, z, height, phase: index });
    createLight({
      id: `fire-${index}`,
      at: [x * LAYOUT_SCALE, FLOOR + height * LAYOUT_SCALE, z * LAYOUT_SCALE],
      colour: { r: 255, g: 140, b: 40 },
      radius: 30 * LAYOUT_SCALE,
      intensity: 3,
    });
  }
  narrate("You", "The kitchen catches fire!");
  after("burn", 8_000);
};

/** What the fire reaches depends on how far the player got. */
const burn = (): void => {
  if (!fireLit) return;
  if (inZone[STORE] === true || inZone[PARKING] === true) {
    narrate(
      "Cashier",
      "Is that smoke? Did you leave the stove on? ...Of course you did.",
    );
    return;
  }
  if (
    inZone[KITCHEN] === true ||
    inZone[LIVING] === true ||
    inZone[BATHROOM] === true ||
    inZone[BEDROOM] === true
  ) {
    ending("Fire", "You were caught in the fire.");
    return;
  }
  ending("Fire", "You watched the house burn down from outside.");
};

/** The alarm sounds and the cashier leaves the counter for an endless break. */
const cashierBreak = (): void => {
  cashierOnBreak = true;
  // **Moved rather than re-created**, for the reason `cookEgg` removes before it replaces: the
  // cashier is one figure and walking him outside is a transform, not a second arrival.
  moveEntity(
    CASHIER,
    [44 * LAYOUT_SCALE, FLOOR + HALF["npc-rook"], 18 * LAYOUT_SCALE],
    Math.PI / 2,
  );
  narrate(
    "You",
    "An alarm sounds. The cashier steps outside for an indefinite break.",
  );
};

/** Wakes Dad and brings him into the room the player just ate in. */
const wakeDad = (): void => {
  dadAwake = true;
  const spot = DAD_SPOTS[room()] ?? DAD_SPOTS[KITCHEN];
  const [x, z, yaw] = spot;
  // **Moved rather than re-created.** There is one id space and `dad` already exists, so a second
  // `createNpc` with the same id would be refused — which is the sibling's `prop-remove` then
  // `npc` and is a worse way to say "he walked in".
  moveEntity(
    DAD,
    [x * LAYOUT_SCALE, FLOOR + HALF["npc-sable"], z * LAYOUT_SCALE],
    yaw,
  );
  narrate(
    "Father Figure",
    '"You woke me up. I could hear you eating those chips!"',
  );
};

/* --------------------------------------------------------------- interaction */

/** The player pressed use on something in the world. */
const used = (entityId: string, item: string): void => {
  if (entityId === "bed") {
    if (dadAwake) {
      ending(
        "Chips",
        'Dad got mad. "You woke me up. I could hear you eating those chips!"',
      );
    } else if (chipsEaten) {
      ending("Sleep", "you succesfully went to sleep :)");
    } else {
      narrate("You", "I am not tired yet. I need a snack first.");
    }
    return;
  }
  if (entityId === "fridge") {
    if (fridgeUsed) {
      say("The fridge is empty now.");
    } else {
      fridgeUsed = true;
      // The fridge cola is the player's own, so carrying it out of the shop is not shoplifting.
      paid.add("cola");
      give("cola", "You take a bloxy cola from the fridge.");
    }
    return;
  }
  if (entityId === "stove") return useStove(item);
  if (entityId === "breakfast-machine") return useMachine(item);
  if (entityId === "store-counter") return useStoreCounter(item);
  if (STORE_PICKUPS[entityId] !== undefined) return takeStoreGood(entityId);

  if (entityId === "chips") {
    removeEntity("chips");
    give("chips", "You pick up the bag of chips.");
    return;
  }
  if (entityId === "orange") {
    narrate("You", "This isn't an ordinary orange...");
    ending("Orange", "uh oh.");
    return;
  }
  if (entityId === "sword") {
    removeEntity("sword");
    give("sword", "You take the sword off the bedroom wall.");
    return;
  }
  if (entityId === "sandvich") {
    removeEntity("sandvich");
    give("sandvich", "You take the sandvich off the bench.");
    return;
  }
  if (entityId === "colgate") {
    removeEntity("colgate");
    give("colgate", "You take the colgate.");
    return;
  }
  if (entityId === "cola") {
    removeEntity("cola");
    give("cola", "You take the bloxy cola.");
    return;
  }
  if (entityId.startsWith("tix")) {
    removeEntity(entityId);
    cash += 1;
    say(`You pocket a Tix. ($${cash})`);
    return;
  }
  if (entityId.startsWith("robux")) {
    removeEntity(entityId);
    cash += 5;
    say(`You pocket some Robux. ($${cash})`);
    return;
  }
  if (entityId === "vending") {
    if (item === "cola") {
      takeItem("cola", 1);
      hold("");
      sodas += 1;
      if (sodas >= SODAS_TO_FLOOD) {
        ending(
          "Flood",
          "The machine gurgles happily for the eighth time, and the shop floods.",
        );
        return;
      }
      say(`The machine gurgles happily. (${sodas}/${SODAS_TO_FLOOD})`);
    } else {
      say('The broken machine has a sign taped to it: "feed me sodas".');
    }
    return;
  }
  if (entityId === "freezer") {
    if (item === "icecream") {
      ending(
        "Freezer",
        "You put the ice cream in. The sticker says OUT OF ORDER DUE TO BEING TOO COLD, and it is very cold in there.",
      );
      return;
    }
    say("The freezer is out of order. It is very cold in there.");
    return;
  }
  if (entityId === "car") {
    if (item === "egg") {
      narrate("You", "You deploy the egg onto the car. It is not my car.");
      return;
    }
    narrate("You", "This is my car. - cashier");
    return;
  }
  if (entityId === "manhole") {
    narrate("You", "Someone is down there. Not tonight.");
    return;
  }
  if (entityId === "trash") {
    narrate("You", "A magic trash can. Nothing in here.");
  }
};

/** Eats or drinks the held item, taking it out of the inventory and hand. */
const consume = (item: string, text: string): void => {
  takeItem(item, 1);
  hold("");
  narrate("You", text);
};

/** The player used the thing in their hands on nothing in particular. */
const usedItem = (item: string): void => {
  if (item === "chips") {
    takeItem("chips", 1);
    hold("");
    chipsEaten = true;
    const where = room();
    if (where === BEDROOM || where === "outside") {
      narrate("You", "Not bad. I should get back to sleep.");
    } else {
      wakeDad();
    }
    return;
  }
  if (item === "colgate") {
    ending("Toothpaste", "You consumed the colgate. Do not do that.");
    return;
  }
  if (item === "sword") {
    ending("Sword", "You drew the sword. In your own house. At 4 AM.");
    return;
  }
  if (item === "patty") {
    ending(
      "Patty",
      "You ate the patty. It was not on a plate. It did not matter.",
    );
    return;
  }
  if (item === "sandvich") {
    ending("Sandvich", "You ate the sandvich. Midnight snacks club.");
    return;
  }
  if (item === "cola")
    return consume("cola", "Cold, sweet, and full of regret.");
  if (item === "juice") {
    return consume("juice", "A glass of orange juice. Suspiciously fresh.");
  }
  if (item === "milk") {
    return consume("milk", "You drink the milk. It was a long walk for this.");
  }
  if (item === "witchbrew" || item === "hotbrew") {
    return consume(item, "It tastes like a wet cellar. You drink it anyway.");
  }
  if (item === "candy") {
    return consume("candy", "Halloween candy in April. You eat it all of it.");
  }
  if (item === "fuel") {
    return consume("fuel", "It tastes exactly like it sounds.");
  }
  if (item === "icecream") {
    return consume("icecream", "Ice cream, alone, at 4 AM. No notes.");
  }
  if (item === "egg" || item === "friedegg") {
    narrate(
      "You",
      "I should put that in the breakfast machine, not in my mouth.",
    );
  }
};

/** The player spoke to a character. */
const talked = (entityId: string): void => {
  if (entityId === DAD) {
    if (dadAwake) {
      narrate("Father Figure", '"Go to bed. Now."');
    } else {
      ending("Wake up Dad", '"no."');
    }
    return;
  }
  if (cashierOnBreak) {
    openDialog({
      entityId: CASHIER,
      prompt:
        "I'm on break. Indefinite. If you wanted to buy something, you should have come earlier.",
      options: ["Understood."],
    });
    return;
  }
  if (counterItem !== null) {
    const price = STORE_PRICES[counterItem];
    openDialog({
      entityId: CASHIER,
      prompt: `Do you want to buy this ${ITEM_NAMES[counterItem]} for $${price}?`,
      options: [`Buy it. ($${price})`, "Not right now."],
    });
    return;
  }
  openDialog({
    entityId: CASHIER,
    prompt:
      "welcome to 'a generic convenience store'. we are open 24 hours. i go on break in a bit.",
    options: ["How long until your break?", "Just looking."],
  });
};

/** The player chose one of a character's options. */
const chose = (entityId: string, option: number): void => {
  if (entityId !== CASHIER) return;
  if (counterItem !== null) {
    if (option === 0) {
      purchase();
    } else {
      closeDialog();
    }
    return;
  }
  if (option === 0) {
    say("He checks his watch. A few minutes, give or take a few minutes.");
    return;
  }
  closeDialog();
};

/** Answers a timer the shared clock reached, by the id the script gave it. */
const timer = (id: string): void => {
  if (id === "cook") cookEgg();
  else if (id === "fire") ignite();
  else if (id === "burn") burn();
  else if (id === "cashier-break") cashierBreak();
};

/* --------------------------------------------------------------------- tick */

/**
 * The flicker, which is what makes a light read as fire rather than as a lamp.
 *
 * **A sine per light with the phase spread by its index**, so the six spots do not pulse in
 * unison — a room of synchronous flickering reads as a broken renderer. Driven from the tick
 * rather than from a timer because it is sixty small writes a second and a timer per light would
 * be sixty events a second through the interpreter.
 */
const flicker = (now: number): void => {
  for (const fire of fires) {
    const wobble = Math.sin(now / 90 + fire.phase * 1.7) * 0.5 + 0.5;
    createLight({
      id: fire.id,
      at: [
        fire.x * LAYOUT_SCALE,
        FLOOR + fire.height * LAYOUT_SCALE,
        fire.z * LAYOUT_SCALE,
      ],
      colour: { r: 255, g: Math.round(120 + wobble * 70), b: 40 },
      radius: 30 * LAYOUT_SCALE,
      intensity: 2.4 + wobble * 1.6,
    });
  }
};

// **Built at load rather than on the first tick.** A person who loads a place and finds an empty
// field for a frame has been shown a place that is still arriving; `bridge` builds at load and
// this is the same promise. The clock, the items, the rooms and everything standing in them are
// all here, and only the cashier's alarm is about the future.
open();

onTick((info) => {
  if (fires.length > 0) flicker(info.now);

  for (const event of info.events) {
    if (event.kind === "zone-entered") {
      inZone[event.zoneId] = true;
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left") {
      delete inZone[event.zoneId];
      // Theft is leaving the store with a good that was never rung up.
      if (
        event.zoneId === STORE &&
        !cashierOnBreak &&
        !fireLit &&
        stealing(held)
      ) {
        ending(
          "Shoplifting",
          'The cashier appears in front of you. "You forgot to pay."',
        );
      }
    } else if (event.kind === "entity-used") {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used") {
      usedItem(event.item);
    } else if (event.kind === "npc-talk") {
      talked(event.entityId);
    } else if (event.kind === "npc-choose") {
      chose(event.entityId, event.option);
    } else if (event.kind === "timer") {
      timer(event.timerId);
    }
  }
});
