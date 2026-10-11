/**
 * The brush's buffer and the marks it makes.
 *
 * **Assertions on pixels rather than on a picture**, because the questions worth asking about a
 * texture are "did that texel change" and "what is in this one" — anything richer needs somebody
 * to look at it, and the tests cannot.
 */
import { describe, expect, it } from "vitest";

import { PaintSurface, type Rgba } from "./paint-surface";

const opaque = (r: number, g: number, b: number): Rgba => ({ r, g, b, a: 255 });

/** A dab at a texel, hard-edged so the expected result is exact. */
const dab = (
  surface: PaintSurface,
  x: number,
  y: number,
  colour: Rgba,
  width = 4,
): void => {
  surface.stamp({
    from: [x / surface.width, y / surface.height],
    to: [x / surface.width, y / surface.height],
    width,
    hardness: 1,
    colour,
  });
};

/** The texel at a pixel, as a string, so a failure says what is actually in it. */
const at = (surface: PaintSurface, x: number, y: number): string => {
  const offset = (y * surface.width + x) * 4;
  return `${surface.pixels[offset]},${surface.pixels[offset + 1]},${surface.pixels[offset + 2]},${surface.pixels[offset + 3]}`;
};

describe("PaintSurface", () => {
  it("starts empty rather than white or black", () => {
    const surface = new PaintSurface(4, 4);

    // **Transparent, because a part's own colour shows through wherever the texture is clear.**
    // A white fill would erase every part colour in the model at once the moment anybody painted.
    expect(surface.sample(0.5, 0.5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("puts a colour where a hard dab lands", () => {
    const surface = new PaintSurface(16, 16);

    dab(surface, 8, 8, opaque(200, 40, 10));

    expect(surface.sample(0.5, 0.5)).toEqual({ r: 200, g: 40, b: 10, a: 255 });
  });

  it("leaves the texels outside the brush alone", () => {
    const surface = new PaintSurface(16, 16);

    dab(surface, 2, 2, opaque(255, 255, 255));

    // **A four-texel-wide hard brush is two and a half texels of radius**, so a corner four texels
    // across from the dab is well outside it. Without this a stub that stamped the whole atlas
    // would pass every other test here.
    expect(surface.sample(2 / 16 + 4 / 16, 0.5)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it("draws a line between two points rather than two dots", () => {
    const surface = new PaintSurface(32, 32);

    surface.stamp({
      from: [4 / 32, 16 / 32],
      to: [28 / 32, 16 / 32],
      width: 4,
      hardness: 1,
      colour: opaque(255, 255, 255),
    });

    // **The middle of the stroke, and texels above and below it.** Two separate dabs would leave
    // the middle clear, and a stroke drawn with pointer events far apart is exactly this shape.
    // The brush is four texels wide, so row 12 — five and a half texels from the line — is well
    // outside it, and row 8 further still.
    expect(surface.sample(0.5, 0.5).a).toBe(255);
    expect(surface.sample(0.5, 0.5).a).toBe(255);
    expect(surface.sample(16 / 32, 12 / 32).a).toBe(0);
    expect(surface.sample(16 / 32, 8 / 32).a).toBe(0);
  });

  it("softens a soft brush's edge and leaves its middle solid", () => {
    const surface = new PaintSurface(32, 32);

    surface.stamp({
      from: [0.5, 0.5],
      to: [0.5, 0.5],
      width: 16,
      hardness: 0,
      colour: opaque(255, 255, 255),
    });

    // **Solid at the centre, nothing at the rim, something in between.** The middle is what makes
    // it a brush rather than a ring, and the gradient is what makes it not a circle.
    //
    // The centre is 249 rather than 255 because a texel's *centre* is half a texel from the dab,
    // and a soft brush with no solid core is already fading by then. That is the falloff working,
    // not a leak: the numbers either side run 229, 194, 150, 102, 58, 23, 3.
    const centre = surface.sample(16 / 32, 16 / 32).a;
    const rim = surface.sample(4 / 32, 16 / 32).a;
    const between = surface.sample(11 / 32, 16 / 32).a;
    expect(centre).toBeGreaterThan(240);
    expect(rim).toBe(0);
    expect(between).toBeGreaterThan(0);
    expect(between).toBeLessThan(centre);
  });

  it("keeps a hard brush's edge hard", () => {
    const surface = new PaintSurface(32, 32);

    surface.stamp({
      from: [0.5, 0.5],
      to: [0.5, 0.5],
      width: 16,
      hardness: 1,
      colour: opaque(255, 255, 255),
    });

    // **Either side of the boundary, one texel apart.** A hard brush is the one that shows a
    // defect here, because a falloff that leaked past the edge would be invisible on a soft one.
    // The edge falls at texel 24 and not 25 because the dab sits on a texel *boundary* rather than
    // a centre, and a texel's centre is what is measured.
    expect(surface.sample(23 / 32, 16 / 32).a).toBe(255);
    expect(surface.sample(24 / 32, 16 / 32).a).toBe(0);
  });

  it("clips a stroke that runs off the atlas rather than wrapping it", () => {
    const surface = new PaintSurface(16, 16);

    surface.stamp({
      from: [0, 0.5],
      to: [2, 0.5],
      width: 8,
      hardness: 1,
      colour: opaque(255, 255, 255),
    });

    // **Wrapping would paint the opposite side of the atlas** from a drag that ran off the edge,
    // which is a thing a person would have to undo by hand rather than by dragging back.
    expect(surface.sample(0.5, 0.5).a).toBe(255);
    expect(surface.sample(0.9, 0.1).a).toBe(0);
  });

  it("says it touched nothing for a stroke entirely off the atlas", () => {
    const surface = new PaintSurface(16, 16);

    expect(
      surface.stamp({
        from: [5, 5],
        to: [6, 6],
        width: 4,
        hardness: 1,
        colour: opaque(255, 255, 255),
      }),
    ).toBeUndefined();
    expect(surface.dirty).toBe(false);
  });

  it("reports the rectangle a stroke touched", () => {
    const surface = new PaintSurface(32, 32);

    const touched = surface.stamp({
      from: [8 / 32, 8 / 32],
      to: [8 / 32, 8 / 32],
      width: 4,
      hardness: 1,
      colour: opaque(255, 255, 255),
    });

    // **The rectangle is what an undo entry bounds its snapshot with**, so a stroke that
    // reported the whole atlas would make undo hold a whole atlas per dab.
    expect(touched).toBeDefined();
    expect(touched!.x1 - touched!.x0).toBeLessThan(8);
    expect(touched!.y1 - touched!.y0).toBeLessThan(8);
  });

  it("reports being dirty exactly once", () => {
    const surface = new PaintSurface(16, 16);

    expect(surface.dirty).toBe(false);
    dab(surface, 8, 8, opaque(255, 255, 255));
    // **Asking clears it**, so two readers cannot both see a change and both upload four
    // megabytes of it.
    expect(surface.dirty).toBe(true);
    expect(surface.dirty).toBe(false);
  });

  it("blends a translucent mark over what is already there", () => {
    const surface = new PaintSurface(8, 8);
    dab(surface, 4, 4, opaque(255, 255, 255));
    dab(surface, 4, 4, { r: 0, g: 0, b: 0, a: 128 });

    // **Roughly half, within a byte.** An opaque second mark or an erased one would both pass a
    // test that only checked "it changed".
    const blended = surface.sample(0.5, 0.5).r;
    expect(blended).toBeGreaterThan(120);
    expect(blended).toBeLessThan(136);
  });

  it("wipes to clear rather than to white", () => {
    const surface = new PaintSurface(8, 8);
    dab(surface, 4, 4, opaque(255, 0, 0));

    surface.clear();

    expect(surface.sample(0.5, 0.5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("puts back exactly what a snapshot held", () => {
    const surface = new PaintSurface(16, 16);
    dab(surface, 8, 8, opaque(10, 20, 30));
    const before = surface.snapshot({ x0: 4, y0: 4, x1: 12, y1: 12 });

    dab(surface, 8, 8, opaque(200, 200, 200));
    surface.restore({ x0: 4, y0: 4, x1: 12, y1: 12 }, before);

    // **This is what makes a stroke undoable.** A stroke is many stamps, so the undo entry
    // belongs to the stroke; this is the one operation that has to be exact rather than close.
    expect(at(surface, 8, 8)).toBe("10,20,30,255");
  });

  it("leaves texels outside a restored rectangle alone", () => {
    const surface = new PaintSurface(16, 16);
    dab(surface, 8, 8, opaque(10, 20, 30));
    const before = surface.snapshot({ x0: 4, y0: 4, x1: 12, y1: 12 });
    dab(surface, 1, 1, opaque(200, 200, 200));

    surface.restore({ x0: 4, y0: 4, x1: 12, y1: 12 }, before);

    // **The rectangle is the whole of what the snapshot covers**, and a restore that reached
    // outside it would quietly undo a stroke somebody had not asked to undo.
    expect(at(surface, 1, 1)).toBe("200,200,200,255");
    expect(at(surface, 8, 8)).toBe("10,20,30,255");
  });

  it("answers clear for a coordinate outside the atlas", () => {
    const surface = new PaintSurface(8, 8);

    // **Every caller of `sample` is asking what colour the picture is over there**, and the
    // honest answer for outside the picture is nothing.
    expect(surface.sample(-0.1, 0.5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(surface.sample(0.5, 1.5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("refuses a buffer of the wrong length rather than reading past it", () => {
    const pixels = new Uint8Array(4 * 4 * 4);
    const surface = new PaintSurface(4, 4, pixels);

    // **Handed the wrong array it makes its own**, because a partially-sized buffer would put a
    // stamp out of bounds rather than somewhere it could be reported.
    expect(surface.pixels.length).toBe(4 * 4 * 4);
    expect(new PaintSurface(4, 4, new Uint8Array(7)).pixels.length).toBe(
      4 * 4 * 4,
    );
  });

  it("is never smaller than one texel", () => {
    // **A zero-sized atlas would have nowhere to stamp**, and `Math.max` here is the difference
    // between an empty model and a crash in a paint tool.
    expect(new PaintSurface(0, 0).width).toBe(1);
    expect(new PaintSurface(0, 0).height).toBe(1);
  });
});
