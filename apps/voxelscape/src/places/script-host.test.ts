// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ScriptHost,
  type DialogState,
  type ScriptedExplosion,
  type ScriptedFire,
} from "./script-host";
import { SAMPLE_PLACE_SCRIPT } from "./sample";
import { MAIN_SCRIPT_FILE } from "./project";

let clockMs = 0;
const clock = () => clockMs;

const loadProject = (host: ScriptHost, source: string) =>
  host.loadProject({ [MAIN_SCRIPT_FILE]: source }, MAIN_SCRIPT_FILE);

const fresh = async (): Promise<{
  host: ScriptHost;
  toasts: Array<{ player: string; text: string }>;
  dialogs: Array<{ player: string; state: DialogState | null }>;
  notices: string[];
  endings: Array<{
    player: string;
    state: { title: string; text: string } | null;
  }>;
  restarts: string[];
  narrations: Array<{ player: string; line: { name: string; text: string } }>;
  places: Array<{
    player: string;
    at: { x: number; z: number; y?: number; yaw?: number };
  }>;
  faces: Array<{ player: string; at: { x: number; z: number } }>;
  fires: ScriptedFire[];
  explosions: ScriptedExplosion[];
  speeds: Array<{ player: string; multiplier: number }>;
  jumps: Array<{ player: string; multiplier: number }>;
  checkpoints: Array<{
    player: string;
    at: { x: number; z: number; y?: number; yaw?: number };
  }>;
  kills: Array<{ player: string; cause: string }>;
  respawns: string[];
  voids: number[];
  knownEndings: string[];
}> => {
  clockMs = 0;
  const toasts: Array<{ player: string; text: string }> = [];
  const dialogs: Array<{ player: string; state: DialogState | null }> = [];
  const notices: string[] = [];
  const endings: Array<{
    player: string;
    state: { title: string; text: string } | null;
  }> = [];
  const restarts: string[] = [];
  const narrations: Array<{
    player: string;
    line: { name: string; text: string };
  }> = [];
  const places: Array<{
    player: string;
    at: { x: number; z: number; y?: number; yaw?: number };
  }> = [];
  const faces: Array<{ player: string; at: { x: number; z: number } }> = [];
  const fires: ScriptedFire[] = [];
  const explosions: ScriptedExplosion[] = [];
  const speeds: Array<{ player: string; multiplier: number }> = [];
  const jumps: Array<{ player: string; multiplier: number }> = [];
  const checkpoints: Array<{
    player: string;
    at: { x: number; z: number; y?: number; yaw?: number };
  }> = [];
  const kills: Array<{ player: string; cause: string }> = [];
  const respawns: string[] = [];
  const voids: number[] = [];
  const knownEndings: string[] = [];
  const h = new ScriptHost({
    seed: 5,
    now: clock,
    heightAt: () => 10,
    onToast: (player, text) => toasts.push({ player, text }),
    onDialog: (player, state) => dialogs.push({ player, state }),
    onNotice: (message) => notices.push(message),
    onEnding: (player, state) => endings.push({ player, state }),
    onRestart: (player) => restarts.push(player),
    onNarrate: (player, line) => narrations.push({ player, line }),
    onPlayerPlace: (player, at) => places.push({ player, at }),
    onPlayerFace: (player, at) => faces.push({ player, at }),
    onPlayerSpeed: (player, multiplier) => speeds.push({ player, multiplier }),
    onPlayerJump: (player, multiplier) => jumps.push({ player, multiplier }),
    onCheckpoint: (player, at) => checkpoints.push({ player, at }),
    onKill: (player, cause) => kills.push({ player, cause }),
    onRespawn: (player) => respawns.push(player),
    onVoid: (y) => voids.push(y),
    onFire: (fire) => fires.push(fire),
    onExplosion: (explosion) => explosions.push(explosion),
    endings: () => knownEndings,
  });
  return {
    host: h,
    toasts,
    dialogs,
    notices,
    endings,
    restarts,
    narrations,
    places,
    faces,
    fires,
    explosions,
    speeds,
    jumps,
    checkpoints,
    kills,
    respawns,
    voids,
    knownEndings,
  };
};

