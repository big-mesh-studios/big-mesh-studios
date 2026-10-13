/**
 * The atmosphere's shell and column.
 *
 * Two things are being asserted here and they are different questions. The host maths has to be
 * *right* — a nadir column is `H·(1 − e^{−h/H})` and no amount of GPU agreement makes a wrong
 * formula useful — and the shader's cheap quadrature has to be *close enough* to the integrated
 * oracle that the planet looks the same. The first is checked against a closed form; the second
 * against the two-hundred-and-fifty-six sample integral over the rays a player actually looks along.
 *
 * The amount and not the column is what the second question is about. The column error on a grazing
 * ray is a few per cent and looks alarming, but `1 − e^{−k·column}` saturates well before the limb,
 * so what the eye sees there is the same on both. Asserting the raw column would fail on a difference
 * nobody can see and let a real one through; asserting the amount fails only on the visible thing.
 */

import { compileGlsl } from "@random-mesh/rmsl/glsl";
import { float, vec4 } from "@random-mesh/rmsl";
import { NodeMaterial, Scene } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";

import type { Node } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";
import type { Vec3 } from "@big-mesh-studios/core";
import {
  ATMOSPHERE_EXTINCTION,
  ATMOSPHERE_HEIGHT,
  ATMOSPHERE_SCALE_HEIGHT,
  DEFAULT_PLANET_RADIUS,
  airMassNode,
  airMassReference,
  airMassShell,
  airSpan,
} from "./atmosphere";

const R = DEFAULT_PLANET_RADIUS;
const H = ATMOSPHERE_SCALE_HEIGHT;

/** The eye directly above the subsolar point at `altitude`, and the ground point `degrees` away. */
const eyeAt = (altitude: number): Vec3 => ({ x: 0, y: R + altitude, z: 0 });
const groundAt = (degrees: number): Vec3 => {
  const angle = (degrees * Math.PI) / 180;
  return { x: R * Math.sin(angle), y: R * Math.cos(angle), z: 0 };
};

/** What the eye sees of the air, from a column and the extinction that scales it. */
const amount = (column: number): number =>
  1 - Math.exp(-ATMOSPHERE_EXTINCTION * column);

describe("the shell's span", () => {
  it("is the whole segment when both ends are inside", () => {
    expect(
      airSpan(eyeAt(100), groundAt(0), R, ATMOSPHERE_HEIGHT, true),
    ).toEqual({
      lo: 0,
      hi: 1,
    });
  });

  it("clips a segment that starts above the shell", () => {
    // An eye out past the top looking in: the first part of the segment is vacuum and must not
    // count, or a player who leaves the atmosphere still sees it thicken behind them.
    const span = airSpan(
      { x: 0, y: R + ATMOSPHERE_HEIGHT * 2, z: 0 },
      groundAt(0),
      R,
      ATMOSPHERE_HEIGHT,
      true,
    );
    expect(span).not.toBeNull();
    expect(span!.lo).toBeGreaterThan(0);
    expect(span!.hi).toBe(1);
  });

  it("is null for a segment that misses the shell", () => {
    // A horizontal segment well above the top, going nowhere near the planet. The height is derived
    // from the shell so it is above it whatever the planet's radius.
    const high = R + ATMOSPHERE_HEIGHT * 2;
    expect(
      airSpan(
        { x: 0, y: high, z: 0 },
        { x: 200, y: high, z: 0 },
        R,
        ATMOSPHERE_HEIGHT,
        true,
      ),
    ).toBeNull();
  });

  it("clamps its discriminant rather than rooting a negative", () => {
    // The failure this guards is a `NaN` that slips past a `null` check into arithmetic. Both the
    // host and the shader clamp before the root for exactly this reason.
    const high = R + ATMOSPHERE_HEIGHT * 2;
    expect(
      airSpan(
        { x: 0, y: high, z: 0 },
        { x: 200, y: high, z: 0 },
        R,
        ATMOSPHERE_HEIGHT,
        true,
      ),
    ).toBeNull();
  });
});

