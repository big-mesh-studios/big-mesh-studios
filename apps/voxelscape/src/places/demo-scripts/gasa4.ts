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

// The structure plan is drawn in LOD-0 voxel coordinates, and a voxel is two
// world units on every axis, so `GROUND` is a voxel row: 32 voxels down the
// world puts the walkable surface at world y 64 and the player's feet at 66.
// Every room, prop, and item below is placed in world units instead, which is
// why `FLOOR` is 66 and why the plan's x and z are half of theirs: the house
// the plan draws is fourteen voxels across and twenty-eight units.
//
// A block of voxels is 64 on a side and the one the spawn sits in covers rows
// -32 to 31, so row 32 is the first row of the next block up and the whole
// neighbourhood stands inside it. That is what makes the store's ceiling
// panels light its floor: block light is filled a block at a time, seeded from
// the emitters inside that block's own padding, so a building straddling row 32
// has a lit ceiling and an unlit floor. See ADR 0094.
const GROUND = 32;
const FLOOR = 66;

const BEDROOM = "bedroom";
const BATHROOM = "bathroom";
const LIVING = "living";
const KITCHEN = "kitchen";
const STORE = "store";
const PARKING = "parking";

const DAD = "dad";
const CASHIER = "cashier";

const BREAK_MS = 231_000;
const SODAS_TO_FLOOD = 8;

let started = false;
let cash = 0;
let chipsEaten = false;
/** Whether Dad was woken by the chips and is now looking for the player. */
let dadAwake = false;
let fridgeUsed = false;
let sodas = 0;
/** What the breakfast machine is holding, one slot per item. */
const machine: Array<string | null> = [null, null];
// What rests on the stove, whether it is on, and whether it is cooked.
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

/**
 * The rooms as `[id, minX, minZ, maxX, maxZ]` in world units, in the order the
 * script declares their zones. The first the player stands in is their room.
 * The house is the two by two the original place is built as, with the bedroom
 * and the bathroom along its north wall, the kitchen and the living room along
 * its south wall, and the store across the road to the east.
 */
const ROOMS: Array<[string, number, number, number, number]> = [
  [BEDROOM, -28, -26, 0, 0],
  [BATHROOM, 0, -26, 28, 0],
  [KITCHEN, -28, 0, 0, 26],
  [LIVING, 0, 0, 28, 26],
  [STORE, 48, -12, 68, 12],
  [PARKING, 30, 2, 48, 24],
];

