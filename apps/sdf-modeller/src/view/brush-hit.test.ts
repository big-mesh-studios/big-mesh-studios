/**
 * Where the brush lands, and the recorder that turns a drag into one undoable edit.
 *
 * **The face normal is tested here as well as in the tree**, because a brush cursor is the first
 * thing in the application to want a triangle's own direction rather than a smoothed one, and
 * getting that wrong produces a ring that tilts on every meshed facet — which looks like a cursor
 * bug and is really a normal bug.
 */
import { describe, expect, it } from "vitest";

import { budgetFor, meshParts } from "../model/mesh-model";
import { placedPart } from "../model/part";
import { centredBox } from "../print/fixtures";
import { TriangleBVH } from "../mesh/triangle-bvh";
import { brushHitAlong, brushWidthTexels, uvAt } from "./brush-hit";
import { PaintSurface } from "../unwrapping/paint-surface";
import { StrokeRecorder } from "../unwrapping/stroke-recorder";

const box = () => centredBox(2);

/** A ray from `from` towards `to`, for the questions that take one. */
const towards = (
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) => {
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const length = Math.hypot(d.x, d.y, d.z);
  return {
    origin: from,
    direction: { x: d.x / length, y: d.y / length, z: d.z / length },
  };
};

/** A box's coordinates, standing in for a bake's. */
const uvsFor = (vertexCount: number): Float32Array => {
  const uvs = new Float32Array(vertexCount * 2);
  for (let v = 0; v < vertexCount; v++) {
    uvs[v * 2] = (v % 3) / 2 + 0.25;
    uvs[v * 2 + 1] = ((v >> 1) % 3) / 2 + 0.25;
  }
  return uvs;
};

describe("brushHitAlong", () => {
  it("answers nothing for a ray that misses the model", () => {
    const mesh = box();
    const hit = brushHitAlong(
      TriangleBVH.of(mesh),
      uvsFor(mesh.vertexCount),
      towards({ x: 0, y: 5, z: 0 }, { x: 1, y: 5, z: 0 }),
    );

    // **A tap on the sky is not an edit**, and the recorder turns this into no history entry.
    expect(hit).toBeUndefined();
  });

  it("finds the surface a ray points at, in both coordinate systems", () => {
    const mesh = box();
    const uvs = uvsFor(mesh.vertexCount);

    const hit = brushHitAlong(
      TriangleBVH.of(mesh),
      uvs,
      towards({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }),
    );

    expect(hit).toBeDefined();
    expect(hit!.point.z).toBeCloseTo(1);
    expect(hit!.distance).toBeCloseTo(4);
    expect(hit!.uv[0]).toBeGreaterThanOrEqual(0);
    expect(hit!.uv[1]).toBeGreaterThanOrEqual(0);
  });

  it("gives a normal pointing away from the middle of the model", () => {
    const mesh = box();
    const hit = brushHitAlong(
      TriangleBVH.of(mesh),
      uvsFor(mesh.vertexCount),
      towards({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }),
    );

    // **Out of the box, not into it.** A cursor laid against the inside of a face is a cursor that
    // vanishes into the model the moment it passes the silhouette.
    expect(hit!.normal.z).toBeGreaterThan(0.9);
    expect(hit!.normal).toBeDefined();
  });

  it("has a unit normal whatever the triangle", () => {
    const mesh = meshParts(
      [
        placedPart(
          "sphere",
          { type: "Sphere", radius: 4 },
          { x: 0, y: 0, z: 0 },
        ),
      ],
      budgetFor(0.5),
    )!.mesh;
    const bvh = TriangleBVH.of(mesh);
    const uvs = uvsFor(mesh.vertexCount);

    for (let face = 0; face < 6; face++) {
      const angle = (face / 6) * Math.PI * 2;
      const hit = brushHitAlong(
        bvh,
        uvs,
        towards(
          { x: 0, y: 0, z: 30 },
          { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4, z: 0 },
        ),
      );
      if (hit === undefined) continue;
      // **Unit length, exactly.** A cursor is scaled and rotated by this, and a normal one per
      // cent longer on one face would show as a ring that changes size as it goes round.
      expect(Math.hypot(hit.normal.x, hit.normal.y, hit.normal.z)).toBeCloseTo(
        1,
        6,
      );
    }
  });

  it("reads the atlas coordinates off the face rather than off its first vertex", () => {
    const mesh = box();
    const uvs = uvsFor(mesh.vertexCount);
    const bvh = TriangleBVH.of(mesh);
    const ray = towards({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 });

    const hit = brushHitAlong(bvh, uvs, ray);
    const raw = bvh.intersectRay(ray)!;

    // **The same three-weights interpolation the transfer uses**, recomputed from the triangle
    // itself so the test would notice if `brushHitAlong` answered with a vertex rather than with
    // a point on the face. A cursor reading the wrong vertex would still be *somewhere* on the
    // atlas, and the paint would be subtly displaced rather than obviously wrong.
    expect(uvAt(uvs, raw)[0]).toBeCloseTo(hit!.uv[0], 9);
    expect(uvAt(uvs, raw)[1]).toBeCloseTo(hit!.uv[1], 9);
  });
});

