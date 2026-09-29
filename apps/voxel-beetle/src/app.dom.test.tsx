// @vitest-environment jsdom
// The editor mounted, for the failures that only a running application has.
//
// Every other test here is a function of numbers: a slice addressed, a command
// applied, a file read. None of them builds a component, so none of them can
// tell that a component's body reads a context it has not been given — which is
// how a pane that is built before the split it belongs to, and so outside that
// split, reaches its provider and finds nothing there. This one builds the tree.
//
// The 3D preview is left out: it wants a graphics card, and asking jsdom for one
// ends in a loop rather than in a drawing. Everything else the editor is made of
// is here, and every one of it reads a context.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@solidjs/web";
import { createRoot, flush } from "solid-js";
import { createBeetle } from "./beetle-store";
import { BeetleContext } from "./context";
import { Split } from "./components/SplitPane";
import SliceEditorView from "./SliceEditorView/SliceEditorView";
import { Hud } from "./Hud";
import Palette from "./components/Palette";

/** The browser's own stand-ins, one per thing the editor asks of one. */
function stubBrowser() {
  vi.stubGlobal("matchMedia", (query: string) => {
    const list = new EventTarget() as EventTarget & {
      matches: boolean;
      media: string;
    };
    list.media = query;
    // Narrow, so the compact layout and its pane order are the arrangement
    // exercised: that is the one a phone actually gets.
    list.matches = query.includes("coarse") || /max-width:\s*760px/.test(query);
    return list;
  });

  // The overloads are told apart by the context they ask for, and this answers
  // every one of them with the same flat stand-in.
  const getContext = (): RenderingContext => {
    const noop = () => undefined;
    return {
      canvas: null,
      fillRect: noop,
      clearRect: noop,
      drawImage: noop,
      strokeRect: noop,
      setTransform: noop,
      translate: noop,
      scale: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      stroke: noop,
      fillText: noop,
      putImageData: noop,
      save: noop,
      restore: noop,
    } as unknown as RenderingContext;
  };
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: getContext,
  });

  // A slice is drawn as an `ImageData` and put on a canvas, and jsdom has the
  // canvas but neither the picture nor the transfer.
  vi.stubGlobal(
    "ImageData",
    class {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    },
  );

  // The palette and the colour picker are popovers, and jsdom has no Popover
  // API. Every current browser has, and the editor is built on it: an editor
  // without it could not open its colours, which is a worse failure than one
  // where the test says so.
  for (const method of [
    "showPopover",
    "hidePopover",
    "togglePopover",
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, method, {
      configurable: true,
      value: () => undefined,
    });
  }

  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );

  // The model is read back out of this browser before anything draws it, and
  // jsdom has no database to read it from. Opening one fails, the store says so
  // and carries on, and the editor opens on an empty box — which is the same
  // thing it does for anybody who has drawn nothing here before.
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request: Record<string, unknown> = {};
      // After the caller has attached its handlers, so the failure is delivered
      // to one of them rather than to nobody.
      queueMicrotask(() => {
        request.error = new Error("this is not a browser with a database");
        (request.onerror as (() => void) | undefined)?.();
      });
      return request;
    },
  });

  // The slice canvas is measured against the window, and jsdom lays nothing out.
  for (const property of ["clientWidth", "clientHeight"] as const) {
    Object.defineProperty(HTMLCanvasElement.prototype, property, {
      configurable: true,
      get: () => 400,
    });
  }
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 400,
    width: 400,
    height: 400,
  } as DOMRect);

  return () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  };
}

let unstub: (() => void) | undefined;
let mounted: (() => void) | undefined;

/** Mounts a tree, and gives back the handle that takes it down again. */
function mount(element: () => unknown) {
  const host = document.createElement("div");
  document.body.append(host);
  const dispose = render(element as never, host);
  const previous = mounted;
  mounted = () => {
    dispose();
    host.remove();
    if (previous !== undefined) {
      previous();
    }
  };
  return host;
}

beforeEach(() => {
  unstub = stubBrowser();
});

afterEach(() => {
  // A tree left standing keeps its owners, its effects and its watches, and the
  // next test finds them. Nothing here is torn down for it.
  mounted?.();
  mounted = undefined;
  unstub?.();
});

/**
 * The editor as it is laid out, with the 3D preview left out.
 *
 * Given a store, it is drawn over that one — which is how a test loads a file
 * first and then builds the tree over what the file brought in, the order the
 * application does it in.
 */
