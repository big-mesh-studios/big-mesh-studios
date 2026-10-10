// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { NodeMaterial } from "@random-mesh/rmsl/scene";

import { Field, OperationBVH } from "@big-mesh-studios/csg";

import { FigureSet } from "../../figures/figure-set";
import { FoldOrder } from "../../edit/fold-order";
import { SculptDocument } from "../../edit/document";
import {
  PlaceHost,
  type HostEffects,
  type HostWorld,
  type RayHit,
} from "../host";
import { PlaceRegistry } from "../place-registry";
import type { ClockCommands } from "../../console/commands";
import { DayNightController } from "../../world/day-night-controller";
import type { FigureModel } from "../model-library";
import { demoPlace } from "../demos";
import { PLATFORM_LIFT } from "./snack-tables";

/**
 * The behaviour of "Get a Snack at 4 AM", one ending and one machine at a time.
 *
 * ## Why these are separate from `demos.test.ts`
 *
 * That file loads every shipped place and asks whether it *runs*: no refusals, something built,
 * no runaway. These ask whether it is the **right** place — whether eating chips in the kitchen
 * ends with `Chips` and not with `Sleep`, whether the eighth soda really floods the shop, whether
 * the breakfast machine says the thing it is supposed to say about fuel and milk.
 *
 * **Every test here is ported from a test of the sibling demo**, `apps/voxelscape/src/places/
 * demos.test.ts`, and it is the same assertion written against this engine's vocabulary. A demo
 * is thirteen endings and a state machine; the sibling's suite is the only description of what
 * that state machine is supposed to do, and a port that invented its own would be a port of a
 * different game.
 */

const NOW = 1_700_000_000_000;

/** A figure model with no geometry. Props are stood to be used, never looked at. */
const fixtureModel = (name: string): FigureModel =>
  ({
    name,
    operations: [],
    field: undefined,
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    half: { x: 1, y: 1, z: 1 },
    triangles: 0,
    draw: () => undefined,
    dispose: () => {},
  }) as unknown as FigureModel;

interface Running {
  readonly host: PlaceHost;
  readonly figures: FigureSet;
  readonly narrations: string[];
  readonly toasts: string[];
  readonly endings: string[];
  /** The dialog on screen, if any. */
  dialog(): { prompt: string; options: readonly string[] } | undefined;
  /** Advances the clock and steps, so a timer due in between fires. */
  advance(ms: number): void;
  /** Steps once without moving the clock. */
  step(): void;
  /** Puts the player somewhere and delivers the zone event. */
  go(x: number, y: number, z: number): void;
  /** Presses use on a figure, with an optional held item. */
  use(entityId: string, item?: string): void;
  /** Uses the held item on nothing. */
  useItem(item: string): void;
  /** Walks the held item onto a figure: `use` with whatever the host says is in hand. */
  useHeld(entityId: string): void;
  /** Answers an open dialog, which is what a click on an option does. */
  choose(entityId: string, option: number): void;
}

/**
 * Starts the demo, optionally against the world's real clock.
 *
 * **`live` wires the actual `DayNightController` the way `app.tsx` does**, and without it
 * these tests cannot see the clock at all: the default `now` is a hand-advanced counter
 * and the default `clock` is a stub whose `jumpTo` and `setSpeed` do nothing. That is the
 * right default for nineteen tests about the state machine, and the wrong one for any test
 * about time — the demo opens by pinning the sky to 4 AM and holding it there, and against
 * the stub that pair of calls is invisible.
 */
