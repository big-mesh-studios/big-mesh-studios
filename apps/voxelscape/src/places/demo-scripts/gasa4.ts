// A data table driving many props of different models (`FURNITURE`,
// `PICKUPS`, `ITEM_MODELS`) types its model column as the whole
// `keyof ModelsByName` union rather than one specific literal, since which
// model a given row names is itself the data.
import {
  blocks,
  createNpc,
  createProp,
  dispatch,
  onPlan,
  onTick,
  type ModelsByName,
} from "voxelscape";

/** One fact the world hands the script, as the script reads it back. */
interface Event {
  kind: string;
  producer: string;
  item?: string;
  entityId?: string;
  npcId?: string;
  option?: number;
  zoneId?: string;
  timerId?: string;
}

// The structure plan is drawn in LOD-0 voxel coordinates, so `GROUND` is a
// voxel row: 30 voxels down the world puts the walkable surface at world y 60
// and the player's feet at 62. Every prop and item below is placed in world
// units, which is why `FLOOR` is 62.
const GROUND = 30;
const FLOOR = 62;

const BEDROOM = "bedroom";
const BATHROOM = "bathroom";
const LIVING = "living";
const KITCHEN = "kitchen";
const STORE = "store";

const DAD = "dad";
const CASHIER = "cashier";

let started = false;
let cash = 0;
let chipsEaten = false;
/** Whether Dad was woken by the chips and is now looking for the player. */
let dadAwake = false;
let fridgeUsed = false;
let sodas = 0;
let plateA: string | null = null;
let plateB: string | null = null;
/** The item the script last told the world the player is holding. */
let held = "";
/** What rests on the stove, whether it is on, and whether the egg is cooked. */
let stoveItem: string | null = null;
let stoveOn = false;
let stoveCooked = false;
let fireLit = false;
/** The store good sitting on the counter waiting to be bought. */
let counterItem: string | null = null;
let cashierOnBreak = false;
/** The store goods the player has paid for, so they are no longer stolen. */
const paid = new Set<string>();
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};

/**
 * The rooms as `[id, minX, minZ, maxX, maxZ]` in world units, in the order the
 * script declares their zones. The first the player stands in is their room.
 */
const ROOMS: Array<[string, number, number, number, number]> = [
  [BEDROOM, -28, -24, 0, 0],
  [BATHROOM, -28, 0, 0, 24],
  [LIVING, 0, -24, 28, 0],
  [KITCHEN, 0, 0, 28, 24],
  [STORE, 52, -16, 72, 16],
];

/** The house and store: floor, walls, doorways, and a wood roof. */
function walls(): unknown[] {
  const b = blocks;
  const w = (
    id: number,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
  ): unknown => ({
    kind: "box",
    min: [minX, GROUND + 1, minZ],
    max: [maxX, GROUND + 3, maxZ],
    id,
  });
  return [
    // house shell in red brick, front door on the east wall
    w(b.brick, -14, -12, -14, 12),
    w(b.brick, -14, 12, 14, 12),
    w(b.brick, -14, -12, 14, -12),
    w(b.brick, 14, -12, 14, -8),
    w(b.brick, 14, -5, 14, 12),
    // interior cross in a lighter stone, a doorway on each arm
    w(b.greystone, 0, -12, 0, -7),
    w(b.greystone, 0, -5, 0, 5),
    w(b.greystone, 0, 7, 0, 12),
    w(b.greystone, -14, 0, -7, 0),
    w(b.greystone, -5, 0, 5, 0),
    w(b.greystone, 7, 0, 14, 0),
    // store shell in grey stone, door on the west wall
    w(b.greystone, 26, -8, 26, -7),
    w(b.greystone, 26, -5, 26, 8),
    w(b.greystone, 36, -8, 36, 8),
    w(b.greystone, 26, -8, 36, -8),
    w(b.greystone, 26, 8, 36, 8),
  ];
}

