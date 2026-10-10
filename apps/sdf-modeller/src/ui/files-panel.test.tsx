// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { createSignal, flush } from "solid-js";
import type { RGBA } from "@big-mesh-studios/core";

import { placedPart, type Part } from "../model/part";
import {
  DEFAULT_PRINT_VOXEL_SIZE,
  MAX_PRINT_VOXEL_SIZE,
} from "../print/print-budget";
import type { MeshResult } from "../model/mesh-model";
import { FilesPanel } from "./files-panel";
import styles from "./files-panel.module.css";

/** A capsule standing on the origin, which is the smallest thing that reads as a figure. */
const body = () =>
  placedPart(
    "body",
    { type: "Capsule", len: 2, radius: 0.7 },
    { x: 0, y: 1, z: 0 },
  );

/**
 * The panel with one signal standing in for every prop it takes.
 *
 * **Only the export's numbers are real**, because they are the only ones this file is about; the
 * rest are the emptiest value their type admits so that a change to the panel's props shows up
 * here as a compile error rather than as a silent `undefined`.
 */
const mount = (initial: {
  readonly resolution?: string;
  readonly printing?: number | undefined;
  readonly builtFile?: string;
  readonly model?: readonly Part[];
}) => {
  const [resolution, setResolution] = createSignal(
    initial.resolution ?? String(DEFAULT_PRINT_VOXEL_SIZE),
  );
  const [printing, setPrinting] = createSignal<number | undefined>(
    initial.printing,
  );
  const [builtFile, setBuiltFile] = createSignal<string | undefined>(
    initial.builtFile,
  );
  let exported = 0;
  let saved = 0;
  const root = document.createElement("div");
  document.body.append(root);
  render(
    () => (
      <FilesPanel
        home={() => ({ kind: "nowhere" })}
        parts={() => 1}
        model={() => initial.model ?? [body()]}
        palette={(): readonly RGBA[] => []}
        recent={() => []}
        canRemember={() => false}
        draftAt={() => undefined}
        mesh={(): MeshResult | undefined => undefined}
        height={() => "100"}
        filaments={() => "4"}
        resolution={resolution}
        printing={printing}
        builtFile={builtFile}
        notice={() => undefined}
        busy={() => false}
        onNew={() => {}}
        onOpen={() => {}}
        onSave={() => {}}
        onExport={() => {
          exported++;
        }}
        onSavePrint={() => {
          saved++;
        }}
        onHeight={() => {}}
        onFilaments={() => {}}
        onResolution={setResolution}
        onOpenRecent={() => {}}
        onForgetRecent={() => {}}
        onClose={() => {}}
      />
    ),
    root,
  );
  flush();
  // **The export panel's own button, found through the popover.** The bar above the panel has a
  // "Save" button of its own, and a test that reached the export's by its text would find that
  // one first — which is the same mistake a person reading the labels would not make, because
  // they can see which is in the popover.
  const button =
    root.querySelector<HTMLButtonElement>("[popover] button") ?? undefined;
  return {
    root,
    setResolution,
    setPrinting,
    setBuiltFile,
    button,
    /** How many times each half of the two-step export was asked for. */
    pressed: () => ({ exported, saved }),
    /** The cost line, which is the only `<p>` in the panel that is not the document's name. */
    cost: () => root.querySelector(`.${styles.cost}`),
    field: () =>
      // **The third number input is the resolution**, reached by position rather than by a test
      // id so that the markup carries no attribute that exists only for a test.
      [...root.querySelectorAll<HTMLInputElement>('input[type="number"]')][2],
  };
};

