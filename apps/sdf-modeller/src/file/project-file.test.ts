import { describe, expect, it } from "vitest";

import { MAX_PARTS } from "../model/model-store";
import { PALETTE_LIMIT } from "../ui/palette";
import { MESH_MODES, RESOLUTIONS } from "../model/mesh-model";
import {
  MAX_MANIFEST_COLOURS,
  MAX_MANIFEST_PARTS,
  PROJECT_VERSION,
  isSaveableProject,
  projectManifest,
  type ProjectView,
} from "./project-file";

/** A manifest with nothing in it that is nevertheless valid. */
const manifest = (overrides: Record<string, unknown> = {}) => ({
  version: PROJECT_VERSION,
  ids: ["body"],
  coloured: [],
  palette: [],
  view: { mode: "surface-nets", resolution: 0.25 },
  ...overrides,
});

describe("what this application adds to the format", () => {
  it("names its own bounds after the ones it does not own", () => {
    // **The two numbers `@big-mesh-studios/csg` writes down rather than imports.** That package
    // cannot import a model store — it drags in the meshing package — or a palette panel, which
    // imports a stylesheet, and a validator for a file's contents is not the place to pull in
    // either to read a number. Duplication is the only option, and duplication is only safe
    // while something checks it. This is that, and it has to live here because it is the only
    // place both numbers are in scope.
    expect(MAX_MANIFEST_PARTS).toBe(MAX_PARTS);
    expect(MAX_MANIFEST_COLOURS).toBe(PALETTE_LIMIT);
  });

  it("accepts exactly the resolutions the viewport offers", () => {
    // **A narrowing, and this is the whole of what it is.** The shared validator takes any
    // positive number, because that package does not know what a mesher is; the list of sizes
    // this application's viewport offers belongs here, with the meshers. The test walks the
    // offered list rather than writing it out, so a resolution added to `RESOLUTIONS` is
    // accepted the moment it is offered and not before.
    for (const resolution of RESOLUTIONS) {
      expect(
        isSaveableProject(
          manifest({ view: { mode: "surface-nets", resolution } }),
        ),
        String(resolution),
      ).toBe(true);
    }
    for (const resolution of [0.3, 0.0625 / 2, 1, 0]) {
      expect(
        isSaveableProject(
          manifest({ view: { mode: "surface-nets", resolution } }),
        ),
        String(resolution),
      ).toBe(false);
    }
  });

  it("accepts exactly the meshers the viewport offers", () => {
    for (const mode of MESH_MODES) {
      expect(
        isSaveableProject(
          manifest({ view: { mode: mode.value, resolution: 0.25 } }),
        ),
        mode.value,
      ).toBe(true);
    }
    // **A name the shared validator is happy with and this application is not.** That
    // difference is the reason this module exists at all: the format checks that `mode` says
    // something, and only the application holding the list can say whether it says the right
    // thing.
    expect(
      isSaveableProject(
        manifest({ view: { mode: "a-mesher-nobody-has", resolution: 0.25 } }),
      ),
    ).toBe(false);
  });
});

describe("projectManifest", () => {
  it("builds one the reader accepts, so the two paths cannot disagree", () => {
    // **A constructor that checks rather than a cast.** The writer builds a manifest by hand
    // and the reader parses one off disk; if the writer could produce something the reader
    // would refuse, the two paths into the same format would drift, and the failure would be a
    // file this application wrote and cannot open.
    const built = projectManifest(
      { mode: "marching-cubes", resolution: 0.125 },
      {
        ids: ["a", "b"],
        coloured: [0],
      },
    );
    expect(isSaveableProject(built)).toBe(true);
    expect(built.version).toBe(PROJECT_VERSION);
  });

  it("refuses to build one its own reader would reject", () => {
    const nonsense = {
      mode: "nope",
      resolution: 0.25,
    } as unknown as ProjectView;
    expect(() => projectManifest(nonsense)).toThrow(/cannot open/);
  });
});
