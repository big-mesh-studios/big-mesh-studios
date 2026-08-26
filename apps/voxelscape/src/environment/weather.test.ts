// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dayNightState } from "./day-night";
import {
  STORM_MAX_SECONDS,
  STORM_MEAN_GAP_SECONDS,
  STORM_MIN_SECONDS,
  applyWeather,
  weatherAt,
  weatherLighting,
  type Weather,
  type WeatherState,
} from "./weather";

const VALID: Weather[] = ["clear", "rain", "thunder", "snow"];

describe("weather schedule", () => {
  it("starts clear before the first storm", () => {
    const s = weatherAt(1, 0);
    expect(s.weather).toBe("clear");
    expect(s.startedAt).toBe(0);
    expect(s.endsAt).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed and time", () => {
    for (const t of [0, 300, 4000, 9000, 12345, 1000000]) {
      const a = weatherAt(42, t);
      const b = weatherAt(42, t);
      expect(a).toEqual(b);
    }
  });

  it("produces different schedules for different seeds", () => {
    expect(weatherAt(1, 6000)).not.toEqual(weatherAt(2, 6000));
  });

  it("reads time before the first storm as clear", () => {
    expect(weatherAt(7, -1000).weather).toBe("clear");
  });

  it("keeps every storm within the duration bounds", () => {
    // collect every distinct storm segment seen across a long scan
    const seen = new Map<number, WeatherState>();
    for (let t = 0; t < 600000; t += 30) {
      const s = weatherAt(9, t);
      if (s.weather !== "clear") {
        seen.set(s.startedAt, s);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    for (const s of seen.values()) {
      const duration = s.endsAt - s.startedAt;
      expect(duration).toBeGreaterThanOrEqual(STORM_MIN_SECONDS - 1e-9);
      expect(duration).toBeLessThanOrEqual(STORM_MAX_SECONDS + 1e-9);
      expect(VALID).toContain(s.weather);
    }
  });

  it("is mostly clear, with storm gaps averaging five days", () => {
    // walk the schedule segment by segment (each state partitions time)
    let t = 0;
    let gaps: number[] = [];
    let storms = 0;
    let stormSeconds = 0;
    let totalSeconds = 0;
    for (let i = 0; i < 20000 && t < 2000000; i++) {
      const s = weatherAt(3, t);
      const length = s.endsAt - s.startedAt;
      totalSeconds += length;
      if (s.weather === "clear") {
        gaps.push(length);
      } else {
        storms++;
        stormSeconds += length;
      }
      t = s.endsAt;
    }
    expect(storms).toBeGreaterThan(5);
    expect(gaps.length).toBeGreaterThan(5);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(mean).toBeGreaterThan(STORM_MEAN_GAP_SECONDS * 0.8);
    expect(mean).toBeLessThan(STORM_MEAN_GAP_SECONDS * 1.2);
    expect(stormSeconds / totalSeconds).toBeLessThan(0.1);
  });

  it("partitions time: adjacent states meet at their boundaries", () => {
    for (let t = 0; t < 120000; t += 3000) {
      const s = weatherAt(11, t);
      const next = weatherAt(11, s.endsAt + 0.01);
      expect(next.startedAt).toBe(s.endsAt);
    }
  });
});

describe("weather lighting", () => {
  it("returns identity adjustments for clear", () => {
    const w = weatherLighting("clear");
    expect(w.ambientScale).toBe(1);
    expect(w.sunScale).toBe(1);
    expect(w.moonScale).toBe(1);
  });

  it("dims the storm sky and lights more with severity", () => {
    const rain = weatherLighting("rain");
    const thunder = weatherLighting("thunder");
    const snow = weatherLighting("snow");
    expect(thunder.ambientScale).toBeLessThan(rain.ambientScale);
    expect(thunder.sunScale).toBeLessThan(rain.sunScale);
    expect(rain.sunScale).toBeLessThan(1);
    expect(snow.skyTint[0]).toBeGreaterThan(rain.skyTint[0]);
  });

  it("leaves the state untouched at zero intensity", () => {
    const dn = dayNightState(300);
    const out = applyWeather(dn, "thunder", 0);
    expect(out).toBe(dn);
  });

  it("blends sky toward the tint and dims lights as intensity grows", () => {
    const dn = dayNightState(300);
    const half = applyWeather(dn, "thunder", 0.5);
    const full = applyWeather(dn, "thunder", 1);
    const lum = (v: [number, number, number]): number =>
      0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    // sky moves monotonically toward the storm tint
    expect(lum(half.skyColor)).toBeLessThan(lum(dn.skyColor));
    expect(lum(full.skyColor)).toBeLessThan(lum(half.skyColor));
    // lights dim monotonically
    expect(half.sunLight[0]).toBeLessThan(dn.sunLight[0]);
    expect(full.sunLight[0]).toBeLessThan(half.sunLight[0]);
    expect(full.sunLight[0]).toBeGreaterThan(0);
  });

  it("keeps the blended fields within the day-night's own ranges", () => {
    const dn = dayNightState(900);
    const out = applyWeather(dn, "snow", 1);
    for (const v of [out.skyColor, out.ambient, out.sunLight, out.moonLight]) {
      expect(v[0]).toBeGreaterThanOrEqual(0);
      expect(v[0]).toBeLessThanOrEqual(1);
      expect(v[1]).toBeGreaterThanOrEqual(0);
      expect(v[1]).toBeLessThanOrEqual(1);
      expect(v[2]).toBeGreaterThanOrEqual(0);
      expect(v[2]).toBeLessThanOrEqual(1);
    }
  });
});
