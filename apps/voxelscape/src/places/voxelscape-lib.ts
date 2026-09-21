// The hand-written source of the `"voxelscape"` module a place script
// imports (see bundle.ts's recognition of it as a reserved specifier).
// Re-exports the sandbox's whole host surface — `dispatch`/`log`/`getHeightAt`/
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
export function getPlayers() {
  return JSON.parse(host.getPlayers());
}

/** Every ending this place has defined, parsed the same way \`getPlayers\` is. */
export function getEndings() {
  return JSON.parse(host.getEndings());
}

/** The scripted figure \`id\` names, or null when there is none. */
export function getEntity(id) {
  return JSON.parse(host.getEntity(id));
}

/** Every scripted figure in the box \`min\` to \`max\`, inclusive, in id order. */
export function getEntitiesInBox(min, max) {
  return JSON.parse(host.getEntitiesInBox(min[0], min[1], min[2], max[0], max[1], max[2]));
}

/** Every scripted figure within \`radius\` of (\`x\`, \`y\`, \`z\`), in id order. */
export function getEntitiesInSphere(x, y, z, radius) {
  return JSON.parse(host.getEntitiesInSphere(x, y, z, radius));
}

/** Every scripted figure carrying \`tag\`, in id order. */
export function getEntitiesWithTag(tag) {
  return JSON.parse(host.getEntitiesWithTag(tag));
}

/** The player \`did\` names, or null when they are not in the place. */
export function getPlayer(did) {
  return JSON.parse(host.getPlayer(did));
}

/** Every player in the box \`min\` to \`max\`, inclusive. */
export function getPlayersInBox(min, max) {
  return JSON.parse(host.getPlayersInBox(min[0], min[1], min[2], max[0], max[1], max[2]));
}

/** The value set for \`player\` under \`key\`, or null when none. */
export function getPlayerValue(player, key) {
  return JSON.parse(host.getPlayerValue(player, key));
}

/** The players ranked by \`key\`, highest first, at most \`count\` of them. */
export function getLeaderboard(key, count) {
  return JSON.parse(host.getLeaderboard(key, count));
}

/**
 * The value the place remembers under \`scope\`/\`key\` for \`player\` ("" for the
 * local player, ignored for the global scope), or null when there is none.
 */
export function getData(scope, player, key) {
  return JSON.parse(host.getData(scope, player, key));
}

/** The players whose remembered number under \`key\` ranks, highest first, at most \`count\`. */
export function getDataLeaderboard(key, count) {
  return JSON.parse(host.getDataLeaderboard(key, count));
}

/** Saves \`value\` for \`player\` ("" for the local player) under \`key\`. */
export function savePlayerData(key, value, player) {
  host.dispatch("data-set", {
    scope: "player",
    player: player,
    key: key,
    value: value,
  });
}

/** Saves \`value\` for everyone under \`key\`. */
export function saveGlobalData(key, value) {
  host.dispatch("data-set", { scope: "global", key: key, value: value });
}

/** Forgets \`key\` for \`player\` ("" for the local player). */
export function deletePlayerData(key, player) {
  host.dispatch("data-delete", {
    scope: "player",
    player: player,
    key: key,
  });
}

/** Saves \`value\` for the signed-in account, whatever place it is read in. */
export function saveAccountData(key, value) {
  host.dispatch("data-set", { scope: "account", key: key, value: value });
}

/** Forgets \`key\` for the signed-in account. */
export function deleteAccountData(key) {
  host.dispatch("data-delete", { scope: "account", key: key });
}

/** Awards the badge \`badge\` to \`player\` ("" for the local player). */
export function awardBadge(badge, player) {
  host.dispatch("badge-award", { badge: badge, player: player });
}

/** Asks the world to read a remembered value; the answer arrives as a \`data-loaded\` fact. */
export function requestData(scope, key, requestId, player) {
  host.dispatch("data-get", {
    scope: scope,
    player: player,
    key: key,
    requestId: requestId,
  });
}

