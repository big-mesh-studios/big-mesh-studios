// The "Cube Cavern" demo's place script — a port of zKevin and ClicheChloe's
// randomly generated dungeon crawler. The player wakes in a walled hub with a
// shopkeeper and a crafting bench, opens the cavern door, and descends three
// floors of a themed maze: fight the cavern's monsters, loot chests, find a
// key, and take the hatch down, until the last floor's ninja boss falls.
//
// The run is the original's own shape — three floors, a themed enemy pool, a
// mid-run shop, a key-locked exit, and a two-form boss — laid over this
// world's primitives. A floor's rooms and walls are a `structure` the script
// stamps at run time; enemies are NPCs the demo's own `cube-cavern-mobs`
// module walks; weapons are item weapons (ADR 0051); health, coins, keys,
// materials, hats and the deepest floor reached are remembered with the data
// helpers (ADR 0076).
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler takes voxel
// coordinates; props, NPCs, and the player take world coordinates.
import {
  createLight,
  createNpc,
  createParticle,
  createProp,
  dispatch,
  getNow,
  getPlayers,
  onPlan,
  onTick,
  requestData,
  saveAccountData,
  savePlayerData,
  type ModelsByName,
} from "voxelscape";
import {
  FLOORS_PER_RUN,
  FLOOR,
  HUB_CRAFT,
  HUB_DOOR,
  HUB_ENTRANCE,
  HUB_KEEPER_MODEL,
  HUB_SIGN,
  HUB_SHOPKEEPER,
  VOID_Y,
  buildFloor,
  hubShapes,
  makeRng,
  type FloorPlan,
} from "./cube-cavern-level";
import {
  ITEMS,
  RECIPES,
  rollChest,
  rollDrop,
  shopStock,
  type ItemDef,
} from "./cube-cavern-items";
import {
  allMobs,
  damageMob,
  forgetMobs,
  killMob,
  spawnMob,
  stepMobs,
  type MobState,
} from "./cube-cavern-mobs";

/** How often the cavern steps, in milliseconds. */
const TICK_MS = 150;
/** Hit points a run begins with, before any life plants. */
const START_HEALTH = 6;
/** The floor a death penalty can never take max health below. */
const MIN_HEALTH = 5;
/** Coins a brand-new player is given, so a first run can buy a key. */
const START_COINS = 15;
/** The boss's hit points, and how often it swings between forms. */
const BOSS_HEALTH = 100;
const BOSS_ATTACK_MS = 2_600;
/** Coins and hats the boss drop. */
const BOSS_COINS = 100;
/** How many slots the shop stocks. */
const SHOP_SLOTS = 8;

/** A model name checked against the demo's attached models at the type level. */
const model = (name: string): keyof ModelsByName => name as keyof ModelsByName;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let booted = false;
let phase: "hub" | "run" = "hub";
let floor = 0;
let runSeed = 0;
let plan: FloorPlan | null = null;

let health = START_HEALTH;
let maxHealth = START_HEALTH;
let coins = START_COINS;
let keys = 0;
let materials = 0;
/** The deepest floor this player has ever reached, remembered across runs. */
let deepest = 0;
let hats = 0;

const chestLoot = new Map<
  string,
  { coins: number; item?: string; key: boolean }
>();
let shop: ItemDef[] = [];

/** Entity ids the current cavern stood, so a floor change can take them down. */
const cavernProps: string[] = [];
const cavernNpcs: string[] = [];
const cavernLights: string[] = [];
const cavernParticles: string[] = [];

/** The boss's live state, or null while none stands. */
let boss: {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  form: number;
  nextAt: number;
} | null = null;

// Data keys, one per remembered value.
const KEY_COINS = "cc-coins";
const KEY_HEALTH = "cc-mhp";
const KEY_DEPTH = "cc-depth";
const KEY_HATS = "cc-hats";

// ---------------------------------------------------------------------------
// Small dispatchers
// ---------------------------------------------------------------------------
function toast(text: string): void {
  dispatch("toast", { player: "", text });
}
function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}
function saveCoins(): void {
  savePlayerData(KEY_COINS, coins);
}
function saveHealth(): void {
  savePlayerData(KEY_HEALTH, maxHealth);
}
function saveDepth(): void {
  savePlayerData(KEY_DEPTH, deepest);
}
function saveHats(): void {
  saveAccountData(KEY_HATS, hats);
}

