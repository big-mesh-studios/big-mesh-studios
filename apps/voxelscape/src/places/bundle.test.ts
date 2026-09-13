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
  logs: string[];
} => {
  const recorded: {
    ticks: Array<(...args: unknown[]) => void>;
    plan: (() => string) | undefined;
    dispatched: Array<{ tag: string; payload: string }>;
    logs: string[];
  } = { ticks: [], plan: undefined, dispatched: [], logs: [] };
  const engine = {
    dispatch: (tag: string, payload: string) => {
      recorded.dispatched.push({ tag, payload });
    },
    log: (line: string) => {
      recorded.logs.push(line);
    },
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
import * as engine from "voxelscape";

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
        import * as engine from "voxelscape";
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
        import * as engine from "voxelscape";
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
        import * as engine from "voxelscape";
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

  it('resolves an import of "voxelscape" to the sandbox\'s host surface, not a project file', async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        engine.onPlan(function (): string { return "ok"; });
      `,
    };
    const output = await bundlePlaceProject(files, "main.ts");
    expect(runBundle(output).plan?.()).toBe("ok");
  });

  it('a file that never imports "voxelscape" cannot reach it as a bare identifier', async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { helper } from "./helper";
        engine.onTick(function () { helper(); });
      `,
      // No import of "voxelscape" here — each file is wrapped in its own
      // function scope, which closes over nothing from outside it.
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
      'main.ts imports "./nope" — imports may only come from this place\'s own script files, or "voxelscape"',
    );
  });

  it("rejects a bare or network specifier", async () => {
    const files = {
      "main.ts": `import fs from "fs";`,
    };
    await expect(bundlePlaceProject(files, "main.ts")).rejects.toThrow(
      /imports may only come from this place's own script files, or "voxelscape"/,
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

describe("the voxelscape module", () => {
  it("createNpc dispatches the npc effect wearing the model's real place file", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { createNpc } from "voxelscape";
        engine.onTick(function (): void {
          createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0, name: "Zombie" });
        });
      `,
    };
    const models = {
      "zombie.zip": await modelBytes(["head", "torso"], ["walk"]),
    };
    const output = await bundlePlaceProject(files, "main.ts", models);
    const { ticks, dispatched } = runBundle(output);
    ticks[0]();
    expect(dispatched).toHaveLength(1);
    expect(JSON.parse(dispatched[0].payload)).toMatchObject({
      id: "zombie-1",
      x: 0,
      z: 0,
      model: "zombie.zip",
      name: "Zombie",
      live: true,
    });
  });

  it("shares one synthetic module between files using it in different ways", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { greet } from "./greeting";
        import { createNpc } from "voxelscape";
        const npc = createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
        engine.onTick(function (): void { engine.log(greet + npc.id); });
      `,
      "greeting.ts": `
        import { createProp } from "voxelscape";
        export const greet: string = createProp({ model: "zombie", id: "prop-1", x: 0, z: 0 }).model.name;
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const output = await bundlePlaceProject(files, "main.ts", models);
    // The descriptor's JSON is itself embedded as a string field of the
    // `__modules` table, so its quotes come out backslash-escaped once more.
    expect(output.match(/parts\\":\s\[\\"head\\"\]/g)).toHaveLength(1);
    expect(output.match(/function createNpc/g)).toHaveLength(1);
  });

  it("produces identical output for identical input, models included", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { createNpc } from "voxelscape";
        engine.onTick(function (): void {
          createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
        });
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const first = await bundlePlaceProject(files, "main.ts", models);
    const second = await bundlePlaceProject(files, "main.ts", models);
    expect(second).toBe(first);
  });

  it("is left out of the bundle entirely when no file imports it", async () => {
    const output = await bundlePlaceProject(
      { "main.ts": `const answer = 42;` },
      "main.ts",
    );
    expect(output).not.toContain("createNpc");
  });

  it("createNpc throws at the moment a script calls it with a name this place carries no model for", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { createNpc } from "voxelscape";
        engine.onTick(function (): void {
          createNpc({ model: "nope", id: "x", x: 0, z: 0 });
        });
      `,
    };
    const output = await bundlePlaceProject(files, "main.ts", {});
    const { ticks } = runBundle(output);
    expect(() => ticks[0]()).toThrow(
      /this place carries no such model: "nope"/,
    );
  });

  it("moves and removes an npc through the real effects", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { createNpc } from "voxelscape";
        engine.onTick(function (): void {
          const npc = createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 });
          npc.move({ x: 1, z: 2, yaw: 0.5, live: true });
          npc.remove();
        });
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const output = await bundlePlaceProject(files, "main.ts", models);
    const { ticks, dispatched } = runBundle(output);
    ticks[0]();
    const calls = dispatched.map((d) => ({
      tag: d.tag,
      payload: JSON.parse(d.payload),
    }));
    expect(calls.map((c) => c.tag)).toEqual(["npc", "npc", "npc-remove"]);
    expect(calls[0].payload).toMatchObject({
      id: "zombie-1",
      x: 0,
      z: 0,
      model: "zombie.zip",
      live: true,
    });
    expect(calls[1].payload).toMatchObject({
      id: "zombie-1",
      x: 1,
      z: 2,
      yaw: 0.5,
      live: true,
    });
    expect(calls[2].payload).toEqual({ id: "zombie-1" });
  });

  it("plays a death fall through an npc's die, and removes a prop through prop-remove", async () => {
    const files = {
      "main.ts": `
        import * as engine from "voxelscape";
        import { createNpc, createProp } from "voxelscape";
        engine.onTick(function (): void {
          createNpc({ model: "zombie", id: "zombie-1", x: 0, z: 0 }).die();
          createProp({ model: "zombie", id: "prop-1", x: 3, z: 4, solid: true }).remove();
        });
      `,
    };
    const models = { "zombie.zip": await modelBytes(["head"]) };
    const output = await bundlePlaceProject(files, "main.ts", models);
    const { ticks, dispatched } = runBundle(output);
    ticks[0]();
    const calls = dispatched.map((d) => ({
      tag: d.tag,
      payload: JSON.parse(d.payload),
    }));
    expect(calls.map((c) => c.tag)).toEqual([
      "npc",
      "npc-die",
      "prop",
      "prop-remove",
    ]);
    expect(calls[2].payload).toMatchObject({
      id: "prop-1",
      model: "zombie.zip",
      x: 3,
      z: 4,
      solid: true,
    });
  });
});
