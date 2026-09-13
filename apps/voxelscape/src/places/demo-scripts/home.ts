// The "Home" demo's place script: a guide standing near the spawn who says
// hello back once talked to. It is the world a first-time visitor lands in
// before they have heard of a demo, a place, or an account at all.
import * as engine from "engine";

const GUIDE = "guide";

let started = false;

engine.onTick(function tick(_clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    engine.dispatch("npc", { id: GUIDE, x: 8, z: 8, name: "Guide" });
    engine.log("your place started");
  }
  const events = JSON.parse(eventsJson) as Array<{
    kind: string;
    producer: string;
  }>;
  for (const event of events) {
    if (event.kind === "npc-talk") {
      engine.dispatch("toast", {
        player: event.producer,
        text: "Hello, traveller.",
      });
    }
  }
});
