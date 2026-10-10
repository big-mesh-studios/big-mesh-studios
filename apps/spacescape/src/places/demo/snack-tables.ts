/**
 * Every fixed number in the "Get a Snack at 4 AM" port: where the rooms are, what stands in
 * them, what the shop sells and for how much.
 *
 * ## Copied from the sibling, and the scale applied at the point of use
 *
 * **Every coordinate below is a gasa4 coordinate, unre-scaled**, exactly as it appears in
 * `apps/voxelscape/src/places/demo-scripts/gasa4.ts`. The 5× is applied in `snack.ts`, once, by
 * the two helpers that turn a row into a prop — so the numbers here can be read against the
 * source they came from, which is the whole point of copying rather than converting.
 *
 * ## `HALF` exists because a model knows its own size here
 *
 * In the sibling a placement carried a `height` and the world drew the model at that height. Here
 * a model is authored at its final size and a placement carries the model's **origin**, which
 * Phase 8 made the model's centre. So standing a fridge on the floor means knowing half its
 * height, and that is a number this table has to carry: the model library is a runtime thing and
 * a script cannot ask it how tall a fridge is.
 *
 * `HALF` is `height × LAYOUT_SCALE ÷ 2` for every model, and `make-snack-models.test.ts` is
 * where the other half of that agreement lives.
 */

/**
 * Every model this demo attaches, by the name the script asks for it under.
 *
 * **In the app rather than read from the generator**, because `demos.ts` needs the names to build
 * the URL map and the tool that writes the files lives outside the app. This list is the one the
 * demo uses; `make-snack-models.test.ts` checks it against the table the files were written from,
 * which is the only place the two could disagree.
 */
export const MODELS: readonly string[] = [
  "bed",
  "counter",
  "stove",
  "fridge",
  "shelf",
  "trash",
  "sofa",
  "tv",
  "table",
  "bench",
  "bathtub",
  "manhole",
  "register",
  "vending",
  "breakfastmachine",
  "freezer",
  "car",
  "toilet",
  "tree",
  "chips",
  "orange",
  "colgate",
  "tix",
  "robux",
  "cola",
  "egg",
  "juice",
  "milk",
  "witchbrew",
  "hotbrew",
  "icecream",
  "candy",
  "fuel",
  "patty",
  "sandvich",
  "friedegg",
  "sword",
  "npc-sable",
  "npc-rook",
];

/** How many world units a gasa4 unit is worth. See `snack-port-plan.md`, Phase 9. */
export const LAYOUT_SCALE = 5;

/** The gasa4 floor height, which every `y` in these tables is measured from. */
export const SIBLING_FLOOR = 66;

/**
 * How far above `getHeightAt(0, 0)` the whole neighbourhood is built.
 *
 * **Because the origin is underwater.** The game's planet has its sea at `136000` and the ground
 * over the origin at `135990`, so a house built on the queried surface and a player spawned six
 * units above it both sat in the sea: the demo opened with the player swimming. The sibling was a
 * flat voxel world with no sea, so this is the port's number to choose.
 *
 * **The platform is a thick box** — the plan's own row-0-to-32 ground slab in `snack.ts` — so a
 * lift does not leave the house floating: the slab reaches far below the terrain and the two
 * overlap. `demos.ts` gives the demo a `spawnLift` of the same value, so the spawn the app
 * computes rises with the floor and the two cannot drift apart.
 */
export const PLATFORM_LIFT = 60;

/**
 * Where the player wakes, in world units, as `[x, z]`.
 *
 * **Because the origin is the corner where the interior walls cross.** `demos.ts` spawns a demo
 * on the ground over the origin, and here that is inside the cross — the player starts stuck in a
 * wall. This is a clear patch of bedroom floor near the bed at `[-100, -100]`, and well inside the
 * room's `[-140, 0] × [-130, 0]` bounds. The y is the app's to compute, from the ground plus
 * `PLATFORM_LIFT`, so only the two plan coordinates are here. See `demos.spawnAt`.
 */
export const SPAWN: readonly [number, number] = [-70, -60];

export const BEDROOM = "bedroom";
export const BATHROOM = "bathroom";
export const LIVING = "living";
export const KITCHEN = "kitchen";
export const STORE = "store";
export const PARKING = "parking";

export const DAD = "dad";
export const CASHIER = "cashier";

/** How long the cashier works before the alarm sends him outside. */
export const BREAK_MS = 231_000;
/** How many sodas the vending machine takes before the shop floods. */
export const SODAS_TO_FLOOD = 8;

