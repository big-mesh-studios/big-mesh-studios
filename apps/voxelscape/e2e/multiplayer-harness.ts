// A Playwright harness for debugging the multiplayer mesh across two real
// browser windows. Each "player" runs in its own persistent Chromium profile
// (isolated localStorage, so the two OAuth sessions can never collide), pointed
// at the same dev server, with the in-game debug console already open.
//
// It is driven over stdin with a tiny REPL so it can be run in the background
// (stdin from a FIFO, stdout to a log) and commanded from a separate process:
//
//   runA  <cmd>        run a console command in window A (await result)
//   runB  <cmd>        run a console command in window B (await result)
//   runboth <cmd>      run in both windows
//   connA <handle>     dispatch `/account:login <handle>` in A, fire-and-forget
//                      (the OAuth popup needs the user to sign in by hand)
//   connB <handle>     same for B
//   wait <ms>          sleep
//   outA | outB | outboth   dump the current console output
//   status             report whether each window shows a connected session
//   shot [name]        screenshot both windows to e2e/shot-<name>-<A|B>.png
//   seedA | seedB      print each window's terrain seed line
//   quit               close everything and exit
//
// `/account:login` commands are dispatched without awaiting, because they
// block until the human completes the OAuth popup; poll `outA`/`outB` to see the result.
import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opt = {
  server: "http://127.0.0.1:5173",
  profileA: path.join(__dirname, "profiles", "playerA"),
  profileB: path.join(__dirname, "profiles", "playerB"),
  headed: true,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--server") opt.server = args[++i];
  else if (a === "--profileA") opt.profileA = args[++i];
  else if (a === "--profileB") opt.profileB = args[++i];
  else if (a === "--headless") opt.headed = false;
  else if (a === "--headed") opt.headed = true;
}

const log = (...m: unknown[]) => console.log(`[harness]`, ...m);

async function openConsole(page: Page) {
  await page.waitForSelector("canvas", { timeout: 30000 });
  const trigger = page.locator("button[popovertarget]");
  await trigger.first().click();
  await page.waitForSelector('input[placeholder="type a command (/help)"]', {
    timeout: 5000,
  });
}

async function execCommand(page: Page, cmd: string) {
  const input = page.getByPlaceholder("type a command (/help)");
  await input.fill(cmd);
  await input.press("Enter");
}

async function readOutput(page: Page) {
  try {
    return await page.locator("output").innerText();
  } catch {
    return "(console output unavailable)";
  }
}

