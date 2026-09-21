// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ScriptHost } from "./script-host";
import { MAIN_SCRIPT_FILE } from "./project";
import type { ScriptEvent } from "./events";
import type { DataScope, DataValue, LivePlayer } from "./sandbox";

let clockMs = 0;

interface Harness {
  host: ScriptHost;
  toasts: string[];
  notices: string[];
  blockEdits: Array<{
    min: [number, number, number];
    max: [number, number, number];
    id: number;
  }>;
  heals: Array<{ player: string; amount: number }>;
  maxHealth: Array<{ player: string; maxHealth: number }>;
  pushes: Array<{ player: string; vx: number; vy: number; vz: number }>;
  sounds: Array<{
    player: string;
    name: string;
    id: string;
    volume: number;
    pitch: number;
    loop: boolean;
  }>;
  soundStops: Array<{ player: string; id: string }>;
  teleports: Array<{ player: string; place: string }>;
  playerModels: Array<{ player: string; model: string; modelUri: string }>;
  events: ScriptEvent[];
}

/** A host over flat ground at y 10, one local player, and every new callback recorded. */
const makeHost = (
  players: LivePlayer[] = [],
  refreshData?: (
    scope: DataScope,
    player: string,
    key: string,
  ) => Promise<DataValue | null>,
): Harness => {
  clockMs = 0;
  const toasts: string[] = [];
  const notices: string[] = [];
  const blockEdits: Harness["blockEdits"] = [];
  const heals: Harness["heals"] = [];
  const maxHealth: Harness["maxHealth"] = [];
  const pushes: Harness["pushes"] = [];
  const sounds: Harness["sounds"] = [];
  const soundStops: Harness["soundStops"] = [];
  const teleports: Harness["teleports"] = [];
  const playerModels: Harness["playerModels"] = [];
  const events: ScriptEvent[] = [];
  const host = new ScriptHost({
    seed: 5,
    getNow: () => clockMs,
    getHeightAt: () => 10,
    getSolidAt: (_x, y, _z) => y < 10,
    getBlockAt: (_x, y, _z) => (y < 10 ? 25 : 0),
    getPlayers: () =>
      players.length > 0
        ? players
        : [
            {
              did: "did:local",
              x: 0,
              y: 0,
              z: 0,
              yaw: 0,
              health: 6,
              maxHealth: 6,
            },
          ],
    onToast: (_player, text) => toasts.push(text),
    onNotice: (message) => notices.push(message),
    onBlockEdit: (edit) => blockEdits.push(edit),
    onPlayerHeal: (player, amount) => heals.push({ player, amount }),
    onPlayerMaxHealth: (player, maxHealthValue) =>
      maxHealth.push({ player, maxHealth: maxHealthValue }),
    onPlayerPush: (player, vx, vy, vz) => pushes.push({ player, vx, vy, vz }),
    onSound: (player, name, playback) =>
      sounds.push({ player, name, ...playback }),
    onSoundStop: (player, id) => soundStops.push({ player, id }),
    onTeleport: (player, place) => teleports.push({ player, place }),
    onPlayerModel: (player, model, modelUri) =>
      playerModels.push({ player, model, modelUri }),
    refreshData,
    onEvent: (event) => events.push(event),
  });
  return {
    host,
    toasts,
    notices,
    blockEdits,
    heals,
    maxHealth,
    pushes,
    sounds,
    soundStops,
    teleports,
    playerModels,
    events,
  };
};

const load = (host: ScriptHost, source: string) =>
  host.loadProject({ [MAIN_SCRIPT_FILE]: source }, MAIN_SCRIPT_FILE);

/** The last toast parsed as JSON, which is how these scripts report a query result. */
const lastProbe = (toasts: string[]): Record<string, unknown> =>
  JSON.parse(toasts[toasts.length - 1]) as Record<string, unknown>;

