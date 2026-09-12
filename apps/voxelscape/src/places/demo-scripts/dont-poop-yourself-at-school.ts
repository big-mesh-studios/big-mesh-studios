// The "Don't Poop Yourself at School" demo's place script — a faithful port
// of the Roblox obby. The course runs west → east through the school building:
//
//   Yard → Lobby → Stairs → Hallway → Cafeteria → Gym → Library → Mud Room
//   → Final Pads → Bathroom
//
// New sections use quicksand (the muddy room that slows the player) and
// conveyor belts (the cafeteria lunch trays that carry the player forward).
//
// ALL voxel coordinates × 2 = world coordinates. The bmsPlan() function
// takes voxel coordinates; zones, props, and fields take world coordinates.
declare const engine: {
  dispatch(tag: string, payload: string): void;
  log(line: string): void;
  now(): number;
  endings(): string;
  blocks: Record<string, number>;
};

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
  cause?: string;
}

// ---------------------------------------------------------------------------
// Layout constants (voxel coordinates unless noted "W" for world units)
// ---------------------------------------------------------------------------
const GROUND = 30;
const LOBBY_VOXEL = 100;
// World-unit heights for the course elevations:
//   Lobby floor surface = (LOBBY_VOXEL + 1) * 2 = 202 W
//   After 8-step staircase (+8 voxels): surface = (108 + 1) * 2 = 218 W
const LOBBY = (LOBBY_VOXEL + 1) * 2; // 202 W
const VOID_Y = 150; // W — below this is fatal

// The 8-step staircase rises from voxel y=100 to y=108.
// Each section from the pedestal onward is at surface 218 W (voxel y=108).
// The cafeteria step-up is voxel y=109 → surface 220 W.

// Zone name constants.
const YARD = "yard";
const LOBBY_ZONE = "lobby";
const STAIRS = "stairs";
const HALLWAY = "hallway";
const CAFETERIA = "cafeteria";
const GYM = "gym";
const LIBRARY = "library";
const MUD_ROOM = "mud-room";
const FINAL = "final";
const BATHROOM = "bathroom";

// NPC ids.
const JANITOR = "janitor";
const TEACHER = "teacher";
const BULLY = "bully";
const PRINCIPAL = "principal";

const BLADDER_MAX = 12;
const BLADDER_STEP_MS = 8_000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let started = false;
let deaths = 0;
let bladder = 0;
let held = "";
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};
const flags: Record<string, boolean> = {};

// ---------------------------------------------------------------------------
// Zones (world units)
// ---------------------------------------------------------------------------
// Voxel Z → World Z mapping for the plan:
//   Lobby voxel:      z=-40..-8   → world z=-80..-16
//   Stairs voxel:     z=-8..16    → world z=-16..32
//   Hallway voxel:    z=18..30    → world z=36..60
//   Cafeteria voxel:  z=32..56    → world z=64..112
//   Gym voxel:        z=58..86    → world z=116..172
//   Library voxel:    z=88..108   → world z=176..216
//   Mud Room voxel:   z=110..122  → world z=220..244
//   Final Pads voxel: z=124..132  → world z=248..264
//   Bathroom voxel:   z=134..154  → world z=268..308
const ZONES: Array<[string, number, number, number, number, number, number]> = [
  [YARD, -120, 0, -120, 120, 120, 120],
  [LOBBY_ZONE, -30, 200, -80, 30, 210, -16],
  [STAIRS, -16, 200, -20, 16, 222, 34], // wide enough to catch z=-18 test
  [HALLWAY, -14, 214, 36, 14, 224, 62],
  [CAFETERIA, -22, 214, 64, 22, 224, 114],
  [GYM, -18, 214, 116, 18, 224, 174],
  [LIBRARY, -16, 214, 176, 16, 224, 218],
  [MUD_ROOM, -16, 214, 220, 16, 226, 246],
  [FINAL, -14, 214, 248, 14, 230, 266],
  [BATHROOM, -20, 214, 268, 20, 230, 310],
];

