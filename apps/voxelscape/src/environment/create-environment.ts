import { Group, PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { DayNightState } from "./day-night";
import { DayNightController } from "./day-night-controller";
import { SoundController } from "./sound-controller";
import { applyWeather } from "./weather";
import { WeatherController } from "./weather-controller";

export interface EnvironmentConfig {
  /** Highest solid surface at (`x`, `z`): where rain lands and lightning strikes. */
  groundHeightAt: (x: number, z: number) => number;
}

export interface Environment {
  /**
   * Owns the sun/ambient lights, the sun/moon billboards, and the day-night
   * clock (`/day`, `/time`, `/normal`).
   */
  dayNight: DayNightController;
  /**
   * Owns the rain/snow particle systems, the thunder lightning bolts, and the
   * strike flash (`/weather`).
   */
  weather: WeatherController;
  /** Synthesizes rain, wind and thunder from the Web Audio API (`/volume`). */
  sound: SoundController;
  /**
   * Advances the clock, the weather and its sound by `dt` seconds.
   *
   * @returns The lighting and sky colour for this frame, with the weather's
   * tint already mixed into the day-night state.
   */
  tick(dt: number, camera: PerspectiveCamera): DayNightState;
  /** The sun, the moon and the lights, for the scene to place in its draw order. */
  sky: Group;
  /** The rain, snow, lightning and strike flash, likewise. */
  weatherEffects: Group;
  dispose(): void;
}

/**
 * The sky and everything that comes out of it. The clock drives the weather
 * schedule, the weather drives its own sound and tints the lighting, so the
 * three only ever advance together and in that order.
 */
export const createEnvironment = ({
  groundHeightAt,
}: EnvironmentConfig): Environment => {
  const dayNight = new DayNightController();
  const sound = new SoundController();
  const weather = new WeatherController({
    groundHeight: groundHeightAt,
    onStrike: (x, z) => sound.thunderStrike(x, z),
  });

  // Browsers suspend audio until the first user gesture, so the sound stays
  // silent until one arrives. Either listener unlocking it removes both.
  const controller = new AbortController();
  const unlockSound = () => {
    sound.unlock();
    controller.abort();
  };
  const { signal } = controller;
  window.addEventListener("pointerdown", unlockSound, { signal });
  window.addEventListener("keydown", unlockSound, { signal });

  return {
    dayNight,
    weather,
    sound,
    sky: dayNight.sky,
    weatherEffects: weather.weather,

    tick(dt, camera) {
      // A command override pins the shown time; otherwise the real clock
      // (scaled by speed) drives the cycle. The weather schedule keys off the
      // same shown clock seconds.
      const state = dayNight.tick(dt, camera);
      const view = weather.tick(dt, camera, state.elapsed);
      sound.tick(dt, camera, view);
      return applyWeather(state, view.weather, view.intensity);
    },

    dispose() {
      // release the audio hardware
      sound.dispose();
      controller.abort();
    },
  };
};
