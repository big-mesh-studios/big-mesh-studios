// The hand-written source of the `"voxelscape"` module a place script
// imports (see bundle.ts's recognition of it as a reserved specifier).
// Re-exports the sandbox's whole host surface — `dispatch`/`onTick`/`log`/
// `heightAt`/etc. — through its own internal-only import, alongside
// `createNpc`/`createProp`, so a script reaches everything through one
// dependency: `import * as engine from "voxelscape"; engine.dispatch(...);
// engine.createNpc(...);`. Ordinary guest-side TypeScript, compiled through
// the same `transpileFile` every project file goes through, so nothing here
// is a new sandbox global and nothing changes the trust boundary the
// interpreter's isolation already draws (ADR 0027). Every function just
// builds the same payload a hand-written script already builds and calls
// `dispatch` itself; see `effects.ts`'s
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

function resolveModel(modelName) {
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
 * "npc"/"npc-remove"/"npc-die" effects. \`options.id\` is never generated
 * here — every peer replaying the same script must compute the exact same
 * id independently (ADR 0026), so it has to come from the caller's own
 * deterministic address, the way \`zombies.ts\` derives one from its
 * population seed and spawn cell.
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
      model: options.modelUri === undefined ? model.file : undefined,
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
`;