const CHECKPOINT_LABELS: Record<string, string> = {
  [LOBBY_ZONE]: "Stage 1: Classroom 1A",
  [STAIRS]: "Stage 2: Grand Staircase",
  [HALLWAY]: "Stage 3: Locker Corridor",
  [CAFETERIA]: "Stage 4: Cafeteria Conveyors",
  [GYM]: "Stage 5: Gymnasium Court",
  [LIBRARY]: "Stage 6: Library Bookstacks",
  [MUD_ROOM]: "Stage 7: Mud Room Sludge",
  [FINAL]: "Stage 8: Upper Hallway",
  [BATHROOM]: "Stage 9: Restroom & Golden Toilet",
};

// Checkpoints in world units [x, z, y].
const CHECKPOINTS: Record<string, [number, number, number]> = {
  [LOBBY_ZONE]: [0, -40, LOBBY],
  [STAIRS]: [0, 16, 218],
  [HALLWAY]: [0, 42, 218],
  [CAFETERIA]: [0, 80, 218],
  [GYM]: [0, 134, 218],
  [LIBRARY]: [0, 178, 218],
  [MUD_ROOM]: [0, 232, 218],
  [FINAL]: [0, 256, 218],
  [BATHROOM]: [0, 285, 220],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dispatch(tag: string, payload: unknown): void {
  engine.dispatch(tag, JSON.stringify(payload));
}
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
  flags.finished = true;
  dispatch("ending", { player: "", title, text });
}
function showBladder(): void {
  dispatch("hud", {
    player: "",
    id: "bladder",
    kind: "bar",
    label: "Bladder",
    value: bladder,
    max: BLADDER_MAX,
  });
}
function bladderBeat(): void {
  if (flags.finished === true || bladder >= BLADDER_MAX) {
    return;
  }
  bladder += 1;
  showBladder();
  if (bladder >= BLADDER_MAX) {
    ending(
      "Accident",
      "You did not make it to the restroom in time. The whole school saw.",
    );
    return;
  }
  if (bladder === Math.floor(BLADDER_MAX * 0.75)) {
    narrate("You", "Getting desperate. I need to hurry.");
  }
  dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });
}
function showCheckpoint(name: string): void {
  dispatch("hud", {
    player: "",
    id: "checkpoint",
    kind: "text",
    label: "Checkpoint",
    text: CHECKPOINT_LABELS[name] ?? name,
  });
}

// ---------------------------------------------------------------------------
// Plan (voxel coordinates)
// ---------------------------------------------------------------------------
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

