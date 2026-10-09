/**
 * The drawn reference, as the `/place:docs` panel reads it.
 *
 * ## What is being tested
 *
 * **The drawing is generated, so the thing worth asserting is what generation is supposed to
 * guarantee**: that nothing is blank, that the sections are populated, and that the split between
 * the two kinds of export is right. `pnpm place-reference:check` is what catches the drawing
 * going stale against the sources; these are the claims that stay true whether or not anybody
 * reruns the tool, and they are the ones a hand-edit to the JSON would break.
 *
 * **The one that matters most is the function/value split.** The guest module exports callables
 * (`createShape`) and a value (`EVENT_KINDS`), and the first version of the generator listed every
 * `const` as a value — so `createShape` appeared twice, once as a function and once as a value,
 * telling an author there were two of them. That is asserted here because it is invisible in a
 * panel that renders both sections and easy to reintroduce.
 */

import { describe, expect, it } from "vitest";

import { placeReference } from "./index";

describe("the drawn reference", () => {
  it("was read out of the sources it names", () => {
    expect(placeReference.sources).toContain("src/places/guest/place-api.ts");
    expect(placeReference.sources).toContain("src/places/events.ts");
    expect(placeReference.sources).toContain("src/places/limits.ts");
  });

  it("carries every section a place author reads", () => {
    // **A count that would fail loudly on an empty drawing.** A generator that read nothing would
    // still produce a valid-looking JSON, and the panel would render four empty tabs as though the
    // engine had nothing to offer.
    expect(placeReference.functions.length).toBeGreaterThan(20);
    expect(placeReference.types.length).toBeGreaterThan(8);
    // **An exact count, and that is the claim: the drawing names every event kind the guest
    // library declares.** It was 7 before the figure events and 10 now; a count that drifted
    // either way would mean the generator had started reading a different source than the one
    // the API is written in.
    expect(placeReference.events).toHaveLength(11);
    expect(placeReference.limits.length).toBeGreaterThan(20);
  });

  it("has a sentence for every entry, which is the whole point of generating it", () => {
    // **ADR 0017's promise applied to the sections this engine has.** A reference whose entries
    // render blank is worse than no reference, because it looks complete. `--check` enforces this
    // at generation time; this is the same claim held against the artifact as it is committed.
    const blank: string[] = [];
    for (const fn of placeReference.functions) {
      if (fn.doc === "") blank.push(`function ${fn.name}`);
    }
    for (const value of placeReference.values) {
      if (value.doc === "") blank.push(`value ${value.name}`);
    }
    for (const type of placeReference.types) {
      if (type.doc === "") blank.push(`type ${type.name}`);
    }
    for (const event of placeReference.events) {
      if (event.doc === "") blank.push(`event ${event.kind}`);
    }
    for (const limit of placeReference.limits) {
      if (limit.doc === "") blank.push(`limit ${limit.name}`);
    }
    expect(blank).toEqual([]);
  });

  it("does not list a function among the values, or a value among the functions", () => {
    // **The split the first generator got wrong.** See the file header.
    const functionNames = new Set(
      placeReference.functions.map((fn) => fn.name),
    );
    const clashing = placeReference.values.filter((value) =>
      functionNames.has(value.name),
    );
    expect(clashing).toEqual([]);

    // And the value that is genuinely one: the kinds a place author switches over.
    expect(placeReference.values.map((value) => value.name)).toContain(
      "EVENT_KINDS",
    );
    expect(functionNames.has("EVENT_KINDS")).toBe(false);
  });

  it("shows a function's parameters, not only its name", () => {
    // **The reason a script author opens it.** `createShape` takes one options object whose fields
    // are the whole of how a shape is written; a reference that named the function and nothing else
    // would send them to the type section for what the function takes.
    const createShape = placeReference.functions.find(
      (fn) => fn.name === "createShape",
    );
    expect(createShape).toBeDefined();
    expect(createShape?.params.map((param) => param.name)).toEqual(["options"]);
    expect(createShape?.params[0]?.type).toBe("CreateShapeOptions");

    // …and the type section is where those fields are.
    const options = placeReference.types.find(
      (type) => type.name === "CreateShapeOptions",
    );
    expect(options?.members.map((member) => member.name)).toContain("at");
  });

  it("names every event kind the guest library declares, with the host's sentence", () => {
    // **The kinds come from the guest union and the sentences from the host's source**, which is
    // why this asserts both: a kind whose sentence went missing is a fact a place author has to
    // guess at.
    expect(placeReference.events.map((event) => event.kind)).toEqual([
      "player-joined",
      "player-left",
      "player-died",
      "zone-entered",
      "zone-left",
      "entity-used",
      "item-used",
      "npc-talk",
      "npc-choose",
      "timer",
      "data-changed",
    ]);
    const timer = placeReference.events.find((event) => event.kind === "timer");
    expect(timer?.fields.map((field) => field.name)).toEqual(["timerId"]);
  });

  it("reads a bound as the number it is rather than as a type", () => {
    // **A limit a reader has to interpret is not a limit.** `MAX_ZONES` is a number, and the
    // drawing carries it as one so the panel can print it rather than describe it.
    const zones = placeReference.limits.find(
      (limit) => limit.name === "MAX_ZONES",
    );
    expect(zones?.value).toBe("256");
    expect(zones?.doc).not.toBe("");
  });
});