/** Declares every item the demo can hand out, so a give or hold can resolve. */
function defineItems(): void {
  for (const def of Object.values(ITEMS)) {
    dispatch("item-define", {
      id: def.id,
      name: def.name,
      sprite: "",
      stackable: def.weapon === undefined,
      ...(def.weapon === undefined ? {} : { weapon: def.weapon }),
    });
  }
}

/** Shows the health, coin, key and floor readouts for the current state. */
function updateHud(): void {
  dispatch("hud", {
    player: "",
    id: "hp",
    kind: "bar",
    label: "Health",
    value: health,
    max: maxHealth,
  });
  dispatch("hud", {
    player: "",
    id: "coins",
    kind: "text",
    label: "Coins",
    text: `${coins}`,
  });
  dispatch("hud", {
    player: "",
    id: "keys",
    kind: "text",
    label: "Keys",
    text: `${keys}`,
  });
  dispatch("hud", {
    player: "",
    id: "floor",
    kind: "text",
    label: "Depth",
    text: phase === "hub" ? "Hub" : `Floor ${floor}/${FLOORS_PER_RUN}`,
  });
}

/** Takes hit points off the player, killing them when none remain. */
function hurt(amount: number, source: string): void {
  if (phase !== "run") {
    return;
  }
  health -= amount;
  updateHud();
  if (health <= 0) {
    health = 0;
    updateHud();
    dispatch("player-kill", { player: "", cause: source });
  }
}

/** Restores hit points, never past the maximum. */
function heal(amount: number): void {
  health = Math.min(maxHealth, health + amount);
  updateHud();
}

// ---------------------------------------------------------------------------
// Loot
// ---------------------------------------------------------------------------
/** Handles one enemy's death drop: coins, a key, a material, an item, or a hat. */
function grantDrop(): void {
  const drop = rollDrop(makeRng(getNow() ^ (allMobs().length * 2_654_435_761)));
  if (drop.kind === "coins") {
    coins += drop.amount;
    saveCoins();
    toast(`+${drop.amount} coins.`);
  } else if (drop.kind === "key") {
    keys += 1;
    toast("A key drops!");
  } else if (drop.kind === "material") {
    materials += 1;
    toast(`+1 crafting stock.`);
  } else if (drop.kind === "hat") {
    hats += 1;
    saveHats();
    toast("You found a Cave Cavern cap!");
  } else {
    grantItem(drop.item);
  }
  updateHud();
}

/** Gives one item, holding it if it is a weapon the player can swing. */
function grantItem(id: string): void {
  const def = ITEMS[id];
  if (def === undefined) {
    return;
  }
  dispatch("item-give", { player: "", item: id, count: 1 });
  dispatch("item-hold", { player: "", item: id });
  toast(`Picked up: ${def.name}.`);
}

// ---------------------------------------------------------------------------
// Shop and crafting
// ---------------------------------------------------------------------------
/** Draws the shop's panel, its stock and its Close button. */
function showShop(): void {
  dispatch("ui-panel", {
    player: "",
    id: "shop",
    title: "Cavern Shop",
    anchor: "top-right",
  });
  dispatch("ui-label", {
    player: "",
    panel: "shop",
    id: "purse",
    text: `Coins: ${coins}`,
  });
  shop.forEach((item, index) => {
    dispatch("ui-button", {
      player: "",
      panel: "shop",
      id: `buy-${index}`,
      label: `${item.name} — ${item.price}c`,
      value: item.id,
    });
  });
  dispatch("ui-button", {
    player: "",
    panel: "shop",
    id: "close",
    label: "Close",
    value: "close",
  });
}

/** Draws the crafting bench's panel and its recipes. */
function showCraft(): void {
  dispatch("ui-panel", {
    player: "",
    id: "craft",
    title: "Crafting Bench",
    anchor: "bottom-right",
  });
  dispatch("ui-label", {
    player: "",
    panel: "craft",
    id: "stock",
    text: `Stock: ${materials}`,
  });
  RECIPES.forEach((recipe, index) => {
    dispatch("ui-button", {
      player: "",
      panel: "craft",
      id: `make-${index}`,
      label: recipe.name,
      value: recipe.id,
    });
  });
  dispatch("ui-button", {
    player: "",
    panel: "craft",
    id: "close",
    label: "Close",
    value: "close",
  });
}