export function bmsPlan(): string {
  const b = engine.blocks;
  const shapes: unknown[] = [
    // Ground
    box(-160, 0, -160, 160, GROUND - 1, 160, b.dirt),
    box(-160, GROUND, -160, 160, GROUND, 160, b.grass),
    box(-160, GROUND + 1, -160, 160, 90, 160, 0),

    // Outdoor Football Field (Yard z=-120..-45)
    box(-60, GROUND, -120, 60, GROUND, -45, b.grass),
    // Football yard line markings
    box(-55, GROUND, -110, 55, GROUND, -110, b.greystone),
    box(-55, GROUND, -95, 55, GROUND, -95, b.greystone),
    box(-55, GROUND, -80, 55, GROUND, -80, b.greystone),
    box(-55, GROUND, -65, 55, GROUND, -65, b.greystone),
    box(-55, GROUND, -50, 55, GROUND, -50, b.greystone),
    // Football Goalposts (Yellow/wood frame at endzone z=-115)
    box(-8, GROUND + 1, -115, -8, GROUND + 6, -115, b.wood),
    box(8, GROUND + 1, -115, 8, GROUND + 6, -115, b.wood),
    box(-8, GROUND + 4, -115, 8, GROUND + 4, -115, b.wood),

    // Classroom Starting Room (Indoor Lobby voxel z=-40..-8, world z=-80..-16)
    box(-15, LOBBY_VOXEL, -40, 15, LOBBY_VOXEL, -8, b.wood), // indoor classroom floor
    box(-16, LOBBY_VOXEL + 1, -41, -16, LOBBY_VOXEL + 7, -8, b.greystone), // left wall
    box(16, LOBBY_VOXEL + 1, -41, 16, LOBBY_VOXEL + 7, -8, b.greystone), // right wall
    box(-16, LOBBY_VOXEL + 1, -41, 16, LOBBY_VOXEL + 7, -41, b.greystone), // rear back wall
    box(-16, LOBBY_VOXEL + 8, -41, 16, LOBBY_VOXEL + 8, -8, b.greystone), // classroom roof / ceiling

    // Staircase & Tower Enclosure: 8 steps from voxel z=-8, then pedestal top
    {
      kind: "stairs",
      at: [-7, LOBBY_VOXEL + 1, -8],
      along: "z",
      steps: 8,
      rise: 1,
      run: 2,
      width: 15,
      id: b.greystone,
    },
    // Staircase pedestal (voxel z=8..16, world z=16..32)
    box(-7, 108, 8, 7, 108, 16, b.greystone),
    // Staircase side walls & roof
    box(-8, 101, -8, -8, 114, 16, b.greystone),
    box(8, 101, -8, 8, 114, 16, b.greystone),
    box(-8, 115, -8, 8, 115, 16, b.greystone), // roof over staircase

    // Hallway (voxel z=18..30, world z=36..60) — wood corridor with blue lockers
    box(-7, 108, 18, 7, 108, 30, b.wood),
    box(-8, 109, 18, -8, 114, 30, b.greystone), // left corridor wall
    box(8, 109, 18, 8, 114, 30, b.greystone), // right corridor wall
    box(-8, 115, 18, 8, 115, 30, b.greystone), // hallway roof ceiling
    // Blue school lockers along hallway walls
    box(-7, 109, 20, -7, 111, 28, b.ice),
    box(7, 109, 20, 7, 111, 28, b.ice),

    // Cafeteria (voxel z=32..56, world z=64..112) — wide floor for conveyors
    box(-11, 108, 32, 11, 108, 56, b.wood),
    box(-11, 109, 32, 11, 109, 33, b.greystone), // entrance step
    box(-12, 109, 32, -12, 114, 56, b.greystone), // cafeteria left wall
    box(12, 109, 32, 12, 114, 56, b.greystone), // cafeteria right wall
    box(-12, 115, 32, 12, 115, 56, b.greystone), // cafeteria roof ceiling

    // Gym (voxel z=58..86, world z=116..172)
    box(-8, 108, 58, 8, 108, 62, b.greystone), // entry pad
    box(-5, 109, 65, 5, 109, 70, b.wood), // first pillar
    box(-5, 110, 74, 5, 110, 79, b.wood), // second pillar
    box(-5, 109, 83, 5, 109, 87, b.wood), // third pillar — gym-bounce prop above it
    box(-7, 108, 82, 7, 108, 87, b.greystone), // gym checkpoint pedestal
    box(-9, 109, 58, -9, 114, 87, b.greystone), // gym left wall
    box(9, 109, 58, 9, 114, 87, b.greystone), // gym right wall
    box(-9, 115, 58, 9, 115, 87, b.greystone), // gym roof ceiling

    // Library (voxel z=88..108, world z=176..216)
    box(-5, 108, 90, 5, 108, 94, b.wood),
    box(-4, 109, 98, 4, 109, 103, b.wood),
    box(-5, 110, 107, 5, 110, 110, b.wood), // globe hovering at top
    box(-6, 108, 102, 6, 108, 108, b.greystone), // library checkpoint
    box(-7, 109, 88, -7, 114, 108, b.greystone), // library left wall
    box(7, 109, 88, 7, 114, 108, b.greystone), // library right wall
    box(-7, 115, 88, 7, 115, 108, b.greystone), // library roof ceiling

    // Mud Room (voxel z=110..122, world z=220..244) — dirt floor
    box(-7, 108, 110, 7, 108, 122, b.dirt),
    box(-8, 109, 110, -8, 114, 122, b.greystone), // mud room left wall
    box(8, 109, 110, 8, 114, 122, b.greystone), // mud room right wall
    box(-8, 115, 110, 8, 115, 122, b.greystone), // mud room roof ceiling

    // Final Pads (voxel z=124..132, world z=248..264)
    box(-5, 109, 124, 5, 109, 128, b.wood),
    box(-4, 110, 130, 4, 110, 133, b.wood),
    box(-5, 109, 132, 5, 109, 135, b.greystone),
    box(-7, 109, 124, -7, 114, 133, b.greystone), // final hall left wall
    box(7, 109, 124, 7, 114, 133, b.greystone), // final hall right wall
    box(-7, 115, 124, 7, 115, 133, b.greystone), // final hall roof ceiling

    // Bathroom (voxel z=134..154, world z=268..308) — tiled floor, walls and roof
    box(-9, 109, 134, 9, 109, 154, b.greystone),
    box(-10, 110, 134, -10, 114, 154, b.greystone), // bathroom left wall
    box(10, 110, 134, 10, 114, 154, b.greystone), // bathroom right wall
    box(-10, 110, 154, 10, 114, 154, b.greystone), // bathroom back wall
    box(-10, 115, 134, 10, 115, 154, b.greystone), // bathroom roof ceiling
    // Restroom doorway arch header (world z=268, voxel z=134)
    box(-4, 112, 134, 4, 113, 134, b.greystone),
  ];
  return JSON.stringify(shapes);
}

