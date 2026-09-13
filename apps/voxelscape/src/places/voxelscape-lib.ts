// The hand-written source of the `"voxelscape"` module a place script
// imports (see bundle.ts's recognition of it as a reserved specifier).
// Re-exports the sandbox's whole host surface — `dispatch`/`log`/`heightAt`/
// etc. — through its own internal-only import, alongside `createNpc`/
// `createProp`, so a script reaches everything through one dependency:
// `import * as engine from "voxelscape"; engine.dispatch(...);
// engine.createNpc(...);`. `onTick` is the one function re-exported as a
// wrapper rather than as-is: it parses the events its own `onTick` call
// receives before handing them to the script, so a script never sees the
// JSON text they crossed the sandbox boundary as. Ordinary guest-side
// TypeScript, compiled through the same `transpileFile` every project file
// goes through, so nothing here is a new sandbox global and nothing changes
// the trust boundary the interpreter's isolation already draws (ADR 0027).
// Every function just builds the same payload a hand-written script already
// builds and calls `dispatch` itself; see `effects.ts`'s
// "npc"/"npc-remove"/"npc-die"/"prop"/"prop-remove" payloads, which this
// mirrors field for field — every one of them a single fully-named object,
// which is why every function here takes one too.
//
// Plain factory functions, not classes — `createNpc`/`createProp` hand back
// a plain object closing over its own placement, never something a script
// constructs with `new`. `__models` is generated and appended after this
// source by bundle.ts's `voxelscapeModuleSource`, one entry per model this
// place attaches.
export const VOXELSCAPE_LIB_SOURCE = `
import * as host from "engine-host";
export * from "engine-host";

/** Registers \`fn\` with the host's own \`onTick\`, parsing the events it
 * hands back before \`fn\` ever sees them — a script reads real facts, never
 * the JSON text they crossed the sandbox boundary as. */
export function onTick(fn) {
  host.onTick(function (clockMs, eventsJson) {
    fn(clockMs, JSON.parse(eventsJson));
  });
}

/** Every player's live position: the local player first, then connected
 * peers — parsed here, so a script reads the array directly rather than the
 * JSON text it crossed the sandbox boundary as. */
export function players() {
  return JSON.parse(host.players());
}

/** Every ending this place has defined, parsed the same way \`players\` is. */
export function endings() {
  return JSON.parse(host.endings());
}

function resolveModel(modelName) {
  if (modelName === undefined) {
    return undefined;
  }
  var model = __models[modelName];
  if (model === undefined) {
    throw new Error("this place carries no such model: \\"" + modelName + "\\"");
  }
  return model;
}

function place(model, options, announce) {
  var state = {
    model: model,
    id: options.id,
    x: options.x,
    z: options.z,
    y: options.y,
    yaw: options.yaw === undefined ? 0 : options.yaw,
  };
  state.move = function (moveOptions) {
    state.x = moveOptions.x;
    state.z = moveOptions.z;
    if (moveOptions.y !== undefined) {
      state.y = moveOptions.y;
    }
    if (moveOptions.yaw !== undefined) {
      state.yaw = moveOptions.yaw;
    }
    announce(state, moveOptions.live === undefined ? true : moveOptions.live);
  };
  announce(state, true);
  return state;
}

/**
 * Places an NPC wearing the model named \`options.model\`, through the
 * "npc"/"npc-remove"/"npc-die" effects — or the world's own default figure
 * when \`options.model\` is omitted entirely. \`options.id\` is never
 * generated here — every peer replaying the same script must compute the
 * exact same id independently (ADR 0026), so it has to come from the
 * caller's own deterministic address, the way \`zombies.ts\` derives one from
 * its population seed and spawn cell.
 */
export function createNpc(options) {
  var model = resolveModel(options.model);
  var npc = place(model, options, function (state, live) {
    host.dispatch("npc", {
      id: state.id,
      x: state.x,
      z: state.z,
      y: state.y,
      name: options.name,
      model:
        options.modelUri === undefined && model !== undefined
          ? model.file
          : undefined,
      modelUri: options.modelUri,
      yaw: state.yaw,
      live: live,
    });
  });
  /** Removes the NPC outright — no death fall, just gone, like \`.remove()\` on a prop. */
  npc.remove = function () {
    host.dispatch("npc-remove", { id: npc.id });
  };
  /** Plays a death fall in place of an outright removal, then forgets it the same way. */
  npc.die = function () {
    host.dispatch("npc-die", { id: npc.id });
  };
  return npc;
}

/** Places a prop wearing the model named \`options.model\`, through the "prop"/"prop-remove" effects; see \`createNpc\` for how a name resolves and why \`id\` is never generated. */
export function createProp(options) {
  var model = resolveModel(options.model);
  var prop = place(model, options, function (state) {
    host.dispatch("prop", {
      id: state.id,
      model: model.file,
      x: state.x,
      z: state.z,
      y: state.y,
      name: options.name,
      yaw: state.yaw,
      height: options.height,
      solid: options.solid,
      hazard: options.hazard,
      conveyor: options.conveyor,
      motion: options.motion,
    });
  });
  prop.remove = function () {
    host.dispatch("prop-remove", { id: prop.id });
  };
  return prop;
}

/**
 * Stands a box the player cannot walk through, through the
 * "barrier"/"barrier-remove" effects. A barrier is drawn nothing, so nothing
 * script-steered — a horde's own movement, a bullet — is blocked with it; its
 * box is added to the player's solids the way a solid prop's box is, which is
 * the whole point: a gap a player pays to keep closed stays closed to them
 * while the creatures still come through it.
 */
export function createBarrier(options) {
  host.dispatch("barrier", {
    id: options.id,
    min: options.min,
    max: options.max,
  });
  var barrier = { id: options.id, min: options.min, max: options.max };
  barrier.remove = function () {
    host.dispatch("barrier-remove", { id: barrier.id });
  };
  return barrier;
}
`;