onPlan((): string => {
  const b = blocks;
  const shapes: unknown[] = [
    { kind: "box", min: [-80, 0, -80], max: [80, GROUND - 1, 80], id: b.dirt },
    {
      kind: "box",
      min: [-80, GROUND, -80],
      max: [80, GROUND, 80],
      id: b.grass,
    },
    // raze whatever the terrain raised over the neighbourhood
    { kind: "box", min: [-80, GROUND + 1, -80], max: [80, 160, 80], id: 0 },
    // floors and the path from the house to the store
    {
      kind: "box",
      min: [-14, GROUND, -12],
      max: [14, GROUND, 12],
      id: b.ice,
    },
    {
      kind: "box",
      min: [26, GROUND, -8],
      max: [36, GROUND, 8],
      id: b.greystone,
    },
    {
      kind: "road",
      from: [14, GROUND, -6],
      to: [26, GROUND, -6],
      width: 5,
      id: b.greystone,
    },
    ...walls(),
    // roofs
    {
      kind: "box",
      min: [-14, GROUND + 4, -12],
      max: [14, GROUND + 4, 12],
      id: b.wood,
    },
    {
      kind: "box",
      min: [26, GROUND + 4, -8],
      max: [36, GROUND + 4, 8],
      id: b.wood,
    },
  ];
  return JSON.stringify(shapes);
});

function say(text: string): void {
  dispatch("toast", { player: "", text });
}

function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}

function hold(item: string): void {
  dispatch("item-hold", { player: "", item });
  held = item;
}

function give(item: string, text: string): void {
  dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}

function ending(title: string, text: string): void {
  dispatch("ending", { player: "", title, text });
}

function room(): string {
  for (const [id] of ROOMS) {
    if (inZone[id]) {
      return id;
    }
  }
  return "outside";
}

const ITEM_NAMES: Record<string, string> = {
  chips: "Chips",
  orange: "Orange",
  colgate: "Colgate",
  cola: "Bloxy Cola",
  egg: "Egg",
  friedegg: "Fried Egg",
  juice: "Orange Juice",
  milk: "Milk",
};

/** The rm-stacker model each item wears when it rests somewhere. */
const ITEM_MODELS: Record<string, keyof ModelsByName> = {
  chips: "chips",
  orange: "orange",
  colgate: "colgate",
  cola: "cola",
  egg: "egg",
  friedegg: "friedegg",
  juice: "juice",
  milk: "milk",
};

/** What the store sells, and for how much cash. */
const STORE_PRICES: Record<string, number> = {
  cola: 5,
  egg: 25,
  juice: 30,
  milk: 30,
};
const STORE_GOODS = new Set(Object.keys(STORE_PRICES));

/** The store pickup props, and which good each one puts in the player's hands. */
const STORE_PICKUPS: Record<string, string> = {
  "buy-cola": "cola",
  "buy-egg": "egg",
  "buy-juice": "juice",
  "buy-milk": "milk",
};

/** Where Dad comes to when the chips wake him, per room, as `[x, z, yaw]`. */
const DAD_SPOTS: Record<string, [number, number, number]> = {
  [KITCHEN]: [8, 14, Math.PI],
  [BATHROOM]: [-22, 10, Math.PI],
  [LIVING]: [8, -6, Math.PI],
};

/** Where fire climbs the kitchen once something on the stove catches. */
const FIRE_SPOTS: Array<[number, number, number]> = [
  [10, 18, 3.5],
  [14, 18, 3],
  [12, 22, 4],
  [8, 20, 2.5],
  [16, 20, 3],
  [12, 16, 2.5],
];

/** The good a store item is a form of, so a cooked egg is still "the egg". */
function goodOf(item: string): string {
  return item === "friedegg" ? "egg" : item;
}

/** Whether the player is carrying a store good they never paid for. */
function stealing(item: string): boolean {
  return item !== "" && STORE_GOODS.has(item) && !paid.has(goodOf(item));
}

