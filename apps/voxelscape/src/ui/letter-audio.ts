// The per-letter typewriter sound for NPC dialog. One short CC0 tick is served
// from `public/audio/letter-tick.ogg` (see its README for provenance); the
// buffer is fetched and decoded once the audio context exists, and a tiny
// synthesized blip stands in until it is ready or on a browser that will not
// decode it. The context is created and resumed on the first user gesture, the
// same discipline the weather's sound controller follows, so a dialog opened by
// a tap can make a sound.
const TICK_URL = "./audio/letter-tick.ogg";

/** How loud one letter tick is, relative to the sample. */
const TICK_GAIN = 0.6;

class LetterAudio {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private bytes: Promise<ArrayBuffer | null> | null = null;

  /** Starts listening for the first gesture, which is what may create audio. */
  constructor() {
    this.bytes = fetch(TICK_URL)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    window.addEventListener("pointerdown", () => this.unlock(), { once: true });
    window.addEventListener("keydown", () => this.unlock(), { once: true });
  }

  /** Creates and resumes the audio context, on a user gesture. */
  unlock(): void {
    if (this.context !== null) {
      void this.context.resume();
      this.decode();
      return;
    }
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtor === undefined) {
      return;
    }
    this.context = new AudioCtor();
    this.decode();
  }

  /** Decodes the bundled tick once both it and the context exist. */
  private async decode(): Promise<void> {
    if (this.context === null || this.buffer !== null || this.bytes === null) {
      return;
    }
    const bytes = await this.bytes;
    if (bytes === null || this.context === null) {
      return;
    }
    try {
      this.buffer = await this.context.decodeAudioData(bytes);
    } catch {
      this.buffer = null;
    }
  }

  /** Plays one letter tick. */
  play(): void {
    this.unlock();
    const context = this.context;
    if (context === null) {
      return;
    }
    if (context.state === "suspended") {
      void context.resume();
    }
    const gain = context.createGain();
    gain.gain.value = TICK_GAIN;
    gain.connect(context.destination);
    if (this.buffer !== null) {
      const source = context.createBufferSource();
      source.buffer = this.buffer;
      source.connect(gain);
      source.start();
      return;
    }
    this.synthesize(context, gain);
  }

  /** A short decaying blip, close enough to the tick until the sample loads. */
  private synthesize(context: AudioContext, gain: GainNode): void {
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(1250, now);
    oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.03);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + 0.04);
  }
}

/** The one letter-tick player every dialog shares. */
export const letterAudio = new LetterAudio();
