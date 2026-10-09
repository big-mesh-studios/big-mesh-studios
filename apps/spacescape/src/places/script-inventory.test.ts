// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { PlaceHost } from "./host";
import { PlaceRegistry } from "./place-registry";
import { FoldOrder } from "../edit/fold-order";
import { MAX_ITEMS, MAX_ITEM_COUNT } from "./limits";
import { ScriptInventory } from "./script-inventory";

describe("ScriptInventory", () => {
  it("hands out nothing that was never declared", () => {
    // **The whole reason `define` exists.** In the shop this was built for, the difference
    // between "the player has a cola" and "the player has a cloa" is the entire puzzle, and a
    // typo that quietly created a junk item would stay invisible until the player could not buy
    // anything with it.
    const bag = new ScriptInventory();
    expect(bag.give("cola", 1)).toEqual({ why: "undeclared", item: "cola" });
    expect(bag.count("cola")).toBe(0);
  });

  it("declaring the same item twice is not a failure", () => {
    // **A place that declares from a loop reloading it.** The declaration says the item exists
    // and changes nothing about it, so saying it again has said the same thing again.
    const bag = new ScriptInventory();
    expect(bag.define("cola")).toBeUndefined();
    expect(bag.define("cola")).toBeUndefined();
    expect(bag.itemCount).toBe(1);
  });

  it("refuses a declaration past the limit, and names why", () => {
    const bag = new ScriptInventory();
    for (let i = 0; i < MAX_ITEMS; i++)
      expect(bag.define(`i${i}`)).toBeUndefined();
    expect(bag.define("one-too-many")).toEqual({ why: "too many items" });
  });

  it("refuses a count past the limit rather than clamping it", () => {
    // **A place multiplying its way to a million learns that it has.** Clamping would leave it
    // believing it had given what it asked to give.
    const bag = new ScriptInventory();
    bag.define("cola");
    expect(bag.give("cola", MAX_ITEM_COUNT)).toBeUndefined();
    expect(bag.give("cola", 1)).toEqual({
      why: "count too large",
      item: "cola",
    });
    expect(bag.count("cola")).toBe(MAX_ITEM_COUNT);
  });

  it("refuses a count that is not a whole number", () => {
    const bag = new ScriptInventory();
    bag.define("cola");
    for (const bad of [-1, 0.5, Number.NaN, Infinity]) {
      expect(bag.give("cola", bad), String(bad)).toEqual({
        why: "not a count",
        count: bad,
      });
    }
    // **Zero is a count**, because handing out nothing and taking nothing are both ordinary.
    expect(bag.give("cola", 0)).toBeUndefined();
  });

  it("takes what is there and never refuses", () => {
    // **Removing something the player does not have is an ordinary state, not a failure**, and
    // a script that treated it as one would crash on the ordinary path.
    const bag = new ScriptInventory();
    bag.define("milk");
    bag.give("milk", 2);

    expect(bag.take("milk", 1)).toBe(1);
    expect(bag.count("milk")).toBe(1);
    // **Asking for more than there is gives what there is**, rather than nothing or a throw.
    expect(bag.take("milk", 10)).toBe(1);
    expect(bag.count("milk")).toBe(0);
    // And a second ask finds nothing, without complaint.
    expect(bag.take("milk", 10)).toBe(0);
  });

  it("drops a held item whose count reaches zero", () => {
    // **The reason the held slot lives inside the inventory.** A hand holding something the
    // count says is gone is a hand the interaction routing reads as occupied, and the ordinary
    // path — the player pressed use and the thing ran out — is exactly when it would be tried.
    const bag = new ScriptInventory();
    bag.define("milk");
    bag.give("milk", 1);
    bag.hold("milk");
    expect(bag.heldItem).toBe("milk");

    bag.take("milk", 1);
    expect(bag.count("milk")).toBe(0);
    expect(bag.heldItem).toBeUndefined();
  });

  it("keeps the hands when taking leaves some behind", () => {
    const bag = new ScriptInventory();
    bag.define("milk");
    bag.give("milk", 3);
    bag.hold("milk");
    bag.take("milk", 1);
    expect(bag.heldItem).toBe("milk");
  });

  it("refuses to hold something the player is not carrying", () => {
    // **And that is the same rule from the other side**: the held slot is not free-floating, so
    // there is no way to reach a state the count contradicts.
    const bag = new ScriptInventory();
    bag.define("milk");
    expect(bag.hold("milk")).toEqual({ why: "undeclared", item: "milk" });
    expect(bag.heldItem).toBeUndefined();

    bag.give("milk", 1);
    expect(bag.hold("milk")).toBeUndefined();
    // **And the hands can always be emptied**, which is the ordinary path after a use.
    expect(bag.hold(undefined)).toBeUndefined();
    expect(bag.heldItem).toBeUndefined();
  });

  it("lists what is carried, sorted, with nothing at zero in it", () => {
    // **Sorted, so a readout is stable between frames** — a list that reorders itself as counts
    // change is a list that flickers.
    const bag = new ScriptInventory();
    bag.define("milk");
    bag.define("cola");
    bag.give("cola", 2);
    bag.give("milk", 1);
    bag.take("milk", 1);
    expect(bag.contents()).toEqual([{ item: "cola", count: 2 }]);
  });

  it("forgets the declarations as well as the counts", () => {
    // **Taken with the place, as the hands are.** A place that is gone cannot leave the player
    // carrying what it invented.
    const bag = new ScriptInventory();
    bag.define("milk");
    bag.give("milk", 2);
    bag.hold("milk");

    bag.clear();
    expect(bag.itemCount).toBe(0);
    expect(bag.carried).toBe(0);
    expect(bag.heldItem).toBeUndefined();
    expect(bag.declares("milk")).toBe(false);
  });
});

