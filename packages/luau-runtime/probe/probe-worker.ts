/**
 * luau-probe worker — the recursion row on a worker thread.
 *
 * The claim this half exists to make is the one ADR 0015 made about QuickJS's stack
 * window: it is a property of the *host's* stack as much as the VM's, and a browser
 * worker's stack is not a main thread's stack. Here, unbounded recursion should still
 * surface as a catchable "stack overflow" — and the depth it reports is the number
 * that window leaves room for on this host, which the page prints beside Node's.
 *
 * The worker is a module worker; under Vite it imports the runtime the same way the
 * page does, bundling the wasm through the same `?url` asset pipeline the main thread
 * already proved, which is part of what this row tests.
 */

import { LuauState, ScriptExecutionError, mulberry32 } from "../src/index";

const DEPTH_PROGRAM = `
  local depth = 0
  local function f()
    depth = depth + 1
    return f()
  end
  pcall(f)
  return tostring(depth)
`;

self.onmessage = async () => {
  // Any failure answers as `fatal` with the message rather than going silent: a hung
  // worker is indistinguishable from a trapped one, and the harness may not create
  // that ambiguity on the row whose whole question is "did the engine die quietly".
  try {
    await probe();
  } catch (error) {
    (self as unknown as Worker).postMessage({
      result: "fatal",
      depth:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    });
  }
};

const probe = async (): Promise<void> => {
  const s = await LuauState.create({
    seed: 20260901,
    host: {
      dispatch: () => "",
      query: () => "null",
      now: () => 1_700_000_000_000,
      random: mulberry32(20260901),
    },
  });
  let result = "none";
  let depth = "";
  try {
    depth = String(s.evalText(DEPTH_PROGRAM) ?? "");
    s.setDeadline(5000);
    try {
      s.eval(`local function f() return f() end; f(0)`);
    } catch (error) {
      result = error instanceof ScriptExecutionError ? error.kind : "fatal";
    }
    s.setDeadline(0);
  } finally {
    s.dispose();
  }
  (self as unknown as Worker).postMessage({ result, depth });
};
