// Measures voxelscape on the real graphics card. Boots the production build
// once, then drives the player through each scenario against the same warm
// page and carries away what the in-app probe recorded.
//
//   pnpm bench                       # stand and walk at radius 3, about 20s
//   pnpm bench --all --repeat 3      # every scenario, three times each
//   pnpm bench walk sprint --radius 4
//   pnpm bench --profile phone       # as if on a mid-range phone
//   pnpm bench --unlocked            # draw without waiting for the display,
//                                    # so the gap measures what a frame costs
//   pnpm bench --scale 0.5           # pin the render scale somewhere else
//   pnpm bench --adaptive            # let the resolution scaler run, to
//                                    # measure the scaler itself
//   pnpm bench --at bcf5696          # measure some other commit, checked out
//                                    # beside this one, with this harness
//   pnpm bench --monsters            # leave the monsters in the world, to
//                                    # measure what they cost
//   pnpm bench --android             # measure on the phone plugged in here,
//                                    # in the Chrome it already has
//   pnpm bench walk --functions      # sample the main thread and say which
//                                    # functions spent it
//   pnpm bench --antialias           # draw the canvas multisampled, which the
//                                    # world no longer does by default
//   pnpm bench walk --trace          # record what the graphics process did,
//                                    # which is where a frame's wait on the
//                                    # card is written down
//   pnpm bench walk --trace-memory   # trace what every process is holding as
//                                    # well, the driver's buffers included;
//                                    # the dumps stall the page, so read this
//                                    # one for memory and not for frames
//
// A commit is measured through the harness in this checkout, so the scenarios,
// the report and its page are whatever they are here; only the application
// being driven comes from the commit. A commit from before the application
// carried a bench surface cannot be measured, and shows up as the wait for
// that surface timing out.
//
// A headed browser is not optional: headless Chromium draws through a software
// rasterizer, where every frame is slow enough to drown the numbers being
// measured.
import { chromium } from "playwright";
import type {
  AndroidDevice,
  Browser,
  BrowserContext,
  CDPSession,
  Page,
} from "playwright";
import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { outPath } from "../out-dir.ts";
import {
  attachedPhone,
  describePhone,
  devicePower,
  forwardPort,
  rotateLandscape,
} from "./android.ts";
import { describePower, systemPower } from "./power.ts";
import type { PowerState } from "./power.ts";
import { QUICK_SCENARIOS, SCENARIOS, routeDistance } from "./scenarios.ts";
import type { Scenario } from "./scenarios.ts";
import { profileNamed } from "./profiles.ts";
import type { MachineProfile } from "./profiles.ts";
import { summarize } from "./summarize.ts";
import { formatReport, representativeIndex } from "./report.ts";
import type { BenchReport, ScenarioReport } from "./report.ts";
import type { PerfDrain } from "../../src/render/perf-probe.ts";
import {
  dumpMemory,
  formatTrace,
  startTrace,
  stopTrace,
  summarizeTrace,
} from "./trace.ts";
import type { TraceSummary } from "./trace.ts";
import {
  formatFunctions,
  startSampling,
  stopSampling,
  summarizeProfile,
} from "./functions.ts";
import type { FunctionSummary } from "./functions.ts";
import { writeHtmlReport } from "./html.ts";

/** The application directory, whatever directory the script was started from. */
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DEFAULT_PORT = 4173;
/** How long to let the world settle after the window has finished loading. */
const SETTLE_MS = 1500;
/** How long past a route's own length to wait before draining, for the last frames. */
const DRAIN_SLACK_MS = 400;
/** The second of the 20-minute day the clock is pinned to: full daylight. */
const PINNED_TIME_SECONDS = 300;

/** The bench surface `create-voxelscape.ts` puts on the page under `#bench`. */
interface BenchWindow {
  loading(): { drawn: number; total: number; spawnDrawn: boolean };
  blockCount: number;
  chunkRadius: number;
  run(line: string): string | Promise<string>;
  queues(): {
    fillPending: number;
    fillInFlight: number;
    meshPending: number;
    meshInFlight: number;
    dirtySuperchunks: number;
  };
  probe: { arm(capacityFrames?: number): void; drain(): PerfDrain };
  drive(route: {
    heading: number;
    speed: number;
    turn: number;
    seconds: number;
  }): void;
}

