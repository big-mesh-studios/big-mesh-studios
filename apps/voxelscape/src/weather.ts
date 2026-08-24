/**
 * A rare-storm weather schedule keyed to the day-night clock's seconds.
 * Most of the time it is clear; occasionally (on average once every five
 * day-night cycles) a rain, thunder, or snow storm rolls through and lasts a
 * few game-hours of clock time. The schedule is deterministic — every storm's
 * gap, duration, and kind are derived from a seeded PRNG — so the whole
 * module is pure and unit-testable, and fast-forwarding the day-night clock
 * (via `/speed`) advances the weather at the same rate.
 */
import { CYCLE_SECONDS } from "./day-night";
import type { DayNightState, Vec3 } from "./day-night";

export type Weather = "clear" | "rain" | "thunder" | "snow";

export interface WeatherState {
  weather: Weather;
  /** Clock-second the current segment begins (the previous storm's end, or 0). */
  startedAt: number;
  /** Clock-second the current segment ends (the next storm's start, or +Infinity). */
  endsAt: number;
}

/** Mean gap between storm starts: five day-night cycles of clock time. */
export const STORM_MEAN_GAP_SECONDS = 5 * CYCLE_SECONDS;
/** Storms never start closer than a day and a half of clock time apart. */
const GAP_MIN_SECONDS = 1.5 * CYCLE_SECONDS;
/** Uniform spread added to `GAP_MIN_SECONDS`; the two sum to the mean. */
const GAP_SPREAD_SECONDS = 7 * CYCLE_SECONDS;
/** Storm durations span one to four game-hours of clock time. */
export const STORM_MIN_SECONDS = 60;
export const STORM_MAX_SECONDS = 240;

/** A deterministic 32-bit PRNG (mulberry32); returns floats in [0, 1). */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** One storm's independent PRNG stream, keyed by its index. */
const stormRng = (seed: number, i: number): (() => number) =>
  mulberry32((seed ^ Math.imul(i, 0x9e3779b9)) | 0);

/** Storm kind weighting: rain is common, thunder and snow are rarer. */
const stormKind = (u: number): Weather =>
  u < 0.5 ? "rain" : u < 0.8 ? "thunder" : "snow";

/**
 * The weather at clock-second `elapsed`: either a clear stretch (between
 * storms) or the storm in progress. The schedule repeats deterministically
 * for the same `seed`, and time before the first storm (including negative
 * elapsed) reads as clear.
 */
export const weatherAt = (seed: number, elapsed: number): WeatherState => {
  if (elapsed < 0) {
    return { weather: "clear", startedAt: -Infinity, endsAt: 0 };
  }
  let cursor = 0;
  for (let i = 0; ; i++) {
    const rng = stormRng(seed, i);
    const start = cursor + GAP_MIN_SECONDS + rng() * GAP_SPREAD_SECONDS;
    if (elapsed < start) {
      return { weather: "clear", startedAt: cursor, endsAt: start };
    }
    const duration =
      STORM_MIN_SECONDS + rng() * (STORM_MAX_SECONDS - STORM_MIN_SECONDS);
    const end = start + duration;
    if (elapsed < end) {
      return { weather: stormKind(rng()), startedAt: start, endsAt: end };
    }
    cursor = end;
  }
};

/** How a weather type dims and tints the scene at full intensity. */
export interface WeatherLighting {
  /** Sky color blended toward at full intensity. */
  skyTint: Vec3;
  /** Multiplier applied to the day-night ambient light at full intensity. */
  ambientScale: number;
  /** Multiplier applied to the day-night sun light at full intensity. */
  sunScale: number;
  /** Multiplier applied to the day-night moon light at full intensity. */
  moonScale: number;
}

const STORM_LIGHTING: Record<Exclude<Weather, "clear">, WeatherLighting> = {
  rain: {
    skyTint: [0.42, 0.47, 0.52],
    ambientScale: 0.65,
    sunScale: 0.55,
    moonScale: 0.85,
  },
  thunder: {
    skyTint: [0.16, 0.18, 0.24],
    ambientScale: 0.4,
    sunScale: 0.25,
    moonScale: 0.7,
  },
  snow: {
    skyTint: [0.68, 0.74, 0.78],
    ambientScale: 0.85,
    sunScale: 0.7,
    moonScale: 1,
  },
};

/** The lighting adjustments a weather type applies at full intensity. */
export const weatherLighting = (weather: Weather): WeatherLighting => {
  if (weather === "clear") {
    return {
      skyTint: [0.53, 0.81, 0.92],
      ambientScale: 1,
      sunScale: 1,
      moonScale: 1,
    };
  }
  return STORM_LIGHTING[weather];
};

const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const scaleVec = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];

/**
 * Blends the day-night state toward `weather`'s lighting by `intensity`
 * (clamped to 0..1), so the caller can feed a smoothly-ramped intensity and
 * the sky and lights fade into the storm rather than cutting. Returns `dn`
 * unchanged when the intensity is zero.
 */
export const applyWeather = (
  dn: DayNightState,
  weather: Weather,
  intensity: number,
): DayNightState => {
  const t = Math.max(0, Math.min(1, intensity));
  if (t === 0) {
    return dn;
  }
  const w = weatherLighting(weather);
  return {
    ...dn,
    skyColor: mixVec(dn.skyColor, w.skyTint, t),
    ambient: scaleVec(dn.ambient, 1 + (w.ambientScale - 1) * t),
    sunLight: scaleVec(dn.sunLight, 1 + (w.sunScale - 1) * t),
    moonLight: scaleVec(dn.moonLight, 1 + (w.moonScale - 1) * t),
  };
};
