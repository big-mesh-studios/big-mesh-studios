// The hand-written source of the "scripted-figures" standard library a place
// script may import (see bundle.ts's recognition of it as a reserved
// specifier). Ordinary guest-side TypeScript, compiled through the same
// `transpileFile` every project file goes through — never a new sandbox
// global, so nothing here changes the trust boundary the interpreter's
// isolation already draws (ADR 0027). Every method just builds the same JSON
// a hand-written script already builds and calls `engine.dispatch` itself;
// see `effects.ts`'s "npc"/"npc-remove"/"npc-die"/"prop"/"prop-remove"
// payloads, which this mirrors field for field — every one of them a single
// fully-named object, which is why every method here takes one too, rather
// than mixing named options in behind a few positional arguments.
export const SCRIPTED_FIGURES_SOURCE = `
declare const engine: { dispatch(tag: string, payload: string): void };

/**
 * A model placed in the world as one script-controlled figure: an id, where
 * it stands, and which way it faces. Shared by \`ScriptedNpc\` and
 * \`ScriptedProp\`, which differ only in which effect they dispatch and which
 * extra fields that effect carries.
 *
 * \`id\` is never generated here — every peer replaying the same script must
 * compute the exact same id independently (ADR 0026), so it has to come
 * from the caller's own deterministic address, the way \`zombies.ts\`
 * derives one from its population seed and spawn cell.
 */
export class ScriptedFigure {
  constructor(model, id, options) {
    this.model = model;
    this.id = id;
    this.x = options.x;
    this.z = options.z;
    this.y = options.y;
    this.yaw = options.yaw === undefined ? 0 : options.yaw;
  }

  /**
   * Moves the figure to (\`options.x\`, \`options.z\`), and re-dispatches its
   * placement. \`options.live\` marks this update as a position the script has
   * computed itself as the figure's current owner, to broadcast to other
   * peers rather than leave for each of them to compute independently — see
   * the "npc" effect's own \`live\` field, which this passes straight through,
   * and defaults to true. A prop, which has no such field, ignores it.
   */
  move(options) {
    this.x = options.x;
    this.z = options.z;
    if (options.y !== undefined) {
      this.y = options.y;
    }
    if (options.yaw !== undefined) {
      this.yaw = options.yaw;
    }
    this.announce(options.live === undefined ? true : options.live);
  }
}

/** An NPC placed and moved through the "npc"/"npc-remove"/"npc-die" effects. */
export class ScriptedNpc extends ScriptedFigure {
  constructor(model, id, options) {
    super(model, id, options);
    this.name = options.name;
    this.modelUri = options.modelUri;
    this.announce(true);
  }

  announce(live) {
    engine.dispatch(
      "npc",
      JSON.stringify({
        id: this.id,
        x: this.x,
        z: this.z,
        y: this.y,
        name: this.name,
        model: this.modelUri === undefined ? this.model.file : undefined,
        modelUri: this.modelUri,
        yaw: this.yaw,
        live: live,
      }),
    );
  }

  /** Removes the NPC outright — no death fall, just gone, like \`.remove()\` on a prop. */
  remove() {
    engine.dispatch("npc-remove", JSON.stringify({ id: this.id }));
  }

  /** Plays a death fall in place of an outright removal, then forgets it the same way. */
  die() {
    engine.dispatch("npc-die", JSON.stringify({ id: this.id }));
  }
}

/** A prop placed through the "prop"/"prop-remove" effects. */
export class ScriptedProp extends ScriptedFigure {
  constructor(model, id, options) {
    super(model, id, options);
    this.name = options.name;
    this.height = options.height;
    this.solid = options.solid;
    this.hazard = options.hazard;
    this.conveyor = options.conveyor;
    this.announce(true);
  }

  announce(_live) {
    engine.dispatch(
      "prop",
      JSON.stringify({
        id: this.id,
        model: this.model.file,
        x: this.x,
        z: this.z,
        y: this.y,
        name: this.name,
        yaw: this.yaw,
        height: this.height,
        solid: this.solid,
        hazard: this.hazard,
        conveyor: this.conveyor,
      }),
    );
  }

  remove() {
    engine.dispatch("prop-remove", JSON.stringify({ id: this.id }));
  }
}
`;