/** What a full pair of plates means, as `[ending title, ending text]`. */
function plateResult(a: string, b: string): [string, string] {
  const pair = [a, b].sort().join("+");
  if (pair === "friedegg+juice") {
    return [
      "Breakfast",
      "Perfect Breakfast. A fried egg with a glass of orange juice.",
    ];
  }
  if (pair === "egg+juice") {
    return [
      "Breakfast",
      "Decent Breakfast. A raw egg and orange juice. The notes said to cook it.",
    ];
  }
  if (pair === "chips+cola") {
    return ["Breakfast", "Epic Breakfast. Chips and a soda."];
  }
  if (pair === "cola+friedegg") {
    return ["Breakfast", "Almost Breakfast. A fried egg and a soda."];
  }
  if (pair === "colgate+juice") {
    return ["Breakfast", "NO!!! Toothpaste and orange juice."];
  }
  if (pair === "cola+cola") {
    return ["Breakfast", "Literally just sodas."];
  }
  return ["Breakfast", "Breakfast? ...It is food, at least."];
}

/** The furniture and fixtures: solid props the player walks around and onto. */
const FURNITURE: Array<
  [string, keyof ModelsByName, number, number, number, string]
> = [
  ["bed", "bed", -22, -14, 0.5, "Bed"],
  ["bathtub", "bathtub", -22, 14, 1, "Bathtub"],
  ["sofa", "sofa", 20, -20, 1.2, "Sofa"],
  ["tv", "tv", 26, -20, 1.2, "TV"],
  ["living-table", "table", 20, -8, 1, "Table"],
  ["counter", "counter", 20, 6, 1.5, "Counter"],
  ["stove", "stove", 12, 20, 1.5, "Stove"],
  ["fridge", "fridge", 26, 20, 3, "Fridge"],
  ["kitchen-table", "table", 8, 10, 1, "Table"],
  ["bench", "bench", 44, 12, 0.8, "Bench"],
  ["vending", "vending", 48, -12, 3.5, "Vending Machine"],
  ["manhole", "manhole", 30, -12, 0.2, "Manhole"],
  ["trash", "trash", 46, -8, 1.2, "Trash Can"],
  ["register", "register", 62, 2, 1, "Register"],
  ["store-counter", "counter", 60, 2, 1.5, "Counter"],
  ["shelf-1", "shelf", 68, -6, 3, "Shelf"],
  ["shelf-2", "shelf", 68, 4, 3, "Shelf"],
];

/** Small things lying about: pickups and the plates, none of them solid. */
const PICKUPS: Array<
  [string, keyof ModelsByName, number, number, number, number]
