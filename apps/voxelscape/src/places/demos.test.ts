// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_DEMOS, builtinDemo, loadBuiltinDemo } from "./demos";
import { compilePlacePlan, planRegionAround } from "./plan";
import { ScriptHost } from "./script-host";
import type { PlaceProject } from "./project";
import { expandShape } from "../world/structure-fill";

/** The bytes of a model under `public/models/`, as the demo loader fetches them. */
const modelBytes = (file: string): ArrayBuffer => {
  const url = new URL(`../../public/models/${file}`, import.meta.url);
  const bytes = readFileSync(fileURLToPath(url));
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

/** A project's attached models, as the sandbox and the plan compiler read
 * them — bytes alone, whether or not any is already a strong ref to some
 * account's own published copy is a publishing concern, not a running one. */
const projectModelBytes = (project: PlaceProject): Record<string, Uint8Array> =>
  Object.fromEntries(
    Object.entries(project.models).map(([name, model]) => [name, model.bytes]),
  );

/**
 * Every surface top the plan offers at one LOD-0 voxel column, in world units.
 * The passed boxes are the plan's expanded shapes; the two `surfaceTops`
 * helpers below sit on top of this and guard the demo against building a
 * course whose pads or checkpoints float in the air.
 */
const columnSurfaces = (
  boxes: Array<{ id: number; min: number[]; max: number[] }>,
  voxelX: number,
  voxelZ: number,
): number[] =>
  boxes
    .filter(
      (box) =>
        box.id !== 0 &&
        voxelX >= box.min[0] &&
        voxelX <= box.max[0] &&
        voxelZ >= box.min[2] &&
        voxelZ <= box.max[2],
    )
    .map((box) => (box.max[1] + 1) * 2);

/** Answers the loader's `<base>models/...` fetches from disk. */
const stubModels = (): void => {
  vi.stubGlobal("fetch", async (input: unknown) => {
    const file = String(input).replace(
      `${import.meta.env.BASE_URL}models/`,
      "",
    );
    return new Response(modelBytes(file));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

/** Loads the GASA4 demo and returns its script entry, ready to run. */
const gasa4 = async () => {
  stubModels();
  const project = await loadBuiltinDemo(builtinDemo("get-a-snack-at-4-am")!);
  return { project, entry: project.manifest.scripts![0] };
};

/** The shared clock the demo's timers run against. */
let clockMs = 0;

const run = async (): Promise<{
  host: ScriptHost;
  endings: string[];
  narrations: string[];
  toasts: string[];
}> => {
  clockMs = 0;
  const { project, entry } = await gasa4();
  const endings: string[] = [];
  const narrations: string[] = [];
  const toasts: string[] = [];
  const host = new ScriptHost({
    seed: project.manifest.seed,
    getNow: () => clockMs,
    getHeightAt: () => 62,
    onTime: () => {},
    onToast: (_player, text) => toasts.push(text),
    onEnding: (_player, state) => {
      if (state !== null) {
        endings.push(state.title);
      }
    },
    onNarrate: (_player, line) => narrations.push(line.text),
  });
  await host.loadProject(project.scripts, entry, projectModelBytes(project));
  return { host, endings, narrations, toasts };
};

/** Moves the shared clock forward and lets the script's timers fire. */
const advance = async (host: ScriptHost, ms: number): Promise<void> => {
  clockMs += ms;
  await host.pump();
};

/** Uses a prop the way the world does: with whatever the player is holding. */
const useHeld = (host: ScriptHost, id: string): Promise<void> =>
  host.use(id, "", host.inventory.heldItem()?.id ?? "");

/** Loads the Late to School demo and returns its script entry, ready to run. */
const lateToSchool = async () => {
  stubModels();
  const project = await loadBuiltinDemo(builtinDemo("late-to-school")!);
  return { project, entry: project.manifest.scripts![0] };
};

/** Boots the Late to School demo against `knownEndings`, returning what it said. */
const runLts = async (knownEndings: string[] = []) => {
  clockMs = 0;
  const { project, entry } = await lateToSchool();
  const endings: string[] = [];
  const narrations: string[] = [];
  const toasts: string[] = [];
  const jumps: number[] = [];
  const speeds: number[] = [];
  const host = new ScriptHost({
    seed: project.manifest.seed,
    getNow: () => clockMs,
    getHeightAt: () => 62,
    onTime: () => {},
    onToast: (_player, text) => toasts.push(text),
    onEnding: (_player, state) => {
      if (state !== null) {
        endings.push(state.title);
      }
    },
    onNarrate: (_player, line) => narrations.push(line.text),
    onPlayerJump: (_player, multiplier) => jumps.push(multiplier),
    onPlayerSpeed: (_player, multiplier) => speeds.push(multiplier),
    getEndings: () => knownEndings,
  });
  await host.loadProject(project.scripts, entry, projectModelBytes(project));
  return { host, endings, narrations, toasts, jumps, speeds };
};

describe("the built-in demos", () => {
  it("lists the GASA4 place with its furniture and items", () => {
    const demo = builtinDemo("get-a-snack-at-4-am");
    expect(demo?.manifest.name).toBe("Get a Snack at 4 AM");
    expect(demo?.manifest.models).toContain("fridge.zip");
    expect(demo?.manifest.models).toContain("bed.zip");
    expect(demo?.manifest.models).toContain("chips.zip");
    expect(demo?.manifest.models).toContain("friedegg.zip");
    expect(BUILTIN_DEMOS).toContain(demo);
  });

  it("loads the GASA4 demo's models as bytes", async () => {
    const { project } = await gasa4();
    expect(Object.keys(project.models)).toContain("fridge.zip");
    expect(Object.keys(project.models)).toContain("plate.zip");
    expect(Object.keys(project.models)).toContain("friedegg.zip");
    expect(project.models["fridge.zip"].bytes.length).toBeGreaterThan(0);
  });

  it("compiles its house and store", async () => {
    const { project, entry } = await gasa4();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    expect(plan.structures.some((shape) => shape.kind === "road")).toBe(true);
    expect(plan.structures.length).toBeGreaterThan(15);
  });

  it("opens with Dad, the Cashier, and the store counter", async () => {
    const { host } = await run();
    expect(host.npcList.map((npc) => npc.id).sort()).toEqual([
      "cashier",
      "dad",
    ]);
    expect(host.propList.some((prop) => prop.model === "bed.zip")).toBe(true);
    expect(host.prop("store-counter")).toMatchObject({ model: "counter.zip" });
    host.dispose();
  });

  it("ends with Sleep when the chips are eaten in the bedroom", async () => {
    const { host, endings } = await run();
    await host.movePlayer("", -14, 62, -12); // the bedroom
    await host.use("chips", ""); // pick them up
    await host.useItem("chips", ""); // eat them quietly there
    await host.use("bed", ""); // go back to sleep
    expect(endings).toEqual(["Sleep"]);
    host.dispose();
  });

  it("ends with Chips when they are eaten where Dad can hear", async () => {
    const { host, endings } = await run();
    await host.movePlayer("", 10, 62, 10); // the kitchen
    await host.use("chips", "");
    await host.useItem("chips", "");
    // Dad wakes at once and comes into the room.
    expect(host.npc("dad")).toMatchObject({ x: 8, z: 14 });
    await host.use("bed", "");
    expect(endings).toEqual(["Chips"]);
    host.dispose();
  });

  it("ends with Orange when the orange is picked up", async () => {
    const { host, endings } = await run();
    await host.use("orange", "");
    expect(endings).toEqual(["Orange"]);
    host.dispose();
  });

  it("lets the player sit a store good on the counter and buy it", async () => {
    const { host } = await run();
    await host.use("robux-3", ""); // $5
    await host.use("buy-cola", ""); // pick the cola up
    await useHeld(host, "store-counter"); // set it on the counter
    expect(host.prop("counter-item")).toMatchObject({ model: "cola.zip" });
    await host.talk("cashier", "");
    expect(host.dialogFor("")?.prompt).toContain("Bloxy Cola");
    await host.choose("cashier", 0, "");
    expect(host.inventory.heldItem()).toMatchObject({ id: "cola" });
    expect(host.prop("counter-item")).toBeNull();
    host.dispose();
  });

  it("refuses a purchase the player cannot afford", async () => {
    const { host, endings, toasts } = await run();
    await host.use("buy-egg", ""); // no cash yet
    await useHeld(host, "store-counter");
    await host.talk("cashier", "");
    await host.choose("cashier", 0, "");
    expect(toasts).toContain("You do not have enough cash for the Egg.");
    expect(endings).toEqual([]);
    expect(host.inventory.heldItem()).toBeNull();
    host.dispose();
  });

  it("only steals once the player leaves the store with an unpaid good", async () => {
    const { host, endings } = await run();
    await host.movePlayer("", 60, 62, 0); // into the store
    await host.use("buy-cola", "");
    expect(endings).toEqual([]);
    await host.movePlayer("", 30, 62, 0); // out the door
    expect(endings).toEqual(["Shoplifting"]);
    host.dispose();
  });

  it("sits an item on a plate and takes it back off", async () => {
    const { host } = await run();
    await host.use("cola", "");
    await useHeld(host, "plate1");
    expect(host.prop("plate-item-0")).toMatchObject({ model: "cola.zip" });
    expect(host.inventory.count("cola")).toBe(0);
    await useHeld(host, "plate1"); // empty hands take it back
    expect(host.prop("plate-item-0")).toBeNull();
    expect(host.inventory.heldItem()).toMatchObject({ id: "cola" });
    host.dispose();
  });

  it("cooks an egg and plates it with juice for a Perfect Breakfast", async () => {
    const { host, endings } = await run();
    await host.use("buy-egg", "");
    await useHeld(host, "stove");
    expect(host.prop("stove-item")).toMatchObject({ model: "egg.zip" });
    await advance(host, 6_000);
    expect(host.prop("stove-item")).toMatchObject({ model: "friedegg.zip" });
    await useHeld(host, "stove"); // off
    await useHeld(host, "stove"); // take the fried egg
    expect(host.inventory.heldItem()).toMatchObject({ id: "friedegg" });
    await useHeld(host, "plate1");
    await host.use("buy-juice", "");
    await useHeld(host, "plate2");
    expect(endings).toEqual(["Breakfast"]);
    host.dispose();
  });

  it("burns the house down when a non-egg is left on the stove", async () => {
    const { host, endings } = await run();
    await host.movePlayer("", 10, 62, 10); // the kitchen
    await host.use("cola", "");
    await useHeld(host, "stove");
    await advance(host, 5_000);
    expect(host.fire("fire-0")).toMatchObject({ height: 3.5 });
    await advance(host, 8_000);
    expect(endings).toContain("Fire");
    host.dispose();
  });

  it("frees the goods once the cashier goes on break", async () => {
    const { host, endings } = await run();
    await advance(host, 120_000);
    expect(host.npc("cashier")).toMatchObject({ x: 50, z: -14 });
    await host.movePlayer("", 60, 62, 0);
    await host.use("buy-cola", "");
    await host.movePlayer("", 30, 62, 0);
    expect(endings).toEqual([]);
    await host.talk("cashier", "");
    expect(host.dialogFor("")?.prompt).toContain("break");
    host.dispose();
  });

  it("scatters enough cash to afford the egg and a breakfast", async () => {
    const { host, toasts } = await run();
    for (let i = 1; i <= 14; i++) {
      await host.use(`tix-${i}`, "");
    }
    for (let i = 1; i <= 10; i++) {
      await host.use(`robux-${i}`, "");
    }
    expect(toasts.at(-1)).toBe("You pocket some Robux. ($64)");
    host.dispose();
  });
});

describe("the Late to School demo", () => {
  it("lists the place with its characters and fixtures", () => {
    const demo = builtinDemo("late-to-school");
    expect(demo?.manifest.name).toBe("Late to School");
    expect(demo?.manifest.models).toContain("npc-laugh.zip");
    expect(demo?.manifest.models).toContain("slushie-machine.zip");
    expect(demo?.manifest.models).toContain("arcade.zip");
    expect(BUILTIN_DEMOS).toContain(demo);
  });

  it("loads its models as bytes", async () => {
    const { project } = await lateToSchool();
    expect(Object.keys(project.models)).toContain("npc-laugh.zip");
    expect(Object.keys(project.models)).toContain("arcade.zip");
    expect(project.models["npc-laugh.zip"].bytes.length).toBeGreaterThan(0);
  });

  it("compiles its street, houses, and school", async () => {
    const { project, entry } = await lateToSchool();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    expect(plan.structures.some((shape) => shape.kind === "road")).toBe(true);
    expect(plan.structures.filter((shape) => shape.kind === "box").length).toBeGreaterThan(
      20,
    );
  });

  it("opens with its cast and the day's fixtures", async () => {
    const { host } = await runLts();
    expect(host.npcList).toHaveLength(17);
    expect(host.npc("laugh")).toMatchObject({
      name: "Laugh",
      model: "npc-laugh.zip",
    });
    expect(host.propList.some((prop) => prop.model === "arcade.zip")).toBe(
      true,
    );
    expect(host.prop("mailbox")).toMatchObject({ model: "mailbox.zip" });
    host.dispose();
  });

  it("ends with Sleep when the player goes back to bed", async () => {
    const { host, endings } = await runLts();
    await host.movePlayer("", -12, 62, 16); // the bedroom
    await host.use("bed", "");
    expect(endings).toEqual(["Sleep"]);
    host.dispose();
  });

  it("ends with Ded when the player drinks the lemonade", async () => {
    const { host, endings } = await runLts();
    await host.use("lemonade-stand", "", "lemonade");
    expect(endings).toEqual(["Ded"]);
    host.dispose();
  });

  it("ends with Flowey when the golden flower is used", async () => {
    const { host, endings } = await runLts();
    await host.use("flower", "");
    expect(endings).toEqual(["Flowey"]);
    host.dispose();
  });

  it("answers Laugh's dialog", async () => {
    const { host } = await runLts();
    await host.talk("laugh", "");
    expect(host.dialogFor("")?.prompt).toContain("why did I call you");
    await host.choose("laugh", 0, "");
    expect(host.dialogFor("")).toBeNull();
    host.dispose();
  });

  it("reads back the endings the place has already reached", async () => {
    const { host, toasts } = await runLts(["Sleep", "Ded"]);
    expect(toasts.some((text) => text.includes("Sleep, Ded"))).toBe(true);
    host.dispose();
  });

  it("ends with Bullied when the plush goes to school", async () => {
    const { host, endings } = await runLts();
    await host.use("plush", "");
    await host.talk("bully", "");
    expect(endings).toEqual(["Bullied"]);
    host.dispose();
  });

  it("ends with Big Brained after the nerd's quiz and a wait", async () => {
    const { host, endings } = await runLts();
    await host.talk("nerd", "");
    await host.choose("nerd", 0, "");
    await host.choose("nerd", 0, "");
    await host.choose("nerd", 1, "");
    await host.choose("nerd", 0, "");
    await advance(host, 8_000);
    await host.talk("nerd", "");
    expect(endings).toEqual(["Big Brained"]);
    host.dispose();
  });

  it("ends with Sit in a Chair after Laugh's gift", async () => {
    const { host, endings } = await runLts();
    await host.use("phone", "");
    await host.talk("laugh", "");
    await host.choose("laugh", 0, "");
    await host.use("chair", "");
    await host.use("bed", "");
    expect(endings).toEqual(["Sit in a Chair"]);
    host.dispose();
  });

  it("ends with Just being a Good Person when food reaches the homeless kid", async () => {
    const { host, endings } = await runLts();
    await host.use("chips", "");
    await host.talk("homeless", "");
    expect(endings).toEqual(["Just being a Good Person!"]);
    host.dispose();
  });

  it("ends with Shoplifter when an unpaid good leaves Bean Bros.", async () => {
    const { host, endings } = await runLts();
    await host.movePlayer("", 16, 62, -24);
    await host.use("bean-shelf-1", "");
    await host.movePlayer("", 16, 62, 0);
    expect(endings).toEqual(["Shoplifter"]);
    host.dispose();
  });

  it("ends with Criminal when the arcade burns and the player gets home", async () => {
    const { host, endings } = await runLts();
    await host.use("matches", "");
    await host.useItem("matches", "");
    await host.use("dumpster", "", "litmatches");
    await host.movePlayer("", -12, 62, 16);
    await advance(host, 30_000);
    expect(endings).toEqual(["Criminal"]);
    host.dispose();
  });

  it("ends with Certified Attorney after taking Laugh's side", async () => {
    const { host, endings } = await runLts();
    await host.talk("laugh", "");
    await host.choose("laugh", 1, "");
    await host.talk("brett", "");
    await host.choose("brett", 0, "");
    expect(endings).toEqual(["Certified Attorney"]);
    host.dispose();
  });

  it("ends with Excellent Employee after the delivery shift", async () => {
    const { host, endings } = await runLts();
    await host.talk("laugh", "");
    await host.choose("laugh", 1, "");
    await host.talk("brett", "");
    await host.choose("brett", 0, "");
    await host.use("mirror", "");
    await host.talk("brett", "");
    await host.talk("brad", "");
    await host.talk("nerd", "");
    await host.talk("littlebro", "");
    await host.talk("brett", "");
    expect(endings).toEqual(["Certified Attorney", "Excellent Employee"]);
    host.dispose();
  });

  it("ends with Instant Regret after feeding Sleepa her list", async () => {
    const { host, endings } = await runLts();
    await host.talk("sleepa", "");
    await host.talk("pothead", "");
    await host.choose("pothead", 0, "");
    await advance(host, 4_000);
    await host.talk("sleepa", "");
    await host.use("bean-shelf-2", "");
    await host.talk("sleepa", "");
    await host.talk("pothead", "");
    await host.choose("pothead", 2, "");
    await advance(host, 4_000);
    await host.talk("sleepa", "");
    expect(endings).toEqual(["Instant Regret"]);
    host.dispose();
  });

  it("ends with Champion after five roaster hits", async () => {
    const { host, endings } = await runLts();
    await host.use("key", "");
    await host.use("locked-door", "", "key");
    for (let i = 0; i < 5; i++) {
      await host.talk("champ", "");
    }
    expect(endings).toEqual(["Champion"]);
    host.dispose();
  });

  it("ends with Breakfast with two foods on the cafeteria plate", async () => {
    const { host, endings } = await runLts();
    await host.use("bean-shelf-1", "");
    await host.use("cafeteria-plate", "", "hotdog");
    await host.use("bean-shelf-2", "");
    await host.use("cafeteria-plate", "", "bean");
    expect(endings).toEqual(["Breakfast"]);
    host.dispose();
  });

  it("ends with Arcade Master after the token and the obby", async () => {
    const { host, endings } = await runLts();
    await host.use("cash-1", "");
    await host.use("token-atm", "");
    await host.use("broken-machine", "", "token");
    await advance(host, 6_000);
    expect(endings).toEqual(["Arcade Master"]);
    host.dispose();
  });

  it("ends with Monke Takeover when the monkey blows the arcade", async () => {
    const { host, endings } = await runLts();
    await host.use("banana", "");
    await host.use("cash-1", "");
    await host.use("slushie-machine", "");
    await host.useItem("slushie", "");
    await host.use("dumpster", "", "banana");
    await host.use("matches", "");
    await host.useItem("matches", "");
    await host.use("dumpster", "", "litmatches");
    await advance(host, 10_000);
    expect(endings).toEqual(["Monke Takeover"]);
    host.dispose();
  });

  it("gives the player a jump from a slushie without a banana", async () => {
    const { host, jumps } = await runLts();
    await host.use("cash-1", "");
    await host.use("slushie-machine", "");
    await host.useItem("slushie", "");
    expect(jumps).toEqual([1.6]);
    host.dispose();
  });

  it("ends with the Good Ending when the collection opens the classroom", async () => {
    const { host, endings } = await runLts(["Sleep", "Ded", "Flowey"]);
    await host.use("classroom-door", "");
    expect(endings).toEqual(["Good Ending"]);
    host.dispose();
  });

  it("ends with the Bad Ending when the bell has already rung", async () => {
    const { host, endings } = await runLts(["Sleep", "Ded", "Flowey"]);
    await advance(host, 120_000);
    await host.use("classroom-door", "");
    expect(endings).toEqual(["Bad Ending"]);
    host.dispose();
  });

  it("keeps the Dimensionator locked until the collection is ready", async () => {
    const { host } = await runLts();
    await host.use("dimensionator", "");
    expect(host.dialogFor("")).toBeNull();
    host.dispose();
  });

  it("resets the corrupted gate on a wrong button", async () => {
    const { host } = await runLts(["Good Ending", "Bad Ending"]);
    await host.use("corrupt-button-red", "");
    expect(host.prop("corrupt-gate")).not.toBeNull();
    host.dispose();
  });

  it("ends with the True Ending through the finale", async () => {
    const { host, endings } = await runLts(["Good Ending", "Bad Ending"]);
    await host.movePlayer("", -12, 62, 16);
    await host.movePlayer("", -12, 62, 0);
    expect(host.npc("james")).toMatchObject({ x: -12, z: 2 });
    await host.talk("james", "");
    await host.use("dimensionator", "");
    await host.choose("dimensionator", 0, "");
    await host.use("corrupt-button-blue", "");
    await host.use("corrupt-button-red", "");
    await host.use("corrupt-button-green", "");
    await host.use("corrupt-button-purple", "");
    expect(host.prop("corrupt-gate")).toBeNull();
    await host.use("corrupt-book", "");
    expect(host.npc("anomaly")).not.toBeNull();
    await host.use("corrupt-portal", "");
    for (let i = 0; i < 5; i++) {
      await host.talk("anomaly", "");
    }
    expect(endings).toEqual(["True Ending"]);
    host.dispose();
  });
});

describe("the Zombies demo", () => {
  /** A live player position the demo's own script reads through `engine.getPlayers`. */
  let players: Array<{ did: string; x: number; y: number; z: number }>;
  let zombieClockMs: number;

  /** Loads the Zombies demo and boots a host against the mutable `players` list. */
  const zombies = async (
    onPlayerDamage?: (amount: number, source: string | undefined) => void,
  ) => {
    stubModels();
    zombieClockMs = 0;
    players = [{ did: "", x: -200, y: 0, z: -8 }];
    const demo = builtinDemo("zombies")!;
    const project = await loadBuiltinDemo(demo);
    const host = new ScriptHost({
      seed: project.manifest.seed,
      getNow: () => zombieClockMs,
      getHeightAt: () => 0,
      getSolidAt: () => false,
      getWaterAt: () => false,
      getPlayers: () => players,
      onPlayerDamage: (_player, amount, source) =>
        onPlayerDamage?.(amount, source),
    });
    await host.loadProject(
      project.scripts,
      project.manifest.scripts![0],
      projectModelBytes(project),
    );
    return host;
  };

  /** Moves the shared clock forward and lets the zombie tick timer fire. */
  const advanceZombies = async (
    host: ScriptHost,
    ms: number,
  ): Promise<void> => {
    zombieClockMs += ms;
    await host.pump();
  };

  it("lists the place and bundles its zombie model", () => {
    const demo = builtinDemo("zombies");
    expect(demo?.manifest.name).toBe("Zombies");
    expect(demo?.manifest.models).toContain("zombie.zip");
    expect(demo?.manifest.mode).toBe("multi");
    expect(BUILTIN_DEMOS).toContain(demo);
  });

  it("loads its zombie model as bytes", async () => {
    stubModels();
    const project = await loadBuiltinDemo(builtinDemo("zombies")!);
    expect(project.models["zombie.zip"].bytes.length).toBeGreaterThan(0);
  });

  it("starts with the Guide and a held sword", async () => {
    const host = await zombies();
    expect(host.npc("guide")).toMatchObject({ name: "Guide" });
    expect(host.inventory.heldItem()).toMatchObject({ id: "sword" });
    host.dispose();
  });

  // Deterministic given the player's fixed start position: the zombie
  // population is a pure function of the (terrain-seed-independent)
  // population seed and the spawn cell, and (-200, -8) sits inside cell
  // (-7, -1), which the player's own window always materializes.
  const NEARBY_ZOMBIE_ID = "zombie--7_-1_0";

  it("materializes a zombie wearing the bundled model near the player", async () => {
    const host = await zombies();
    await advanceZombies(host, 150);
    expect(host.npc(NEARBY_ZOMBIE_ID)).toMatchObject({ model: "zombie.zip" });
    host.dispose();
  });

  it("chases the player once materialized and lands an attack", async () => {
    const damage: Array<{ amount: number; source: string | undefined }> = [];
    const host = await zombies((amount, source) =>
      damage.push({ amount, source }),
    );
    await advanceZombies(host, 150);
    const spawned = host.npc(NEARBY_ZOMBIE_ID)!;
    const startDistance = Math.hypot(
      spawned.x - players[0].x,
      spawned.z - players[0].z,
    );
    for (let i = 0; i < 30; i++) {
      await advanceZombies(host, 120);
    }
    const chased = host.npc(NEARBY_ZOMBIE_ID)!;
    const endDistance = Math.hypot(
      chased.x - players[0].x,
      chased.z - players[0].z,
    );
    expect(endDistance).toBeLessThan(startDistance);
    expect(damage.some((hit) => hit.source === NEARBY_ZOMBIE_ID)).toBe(true);
    host.dispose();
  });

  it("falls when its health reaches zero and is forgotten after its death fall", async () => {
    const host = await zombies();
    await advanceZombies(host, 150);
    await host.hit(NEARBY_ZOMBIE_ID, "", 25, players[0].x, players[0].z);
    expect(host.npc(NEARBY_ZOMBIE_ID)).toMatchObject({
      dyingAt: expect.any(Number),
    });
    await advanceZombies(host, 1_200);
    expect(host.npc(NEARBY_ZOMBIE_ID)).toBeNull();
    host.dispose();
  });
});

describe("the Zombies: The Mansion demo", () => {
  /** A live player position the demo's own script reads through `engine.getPlayers`. */
  let players: Array<{ did: string; x: number; y: number; z: number }>;
  let mansionClockMs: number;

  /** Loads the mansion demo and returns its project and script entry. */
  const mansionProject = async () => {
    stubModels();
    const project = await loadBuiltinDemo(builtinDemo("zombies-mansion")!);
    return { project, entry: project.manifest.scripts![0] };
  };

  /** Boots the mansion demo against the mutable `players` list and the shared clock. */
  const mansion = async () => {
    stubModels();
    mansionClockMs = 0;
    // The foyer, where the demo's own checkpoint stands the local player up.
    players = [{ did: "", x: 0, y: 62, z: 8 }];
    const { project, entry } = await mansionProject();
    const checkpoints: Array<{ x: number; z: number; y?: number }> = [];
    const toasts: string[] = [];
    const sounds: string[] = [];
    const host = new ScriptHost({
      seed: project.manifest.seed,
      getNow: () => mansionClockMs,
      getHeightAt: () => 62,
      getSolidAt: () => false,
      getWaterAt: () => false,
      getPlayers: () => players,
      onToast: (_player, text) => toasts.push(text),
      onCheckpoint: (_player, at) => checkpoints.push(at),
      onSound: (_player, name) => sounds.push(name),
    });
    await host.loadProject(project.scripts, entry, projectModelBytes(project));
    return { host, checkpoints, toasts, sounds };
  };

  /** Moves the shared clock forward one mansion tick and lets its timer fire. */
  const tickMansion = async (host: ScriptHost): Promise<void> => {
    mansionClockMs += 120;
    await host.pump();
  };

  /** Advances the clock until the arena has poured and chased `round`'s wave. */
  const pourWave = async (host: ScriptHost, ticks: number): Promise<void> => {
    for (let i = 0; i < ticks; i++) {
      await tickMansion(host);
    }
  };

  it("lists the place with its models and the foyer spawn", () => {
    const demo = builtinDemo("zombies-mansion");
    expect(demo?.manifest.name).toBe("Zombies: The Mansion");
    expect(demo?.manifest.seed).toBe(77_007);
    expect(demo?.manifest.mode).toBe("multi");
    for (const file of [
      "zombie.zip",
      "door.zip",
      "bench.zip",
      "shelf.zip",
      "table.zip",
      "trash.zip",
      "poster.zip",
    ]) {
      expect(demo?.manifest.models).toContain(file);
    }
    expect(BUILTIN_DEMOS).toContain(demo);
    // demo.manifest.spawn is [x, y, z] with the height derived from terrain:
    // x=0 in the foyer, y written at the floor, z=8 where the script's own
    // checkpoint stands the player.
    expect(demo?.manifest.spawn).toEqual([0, 62, 8]);
  });

  it("loads each of its models as bytes", async () => {
    const { project } = await mansionProject();
    for (const file of [
      "zombie.zip",
      "door.zip",
      "bench.zip",
      "shelf.zip",
      "table.zip",
      "trash.zip",
      "poster.zip",
    ]) {
      expect(project.models[file].bytes.length).toBeGreaterThan(0);
    }
  });

  it("compiles a plan whose walls cut the once floor and leave its gaps open", async () => {
    const { project, entry } = await mansionProject();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    const boxes = plan.structures.flatMap((shape) => expandShape(shape));
    // The foyer's stone floor tops out on world y 62, where every prop stands.
    expect(columnSurfaces(boxes, 0, 2)).toContain(62);
    // The interior wall between rooms b and c runs at voxel z=-8 (world -16),
    // rising to world y 70 at its top — a one-voxel door gap at voxel x=0.
    expect(columnSurfaces(boxes, -1, -8)).toContain(70);
    expect(columnSurfaces(boxes, 1, -8)).toContain(70);
    expect(columnSurfaces(boxes, 0, -8)).not.toContain(70);
    // The mansion's west wall runs at voxel x=-4 (world -8) and is holed by
    // each room's window — at voxel z=-5 (world -10) the wall reads as a hole.
    expect(columnSurfaces(boxes, -4, -6)).toContain(70);
    expect(columnSurfaces(boxes, -4, -5)).not.toContain(70);
    // The courtyard gate is the mansion's own north wall's one-voxel hole.
    expect(columnSurfaces(boxes, -2, -18)).toContain(70);
    expect(columnSurfaces(boxes, -1, -18)).not.toContain(70);
  });

  it("starts in the foyer with a held starter pistol and the whole arena stood", async () => {
    const { host, checkpoints, toasts } = await mansion();
    // The starter pistol is defined as a weapon and already in hand.
    expect(host.inventory.heldItem()).toMatchObject({ id: "pistol" });
    const pistol = host.inventory.definition("pistol");
    expect(pistol?.weapon).toEqual({
      damage: 6,
      reach: 34,
      fireIntervalMs: 240,
    });
    // Every window carries its board, every interior door stands sealed, and
    // the open courtyard gate is the one breach with no prop in it.
    for (const id of [
      "board.w-e",
      "board.w-d",
      "board.w-c",
      "board.w-b",
      "board.w-a",
      "board.w-n1",
      "board.w-n2",
      "board.w-cw",
      "board.w-ce",
    ]) {
      expect(host.prop(id)).toMatchObject({ model: "bench.zip" });
    }
    for (const id of ["door.de", "door.cd", "door.bc", "door.ab"]) {
      expect(host.prop(id)).toMatchObject({ model: "door.zip" });
    }
    expect(host.prop("door.court")).toBeNull();
    // Every window stands sealed against the player alone, so the horde can
    // still pour through a gap no player ever exits by.
    for (const id of [
      "bar.w-e",
      "bar.w-d",
      "bar.w-c",
      "bar.w-b",
      "bar.w-a",
      "bar.w-n1",
      "bar.w-n2",
      "bar.w-cw",
      "bar.w-ce",
    ]) {
      expect(host.barrier(id)).not.toBeNull();
    }
    // The four gun racks and the furniture are stood once.
    for (const id of [
      "rack.pistol",
      "rack.rifle",
      "rack.shotgun",
      "rack.machine",
    ]) {
      expect(host.prop(id)).toMatchObject({ model: "shelf.zip" });
    }
    expect(host.prop("table.e")).not.toBeNull();
    expect(host.prop("bench.court")).not.toBeNull();
    // The demo parks the respawn at the foyer floor and shows the opening HUD.
    expect(checkpoints).toEqual([{ x: 0, z: 8, y: 62 }]);
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "cash", kind: "text", text: "$0" }),
    );
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "round", kind: "text", text: "ROUND 1" }),
    );
    expect(toasts[0]).toContain("The horde comes in rounds");
    host.dispose();
  });

  it("pours round one out of the spawn sites and each kill stakes the wallet", async () => {
    const { host, sounds } = await mansion();
    // The opening breather is 2.5s, then the wave lets out and round one pours
    // one zombie per 1.5s from a rotating site, first from out west.
    await pourWave(host, 60);
    const first = host.npc("zombie-1-1");
    expect(first).toMatchObject({ model: "zombie.zip" });
    await host.hit(first!.id, "", 100, players[0].x, players[0].z);
    expect(host.npc(first!.id)).toMatchObject({
      dyingAt: expect.any(Number),
    });
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "cash", kind: "text", text: "$100" }),
    );
    expect(sounds).toContain("zombie-die");
    host.dispose();
  });

  it("hangs an eerie before a wave pours and growls as the horde strikes", async () => {
    const { host, sounds } = await mansion();
    // Stand under the first spawn site out west so round one's horde arrives at
    // arm's reach and its strikes ring out without a long chase.
    players[0].x = -26;
    players[0].z = -1;
    await pourWave(host, 45);
    // The eerie lands the moment the wave lets out, a beat before the first
    // zombie materializes; with the player at hand the horde then swings and
    // growls on every strike interval.
    expect(sounds).toContain("wave-eerie");
    for (let i = 0; i < 20 && !sounds.includes("zombie-growl"); i++) {
      await tickMansion(host);
    }
    expect(sounds).toContain("zombie-growl");
    host.dispose();
  });

  it("rings the wave complete chime once a whole wave falls, then eerie again", async () => {
    const { host, sounds } = await mansion();
    // Let round one's whole wave out, then take every zombie down. The
    // twelfth and last of round one's zombies isn't due to spawn until
    // shortly before tick 180 (2500ms breather + 2500ms eerie lead + eleven
    // spawns 1500ms apart), so 180 ticks alone can leave it not yet spawned;
    // 220 gives it comfortable room to have arrived.
    await pourWave(host, 220);
    for (let i = 1; i <= 12; i++) {
      const id = `zombie-1-${i}`;
      if (host.npc(id) !== null) {
        await host.hit(id, "", 100, players[0].x, players[0].z);
      }
    }
    expect(sounds).toContain("wave-complete");
    // The breather after the clear spills round two, with its own eerie first.
    const eerieBefore = sounds.filter((s) => s === "wave-eerie").length;
    await pourWave(host, 30);
    expect(sounds.filter((s) => s === "wave-eerie").length).toBeGreaterThan(
      eerieBefore,
    );
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "round", kind: "text", text: "ROUND 2" }),
    );
    host.dispose();
  });

  it("sells an interior door once five kills fill the wallet, and keeps it sold", async () => {
    const { host, toasts } = await mansion();
    // Let round one's full wave out, then make five kills for the foyer door.
    await pourWave(host, 180);
    for (let i = 1; i <= 5; i++) {
      const id = `zombie-1-${i}`;
      const npc = host.npc(id);
      if (npc !== null) {
        await host.hit(id, "", 100, players[0].x, players[0].z);
      }
    }
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "cash", kind: "text", text: "$500" }),
    );
    // The foyer door costs 500: buying it removes the prop and empties the wallet.
    await host.use("door.ab", "");
    expect(host.prop("door.ab")).toBeNull();
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "cash", kind: "text", text: "$0" }),
    );
    expect(toasts).toContain("Door open.");
    host.dispose();
  });

  it("resets the whole run when the local player dies, rebuyable doors aside", async () => {
    const { host, toasts } = await mansion();
    await pourWave(host, 180);
    for (let i = 1; i <= 5; i++) {
      const id = `zombie-1-${i}`;
      if (host.npc(id) !== null) {
        await host.hit(id, "", 100, players[0].x, players[0].z);
      }
    }
    // Buy the foyer door, then die with the guns spent: the run resets — cash
    // gone, every weapon taken, the door resealed, the round kept.
    await host.use("door.ab", "");
    expect(host.prop("door.ab")).toBeNull();
    await host.died("", "zombie-1-1");
    expect(host.inventory.heldItem()).toMatchObject({ id: "pistol" });
    expect(host.inventory.count("pistol")).toBe(1);
    expect(host.inventory.count("machine")).toBe(0);
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "cash", kind: "text", text: "$0" }),
    );
    expect(host.prop("door.ab")).toMatchObject({ model: "door.zip" });
    expect(toasts.some((line) => line.includes("You died in round 1"))).toBe(
      true,
    );
    host.dispose();
  });
});

