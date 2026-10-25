import { describe, expect, it } from "vitest";
import { InstancedMesh, LineSegments2, Scene } from "@random-mesh/rmsl/scene";

import { createPlaceEffectVisuals } from "./place-effects";

describe("place effect visuals", () => {
  it("draws beam batches and particle instances, then releases them", () => {
    const scene = new Scene();
    const visuals = createPlaceEffectVisuals(scene);

    visuals.update(
      [
        {
          id: "link",
          ax: 0,
          ay: 1,
          az: 2,
          bx: 3,
          by: 4,
          bz: 5,
          color: [1, 0.5, 0],
          width: 0.1,
        },
      ],
      [
        {
          id: "spark",
          additive: true,
          upward: false,
          color: [1, 0.75, 0.3],
          size: 0.18,
          spread: 3,
          lifeMs: 700,
          x: 0,
          y: 1,
          z: 0,
          loop: false,
          at: 1_000,
        },
      ],
      1_100,
    );

    expect(scene.children.some((child) => child instanceof LineSegments2)).toBe(
      true,
    );
    const particles = scene.children.find(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    expect(particles?.count).toBe(12);

    visuals.update([], [], 2_000);
    expect(particles?.count).toBe(0);
    visuals.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
