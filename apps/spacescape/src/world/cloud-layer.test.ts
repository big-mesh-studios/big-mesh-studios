/**
 * The layer manager, which is the only thing that knows both cloud techniques exist.
 *
 * No graphics device is needed to ask the questions that matter here: how many children the
 * manager adds and when, which one is visible, and whether a switch moves visibility rather
 * than rebuilding anything. The materials themselves are compiled elsewhere; this is about
 * the choice between them.
 */

import { Mesh, Scene } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";

import { bakeCloudField } from "./cloud-field";
import { createCloudLayer } from "./cloud-layer";
import { CheapCloudMaterial, CloudMaterial } from "./clouds";

/** A reduced field, as `clouds.test.ts` uses: the resolution changes nothing here. */
const field = bakeCloudField(20260901, 20, 60);

const build = (scene: Scene) => createCloudLayer(scene, 20260901, field, 6000);

const meshes = (scene: Scene): Mesh[] => scene.children as Mesh[];

describe("the cloud layer manager", () => {
  it("starts with just the raymarch, visible", () => {
    // **The cheap layer is not built here, and that is the decision.** Cutting its slice is
    // hundreds of milliseconds of CPU on the shape volume, and a player who never leaves the
    // default should not pay it at load. So one child until `low` is asked for.
    const scene = new Scene();
    const layer = build(scene);
    expect(meshes(scene)).toHaveLength(1);
    expect(layer.quality).toBe("high");
    expect(layer.material).toBeInstanceOf(CloudMaterial);
    expect(meshes(scene)[0]!.visible).toBe(true);
    expect(meshes(scene)[0]!.material).toBeInstanceOf(CloudMaterial);
  });

  it("builds the cheap layer on first low, and switches by visibility", () => {
    const scene = new Scene();
    const layer = build(scene);

    layer.setQuality("low");
    expect(layer.quality).toBe("low");
    expect(layer.material).toBeInstanceOf(CheapCloudMaterial);
    expect(meshes(scene)).toHaveLength(2);
    expect(meshes(scene)[0]!.visible).toBe(false);
    expect(meshes(scene)[1]!.visible).toBe(true);

    layer.setQuality("high");
    expect(layer.quality).toBe("high");
    expect(layer.material).toBeInstanceOf(CloudMaterial);
    expect(meshes(scene)[0]!.visible).toBe(true);
    expect(meshes(scene)[1]!.visible).toBe(false);

    // Back again: still two children, not a third built by another switch.
    layer.setQuality("low");
    expect(meshes(scene)).toHaveLength(2);
    expect(layer.material).toBeInstanceOf(CheapCloudMaterial);
  });

  it("gives each technique its own coverage and density", () => {
    // The console sets both on the *active* material, so the two techniques keep separate
    // knobs. That is deliberate: a density that reads well as a marched volume is not the
    // same number a single stencil wants, and copying one onto the other would force a
    // choice neither implementation asked for.
    const layer = build(new Scene());
    layer.material.coverage = 0.7;
    layer.material.density = 2;
    expect(layer.quality).toBe("high");
    layer.setQuality("low");
    expect(layer.material.coverage).toBe(0.52);
    expect(layer.material.density).toBe(1);
    layer.material.coverage = 0.4;
    layer.setQuality("high");
    expect(layer.material.coverage).toBe(0.7);
    expect(layer.material.density).toBe(2);
  });

  it("takes every built layer back out when disposed, and the shared geometry once", () => {
    const scene = new Scene();
    const layer = build(scene);
    layer.setQuality("low");
    layer.dispose();
    expect(meshes(scene)).toHaveLength(0);
    // Idempotent: the frame loop's teardown and a re-entrant one must not remove a child
    // twice or dispose a geometry the other mesh still points at.
    expect(() => layer.dispose()).not.toThrow();
  });

  it("disposes cleanly when the cheap layer was never built", () => {
    const scene = new Scene();
    const layer = build(scene);
    layer.dispose();
    expect(meshes(scene)).toHaveLength(0);
  });
});
