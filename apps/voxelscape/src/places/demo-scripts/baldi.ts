// The "Baldi's Basics in Education and Learning" demo's place script — a
// faithful port of the original's core loop. Seven notebooks are hidden in a
// one-building school; touching one opens a multiple-choice math quiz, and
// every notebook collected and every problem answered wrong raises Baldi's
// aggression, with it his speed. The second notebook or the first wrong
// answer starts the chase; all seven open the east exit for the escape, and
// Baldi catches anyone he reaches.
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler registered
// with onPlan takes voxel coordinates; props, NPCs, zones, and fields take
// world coordinates.
import {
  blocks,
  choice,
  createBarrier,
  createNpc,
  createProp,
  dispatch,
  findPath,
  getHeightAt,
  getPlayers,
  onPlan,
  onTick,
  randint,
  uiButton,
  uiLabel,
  uiPanel,
  uiRemove,
  type ModelsByName,
  type NpcHandle,
} from "voxelscape";

// ---------------------------------------------------------------------------
// Layout constants (voxel coordinates unless noted "W" for world units)
// ---------------------------------------------------------------------------
const GROUND = 30;
// Walls run from GROUND+1 through GROUND+3; roofs sit at GROUND+4.
const WALL_TOP = GROUND + 3;
const ROOF = GROUND + 4;
// Floor feet height: the top surface of the row-30 slab, in world units.
const FLOOR = (GROUND + 1) * 2; // 62 W
const VOID_Y = 40; // W — below this is fatal

const NOTEBOOK_TOTAL = 7;

// Phases, numbered the way the original's "game phase" value counts them.
const PHASE_ROAM = 1;
const PHASE_CHASE = 2;
const PHASE_ESCAPE = 3;
const PHASE_DONE = 4;

const CHASE_MS = 100; // how often Baldi re-steps toward the player
const CATCH_DIST = 2; // W — the reach at which Baldi catches the player
const BALDI_BASE_SPEED = 12; // W/s before aggression multiplies it

// Entity ids.
const BALDI = "baldi";
const EXIT = "exit";
const EXIT_GATE = "exit-gate";
const QUIZ = "quiz";

const SPAWN: readonly [number, number, number] = [-100, FLOOR, 0]; // x, y, z
const BALDI_SPAWN = { x: -70, z: 0 };
const BALDI_FACING_ENTRANCE = -Math.PI / 2;

/** The seven notebooks: where each one stands and which room hides it. */
const BOOKS: ReadonlyArray<{ id: string; room: string; x: number; z: number }> =
  [
    { id: "book-0", room: "Library", x: -8, z: -64 },
    { id: "book-1", room: "Classroom A", x: 48, z: -64 },
    { id: "book-2", room: "Classroom B", x: -48, z: -64 },
    { id: "book-3", room: "Classroom C", x: 48, z: 64 },
    { id: "book-4", room: "Classroom D", x: -32, z: 68 },
    { id: "book-5", room: "Cafeteria", x: 8, z: 64 },
    { id: "book-6", room: "Office", x: -64, z: 14 },
  ];

/** Furniture and doorways the school stands up on top of the plan. */
interface Fixture {
  readonly id: string;
  readonly model: keyof ModelsByName;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly height: number;
  readonly y?: number;
}