describe("script world queries", () => {
  it("reads an entity's tags and attributes, and finds entities by tag", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getEntity, getEntitiesWithTag } from "voxelscape";
        var first = true;
        onTick(function () {
          if (first) {
            first = false;
            dispatch("npc", {
              id: "boss", x: 0, z: 0, name: "Boss",
              tags: ["enemy"], attributes: { health: 100 },
            });
            dispatch("entity-set", { id: "boss", attributes: { health: 50 } });
            return;
          }
          var e = getEntity("boss");
          var found = getEntitiesWithTag("enemy");
          dispatch("toast", { player: "", text: JSON.stringify({
            kind: e.kind, tag: e.tags[0], hp: e.attributes.health,
            name: e.name, found: found.length,
          }) });
        });
      `,
    );
    await h.host.use("x", "");
    expect(h.notices).toEqual([]);
    expect(lastProbe(h.toasts)).toEqual({
      kind: "npc",
      tag: "enemy",
      hp: 50,
      name: "Boss",
      found: 1,
    });
  });

  it("reads a player's live state and the players in a box", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getPlayer, getPlayersInBox } from "voxelscape";
        onTick(function () {
          var p = getPlayer("did:local");
          var boxed = getPlayersInBox([-1, -1, -1], [1, 1, 1]);
          dispatch("toast", { player: "", text: JSON.stringify({
            health: p.health, max: p.maxHealth, boxed: boxed.length,
            missing: getPlayer("did:ghost"),
          }) });
        });
      `,
    );
    expect(lastProbe(h.toasts)).toEqual({
      health: 6,
      max: 6,
      boxed: 1,
      missing: null,
    });
  });

  it("reads the block id and casts a ray that meets a figure before the ground", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getBlockAt, getEntitiesInBox, raycast } from "voxelscape";
        var first = true;
        onTick(function () {
          if (first) {
            first = false;
            dispatch("npc", { id: "wall", x: 0, z: 0, y: 10 });
            return;
          }
          var hit = raycast([0, 20, 0], [0, -1, 0], 50);
          var boxed = getEntitiesInBox([-1, 9, -1], [1, 13, 1]);
          dispatch("toast", { player: "", text: JSON.stringify({
            kind: hit.kind, id: hit.id, distance: hit.distance,
            block: getBlockAt(0, 0, 0), boxed: boxed.length,
          }) });
        });
      `,
    );
    await h.host.use("x", "");
    expect(lastProbe(h.toasts)).toMatchObject({
      kind: "npc",
      id: "wall",
      distance: 8,
      block: 25,
      boxed: 1,
    });
  });

  it("reports the held item to the script", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getHeldItem } from "voxelscape";
        var first = true;
        onTick(function () {
          if (first) {
            first = false;
            dispatch("item-define", { id: "chips", name: "Chips", sprite: "", stackable: true });
            dispatch("item-give", { player: "", item: "chips", count: 1 });
            dispatch("item-hold", { player: "", item: "chips" });
            return;
          }
          dispatch("toast", { player: "", text: getHeldItem() });
        });
      `,
    );
    await h.host.use("x", "");
    expect(h.toasts).toEqual(["chips"]);
  });

  it("names the local player, pushes them, and reports a hit as a fact", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getLocalPlayer } from "voxelscape";
        var first = true;
        onTick(function () {
          if (!first) { return; }
          first = false;
          dispatch("toast", { player: "", text: getLocalPlayer() });
          dispatch("player-push", { player: "", vx: 3, vy: 5, vz: 0 });
          dispatch("report-hit", {
            player: "did:local", entityId: "boss", amount: 4, attackerX: 1, attackerZ: 2,
          });
        });
      `,
    );
    expect(h.toasts).toEqual(["did:local"]);
    expect(h.pushes).toEqual([{ player: "", vx: 3, vy: 5, vz: 0 }]);
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "entity-hit",
        entityId: "boss",
        amount: 4,
        attackerX: 1,
        attackerZ: 2,
        producer: "did:local",
      }),
    );
  });

  it("tracks teams and player values, and ranks them", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import {
          onTick, dispatch, getPlayer, getPlayerValue, getLeaderboard, showLeaderboard,
        } from "voxelscape";
        var first = true;
        onTick(function () {
          if (first) {
            first = false;
            dispatch("team-define", { id: "red", name: "Red Team" });
            dispatch("player-team", { player: "did:local", team: "red" });
            dispatch("player-value", { player: "did:a", key: "score", value: 5 });
            dispatch("player-value", { player: "did:b", key: "score", value: 9 });
            dispatch("player-value", { player: "did:local", key: "score", value: 1 });
            return;
          }
          var board = getLeaderboard("score", 3);
          showLeaderboard("lb", "Scores", "score", 3);
          dispatch("toast", { player: "", text: JSON.stringify({
            team: getPlayer("did:local").team,
            value: getPlayerValue("did:b", "score"),
            board: board,
          }) });
        });
      `,
    );
    await h.host.use("x", "");
    expect(lastProbe(h.toasts)).toEqual({
      team: "red",
      value: 9,
      board: [
        { player: "did:b", value: 9 },
        { player: "did:a", value: 5 },
        { player: "did:local", value: 1 },
      ],
    });
    const lb = h.host.hudFor("").find((readout) => readout.id === "lb");
    expect(lb?.label).toBe("Scores");
    expect(lb?.text).toBe("1. did:b  9\n2. did:a  5\n3. did:local  1");
  });

  it("reports a bound key as an input fact", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        onTick(function () {
          dispatch("bind", { id: "dash", key: "KeyQ", label: "Dash" });
        });
      `,
    );
    expect(h.host.bindingKeys).toEqual(["KeyQ"]);
    await h.host.input("KeyQ", "down", "did:local");
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "input",
        bindId: "dash",
        phase: "down",
        producer: "did:local",
      }),
    );
    await h.host.input("KeyZ", "down", "did:local");
    expect(h.events.filter((event) => event.kind === "input")).toHaveLength(1);
  });

  it("answers a one-shot prompt instead of a bare use", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var first = true;
        onTick(function () {
          if (!first) { return; }
          first = false;
          dispatch("npc", { id: "door", x: 0, z: 0, y: 10 });
          dispatch("prompt", {
            id: "open", entityId: "door", verb: "Open", once: true,
          });
        });
      `,
    );
    expect(h.host.promptFor("door")?.verb).toBe("Open");
    await h.host.use("door", "did:local");
    expect(h.events).toContainEqual(
      expect.objectContaining({ kind: "prompt-triggered", promptId: "open" }),
    );
    expect(h.events.some((event) => event.kind === "entity-used")).toBe(false);
    expect(h.host.promptFor("door")).toBeNull();
  });

  it("searches a walkable route between two points", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, findPath } from "voxelscape";
        onTick(function () {
          var route = findPath([1, 10, 1], [9, 10, 1]);
          dispatch("toast", { player: "", text: JSON.stringify({
            n: route.length, last: route[route.length - 1],
            none: findPath([1, 10, 1], [200, 10, 1], { maxCells: 1 }),
          }) });
        });
      `,
    );
    expect(lastProbe(h.toasts)).toEqual({ n: 5, last: [9, 10, 1], none: null });
  });
});

describe("script figure animation", () => {
  it("plays, keeps through a move, and stops a model motion", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var step = 0;
        onTick(function () {
          step++;
          if (step === 1) {
            dispatch("npc", { id: "z1", x: 0, z: 0, y: 10 });
            dispatch("figure-animate", { id: "z1", name: "walk", speed: 2 });
          } else if (step === 2) {
            dispatch("npc", { id: "z1", x: 1, z: 0, y: 10 });
          } else if (step === 3) {
            dispatch("figure-stop", { id: "z1" });
          }
        });
      `,
    );
    expect(h.host.animationFor("z1")).toEqual({
      name: "walk",
      speed: 2,
      loop: true,
    });
    await h.host.use("x", "");
    expect(h.host.animationFor("z1")).toEqual({
      name: "walk",
      speed: 2,
      loop: true,
    });
    await h.host.use("x", "");
    expect(h.host.animationFor("z1")).toBeNull();
  });
});