interface Options {
  scenarios: Scenario[];
  repeat: number;
  radius: number;
  port: number;
  headless: boolean;
  profile: MachineProfile;
  /** The render scale to pin, or undefined to take the profile's. */
  scale?: number;
  /**
   * Whether to leave the resolution scaler adapting. Off by default: a scaler
   * free to lower the render scale answers a slower frame by drawing fewer
   * pixels, so a renderer that got slower reports the same frame time on a
   * smaller canvas and the regression never appears in the numbers.
   */
  adaptive: boolean;
  /**
   * Whether to let the browser draw as fast as it can rather than waiting for
   * the display. Waiting hides the cost of a frame behind the refresh rate;
   * not waiting turns the gap back into a measurement of what a frame costs.
   */
  unlocked: boolean;
  /**
   * Whether to record a browser trace around each scenario, carrying what the
   * graphics process does with the commands the page sends it — where a
   * frame's wait on the card is written down, which the page cannot time.
   */
  trace: boolean;
  /**
   * Whether that trace also records what every part of the browser is holding,
   * including the driver's own buffers and textures, which the page has no way
   * to count. The browser takes dumps of its own while this is on and each one
   * stops a thread for as long as a tenth of a second on a phone, so a run
   * asking for it is asking about memory rather than about frames.
   */
  traceMemory: boolean;
  /** The commit to measure, if not the one this checkout stands on. */
  at?: string;
  /**
   * Whether to leave the world growing monsters. A monster walks where the
   * terrain and the frame rate take it and swings when it reaches the player,
   * so it puts a different fight into every run; the benchmark empties the
   * world of them unless this asks for them.
   */
  monsters: boolean;
  /**
   * Whether the canvas is drawn multisampled. Off by default, as the world now
   * is; a run that asks for it measures what holding several samples of every
   * pixel costs, which on a phone is 54MiB of the graphics card.
   */
  antialias: boolean;
  /**
   * Whether to sample the main thread while each scenario runs and report which
   * functions spent its time. Sampling costs the thread a few percent, so a run
   * that asks for it is for reading rather than for comparing.
   */
  functions: boolean;
  /**
   * Whether to measure on the phone plugged into this machine rather than in a
   * window here. A phone brings its own screen and its own power, so a run on
   * one takes those instead of this command's, and refuses the flags that stand
   * in for a machine it already is.
   */
  android: boolean;
}

const parseOptions = (argv: string[]): Options => {
  const named: string[] = [];
  let repeat = 1;
  let radius = 3;
  let port = DEFAULT_PORT;
  let headless = false;
  let all = false;
  let unlocked = false;
  let adaptive = false;
  let trace = false;
  let traceMemory = false;
  let scale: number | undefined;
  let at: string | undefined;
  let monsters = false;
  let android = false;
  let functions = false;
  let antialias = false;
  let profile = profileNamed("native");
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (argument === "--all") {
      all = true;
    } else if (argument === "--headless") {
      headless = true;
    } else if (argument === "--unlocked") {
      unlocked = true;
    } else if (argument === "--profile") {
      profile = profileNamed(argv[++i]);
    } else if (argument === "--adaptive") {
      adaptive = true;
    } else if (argument === "--trace") {
      trace = true;
    } else if (argument === "--trace-memory") {
      traceMemory = true;
      trace = true;
    } else if (argument === "--scale") {
      scale = Number(argv[++i]);
    } else if (argument === "--repeat") {
      repeat = Number(argv[++i]);
    } else if (argument === "--radius") {
      radius = Number(argv[++i]);
    } else if (argument === "--port") {
      port = Number(argv[++i]);
    } else if (argument === "--at") {
      at = argv[++i];
    } else if (argument === "--monsters") {
      monsters = true;
    } else if (argument === "--android") {
      android = true;
    } else if (argument === "--functions") {
      functions = true;
    } else if (argument === "--antialias") {
      antialias = true;
    } else if (argument.startsWith("--")) {
      throw new Error(`unknown option ${argument}`);
    } else {
      named.push(argument);
    }
  }
  const wanted = all
    ? SCENARIOS.map((scenario) => scenario.name)
    : named.length > 0
      ? named
      : QUICK_SCENARIOS;
  const scenarios = wanted.map((name) => {
    const scenario = SCENARIOS.find((candidate) => candidate.name === name);
    if (scenario === undefined) {
      throw new Error(
        `no scenario named ${name}; there is ${SCENARIOS.map((s) => s.name).join(", ")}`,
      );
    }
    return scenario;
  });
  return {
    scenarios,
    repeat,
    radius,
    port,
    headless,
    profile,
    unlocked,
    adaptive,
    trace,
    traceMemory,
    scale,
    at,
    monsters,
    android,
    functions,
    antialias,
  };
};

