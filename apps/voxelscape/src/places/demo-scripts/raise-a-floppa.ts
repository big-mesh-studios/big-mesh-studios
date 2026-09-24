// The "Raise a Floppa" demo's place script — a port of the Roblox game of the
// same name. The player wakes in a one-room house with a stray caracal: feed
// it from the bowl, pet it for money, clean up after it, shop on the Interwebs
// for the cat bed, the litter box, Ms. Floppa, the Neko Maid and the rest,
// survive the bandits that raid each dawn, slip into the yellow backrooms when
// the west door opens at night, and either offer your way to the Faith Altar's
// ascension or ride the Time Machine through the past, the future, and
// eternity.
//
// The game is the original's own shape — the hunger-or-death care loop, the
// money that falls from petting, the shop's long shelf of helpers, the raids,
// the backrooms, and the two win endings — laid over this world's primitives.
// Its long-tail economy is compressed so one session can reach an ending:
// every number lives in `raise-a-floppa-care`, the shop's shelf in
// `raise-a-floppa-shop`, and the site in `raise-a-floppa-level`.
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler takes voxel
// coordinates; props, NPCs, and the player take world coordinates.
import {
  awardBadge,
  dispatch,
  getNow,
  getPlayers,
  onPlan,
  onTick,
  requestData,
  savePlayerData,
} from "voxelscape";
import {
  ALTAR,
  BACKROOM_DOOR,
  BACKROOM_ENTRY,
  BACKROOM_EXIT,
  BOWL,
  CAT_BED,
  CATNIP,
  COMPUTER,
  DARK_WEB,
  FARM_ORIGIN,
  FARM_STRIDE,
  FLOOR,
  FRIDGE,
  LITTER_BOX,
  SCRATCH_POST,
  SPAWN,
  STOVE,
  TIME_MACHINE,
  worldShapes,
} from "./raise-a-floppa-level";
import {
  BABY_MS,
  BINGUS_RANGE,
  BOWL_CAPACITY,
  BOWL_HAPPINESS,
  BOWL_HUNGER,
  CATNIP_MS,
  DAY_MS,
  DAY_SECONDS,
  EAT_RANGE,
  FAITH_TIERS,
  FOODS,
  GOODS,
  HAPPY_FULL,
  HAPPY_TICK_MS,
  HUNGER_TICK_MS,
  MAID_MS,
  MAX_BABIES,
  MAX_POOP,
  NIGHT_MS,
  NIGHT_SECONDS,
  PET_MONEY,
  POOP_DELAY_MS,
  RENT_BASE,
  RENT_MAX,
  SANITY_TICK_MS,
  STAT_MAX,
  STAT_MIN,
  SWORD_DAMAGE,
  SWORD_FIRE_MS,
  SWORD_REACH,
  TIME_STOPS,
  clampStat,
  food,
  goods,
  raidForDay,
} from "./raise-a-floppa-care";
import { SHOP_GROUPS, itemSprite } from "./raise-a-floppa-shop";

/** How often the demo steps, in milliseconds. */
const TICK_MS = 200;
/** How much hunger and happiness a cat begins with. */
const START_STAT = 80;
/** How close the cat stays to the player when idle, in world units. */
const FOLLOW_RANGE = 6;
/** How close a raider must come to strike the cat, in world units. */
const RAID_STRIKE_RANGE = 2.4;
/** How often a raider may strike, in milliseconds. */
const RAID_STRIKE_MS = 1_500;
/** How much money one dropped bag holds. */
const BAG_MONEY = 20;
/** How many pets drop a bag. */
const BAG_EVERY = 8;
/** How far, in world units, a Guard Doge bites. */
const DOGE_RANGE = 20;
/** How much a Guard Doge's bite takes off, each tick. */
const DOGE_DAMAGE = 1;

// The models, as the manifest's own file names.
const M_FLOPPA = "floppa.zip";
const M_MS_FLOPPA = "ms-floppa.zip";
const M_BABY = "baby-floppa.zip";
const M_ELDER = "elder-floppa.zip";
const M_SOLDIER = "soldier-floppa.zip";
const M_BANDIT = "bandit.zip";
const M_BINGUS = "bingus.zip";
const M_MAID = "neko-maid.zip";
const M_OOGA = "ooga.zip";
const M_BOWL = "food-bowl.zip";
const M_LITTER = "litter-box.zip";
const M_COMPUTER = "computer.zip";
const M_CAT_BED = "cat-bed.zip";
const M_POST = "scratching-post.zip";
const M_CATNIP = "catnip-plant.zip";
const M_BAG = "money-bag.zip";
const M_POOP = "poop.zip";
const M_ALTAR = "altar.zip";
const M_TIME = "time-machine.zip";
const M_DARK_WEB = "dark-web-stall.zip";
const M_BACKROOM_DOOR = "backroom-door.zip";

// Data keys, one per remembered value.
const K_MONEY = "rf-money";
const K_OWNED = "rf-owned";
const K_FAITH = "rf-faith";
const K_DAYS = "rf-days";
const K_BEST = "rf-best";
const K_RENT = "rf-rent";
const K_CUBES = "rf-cubes";
const K_FARMS = "rf-farms";
const K_TRAVEL = "rf-travel";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let booted = false;
let phase: "play" | "backrooms" | "ending" = "play";

let hunger = START_STAT;
let happiness = START_STAT;
let money = 0;
let faith = 0;
let days = 0;
let bestDays = 0;
let rent = RENT_BASE;
let cubes = 0;
let farms = 0;
let travelMask = 0;
const owned = new Set<string>();

let bowlFood = 0;
let pendingPoops = 0;
let catnipUntil = 0;
let petCount = 0;
let isNight = false;
let sanity = STAT_MAX;
let travelStop = 0;

let nextHungerAt = 0;
let nextHappyAt = 0;
let nextDayAt = 0;
let nextNightAt = 0;
let nextPoopAt = 0;
let nextBabyAt = 0;
let nextMaidAt = 0;

