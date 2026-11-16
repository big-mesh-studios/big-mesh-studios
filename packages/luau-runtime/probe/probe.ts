/**
 * luau-probe — the browser half of Phase 0.
 *
 * `spike.test.ts` settles the same claims under Node, and cannot settle the two the
 * QuickJS spike found host-dependent: that the committed WebAssembly loads through a
 * real bundler's asset pipeline at all, and where each host's window sits between
 * "catchable recursion error" and "wasm trap". This page answers both on the main
 * thread, and then spawns a module worker to answer the second one there too — the
 * three hosts of the plan's stack row, measured, before any product file changes.
 *
 * ```
 * cd packages/luau-runtime && npx vite --host 127.0.0.1   # open /luau-probe.html
 * ```
 *
 * Every claim prints with its verdict rather than throwing, and each prints *before*
 * it runs: if the recursion row is the trap the ADR fears, the page goes dark with
 * the last line naming itself, which is the artefact a person can read afterwards.
 */

import {
  LuauState,
  mulberry32,
  ScriptExecutionError,
  type BridgeHost,
} from "../src/index";

const out = document.getElementById("out");
if (out === null) throw new Error("no #out on the page");

const lines: string[] = [];
let failures = 0;

const report = (ok: boolean, label: string, detail = ""): void => {
  if (!ok) failures++;
  const verdict = ok ? "pass" : "FAIL";
  lines.push(
    `${verdict === "pass" ? "<span class='pass'>pass</span>" : "<span class='fail'>FAIL</span>"}  ${label}${detail === "" ? "" : `\n        ${detail}`}`,
  );
  out.innerHTML = lines.join("\n");
};

const host = (): BridgeHost => ({
  dispatch: () => "",
  query: () => "null",
  now: () => 1_700_000_000_000,
  random: mulberry32(20260901),
});

const state = (memoryLimitBytes?: number) =>
  LuauState.create({ seed: 20260901, host: host(), memoryLimitBytes });

/** The kind a failing run reports, so a line can name the cap. */
const kindOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof ScriptExecutionError) return error.kind;
    return "fatal";
  }
  return "none";
};

/**
 * The recursion program: count Luau frames until the VM refuses, from *inside* the
 * guest. A number here is the honest depth of this host; the page dying instead
 * means the window question answered itself the bad way — which is why this line
 * announces itself first.
 */
const DEPTH_PROGRAM = `
  local depth = 0
  local function f()
    depth = depth + 1
    return f()
  end
  pcall(f)
  return tostring(depth)
`;