/** Loads the "Don't Poop Yourself at School" demo and returns its script entry. */
const dontPoop = async () => {
  stubModels();
  const project = await loadBuiltinDemo(
    builtinDemo("dont-poop-yourself-at-school")!,
  );
  return { project, entry: project.manifest.scripts![0] };
};

/** Boots the obby demo, returning what its script said and heard. */
const runDp = async () => {
  clockMs = 0;
  const { project, entry } = await dontPoop();
  const endings: string[] = [];
  const narrations: string[] = [];
  const checkpoints: Array<number[]> = [];
  const kills: string[] = [];
  const voids: number[] = [];
  const host = new ScriptHost({
    seed: project.manifest.seed,
    getNow: () => clockMs,
    getHeightAt: () => 62,
    onTime: () => {},
    onEnding: (_player, state) => {
      if (state !== null) {
        endings.push(state.title);
      }
    },
    onNarrate: (_player, line) => narrations.push(line.text),
    onCheckpoint: (_player, at) => checkpoints.push([at.x, at.z, at.y ?? 0]),
    onKill: (_player, cause) => kills.push(cause),
    onVoid: (y) => voids.push(y),
  });
  await host.loadProject(project.scripts, entry, projectModelBytes(project));
  return { host, endings, narrations, checkpoints, kills, voids };
};