const FIXTURES: readonly Fixture[] = [
  // Classrooms: one desk and chair each, facing the doorway side.
  { id: "desk-cla", model: "desk", x: 40, z: -60, yaw: 0, height: 2 },
  { id: "chair-cla", model: "chair", x: 40, z: -54, yaw: Math.PI, height: 1.5 },
  { id: "desk-clb", model: "desk", x: -40, z: -60, yaw: 0, height: 2 },
  {
    id: "chair-clb",
    model: "chair",
    x: -40,
    z: -54,
    yaw: Math.PI,
    height: 1.5,
  },
  { id: "desk-clc", model: "desk", x: 36, z: 60, yaw: Math.PI, height: 2 },
  { id: "chair-clc", model: "chair", x: 36, z: 54, yaw: 0, height: 1.5 },
  { id: "desk-cld", model: "desk", x: -36, z: 60, yaw: Math.PI, height: 2 },
  { id: "chair-cld", model: "chair", x: -36, z: 54, yaw: 0, height: 1.5 },
  // Library: four shelves against the back wall and a desk in the middle.
  { id: "shelf-lib-1", model: "bookshelf", x: -12, z: -76, yaw: 0, height: 3 },
  { id: "shelf-lib-2", model: "bookshelf", x: 12, z: -76, yaw: 0, height: 3 },
  { id: "shelf-lib-3", model: "bookshelf", x: -12, z: -56, yaw: 0, height: 3 },
  { id: "shelf-lib-4", model: "bookshelf", x: 12, z: -56, yaw: 0, height: 3 },
  { id: "desk-lib", model: "desk", x: 0, z: -66, yaw: 0, height: 2 },
  // Cafeteria: three long tables.
  {
    id: "table-caf-1",
    model: "cafeteria-table",
    x: -12,
    z: 60,
    yaw: Math.PI / 2,
    height: 2,
  },
  {
    id: "table-caf-2",
    model: "cafeteria-table",
    x: 0,
    z: 60,
    yaw: Math.PI / 2,
    height: 2,
  },
  {
    id: "table-caf-3",
    model: "cafeteria-table",
    x: 12,
    z: 60,
    yaw: Math.PI / 2,
    height: 2,
  },
  // Office: Baldi's desk, his chair, and his ruler lying on top of it.
  {
    id: "desk-off",
    model: "desk",
    x: -68,
    z: 0,
    yaw: Math.PI / 2,
    height: 2,
  },
  {
    id: "chair-off",
    model: "chair",
    x: -64,
    z: 0,
    yaw: -Math.PI / 2,
    height: 1.5,
  },
  {
    id: "ruler",
    model: "platform",
    x: -68,
    z: 0,
    y: FLOOR + 0.9,
    yaw: Math.PI / 2,
    height: 0.5,
  },
  // Courtyard dressing: lockers along both room rows, two posters.
  { id: "locker-n1", model: "locker", x: -18, z: -48, yaw: 0, height: 2.5 },
  { id: "locker-n2", model: "locker", x: 18, z: -48, yaw: 0, height: 2.5 },
  {
    id: "locker-s1",
    model: "locker",
    x: -16,
    z: 48,
    yaw: Math.PI,
    height: 2.5,
  },
  { id: "locker-s2", model: "locker", x: 20, z: 48, yaw: Math.PI, height: 2.5 },
  { id: "poster-lib", model: "poster", x: 14, z: -48, yaw: 0, height: 2.5 },
  {
    id: "poster-lob",
    model: "poster",
    x: 78,
    z: 6,
    yaw: -Math.PI / 2,
    height: 2.5,
  },
  // Doorways: a door standing in each room's gap, decor only.
  { id: "door-lib", model: "door", x: 0, z: -50, yaw: 0, height: 5 },
  { id: "door-cla", model: "door", x: 36, z: -50, yaw: 0, height: 5 },
  { id: "door-clb", model: "door", x: -36, z: -50, yaw: 0, height: 5 },
  { id: "door-clc", model: "door", x: 44, z: 50, yaw: Math.PI, height: 5 },
  { id: "door-cld", model: "door", x: -32, z: 50, yaw: Math.PI, height: 5 },
  { id: "door-caf", model: "door", x: 0, z: 50, yaw: Math.PI, height: 5 },
  { id: "door-off", model: "door", x: -50, z: 0, yaw: Math.PI / 2, height: 5 },
  {
    id: "door-entrance",
    model: "door",
    x: -84,
    z: 0,
    yaw: Math.PI / 2,
    height: 5,
  },
  { id: "door-lob", model: "door", x: 50, z: 0, yaw: Math.PI / 2, height: 5 },
];

const TAUNTS: readonly string[] = [
  "I'M GOING TO BEAT YOU!",
  "TOO FAST, TOO SOON.",
  "DID YOU EAT MY DAD'S 175$ DART BOARD?!",
  "I CAN'T BELIEVE YOU HAVE DONE THIS!",
  "EVERY WRONG ANSWER MAKES ME FASTER.",
];