describe("the export popover's resolution", () => {
  it("starts at the finest resolution the viewport offers", () => {
    // **The default is the mesh somebody has already looked at** by dragging the viewport's own
    // slider to the end, so a print is the model they approved rather than one that resembles it.
    const panel = mount({});

    expect(panel.field()?.value).toBe(String(DEFAULT_PRINT_VOXEL_SIZE));
    expect(panel.field()?.max).toBe(String(DEFAULT_PRINT_VOXEL_SIZE));
  });

  it("offers the three settings that were measured, and takes any value between them", () => {
    // **`step="any"` with a `datalist`.** The offered values are halvings of each other, so a
    // linear `step` can only land between them — stepping by the halving gives `0.046875`,
    // which nobody measured, and stepping by one gives `1.0625`. The list is what lets the
    // arrows walk real settings while the field still accepts anything in range.
    const panel = mount({});
    const field = panel.field();

    expect(field?.step).toBe("any");
    expect(
      [...(panel.root.querySelector("datalist")?.children ?? [])].map(
        (option) => (option as HTMLOptionElement).value,
      ),
    ).toEqual([
      String(MAX_PRINT_VOXEL_SIZE / 2),
      String(MAX_PRINT_VOXEL_SIZE),
      String(DEFAULT_PRINT_VOXEL_SIZE),
    ]);
  });

  it("says what the resolution will cost before anybody commits to it", () => {
    // **The reason the control is a number rather than a slider** — the model's own size is half
    // of what a resolution costs, so the same typed number is a one-second print of a small model
    // and a ten-second print of a large one. The line is what makes that visible.
    const panel = mount({});

    expect(panel.cost()?.textContent).toMatch(
      /samples across · about .* triangles · about .* s/,
    );
  });

  it("follows the field as it is typed, which is why the value is text", () => {
    // **A number signal would export a one-second mesh on the way to typing `0.03125`.** The
    // text is what the person typed; the number is derived from it and refused when it is not
    // one — which is why the line has to be able to be empty without being wrong.
    const panel = mount({});

    panel.setResolution("");
    flush();
    expect(panel.cost()?.textContent).toBe("");

    panel.setResolution("not a number");
    flush();
    expect(panel.cost()?.textContent).toBe("");

    panel.setResolution(String(MAX_PRINT_VOXEL_SIZE));
    flush();
    expect(panel.cost()?.textContent).toMatch(/samples across/);
  });

  it("draws no bar when nothing is being exported", () => {
    // **Between exports there is no task to report on**, and a full-width bar sitting at nothing
    // in a popover is a control that looks broken.
    const panel = mount({});

    expect(panel.root.querySelector("progress")).toBeNull();
  });

  it("draws the bar only while a mesh is being built", () => {
    const panel = mount({});

    panel.setPrinting(0.4);
    flush();
    const bar = panel.root.querySelector("progress");
    expect(bar?.value).toBe(0.4);
    expect(bar?.max).toBe(1);

    panel.setPrinting(undefined);
    flush();
    expect(panel.root.querySelector("progress")).toBeNull();
  });
});

/**
 * The export is two clicks, and the second one has to be a click.
 *
 * **Because `showSaveFilePicker` refuses without recent user activation.** Chrome throws
 * _"Must be handling a user gesture to show a file picker"_, and the activation lasts five
 * seconds — where the fine end of this export is seven and a half and the coarsest is one.
 * Writing the file from the same click that started the meshing is what produced that error, so
 * the bytes are held and the button becomes the write.
 */
describe("the export's two steps", () => {
  it("meshes first, and only writes on a second press", () => {
    const panel = mount({});

    expect(panel.button?.textContent).toContain("Export .3mf");
    panel.button?.click();
    expect(panel.pressed()).toEqual({ exported: 1, saved: 0 });

    panel.setBuiltFile("duck.3mf · 24 MB");
    flush();
    expect(panel.button?.textContent).toContain("Save duck.3mf · 24 MB");

    panel.button?.click();
    expect(panel.pressed()).toEqual({ exported: 1, saved: 1 });
  });

  it("says what it will write, because that is the last chance to say it", () => {
    // **Name and size on the button.** A finely-meshed `.3mf` is tens of megabytes and somebody
    // about to write one to a phone's storage would rather know before than after — and the
    // button is the last thing they read before the dialog covers the screen.
    const panel = mount({ builtFile: "duck.3mf · 24 MB" });

    expect(panel.button?.textContent).toContain("duck.3mf");
    expect(panel.button?.textContent).toContain("24 MB");
  });

  it("goes back to meshing when the file goes away", () => {
    // **Which is what changing a setting does**, because a file meshed at 100 mm offered after
    // the field says 150 is the wrong file and its name does not say so.
    const panel = mount({ builtFile: "duck.3mf · 24 MB" });

    panel.setBuiltFile(undefined);
    flush();

    expect(panel.button?.textContent).toContain("Export .3mf");
    panel.button?.click();
    expect(panel.pressed()).toEqual({ exported: 1, saved: 0 });
  });
});
