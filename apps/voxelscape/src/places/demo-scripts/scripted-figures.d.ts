// Stands in for the real ambient declaration the place editor injects live
// (scripted-figures-dts.ts's `SCRIPTED_FIGURES_DTS`), so `zombies.ts` — an
// ordinary source file in this project, not only something loaded through
// the editor — type-checks the same way any other file here does. Kept
// identical to `SCRIPTED_FIGURES_DTS`'s content by a test in
// scripted-figures-dts.test.ts, since — unlike a model's generated `.d.ts` —
// this one is fixed, not derived from any place data, so there is no reason
// for the two copies to ever drift.
declare module "scripted-figures" {
  /** Where a scripted figure stands and faces, over the id/model a constructor also takes. */
  interface ScriptedFigureOptions {
    x: number;
    z: number;
    y?: number;
    yaw?: number;
  }

  /**
   * A model placed in the world as one script-controlled figure: an id,
   * where it stands, and which way it faces. Generic over the model's own
   * descriptor (e.g. what an `import zombie from "zombie" with { type:
   * "model" }` gives), so a later addition can type a motion by its real
   * name without this class changing shape.
   */
  abstract class ScriptedFigure<M extends { name: string; file: string }> {
    constructor(model: M, id: string, options: ScriptedFigureOptions);
    readonly id: string;
    /** Where the figure currently stands — set by the constructor and by `move`, never by anything else. */
    readonly x: number;
    readonly z: number;
    /** Feet height in world units, or undefined to leave it grounded. */
    readonly y?: number;
    /** Which way the figure currently faces, in radians. */
    readonly yaw: number;
    /**
     * Moves the figure and re-dispatches its placement. `options.live` marks
     * this update as a position the script has computed itself as the
     * figure's current owner, to broadcast to other peers rather than leave
     * for each of them to compute independently — see the "npc" effect's own
     * `live` field, which this passes straight through, and defaults to
     * true. A prop, which has no such field, ignores it.
     */
    move(options: ScriptedFigureOptions & { live?: boolean }): void;
  }

  interface ScriptedNpcOptions extends ScriptedFigureOptions {
    name?: string;
    /** Reads the model live from its own `at://` address instead of the place's bundled files. */
    modelUri?: string;
  }

  /** An NPC placed and moved through the "npc"/"npc-remove"/"npc-die" effects. */
  export class ScriptedNpc<
    M extends { name: string; file: string },
  > extends ScriptedFigure<M> {
    constructor(model: M, id: string, options: ScriptedNpcOptions);
    /** Removes the NPC outright — no death fall. */
    remove(): void;
    /** Plays a death fall in place of an outright removal, then forgets it the same way. */
    die(): void;
  }

  interface ScriptedPropOptions extends ScriptedFigureOptions {
    name?: string;
    height?: number;
    solid?: boolean;
    hazard?: boolean;
    conveyor?: { vx: number; vz: number };
  }

  /** A prop placed through the "prop"/"prop-remove" effects. */
  export class ScriptedProp<
    M extends { name: string; file: string },
  > extends ScriptedFigure<M> {
    constructor(model: M, id: string, options: ScriptedPropOptions);
    remove(): void;
  }
}
