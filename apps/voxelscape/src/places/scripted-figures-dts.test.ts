// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SCRIPTED_FIGURES_DTS } from "./scripted-figures-dts";

describe("SCRIPTED_FIGURES_DTS", () => {
  it("matches the checked-in stand-in demo-scripts/scripted-figures.d.ts relies on", () => {
    // demo-scripts/scripted-figures.d.ts exists only so zombies.ts type-checks
    // as an ordinary project source file; its content has to stay identical
    // to what the editor actually generates live, or the two would silently
    // drift apart.
    const url = new URL(
      "./demo-scripts/scripted-figures.d.ts",
      import.meta.url,
    );
    const checkedIn = readFileSync(fileURLToPath(url), "utf8");
    const declaration = checkedIn.slice(checkedIn.indexOf("declare module"));
    expect(declaration.trim()).toBe(SCRIPTED_FIGURES_DTS.trim());
  });
});