const run = async (): Promise<void> => {
  lines.push("luau place-runtime probe");
  lines.push("");
  out.innerHTML = lines.join("\n");

  // 1. The claim this page exists for. Everything below is downstream of it.
  report(
    true,
    "loading the interpreter (watch this line if the page goes dark)…",
  );
  const loaded = performance.now();
  let s: Awaited<ReturnType<typeof state>>;
  try {
    s = await state();
  } catch (reason) {
    report(
      false,
      "the interpreter's WebAssembly loads under Vite",
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason),
    );
    report(false, "everything below it (nothing can run without a state)");
    return;
  }
  report(
    true,
    "the interpreter's WebAssembly loads under Vite",
    `instantiated in ${(performance.now() - loaded).toFixed(0)} ms, ` +
      `version ${await LuauState.version()}`,
  );

  // 2. It runs, and it is a whole language.
  try {
    const value = s.evalText(`
      local scale = function(n) return n * 2 end
      local shape = setmetatable({ n = 3 }, { __index = { doubled = function(self) return scale(self.n) end } })
      local co = coroutine.create(function() coroutine.yield("a"); return "b" end)
      local ok, first = coroutine.resume(co)
      local second = select(2, coroutine.resume(co))
      return tostring(shape:doubled()) .. "-" .. first .. "-" .. second
    `);
    report(
      value === "6-a-b",
      "runs code, including metatables and coroutines",
      JSON.stringify(value),
    );
  } catch (reason) {
    report(
      false,
      "runs code, including metatables and coroutines",
      String(reason),
    );
  }

  // 3. Isolation. The list is the plan's own, extended to Luau's dynamic-code names.
  const reachable: string[] = [];
  for (const name of [
    "os",
    "io",
    "debug",
    "load",
    "loadstring",
    "require",
    "tick",
    "module",
    "engine",
  ]) {
    if (s.evalText(`return typeof(${name})`) !== "nil") reachable.push(name);
  }
  report(
    reachable.length === 0,
    "no forbidden global is reachable from a script",
    reachable.length === 0
      ? "9 probed, all nil"
      : `REACHABLE: ${reachable.join(", ")}`,
  );

  // 4. The three caps, each its own claim because each fails differently.
  const timing = Date.now();
  s.setDeadline(200);
  const interruptKind = kindOf(() => s.eval(`while true do end`));
  s.setDeadline(0);
  report(
    interruptKind === "interrupt",
    "a runaway step is interrupted",
    `stopped after ${Date.now() - timing} ms of a 200 ms budget`,
  );

  const small = await state(1024 * 1024);
  small.setDeadline(5000);
  const memoryKind = kindOf(() =>
    small.eval(`
      local all = {}
      local n = 0
      while true do
        n = n + 1
        all[n] = string.rep("0123456789", 100)
      end
    `),
  );
  small.setDeadline(0);
  report(memoryKind === "memory", "a runaway allocation is refused");
  small.dispose();

  // **The row this page exists for: honest recursion depth on the main thread.**
  report(
    true,
    "about to run unbounded recursion on this thread — the window row…",
  );
  s.setDeadline(5000);
  const depth = s.evalText(DEPTH_PROGRAM);
  s.setDeadline(0);
  const stackKind = kindOf(() =>
    s.eval(`local function f() return f() end; f(0)`),
  );
  report(
    stackKind === "stack" && depth !== undefined,
    "runaway recursion is refused rather than trapping the page (main thread)",
    `kind ${stackKind}, honest depth ${depth} frames`,
  );

  // Still alive, still freeable — the second half is what QuickJS could not promise
  // without its cap, and what the ADR row for the dispose assertion quotes.
  try {
    report(
      s.evalText(`return "still here"`) === "still here",
      "the state survives all three",
    );
  } catch (reason) {
    report(false, "the state survives all three", String(reason));
  }
  try {
    s.dispose();
    report(
      (await LuauState.closeError()) === "",
      "the state frees cleanly after all three",
    );
  } catch (reason) {
    report(false, "the state frees cleanly after all three", String(reason));
  }

  // 5. Coroutines driven from the host, inside one budget — the plan's example,
  //    and the charge claim: a resume cannot outlive the step that armed it.
  const co0 = await state();
  const co = co0.evalThread(`
    return coroutine.create(function(waiting)
      local outcome = coroutine.yield("at-counter")
      return outcome .. ":" .. waiting
    end)
  `);
  const yielded = co0.resume(co, "next");
  const finished = co0.resume(co, "served");
  report(
    yielded.status === "yielded" &&
      finished.status === "finished" &&
      finished.value === "served:next",
    "a thread resumed by the host yields and finishes linearly",
    `${yielded.status} → ${finished.status}`,
  );
  co0.setDeadline(150);
  const spin = co0.evalThread(`
    return coroutine.create(function()
      while true do end
    end)
  `);
  const spinOutcome = co0.resume(spin);
  co0.setDeadline(0);
  const spinKind =
    spinOutcome.status === "error" ? spinOutcome.kind : spinOutcome.status;
  report(
    spinKind === "interrupt",
    "a runaway thread is charged to the step budget, not its own clock",
    `reported ${spinKind}`,
  );
  co0.dispose();

  // 6. Determinism, at the size the multiplayer plan rests on: two fresh states,
  //    one seed, one program — byte-identical traces, the pairs() case included.
  //    Each state runs the program twice to also show order is stable *within* a
  //    state (the plan's decision 6: a property of this binary, measured, not cited).
  const program = `
    local t = {}
    for i = 1, 8 do t["k" .. tostring(math.floor(math.random() * 1e6))] = i end
    local out = {}
    for k in pairs(t) do out[#out + 1] = k end
    return table.concat(out, "|")
  `;
  const play = async (): Promise<string> => {
    const peer = await state();
    const rows = [peer.evalText(program), peer.evalText(program)];
    peer.dispose();
    return rows.join("#");
  };
  const first = await play();
  const second = await play();
  report(
    first === second && first !== "#",
    "two fresh states, one seed, agree exactly — pairs() included",
    first.replace("#", "\n        "),
  );

  // 7. The same window row on a worker thread — the third host of the plan's table.
  report(
    true,
    "spawning a worker for its recursion row (watch for silence here)…",
  );
  const worker = new Worker(new URL("./probe-worker.ts", import.meta.url), {
    type: "module",
  });
  worker.postMessage("probe"); // the worker waits on onmessage; without this it waits forever
  const workerAnswer: { ok: boolean; detail: string } = await new Promise(
    (resolve) => {
      const timer = setTimeout(
        () =>
          resolve({
            ok: false,
            detail: "no answer within 30 s — worker died or hung",
          }),
        30_000,
      );
      worker.onmessage = (event: MessageEvent<Record<string, string>>) => {
        clearTimeout(timer);
        resolve({
          ok: event.data.result === "stack" && event.data.depth !== "",
          detail: `kind ${event.data.result}, honest depth ${event.data.depth} frames`,
        });
      };
      worker.onerror = (event) => {
        clearTimeout(timer);
        resolve({ ok: false, detail: `worker error: ${event.message}` });
      };
    },
  );
  report(
    workerAnswer.ok,
    "runaway recursion is refused on a worker too",
    workerAnswer.detail,
  );
  worker.terminate();

  lines.push("");
  lines.push(
    failures === 0
      ? "<span class='pass'>all claims hold in this browser</span>"
      : `<span class='fail'>${failures} claim(s) failed in this browser</span>`,
  );
  out.innerHTML = lines.join("\n");
};

run().catch((reason: unknown) => {
  out.innerHTML = [
    ...lines,
    "",
    `FAILED: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
  ].join("\n");
});
