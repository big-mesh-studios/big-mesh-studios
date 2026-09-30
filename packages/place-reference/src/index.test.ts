// @vitest-environment node
import { describe, expect, it } from "vitest";
import { placeReference as reference } from "./index";

/**
 * What the committed drawing has to hold to for the site and the in-game panel
 * to render it. The reading that produced it is checked by
 * `apps/voxelscape/tools/place-reference.test.ts`, and its agreement with the
 * sources is checked by `pnpm place-reference:check`; this is about the file
 * itself, which is the one thing every reader of it loads.
 */
describe("the reference", () => {
  it("draws every part of a place script's vocabulary", () => {
    expect(reference.functions.length).toBeGreaterThan(0);
    expect(reference.values.length).toBeGreaterThan(0);
    expect(reference.types.length).toBeGreaterThan(0);
    expect(reference.effects.length).toBeGreaterThan(0);
    expect(reference.events.length).toBeGreaterThan(0);
    expect(reference.shapes.length).toBeGreaterThan(0);
    expect(reference.limits.length).toBeGreaterThan(0);
    expect(reference.plan.length).toBeGreaterThan(0);
  });

  it("names every entry once", () => {
    const names = (list: readonly { name: string }[]): string[] =>
      list.map((one) => one.name);
    expect(new Set(names(reference.functions)).size).toBe(
      reference.functions.length,
    );
    expect(new Set(names(reference.values)).size).toBe(reference.values.length);
    expect(new Set(names(reference.types)).size).toBe(reference.types.length);
    expect(new Set(names(reference.plan)).size).toBe(reference.plan.length);
    const tags = reference.effects.flatMap((group) =>
      group.effects.map((effect) => effect.tag),
    );
    expect(new Set(tags).size).toBe(tags.length);
    const kinds = reference.events.map((event) => event.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("reaches a sentence for every entry, so no row renders blank", () => {
    for (const one of reference.functions) {
      expect(one.doc, `function ${one.name}`).not.toBe("");
    }
    for (const one of reference.values) {
      expect(one.doc, `value ${one.name}`).not.toBe("");
    }
    for (const one of reference.types) {
      expect(one.doc, `type ${one.name}`).not.toBe("");
    }
    for (const one of reference.plan) {
      expect(one.doc, `plan type ${one.name}`).not.toBe("");
    }
    for (const group of reference.effects) {
      expect(group.doc, `group ${group.name}`).not.toBe("");
      for (const one of group.effects) {
        expect(one.doc, `effect ${one.tag}`).not.toBe("");
      }
    }
    for (const one of reference.events) {
      expect(one.doc, `event ${one.kind}`).not.toBe("");
    }
    for (const one of reference.shapes) {
      expect(one.doc, `shape ${one.kind}`).not.toBe("");
    }
    for (const one of reference.limits) {
      expect(one.doc, `limit ${one.name}`).not.toBe("");
    }
  });

  it("draws the plan shapes a structure is stamped from", () => {
    const shape = reference.types.find((one) => one.name === "PlanShape");
    expect(shape?.alternatives).toHaveLength(reference.shapes.length);
    for (const one of shape?.alternatives ?? []) {
      expect(one.doc, `plan shape ${one.name}`).not.toBe("");
      expect(one.members.length, `plan shape ${one.name}`).toBeGreaterThan(0);
    }
  });

  it("puts every effect in a group that is not empty", () => {
    for (const group of reference.effects) {
      expect(group.effects.length, `group ${group.name}`).toBeGreaterThan(0);
    }
  });

  it("tells each field what it is and whether it has to be there", () => {
    const everyField = [
      ...reference.types.flatMap((one) => one.members),
      ...reference.types.flatMap((one) =>
        one.alternatives.flatMap((variant) => variant.members),
      ),
      ...reference.events.flatMap((one) => one.fields),
      ...reference.eventCommon,
      ...reference.shapes.flatMap((one) => one.fields),
    ];
    expect(everyField.length).toBeGreaterThan(0);
    for (const field of everyField) {
      expect(field.name).not.toBe("");
      expect(field.type, `field ${field.name}`).not.toBe("");
    }
  });

  it("gives every function its parameters and its return type", () => {
    for (const one of reference.functions) {
      expect(one.signature, `function ${one.name}`).not.toBe("");
      expect(one.returns, `function ${one.name}`).not.toBe("");
      for (const param of one.params) {
        expect(param.type, `parameter ${one.name}.${param.name}`).not.toBe("");
      }
    }
  });
});
