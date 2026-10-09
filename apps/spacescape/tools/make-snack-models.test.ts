import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MeshBasicMaterial } from "@random-mesh/rmsl/scene";
import { describe, expect, it } from "vitest";

import {
  FIGURE_MESH_BUDGET,
  FIGURE_VOXEL_SIZE,
  readModelFile,
} from "../src/places/model-library";
import { SNACK_MODELS } from "./snack-model-table";
import {
  LAYOUT_SCALE,
  extentOf,
  modelBytes,
  operationsFor,
  unitsPerVoxel,
  type VoxelShape,
} from "./make-snack-models";

/**
 * The model table, checked against itself and against the files it produced.
 *
 * **Both halves matter and they catch different things.** The table half is about arithmetic —
 * a model whose declared extents do not match its parts is scaled by the wrong number and comes
 * out the wrong size, which nothing else would notice. The files half is about the *pair*: a
 * model in the table with no file beside it, or a file beside it that no table claims, is a demo
 * that will load with one prop missing and one stray 500-byte download.
 */

describe("the snack model table", () => {
  it("gives every model a name this repository can name a file after", () => {
    for (const model of SNACK_MODELS) {
      expect(model.name, model.name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(model.name, model.name).not.toContain("/");
    }
  });

  it("names no model twice", () => {
    // **A duplicate would be written twice and read once**, so whichever came second would be the
    // one in the repository and the other would be lost — silently, because both are valid.
    const names = SNACK_MODELS.map((model) => model.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers every model the source demo attaches", () => {
    /**
     * The sibling demo's own list, transcribed.
     *
     * **And a transcription is a lie waiting to happen**, which is why it is one array in one
     * test rather than a comment somewhere. `apps/voxelscape/src/places/demo-scripts/
     * model-lists.ts` is `GASA4_MODELS`; if this list is ever edited to match the table instead
     * of the sibling, the check stops meaning anything, and the only defence is that the two
     * are visibly near-identical lists of forty strings in two files.
     */
    const SOURCE_DEMO_MODELS = [
      "bed",
      "bathtub",
      "sofa",
      "tv",
      "table",
      "counter",
      "stove",
      "fridge",
      "breakfastmachine",
      "freezer",
      "car",
      "toilet",
      "tree",
      "bench",
      "manhole",
      "trash",
      "register",
      "shelf",
      "vending",
      "chips",
      "orange",
      "colgate",
      "cola",
      "egg",
      "friedegg",
      "juice",
      "milk",
      "witchbrew",
      "hotbrew",
      "icecream",
      "candy",
      "fuel",
      "patty",
      "sandvich",
      "sword",
      "tix",
      "robux",
      "npc-sable",
      "npc-rook",
    ];
    expect(SNACK_MODELS.map((model) => model.name).sort()).toEqual(
      [...SOURCE_DEMO_MODELS].sort(),
    );
  });

  it("has parts in every model, and no model with nothing to draw", () => {
    for (const model of SNACK_MODELS) {
      expect(model.parts.length, model.name).toBeGreaterThan(0);
      expect(model.height, model.name).toBeGreaterThan(0);
    }
  });

  it("cuts a recess out of something already there", () => {
    /**
     * **Not "each subtract is last", which is what I wrote first and which is wrong.**
     *
     * The fold runs front to back, so a `Subtract` cuts everything added before it. A recess is
     * *meant* to cut something already there and to be filled afterwards — the bathtub's basin,
     * the vending machine's glass — so "must be last" would forbid the only arrangement that
     * works. What has to hold is the opposite: a subtraction before any solid would cut nothing,
     * and a model with no subtraction would be showing a recess the sibling expressed by not
     * drawing a cell.
     *
     * These four are the recesses the source bitmap had, so the count is a table check too.
     */
    const cuts = SNACK_MODELS.flatMap((model) =>
      model.parts
        .map((part, index) => ({ model: model.name, index, part }))
        .filter(({ part }) => part.combine === "Subtract"),
    );
    expect(cuts.map(({ model }) => model).sort()).toEqual([
      "bathtub",
      "breakfastmachine",
      "toilet",
      "vending",
    ]);
    for (const { model, index } of cuts) {
      expect(
        index,
        `${model}: a subtract first would cut nothing`,
      ).toBeGreaterThan(0);
    }
  });

  it("is a plausible shape for the thing it is", () => {
    /**
     * **The check that replaced the declared extents, and it is the one that matters now.**
     *
     * `size` is gone from the table: a model's extents are its parts' own, and the scale is
     * derived from the height those parts measure. So there is no longer anything to declare
     * that could disagree with them — and the check that used to catch it is gone with it.
     * This is what catches it now: a shelf written with a full extent where a half-extent
     * belonged comes out twice as deep as a shelf, and a stove whose body was a quarter of its
     * own height comes out a third of one. Neither is a number in the table, so the only thing
     * left to check is whether the result is shaped like the thing.
     *
     * The bounds are loose on purpose. They are there to catch a factor-of-two, not to argue
     * about whether a car is longer than it is tall.
     */
    for (const model of SNACK_MODELS) {
      const box = worldBoxOf(model.name);
      const tall = box.max.y - box.min.y;
      const wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      // **Wider than a fifth of its height and no wider than forty times it.** The top is
      // the car, the bench and the sword; the bottom is the vending machine and the freezer.
      expect(wide / tall, `${model.name} is too thin`).toBeGreaterThan(0.2);
      expect(wide / tall, `${model.name} is too long`).toBeLessThan(40);
    }

    // **And something in it thin enough to need the mesher's fix.**
    //
    // This used to assert the opposite — that *nothing* is thinner than the sample spacing —
    // because that was the only way a coin could be drawn at all. `samplesFor` now gives the
    // thinnest axis three samples whatever its length asks for, so the sword's blade is one
    // voxel of a fourteen again and the coins are discs.
    //
    // What is asserted now is that the table still *contains* something that needs the fix,
    // because a table of thick boxes would pass every other check in this file with the fix
    // reverted. This is the only test in the repository that would notice the revert.
    const thinnest = Math.min(
      ...SNACK_MODELS.flatMap((model) => {
        const box = worldBoxOf(model.name);
        return [
          box.max.x - box.min.x,
          box.max.y - box.min.y,
          box.max.z - box.min.z,
        ];
      }),
    );
    // **And the line is one world unit**, which is `FIGURE_VOXEL_SIZE` — the spacing a model
    // gets from its own length. Anything below it is a part the old grid would have missed
    // entirely. The sword's blade is 0.71 and the coins are 0.19.
    expect(
      thinnest,
      "nothing in the table is thinner than the mesher's own spacing",
    ).toBeLessThan(FIGURE_VOXEL_SIZE);
  });

  it("reaches the bottom of the model, because a figure's origin is its centre", () => {
    /**
     * **A part resting at `y = 0` is what makes the centring shift land the model on its own
     * base.** A model authored floating half a cell up would come out resting on nothing, and
     * since every fixture is placed at the floor, that is every fixture hovering.
     *
     * Checked as "some part touches the floor" rather than "every part does", because a table
     * top is a part that is nowhere near it.
     */
    for (const model of SNACK_MODELS) {
      const lowest = Math.min(
        ...model.parts.map((part) => part.at.y - extentOf(part.shape).y),
      );
      expect(lowest, model.name).toBeLessThanOrEqual(0.5);
    }
  });

  it("is the right size against a player", () => {
    /**
     * **The demo's own scale check, and the reason `height` is in the table at all.**
     *
     * `DEFAULT_PLAYER_CONFIG` has a `collisionRadius` of 3, so a player is six world units
     * across. A coin has to be small enough to read as a coin and a person tall enough to read
     * as a person, and both of those are claims about ratios no other test can make.
     *
     * **Measured off the written operations, not off the table.** The table's numbers are
     * voxels and this is world units, and dividing one by the other is how the first version of
     * this test came to conclude that a person was nearly five players wide.
     */
    const PLAYER_ACROSS = 6;
    const worldHeightOf = (name: string): number => {
      const box = worldBoxOf(name);
      return box.max.y - box.min.y;
    };
    const worldWidthOf = (name: string): number => {
      const box = worldBoxOf(name);
      return Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    };

    // A soda can is about a person's shoulder to the top of their head.
    expect(worldHeightOf("cola")).toBeGreaterThan(PLAYER_ACROSS * 0.4);
    expect(worldHeightOf("cola")).toBeLessThan(PLAYER_ACROSS);
    // The fridge is taller than the player, by a lot.
    expect(worldHeightOf("fridge")).toBeGreaterThan(PLAYER_ACROSS * 1.5);
    // And a person is a person: taller than wide by a factor a human has, and no wider than
    // the player is, or the two cannot pass each other in a doorway.
    for (const npc of ["npc-sable", "npc-rook"]) {
      const tall = worldHeightOf(npc);
      const wide = worldWidthOf(npc);
      expect(
        tall / wide,
        `${npc} is not taller than it is wide`,
      ).toBeGreaterThan(2);
      expect(tall / PLAYER_ACROSS, `${npc} is too short`).toBeGreaterThan(1.8);
      expect(wide, `${npc} is wider than the player`).toBeLessThan(
        PLAYER_ACROSS,
      );
    }
  });
});

describe("what the generator writes", () => {
  it("wrote a file for every model, and nothing else", () => {
    /**
     * **The pairing, which is the whole reason this file exists.**
     *
     * A model in the table with no file beside it is a demo that loads with one prop missing
     * and a name that resolves to nothing; a file beside it that no table claims is a stray
     * download nobody asked for. Neither is loud — the first draws an empty prop, the second is
     * never fetched — so the only thing that catches either is comparing the two sets.
     *
     * **And this caught one immediately.** `plate` was in the sibling's table and not in the
     * source demo's list, and dropping it from the table left its `.sdfmod` behind on disk. The
     * generator writes what it is told and never deletes, which is correct — a generator that
     * removed files it did not recognise would be a much worse thing to have.
     */
    const written = readdirSync(modelsDir)
      .filter((name) => name.endsWith(".sdfmod"))
      .map((name) => name.slice(0, -".sdfmod".length))
      .sort();
    expect(written).toEqual(SNACK_MODELS.map((model) => model.name).sort());
  });

  it("writes every model the same way twice", async () => {
    /**
     * **Byte for byte, and that is only true because the writer is deterministic.** A zip
     * carries timestamps, so bytes that are a function of their inputs today could be a function
     * of the clock tomorrow and every regeneration would be a diff.
     *
     * **Built twice in memory rather than written twice on disk.** A test that rewrites the
     * repository's models in order to compare them fails if it is interrupted halfway and is
     * not read-only in the meantime; this way the check is two calls and a comparison.
     */
    for (const model of SNACK_MODELS) {
      const first = await modelBytes(model);
      const second = await modelBytes(model);
      expect(
        second.bytes,
        `${model.name} did not come out the same twice`,
      ).toEqual(first.bytes);
      // **And it is the file on disk.** Otherwise this only proves the writer agrees with
      // itself, and a stale file in `public/` would sit there being what the demo fetches.
      //
      // **Read through a `Uint8Array`, because `readFileSync` hands back a `Buffer`.** Two
      // views of the same bytes are not `toEqual` to each other, so the first version of this
      // failed on every model with an array-type mismatch and no content mismatch at all —
      // which is the failure mode that looks like a corrupt generator.
      expect(
        new Uint8Array(readFileSync(join(modelsDir, `${model.name}.sdfmod`))),
        `${model.name} on disk is not what the table produces`,
      ).toEqual(first.bytes);
    }
  });

  it("reads every model back through the loader the world uses", async () => {
    /**
     * **The one that matters, and the only one that would have caught a format mistake.**
     *
     * Everything above checks the writer. This checks that `readModelFile` — the same function
     * `loadDemoModels` hands the bytes to, in the app, at run time — accepts what the writer
     * produced: the manifest opens, the ids match the operations, the box has a surface in it,
     * and the mesher returns geometry.
     *
     * A file the writer produces and the loader refuses would load as a `ModelProblem` naming
     * one prop per model, and the demo would come up empty with a list of forty sentences
     * nobody had asked for.
     */
    for (const model of SNACK_MODELS) {
      const bytes = await modelBytes(model);
      const read = await readModelFile(
        model.name,
        bytes.bytes,
        FIGURE_MESH_BUDGET,
        "marching-cubes",
      );

      expect(read.operations.length, model.name).toBe(model.parts.length);
      // **With triangles in it.** A model that reads and has no surface is a model the player
      // can see a pick ray pass straight through, which is the same as not being there.
      expect(read.triangles, `${model.name} has no surface`).toBeGreaterThan(0);
      expect(read.bounds.max.y, `${model.name} has no height`).toBeGreaterThan(
        0,
      );
      // **And centred, because that is the invariant the collision box assumes** — read back
      // off the model rather than recomputed from the table, so this is the loader's answer and
      // not the writer's.
      for (const axis of ["x", "y", "z"] as const) {
        expect(
          read.bounds.min[axis] + read.bounds.max[axis],
          `${model.name} ${axis} is not centred`,
        ).toBeCloseTo(0, 3);
      }
      // **And a drawable**, which is the whole of what a figure needs from a model.
      expect(read.draw(new MeshBasicMaterial()), model.name).toBeDefined();
      read.dispose();
    }
  }, 120_000);

  it("gives every model the same number of operations as parts", () => {
    // **Because the manifest's ids join the two by position.** A writer that dropped or
    // reordered one would produce a file the world application refuses with a sentence about
    // two counts disagreeing, which is at least loud — but only after the models are committed.
    for (const model of SNACK_MODELS) {
      expect(operationsFor(model), model.name).toHaveLength(model.parts.length);
    }
  });

  it("centres every model on its own origin", () => {
    /**
     * **The invariant `figureDistance` depends on and nothing else enforces.**
     *
     * The collision box is measured from the placement point with the bounds' half-extents and
     * no offset, while the geometry is drawn wherever the operations put it. The two agree only
     * if a model's box is centred, and the alternative to shifting here is every placement
     * having to know how tall the thing is.
     *
     * **Checked by comparing origins rather than by re-deriving the box**, so this cannot pass
     * by computing the same wrong thing twice: every operation's origin has to be the part's own
     * position minus the model's centre, times the scale.
     */
    for (const model of SNACK_MODELS) {
      const scale = unitsPerVoxel(model);
      const box = boxOf(model.parts);
      const centre = {
        x: (box.min.x + box.max.x) / 2,
        y: (box.min.y + box.max.y) / 2,
        z: (box.min.z + box.max.z) / 2,
      };
      const operations = operationsFor(model);
      for (const [index, operation] of operations.entries()) {
        const part = model.parts[index];
        for (const axis of ["x", "y", "z"] as const) {
          expect(
            operation.origin[axis],
            `${model.name}[${index}] ${axis}`,
          ).toBeCloseTo((part.at[axis] - centre[axis]) * scale, 6);
        }
      }
    }
  });

  it("scales by the demo's factor and nothing else", () => {
    /**
     * **The one place `LAYOUT_SCALE` is checked against something other than a comment in this
     * file.** It is duplicated in `docs/snack-port-plan.md` and it will move when the layout
     * moves.
     *
     * **And every model comes out at exactly the height the demo asked for**, which is the
     * property that removing `size` bought: the scale is derived from the parts' own height, so
     * a part that is a voxel too big makes the model very slightly narrower and not one unit
     * taller.
     */
    expect(LAYOUT_SCALE).toBe(5);
    for (const model of SNACK_MODELS) {
      const box = worldBoxOf(model.name);
      expect(
        box.max.y - box.min.y,
        `${model.name} is not the height it asked for`,
      ).toBeCloseTo(model.height * LAYOUT_SCALE, 6);
    }
  });

  it("names only materials the renderer has", () => {
    // **The name is resolved when the file is written**, so a typo is a `requireMaterialId`
    // throw at generation time rather than a model that validates and draws as plain. This
    // checks the table's half of that; the writer's half is the throw itself.
    for (const model of SNACK_MODELS) {
      for (const part of model.parts) {
        if (part.material === undefined) continue;
        expect(typeof part.material, `${model.name}: ${part.material}`).toBe(
          "string",
        );
      }
    }
  });
});

/** Where the generator wrote them, which is the same folder the demo fetches them from. */
const modelsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "models",
);

/** A model's box in voxels, which is what the table's own numbers are in. */
const boxOf = (
  parts: readonly {
    at: { x: number; y: number; z: number };
    shape: VoxelShape;
  }[],
) => {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const part of parts) {
    const half = extentOf(part.shape as VoxelShape);
    for (const axis of ["x", "y", "z"] as const) {
      min[axis] = Math.min(min[axis], part.at[axis] - half[axis]);
      max[axis] = Math.max(max[axis], part.at[axis] + half[axis]);
    }
  }
  return { min, max };
};

/**
 * A named model's box in **world** units, from the operations rather than the table.
 *
 * **The only way to measure a model in the units a player is measured in**, and the distinction
 * matters: the table is in voxels and this is in world units, and dividing by the wrong one
 * gives a plausible-looking wrong answer.
 */
const worldBoxOf = (name: string) => {
  const model = SNACK_MODELS.find((m) => m.name === name);
  if (model === undefined) throw new Error(`no model named ${name}`);
  const scale = unitsPerVoxel(model);
  const box = boxOf(model.parts);
  return {
    min: {
      x: (box.min.x - (box.min.x + box.max.x) / 2) * scale,
      y: (box.min.y - (box.min.y + box.max.y) / 2) * scale,
      z: (box.min.z - (box.min.z + box.max.z) / 2) * scale,
    },
    max: {
      x: (box.max.x - (box.min.x + box.max.x) / 2) * scale,
      y: (box.max.y - (box.min.y + box.max.y) / 2) * scale,
      z: (box.max.z - (box.min.z + box.max.z) / 2) * scale,
    },
  };
};