/** The cat itself, or null once it has been lost. */
let floppa: { x: number; z: number; yaw: number } | null = null;
/** Ms. Floppa's kittens, in the order they were born. */
const babies: Array<{ id: string; x: number; z: number }> = [];
const poopIds: string[] = [];
const farmIds: string[] = [];
/** Every raider in the current wave. */
let raiders: Array<{
  id: string;
  x: number;
  z: number;
  hp: number;
  speed: number;
  damage: number;
  nextAttackAt: number;
}> = [];
/** The figures the backrooms stands while the player is inside. */
const backroomIds: string[] = [];
/** What `ensureOwned` has already stood, so a data reload never doubles it. */
const spawned = new Set<string>();

// ---------------------------------------------------------------------------
// Small dispatchers
// ---------------------------------------------------------------------------
function toast(text: string): void {
  dispatch("toast", { player: "", text });
}
function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}
function saveMoney(): void {
  savePlayerData(K_MONEY, money);
}
function saveOwned(): void {
  let mask = 0;
  GOODS.forEach((g, i) => {
    if (owned.has(g.id)) {
      mask |= 1 << i;
    }
  });
  savePlayerData(K_OWNED, mask);
  savePlayerData(K_FARMS, farms);
}
function saveFaith(): void {
  savePlayerData(K_FAITH, faith);
}
function saveProgress(): void {
  savePlayerData(K_DAYS, days);
  savePlayerData(K_BEST, bestDays);
  savePlayerData(K_RENT, rent);
  savePlayerData(K_CUBES, cubes);
  savePlayerData(K_TRAVEL, travelMask);
}

/** The most money one pet drops once Ms. Floppa and catnip are counted in. */
function multiplier(): number {
  let m = 1;
  if (owned.has("ms-floppa")) {
    m *= 2;
  }
  if (getNow() < catnipUntil) {
    m *= 4;
  }
  if (happiness < HAPPY_FULL) {
    m *= 0.25;
  }
  return m;
}