/** Spends coins on one shop item, or says why it cannot. */
function buy(id: string): void {
  const def = ITEMS[id];
  if (def === undefined) {
    return;
  }
  if (coins < def.price) {
    toast(`You need ${def.price} coins for the ${def.name}.`);
    return;
  }
  coins -= def.price;
  saveCoins();
  applyItem(def);
  updateHud();
  showShop();
}

/** Applies one bought or crafted item's effect. */
function applyItem(def: ItemDef): void {
  if (def.id === "key") {
    keys += 1;
    return;
  }
  if (def.material === true) {
    materials += 1;
    toast(`+1 crafting stock.`);
    return;
  }
  if (def.maxHealthUp !== undefined) {
    maxHealth += def.maxHealthUp;
    health = Math.min(maxHealth, health + def.maxHealthUp);
    saveHealth();
    toast(`Max health is now ${maxHealth}.`);
    return;
  }
  if (def.heal !== undefined) {
    heal(def.heal);
    toast(`Healed ${def.heal}.`);
    return;
  }
  if (def.speed !== undefined) {
    dispatch("player-speed", { player: "", multiplier: def.speed });
    toast("You feel lighter on your feet.");
    return;
  }
  if (def.coinValue !== undefined) {
    coins += def.coinValue;
    saveCoins();
    return;
  }
  if (def.weapon !== undefined) {
    grantItem(def.id);
  }
}

/** Spends crafting stock on one recipe, or says why it cannot. */
function craft(id: string): void {
  const recipe = RECIPES.find((r) => r.id === id);
  if (recipe === undefined) {
    return;
  }
  if (materials < recipe.materials) {
    toast(`You need ${recipe.materials} stock to make that.`);
    return;
  }
  materials -= recipe.materials;
  grantItem(recipe.output);
  showCraft();
}

// ---------------------------------------------------------------------------
// The cavern
// ---------------------------------------------------------------------------
/** Takes the current cavern down: its structure, enemies, props and lights. */
function clearCavern(): void {
  dispatch("structure-remove", { id: "cavern" });
  for (const id of cavernProps) {
    dispatch("prop-remove", { id });
  }
  for (const id of cavernNpcs) {
    dispatch("npc-remove", { id });
  }
  for (const id of cavernLights) {
    dispatch("light-remove", { id });
  }
  for (const id of cavernParticles) {
    dispatch("particle-remove", { id });
  }
  cavernProps.length = 0;
  cavernNpcs.length = 0;
  cavernLights.length = 0;
  cavernParticles.length = 0;
  chestLoot.clear();
  forgetMobs();
  boss = null;
  dispatch("prompt-remove", { id: "exit-prompt" });
  dispatch("prompt-remove", { id: `shop-${floor}` });
  dispatch("hud-remove", { player: "", id: "boss" });
}