describe("a script host", () => {
  it("runs the sample script and grounds its NPCs", async () => {
    const { host } = await fresh();
    await loadProject(host, SAMPLE_PLACE_SCRIPT);
    const npcs = host.npcList;
    expect(npcs.map((n) => n.id).sort()).toEqual(["rook", "sable"]);
    expect(host.npc("sable")).toMatchObject({
      name: "Sable",
      x: 40,
      z: 12,
      y: 10,
    });
    host.dispose();
  });

  it("places a prop and answers when the player uses it", async () => {
    const { host, toasts } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("prop", JSON.stringify({
            id: "fridge", model: "fridge.zip", x: 2, z: 3, name: "Fridge", height: 3,
          }));
        }
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "entity-used") {
            engine.dispatch("toast", JSON.stringify({
              player: "", text: "opened " + events[i].entityId + " with " + events[i].item,
            }));
          }
        }
      }
      `,
    );
    expect(host.prop("fridge")).toMatchObject({
      id: "fridge",
      model: "fridge.zip",
      name: "Fridge",
      x: 2,
      z: 3,
      y: 10,
      yaw: 0,
      height: 3,
    });
    await host.use("fridge", "", "cola");
    expect(toasts.map((t) => t.text)).toEqual(["opened fridge with cola"]);
    host.dispose();
  });

  it("lights a fire and tells the world where it burns", async () => {
    const { host, fires } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("fire", JSON.stringify({
            id: "fire-0", x: 10, z: 18, height: 3.5,
          }));
        }
      }
      `,
    );
    expect(host.fire("fire-0")).toMatchObject({
      id: "fire-0",
      x: 10,
      z: 18,
      y: 10,
      height: 3.5,
    });
    expect(fires).toHaveLength(1);
    host.dispose();
  });

  it("gives and holds a script item, and answers when it is used", async () => {
    const { host, toasts } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("item-define", JSON.stringify({
            id: "chips", name: "Chips", sprite: "apple", stackable: true,
          }));
          engine.dispatch("item-give", JSON.stringify({ player: "", item: "chips", count: 1 }));
          engine.dispatch("item-hold", JSON.stringify({ player: "", item: "chips" }));
        }
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "item-used") {
            engine.dispatch("item-take", JSON.stringify({ player: "", item: events[i].item, count: 1 }));
            engine.dispatch("toast", JSON.stringify({ player: "", text: "ate " + events[i].item }));
          }
        }
      }
      `,
    );
    expect(host.inventory.heldItem()).toMatchObject({
      id: "chips",
      name: "Chips",
    });
    await host.useItem("chips", "");
    expect(toasts.map((t) => t.text)).toEqual(["ate chips"]);
    expect(host.inventory.count("chips")).toBe(0);
    expect(host.inventory.heldId).toBeNull();
    host.dispose();
  });

  it("reports an ending and a restart a script asks for", async () => {
    const { host, endings } = await fresh();
    await loadProject(
      host,
      `
      export function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "item-used") {
            engine.dispatch("ending", JSON.stringify({
              player: "", title: "Chips", text: "You ate the chips.",
            }));
          }
        }
      }
      `,
    );
    await host.useItem("chips", "");
    expect(endings).toEqual([
      { player: "", state: { title: "Chips", text: "You ate the chips." } },
    ]);

    // A fresh script that restarts on a talk.
    const again = await fresh();
    await loadProject(
      again.host,
      `
      export function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "npc-talk") {
            engine.dispatch("restart", JSON.stringify({ player: "" }));
          }
        }
      }
      `,
    );
    await again.host.talk("sable", "");
    expect(again.restarts).toEqual([""]);
    host.dispose();
    again.host.dispose();
  });

  it("tells the script which zones the player moves through", async () => {
    const { host, toasts } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("zone", JSON.stringify({
            id: "kitchen", name: "Kitchen", min: [-5, 0, -5], max: [5, 5, 5],
          }));
        }
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          var e = events[i];
          if (e.kind === "zone-entered") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: "in " + e.zoneId }));
          } else if (e.kind === "zone-left") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: "out " + e.zoneId }));
          }
        }
      }
      `,
    );
    expect(toasts).toEqual([]);
    await host.movePlayer("", 0, 0, 0);
    expect(toasts.map((t) => t.text)).toEqual(["in kitchen"]);
    // Standing still in the same zone says nothing.
    await host.movePlayer("", 1, 0, 1);
    expect(toasts.map((t) => t.text)).toEqual(["in kitchen"]);
    await host.movePlayer("", 100, 0, 0);
    expect(toasts.map((t) => t.text)).toEqual(["in kitchen", "out kitchen"]);
    host.dispose();
  });

  it("holds the fields a script declares and the conveyor a prop carries", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("field", JSON.stringify({
            id: "fan", kind: "push",
            min: [-4, 0, -4], max: [4, 8, 4], vx: 12, vy: 6,
          }));
          engine.dispatch("field", JSON.stringify({
            id: "pit", kind: "quicksand",
            min: [0, 0, 0], max: [4, 4, 4], speedScale: 0.3, sink: 2,
          }));
          engine.dispatch("prop", JSON.stringify({
            id: "walkway", model: "walkway.zip", x: 0, z: 0,
            solid: true, conveyor: { vx: 5, vz: 0 },
          }));
        }
      }
      `,
    );
    expect(host.field("fan")).toMatchObject({
      id: "fan",
      kind: "push",
      min: [-4, 0, -4],
      max: [4, 8, 4],
      vx: 12,
      vy: 6,
      vz: 0,
    });
    expect(host.field("pit")).toMatchObject({
      id: "pit",
      kind: "quicksand",
      speedScale: 0.3,
      sink: 2,
    });
    expect(host.fieldList.map((f) => f.id).sort()).toEqual(["fan", "pit"]);
    expect(host.prop("walkway")).toMatchObject({
      id: "walkway",
      solid: true,
      conveyor: { vx: 5, vz: 0 },
    });
    host.dispose();
  });

  it("forgets a field the script removes", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      var retract = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("field", JSON.stringify({
            id: "fan", kind: "push",
            min: [-4, 0, -4], max: [4, 8, 4], vx: 12,
          }));
        }
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (!retract && events[i].kind === "player-touched") {
            retract = true;
            engine.dispatch("field-remove", JSON.stringify({ id: "fan" }));
          }
        }
      }
      `,
    );
    expect(host.field("fan")).not.toBeNull();
    await host.touched("", "anything");
    expect(host.field("fan")).toBeNull();
    expect(host.fieldList).toEqual([]);
    host.dispose();
  });

  it("shows a narration line with no figure speaking it", async () => {
    const { host, narrations } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("narrate", JSON.stringify({
            player: "", name: "You", text: "I am so hungry.",
          }));
        }
      }
      `,
    );
    expect(narrations).toEqual([
      { player: "", line: { name: "You", text: "I am so hungry." } },
    ]);
    host.dispose();
  });

  it("passes the held item to a prop the player uses", async () => {
    const { host, toasts } = await fresh();
    await loadProject(
      host,
      `
      export function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          var e = events[i];
          if (e.kind === "entity-used") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: e.entityId + " got " + e.item }));
          }
        }
      }
      `,
    );
    await host.use("vending", "", "cola");
    expect(toasts.map((t) => t.text)).toEqual(["vending got cola"]);
    await host.use("vending", "");
    expect(toasts.map((t) => t.text)).toEqual([
      "vending got cola",
      "vending got ",
    ]);
    host.dispose();
  });

  it("places an NPC and a prop at an explicit height over the ground", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("npc", JSON.stringify({ id: "dad", x: 0, z: 0, y: 3, name: "Dad" }));
          engine.dispatch("prop", JSON.stringify({ id: "bed", model: "bed.zip", x: 1, z: 1, y: 4, height: 1 }));
        }
      }
      `,
    );
    expect(host.npc("dad")).toMatchObject({ y: 3 });
    expect(host.prop("bed")).toMatchObject({ y: 4 });
    host.dispose();
  });

  it("turns an NPC to the heading the script gives it", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("npc", JSON.stringify({ id: "dad", x: 0, z: 0, yaw: 1.25 }));
        }
      }
      `,
    );
    expect(host.npc("dad")).toMatchObject({ yaw: 1.25 });
    host.dispose();
  });

  it("places and turns the player a script asks for", async () => {
    const { host, places, faces } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("player-place", JSON.stringify({ player: "", x: 4, z: 5, yaw: 1 }));
          engine.dispatch("player-face", JSON.stringify({ player: "", x: 4, z: 9 }));
        }
      }
      `,
    );
    expect(places).toEqual([{ player: "", at: { x: 4, z: 5, yaw: 1 } }]);
    expect(faces).toEqual([{ player: "", at: { x: 4, z: 9 } }]);
    host.dispose();
  });

  it("fires a timer once the shared clock reaches it, and only once", async () => {
    const { host, toasts } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick(clockMs, eventsJson) {
        if (!started) {
          started = true;
          engine.dispatch("timer", JSON.stringify({ id: "ding", afterMs: 1000 }));
        }
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "timer") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: "fired " + events[i].timerId }));
          }
        }
      }
      `,
    );
    expect(toasts).toEqual([]);
    clockMs = 500;
    await host.pump();
    expect(toasts).toEqual([]);
    clockMs = 1000;
    await host.pump();
    expect(toasts.map((t) => t.text)).toEqual(["fired ding"]);
    clockMs = 5000;
    await host.pump();
    expect(toasts.map((t) => t.text)).toEqual(["fired ding"]);
    host.dispose();
  });

  it("walks a shop dialog from greeting to a sale", async () => {
    const { host, toasts, dialogs } = await fresh();
    await loadProject(host, SAMPLE_PLACE_SCRIPT);

    await host.talk("sable", "");
    expect(host.dialogFor("")).toMatchObject({
      npcId: "sable",
      prompt: expect.stringContaining("Welcome"),
      options: ["Buy a potion.", "Goodbye."],
    });

    await host.choose("sable", 0, "");
    expect(host.dialogFor("")).toMatchObject({
      prompt: expect.stringContaining("potions are behind"),
      options: ["I'll take a potion.", "Never mind."],
    });

    await host.choose("sable", 0, "");
    expect(host.dialogFor("")).toBeNull();
    expect(toasts.map((t) => t.text)).toEqual([
      "Sold! A potion of courage, fresh from the cellar.",
    ]);
    expect(dialogs.at(-1)?.state).toBeNull();
    host.dispose();
  });

  it("ignores a choice that does not match the open dialog", async () => {
    const { host } = await fresh();
    await loadProject(host, SAMPLE_PLACE_SCRIPT);
    await host.talk("sable", "");
    await host.choose("rook", 0, ""); // talking to sable, choosing on rook
    expect(host.dialogFor("")).toMatchObject({ npcId: "sable" });
    host.dispose();
  });

  it("leaves a dialog when the player walks away", async () => {
    const { host, dialogs } = await fresh();
    await loadProject(host, SAMPLE_PLACE_SCRIPT);
    await host.talk("rook", "");
    expect(host.dialogFor("")).not.toBeNull();
    await host.leave("rook", "");
    expect(host.dialogFor("")).toBeNull();
    expect(dialogs.at(-1)?.state).toBeNull();
    host.dispose();
  });

  it("keeps two players' dialogs apart", async () => {
    const { host } = await fresh();
    await loadProject(host, SAMPLE_PLACE_SCRIPT);
    await host.talk("sable", "did:plc:alice");
    await host.talk("rook", "did:plc:bob");
    expect(host.dialogFor("did:plc:alice")).toMatchObject({ npcId: "sable" });
    expect(host.dialogFor("did:plc:bob")).toMatchObject({ npcId: "rook" });
    host.dispose();
  });

  it("ignores an effect that is not well-formed, and reports script errors", async () => {
    const { host, notices } = await fresh();
    await loadProject(
      host,
      `
      export function bmsTick() {
        engine.dispatch("npc", JSON.stringify({ id: "ghost" }));
        engine.dispatch("npc", "not json");
        engine.log("hi from the script");
      }
    `,
    );
    expect(host.npc("ghost")).toBeNull();
    expect(notices).toContain("hi from the script");
    host.dispose();
  });

  it("reports a step that throws", async () => {
    const { host, notices } = await fresh();
    await loadProject(host, "export function bmsTick() { missing(); }");
    await host.talk("sable", "");
    expect(host.lastError).toMatch(/ReferenceError/);
    expect(notices.join("\n")).toMatch(/ReferenceError/);
    host.dispose();
  });

  it("scales the player's speed and jump on request", async () => {
    const { host, speeds, jumps } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("player-speed", JSON.stringify({ player: "", multiplier: 2 }));
          engine.dispatch("player-jump", JSON.stringify({ player: "", multiplier: 1.5 }));
        }
      }
      `,
    );
    expect(speeds).toEqual([{ player: "", multiplier: 2 }]);
    expect(jumps).toEqual([{ player: "", multiplier: 1.5 }]);
    host.dispose();
  });

  it("sets off a blast and reports where it went off", async () => {
    const { host, explosions } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("explosion", JSON.stringify({ id: "boom", x: 10, z: 18, radius: 6 }));
        }
      }
      `,
    );
    expect(host.explosion("boom")).toMatchObject({
      id: "boom",
      x: 10,
      z: 18,
      y: 10,
      radius: 6,
    });
    expect(explosions).toHaveLength(1);
    host.dispose();
  });

  it("reads back the endings the place has already reached", async () => {
    const { host, knownEndings, toasts } = await fresh();
    knownEndings.push("Sleep", "Bullied");
    await loadProject(
      host,
      `
      var seen = JSON.parse(engine.endings());
      export function bmsTick() {
        engine.dispatch("toast", JSON.stringify({ player: "", text: seen.join(",") }));
      }
      `,
    );
    expect(toasts.at(-1)?.text).toBe("Sleep,Bullied");
    host.dispose();
  });

  it("sets a checkpoint, kills, respawns, and sets a kill plane on request", async () => {
    const { host, checkpoints, kills, respawns, voids } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("player-checkpoint", JSON.stringify({ player: "", x: 4, z: 8, y: 62, yaw: 1 }));
          engine.dispatch("player-kill", JSON.stringify({ player: "", cause: "spikes" }));
          engine.dispatch("player-respawn", JSON.stringify({ player: "" }));
          engine.dispatch("void", JSON.stringify({ y: 20 }));
        }
      }
      `,
    );
    expect(checkpoints).toEqual([
      { player: "", at: { x: 4, z: 8, y: 62, yaw: 1 } },
    ]);
    expect(kills).toEqual([{ player: "", cause: "spikes" }]);
    expect(respawns).toEqual([""]);
    expect(voids).toEqual([20]);
    expect(host.voidY).toBe(20);
    host.dispose();
  });

  it("remembers which props are hazards", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("prop", JSON.stringify({ id: "spikes", model: "spikes.zip", x: 1, z: 2, solid: true, hazard: true }));
          engine.dispatch("prop", JSON.stringify({ id: "plant", model: "plant.zip", x: 3, z: 4 }));
        }
      }
      `,
    );
    expect(host.prop("spikes")).toMatchObject({ solid: true, hazard: true });
    expect(host.prop("plant")).toMatchObject({ solid: false, hazard: false });
    host.dispose();
  });

  it("hands the script a touch and the death it causes as facts", async () => {
    const { host, toasts, kills } = await fresh();
    await loadProject(
      host,
      `
      export function bmsTick(clockMs, eventsJson) {
        var events = JSON.parse(eventsJson);
        for (var i = 0; i < events.length; i++) {
          if (events[i].kind === "player-touched") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: "touched " + events[i].entityId }));
            engine.dispatch("player-kill", JSON.stringify({ player: "", cause: events[i].entityId }));
          } else if (events[i].kind === "player-died") {
            engine.dispatch("toast", JSON.stringify({ player: "", text: "died " + events[i].cause }));
          }
        }
      }
      `,
    );
    await host.touched("", "spikes");
    expect(toasts.map((t) => t.text)).toEqual([
      "touched spikes",
      "died spikes",
    ]);
    expect(kills).toEqual([{ player: "", cause: "spikes" }]);
    host.dispose();
  });

  it("plays a cutscene, and keeps a separate control lock", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("cutscene", JSON.stringify({
            player: "",
            shots: [
              { at: [0, 10, 0], durationMs: 1000 },
              { at: [10, 10, 0], durationMs: 1000 },
            ],
          }));
          engine.dispatch("player-control", JSON.stringify({ player: "", locked: true }));
        }
      }
      `,
    );
    expect(host.cutsceneFor("")?.shots).toHaveLength(2);
    expect(host.controlsLocked("")).toBe(true);
    // Clearing the cutscene leaves the script's own lock in place.
    host.clearCutscene("");
    expect(host.cutsceneFor("")).toBeNull();
    expect(host.controlsLocked("")).toBe(true);
    host.dispose();
  });

  it("shows HUD readouts and removes the ones it is told to", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("hud", JSON.stringify({ player: "", id: "meter", kind: "bar", label: "Meter", value: 2, max: 5 }));
          engine.dispatch("hud", JSON.stringify({ player: "", id: "note", kind: "text", text: "hello" }));
          engine.dispatch("hud-remove", JSON.stringify({ player: "", id: "note" }));
        }
      }
      `,
    );
    expect(host.hudFor("")).toEqual([
      { id: "meter", kind: "bar", label: "Meter", value: 2, max: 5, text: "" },
    ]);
    host.dispose();
  });

  it("samples a moving prop's pose off the shared clock", async () => {
    const { host } = await fresh();
    await loadProject(
      host,
      `
      var started = false;
      export function bmsTick() {
        if (!started) {
          started = true;
          engine.dispatch("prop", JSON.stringify({
            id: "plank",
            model: "platform.zip",
            x: 0,
            z: 0,
            motion: { path: [[0, 0, 0], [0, 0, 10]], loop: "once", durationMs: 1000 },
          }));
        }
      }
      `,
    );
    clockMs = 0;
    expect(host.propPose("plank")?.dz).toBe(0);
    clockMs = 500;
    expect(host.propPose("plank")?.dz).toBeCloseTo(5);
    clockMs = 5_000;
    expect(host.propPose("plank")?.dz).toBeCloseTo(10);
    expect(host.propPose("nothing")).toBeNull();
    host.dispose();
  });
});