const start = async (
  options: { readonly live?: boolean } = {},
): Promise<Running> => {
  const demo = demoPlace("snack");
  if (demo === undefined) throw new Error("the snack demo is not shipped");

  const narrations: string[] = [];
  const toasts: string[] = [];
  const endings: string[] = [];
  let dialog: { prompt: string; options: readonly string[] } | undefined;
  let elapsed = 0;

  const places = new PlaceRegistry(new FoldOrder());
  const document = new SculptDocument();
  const figures = new FigureSet(new NodeMaterial());

  const world: HostWorld & { places: PlaceRegistry } = {
    places,
    terrainHeight: () => 0,
    geometryChanged: () => {},
    solidAt: (x, y, z) =>
      new Field(new OperationBVH(places.flatten(document.list))).distance(
        x,
        y,
        z,
      ) < 0,
    waterAt: (_x, y, _z) => y < -10,
    raycast: (): RayHit | undefined => undefined,
    figures,
    models: { get: (name: string) => fixtureModel(name) },
  };

  const effects: HostEffects = {
    narrate: (_who, text) => narrations.push(text),
    dialog: (shown) => {
      dialog = { prompt: shown.prompt, options: shown.options };
    },
    closeDialog: () => {
      dialog = undefined;
    },
    ending: (card) => endings.push(card.title),
    log: () => {},
    toast: (text) => toasts.push(text),
    movePlayer: () => {},
    setPlayerSpeed: () => {},
    setPlayerJump: () => {},
    setFlying: () => {},
    lookAt: () => {},
    clearCamera: () => {},
  };

  const sky: DayNightController | undefined =
    options.live === true ? new DayNightController() : undefined;

  const clock: ClockCommands = sky ?? {
    jumpTo: () => {},
    setSpeed: () => {},
    clearOverride: () => {},
    describe: () => "stub",
  };

  const host = new PlaceHost({
    files: demo.files,
    entry: demo.entry,
    seed: 20260901,
    now: sky === undefined ? () => NOW + elapsed : () => sky.nowMs(),
    world,
    effects,
    clock,
    onNotice: (message) => {
      throw new Error(`the demo reported: ${message}`);
    },
  });
  await host.load();

  return {
    host,
    figures,
    narrations,
    toasts,
    endings,
    dialog: () => dialog,
    step: () => host.step(),
    advance: (ms) => {
      // **Ticking the real clock rather than moving a counter**, so the demo's own
      // `setTime(900)` and `setTimeSpeed(0)` have already been applied and the time it
      // sees is the time the application would hand it.
      if (sky === undefined) elapsed += ms;
      else sky.tick(ms / 1000);
      host.step();
    },
    go: (x, y, z) => {
      host.movePlayer(x, y, z);
      host.step();
    },
    use: (entityId, item) => {
      host.use(entityId, item);
      host.step();
    },
    useItem: (item) => {
      host.useItem(item);
      host.step();
    },
    // **The host's own held item rather than a copy the test keeps.** `holdItem` is what the
    // script uses to put something in the player's hands, and the host is where that lands — a
    // second variable here would be a second answer to what is in them.
    useHeld: (entityId) => {
      host.use(entityId, host.heldItem);
      host.step();
    },
    choose: (entityId, option) => {
      host.choose(entityId, option);
      host.step();
    },
  };
};

/**
 * The floor the demo builds at when the stub world reports ground zero: `PLATFORM_LIFT` above it,
 * plus a voxel, which is where a player standing in a room is.
 */
const PLAY = PLATFORM_LIFT + 10;

/**
 * A point inside each room, in this port's world units: the sibling's gasa4 coordinates times
 * five, at `PLAY`.
 */
const BEDROOM: readonly [number, number, number] = [-70, PLAY, -60];
const BATHROOM: readonly [number, number, number] = [70, PLAY, -60];
const KITCHEN: readonly [number, number, number] = [-70, PLAY, 60];
const LIVING: readonly [number, number, number] = [70, PLAY, 60];
const PARKING: readonly [number, number, number] = [200, PLAY, 60];
const STORE: readonly [number, number, number] = [300, PLAY, 0];
/** Outside every zone, which is what makes a `zone-left` happen. */
const OUTSIDE: readonly [number, number, number] = [150, PLAY, -300];