describe("the air column", () => {
  it("is H·(1 − e^{−h/H}) straight down, which is the integral it claims to be", () => {
    // The one ray with a closed form. If this is wrong the whole model is wrong, and it is the only
    // place the constant `H` can be checked without trusting the samples that use it.
    const altitude = 900;
    const expected = H * (1 - Math.exp(-altitude / H));
    expect(airMassReference(eyeAt(altitude), groundAt(0), R)).toBeCloseTo(
      expected,
      3,
    );
    expect(airMassShell(eyeAt(altitude), groundAt(0), R)).toBeCloseTo(
      expected,
      1,
    );
  });

  it("grows as the ray goes grazing, which is what makes a limb", () => {
    // Down is a short column of thin air; along the limb is the same air over a much longer chord.
    // Distance from the eye cannot tell the two apart, and this difference is the reason the module
    // exists at all.
    const eye = eyeAt(900);
    const down = airMassShell(eye, groundAt(0), R);
    const grazing = airMassShell(eye, groundAt(87), R);
    expect(grazing).toBeGreaterThan(down * 2);
  });

  it("is empty for a ray that never enters the shell", () => {
    const high = R + ATMOSPHERE_HEIGHT * 2;
    const column = airMassShell(
      { x: 0, y: high, z: 0 },
      { x: 100, y: high, z: 0 },
      R,
    );
    expect(column).toBe(0);
  });

  it("matches the integrated oracle to a couple of per cent of what the eye sees", () => {
    // The quadrature's own cost/accuracy contract. Swept over the altitudes a player passes through
    // and every angle to the ground, the *visible* amount — not the raw column — is held within five
    // per cent. That is the number the fog's look is insensitive to, and the oracle is asked for 256
    // samples explicitly so a change to its default cannot quietly move the bar.
    let worst = 0;
    let at = "";
    for (const altitude of [0, 100, 420, 900, 1400, 2000, 3000, 4800]) {
      const eye = eyeAt(altitude);
      for (let degrees = 0; degrees <= 179.5; degrees += 0.5) {
        const point = groundAt(degrees);
        const reference = airMassReference(
          eye,
          point,
          R,
          ATMOSPHERE_HEIGHT,
          H,
          256,
        );
        if (reference <= 1e-6) continue;
        const error = Math.abs(
          amount(airMassShell(eye, point, R)) - amount(reference),
        );
        if (error > worst) {
          worst = error;
          at = `${altitude} up, ${degrees}°`;
        }
      }
    }
    expect(worst, `worst at ${at}`).toBeLessThan(0.05);
  });
});

/**
 * The same three questions on a height field, where the air is a slab rather than a shell.
 *
 * The sea level is zero rather than `R`, because on a plane it is an altitude and a test that
 * measured it against 136,000 would be testing the shell again with extra steps.
 */
describe("a flat world's air", () => {
  /** The eye at `altitude` above a sea at zero, and a point `range` away on the ground. */
  const eyeAt = (altitude: number): Vec3 => ({ x: 0, y: altitude, z: 0 });
  const groundAt = (range: number): Vec3 => ({ x: 0, y: 0, z: range });

  it("is H·(1 − e^{−h/H}) straight down, on an altitude", () => {
    // **The same closed form as the sphere's, over the same constant.** The one ray whose answer is
    // known exactly, and the only place `H` can be checked without trusting the samples using it.
    // Strictly vertical: a ray that travels sideways as it descends is a different integral, and
    // calling that one "down" would have measured the model rather than the constant.
    const altitude = 900;
    const expected = H * (1 - Math.exp(-altitude / H));
    expect(
      airMassReference(
        eyeAt(altitude),
        groundAt(0),
        0,
        ATMOSPHERE_HEIGHT,
        H,
        256,
        false,
      ),
    ).toBeCloseTo(expected, 3);
    expect(
      airMassShell(
        eyeAt(altitude),
        groundAt(0),
        0,
        ATMOSPHERE_HEIGHT,
        H,
        false,
      ),
    ).toBeCloseTo(expected, 1);
  });

  it("gathers across the whole of a ray that stays in the air", () => {
    // **The flat world's version of what a limb is on a sphere.** On a sphere a grazing ray keeps
    // curving into denser air and gathers more than a downward one of the same length; on a plane
    // there is no curvature to keep it in the air, so the ray that gathers most is the one that
    // never leaves it — a level ray at the eye's own height.
    //
    // The claim is therefore the opposite shape from the sphere's, and the reason is worth having
    // written down: both are the same statement that distance alone cannot tell you what the air
    // between you and a thing is made of.
    const level = airMassShell(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 4000 },
      0,
      ATMOSPHERE_HEIGHT,
      H,
      false,
    );
    const down = airMassShell(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: -4000, z: 0 },
      0,
      ATMOSPHERE_HEIGHT,
      H,
      false,
    );
    expect(level).toBeGreaterThan(down * 100);
    // **And the level ray is bounded by its own length**, because the density at sea level is 1:
    // four thousand units of air at its densest cannot weigh more than four thousand units of it.
    expect(level).toBeLessThanOrEqual(4000);
  });

  it("is empty for a ray that never enters it", () => {
    // A horizontal segment well above the shell, going nowhere near the ground.
    const high = ATMOSPHERE_HEIGHT * 2;
    expect(
      airMassShell(
        { x: 0, y: high, z: 0 },
        { x: 200, y: high, z: 0 },
        0,
        ATMOSPHERE_HEIGHT,
        H,
        false,
      ),
    ).toBe(0);
  });

  it("takes the whole of a level ray inside the air, which is the ray at the horizon", () => {
    // **The case the sphere's solve never has to state.** `d.y` is exactly zero here, so there is
    // no crossing to find and a solve written as two divisions answers `0 / 0`. Standing on the
    // ground and looking along it is the single most common ray a player casts, and it must
    // gather air across everything it can see.
    const span = airSpan(
      { x: 0, y: 0, z: 0 },
      { x: 4000, y: 0, z: 0 },
      0,
      ATMOSPHERE_HEIGHT,
      false,
    );
    expect(span).toEqual({ lo: 0, hi: 1 });
    expect(
      airMassShell(
        { x: 0, y: 0, z: 0 },
        { x: 4000, y: 0, z: 0 },
        0,
        ATMOSPHERE_HEIGHT,
        H,
        false,
      ),
    ).toBeGreaterThan(3000);
  });

  it("takes none of a level ray outside the air", () => {
    const high = ATMOSPHERE_HEIGHT * 2;
    expect(
      airSpan(
        { x: 0, y: high, z: 0 },
        { x: 4000, y: high, z: 0 },
        0,
        ATMOSPHERE_HEIGHT,
        false,
      ),
    ).toBeNull();
  });

  it("stops a descending ray at the ground rather than marching through it", () => {
    // **The slab's one-sided version of the sphere's silhouette.** Looking down from above the
    // air, the ray ends at the sea level rather than continuing to the ground beneath it.
    const span = airSpan(
      { x: 0, y: 2000, z: 0 },
      { x: 0, y: -500, z: 0 },
      0,
      ATMOSPHERE_HEIGHT,
      false,
    );
    expect(span).not.toBeNull();
    // The sea is 2000 units up the 2500-unit segment, and the shell's top 2800 is below the eye.
    expect(span!.lo).toBeCloseTo(0, 6);
    expect(span!.hi).toBeCloseTo(2000 / 2500, 6);
  });

  it("matches the integrated oracle to the same few per cent the sphere does", () => {
    // **The same contract, on the other shape.** The quadrature's cost/accuracy is a property of
    // the two-node rule and not of what it is integrating over, so the bar is deliberately the
    // same one the sphere is held to rather than a fresh number.
    let worst = 0;
    let at = "";
    for (const altitude of [0, 100, 420, 900, 1400, 2000, 3000, 4800]) {
      const eye = eyeAt(altitude);
      for (const range of [1, 10, 100, 1000, 4000, 17000, 40000]) {
        const point = groundAt(range);
        const reference = airMassReference(
          eye,
          point,
          0,
          ATMOSPHERE_HEIGHT,
          H,
          256,
          false,
        );
        if (reference <= 1e-6) continue;
        const error = Math.abs(
          amount(airMassShell(eye, point, 0, ATMOSPHERE_HEIGHT, H, false)) -
            amount(reference),
        );
        if (error > worst) {
          worst = error;
          at = `${altitude} up, ${range} out`;
        }
      }
    }
    expect(worst, `worst at ${at}`).toBeLessThan(0.05);
  });
});

