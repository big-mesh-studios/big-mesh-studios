// The item, price, drop and crafting tables the built-in "Cube Cavern" demo
// runs on, taken from the original place's own `gprice` list and its enemy
// `rag()` drop roll. Pure data and pure rolls, so it carries no `"voxelscape"`
// import and can be unit-tested on its own; the demo's own script turns a roll
// into an effect.
import { pick, randInt, type Rng } from "./cube-cavern-level";

/** How a held item is used when the primary button is pressed. */
export interface WeaponSpec {
  readonly damage: number;
  readonly reach: number;
  readonly fireIntervalMs: number;
}

/** One item a cavern, a chest, or a shop can hand out. */
export interface ItemDef {
  readonly id: string;
  readonly name: string;
  /** What it costs in coins in a shop; 0 when it is only found. */
  readonly price: number;
  /** Shop weight; higher shows more often. 0 keeps it out of shops. */
  readonly rare: number;
  readonly description: string;
  /** The place model a dropped copy of it wears. */
  readonly model: string;
  readonly weapon?: WeaponSpec;
  /** Hit points eating it restores. */
  readonly heal?: number;
  /** Max hit points a life plant adds. */
  readonly maxHealthUp?: number;
  /** Whether picking it up counts toward the crafting bench's material stock. */
  readonly material?: boolean;
  /** Coins a pickup grants directly, for a coin or a bullet clip. */
  readonly coinValue?: number;
  /** The run-wide walk-speed multiplier a pair of boots grants. */
  readonly speed?: number;
}

const MELEE = (damage: number, reach: number): WeaponSpec => ({
  damage,
  reach,
  fireIntervalMs: 420,
});

const GUN = (
  damage: number,
  reach: number,
  fireIntervalMs: number,
): WeaponSpec => ({
  damage,
  reach,
  fireIntervalMs,
});

/**
 * Every item the demo names, with the source's own damage numbers and prices.
 * A weapon's `reach` stands in for the source's own range; the world has no
 * thrown or travelling shots (ADR 0051), so a gun is a long-reach strike.
 */