const git = (...args: string[]): string =>
  execFileSync("git", args, { cwd: APP_DIR, encoding: "utf8" }).trim();

/** Where a commit checked out to be measured is kept. */
const WORKTREE_DIR = join(APP_DIR, "..", "..", ".worktrees");

/** The application a run measures, and what the report says it was. */
/**
 * How one subject is built and served. A build carrying the frame-timing probe
 * is a separate one — `build:bench`, into `dist-bench` — but a commit from
 * before that split compiled the probe into its only build, and there the plain
 * one is what a run can arm.
 */
interface BuildScripts {
  build: string;
  serve: string;
  /** The directory that build writes, relative to the application's. */
  dist: string;
}

/** Which of those a checkout has, read from the scripts it declares. */
const buildScriptsOf = (dir: string): BuildScripts => {
  const declared = JSON.parse(
    readFileSync(join(dir, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return declared.scripts?.["build:bench"] === undefined
    ? { build: "build", serve: "serve", dist: "dist" }
    : { build: "build:bench", serve: "serve:bench", dist: "dist-bench" };
};

interface Subject {
  /** The application directory to build and serve. */
  dir: string;
  /** The commit the report is stamped with, short. */
  commit: string;
  /** Whether that directory carries changes the commit does not. */
  dirty: boolean;
}

/** The checkout the harness is being read from, changes and all. */
const thisCheckout = (): Subject => ({
  dir: APP_DIR,
  commit: git("rev-parse", "--short", "HEAD"),
  dirty: git("status", "--porcelain") !== "",
});

/**
 * Checks `revision` out into a worktree of its own and installs what it asks
 * for, so a run can measure a commit without disturbing the checkout being
 * worked in. What a commit depends on belongs to it as much as its source
 * does — the renderer the world draws through is a package like any other,
 * and two commits can name different versions of it — so the worktree gets
 * its own installation rather than borrowing this one's.
 *
 * The worktree is left behind, and a later run of the same commit reuses it
 * as it stands; `git worktree remove` clears one out.
 *
 * @param revision Anything git can resolve to a commit.
 * @returns The application under test in that worktree.
 */
const checkOut = (revision: string): Subject => {
  const commit = git("rev-parse", "--short", `${revision}^{commit}`);
  const worktree = join(WORKTREE_DIR, `bench-${commit}`);
  if (!existsSync(worktree)) {
    console.log(`checking ${commit} out into ${worktree}`);
    execFileSync("git", ["worktree", "add", "--detach", worktree, commit], {
      cwd: APP_DIR,
      stdio: "inherit",
    });
    execFileSync("pnpm", ["install", "--frozen-lockfile"], {
      cwd: worktree,
      stdio: "inherit",
    });
  }
  return { dir: join(worktree, "apps", "voxelscape"), commit, dirty: false };
};

/** The most recently changed file anywhere under a directory. */
const newestChange = (directory: string): number => {
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    newest = Math.max(
      newest,
      entry.isDirectory() ? newestChange(path) : statSync(path).mtimeMs,
    );
  }
  return newest;
};

/**
 * Builds the site in `dir` when anything the build reads has moved on since the
 * last one: the sources, and the files that decide what the build makes of them.
 * A configuration change with untouched sources still makes a different site.
 */
const buildIfStale = (dir: string, scripts: BuildScripts): void => {
  // The bench build carries `VITE_PERF=true` so the in-app probe this
  // harness arms and drains actually exists; the plain `pnpm build` a player
  // gets tree-shakes it out entirely, and would leave nothing to arm. A commit
  // from before the two were split has only the one build, with the probe in
  // it, which is why the scripts are read rather than assumed.
  const built = join(dir, scripts.dist, "index.html");
  const configured = ["vite.config.ts", "package.json", "index.html"]
    .map((name) => join(dir, name))
    .filter((path) => existsSync(path))
    .map((path) => statSync(path).mtimeMs);
  const newest = Math.max(newestChange(join(dir, "src")), ...configured);
  if (existsSync(built) && statSync(built).mtimeMs > newest) {
    return;
  }
  console.log("building the site (sources are newer than the last build)");
  execFileSync("pnpm", [scripts.build], { cwd: dir, stdio: "inherit" });
};

const answers = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * A preview server on the wanted port: the one already running if there is
 * one, or a new one this run starts and stops again.
 */
const serve = async (port: number, subject: Subject): Promise<() => void> => {
  const url = `http://127.0.0.1:${port}/`;
  if (await answers(url)) {
    // A server that was already up is serving a build nothing here chose, so
    // a run that was asked for one particular commit cannot take it on trust.
    if (subject.dir !== APP_DIR) {
      throw new Error(
        `something already answers on port ${port}, and a run measuring ${subject.commit} cannot tell which build that is; stop it, or pass --port`,
      );
    }
    console.log(`using the preview server already on port ${port}`);
    return () => {};
  }
  const scripts = buildScriptsOf(subject.dir);
  buildIfStale(subject.dir, scripts);
  const server = spawn("pnpm", [scripts.serve, "--port", String(port)], {
    cwd: subject.dir,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await answers(url)) {
      return () => server.kill();
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  server.kill();
  throw new Error(`the preview server never answered on port ${port}`);
};

/** Waits until every block of the initial window has been generated and drawn. */
const waitForWindow = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () =>
      (window as unknown as { __voxelscape?: object }).__voxelscape !==
      undefined,
    undefined,
    { timeout: 120000 },
  );
  await page.waitForFunction(
    () => {
      const bench = (window as unknown as { __voxelscape: BenchWindow })
        .__voxelscape;
      const progress = bench.loading();
      return progress.spawnDrawn && progress.drawn >= progress.total;
    },
    undefined,
    { timeout: 180000 },
  );
};

/**
 * Holds still everything that would otherwise differ between two runs of the
 * same commit: the render scale (the adaptive scaler would absorb a slower
 * renderer as a smaller canvas instead of a slower frame), the time of day,
 * and the weather.
 *
 * @returns What the world said about its worker pool, for the report.
 */
const pinConditions = async (
  page: Page,
  pins: {
    scale: number;
    adaptive: boolean;
    timeSeconds: number;
    workers?: number;
    monsters: boolean;
  },
): Promise<{ workers: string; monsters: string }> =>
  page.evaluate(async (pins) => {
    const bench = (window as unknown as { __voxelscape: BenchWindow })
      .__voxelscape;
    await bench.run(
      pins.adaptive
        ? "/render:resolution auto"
        : `/render:resolution ${pins.scale}`,
    );
    await bench.run("/clock:speed 0");
    await bench.run(`/clock:time ${pins.timeSeconds}`);
    await bench.run("/weather clear");
    if (pins.workers !== undefined) {
      await bench.run(`/world:workers ${pins.workers}`);
    }
    const monsters = pins.monsters
      ? "monsters: left in the world"
      : String(await bench.run("/monsters:spawning off"));
    return { workers: String(await bench.run("/world:workers")), monsters };
  }, pins);

/**
 * Waits for the terrain the previous scenario asked for to finish arriving.
 * A scenario that starts while the last one's fills are still landing measures
 * that backlog instead of its own, and reports terrain it never asked for.
 *
 * Superchunks left dirty are not waited on: one the camera cannot see stays
 * dirty by design until the camera turns onto it, so a standing player never
 * reaches zero.
 */
const waitForQuiet = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const bench = (window as unknown as { __voxelscape: BenchWindow })
        .__voxelscape;
      const queues = bench.queues();
      return (
        queues.fillPending === 0 &&
        queues.fillInFlight === 0 &&
        queues.meshPending === 0 &&
        queues.meshInFlight === 0
      );
    },
    undefined,
    { timeout: 120000 },
  );
};

