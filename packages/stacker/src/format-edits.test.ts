// @vitest-environment jsdom
//
// A part's edits live in a file beside its drawings rather than in the list that
// names the parts, which means the read path has to find it and the write path has
// to put it back. Neither is a formality: rm-stacker writes a whole figure's zip
// on every command as its undo history, so an edit that did not survive one trip
// through this would be gone after a single stroke.
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { Bitmap, Vector3D } from "@big-mesh-studios/maths";
import {
  partDimensions,
  sideAxes,
  sideKinds,
  type Figure,
  type Part,
} from "./data";
import { REMOVED, editVolumeFor, editsHaveSomething } from "./edits";
import { loadFigure, saveFigure } from "./format";
import { encodeSidePng } from "./side-image";
import { writeCvox } from "./cvox";
import { sidesOfVolume } from "./sides";
import { solveVoxels } from "./solver";
import { createVolume, type Volume } from "./volume";

const PALETTE = [
  { r: 10, g: 0, b: 0, a: 255 },
  { r: 0, g: 20, b: 0, a: 255 },
  { r: 0, g: 0, b: 30, a: 255 },
];

const DIMENSIONS = { width: 3, height: 3, depth: 3 };

/** A part of a given size, painted throughout, with the edits asked for. */
const partWith = (edits?: Volume): Part => {
  const sides = {} as Part["sides"];

  for (const kind of sideKinds) {
    sides[kind] = Bitmap.create(
      kind === "left" || kind === "right" ? DIMENSIONS.depth : DIMENSIONS.width,
      kind === "top" || kind === "bottom"
        ? DIMENSIONS.depth
        : DIMENSIONS.height,
    );
    sides[kind].data.fill(1);
  }

  return {
    name: "body",
    sides,
    sections: [],
    root: Vector3D.create(),
    pivot: Vector3D.create(1.5, 1.5, 1.5),
    turn: Vector3D.create(),
    scale: 1,
    parent: null,
    edits,
  };
};

/** A shell a colour, hollow, with the edits that bring it back. */
const hollowPart = (): Part => {
  const solid = createVolume(DIMENSIONS);
  solid.voxels.fill(1);

  const wanted = createVolume(DIMENSIONS);
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const onFace =
          x === 0 || y === 0 || z === 0 || x === 2 || y === 2 || z === 2;
        wanted.voxels[z * 9 + y * 3 + x] = onFace ? 1 : Bitmap.EMPTY;
      }
    }
  }

  // The part as it is drawn: a solid block, because that is all six drawings can
  // say. The one voxel nothing can see is an edit.
  const part = partWith();
  part.sides = sidesOfVolume(wanted) as Part["sides"];
  part.edits = editVolumeFor(
    DIMENSIONS,
    solveVoxels(DIMENSIONS, part.sides, []),
    wanted,
  );

  return part;
};

