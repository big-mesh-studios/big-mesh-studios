// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileGLSL } from "@random-mesh/rmsl";
import { Line2NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import { ParticleMaterial } from "./weather-controller";

const compile = (m: ParticleMaterial): void => {
  const program = m.build(new Scene());
  const vertex = compileGLSL.vertex(program.vertexRoot);
  const fragment = compileGLSL.fragment(program.fragmentRoot);
  expect(vertex).toContain("time");
  expect(vertex).toContain("viewMatrix");
  expect(fragment).toContain("tint");
  expect(fragment).toContain("intensity");
};

describe("weather shaders", () => {
  it("compiles the rain (soft rectangle) particle material", () => {
    const m = new ParticleMaterial();
    m.tint = [0.75, 0.8, 0.9];
    m.sway = 0.4;
    expect(() => compile(m)).not.toThrow();
  });

  it("compiles the snow (soft disc) particle material", () => {
    const m = new ParticleMaterial();
    m.tint = [0.95, 0.97, 1];
    m.sway = 1.6;
    m.disc = true;
    expect(() => compile(m)).not.toThrow();
  });

  it("declares every per-particle attribute the geometry provides", () => {
    const program = new ParticleMaterial().build(new Scene());
    const names = program.attributes.map((a) => a.name);
    for (const expected of [
      "particlePos",
      "corner",
      "drift",
      "life",
      "offset",
      "size",
      "spin",
      "uv",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("compiles a world-units lightning bolt material", () => {
    const lm = new Line2NodeMaterial({
      color: 0xcfe0ff,
      linewidth: 0.7,
      worldUnits: true,
      transparent: true,
      opacity: 1,
    });
    const program = lm.build(new Scene());
    expect(() => compileGLSL.vertex(program.vertexRoot)).not.toThrow();
    expect(() => compileGLSL.fragment(program.fragmentRoot)).not.toThrow();
  });
});
