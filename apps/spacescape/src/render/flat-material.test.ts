/**
 * The unlit material for position-only geometry.
 *
 * **The claim is the attribute list, not the colour it draws.** A `MeshBasicMaterial`'s
 * default vertex stage asks for a normal and a UV along with the position, because the
 * built-in geometries carry all three. The ghosts and CSG visuals built from `toChunkGeometry`
 * carry only `position`, `normalOct` and `colour`, so a basic material makes rmsl warn once per
 * geometry about attributes the shader never reads. This file pins the fix: position alone,
 * and a UV only when the material actually has a map to sample.
 */
import { describe, expect, it } from "vitest";
import { Scene, Texture } from "@random-mesh/rmsl/scene";

import { FlatMaterial } from "./flat-material";

const attributeNames = (material: FlatMaterial): readonly string[] => {
  const program = material.build(new Scene());
  return program.attributes.map((attribute) => attribute.name);
};

describe("FlatMaterial", () => {
  it("asks the geometry for a position and nothing else", () => {
    expect(attributeNames(new FlatMaterial())).toEqual(["position"]);
  });

  it("asks for a UV only when there is a map to read it through", () => {
    const material = new FlatMaterial();
    material.map = new Texture();
    expect(attributeNames(material)).toEqual(["position", "uv"]);
  });
});