/**
 * The house and the store: their outer walls, with a doorway in each. Every
 * coordinate here is a voxel, so a wall a voxel thick is two world units and
 * the house this draws is `x` -28 to 28 and `z` -26 to 26 in the world units
 * the rooms and props above are placed in.
 */
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
    // house shell in red brick, front door on the east wall onto the drive
    w(b.brick, -14, -13, -14, 13),
    w(b.brick, -14, -13, 14, -13),
    w(b.brick, -14, 13, 14, 13),
    w(b.brick, 14, -13, 14, 2),
    w(b.brick, 14, 6, 14, 13),
    // interior cross in a lighter stone, a two-voxel doorway on each arm
    w(b.greystone, 0, -13, 0, -11),
    w(b.greystone, 0, -9, 0, 9),
    w(b.greystone, 0, 11, 0, 13),
    w(b.greystone, -14, 0, -11, 0),
    w(b.greystone, -9, 0, 9, 0),
    w(b.greystone, 11, 0, 14, 0),
    // store shell in grey stone, door on the west wall facing the drive
    w(b.greystone, 24, -6, 24, 2),
    w(b.greystone, 24, 6, 24, 6),
    w(b.greystone, 34, -6, 34, 6),
    w(b.greystone, 24, -6, 34, -6),
    w(b.greystone, 24, 6, 34, 6),
  ];
}

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [
    { kind: "box", min: [-96, 0, -96], max: [96, GROUND - 1, 96], id: b.dirt },
    {
      kind: "box",
      min: [-96, GROUND, -96],
      max: [96, GROUND, 96],
      id: b.grass,
    },
    // raze whatever the terrain raised over the neighbourhood
    { kind: "box", min: [-96, GROUND + 1, -96], max: [96, 176, 96], id: 0 },
    // the house floor, the store floor, and the drive between them
    {
      kind: "box",
      min: [-14, GROUND, -13],
      max: [14, GROUND, 13],
      id: b.ice,
    },
    {
      kind: "box",
      min: [24, GROUND, -6],
      max: [34, GROUND, 6],
      id: b.greystone,
    },
    {
      kind: "road",
      from: [14, GROUND, 4],
      to: [24, GROUND, 4],
      width: 4,
      id: b.greystone,
    },
    // the parking lot south of the drive, where the cashier's car stands
    {
      kind: "box",
      min: [15, GROUND, 7],
      max: [23, GROUND, 11],
      id: b.greystone,
    },
    // the bare earth the trees stand on, north of the drive
    {
      kind: "box",
      min: [15, GROUND, -11],
      max: [24, GROUND, -7],
      id: b.dirt,
    },
    ...walls(),
    // roofs
    {
      kind: "box",
      min: [-14, GROUND + 4, -13],
      max: [14, GROUND + 4, 13],
      id: b.wood,
    },
    {
      kind: "box",
      min: [24, GROUND + 4, -6],
      max: [34, GROUND + 4, 6],
      id: b.wood,
    },
    // The store's four ceiling panels, set into the roof over the freezer, the
    // counter and the two shelf bays. They come after the roof because a plan
    // is stamped in order and the last box over a voxel is the one that holds.
    {
      kind: "box",
      min: [27, GROUND + 4, -3],
      max: [27, GROUND + 4, -3],
      id: b.glowstone,
    },
    {
      kind: "box",
      min: [27, GROUND + 4, 3],
      max: [27, GROUND + 4, 3],
      id: b.glowstone,
    },
    {
      kind: "box",
      min: [31, GROUND + 4, -3],
      max: [31, GROUND + 4, -3],
      id: b.glowstone,
    },
    {
      kind: "box",
      min: [31, GROUND + 4, 3],
      max: [31, GROUND + 4, 3],
      id: b.glowstone,
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
  witchbrew: "Witch Brew",
  hotbrew: "Hot Witch Brew",
  icecream: "Ice Cream",
  candy: "Halloween Candy",
  fuel: "Fuel",
  patty: "Patty",
  sandvich: "Sandvich",
  sword: "Sword",
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
  witchbrew: "witchbrew",
  hotbrew: "hotbrew",
  icecream: "icecream",
  candy: "candy",
  fuel: "fuel",
  patty: "patty",
  sandvich: "sandvich",
  sword: "sword",
};

/** What the store sells, and for how much cash. */
const STORE_PRICES: Record<string, number> = {
  cola: 5,
  witchbrew: 20,
  patty: 15,
  egg: 25,
  milk: 30,
  juice: 30,
  fuel: 10,
  icecream: 12,
};
const STORE_GOODS = new Set(Object.keys(STORE_PRICES));

/** The store pickup props, and which good each one puts in the player's hands. */
const STORE_PICKUPS: Record<string, string> = {
  "buy-cola": "cola",
  "buy-witchbrew": "witchbrew",
  "buy-patty": "patty",
  "buy-egg": "egg",
  "buy-milk": "milk",
  "buy-juice": "juice",
  "buy-fuel": "fuel",
  "buy-icecream": "icecream",
};

/** Where Dad comes to when the chips wake him, per room, as `[x, z, yaw]`. */
const DAD_SPOTS: Record<string, [number, number, number]> = {
  [KITCHEN]: [-8, 14, Math.PI],
  [BATHROOM]: [16, -12, Math.PI],
  [LIVING]: [8, 16, Math.PI],
  [BEDROOM]: [-10, -8, 0],
  [STORE]: [58, 0, Math.PI],
  [PARKING]: [44, 20, Math.PI],
};

/** Where fire climbs the kitchen once something on the stove catches. */
const FIRE_SPOTS: Array<[number, number, number]> = [
  [-18, 20, 3.5],
  [-22, 20, 3],
  [-20, 22, 4],
  [-24, 18, 2.5],
  [-16, 18, 3],
  [-20, 16, 2.5],
];

/** The good a store item is a form of, so a cooked egg is still "the egg". */
function goodOf(item: string): string {
  if (item === "friedegg") {
    return "egg";
  }
  if (item === "hotbrew") {
    return "witchbrew";
  }
  return item;
}

/** Whether the player is carrying a store good they never paid for. */
function stealing(item: string): boolean {
  return item !== "" && STORE_GOODS.has(item) && !paid.has(goodOf(item));
}

/**
 * What the breakfast machine makes of a pair of items, as
 * `[first, second, name, comment]`, taken from the pair table the original
 * place ships in its `BreakfastCombos` module. Which of the two is first does
 * not matter.
 */
const COMBOS: Array<[string, string, string, string]> = [
  [
    "friedegg",
    "milk",
    "Perfect Breakfast",
    "Wow. This is it. This is the perfect breakfast. You did it.",
  ],
  [
    "egg",
    "milk",
    "Pergfect Breakfast",
    "What? Trying to make cake? You're making breakfast, not dessert. Cook the egg.",
  ],
  ["chips", "milk", "Soggy Chips", "Milk and chips. Kinda has a ring to it."],
  [
    "chips",
    "cola",
    "Stomach-aching Breakfast",
    "You ever try pilk? Well, Bloxy Colas aren't that.",
  ],
  [
    "chips",
    "witchbrew",
    "Stomach-aching Breakfast",
    "You ever try pilk? Well, Witch Brews aren't that.",
  ],
  [
    "hotbrew",
    "cola",
    "Balanced Beverages",
    "One cold drink. One hot drink. It cancels out.",
  ],
  ["milk", "colgate", "Dairy Mint", "At least it isn't orange juice."],
  ["milk", "icecream", "Lotta Dairy", "That's a lot of dairy."],
  [
    "fuel",
    "milk",
    "Fuel Just Isn't Good",
    "I don't have anything funny to say. You just put fuel in your breakfast.",
  ],
  [
    "fuel",
    "candy",
    "This Isn't Any Better",
    "Just because this is a limited time item does not mean it mixes well with fuel.",
  ],
  ["candy", "milk", "Spooky", "Milk, but spooky."],
  [
    "chips",
    "friedegg",
    "Chips and Eggs",
    "Weird combination, but at least you had the decency to cook the egg.",
  ],
  ["chips", "egg", "Chips and Eggs", "Weird combination. But okay."],
  [
    "colgate",
    "chips",
    "Mint Flavored Chips",
    "Toothpaste isn't a good appetizer.",
  ],
  [
    "chips",
    "icecream",
    "Chips and Ice Cream",
    "I knew two imps named Chips and Ice Cream.",
  ],
  ["juice", "chips", "Orange Flavored Chips", "Now it's soggy and orange."],
  [
    "candy",
    "chips",
    "Halloween Treats",
    "Looks like you came back from trick or treating.",
  ],
  ["candy", "chips", "Sugar Rush", "You're never going to sleep at this rate."],
  [
    "cola",
    "colgate",
    "Rotting Teeth",
    "I would say something scientific about why you shouldn't brush your teeth after drinking soda, but I kinda don't want to.",
  ],
  ["patty", "milk", "Epic Breakfast", "A breakfast for gamers."],
  [
    "icecream",
    "cola",
    "Ice Cream Soda",
    "Hey, not a bad dessert. Not a breakfast though.",
  ],
  [
    "candy",
    "hotbrew",
    "Unhealthy Halloween Snack",
    "What are you trying to do? Witchcraft? Hot!",
  ],
  [
    "icecream",
    "hotbrew",
    "Melted Ice Cream",
    "Well now that hot drink is gonna melt the ice cream.",
  ],
  [
    "egg",
    "hotbrew",
    "That's Not How That Works",
    "You can't just pour a hot drink onto an egg to cook it.",
  ],
  [
    "egg",
    "juice",
    "Alternative Pergfect Breakfast",
    "The egg isn't cooked, but orange juice is a good alternative to milk. I'll give you that.",
  ],
  [
    "friedegg",
    "juice",
    "Alternative Perfect Breakfast",
    "Okay, orange juice is a good alternative. I'll give you this one.",
  ],
  [
    "juice",
    "icecream",
    "Orange Ice Cream",
    "Hey, that actually kinda sounds good.",
  ],
  [
    "juice",
    "cola",
    "Orange Soda",
    "Okay, no, you can't just put orange juice into a soda that already has flavor to make orange soda.",
  ],
  [
    "candy",
    "juice",
    "Orange Candy",
    "The sweetness of the candy and the sour of the juice? No thanks.",
  ],
  [
    "icecream",
    "colgate",
    "Not So Mint Ice Cream",
    "This isn't how you make mint ice cream. I mean, the toothpaste isn't good either, but...",
  ],
  [
    "egg",
    "colgate",
    "Toothpasted Egg",
    "Please stop smearing the toothpaste on the egg like ketchup.",
  ],
  [
    "candy",
    "colgate",
    "Mint Candy",
    "It's a good idea to brush your teeth after eating some Halloween candy. The problem here is that you drank the toothpaste.",
  ],
  [
    "icecream",
    "egg",
    "Egged Ice Cream",
    "The ice cream already has eggs as one of its ingredients!",
  ],
];

// What the machine can name as the food half of a pair, and as the drink half.
const FOOD = new Set(["friedegg", "egg", "patty", "sandvich", "chips"]);
const DRINK = new Set(["milk", "cola", "juice", "witchbrew", "hotbrew"]);

/** The breakfast a full pair makes, as `[text, ending title]`. */
function machineResult(a: string, b: string): [string, string] {
  for (const [first, second, name, comment] of COMBOS) {
    if ((a === first && b === second) || (a === second && b === first)) {
      return [name + ". " + comment, "Breakfast"];
    }
  }
  if (DRINK.has(a) && DRINK.has(b)) {
    return ["Food? You got the drinks. But where's the food?", "Breakfast"];
  }
  if (FOOD.has(a) || FOOD.has(b)) {
    return ["Breakfast? ...It is food, at least.", "Breakfast"];
  }
  return ["Breakfast? ...It is food, technically.", "Breakfast"];
}

/** The furniture and fixtures: solid props the player walks around and onto. */
const FURNITURE: Array<
  [string, keyof ModelsByName, number, number, number, string]
> = [
  // the bedroom, where the player wakes
  ["bed", "bed", -20, -20, 0.5, "Bed"],
  // the bathroom, where Dad is asleep
  ["bathtub", "bathtub", 20, -20, 1, "Bathtub"],
  ["toilet", "toilet", 6, -20, 1, "Toilet"],
  // the kitchen, where the stove and the breakfast machine stand
  ["stove", "stove", -20, 18, 1.5, "Stove"],
  ["breakfast-machine", "breakfastmachine", -13, 18, 1.5, "Breakfast Machine"],
  ["fridge", "fridge", -8, 22, 3, "Fridge"],
  ["kitchen-counter", "counter", -22, 8, 1.5, "Counter"],
  ["kitchen-table", "table", -12, 6, 1, "Table"],
  // the living room
  ["sofa", "sofa", 12, 8, 1.2, "Sofa"],
  ["tv", "tv", 24, 6, 1.2, "TV"],
  ["coffee-table", "table", 14, 18, 1, "Table"],
  ["shelf", "shelf", 24, 20, 3, "Shelf"],
  // the store
  ["store-counter", "counter", 56, 6, 1.5, "Counter"],
  ["register", "register", 58, 8, 1, "Register"],
  ["shelf-1", "shelf", 66, -4, 3, "Shelf"],
  ["shelf-2", "shelf", 66, 2, 3, "Shelf"],
  ["freezer", "freezer", 52, -6, 2, "Freezer"],
  ["trash", "trash", 58, -10, 1.2, "Trash Can"],
  // the drive, the parking lot, and the yard
  ["bench", "bench", 32, 20, 0.8, "Bench"],
  ["vending", "vending", 44, 14, 3.5, "Vending Machine"],
  ["manhole", "manhole", 34, 8, 0.2, "Manhole"],
  ["car", "car", 38, 18, 1.2, "Cashier's Car"],
  ["tree-1", "tree", 32, -18, 4, "Tree"],
  ["tree-2", "tree", 40, -18, 5, "Tree"],
  ["tree-3", "tree", 46, -18, 4.5, "Tree"],
];

/** Small things lying about: pickups, the store's shelves, and the loose cash. */
const PICKUPS: Array<
  [string, keyof ModelsByName, number, number, number, number]
> = [
  // the kitchen, and the bedroom wall the sword hangs on
  ["chips", "chips", -22, 8, 67.5, 0.6],
  ["orange", "orange", -12, 6, 67, 0.4],
  ["cola", "cola", -4, 22, FLOOR, 0.7],
  ["sword", "sword", -26, -8, FLOOR, 1.6],
  // the bathroom shelf
  ["colgate", "colgate", 6, -8, FLOOR, 0.6],
  // a sandvich somebody left on the bench
  ["sandvich", "sandvich", 32, 20, 66.8, 0.4],
  // the store's shelf, one of each good it sells
  ["buy-cola", "cola", 64, -6, FLOOR, 0.7],
  ["buy-witchbrew", "witchbrew", 64, -4, FLOOR, 0.7],
  ["buy-patty", "patty", 64, -2, FLOOR, 0.5],
  ["buy-egg", "egg", 64, 0, FLOOR, 0.4],
  ["buy-milk", "milk", 64, 2, FLOOR, 0.7],
  ["buy-juice", "juice", 64, 4, FLOOR, 0.7],
  ["buy-fuel", "fuel", 64, 6, FLOOR, 0.7],
  ["buy-icecream", "icecream", 64, 8, FLOOR, 0.5],
  // cash: Tix are a dollar, Robux five. Enough here to afford the egg and a
  // full breakfast, and a crate of sodas for the machine on the wall.
  ["tix-1", "tix", -24, -24, FLOOR, 0.3],
  ["tix-2", "tix", -20, -24, FLOOR, 0.3],
  ["tix-3", "tix", -2, -24, FLOOR, 0.3],
  ["tix-4", "tix", 2, -24, FLOOR, 0.3],
  ["tix-5", "tix", 24, -24, FLOOR, 0.3],
  ["tix-6", "tix", 10, -10, FLOOR, 0.3],
  ["tix-7", "tix", -24, 4, FLOOR, 0.3],
  ["tix-8", "tix", -20, 4, FLOOR, 0.3],
  ["tix-9", "tix", -16, 4, FLOOR, 0.3],
  ["tix-10", "tix", -24, 24, FLOOR, 0.3],
  ["tix-11", "tix", 4, 24, FLOOR, 0.3],
  ["tix-12", "tix", 8, 24, FLOOR, 0.3],
  ["tix-13", "tix", 12, 24, FLOOR, 0.3],
  ["tix-14", "tix", 16, 24, FLOOR, 0.3],
  ["robux-1", "robux", -8, 24, FLOOR, 0.3],
  ["robux-2", "robux", -12, 24, FLOOR, 0.3],
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
    // Every fixture stands on the floor: grounded by `getHeightAt` it would land
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
    x: 18,
    z: -18,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable",
    yaw: Math.PI,
  });
  createNpc({
    id: CASHIER,
    x: 60,
    z: 7,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook",
    yaw: Math.atan2(56 - 60, 6 - 7),
  });
  // The cashier works for a while, then an alarm sends him outside on an
  // indefinite break. Once he is gone the shelves are unattended and nothing
  // counts as theft.
  dispatch("timer", { id: "cashier-break", afterMs: BREAK_MS });
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