/** Shows every readout the current state warrants. */
function updateHud(): void {
  dispatch("hud", {
    player: "",
    id: "hunger",
    kind: "bar",
    label: "Hunger",
    value: Math.max(0, Math.round(hunger)),
    max: STAT_MAX,
  });
  dispatch("hud", {
    player: "",
    id: "happy",
    kind: "bar",
    label: "Happiness",
    value: Math.max(0, Math.round(happiness)),
    max: STAT_MAX,
  });
  dispatch("hud", {
    player: "",
    id: "money",
    kind: "text",
    label: "Money",
    text: `$${Math.floor(money)}`,
  });
  dispatch("hud", {
    player: "",
    id: "day",
    kind: "text",
    label: "Day",
    text: `${days}`,
  });
  if (owned.has("altar")) {
    dispatch("hud", {
      player: "",
      id: "faith",
      kind: "bar",
      label: "Faith",
      value: Math.round(faith),
      max: 100,
    });
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
/** Declares every item the demo can hand out, so a give or hold resolves. */
function defineItems(): void {
  for (const f of FOODS) {
    dispatch("item-define", {
      id: f.id,
      name: f.name,
      sprite: itemSprite(f.id),
      stackable: true,
    });
  }
  dispatch("item-define", {
    id: "catnip",
    name: "Catnip",
    sprite: "",
    stackable: true,
  });
  dispatch("item-define", {
    id: "sword",
    name: "Sword",
    sprite: itemSprite("sword"),
    stackable: false,
    weapon: {
      damage: SWORD_DAMAGE,
      reach: SWORD_REACH,
      fireIntervalMs: SWORD_FIRE_MS,
    },
  });
}

// ---------------------------------------------------------------------------
// Placing figures
// ---------------------------------------------------------------------------
function placeNpc(
  id: string,
  name: string,
  modelFile: string,
  x: number,
  z: number,
  opts: { yaw?: number; tags?: string[] } = {},
): void {
  dispatch("npc", {
    id,
    x,
    z,
    y: FLOOR,
    name,
    model: modelFile,
    ...(opts.yaw === undefined ? {} : { yaw: opts.yaw }),
    ...(opts.tags === undefined ? {} : { tags: opts.tags }),
  });
}

function placeProp(
  id: string,
  name: string,
  modelFile: string,
  x: number,
  z: number,
  opts: { height?: number; solid?: boolean } = {},
): void {
  dispatch("prop", {
    id,
    model: modelFile,
    x,
    z,
    y: FLOOR,
    name,
    height: opts.height ?? 1.5,
    solid: opts.solid ?? false,
  });
}

// ---------------------------------------------------------------------------
// Standing up what is already owned
// ---------------------------------------------------------------------------
/** Stands every prop and helper the player already owns, once. */
function ensureOwned(): void {
  if (owned.has("litter-box") && !spawned.has("litter-box")) {
    spawned.add("litter-box");
    placeProp(
      "litter-box",
      "Litter Box",
      M_LITTER,
      LITTER_BOX.x,
      LITTER_BOX.z,
      {
        height: 1,
      },
    );
  }
  if (owned.has("cat-bed") && !spawned.has("cat-bed")) {
    spawned.add("cat-bed");
    placeProp("cat-bed", "Cat Bed", M_CAT_BED, CAT_BED.x, CAT_BED.z, {
      height: 0.6,
    });
  }
  if (owned.has("scratching-post") && !spawned.has("scratching-post")) {
    spawned.add("scratching-post");
    placeProp(
      "scratching-post",
      "Scratching Post",
      M_POST,
      SCRATCH_POST.x,
      SCRATCH_POST.z,
      {
        height: 2.4,
      },
    );
  }
  if (owned.has("catnip-plant") && !spawned.has("catnip-plant")) {
    spawned.add("catnip-plant");
    placeProp("catnip-plant", "Catnip Plant", M_CATNIP, CATNIP.x, CATNIP.z, {
      height: 1.6,
    });
    dispatch("prompt", {
      id: "harvest",
      entityId: "catnip-plant",
      verb: "Harvest",
      range: 6,
    });
  }
  if (owned.has("ms-floppa") && !spawned.has("ms-floppa")) {
    spawned.add("ms-floppa");
    placeNpc("ms-floppa", "Ms. Floppa", M_MS_FLOPPA, SPAWN.x - 6, SPAWN.z + 4);
    nextBabyAt = getNow() + BABY_MS;
  }
  if (owned.has("neko-maid") && !spawned.has("neko-maid")) {
    spawned.add("neko-maid");
    placeNpc("neko-maid", "Neko Maid", M_MAID, -6, -6);
    nextMaidAt = getNow() + MAID_MS;
  }
  if (owned.has("roommate") && !spawned.has("roommate")) {
    spawned.add("roommate");
    placeNpc("roommate", "Roommate", "npc-alex.zip", 18, 6);
    dispatch("prompt", {
      id: "collect-rent",
      entityId: "roommate",
      verb: "Collect rent",
      range: 6,
    });
  }
  if (owned.has("guard-doge") && !spawned.has("guard-doge")) {
    spawned.add("guard-doge");
    placeNpc("guard-doge", "Guard Doge", "npc-rook.zip", 0, -24);
  }
  if (owned.has("altar") && !spawned.has("altar")) {
    spawned.add("altar");
    placeProp("altar", "Faith Altar", M_ALTAR, ALTAR.x, ALTAR.z, {
      height: 1.6,
    });
    dispatch("prompt", {
      id: "offer",
      entityId: "altar",
      verb: "Offer",
      range: 7,
    });
  }
  if (owned.has("time-machine") && !spawned.has("time-machine")) {
    spawned.add("time-machine");
    placeProp(
      "time-machine",
      "Time Machine",
      M_TIME,
      TIME_MACHINE.x,
      TIME_MACHINE.z,
      {
        height: 3,
      },
    );
    dispatch("prompt", {
      id: "time-travel",
      entityId: "time-machine",
      verb: "Travel",
      range: 7,
    });
  }
  while (farmIds.length < farms) {
    const n = farmIds.length;
    const id = `farm-${n}`;
    farmIds.push(id);
    placeProp(
      id,
      "Catnip Farm",
      M_CATNIP,
      FARM_ORIGIN.x + n * FARM_STRIDE,
      FARM_ORIGIN.z,
      {
        height: 1.4,
      },
    );
    dispatch("prompt", {
      id: `harvest-${n}`,
      entityId: id,
      verb: "Harvest",
      range: 6,
    });
  }
}

// ---------------------------------------------------------------------------
// The shop
// ---------------------------------------------------------------------------
/** Draws the Interwebs shelf. */
function showShop(): void {
  dispatch("ui-panel", {
    player: "",
    id: "shop",
    title: "The Interwebs",
    anchor: "top-right",
  });
  dispatch("ui-label", {
    player: "",
    panel: "shop",
    id: "purse",
    text: `Money: $${Math.floor(money)}`,
  });
  for (const group of SHOP_GROUPS) {
    dispatch("ui-label", {
      player: "",
      panel: "shop",
      id: `h-${group.id}`,
      text: group.name,
    });
    for (const entry of group.items) {
      dispatch("ui-button", {
        player: "",
        panel: "shop",
        id: `buy-${entry.id}`,
        label: `${entry.name} — $${entry.price}`,
        value: entry.id,
      });
    }
  }
  dispatch("ui-button", {
    player: "",
    panel: "shop",
    id: "close",
    label: "Close",
    value: "close",
  });
}

/** Spends money on one shelf entry, or says why it cannot. */
function buy(id: string): void {
  const meal = food(id);
  if (meal !== undefined) {
    if (money < meal.price) {
      toast(`You need $${meal.price} for the ${meal.name}.`);
      return;
    }
    money -= meal.price;
    saveMoney();
    dispatch("item-give", { player: "", item: id, count: 1 });
    toast(`Bought ${meal.name}. Feed it to Floppa or drop it in the bowl.`);
    updateHud();
    showShop();
    return;
  }
  const entry = goods(id);
  if (entry === undefined) {
    return;
  }
  if (id === "farm-plot" ? farms >= 5 : owned.has(id)) {
    toast(`You already have the ${entry.name}.`);
    return;
  }
  if (id === "time-machine" && cubes < 1) {
    toast("The Time Machine needs a Time Cube. Reach full faith first.");
    return;
  }
  if (money < entry.price) {
    toast(`You need $${entry.price} for the ${entry.name}.`);
    return;
  }
  money -= entry.price;
  owned.add(id);
  if (id === "farm-plot") {
    farms += 1;
  }
  saveMoney();
  saveOwned();
  ensureOwned();
  updateHud();
  showShop();
  toast(`Bought the ${entry.name}.`);
  if (id === "sword") {
    dispatch("item-give", { player: "", item: "sword", count: 1 });
    dispatch("item-hold", { player: "", item: "sword" });
  }
}

// ---------------------------------------------------------------------------
// The faith altar and the endings
// ---------------------------------------------------------------------------
/** Draws the altar's offering rungs and, at full faith, the ascension. */
function showAltar(): void {
  dispatch("ui-panel", {
    player: "",
    id: "altar",
    title: "Faith Altar",
    anchor: "top-right",
  });
  dispatch("ui-bar", {
    player: "",
    panel: "altar",
    id: "faith",
    label: "Faith",
    value: Math.round(faith),
    max: 100,
  });
  dispatch("ui-label", {
    player: "",
    panel: "altar",
    id: "purse",
    text: `Money: $${Math.floor(money)}`,
  });
  FAITH_TIERS.forEach((tier, index) => {
    dispatch("ui-button", {
      player: "",
      panel: "altar",
      id: `tier-${index}`,
      label: `Offer $${tier.amount} — +${tier.percent}%`,
      value: `tier-${index}`,
    });
  });
  if (faith >= 100) {
    dispatch("ui-button", {
      player: "",
      panel: "altar",
      id: "ascend",
      label: "Ascend",
      value: "ascend",
    });
  }
  dispatch("ui-button", {
    player: "",
    panel: "altar",
    id: "close",
    label: "Close",
    value: "close",
  });
}

/** Offers one rung's money, raising faith and handing over the Time Cube. */
function offer(index: number): void {
  const tier = FAITH_TIERS[index];
  if (tier === undefined) {
    return;
  }
  if (faith >= 100) {
    toast("Floppa is already at full faith.");
    return;
  }
  if (money < tier.amount) {
    toast(`You need $${tier.amount} for that offering.`);
    return;
  }
  money -= tier.amount;
  faith = clampStat(faith + tier.percent, 0, 100);
  saveMoney();
  saveFaith();
  updateHud();
  showAltar();
  if (faith >= 100 && cubes < 1) {
    cubes = 1;
    saveProgress();
    narrate(
      "Altar",
      "Floppa's faith is whole. A Time Cube hums where the offering fell.",
    );
  }
}

/** Ends the game with `title` and `text`, and remembers how long the cat lived. */
function end(title: string, text: string, badge = ""): void {
  if (phase === "ending") {
    return;
  }
  phase = "ending";
  bestDays = Math.max(bestDays, days);
  saveProgress();
  if (badge !== "") {
    awardBadge(badge);
  }
  narrate("You", text);
  dispatch("ending", { player: "", title, text });
}

// ---------------------------------------------------------------------------
// The Time Machine
// ---------------------------------------------------------------------------
/** The bit each time stop owns in the travel mask. */
const TRAVEL_BIT: Record<string, number> = { past: 0, future: 1, eternity: 2 };

/** Takes the next stop through time, and the ending after the last. */
function timeTravel(): void {
  if (cubes < 1) {
    toast("The Time Machine needs a Time Cube.");
    return;
  }
  if (travelStop >= TIME_STOPS.length) {
    end(
      "Time Traveler",
      `You rode the machine through past, future and eternity, and Floppa rode it with you.`,
      "time-traveler",
    );
    return;
  }
  const stop = TIME_STOPS[travelStop];
  travelStop += 1;
  travelMask |= 1 << TRAVEL_BIT[stop.key];
  saveProgress();
  dispatch("time", { seconds: stop.seconds, speed: 0 });
  awardBadge(stop.badge);
  narrate(stop.title, stop.text);
  const modelFile =
    stop.key === "past" ? M_OOGA : stop.key === "future" ? M_SOLDIER : M_ELDER;
  placeNpc(
    `visitor-${stop.key}`,
    stop.title,
    modelFile,
    TIME_MACHINE.x - 8,
    TIME_MACHINE.z - 8,
  );
  backroomIds.push(`visitor-${stop.key}`);
  if (travelStop >= TIME_STOPS.length) {
    end(
      "Time Traveler",
      "The Elder Floppa closes his eyes, content. You have raised him, and will raise him again.",
      "time-traveler",
    );
  }
}

// ---------------------------------------------------------------------------
// The backrooms
// ---------------------------------------------------------------------------
/** Drops the player into the backrooms and stands what waits there. */
function enterBackrooms(): void {
  if (!isNight) {
    toast("The door only opens at night.");
    return;
  }
  phase = "backrooms";
  sanity = STAT_MAX;
  dispatch("ui-remove", { player: "", panel: "shop" });
  dispatch("player-place", {
    player: "",
    x: BACKROOM_ENTRY.x,
    z: BACKROOM_ENTRY.z,
    y: FLOOR,
  });
  dispatch("hud", {
    player: "",
    id: "sanity",
    kind: "bar",
    label: "Sanity",
    value: STAT_MAX,
    max: STAT_MAX,
  });
  placeNpc(
    "bingus",
    "Screeching Bingus",
    M_BINGUS,
    BACKROOM_ENTRY.x + 24,
    BACKROOM_ENTRY.z + 8,
  );
  placeNpc("dark-web", "Dark Web", "npc-brit.zip", DARK_WEB.x, DARK_WEB.z);
  placeProp(
    "back-exit",
    "Way Home",
    M_BACKROOM_DOOR,
    BACKROOM_EXIT.x,
    BACKROOM_EXIT.z,
    {
      height: 3,
    },
  );
  placeProp("dark-stall", "Dark Web", M_DARK_WEB, DARK_WEB.x, DARK_WEB.z - 6, {
    height: 2.4,
  });
  backroomIds.push("bingus", "dark-web", "back-exit", "dark-stall");
  dispatch("prompt", {
    id: "leave-back",
    entityId: "back-exit",
    verb: "Leave",
    range: 7,
  });
  narrate(
    "The Backrooms",
    "Yellow rooms without end. Keep your mind together and find the way out.",
  );
  dispatch("sound", { player: "", name: "wave-eerie", volume: 0.7 });
}

/** Takes the player out of the backrooms, home to the house. */
function leaveBackrooms(penalty: number): void {
  phase = "play";
  bingus = null;
  for (const id of backroomIds) {
    dispatch("npc-remove", { id });
    dispatch("prop-remove", { id });
  }
  backroomIds.length = 0;
  dispatch("prompt-remove", { id: "leave-back" });
  dispatch("hud-remove", { player: "", id: "sanity" });
  dispatch("player-place", { player: "", x: SPAWN.x, z: SPAWN.z, y: FLOOR });
  if (penalty > 0) {
    hunger = clampStat(hunger - penalty, STAT_MIN, STAT_MAX);
    toast("You wake on the living-room floor, shaken.");
  }
  updateHud();
}

// ---------------------------------------------------------------------------
// Feeding and cleaning
// ---------------------------------------------------------------------------
/** Puts one held meal into the bowl, or eats it and waits for the cat. */
function fillBowl(id: string): void {
  if (bowlFood >= BOWL_CAPACITY) {
    toast("The bowl is already full.");
    return;
  }
  bowlFood += 1;
  dispatch("item-take", { player: "", item: id, count: 1 });
  toast(`Put the ${food(id)?.name ?? "food"} in the bowl.`);
}

/** Feeds one meal straight to the cat. */
function feedFloppa(id: string): void {
  const meal = food(id);
  if (meal === undefined || floppa === null) {
    return;
  }
  hunger = clampStat(hunger + meal.hunger, STAT_MIN, STAT_MAX);
  happiness = clampStat(happiness + meal.happiness, STAT_MIN, STAT_MAX);
  dispatch("item-take", { player: "", item: id, count: 1 });
  schedulePoop();
  updateHud();
  toast(`Floppa eats the ${meal.name}.`);
}

/** Feeds catnip, opening the four-times-money window. */
function catnip(): void {
  if (floppa === null) {
    return;
  }
  dispatch("item-take", { player: "", item: "catnip", count: 1 });
  catnipUntil = getNow() + CATNIP_MS;
  happiness = clampStat(happiness + 15, STAT_MIN, STAT_MAX);
  updateHud();
  toast(
    "Floppa's eyes go wide. Everything pays four times as much for a minute.",
  );
}

/** Damages the cat, ending the game in the original's own way when it empties. */
function hurtFloppa(amount: number, cause: string): void {
  hunger = clampStat(hunger - amount, STAT_MIN, STAT_MAX);
  happiness = clampStat(happiness - amount / 2, STAT_MIN, STAT_MAX);
  updateHud();
  if (hunger <= 0 && phase !== "ending") {
    if (floppa !== null) {
      dispatch("explosion", {
        id: "floppa-boom",
        x: floppa.x,
        z: floppa.z,
        y: FLOOR,
        radius: 5,
      });
      dispatch("npc-remove", { id: "floppa" });
      floppa = null;
    }
    dispatch("sound", { player: "", name: "zombie-die", volume: 1 });
    end(
      "You Monster",
      `You let Floppa starve to ${cause}. There was a small, sad explosion.`,
      "you-monster",
    );
  }
}

/** Schedules the mess a meal makes a few seconds later. */
function schedulePoop(): void {
  pendingPoops += 1;
  nextPoopAt = getNow() + POOP_DELAY_MS;
}

/** Lays one dropping, in the litter box when there is one, else where the cat is. */
function dropPoop(): void {
  if (poopIds.length >= MAX_POOP || floppa === null) {
    return;
  }
  const inBox = owned.has("litter-box");
  const x = inBox ? LITTER_BOX.x : floppa.x + 2;
  const z = inBox ? LITTER_BOX.z : floppa.z + 2;
  const id = `poop-${poopIds.length}-${Math.floor(getNow())}`;
  placeProp(id, "Poop", M_POOP, x, z, { height: 0.4 });
  poopIds.push(id);
}

/** Cleans one dropping. */
function cleanPoop(id: string): void {
  const at = poopIds.indexOf(id);
  if (at < 0) {
    return;
  }
  poopIds.splice(at, 1);
  dispatch("prop-remove", { id });
}

// ---------------------------------------------------------------------------
// Raids
// ---------------------------------------------------------------------------
/** Stands the wave dawn of `day` brings. */
function startRaid(day: number): void {
  const wave = raidForDay(day);
  if (wave === null || floppa === null) {
    return;
  }
  dispatch("sound", { player: "", name: "wave-eerie", volume: 0.8 });
  narrate(
    "Raiders",
    "A pack of bandits pours over the fence at dawn, after your Floppa.",
  );
  for (let n = 0; n < wave.count; n++) {
    const id = `bandit-${day}-${n}`;
    const x = -60 + ((n * 37) % 120);
    const z = -108;
    raiders.push({
      id,
      x,
      z,
      hp: wave.hp,
      speed: wave.speed,
      damage: wave.damage,
      nextAttackAt: 0,
    });
    placeNpc(id, "Bandit", M_BANDIT, x, z, { tags: ["raider"] });
  }
}

/** Steps every raider toward the cat and lets it strike when it arrives. */
function stepRaiders(now: number, dtMs: number): void {
  if (floppa === null) {
    return;
  }
  const player = players()[0];
  for (const raider of raiders) {
    const dx = floppa.x - raider.x;
    const dz = floppa.z - raider.z;
    const distance = Math.hypot(dx, dz);
    if (distance > RAID_STRIKE_RANGE) {
      const travel = Math.min(
        distance - RAID_STRIKE_RANGE,
        raider.speed * (dtMs / 1_000),
      );
      if (travel > 0) {
        raider.x += (dx / distance) * travel;
        raider.z += (dz / distance) * travel;
      }
      dispatch("npc", {
        id: raider.id,
        x: raider.x,
        z: raider.z,
        y: FLOOR,
        name: "Bandit",
        model: M_BANDIT,
        yaw: Math.atan2(dx, dz),
        live: true,
        tags: ["raider"],
      });
    }
    if (now >= raider.nextAttackAt && distance <= RAID_STRIKE_RANGE + 0.5) {
      raider.nextAttackAt = now + RAID_STRIKE_MS;
      hurtFloppa(raider.damage, "at the hands of a bandit");
    }
    // A Guard Doge bites the nearest raider every tick it stands in range.
    if (owned.has("guard-doge") && player !== undefined) {
      if (Math.hypot(player.x - raider.x, player.z - raider.z) < DOGE_RANGE) {
        raider.hp -= DOGE_DAMAGE;
      }
    }
    if (raider.hp <= 0) {
      fellRaider(raider);
    }
  }
  raiders = raiders.filter((r) => r.hp > 0);
}

/** Takes one raider down and pays for it. */
function fellRaider(raider: {
  id: string;
  x: number;
  z: number;
  loot?: number;
}): void {
  dispatch("npc-die", { id: raider.id });
  dispatch("sound", { player: "", name: "zombie-die", volume: 0.7 });
  money += 15 * multiplier();
  saveMoney();
  updateHud();
}

/** Applies a sword blow to a raider. */
function hitRaider(id: string, amount: number): void {
  const raider = raiders.find((r) => r.id === id);
  if (raider === undefined) {
    return;
  }
  raider.hp -= amount;
  if (raider.hp <= 0) {
    fellRaider(raider);
    raiders = raiders.filter((r) => r.id !== id);
  }
}

// ---------------------------------------------------------------------------
// The cat's own behaviour
// ---------------------------------------------------------------------------
/** Where the player the demo follows stands, or undefined. */
function players(): Array<{ x: number; y: number; z: number }> {
  return getPlayers();
}

/** Moves the cat: to the bowl when hungry, else loosely toward the player. */
function stepFloppa(dtMs: number): void {
  if (floppa === null) {
    return;
  }
  const player = players()[0];
  let targetX = floppa.x;
  let targetZ = floppa.z;
  if (hunger < 70 && bowlFood > 0) {
    targetX = BOWL.x;
    targetZ = BOWL.z;
  } else if (player !== undefined) {
    const distance = Math.hypot(player.x - floppa.x, player.z - floppa.z);
    if (distance > FOLLOW_RANGE) {
      targetX = player.x;
      targetZ = player.z;
    }
  }
  const dx = targetX - floppa.x;
  const dz = targetZ - floppa.z;
  const distance = Math.hypot(dx, dz);
  if (distance > EAT_RANGE) {
    const travel = Math.min(distance - EAT_RANGE, 3 * (dtMs / 1_000));
    floppa.x += (dx / distance) * travel;
    floppa.z += (dz / distance) * travel;
    floppa.yaw = Math.atan2(dx, dz);
    dispatch("npc", {
      id: "floppa",
      x: floppa.x,
      z: floppa.z,
      y: FLOOR,
      name: "Floppa",
      model: M_FLOPPA,
      yaw: floppa.yaw,
      live: true,
    });
  } else if (hunger < 70 && bowlFood > 0) {
    bowlFood -= 1;
    hunger = clampStat(hunger + BOWL_HUNGER, STAT_MIN, STAT_MAX);
    happiness = clampStat(happiness + BOWL_HAPPINESS, STAT_MIN, STAT_MAX);
    schedulePoop();
    updateHud();
    toast("Floppa eats from the bowl.");
  }
}

// ---------------------------------------------------------------------------
// The opening
// ---------------------------------------------------------------------------
/** Stands the house, the cat, and everything the player already owns. */
function boot(): void {
  defineItems();
  dispatch("time", { seconds: DAY_SECONDS, speed: 0 });
  dispatch("void", { y: -200 });

  // The house's furniture, and the two fixtures the loop needs.
  placeProp("player-bed", "Bed", "bed.zip", -24, 8, { height: 1 });
  placeProp("sofa", "Sofa", "sofa.zip", -6, 8, { height: 1.2 });
  placeProp("tv", "TV", "tv.zip", -6, 12, { height: 1.6 });
  placeProp("table", "Table", "table.zip", 6, 4, { height: 1 });
  placeProp("chair", "Chair", "chair.zip", 6, 0, { height: 1.2 });
  placeProp("stove", "Stove", "stove.zip", STOVE.x, STOVE.z, { height: 1.4 });
  placeProp("fridge", "Fridge", "fridge.zip", FRIDGE.x, FRIDGE.z, {
    height: 2.2,
  });
  placeProp("computer", "The Interwebs", M_COMPUTER, COMPUTER.x, COMPUTER.z, {
    height: 2,
  });
  placeProp("bowl", "Food Bowl", M_BOWL, BOWL.x, BOWL.z, { height: 0.6 });
  placeProp(
    "backroom-door",
    "A Door",
    M_BACKROOM_DOOR,
    BACKROOM_DOOR.x,
    BACKROOM_DOOR.z,
    {
      height: 3,
    },
  );
  dispatch("prompt", {
    id: "open-shop",
    entityId: "computer",
    verb: "Shop",
    range: 6,
  });
  dispatch("prompt", {
    id: "backrooms",
    entityId: "backroom-door",
    verb: "Enter",
    range: 7,
  });

  floppa = { x: SPAWN.x + 6, z: SPAWN.z, yaw: 0 };
  placeNpc("floppa", "Floppa", M_FLOPPA, floppa.x, floppa.z);

  ensureOwned();
  updateHud();

  dispatch("cutscene", {
    player: "",
    shots: [
      {
        at: [0, FLOOR + 12, 34],
        look: [0, FLOOR + 2, 0],
        durationMs: 1_800,
        ease: "smooth",
      },
      {
        at: [-20, FLOOR + 14, -44],
        look: [0, FLOOR + 2, -10],
        durationMs: 1_600,
        ease: "smooth",
      },
    ],
  });
  narrate(
    "You",
    "You found a stray Floppa. Feed it, pet it, clean up after it — or it will not last the week.",
  );

  nextHungerAt = getNow() + HUNGER_TICK_MS;
  nextHappyAt = getNow() + HAPPY_TICK_MS;
  nextDayAt = getNow() + DAY_MS;

  requestData("player", K_MONEY, "load-money", "");
  requestData("player", K_OWNED, "load-owned", "");
  requestData("player", K_FAITH, "load-faith", "");
  requestData("player", K_DAYS, "load-days", "");
  requestData("player", K_BEST, "load-best", "");
  requestData("player", K_RENT, "load-rent", "");
  requestData("player", K_CUBES, "load-cubes", "");
  requestData("player", K_FARMS, "load-farms", "");
  requestData("player", K_TRAVEL, "load-travel", "");
}

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------
/** Answers one saved value arriving. */
function loaded(requestId: string, found: boolean, value: unknown): void {
  if (requestId === "load-money" && found) {
    money = Number(value);
  } else if (requestId === "load-owned" && found) {
    const mask = Number(value);
    GOODS.forEach((g, i) => {
      if ((mask >> i) & 1) {
        owned.add(g.id);
      }
    });
  } else if (requestId === "load-faith" && found) {
    faith = Number(value);
  } else if (requestId === "load-days" && found) {
    days = Number(value);
  } else if (requestId === "load-best" && found) {
    bestDays = Number(value);
  } else if (requestId === "load-rent" && found) {
    rent = Number(value);
  } else if (requestId === "load-cubes" && found) {
    cubes = Number(value);
  } else if (requestId === "load-farms" && found) {
    farms = Number(value);
  } else if (requestId === "load-travel" && found) {
    travelMask = Number(value);
    travelStop = 0;
    for (const stop of TIME_STOPS) {
      if ((travelMask >> TRAVEL_BIT[stop.key]) & 1) {
        travelStop += 1;
      }
    }
  }
  ensureOwned();
  updateHud();
}

/** Answers one press on a script panel. */
function clicked(panel: string, value: string): void {
  if (value === "close") {
    dispatch("ui-remove", { player: "", panel });
    return;
  }
  if (panel === "shop") {
    buy(value);
    return;
  }
  if (panel === "altar") {
    if (value === "ascend") {
      dispatch("ui-remove", { player: "", panel: "altar" });
      end(
        "Ascension",
        "Floppa rises from the altar in a column of light and is gone, at peace, and yours forever.",
        "ascension",
      );
      return;
    }
    if (value.startsWith("tier-")) {
      offer(Number(value.slice(5)));
    }
  }
}

/** Answers one use of an entity, with whatever the player holds. */
function used(entityId: string, item: string): void {
  if (entityId === "floppa" || entityId.startsWith("baby-")) {
    if (item === "catnip") {
      catnip();
      return;
    }
    const meal = food(item);
    if (meal !== undefined) {
      feedFloppa(item);
      return;
    }
    pet();
    return;
  }
  if (entityId === "bowl") {
    if (food(item) !== undefined) {
      fillBowl(item);
    } else {
      toast(`The bowl holds ${bowlFood}/${BOWL_CAPACITY} meals.`);
    }
    return;
  }
  if (entityId.startsWith("poop-")) {
    cleanPoop(entityId);
    toast("Cleaned up.");
    return;
  }
  if (entityId.startsWith("money-bag-")) {
    money += BAG_MONEY * multiplier();
    saveMoney();
    dispatch("prop-remove", { id: entityId });
    updateHud();
    toast(`+$${Math.floor(BAG_MONEY * multiplier())} in cash.`);
  }
}

/** Pets the cat: happiness, money, and the occasional dropped bag. */
function pet(): void {
  if (floppa === null) {
    return;
  }
  happiness = clampStat(happiness + 5, STAT_MIN, STAT_MAX);
  petCount += 1;
  money += PET_MONEY * multiplier();
  saveMoney();
  if (petCount % BAG_EVERY === 0) {
    const id = `money-bag-${petCount}`;
    placeProp(id, "Money Bag", M_BAG, floppa.x + 3, floppa.z + 3, {
      height: 1,
    });
  }
  updateHud();
}

/** Steps the whole simulation one tick. */
function step(now: number, dtMs: number): void {
  if (phase === "ending") {
    return;
  }

  // The care loop.
  if (now >= nextHungerAt) {
    nextHungerAt += HUNGER_TICK_MS;
    hunger = clampStat(hunger - 1, STAT_MIN, STAT_MAX);
    if (hunger <= 0) {
      hurtFloppa(1, "in a quiet room");
    } else {
      updateHud();
    }
  }
  if (now >= nextHappyAt) {
    nextHappyAt += HAPPY_TICK_MS;
    happiness = clampStat(happiness - 1, STAT_MIN, STAT_MAX);
    updateHud();
  }

  // The mess a meal made.
  if (pendingPoops > 0 && now >= nextPoopAt) {
    pendingPoops -= 1;
    dropPoop();
    nextPoopAt = now + POOP_DELAY_MS;
  }

  stepFloppa(dtMs);

  // The scheduled helpers.
  if (owned.has("neko-maid") && now >= nextMaidAt) {
    nextMaidAt = now + MAID_MS;
    bowlFood = BOWL_CAPACITY;
    if (poopIds.length > 0) {
      const id = poopIds[0];
      if (id !== undefined) {
        cleanPoop(id);
      }
    }
    toast("The Neko Maid tends to Floppa.");
  }
  if (
    owned.has("ms-floppa") &&
    now >= nextBabyAt &&
    babies.length < MAX_BABIES &&
    floppa !== null
  ) {
    nextBabyAt = now + BABY_MS;
    const id = `baby-${babies.length}`;
    const baby = { id, x: floppa.x + 3, z: floppa.z - 3 };
    babies.push(baby);
    placeNpc(id, "Kitten", M_BABY, baby.x, baby.z);
    toast("Ms. Floppa has a kitten!");
  }

  // The day turning, and the raids dawn brings.
  if (!isNight && now >= nextDayAt) {
    days += 1;
    bestDays = Math.max(bestDays, days);
    saveProgress();
    updateHud();
    startRaid(days);
    isNight = true;
    nextNightAt = now + NIGHT_MS;
    dispatch("time", { seconds: NIGHT_SECONDS, speed: 0 });
    narrate(
      "Night",
      "The sun is down. The west door in the fence glows yellow.",
    );
  } else if (isNight && now >= nextNightAt) {
    isNight = false;
    nextDayAt = now + DAY_MS;
    dispatch("time", { seconds: DAY_SECONDS, speed: 0 });
    narrate("Morning", "Another day. Floppa is still here.");
  }

  if (raiders.length > 0) {
    stepRaiders(now, dtMs);
  }

  // The backrooms.
  if (phase === "backrooms") {
    if (now >= nextSanityAt) {
      nextSanityAt = now + SANITY_TICK_MS;
      const player = players()[0];
      const bingus = bingusPos();
      let drain = 2;
      if (player !== undefined && bingus !== null) {
        const distance = Math.hypot(player.x - bingus.x, player.z - bingus.z);
        if (distance < BINGUS_RANGE) {
          drain = 5;
          dispatch("sound", { player: "", name: "zombie-growl", volume: 0.5 });
        }
      }
      sanity = clampStat(sanity - drain, STAT_MIN, STAT_MAX);
      dispatch("hud", {
        player: "",
        id: "sanity",
        kind: "bar",
        label: "Sanity",
        value: sanity,
        max: STAT_MAX,
      });
      if (sanity <= 0) {
        leaveBackrooms(5);
      }
    }
    stepBingus();
  }

  dispatch("timer", { id: "rf-tick", afterMs: TICK_MS });
}

/** The shared-clock moment the next sanity point falls. */
let nextSanityAt = 0;
/** Where the Screeching Bingus stands, or null while none does. */
let bingus: { x: number; z: number } | null = null;

/** The Screeching Bingus's live position, or null. */
function bingusPos(): { x: number; z: number } | null {
  return bingus;
}

/** Walks the Screeching Bingus at whoever is in the backrooms. */
function stepBingus(): void {
  const player = players()[0];
  if (player === undefined) {
    return;
  }
  if (bingus === null) {
    bingus = { x: BACKROOM_ENTRY.x + 24, z: BACKROOM_ENTRY.z + 8 };
  }
  const dx = player.x - bingus.x;
  const dz = player.z - bingus.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 2) {
    const travel = Math.min(distance - 2, 1.6 * (TICK_MS / 1_000));
    bingus.x += (dx / distance) * travel;
    bingus.z += (dz / distance) * travel;
  }
  dispatch("npc", {
    id: "bingus",
    x: bingus.x,
    z: bingus.z,
    y: FLOOR,
    name: "Screeching Bingus",
    model: M_BINGUS,
    yaw: Math.atan2(dx, dz),
    live: true,
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
onTick((_clockMs, events) => {
  const now = getNow();
  if (!booted) {
    booted = true;
    boot();
    dispatch("timer", { id: "rf-tick", afterMs: TICK_MS });
    return;
  }

  let ticked = false;
  for (const event of events) {
    if (event.kind === "timer" && event.timerId === "rf-tick") {
      ticked = true;
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      if (event.entityId === "computer") {
        showShop();
      } else if (event.entityId === "altar") {
        showAltar();
      } else if (event.entityId === "time-machine") {
        timeTravel();
      } else if (event.entityId === "backroom-door") {
        enterBackrooms();
      } else {
        used(event.entityId, event.item ?? "");
      }
    } else if (
      event.kind === "prompt-triggered" &&
      event.promptId !== undefined
    ) {
      const id = event.promptId;
      if (id === "open-shop") {
        showShop();
      } else if (id === "offer") {
        showAltar();
      } else if (id === "time-travel") {
        timeTravel();
      } else if (id === "backrooms") {
        enterBackrooms();
      } else if (id === "leave-back") {
        leaveBackrooms(0);
      } else if (id === "collect-rent") {
        money += rent;
        saveMoney();
        rent = Math.min(RENT_MAX, rent * 2);
        saveProgress();
        updateHud();
        toast(`The roommate pays $${rent / 2} in rent.`);
      } else if (id === "harvest" || id.startsWith("harvest-")) {
        dispatch("item-give", { player: "", item: "catnip", count: 1 });
        toast("Harvested catnip.");
      }
    } else if (event.kind === "ui-clicked" && event.panel !== undefined) {
      clicked(event.panel, event.value ?? "");
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      if (event.npcId === "dark-web") {
        dispatch("dialog", {
          player: "",
          npcId: "dark-web",
          prompt: "Sss. What do you need, pet-owner?",
          options: ["Almond water — $30", "Sanity pill — $60", "Nothing"],
        });
      } else if (event.npcId === "floppa") {
        pet();
      } else if (event.npcId === "roommate") {
        narrate("Roommate", `Rent's due. Use me to collect your $${rent}.`);
      } else if (event.npcId.startsWith("visitor-")) {
        narrate("Visitor", "The machine hums, and the moment passes.");
      }
    } else if (event.kind === "npc-choose" && event.npcId === "dark-web") {
      if (event.option === 0 && money >= 30) {
        money -= 30;
        sanity = clampStat(sanity + 40, STAT_MIN, STAT_MAX);
        saveMoney();
      } else if (event.option === 1 && money >= 60) {
        money -= 60;
        sanity = STAT_MAX;
        saveMoney();
      }
      updateHud();
      dispatch("dialog-close", { player: "", npcId: "dark-web" });
    } else if (event.kind === "entity-hit" && event.entityId !== undefined) {
      hitRaider(event.entityId, event.amount);
    } else if (event.kind === "item-used" && event.item !== undefined) {
      if (event.item === "catnip") {
        toast("Feed the catnip to Floppa.");
      } else if (food(event.item) !== undefined) {
        toast("Feed it to Floppa, or drop it in the bowl.");
      }
    } else if (event.kind === "data-loaded") {
      loaded(event.requestId, event.found, event.value);
    }
  }

  if (ticked) {
    step(now, TICK_MS);
  }
});

/** The world's plan: the house, the yard, and the backrooms, laid down first. */
onPlan(() => JSON.stringify(worldShapes()));