async function makePlayer(key: string, profile: string): Promise<Player> {
  fs.mkdirSync(profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    headless: !opt.headed,
    viewport: { width: 1080, height: 720 },
    args: [
      "--disable-blink-features=AutomationControlled",
      // Chrome hides local host candidates behind mDNS (.local) names by
      // default; two separate Chromium processes can't resolve each other's
      // names, so WebRTC never connects even on the same machine.
      "--disable-features=WebRtcHideLocalIpsWithMdns",
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const consoleLog: string[] = [];
  page.on("console", (msg) => {
    consoleLog.push(`[${key} console.${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleLog.push(`[${key} pageerror] ${err.message}`);
  });
  await page.goto(opt.server, { waitUntil: "domcontentloaded" });
  await openConsole(page);
  log(`${key}: app loaded at ${opt.server}, console open`);
  return { key, context, page, consoleLog };
}

/** One browser window the harness drives, and what it has said so far. */
interface Player {
  key: string;
  context: BrowserContext;
  page: Page;
  consoleLog: string[];
}

const players: Record<string, Player> = {};
try {
  players.A = await makePlayer("A", opt.profileA);
  players.B = await makePlayer("B", opt.profileB);
} catch (err) {
  log("failed to start a player:", err);
  process.exit(1);
}

const isLogin = (cmd: string) => /^\/account:login\b/.test(cmd);

async function dispatch(key: string, cmd: string) {
  const { page } = players[key];
  if (isLogin(cmd)) {
    void execCommand(page, cmd)
      .then(() =>
        log(`${key}: /account:login dispatched — waiting for the popup`),
      )
      .catch((e) => log(`${key}: /account:login dispatch error: ${e.message}`));
    return;
  }
  await execCommand(page, cmd);
  await new Promise((r) => setTimeout(r, 400));
  const out = await readOutput(page);
  log(`[${key}]> ${cmd}\n${out}`);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", async (line) => {
  const t = line.trim();
  if (!t) return;
  const [cmd, ...rest] = t.split(/\s+/);
  const restStr = rest.join(" ");
  try {
    switch (cmd) {
      case "runA":
        await dispatch("A", restStr);
        break;
      case "runB":
        await dispatch("B", restStr);
        break;
      case "runboth":
        await dispatch("A", restStr);
        await dispatch("B", restStr);
        break;
      case "connA":
        await dispatch("A", `/account:login ${restStr}`.trim());
        break;
      case "connB":
        await dispatch("B", `/account:login ${restStr}`.trim());
        break;
      case "wait": {
        const ms = parseInt(rest[0] || "0", 10);
        await new Promise((r) => setTimeout(r, ms));
        log(`waited ${ms}ms`);
        break;
      }
      case "outA":
        log(`[A] output:\n${await readOutput(players.A.page)}`);
        break;
      case "outB":
        log(`[B] output:\n${await readOutput(players.B.page)}`);
        break;
      case "outboth":
        log(`[A] output:\n${await readOutput(players.A.page)}`);
        log(`[B] output:\n${await readOutput(players.B.page)}`);
        break;
      case "consoleA":
        log(`[A] browser console:\n${players.A.consoleLog.join("\n")}`);
        break;
      case "consoleB":
        log(`[B] browser console:\n${players.B.consoleLog.join("\n")}`);
        break;
      case "consoleboth":
        log(`[A] browser console:\n${players.A.consoleLog.join("\n")}`);
        log(`[B] browser console:\n${players.B.consoleLog.join("\n")}`);
        break;
      case "evalA":
        log(
          `[A] eval ${restStr} => ${JSON.stringify(await players.A.page.evaluate(restStr))}`,
        );
        break;
      case "evalB":
        log(
          `[B] eval ${restStr} => ${JSON.stringify(await players.B.page.evaluate(restStr))}`,
        );
        break;
      case "moveA":
      case "moveB": {
        const k = cmd === "moveA" ? "A" : "B";
        const ms = parseInt(rest[0] || "1000", 10);
        const { page } = players[k];
        await page.evaluate("document.activeElement?.blur()");
        await page.keyboard.down("KeyW");
        await new Promise((r) => setTimeout(r, ms));
        await page.keyboard.up("KeyW");
        log(`${k}: held W for ${ms}ms`);
        break;
      }
      case "status":
        for (const k of ["A", "B"]) {
          const o = await readOutput(players[k].page);
          const connected = /signed in as/.test(o);
          const restored = /restored session/.test(o);
          const mp = /multiplayer online/.test(o);
          log(
            `[${k}] signedIn=${connected || restored} multiplayerOnline=${mp}`,
          );
        }
        break;
      case "shot": {
        const name = rest[0] || "shot";
        for (const k of ["A", "B"]) {
          await players[k].page.screenshot({
            path: path.join(__dirname, `shot-${name}-${k}.png`),
          });
        }
        log(`screenshots saved (${name})`);
        break;
      }
      case "seedA":
        log(`[A] seed check:\n${await readOutput(players.A.page)}`);
        break;
      case "reload":
        for (const k of ["A", "B"]) {
          await players[k].page.reload({ waitUntil: "domcontentloaded" });
          await openConsole(players[k].page);
          log(`${k}: reloaded, console re-opened`);
        }
        break;
      case "quit":
        log("closing...");
        for (const k of ["A", "B"]) {
          try {
            await players[k].context.close();
          } catch {}
        }
        process.exit(0);
        break;
      default:
        log(`unknown command: ${cmd}`);
    }
  } catch (err) {
    log(`command error: ${err instanceof Error ? err.message : String(err)}`);
  }
});

log("harness ready. windows A and B are open.");
log("type commands on stdin, or 'quit' to exit.");