describe("script player model", () => {
  it("reports a worn model and a clear", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var first = true;
        onTick(function () {
          if (!first) { return; }
          first = false;
          dispatch("player-model", { player: "", model: "zombie.zip" });
          dispatch("player-model", { player: "", model: "" });
        });
      `,
    );
    expect(h.playerModels).toEqual([
      { player: "", model: "zombie.zip", modelUri: "" },
      { player: "", model: "", modelUri: "" },
    ]);
  });
});

describe("script UI", () => {
  it("builds a panel, reports a button press, and removes an item", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var started = false;
        onTick(function (_clock, events) {
          if (!started) {
            started = true;
            dispatch("ui-panel", {
              player: "", id: "shop", title: "Shop", anchor: "bottom-right",
            });
            dispatch("ui-label", {
              player: "", panel: "shop", id: "hint", text: "Buy a cola",
            });
            dispatch("ui-button", {
              player: "", panel: "shop", id: "buy", label: "Buy", value: "cola",
            });
            dispatch("ui-image", {
              player: "", panel: "shop", id: "icon", sprite: "cola",
            });
            return;
          }
          for (var i = 0; i < events.length; i++) {
            var event = events[i];
            if (event.kind === "ui-clicked") {
              dispatch("toast", { player: "", text: event.value });
              dispatch("ui-remove", { player: "", panel: "shop", item: "hint" });
            }
          }
        });
      `,
    );
    expect(h.host.uiFor("")).toEqual([
      {
        id: "shop",
        title: "Shop",
        anchor: "bottom-right",
        items: [
          { kind: "label", id: "hint", text: "Buy a cola", color: [1, 1, 1] },
          { kind: "button", id: "buy", label: "Buy", value: "cola" },
          { kind: "image", id: "icon", sprite: "cola" },
        ],
      },
    ]);

    // A press on something that is not a button is ignored.
    await h.host.clickUi("", "shop", "hint");
    expect(h.events.some((event) => event.kind === "ui-clicked")).toBe(false);

    await h.host.clickUi("", "shop", "buy");
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "ui-clicked",
        panel: "shop",
        button: "buy",
        value: "cola",
      }),
    );
    expect(h.toasts).toEqual(["cola"]);
    expect(h.host.uiFor("")[0].items).toEqual([
      { kind: "button", id: "buy", label: "Buy", value: "cola" },
      { kind: "image", id: "icon", sprite: "cola" },
    ]);
  });
});