/**
 * Dresses \`player\` ("" for the local player) in the place model named
 * \`modelName\`, or the plain cube when \`modelName\` is "".
 */
export function setPlayerModel(modelName, player) {
  var model = modelName === "" ? undefined : resolveModel(modelName);
  host.dispatch("player-model", {
    player: player === undefined ? "" : player,
    model: model === undefined ? "" : model.file,
  });
}

/** Takes the worn model off \`player\` ("" for the local player), back to the plain cube. */
export function clearPlayerModel(player) {
  host.dispatch("player-model", {
    player: player === undefined ? "" : player,
    model: "",
  });
}

/** Sends \`player\` ("" for the local player) to another place, carrying \`carry\` keys with them. */
export function teleport(place, player, carry) {
  host.dispatch("teleport", {
    player: player === undefined ? "" : player,
    place: place,
    carry: carry,
  });
}

function uiPlayer(options) {
  return options.player === undefined ? "" : options.player;
}

/** Shows a panel docked to a corner; see \`createProp\` for why \`id\` is never generated. */
export function uiPanel(options) {
  host.dispatch("ui-panel", {
    player: uiPlayer(options),
    id: options.id,
    title: options.title,
    anchor: options.anchor,
  });
}

/** Adds a line of text to a panel. */
export function uiLabel(options) {
  host.dispatch("ui-label", {
    player: uiPlayer(options),
    panel: options.panel,
    id: options.id,
    text: options.text,
    color: options.color,
  });
}

/** Adds a labelled bar to a panel. */
export function uiBar(options) {
  host.dispatch("ui-bar", {
    player: uiPlayer(options),
    panel: options.panel,
    id: options.id,
    label: options.label,
    value: options.value,
    max: options.max,
  });
}

/** Adds a button to a panel; its press arrives as a \`ui-clicked\` fact. */
export function uiButton(options) {
  host.dispatch("ui-button", {
    player: uiPlayer(options),
    panel: options.panel,
    id: options.id,
    label: options.label,
    value: options.value,
  });
}

/** Adds an item-sprite image to a panel. */
export function uiImage(options) {
  host.dispatch("ui-image", {
    player: uiPlayer(options),
    panel: options.panel,
    id: options.id,
    sprite: options.sprite,
  });
}

/** Takes an item off a panel, or the whole panel when \`item\` is omitted. */
export function uiRemove(options) {
  host.dispatch("ui-remove", {
    player: uiPlayer(options),
    panel: options.panel,
    item: options.item,
  });
}

/**
 * Shows a leaderboard to the local player as a HUD text readout, ranking the
 * players by the player-value \`key\`. Call it whenever the values change; the
 * readout is replaced rather than appended.
 */
export function showLeaderboard(id, title, key, count) {
  var entries = getLeaderboard(key, count === undefined ? 10 : count);
  var lines = entries.map(function (entry, index) {
    return index + 1 + ". " + entry.player + "  " + entry.value;
  });
  host.dispatch("hud", {
    player: "",
    id: id,
    kind: "text",
    label: title,
    text: lines.join("\\n"),
  });
}

/** Where a ray from \`origin\` along \`direction\` first meets the world, or null within \`maxDistance\` world units. */
export function raycast(origin, direction, maxDistance) {
  return JSON.parse(
    host.raycast(origin[0], origin[1], origin[2], direction[0], direction[1], direction[2], maxDistance)
  );
}

