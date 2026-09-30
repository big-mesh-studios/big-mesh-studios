// The "Baldi's Basics in Education and Learning" demo's place script — a port
// of the original place's core loop on a rebuild of its school. Seven
// notebooks are hidden in a grid school whose halls and rooms follow the
// original's own module; touching one opens a multiple-choice math quiz. Every
// notebook collected and every problem answered wrong raises Baldi's
// aggression, and with it his speed. A friendly Baldi greets the player in the
// first phase; the second notebook or the first wrong answer turns him hostile
// and brings his whole cast out. Three fake exits must be tried before the
// east door opens the escape, and Baldi catches anyone he reaches.
//
// The layout handler registered with onPlan takes voxel coordinates; props,
// NPCs, and effects take world coordinates, which are voxel coordinates times
// two.
import {
  choice,
  createBarrier,
  createNpc,
  createProp,
  dispatch,
  getHeldItem,
  getPlayers,
  onPlan,
  onTick,
  raycast,
  uiButton,
  uiLabel,
  uiPanel,
  uiRemove,
  type BarrierHandle,
  type ModelsByName,
  type NpcHandle,
  type PropHandle,
} from "voxelscape";
import {
  BALDI_SPAWN,
  BULLY_POINTS,
  DETENTION_SPAWN,
  DOORWAYS,
  DOOR_HINGE,
  DOOR_SWING_MS,
  FIXTURES,
  FLOOR,
  GAME_SPAWN,
  HALL_POINTS,
  NOTEBOOKS,
  NORMAL_BALDI_SPAWN,
  SPAWN,
  VOID_Y,
  planShapes,
  type Doorway,
} from "./baldi-level";
import { NAV_NODES, navPath, nearestNavNode } from "./baldi-nav";
import { buildQuiz, TAUNTS, type QuizStep } from "./baldi-quiz";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NOTEBOOK_TOTAL = 7;

// Phases, numbered the way the original's "game phase" value counts them.
const PHASE_ROAM = 1;
const PHASE_CHASE = 2;
const PHASE_ESCAPE = 3;
const PHASE_DONE = 4;

const CHASE_MS = 100; // how often the cast re-steps
const CATCH_DIST = 3; // W — the reach at which Baldi catches the player
// Slower than the player's own 15 units a second to start, so a fresh chase
// can still be outrun; aggression carries him past it.
const BALDI_BASE_SPEED = 13; // W/s before aggression multiplies it
const AGGRO_BASE = 0.8;
const AGGRO_PER_BOOK = 0.1;
const AGGRO_PER_WRONG = 0.1;

// Entity ids.
const BALDI = "baldi";
const NORMAL_BALDI = "normal-baldi";
const QUIZ = "quiz";
const PLAYTIME_UI = "playtime";

// How far each of the cast will notice the player, in world units.
const SWEEP_SPEED = 11;
const PLAYTIME_SPEED = 7;
const PLAYTIME_CHASE_SPEED = 15;
const PRINCIPAL_SPEED = 9;
const PRINCIPAL_CHASE_SPEED = 13;
const PUPPET_SPEED = 7;
const PUPPET_CHASE_SPEED = 16;
const PRIZE_SPEED = 11;

/** Where a figure is along its walk between navigation nodes. */
interface Course {
  /** The node indices left to visit, from the node it started at. */
  path: number[];
  /** The next index in `path` to walk toward. */
  index: number;
  /** The node the path was built to reach, so it is only rebuilt when that changes. */
  goal: number;
}

/** A course with nowhere to go yet. */
const newCourse = (): Course => ({ path: [], index: 0, goal: -1 });

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let started = false;
let phase = PHASE_ROAM;
let books = 0;
let wrongs = 0;
let caught = false;
let finished = false;
let exitTaken = 0;
let clock = 0;

let normalBaldi: NpcHandle<ModelsByName["npc-teacher"]> | null = null;
let baldi: NpcHandle<ModelsByName["npc-teacher"]> | null = null;
let baldiX = BALDI_SPAWN.x;
let baldiZ = BALDI_SPAWN.z;
let baldiYaw = 0;
let baldiCourse: Course = newCourse();