/** Runs one scenario once and carries away what the probe recorded. */
const measure = async (
  page: Page,
  scenario: Scenario,
  tracing: { cdp: CDPSession; file: string; memory: boolean } | undefined,
  sampling: { cdp: CDPSession; file: string; distDir: string } | undefined,
): Promise<{
  drain: PerfDrain;
  trace?: TraceSummary;
  functions?: FunctionSummary;
}> => {
  await waitForQuiet(page);
  await page.waitForTimeout((scenario.settleSeconds ?? 0.5) * 1000);
  const events =
    tracing === undefined ? [] : await startTrace(tracing.cdp, tracing.memory);
  if (tracing?.memory === true) {
    await dumpMemory(tracing.cdp);
  }
  if (sampling !== undefined) {
    await startSampling(sampling.cdp);
  }
  await page.evaluate((route) => {
    const bench = (window as unknown as { __voxelscape: BenchWindow })
      .__voxelscape;
    bench.probe.arm();
    bench.drive(route);
  }, scenario.route);
  await page.waitForTimeout(scenario.route.seconds * 1000 + DRAIN_SLACK_MS);
  const drain = await page.evaluate(() => {
    const bench = (window as unknown as { __voxelscape: BenchWindow })
      .__voxelscape;
    return bench.probe.drain();
  });
  let functions: FunctionSummary | undefined;
  if (sampling !== undefined) {
    const profile = await stopSampling(sampling.cdp);
    writeFileSync(sampling.file, JSON.stringify(profile));
    functions = summarizeProfile(
      profile,
      sampling.file,
      scenario.name,
      sampling.distDir,
    );
  }
  if (tracing === undefined) {
    return { drain, functions };
  }
  if (tracing.memory) {
    await dumpMemory(tracing.cdp);
  }
  await stopTrace(tracing.cdp);
  writeFileSync(tracing.file, JSON.stringify(events));
  return {
    drain,
    functions,
    trace: summarizeTrace(events, scenario.name, tracing.file),
  };
};

