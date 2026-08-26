// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CYCLE_SECONDS,
  DAY_SECONDS,
  NIGHT_SECONDS,
  SUNRISE_SECONDS,
  SUNSET_SECONDS,
  dayNightState,
  phaseAt,
  sunAzimuthDeg,
  sunElevationDeg,
  type DayNightState,
  type Vec3,
} from "./day-night";

const inUnitRange = (v: Vec3): void => {
  expect(v[0]).toBeGreaterThanOrEqual(0);
  expect(v[0]).toBeLessThanOrEqual(1);
  expect(v[1]).toBeGreaterThanOrEqual(0);
  expect(v[1]).toBeLessThanOrEqual(1);
  expect(v[2]).toBeGreaterThanOrEqual(0);
  expect(v[2]).toBeLessThanOrEqual(1);
};

describe("day-night cycle", () => {
  it("durations sum to a 20-minute cycle", () => {
    expect(DAY_SECONDS).toBe(600);
    expect(SUNSET_SECONDS).toBe(90);
    expect(NIGHT_SECONDS).toBe(420);
    expect(SUNRISE_SECONDS).toBe(90);
    expect(CYCLE_SECONDS).toBe(1200);
  });

  it("classifies phases by time", () => {
    expect(phaseAt(0)).toBe("day");
    expect(phaseAt(599.9)).toBe("day");
    expect(phaseAt(600)).toBe("sunset");
    expect(phaseAt(689.9)).toBe("sunset");
    expect(phaseAt(690)).toBe("night");
    expect(phaseAt(1109.9)).toBe("night");
    expect(phaseAt(1110)).toBe("sunrise");
    expect(phaseAt(1199.9)).toBe("sunrise");
  });

  it("keeps the sun above the horizon during the day", () => {
    for (const t of [0, 100, 300, 500, 600]) {
      expect(sunElevationDeg(t)).toBeGreaterThan(0);
    }
  });

  it("keeps the sun below the horizon at night", () => {
    for (const t of [690, 800, 900, 1100]) {
      expect(sunElevationDeg(t)).toBeLessThan(0);
    }
  });

  it("reaches its noon high mid-day and returns at sunset", () => {
    expect(sunElevationDeg(300)).toBeCloseTo(60);
    expect(sunElevationDeg(600)).toBeCloseTo(35);
    expect(sunElevationDeg(690)).toBeCloseTo(-25);
  });

  it("sweeps the sun east to west while it is up", () => {
    expect(sunAzimuthDeg(0)).toBeLessThan(sunAzimuthDeg(300));
    expect(sunAzimuthDeg(300)).toBeLessThan(sunAzimuthDeg(600));
  });

  it("keeps the moon opposite the sun and up at night", () => {
    const day = dayNightState(300);
    const night = dayNightState(900);
    expect(day.moonDir[0]).toBeCloseTo(-day.sunDir[0]);
    expect(day.moonDir[1]).toBeCloseTo(-day.sunDir[1]);
    expect(day.moonDir[2]).toBeCloseTo(-day.sunDir[2]);
    expect(day.moonElevation).toBeLessThan(0);
    expect(day.moonVisible).toBe(false);
    expect(night.moonElevation).toBeGreaterThan(0);
    expect(night.moonVisible).toBe(true);
    expect(night.sunVisible).toBe(false);
  });

  it("returns unit-length sun/moon directions", () => {
    for (const t of [0, 300, 645, 900, 1150]) {
      const s = dayNightState(t);
      const sunLen = Math.hypot(s.sunDir[0], s.sunDir[1], s.sunDir[2]);
      const moonLen = Math.hypot(s.moonDir[0], s.moonDir[1], s.moonDir[2]);
      expect(sunLen).toBeCloseTo(1, 6);
      expect(moonLen).toBeCloseTo(1, 6);
    }
  });

  it("lights full and warm mid-day, dim and blue at night", () => {
    const day = dayNightState(300);
    expect(day.sunLight[0]).toBeGreaterThan(0.9);
    expect(day.ambient[0]).toBeGreaterThan(0.4);
    expect(day.moonLight[2]).toBe(0);
    const night = dayNightState(900);
    expect(night.moonLight[2]).toBeGreaterThan(0.5);
    expect(night.ambient[0]).toBeLessThan(0.1);
    expect(night.skyColor[2]).toBeGreaterThan(night.skyColor[0]);
  });

  it("glows warm through the sunset transition", () => {
    const dusk = dayNightState(650);
    expect(dusk.skyColor[0]).toBeGreaterThan(0.5);
    expect(dusk.skyColor[0]).toBeGreaterThan(dusk.skyColor[1]);
    expect(dusk.skyColor[1]).toBeGreaterThan(dusk.skyColor[2]);
    // the sunset light warms up and then dims
    expect(dusk.sunLight[1]).toBeLessThan(dayNightState(0).sunLight[1]);
  });

  it("keeps all palette colours in 0..1", () => {
    for (let t = 0; t < CYCLE_SECONDS; t += 37) {
      const s = dayNightState(t);
      inUnitRange(s.skyColor);
      inUnitRange(s.ambient);
      inUnitRange(s.sunLight);
      inUnitRange(s.moonLight);
    }
  });

  it("wraps cleanly at the end of the cycle", () => {
    const start = dayNightState(0);
    const end = dayNightState(CYCLE_SECONDS);
    const expectSame = (a: DayNightState, b: DayNightState): void => {
      expect(a.phase).toBe(b.phase);
      expect(a.elapsed % CYCLE_SECONDS).toBeCloseTo(
        b.elapsed % CYCLE_SECONDS,
        6,
      );
      expect(a.sunDir).toEqual(b.sunDir);
      expect(a.moonDir).toEqual(b.moonDir);
      expect(a.sunLight).toEqual(b.sunLight);
      expect(a.moonLight).toEqual(b.moonLight);
      expect(a.ambient).toEqual(b.ambient);
      expect(a.skyColor).toEqual(b.skyColor);
      expect(a.sunElevation).toBeCloseTo(b.sunElevation, 6);
      expect(a.moonElevation).toBeCloseTo(b.moonElevation, 6);
      expect(a.sunVisible).toBe(b.sunVisible);
      expect(a.moonVisible).toBe(b.moonVisible);
    };
    expectSame(start, end);
    // a full cycle later lands on the identical state
    expectSame(dayNightState(300), dayNightState(CYCLE_SECONDS + 300));
  });

  it("handles negative elapsed by wrapping into the cycle", () => {
    expect(sunElevationDeg(-1)).toBe(sunElevationDeg(CYCLE_SECONDS - 1));
  });
});