export const ITEMS: Record<string, ItemDef> = {
  key: {
    id: "key",
    name: "Key",
    price: 6,
    rare: 18,
    description: "Unlocks the hatch to the next floor.",
    model: "cave-key",
  },
  clip: {
    id: "clip",
    name: "Bullet Clip",
    price: 7,
    rare: 0,
    description: "Worth a few coins.",
    model: "cave-coin",
    coinValue: 3,
  },
  coin: {
    id: "coin",
    name: "Coin",
    price: 0,
    rare: 0,
    description: "Purchases stuff.",
    model: "cave-coin",
    coinValue: 1,
  },
  rock: {
    id: "rock",
    name: "Rock",
    price: 8,
    rare: 0,
    description: "A crafting material.",
    model: "cave-coin",
    material: true,
  },
  stick: {
    id: "stick",
    name: "Stick",
    price: 9,
    rare: 0,
    description: "A crafting material.",
    model: "cave-craft",
    material: true,
  },
  leather: {
    id: "leather",
    name: "Leather",
    price: 11,
    rare: 0,
    description: "A crafting material.",
    model: "cave-craft",
    material: true,
  },
  rope: {
    id: "rope",
    name: "Rope",
    price: 12,
    rare: 0,
    description: "A crafting material.",
    model: "cave-craft",
    material: true,
  },
  bottle: {
    id: "bottle",
    name: "Empty Bottle",
    price: 13,
    rare: 0,
    description: "A crafting material.",
    model: "cave-torch",
    material: true,
  },
  bread: {
    id: "bread",
    name: "Bread",
    price: 5,
    rare: 20,
    description: "Heals 1 heart.",
    model: "cave-lifeplant",
    heal: 1,
  },
  orange: {
    id: "orange",
    name: "Orange",
    price: 5,
    rare: 20,
    description: "Heals 1 heart.",
    model: "cave-lifeplant",
    heal: 1,
  },
  bberry: {
    id: "bberry",
    name: "Blue Berry",
    price: 5,
    rare: 16,
    description: "Heals 1 heart.",
    model: "cave-lifeplant",
    heal: 1,
  },
  taco: {
    id: "taco",
    name: "Taco",
    price: 7,
    rare: 12,
    description: "Heals 2 hearts.",
    model: "cave-lifeplant",
    heal: 2,
  },
  cherry: {
    id: "cherry",
    name: "Cherry",
    price: 7,
    rare: 12,
    description: "Heals 2 hearts.",
    model: "cave-lifeplant",
    heal: 2,
  },
  toast: {
    id: "toast",
    name: "Toast",
    price: 0,
    rare: 0,
    description: "Heals 2 hearts.",
    model: "cave-lifeplant",
    heal: 2,
  },
  "chicken leg": {
    id: "chicken leg",
    name: "Chicken Leg",
    price: 32,
    rare: 8,
    description: "Heals 4 hearts.",
    model: "cave-lifeplant",
    heal: 4,
  },
  soda: {
    id: "soda",
    name: "Soda",
    price: 8,
    rare: 14,
    description: "Heals 1 heart and speeds you up.",
    model: "cave-lifeplant",
    heal: 1,
    speed: 1.3,
  },
  dagger: {
    id: "dagger",
    name: "Dagger",
    price: 0,
    rare: 10,
    description: "3 damage.",
    model: "cave-craft",
    weapon: MELEE(3, 6),
  },
  daggerB: {
    id: "daggerB",
    name: "Blue Dagger",
    price: 0,
    rare: 6,
    description: "3 damage, fast.",
    model: "cave-craft",
    weapon: MELEE(3, 6),
  },
  daggerR: {
    id: "daggerR",
    name: "Red Dagger",
    price: 0,
    rare: 6,
    description: "4 damage.",
    model: "cave-craft",
    weapon: MELEE(4, 6),
  },
  sword: {
    id: "sword",
    name: "Sword",
    price: 0,
    rare: 6,
    description: "8 damage. Every hero has one.",
    model: "cave-craft",
    weapon: MELEE(8, 9),
  },
  "toy sword": {
    id: "toy sword",
    name: "Toy Sword",
    price: 0,
    rare: 3,
    description: "6 damage.",
    model: "cave-craft",
    weapon: MELEE(6, 8),
  },
  "rainbow sword": {
    id: "rainbow sword",
    name: "Rainbow Sword",
    price: 0,
    rare: 1,
    description: "THE GREATEST WEPON!",
    model: "cave-craft",
    weapon: MELEE(12, 10),
  },
  battleaxe: {
    id: "battleaxe",
    name: "Battleaxe",
    price: 300,
    rare: 2,
    description: "5 damage, heavy.",
    model: "cave-craft",
    weapon: MELEE(5, 10),
  },
  bone: {
    id: "bone",
    name: "Bone",
    price: 0,
    rare: 4,
    description: "2 damage.",
    model: "cave-craft",
    weapon: MELEE(2, 6),
  },
  mossball: {
    id: "mossball",
    name: "Mossball",
    price: 0,
    rare: 3,
    description: "4 damage, heavy.",
    model: "cave-craft",
    weapon: MELEE(4, 7),
  },
  "green gun": {
    id: "green gun",
    name: "Green Gun",
    price: 45,
    rare: 6,
    description: "4 damage, quickly reloads.",
    model: "cave-craft",
    weapon: GUN(4, 30, 280),
  },
  gun: {
    id: "gun",
    name: "Blue Gun",
    price: 40,
    rare: 6,
    description: "5 damage.",
    model: "cave-craft",
    weapon: GUN(5, 28, 400),
  },
  "red gun": {
    id: "red gun",
    name: "Red Gun",
    price: 55,
    rare: 4,
    description: "8 damage, slow.",
    model: "cave-craft",
    weapon: GUN(8, 26, 600),
  },
  "whoopie gun": {
    id: "whoopie gun",
    name: "Whoopie Gun",
    price: 0,
    rare: 3,
    description: "Stuns enemies.",
    model: "cave-craft",
    weapon: GUN(1, 24, 500),
  },
  boots: {
    id: "boots",
    name: "Boots",
    price: 20,
    rare: 8,
    description: "Move quicker.",
    model: "cave-craft",
    speed: 1.4,
  },
  map: {
    id: "map",
    name: "Map",
    price: 40,
    rare: 6,
    description: "Reveals the way to the hatch.",
    model: "cave-sign",
  },
  pouch: {
    id: "pouch",
    name: "Pouch",
    price: 80,
    rare: 4,
    description: "Grants a heart of carrying room.",
    model: "cave-craft",
    maxHealthUp: 2,
  },
  life: {
    id: "life",
    name: "Life Plant",
    price: 24,
    rare: 6,
    description: "Grows a new max heart.",
    model: "cave-lifeplant",
    maxHealthUp: 1,
  },
};

