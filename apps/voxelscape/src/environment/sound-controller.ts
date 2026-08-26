import type { PerspectiveCamera } from "@random-mesh/rmsl/scene";
import type { WeatherView } from "./weather-controller";

/** Seconds of the shared noise buffers; long enough for a seamless loop. */
const NOISE_SECONDS = 2;
/** How loudly the recorded rain loop plays at full storm intensity. */
const RAIN_LOOP_GAIN = 0.55;
/** The procedural hiss bed kept under the recording once it has loaded. */
const RAIN_BED_GAIN = 0.18;
/** How loudly the procedural hiss layer plays when no recording is loaded. */
const RAIN_GAIN = 0.5;
/** How loudly the rain "gush" (low body) layer plays at full intensity. */
const RAIN_BODY_GAIN = 0.18;
/** How loudly the wind layer plays at full intensity. */
const WIND_GAIN = 0.3;
/** Wind is boosted a little extra during snow. */
const SNOW_WIND_MULTIPLIER = 1.4;
/** Time constant of the gain ramps when the weather intensity changes. */
const RAMP_TAU = 0.6;
/** Speed of sound, metres per second; thunder lags the flash by distance / c. */
const SPEED_OF_SOUND = 343;
/** The CC0 rain recording, served from `public/audio` (see its README). */
const RAIN_LOOP_URL = "./audio/rain.ogg";
/** The CC0 thunder clap, served from `public/audio` (see its README). */
const THUNDER_URL = "./audio/thunder.ogg";
/** How loudly the recorded thunder clap plays on top of the distance gain. */
const THUNDER_PLAY_GAIN = 0.9;

/**
 * The delay and loudness of a thunder clap as a function of how far away the
 * strike landed. Exported pure so it is unit-testable without an
 * `AudioContext`.
 *
 * @param distance - Horizontal distance from the listener to the strike, in
 * metres.
 * @returns The sound's `delay` in seconds (the boom arrives after the flash)
 * and a `gain` in 0..1 that falls off with distance.
 */
export const thunderTiming = (
  distance: number,
): { delay: number; gain: number } => {
  const d = Math.max(0, distance);
  return {
    delay: d / SPEED_OF_SOUND,
    gain: Math.exp(-d / 160),
  };
};