const GLITCH_LINES: readonly string[] = [
  "GERE 5TA 4HAM A 1USBEKEN",
  "EEREREEREKEEKERE",
  "ANSWER THE QUESTION. ANSWER THE QUESTION.",
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let started = false;
let phase = PHASE_ROAM;
let books = 0;
let wrongs = 0;
let caught = false;
let finished = false;

let baldi: NpcHandle<ModelsByName["npc-teacher"]> | null = null;
let baldiX = BALDI_SPAWN.x;
let baldiZ = BALDI_SPAWN.z;
let baldiY = FLOOR;

/** Structural handle: every notebook and the exit are only ever removed. */
interface Removable {
  remove(): void;
}
const bookHandles = new Map<string, Removable>();
let exitHandle: Removable | null = null;
let exitGate: Removable | null = null;

/** One multiple-choice problem the quiz asks, or a taunt shown after a wrong one. */
type QuizStep =
  { kind: "question"; question: Question } | { kind: "taunt"; line: string };

interface Question {
  readonly prompt: string;
  readonly answer: number;
  readonly choices: readonly number[];
  /** A question no answer satisfies: every button reads wrong. */
  readonly glitch: boolean;
}

let quizOpen = false;
let quizBook = "";
let quizSteps: QuizStep[] = [];
let quizStep = 0;
let quizWrong = 0;
let quizReadout = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}

function showBooks(): void {
  dispatch("hud", {
    player: "",
    id: "books",
    kind: "text",
    label: "Notebooks",
    text: `${books} / ${NOTEBOOK_TOTAL}`,
  });
}

function showObjective(text: string): void {
  dispatch("hud", {
    player: "",
    id: "objective",
    kind: "text",
    label: "Goal",
    text,
  });
}

/** Baldi's current anger: one tenth added per notebook and per wrong answer. */
function aggression(): number {
  return 1 + 0.1 * (books + wrongs);
}

