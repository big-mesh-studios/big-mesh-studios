// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseEffect } from "./effects";
import { PARTICLE_STYLES } from "../world/scripted-particle";
import { STORM_KINDS } from "../world/scripted-storm";
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
        effect("barrier", { id: "gate", min: [0, 0, 0], max: [2, 8, 2] }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("barrier-remove", { id: "gate" })),
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
      parseEffect(
        effect("camera-follow", {
          player: "",
          entityId: "car",
          back: 10,
          up: 4,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("camera-follow-clear", { player: "" }))).toEqual({
      tag: "camera-follow-clear",
      payload: { player: "" },
    });
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
        effect("prop", {
          id: "lift",
          model: "lift.zip",
          x: 0,
          z: 0,
          solid: true,
          seat: true,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            oscillate: { amplitude: 3, periodMs: 2_000, axis: [0, 1, 0] },
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
      parseEffect(effect("sound", { player: "", name: "zombie-growl" })),
    ).toEqual({
      tag: "sound",
      payload: { player: "", name: "zombie-growl" },
    });
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
    expect(
      parseEffect(
        effect("prop", {
          id: "car",
          model: "car.zip",
          x: 0,
          z: 0,
          solid: true,
          seat: true,
          velocity: { vx: 3, vy: 0, vz: 12 },
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
      [
        "prop",
        {
          id: "car",
          model: "car.zip",
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
          velocity: { vx: 3, vy: 0, vz: 12 },
        },
      ],
      [
        "prop",
        {
          id: "car",
          model: "car.zip",
          x: 0,
          z: 0,
          conveyor: { vx: 3, vz: 0 },
          velocity: { vx: 3, vy: 0, vz: 12 },
        },
      ],
      [
        "prop",
        {
          id: "car",
          model: "car.zip",
          x: 0,
          z: 0,
          velocity: { vx: 3, vy: 0 },
        },
      ],
      [
        "prop",
        {
          id: "car",
          model: "car.zip",
          x: 0,
          z: 0,
          velocity: { vx: 3, vy: 0, vz: 101 },
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
      ["camera-follow", { player: "" }],
      ["camera-follow", { player: "", entityId: "car", back: -1 }],
      ["camera-follow", { player: "", entityId: "car", fov: 0 }],
      ["camera-follow-clear", {}],
      ["player-control", { player: "" }],
      ["player-control", { player: "", locked: "yes" }],
      ["hud", { player: "", id: "bladder", kind: "bar" }],
      ["hud", { player: "", id: "bladder", kind: "pie" }],
      ["hud", { player: "", id: "bladder", kind: "bar", max: 0 }],
      ["hud", { player: "", id: "", kind: "text" }],
      [
        "hud",
        { player: "", id: "note", kind: "text", text: "x".repeat(1_001) },
      ],
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
      [
        "prop",
        {
          id: "lift",
          model: "lift.zip",
          x: 0,
          z: 0,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            oscillate: { amplitude: 3, periodMs: 0 },
          },
        },
      ],
      [
        "prop",
        {
          id: "lift",
          model: "lift.zip",
          x: 0,
          z: 0,
          motion: {
            path: [[0, 0, 0]],
            loop: "loop",
            durationMs: 1_000,
            oscillate: { amplitude: 100, periodMs: 1_000 },
          },
        },
      ],
      ["prop", { id: "lift", model: "lift.zip", x: 0, z: 0, seat: "yes" }],
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
      ["barrier", { id: "x", min: [0, 0, 0] }],
      ["barrier", { id: "x", min: [2, 0, 0], max: [1, 1, 1] }],
      ["barrier", { id: "x", min: [0, 0, 0], max: [0, 0, "z"] }],
      ["barrier-remove", {}],
      ["narrate", { player: "", name: "You" }],
      ["narrate", { player: "", name: "", text: "x" }],
      ["time", {}],
      ["time", { seconds: -1 }],
      ["time", { speed: "fast" }],
      ["toast", { text: "x" }],
      ["toast", { player: "", text: "x".repeat(301) }],
      ["sound", { player: "" }],
      ["sound", { name: "zombie-growl" }],
      ["sound", { player: "", name: "" }],
      ["sound", { player: "", name: "x".repeat(33) }],
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

describe("entity tags and attributes", () => {
  it("accepts tags and attributes on an npc or prop", () => {
    expect(
      parseEffect(
        effect("npc", {
          id: "boss",
          x: 0,
          z: 0,
          tags: ["enemy", "boss"],
          attributes: { health: 100, awake: true, title: "The Wall" },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("prop", {
          id: "rock",
          model: "rock.zip",
          x: 0,
          z: 0,
          tags: ["solid"],
          attributes: {},
        }),
      ),
    ).not.toBeNull();
  });

  it("accepts an entity-set that changes tags or attributes", () => {
    expect(
      parseEffect(effect("entity-set", { id: "boss", tags: ["enemy"] })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("entity-set", { id: "boss", attributes: { health: 50 } }),
      ),
    ).not.toBeNull();
  });

  it("refuses a tag that is empty, too long, or not a string", () => {
    for (const tags of [[""], ["x".repeat(41)], [3], "enemy"]) {
      expect(
        parseEffect(effect("npc", { id: "boss", x: 0, z: 0, tags })),
        JSON.stringify(tags),
      ).toBeNull();
    }
  });

  it("refuses an attribute that is nested, too long, or a bad key", () => {
    for (const attributes of [
      { nested: { a: 1 } },
      { note: "x".repeat(257) },
      { "": 1 },
      [{ a: 1 }],
    ]) {
      expect(
        parseEffect(effect("npc", { id: "boss", x: 0, z: 0, attributes })),
        JSON.stringify(attributes),
      ).toBeNull();
    }
  });

  it("refuses an entity-set that names neither tags nor attributes", () => {
    expect(parseEffect(effect("entity-set", { id: "boss" }))).toBeNull();
  });
});

describe("team and value effects", () => {
  it("accepts a team definition, an assignment, and a player value", () => {
    expect(
      parseEffect(effect("team-define", { id: "red", name: "Red Team" })),
    ).toEqual({ tag: "team-define", payload: { id: "red", name: "Red Team" } });
    expect(
      parseEffect(effect("player-team", { player: "did:x", team: "red" })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-team", { player: "did:x", team: "" })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("player-value", { player: "did:x", key: "score", value: -3 }),
      ),
    ).not.toBeNull();
  });

  it("refuses a bad team, assignment, or value", () => {
    expect(parseEffect(effect("team-define", { id: "" }))).toBeNull();
    expect(
      parseEffect(
        effect("player-team", { player: "did:x", team: "y".repeat(65) }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("player-value", { player: "did:x", key: "", value: 1 }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("player-value", {
          player: "did:x",
          key: "score",
          value: Infinity,
        }),
      ),
    ).toBeNull();
  });
});

describe("physics-lite effects", () => {
  it("accepts a push and a reported hit", () => {
    expect(
      parseEffect(effect("player-push", { player: "", vx: 3, vy: 5, vz: 0 })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("report-hit", {
          player: "did:x",
          entityId: "boss",
          amount: 4,
          attackerX: 1,
          attackerZ: 2,
        }),
      ),
    ).not.toBeNull();
  });

  it("refuses a still push or an out-of-range one", () => {
    expect(
      parseEffect(effect("player-push", { player: "", vx: 0, vy: 0, vz: 0 })),
    ).toBeNull();
    expect(
      parseEffect(effect("player-push", { player: "", vx: 101, vy: 0, vz: 0 })),
    ).toBeNull();
  });

  it("refuses a reported hit with no target or too much damage", () => {
    expect(
      parseEffect(
        effect("report-hit", {
          player: "",
          entityId: "",
          amount: 4,
          attackerX: 1,
          attackerZ: 2,
        }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("report-hit", {
          player: "",
          entityId: "boss",
          amount: 1_001,
          attackerX: 1,
          attackerZ: 2,
        }),
      ),
    ).toBeNull();
  });
});

describe("sound depth", () => {
  it("accepts a sound with an id, volume, pitch, and loop", () => {
    expect(
      parseEffect(
        effect("sound", {
          player: "",
          name: "zombie-growl",
          id: "growl",
          volume: 0.5,
          pitch: 2,
          loop: true,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("sound-stop", { player: "", id: "growl" })),
    ).not.toBeNull();
  });

  it("refuses a loop with no id, a bad volume, or a bad pitch", () => {
    for (const payload of [
      { player: "", name: "zombie-growl", loop: true },
      { player: "", name: "zombie-growl", volume: 2 },
      { player: "", name: "zombie-growl", pitch: 0.1 },
      { player: "", name: "zombie-growl", pitch: 5 },
    ]) {
      expect(
        parseEffect(effect("sound", payload)),
        JSON.stringify(payload),
      ).toBeNull();
    }
  });
});

describe("camera depth", () => {
  it("accepts a camera shot with a field of view and a shake", () => {
    expect(
      parseEffect(
        effect("camera", {
          player: "",
          at: [1, 2, 3],
          look: [4, 5, 6],
          durationMs: 500,
          fov: 70,
          shake: 0.4,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("cutscene", {
          player: "",
          shots: [{ at: [1, 2, 3], durationMs: 0, fov: 30, shake: 1 }],
        }),
      ),
    ).not.toBeNull();
  });

  it("refuses a field of view or shake outside its bounds", () => {
    for (const payload of [
      { player: "", at: [1, 2, 3], fov: 0 },
      { player: "", at: [1, 2, 3], fov: 180 },
      { player: "", at: [1, 2, 3], shake: 17 },
      { player: "", at: [1, 2, 3], shake: -1 },
    ]) {
      expect(
        parseEffect(effect("camera", payload)),
        JSON.stringify(payload),
      ).toBeNull();
    }
  });
});

describe("scripted UI effects", () => {
  it("accepts a panel, a label, a bar, a button, an image, and a remove", () => {
    expect(
      parseEffect(
        effect("ui-panel", { player: "", id: "shop", title: "Shop" }),
      ),
    ).toEqual({
      tag: "ui-panel",
      payload: { player: "", id: "shop", title: "Shop" },
    });
    expect(
      parseEffect(
        effect("ui-label", {
          player: "",
          panel: "shop",
          id: "hint",
          text: "Buy",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ui-bar", {
          player: "",
          panel: "shop",
          id: "cash",
          label: "Cash",
          value: 3,
          max: 10,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ui-button", {
          player: "",
          panel: "shop",
          id: "buy",
          label: "Buy",
          value: "cola",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ui-image", {
          player: "",
          panel: "shop",
          id: "icon",
          sprite: "cola",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ui-remove", { player: "", panel: "shop", item: "hint" }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("ui-panel", { player: "", id: "shop", anchor: "bottom-right" }),
      ),
    ).not.toBeNull();
  });

  it("refuses a bad anchor, empty text, a bad bar, or a bad sprite", () => {
    for (const payload of [
      { player: "", id: "shop", anchor: "middle" },
      { player: "", id: "" },
    ]) {
      expect(
        parseEffect(effect("ui-panel", payload)),
        JSON.stringify(payload),
      ).toBeNull();
    }
    expect(
      parseEffect(
        effect("ui-label", { player: "", panel: "shop", id: "hint", text: "" }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("ui-bar", {
          player: "",
          panel: "shop",
          id: "cash",
          value: 1,
          max: 0,
        }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("ui-button", {
          player: "",
          panel: "shop",
          id: "buy",
          label: "",
        }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("ui-image", {
          player: "",
          panel: "shop",
          id: "icon",
          sprite: "",
        }),
      ),
    ).toBeNull();
  });
});

describe("data and teleport effects", () => {
  it("accepts a save, a delete, a badge, and a teleport", () => {
    expect(
      parseEffect(
        effect("data-set", { scope: "player", key: "score", value: 3 }),
      ),
    ).toEqual({
      tag: "data-set",
      payload: { scope: "player", key: "score", value: 3 },
    });
    expect(
      parseEffect(
        effect("data-set", { scope: "global", key: "day", value: true }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("data-set", {
          scope: "player",
          player: "did:x",
          key: "score",
          value: "ten",
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("data-delete", { scope: "player", key: "score" })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("badge-award", { badge: "first" })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("data-get", { scope: "player", key: "score", requestId: "r1" }),
      ),
    ).toEqual({
      tag: "data-get",
      payload: { scope: "player", key: "score", requestId: "r1" },
    });
    expect(
      parseEffect(
        effect("teleport", { player: "", place: "at://did:plc:x/app.bms/a" }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("data-set", { scope: "account", key: "pet", value: "cat" }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("teleport", {
          player: "",
          place: "at://did:plc:x/app.bms/a",
          carry: ["pet", "gear"],
        }),
      ),
    ).not.toBeNull();
  });

  it("refuses a bad scope, value, key, badge, or place", () => {
    for (const payload of [
      { scope: "world", key: "score", value: 1 },
      { scope: "player", key: "", value: 1 },
      { scope: "player", key: "score", value: {} },
      { scope: "player", key: "score", value: "x".repeat(600) },
    ]) {
      expect(
        parseEffect(effect("data-set", payload)),
        JSON.stringify(payload),
      ).toBeNull();
    }
    expect(parseEffect(effect("badge-award", { badge: "" }))).toBeNull();
    expect(
      parseEffect(
        effect("data-get", { scope: "player", key: "score", requestId: "" }),
      ),
    ).toBeNull();
    expect(
      parseEffect(effect("teleport", { player: "", place: "" })),
    ).toBeNull();
    for (const carry of ["pet", [""], [3]]) {
      expect(
        parseEffect(
          effect("teleport", {
            player: "",
            place: "at://did:plc:x/app.bms/a",
            carry,
          }),
        ),
        JSON.stringify(carry),
      ).toBeNull();
    }
  });
});

describe("entity look and beams", () => {
  it("accepts a tint and fade, and a line between two ends", () => {
    expect(
      parseEffect(
        effect("entity-look", { id: "z1", color: [1, 0, 0], alpha: 0.5 }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("entity-look", { id: "z1" }))).toEqual({
      tag: "entity-look",
      payload: { id: "z1" },
    });
    expect(
      parseEffect(effect("entity-look-clear", { id: "z1" })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("beam", { id: "b", fromEntity: "a", to: [1, 2, 3] })),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("beam", {
          id: "b",
          from: [0, 0, 0],
          to: [1, 2, 3],
          color: [0, 1, 0],
          width: 0.3,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("beam-remove", { id: "b" }))).not.toBeNull();
  });

  it("refuses a bad look, or a beam with both or neither end", () => {
    expect(
      parseEffect(effect("entity-look", { id: "z1", color: [2, 0, 0] })),
    ).toBeNull();
    expect(
      parseEffect(effect("entity-look", { id: "z1", alpha: 2 })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("beam", {
          id: "b",
          fromEntity: "a",
          from: [0, 0, 0],
          to: [1, 2, 3],
        }),
      ),
    ).toBeNull();
    expect(parseEffect(effect("beam", { id: "b", to: [1, 2, 3] }))).toBeNull();
    expect(
      parseEffect(
        effect("beam", { id: "b", from: [0, 0, 0], to: [1, 2, 3], width: 0 }),
      ),
    ).toBeNull();
  });
});

describe("particles and decals", () => {
  it("accepts a placed or figure-hung emitter, and a mark", () => {
    expect(parseEffect(effect("particle", { id: "p", x: 1, z: 2 }))).toEqual({
      tag: "particle",
      payload: { id: "p", x: 1, z: 2 },
    });
    expect(
      parseEffect(
        effect("particle", {
          id: "torch",
          entityId: "z1",
          kind: "flame",
          color: [1, 0.5, 0],
          size: 0.4,
          spread: 2,
          lifeMs: 900,
          loop: true,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("particle-remove", { id: "p" }))).not.toBeNull();
    expect(
      parseEffect(effect("decal", { id: "d", kind: "arrow", x: 1, z: 2 })),
    ).toEqual({
      tag: "decal",
      payload: { id: "d", kind: "arrow", x: 1, z: 2 },
    });
    expect(
      parseEffect(
        effect("decal", {
          id: "d",
          kind: "splat",
          x: 1,
          z: 2,
          color: [0.8, 0, 0],
          size: 3,
          yaw: 1.2,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("decal-remove", { id: "d" }))).not.toBeNull();
  });

  it("accepts every particle kind the world knows how to draw", () => {
    for (const kind of Object.keys(PARTICLE_STYLES)) {
      expect(
        parseEffect(effect("particle", { id: "p", x: 0, z: 0, kind })),
        kind,
      ).not.toBeNull();
    }
  });

  it("refuses a bad kind, no position, or out-of-range numbers", () => {
    expect(
      parseEffect(effect("particle", { id: "p", x: 0, z: 0, kind: "nope" })),
    ).toBeNull();
    expect(parseEffect(effect("particle", { id: "p" }))).toBeNull();
    expect(
      parseEffect(effect("particle", { id: "p", x: 0, z: 0, size: 5 })),
    ).toBeNull();
    expect(
      parseEffect(effect("particle", { id: "p", x: 0, z: 0, spread: 33 })),
    ).toBeNull();
    expect(
      parseEffect(effect("particle", { id: "p", x: 0, z: 0, lifeMs: 10 })),
    ).toBeNull();
    expect(parseEffect(effect("decal", { id: "d", x: 0, z: 0 }))).toBeNull();
    expect(
      parseEffect(effect("decal", { id: "d", kind: "star", x: 0, z: 0 })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("decal", { id: "d", kind: "ring", x: 0, z: 0, size: 0 }),
      ),
    ).toBeNull();
  });
});

describe("storms", () => {
  it("accepts a placed storm and its remove, with defaults filled by the host", () => {
    expect(parseEffect(effect("storm", { id: "s", x: 1, z: 2 }))).toEqual({
      tag: "storm",
      payload: { id: "s", x: 1, z: 2 },
    });
    expect(
      parseEffect(
        effect("storm", {
          id: "s",
          kind: "funnel",
          x: 1,
          y: 3,
          z: 2,
          yaw: 1.5,
          width: 20,
          height: 80,
          depth: 10,
          intensity: 0.6,
          color: [0.7, 0.6, 0.4],
          spin: 0.5,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("storm-remove", { id: "s" }))).not.toBeNull();
  });

  it("accepts every storm kind the world knows how to draw", () => {
    for (const kind of STORM_KINDS) {
      expect(
        parseEffect(effect("storm", { id: "s", x: 0, z: 0, kind })),
        kind,
      ).not.toBeNull();
    }
  });

  it("refuses a bad kind, no position, or out-of-range numbers", () => {
    expect(
      parseEffect(effect("storm", { id: "s", x: 0, z: 0, kind: "nope" })),
    ).toBeNull();
    expect(parseEffect(effect("storm", { id: "s" }))).toBeNull();
    expect(
      parseEffect(effect("storm", { id: "s", x: 0, z: 0, width: 0 })),
    ).toBeNull();
    expect(
      parseEffect(effect("storm", { id: "s", x: 0, z: 0, height: 300 })),
    ).toBeNull();
    expect(
      parseEffect(effect("storm", { id: "s", x: 0, z: 0, intensity: 2 })),
    ).toBeNull();
    expect(
      parseEffect(effect("storm", { id: "s", x: 0, z: 0, spin: 2 })),
    ).toBeNull();
    expect(parseEffect(effect("storm-remove", { id: "" }))).toBeNull();
  });
});

describe("lights and billboards", () => {
  it("accepts a placed or figure-hung light, and a label", () => {
    expect(parseEffect(effect("light", { id: "lamp", x: 1, z: 2 }))).toEqual({
      tag: "light",
      payload: { id: "lamp", x: 1, z: 2 },
    });
    expect(
      parseEffect(
        effect("light", {
          id: "lamp",
          x: 1,
          z: 2,
          y: 5,
          color: [1, 0.5, 0],
          range: 20,
          intensity: 3,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("light", { id: "torch", entityId: "z1" })),
    ).not.toBeNull();
    expect(parseEffect(effect("light-remove", { id: "lamp" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("billboard", { id: "tag", text: "Boss", entityId: "z1" }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(
        effect("billboard", {
          id: "sign",
          text: "Shop",
          x: 1,
          z: 2,
          color: [1, 1, 1],
          scale: 1,
          height: 3,
        }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("billboard-remove", { id: "tag" })),
    ).not.toBeNull();
  });

  it("refuses a light with no position and a colour outside 0..1", () => {
    expect(parseEffect(effect("light", { id: "lamp" }))).toBeNull();
    expect(
      parseEffect(
        effect("light", { id: "lamp", x: 1, z: 2, color: [2, 0, 0] }),
      ),
    ).toBeNull();
    expect(
      parseEffect(effect("light", { id: "lamp", x: 1, z: 2, range: 65 })),
    ).toBeNull();
    expect(
      parseEffect(effect("light", { id: "lamp", x: 1, z: 2, intensity: 21 })),
    ).toBeNull();
  });

  it("refuses an empty label, a bad position, and out-of-range sizing", () => {
    expect(
      parseEffect(effect("billboard", { id: "tag", text: "", entityId: "z1" })),
    ).toBeNull();
    expect(
      parseEffect(effect("billboard", { id: "tag", text: "Hi" })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("billboard", { id: "tag", text: "Hi", x: 1, z: 2, scale: 0 }),
      ),
    ).toBeNull();
    expect(
      parseEffect(
        effect("billboard", { id: "tag", text: "Hi", x: 1, z: 2, height: -1 }),
      ),
    ).toBeNull();
  });
});

describe("player model effect", () => {
  it("accepts a worn model, a clear, or a live address, and refuses a bad one", () => {
    expect(
      parseEffect(effect("player-model", { player: "", model: "zombie.zip" })),
    ).not.toBeNull();
    expect(
      parseEffect(effect("player-model", { player: "", model: "" })),
    ).toEqual({
      tag: "player-model",
      payload: { player: "", model: "" },
    });
    expect(
      parseEffect(
        effect("player-model", {
          player: "",
          modelUri: "at://did:plc:x/app.bms.stacker.model/a",
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("player-model", { player: "" }))).toBeNull();
    expect(
      parseEffect(
        effect("player-model", { player: "", model: "x".repeat(129) }),
      ),
    ).toBeNull();
    expect(
      parseEffect(effect("player-model", { player: "", modelUri: "" })),
    ).toBeNull();
  });
});

describe("figure animation", () => {
  it("accepts playing a motion and stopping it", () => {
    expect(
      parseEffect(effect("figure-animate", { id: "z1", name: "walk" })),
    ).toEqual({
      tag: "figure-animate",
      payload: { id: "z1", name: "walk" },
    });
    expect(
      parseEffect(
        effect("figure-animate", {
          id: "z1",
          name: "walk",
          speed: 2,
          loop: false,
        }),
      ),
    ).not.toBeNull();
    expect(parseEffect(effect("figure-stop", { id: "z1" }))).not.toBeNull();
  });

  it("refuses an unnamed motion or an out-of-range speed", () => {
    expect(
      parseEffect(effect("figure-animate", { id: "z1", name: "" })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("figure-animate", { id: "z1", name: "walk", speed: 0 }),
      ),
    ).toBeNull();
    expect(
      parseEffect(effect("figure-animate", { id: "z1", name: "x".repeat(65) })),
    ).toBeNull();
  });
});

describe("input bindings and prompts", () => {
  it("accepts a bind, an unbind, and a prompt", () => {
    expect(
      parseEffect(effect("bind", { id: "dash", key: "KeyQ", label: "Dash" })),
    ).toEqual({
      tag: "bind",
      payload: { id: "dash", key: "KeyQ", label: "Dash" },
    });
    expect(parseEffect(effect("bind", { id: "dash", key: "" }))).not.toBeNull();
    expect(
      parseEffect(
        effect("prompt", { id: "door", entityId: "door", verb: "Open" }),
      ),
    ).toEqual({
      tag: "prompt",
      payload: { id: "door", entityId: "door", verb: "Open" },
    });
    expect(parseEffect(effect("prompt-remove", { id: "door" }))).not.toBeNull();
  });

  it("refuses a malformed bind or prompt", () => {
    expect(parseEffect(effect("bind", { id: "", key: "KeyQ" }))).toBeNull();
    expect(
      parseEffect(effect("bind", { id: "dash", key: "x".repeat(33) })),
    ).toBeNull();
    expect(
      parseEffect(effect("prompt", { id: "door", entityId: "", verb: "Open" })),
    ).toBeNull();
    expect(
      parseEffect(effect("prompt", { id: "door", entityId: "door", verb: "" })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("prompt", {
          id: "door",
          entityId: "door",
          verb: "Open",
          range: 0,
        }),
      ),
    ).toBeNull();
  });
});

describe("player health effects", () => {
  it("accepts a heal and a new maximum", () => {
    expect(
      parseEffect(effect("player-heal", { player: "", amount: 2 })),
    ).toEqual({ tag: "player-heal", payload: { player: "", amount: 2 } });
    expect(
      parseEffect(
        effect("player-max-health", { player: "did:x", maxHealth: 20 }),
      ),
    ).not.toBeNull();
  });

  it("refuses a heal or maximum outside its bounds", () => {
    expect(
      parseEffect(effect("player-heal", { player: "", amount: 0 })),
    ).toBeNull();
    expect(
      parseEffect(effect("player-heal", { player: "", amount: 1_001 })),
    ).toBeNull();
    expect(
      parseEffect(effect("player-max-health", { player: "", maxHealth: 0 })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("player-max-health", { player: "", maxHealth: 100_001 }),
      ),
    ).toBeNull();
  });
});

describe("block effects", () => {
  it("accepts a set, a fill, and a clear", () => {
    expect(
      parseEffect(effect("block-set", { voxel: [1, 2, 3], id: 25 })),
    ).toEqual({ tag: "block-set", payload: { voxel: [1, 2, 3], id: 25 } });
    expect(
      parseEffect(
        effect("block-fill", { min: [0, 0, 0], max: [1, 1, 1], id: 0 }),
      ),
    ).not.toBeNull();
    expect(
      parseEffect(effect("block-clear", { min: [0, 0, 0], max: [3, 3, 3] })),
    ).not.toBeNull();
  });

  it("refuses a fractional voxel, a bad id, an inverted box, or too large a fill", () => {
    expect(
      parseEffect(effect("block-set", { voxel: [0.5, 0, 0], id: 1 })),
    ).toBeNull();
    expect(
      parseEffect(effect("block-set", { voxel: [0, 0, 0], id: 256 })),
    ).toBeNull();
    expect(
      parseEffect(
        effect("block-fill", { min: [3, 0, 0], max: [0, 0, 0], id: 1 }),
      ),
    ).toBeNull();
    // 33 cubed is one over the fill cap.
    expect(
      parseEffect(
        effect("block-fill", { min: [0, 0, 0], max: [32, 32, 32], id: 1 }),
      ),
    ).toBeNull();
  });
});