// ---------------------------------------------------------------------------
// Open (world units for props, zones, fields)
// ---------------------------------------------------------------------------
function open(): void {
  dispatch("time", { seconds: 480, speed: 0 });

  dispatch("item-define", {
    id: "soap",
    name: "Soap",
    sprite: "",
    stackable: false,
  });
  dispatch("item-define", {
    id: "hall-pass",
    name: "Hall Pass",
    sprite: "",
    stackable: false,
  });
  dispatch("item-define", {
    id: "toilet-paper",
    name: "Toilet Paper",
    sprite: "",
    stackable: false,
  });

  for (const [id, minX, minY, minZ, maxX, maxY, maxZ] of ZONES) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
  }

  // Quicksand over the Mud Room floor (world z=220..244, world y=218..226)
  dispatch("field", {
    id: "mud",
    kind: "quicksand",
    min: [-14, 218, 220],
    max: [14, 226, 244],
    speedScale: 0.25,
    sink: 2,
  });

  // Soap pickup on lobby floor (world y=202)
  dispatch("prop", {
    id: "soap",
    model: "soap.zip",
    x: -10,
    z: -50,
    y: LOBBY,
    name: "Soap",
    height: 0.4,
    solid: false,
  });

  // Wet-floor sign in the hallway (world z=48 = roughly mid-hallway)
  dispatch("prop", {
    id: "wet-floor",
    model: "wet-floor.zip",
    x: 3,
    z: 48,
    y: 218,
    name: "Wet Floor",
    height: 1.5,
    solid: false,
    hazard: true,
  });

  // RESTROOM Sign above the bathroom doorway (world z=268, y=225)
  dispatch("prop", {
    id: "restroom-sign",
    model: "platform.zip",
    x: 0,
    z: 268,
    y: 225,
    name: "RESTROOM Sign",
    height: 1.2,
    solid: false,
  });

  // First toilet roll tumbling down the stairs (world z=14, y=220)
  dispatch("prop", {
    id: "toilet-roll",
    model: "toilet-roll.zip",
    x: 2,
    z: 14,
    y: 220,
    name: "Toilet Roll",
    height: 1,
    solid: false,
    motion: {
      path: [
        [0, 0, 0],
        [0, -14, -52],
      ],
      loop: "loop",
      durationMs: 5_000,
      ease: "smooth",
      spin: { axis: [1, 0, 0], degreesPerMeter: 120 },
    },
  });

  // Second toilet roll — offset 2.5s so they come in waves
  dispatch("prop", {
    id: "toilet-roll-2",
    model: "toilet-roll.zip",
    x: -2,
    z: 14,
    y: 220,
    name: "Toilet Roll",
    height: 1,
    solid: false,
    motion: {
      path: [
        [0, 0, 0],
        [0, -14, -52],
      ],
      loop: "loop",
      durationMs: 5_000,
      startAfterMs: 2_500,
      ease: "smooth",
      spin: { axis: [1, 0, 0], degreesPerMeter: 120 },
    },
  });

  // Moving plank bridging pedestal to hallway (world z=22..32, ping-pong)
  dispatch("prop", {
    id: "moving-plank",
    model: "platform.zip",
    x: 0,
    z: 26,
    y: 216,
    name: "Moving Plank",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [0, 0, 10],
      ],
      loop: "pingpong",
      durationMs: 3_500,
      ease: "smooth",
    },
  });

  // Cafeteria: three conveyor-belt lunch trays (world z=70, 86, 102)
  dispatch("prop", {
    id: "tray-a",
    model: "platform.zip",
    x: 0,
    z: 70,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  dispatch("prop", {
    id: "tray-b",
    model: "platform.zip",
    x: 0,
    z: 86,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  dispatch("prop", {
    id: "tray-c",
    model: "platform.zip",
    x: 0,
    z: 102,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });

  // Gym: side-sliding platform (world z=130)
  dispatch("prop", {
    id: "gym-slide",
    model: "platform.zip",
    x: 0,
    z: 130,
    y: 220,
    name: "Gym Platform",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      loop: "pingpong",
      durationMs: 2_800,
      ease: "smooth",
    },
  });

  // Gym: classic spinning turntable (world z=148)
  dispatch("prop", {
    id: "turntable",
    model: "platform.zip",
    x: 0,
    z: 148,
    y: 220,
    name: "Turntable",
    height: 2,
    solid: true,
    motion: {
      path: [[0, 0, 0]],
      loop: "loop",
      durationMs: 1_000,
      spin: { axis: [0, 1, 0], turnsPerSecond: 0.1 },
    },
  });

  // Gym: falling-rising platform (world z=166)
  dispatch("prop", {
    id: "gym-bounce",
    model: "platform.zip",
    x: 0,
    z: 166,
    y: 220,
    name: "Falling Platform",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [0, -6, 0],
      ],
      loop: "pingpong",
      durationMs: 2_000,
      ease: "smooth",
    },
  });

  // Library: rolling globe hazard (world z=196)
  dispatch("prop", {
    id: "globe",
    model: "toilet-roll.zip",
    x: 0,
    z: 196,
    y: 222,
    name: "Globe",
    height: 1.2,
    solid: false,
    hazard: true,
    motion: {
      path: [
        [-5, 0, 0],
        [5, 0, 0],
      ],
      loop: "pingpong",
      durationMs: 3_000,
      ease: "smooth",
      spin: { axis: [0, 0, 1], turnsPerSecond: 0.5 },
    },
  });

  // NPCs
  dispatch("npc", {
    id: JANITOR,
    x: -18,
    z: -50,
    y: LOBBY,
    name: "Janitor",
    model: "npc-sable.zip",
    yaw: Math.PI / 2,
  });
  dispatch("npc", {
    id: BULLY,
    x: 0,
    z: 40,
    y: 218,
    name: "Bully",
    model: "npc-bully.zip",
    yaw: Math.PI,
  });
  dispatch("npc", {
    id: PRINCIPAL,
    x: -14,
    z: 88,
    y: 218,
    name: "Principal",
    model: "npc-brad.zip",
    yaw: Math.PI / 2,
  });
  dispatch("npc", {
    id: TEACHER,
    x: 0,
    z: 278,
    y: 220,
    name: "Teacher",
    model: "npc-teacher.zip",
    yaw: Math.PI,
  });

  dispatch("player-place", { player: "", x: 0, z: -50, y: LOBBY });
  dispatch("void", { y: VOID_Y });

  showBladder();
  dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });

  dispatch("cutscene", {
    player: "",
    shots: [
      { at: [-60, 268, -140], look: [0, 210, 0], durationMs: 0, holdMs: 1_200 },
      {
        at: [0, 236, -80],
        look: [0, 210, 30],
        durationMs: 3_500,
        holdMs: 600,
        ease: "smooth",
      },
    ],
  });

  narrate(
    "You",
    "I drank three juice boxes at lunch and the teacher won't give me a hall pass. " +
      "The bathroom is all the way at the other end of the school. I have to make it.",
  );
}

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------
function hintFor(zone: string): void {
  if (zone === LOBBY_ZONE) {
    narrate(
      "You",
      "Stage 1: Classroom 1A. The staircase is at the end of the lobby. Watch out — toilet paper rolls tumble down!",
    );
  } else if (zone === STAIRS) {
    narrate(
      "You",
      "Stage 2: Grand Staircase. Climbing up! There is a moving plank at the top — wait for it to swing.",
    );
  } else if (zone === HALLWAY) {
    narrate(
      "You",
      "Stage 3: Locker Corridor! The janitor left the floor wet. Do NOT touch the wet floor sign.",
    );
  } else if (zone === CAFETERIA) {
    narrate(
      "You",
      "Stage 4: Cafeteria! Lunch trays are moving on conveyor belts — ride them across.",
    );
  } else if (zone === GYM) {
    narrate(
      "You",
      "Stage 5: Gymnasium! Spinning turntables and moving platforms ahead.",
    );
  } else if (zone === LIBRARY) {
    narrate(
      "You",
      "Stage 6: Library! Hop across book stacks and dodge the rolling globe hazard.",
    );
  } else if (zone === MUD_ROOM) {
    narrate(
      "You",
      "Stage 7: Mud Room! The floor is thick quicksand. Use soap to slide across.",
    );
  } else if (zone === FINAL) {
    narrate("You", "Stage 8: Upper Hallway! Almost at the restroom door.");
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
function useSoap(): void {
  if (held !== "soap") {
    narrate("You", "My hands are empty.");
    return;
  }
  take("soap", 1);
  dispatch("player-jump", { player: "", multiplier: 1.5 });
  narrate("You", "Slippery! But I can jump higher now.");
}

function useHallPass(): void {
  if (held !== "hall-pass") {
    narrate("You", "I do not have a hall pass.");
    return;
  }
  narrate("You", "The hall pass makes me feel slightly more legitimate.");
}

function used(entityId: string, _item: string): void {
  if (entityId === "soap") {
    dispatch("prop-remove", { id: "soap" });
    give("soap", "You pocket the soap bar.");
    return;
  }
  if (entityId === "wet-floor") {
    narrate("You", "That sign is not there to be touched.");
    return;
  }
  if (entityId === "globe") {
    narrate("You", "Ouch — that was the library globe.");
    return;
  }
  if (entityId === "tray-a" || entityId === "tray-b" || entityId === "tray-c") {
    narrate("You", "Leftover lunch. No time to eat.");
  }
}

function usedItem(item: string): void {
  if (item === "soap") {
    useSoap();
    return;
  }
  if (item === "hall-pass") {
    useHallPass();
    return;
  }
  narrate("You", "Now is not the time.");
}

// ---------------------------------------------------------------------------
// NPC dialogue
// ---------------------------------------------------------------------------
function talked(npcId: string): void {
  if (npcId === JANITOR) {
    narrate(
      "Janitor",
      "Wet floor ahead, kid. I just mopped it. Mind the sign.",
    );
    return;
  }
  if (npcId === BULLY) {
    if (flags.bullyTalked !== true) {
      flags.bullyTalked = true;
      narrate(
        "Bully",
        "Where do you think you're going? You better not make it.",
      );
    } else {
      narrate("Bully", "Still here. Still judging you.");
    }
    return;
  }
  if (npcId === PRINCIPAL) {
    if (held === "hall-pass") {
      narrate("Principal", "I see you have a hall pass. Very well — carry on.");
    } else {
      narrate(
        "Principal",
        "Running in the halls? This is not acceptable. Where is your hall pass?",
      );
      if (flags.principalGavePass !== true) {
        flags.principalGavePass = true;
        give("hall-pass", "The principal sighs and hands you a hall pass.");
      }
    }
    return;
  }
  if (npcId === TEACHER) {
    narrate(
      "Teacher",
      "You made it. Through that door — now. I will handle the paperwork.",
    );
  }
}

// ---------------------------------------------------------------------------
// Zone entry
// ---------------------------------------------------------------------------
function entered(zone: string): void {
  if (flags.finished === true) {
    return;
  }

  if (zone === BATHROOM) {
    ending(
      "Relieved",
      "You made it to the restroom just in time. " +
        "The teacher's expression when you walked back into class was priceless.",
    );
    return;
  }

  const spot = CHECKPOINTS[zone];
  if (spot !== undefined) {
    dispatch("player-checkpoint", {
      player: "",
      x: spot[0],
      z: spot[1],
      y: spot[2],
    });
    showCheckpoint(zone);
  }

  if (zone === STAIRS && flags.stairBeat !== true) {
    flags.stairBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 234, -8],
      look: [0, 210, -40],
      durationMs: 2_000,
      holdMs: 600,
      ease: "smooth",
    });
  }
  if (zone === CAFETERIA && flags.cafeBeat !== true) {
    flags.cafeBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 228, 88],
      look: [0, 218, 88],
      durationMs: 1_500,
      holdMs: 500,
      ease: "smooth",
    });
  }
  if (zone === MUD_ROOM && flags.mudBeat !== true) {
    flags.mudBeat = true;
    dispatch("camera", {
      player: "",
      at: [20, 228, 232],
      look: [0, 218, 232],
      durationMs: 1_500,
      holdMs: 500,
      ease: "smooth",
    });
  }
  if (zone === BATHROOM && flags.bathBeat !== true) {
    flags.bathBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 230, 280],
      look: [0, 218, 280],
      durationMs: 1_200,
      holdMs: 800,
      ease: "smooth",
    });
  }
}

