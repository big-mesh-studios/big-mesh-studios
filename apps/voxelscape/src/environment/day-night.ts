/**
 * A 20-minute day-night cycle. The sun and moon travel a piecewise path
 * across the sky while the scene's lighting (sun, moon, ambient, and sky
 * colour) smoothly transitions between day, sunset, night, and sunrise
 * palettes. All functions are pure, so the cycle is unit-testable and the
 * caller can query it every frame.
 */

export const DAY_SECONDS = 600;
export const SUNSET_SECONDS = 90;
export const NIGHT_SECONDS = 420;
export const SUNRISE_SECONDS = 90;
export const CYCLE_SECONDS =
  DAY_SECONDS + SUNSET_SECONDS + NIGHT_SECONDS + SUNRISE_SECONDS;

/**
 * Elevation, in degrees, below which a sun/moon square is hidden — a few
 * degrees under the horizon, so it doesn't linger at the fog line.
 */
export const VISIBLE_ELEVATION = -8;

export type Phase = "day" | "sunset" | "night" | "sunrise";

export type Vec3 = [number, number, number];

export interface DayNightState {
  phase: Phase;
  /**
   * Raw clock seconds the state was derived from (unwrapped), so dependent
   * systems such as the weather schedule can key off the same time the sun
   * and moon use.
   */
  elapsed: number;
  /** Unit direction from the world origin toward the sun. */
  sunDir: Vec3;
  /** Unit direction from the world origin toward the moon. */
  moonDir: Vec3;
  /** Diffuse light colour contributed by the sun. */
  sunLight: Vec3;
  /** Diffuse light colour contributed by the moon; zero during the day. */
  moonLight: Vec3;
  /** Flat, non-directional fill light. */
  ambient: Vec3;
  /** Horizon and sky colour, driving the clear colour and the terrain fog. */
  skyColor: Vec3;
  /** Sun elevation above the horizon, in degrees; negative when below it. */
  sunElevation: number;
  /** Moon elevation above the horizon, in degrees; negative when below it. */
  moonElevation: number;
  sunVisible: boolean;
  moonVisible: boolean;
}

export type Palette = {
  sky: Vec3;
  ambient: Vec3;
  sunLight: Vec3;
  moonLight: Vec3;
};

const DAY: Palette = {
  sky: [0.53, 0.81, 0.92],
  ambient: [0.45, 0.5, 0.6],
  sunLight: [1.0, 0.98, 0.9],
  moonLight: [0, 0, 0],
};

const DUSK: Palette = {
  sky: [0.95, 0.5, 0.25],
  ambient: [0.28, 0.2, 0.18],
  sunLight: [1.0, 0.5, 0.2],
  moonLight: [0.15, 0.2, 0.35],
};