function baldiSpeed(): number {
  return BALDI_BASE_SPEED * aggression();
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

// ---------------------------------------------------------------------------
// Plan (voxel coordinates)
// ---------------------------------------------------------------------------
onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [];
  const box = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: number,
  ): void => {
    shapes.push({ kind: "box", min: [x0, y0, z0], max: [x1, y1, z1], id });
  };
  // A wall running along X at row `z`, from `ax` to `bx`, minus its gaps.
  const wallX = (
    z: number,
    ax: number,
    bx: number,
    gaps: ReadonlyArray<readonly [number, number]>,
  ): void => {
    const start = Math.min(ax, bx);
    const end = Math.max(ax, bx);
    const ordered = [...gaps].sort((g, h) => g[0] - h[0]);
    let cursor = start;
    for (const gap of ordered) {
      if (gap[0] > cursor) {
        box(cursor, GROUND + 1, z, gap[0] - 1, WALL_TOP, z, b.greystone);
      }
      cursor = Math.max(cursor, gap[1] + 1);
    }
    if (cursor <= end) {
      box(cursor, GROUND + 1, z, end, WALL_TOP, z, b.greystone);
    }
  };
  // A wall running along Z at column `x`, from `az` to `bz`, minus its gaps.
  const wallZ = (
    x: number,
    az: number,
    bz: number,
    gaps: ReadonlyArray<readonly [number, number]>,
  ): void => {
    const start = Math.min(az, bz);
    const end = Math.max(az, bz);
    const ordered = [...gaps].sort((g, h) => g[0] - h[0]);
    let cursor = start;
    for (const gap of ordered) {
      if (gap[0] > cursor) {
        box(x, GROUND + 1, cursor, x, WALL_TOP, gap[0] - 1, b.greystone);
      }
      cursor = Math.max(cursor, gap[1] + 1);
    }
    if (cursor <= end) {
      box(x, GROUND + 1, cursor, x, WALL_TOP, end, b.greystone);
    }
  };
  // A standalone room: wood floor, greystone roof, four walls, door gaps.
  const room = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    doors: ReadonlyArray<{
      side: "N" | "S" | "E" | "W";
      at: number;
      half?: number;
    }>,
  ): void => {
    box(x0, GROUND, z0, x1, GROUND, z1, b.wood);
    box(x0 - 1, ROOF, z0 - 1, x1 + 1, ROOF, z1 + 1, b.greystone);
    const gapsFor = (
      side: "N" | "S" | "E" | "W",
    ): ReadonlyArray<readonly [number, number]> =>
      doors
        .filter((door) => door.side === side)
        .map((door) => {
          const half = door.half ?? 2;
          return [door.at - half, door.at + half] as const;
        });
    wallX(z0 - 1, x0 - 1, x1 + 1, gapsFor("N"));
    wallX(z1 + 1, x0 - 1, x1 + 1, gapsFor("S"));
    wallZ(x0 - 1, z0 - 1, z1 + 1, gapsFor("W"));
    wallZ(x1 + 1, z0 - 1, z1 + 1, gapsFor("E"));
  };

  // The plaza the school stands on. Graded flat to the school's floor level
  // first, so the surrounding mountains are cut down and never rise through
  // the building; the dirt and grass boxes below then skin the flat top.
  shapes.push({
    kind: "surface",
    min: [-64, 0, -64],
    max: [64, 0, 64],
    level: GROUND,
    depth: 2,
    id: b.grass,
  });
  box(-64, 0, -64, 64, GROUND - 1, 64, b.dirt);
  box(-64, GROUND, -64, 64, GROUND, 64, b.grass);

  // School slab and roof, then the perimeter with its two openings: the west
  // doorway the player walks in through and the east mouth the exit blocks.
  box(-42, GROUND, -42, 42, GROUND, 42, b.wood);
  box(-42, ROOF, -42, 42, ROOF, 42, b.greystone);
  wallX(-42, -42, 42, []);
  wallX(42, -42, 42, []);
  // The west doorway faces the office's own west doorway straight across the
  // one-voxel slot between the two walls, so the entrance opens into the room.
  wallZ(-42, -42, 42, [[-2, 2]]);
  wallZ(42, -42, 42, [[-10, 10]]);

  // Seven rooms around the courtyard, each with a single doorway facing it.
  room(-8, -40, 8, -26, [{ side: "S", at: 0 }]); // Library
  room(12, -40, 28, -26, [{ side: "S", at: 18 }]); // Classroom A
  room(-28, -40, -12, -26, [{ side: "S", at: -18 }]); // Classroom B
  room(12, 26, 28, 40, [{ side: "N", at: 22 }]); // Classroom C
  room(-28, 26, -12, 40, [{ side: "N", at: -16 }]); // Classroom D
  room(-8, 26, 8, 40, [{ side: "N", at: 0 }]); // Cafeteria
  room(-40, -10, -26, 10, [
    { side: "E", at: 0 },
    { side: "W", at: 0 },
  ]); // Office — its west doorway is the school's entrance
  // The lobby's east gap matches the perimeter mouth exactly, so the exit
  // prop and its gate span the whole way out.
  room(26, -10, 40, 10, [
    { side: "W", at: 0 },
    { side: "E", at: 0, half: 10 },
  ]); // Lobby

  // Two pillars to weave between on the courtyard's west-to-east line.
  box(-1, GROUND + 1, -9, 1, WALL_TOP, -7, b.greystone);
  box(-21, GROUND + 1, 7, -19, WALL_TOP, 9, b.greystone);

  return JSON.stringify(shapes);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function placeBook(book: (typeof BOOKS)[number]): Removable {
  return createProp({
    id: book.id,
    model: "historybook",
    x: book.x,
    z: book.z,
    y: FLOOR,
    yaw: 0,
    height: 0.6,
    solid: false,
    hazard: true,
    name: `Notebook — ${book.room}`,
    tags: ["notebook"],
  });
}

function placeClosedExit(): Removable {
  return createProp({
    id: EXIT,
    model: "door",
    x: 83,
    z: 0,
    y: FLOOR,
    yaw: Math.PI / 2,
    height: 5,
    solid: false,
    hazard: false,
    name: "Exit",
  });
}

/** The east mouth stood up shut: a drawn door plus an invisible gate across it. */
function gateExit(): void {
  exitHandle?.remove();
  exitHandle = placeClosedExit();
  exitGate?.remove();
  exitGate = createBarrier({
    id: EXIT_GATE,
    min: [81, FLOOR, -4],
    max: [84, FLOOR + 6, 4],
  });
}

