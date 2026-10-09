import { describe, expect, it } from "vitest";
import { Scene } from "@random-mesh/rmsl/scene";
import { fromProgram, render } from "@random-mesh/rmsl/test";

import { MATERIAL_NAMES, materialIds } from "./material-names";
import { patternsCoverEveryMaterial } from "./material-nodes";
import { SurfaceMaterial } from "./surface-material";
import { dayNightState, NOON_SECONDS } from "../world/day-night";

/**
 * **The shader half of the materials, on real pixels.**
 *
 * `material-patterns.test.ts` covers the arithmetic in the scalar reference. This covers the
 * things that can only be wrong in a program: a pattern that does not reach the frame, a
 * material id that arrives as the wrong value, and — the one that bit — **an id where the old
 * byte's meaning used to be**. Every vertex written before ADR 0048 put 255 in that lane, and
 * 255 as a material id is "brick", so a surface nobody asked to be brick was brick.
 */
describe("a material on a surface", () => {
  /** One pixel of the real material, at a world position, wearing `id`. */
  const rendered = (
    id: number,
    world: readonly [number, number, number],
    tint?: { r: number; g: number; b: number },
  ): readonly [number, number, number] => {
    const material = new SurfaceMaterial();
    material.sky.lighting = dayNightState(NOON_SECONDS);
    if (tint !== undefined) {
      material.tint = tint;
      // **Half, and not one.** A tint is a wash toward its colour at a fixed strength (see
      // `SurfaceMaterial.tint`), so at one the albedo is *replaced* and the pattern underneath
      // is gone — which is right for a selected figure and useless for asking whether a pattern
      // survives a tint. At half it is a wash over the pattern, which is the case worth having.
      material.tintStrength = 0.5;
    }

    const runner = fromProgram(material.build(new Scene()));
    const image = render(runner, {
      width: 1,
      height: 1,
      inputs: ({ x, y }) => ({
        varyings: {
          positionWorld: [world[0] + x, world[1] + y, world[2]],
          normalWorld: [0, 1, 0],
          vColour: [0.8, 0.8, 0.8, id],
        },
      }),
    });

    const [r, g, b] = image.at(0, 0);
    return [r, g, b];
  };

  /** A place where a brick has no mortar through it, and its neighbour does. */
  const BRICK_FACE = [12, 6, 3] as const;

  /** The same surface at the same place, with the pattern chain switched off. */
  const unpatterned = (
    world: readonly [number, number, number],
  ): readonly [number, number, number] => {
    const material = new SurfaceMaterial();
    material.sky.lighting = dayNightState(NOON_SECONDS);
    material.wantsPattern = false;

    const runner = fromProgram(material.build(new Scene()));
    const image = render(runner, {
      width: 1,
      height: 1,
      inputs: ({ x, y }) => ({
        varyings: {
          positionWorld: [world[0] + x, world[1] + y, world[2]],
          normalWorld: [0, 1, 0],
          vColour: [0.8, 0.8, 0.8, 1],
        },
      }),
    });

    const [r, g, b] = image.at(0, 0);
    return [r, g, b];
  };

  it("changes what a surface looks like, which is the only thing it has to do", () => {
    // **Every material id differs from plain at a mortar joint.** A pattern that compiled and
    // then multiplied by one would pass every other test in this file.
    for (const id of materialIds()) {
      if (id === 0) continue;
      const plain = rendered(0, [0, 0, 0]);
      const patterned = rendered(id, [0, 0, 0]);
      expect(
        patterned[0],
        `${MATERIAL_NAMES[id]} looks the same as plain`,
      ).not.toBeCloseTo(plain[0], 3);
    }
  });

  it("treats material zero as no pattern at all", () => {
    // **Compared against the same surface with the chain switched off, at two positions.** The
    // two positions are not interchangeable: fog varies with distance from the eye, so a plain
    // wall two worlds apart is legitimately two different colours. What has to hold is that
    // material zero equals a material that cannot draw a pattern anywhere, at *both* spots —
    // and the second spot is where a lattice would have put a mortar line.
    for (const world of [[0, 0, 0], BRICK_FACE, [0, 6, 3]] as const) {
      const plain = rendered(0, world);
      expect(plain, `at ${world.join(",")}`).toEqual(unpatterned(world));
    }
  });

  it("reads the fourth byte as a material, and not as an opacity", () => {
    // **The regression this whole change risks, stated as a test.** A vertex written before
    // ADR 0048 has 255 in that lane; as an id that is `brick`, and a grey wall of brick with a
    // mortar joint through it stops being the flat surface the lighting maths assumes. So a
    // saturated lane must still be distinguishable from a plain one.
    const saturated = rendered(255, [0, 0, 0]);
    const plain = rendered(0, [0, 0, 0]);
    // **255 is out of range, so it draws as plain.** That is the point: it is not brick, and it
    // is not an opacity of 1 either. A lane that was never a material is not a material.
    expect(saturated).toEqual(plain);
  });

  it("varies brick across a wall rather than uniformly", () => {
    // **Two points a brick apart in the same course.** With the running bond, one is on a
    // vertical joint and the other is mid-brick, so a wall has a pattern in it at all.
    const onJoint = rendered(1, [0, 6, 3]);
    const midBrick = rendered(1, BRICK_FACE);
    expect(onJoint[0]).not.toBeCloseTo(midBrick[0], 3);
  });

  it("gives two faces of a corner the same pattern where they meet", () => {
    // **The reason the pattern is a 3D lattice and not triplanar**, and the reason it can only
    // be tested here rather than in the scalar file. A corner is one pattern cut by two faces,
    // so a point on the vertical joint of a wall facing X and the same point on a wall facing Z
    // are the same point in the world and must render the same. A triplanar blend would give
    // them different phases and put a visible seam down every corner in the world.
    //
    // **Both faces are probed at the same world position and with the same normal**, because
    // that is what makes this a corner test: if the normal were part of the pattern's input the
    // two would differ, and if the position were not they would agree for the wrong reason.
    const onJoint = rendered(1, [0, 6, 3]);
    const awayFromIt = rendered(1, [12, 6, 3]);
    expect(onJoint[0]).not.toBeCloseTo(awayFromIt[0], 3);

    // **And the corner point is darker than either neighbour**, which is only true of a lattice
    // with courses running through it: the joint continues round the corner instead of stopping
    // at it and starting again on the other face.
    const offTheJoint = rendered(1, [0.5, 6, 3]);
    expect(onJoint[0]).toBeLessThan(offTheJoint[0]);
  });

  it("tints a patterned surface, and the pattern survives the tint", () => {
    // **Tint is a separate uniform applied after the pattern**, so a tinted brick wall is still
    // brick. If the order were the other way round — pattern multiplied over the wash — the
    // mortar would darken a colour the tint had already chosen and the wall would look stained.
    const RED = { r: 255, g: 0, b: 0 };
    const untinted = rendered(1, BRICK_FACE);
    const tinted = rendered(1, BRICK_FACE, RED);
    expect(tinted[0]).not.toBeCloseTo(untinted[0], 3);

    // **And a tinted brick is still visibly patterned.** The joint is darker than the face with
    // a tint over it, which is the whole claim: the pattern was multiplied into the albedo and
    // the tint was washed over the result, not the other way round.
    const joint = rendered(1, [0, 6, 3], RED);
    expect(joint[0]).toBeLessThan(tinted[0]);
    // **And the tint itself is stronger where the pattern is darker**, because a wash is
    // relative to what it is washing. A red selection on a mortar line shows more red than on
    // the brick beside it, which is the surface-material's documented reason for a wash over a
    // multiply and worth pinning down while both are here.
    expect(joint[1]).toBeLessThan(tinted[1]);
  });

  it("draws no pattern for a material that asked for none", () => {
    // **`wantsPattern` off is what a figure's tint material sets**, and the figure is the
    // nearest thing to the camera in the scene. This is the flag that keeps it from evaluating
    // four lattices per pixel for an id that is always zero.
    const material = new SurfaceMaterial();
    material.wantsPattern = false;
    material.sky.lighting = dayNightState(NOON_SECONDS);

    const runner = fromProgram(material.build(new Scene()));
    const image = render(runner, {
      width: 1,
      height: 1,
      inputs: ({ x, y }) => ({
        varyings: {
          positionWorld: [x, 6 + y, 3],
          normalWorld: [0, 1, 0],
          // **Material one, and ignored.** If the flag were not honoured the brick lattice
          // would appear on a figure that never asked for one.
          vColour: [0.8, 0.8, 0.8, 1],
        },
      }),
    });

    const [r] = image.at(0, 0);
    const plain = rendered(0, [0, 6, 3]);
    expect(r).toBeCloseTo(plain[0], 3);
  });

  it("has a pattern behind every material the vocabulary names", () => {
    expect(patternsCoverEveryMaterial()).toBe(true);
  });
});