> = [
  ["chips", "chips", 20, 6, 63.5, 0.6],
  ["orange", "orange", 8, 10, 63, 0.4],
  ["colgate", "colgate", -22, 8, FLOOR, 0.6],
  ["cola", "cola", 24, 18, FLOOR, 0.7],
  ["plate1", "plate", 19, 6, 63.5, 0.15],
  ["plate2", "plate", 21, 6, 63.5, 0.15],
  ["buy-cola", "cola", 66, -6, FLOOR, 0.7],
  ["buy-egg", "egg", 66, -4, FLOOR, 0.4],
  ["buy-juice", "juice", 66, -2, FLOOR, 0.7],
  ["buy-milk", "milk", 66, 0, FLOOR, 0.7],
  // cash: Tix are a dollar, Robux five. Enough here to afford an egg and a
  // full breakfast, with the hundred-cash milestone reachable by picking up all.
  ["tix-1", "tix", -24, -20, FLOOR, 0.3],
  ["tix-2", "tix", -20, -20, FLOOR, 0.3],
  ["tix-3", "tix", -2, -2, FLOOR, 0.3],
  ["tix-4", "tix", 2, -2, FLOOR, 0.3],
  ["tix-5", "tix", -2, 2, FLOOR, 0.3],
  ["tix-6", "tix", 2, 2, FLOOR, 0.3],
  ["tix-7", "tix", -24, 4, FLOOR, 0.3],
  ["tix-8", "tix", -20, 4, FLOOR, 0.3],
  ["tix-9", "tix", -16, 4, FLOOR, 0.3],
  ["tix-10", "tix", -24, 8, FLOOR, 0.3],
  ["tix-11", "tix", 4, -20, FLOOR, 0.3],
  ["tix-12", "tix", 8, -20, FLOOR, 0.3],
  ["tix-13", "tix", 12, -20, FLOOR, 0.3],
  ["tix-14", "tix", 16, -20, FLOOR, 0.3],
  ["robux-1", "robux", -8, 20, FLOOR, 0.3],
  ["robux-2", "robux", -12, 20, FLOOR, 0.3],
  ["robux-3", "robux", 4, -4, FLOOR, 0.3],
  ["robux-4", "robux", 8, -4, FLOOR, 0.3],
  ["robux-5", "robux", 12, -4, FLOOR, 0.3],
  ["robux-6", "robux", 16, -4, FLOOR, 0.3],
  ["robux-7", "robux", 4, 4, FLOOR, 0.3],
  ["robux-8", "robux", 8, 4, FLOOR, 0.3],
  ["robux-9", "robux", 12, 4, FLOOR, 0.3],
  ["robux-10", "robux", 16, 4, FLOOR, 0.3],
];

function open(): void {
  dispatch("time", { seconds: 900, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ROOMS) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }
  for (const [id, model, x, z, height, name] of FURNITURE) {
    // Every fixture stands on the floor: grounded by `heightAt` it would land
    // on the roof once the house is built, which is what a restart showed.
    createProp({
      id,
      model,
      x,
      z,
      y: FLOOR,
      name,
      height,
      solid: true,
    });
  }
  for (const [id, model, x, z, y, height] of PICKUPS) {
    createProp({
      id,
      model,
      x,
      z,
      y,
      name: ITEM_NAMES[id] ?? id,
      height,
      solid: false,
    });
  }
  createNpc({
    id: DAD,
    x: -20,
    z: 16,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: CASHIER,
    x: 63,
    z: 3,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook",
    yaw: Math.atan2(60 - 63, 2 - 3),
  });
  // The cashier works for a while, then takes an indefinite break outside. Once
  // he is gone the shelves are unattended and nothing counts as theft.
  dispatch("timer", { id: "cashier-break", afterMs: 120_000 });
}

function hintFor(zone: string): void {
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
      "The kitchen. Chips on the counter, an orange on the table, and a stove.",
    );
  } else if (zone === LIVING) {
    narrate("You", "The front door is open. The store is down the path.");
  } else if (zone === STORE) {
    narrate(
      "Cashier",
      "Welcome to a generic convenience store. We are open 24 hours.",
    );
  }
}

/** Picks a store good up; it is still unpaid until the cashier rings it up. */
function takeStoreGood(entityId: string): void {
  const item = STORE_PICKUPS[entityId];
  dispatch("prop-remove", { id: entityId });
  give(
    item,
    "You take the " + ITEM_NAMES[item] + ". Set it on the counter to pay.",
  );
}

/** Sets the held store good on the counter, ready for the cashier to ring up. */
function useStoreCounter(item: string): void {
  if (item === "") {
    narrate("You", "The counter is empty.");
    return;
  }
  if (!STORE_GOODS.has(item)) {
    say("The cashier only rings up store items.");
    return;
  }
  if (counterItem !== null) {
    say("There is already something on the counter.");
    return;
  }
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  createProp({
    id: "counter-item",
    model: ITEM_MODELS[item],
    x: 60,
    z: 2,
    y: FLOOR + 1.5,
    name: ITEM_NAMES[item],
    height: 0.5,
    solid: false,
  });
  counterItem = item;
  say(
    "You set the " + ITEM_NAMES[item] + " on the counter. Talk to the cashier.",
  );
}

