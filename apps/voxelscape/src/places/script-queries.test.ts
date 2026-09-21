// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ScriptHost } from "./script-host";
import { MAIN_SCRIPT_FILE } from "./project";
import type { ScriptEvent } from "./events";
import type { LivePlayer } from "./sandbox";

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
  events: ScriptEvent[];
}

/** A host over flat ground at y 10, one local player, and every new callback recorded. */
const makeHost = (players: LivePlayer[] = []): Harness => {
  clockMs = 0;
  const toasts: string[] = [];
  const notices: string[] = [];
  const blockEdits: Harness["blockEdits"] = [];
  const heals: Harness["heals"] = [];
  const maxHealth: Harness["maxHealth"] = [];
  const pushes: Harness["pushes"] = [];
  const sounds: Harness["sounds"] = [];
  const soundStops: Harness["soundStops"] = [];
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
