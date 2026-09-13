import {
  blocks,
  createNpc,
  createProp,
  dispatch,
  endings,
  onPlan,
  onTick,
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
/**
 * The LOD-0 voxel row the corrupted dimension is built from, far south of the
 * neighborhood so its ruins never touch the living block.
 */
const CORRUPT_Z = 110;

/** The neighborhood's rooms and buildings, as zone ids. */
const PLAYER_HOUSE = "player-house";
const LAUGH_HOUSE = "laugh-house";
const ALEX_HOUSE = "alex-house";
const JAMES_HOUSE = "james-house";
const STREET = "street";
const SCHOOL = "school";
const CLASSROOM = "classroom";
const CAFETERIA = "cafeteria";
const BEAN_BROS = "bean-bros";
const ARCADE = "arcade";

const LAUGH = "laugh";
const ALEX = "alex";
const JAMES = "james";
const LITTLE_BRO = "littlebro";
const HOMELESS = "homeless";
const BULLY = "bully";
const NERD = "nerd";
const BRIT = "brit";
const BRETT = "brett";
const BRAD = "brad";
const SLEEPA = "sleepa";
const CHAMP = "champ";
const TEACHER = "teacher";
const LEMONADE = "lemonade";
const POTHEAD = "pothead";
const SANTA = "santa";
const OBBY = "obby";
const ANOMALY = "anomaly";

/** The order the corrupted dimension's four house buttons must be pressed in. */
const BUTTON_ORDER = ["blue", "red", "green", "purple"];

/** The dollar value one cash pickup is worth. */
const CASH = 10;
/** What a slushie, a hot dog, and an arcade token cost. */
const SLUSHIE_PRICE = 5;
const HOTDOG_PRICE = 5;
const TOKEN_PRICE = 10;
const LEMONADE_PRICE = 25;
/**
 * The classroom opens once this many endings have been reached. The game asks
 * for fifteen; the demo asks for three, so a newcomer can reach the classroom
 * ending in a single session while the collection is still what gates it.
 */
const CLASSROOM_ENDINGS = 3;

let started = false;
let money = 0;
/** The item the script last told the world the player is holding. */
let held = "";
/** The ending titles this place has remembered from earlier runs. */
let collected: string[] = [];
/** The first food on the cafeteria plate, and the second. */
let plateA: string | null = null;
let plateB: string | null = null;
/** How many times the player has struck Champ with the roaster. */
let champHits = 0;
/** How many of the corrupted gate's buttons have been pressed in order. */
let buttonProgress = 0;
/** How many times the player has struck The Anomaly with the roaster. */
let anomalyHits = 0;
/** How far through the Nerd's three-question quiz the player is; 0 is not started. */
let quizStage = 0;
/** The food Pot Head is cooking, or "" when nothing is on the grill. */
let cookingFood = "";
/** The three foods Sleepa asked for, and which of them have arrived. */
const sleepaFoods: string[] = [];
const flags: Record<string, boolean> = {};
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};

/** The room and building boxes, as `[id, minX, minZ, maxX, maxZ]` in world units. */
const ZONES: Array<[string, number, number, number, number]> = [
  [PLAYER_HOUSE, -24, 4, 0, 28],
  [LAUGH_HOUSE, 4, 4, 28, 28],
  [ALEX_HOUSE, 32, 4, 56, 28],
  [JAMES_HOUSE, 60, 4, 84, 28],
  [STREET, -60, -8, 200, 4],
  [BEAN_BROS, 4, -36, 28, -12],
  [ARCADE, 32, -36, 56, -12],
  [SCHOOL, 68, -44, 116, -4],
  [CLASSROOM, 72, -40, 92, -20],
  [CAFETERIA, 94, -40, 112, -20],
];

/** What each script item is called in the HUD and in the world. */
const ITEM_NAMES: Record<string, string> = {
  plush: "Plush",
  banana: "Banana",
  slushie: "Slushie",
  pizza: "Pizza",
  hotdog: "Hot Dog",
  salad: "Salad",
  taco: "Taco",
  historybook: "History Book",
  key: "Key",
  roaster: "Marshmallow Roaster",
  matches: "Matches",
  litmatches: "Lit Matches",
  hat: "Hat",
  lemonade: "Lemonade",
  foodbag: "Food Bag",
  bean: "Bean",
  token: "Arcade Token",
  cola: "Bloxy Cola",
  chips: "Chips",
};

/** Every item that counts as food, for the homeless kid and the plate. */
const FOODS = ["chips", "pizza", "hotdog", "salad", "taco", "bean"];

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

function take(item: string, count: number): void {
  dispatch("item-take", { player: "", item, count });
  if (held === item) {
    hold("");
  }
}

function ending(title: string, text: string): void {
  dispatch("ending", { player: "", title, text });
}

function timer(id: string, afterMs: number): void {
  dispatch("timer", { id, afterMs });
}

function dialog(npcId: string, prompt: string, options: string[]): void {
  dispatch("dialog", { player: "", npcId, prompt, options });
}

/** One filled box in LOD-0 voxel coordinates, as the plan speaks it. */
function box(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  id: number,
): unknown {
  return { kind: "box", min: [minX, minY, minZ], max: [maxX, maxY, maxZ], id };
}

/**
 * A one-story building: a floor, a wood roof, four walls, and a two-voxel door
 * carved in the middle of `door`. All coordinates are LOD-0 voxels.
 */
function building(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  floorId: number,
  door: "north" | "south" | "east" | "west",
): unknown[] {
  const b = blocks;
  const roof = GROUND + 4;
  const w0 = GROUND + 1;
  const w1 = GROUND + 3;
  const shapes: unknown[] = [
    box(minX, GROUND, minZ, maxX, GROUND, maxZ, floorId),
    box(minX, roof, minZ, maxX, roof, maxZ, b.wood),
    box(minX, w0, minZ, maxX, w1, minZ, b.brick),
    box(minX, w0, maxZ, maxX, w1, maxZ, b.brick),
    box(minX, w0, minZ + 1, minX, w1, maxZ - 1, b.brick),
    box(maxX, w0, minZ + 1, maxX, w1, maxZ - 1, b.brick),
  ];
  const midX = Math.floor((minX + maxX) / 2);
  const midZ = Math.floor((minZ + maxZ) / 2);
  if (door === "south") {
    shapes.push(box(midX, w0, minZ, midX + 1, w0 + 1, minZ, 0));
  } else if (door === "north") {
    shapes.push(box(midX, w0, maxZ, midX + 1, w0 + 1, maxZ, 0));
  } else if (door === "west") {
    shapes.push(box(minX, w0, midZ, minX, w0 + 1, midZ + 1, 0));
  } else {
    shapes.push(box(maxX, w0, midZ, maxX, w0 + 1, midZ + 1, 0));
  }
  return shapes;
}