/**
 * What the browser says about the machine's power. Chromium answers this on
 * every system it runs on, which is what makes it the fallback where the
 * system itself was not asked; it says nothing about a low-power mode.
 */
const browserPower = (page: Page): Promise<Partial<PowerState>> =>
  page.evaluate(async () => {
    const battery = (
      navigator as Navigator & {
        getBattery?: () => Promise<{ charging: boolean; level: number }>;
      }
    ).getBattery;
    if (battery === undefined) {
      return {};
    }
    const state = await battery.call(navigator);
    return {
      source: state.charging ? ("wall" as const) : ("battery" as const),
      charge: state.level,
    };
  });

/** What the system and the browser between them know about the machine's power. */
const powerNow = async (page: Page): Promise<PowerState> => {
  const system = systemPower();
  if (system.source !== "unknown" && system.charge !== null) {
    return system;
  }
  const browser = await browserPower(page);
  return {
    source:
      system.source === "unknown"
        ? (browser.source ?? "unknown")
        : system.source,
    charge: system.charge ?? browser.charge ?? null,
    lowPower: system.lowPower,
  };
};

const describeMachine = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const bench = (window as unknown as { __voxelscape: BenchWindow })
      .__voxelscape;
    return {
      graphicsCard:
        info === null || info === undefined || gl === null
          ? "unknown graphics card"
          : String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)),
      cores: navigator.hardwareConcurrency ?? 0,
      // Read from the page rather than from what was asked for: a phone gives
      // the page the screen it has, whatever a profile would have chosen.
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      blockCount: bench.blockCount,
      chunkRadius: bench.chunkRadius,
    };
  });

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  if (options.android) {
    // Each of these stands in for a machine, and the phone is the machine.
    if (options.unlocked) {
      throw new Error(
        "a phone's Chrome cannot be told to stop waiting for its display, so a run on one is always paced; measure it without --unlocked",
      );
    }
    if (options.headless) {
      throw new Error(
        "--headless says nothing about a phone: its Chrome draws on the screen either way",
      );
    }
    if (options.profile.cpuThrottle > 1) {
      throw new Error(
        `the ${options.profile.name} profile slows this machine's processor to stand in for a phone, and this is a phone; measure it with --profile native`,
      );
    }
  }
  const subject =
    options.at === undefined ? thisCheckout() : checkOut(options.at);
  const stopServer = await serve(options.port, subject);
  let browser: Browser | undefined;
  let phone: AndroidDevice | undefined;
  let phoneBrowser: BrowserContext | undefined;
  let stopForwarding: (() => void) | undefined;
  let stopRotation: (() => Promise<void>) | undefined;
  try {
    let page: Page;
    if (options.android) {
      phone = await attachedPhone();
      console.log(`measuring on ${describePhone(phone)}`);
      // The phone's Chrome loads `localhost` on the phone, so the preview
      // server here has to answer there.
      stopForwarding = forwardPort(phone.serial(), options.port);
      // On its side before Chrome starts, so the page is laid out once at the
      // size it will be measured at.
      stopRotation = await rotateLandscape(phone);
      // No page size and no pixel ratio are asked for: the point of a run on a
      // phone is the screen the phone has.
      phoneBrowser = await phone.launchBrowser();
      page = await phoneBrowser.newPage();
    } else {
      browser = await chromium.launch({
        headless: options.headless,
        // Left to itself the browser waits for the display, so every frame
        // reads as the refresh period however little work it did. Told not to
        // wait, the gap between frames becomes the frame's actual cost —
        // including the graphics card's part of it, which is the only way to
        // see that cost where the card refuses to time itself.
        args: options.unlocked
          ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"]
          : [],
      });
      page = await browser.newPage({
        viewport: options.profile.viewport,
        deviceScaleFactor: options.profile.devicePixelRatio,
      });
    }
    const url =
      `http://127.0.0.1:${options.port}/?radius=${options.radius}` +
      `${options.antialias ? "&antialias=1" : ""}#/?bench=1`;
    console.log(`loading ${url}`);
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await waitForWindow(page);
    console.log("window loaded; settling");
    await page.waitForTimeout(SETTLE_MS);
    const scale = options.scale ?? options.profile.scale;
    const pinned = await pinConditions(page, {
      scale,
      adaptive: options.adaptive,
      timeSeconds: PINNED_TIME_SECONDS,
      workers: options.profile.workers,
      monsters: options.monsters,
    });
    // A build older than the command does not know how to put its monsters
    // away, and would be measured with a fight in it against one that was
    // not. Better to stop than to report two runs as comparable.
    if (!options.monsters && pinned.monsters.startsWith("unknown command")) {
      throw new Error(
        "this build cannot empty the world of monsters, so its numbers would carry a fight the other run does not; measure it with --monsters, and the other run too",
      );
    }
    console.log(pinned.monsters);
    const machine = await describeMachine(page);
    const power =
      phone === undefined ? await powerNow(page) : await devicePower(phone);
    console.log(`measuring ${describePower(power)}`);
    // The processor is slowed only once the window has loaded. Boot would
    // otherwise take the slowdown too, and what is being measured is a world
    // already standing, not the wait to reach it.
    if (options.profile.cpuThrottle > 1 && phone === undefined) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", {
        rate: options.profile.cpuThrottle,
      });
      console.log(
        `processor slowed ${options.profile.cpuThrottle} times for the ${options.profile.name} profile`,
      );
    }

    // One session for the whole run: a trace is recorded through it, and the
    // processor throttle above was set through another on the same page.
    const traceCdp = options.trace
      ? await page.context().newCDPSession(page)
      : undefined;
    // The sampler runs through its own session, so arming and disarming it
    // around each scenario cannot disturb a trace being recorded through the
    // one above.
    const samplingCdp = options.functions
      ? await page.context().newCDPSession(page)
      : undefined;
    const scenarios: ScenarioReport[] = [];
    const traces: TraceSummary[] = [];
    const sampled: FunctionSummary[] = [];
    for (const scenario of options.scenarios) {
      const repeats = [];
      const drains: PerfDrain[] = [];
      for (let repeat = 0; repeat < options.repeat; repeat++) {
        process.stdout.write(
          `measuring ${scenario.name} (${repeat + 1}/${options.repeat})…\n`,
        );
        // Only the first repeat is traced: recording costs time of its own,
        // and one trace answers what a trace is asked.
        const tracing =
          traceCdp !== undefined && repeat === 0
            ? {
                cdp: traceCdp,
                file: outPath(`trace-${scenario.name}-${Date.now()}.json`),
                memory: options.traceMemory,
              }
            : undefined;
        // Only the first repeat is sampled, for the same reason as the trace:
        // one profile answers what a profile is asked, and the sampling costs
        // the thread it watches.
        const samplingHere =
          samplingCdp !== undefined && repeat === 0
            ? {
                cdp: samplingCdp,
                file: outPath(
                  `profile-${scenario.name}-${Date.now()}.cpuprofile`,
                ),
                distDir: join(subject.dir, buildScriptsOf(subject.dir).dist),
              }
            : undefined;
        const measured = await measure(page, scenario, tracing, samplingHere);
        repeats.push(summarize(measured.drain));
        drains.push(measured.drain);
        if (measured.trace !== undefined) {
          traces.push(measured.trace);
        }
        if (measured.functions !== undefined) {
          sampled.push(measured.functions);
        }
      }
      const reported = drains[representativeIndex(repeats)];
      scenarios.push({
        name: scenario.name,
        description: scenario.description,
        expectedUnits: routeDistance(scenario.route),
        repeats,
        samples: {
          rows: reported.rows,
          rowStride: reported.rowStride,
          fieldNames: reported.fieldNames,
          phaseNames: reported.phaseNames,
        },
      });
    }

    // Nothing past this point measures anything, and writing the report takes
    // long enough to notice, so the window goes away as soon as the last
    // scenario has been drained rather than at the end of the run.
    await browser?.close();
    browser = undefined;
    await phoneBrowser?.close();
    phoneBrowser = undefined;
    // The rotation is put back by asking the phone to, so it goes back before
    // the phone is let go of rather than after.
    await stopRotation?.();
    stopRotation = undefined;
    await phone?.close();
    phone = undefined;

    const report: BenchReport = {
      context: {
        commit: subject.commit,
        dirty: subject.dirty,
        finishedAt: new Date().toISOString(),
        graphicsCard: machine.graphicsCard,
        cores: machine.cores,
        viewport: machine.viewport,
        devicePixelRatio: machine.devicePixelRatio,
        chunkRadius: machine.chunkRadius,
        blockCount: machine.blockCount,
        pinnedScale: scale,
        antialias: options.antialias,
        adaptiveResolution: options.adaptive,
        workers: pinned.workers,
        profile: options.profile.name,
        cpuThrottle: options.profile.cpuThrottle,
        pacing: options.unlocked ? "unlocked" : "paced",
        monsters: options.monsters,
        power,
      },
      scenarios,
    };

    const file = outPath(`bench-${report.context.commit}-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify(report, null, 2));
    const drawn = await writeHtmlReport(
      report,
      traces,
      file.replace(/\.json$/, ".html"),
    );
    const traceLines =
      traces.length === 0 ? "" : `\n\n${traces.map(formatTrace).join("\n\n")}`;
    const functionLines =
      sampled.length === 0
        ? ""
        : `\n\n${sampled.map(formatFunctions).join("\n\n")}`;
    console.log(
      `\n${formatReport(report)}${traceLines}${functionLines}\n\nwritten to ${file}\ndrawn in ${drawn}`,
    );
  } finally {
    await browser?.close();
    await phoneBrowser?.close();
    await stopRotation?.();
    await phone?.close();
    stopForwarding?.();
    stopServer();
  }
};

main().catch((error) => {
  console.error("bench failed:", error);
  process.exit(1);
});