describe("the Home demo", () => {
  /** Boots the Home demo, returning its host and the toasts its script sent. */
  const runHome = async () => {
    const project = await loadBuiltinDemo(builtinDemo("home")!);
    const toasts: string[] = [];
    const host = new ScriptHost({
      seed: project.manifest.seed,
      getNow: () => 0,
      getHeightAt: () => 0,
      onToast: (_player, text) => toasts.push(text),
    });
    await host.loadProject(project.scripts, project.manifest.scripts![0]);
    return { host, toasts };
  };

  it("lists the place with no models, played straight from the demo root", () => {
    const demo = builtinDemo("home");
    expect(demo?.manifest.name).toBe("home");
    expect(demo?.manifest.mode).toBe("multi:edit");
    expect(demo?.manifest.models ?? []).toEqual([]);
    expect(BUILTIN_DEMOS).toContain(demo);
  });

  it("opens with the guide standing near the spawn", async () => {
    const { host } = await runHome();
    expect(host.npc("guide")).toMatchObject({ name: "Guide", x: 8, z: 8 });
    host.dispose();
  });

  it("greets whoever talks to the guide", async () => {
    const { host, toasts } = await runHome();
    await host.talk("guide", "");
    expect(toasts).toContain("Hello, traveller.");
    host.dispose();
  });
});

