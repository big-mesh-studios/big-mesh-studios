// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SFX_URLS, thunderTiming } from "./sound-controller";

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

describe("SFX_URLS", () => {
  it("ships every sound the mansion script and the weapons can ask for", () => {
    // The voice keys the world binds to recordings: the mansion dispatches the
    // four game stings, and a weapon firing plays `gun-<item id>`.
    expect(Object.keys(SFX_URLS).sort()).toEqual([
      "gun-machine",
      "gun-pistol",
      "gun-rifle",
      "gun-shotgun",
      "wave-complete",
      "wave-eerie",
      "zombie-die",
      "zombie-growl",
    ]);
    // Every name resolves to an audio file served from the site's root.
    for (const url of Object.values(SFX_URLS)) {
      expect(url).toMatch(/audio\/[\w-]+\.ogg$/);
    }
  });
});
