import { describe, expect, it } from "vitest";

import { bundlePlace } from "./bundle";
import { createInterpreter } from "./interpreter";
import { GUEST_MODULE } from "./bridge";
import { inspectEffect } from "./effects";

/**
 * The levels table, end to end.
 *
 * **The chain has four links and every one of them can break silently**: the manifest has to
 * declare a level, the loader has to *read* it rather than drop it, the bundler has to compile
 * it into the guest module, and the library has to find it. A break at any of the others
 * produces a script that runs perfectly and has no level — which is the same shape as a place
 * that simply has no level, so nothing anywhere says so.
 *
 * So this runs the real compiler, the real bundler and the real interpreter together and asks
 * the only question that can tell the difference: does `level("hub")` answer?
 */
describe("a level this place carries", () => {
  const aLevel = JSON.stringify({
    version: 1,
    items: [
      {
        kind: "shape",
        id: "floor",
        at: [0, 0, 0],
        shape: { type: "Box", len: { x: 20, y: 2, z: 20 } },
        combine: "Add",
      },
    ],
  });

  /** Runs a place and hands back every line it logged. */
  const run = async (
    files: Record<string, string>,
    levels: Record<string, string>,
  ): Promise<string[]> => {
    const lines: string[] = [];
    const interpreter = await createInterpreter({
      seed: 20260901,
      now: () => 0,
      onDispatch: (tag, payloadJson) => {
        const inspected = inspectEffect(tag, JSON.parse(payloadJson));
        if ("refusal" in inspected) return inspected.refusal.reason;
        const payload = inspected.effect.payload as { text?: unknown };
        if (typeof payload.text === "string") lines.push(payload.text);
        return "";
      },
      onQuery: () => "null",
    });
    interpreter.load(bundlePlace(files, "main.ts", levels));
    return lines;
  };

  it("is handed back to a script as the text it was written as", async () => {
    // **Under the name the manifest gave it, extension and all** — the same convention a model
    // is looked up by. voxelscape's `plan()` takes a bare word and appends `.json` itself, which
    // is one fewer thing to get wrong but a second naming rule in the same guest library; a place
    // author who typed the wrong name gets a refusal that names it either way.
    const lines = await run(
      {
        "main.ts": `import { level, log } from "${GUEST_MODULE}";
log(level("hub.json"));`,
      },
      { "hub.json": aLevel },
    );

    expect(lines).toHaveLength(1);
    // **The same bytes, not a re-serialisation.** The editor writes this file and a person
    // reads it; a level that came back reformatted would be a level that changed on the way
    // through the loader, and a diff of two levels would then show nothing.
    expect(lines[0]).toBe(aLevel);
  });

  it("is found by whichever name the manifest gave it", async () => {
    const lines = await run(
      {
        "main.ts": `import { level, log } from "${GUEST_MODULE}";
log(level("attic.json"));`,
      },
      { "attic.json": aLevel },
    );
    expect(lines[0]).toBe(aLevel);
  });

  it("needs no bridge member, so a place carrying one still bundles", async () => {
    // The bridge carries strings and numbers (ADR 0015), which is why the table is compiled
    // in rather than fetched — and a `level` *query* would be the wrong shape anyway: a query
    // cannot fail (`bridge.ts`), and this one has to.
    expect(() =>
      bundlePlace(
        { "main.ts": `import { level } from "${GUEST_MODULE}";` },
        "main.ts",
        {
          "hub.json": aLevel,
        },
      ),
    ).not.toThrow();
  });

  it("says so by name for a level this place does not carry", async () => {
    const lines = await run(
      {
        "main.ts": `import { level, log } from "${GUEST_MODULE}";
try {
  level("hub.json");
  log("no throw");
} catch (cause) {
  log(String(cause.message));
}`,
      },
      {},
    );

    expect(lines).toEqual([
      expect.stringMatching(/no level called "hub\.json"/),
    ]);
  });

  it("leaves a place with no levels compiling to what it compiled to before", () => {
    // **No preamble at all** — not an empty one. A table of nothing would put a `const` in every
    // place's bundle forever, and the format's promise is that adding `levels` did not change
    // what a place without one looks like.
    //
    // The library still *mentions* the binding, because `level()` closes over it; what must not
    // appear is the declaration that gives it a value.
    const files = {
      "main.ts": `import { log } from "${GUEST_MODULE}"; log("hi");`,
    };
    expect(bundlePlace(files, "main.ts")).toBe(
      bundlePlace(files, "main.ts", {}),
    );
    expect(bundlePlace(files, "main.ts", {})).not.toContain("const __levels");
    expect(bundlePlace(files, "main.ts", { "hub.json": aLevel })).toContain(
      "const __levels",
    );
  });

  it("gives two peers the same bundle from the same place", () => {
    // Reproducibility is ADR 0018, and the levels table is now an input to it: the same place
    // read by two clients has to compile to the same bytes or the places are not the same.
    const files = {
      "main.ts": `import { level } from "${GUEST_MODULE}"; level("hub.json");`,
    };
    const levels = { "hub.json": aLevel };
    expect(bundlePlace(files, "main.ts", levels)).toBe(
      bundlePlace(files, "main.ts", levels),
    );
  });
});