describe("the Don't Poop Yourself at School demo", () => {
  it("lists the demo with its models", () => {
    const demo = builtinDemo("dont-poop-yourself-at-school");
    expect(demo?.manifest.name).toBe("Don't Poop Yourself at School");
    expect(demo?.manifest.models).toContain("wet-floor.zip");
    expect(demo?.manifest.models).toContain("soap.zip");
    expect(BUILTIN_DEMOS).toContain(demo);
  });

  it("loads its models as bytes", async () => {
    const { project } = await dontPoop();
    expect(Object.keys(project.models)).toContain("wet-floor.zip");
    expect(project.models["wet-floor.zip"].bytes.length).toBeGreaterThan(0);
  });

  it("compiles a plan that includes a staircase", async () => {
    const { project, entry } = await dontPoop();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    expect(plan.structures.some((shape) => shape.kind === "stairs")).toBe(true);
  });

  it("attaches the staircase to the lobby floor", async () => {
    const { project, entry } = await dontPoop();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    const boxes = plan.structures.flatMap((shape) => expandShape(shape));
    // The lobby floor's east edge is at voxel z=-8 (world z=-16, surface 202),
    // and the first stair tread starts there, climbing one step to 204.
    expect(columnSurfaces(boxes, 0, -12)).toContain(202);
    expect(columnSurfaces(boxes, 0, -7)).toContain(204);
  });

  it("puts every checkpoint on a solid surface", async () => {
    const { project, entry } = await dontPoop();
    const plan = await compilePlacePlan({
      files: project.scripts,
      entry,
      seed: project.manifest.seed,
      region: planRegionAround(project.manifest.spawn),
    });
    const boxes = plan.structures.flatMap((shape) => expandShape(shape));
    const surfacesAt = (worldX: number, worldZ: number): number[] =>
      columnSurfaces(boxes, worldX / 2, worldZ / 2);
    expect(surfacesAt(0, -40)).toContain(202); // the lobby
    expect(surfacesAt(0, 16)).toContain(218); // the staircase pedestal
    expect(surfacesAt(0, 42)).toContain(218); // the hallway corridor
    expect(surfacesAt(0, 80)).toContain(218); // the cafeteria floor
    expect(surfacesAt(0, 210)).toContain(218); // the mud room floor
    expect(surfacesAt(0, 270)).toContain(220); // the bathroom floor
  });

  it("opens with the staff, the soap, the hazard sign, and a kill plane", async () => {
    const { host, voids } = await runDp();
    // Four NPCs: Janitor, Bully, Principal, and Teacher.
    expect(host.npcList.map((npc) => npc.id).sort()).toEqual([
      "bully",
      "janitor",
      "principal",
      "teacher",
    ]);
    expect(host.prop("wet-floor")).toMatchObject({ hazard: true });
    expect(host.prop("soap")).toMatchObject({ model: "soap.zip" });
    expect(host.voidY).toBe(150);
    expect(voids).toEqual([150]);
    host.dispose();
  });

  it("opens with an intro cutscene that takes the controls away", async () => {
    const { host } = await runDp();
    expect(host.cutsceneFor("")?.shots.length).toBeGreaterThan(1);
    expect(host.controlsLocked("")).toBe(true);
    host.dispose();
  });

  it("plays a camera beat when the climb begins", async () => {
    const { host } = await runDp();
    await host.movePlayer("", 0, 211, -18); // onto the staircase
    expect(host.cutsceneFor("")?.shots).toEqual([
      {
        at: [30, 234, -8],
        look: [0, 210, -40],
        durationMs: 2_000,
        holdMs: 600,
        ease: "smooth",
      },
    ]);
    host.dispose();
  });

  it("sets a checkpoint and marks it when the player reaches a pad", async () => {
    const { host, checkpoints } = await runDp();
    await host.movePlayer("", 0, 211, -18); // onto the staircase zone
    expect(checkpoints).toContainEqual([0, 16, 218]);
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "checkpoint", kind: "text" }),
    );
    host.dispose();
  });

  it("shows a filling bladder meter and loses when it fills", async () => {
    const { host, endings } = await runDp();
    expect(host.hudFor("")).toContainEqual(
      expect.objectContaining({ id: "bladder", kind: "bar", max: 12 }),
    );
    expect(host.hudFor("")[0]).toMatchObject({ value: 0 });
    for (let i = 0; i < 12; i++) {
      clockMs += 8_000;
      await host.pump();
    }
    expect(endings).toEqual(["Accident"]);
    expect(host.hudFor("")[0]).toMatchObject({ value: 12 });
    host.dispose();
  });

  it("samples the moving props off the shared clock", async () => {
    const { host } = await runDp();
    clockMs = 0;
    const turntable0 = host.propPose("turntable");
    const plank0 = host.propPose("moving-plank");
    clockMs = 2_000;
    const turntable1 = host.propPose("turntable");
    const plank1 = host.propPose("moving-plank");
    expect(turntable0).not.toBeNull();
    expect(turntable1?.yaw).not.toBeCloseTo(turntable0?.yaw ?? 0, 3);
    expect(plank1?.dz).not.toBeCloseTo(plank0?.dz ?? 0, 3);
    expect(host.prop("toilet-roll")?.motion?.spin).toBeDefined();
    host.dispose();
  });

  it("kills the player and counts the death when a hazard is touched", async () => {
    const { host, kills, narrations } = await runDp();
    await host.touched("", "wet-floor");
    expect(kills).toEqual(["wet-floor"]);
    expect(narrations.some((line) => line.includes("Deaths so far"))).toBe(
      true,
    );
    host.dispose();
  });

  it("ends with Relieved when the player reaches the restroom", async () => {
    const { host, endings } = await runDp();
    // The bathroom zone now runs from world z=270 to z=310.
    await host.movePlayer("", 0, 220, 280);
    expect(endings).toEqual(["Relieved"]);
    host.dispose();
  });
});