interface Runner {
  readonly id: string;
  handle: NpcHandle<
    | ModelsByName["npc-sweep"]
    | ModelsByName["npc-playtime"]
    | ModelsByName["npc-principal"]
    | ModelsByName["npc-puppet"]
    | ModelsByName["npc-bully"]
    | ModelsByName["npc-prize"]
  >;
  x: number;
  z: number;
  yaw: number;
  course: Course;
  /** Where a wandering runner is headed, in world units. */
  targetX: number;
  targetZ: number;
  mode: "wander" | "chase" | "idle";
  cooldownMs: number;
  speed: number;
}

const runners = new Map<string, Runner>();

/** Structural handle: every notebook is only ever removed. */
interface Removable {
  remove(): void;
}
const bookHandles = new Map<string, Removable>();

interface DoorState {
  readonly def: Doorway;
  prop: PropHandle<ModelsByName["door"]> | null;
  barrier: BarrierHandle | null;
  open: boolean;
}
const doors = new Map<string, DoorState>();

/** One multiple-choice problem the quiz asks, or a taunt shown after a wrong one. */
let quizOpen = false;
let quizBook = "";
let quizSteps: QuizStep[] = [];
let quizStep = 0;
let quizWrong = 0;
let quizReadout = "";

let playtimeActive = false;
let playtimeJumps = 0;
let playtimeBeated = false;
let principalDetained = false;

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

/** Baldi's current anger, starting where the original's own model begins. */
function aggression(): number {
  return AGGRO_BASE + AGGRO_PER_BOOK * books + AGGRO_PER_WRONG * wrongs;
}

function baldiSpeed(): number {
  return BALDI_BASE_SPEED * aggression();
}