describe("a place's inventory, over the wire", () => {
  /** A host with no world at all, because nothing here draws. */
  const host = async (source: string): Promise<PlaceHost> => {
    const built = new PlaceHost({
      files: { "main.ts": source },
      entry: "main.ts",
      seed: 1,
      now: () => 1_700_000_000_000,
      world: {
        places: new PlaceRegistry(new FoldOrder()),
        geometryChanged: () => undefined,
        solidAt: () => false,
        waterAt: () => false,
        raycast: () => undefined,
      },
      effects: {
        narrate: () => {},
        dialog: () => {},
        closeDialog: () => {},
        ending: () => {},
        log: () => {},
        toast: () => {},
        movePlayer: () => {},
        setPlayerSpeed: () => {},
        setPlayerJump: () => {},
        setFlying: () => {},
        lookAt: () => {},
        clearCamera: () => {},
      },
      clock: {
        jumpTo: () => {},
        setSpeed: () => {},
        clearOverride: () => {},
        describe: () => "stub clock",
      },
      onNotice: () => {},
    });
    await built.load();
    return built;
  };

  it("hands out an item the place declared", async () => {
    const h = await host(`
      import { defineItem, giveItem, holdItem } from "voxelscape";
      defineItem("cola");
      giveItem("cola");
      holdItem("cola");
    `);
    expect(h.lastProblem).toBeUndefined();
    expect(h.heldItem).toBe("cola");
    h.dispose();
  });

  it("names the item a place misspelled, rather than just saying it is undeclared", async () => {
    // **Every refusal names the item**, because a refusal that said only "not declared" would
    // leave a place that declared sixty items guessing which of them it got wrong — which is
    // the whole cost the declaration was being paid to avoid.
    const h = await host(`
      import { defineItem, giveItem } from "voxelscape";
      defineItem("cola");
      defineItem("milk");
      giveItem("cloa");
    `);
    expect(h.lastProblem).toMatch(/"cloa" was never declared/);
    h.dispose();
  });

  it("takes without complaint, and takes it out of the hands", async () => {
    const h = await host(`
      import { defineItem, giveItem, holdItem, onTick, takeItem } from "voxelscape";
      defineItem("milk");
      giveItem("milk");
      holdItem("milk");
      onTick(() => { takeItem("milk"); });
    `);
    expect(h.heldItem).toBe("milk");

    h.step();
    // **No refusal**, because a player who has already drunk the milk has none and that is an
    // ordinary state.
    expect(h.lastProblem).toBeUndefined();
    expect(h.heldItem).toBeUndefined();
    h.dispose();
  });
});