/** Generates `seconds` of white or brown noise into a fresh audio buffer. */
const makeNoiseBuffer = (
  ctx: AudioContext,
  seconds: number,
  brown: boolean,
): AudioBuffer => {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (brown) {
    // leaky integrator turns white noise into a low-frequency brown rumble
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
};

/** A looping noise layer shaped by one filter, feeding `output`. */
interface LoopLayer {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

/**
 * Synthesizes the weather's sound from the Web Audio API: a CC0 rain
 * recording (falling back to a procedural hiss bed until, or unless, it
 * loads), a wind layer, and per-strike thunder cracks and rumbles generated
 * from the shared noise buffers. The `AudioContext` is created lazily on the
 * first user gesture (`unlock`) because browsers suspend audio until then;
 * every method guards on whether the context exists, so the controller is
 * safe to construct and tick before any interaction.
 */
export class SoundController {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private whiteBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;
  private rain: LoopLayer | null = null;
  private rainBody: LoopLayer | null = null;
  private wind: LoopLayer | null = null;
  private rainLoop: LoopLayer | null = null;
  private rainLoopLoaded = false;
  private thunderBuffer: AudioBuffer | null = null;
  private lfo: OscillatorNode | null = null;
  private lastCamera: PerspectiveCamera | null = null;
  private volume = 1;

  /**
   * Creates (or resumes) the `AudioContext` and starts the looping layers at
   * zero gain. Call from the first pointer/key gesture; browsers require it
   * before audio can play.
   */
  unlock(): void {
    if (this.ctx !== null) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return;
    }
    const ctxClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (ctxClass === undefined) {
      return;
    }
    const ctx = new ctxClass();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    this.whiteBuffer = makeNoiseBuffer(ctx, NOISE_SECONDS, false);
    this.brownBuffer = makeNoiseBuffer(ctx, NOISE_SECONDS, true);

    // rain hiss: white noise through a low-pass; an LFO rocks the cutoff
    this.rain = this.startLoop(ctx, this.whiteBuffer, "lowpass", 2400, 0.4, 0);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 400;
    lfo.connect(lfoDepth);
    lfoDepth.connect(this.rain.filter.frequency);
    lfo.start();
    this.lfo = lfo;

    // rain body ("gush"): brown noise, low-passed low for the rumble weight
    this.rainBody = this.startLoop(
      ctx,
      this.brownBuffer,
      "lowpass",
      500,
      0.7,
      0,
    );

    // wind: brown noise through a band-pass; louder during snow
    this.wind = this.startLoop(ctx, this.brownBuffer, "bandpass", 420, 0.6, 0);

    // the recorded rain loop lands asynchronously; until then the hiss plays
    void this.loadRainLoop(ctx);
    void this.loadThunder(ctx);
  }

  /**
   * Fetches and decodes the CC0 rain recording and starts it as the looping
   * rain layer at zero gain. On any failure the procedural hiss bed carries
   * the rain instead.
   */
  private async loadRainLoop(ctx: AudioContext): Promise<void> {
    try {
      const res = await fetch(RAIN_LOOP_URL);
      if (!res.ok) {
        throw new Error(`${RAIN_LOOP_URL}: ${res.status}`);
      }
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      if (this.ctx !== ctx) {
        return; // unlocked again or disposed while decoding
      }
      // a gentle high-pass drops any sub-sonic rumble in the field recording
      this.rainLoop = this.startLoop(ctx, buffer, "highpass", 40, 0.7, 0);
      this.rainLoopLoaded = true;
    } catch (err) {
      console.warn(
        "[sound] rain recording not loaded; using procedural bed.",
        err,
      );
    }
  }

  /** Fetches and decodes the CC0 thunder clap, stored for per-strike playback. */
  private async loadThunder(ctx: AudioContext): Promise<void> {
    try {
      const res = await fetch(THUNDER_URL);
      if (!res.ok) {
        throw new Error(`${THUNDER_URL}: ${res.status}`);
      }
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      if (this.ctx !== ctx) {
        return;
      }
      this.thunderBuffer = buffer;
    } catch (err) {
      console.warn(
        "[sound] thunder recording not loaded; using synthesized thunder.",
        err,
      );
    }
  }

  private startLoop(
    ctx: AudioContext,
    buffer: AudioBuffer,
    type: BiquadFilterType,
    frequency: number,
    q: number,
    gain: number,
  ): LoopLayer {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.master!);
    source.start();
    return { source, filter, gain: gainNode };
  }

  /**
   * Ramps the ambient layers to match the current weather. Must be called
   * every frame alongside `WeatherController.tick`.
   */
  tick(_dt: number, camera: PerspectiveCamera, view: WeatherView): void {
    this.lastCamera = camera;
    const ctx = this.ctx;
    if (
      ctx === null ||
      this.rain === null ||
      this.rainBody === null ||
      this.wind === null
    ) {
      return;
    }
    const { weather, intensity } = view;
    const raining = weather === "rain" || weather === "thunder";
    const snowMult = weather === "snow" ? SNOW_WIND_MULTIPLIER : 1;
    const now = ctx.currentTime;
    // the recording is the star once loaded; the hiss drops to a thin bed
    this.rain.gain.gain.setTargetAtTime(
      raining
        ? intensity * (this.rainLoopLoaded ? RAIN_BED_GAIN : RAIN_GAIN)
        : 0,
      now,
      RAMP_TAU,
    );
    if (this.rainLoop !== null) {
      this.rainLoop.gain.gain.setTargetAtTime(
        raining ? intensity * RAIN_LOOP_GAIN : 0,
        now,
        RAMP_TAU,
      );
    }
    this.rainBody.gain.gain.setTargetAtTime(
      raining ? intensity * RAIN_BODY_GAIN : 0,
      now,
      RAMP_TAU,
    );
    this.wind.gain.gain.setTargetAtTime(
      intensity * WIND_GAIN * snowMult,
      now,
      RAMP_TAU,
    );
  }

  /**
   * Plays thunder for a strike that just landed at the given world position:
   * the recorded clap (or synthesized crack + rumble until it loads), delayed
   * and attenuated by the strike's distance from the last camera, with a
   * low-frequency sub-oscillator for extra weight.
   */
  thunderStrike(x: number, z: number): void {
    const ctx = this.ctx;
    if (ctx === null) {
      return;
    }
    const cam = this.lastCamera;
    const distance =
      cam === null ? 60 : Math.hypot(x - cam.position.x, z - cam.position.z);
    const { delay, gain } = thunderTiming(distance);
    const at = ctx.currentTime + delay;
    const playGain = Math.min(1, gain * THUNDER_PLAY_GAIN);
    if (this.thunderBuffer !== null) {
      this.playThunderClap(ctx, at, playGain);
    } else {
      this.playCrack(ctx, at, playGain);
      this.playRumble(ctx, at + 0.05 + Math.random() * 0.1, playGain);
    }
    this.playSubRumble(ctx, at, playGain);
  }

  /** Plays the recorded clap once, with a slight random pitch for variety. */
  private playThunderClap(ctx: AudioContext, at: number, gain: number): void {
    const src = ctx.createBufferSource();
    src.buffer = this.thunderBuffer;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.02);
    src.connect(g);
    g.connect(this.master!);
    const duration = this.thunderBuffer!.duration;
    src.start(at);
    src.stop(at + duration + 0.05);
  }

  /** A short detuned sub-oscillator that gives the clap physical weight. */
  private playSubRumble(ctx: AudioContext, at: number, gain: number): void {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 42 + Math.random() * 14;
    const g = ctx.createGain();
    const dur = 2.5 + Math.random() * 1.5;
    g.gain.setValueAtTime(0, at + 0.15);
    g.gain.linearRampToValueAtTime(gain * 0.2, at + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.15 + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(at + 0.15);
    osc.stop(at + 0.15 + dur);
  }

  private playCrack(ctx: AudioContext, at: number, gain: number): void {
    const src = ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const g = ctx.createGain();
    const dur = 0.08 + Math.random() * 0.05;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * 0.5, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master!);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  private playRumble(ctx: AudioContext, at: number, gain: number): void {
    const decay = 2 + Math.random() * 2;
    const src = ctx.createBufferSource();
    src.buffer = this.brownBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(240 + Math.random() * 160, at);
    lp.frequency.exponentialRampToValueAtTime(60, at + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, at + decay);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    src.start(at);
    src.stop(at + decay + 0.1);

    // a detuned sub-oscillator gives the rumble its low-frequency weight
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 46 + Math.random() * 16;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, at);
    og.gain.linearRampToValueAtTime(gain * 0.25, at + 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, at + decay * 0.9);
    osc.connect(og);
    og.connect(this.master!);
    osc.start(at);
    osc.stop(at + decay);
  }

  /** Sets the master volume, 0..1. */
  setVolume(v: number): string {
    this.volume = Math.max(0, Math.min(1, v));
    const ctx = this.ctx;
    if (this.master !== null && ctx !== null) {
      this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.1);
    }
    return `volume set to ${this.volume.toFixed(2)}`;
  }

  describe(): string {
    const state = this.ctx?.state ?? "locked (waiting for input)";
    return `sound: ${state} | volume=${this.volume.toFixed(2)}`;
  }

  /** Stops the loops and releases the audio hardware. Safe to call multiple times. */
  dispose(): void {
    this.rain?.source.stop();
    this.rainBody?.source.stop();
    this.wind?.source.stop();
    this.rainLoop?.source.stop();
    this.lfo?.stop();
    this.rain = null;
    this.rainBody = null;
    this.wind = null;
    this.rainLoop = null;
    this.rainLoopLoaded = false;
    this.thunderBuffer = null;
    this.lfo = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.whiteBuffer = null;
    this.brownBuffer = null;
    if (ctx !== null) {
      void ctx.close();
    }
  }
}
