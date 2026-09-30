// @vitest-environment node
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import type { PlaceReference } from "@big-mesh-studios/place-reference";
import { reading, referenceOf, type Reading } from "./place-reference";

// Reading the whole application out of the type checker is the slow part — a
// program over every source file, and a checker built from it — so it is read
// once and the assertions below all ask the same reading.
describe("referenceOf", () => {
  let reference: PlaceReference;
  let read: Reading;

  beforeAll(() => {
    read = reading();
    reference = referenceOf(read);
  }, 120_000);

  it("draws every tag the trusted side validates", () => {
    // The tags are read out of the union itself rather than a list held here, so
    // a tag added to the trusted side and missed by the reference fails this.
    const drawn = reference.effects.flatMap((group) =>
      group.effects.map((effect) => effect.tag),
    );
    const declared = tagsOf(
      read.sourceOf("src/places/effects.ts"),
      "ParsedEffect",
      "tag",
    );
    expect([...declared].sort()).toEqual([...drawn].sort());
  });

  it("draws every fact the trusted side raises", () => {
    const drawn = reference.events.map((event) => event.kind);
    const declared = tagsOf(
      read.sourceOf("src/places/events.ts"),
      "ScriptEventPayload",
      "kind",
    );
    expect([...declared].sort()).toEqual([...drawn].sort());
  });

  it("reads a function's signature the way a caller sees it", () => {
    const findPath = reference.functions.find((one) => one.name === "findPath");
    expect(findPath?.doc).not.toBe("");
    expect(findPath?.params.map((param) => param.name)).toEqual([
      "from",
      "to",
      "options",
    ]);
    // The optional object is one parameter, however the options it carries are
    // spelled, and a parameter the declaration leaves optional stays that way.
    expect(findPath?.params[2]?.optional).toBe(true);
    // A tuple alias is written the way the checker resolves it, because the
    // declared name is already listed in the types it returns.
    expect(findPath?.returns).toBe("[number, number, number][] | null");
  });

  it("reads a function whose payload is declared in another file", () => {
    // `createNpc` takes its options as `import("./sandbox").NpcOptions`, so its
    // parameter types are only reachable by following the import.
    const createNpc = reference.functions.find(
      (one) => one.name === "createNpc",
    );
    expect(createNpc?.params[0]?.type).toContain("NpcOptions");
  });

  it("expands a union the module only names by its import", () => {
    // `voxelscape.d.ts` says `export type PlanShape = import("../world/plan-shapes").PlanShape`,
    // so the six shapes are reachable only by following that qualifier.
    const shape = reference.types.find((one) => one.name === "PlanShape");
    expect(shape?.alternatives.map((one) => one.name)).toEqual([
      "PlanBox",
      "PlanRoad",
      "PlanHouse",
      "PlanStairs",
      "PlanRamp",
      "PlanSurface",
    ]);
    // And the fields are read off the shape each alternative really declares.
    const box = shape?.alternatives[0];
    expect(box?.members.map((one) => one.name)).toEqual([
      "kind",
      "min",
      "max",
      "id",
    ]);
  });

  it("names the literal members of a union of literals", () => {
    const anchor = reference.types.find((one) => one.name === "UiAnchor");
    expect(anchor?.union).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  it("keeps the primitive members of a union of primitives", () => {
    const value = reference.types.find((one) => one.name === "DataValue");
    expect(value?.union).toEqual(["string", "number", "boolean"]);
  });

  it("documents the payload shape dispatch validates against", () => {
    // `dispatch` names two types in its own signature, so a reader who follows
    // the name out of the signature needs both of them to be here.
    const names = reference.types.map((one) => one.name);
    expect(names).toContain("EffectTag");
    expect(names).toContain("PayloadFor");
  });

  it("documents the options of every call that takes one", () => {
    const documented = new Set(reference.types.map((one) => one.name));
    for (const one of reference.functions) {
      const option = /^(Create|Ui)\w+Options$/.exec(one.params[0]?.type ?? "");
      if (option === null) {
        continue;
      }
      expect(documented, `${one.name} takes an undocumented type`).toContain(
        option[0],
      );
    }
  });

  it("reads the bounds the trusted side enforces", () => {
    const names = reference.limits.map((one) => one.name);
    // The other end of a pair, and the one that has no other end.
    expect(names).toContain("MAX_CAMERA_MS");
    expect(names).toContain("MIN_CAMERA_FOV");
    expect(names).toContain("MAX_CAMERA_FOV");
    // Every one of them carries the sentence above the declaration.
    expect(reference.limits.every((one) => one.doc !== "")).toBe(true);
  });

  it("reads the fields every fact shares", () => {
    expect(reference.eventCommon.map((one) => one.name)).toEqual([
      "id",
      "at",
      "producer",
    ]);
  });

  it("reads the shape vocabulary a plan is written in", () => {
    expect(reference.shapes.map((one) => one.kind)).toEqual([
      "box",
      "road",
      "house",
      "stairs",
      "ramp",
      "surface",
    ]);
  });

  it("reads what a plan handler is given and must return", () => {
    const context = reference.plan.find((one) => one.name === "PlanContext");
    expect(context?.fields.map((one) => one.name)).toEqual(["seed", "region"]);
    const plan = reference.plan.find((one) => one.name === "LevelPlan");
    expect(plan?.fields.map((one) => one.name)).toEqual([
      "structures",
      "npcs",
      "props",
    ]);
    // A name that is not an object at all still says what it is.
    const voxel = reference.plan.find((one) => one.name === "Voxel3");
    expect(voxel?.type).toBe("[number, number, number]");
  });

  it("reaches a sentence for every entry it draws", () => {
    // A row the site would render blank is the failure this reference exists to
    // prevent, so each kind of entry is asked about separately, by name.
    const named = (doc: string, what: string): void => {
      expect(doc, what).not.toBe("");
    };
    for (const one of reference.functions)
      named(one.doc, `function ${one.name}`);
    for (const one of reference.values) named(one.doc, `value ${one.name}`);
    for (const group of reference.effects) {
      for (const one of group.effects) named(one.doc, `effect ${one.tag}`);
    }
    for (const one of reference.events) named(one.doc, `event ${one.kind}`);
    for (const one of reference.shapes) named(one.doc, `shape ${one.kind}`);
    for (const one of reference.limits) named(one.doc, `limit ${one.name}`);
    for (const one of reference.types) named(one.doc, `type ${one.name}`);
  });

  it("puts every effect in exactly one group", () => {
    const groups = reference.effects.map((group) => group.name);
    expect(new Set(groups).size).toBe(groups.length);
    const tagged = reference.effects.flatMap((group) =>
      group.effects.map((effect) => effect.tag),
    );
    expect(new Set(tagged).size).toBe(tagged.length);
    for (const group of reference.effects) {
      expect(group.effects.length, `group ${group.name}`).toBeGreaterThan(0);
    }
  });

  it("names what removes an effect, either by rule or by hand", () => {
    const byTag = new Map(
      reference.effects
        .flatMap((group) => group.effects)
        .map((effect) => [effect.tag, effect.removedBy]),
    );
    // The suffix carries most of them.
    expect(byTag.get("hud-remove")).toBe("hud");
    // A tag whose undo does not follow from the suffix, which the table carries.
    expect(byTag.get("dialog")).toBe("dialog-close");
    expect(byTag.get("entity-look")).toBe("entity-look-clear");
    expect(byTag.get("figure-animate")).toBe("figure-stop");
    // And one nothing undoes.
    expect(byTag.get("restart")).toBe("");
  });
});

/** The literal `tag`/`kind` values of a union alias, read out of the source. */
const tagsOf = (
  source: ts.SourceFile,
  alias: string,
  property: string,
): Set<string> => {
  const found = new Set<string>();
  for (const statement of source.statements) {
    if (
      !ts.isTypeAliasDeclaration(statement) ||
      statement.name.text !== alias
    ) {
      continue;
    }
    if (!ts.isUnionTypeNode(statement.type)) {
      continue;
    }
    for (const member of statement.type.types) {
      if (!ts.isTypeLiteralNode(member)) {
        continue;
      }
      for (const one of member.members) {
        if (
          !ts.isPropertySignature(one) ||
          one.name.getText().replace(/^["']|["']$/g, "") !== property ||
          one.type === undefined ||
          !ts.isLiteralTypeNode(one.type) ||
          !ts.isStringLiteral(one.type.literal)
        ) {
          continue;
        }
        found.add(one.type.literal.text);
      }
    }
  }
  return found;
};