/** Stands one floor: its rooms, enemies, torches, chests, shop and exit. */
function buildFloorNow(): void {
  const next = buildFloor(runSeed, floor, "yellow");
  plan = next;
  dispatch("structure", { id: "cavern", shapes: [...next.shapes] });

  next.torchSpawns.forEach((spot, index) => {
    const id = `torch-${index}`;
    createProp({
      id,
      model: model("cave-torch"),
      x: spot.x,
      z: spot.z,
      y: FLOOR,
      name: "Torch",
      height: 2,
      solid: false,
    });
    createLight({
      id,
      x: spot.x,
      y: FLOOR + 2,
      z: spot.z,
      color: next.theme.glow,
      range: 12,
      intensity: 1.4,
    });
    createParticle({
      id,
      x: spot.x,
      y: FLOOR + 2,
      z: spot.z,
      kind: "flame",
      loop: true,
    });
    cavernProps.push(id);
    cavernLights.push(id);
    cavernParticles.push(id);
  });

  next.chestSpawns.forEach((spot, index) => {
    const id = `chest-${index}`;
    createProp({
      id,
      model: model("cave-chest"),
      x: spot.x,
      z: spot.z,
      y: FLOOR,
      name: "Chest",
      height: 1.6,
      solid: false,
    });
    chestLoot.set(id, rollChest(makeRng(runSeed ^ (index * 7919 + floor))));
    cavernProps.push(id);
  });

  next.enemySpawns.forEach((spawn, index) => {
    spawnMob(spawn, floor, index);
  });

  // A shopkeeper stands in the floor's shop room, the way a shop room appears
  // mid-dungeon in the source.
  const keeper = `keeper-${floor}`;
  createNpc({
    id: keeper,
    model: model(HUB_KEEPER_MODEL),
    x: next.shop.x,
    z: next.shop.z,
    y: FLOOR,
    name: "Shopkeeper",
  });
  cavernNpcs.push(keeper);
  dispatch("prompt", {
    id: `shop-${floor}`,
    entityId: keeper,
    verb: "Shop",
    range: 6,
  });

  // The exit: a hatch down on floors 1 and 2, the boss's room on the last.
  if (floor < FLOORS_PER_RUN || !next.theme.boss) {
    createProp({
      id: "exit",
      model: model("platform"),
      x: next.exit.x,
      z: next.exit.z,
      y: FLOOR,
      name: "Hatch Down",
      height: 0.4,
      solid: false,
    });
    cavernProps.push("exit");
    dispatch("prompt", {
      id: "exit-prompt",
      entityId: "exit",
      verb: "Descend",
      range: 6,
    });
  } else {
    spawnBoss(next);
  }

  dispatch("player-place", {
    player: "",
    x: next.entrance.x,
    z: next.entrance.z,
    y: FLOOR,
  });
  dispatch("player-checkpoint", {
    player: "",
    x: next.entrance.x,
    z: next.entrance.z,
    y: FLOOR,
  });
  updateHud();
  toast(`Floor ${floor}. The ${next.theme.name} stretches ahead.`);
}

/** Opens the door to a fresh run at floor one. */
function startRun(): void {
  phase = "run";
  floor = 1;
  health = maxHealth;
  runSeed = (getNow() ^ 0x5f3759df) >>> 0;
  shop = shopStock(makeRng(runSeed), SHOP_SLOTS);
  dispatch("ui-remove", { player: "", panel: "shop" });
  dispatch("ui-remove", { player: "", panel: "craft" });
  buildFloorNow();
}

/** Takes the hatch down one floor, or out of the cavern after the last. */
function descend(): void {
  if (keys < 1) {
    toast("The hatch is locked. A key from a monster will open it.");
    return;
  }
  keys -= 1;
  updateHud();
  clearCavern();
  floor += 1;
  if (floor > FLOORS_PER_RUN) {
    returnToHub();
    return;
  }
  buildFloorNow();
}

/** Ends the run and stands the player back in the hub. */
function returnToHub(): void {
  clearCavern();
  phase = "hub";
  floor = 0;
  plan = null;
  dispatch("ui-remove", { player: "", panel: "shop" });
  dispatch("ui-remove", { player: "", panel: "craft" });
  dispatch("player-place", {
    player: "",
    x: HUB_ENTRANCE.x,
    z: HUB_ENTRANCE.z,
    y: FLOOR,
  });
  dispatch("player-checkpoint", {
    player: "",
    x: HUB_ENTRANCE.x,
    z: HUB_ENTRANCE.z,
    y: FLOOR,
  });
  updateHud();
  toast("Back in the hub.");
}

/** Opens one chest, spilling its remembered loot. */
function openChest(id: string): void {
  const loot = chestLoot.get(id);
  if (loot === undefined) {
    return;
  }
  chestLoot.delete(id);
  coins += loot.coins;
  saveCoins();
  toast(`The chest holds ${loot.coins} coins.`);
  if (loot.key) {
    keys += 1;
    toast("...and a key!");
  }
  if (loot.item !== undefined) {
    grantItem(loot.item);
  }
  dispatch("prop-remove", { id });
  updateHud();
}

