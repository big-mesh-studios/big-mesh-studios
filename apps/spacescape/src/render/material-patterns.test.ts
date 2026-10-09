import { describe, expect, it } from "vitest";

import {
  MATERIAL_COUNT,
  MATERIAL_NAMES,
  materialId,
  materialName,
} from "./material-names";
import { PATTERN_COUNT, patternsCoverEveryMaterial } from "./material-nodes";
import {
  BRICK,
  FADE_START,
  GROOVE_DARKEN,
  GROUT_DARKEN,
  MIN_DETAIL,
  MORTAR_DARKEN,
  PLANK,
  TILE,
  brickAt,
  detailAt,
  hash3,
  tileAt,
  timberAt,
} from "./material-patterns";

/**
 * **The reference half of the patterns.** `material-nodes.ts` is the same arithmetic as a node
 * graph and cannot be called from here, so these tests are what stop the two from drifting — and
 * a change made in one file and not the other is the only way they can.
 */
describe("a material's name and its id", () => {
  it("is its position in the list, so both directions are the same table", () => {
    expect(MATERIAL_NAMES[0]).toBe("plain");
    for (const [at, name] of MATERIAL_NAMES.entries()) {
      expect(materialId(name)).toBe(at);
      expect(materialName(at)).toBe(name);
    }
  });

  it("says no rather than guessing when there is no such material", () => {
    // **And specifically no `0`.** A miss that returned the first entry would paint every typo
    // as plain plaster, which is a bug nobody notices; a miss that returns nothing is refused by
    // the field table and names the material that was not found.
    expect(materialId("marble")).toBeUndefined();
    expect(materialId("")).toBeUndefined();
    expect(materialName(-1)).toBeUndefined();
    expect(materialName(MATERIAL_COUNT)).toBeUndefined();
  });

  it("has a pattern behind every one of them", () => {
    // **The check exists because the failure it catches is silent.** A name added to the list
    // without a case in `patternNode` validates, binds to a real id, draws as plain, and looks
    // exactly like a material nobody has used yet.
    expect(patternsCoverEveryMaterial()).toBe(true);
    expect(PATTERN_COUNT).toBe(MATERIAL_COUNT);
  });
});