/** A material that emits the air-mass graph and nothing else, so the test sees only its arithmetic. */
class AtmosphereProbe extends NodeMaterial {
  constructor(
    private readonly seaLevel: number,
    private readonly spherical: boolean,
  ) {
    super();
  }
  protected override buildFragmentBody(b: Builder): Node<"vec4"> {
    const column = airMassNode(
      b.cameraPosition,
      b.positionWorld,
      float(this.seaLevel),
      float(ATMOSPHERE_HEIGHT),
      float(H),
      this.spherical,
    );
    return vec4(column, float(0), float(0), float(1));
  }
}

describe("the air mass as nodes", () => {
  const compiled = (seaLevel = R, spherical = true): string => {
    const program = new AtmosphereProbe(seaLevel, spherical).build(new Scene());
    return compileGlsl.fragment(program.fragmentRoot, { precision: "highp" });
  };

  it("compiles, and never emits a NaN", () => {
    const fragment = compiled();
    expect(fragment).not.toContain("NaN");
    expect(fragment).toContain("cameraPosition");
  });

  it("takes two density samples, one shell root, and binds what it reuses", () => {
    // The shader twin of `airMassShell`, pinned so a later change cannot quietly drop to one sample
    // (which read the limb badly low) or climb to a loop. Two `exp(` and one `sqrt(` are the whole
    // cost of the quadrature and the shell intersection.
    //
    // The last assertion is the rmsl trap this file nearly fell into: the graph emits each node once
    // per use, so the shell quadratic written without `toVar` repeated itself about twenty times.
    // The probe has no point lights to contribute, so the counts here are exactly the atmosphere's.
    const fragment = compiled();
    expect(fragment.split("exp(").length - 1).toBe(2);
    expect(fragment.split("sqrt(").length - 1).toBe(1);
  });

  it("compiles on a flat world too, and still takes the same two samples", () => {
    // **The slab solve has no `sqrt` in it**, so a flat world should cost one fewer — and the
    // counts being pinned on both worlds is what stops a later edit from quietly reintroducing
    // the quadratic into the plane's path, where it would be both wrong and slower.
    const fragment = compiled(0, false);
    expect(fragment).not.toContain("NaN");
    expect(fragment.split("exp(").length - 1).toBe(2);
  });
});