/** Puts a sold good back on the shelf: the shop never runs out of anything. */
function restock(entityId: string): void {
  for (const [id, model, x, z, y, height] of PICKUPS) {
    if (id === entityId) {
      createProp({
        id,
        model,
        x,
        z,
        y,
        name: ITEM_NAMES[STORE_PICKUPS[id]] ?? id,
        height,
        solid: false,
      });
      return;
    }
  }
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
    x: 56,
    z: 6,
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
  restock("buy-" + good);
  give(
    good,
    "The cashier takes your money. (-$" + price + ", $" + cash + " left)",
  );
}

/** Feeds the breakfast machine: two items in, one breakfast out. */
function useMachine(item: string): void {
  const filled = machine.findIndex((what) => what !== null);
  if (item === "") {
    if (filled === -1) {
      narrate("You", "The machine is empty. It really does work.");
      return;
    }
    const taken = machine[filled] as string;
    dispatch("prop-remove", { id: "machine-item-" + filled });
    machine[filled] = null;
    give(taken, "You take the " + ITEM_NAMES[taken] + " back out.");
    return;
  }
  const free = machine.findIndex((what) => what === null);
  if (free === -1) {
    narrate("You", "The machine is full. Take something out first.");
    return;
  }
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  createProp({
    id: "machine-item-" + free,
    model: ITEM_MODELS[item],
    x: -13.4 + free * 0.8,
    z: 18,
    y: 67.5,
    name: ITEM_NAMES[item],
    height: 0.5,
    solid: false,
  });
  machine[free] = item;
  if (filled === -1) {
    say("You put the " + ITEM_NAMES[item] + " in. One more to go.");
    return;
  }
  const first = machine[filled] as string;
  machine[filled] = null;
  dispatch("prop-remove", { id: "machine-item-" + filled });
  const [text, title] = machineResult(first, item);
  ending(title, text);
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
      x: -20,
      z: 18,
      y: 67.5,
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
    // An egg fries and a brew steams; anything else catches and takes the
    // kitchen.
    dispatch("timer", {
      id: item === "egg" || item === "witchbrew" ? "cook" : "fire",
      afterMs: item === "egg" || item === "witchbrew" ? 6_000 : 5_000,
    });
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
    dispatch("prop-remove", { id: "stove-item" });
    stoveItem = null;
    stoveCooked = false;
    give(picked, "You take the " + ITEM_NAMES[picked] + " off the stove.");
    return;
  }
  narrate("You", "The stove is off and empty.");
}