describe("script data and teleport", () => {
  it("saves player and global data, awards a badge, and reports a teleport", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getData, getDataLeaderboard } from "voxelscape";
        var started = false;
        onTick(function () {
          if (!started) {
            started = true;
            dispatch("data-set", { scope: "player", key: "score", value: 3 });
            dispatch("data-set", { scope: "global", key: "day", value: 2 });
            dispatch("data-set", {
              scope: "player", player: "did:b", key: "score", value: 5,
            });
            dispatch("badge-award", { badge: "first" });
            dispatch("teleport", { player: "", place: "at://did:plc:x/app.bms/a" });
            return;
          }
          dispatch("toast", { player: "", text: JSON.stringify({
            score: getData("player", "", "score"),
            day: getData("global", "", "day"),
            missing: getData("player", "", "nope"),
            board: getDataLeaderboard("score", 5),
          }) });
        });
      `,
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "data-changed",
        scope: "player",
        player: "did:local",
        key: "score",
        deleted: false,
        value: 3,
      }),
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "data-changed",
        scope: "global",
        player: "",
        key: "day",
        value: 2,
      }),
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "badge-earned",
        player: "did:local",
        badge: "first",
      }),
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "player-teleported",
        place: "at://did:plc:x/app.bms/a",
      }),
    );
    expect(h.teleports).toEqual([
      { player: "did:local", place: "at://did:plc:x/app.bms/a" },
    ]);
    expect(lastProbe(h.toasts)).toEqual({
      score: 3,
      day: 2,
      missing: null,
      board: [
        { player: "did:b", value: 5 },
        { player: "did:local", value: 3 },
      ],
    });

    await h.host.applyRemoteEvents([
      {
        id: "remote:1",
        at: 1,
        producer: "did:c",
        kind: "data-changed",
        scope: "player",
        player: "did:c",
        key: "score",
        deleted: false,
        value: 9,
      },
    ]);
    expect(lastProbe(h.toasts).board).toEqual([
      { player: "did:c", value: 9 },
      { player: "did:b", value: 5 },
      { player: "did:local", value: 3 },
    ]);
  });

  it("answers a data-get with a data-loaded fact, refreshing a missing one", async () => {
    const h = makeHost([], async (_scope, _player, key) =>
      key === "remote" ? 42 : null,
    );
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var first = true;
        onTick(function () {
          if (!first) { return; }
          first = false;
          dispatch("data-set", { scope: "player", key: "local", value: 5 });
          dispatch("data-get", { scope: "player", key: "local", requestId: "a" });
          dispatch("data-get", { scope: "global", key: "remote", requestId: "b" });
          dispatch("data-get", { scope: "global", key: "missing", requestId: "c" });
        });
      `,
    );
    // A refresh is asynchronous, so its fact lands a microtask later.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "data-loaded",
        requestId: "a",
        found: true,
        value: 5,
      }),
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "data-loaded",
        requestId: "b",
        found: true,
        value: 42,
      }),
    );
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "data-loaded",
        requestId: "c",
        found: false,
      }),
    );
  });

  it("carries saved keys into the account scope on teleport", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch, getData } from "voxelscape";
        var step = 0;
        onTick(function () {
          step++;
          if (step === 1) {
            dispatch("data-set", { scope: "player", key: "pet", value: "cat" });
            dispatch("data-set", { scope: "player", key: "coin", value: 9 });
            dispatch("teleport", {
              player: "", place: "demo:home", carry: ["pet", "missing"],
            });
            return;
          }
          dispatch("toast", { player: "", text: JSON.stringify({
            pet: getData("account", "", "pet"),
            coin: getData("account", "", "coin"),
          }) });
        });
      `,
    );
    expect(h.teleports).toEqual([{ player: "did:local", place: "demo:home" }]);
    expect(h.events).toContainEqual(
      expect.objectContaining({
        kind: "player-teleported",
        place: "demo:home",
      }),
    );
    expect(lastProbe(h.toasts)).toEqual({ pet: "cat", coin: null });
  });
});

describe("script entity look and beams", () => {
  it("tints a figure, keeps it through a move, and draws a line that follows", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var step = 0;
        onTick(function () {
          step++;
          if (step === 1) {
            dispatch("npc", { id: "a", x: 3, z: 4, y: 10 });
            dispatch("npc", { id: "b", x: 6, z: 8, y: 10 });
            dispatch("entity-look", { id: "a", color: [1, 0, 0], alpha: 0.5 });
            dispatch("beam", {
              id: "line", fromEntity: "a", toEntity: "b",
              color: [0, 1, 0], width: 0.2,
            });
          } else if (step === 2) {
            dispatch("npc", { id: "a", x: 3, z: 4, y: 10 });
            dispatch("npc", { id: "b", x: 9, z: 9, y: 10 });
          } else if (step === 3) {
            dispatch("entity-look-clear", { id: "a" });
            dispatch("beam-remove", { id: "line" });
          }
        });
      `,
    );
    expect(h.host.lookFor("a")).toEqual({ color: [1, 0, 0], alpha: 0.5 });
    expect(h.host.lookFor("b")).toBeNull();
    expect(h.host.beamList).toEqual([
      {
        id: "line",
        ax: 3,
        ay: 11,
        az: 4,
        bx: 6,
        by: 11,
        bz: 8,
        color: [0, 1, 0],
        width: 0.2,
      },
    ]);

    await h.host.use("x", "");
    expect(h.host.lookFor("a")).toEqual({ color: [1, 0, 0], alpha: 0.5 });
    expect(h.host.beamList[0]).toMatchObject({ bx: 9, by: 11, bz: 9 });

    await h.host.use("x", "");
    expect(h.host.lookFor("a")).toBeNull();
    expect(h.host.beamList).toEqual([]);
  });
});

