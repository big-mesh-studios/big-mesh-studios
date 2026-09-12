// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bundlePlaceProject } from "./bundle";
import { saveFigure } from "@big-mesh-studios/stacker/format";
import {
  sideKinds,
  type Figure,
  type Motion,
  type Part,
  type SideKind,
} from "@big-mesh-studios/stacker/renderer";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";

/** A minimal part, all six sides square at the given size, so every axis agrees. */
const partOf = (name: string, size: number): Part => ({
  name,
  sides: Object.fromEntries(
    sideKinds.map((kind) => [kind, Bitmap.create(size, size)]),
  ) as Record<SideKind, Bitmap>,
  sections: [],
  root: Vector3D.create(),
  pivot: Vector3D.create(),
  turn: Vector3D.create(),
  scale: 1,
  parent: null,
});

/** A tiny figure's zip bytes, for a model import to resolve against. */
const modelBytes = async (
  parts: string[],
  motions: string[] = [],
): Promise<Uint8Array> => {
  const figure: Figure = {
    parts: parts.map((name) => partOf(name, 2)),
    palette: Array.from({ length: 32 }, (_, i) => ({
      r: i,
      g: i,
      b: i,
      a: 255,
    })),
  };
  const motionList: Motion[] = motions.map((name) => ({
    name,
    framesPerSecond: 12,
    loop: true,
    parts: [],
  }));
  const blob = await saveFigure(figure, motionList);
  return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Evaluates the bundle the way the sandbox does: `engine` is a parameter of a
 * wrapper function, never a global, so a project file that never
 * `require("engine")`s has no way to reach it either. Returns what a stub
 * `engine` recorded the bundle registering.
 */
const runBundle = (
  output: string,
): {
  ticks: Array<(...args: unknown[]) => void>;
  plan: (() => string) | undefined;
  dispatched: Array<{ tag: string; payload: string }>;
} => {
  const recorded: {
    ticks: Array<(...args: unknown[]) => void>;
    plan: (() => string) | undefined;
    dispatched: Array<{ tag: string; payload: string }>;
  } = { ticks: [], plan: undefined, dispatched: [] };
  const engine = {
    dispatch: (tag: string, payload: string) => {
      recorded.dispatched.push({ tag, payload });
    },
    log: () => {},
    onTick: (fn: (...args: unknown[]) => void) => {
      recorded.ticks.push(fn);
    },
    onPlan: (fn: () => string) => {
      recorded.plan = fn;
    },
  };
  new Function("engine", output)(engine);
  return recorded;
};

const MAIN_TS = `
import * as engine from "engine";

interface Npc {
  id: string;
  pos: [number, number];
}

const npcs: Array<Npc> = [{ id: "guide", pos: [8, 8] }];

engine.onTick(function tick(clockMs: number, eventsJson: string): void {
  const first = npcs[0];
  engine.dispatch("npc", { id: first.id, x: first.pos[0], z: first.pos[1] });
  engine.log(String(clockMs));
});
`;

describe("the place script bundler", () => {
  it("strips TypeScript and runs the entry, which registers with engine.onTick", async () => {
    const output = await bundlePlaceProject({ "main.ts": MAIN_TS }, "main.ts");
    expect(output).not.toContain(": number");
    expect(output).not.toContain("interface");
    expect(runBundle(output).ticks).toHaveLength(1);
  });

  it("produces identical output for identical input", async () => {
    const first = await bundlePlaceProject({ "main.ts": MAIN_TS }, "main.ts");
    const second = await bundlePlaceProject({ "main.ts": MAIN_TS }, "main.ts");
    expect(second).toBe(first);
  });

  it("bundles multiple project files and resolves imports between them", async () => {
    const files = {
      "main.ts": `
        import * as engine from "engine";
        import { hello } from "./greeting";
        engine.onTick(function tick(): void {
          engine.log(hello);
        });
      `,
      "greeting.ts": `
        export const hello: string = "hello from the helper";
      `,
    };
    const output = await bundlePlaceProject(files, "main.ts");
    expect(output).toContain("hello from the helper");
    expect(runBundle(output).ticks).toHaveLength(1);
  });

  it("resolves a .js-ending specifier to the sibling .ts file it names", async () => {
    const files = {
      "main.ts": `import { n } from "./helper.js";`,
      "helper.ts": `export const n: number = 3;`,
    };
    await expect(bundlePlaceProject(files, "main.ts")).resolves.toContain(
      "n = 3",
    );
  });

  it("keeps each module's top-level names to its own scope", async () => {
    const files = {
      "main.ts": `
        import * as engine from "engine";
        import { value as other } from "./other";
        var value = 1;
        engine.onTick(function (): void { engine.log(String(other + value)); });
      `,
      "other.ts": `var value = 40; export { value };`,
    };
    expect(
      runBundle(await bundlePlaceProject(files, "main.ts")).ticks,
    ).toHaveLength(1);
  });

  it("does not require a type-only import to resolve", async () => {
    const files = {
      "main.ts": `
        import type { Missing } from "./missing";
        const probe: Missing | undefined = undefined;
      `,
    };
    await expect(bundlePlaceProject(files, "main.ts")).resolves.not.toContain(
      "Missing",
    );
  });

  it("stringifies a dispatch call's plain-object payload before it reaches the sandbox", async () => {
    const files = {
      "main.ts": `
        import * as engine from "engine";
        engine.onTick(function (): void {
          engine.dispatch("npc", { id: "guide", x: 8, z: 8, name: "Guide" });
        });
      `,
    };
    const output = await bundlePlaceProject(files, "main.ts");
    const { ticks, dispatched } = runBundle(output);
    ticks[0]();
    expect(dispatched).toEqual([
      {
        tag: "npc",
        payload: JSON.stringify({ id: "guide", x: 8, z: 8, name: "Guide" }),
      },
    ]);
  });

  it('resolves an import of "engine" to the sandbox\'s host object, not a project file', async () => {
    const files = {
      "main.ts": `
        import * as engine from "engine";
        engine.onPlan(function (): string { return "ok"; });
      `,
    };
    const output = await bundlePlaceProject(files, "main.ts");
    expect(runBundle(output).plan?.()).toBe("ok");
  });

  it('a file that never imports "engine" cannot reach it as a bare identifier', async () => {
    const files = {
      "main.ts": `
        import * as engine from "engine";
        import { helper } from "./helper";
        engine.onTick(function () { helper(); });
      `,
      // No import of "engine" here — each file is wrapped in its own function
      // scope, which closes over nothing from outside it.
      "helper.ts": `export function helper(): void { engine.log("leaked"); }`,
    };
    const output = await bundlePlaceProject(files, "main.ts");
    const { ticks } = runBundle(output);
    expect(() => ticks[0]()).toThrow(/engine is not defined/);
  });

  it("rejects an import no project file answers", async () => {
    const files = {
      "main.ts": `import { nope } from "./nope";`,
    };
    await expect(bundlePlaceProject(files, "main.ts")).rejects.toThrow(
      'imports "./nope" — imports may only come from this place\'s own script files, or "engine"',
    );
  });

  it("rejects a bare or network specifier", async () => {
    const files = {
      "main.ts": `import fs from "fs";`,
    };
    await expect(bundlePlaceProject(files, "main.ts")).rejects.toThrow(
      /imports may only come from this place's own script files, or "engine"/,
    );
  });

  it("rejects an entry the project does not carry", async () => {
    await expect(
      bundlePlaceProject({ "main.ts": MAIN_TS }, "ghost.ts"),
    ).rejects.toThrow(
      'the entry script "ghost.ts" is not a file of this project',
    );
  });

  it("reports a TypeScript syntax error at its file, line and column", async () => {
    const files = {
      "main.ts": `const n: = 3;`,
    };
    await expect(bundlePlaceProject(files, "main.ts")).rejects.toThrow(
      /^main\.ts:1:\d+ — TS/,
    );
  });
});

describe("model imports", () => {
  it("compiles and evaluates to the model's real parts and motions", async () => {
    const files = {
      "main.ts": `
        import zombie from "zombie" with { type: "model" };
        export function bmsTick(): void { engine.log(JSON.stringify(zombie)); }
      `,
    };
    const models = {
      "zombie.zip": await modelBytes(["head", "torso"], ["walk"]),
    };
    const output = await bundlePlaceProject(files, "main.ts", models);
    new Function(output)();
    const logged: string[] = [];
    const globals = globalThis as Record<string, unknown>;
    globals.engine = { log: (s: string) => logged.push(s) };
    (globals.bmsTick as () => void)();
    delete globals.engine;
    expect(JSON.parse(logged[0])).toEqual({
      name: "zombie",
      parts: ["head", "torso"],
      motions: ["walk"],
    });
  });

  it("shares one synthetic module between two files importing the same model", async () => {
    const files = {
      "main.ts": `
        import { greet } from "./greeting";
        import zombie from "zombie" with { type: "model" };
        export function bmsTick(): void { engine.log(greet + zombie.name); }
      `,
      "greeting.ts": `
        import zombie from "zombie" with { type: "model" };
        export const greet: string = zombie.name;
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const output = await bundlePlaceProject(files, "main.ts", models);
    // The descriptor's JSON is itself embedded as a string field of the
    // `__modules` table, so its quotes come out backslash-escaped once more.
    expect(output.match(/parts\\":\[\\"head\\"\]/g)).toHaveLength(1);
  });

  it("produces identical output for identical input, models included", async () => {
    const files = {
      "main.ts": `
        import zombie from "zombie" with { type: "model" };
        export function bmsTick(): void { engine.log(zombie.name); }
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const first = await bundlePlaceProject(files, "main.ts", models);
    const second = await bundlePlaceProject(files, "main.ts", models);
    expect(second).toBe(first);
  });

  it("rejects a relative model specifier even though it parses", async () => {
    const files = {
      "main.ts": `
        import zombie from "./zombie" with { type: "model" };
        export function bmsTick(): void {}
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    await expect(bundlePlaceProject(files, "main.ts", models)).rejects.toThrow(
      /imports "\.\/zombie" as a model/,
    );
  });

  it("rejects a model name the place carries no such model for", async () => {
    const files = {
      "main.ts": `
        import zombie from "zombie" with { type: "model" };
        export function bmsTick(): void {}
      `,
    };
    await expect(bundlePlaceProject(files, "main.ts", {})).rejects.toThrow(
      /this place carries no such model/,
    );
  });
});
