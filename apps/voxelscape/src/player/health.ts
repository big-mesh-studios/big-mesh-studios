// The player's health, in the Ocarina-of-Time idiom: each heart holds two hit
// points, and a hit that lands partway through a heart leaves that heart half
// full. A plain class with an optional change callback, so the hearts HUD can
// refresh when a hit lands or the player respawns. It also owns the death
// sequence: a player whose hearts empty falls to the ground over
// `DEATH_FALL_SECONDS`, lies there for `DEATH_LIE_SECONDS`, and then asks the
// caller to respawn — the same fall a zombie corpse plays, read through
// `fallProgress` so the camera can draw it.

/** Hit points one heart holds; the HUD renders hearts as full, half, or empty. */
export const HEART_HP = 2;

/** The hearts the player starts every respawn with. */
export const START_HEARTS = 3;

/** Seconds the death fall takes to reach the ground, matching a zombie corpse's fall. */
export const DEATH_FALL_SECONDS = 0.5;

/** Seconds the fallen player lies before respawning, matching a corpse's lie. */
export const DEATH_LIE_SECONDS = 0.5;

/**
 * The share of a hit a raised guard still lets through, rounded up so the
 * smallest hits are lessened rather than turned away entirely.
 */
export const GUARD_SHARE = 0.5;

/** A heart's fill, as the HUD draws it: empty, half, or full. */
export type HeartFill = 0 | 1 | 2;

/**
 * The fills the hearts should be drawn with for a player at `hp` of `maxHp`:
 * one entry per heart, full for a heart the hp covers completely, half for the
 * heart a partial hit point cuts through, empty below that. `hp` is floored
 * into the available range, so a dying player's last heart drains by halves.
 */
export const heartStates = (hp: number, maxHp: number): HeartFill[] => {
  const hearts = Math.ceil(maxHp / HEART_HP);
  const filled = Math.max(0, Math.min(maxHp, Math.floor(hp)));
  const states: HeartFill[] = [];
  let remaining = filled;
  for (let i = 0; i < hearts; i++) {
    if (remaining >= HEART_HP) {
      states.push(2);
      remaining -= HEART_HP;
    } else if (remaining > 0) {
      states.push(1);
      remaining = 0;
    } else {
      states.push(0);
    }
  }
  return states;
};

export interface PlayerHealthParams {
  /**
   * Called once a death fall has lain out, so the caller can respawn the
   * player. Not called again until the player dies a second time.
   */
  onFallDone?: () => void;
}

export class PlayerHealth {
  /** Called whenever the current health changes, so the hearts HUD can refresh. */
  onChange: (() => void) | null = null;

  /** Hit points the player has when unhurt. */
  readonly maxHp = START_HEARTS * HEART_HP;

  /** Current hit points, floored at zero. */
  hp = this.maxHp;

  /** Whether the player is lying dead, mid fall or waiting to respawn. */
  dead = false;

  /** Whether the player's guard is up, which lessens what a hit takes. */
  private guarding = false;

  private readonly onFallDone: (() => void) | undefined;
  private fallSeconds = 0;
  private fallDone = false;

  constructor(params: PlayerHealthParams = {}) {
    this.onFallDone = params.onFallDone;
  }

  /** Raises or lowers the guard, which is what a wielded tool holds up. */
  setGuarding(raised: boolean): void {
    this.guarding = raised;
  }

  /**
   * Deals `amount` damage, lessened while the guard is up and flooring health
   * at zero. Returns the health actually taken — a hit on a corpse takes
   * nothing, and a swing stronger than the health left takes only what
   * remains. The first hit that empties the hearts starts the death fall.
   */
  takeDamage(amount: number): number {
    const taking = this.guarding ? Math.ceil(amount * GUARD_SHARE) : amount;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - taking);
    const taken = before - this.hp;
    if (taken > 0) {
      this.emit();
      if (before > 0 && this.hp === 0) {
        this.dead = true;
        this.fallSeconds = 0;
        this.fallDone = false;
      }
    }
    return taken;
  }

  /** Heals up to `amount`, never past the max; a full-heal command passes the max. */
  heal(amount: number): void {
    const next = Math.min(this.maxHp, this.hp + amount);
    if (next !== this.hp) {
      this.hp = next;
      this.emit();
    }
  }

  /** How far the death fall has run, 0 standing to 1 lying flat, for the camera. */
  get fallProgress(): number {
    return Math.min(1, this.fallSeconds / DEATH_FALL_SECONDS);
  }

  /**
   * Advances the death sequence by `dt` seconds: the fall, then the lie, then
   * a single `onFallDone`. A no-op while the player is alive.
   */
  tick(dt: number): void {
    if (!this.dead) {
      return;
    }
    this.fallSeconds += dt;
    if (
      !this.fallDone &&
      this.fallSeconds >= DEATH_FALL_SECONDS + DEATH_LIE_SECONDS
    ) {
      this.fallDone = true;
      this.onFallDone?.();
    }
  }

  /** Restores full hearts and stands the player up, ending the death sequence. */
  respawn(): void {
    this.dead = false;
    this.guarding = false;
    this.fallSeconds = 0;
    this.fallDone = false;
    this.hp = this.maxHp;
    this.emit();
  }

  private emit(): void {
    this.onChange?.();
  }
}