describe("script particles and decals", () => {
  it("runs an emitter and lays a mark, following a figure and clearing", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var step = 0;
        onTick(function () {
          step++;
          if (step === 1) {
            dispatch("npc", { id: "z1", x: 3, z: 4, y: 10 });
            dispatch("particle", {
              id: "torch", entityId: "z1", kind: "flame", loop: true,
            });
            dispatch("decal", { id: "mark", kind: "ring", x: 1, z: 2, size: 3 });
          } else if (step === 2) {
            dispatch("npc", { id: "z1", x: 8, z: 9, y: 10 });
          } else if (step === 3) {
            dispatch("particle-remove", { id: "torch" });
            dispatch("decal-remove", { id: "mark" });
          }
        });
      `,
    );
    expect(h.host.particleList).toEqual([
      {
        id: "torch",
        x: 3,
        y: 10.5,
        z: 4,
        additive: true,
        upward: true,
        color: [1, 0.5, 0.12],
        size: 0.3,
        spread: 2,
        lifeMs: 900,
        loop: true,
        at: 0,
      },
    ]);
    expect(h.host.decalList).toEqual([
      {
        id: "mark",
        kind: "ring",
        x: 1,
        y: 10.03,
        z: 2,
        color: [1, 1, 1],
        size: 3,
        yaw: 0,
      },
    ]);

    clockMs = 1_000;
    await h.host.use("x", "");
    expect(h.host.particleList[0]).toMatchObject({ x: 8, y: 10.5, z: 9 });

    await h.host.use("x", "");
    expect(h.host.particleList).toEqual([]);
    expect(h.host.decalList).toEqual([]);
  });
});

describe("script lights and billboards", () => {
  it("places a light and follows a figure with a hung light and label", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var step = 0;
        onTick(function () {
          step++;
          if (step === 1) {
            dispatch("npc", { id: "z1", x: 3, z: 4, y: 10 });
            dispatch("light", {
              id: "lamp", x: 1, z: 2, color: [1, 0.5, 0], range: 20, intensity: 3,
            });
            dispatch("light", { id: "torch", entityId: "z1" });
            dispatch("billboard", { id: "tag", text: "Boss", entityId: "z1" });
          } else if (step === 2) {
            dispatch("npc", { id: "z1", x: 8, z: 9, y: 10 });
          } else if (step === 3) {
            dispatch("light-remove", { id: "torch" });
            dispatch("billboard-remove", { id: "tag" });
          }
        });
      `,
    );
    expect(h.host.lightList).toContainEqual({
      id: "lamp",
      x: 1,
      y: 11,
      z: 2,
      color: [1, 0.5, 0],
      range: 20,
      intensity: 3,
    });
    expect(h.host.lightList).toContainEqual({
      id: "torch",
      x: 3,
      y: 11.2,
      z: 4,
      color: [1, 0.9, 0.75],
      range: 12,
      intensity: 1,
    });
    expect(h.host.billboardList).toEqual([
      {
        id: "tag",
        x: 3,
        y: 12.2,
        z: 4,
        text: "Boss",
        color: [1, 1, 1],
        scale: 0.5,
      },
    ]);

    await h.host.use("x", "");
    expect(
      h.host.lightList.find((light) => light.id === "torch"),
    ).toMatchObject({ x: 8, y: 11.2, z: 9 });
    expect(h.host.billboardList[0]).toMatchObject({ x: 8, y: 12.2, z: 9 });

    await h.host.use("x", "");
    expect(h.host.lightList.some((light) => light.id === "torch")).toBe(false);
    expect(h.host.billboardList).toEqual([]);
  });
});