function playerAt(): { x: number; y: number; z: number } | null {
  const player = getPlayers()[0];
  return player === undefined ? null : player;
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** How close counts as having reached a navigation node, in world units. */
const ARRIVE = 2;

/**
 * Whether the straight line from one point to another is clear of terrain. A
 * scripted figure or prop is not an obstruction; a wall is.
 */
function losClear(ax: number, az: number, bx: number, bz: number): boolean {
  const length = dist(ax, az, bx, bz);
  if (length < 0.5) {
    return true;
  }
  const hit = raycast([ax, FLOOR + 1, az], [bx - ax, 0, bz - az], length);
  return hit === null || hit.kind !== "block" || hit.distance >= length - 0.5;
}

/** Steps a figure toward a point, turning it to face the way, and says whether it arrived. */
function moveToward(
  figure: { x: number; z: number; yaw: number },
  tx: number,
  tz: number,
  speed: number,
  dtMs: number,
): boolean {
  const dx = tx - figure.x;
  const dz = tz - figure.z;
  const togo = Math.hypot(dx, dz);
  if (togo < 1e-6) {
    return true;
  }
  figure.yaw = Math.atan2(dx, dz);
  const step = (speed * dtMs) / 1000;
  if (step >= togo) {
    figure.x = tx;
    figure.z = tz;
    return true;
  }
  figure.x += (dx / togo) * step;
  figure.z += (dz / togo) * step;
  return false;
}

/**
 * Moves a figure toward a target point: straight at it while the line of sight
 * is clear, and otherwise along the school's navigation graph from the node it
 * is nearest to the node the target is nearest to. The graph keeps the walk
 * inside the halls, where `findPath` would climb the walls.
 */
function navigate(
  figure: { x: number; z: number; yaw: number },
  course: Course,
  targetX: number,
  targetZ: number,
  speed: number,
  dtMs: number,
): void {
  if (losClear(figure.x, figure.z, targetX, targetZ)) {
    course.path = [];
    course.goal = -1;
    moveToward(figure, targetX, targetZ, speed, dtMs);
    return;
  }
  const goal = nearestNavNode(targetX, targetZ);
  if (course.goal !== goal || course.path.length === 0) {
    const from = nearestNavNode(figure.x, figure.z);
    const path = navPath(from, goal);
    course.path = path;
    course.goal = goal;
    // Start at the node after the one the figure is nearest, so it never
    // backtracks to the node behind it.
    course.index = path.length > 1 ? 1 : 0;
  }
  const path = course.path;
  if (course.index >= path.length - 1) {
    // Standing on (or bound for) the goal node: close on the target itself.
    moveToward(figure, targetX, targetZ, speed, dtMs);
    return;
  }
  const node = NAV_NODES[path[course.index]];
  if (moveToward(figure, node.x, node.z, speed, dtMs)) {
    course.index += 1;
  }
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------
onPlan(() => JSON.stringify(planShapes()));

// ---------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------
/** The box that seals a doorway while its door stands shut, in world units. */
function doorBarrierBox(door: Doorway): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const across = Math.abs(Math.cos(door.yaw)) < 0.5 ? "z" : "x";
  const half = door.half;
  if (across === "x") {
    return {
      min: [door.x - half, FLOOR, door.z - 1],
      max: [door.x + half, FLOOR + 6, door.z + 1],
    };
  }
  return {
    min: [door.x - 1, FLOOR, door.z - half],
    max: [door.x + 1, FLOOR + 6, door.z + half],
  };
}

function placeDoor(state: DoorState, swinging: boolean, atMs: number): void {
  state.prop?.remove();
  state.barrier?.remove();
  state.barrier = null;
  const door = state.def;
  state.prop = createProp({
    id: door.id,
    model: "door",
    x: door.x,
    z: door.z,
    y: FLOOR,
    yaw: door.yaw,
    height: 5,
    solid: false,
    hazard: true,
    name: door.id,
    tags: [door.kind],
    ...(swinging
      ? {
          motion: {
            path: [[0, 0, 0]] as Array<[number, number, number]>,
            loop: "once" as const,
            durationMs: DOOR_SWING_MS,
            ease: "smooth" as const,
            startAfterMs: atMs,
            spin: {
              axis: [0, 1, 0] as [number, number, number],
              turns: 0.25,
              pivot: [DOOR_HINGE, 0, 0] as [number, number, number],
            },
          },
        }
      : {}),
  });
  if (!swinging) {
    const box = doorBarrierBox(door);
    state.barrier = createBarrier({
      id: `${door.id}-gate`,
      min: box.min,
      max: box.max,
    });
  }
}

function swingDoor(state: DoorState): void {
  if (state.open) {
    return;
  }
  state.open = true;
  placeDoor(state, true, clock);
  dispatch("sound", {
    player: "",
    name: "door-open",
    id: `door-${state.def.id}`,
    volume: 0.4,
  });
}

/** How near a scripted figure opens a shut door it is walking through. */
const DOOR_REACH = 5;

/**
 * Swings open any shut door a scripted figure has reached, whatever its
 * notebooks: the cast opens doors as it passes them, so nothing is walked
 * through. Exit doors are left to the escape handling.
 */
function openDoorsNear(x: number, z: number): void {
  for (const state of doors.values()) {
    if (state.open) {
      continue;
    }
    const kind = state.def.kind;
    if (kind === "exit" || kind === "fake-exit") {
      continue;
    }
    if (dist(x, z, state.def.x, state.def.z) <= DOOR_REACH) {
      swingDoor(state);
    }
  }
}

/** Handles a door the player reaches: yellow ones check notebooks first. */
function touchDoor(state: DoorState): void {
  const door = state.def;
  if (door.kind === "exit" || door.kind === "fake-exit") {
    handleExitDoor(state);
    return;
  }
  if (door.kind === "yellow" && books < door.books) {
    narrate("BALDI", `You need ${door.books} notebooks before this one opens!`);
    return;
  }
  swingDoor(state);
}

function handleExitDoor(state: DoorState): void {
  const door = state.def;
  if (phase !== PHASE_ESCAPE) {
    narrate("YOU", "The exit is sealed until the notebooks are all in.");
    return;
  }
  if (door.kind === "fake-exit") {
    if (state.open) {
      return;
    }
    state.open = true;
    exitTaken += 1;
    placeDoor(state, true, clock);
    dispatch("sound", {
      player: "",
      name: "wave-eerie",
      id: `fake-${door.id}`,
      volume: 0.6,
    });
    narrate("BALDI", "WRONG WAY! THAT ISN'T THE REAL EXIT!");
    return;
  }
  if (exitTaken < 3) {
    narrate(
      "YOU",
      `Only ${exitTaken} of the 3 fake exits found — keep looking.`,
    );
    return;
  }
  swingDoor(state);
  win();
}

// ---------------------------------------------------------------------------
// Notebooks
// ---------------------------------------------------------------------------
function placeBook(book: (typeof NOTEBOOKS)[number]): Removable {
  return createProp({
    id: book.id,
    model: "historybook",
    x: book.x,
    z: book.z,
    y: book.y,
    yaw: 0,
    height: 0.6,
    solid: false,
    hazard: true,
    name: `Notebook — ${book.room}`,
    tags: ["notebook"],
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function spawnNormalBaldi(): void {
  normalBaldi = createNpc({
    id: NORMAL_BALDI,
    x: NORMAL_BALDI_SPAWN.x,
    z: NORMAL_BALDI_SPAWN.z,
    y: FLOOR,
    yaw: Math.PI / 2,
    name: "Baldi",
    model: "npc-teacher",
    tags: ["friend"],
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

  spawnNormalBaldi();
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
  for (const book of NOTEBOOKS) {
    bookHandles.set(book.id, placeBook(book));
  }
  for (const def of DOORWAYS) {
    const state: DoorState = { def, prop: null, barrier: null, open: false };
    doors.set(def.id, state);
    placeDoor(state, false, 0);
  }

  // The beat re-arms itself on every fire, so the cast is always on the clock.
  dispatch("timer", { id: "chase", afterMs: CHASE_MS });

  narrate("BALDI", "Oh, hi! Welcome to my schoolhouse!");
  narrate("BALDI", "First, you need to take exams in the classrooms!");
  narrate(
    "YOU",
    "Seven notebooks are hidden in this school. Collect them all, then get out.",
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
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
  // A wrong answer raises the anger; the glitch problem is unwinnable, so it
  // marks the quiz wrong without also feeding Baldi.
  if (!step.question.glitch) {
    wrongs += 1;
    quizWrong += 1;
  }
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
function spawnRunner(
  id: string,
  model:
    | "npc-sweep"
    | "npc-playtime"
    | "npc-principal"
    | "npc-puppet"
    | "npc-bully"
    | "npc-prize",
  at: [number, number],
  speed: number,
): void {
  const handle = createNpc({
    id,
    x: at[0],
    z: at[1],
    y: FLOOR,
    yaw: 0,
    name: id,
    model,
    tags: ["cast"],
  });
  runners.set(id, {
    id,
    handle,
    x: at[0],
    z: at[1],
    yaw: 0,
    course: newCourse(),
    targetX: at[0],
    targetZ: at[1],
    mode: "wander",
    cooldownMs: 0,
    speed,
  });
}

function startChase(): void {
  if (phase >= PHASE_CHASE) {
    return;
  }
  phase = PHASE_CHASE;
  normalBaldi?.remove();
  normalBaldi = null;

  baldi = createNpc({
    id: BALDI,
    x: BALDI_SPAWN.x,
    z: BALDI_SPAWN.z,
    y: FLOOR,
    yaw: 0,
    name: "Baldi",
    model: "npc-teacher",
    tags: ["enemy"],
  });
  baldiX = BALDI_SPAWN.x;
  baldiZ = BALDI_SPAWN.z;
  baldiCourse = newCourse();

  spawnRunner("playtime", "npc-playtime", [-168, -96], PLAYTIME_SPEED);
  spawnRunner("sweep", "npc-sweep", [168, 96], SWEEP_SPEED);
  spawnRunner("principal", "npc-principal", [168, -96], PRINCIPAL_SPEED);
  spawnRunner("puppet", "npc-puppet", [-168, 96], PUPPET_SPEED);
  spawnRunner("bully", "npc-bully", BULLY_POINTS[0], 5);
  spawnRunner("prize", "npc-prize", [-84, -96], PRIZE_SPEED);

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
  for (const state of doors.values()) {
    if (state.def.kind === "exit" || state.def.kind === "fake-exit") {
      state.open = false;
    }
  }
  showObjective("ESCAPE through the east door — the fakes won't open it!");
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
  // The original counts the game down and restarts it; so does this, once the
  // ending has been read.
  dispatch("timer", { id: "restart", afterMs: 20_000 });
}

function catchPlayer(): void {
  if (caught || finished) {
    return;
  }
  caught = true;
  dispatch("player-kill", { player: "", cause: BALDI });
}

/**
 * Puts the run back the way a fresh school starts: notebooks restored, the
 * cast sent home, the phase back to roaming, and the player at the entrance.
 * `opening` is the line Baldi calls it out with — a catch and a victory reach
 * the same reset by different words.
 */
function restartGame(opening: string): void {
  for (const book of NOTEBOOKS) {
    bookHandles.get(book.id)?.remove();
    bookHandles.delete(book.id);
  }
  for (const runner of runners.values()) {
    runner.handle.remove();
  }
  runners.clear();
  baldi?.remove();
  baldi = null;
  normalBaldi?.remove();
  normalBaldi = null;

  phase = PHASE_ROAM;
  books = 0;
  wrongs = 0;
  caught = false;
  finished = false;
  exitTaken = 0;
  quizOpen = false;
  playtimeActive = false;
  principalDetained = false;

  uiRemove({ panel: QUIZ });
  uiRemove({ panel: PLAYTIME_UI });
  dispatch("player-control", { player: "", locked: false });
  dispatch("sound-stop", { player: "", id: "baldi-static" });

  for (const book of NOTEBOOKS) {
    bookHandles.set(book.id, placeBook(book));
  }
  for (const state of doors.values()) {
    state.open = false;
    placeDoor(state, false, 0);
  }
  spawnNormalBaldi();
  baldiX = BALDI_SPAWN.x;
  baldiZ = BALDI_SPAWN.z;

  showBooks();
  showObjective("Find all 7 notebooks");
  dispatch("player-place", {
    player: "",
    x: SPAWN[0],
    y: SPAWN[1],
    z: SPAWN[2],
  });
  narrate("BALDI", opening);
}

// ---------------------------------------------------------------------------
// The chase: on every beat, Baldi re-steps toward the player along the hall
// graph, closing straight in whenever the way between them is clear.
// ---------------------------------------------------------------------------
function stepBaldi(dtMs: number): void {
  if (finished || caught || quizOpen || baldi === null) {
    return;
  }
  const player = playerAt();
  if (player === undefined || player === null) {
    return;
  }
  const figure = { x: baldiX, z: baldiZ, yaw: baldiYaw };
  navigate(figure, baldiCourse, player.x, player.z, baldiSpeed(), dtMs);
  baldiX = figure.x;
  baldiZ = figure.z;
  baldiYaw = figure.yaw;
  baldi.move({ x: baldiX, z: baldiZ, y: FLOOR, yaw: baldiYaw, live: true });
  openDoorsNear(baldiX, baldiZ);
  if (dist(baldiX, baldiZ, player.x, player.z) <= CATCH_DIST) {
    catchPlayer();
  }
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------
function stepRunner(
  runner: Runner,
  player: { x: number; z: number },
  dtMs: number,
): void {
  if (runner.cooldownMs > 0) {
    runner.cooldownMs = Math.max(0, runner.cooldownMs - dtMs);
  }
  const away = dist(runner.x, runner.z, player.x, player.z);

  switch (runner.id) {
    case "bully": {
      if (away <= 4 && runner.cooldownMs === 0) {
        runner.cooldownMs = 6000;
        const held = getHeldItem();
        if (held !== "") {
          dispatch("item-take", { player: "", item: held, count: 1 });
          narrate("BULLY", "I'll take that! It's mine NOWWWW!");
        } else {
          narrate("BULLY", "Give me something GREATTTT!");
        }
        const next = choice(BULLY_POINTS);
        if (next !== undefined) {
          runner.targetX = next[0];
          runner.targetZ = next[1];
          runner.course = newCourse();
        }
      }
      break;
    }
    case "playtime": {
      if (playtimeActive) {
        break;
      }
      if (runner.mode === "wander" && away <= 14 && runner.cooldownMs === 0) {
        runner.mode = "chase";
      }
      if (runner.mode === "chase" && away <= CATCH_DIST + 1) {
        startPlaytime();
        runner.mode = "wander";
        runner.cooldownMs = 12_000;
      }
      break;
    }
    case "principal": {
      if (principalDetained) {
        return;
      }
      if (away <= 14) {
        runner.mode = "chase";
      }
      if (runner.mode === "chase" && away <= CATCH_DIST + 1) {
        detainPlayer();
        runner.mode = "wander";
        runner.cooldownMs = 10000;
      }
      break;
    }
    case "puppet": {
      if (books >= 6 && away <= 14) {
        runner.mode = "chase";
      }
      if (runner.mode === "chase" && away <= CATCH_DIST + 1) {
        dispatch("player-place", {
          player: "",
          x: GAME_SPAWN[0],
          y: GAME_SPAWN[1],
          z: GAME_SPAWN[2],
        });
        narrate("PUPPET", "WHOOSH!");
        runner.mode = "wander";
        runner.cooldownMs = 12000;
      }
      break;
    }
    case "prize": {
      if (away <= 4 && runner.cooldownMs === 0) {
        runner.cooldownMs = 4000;
        dispatch("player-push", { player: "", vx: 12, vy: 0, vz: 12 });
        narrate("1ST PRIZE", "PUSH!");
      }
      break;
    }
    default:
      break;
  }

  // Sweep always pushes anyone it walks through.
  if (runner.id === "sweep" && away <= 4 && runner.cooldownMs === 0) {
    runner.cooldownMs = 600;
    dispatch("player-push", {
      player: "",
      vx: Math.sin(runner.yaw) * 18,
      vy: 0,
      vz: Math.cos(runner.yaw) * 18,
    });
  }

  const chasing = runner.mode === "chase";
  const speed = chasing ? chaseSpeed(runner.id) : runner.speed;
  if (chasing) {
    runner.targetX = player.x;
    runner.targetZ = player.z;
  } else if (
    dist(runner.x, runner.z, runner.targetX, runner.targetZ) <= ARRIVE
  ) {
    // Reached the mark it was headed for: take a fresh hall point.
    const mark = choice(HALL_POINTS);
    if (mark !== undefined) {
      runner.targetX = mark[0];
      runner.targetZ = mark[1];
      runner.course = newCourse();
    }
  }
  navigate(runner, runner.course, runner.targetX, runner.targetZ, speed, dtMs);
  openDoorsNear(runner.x, runner.z);
  runner.handle.move({
    x: runner.x,
    z: runner.z,
    y: FLOOR,
    yaw: runner.yaw,
    live: true,
  });
}

function chaseSpeed(id: string): number {
  switch (id) {
    case "playtime":
      return PLAYTIME_CHASE_SPEED;
    case "principal":
      return PRINCIPAL_CHASE_SPEED;
    case "puppet":
      return PUPPET_CHASE_SPEED;
    default:
      return PRIZE_SPEED;
  }
}

function startPlaytime(): void {
  if (playtimeActive) {
    return;
  }
  playtimeActive = true;
  playtimeJumps = 0;
  playtimeBeated = false;
  dispatch("player-control", { player: "", locked: true });
  renderPlaytime();
  dispatch("timer", { id: "playtime-beat", afterMs: 700 });
}

function renderPlaytime(): void {
  uiRemove({ panel: PLAYTIME_UI });
  uiPanel({ id: PLAYTIME_UI, title: "PLAYTIME!", anchor: "bottom-left" });
  uiLabel({
    panel: PLAYTIME_UI,
    id: "jumps",
    text: `Jumps: ${playtimeJumps} / 3`,
  });
  uiButton({
    panel: PLAYTIME_UI,
    id: "jump",
    label: "JUMP!",
    value: "jump",
  });
}

function beatPlaytime(): void {
  if (!playtimeActive) {
    return;
  }
  if (!playtimeBeated) {
    playtimeJumps = 0;
  }
  playtimeBeated = false;
  if (playtimeJumps >= 3) {
    playtimeActive = false;
    uiRemove({ panel: PLAYTIME_UI });
    dispatch("player-control", { player: "", locked: false });
    narrate("PLAYTIME", "YAY! THAT WAS FUN!");
    return;
  }
  renderPlaytime();
  dispatch("timer", { id: "playtime-beat", afterMs: 700 });
}

function detainPlayer(): void {
  principalDetained = true;
  dispatch("player-place", {
    player: "",
    x: DETENTION_SPAWN[0],
    y: DETENTION_SPAWN[1],
    z: DETENTION_SPAWN[2],
  });
  dispatch("player-control", { player: "", locked: true });
  narrate("PRINCIPAL", "Detention for you. 15 seconds.");
  dispatch("timer", { id: "detention", afterMs: 5000 });
}

// ---------------------------------------------------------------------------
// Books and exits
// ---------------------------------------------------------------------------
function openBook(bookId: string): void {
  if (finished || caught || quizOpen) {
    return;
  }
  const book = NOTEBOOKS.find((entry) => entry.id === bookId);
  if (book !== undefined && bookHandles.has(book.id)) {
    startQuiz(book.id);
  }
}

// ---------------------------------------------------------------------------
// Ticks
// ---------------------------------------------------------------------------
onTick((clockMs, events) => {
  clock = clockMs;
  if (!started) {
    started = true;
    boot();
    return;
  }
  for (const event of events) {
    if (event.kind === "timer" && event.timerId === "chase") {
      stepBaldi(CHASE_MS);
      const player = playerAt();
      if (player !== null && phase >= PHASE_CHASE && !finished) {
        for (const runner of runners.values()) {
          stepRunner(runner, player, CHASE_MS);
        }
      }
      dispatch("timer", { id: "chase", afterMs: CHASE_MS });
    } else if (event.kind === "timer" && event.timerId === "playtime-beat") {
      beatPlaytime();
    } else if (event.kind === "timer" && event.timerId === "detention") {
      principalDetained = false;
      dispatch("player-control", { player: "", locked: false });
      narrate("PRINCIPAL", "You may go now.");
    } else if (event.kind === "timer" && event.timerId === "restart") {
      restartGame("THE SCHOOL BELL RINGS! LET'S TRY THAT AGAIN!");
    } else if (
      event.kind === "player-touched" ||
      event.kind === "entity-used"
    ) {
      const door = doors.get(event.entityId);
      if (door !== undefined) {
        touchDoor(door);
        continue;
      }
      openBook(event.entityId);
    } else if (event.kind === "ui-clicked") {
      if (event.panel === QUIZ) {
        handleQuizClick(event.button);
      } else if (event.panel === PLAYTIME_UI && event.button === "jump") {
        playtimeJumps += 1;
        playtimeBeated = true;
        renderPlaytime();
      }
    } else if (event.kind === "player-died") {
      // A catch, or a fall, ends the run: notebooks back to zero, the cast
      // sent home, and the player at the entrance for a fresh start.
      if (!finished) {
        restartGame(
          event.cause === BALDI
            ? "HAHAHA! GOT YOU! BACK TO ZERO NOTEBOOKS!"
            : "YOU FELL! START OVER!",
        );
      }
    }
  }
});