/**
 * The rooms as `[id, minX, minZ, maxX, maxZ]`, in world units, in the order the script declares
 * their zones. The first the player stands in is their room.
 */
export const ROOMS: ReadonlyArray<
  readonly [string, number, number, number, number]
> = [
  [BEDROOM, -28, -26, 0, 0],
  [BATHROOM, 0, -26, 28, 0],
  [KITCHEN, -28, 0, 0, 26],
  [LIVING, 0, 0, 28, 26],
  [STORE, 48, -12, 68, 12],
  [PARKING, 30, 2, 48, 24],
];

/**
 * The furniture and fixtures: `[id, model, x, z, height]`.
 *
 * **The sibling's `name` column is gone.** A prop in this engine has no name — the narration and
 * the dialogs speak, and a prop is never spoken to — so a column that no code read would be a
 * column a future reader would think something read.
 */
export const FURNITURE: ReadonlyArray<
  readonly [string, string, number, number, number]
> = [
  // the bedroom, where the player wakes
  ["bed", "bed", -20, -20, 0.5],
  // the bathroom, where Dad is asleep
  ["bathtub", "bathtub", 20, -20, 1],
  ["toilet", "toilet", 6, -20, 1],
  // the kitchen, where the stove and the breakfast machine stand
  ["stove", "stove", -20, 18, 1.5],
  ["breakfast-machine", "breakfastmachine", -13, 18, 1.5],
  ["fridge", "fridge", -8, 22, 3],
  ["kitchen-counter", "counter", -22, 8, 1.5],
  ["kitchen-table", "table", -12, 6, 1],
  // the living room
  ["sofa", "sofa", 12, 8, 1.2],
  ["tv", "tv", 24, 6, 1.2],
  ["coffee-table", "table", 14, 18, 1],
  ["shelf", "shelf", 24, 20, 3],
  // the store
  ["store-counter", "counter", 56, 6, 1.5],
  ["register", "register", 58, 8, 1],
  ["shelf-1", "shelf", 66, -4, 3],
  ["shelf-2", "shelf", 66, 2, 3],
  ["freezer", "freezer", 52, -6, 2],
  ["trash", "trash", 58, -10, 1.2],
  // the drive, the parking lot, and the yard
  ["bench", "bench", 32, 20, 0.8],
  ["vending", "vending", 44, 14, 3.5],
  ["manhole", "manhole", 34, 8, 0.2],
  ["car", "car", 38, 18, 1.2],
  ["tree-1", "tree", 32, -18, 4],
  ["tree-2", "tree", 40, -18, 5],
  ["tree-3", "tree", 46, -18, 4.5],
];

/** Small things lying about: `[id, model, x, z, gasa4BaseY, height]`. */
export const PICKUPS: ReadonlyArray<
  readonly [string, string, number, number, number, number]
