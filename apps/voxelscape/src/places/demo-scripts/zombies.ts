import {
  createNpc,
  dispatch,
  log,
  now as clockNow,
  onTick,
  players as livePlayers,
} from "voxelscape";
import {
  TICK_MS,
  forget,
  hitZombie,
  isZombie,
  materialize,
  stepAll,
} from "./zombie";

const GUIDE = "guide";
const SWORD = "sword";

let started = false;

function armTick(): void {
  dispatch("timer", { id: "zombie-tick", afterMs: TICK_MS });
}

onTick((_clockMs, events) => {
  const now = clockNow();
  if (!started) {
    started = true;
    createNpc({ id: GUIDE, x: 8, z: 8, name: "Guide" });
    log("your place started");
    // The sword is given and equipped once, for good: this place has nothing
    // else to hold, and a bare-handed touch stays how every other entity is
    // greeted.
    dispatch("item-define", {
      id: SWORD,
      name: "Sword",
      sprite: "",
      stackable: false,
    });
    dispatch("item-give", { player: "", item: SWORD, count: 1 });
    dispatch("item-hold", { player: "", item: SWORD });
    armTick();
  }

  const players = livePlayers();

  let ticked = false;
  for (const e of events) {
    if (
      (e.kind === "npc-talk" && e.npcId === GUIDE) ||
      (e.kind === "entity-used" && e.entityId === GUIDE)
    ) {
      dispatch("toast", {
        player: e.producer,
        text: "Hello, traveller.",
      });
    } else if (e.kind === "entity-used" && e.entityId !== undefined) {
      // A bare touch only ever gets a rise out of it — killing one takes an
      // actual swing, over the sword's own reach and reported strike.
      if (isZombie(e.entityId)) {
        dispatch("toast", {
          player: e.producer,
          text: "The zombie snarls.",
        });
      }
    } else if (
      e.kind === "entity-hit" &&
      e.entityId !== undefined &&
      e.amount !== undefined
    ) {
      const outcome = hitZombie(e.entityId, e.amount, {
        x: e.attackerX,
        z: e.attackerZ,
      });
      if (outcome !== undefined) {
        dispatch("toast", {
          player: e.producer,
          text: outcome.fell ? "The zombie falls." : "The zombie reels.",
        });
      }
    } else if (e.kind === "timer" && e.timerId === "zombie-tick") {
      ticked = true;
    }
  }

  if (ticked) {
    materialize(players);
    forget(players);
    stepAll(players, now);
    armTick();
  }
});