/** Rings up whatever sits on the counter, if the player can afford it. */
function purchase(): void {
  const good = counterItem;
  if (good === null) {
    return;
  }
  const price = STORE_PRICES[good];
  if (cash < price) {
    dispatch("dialog-close", { player: "", npcId: CASHIER });
    say("You do not have enough cash for the " + ITEM_NAMES[good] + ".");
    return;
  }
  cash -= price;
  paid.add(good);
  counterItem = null;
  dispatch("prop-remove", { id: "counter-item" });
  dispatch("dialog-close", { player: "", npcId: CASHIER });
  give(
    good,
    "The cashier takes your money. (-$" + price + ", $" + cash + " left)",
  );
}

/** Places a held item on a plate, or takes one back off an empty plate. */
function usePlate(slot: number, item: string): void {
  const current = slot === 0 ? plateA : plateB;
  const propId = "plate-item-" + slot;
  const x = slot === 0 ? 19 : 21;
  if (item === "") {
    if (current === null) {
      narrate("You", "That plate is empty.");
      return;
    }
    dispatch("prop-remove", { id: propId });
    if (slot === 0) {
      plateA = null;
    } else {
      plateB = null;
    }
    give(current, "You take the " + ITEM_NAMES[current] + " off the plate.");
    return;
  }
  if (current !== null) {
    say("There is already " + ITEM_NAMES[current] + " on that plate.");
    return;
  }
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  createProp({
    id: propId,
    model: ITEM_MODELS[item],
    x,
    z: 6,
    y: 63.6,
    name: ITEM_NAMES[item],
    height: 0.5,
    solid: false,
  });
  if (slot === 0) {
    plateA = item;
  } else {
    plateB = item;
  }
  say("You set the " + ITEM_NAMES[item] + " on the plate.");
  if (plateA !== null && plateB !== null) {
    const [title, text] = plateResult(plateA, plateB);
    ending(title, text);
  }
}

/** Puts a held item on the stove, turns it on, or takes a cooked one back. */
function useStove(item: string): void {
  if (item !== "") {
    if (stoveItem !== null) {
      say("There is already something on the stove.");
      return;
    }
    dispatch("item-take", { player: "", item, count: 1 });
    hold("");
    createProp({
      id: "stove-item",
      model: ITEM_MODELS[item],
      x: 12,
      z: 20,
      y: 63.5,
      name: ITEM_NAMES[item],
      height: 0.5,
      solid: false,
    });
    stoveItem = item;
    stoveCooked = false;
    stoveOn = true;
    narrate(
      "You",
      "You set the " + ITEM_NAMES[item] + " on the stove and turn it on.",
    );
    // An egg cooks; anything else eventually catches and takes the kitchen.
    dispatch("timer", {
      id: item === "egg" ? "cook" : "fire",
      afterMs: item === "egg" ? 6_000 : 5_000,
    });
    return;
  }
  if (stoveOn) {
    stoveOn = false;
    narrate("You", "You turn the stove off.");
    return;
  }
  if (stoveItem !== null) {
    const picked = stoveCooked ? "friedegg" : stoveItem;
    dispatch("prop-remove", { id: "stove-item" });
    stoveItem = null;
    stoveCooked = false;
    give(picked, "You take the " + ITEM_NAMES[picked] + " off the stove.");
    return;
  }
  narrate("You", "The stove is off and empty.");
}

/** The egg has been on long enough: swap it for the cooked model. */
function cookEgg(): void {
  if (!stoveOn || stoveItem !== "egg" || stoveCooked) {
    return;
  }
  stoveCooked = true;
  createProp({
    id: "stove-item",
    model: ITEM_MODELS.friedegg,
    x: 12,
    z: 20,
    y: 63.5,
    name: ITEM_NAMES.friedegg,
    height: 0.5,
    solid: false,
  });
  narrate("You", "The egg sizzles and fries.");
}