function boot(): void {
  dispatch("player-place", {
    player: "",
    x: SPAWN[0],
    y: SPAWN[1],
    z: SPAWN[2],
  });
  dispatch("void", { y: VOID_Y });

  showBooks();
  showObjective("Find all 7 notebooks");

  baldi = createNpc({
    id: BALDI,
    x: BALDI_SPAWN.x,
    z: BALDI_SPAWN.z,
    y: FLOOR,
    yaw: BALDI_FACING_ENTRANCE,
    name: "Baldi",
    model: "npc-teacher",
    tags: ["enemy"],
  });
  baldiX = BALDI_SPAWN.x;
  baldiZ = BALDI_SPAWN.z;
  baldiY = FLOOR;

  for (const fixture of FIXTURES) {
    createProp({
      id: fixture.id,
      model: fixture.model,
      x: fixture.x,
      z: fixture.z,
      y: fixture.y ?? FLOOR,
      yaw: fixture.yaw,
      height: fixture.height,
      solid: false,
      name: fixture.id,
    });
  }
  for (const book of BOOKS) {
    bookHandles.set(book.id, placeBook(book));
  }
  gateExit();

  // The chase loop re-arms itself on every fire, so its first beat lands one
  // CHASE_MS after the run starts and Baldi is always on the clock.
  dispatch("timer", { id: "chase", afterMs: CHASE_MS });

  narrate("BALDI", "WELCOME TO MY SCHOOL IN EDUCATION AND LEARNING!");
  narrate(
    "YOU",
    "Seven notebooks are hidden in this school. Collect them all, then get out.",
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
/** Four distinct answers around `answer`, shuffled from the seeded stream. */
function makeChoices(answer: number): number[] {
  const picked = [answer];
  for (const candidate of [
    answer + 1,
    answer - 1,
    answer + 2,
    answer - 2,
    answer + 3,
  ]) {
    if (picked.length === 4) {
      break;
    }
    if (candidate >= 0 && !picked.includes(candidate)) {
      picked.push(candidate);
    }
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = randint(0, i);
    const swap = picked[i];
    picked[i] = picked[j];
    picked[j] = swap;
  }
  return picked;
}

/**
 * One problem for a notebook's quiz: the first notebook asks three +/-
 * problems, later notebooks ask two of +,-,*,/ with even operands, and the
 * last slot of a later quiz is the glitch no answer satisfies.
 */
function makeQuestion(first: boolean, glitch: boolean): Question {
  if (glitch) {
    const answer = randint(1, 9);
    return {
      prompt: choice(GLITCH_LINES) ?? "WRONG?WRONG?",
      answer,
      choices: makeChoices(answer),
      glitch: true,
    };
  }
  const kind = first ? randint(0, 1) : randint(0, 3);
  let prompt: string;
  let answer: number;
  if (kind === 0) {
    const a = randint(1, 9);
    const b = randint(1, 9);
    prompt = `${a} + ${b} = ?`;
    answer = a + b;
  } else if (kind === 1) {
    const a = randint(0, 9);
    const b = randint(0, a);
    prompt = `${a} - ${b} = ?`;
    answer = a - b;
  } else if (kind === 2) {
    const a = 2 * randint(1, 4);
    const b = 2 * randint(1, 4);
    prompt = `${a} * ${b} = ?`;
    answer = a * b;
  } else {
    const a = 2 * randint(1, 4);
    const b = 2 * randint(1, 4);
    prompt = `${a * b} / ${a} = ?`;
    answer = b;
  }
  return { prompt, answer, choices: makeChoices(answer), glitch: false };
}

function buildQuiz(first: boolean): QuizStep[] {
  const steps: QuizStep[] = [];
  const plainCount = first ? 3 : 2;
  for (let i = 0; i < plainCount; i++) {
    steps.push({ kind: "question", question: makeQuestion(first, false) });
  }
  if (!first) {
    steps.push({ kind: "question", question: makeQuestion(first, true) });
  }
  return steps;
}

function startQuiz(bookId: string): void {
  quizOpen = true;
  quizBook = bookId;
  quizSteps = buildQuiz(books === 0);
  quizStep = 0;
  quizWrong = 0;
  quizReadout = "";
  dispatch("player-control", { player: "", locked: true });
  renderStep();
}

function renderStep(): void {
  const step = quizSteps[quizStep];
  if (step === undefined) {
    finishQuiz();
    return;
  }
  // A fresh panel every step, so buttons that answered a past problem never
  // linger on a problem or a taunt that came after it.
  uiRemove({ panel: QUIZ });
  uiPanel({
    id: QUIZ,
    title: `BALDI'S NOTEBOOK ${books + 1}`,
    anchor: "bottom-left",
  });
  if (step.kind === "taunt") {
    uiLabel({
      panel: QUIZ,
      id: "prompt",
      text: step.line,
      color: [1, 0.3, 0.3],
    });
    uiLabel({
      panel: QUIZ,
      id: "readout",
      text: quizReadout,
      color: [1, 0.5, 0.5],
    });
    uiButton({
      panel: QUIZ,
      id: "continue",
      label: "CONTINUE",
      value: "continue",
    });
    return;
  }
  const asked =
    quizSteps.slice(0, quizStep).filter((s) => s.kind === "question").length +
    1;
  const total = quizSteps.filter((s) => s.kind === "question").length;
  uiLabel({ panel: QUIZ, id: "prompt", text: step.question.prompt });
  uiLabel({
    panel: QUIZ,
    id: "readout",
    text: quizReadout === "" ? `${asked} / ${total}` : quizReadout,
  });
  step.question.choices.forEach((value, index) => {
    uiButton({
      panel: QUIZ,
      id: `option-${index}`,
      label: String(value),
      value: String(value),
    });
  });
}

/** The CONTINUE press or one of the four answers, applied to the open step. */
function handleQuizClick(button: string): void {
  if (!quizOpen) {
    return;
  }
  const step = quizSteps[quizStep];
  if (step === undefined) {
    return;
  }
  if (button === "continue") {
    if (step.kind !== "taunt") {
      return;
    }
    quizReadout = "";
    quizStep += 1;
    renderStep();
    return;
  }
  if (step.kind !== "question" || !button.startsWith("option-")) {
    return;
  }
  const index = Number(button.slice("option-".length));
  const picked = step.question.choices[index];
  if (picked === undefined) {
    return;
  }
  const correct = !step.question.glitch && picked === step.question.answer;
  if (correct) {
    quizStep += 1;
    renderStep();
    return;
  }
  wrongs += 1;
  quizWrong += 1;
  const line = choice(TAUNTS) ?? "WRONG.";
  narrate("BALDI", line);
  quizSteps.splice(quizStep + 1, 0, { kind: "taunt", line });
  quizReadout = `WRONG! AGGRESSION IS NOW ${aggression().toFixed(1)}`;
  quizStep += 1;
  renderStep();
}

function finishQuiz(): void {
  quizOpen = false;
  uiRemove({ panel: QUIZ });
  dispatch("player-control", { player: "", locked: false });

  bookHandles.get(quizBook)?.remove();
  bookHandles.delete(quizBook);
  books += 1;
  showBooks();

  if (books === 1 && quizWrong === 0) {
    narrate("BALDI", "WOW, YOU EXIST!");
  }
  if (phase === PHASE_ROAM && (books >= 2 || quizWrong > 0)) {
    startChase();
  }
  if (books >= NOTEBOOK_TOTAL && phase < PHASE_ESCAPE) {
    startEscape();
  }

  quizBook = "";
  quizSteps = [];
  quizStep = 0;
  quizWrong = 0;
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------
function startChase(): void {
  if (phase >= PHASE_CHASE) {
    return;
  }
  phase = PHASE_CHASE;
  showObjective("Baldi is chasing you — keep collecting!");
  narrate("BALDI", "NOWHERE TO HIDE!");
  dispatch("sound", {
    player: "",
    name: "wave-eerie",
    id: "baldi-static",
    loop: true,
    volume: 0.5,
  });
}

function startEscape(): void {
  phase = PHASE_ESCAPE;
  exitHandle?.remove();
  exitHandle = createProp({
    id: EXIT,
    model: "door",
    x: 83,
    z: 0,
    y: FLOOR,
    yaw: Math.PI / 2,
    height: 5,
    solid: false,
    hazard: true,
    name: "Exit",
  });
  exitGate?.remove();
  exitGate = null;
  baldi?.setLook({ color: [1, 0.55, 0.55] });
  showObjective("ESCAPE through the east door!");
  narrate("BALDI", "YOU COLLECTED THEM ALL! NOW GET OUT!");
}

function win(): void {
  if (finished) {
    return;
  }
  phase = PHASE_DONE;
  finished = true;
  showObjective("Escaped!");
  dispatch("sound-stop", { player: "", id: "baldi-static" });
  dispatch("ending", {
    player: "",
    title: "VICTORY!",
    text: "You escaped Baldi's school with all seven notebooks.",
  });
}

function catchPlayer(): void {
  if (caught || finished) {
    return;
  }
  caught = true;
  dispatch("player-kill", { player: "", cause: BALDI });
}

// ---------------------------------------------------------------------------
// Reset: the run starts over the way the original restarts after a death
// ---------------------------------------------------------------------------
function resetRun(cause: string): void {
  if (finished) {
    return;
  }
  phase = PHASE_ROAM;
  books = 0;
  wrongs = 0;
  caught = false;
  quizOpen = false;
  quizBook = "";
  quizSteps = [];
  quizStep = 0;
  quizWrong = 0;
  quizReadout = "";

  uiRemove({ panel: QUIZ });
  dispatch("player-control", { player: "", locked: false });
  dispatch("sound-stop", { player: "", id: "baldi-static" });

  for (const book of BOOKS) {
    bookHandles.get(book.id)?.remove();
    bookHandles.delete(book.id);
    bookHandles.set(book.id, placeBook(book));
  }
  gateExit();
  baldi?.clearLook();
  baldiX = BALDI_SPAWN.x;
  baldiZ = BALDI_SPAWN.z;
  baldiY = FLOOR;
  baldi?.move({
    x: baldiX,
    z: baldiZ,
    y: baldiY,
    yaw: BALDI_FACING_ENTRANCE,
    live: true,
  });

  showBooks();
  showObjective("Find all 7 notebooks");
  dispatch("player-place", {
    player: "",
    x: SPAWN[0],
    y: SPAWN[1],
    z: SPAWN[2],
  });
  narrate("BALDI", cause === BALDI ? "HAHAHA! GOT YOU!" : "YOU FELL!");
  narrate("YOU", "Back to zero notebooks. Try again.");
}

// ---------------------------------------------------------------------------
// The chase: on every beat, Baldi re-steps toward the player along a fresh
// route the way a new motion each beat would, from his own tracked position
// ---------------------------------------------------------------------------
function stepBaldi(): void {
  if (finished || caught || quizOpen || phase < PHASE_CHASE || baldi === null) {
    return;
  }
  const player = getPlayers()[0];
  if (player === undefined) {
    return;
  }
  const route = findPath(
    [baldiX, baldiY, baldiZ],
    [player.x, player.y, player.z],
  );
  let tx = player.x;
  let tz = player.z;
  if (route !== null && route.length > 1) {
    tx = route[1][0];
    tz = route[1][2];
  }
  const dx = tx - baldiX;
  const dz = tz - baldiZ;
  const heading = Math.hypot(dx, dz);
  if (heading > 0.001) {
    const advance = Math.min((baldiSpeed() * CHASE_MS) / 1000, heading);
    baldiX += (dx / heading) * advance;
    baldiZ += (dz / heading) * advance;
    baldiY = getHeightAt(baldiX, baldiZ);
    baldi.move({
      x: baldiX,
      z: baldiZ,
      y: baldiY,
      yaw: Math.atan2(dx, dz),
      live: true,
    });
  }
  if (dist(baldiX, baldiZ, player.x, player.z) <= CATCH_DIST) {
    catchPlayer();
  }
}

/**
 * Opens the quiz a notebook carries, when one is still on the floor. Both a
 * notebook walked into and one used with the use button reach this.
 */
function openBook(bookId: string): void {
  if (finished || caught || quizOpen) {
    return;
  }
  const book = BOOKS.find((entry) => entry.id === bookId);
  if (book !== undefined && bookHandles.has(book.id)) {
    startQuiz(book.id);
  }
}

/** The exit the player walks or uses in the escape phase ends the run. */
function openExit(): void {
  if (!finished && !caught && phase === PHASE_ESCAPE) {
    win();
  }
}

// ---------------------------------------------------------------------------
// Ticks
// ---------------------------------------------------------------------------
onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    boot();
    return;
  }
  for (const event of events) {
    if (event.kind === "timer" && event.timerId === "chase") {
      stepBaldi();
      dispatch("timer", { id: "chase", afterMs: CHASE_MS });
    } else if (
      event.kind === "player-touched" ||
      event.kind === "entity-used"
    ) {
      if (event.entityId === EXIT) {
        openExit();
        continue;
      }
      openBook(event.entityId);
    } else if (event.kind === "ui-clicked" && event.panel === QUIZ) {
      handleQuizClick(event.button);
    } else if (event.kind === "player-died") {
      resetRun(event.cause);
    }
  }
});