// ---------------------------------------------------------------------------
// The boss
// ---------------------------------------------------------------------------
/** Stands the last floor's ninja and its health bar. */
function spawnBoss(next: FloorPlan): void {
  boss = {
    id: "boss",
    x: next.exit.x,
    z: next.exit.z,
    hp: BOSS_HEALTH,
    maxHp: BOSS_HEALTH,
    form: 1,
    nextAt: getNow() + 3_000,
  };
  dispatch("npc", {
    id: "boss",
    x: next.exit.x,
    z: next.exit.z,
    y: FLOOR,
    name: "The Ninja",
    model: "cave-ninja.zip",
    tags: ["enemy", "boss"],
  });
  dispatch("hud", {
    player: "",
    id: "boss",
    kind: "bar",
    label: "The Ninja",
    value: boss.hp,
    max: boss.maxHp,
  });
  narrate("The Ninja", "You should not have come this far.");
  dispatch("cutscene", {
    player: "",
    shots: [
      {
        at: [next.exit.x, FLOOR + 14, next.exit.z + 20],
        look: [next.exit.x, FLOOR + 2, next.exit.z],
        durationMs: 1_800,
        holdMs: 500,
        ease: "smooth",
      },
    ],
  });
}

/** Lets the boss close on the player and swing on its own cadence. */
function stepBoss(now: number): void {
  if (boss === null) {
    return;
  }
  const players = getPlayers();
  if (players.length === 0) {
    return;
  }
  const player = players[0];
  const distance = Math.hypot(player.x - boss.x, player.z - boss.z);
  if (distance > 2.4) {
    const speed = boss.form === 2 ? 7 : 4;
    const travel = Math.min(distance - 2.2, speed * (TICK_MS / 1_000));
    if (travel > 0) {
      const dx = (player.x - boss.x) / distance;
      const dz = (player.z - boss.z) / distance;
      boss.x += dx * travel;
      boss.z += dz * travel;
      dispatch("npc", {
        id: boss.id,
        x: boss.x,
        z: boss.z,
        y: FLOOR,
        name: "The Ninja",
        model: "cave-ninja.zip",
        live: true,
        tags: ["enemy", "boss"],
      });
    }
  }
  if (now < boss.nextAt) {
    return;
  }
  boss.nextAt = now + (boss.form === 2 ? BOSS_ATTACK_MS * 0.6 : BOSS_ATTACK_MS);
  if (distance <= 8) {
    hurt(boss.form === 2 ? 2 : 1, "boss");
    dispatch("player-push", { player: "", vx: 0, vy: 3, vz: 0 });
  }
  dispatch("explosion", {
    id: "boss-blast",
    x: boss.x,
    z: boss.z,
    y: FLOOR,
    radius: 5,
  });
  dispatch("sound", { player: "", name: "zombie-growl", volume: 0.8 });
}

/** Applies a weapon's damage to the boss, advancing or ending the fight. */
function hitBoss(amount: number): void {
  if (boss === null) {
    return;
  }
  boss.hp -= amount;
  if (boss.form === 1 && boss.hp <= boss.maxHp / 2) {
    // The first form cannot be finished; a hit that would end it only forces
    // the second, which starts fresh at half health, as the source does.
    boss.form = 2;
    boss.hp = Math.round(boss.maxHp * 0.5);
    dispatch("sound", { player: "", name: "wave-eerie", volume: 0.9 });
    narrate("The Ninja", "You are stronger than you look.");
  } else if (boss.form === 2 && boss.hp <= 0) {
    defeatBoss();
    return;
  }
  dispatch("hud", {
    player: "",
    id: "boss",
    kind: "bar",
    label: "The Ninja",
    value: Math.max(0, boss.hp),
    max: boss.maxHp,
  });
}