/** The stove has been on long enough: the kitchen catches fire. */
function ignite(): void {
  if (!stoveOn || stoveItem === null || stoveItem === "egg") {
    return;
  }
  dispatch("prop-remove", { id: "stove-item" });
  stoveItem = null;
  stoveCooked = false;
  fireLit = true;
  for (const [index, [x, z, height]] of FIRE_SPOTS.entries()) {
    dispatch("fire", {
      id: "fire-" + index,
      x,
      z,
      y: FLOOR,
      height,
    });
  }
  narrate("You", "The kitchen catches fire!");
  dispatch("timer", { id: "burn", afterMs: 8_000 });
}

/** What the fire reaches depends on how far the player got. */
function burn(): void {
  if (!fireLit) {
    return;
  }
  if (inZone[STORE]) {
    narrate(
      "Cashier",
      "Is that smoke? Did you leave the stove on? ...Of course you did.",
    );
    return;
  }
  if (
    inZone[KITCHEN] ||
    inZone[LIVING] ||
    inZone[BATHROOM] ||
    inZone[BEDROOM]
  ) {
    ending("Fire", "You were caught in the fire.");
    return;
  }
  ending("Fire", "You watched the house burn down from outside.");
}

/** The cashier leaves the counter for an indefinite break. */
function cashierBreak(): void {
  cashierOnBreak = true;
  createNpc({
    id: CASHIER,
    x: 50,
    z: -14,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook",
    yaw: Math.PI / 2,
  });
  narrate(
    "You",
    "An alarm sounds. The cashier steps outside for an indefinite break.",
  );
}

/** Wakes Dad and brings him into the room the player just ate in. */
function wakeDad(): void {
  dadAwake = true;
  const [x, z, yaw] = DAD_SPOTS[room()] ?? DAD_SPOTS[KITCHEN];
  createNpc({
    id: DAD,
    x,
    z,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable",
    yaw,
  });
  // The script cannot read the player's exact spot, but it can turn them to
  // face where Dad now stands — the cutscene's whole point.
  dispatch("player-face", { player: "", x, z });
  narrate(
    "Father Figure",
    '"You woke me up. I could hear you eating those chips!"',
  );
}

function used(entityId: string, item: string): void {
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
      give("cola", "You take a bloxy cola from the fridge.");
    }
    return;
  }
  if (entityId === "stove") {
    useStove(item);
    return;
  }
  if (entityId === "plate1") {
    usePlate(0, item);
    return;
  }
  if (entityId === "plate2") {
    usePlate(1, item);
    return;
  }
  if (entityId === "store-counter") {
    useStoreCounter(item);
    return;
  }
  if (entityId in STORE_PICKUPS) {
    takeStoreGood(entityId);
    return;
  }
  if (entityId === "chips") {
    dispatch("prop-remove", { id: "chips" });
    give("chips", "You pick up the bag of chips.");
    return;
  }
  if (entityId === "orange") {
    narrate("You", "This isn't an ordinary orange...");
    ending("Orange", "uh oh.");
    return;
  }
  if (entityId === "colgate") {
    dispatch("prop-remove", { id: "colgate" });
    give("colgate", "You take the colgate.");
    return;
  }
  if (entityId === "cola") {
    dispatch("prop-remove", { id: "cola" });
    give("cola", "You take the bloxy cola.");
    return;
  }
  if (entityId.startsWith("tix")) {
    dispatch("prop-remove", { id: entityId });
    cash += 1;
    say("You pocket a Tix. ($" + cash + ")");
    return;
  }
  if (entityId.startsWith("robux")) {
    dispatch("prop-remove", { id: entityId });
    cash += 5;
    say("You pocket some Robux. ($" + cash + ")");
    return;
  }
  if (entityId === "vending") {
    if (item === "cola") {
      dispatch("item-take", { player: "", item: "cola", count: 1 });
      hold("");
      sodas += 1;
      say("The machine gurgles happily. (" + sodas + "/8)");
    } else {
      say('The broken machine has a sign taped to it: "feed me sodas".');
    }
    return;
  }
  if (entityId === "manhole") {
    narrate("You", "Someone is down there. Not tonight.");
    return;
  }
  if (entityId === "trash") {
    narrate("You", "A magic trash can. Nothing in here.");
  }
}