describe("a part's edits in a file", () => {
  it("come back as they went in", async () => {
    const part = hollowPart();
    expect(part.edits).toBeDefined();
    expect(editsHaveSomething(part.edits!)).toBe(true);

    const figure: Figure = { parts: [part], palette: PALETTE };
    const read = await loadFigure(await saveFigure(figure));

    expect(read.parts[0].edits).toBeDefined();
    expect(Array.from(read.parts[0].edits!.voxels)).toEqual(
      Array.from(part.edits!.voxels),
    );
  });

  it("are in a file beside the part's drawings, and nowhere else", async () => {
    const zip = await JSZip.loadAsync(
      await saveFigure({ parts: [hollowPart()], palette: PALETTE }),
    );

    expect(Object.keys(zip.files).sort()).toEqual(
      [
        "body/",
        "body/edits.cvox",
        ...sideKinds.map((side) => `body/${side}.png`),
        "parts.json",
        "palette.png",
      ].sort(),
    );
  });

  it("are left out where there are none to write", async () => {
    // The file's being there is the whole of what says a part has edits, so a part
    // with an empty box of them must not write one.
    const part = partWith(createVolume(DIMENSIONS));
    const zip = await JSZip.loadAsync(
      await saveFigure({ parts: [part], palette: PALETTE }),
    );

    expect(zip.files["body/edits.cvox"]).toBeUndefined();
  });

  it("survive a part with both drawings and cuts, and a figure of several parts", async () => {
    const withEdits = hollowPart();
    withEdits.sections = [
      {
        axis: "depth" as const,
        at: 1,
        before: Bitmap.create(3, 3),
        after: Bitmap.create(3, 3),
      },
    ];

    const other = partWith();
    other.name = "arm";

    const read = await loadFigure(
      await saveFigure({
        parts: [withEdits, other],
        palette: PALETTE,
      }),
    );

    expect(read.parts.map((one) => one.name)).toEqual(["body", "arm"]);
    expect(read.parts[0].edits).toBeDefined();
    expect(read.parts[1].edits).toBeUndefined();
  });

  it("put a voxel the drawings could not reach back where it was", async () => {
    // The point of the file, stated as a test: the volume the part draws to is
    // the one that was wanted, and not merely a figure that survives the trip.
    const part = hollowPart();
    const read = await loadFigure(
      await saveFigure({ parts: [part], palette: PALETTE }),
    );

    const loaded = read.parts[0];
    const solved = solveVoxels(
      partDimensions(loaded),
      loaded.sides,
      loaded.sections,
    );

    expect(loaded.edits).toBeDefined();
    expect(
      Array.from(loaded.edits!.voxels).filter((i) => i === REMOVED),
    ).toHaveLength(1);
    // The six drawings on their own give a solid block, which is the loss.
    expect(solved[((1 * 9 + 1 * 3 + 1) << 2) + 3] & 0b11000000).toBe(
      0b11000000,
    );
  });

  it("are claimed by their name, and leave a file of another name alone", async () => {
    // How the format stays open to a file it has no reading for: the read path
    // claims an entry by its name alone, and decodes and checks whatever it
    // claims. So a file it does not know is stepped over without being looked at,
    // and a file it does know is read even when what is in it is nonsense. A
    // version of this reader that had no edits at all would open a model with
    // them, without them, because the branch that reads the file is the whole of
    // what knows it exists.
    const withExtra = await JSZip.loadAsync(
      await saveFigure({ parts: [partWith()], palette: PALETTE }),
    );
    withExtra.file(
      "body/rig.json",
      "{ not a volume, not a drawing, not anything }",
    );

    // The file it does not know is stepped over, and the model opens.
    const read = await loadFigure(
      await withExtra.generateAsync({ type: "blob" }),
    );
    expect(read.parts[0].name).toBe("body");

    // And the one it does know is read, so nonsense in it is said rather than
    // passed over — which is the other half of the same bargain.
    const withBad = await JSZip.loadAsync(
      await saveFigure({ parts: [partWith()], palette: PALETTE }),
    );
    withBad.file("body/edits.cvox", new Uint8Array([0xff, 0xff, 0xff, 0xff]));
    await expect(
      loadFigure(await withBad.generateAsync({ type: "blob" })),
    ).rejects.toThrow();
  });

  it("say so when a part's edits are over a box its drawings do not measure", async () => {
    // A file written against a part that was a different size, which is the one
    // way the two halves of a part can disagree.
    const narrower = { width: 2, height: 3, depth: 3 };
    const sides = {} as Part["sides"];

    for (const kind of sideKinds) {
      const [across, down] = sideAxes[kind];
      sides[kind] = Bitmap.create(narrower[across], narrower[down]);
      sides[kind].data.fill(1);
    }

    const zip = await JSZip.loadAsync(
      await saveFigure({ parts: [partWith()], palette: PALETTE }),
    );

    for (const kind of sideKinds) {
      zip.file(`body/${kind}.png`, encodeSidePng(sides[kind]));
    }
    // The edits of a part three wide, left in place beside drawings of one two.
    zip.file(
      "body/edits.cvox",
      (await zip.files["body/edits.cvox"]?.async("blob")) ??
        writeCvox(createVolume(DIMENSIONS), []),
    );
    zip.file(
      "body/edits.cvox",
      writeCvox(
        (() => {
          const edits = createVolume(DIMENSIONS);
          edits.voxels.fill(1);
          return edits;
        })(),
        PALETTE,
      ),
    );

    await expect(
      loadFigure(await zip.generateAsync({ type: "blob" })),
    ).rejects.toThrow(/has edits over a .* box and its drawings measure/);
  });
});