/** The ids that count as crafting stock rather than as held items. */
export const MATERIALS: readonly string[] = Object.values(ITEMS)
  .filter((item) => item.material === true)
  .map((item) => item.id);

/** A weapon or food an enemy may leave behind. */
const DROPPABLE = ["dagger", "bone", "mossball", "toast", "bread", "orange"];

/** One bench recipe: how much stock it spends and what it makes. */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  /** How many materials it consumes. */
  readonly materials: number;
  readonly output: string;
}

/** The crafting bench's recipes. */
export const RECIPES: readonly Recipe[] = [
  { id: "dagger", name: "Dagger (2 stock)", materials: 2, output: "dagger" },
  { id: "sword", name: "Sword (4 stock)", materials: 4, output: "sword" },
  {
    id: "green gun",
    name: "Green Gun (6 stock)",
    materials: 6,
    output: "green gun",
  },
  {
    id: "battleaxe",
    name: "Battleaxe (10 stock)",
    materials: 10,
    output: "battleaxe",
  },
];

/** What an enemy's death left behind. */
export type Drop =
  | { readonly kind: "coins"; readonly amount: number }
  | { readonly kind: "key" }
  | { readonly kind: "material"; readonly item: string }
  | { readonly kind: "item"; readonly item: string }
  | { readonly kind: "hat" };

/**
 * The loot one enemy drops. The source rolls 165 outcomes: a bronze coin on
 * 37, a key and a clip on one each, a hat on one. This keeps the same shape but
 * lifts the coin and key rates, because a single-player demo has no one to
 * trade with and a key must be reachable in a few rooms.
 */
export const rollDrop = (rng: Rng): Drop => {
  const r = rng();
  if (r < 0.06) {
    return { kind: "key" };
  }
  if (r < 0.14) {
    return { kind: "material", item: pick(rng, MATERIALS) };
  }
  if (r < 0.2) {
    return { kind: "item", item: pick(rng, DROPPABLE) };
  }
  if (r < 0.24) {
    return { kind: "hat" };
  }
  if (r < 0.34) {
    return { kind: "coins", amount: 5 };
  }
  return { kind: "coins", amount: 1 };
};

/** The coins and goods a chest holds. */
export interface ChestLoot {
  readonly coins: number;
  readonly item?: string;
  readonly key: boolean;
}

/** Rolls one chest's contents. */
export const rollChest = (rng: Rng): ChestLoot => {
  const coins = randInt(rng, 5, 25);
  const key = rng() < 0.35;
  const item: string | undefined =
    rng() < 0.5
      ? pick(rng, ["sword", "daggerR", "green gun", "chicken leg", "life"])
      : undefined;
  return { coins, key, item };
};

/**
 * The shop's stock: `count` distinct items drawn by their own `rare` weight,
 * priced as the source prices them. A key and a bit of food are always
 * included, so a run is never unwinnable.
 */
export const shopStock = (rng: Rng, count: number): ItemDef[] => {
  const stocked = Object.values(ITEMS).filter(
    (item) => item.rare > 0 && item.price > 0,
  );
  const chosen: ItemDef[] = [];
  const take = (id: string): void => {
    const item = ITEMS[id];
    if (item !== undefined && !chosen.some((c) => c.id === id)) {
      chosen.push(item);
    }
  };
  take("key");
  take("bread");
  while (chosen.length < count) {
    const item = pick(rng, stocked);
    if (!chosen.some((c) => c.id === item.id)) {
      chosen.push(item);
    }
    if (stocked.every((s) => chosen.some((c) => c.id === s.id))) {
      break;
    }
  }
  return chosen;
};