/** The hash is the whole of the per-brick variation, so it has to be worth trusting. */
describe("the pattern hash", () => {
  it("gives a different answer to every neighbour and the same answer every time", () => {
    expect(hash3(3, 7, 2)).toBe(hash3(3, 7, 2));
    expect(hash3(3, 7, 2)).not.toBe(hash3(3, 7, 3));
    expect(hash3(3, 7, 2)).not.toBe(hash3(4, 7, 2));
    expect(hash3(3, 7, 2)).not.toBe(hash3(3, 8, 2));
  });

  it("stays in zero to one, which is the only range a multiplier is safe over", () => {
    for (let i = -40; i <= 40; i += 7) {
      for (let j = -40; j <= 40; j += 11) {
        const h = hash3(i, j, i * 3 + j);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it("spreads the values out instead of bunching them", () => {
    // **A mean and a spread, and both are checked.** The classic `fract(sin(x) * k)` hash fails
    // exactly here — it is in range and it is repeatable, and it piles values into bands — and
    // the symptom is a brick wall with rings in it rather than a crash. Averaging into ten
    // buckets catches it: `hash3` should be near a tenth in every bucket.
    const buckets = new Array<number>(10).fill(0);
    for (let x = 0; x < 40; x += 1) {
      for (let z = 0; z < 40; z += 1) {
        buckets[Math.min(9, Math.floor(hash3(x, 1, z) * 10))] += 1;
      }
    }
    const samples = buckets.reduce((a, b) => a + b, 0);
    // **And the count is what was actually sampled**, checked rather than assumed: a loop that
    // quietly covered a quarter of its range would make every bucket pass the mean below while
    // testing almost nothing.
    expect(samples).toBe(1600);
    const mean = samples / buckets.length;
    for (const [at, count] of buckets.entries()) {
      expect(count, `bucket ${at}`).toBeGreaterThan(mean * 0.7);
      expect(count, `bucket ${at}`).toBeLessThan(mean * 1.3);
    }
  });
});

describe("brick", () => {
  it("puts mortar at a course line and none in the middle of a brick", () => {
    // **Exactly on the joint, and at the middle of the face.** Both halves matter: a pattern
    // that is only ever solid, or only ever mortar, is not a brick wall.
    // **Every probe is at the middle of a course**, because `y = 0` is itself a course line and
    // would report mortar for a reason that has nothing to do with the wall.
    expect(brickAt(BRICK.x / 2, BRICK.y / 2, BRICK.z / 2).mortar).toBe(0);
    // **The two joint directions separately**: the vertical joint between bricks end to end,
    // and the horizontal one between courses.
    expect(brickAt(0, BRICK.y / 2, BRICK.z / 2).mortar).toBeCloseTo(1, 5);
    expect(brickAt(BRICK.x, BRICK.y / 2, BRICK.z / 2).mortar).toBeCloseTo(1, 5);
    expect(brickAt(BRICK.x / 2, BRICK.y, BRICK.z / 2).mortar).toBeCloseTo(1, 5);
  });

  it("is narrow enough that a brick is mostly brick", () => {
    // **One wall tile's worth of mortar out of a whole brick**, which is roughly the real thing.
    // Wider than this and the wall reads as grout; narrower and it disappears at distance.
    expect(BRICK.mortar).toBeLessThan(BRICK.x / 8);
  });

  it("staggers alternate courses by half a brick", () => {
    // **And this is the reason it is worth computing at all.** Course 0 has a vertical joint at
    // x = 0; course 1 must not, or the wall is a grid.
    // **Where the probe sits in Z is itself part of this test, and it is not obvious.** The
    // lattice shears in Z as well as X — it has to, so that a wall facing either axis gets a
    // staggered bond — which means the *horizontal* joint lies at `z = 0` in even courses and at
    // `z = BRICK.z / 2` in odd ones. Probing at either would report mortar on every row and say
    // nothing about the bond. A quarter of the way across is the one depth that is mid-cell for
    // both parities, so it is the only place from a brick face can be observed.
    const face = BRICK.z / 4;
    const jointAtX0 = brickAt(0, BRICK.y / 2, face).mortar;
    const solidAtX0NextCourse = brickAt(0, BRICK.y * 1.5, face).mortar;
    const jointAtHalfway = brickAt(BRICK.x / 2, BRICK.y * 1.5, face).mortar;
    const solidAtHalfway = brickAt(BRICK.x / 2, BRICK.y / 2, face).mortar;

    // **Course 0 has its vertical joint at `x = 0`; course 1 has moved it half a brick along.**
    // The same two points on the wall swap between mortar and solid, which is the whole of what
    // a running bond is. Without the shear all four readings would be mortar and the wall would
    // be a grid.
    expect(jointAtX0).toBeGreaterThan(0.9);
    expect(solidAtX0NextCourse).toBe(0);
    expect(jointAtHalfway).toBeGreaterThan(0.9);
    expect(solidAtHalfway).toBe(0);
  });

  it("gives one brick one shade wherever it is asked about", () => {
    const shade = brickAt(
      BRICK.x * 3 + 4,
      BRICK.y * 2 + 1,
      BRICK.z * 5 + 2,
    ).shade;
    expect(
      brickAt(BRICK.x * 3 + 4.5, BRICK.y * 2 + 1.5, BRICK.z * 5 + 2.5).shade,
    ).toBe(shade);
  });

  it("darkens to the mortar rather than to black", () => {
    // **The multiplier cannot reach zero, and this checks the whole surface rather than one
    // spot.** It multiplies a colour the script chose, so a pattern that could go to black could
    // override a deliberate choice — which is the opposite of what a material is for.
    const atJoint = brickAt(0, BRICK.y / 2, BRICK.z / 2);
    const multiplier =
      atJoint.shade * (1 - atJoint.mortar * (1 - MORTAR_DARKEN));
    expect(multiplier).toBeGreaterThan(0);
    expect(multiplier).toBeLessThan(1);
    // **And the darkest thing a pattern does is a stated constant**, so "how much is too much"
    // is a number in one place rather than a judgement in every pattern.
    for (const darken of [MORTAR_DARKEN, GROUT_DARKEN, GROOVE_DARKEN]) {
      expect(darken).toBeGreaterThan(0);
      expect(darken).toBeLessThan(1);
    }
  });

  it("has a brick longer than it is tall, and a return as deep as a course is high", () => {
    // **The proportions are the other half of reading as brick.** A cube is a cube, not a brick.
    // The long axis is what a course runs along; `z` is the return wall, and it is as deep as a
    // course is high because that is what a stretcher is.
    expect(BRICK.x).toBeGreaterThan(BRICK.y);
    expect(BRICK.z).toBe(BRICK.y);
  });
});

describe("tile", () => {
  it("grouts on the grid and is solid between it", () => {
    expect(tileAt(0, 0).grout).toBeCloseTo(1, 5);
    expect(tileAt(0, TILE.x).grout).toBeCloseTo(1, 5);
    expect(tileAt(TILE.x / 2, TILE.z / 2).grout).toBe(0);
  });

  it("is square in both directions", () => {
    // **Not a stretched brick.** A floor and a wall want different aspect ratios, which is the
    // entire argument for tile being its own material and not brick with another scale.
    expect(TILE.x).toBe(TILE.z);
  });

  it("does not take a y, because it has no courses", () => {
    // **The signature is the documentation.** A parameter that is ignored is a lie about what
    // the pattern uses, and this one used to have exactly that.
    expect(tileAt.length).toBe(2);
  });
});

describe("timber", () => {
  it("grooves between planks and is solid within one", () => {
    expect(timberAt(0, 0, 0).groove).toBeCloseTo(1, 5);
    expect(timberAt(PLANK.x / 2, 15, PLANK.z / 2).groove).toBe(0);
  });

  it("runs its grain down the plank rather than across it", () => {
    // **Grain varies with Y and not with X.** A stripe along a plank is what reads as timber; a
    // pattern that changed across the plank would read as noise.
    const at = (y: number) => timberAt(PLANK.x / 2, y, PLANK.z / 2).shade;
    expect(at(1)).not.toBe(at(PLANK.x / 2 + 1));
    // **And two heights inside one grain band agree while two in different bands do not.** The
    // grain is three units tall, so `y = 1` and `y = 2` are the same streak and `y = 4` is the
    // next one. Probing either side of a boundary is what would look like noise.
    expect(at(1)).toBe(at(2));
    expect(at(1)).not.toBe(at(4));
  });
});

describe("the detail fade", () => {
  it("is whole while the sampler is nowhere near trouble", () => {
    // **And *exactly* whole, not nearly.** A fade that started fading at a hundredth of a cell
    // would quietly thin the mortar on every wall in the world at every distance, which is the
    // sort of loss nobody reports and everybody sees.
    expect(detailAt(0, BRICK.x)).toBe(1);
    expect(detailAt(BRICK.x / 100, BRICK.x)).toBe(1);
    expect(detailAt(BRICK.x * FADE_START, BRICK.x)).toBe(1);
  });

  it("is gone once a pixel is as wide as a cell, and not past that", () => {
    // **Both ends of the range are checked** because a fade that went negative would turn the
    // pattern inside out and a fade that stopped at one cell's width would leave a pattern
    // shimmering against a background it had just stopped drawing.
    expect(detailAt(BRICK.x * MIN_DETAIL, BRICK.x)).toBeCloseTo(0, 5);
    expect(detailAt(BRICK.x * 40, BRICK.x)).toBe(0);
  });

  it("takes the last of the pattern away over the last half of a cell", () => {
    // **The shape of the fade, which is the whole reason it is not `1 - perCell`.** Half a cell
    // per pixel is full pattern; three quarters is half; a cell is none.
    expect(detailAt(BRICK.x * 0.75, BRICK.x)).toBeCloseTo(0.5, 5);
  });

  it("only ever fades to nothing, never amplifies", () => {
    for (const footprint of [0, 1, 5, 12, 13, 24, 25, 500]) {
      expect(detailAt(footprint, BRICK.x)).toBeGreaterThanOrEqual(0);
      expect(detailAt(footprint, BRICK.x)).toBeLessThanOrEqual(1);
    }
  });

  it("is measured in the pattern's own units, so a different cell fades differently", () => {
    // **The same pixel is sharp on a big pattern and gone on a small one**, which is the correct
    // behaviour: what matters is how many cells a pixel spans, not how many world units.
    // **A smaller cell fades first**, because the same pixel spans more of it. Tiles at twenty
    // units lose their grout before bricks at twenty-four.
    expect(detailAt(BRICK.x * FADE_START, TILE.x)).toBeLessThan(1);
    expect(detailAt(BRICK.x * FADE_START, BRICK.x)).toBe(1);
  });
});