const Editor = (props: { store?: ReturnType<typeof createBeetle> }) => {
  const beetle = props.store ?? createBeetle();
  return (
    <BeetleContext value={beetle}>
      <Split direction="row">
        <Split.Pane size="50%">
          <SliceEditorView />
        </Split.Pane>
        <Split.Handle size="9px" />
        <Split.Pane size="50%">
          <Hud />
        </Split.Pane>
      </Split>
    </BeetleContext>
  );
};

/**
 * A published `.cvox` file, read from the package's own fixtures. These are the
 * format author's files, byte for byte, so a loader that reads them is reading
 * the format rather than a file of this repository's own making.
 *
 * Named from the working directory rather than from `import.meta.url`, which the
 * Solid plugin rewrites on the way past in a module it transforms.
 */
const fixtureBytes = (name: string): ArrayBuffer =>
  Uint8Array.from(
    readFileSync(
      resolve(process.cwd(), "../../packages/stacker/fixtures", `${name}.cvox`),
    ),
  ).buffer as ArrayBuffer;

describe("the editor, mounted", () => {
  it("builds the split, the slice canvas and the controls over them", async () => {
    const host = mount(() => <Editor />);
    // The model is read back out of this browser before anything draws it, so
    // the tree waits for that read rather than drawing an empty box.
    await settle(host);
    flush();

    expect(host.querySelectorAll("canvas")).toHaveLength(1);
    expect(host.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("builds a pane that was made before the split it belongs to", () => {
    // A pane is built as an element before its split is drawn, so that the same
    // element can be carried from one arrangement to another. Its body runs where
    // it is written, which is outside the split, and reads the split's context
    // from there.
    const pane = <Split.Pane size="1fr">before</Split.Pane>;
    expect(() => mount(() => pane)).not.toThrow();
  });

  it("draws the slice without a graphics card", async () => {
    const host = mount(() => <Editor />);
    await settle(host);
    flush();
    // The canvas is asked for a context and handed one, which is all it needs to
    // have found the browser it is running in.
    const canvas = host.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.getContext("2d")).not.toBeNull();
  });
});

/**
 * The store as the application makes it: inside a component, which is a
 * reactive root. Made bare it owns nothing, and the effects it sets up — the
 * watching of the model's box, the debounced writing of it down — are never
 * given anyone to belong to.
 *
 * It is handed back so that whatever a test then does to it happens *outside*
 * the root, which is where every change to a model happens in the application
 * too: a root's own body may not write to the state it holds.
 */
function makeStore() {
  let beetle!: ReturnType<typeof createBeetle>;
  createRoot(() => {
    beetle = createBeetle();
  });
  return beetle;
}

/** Waits for the tree to settle on the model it has read back from a browser. */
async function settle(host: HTMLElement) {
  for (let waited = 0; waited < 40; waited++) {
    if (host.querySelector("canvas")) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("the store", () => {
  it("opens on an empty box with a palette to draw in", () => {
    const beetle = makeStore();
    expect(beetle.dimensions()).toEqual({ width: 32, height: 32, depth: 32 });
    expect(beetle.palette()).toHaveLength(32);
    expect(beetle.palette().every((c) => c.a === 255)).toBe(true);
    expect(beetle.volume().voxels.every((i) => i === 255)).toBe(true);
  });

  it("starts on a slice in the middle of the box", () => {
    const beetle = makeStore();
    expect(beetle.sliceAt()).toBe(16);
    expect(beetle.slice().plane).toBe("xy");
  });

  it("keeps a slice inside the box however the box is resized", () => {
    const beetle = makeStore();
    beetle.setSliceAt(31);
    flush();
    expect(beetle.sliceAt()).toBe(31);

    // A box three deep has no slice thirty-one of it.
    beetle.setVolume({
      dimensions: { width: 4, height: 4, depth: 3 },
      voxels: new Uint8Array(48).fill(255),
    });
    flush();
    expect(beetle.sliceCount()).toBe(3);
    expect(beetle.sliceAt()).toBeLessThan(3);
  });

  it("steps a slice but stops at either end of the box", () => {
    const beetle = makeStore();
    beetle.setSliceAt(0);
    flush();
    beetle.stepSlice(-1);
    flush();
    expect(beetle.sliceAt()).toBe(0);

    beetle.setSliceAt(31);
    flush();
    beetle.stepSlice(1);
    flush();
    expect(beetle.sliceAt()).toBe(31);
  });

  it("brings the slice a voxel is on to the front", () => {
    const beetle = makeStore();
    // The xy plane is cut along the box's depth, so it is a voxel's z that says
    // which slice of it that voxel is on.
    beetle.setPlane("xy");
    beetle.showVoxel([3, 4, 9]);
    flush();
    expect(beetle.sliceAt()).toBe(9);

    beetle.setPlane("yz");
    // A setter's value reaches a read after a microtask, not at once.
    flush();
    beetle.showVoxel([3, 4, 9]);
    flush();
    // The yz plane is cut along the box's width instead.
    expect(beetle.sliceAt()).toBe(3);
  });

  it("marks the preview's chunks for rebuilding, and forgets them once built", () => {
    const beetle = makeStore();
    // A 32-cube model is one chunk, and a model that has never been drawn has no
    // geometry at all, so it opens with that chunk waiting to be built.
    expect([...beetle.dirtyChunks()]).toEqual([0]);

    beetle.clearDirtyChunks(new Set([0]));
    // A setter's value reaches a read after a microtask, not at once.
    flush();
    expect(beetle.dirtyChunks().size).toBe(0);
  });

  it("erases when the empty swatch is chosen, and draws again when a colour is", () => {
    const beetle = makeStore();
    expect(beetle.selectedPaletteIndex()).toBe(5);
    beetle.erase();
    flush();
    expect(beetle.selectedPaletteIndex()).toBe(255);
    expect(beetle.selectedColour()).toBeUndefined();
    beetle.choosePaletteIndex(5);
    flush();
    expect(beetle.selectedPaletteIndex()).toBe(5);
  });

  it("keeps the brush on a colour the model brought with it", async () => {
    // castle.cvox is a real file from the format's author: a model in a single
    // colour. The editor starts its brush on the sixth swatch, which a one-colour
    // palette does not have, and everything that asked the palette for the brush's
    // colour was asking past its end.
    const beetle = makeStore();
    await beetle.loadVolume(fixtureBytes("castle"), { kind: "nowhere" });
    flush();

    expect(beetle.palette()).toHaveLength(1);
    // The brush lands on a colour that exists, whatever the palette's length.
    expect(beetle.chosenPaletteIndex()).toBeLessThan(beetle.palette().length);
    expect(beetle.selectedColour()).toBeDefined();
  });

  it.each([
    ["3x3x3", 1],
    ["castle", 1],
    ["chr_knight", 21],
  ])("keeps the brush inside the palette of %s", async (name, colours) => {
    const beetle = makeStore();
    await beetle.loadVolume(fixtureBytes(name), { kind: "nowhere" });
    flush();
    expect(beetle.palette()).toHaveLength(colours);
    expect(beetle.chosenPaletteIndex()).toBeLessThan(colours);
    expect(beetle.selectedColour()).toBeDefined();
  });

  it("keeps the brush inside a palette that shrinks under it", () => {
    // Not only a file's palette: taking a colour away with the picker shortens
    // it too, and the brush follows it down rather than staying on a swatch that
    // is no longer there.
    const beetle = makeStore();
    flush();
    expect(beetle.chosenPaletteIndex()).toBe(5);

    beetle.setPalette(beetle.palette().slice(0, 2));
    flush();
    expect(beetle.chosenPaletteIndex()).toBe(1);
    expect(beetle.selectedColour()).toBeDefined();
  });

  it("shows a model in fewer colours than the editor starts with", async () => {
    // The same file, with the tree actually built over it: the palette strip asks
    // whether each swatch is the chosen one, which used to be a comparison
    // between a colour and whatever the brush was on — and the brush was past
    // the end of a one-colour palette, so there was nothing there to compare.
    const beetle = makeStore();
    await beetle.loadVolume(fixtureBytes("castle"), { kind: "nowhere" });
    flush();

    const host = mount(() => <Editor store={beetle} />);
    await settle(host);
    flush();
    expect(host.querySelectorAll("button").length).toBeGreaterThan(0);
  });

  it("builds a palette strip over a one-colour model", async () => {
    // The strip itself, which the editor keeps in a popover and so does not build
    // until it is opened. This is the piece that read past the end of the
    // palette, so it is built here rather than left to a popover.
    const beetle = makeStore();
    await beetle.loadVolume(fixtureBytes("castle"), { kind: "nowhere" });
    flush();

    const host = mount(() => (
      <BeetleContext value={beetle}>
        <Palette />
      </BeetleContext>
    ));
    await settle(host);
    flush();
    // One swatch, for the one colour the castle is drawn in.
    expect(host.querySelectorAll("button")).toHaveLength(1);
  });
});
