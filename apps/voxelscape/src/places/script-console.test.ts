// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ScriptConsole } from "./script-console";

const console = (): {
  script: ScriptConsole;
  lines: string[];
} => {
  const lines: string[] = [];
  return {
    lines,
    script: new ScriptConsole({
      heightAt: () => 0,
      report: (line) => lines.push(line),
    }),
  };
};

describe("a script console", () => {
  it("reports before a script is loaded", async () => {
    const { script } = console();
    await expect(script.describe()).resolves.toBe(
      "no script loaded — use /script:demo",
    );
    script.dispose();
  });

  it("loads the sample and runs a whole conversation", async () => {
    const { script, lines } = console();
    const loaded = await script.loadSample();
    expect(loaded).toMatch(/sample script loaded — .*Sable.*Rook/);
    expect(loaded).toMatch(/talk with \/script:talk <id> \(sable or rook\)/i);

    const talk = await script.talk("sable");
    expect(talk).toContain("Welcome, traveller.");
    expect(talk).toContain("1. Buy a potion.");
    expect(talk).toContain("2. Goodbye.");

    const declined = await script.choose(2);
    expect(declined).toBe("the conversation is over");
    expect(lines).toContain("Come back when your pockets are full.");

    await expect(script.choose(1)).resolves.toBe(
      "nobody is talking — /script:talk <id> first",
    );
    script.dispose();
  });

  it("keeps the shop sale reachable through option numbers", async () => {
    const { script, lines } = console();
    await script.loadSample();
    await script.talk("sable");
    await script.choose(1); // buy a potion
    await script.choose(1); // I'll take a potion
    expect(lines).toContain(
      "Sold! A potion of courage, fresh from the cellar.",
    );
    script.dispose();
  });
});