describe("script sound depth", () => {
  it("plays a sound with its volume, pitch, and loop, then stops it", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        var first = true;
        onTick(function () {
          if (!first) { return; }
          first = false;
          dispatch("sound", {
            player: "", name: "zombie-growl", id: "growl",
            volume: 0.5, pitch: 2, loop: true,
          });
          dispatch("sound-stop", { player: "", id: "growl" });
        });
      `,
    );
    expect(h.sounds).toEqual([
      {
        player: "",
        name: "zombie-growl",
        id: "growl",
        volume: 0.5,
        pitch: 2,
        loop: true,
      },
    ]);
    expect(h.soundStops).toEqual([{ player: "", id: "growl" }]);
  });
});

describe("script host effects", () => {
  it("marks a prop as a seat", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        onTick(function () {
          dispatch("prop", {
            id: "lift", model: "lift.zip", x: 0, z: 0, solid: true, seat: true,
          });
        });
      `,
    );
    expect(h.host.prop("lift")?.seat).toBe(true);
  });

  it("reports a block fill and clear to the world", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        onTick(function () {
          dispatch("block-fill", { min: [0, 0, 0], max: [1, 1, 1], id: 25 });
          dispatch("block-clear", { min: [2, 2, 2], max: [3, 3, 3] });
        });
      `,
    );
    expect(h.blockEdits).toEqual([
      { min: [0, 0, 0], max: [1, 1, 1], id: 25 },
      { min: [2, 2, 2], max: [3, 3, 3], id: 0 },
    ]);
  });

  it("reports a heal and a new maximum", async () => {
    const h = makeHost();
    await load(
      h.host,
      `
        import { onTick, dispatch } from "voxelscape";
        onTick(function () {
          dispatch("player-heal", { player: "", amount: 2 });
          dispatch("player-max-health", { player: "", maxHealth: 20 });
        });
      `,
    );
    expect(h.heals).toEqual([{ player: "", amount: 2 }]);
    expect(h.maxHealth).toEqual([{ player: "", maxHealth: 20 }]);
  });
});
