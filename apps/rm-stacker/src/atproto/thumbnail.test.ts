import { decode } from "fast-png";
import { describe, expect, it } from "vitest";
import { DAWNBRINGER_32_PALETTE } from "../default_palette";
import { Bitmap } from "../maths";
import { createInitialSides } from "../stacker-store";
import type { Sides } from "../types";
import { thumbnailFromSides } from "./thumbnail";

const dimensions = { width: 12, height: 12, depth: 12 };

/** A model with nothing drawn in it at all. */
function blank(): Sides {
  const panel = () => Bitmap.create(dimensions.width, dimensions.height);
  return {
    front: panel(),
    back: panel(),
    left: panel(),
    right: panel(),
    top: panel(),
    bottom: panel(),
  };
}

const drawn = () =>
  decode(thumbnailFromSides(createInitialSides(dimensions), DAWNBRINGER_32_PALETTE));

/** Every pixel that was drawn, as red, green, blue. */
function opaqueColours(image: ReturnType<typeof decode>): string[] {
  const colours: string[] = [];

  for (let cell = 0; cell < image.width * image.height; cell++) {
    const offset = cell << 2;
    if (image.data[offset + 3] !== 0) {
      colours.push(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`);
    }
  }

  return colours;
}

describe("thumbnailFromSides", () => {
  it("is square, and the same size whatever the model", () => {
    const small = decode(
      thumbnailFromSides(createInitialSides(dimensions), DAWNBRINGER_32_PALETTE),
    );
    const large = decode(
      thumbnailFromSides(
        createInitialSides({ width: 40, height: 20, depth: 8 }),
        DAWNBRINGER_32_PALETTE,
      ),
    );

    expect(small.width).toBe(small.height);
    expect(large.width).toBe(small.width);
  });

  it("leaves a model nothing was drawn in entirely clear", () => {
    const image = decode(thumbnailFromSides(blank(), DAWNBRINGER_32_PALETTE));

    expect(opaqueColours(image)).toHaveLength(0);
  });

  it("frames the model so it takes up most of the picture", () => {
    const image = drawn();
    const covered = opaqueColours(image).length / (image.width * image.height);

    expect(covered).toBeGreaterThan(0.2);
    expect(covered).toBeLessThan(0.8);
  });

  it("shades the model, so it reads as a solid rather than a silhouette", () => {
    // A cube seen from a corner shows three faces, each facing the light
    // differently and so each a different shade of the one colour. One shade
    // throughout would mean a flat cut-out rather than a rendering.
    expect(new Set(opaqueColours(drawn())).size).toBeGreaterThanOrEqual(3);
  });

  it("gives the clear pixels beside the model its colour, so shrinking it leaves no dark edge", () => {
    const image = drawn();
    let beside = 0;

    for (let y = 1; y < image.height - 1; y++) {
      for (let x = 1; x < image.width - 1; x++) {
        const here = (y * image.width + x) << 2;
        const right = (y * image.width + x + 1) << 2;

        if (image.data[here + 3] === 0 && image.data[right + 3] !== 0) {
          beside++;
          // Transparent, but carrying colour rather than black — otherwise
          // scaling the picture down blends a dark fringe around the model.
          const sum = image.data[here] + image.data[here + 1] + image.data[here + 2];
          expect(sum).toBeGreaterThan(0);
        }
      }
    }

    expect(beside).toBeGreaterThan(0);
  });
});