// ---------------------------------------------------------------------------
// Hazard touches
// ---------------------------------------------------------------------------
function touched(entityId: string): void {
  if (entityId === "wet-floor") {
    dispatch("player-kill", { player: "", cause: "wet-floor" });
    return;
  }
  if (entityId === "globe") {
    dispatch("player-kill", { player: "", cause: "globe" });
  }
}

// ---------------------------------------------------------------------------
// Player death
// ---------------------------------------------------------------------------
function died(cause: string): void {
  deaths += 1;
  if (cause === "void") {
    narrate("You", "Fell all the way to the yard. That did not help.");
  } else if (cause === "wet-floor") {
    narrate("You", "The wet floor got me. Deaths so far: " + deaths + ".");
  } else if (cause === "globe") {
    narrate("You", "Knocked off by a library globe. Deaths: " + deaths + ".");
  } else {
    narrate("You", "Down again. Deaths: " + deaths + ".");
  }
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------
export function bmsTick(_clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    open();
  }
  const events = JSON.parse(eventsJson) as Event[];
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      inZone[event.zoneId] = true;
      entered(event.zoneId);
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left" && event.zoneId !== undefined) {
      delete inZone[event.zoneId];
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used" && event.item !== undefined) {
      usedItem(event.item);
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      talked(event.npcId);
    } else if (
      event.kind === "player-touched" &&
      event.entityId !== undefined
    ) {
      touched(event.entityId);
    } else if (event.kind === "player-died") {
      died(event.cause ?? "");
    } else if (event.kind === "timer" && event.timerId === "bladder") {
      bladderBeat();
    }
  }
}
