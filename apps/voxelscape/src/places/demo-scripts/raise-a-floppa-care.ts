// The rules of the built-in "Raise a Floppa" demo that are not about any one
// place object: how fast the cat's hunger and happiness fall, what a meal is
// worth, when a day turns and what raids it brings, what the faith altar
// charges, and the three stops of the time machine. Kept apart from the demo's
// script so it carries no `"voxelscape"` import and can be unit-tested on its
// own; every number here is the demo's own, bent from the source's long-tail
// economy so one session can reach an ending.

/** A meal the shop sells and the bowl holds. */
export interface FoodDef {
  readonly id: string;
  readonly name: string;
  /** Dollars one meal costs. */
  readonly price: number;
  /** Hunger points one meal restores. */
  readonly hunger: number;
  /** Happiness points one meal restores. */
  readonly happiness: number;
  /** The items-spritesheet sprite the hotbar shows, or "" for none. */
  readonly sprite: string;
}

/** Every meal, cheapest and plainest first. */
export const FOODS: readonly FoodDef[] = [
  { id: "milk", name: "Milk", price: 10, hunger: 15, happiness: 5, sprite: "" },
  {
    id: "kibble",
    name: "Kibble",
    price: 20,
    hunger: 25,
    happiness: 8,
    sprite: "",
  },
  {
    id: "steak",
    name: "Steak",
    price: 45,
    hunger: 45,
    happiness: 22,
    sprite: "",
  },
  {
    id: "cake",
    name: "Cake",
    price: 70,
    hunger: 30,
    happiness: 40,
    sprite: "",
  },
];

/** The food with `id`, or undefined. */
export const food = (id: string): FoodDef | undefined =>
  FOODS.find((f) => f.id === id);

/** One item the shop sells that is not a meal. */
export interface GoodsDef {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  /** How the script answers owning it. */
  readonly kind: "placeable" | "helper" | "weapon" | "faith";
}

/** Everything the Interwebs sells besides meals. */
export const GOODS: readonly GoodsDef[] = [
  {
    id: "litter-box",
    name: "Litter Box",
    price: 100,
    kind: "placeable",
  },
  {
    id: "cat-bed",
    name: "Cat Bed",
    price: 150,
    kind: "placeable",
  },
  {
    id: "scratching-post",
    name: "Scratching Post",
    price: 120,
    kind: "placeable",
  },
  {
    id: "catnip-plant",
    name: "Catnip Plant",
    price: 200,
    kind: "placeable",
  },
  {
    id: "farm-plot",
    name: "Catnip Farm",
    price: 500,
    kind: "placeable",
  },
  {
    id: "ms-floppa",
    name: "Ms. Floppa",
    price: 300,
    kind: "helper",
  },
  {
    id: "neko-maid",
    name: "Neko Maid",
    price: 400,
    kind: "helper",
  },
  {
    id: "roommate",
    name: "Roommate",
    price: 250,
    kind: "helper",
  },
  {
    id: "sword",
    name: "Sword",
    price: 150,
    kind: "weapon",
  },
  {
    id: "guard-doge",
    name: "Guard Doge",
    price: 500,
    kind: "helper",
  },
  {
    id: "altar",
    name: "Faith Altar",
    price: 300,
    kind: "faith",
  },
  {
    id: "time-machine",
    name: "Time Machine",
    price: 1_000,
    kind: "faith",
  },
];

/** The goods with `id`, or undefined. */
export const goods = (id: string): GoodsDef | undefined =>
  GOODS.find((g) => g.id === id);

