// @vitest-environment node
import { describe, expect, it } from "vitest";
import { thunderTiming } from "./sound-controller";

describe("thunderTiming", () => {
  it("delays the boom by distance over the speed of sound", () => {
    expect(thunderTiming(0).delay).toBe(0);
    expect(thunderTiming(343).delay).toBeCloseTo(1, 6);
    expect(thunderTiming(686).delay).toBeCloseTo(2, 6);
  });

  it("attenuates loudness as the strike moves away", () => {
    const near = thunderTiming(20).gain;
    const mid = thunderTiming(110).gain;
    const far = thunderTiming(280).gain;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(near).toBeLessThanOrEqual(1);
    expect(far).toBeGreaterThan(0);
  });

  it("clamps negative distances to zero", () => {
    expect(thunderTiming(-5)).toEqual(thunderTiming(0));
  });
});
