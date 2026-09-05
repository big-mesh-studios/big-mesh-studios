// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ScriptHost, type DialogState } from "./script-host";
import { SAMPLE_PLACE_SCRIPT } from "./sample";

let clockMs = 0;
const clock = () => clockMs;

const fresh = async (): Promise<{
  host: ScriptHost;
  toasts: Array<{ player: string; text: string }>;
  dialogs: Array<{ player: string; state: DialogState | null }>;
  notices: string[];
}> => {
  clockMs = 0;
  const toasts: Array<{ player: string; text: string }> = [];
  const dialogs: Array<{ player: string; state: DialogState | null }> = [];
  const notices: string[] = [];
  const h = new ScriptHost({
    seed: 5,
    now: clock,
    heightAt: () => 10,
    onToast: (player, text) => toasts.push({ player, text }),
    onDialog: (player, state) => dialogs.push({ player, state }),
    onNotice: (message) => notices.push(message),
  });
  return { host: h, toasts, dialogs, notices };
};

describe("a script host", () => {
  it("runs the sample script and grounds its NPCs", async () => {
    const { host } = await fresh();
    await host.load(SAMPLE_PLACE_SCRIPT);
    const npcs = host.npcList;
    expect(npcs.map((n) => n.id).sort()).toEqual(["rook", "sable"]);
    expect(host.npc("sable")).toMatchObject({
      name: "Sable",
      x: 40,
      z: 12,
      y: 10,
    });
    host.dispose();
  });

  it("walks a shop dialog from greeting to a sale", async () => {
    const { host, toasts, dialogs } = await fresh();
    await host.load(SAMPLE_PLACE_SCRIPT);

    await host.talk("sable", "");
    expect(host.dialogFor("")).toMatchObject({
      npcId: "sable",
      prompt: expect.stringContaining("Welcome"),
      options: ["Buy a potion.", "Goodbye."],
    });

    await host.choose("sable", 0, "");
    expect(host.dialogFor("")).toMatchObject({
      prompt: expect.stringContaining("potions are behind"),
      options: ["I'll take a potion.", "Never mind."],
    });

    await host.choose("sable", 0, "");
    expect(host.dialogFor("")).toBeNull();
    expect(toasts.map((t) => t.text)).toEqual([
      "Sold! A potion of courage, fresh from the cellar.",
    ]);
    expect(dialogs.at(-1)?.state).toBeNull();
    host.dispose();
  });

  it("ignores a choice that does not match the open dialog", async () => {
    const { host } = await fresh();
    await host.load(SAMPLE_PLACE_SCRIPT);
    await host.talk("sable", "");
    await host.choose("rook", 0, ""); // talking to sable, choosing on rook
    expect(host.dialogFor("")).toMatchObject({ npcId: "sable" });
    host.dispose();
  });

  it("leaves a dialog when the player walks away", async () => {
    const { host, dialogs } = await fresh();
    await host.load(SAMPLE_PLACE_SCRIPT);
    await host.talk("rook", "");
    expect(host.dialogFor("")).not.toBeNull();
    await host.leave("rook", "");
    expect(host.dialogFor("")).toBeNull();
    expect(dialogs.at(-1)?.state).toBeNull();
    host.dispose();
  });

  it("keeps two players' dialogs apart", async () => {
    const { host } = await fresh();
    await host.load(SAMPLE_PLACE_SCRIPT);
    await host.talk("sable", "did:plc:alice");
    await host.talk("rook", "did:plc:bob");
    expect(host.dialogFor("did:plc:alice")).toMatchObject({ npcId: "sable" });
    expect(host.dialogFor("did:plc:bob")).toMatchObject({ npcId: "rook" });
    host.dispose();
  });

  it("ignores an effect that is not well-formed, and reports script errors", async () => {
    const { host, notices } = await fresh();
    await host.load(`
      function bmsTick() {
        engine.dispatch("npc", JSON.stringify({ id: "ghost" }));
        engine.dispatch("npc", "not json");
        engine.log("hi from the script");
      }
    `);
    expect(host.npc("ghost")).toBeNull();
    expect(notices).toContain("hi from the script");
    host.dispose();
  });

  it("reports a step that throws", async () => {
    const { host, notices } = await fresh();
    await host.load("function bmsTick() { missing(); }");
    await host.talk("sable", "");
    expect(host.lastError).toMatch(/ReferenceError/);
    expect(notices.join("\n")).toMatch(/ReferenceError/);
    host.dispose();
  });
});