/** How often one hunger point falls, in milliseconds. */
export const HUNGER_TICK_MS = 4_000;
/** How often one happiness point falls, in milliseconds. */
export const HAPPY_TICK_MS = 6_000;
/** How long one daytime stretch lasts, in milliseconds. */
export const DAY_MS = 90_000;
/** How long one night lasts, in milliseconds. */
export const NIGHT_MS = 45_000;
/** Clock seconds the day sky is pinned at, and the night sky. */
export const DAY_SECONDS = 300;
export const NIGHT_SECONDS = 900;
/** How long after a meal the cat makes a mess, in milliseconds. */
export const POOP_DELAY_MS = 4_000;
/** The most droppings that can lie around at once. */
export const MAX_POOP = 5;
/** How many meals the bowl holds. */
export const BOWL_CAPACITY = 3;
/** Hunger and happiness one meal in the bowl gives. */
export const BOWL_HUNGER = 20;
export const BOWL_HAPPINESS = 6;
/** The happiest and hungriest a cat gets, and the lowest it can fall. */
export const STAT_MAX = 100;
export const STAT_MIN = 0;
/** How close the cat must come to the bowl to eat, in world units. */
export const EAT_RANGE = 3;
/** How long a catnip high lasts, in milliseconds. */
export const CATNIP_MS = 60_000;
/** The most kittens Ms. Floppa will have. */
export const MAX_BABIES = 5;
/** How long between kittens, in milliseconds. */
export const BABY_MS = 45_000;
/** How long between a maid's rounds, in milliseconds. */
export const MAID_MS = 8_000;
/** The rent a roommate pays the first day, and the daily doubling's ceiling. */
export const RENT_BASE = 10;
export const RENT_MAX = 640;
/** Happiness at or above which money falls at full rate; below it, quartered. */
export const HAPPY_FULL = 50;
/** How much a sword swing takes off a raider. */
export const SWORD_DAMAGE = 3;
/** The reach the demo's own sword is defined with, in world units. */
export const SWORD_REACH = 5;
/** The cadence the demo's sword fires at, in milliseconds. */
export const SWORD_FIRE_MS = 500;

/** One raider wave. */
export interface RaidWave {
  /** How many bandits come. */
  readonly count: number;
  /** Hit points each has. */
  readonly hp: number;
  /** Hunger points one blow takes off the cat. */
  readonly damage: number;
  /** How fast each closes, in world units per second. */
  readonly speed: number;
  /** The catnip the leader drops, if any. */
  readonly loot: number;
}

/**
 * What dawn of `day` brings: no raid the first two days while the player
 * learns the loop, then a rising count matching the source's own escalation.
 */
export const raidForDay = (day: number): RaidWave | null => {
  if (day < 3) {
    return null;
  }
  return {
    count: Math.min(6, day - 2),
    hp: 3 + Math.floor(day / 3),
    damage: 10 + day,
    speed: 2.2 + day * 0.1,
    loot: day % 5 === 0 ? 1 : 0,
  };
};

/** One rung of the faith altar: dollars for percent. */
export interface FaithTier {
  readonly amount: number;
  readonly percent: number;
}

/** The altar's offering rungs, cheapest first; together they reach 100%. */
export const FAITH_TIERS: readonly FaithTier[] = [
  { amount: 50, percent: 5 },
  { amount: 150, percent: 25 },
  { amount: 400, percent: 70 },
];

/** One stop the time machine can reach. */
export interface TimeStop {
  readonly key: string;
  readonly title: string;
  readonly text: string;
  readonly badge: string;
  /** The day-night seconds the sky is pinned at while there. */
  readonly seconds: number;
}

/** The three stops of the time machine, in order. */
export const TIME_STOPS: readonly TimeStop[] = [
  {
    key: "past",
    title: "The Past",
    text: "Ooga greets you over a cookfire and hands back a Time Cube he says you left here.",
    badge: "time-past",
    seconds: 540,
  },
  {
    key: "future",
    title: "The Future",
    text: "A Soldier Floppa salutes you from a broken skyline. The war, he says, was over toys.",
    badge: "time-future",
    seconds: 180,
  },
  {
    key: "eternity",
    title: "Eternity",
    text: "An Elder Floppa sits alone in the white. He has been waiting to meet the one who raised him.",
    badge: "time-eternity",
    seconds: 300,
  },
];

/** How fast sanity falls in the backrooms, one point per this many milliseconds. */
export const SANITY_TICK_MS = 2_500;
/** How close a Screeching Bingus must come to speed the fall, in world units. */
export const BINGUS_RANGE = 12;

/** Keeps `value` between two bounds. */
export const clampStat = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** The money a single pet drops, before the catnip and Ms. Floppa multipliers. */
export const PET_MONEY = 1;