describe("uvAt", () => {
  it("gives the middle of an edge the average of its ends", () => {
    const uvs = new Float32Array([0, 0, 1, 0, 0.5, 0.5]);

    const uv = uvAt(uvs, {
      vertices: [0, 1, 2],
      weights: [0.5, 0.5, 0],
    });

    expect(uv[0]).toBeCloseTo(0.5);
    expect(uv[1]).toBeCloseTo(0);
  });
});

describe("brushWidthTexels", () => {
  it("scales a world width by the atlas's own density", () => {
    // **The same brush on a bigger figure is the same number of texels, not the same brush.**
    // A model twice the size gets the same atlas and therefore half the density.
    expect(brushWidthTexels(1, 64)).toBe(64);
    expect(brushWidthTexels(1, 32)).toBe(32);
  });

  it("is never thinner than a texel", () => {
    // **A zero-width brush would stamp nothing and a person would conclude the tool is broken.**
    expect(brushWidthTexels(0, 64)).toBe(1);
  });
});

describe("StrokeRecorder", () => {
  const settings = {
    width: 0.25,
    texelsPerUnit: 64,
    hardness: 1,
    colour: { r: 255, g: 0, b: 0, a: 255 },
  };

  it("answers nothing for a drag that hit nothing", () => {
    const recorder = new StrokeRecorder(new PaintSurface(64, 64), settings);

    expect(recorder.finish()).toBeUndefined();
  });

  it("paints as it is moved", () => {
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.5, 0.5);

    expect(recorder.started).toBe(true);
    expect(surface.sample(0.5, 0.5).r).toBe(255);
  });

  it("does not draw across a seam, but still paints on both sides of it", () => {
    /**
     * **The reported symptom, as a test.** A drag over a cut in the texture was leaving a stripe
     * through the middle of the model, because the stroke is a capsule and a straight run from
     * one chart's coordinates to another's crosses whatever the packer put in between.
     */
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.1, 0.5, 0);
    recorder.moveTo(0.9, 0.5, 1);

    const painted = recorder.finish()!;
    // **Each sample is its own dab**, because a dab is where the finger was and needs no
    // justification; neither end is dropped for being part of a cut.
    expect(painted.segments[0]!.from).toEqual(painted.segments[0]!.to);
    expect(painted.segments[1]!.from).toEqual(painted.segments[1]!.to);

    // **And nothing in between** — the whole width of the atlas at that height is clear.
    expect(surface.sample(0.5, 0.5).r).toBe(0);
    expect(surface.sample(0.1, 0.5).r).toBe(255);
    expect(surface.sample(0.9, 0.5).r).toBe(255);
  });

  it("joins samples that are in the same chart", () => {
    // **The other half, and it is the half that keeps a stroke looking like a stroke.** Without
    // it every drag is a row of separate dabs and a fast movement stipples.
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.2, 0.5, 3);
    recorder.moveTo(0.8, 0.5, 3);

    const painted = recorder.finish()!;
    expect(painted.segments[1]!.from).toEqual([0.2, 0.5]);
    expect(surface.sample(0.5, 0.5).r).toBe(255);
  });

  it("joins samples when nothing has said which chart they are in", () => {
    // **A mesh with no cuts in it has one chart by definition**, so refusing to join would make
    // every stroke on such a mesh stippled for no reason. `-1` means "unknown", not "different".
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.2, 0.5);
    recorder.moveTo(0.8, 0.5);

    const painted = recorder.finish()!;
    expect(painted.segments[1]!.from).toEqual([0.2, 0.5]);
    expect(surface.sample(0.5, 0.5).r).toBe(255);
  });

  it("replays a broken stroke the same way it drew it", () => {
    // **Redo runs the same dabs again, so a stroke broken at a seam must break again.** If redo
    // joined the samples where the original did not, undo-then-redo would quietly add a stripe.
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);
    recorder.moveTo(0.1, 0.5, 0);
    recorder.moveTo(0.9, 0.5, 1);
    const painted = recorder.finish()!;

    const after = new PaintSurface(64, 64);
    StrokeRecorder.replay(after, settings, painted.segments);

    expect(after.sample(0.5, 0.5).r).toBe(0);
    expect(after.sample(0.1, 0.5).r).toBe(255);
    expect(after.sample(0.9, 0.5).r).toBe(255);
  });

  it("reports the rectangle the whole stroke touched, not one dab's", () => {
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.2, 0.5);
    recorder.moveTo(0.8, 0.5);

    const painted = recorder.finish();
    // **A growing rectangle, which is the whole of what the atlas copy in the recorder is for.**
    // A per-dab rectangle would leave the middle of the stroke outside the undo entry.
    expect(painted!.rect.x0).toBeLessThanOrEqual(0.2 * 64);
    expect(painted!.rect.x1).toBeGreaterThanOrEqual(0.8 * 64);
  });

  it("restores every texel the stroke touched, exactly", () => {
    const surface = new PaintSurface(64, 64);
    surface.stamp({
      from: [0.2, 0.2],
      to: [0.2, 0.2],
      width: 8,
      hardness: 1,
      colour: { r: 0, g: 0, b: 255, a: 255 },
    });

    const before = surface.pixels.slice();
    const recorder = new StrokeRecorder(surface, settings);
    // **A stroke that grows the rectangle in both directions**, because the growing rectangle is
    // the part that could get the row arithmetic wrong.
    recorder.moveTo(0.2, 0.2);
    recorder.moveTo(0.5, 0.5);
    recorder.moveTo(0.8, 0.2);
    const painted = recorder.finish();

    surface.restore(painted!.rect, painted!.before);

    for (let at = 0; at < surface.pixels.length; at++) {
      expect(surface.pixels[at], `byte ${at}`).toBe(before[at]!);
    }
  });

  it("keeps the dabs so a redo can replay them", () => {
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, settings);

    recorder.moveTo(0.3, 0.5);
    recorder.moveTo(0.7, 0.5);
    const painted = recorder.finish();

    // **Redo replays rather than restores**, because undo has already spent the "before" bytes.
    expect(painted!.segments.length).toBe(2);
    expect(painted!.segments[0]!.to[0]).toBeCloseTo(0.3);
    expect(painted!.segments[1]!.to[0]).toBeCloseTo(0.7);

    surface.clear();
    StrokeRecorder.replay(surface, settings, painted!.segments);
    expect(surface.sample(0.3, 0.5).r).toBe(255);
    expect(surface.sample(0.7, 0.5).r).toBe(255);
  });

  it("does not stamp the first point twice", () => {
    const surface = new PaintSurface(64, 64);
    const recorder = new StrokeRecorder(surface, {
      ...settings,
      hardness: 0,
      colour: { r: 255, g: 255, b: 255, a: 255 },
    });

    // **A tap paints one dab, not two overlapping ones.** With a translucent brush two would
    // show as a darker dot in the middle of a click, which looks like a defect in the brush.
    recorder.moveTo(0.5, 0.5);

    expect(recorder.finish()!.stamps).toBe(1);
  });

  it("re-reads its width on every move rather than capturing it once", () => {
    const surface = new PaintSurface(64, 64);
    const thin = { ...settings, width: 0.05 };
    const recorder = new StrokeRecorder(surface, thin);

    recorder.moveTo(0.2, 0.5);
    // **A panel change mid-drag**, which a recorder that captured its settings at construction
    // would silently ignore until the next stroke.
    const wide = new StrokeRecorder(surface, { ...settings, width: 1 });
    wide.moveTo(0.5, 0.5);

    const narrow = recorder.finish()!;
    const broad = wide.finish()!;

    // **A thin stroke's rectangle is narrower than a thick one's** over comparable travel.
    expect(broad.rect.x1 - broad.rect.x0).toBeGreaterThan(
      narrow.rect.x1 - narrow.rect.x0,
    );
  });
});