/** Ends the fight: the ninja falls, its chest drops, and the way home opens. */
function defeatBoss(): void {
  if (boss === null) {
    return;
  }
  dispatch("npc-die", { id: boss.id });
  dispatch("hud-remove", { player: "", id: "boss" });
  dispatch("sound", { player: "", name: "wave-complete", volume: 1 });
  const at = plan?.exit ?? HUB_ENTRANCE;
  boss = null;
  createProp({
    id: "boss-chest",
    model: model("cave-boss-chest"),
    x: at.x - 4,
    z: at.z,
    y: FLOOR,
    name: "Boss Chest",
    height: 1.8,
    solid: false,
  });
  cavernProps.push("boss-chest");
  createProp({
    id: "exit",
    model: model("platform"),
    x: at.x + 4,
    z: at.z,
    y: FLOOR,
    name: "Way Home",
    height: 0.4,
    solid: false,
  });
  cavernProps.push("exit");
  dispatch("prompt", {
    id: "exit-prompt",
    entityId: "exit",
    verb: "Leave",
    range: 6,
  });
  coins += BOSS_COINS;
  hats += 1;
  saveCoins();
  saveHats();
  deepest = Math.max(deepest, FLOORS_PER_RUN);
  saveDepth();
  updateHud();
  narrate(
    "You",
    "The ninja is beaten. The cavern's hold on this place breaks, and the way home opens.",
  );
  dispatch("ending", {
    player: "",
    title: "The Ninja Falls",
    text: `You descended all ${FLOORS_PER_RUN} floors, broke the ninja, and carried ${coins} coins and ${hats} caps back to the surface.`,
  });
}

// ---------------------------------------------------------------------------
// The hub
// ---------------------------------------------------------------------------
/** Stands the hub once: its keeper, its bench, its sign and its door. */
function openHub(): void {
  dispatch("time", { seconds: 0, speed: 0 });
  dispatch("void", { y: VOID_Y });
  shop = shopStock(makeRng(0x51c9), SHOP_SLOTS);

  createNpc({
    id: "keeper-hub",
    model: model(HUB_KEEPER_MODEL),
    x: HUB_SHOPKEEPER.x,
    z: HUB_SHOPKEEPER.z,
    y: FLOOR,
    name: "Shopkeeper",
    yaw: 0,
  });
  createProp({
    id: "craft-table",
    model: model("cave-craft"),
    x: HUB_CRAFT.x,
    z: HUB_CRAFT.z,
    y: FLOOR,
    name: "Crafting Bench",
    height: 1.6,
    solid: false,
  });
  createProp({
    id: "shop-sign",
    model: model("cave-sign"),
    x: HUB_SIGN.x,
    z: HUB_SIGN.z,
    y: FLOOR,
    name: "Cavern Shop",
    height: 2,
    solid: false,
  });
  createProp({
    id: "cavern-door",
    model: model("door"),
    x: HUB_DOOR.x,
    z: HUB_DOOR.z,
    y: FLOOR,
    name: "Cavern Door",
    height: 3,
    solid: false,
  });
  dispatch("prompt", {
    id: "enter-prompt",
    entityId: "cavern-door",
    verb: "Enter",
    range: 6,
  });
  dispatch("prompt", {
    id: "keep-hub",
    entityId: "keeper-hub",
    verb: "Shop",
    range: 6,
  });
  dispatch("prompt", {
    id: "craft-hub",
    entityId: "craft-table",
    verb: "Craft",
    range: 6,
  });

  dispatch("player-place", {
    player: "",
    x: HUB_ENTRANCE.x,
    z: HUB_ENTRANCE.z,
    y: FLOOR,
  });
  dispatch("player-checkpoint", {
    player: "",
    x: HUB_ENTRANCE.x,
    z: HUB_ENTRANCE.z,
    y: FLOOR,
  });
  updateHud();
  narrate(
    "You",
    "The cavern mouth waits. Spend your coins, sharpen your dagger, and step through.",
  );
}

// ---------------------------------------------------------------------------
// Event handling
// ---------------------------------------------------------------------------
/** Answers one prop being used. */
function used(entityId: string): void {
  if (entityId === "cavern-door") {
    if (phase === "hub") {
      startRun();
    } else {
      toast("You are already in the cavern.");
    }
    return;
  }
  if (entityId === "craft-table") {
    showCraft();
    return;
  }
  if (entityId === "exit") {
    if (phase === "run" && floor >= FLOORS_PER_RUN && boss === null) {
      returnToHub();
    } else {
      descend();
    }
    return;
  }
  if (entityId === "boss-chest") {
    coins += 50;
    saveCoins();
    grantItem("rainbow sword");
    dispatch("prop-remove", { id: "boss-chest" });
    updateHud();
    return;
  }
  if (entityId.startsWith("chest-")) {
    openChest(entityId);
  }
}

/** Answers one enemy landing a blow. */
function struck(mob: MobState, damage: number): void {
  hurt(damage, mob.id);
}