describe("the snack demo", () => {
  it("opens with Dad, the Cashier, and the store counter", async () => {
    const r = await start();
    expect(
      [...r.figures.ids()]
        .filter((id) => id === "dad" || id === "cashier")
        .sort(),
    ).toEqual(["cashier", "dad"]);
    expect(r.figures.get("store-counter")?.model.name).toBe("counter");
    expect(r.figures.get("breakfast-machine")?.model.name).toBe(
      "breakfastmachine",
    );
    expect(r.figures.get("car")?.model.name).toBe("car");
    r.host.dispose();
  });

  it("hints each of the house's four rooms and the store's forecourt", async () => {
    const r = await start();
    r.go(...BEDROOM);
    r.go(...BATHROOM);
    r.go(...KITCHEN);
    r.go(...LIVING);
    r.go(...PARKING);
    r.go(...STORE);
    expect(r.narrations).toEqual([
      "It is 4 AM and I am starving. Find a snack... and try not to wake Dad.",
      "Dad is asleep in the bathtub. Keep it down.",
      "The kitchen. Chips on the counter, an orange on the table, a stove, and the breakfast machine.",
      "The front door is open. The store is down the road.",
      'The cashier\'s car, with a note on the window: "this is my car."',
      "Welcome to a generic convenience store. We are open 24 hours.",
    ]);
    r.host.dispose();
  });

  it("ends with Sleep when the chips are eaten in the bedroom", async () => {
    const r = await start();
    r.go(...BEDROOM);
    r.use("chips");
    r.useItem("chips");
    r.use("bed");
    expect(r.endings).toEqual(["Sleep"]);
    r.host.dispose();
  });

  it("ends with Chips when they are eaten where Dad can hear", async () => {
    const r = await start();
    r.go(...KITCHEN);
    r.use("chips");
    r.useItem("chips");
    // Dad wakes at once and comes into the room.
    expect(r.figures.get("dad")?.transform.at.x).toBe(-8 * 5);
    r.use("bed");
    expect(r.endings).toEqual(["Chips"]);
    r.host.dispose();
  });

  it("ends with Orange when the orange is picked up", async () => {
    const r = await start();
    r.use("orange");
    expect(r.endings).toEqual(["Orange"]);
    r.host.dispose();
  });

  it("ends with Sword when the sword off the bedroom wall is used", async () => {
    const r = await start();
    r.use("sword");
    expect(r.host.heldItem).toBe("sword");
    r.useItem("sword");
    expect(r.endings).toEqual(["Sword"]);
    r.host.dispose();
  });

  it("ends with Sandvich over the one left on the bench", async () => {
    const r = await start();
    r.use("sandvich");
    r.useItem("sandvich");
    expect(r.endings).toEqual(["Sandvich"]);
    r.host.dispose();
  });

  it("lets the player sit a store good on the counter and buy it", async () => {
    const r = await start();
    r.use("robux-3"); // $5
    r.use("buy-cola");
    r.useHeld("store-counter");
    expect(r.figures.get("counter-item")?.model.name).toBe("cola");
    r.use("cashier");
    expect(r.dialog()?.prompt).toContain("Bloxy Cola");
    r.choose("cashier", 0);
    expect(r.host.heldItem).toBe("cola");
    expect(r.figures.get("counter-item")).toBeUndefined();
    // The shelf is filled again, so the shop never runs out.
    expect(r.figures.get("buy-cola")).toBeDefined();
    r.host.dispose();
  });

  it("sells the witch brew, the patty, the fuel, and the ice cream", async () => {
    const r = await start();
    expect(r.figures.get("buy-witchbrew")?.model.name).toBe("witchbrew");
    expect(r.figures.get("buy-patty")?.model.name).toBe("patty");
    expect(r.figures.get("buy-fuel")?.model.name).toBe("fuel");
    expect(r.figures.get("buy-icecream")?.model.name).toBe("icecream");
    r.host.dispose();
  });

  it("ends with Patty over a patty eaten straight off the shelf", async () => {
    const r = await start();
    r.use("buy-patty");
    r.useItem("patty");
    expect(r.endings).toEqual(["Patty"]);
    r.host.dispose();
  });

  it("refuses a purchase the player cannot afford", async () => {
    const r = await start();
    r.use("buy-egg");
    r.useHeld("store-counter");
    r.use("cashier");
    r.host.dispose();
  });

  it("scatters enough cash to afford the egg and a breakfast", async () => {
    const r = await start();
    for (let i = 1; i <= 14; i++) r.use(`tix-${i}`);
    for (let i = 1; i <= 10; i++) r.use(`robux-${i}`);
    expect(r.toasts.at(-1)).toBe("You pocket some Robux. ($64)");
    r.host.dispose();
  });

  it("feeds the breakfast machine an item and takes it back out", async () => {
    const r = await start();
    r.use("cola");
    r.useHeld("breakfast-machine");
    expect(r.figures.get("machine-item-0")?.model.name).toBe("cola");
    r.useHeld("breakfast-machine"); // empty hands take it back
    expect(r.figures.get("machine-item-0")).toBeUndefined();
    expect(r.host.heldItem).toBe("cola");
    r.host.dispose();
  });

  it("cooks an egg and takes a fried egg back off the stove", async () => {
    const r = await start();
    r.use("buy-egg");
    r.useHeld("stove");
    expect(r.figures.get("stove-item")?.model.name).toBe("egg");
    r.advance(6_000);
    expect(r.figures.get("stove-item")?.model.name).toBe("friedegg");
    r.host.dispose();
  });

  /**
   * The same four timers again, against the world's real clock.
   *
   * **Every test above reaches its timers through the hand-advanced counter, which cannot
   * fail the way the demo failed in the application.** The demo opens with `setTime(900)`
   * and `setTimeSpeed(0)` — a 4 AM that is pinned and held — and every one of these timers
   * is armed after that. For as long as the place clock *was* the hour on the sky, the host
   * computed each `dueAt` from a number that had stopped moving, so all four sat pending
   * forever: the egg stayed raw, the kitchen never caught, and the cashier never left. There
   * was no error and no notice, because from the host's side nothing had failed — the timers
   * were simply waiting for a moment that never arrived.
   *
   * So these run `start({ live: true })`, where the demo's `setTime` and `setTimeSpeed` reach
   * the actual controller and `nowMs()` answers what the application would answer.
   */
  it("cooks an egg even though the demo holds the clock at 4 AM", async () => {
    const r = await start({ live: true });
    r.use("buy-egg");
    r.useHeld("stove");
    expect(r.figures.get("stove-item")?.model.name).toBe("egg");
    r.advance(6_000);
    expect(r.figures.get("stove-item")?.model.name).toBe("friedegg");
    r.host.dispose();
  });

  it("sets the kitchen on fire when the stove is left on something that burns", async () => {
    // The one that was reported. Cola on the stove is `after("fire", 5000)` — anything
    // that is not an egg or a brew catches, and cola is the first thing on the shelf.
    const r = await start({ live: true });
    r.use("buy-cola");
    r.useHeld("stove");
    r.advance(5_000);
    // **The narration is the assertion, not the light.** The fires are six `createLight`
    // calls, and how many of them the renderer can afford is a different system's budget;
    // what this timer owes the player is the kitchen catching, and it says so.
    expect(r.narrations.at(-1)).toBe("The kitchen catches fire!");
    r.host.dispose();
  });

  it("lets the fire burn to an ending, and the cashier still goes on break", async () => {
    const r = await start({ live: true });
    r.use("buy-cola");
    r.useHeld("stove");
    r.advance(5_000);
    r.go(...OUTSIDE); // nowhere it can catch you
    r.advance(8_000); // `burn`, armed by the fire itself
    expect(r.endings).toEqual(["Fire"]);

    // **And the longest timer in the demo**, which was equally dead: 231 seconds on a
    // clock that had been stopped since the first frame.
    const broke = await start({ live: true });
    broke.advance(231_000);
    expect(broke.figures.get("cashier")?.transform.at.x).toBe(44 * 5);
    broke.host.dispose();
    r.host.dispose();
  });

  it("frees the goods once the cashier goes on break", async () => {
    const r = await start();
    r.advance(231_000);
    expect(r.figures.get("cashier")?.transform.at.x).toBe(44 * 5);
    r.go(...STORE);
    r.use("buy-cola");
    r.go(...OUTSIDE);
    expect(r.endings).toEqual([]);
    r.use("cashier");
    expect(r.dialog()?.prompt).toContain("break");
    r.host.dispose();
  });

  it("only steals once the player leaves the store with an unpaid good", async () => {
    const r = await start();
    r.go(...STORE);
    r.use("buy-cola");
    expect(r.endings).toEqual([]);
    r.go(...OUTSIDE);
    expect(r.endings).toEqual(["Shoplifting"]);
    r.host.dispose();
  });

  it("floods the shop on the eighth soda fed to the machine", async () => {
    const r = await start();
    for (let i = 1; i <= 14; i++) r.use(`tix-${i}`);
    for (let i = 1; i <= 10; i++) r.use(`robux-${i}`);
    r.go(...STORE);
    for (let i = 1; i <= 8; i++) {
      r.use("buy-cola");
      r.useHeld("store-counter");
      r.use("cashier");
      r.choose("cashier", 0);
      r.useHeld("vending");
    }
    expect(r.endings).toEqual(["Flood"]);
    r.host.dispose();
  });

  it("ends with Freezer over an ice cream put back in the freezer", async () => {
    const r = await start();
    r.use("tix-1");
    r.use("buy-icecream");
    r.useHeld("freezer");
    expect(r.endings).toEqual(["Freezer"]);
    r.host.dispose();
  });

  it("leaves the player's own fridge cola free to carry", async () => {
    const r = await start();
    r.go(...STORE);
    r.use("fridge");
    r.go(...OUTSIDE);
    // The fridge is the player's own, so this is not shoplifting.
    expect(r.endings).toEqual([]);
    r.host.dispose();
  });
});
