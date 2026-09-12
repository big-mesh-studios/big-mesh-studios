// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseEffect } from "./effects";
import type { ScriptEffect } from "./sandbox";

const effect = (tag: string, payload: unknown): ScriptEffect => ({
  tag,
  payload: typeof payload === "string" ? payload : JSON.stringify(payload),
});

describe("effect parsing", () => {
  it("accepts a well-formed effect of every tag", () => {
    expect(
      parseEffect(effect("npc", { id: "sable", x: 40, z: 12, name: "Sable" })),
    ).toEqual({
      tag: "npc",
      payload: { id: "sable", x: 40, z: 12, name: "Sable" },
    });
    expect(parseEffect(effect("npc-remove", { id: "sable" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("prop", {
          id: "fridge",
          model: "fridge.zip",
          x: 3,
          z: 4,
          yaw: 1.5,
          height: 3,
        }),
      ),
    ).toEqual({
      tag: "prop",
      payload: {
        id: "fridge",
        model: "fridge.zip",
        x: 3,
        z: 4,
        yaw: 1.5,
        height: 3,
      },
    });
    expect(parseEffect(effect("prop-remove", { id: "fridge" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("fire", { id: "fire-0", x: 10, z: 18, y: 62, height: 3.5 }),
      ),
    ).toEqual({
      tag: "fire",
      payload: { id: "fire-0", x: 10, z: 18, y: 62, height: 3.5 },
    });
    expect(
      parseEffect(effect("fire", { id: "fire-1", x: 10, z: 18 })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("item-define", {
          id: "chips",
          name: "Chips",
          sprite: "apple",
          stackable: true,
        }),
      ),
    ).toEqual({
      tag: "item-define",
      payload: { id: "chips", name: "Chips", sprite: "apple", stackable: true },
    });
    expect(
      parseEffect(effect("item-give", { player: "", item: "chips", count: 2 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("item-take", { player: "", item: "chips", count: 1 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("item-hold", { player: "", item: "chips" })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("item-hold", { player: "", item: "" })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ending", {
          player: "",
          title: "Chips",
          text: "You ate the chips.",
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("restart", { player: "" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("zone", {
          id: "kitchen",
          name: "Kitchen",
          min: [0, 0, 0],
          max: [4, 4, 4],
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("zone-remove", { id: "kitchen" })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("narrate", { player: "", name: "You", text: "Oh no." }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("npc", { id: "sable", x: 1, z: 2, model: "sable.zip" }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("npc", { id: "dad", x: 1, z: 2, yaw: 1.5 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("timer", { id: "cook", afterMs: 1_000 })),
    ).toEqual({ tag: "timer", payload: { id: "cook", afterMs: 1_000 } });
    expect(
      parseEffect(effect("player-place", { player: "", x: 1, z: 2, yaw: 0.5 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-place", { player: "", x: 1, z: 2 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-face", { player: "", x: 1, z: 2 })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-speed", { player: "", multiplier: 2 })),
    ).toEqual({ tag: "player-speed", payload: { player: "", multiplier: 2 } });
    expect(
      parseEffect(effect("player-jump", { player: "", multiplier: 0.5 })),
    ).toEqual({ tag: "player-jump", payload: { player: "", multiplier: 0.5 } });
    expect(
      parseEffect(
        effect("player-checkpoint", { player: "", x: 4, z: 8, y: 62, yaw: 1 }),
      ),
    ).toEqual({
      tag: "player-checkpoint",
      payload: { player: "", x: 4, z: 8, y: 62, yaw: 1 },
    });
    expect(
      parseEffect(effect("player-kill", { player: "", cause: "spikes" })),
    ).toEqual({
      tag: "player-kill",
      payload: { player: "", cause: "spikes" },
    });
    expect(parseEffect(effect("player-kill", { player: "" }))).not.toBeNull();
    expect(
      parseEffect(effect("player-respawn", { player: "" })),
    ).not.toBeNull();
    expect(parseEffect(effect("void", { y: 20 }))).toEqual({
      tag: "void",
      payload: { y: 20 },
    });
    expect(
      parseEffect(
        effect("cutscene", {
          player: "",
          shots: [
            { at: [0, 10, 0], durationMs: 1_000 },
            { at: [10, 10, 0], look: [10, 0, 0], durationMs: 0, holdMs: 500 },
          ],
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("camera", {
          player: "",
          at: [1, 2, 3],
          look: [4, 5, 6],
          durationMs: 2_000,
          ease: "smooth",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-control", { player: "", locked: true })),
    ).toEqual({
      tag: "player-control",
      payload: { player: "", locked: true },
    });
    expect(
      parseEffect(
        effect("hud", {
          player: "",
          id: "bladder",
          kind: "bar",
          label: "Bladder",
          value: 3,
          max: 10,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("hud", {
          player: "",
          id: "pad",
          kind: "text",
          text: "Checkpoint: stairs",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("hud-remove", { player: "", id: "bladder" })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("prop", {
          id: "spikes",
          model: "spikes.zip",
          x: 0,
          z: 0,
          solid: true,
          hazard: true,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("prop", {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          solid: true,
          motion: {
            path: [
              [0, 0, 0],
              [0, 0, 20],
            ],
            loop: "pingpong",
            durationMs: 4_000,
            ease: "smooth",
            spin: { axis: [1, 0, 0], degreesPerMeter: 36 },
          },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("npc", {
          id: "walker",
          x: 0,
          z: 0,
          motion: {
            path: [
              [0, 0, 0],
              [8, 0, 0],
            ],
            loop: "loop",
            durationMs: 2_000,
            spin: { axis: [0, 1, 0], turnsPerSecond: 0.25 },
          },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("explosion", { id: "boom", x: 10, z: 18, y: 62, radius: 6 }),
      ),
    ).toEqual({
      tag: "explosion",
      payload: { id: "boom", x: 10, z: 18, y: 62, radius: 6 },
    });
    expect(
      parseEffect(effect("explosion", { id: "boom", x: 10, z: 18 })),
    ).not.toBeNull();
    expect(parseEffect(effect("time", { seconds: 100 }))).not.toBeNull();
    expect(parseEffect(effect("time", { speed: 0 }))).not.toBeNull();
    expect(parseEffect(effect("time", { clear: true }))).not.toBeNull();
    expect(parseEffect(effect("toast", { player: "", text: "hello" }))).toEqual(
      { tag: "toast", payload: { player: "", text: "hello" } },
    );
    expect(
      parseEffect(
        effect("dialog", {
          player: "",
          npcId: "sable",
          prompt: "Hi",
          options: ["Buy", "Leave"],
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("dialog-close", { player: "", npcId: "sable" })),
    ).not.toBeNull();
  });

  it("accepts a field and a conveyor-prop", () => {
    expect(
      parseEffect(
        effect("field", {
          id: "fan",
          kind: "push",
          min: [-4, 0, -4],
          max: [4, 8, 4],
          vx: 12,
          vy: 6,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("field", {
          id: "fan-flat",
          kind: "push",
          min: [0, 0, 0],
          max: [4, 4, 4],
          vz: -8,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("field", {
          id: "pit",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [4, 4, 4],
          speedScale: 0.3,
          sink: 2,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("field", {
          id: "slow",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [4, 4, 4],
          speedScale: 0.5,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("field-remove", { id: "fan" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("prop", {
          id: "walkway",
          model: "walkway.zip",
          x: 0,
          z: 0,
          solid: true,
          conveyor: { vx: 5, vz: 0 },
        }),
      ),
    ).not.toBeNull();
  });

  it("refuses a malformed field or conveyor-prop", () => {
    const cases: Array<[string, unknown]> = [
      ["field", { id: "" }],
      ["field", { id: "fan", kind: "gust", min: [0, 0, 0], max: [1, 1, 1] }],
      ["field", { id: "fan", kind: "push", min: [0, 0, 0], max: [1, 1, 1] }],
      [
        "field",
        {
          id: "fan",
          kind: "push",
          min: [0, 0, 0],
          max: [1, 1, 1],
          vx: 0,
          vy: 0,
          vz: 0,
        },
      ],
      [
        "field",
        {
          id: "fan",
          kind: "push",
          min: [0, 0, 0],
          max: [1, 1, 1],
          vx: 101,
        },
      ],
      [
        "field",
        {
          id: "fan",
          kind: "push",
          min: [0, 0, 0],
          max: [1, 1, 1],
          vx: 5,
          sink: 2,
        },
      ],
      [
        "field",
        {
          id: "pit",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [1, 1, 1],
        },
      ],
      [
        "field",
        {
          id: "pit",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [1, 1, 1],
          vx: 5,
        },
      ],
      [
        "field",
        {
          id: "pit",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [1, 1, 1],
          speedScale: 0,
        },
      ],
      [
        "field",
        {
          id: "pit",
          kind: "quicksand",
          min: [0, 0, 0],
          max: [1, 1, 1],
          sink: 101,
        },
      ],
      [
        "field",
        { id: "fan", kind: "push", min: [2, 0, 0], max: [1, 1, 1], vx: 1 },
      ],
      ["field-remove", {}],
      [
        "prop",
        {
          id: "walkway",
          model: "walkway.zip",
          x: 0,
          z: 0,
          motion: {
            path: [
              [0, 0, 0],
              [4, 0, 0],
            ],
            loop: "loop",
            durationMs: 1_000,
          },
          conveyor: { vx: 5, vz: 0 },
        },
      ],
      [
        "prop",
        {
          id: "walkway",
          model: "walkway.zip",
          x: 0,
          z: 0,
          conveyor: { vx: 101, vz: 0 },
        },
      ],
      [
        "prop",
        {
          id: "walkway",
          model: "walkway.zip",
          x: 0,
          z: 0,
          conveyor: { vx: 5 },
        },
      ],
    ];
    for (const [tag, payload] of cases) {
      expect(
        parseEffect(effect(tag, payload)),
        `${tag} ${JSON.stringify(payload)}`,
      ).toBeNull();
    }
  });

  it("refuses a payload that does not fit its tag", () => {
    const cases: Array<[string, unknown]> = [
      ["npc", { id: "" }],
      ["npc", { id: "x", x: "40", z: 12 }],
      ["npc", { id: "x".repeat(65), x: 0, z: 0 }],
      ["npc", { id: "x", x: 1e7, z: 0 }],
      ["npc", { id: "x", x: 1, z: 2, yaw: "n" }],
      ["npc-remove", {}],
      ["timer", { id: "cook" }],
      ["timer", { id: "cook", afterMs: -1 }],
      ["timer", { id: "cook", afterMs: 1e9 }],
      ["timer", { id: "", afterMs: 1 }],
      ["player-place", { player: "", x: 1 }],
      ["player-place", { player: "", x: 1, z: 2, yaw: "n" }],
      ["player-face", { player: "", x: 1 }],
      ["player-speed", { player: "", multiplier: 0 }],
      ["player-speed", { player: "", multiplier: 101 }],
      ["player-speed", { player: "", multiplier: "2" }],
      ["player-speed", { player: "" }],
      ["player-jump", { player: "", multiplier: -1 }],
      ["player-checkpoint", { player: "", x: 4 }],
      ["player-checkpoint", { player: "", x: 4, z: 8, yaw: "n" }],
      ["player-kill", {}],
      ["player-kill", { player: "", cause: "x".repeat(65) }],
      ["player-respawn", {}],
      ["void", { y: "down" }],
      ["void", {}],
      ["cutscene", { player: "", shots: [] }],
      ["cutscene", { player: "", shots: [{ at: [0, 0, 0], ease: "bouncy" }] }],
      ["cutscene", { player: "", shots: [{ at: [0, 0, 0], durationMs: -1 }] }],
      ["cutscene", { player: "", shots: [{ at: [0, 0] }] }],
      ["camera", { player: "", at: [0, 0] }],
      ["camera", { player: "", at: [0, 0, 0], holdMs: "long" }],
      ["player-control", { player: "" }],
      ["player-control", { player: "", locked: "yes" }],
      ["hud", { player: "", id: "bladder", kind: "bar" }],
      ["hud", { player: "", id: "bladder", kind: "pie" }],
      ["hud", { player: "", id: "bladder", kind: "bar", max: 0 }],
      ["hud", { player: "", id: "", kind: "text" }],
      ["hud", { player: "", id: "note", kind: "text", text: "x".repeat(201) }],
      ["hud-remove", { player: "" }],
      [
        "prop",
        { id: "spikes", model: "spikes.zip", x: 0, z: 0, hazard: "yes" },
      ],
      [
        "prop",
        {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          motion: { path: [], loop: "loop", durationMs: 1_000 },
        },
      ],
      [
        "prop",
        {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          motion: { path: [[0, 0, 0]], loop: "spiral", durationMs: 1_000 },
        },
      ],
      [
        "prop",
        {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          motion: { path: [[0, 0, 0]], loop: "loop", durationMs: 0 },
        },
      ],
      [
        "prop",
        {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            spin: { axis: [0, 1, 0] },
          },
        },
      ],
      [
        "prop",
        {
          id: "log",
          model: "log.zip",
          x: 0,
          z: 0,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            spin: { axis: [0, 1, 0], turnsPerSecond: 2_000 },
          },
        },
      ],
      [
        "npc",
        {
          id: "walker",
          x: 0,
          z: 0,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            ease: "bouncy",
          },
        },
      ],
      ["explosion", { id: "", x: 0, z: 0 }],
      ["explosion", { id: "boom", x: 0 }],
      ["explosion", { id: "boom", x: 0, z: 0, radius: 0 }],
      ["explosion", { id: "boom", x: 0, z: 0, radius: 65 }],
      ["explosion", { id: "boom", x: 0, z: 0, y: "up" }],
      ["prop", { id: "fridge", x: 0, z: 0 }],
      ["prop", { id: "fridge", model: "fridge.zip", x: 0, z: 0, height: 0 }],
      ["prop", { id: "fridge", model: "fridge.zip", x: 0, z: 0, yaw: "n" }],
      ["prop-remove", {}],
      ["fire", { id: "fire", x: 0 }],
      ["fire", { id: "fire", x: 1, z: 2, height: 0 }],
      ["fire", { id: "fire", x: 1, z: 2, height: "big" }],
      ["fire", { id: "fire", x: 1, z: 2, y: 1e7 }],
      ["item-define", { id: "chips", name: "Chips", sprite: "apple" }],
      ["item-give", { player: "", item: "chips", count: 0 }],
      ["item-take", { player: "", item: "", count: 1 }],
      ["item-hold", { player: "" }],
      ["ending", { player: "", title: "", text: "x" }],
      ["ending", { player: "", title: "T", text: "x".repeat(1001) }],
      ["restart", {}],
      ["zone", { id: "x", min: [0, 0, 0] }],
      ["zone", { id: "x", min: [2, 0, 0], max: [1, 1, 1] }],
      ["zone", { id: "x", min: [0, 0, 0], max: [0, 0, "z"] }],
      ["zone-remove", {}],
      ["narrate", { player: "", name: "You" }],
      ["narrate", { player: "", name: "", text: "x" }],
      ["time", {}],
      ["time", { seconds: -1 }],
      ["time", { speed: "fast" }],
      ["toast", { text: "x" }],
      ["toast", { player: "", text: "x".repeat(301) }],
      ["dialog", { player: "", npcId: "sable", prompt: "Hi", options: [] }],
      [
        "dialog",
        {
          player: "",
          npcId: "sable",
          prompt: "Hi",
          options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        },
      ],
      [
        "dialog",
        { player: "", npcId: "sable", prompt: "Hi", options: ["x".repeat(81)] },
      ],
      ["dialog-close", { npcId: "sable" }],
      ["something-else", { id: "x" }],
      ["npc", "not an object"],
    ];
    for (const [tag, payload] of cases) {
      expect(
        parseEffect(effect(tag, payload)),
        `${tag} ${JSON.stringify(payload)}`,
      ).toBeNull();
    }
  });

  it("refuses a payload that is not JSON", () => {
    expect(parseEffect({ tag: "npc", payload: "{nope" })).toBeNull();
  });
});
