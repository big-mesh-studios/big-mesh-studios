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

  it("refuses a payload that does not fit its tag", () => {
    const cases: Array<[string, unknown]> = [
      ["npc", { id: "" }],
      ["npc", { id: "x", x: "40", z: 12 }],
      ["npc", { id: "x".repeat(65), x: 0, z: 0 }],
      ["npc", { id: "x", x: 1e7, z: 0 }],
      ["npc-remove", {}],
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