onPlan((): string => {
  const b = blocks;
  const shapes: unknown[] = [
    // A flat neighborhood over the noise, razed clear above it, reaching south
    // far enough to carry the corrupted dimension too.
    box(-160, 0, -80, 160, GROUND - 1, 140, b.dirt),
    box(-160, GROUND, -80, 160, GROUND, 140, b.grass),
    box(-160, GROUND + 1, -80, 160, 200, 140, 0),
    // The street, running the length of the block.
    {
      kind: "road",
      from: [-60, GROUND, -2],
      to: [200, GROUND, -2],
      width: 4,
      id: b.greystone,
    },
  ];
  // The four houses on the north side, each door facing the street.
  shapes.push(...building(-12, 2, 0, 14, b.ice, "south"));
  shapes.push(...building(2, 2, 14, 14, b.wood, "south"));
  shapes.push(...building(16, 2, 28, 14, b.greystone, "south"));
  shapes.push(...building(30, 2, 42, 14, b.ice, "south"));
  // Bean Bros., the arcade, and the school on the south side.
  shapes.push(...building(2, -18, 14, -6, b.wood, "north"));
  shapes.push(...building(16, -18, 28, -6, b.greystone, "north"));
  shapes.push(...building(34, -22, 58, -2, b.greystone, "north"));
  // The corrupted dimension: the same four houses and school, built in bare
  // stone far to the south, where the true ending's finale plays out.
  shapes.push(
    ...building(-12, CORRUPT_Z + 2, 0, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(2, CORRUPT_Z + 2, 14, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(16, CORRUPT_Z + 2, 28, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(30, CORRUPT_Z + 2, 42, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(70, CORRUPT_Z + 2, 94, CORRUPT_Z + 14, b.stone, "south"),
  );
  return JSON.stringify(shapes);
});

/** Places the fixtures, pickups, NPCs, and zones the world opens with. */
function open(): void {
  dispatch("time", { seconds: 60, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ZONES) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }

  // The player's house: somewhere to sleep, a phone, and the day's things.
  createProp({
    id: "bed",
    model: "bed",
    x: -20,
    z: 22,
    y: FLOOR,
    name: "Bed",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "phone",
    model: "phone",
    x: -2,
    z: 10,
    y: FLOOR,
    name: "Phone",
    height: 1.5,
    solid: false,
  });
  createProp({
    id: "mirror",
    model: "mirror",
    x: -20,
    z: 6,
    y: FLOOR,
    name: "Mirror",
    height: 1.6,
    solid: false,
  });
  createProp({
    id: "bookshelf",
    model: "bookshelf",
    x: -6,
    z: 26,
    y: FLOOR,
    name: "Bookshelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "player-counter",
    model: "counter",
    x: -2,
    z: 24,
    y: FLOOR,
    name: "Counter",
    height: 1.5,
    solid: true,
  });
  createProp({
    id: "player-fridge",
    model: "fridge",
    x: -6,
    z: 24,
    y: FLOOR,
    name: "Fridge",
    height: 3,
    solid: true,
  });
  createProp({
    id: "player-tv",
    model: "tv",
    x: -16,
    z: 24,
    y: FLOOR,
    name: "TV",
    height: 1.4,
    solid: true,
  });
  createProp({
    id: "player-sofa",
    model: "sofa",
    x: -18,
    z: 18,
    y: FLOOR,
    name: "Sofa",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "player-door",
    model: "door",
    x: -6,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "locked-door",
    model: "door",
    x: -2,
    z: 26,
    y: FLOOR,
    name: "Locked Room",
    height: 2,
    solid: false,
  });
  createProp({
    id: "mailbox",
    model: "mailbox",
    x: -12,
    z: 0,
    y: FLOOR,
    name: "Mailbox",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "historybook",
    model: "historybook",
    x: -4,
    z: 26,
    y: FLOOR + 1.5,
    name: "History Book",
    height: 0.4,
    solid: false,
  });

  // Laugh's house: the fridge, the bed, and the present.
  createProp({
    id: "laugh-fridge",
    model: "fridge",
    x: 24,
    z: 24,
    y: FLOOR,
    name: "Fridge",
    height: 3,
    solid: true,
  });
  createProp({
    id: "laugh-bed",
    model: "bed",
    x: 6,
    z: 24,
    y: FLOOR,
    name: "Bed",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "chair",
    model: "chair",
    x: 10,
    z: 24,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "laugh-door",
    model: "door",
    x: 8,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "alex-door",
    model: "door",
    x: 22,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "james-door",
    model: "door",
    x: 36,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });

  // The street's furniture.
  createProp({
    id: "lemonade-stand",
    model: "lemonade-stand",
    x: -30,
    z: 2,
    y: FLOOR,
    name: "Lemonade Stand",
    height: 1.6,
    solid: true,
  });
  createProp({
    id: "bus-stop",
    model: "bus-stop",
    x: 60,
    z: 0,
    y: FLOOR,
    name: "Bus Stop",
    height: 1.6,
    solid: false,
  });
  createProp({
    id: "flower",
    model: "flower",
    x: 80,
    z: -2,
    y: FLOOR,
    name: "Flower",
    height: 1,
    solid: false,
  });
  createProp({
    id: "gate",
    model: "gate",
    x: 150,
    z: -2,
    y: FLOOR,
    name: "Gate",
    height: 2,
    solid: true,
  });

  // Bean Bros.: a counter, shelves, and the slushie machine.
  createProp({
    id: "bean-counter",
    model: "counter",
    x: 8,
    z: -16,
    y: FLOOR,
    name: "Counter",
    height: 1.5,
    solid: true,
  });
  createProp({
    id: "bean-shelf-1",
    model: "shelf",
    x: 2,
    z: -14,
    y: FLOOR,
    name: "Shelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "bean-shelf-2",
    model: "shelf",
    x: 14,
    z: -14,
    y: FLOOR,
    name: "Shelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "slushie-machine",
    model: "slushie-machine",
    x: 12,
    z: -16,
    y: FLOOR,
    name: "Slushie Machine",
    height: 2.2,
    solid: true,
  });
  createProp({
    id: "bean-door",
    model: "door",
    x: 8,
    z: -6.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });

  // The arcade: cabinets, the boarded machine, and a dumpster outside.
  createProp({
    id: "arcade-1",
    model: "arcade",
    x: 20,
    z: -16,
    y: FLOOR,
    name: "Arcade Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "arcade-2",
    model: "arcade",
    x: 26,
    z: -16,
    y: FLOOR,
    name: "Arcade Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "broken-machine",
    model: "boarded-machine",
    x: 23,
    z: -8,
    y: FLOOR,
    name: "Broken Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "token-atm",
    model: "vending",
    x: 46,
    z: -16,
    y: FLOOR,
    name: "Token ATM",
    height: 2.2,
    solid: true,
  });
  createProp({
    id: "dumpster",
    model: "dumpster",
    x: 30,
    z: -4,
    y: FLOOR,
    name: "Dumpster",
    height: 1.8,
    solid: true,
  });
  createProp({
    id: "arcade-door",
    model: "door",
    x: 22,
    z: -6.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "bench",
    model: "bench",
    x: 50,
    z: -4,
    y: FLOOR,
    name: "Bench",
    height: 1,
    solid: true,
  });

  // The school: desks, lockers, cafeteria tables, and the fighting poster.
  createProp({
    id: "school-door",
    model: "door",
    x: 46,
    z: -2.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "classroom-door",
    model: "door",
    x: 82,
    z: -20,
    y: FLOOR,
    name: "Classroom",
    height: 2,
    solid: false,
  });
  createProp({
    id: "desk-1",
    model: "desk",
    x: 76,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "desk-2",
    model: "desk",
    x: 82,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "desk-3",
    model: "desk",
    x: 88,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "chair-1",
    model: "chair",
    x: 76,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "chair-2",
    model: "chair",
    x: 82,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "chair-3",
    model: "chair",
    x: 88,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "locker-1",
    model: "locker",
    x: 72,
    z: -34,
    y: FLOOR,
    name: "Locker",
    height: 2,
    solid: true,
  });
  createProp({
    id: "locker-2",
    model: "locker",
    x: 76,
    z: -34,
    y: FLOOR,
    name: "Locker",
    height: 2,
    solid: true,
  });
  createProp({
    id: "cafeteria-table-1",
    model: "cafeteria-table",
    x: 98,
    z: -30,
    y: FLOOR,
    name: "Table",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "cafeteria-table-2",
    model: "cafeteria-table",
    x: 106,
    z: -30,
    y: FLOOR,
    name: "Table",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "cafeteria-plate",
    model: "plate",
    x: 102,
    z: -26,
    y: FLOOR,
    name: "Plate",
    height: 0.15,
    solid: false,
  });
  createProp({
    id: "fighting-poster",
    model: "poster",
    x: 94,
    z: -20,
    y: FLOOR,
    name: "Fighting Contest",
    height: 1.4,
    solid: false,
  });

  // The finale: the Dimensionator at the arcade, and the corrupted dimension's
  // four house buttons, gate, history book, and portal, far to the south.
  createProp({
    id: "dimensionator",
    model: "arcade",
    x: 40,
    z: -10,
    y: FLOOR,
    name: "Dimensionator",
    height: 2.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-blue",
    model: "poster",
    x: -12,
    z: 240,
    y: FLOOR,
    name: "Blue Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-red",
    model: "poster",
    x: 16,
    z: 240,
    y: FLOOR,
    name: "Red Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-green",
    model: "poster",
    x: 44,
    z: 240,
    y: FLOOR,
    name: "Green Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-purple",
    model: "poster",
    x: 72,
    z: 240,
    y: FLOOR,
    name: "Purple Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-gate",
    model: "gate",
    x: 150,
    z: 236,
    y: FLOOR,
    name: "Gate",
    height: 2,
    solid: true,
  });
  createProp({
    id: "corrupt-book",
    model: "historybook",
    x: 164,
    z: 236,
    y: FLOOR,
    name: "History Book",
    height: 0.4,
    solid: false,
  });
  createProp({
    id: "corrupt-portal",
    model: "gate",
    x: 200,
    z: 236,
    y: FLOOR,
    name: "Portal",
    height: 2,
    solid: false,
  });

  // The pickups the day begins with.
  createProp({
    id: "plush",
    model: "plush",
    x: -22,
    z: 18,
    y: FLOOR,
    name: "Plush",
    height: 0.6,
    solid: false,
  });
  createProp({
    id: "banana",
    model: "banana",
    x: -20,
    z: -6,
    y: FLOOR,
    name: "Banana",
    height: 0.4,
    solid: false,
  });
  createProp({
    id: "chips",
    model: "chips",
    x: -4,
    z: 22,
    y: FLOOR + 1.5,
    name: "Chips",
    height: 0.5,
    solid: false,
  });
  createProp({
    id: "key",
    model: "key",
    x: -22,
    z: 10,
    y: FLOOR,
    name: "Key",
    height: 0.3,
    solid: false,
  });
  createProp({
    id: "matches",
    model: "matches",
    x: 20,
    z: -20,
    y: FLOOR,
    name: "Matches",
    height: 0.3,
    solid: false,
  });
  const cashSpots: Array<[number, number]> = [
    [-4, 22],
    [72, -34],
    [76, -34],
    [50, -4],
    [98, -30],
    [106, -30],
    [20, -16],
    [2, -14],
  ];
  for (const [index, [x, z]] of cashSpots.entries()) {
    createProp({
      id: `cash-${index + 1}`,
      model: "tix",
      x: x,
      z: z,
      y: FLOOR,
      name: "Cash",
      height: 0.3,
      solid: false,
    });
  }

  createNpc({
    id: LITTLE_BRO,
    x: -16,
    z: 20,
    y: FLOOR,
    name: "Little Brother",
    model: "npc-littlebro",
    yaw: 0,
  });
  createNpc({
    id: LAUGH,
    x: 8,
    z: 20,
    y: FLOOR,
    name: "Laugh",
    model: "npc-laugh",
    yaw: Math.PI,
  });
  createNpc({
    id: ALEX,
    x: 22,
    z: 20,
    y: FLOOR,
    name: "Alex",
    model: "npc-alex",
    yaw: Math.PI,
  });
  createNpc({
    id: JAMES,
    x: 36,
    z: 20,
    y: FLOOR,
    name: "James",
    model: "npc-james",
    yaw: Math.PI,
  });
  createNpc({
    id: BRIT,
    x: 6,
    z: -18,
    y: FLOOR,
    name: "Brit",
    model: "npc-brit",
    yaw: 0,
  });
  createNpc({
    id: BRETT,
    x: 10,
    z: -18,
    y: FLOOR,
    name: "Brett",
    model: "npc-brett",
    yaw: 0,
  });
  createNpc({
    id: BRAD,
    x: 24,
    z: -18,
    y: FLOOR,
    name: "Brad",
    model: "npc-brad",
    yaw: 0,
  });
  createNpc({
    id: HOMELESS,
    x: -6,
    z: 2,
    y: FLOOR,
    name: "Homeless Kid",
    model: "npc-homeless",
    yaw: Math.PI,
  });
  createNpc({
    id: LEMONADE,
    x: -30,
    z: 4,
    y: FLOOR,
    name: "Lemonade Salesperson",
    model: "npc-lemonade",
    yaw: 0,
  });
  createNpc({
    id: SLEEPA,
    x: 50,
    z: -6,
    y: FLOOR,
    name: "Sleepa",
    model: "npc-sleepa",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: BULLY,
    x: 80,
    z: -20,
    y: FLOOR,
    name: "Bully",
    model: "npc-bully",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: NERD,
    x: 84,
    z: -20,
    y: FLOOR,
    name: "Nerd",
    model: "npc-nerd",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: TEACHER,
    x: 80,
    z: -32,
    y: FLOOR,
    name: "Teacher",
    model: "npc-teacher",
    yaw: Math.PI,
  });
  createNpc({
    id: POTHEAD,
    x: 100,
    z: -22,
    y: FLOOR,
    name: "Pot Head",
    model: "npc-pothead",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: CHAMP,
    x: 106,
    z: -34,
    y: FLOOR,
    name: "Champ",
    model: "npc-champ",
    yaw: Math.PI,
  });
  createNpc({
    id: SANTA,
    x: 120,
    z: -10,
    y: FLOOR,
    name: "Santa Claus",
    model: "npc-santa",
    yaw: Math.PI,
  });
  createNpc({
    id: OBBY,
    x: 24,
    z: -10,
    y: FLOOR,
    name: "Obby Master",
    model: "npc-obby",
    yaw: 0,
  });

  if (collected.length > 0) {
    say("Endings found so far: " + collected.join(", ") + ".");
  }
  // The true ending opens once both classroom endings are in the collection,
  // the way the game asks for every ending before the finale.
  flags.finaleReady =
    collected.indexOf("Good Ending") >= 0 &&
    collected.indexOf("Bad Ending") >= 0;
  // The school bell: wait too long and the classroom ending turns bad.
  timer("late", 120_000);
}

function hintFor(zone: string): void {
  if (zone === PLAYER_HOUSE) {
    narrate(
      "You",
      "It is 7:58 AM and school starts at 8. I am going to be late... unless I just go back to sleep.",
    );
  } else if (zone === STREET) {
    narrate(
      "You",
      "The block. My friends' houses, the shops, and school down the road.",
    );
  } else if (zone === BEAN_BROS) {
    narrate(
      "Brett",
      "Welcome to Bean Bros. We sell beans, and drinks with abilities.",
    );
  } else if (zone === ARCADE) {
    narrate(
      "Brad",
      "Welcome to Gamer Zone Arcade. Don't bother me, I'm on break.",
    );
  } else if (zone === SCHOOL) {
    narrate("You", "Y U Dumb Elementary. The classroom door wants endings.");
  }
}

// --- the bed, and the two endings it can hold -----------------------------

/** Uses the bed: sleep is the game's easiest ending, or the chair's. */
function useBed(): void {
  if (flags.sleepy === true) {
    ending(
      "Sit in a Chair",
      "You don't know what Sit in a Chair is? It's a game.",
    );
    return;
  }
  ending(
    "Sleep",
    "You probably wouldn't have been so tired if you didn't stay up all night playing games.",
  );
}

// --- the mailbox and the flower -------------------------------------------

/** The mailbox: the game's rare bomb letter, and the finale's address note. */
function useMailbox(): void {
  if (Math.random() < 0.07) {
    ending("Bombed", "The letter shows a picture of a bomb. ...tsssk.");
    return;
  }
  narrate("You", "A letter: 'Yo, got games on your phone?' Not today.");
}

function useFlower(): void {
  ending(
    "Flowey",
    '"YOU IDIOT!!! YOU HAVE TRIGGERED MY TRUE POWER!!!" The golden flower ascends.',
  );
}

// --- the classroom: the good and bad endings ------------------------------

/** Enters the classroom, good if the collection is large enough and not late. */
function enterClassroom(): void {
  if (flags.late === true) {
    ending(
      "Bad Ending",
      "You're too late. The principal just expelled you for being late for the tenth time in a row.",
    );
    return;
  }
  if (collected.length >= CLASSROOM_ENDINGS) {
    ending(
      "Good Ending",
      "Sorry I took so long. Am I late or what? ...You aren't late. You are early for once.",
    );
    return;
  }
  narrate(
    "Teacher",
    "To enter my class you must have " +
      CLASSROOM_ENDINGS +
      " endings. You have " +
      collected.length +
      ".",
  );
}

// --- the neighborhood quests ----------------------------------------------

/** The Nerd's quiz: three questions, a wait, then the big-brained ending. */
function nerdTalk(): void {
  if (flags.quizReady === true) {
    ending("Big Brained", "You big brain. Straight A students be like.");
    return;
  }
  if (quizStage === 0) {
    dialog(NERD, "Would you like to take my quiz?", ["Sure.", "No, I'm late."]);
    return;
  }
  narrate(
    "Nerd",
    "I'm still looking over your test results. Please be patient.",
  );
}

function nerdChoose(option: number): void {
  // Each question's correct answer sits at a fixed index; a wrong pick resets.
  const answers = [0, 1, 0];
  if (quizStage === 0) {
    if (option === 0) {
      quizStage = 1;
      dialog(NERD, "What is the name of this experience?", [
        "Late to School",
        "The Neighborhood",
        "Piggy",
      ]);
    }
    return;
  }
  if (answers[quizStage - 1] !== option) {
    narrate("Nerd", "Wrong. Come back when you are a little smarter.");
    quizStage = 0;
    return;
  }
  if (quizStage === 3) {
    quizStage = 0;
    narrate(
      "Nerd",
      "You passed without cheating. Take your results and get out.",
    );
    timer("quiz-wait", 8_000);
    return;
  }
  quizStage += 1;
  if (quizStage === 2) {
    dialog(NERD, "Who is the smartest person in this experience?", [
      "Nerd",
      "You",
    ]);
    return;
  }
  dialog(NERD, "What experience is this experience based off of?", [
    "GASA4",
    "Piggy",
  ]);
}

/** The homeless kid: bring any food and the good-person ending lands. */
function homelessTalk(): void {
  if (FOODS.indexOf(held) >= 0) {
    take(held, 1);
    ending(
      "Just being a Good Person!",
      "No one has ever been this nice to me. Like Papris once said, everyone can be a good person if they just try.",
    );
    return;
  }
  if (flags.helping === true) {
    narrate("Homeless Kid", "I'm still hungry. Please, some food?");
    return;
  }
  dialog(
    HOMELESS,
    "I have nowhere else to go. I've lost everyone and everything.",
    ["I'll find you some food.", "Sorry, I'm late for school."],
  );
}

/** Laugh's house: the chair, or the Bean Bros. job, branches here. */
function laughTalk(): void {
  if (flags.chairQuest === true) {
    narrate(
      "Laugh",
      "Go on into my bedroom. It's a surprise from yours truly.",
    );
    return;
  }
  if (flags.attorneyQuest === true) {
    narrate("Laugh", "Let's go to Bean Bros. Follow me.");
    return;
  }
  dialog(LAUGH, "Glad you could come over. So, why did I call you again?", [
    "You wanted to show me something.",
    "We were gonna hang out.",
  ]);
}

function laughChoose(option: number): void {
  if (option === 0) {
    flags.chairQuest = true;
    narrate("Laugh", "Go into my bedroom. It's a present from yours truly.");
    return;
  }
  flags.attorneyQuest = true;
  narrate("Laugh", "Right, we were going to hang out. Let's go to Bean Bros.");
}

/** Brett's shop: buying, the job offer, and the delivery shift. */
function brettTalk(): void {
  if (flags.employeeQuest === true && flags.beanOutfit === true) {
    if (flags.delivering !== true) {
      flags.delivering = true;
      narrate(
        "Brett",
        "Deliver these orders to the arcade owner, the nerd, and your little brother. You have two minutes.",
      );
      timer("deliver", 120_000);
      return;
    }
    if (
      flags.deliveredBrad === true &&
      flags.deliveredNerd === true &&
      flags.deliveredBro === true
    ) {
      ending(
        "Excellent Employee",
        "You did it. Here, take this ending and get out of here.",
      );
      return;
    }
    narrate("Brett", "You still have deliveries to make.");
    return;
  }
  if (flags.attorneyQuest === true && flags.attorneyDone !== true) {
    dialog(BRETT, "What do you want?", [
      "I can work for Bean Bros.",
      "Never mind.",
    ]);
    return;
  }
  dialog(BRETT, "Are you sure you want to buy this item?", [
    "Buy a hot dog. ($" + HOTDOG_PRICE + ")",
    "Buy a slushie. ($" + SLUSHIE_PRICE + ")",
    "Nothing.",
  ]);
}

function brettChoose(option: number): void {
  if (flags.attorneyQuest === true && flags.attorneyDone !== true) {
    if (option === 0) {
      flags.attorneyDone = true;
      flags.employeeQuest = true;
      ending(
        "Certified Attorney",
        "You won an argument, but next time you play you have to work for Bean Bros.",
      );
    }
    return;
  }
  if (option === 0 && money >= HOTDOG_PRICE) {
    money -= HOTDOG_PRICE;
    flags.unpaid = false;
    give("hotdog", "One hot dog. Thanks, I guess.");
  } else if (option === 1 && money >= SLUSHIE_PRICE) {
    money -= SLUSHIE_PRICE;
    flags.unpaid = false;
    give("slushie", "One slushie. It'll help you jump.");
  } else if (option === 0 || option === 1) {
    say("You don't have enough cash.");
  }
}

/** Pot Head's cafeteria counter: order a food, wait, and it arrives. */
function potheadTalk(): void {
  dialog(POTHEAD, "Would you like to place an order for some food?", [
    "A pizza, please.",
    "A salad, please.",
    "A taco, please.",
    "Nothing.",
  ]);
}

function potheadChoose(option: number): void {
  const foods = ["pizza", "salad", "taco"];
  if (option < 0 || option >= foods.length) {
    return;
  }
  cookingFood = foods[option];
  narrate(
    "Pot Head",
    "This will take a moment. When you hear the sound, it's ready.",
  );
  timer("cook", 4_000);
}

/** Sleepa: wake her, gather the three foods, and get scammed. */
function sleepaTalk(): void {
  if (flags.sleepaAwake !== true) {
    flags.sleepaAwake = true;
    narrate(
      "Sleepa",
      "I forgot to buy my food yesterday. Get me a pizza, a bean, and a taco!",
    );
    return;
  }
  if (FOODS.indexOf(held) >= 0 && sleepaFoods.indexOf(held) < 0) {
    sleepaFoods.push(held);
    take(held, 1);
    say(
      "You put the " +
        ITEM_NAMES[held] +
        " in the bag. (" +
        sleepaFoods.length +
        "/3)",
    );
    if (sleepaFoods.length >= 3) {
      ending("Instant Regret", "I was joking. ...You got scammed.");
    }
    return;
  }
  narrate(
    "Sleepa",
    "Pizza, bean, and taco. I'll give you double what they're worth.",
  );
}

/** Champ: strike him with the roaster until he falls. */
function champTalk(): void {
  if (held !== "roaster") {
    narrate(
      "Champ",
      "You think you're scaring me? Use the marshmallow holder.",
    );
    return;
  }
  champHits += 1;
  if (champHits >= 5) {
    ending(
      "Champion",
      "I think it's over, buddy, because I am the new champion.",
    );
    return;
  }
  narrate("Champ", "What's up, Brody? That all you got? (" + champHits + "/5)");
}

/** The lemonade seller: buy the drink and its ending. */
function lemonadeTalk(): void {
  dialog(
    LEMONADE,
    "May I interest you in some totally real lemonade? It's only $" +
      LEMONADE_PRICE +
      ".",
    ["Buy it. ($" + LEMONADE_PRICE + ")", "No thanks."],
  );
}

function lemonadeChoose(option: number): void {
  if (option !== 0) {
    return;
  }
  if (money < LEMONADE_PRICE) {
    say("You can't afford the lemonade.");
    return;
  }
  money -= LEMONADE_PRICE;
  give("lemonade", "Pleasure doing business with you, good sir.");
}

// --- the true ending finale -----------------------------------------------

/** James appears outside the house once the collection is ready for the finale. */
function maybeStartFinale(): void {
  if (flags.finaleReady !== true || flags.jamesAppeared === true) {
    return;
  }
  flags.jamesAppeared = true;
  createNpc({
    id: JAMES,
    x: -12,
    z: 2,
    y: FLOOR,
    name: "James",
    model: "npc-james",
    yaw: Math.PI,
  });
  narrate(
    "James",
    "I've been expecting you. Your history book is the key to the perfect ending. Go to the arcade — something is waiting outside.",
  );
}

/** Opens the Dimensionator and drops the party into the corrupted dimension. */
function startCorruption(): void {
  flags.portalOpen = true;
  dispatch("explosion", { id: "portal-boom", x: 40, z: -10, radius: 5 });
  narrate("Laugh", "Do you realize what you have done?");
  narrate(
    "James",
    "It's the only way to stop the Anomaly. Find your history book, then run for the portal.",
  );
  dispatch("player-place", { player: "", x: 0, z: 236, y: FLOOR });
  flags.corrupt = true;
  narrate("You", "The corrupted dimension. It looks like home, but ruined.");
}

/** Presses one of the four house buttons, which must come in the gate's order. */
function useButton(color: string): void {
  if (color !== BUTTON_ORDER[buttonProgress]) {
    buttonProgress = 0;
    narrate("You", "The button goes dark. Wrong order.");
    return;
  }
  buttonProgress += 1;
  if (buttonProgress < BUTTON_ORDER.length) {
    say("The " + color + " button lights up. (" + buttonProgress + "/4)");
    return;
  }
  flags.gateOpen = true;
  dispatch("prop-remove", { id: "corrupt-gate" });
  narrate("You", "The gate drops. The way to the school is open.");
}

/** The Anomaly in the arena: strike it with the roaster to finish the game. */
function anomalyTalk(): void {
  if (flags.arena !== true) {
    narrate("The Anomaly", "You are weak. Run.");
    return;
  }
  if (held !== "roaster") {
    narrate("The Anomaly", "You cannot beat me without the roaster.");
    return;
  }
  anomalyHits += 1;
  if (anomalyHits >= 5) {
    ending(
      "True Ending",
      "You look at your history book. You strangely feel the power of many different alternate realities. Class begins on page 1987.",
    );
    return;
  }
  narrate("The Anomaly", "You can't stop me. (" + anomalyHits + "/5)");
}

// --- using props ----------------------------------------------------------

/** Takes a store good without paying, which is the shoplifter's first step. */
function takeStoreGood(item: string, text: string): void {
  give(item, text);
  flags.unpaid = true;
}

function usePlate(item: string): void {
  const slot = plateA === null ? 0 : plateB === null ? 1 : -1;
  if (item === "") {
    const current = plateB !== null ? plateB : plateA;
    if (current === null) {
      narrate("You", "The plate is empty.");
      return;
    }
    if (plateB !== null) {
      plateB = null;
    } else {
      plateA = null;
    }
    give(current, "You take the " + ITEM_NAMES[current] + " off the plate.");
    return;
  }
  if (FOODS.indexOf(item) < 0) {
    say("Only food goes on the plate.");
    return;
  }
  if (slot < 0) {
    say("The plate already holds two things.");
    return;
  }
  take(item, 1);
  if (slot === 0) {
    plateA = item;
  } else {
    plateB = item;
  }
  say("You set the " + ITEM_NAMES[item] + " on the plate.");
  if (plateA !== null && plateB !== null) {
    ending("Breakfast", "Yum. That was the easiest ending of them all.");
  }
}

/** Throws a held thing into the dumpster, which can start a fire. */
function useDumpster(item: string): void {
  if (item === "banana" && flags.monke === true) {
    take("banana", 1);
    flags.monkeArmed = true;
    narrate(
      "Monke",
      "Throw away banana. Now light the matches and blow up the arcade.",
    );
    return;
  }
  if (item === "litmatches") {
    take("litmatches", 1);
    dispatch("explosion", {
      id: "arcade-boom",
      x: 24,
      z: -8,
      radius: 8,
    });
    flags.boom = true;
    if (flags.monkeArmed === true) {
      narrate("Monke", "The monkey takeover has begun. Run for the tunnel!");
      timer("monke", 10_000);
    } else {
      narrate("You", "The arcade is on fire. You have 30 seconds to get home.");
      timer("escape", 30_000);
    }
    return;
  }
  narrate("You", "Nothing happens.");
}

function used(entityId: string, item: string): void {
  if (entityId === "bed") {
    useBed();
    return;
  }
  if (entityId === "mailbox") {
    useMailbox();
    return;
  }
  if (entityId === "flower") {
    useFlower();
    return;
  }
  if (entityId === "classroom-door") {
    enterClassroom();
    return;
  }
  if (entityId === "dimensionator") {
    if (flags.finaleReady !== true) {
      narrate("You", "The Dimensionator is locked. A code might open it.");
      return;
    }
    dialog("dimensionator", "Enter the code.", ["2546", "0000"]);
    return;
  }
  const buttons: Record<string, string> = {
    "corrupt-button-blue": "blue",
    "corrupt-button-red": "red",
    "corrupt-button-green": "green",
    "corrupt-button-purple": "purple",
  };
  if (buttons[entityId] !== undefined) {
    useButton(buttons[entityId]);
    return;
  }
  if (entityId === "corrupt-book") {
    dispatch("prop-remove", { id: "corrupt-book" });
    flags.gotBook = true;
    give(
      "roaster",
      "You grab the history book. The Anomaly is coming — run to the portal!",
    );
    createNpc({
      id: ANOMALY,
      x: 92,
      z: 236,
      y: FLOOR,
      name: "The Anomaly",
      model: "npc-anomaly",
      yaw: Math.PI,
    });
    flags.chase = true;
    timer("chase", 30_000);
    return;
  }
  if (entityId === "corrupt-portal") {
    if (flags.chase !== true) {
      narrate("You", "The portal isn't open yet.");
      return;
    }
    flags.chase = false;
    flags.arena = true;
    dispatch("player-place", { player: "", x: 280, z: 236, y: FLOOR });
    createNpc({
      id: ANOMALY,
      x: 284,
      z: 236,
      y: FLOOR,
      name: "The Anomaly",
      model: "npc-anomaly",
      yaw: Math.PI,
    });
    narrate(
      "James",
      "This is his domain. Look through your memories for the key to defeating him.",
    );
    return;
  }
  if (entityId === "lemonade-stand" && item === "lemonade") {
    take("lemonade", 1);
    ending("Ded", "I don't feel so good... What was in that lemonade?");
    return;
  }
  if (entityId === "phone") {
    flags.messageHeard = true;
    narrate(
      "Phone",
      "Hey pal. Come over to my place. My house is next door to yours.",
    );
    return;
  }
  if (entityId === "laugh-fridge") {
    if (flags.sodaTaken === true) {
      say("Only take one. Laugh is saving the other.");
      return;
    }
    flags.sodaTaken = true;
    give("cola", "You take one Bloxy Cola. Only one.");
    return;
  }
  if (entityId === "chair") {
    if (flags.chairQuest !== true) {
      narrate("You", "A comically small chair. I shouldn't take it.");
      return;
    }
    flags.sleepy = true;
    narrate("You", "Here's your gift, cuz. ...Why do I feel so sleepy?");
    dispatch("player-speed", { player: "", multiplier: 0.2 });
    return;
  }
  if (entityId === "mirror") {
    flags.beanOutfit = true;
    narrate("You", "You change into the Bean Bros. outfit.");
    return;
  }
  if (entityId === "locked-door") {
    if (item !== "key") {
      narrate("You", "The door is locked. I need a key.");
      return;
    }
    take("key", 1);
    give("roaster", "A marshmallow roaster. Definitely only for marshmallows.");
    return;
  }
  if (entityId === "slushie-machine") {
    if (money < SLUSHIE_PRICE) {
      say("It costs $" + SLUSHIE_PRICE + ".");
      return;
    }
    money -= SLUSHIE_PRICE;
    give("slushie", "One banana slushie.");
    return;
  }
  if (entityId === "token-atm") {
    if (money < TOKEN_PRICE) {
      say("It costs $" + TOKEN_PRICE + ".");
      return;
    }
    money -= TOKEN_PRICE;
    give("token", "The machine spits out an arcade token.");
    return;
  }
  if (entityId === "broken-machine") {
    if (item !== "token") {
      narrate("You", "It wants an arcade token.");
      return;
    }
    take("token", 1);
    narrate("You", "You're inside the game. Beat the obby to claim the prize.");
    timer("obby", 6_000);
    return;
  }
  if (entityId === "dumpster") {
    useDumpster(item);
    return;
  }
  if (entityId === "fighting-poster") {
    if (item !== "roaster") {
      narrate("You", "You must use a marshmallow holder as a melee weapon.");
      return;
    }
    narrate("You", "You sign up for the fighting contest. Champ is waiting.");
    return;
  }
  if (entityId === "cafeteria-plate") {
    usePlate(item);
    return;
  }
  if (entityId === "bean-shelf-1") {
    takeStoreGood("hotdog", "You take a hot dog off the shelf.");
    return;
  }
  if (entityId === "bean-shelf-2") {
    takeStoreGood("bean", "You take a can of beans off the shelf.");
    return;
  }
  if (entityId.indexOf("cash-") === 0) {
    dispatch("prop-remove", { id: entityId });
    money += CASH;
    say("You pocket some cash. ($" + money + ")");
    return;
  }
  const pickups: Record<string, string> = {
    plush: "plush",
    banana: "banana",
    chips: "chips",
    key: "key",
    matches: "matches",
    historybook: "historybook",
  };
  if (pickups[entityId] !== undefined) {
    dispatch("prop-remove", { id: entityId });
    const item = pickups[entityId];
    if (item === "banana") {
      flags.hasBanana = true;
    }
    give(item, "You take the " + ITEM_NAMES[item] + ".");
    return;
  }
  narrate("You", "Nothing happens.");
}

// --- using items ----------------------------------------------------------

function usedItem(item: string): void {
  if (
    item === "chips" ||
    item === "pizza" ||
    item === "hotdog" ||
    item === "salad" ||
    item === "taco"
  ) {
    take(item, 1);
    narrate("You", "Not bad. But I should get to school.");
    return;
  }
  if (item === "lemonade") {
    take(item, 1);
    ending("Ded", "I don't feel so good... What was in that lemonade?");
    return;
  }
  if (item === "matches") {
    take("matches", 1);
    give("litmatches", "The matches are lit.");
    return;
  }
  if (item === "slushie") {
    take("slushie", 1);
    if (flags.hasBanana === true || flags.monke === true) {
      flags.monke = true;
      narrate("Monke", "You are now one with the monkey.");
      return;
    }
    dispatch("player-jump", { player: "", multiplier: 1.6 });
    narrate("You", "The banana slushie gives you a jump ability.");
    return;
  }
  narrate("You", "I shouldn't use that here.");
}

// --- talking --------------------------------------------------------------

function talked(npcId: string, player: string): void {
  void player;
  if (npcId === LITTLE_BRO) {
    if (flags.delivering === true && flags.deliveredBro !== true) {
      flags.deliveredBro = true;
      narrate(
        "Little Brother",
        "Thanks, big bro. Since when did you work for Bean Bros?",
      );
      return;
    }
    narrate(
      "Little Brother",
      "Oh, hi big bro. You're probably too busy to play with me.",
    );
    return;
  }
  if (npcId === LAUGH) {
    laughTalk();
    return;
  }
  if (npcId === HOMELESS) {
    homelessTalk();
    return;
  }
  if (npcId === BULLY) {
    if (held === "plush") {
      ending(
        "Bullied",
        "Is that a plushie in your hand? Wow, you really are a loser. Lesson learned: don't bring your kitty toys to school.",
      );
      return;
    }
    narrate(
      "Bully",
      "Oh, it's you. Get out of my personal space before I invade yours.",
    );
    return;
  }
  if (npcId === NERD) {
    if (flags.delivering === true && flags.deliveredNerd !== true) {
      flags.deliveredNerd = true;
      narrate(
        "Nerd",
        "You work for Bean Bros. You're such a loser. Thanks for my food.",
      );
      return;
    }
    nerdTalk();
    return;
  }
  if (npcId === BRETT) {
    brettTalk();
    return;
  }
  if (npcId === BRAD) {
    if (flags.delivering === true && flags.deliveredBrad !== true) {
      flags.deliveredBrad = true;
      narrate("Brad", "Thanks for my delivery, fella.");
      return;
    }
    narrate(
      "Brad",
      "Welcome to Gamer Zone Arcade. Don't bother me, I'm on break.",
    );
    return;
  }
  if (npcId === SLEEPA) {
    sleepaTalk();
    return;
  }
  if (npcId === CHAMP) {
    champTalk();
    return;
  }
  if (npcId === LEMONADE) {
    lemonadeTalk();
    return;
  }
  if (npcId === POTHEAD) {
    potheadTalk();
    return;
  }
  if (npcId === TEACHER) {
    narrate("Teacher", "To enter my class you must have endings.");
    return;
  }
  if (npcId === SANTA) {
    narrate("Santa", "Ho ho ho. Could you help get me out of this tree?");
    return;
  }
  if (npcId === OBBY) {
    narrate("Obby Master", "Dare to beat my obby and claim the Robux prize.");
    return;
  }
  if (npcId === BRIT) {
    narrate(
      "Brit",
      "I'm busy sorting sodas. If you want to buy something, ask Brett.",
    );
    return;
  }
  if (npcId === JAMES) {
    if (flags.finaleQuest === true) {
      narrate(
        "James",
        "The Dimensionator is outside the arcade. The code is your address.",
      );
      return;
    }
    flags.finaleQuest = true;
    narrate(
      "James",
      "Your history book has the power to stop the Anomaly. Go to the arcade and unlock the Dimensionator.",
    );
    return;
  }
  if (npcId === ANOMALY) {
    anomalyTalk();
    return;
  }
  if (npcId === ALEX || npcId === JAMES) {
    narrate("You", "They aren't home right now.");
    return;
  }
}

function chose(npcId: string, option: number, player: string): void {
  dispatch("dialog-close", { player, npcId });
  if (npcId === "dimensionator") {
    if (option === 0) {
      startCorruption();
    } else {
      narrate("You", "Access denied.");
    }
    return;
  }
  if (npcId === LAUGH) {
    laughChoose(option);
  } else if (npcId === BRETT) {
    brettChoose(option);
  } else if (npcId === NERD) {
    nerdChoose(option);
  } else if (npcId === HOMELESS && option === 0) {
    flags.helping = true;
    narrate("You", "I'll see what I can do.");
  } else if (npcId === LEMONADE) {
    lemonadeChoose(option);
  } else if (npcId === POTHEAD) {
    potheadChoose(option);
  }
}

// --- timers ---------------------------------------------------------------

function timerFired(id: string): void {
  if (id === "quiz-wait") {
    flags.quizReady = true;
    narrate("Nerd", "I've finished looking over your results. Come back.");
    return;
  }
  if (id === "cook") {
    if (cookingFood !== "") {
      give(cookingFood, "Your " + ITEM_NAMES[cookingFood] + " is ready.");
      cookingFood = "";
    }
    return;
  }
  if (id === "late") {
    flags.late = true;
    narrate("You", "There's the school bell. I'm officially late.");
    return;
  }
  if (id === "escape") {
    if (inZone[PLAYER_HOUSE] === true) {
      ending(
        "Criminal",
        "You managed to escape the law, but at what cost? You are now wanted by the police.",
      );
    } else {
      narrate("You", "The police caught you before you got home.");
    }
    return;
  }
  if (id === "monke") {
    ending("Monke Takeover", "Reject humanity. Become monkey.");
    return;
  }
  if (id === "obby") {
    ending("Arcade Master", "The prize is gone, but take this ending instead.");
    return;
  }
  if (id === "deliver") {
    narrate("Brett", "You're out of time. The shift is over.");
    return;
  }
  if (id === "chase") {
    if (flags.chase === true) {
      narrate("The Anomaly", "You can't escape. Try again.");
    }
    return;
  }
}

onTick((_clockMs: number, eventsJson: string): void => {
  if (!started) {
    started = true;
    collected = JSON.parse(endings()) as string[];
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
      if (event.zoneId === PLAYER_HOUSE) {
        maybeStartFinale();
      }
      if (event.zoneId === BEAN_BROS && flags.unpaid === true) {
        ending(
          "Shoplifter",
          "You think you can steal on my watch? Brit pulls out a shotgun. You are a disgrace.",
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
      timerFired(event.timerId);
    }
  }
});