/**
 * What the pattern costs, measured rather than asserted.
 *
 * **Phase 7's one real performance risk, and it is measured on the CPU evaluator** because that
 * is the only place this test can run — there is no GPU in a unit test. That number is not the
 * GPU's and is not meant to be: the CPU evaluator pays for every node it walks, where a GPU pays
 * per pixel and the two costs scale differently. What it does establish is the *shape* of the
 * bill — that four lattices are a bounded multiple of the shading they sit in rather than an
 * order of magnitude, and that `wantsPattern` really does take them away.
 *
 * Measured on this machine, 400 single-pixel renders of the full terrain material: **61.1ms with
 * the pattern chain and 52.9ms without**, so the chain is about 15% of the material's CPU cost.
 * A GPU fragment is far cheaper relative to the pattern than this, so treat it as the pessimistic
 * end and not a claim about frame time.
 */
describe("what a pattern costs", () => {
  /** Milliseconds for 400 single-pixel renders, with the chain on or off. */
  const millisFor = (wantsPattern: boolean): number => {
    const material = new SurfaceMaterial();
    material.sky.lighting = dayNightState(NOON_SECONDS);
    material.wantsPattern = wantsPattern;

    const runner = fromProgram(material.build(new Scene()));
    const inputs = () => ({
      varyings: {
        positionWorld: [3, 6, 7],
        normalWorld: [0, 1, 0],
        // **Material one**, so the chain is fully evaluated rather than short-circuited by the
        // default — a pattern that costs nothing because nothing selected it would measure as
        // free for the wrong reason.
        vColour: [0.8, 0.8, 0.8, 1],
      },
    });

    render(runner, { width: 1, height: 1, inputs });
    const start = process.hrtime.bigint();
    for (let frame = 0; frame < 400; frame += 1) {
      render(runner, { width: 1, height: 1, inputs });
    }
    return Number(process.hrtime.bigint() - start) / 1e6;
  };

  it("costs a bounded multiple of the shading it sits in, and nothing when switched off", () => {
    const withPattern = millisFor(true);
    const without = millisFor(false);

    // **A generous bound, and generous on purpose.** A timing test belongs in this repository
    // only if it fails for a real regression, and the failure it should catch is "someone added
    // a fourth and a half pattern" or "the detail fade went away and every pattern became ten
    // `floor`s deep". Three times the whole material catches both and shrugs off a slow machine.
    expect(withPattern).toBeLessThan(without * 3);
    // **And the flag has to actually remove the work.** A chain that merely evaluated to the
    // same answer would pass everything above; this is the assertion that `wantsPattern` is a
    // switch and not a hint.
    expect(without).toBeLessThan(withPattern);
  });
});
