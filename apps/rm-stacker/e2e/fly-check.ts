// What a camera in flight looks like, and where its crosshair is, driven by a
// headless browser.
//
// The crosshair has to stand on the middle of the view, because the ray a press
// follows leaves the camera along the view's own axis and the middle of the view
// is where that ray goes. Nothing in the unit tests can say whether a mark drawn
// in the middle of a box is in the middle of the box, so this measures it.
//
//   pnpm e2e:fly --server http://127.0.0.1:5173
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConsoleMessage, Page } from "playwright";

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};

const server = option("server", "http://127.0.0.1:5173");
const outDir = option("out", "e2e/out/fly");

/** How long to let the figure load and the first frames draw, in milliseconds. */
const SETTLE = 2500;

const log = (line: string): void => {
  console.log(line);
};

interface Centre {
  x: number;
  y: number;
}

const measured = async (
  page: Page,
): Promise<{
  viewport: Centre & { width: number; height: number };
  crosshair: (Centre & { width: number; height: number }) | undefined;
  aim: string | undefined;
}> => {
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };

  const box = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>('[class*="crosshair"]');

    if (element === null) {
      return undefined;
    }

    const rect = element.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      aim: element.getAttribute("data-aim"),
    };
  });

  return {
    viewport: {
      x: viewport.width / 2,
      y: viewport.height / 2,
      width: viewport.width,
      height: viewport.height,
    },
    crosshair:
      box === undefined
        ? undefined
        : {
            x: box.left + box.width / 2,
            y: box.top + box.height / 2,
            width: box.width,
            height: box.height,
          },
    aim: box?.aim ?? undefined,
  };
};

mkdirSync(outDir, { recursive: true });

// Playwright drives a browser on a desktop operating system, and this one is not
// always one. The check is before playwright is reached at all, because reaching
// it is what fails — and it fails with a stack trace from inside itself rather
// than with anything naming the platform it found no browser for.
const DESKTOPS = ["darwin", "linux", "win32"];

if (!DESKTOPS.includes(process.platform)) {
  console.log(
    `skipped: playwright has no browser for ${process.platform}, so nothing can be measured here`,
  );
  process.exit(0);
}

const { chromium } = await import("playwright");

const context = await chromium.launch({
  headless: true,
  args: [
    // A headless browser has no graphics card to draw on, so the preview is drawn
    // by the software rasteriser. Without this the canvas is blank and everything
    // measured here is a measurement of nothing.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-blink-features=AutomationControlled",
  ],
});

const page = await context.newPage();
await page.setViewportSize({ width: 900, height: 640 });

const said: string[] = [];
page.on("console", (message: ConsoleMessage) => {
  said.push(`[${message.type()}] ${message.text()}`);
});
page.on("pageerror", (error) => {
  said.push(`[pageerror] ${error.message}`);
});

try {
  log(`loading ${server}`);
  await page.goto(server, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForTimeout(SETTLE);

  const drewSomething = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas");

    if (canvas === null || canvas.width === 0) {
      return "no canvas";
    }

    return `${canvas.width} by ${canvas.height}`;
  });

  log(`canvas: ${drewSomething}`);
  await page.screenshot({ path: join(outDir, "1-editor.png") });

  // The fly button is the one that says it edits the model from inside the view.
  const fly = page.locator('[title^="Edit the model from inside"]');

  log(`fly button: ${(await fly.count()) > 0 ? "found" : "MISSING"}`);
  await fly.first().click();
  await page.waitForTimeout(SETTLE);

  const shown = await measured(page);

  log(`viewport centre: ${shown.viewport.x}, ${shown.viewport.y}`);
  log(
    shown.crosshair === undefined
      ? "crosshair: NOT DRAWN"
      : `crosshair centre: ${shown.crosshair.x}, ${shown.crosshair.y} (aim ${shown.aim})`,
  );

  if (shown.crosshair !== undefined) {
    const offX = shown.crosshair.x - shown.viewport.x;
    const offY = shown.crosshair.y - shown.viewport.y;

    log(
      `off centre by ${offX.toFixed(2)} across and ${offY.toFixed(2)} down — ${
        Math.hypot(offX, offY) < 1 ? "centred" : "NOT CENTRED"
      }`,
    );
  }

  await page.screenshot({ path: join(outDir, "2-flying.png") });

  // The model the editor opens on, seen from where the camera enters flight.
  const aim = await page
    .locator('[class*="crosshair"]')
    .getAttribute("data-aim");
  log(`crosshair aim over the default model: ${aim ?? "(none)"}`);

  writeFileSync(join(outDir, "console.txt"), said.join("\n"), "utf8");

  const problems = said.filter(
    (line) => line.startsWith("[error]") || line.startsWith("[pageerror]"),
  );

  if (problems.length > 0) {
    log(`console problems (${problems.length}):`);
    for (const line of problems.slice(0, 10)) {
      log(`  ${line}`);
    }
  } else {
    log("console: no errors");
  }

  log(`screenshots in ${outDir}`);
} finally {
  await context.close();
}
