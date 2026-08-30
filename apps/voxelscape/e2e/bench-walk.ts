// Benchmarks the main thread while the player walks, to catch the freeze that
// appears after sustained forward movement. Requires the production build
// served by `vite preview` (the default `URL`/port below).
//
//   node --experimental-transform-types e2e/bench-walk.ts            # standing vs walking long tasks + frames
//   node --experimental-transform-types e2e/bench-walk.ts --profile  # also capture a CPU profile of walking
//
// A headed Chromium (a real GPU path) gives frame times close to the player's;
// headless SwiftShader is so slow that every frame is a long task. A viewport
// of 1024x576 matches a realistic window.
import { chromium } from "playwright";

const URL = process.env.BENCH_URL ?? "http://127.0.0.1:4173/";
const STAND_MS = 15000;
const WALK_MS = 20000;
const LONG_TASK_MS = 50;

const installCollectors = (page: import("playwright").Page) =>
  page.evaluate(() => {
    const w = window as any;
    w.__active = null;
    w.__standing = { long: [], frames: [] };
    w.__walking = { long: [], frames: [] };
    new PerformanceObserver((list) => {
      const active = w.__active;
      if (!active) return;
      for (const e of list.getEntries()) {
        active.long.push({ start: e.startTime, dur: e.duration });
      }
    }).observe({ type: "longtask", buffered: true });
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const active = w.__active;
      if (active) active.frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const setPhase = (page: import("playwright").Page, p: "standing" | "walking") =>
  page.evaluate(
    (p) => ((window as any).__active = (window as any)[`__${p}`]),
    p,
  );

const waitForReady = async (page: import("playwright").Page) => {
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(
    () => !document.body.innerText.includes("generating terrain"),
    { timeout: 120000 },
  );
  await page.waitForFunction(
    () => !document.body.innerText.includes("blocks to go"),
    { timeout: 120000 },
  );
  await page.waitForTimeout(1500);
};

const summarize = (
  label: string,
  data: { long: { start: number; dur: number }[]; frames: number[] },
) => {
  const frames = data.frames.filter((f) => f >= 0).sort((a, b) => a - b);
  const pct = (p: number) =>
    frames[Math.min(frames.length - 1, Math.floor(frames.length * p))];
  const long = data.long.filter((l) => l.dur >= LONG_TASK_MS);
  const total = long.reduce((s, l) => s + l.dur, 0);
  const max = long.reduce((a, b) => Math.max(a, b.dur), 0);
  console.log(
    `[${label}] frames p50=${frames.length ? pct(0.5).toFixed(1) : "n/a"}ms p95=${frames.length ? pct(0.95).toFixed(1) : "n/a"}ms | longtasks n=${long.length} total=${(total / 1000).toFixed(2)}s max=${(max / 1000).toFixed(2)}s`,
  );
};

const main = async () => {
  const profile = process.argv.includes("--profile");
  const browser = await chromium.launch({ headless: false, args: [] });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 576 },
  });
  await waitForReady(page);
  await installCollectors(page);

  await setPhase(page, "standing");
  await page.waitForTimeout(STAND_MS);

  const cdp = await page.context().newCDPSession(page);
  if (profile) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
    await cdp.send("Profiler.start");
  }

  await setPhase(page, "walking");
  await page.keyboard.down("w");
  await page.waitForTimeout(WALK_MS);
  await page.keyboard.up("w");

  if (profile) {
    const { profile } = (await cdp.send("Profiler.stop")) as {
      profile: unknown;
    };
    const fs = await import("node:fs");
    fs.writeFileSync(
      "/tmp/opencode/voxel-cpu-profile.json",
      JSON.stringify(profile),
    );
    console.log("CPU profile written to /tmp/opencode/voxel-cpu-profile.json");
  }

  const standing = await page.evaluate(() => (window as any).__standing);
  const walking = await page.evaluate(() => (window as any).__walking);
  summarize(`standing ${STAND_MS / 1000}s`, standing);
  summarize(`walking ${WALK_MS / 1000}s`, walking);
  await browser.close();
};

main().catch((e) => {
  console.error("bench failed:", e);
  process.exit(1);
});