/** What was on the stove has been on long enough: it is cooked. */
function cookEgg(): void {
  if (!stoveOn || stoveCooked || stoveItem === null) {
    return;
  }
  if (stoveItem !== "egg" && stoveItem !== "witchbrew") {
    return;
  }
  const cooked = stoveItem === "egg" ? "friedegg" : "hotbrew";
  stoveCooked = true;
  createProp({
    id: "stove-item",
    model: ITEM_MODELS[cooked],
    x: -20,
    z: 18,
    y: 67.5,
    name: ITEM_NAMES[cooked],
    height: 0.5,
    solid: false,
  });
  narrate(
    "You",
    stoveItem === "egg"
      ? "The egg sizzles and fries."
      : "The brew starts to steam, and goes hot.",
  );
}

/** The stove has been on long enough: the kitchen catches fire. */
function ignite(): void {
  if (!stoveOn || stoveItem === null) {
    return;
  }
  if (stoveItem === "egg" || stoveItem === "witchbrew") {
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
  if (inZone[STORE] || inZone[PARKING]) {
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

/** The alarm sounds and the cashier leaves the counter for an endless break. */
function cashierBreak(): void {
  cashierOnBreak = true;
  createNpc({
    id: CASHIER,
    x: 44,
    z: 18,
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
      // The fridge cola is the player's own, so carrying it out of the shop is
      // not shoplifting.
      paid.add("cola");
      give("cola", "You take a bloxy cola from the fridge.");
    }
    return;
  }
  if (entityId === "stove") {
    useStove(item);
    return;
  }
  if (entityId === "breakfast-machine") {
    useMachine(item);
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
  if (entityId === "sword") {
    dispatch("prop-remove", { id: "sword" });
    give("sword", "You take the sword off the bedroom wall.");
    return;
  }
  if (entityId === "sandvich") {
    dispatch("prop-remove", { id: "sandvich" });
    give("sandvich", "You take the sandvich off the bench.");
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
      if (sodas >= SODAS_TO_FLOOD) {
        ending(
          "Flood",
          "The machine gurgles happily for the eighth time, and the shop floods.",
        );
        return;
      }
      say(
        "The machine gurgles happily. (" + sodas + "/" + SODAS_TO_FLOOD + ")",
      );
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
  if (item === "witchbrew" || item === "hotbrew") {
    consume(item, "It tastes like a wet cellar. You drink it anyway.");
    return;
  }
  if (item === "candy") {
    consume("candy", "Halloween candy in April. You eat it all of it.");
    return;
  }
  if (item === "fuel") {
    consume("fuel", "It tastes exactly like it sounds.");
    return;
  }
  if (item === "icecream") {
    consume("icecream", "Ice cream, alone, at 4 AM. No notes.");
    return;
  }
  if (item === "egg" || item === "friedegg") {
    narrate(
      "You",
      "I should put that in the breakfast machine, not in my mouth.",
    );
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
    prompt:
      "welcome to 'a generic convenience store'. we are open 24 hours. i go on break in a bit.",
    options: ["How long until your break?", "Just looking."],
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
    say("He checks his watch. A few minutes, give or take a few minutes.");
    return;
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

onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    open();
  }
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