/** The walkable route from \`from\` to \`to\`, as world-unit waypoints, or null when none exists within the bounds. */
export function findPath(from, to, options) {
  var maxNodes = options === undefined || options.maxNodes === undefined ? 0 : options.maxNodes;
  var maxCells = options === undefined || options.maxCells === undefined ? 0 : options.maxCells;
  return JSON.parse(
    host.findPath(from[0], from[1], from[2], to[0], to[1], to[2], maxNodes, maxCells)
  );
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
    tags: options.tags === undefined ? [] : options.tags.slice(),
    attributes:
      options.attributes === undefined
        ? {}
        : Object.assign({}, options.attributes),
  };
  /** Re-sends this figure's tags and attributes after one changes. */
  function announceShape() {
    host.dispatch("entity-set", {
      id: state.id,
      tags: state.tags,
      attributes: state.attributes,
    });
  }
  /** Gives this figure a value under \`key\`, replacing any it held there, and returns this figure. */
  state.setAttribute = function (key, value) {
    state.attributes[key] = value;
    announceShape();
    return state;
  };
  /** The value this figure holds under \`key\`, or undefined. */
  state.getAttribute = function (key) {
    return state.attributes[key];
  };
  /** Names this figure with \`tag\`, so a query can find it by that name, and returns this figure. */
  state.addTag = function (tag) {
    if (state.tags.indexOf(tag) === -1) {
      state.tags.push(tag);
      announceShape();
    }
    return state;
  };
  /** Takes \`tag\` off this figure, and returns this figure. */
  state.removeTag = function (tag) {
    var at = state.tags.indexOf(tag);
    if (at !== -1) {
      state.tags.splice(at, 1);
      announceShape();
    }
    return state;
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
      tags: state.tags,
      attributes: state.attributes,
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
  /**
   * Walks the NPC to walkOptions.x/walkOptions.z along a route the world
   * searches for, at walkOptions.speed world units per second, through the
   * same motion a script may declare by hand. Returns false when no route
   * exists.
   */
  npc.walkTo = function (walkOptions) {
    var targetY =
      walkOptions.y === undefined
        ? host.getHeightAt(walkOptions.x, walkOptions.z)
        : walkOptions.y;
    var fromY = npc.y === undefined ? host.getHeightAt(npc.x, npc.z) : npc.y;
    var route = findPath(
      [npc.x, fromY, npc.z],
      [walkOptions.x, targetY, walkOptions.z],
      walkOptions
    );
    if (route === null || route.length === 0) {
      return false;
    }
    var offsets = [];
    var length = 0;
    for (var i = 0; i < route.length; i++) {
      offsets.push([route[i][0] - npc.x, route[i][1] - fromY, route[i][2] - npc.z]);
    }
    for (var i = 1; i < route.length; i++) {
      length += Math.hypot(
        route[i][0] - route[i - 1][0],
        route[i][1] - route[i - 1][1],
        route[i][2] - route[i - 1][2]
      );
    }
    var speed = walkOptions.speed === undefined ? 4 : walkOptions.speed;
    host.dispatch("npc", {
      id: npc.id,
      x: npc.x,
      z: npc.z,
      y: npc.y,
      name: options.name,
      model:
        options.modelUri === undefined && model !== undefined
          ? model.file
          : undefined,
      modelUri: options.modelUri,
      yaw: npc.yaw,
      live: true,
      tags: npc.tags,
      attributes: npc.attributes,
      motion: {
        path: offsets,
        loop: "once",
        durationMs: Math.max(1, Math.round((length / speed) * 1000)),
        ease: "linear",
      },
    });
    return true;
  };
  /**
   * Plays the model motion called name on the NPC, sampled from the shared
   * clock so every peer sees the same frame. Returns the NPC.
   */
  npc.play = function (name, playOptions) {
    host.dispatch("figure-animate", {
      id: npc.id,
      name: name,
      speed: playOptions === undefined ? undefined : playOptions.speed,
      loop: playOptions === undefined ? undefined : playOptions.loop,
    });
    return npc;
  };
  /** Stops the NPC's animation, standing it back at rest. Returns the NPC. */
  npc.stop = function () {
    host.dispatch("figure-stop", { id: npc.id });
    return npc;
  };
  /** Tints and fades the NPC over its model's colours. Returns the NPC. */
  npc.setLook = function (lookOptions) {
    host.dispatch("entity-look", {
      id: npc.id,
      color: lookOptions.color,
      alpha: lookOptions.alpha,
    });
    return npc;
  };
  /** Clears the NPC's tint and fade. Returns the NPC. */
  npc.clearLook = function () {
    host.dispatch("entity-look-clear", { id: npc.id });
    return npc;
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
      seat: options.seat,
      conveyor: options.conveyor,
      motion: options.motion,
      tags: state.tags,
      attributes: state.attributes,
    });
  });
  prop.remove = function () {
    host.dispatch("prop-remove", { id: prop.id });
  };
  /** Plays the model motion called name on the prop, sampled from the shared clock. Returns the prop. */
  prop.play = function (name, playOptions) {
    host.dispatch("figure-animate", {
      id: prop.id,
      name: name,
      speed: playOptions === undefined ? undefined : playOptions.speed,
      loop: playOptions === undefined ? undefined : playOptions.loop,
    });
    return prop;
  };
  /** Stops the prop's animation, standing it back at rest. Returns the prop. */
  prop.stop = function () {
    host.dispatch("figure-stop", { id: prop.id });
    return prop;
  };
  /** Tints and fades the prop over its model's colours. Returns the prop. */
  prop.setLook = function (lookOptions) {
    host.dispatch("entity-look", {
      id: prop.id,
      color: lookOptions.color,
      alpha: lookOptions.alpha,
    });
    return prop;
  };
  /** Clears the prop's tint and fade. Returns the prop. */
  prop.clearLook = function () {
    host.dispatch("entity-look-clear", { id: prop.id });
    return prop;
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

/**
 * Lights a point in the world — standing where it is placed, or hanging over a
 * figure named by entityId. Returns a handle whose remove puts the light out.
 */
export function createLight(options) {
  host.dispatch("light", {
    id: options.id,
    entityId: options.entityId,
    x: options.x,
    y: options.y,
    z: options.z,
    color: options.color,
    range: options.range,
    intensity: options.intensity,
  });
  var light = { id: options.id };
  light.remove = function () {
    host.dispatch("light-remove", { id: light.id });
  };
  return light;
}

/** Shows a world-space label over a point or a figure; returns a handle whose remove takes it down. */
export function createBillboard(options) {
  host.dispatch("billboard", {
    id: options.id,
    text: options.text,
    entityId: options.entityId,
    x: options.x,
    y: options.y,
    z: options.z,
    color: options.color,
    scale: options.scale,
    height: options.height,
  });
  var billboard = { id: options.id };
  billboard.remove = function () {
    host.dispatch("billboard-remove", { id: billboard.id });
  };
  return billboard;
}

/**
 * Runs a particle emitter at a point, or hanging over a figure named by
 * entityId. Returns a handle whose remove stops it.
 */
export function createParticle(options) {
  host.dispatch("particle", {
    id: options.id,
    kind: options.kind,
    entityId: options.entityId,
    x: options.x,
    y: options.y,
    z: options.z,
    color: options.color,
    size: options.size,
    spread: options.spread,
    lifeMs: options.lifeMs,
    loop: options.loop,
  });
  var particle = { id: options.id };
  particle.remove = function () {
    host.dispatch("particle-remove", { id: particle.id });
  };
  return particle;
}

/** Lays a flat mark on the world; returns a handle whose remove lifts it. */
export function createDecal(options) {
  host.dispatch("decal", {
    id: options.id,
    kind: options.kind,
    entityId: options.entityId,
    x: options.x,
    y: options.y,
    z: options.z,
    color: options.color,
    size: options.size,
    yaw: options.yaw,
  });
  var decal = { id: options.id };
  decal.remove = function () {
    host.dispatch("decal-remove", { id: decal.id });
  };
  return decal;
}

/** Draws a glowing line between two points or figures; returns a handle whose remove takes it down. */
export function createBeam(options) {
  host.dispatch("beam", {
    id: options.id,
    fromEntity: options.fromEntity,
    from: options.from,
    toEntity: options.toEntity,
    to: options.to,
    color: options.color,
    width: options.width,
  });
  var beam = { id: options.id };
  beam.remove = function () {
    host.dispatch("beam-remove", { id: beam.id });
  };
  return beam;
}
`;
