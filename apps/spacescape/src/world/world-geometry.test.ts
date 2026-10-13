/**
 * The two worlds, and the numbers that are the same in each.
 *
 * `planet-world.test.ts` proves a planet behaves like a world a player can stand on. This file
 * covers the narrower claim that makes it worth having **both**: that choosing a shape is one
 * decision with a fixed set of consequences, rather than a set of decisions a caller has to
 * remember to keep in step.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAVES,
  DEFAULT_PLANET,
  DEFAULT_TERRAIN,
  seaLevelOf,
} from "@big-mesh-studios/csg";
import { vec3 } from "@big-mesh-studios/core";

import { flatFrame } from "./up";
import { flatWater, sphericalWater } from "./water";
import {
  DEFAULT_WORLD_SHAPE,
  WORLD_SEARCH_FLAG,
  isWorldShape,
  worldGeometry,
  worldShapeFromSearch,
} from "./world-geometry";

describe("a sphere", () => {
  const geometry = worldGeometry("sphere");

  it("is a planet, framed from the origin", () => {
    expect(geometry.baseField.kind).toBe("planet");
    expect(geometry.frame.spherical).toBe(true);
    // **The centre is the origin and not merely close to it** — ADR 0036 is the decision that a
    // lattice re-centred on the planet would have to be rebuilt to put a planet anywhere else.
    expect(geometry.frame.centre).toEqual(vec3(0, 0, 0));
  });

  it("puts its sea at its own radius, read off the spec rather than restated", () => {
    expect(geometry.seaLevel).toBe(DEFAULT_PLANET.radius);
    expect(geometry.seaLevel).toBe(seaLevelOf(geometry.baseField));
  });

  it("has caves, which the library's default planet does not", () => {
    // `app.tsx:187-198` — a default planet *with* caves cannot state any property of its own
    // surface, so the game's world builds its own spec and the library's stays plain.
    expect(geometry.baseField.params.caves).toEqual(DEFAULT_CAVES);
    expect(DEFAULT_PLANET.caves).toBeUndefined();
  });

  it("hands the sea the shape that faces away from the centre", () => {
    // **Identity, and not a second shape built here.** `render/water.test.ts:170-186` is what
    // holds the two normals apart — by compiling both fragments, because the only thing to say
    // is which one normalises the world position. Re-asserting it on an object graph would test
    // less and mean less.
    expect(geometry.water).toBe(sphericalWater);
  });
});

describe("a flat world", () => {
  const geometry = worldGeometry("flat");

  it("is a height field, with no centre", () => {
    expect(geometry.baseField.kind).toBe("terrain");
    expect(geometry.frame.spherical).toBe(false);
    expect(geometry.frame.centre).toBeUndefined();
    // **The infinite radius rather than a large one**, so that every consumer of `radiusAt` —
    // the water test, the world bound — needs no branch of its own (`up.ts:57-62`).
    expect(geometry.frame.radiusAt(vec3(1e6, 0, 0))).toBe(Infinity);
  });

  it("puts its sea at an altitude, read off the spec rather than restated", () => {
    // **The one number, and the property `app.tsx:171-184` asked for.** A flat frame with a sea
    // *radius* is no ocean at all; a sea read off the spec is this world's altitude.
    expect(geometry.seaLevel).toBe(DEFAULT_TERRAIN.origin);
    expect(geometry.seaLevel).toBe(seaLevelOf(geometry.baseField));
    // And near the ground rather than 136,000 units out, which is what makes a y-value mean
    // something to a place author.
    expect(Math.abs(geometry.seaLevel)).toBeLessThan(1000);
  });

  it("has no caves, because the reason a sphere has them does not apply to a plane", () => {
    expect(geometry.baseField.params.caves).toBeUndefined();
  });

  it("hands the sea the shape that faces world up", () => {
    expect(geometry.water).toBe(flatWater);
  });
});

describe("the ground question both worlds are asked", () => {
  it("answers from the field itself when there are no caves to look past", () => {
    // **`landscape.ground` is absent on a solid world** (`base-field.ts:47-48`), and reading it
    // through a fallback is what keeps every caller of `WorldGeometry.ground` free of a check
    // for a case the union has already decided.
    for (const shape of ["sphere", "flat"] as const) {
      const geometry = worldGeometry(shape);
      expect(typeof geometry.ground, shape).toBe("function");
      expect(geometry.ground(0, 0, 0), shape).toBe(geometry.landscape(0, 0, 0));
    }
  });

  it("is the same function object the mesher's gate would be given", () => {
    // `base-field.ts:70-72` — the mesher's gate and the physics' predicate must be handed the
    // same one, or a chunk gets water geometry the player is not in.
    const sphere = worldGeometry("sphere");
    expect(sphere.landscape.ground).toBeDefined();
    expect(sphere.ground).toBe(sphere.landscape.ground);
  });
});

describe("choosing a world from the query string", () => {
  const search = (query: string): URLSearchParams => new URLSearchParams(query);

  it("asks for a sphere by default, which is the world this build has always been", () => {
    expect(DEFAULT_WORLD_SHAPE).toBe("sphere");
    expect(worldShapeFromSearch(undefined)).toBe("sphere");
    expect(worldShapeFromSearch(search(""))).toBe("sphere");
    // **Beside the other flags rather than instead of them**, so `?world=flat&lod=off` is one
    // URL rather than a choice between two experiments.
    expect(worldShapeFromSearch(search("lod=off"))).toBe("sphere");
  });

  it("reads the shape it is given", () => {
    expect(worldShapeFromSearch(search(`${WORLD_SEARCH_FLAG}=flat`))).toBe(
      "flat",
    );
    expect(worldShapeFromSearch(search(`${WORLD_SEARCH_FLAG}=sphere`))).toBe(
      "sphere",
    );
    // Case and space, because the console lowercases everything it is given and a URL is typed
    // by the same person.
    expect(worldShapeFromSearch(search(`${WORLD_SEARCH_FLAG}=FLAT`))).toBe(
      "flat",
    );
    expect(worldShapeFromSearch(search(`${WORLD_SEARCH_FLAG}=+sphere+`))).toBe(
      "sphere",
    );
  });

  it("falls back rather than refusing, because there is a wrong answer either way", () => {
    // **A typo must not stop the world.** A spherical frame with a sea at an altitude is an
    // ocean at an infinite radius and a flat frame with a sea radius is no ocean at all
    // (`app.tsx:174-179`), but neither of those is reachable here — the sea is read off the
    // spec whatever the shape is — so the worst a bad flag can do is give a player the world
    // they already had.
    for (const asked of ["", "terrain", "planet", "yes", "1", "true"]) {
      expect(
        worldShapeFromSearch(search(`${WORLD_SEARCH_FLAG}=${asked}`)),
        asked,
      ).toBe("sphere");
    }
  });
});

describe("the vocabulary at the boundary", () => {
  it("names the two worlds a person would use, not the two fields the engine has", () => {
    // Both worlds have terrain, so `BaseFieldSpec`'s own `"terrain"` is ambiguous exactly where
    // a place author and a console user meet the choice.
    expect(isWorldShape("sphere")).toBe(true);
    expect(isWorldShape("flat")).toBe(true);
    for (const notAShape of [
      "terrain",
      "planet",
      "Plane",
      "",
      0,
      null,
      undefined,
      {},
    ]) {
      expect(isWorldShape(notAShape), String(notAShape)).toBe(false);
    }
  });

  it("maps each of them onto the field the engine already has", () => {
    // The translation is one place, and this is it.
    expect(worldGeometry("sphere").baseField.kind).toBe("planet");
    expect(worldGeometry("flat").baseField.kind).toBe("terrain");
  });

  it("hands out the frames the physics already knows, rather than new ones", () => {
    // **Identity, not equality.** `flatFrame` and `sphericalFrame` are what `player.test.ts` and
    // `planet-world.test.ts` run the player against as controls, and a second copy of the flat
    // frame would be a second object the physics could be handed instead of the one its tests
    // covered. The sphere's frame is a fresh closure by construction, so it is compared by what
    // it answers rather than by identity.
    expect(worldGeometry("flat").frame).toBe(flatFrame);
    const frame = worldGeometry("sphere").frame;
    expect(frame.centre).toEqual(vec3(0, 0, 0));
    expect(frame.spherical).toBe(true);
    // Up points away from the centre at a point on either side of it, and the radius is the
    // distance — which is what makes "below the sea" a different question from "below an
    // altitude" and why the two worlds need one sea level rather than two conventions.
    expect(frame.upAt(vec3(0, 1000, 0))).toEqual(vec3(0, 1, 0));
    expect(frame.upAt(vec3(1000, 0, 0))).toEqual(vec3(1, 0, 0));
    expect(frame.radiusAt(vec3(3, 4, 0))).toBe(5);
  });
});