/** Cuts the demo's tick over its events. */
onTick((_clockMs, events) => {
  if (!booted) {
    booted = true;
    defineItems();
    openHub();
    requestData("player", KEY_COINS, "load-coins", "");
    requestData("player", KEY_HEALTH, "load-health", "");
    requestData("player", KEY_DEPTH, "load-depth", "");
    requestData("account", KEY_HATS, "load-hats", "");
    dispatch("timer", { id: "cc-tick", afterMs: TICK_MS });
  }

  let ticked = false;
  for (const event of events) {
    if (event.kind === "timer" && event.timerId === "cc-tick") {
      ticked = true;
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId);
    } else if (
      event.kind === "prompt-triggered" &&
      event.promptId !== undefined
    ) {
      if (event.promptId.startsWith("shop-") || event.promptId === "keep-hub") {
        showShop();
      } else if (event.promptId === "craft-hub") {
        showCraft();
      } else if (event.promptId === "enter-prompt") {
        if (phase === "hub") {
          startRun();
        }
      } else if (event.promptId === "exit-prompt") {
        used("exit");
      }
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      if (event.npcId.startsWith("keeper")) {
        showShop();
      }
    } else if (event.kind === "entity-hit" && event.entityId !== undefined) {
      if (event.entityId === "boss") {
        hitBoss(event.amount);
      } else {
        const fell = damageMob(event.entityId, event.amount);
        if (fell !== null) {
          killMob(fell);
          grantDrop();
        }
      }
    } else if (event.kind === "item-used" && event.item !== undefined) {
      useItem(event.item);
    } else if (event.kind === "ui-clicked" && event.panel !== undefined) {
      if (event.value === "close") {
        dispatch("ui-remove", { player: "", panel: event.panel });
      } else if (event.panel === "shop" && event.value !== undefined) {
        buy(event.value);
      } else if (event.panel === "craft" && event.value !== undefined) {
        craft(event.value);
      }
    } else if (event.kind === "data-loaded") {
      if (event.requestId === "load-coins" && event.found) {
        coins = Number(event.value);
      } else if (event.requestId === "load-health" && event.found) {
        maxHealth = Math.max(START_HEALTH, Number(event.value));
        health = maxHealth;
      } else if (event.requestId === "load-depth" && event.found) {
        deepest = Number(event.value);
      } else if (event.requestId === "load-hats" && event.found) {
        hats = Number(event.value);
      }
      updateHud();
    } else if (event.kind === "player-died") {
      died();
    }
  }

  if (ticked) {
    if (phase === "run") {
      stepMobs(getNow(), TICK_MS, struck);
      stepBoss(getNow());
    }
    dispatch("timer", { id: "cc-tick", afterMs: TICK_MS });
  }
});

/** Handles the player using a held consumable. */
function useItem(id: string): void {
  const def = ITEMS[id];
  if (def === undefined) {
    narrate("You", "Now is not the time.");
    return;
  }
  if (def.heal !== undefined) {
    heal(def.heal);
    dispatch("item-take", { player: "", item: id, count: 1 });
    toast(`You eat the ${def.name}.`);
    return;
  }
  if (def.maxHealthUp !== undefined) {
    maxHealth += def.maxHealthUp;
    health = Math.min(maxHealth, health + def.maxHealthUp);
    saveHealth();
    dispatch("item-take", { player: "", item: id, count: 1 });
    updateHud();
    toast(`Max health is now ${maxHealth}.`);
    return;
  }
  narrate("You", "You can't use that here.");
}

/** Applies the death penalty: a lost max heart and a return to the hub. */
function died(): void {
  maxHealth = Math.max(MIN_HEALTH, maxHealth - 1);
  health = maxHealth;
  saveHealth();
  const phrase =
    hats > 0
      ? `You wake in the hub, one heart lighter. You have ${hats} caps and ${deepest} floors behind you.`
      : "You wake in the hub, one heart lighter. The cavern keeps what it takes.";
  narrate("You", phrase);
  if (phase === "run") {
    returnToHub();
  } else {
    updateHud();
  }
}

/** The world's plan: the hub's own walls, laid down before the terrain fills. */
onPlan(() => JSON.stringify(hubShapes()));