const NIGHT: Palette = {
  sky: [0.02, 0.03, 0.09],
  ambient: [0.05, 0.07, 0.15],
  sunLight: [0.05, 0.08, 0.15],
  moonLight: [0.3, 0.4, 0.65],
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/**
 * Walks from `from` through the `mid` palette to `to` as `s` goes from 0 to
 * 1, so a sunset or sunrise glows warm at its midpoint instead of fading
 * straight through.
 *
 * @param from - Palette value at s = 0.
 * @param mid - Palette value at the midpoint, s = 0.5.
 * @param to - Palette value at s = 1.
 * @param s - Progress through the transition, from 0 to 1.
 */
const tween = (from: Vec3, mid: Vec3, to: Vec3, s: number): Vec3 =>
  s < 0.5 ? mix(from, mid, s * 2) : mix(mid, to, (s - 0.5) * 2);

const cycleTime = (elapsed: number): number =>
  ((elapsed % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;

const lerpSeg = (
  t: number,
  t0: number,
  v0: number,
  t1: number,
  v1: number,
): number => lerp(v0, v1, (t - t0) / (t1 - t0));

export const phaseAt = (elapsed: number): Phase => {
  const t = cycleTime(elapsed);
  if (t < DAY_SECONDS) {
    return "day";
  }
  if (t < DAY_SECONDS + SUNSET_SECONDS) {
    return "sunset";
  }
  if (t < DAY_SECONDS + SUNSET_SECONDS + NIGHT_SECONDS) {
    return "night";
  }
  return "sunrise";
};

/**
 * Sun elevation above the horizon, in degrees. Rises to a noon high in the
 * middle of the day, sets below the horizon during the sunset transition,
 * stays down for the night, then climbs back up through sunrise.
 *
 * @param elapsed - Wall-clock time, in seconds, since the cycle began.
 * @returns The sun's elevation, in degrees; negative when below the horizon.
 */
export const sunElevationDeg = (elapsed: number): number => {
  const t = cycleTime(elapsed);
  if (t < 300) {
    return lerpSeg(t, 0, 35, 300, 60);
  }
  if (t < 600) {
    return lerpSeg(t, 300, 60, 600, 35);
  }
  if (t < 690) {
    return lerpSeg(t, 600, 35, 690, -25);
  }
  if (t < 1110) {
    return -25;
  }
  return lerpSeg(t, 1110, -25, 1200, 35);
};

/**
 * Compass angle of the sun in the XZ plane, measured from +X toward +Z. The
 * sun sweeps east to west across the day and into sunset; below the horizon
 * it keeps rotating so the moon, 180 degrees opposite, travels the night
 * sky.
 *
 * @param elapsed - Wall-clock time, in seconds, since the cycle began.
 * @returns The sun's compass angle, in degrees.
 */
export const sunAzimuthDeg = (elapsed: number): number => {
  const t = cycleTime(elapsed);
  if (t < 600) {
    return lerpSeg(t, 0, 60, 600, 120);
  }
  if (t < 690) {
    return lerpSeg(t, 600, 120, 690, 130);
  }
  if (t < 1110) {
    return lerpSeg(t, 690, 130, 1110, 250);
  }
  return lerpSeg(t, 1110, 250, 1200, 300);
};

const paletteAt = (t: number): Palette => {
  switch (phaseAt(t)) {
    case "day":
      return DAY;
    case "night":
      return NIGHT;
    case "sunset": {
      const s = (t - DAY_SECONDS) / SUNSET_SECONDS;
      return {
        sky: tween(DAY.sky, DUSK.sky, NIGHT.sky, s),
        ambient: tween(DAY.ambient, DUSK.ambient, NIGHT.ambient, s),
        sunLight: tween(DAY.sunLight, DUSK.sunLight, NIGHT.sunLight, s),
        moonLight: tween(DAY.moonLight, DUSK.moonLight, NIGHT.moonLight, s),
      };
    }
    case "sunrise": {
      const s =
        (t - DAY_SECONDS - SUNSET_SECONDS - NIGHT_SECONDS) / SUNRISE_SECONDS;
      return {
        sky: tween(NIGHT.sky, DUSK.sky, DAY.sky, s),
        ambient: tween(NIGHT.ambient, DUSK.ambient, DAY.ambient, s),
        sunLight: tween(NIGHT.sunLight, DUSK.sunLight, DAY.sunLight, s),
        moonLight: tween(NIGHT.moonLight, DUSK.moonLight, DAY.moonLight, s),
      };
    }
  }
};

const dirFromElevationAzimuth = (elevation: number, azimuth: number): Vec3 => {
  const e = (elevation * Math.PI) / 180;
  const a = (azimuth * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
};

/**
 * Derives the full scene-lighting state for `elapsed` seconds of wall-clock
 * time. The result repeats every `CYCLE_SECONDS`.
 *
 * @param elapsed - Wall-clock time, in seconds, since the cycle began.
 * @returns The complete day-night state at that moment.
 */
export const dayNightState = (elapsed: number): DayNightState => {
  const t = cycleTime(elapsed);
  const palette = paletteAt(t);
  const sunElevation = sunElevationDeg(t);
  const moonElevation = -sunElevation;
  const sunDir = dirFromElevationAzimuth(sunElevation, sunAzimuthDeg(t));
  const moonDir: Vec3 = [-sunDir[0], -sunDir[1], -sunDir[2]];
  return {
    phase: phaseAt(t),
    elapsed,
    sunDir,
    moonDir,
    sunLight: palette.sunLight,
    moonLight: palette.moonLight,
    ambient: palette.ambient,
    skyColor: palette.sky,
    sunElevation,
    moonElevation,
    sunVisible: sunElevation > VISIBLE_ELEVATION,
    moonVisible: moonElevation > VISIBLE_ELEVATION,
  };
};