> = [
  // the kitchen, and the bedroom wall the sword hangs on
  ["chips", "chips", -22, 8, 67.5, 0.6],
  ["orange", "orange", -12, 6, 67, 0.4],
  ["cola", "cola", -4, 22, SIBLING_FLOOR, 0.7],
  ["sword", "sword", -26, -8, SIBLING_FLOOR, 1.6],
  // the bathroom shelf
  ["colgate", "colgate", 6, -8, SIBLING_FLOOR, 0.6],
  // a sandvich somebody left on the bench
  ["sandvich", "sandvich", 32, 20, 66.8, 0.4],
  // the store's shelf, one of each good it sells
  ["buy-cola", "cola", 64, -6, SIBLING_FLOOR, 0.7],
  ["buy-witchbrew", "witchbrew", 64, -4, SIBLING_FLOOR, 0.7],
  ["buy-patty", "patty", 64, -2, SIBLING_FLOOR, 0.5],
  ["buy-egg", "egg", 64, 0, SIBLING_FLOOR, 0.4],
  ["buy-milk", "milk", 64, 2, SIBLING_FLOOR, 0.7],
  ["buy-juice", "juice", 64, 4, SIBLING_FLOOR, 0.7],
  ["buy-fuel", "fuel", 64, 6, SIBLING_FLOOR, 0.7],
  ["buy-icecream", "icecream", 64, 8, SIBLING_FLOOR, 0.5],
  // cash: Tix are a dollar, Robux five. Enough here to afford the egg and a
  // full breakfast, and a crate of sodas for the machine on the wall.
  ["tix-1", "tix", -24, -24, SIBLING_FLOOR, 0.3],
  ["tix-2", "tix", -20, -24, SIBLING_FLOOR, 0.3],
  ["tix-3", "tix", -2, -24, SIBLING_FLOOR, 0.3],
  ["tix-4", "tix", 2, -24, SIBLING_FLOOR, 0.3],
  ["tix-5", "tix", 24, -24, SIBLING_FLOOR, 0.3],
  ["tix-6", "tix", 10, -10, SIBLING_FLOOR, 0.3],
  ["tix-7", "tix", -24, 4, SIBLING_FLOOR, 0.3],
  ["tix-8", "tix", -20, 4, SIBLING_FLOOR, 0.3],
  ["tix-9", "tix", -16, 4, SIBLING_FLOOR, 0.3],
  ["tix-10", "tix", -24, 24, SIBLING_FLOOR, 0.3],
  ["tix-11", "tix", 4, 24, SIBLING_FLOOR, 0.3],
  ["tix-12", "tix", 8, 24, SIBLING_FLOOR, 0.3],
  ["tix-13", "tix", 12, 24, SIBLING_FLOOR, 0.3],
  ["tix-14", "tix", 16, 24, SIBLING_FLOOR, 0.3],
  ["robux-1", "robux", -8, 24, SIBLING_FLOOR, 0.3],
  ["robux-2", "robux", -12, 24, SIBLING_FLOOR, 0.3],
  ["robux-3", "robux", 4, -4, SIBLING_FLOOR, 0.3],
  ["robux-4", "robux", 8, -4, SIBLING_FLOOR, 0.3],
  ["robux-5", "robux", 12, -4, SIBLING_FLOOR, 0.3],
  ["robux-6", "robux", 16, -4, SIBLING_FLOOR, 0.3],
  ["robux-7", "robux", 4, 4, SIBLING_FLOOR, 0.3],
  ["robux-8", "robux", 8, 4, SIBLING_FLOOR, 0.3],
  ["robux-9", "robux", 12, 4, SIBLING_FLOOR, 0.3],
  ["robux-10", "robux", 16, 4, SIBLING_FLOOR, 0.3],
];

/** What each item is called when it is spoken about. The only names items have. */
export const ITEM_NAMES: Readonly<Record<string, string>> = {
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

/** The model each item wears when it rests somewhere. */
export const ITEM_MODELS: Readonly<Record<string, string>> = {
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
export const STORE_PRICES: Readonly<Record<string, number>> = {
  cola: 5,
  witchbrew: 20,
  patty: 15,
  egg: 25,
  milk: 30,
  juice: 30,
  fuel: 10,
  icecream: 12,
};

/** The store pickup props, and which good each one puts in the player's hands. */
export const STORE_PICKUPS: Readonly<Record<string, string>> = {
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
export const DAD_SPOTS: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  [KITCHEN]: [-8, 14, Math.PI],
  [BATHROOM]: [16, -12, Math.PI],
  [LIVING]: [8, 16, Math.PI],
  [BEDROOM]: [-10, -8, 0],
  [STORE]: [58, 0, Math.PI],
  [PARKING]: [44, 20, Math.PI],
};

/** Where fire climbs the kitchen once something on the stove catches. */
export const FIRE_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-18, 20, 3.5],
  [-22, 20, 3],
  [-20, 22, 4],
  [-24, 18, 2.5],
  [-16, 18, 3],
  [-20, 16, 2.5],
];

/**
 * Half the height of every model, in world units.
 *
 * **Because a placement is a model's centre and a floor is its base.** See the note at the top.
 * Ordered as `snack-model-table.ts` is, and checked against it by a test rather than trusted.
 */
export const HALF: Readonly<Record<string, number>> = {
  bed: 1.25,
  bathtub: 2.5,
  sofa: 3,
  tv: 3,
  table: 2.5,
  counter: 3.75,
  stove: 3.75,
  fridge: 7.5,
  breakfastmachine: 3.75,
  freezer: 5,
  car: 3,
  toilet: 2.5,
  tree: 10,
  bench: 2,
  manhole: 0.5,
  trash: 3,
  register: 2.5,
  shelf: 7.5,
  vending: 8.75,
  chips: 1.5,
  orange: 1,
  colgate: 1.5,
  cola: 1.75,
  egg: 1,
  friedegg: 0.75,
  juice: 1.75,
  milk: 1.75,
  witchbrew: 1.75,
  hotbrew: 1.75,
  icecream: 1.25,
  candy: 1,
  fuel: 1.75,
  patty: 1.25,
  sandvich: 1,
  sword: 4,
  tix: 0.75,
  robux: 0.75,
  "npc-sable": 8.5,
  "npc-rook": 7.5,
};