/** Eats or drinks the held item, taking it out of the inventory and hand. */
function consume(item: string, text: string): void {
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  narrate("You", text);
}

function usedItem(item: string): void {
  if (item === "chips") {
    dispatch("item-take", { player: "", item, count: 1 });
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
  if (item === "cola") {
    consume("cola", "Cold, sweet, and full of regret.");
    return;
  }
  if (item === "juice") {
    consume("juice", "A glass of orange juice. Suspiciously fresh.");
    return;
  }
  if (item === "milk") {
    consume("milk", "You drink the milk. It was a long walk for this.");
    return;
  }
  if (item === "egg" || item === "friedegg") {
    narrate("You", "I should put that on a plate, not in my mouth.");
  }
}

function talked(npcId: string, player: string): void {
  if (npcId === DAD) {
    if (dadAwake) {
      narrate("Father Figure", '"Go to bed. Now."');
    } else {
      ending("Wake up Dad", '"no."');
    }
    return;
  }
  if (cashierOnBreak) {
    dispatch("dialog", {
      player,
      npcId: CASHIER,
      prompt:
        "I'm on break. Indefinite. If you wanted to buy something, you should have come earlier.",
      options: ["Understood."],
    });
    return;
  }
  if (counterItem !== null) {
    const price = STORE_PRICES[counterItem];
    dispatch("dialog", {
      player,
      npcId: CASHIER,
      prompt:
        "Do you want to buy this " +
        ITEM_NAMES[counterItem] +
        " for $" +
        price +
        "?",
      options: ["Buy it. ($" + price + ")", "Not right now."],
    });
    return;
  }
  dispatch("dialog", {
    player,
    npcId: CASHIER,
    prompt: "welcome to 'a generic convenience store'. we are open 24 hours.",
    options: ["Where is the food?", "Just looking."],
  });
}

function chose(npcId: string, option: number, player: string): void {
  if (npcId !== CASHIER) {
    return;
  }
  if (counterItem !== null) {
    if (option === 0) {
      purchase();
    } else {
      dispatch("dialog-close", { player, npcId: CASHIER });
    }
    return;
  }
  if (option === 0) {
    say("The cashier points at the shelves on the right.");
  }
  dispatch("dialog-close", { player, npcId: CASHIER });
}

/** Answers a timer the shared clock reached, by the id the script gave it. */
function timer(id: string): void {
  if (id === "cook") {
    cookEgg();
  } else if (id === "fire") {
    ignite();
  } else if (id === "burn") {
    burn();
  } else if (id === "cashier-break") {
    cashierBreak();
  }
}

onTick((_clockMs: number, eventsJson: string): void => {
  if (!started) {
    started = true;
    open();
  }
  const events = JSON.parse(eventsJson) as Event[];
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      inZone[event.zoneId] = true;
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left" && event.zoneId !== undefined) {
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
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used" && event.item !== undefined) {
      usedItem(event.item);
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      talked(event.npcId, event.producer);
    } else if (
      event.kind === "npc-choose" &&
      event.npcId !== undefined &&
      event.option !== undefined
    ) {
      chose(event.npcId, event.option, event.producer);
    } else if (event.kind === "timer" && event.timerId !== undefined) {
      timer(event.timerId);
    }
  }
});
