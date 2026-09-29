import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import {
  planeSlicedAxis,
  readSlice,
  type Slice,
} from "@big-mesh-studios/stacker/volume";
import {
  Component,
  createEffect,
  createSignal,
  onSettled,
  useContext,
} from "solid-js";
import { BeetleContext } from "../context";
import { createSliceController } from "./create-slice-controller";
import {
  cellWorld,
  computeLayout,
  computeStripRows,
  drawingRow,
  sliceOccupancy,
  type Layout,
} from "./slice-layout";
import styles from "./SliceEditorView.module.css";

const AXIS_MASK = { x: 0b001, y: 0b010, z: 0b100 } as const;

const maskColour = (mask: number) =>
  `rgb(${mask & 1 ? 255 : 150} ${mask & 2 ? 255 : 150} ${mask & 4 ? 255 : 150})`;

/** How thick a cell's outline is drawn, once the cells are big enough for one. */
const GRID_FROM = 5;

const SliceEditorView: Component = () => {
  const beetle = useContext(BeetleContext);
  const {
    volume,
    palette,
    slice,
    plane,
    sliceCount,
    sliceAt,
    mode,
    mirror,
    selectedPaletteIndex,
    doCommandAndUndo,
    choosePaletteIndex,
    setSliceAt,
    onRender,
  } = beetle;

  let canvas!: HTMLCanvasElement;

  /**
   * The slice as a picture, on a canvas of its own a texel a cell, so that it can
   * be put down in one piece at the cell size and turned off. The texels are
   * written afresh on every pass rather than kept and patched: a stroke changes
   * the model inside the one object holding it, so there is no identity of the
   * model a cached picture could be known to still match.
   */
  let picture:
    | {
        width: number;
        height: number;
        image: ImageData;
        canvas: HTMLCanvasElement;
      }
    | undefined;

  const pictureFor = (at: Slice, layout: Layout): HTMLCanvasElement => {
    if (
      picture === undefined ||
      picture.width !== at.width ||
      picture.height !== at.height
    ) {
      const offscreen = document.createElement("canvas");
      offscreen.width = at.width;
      offscreen.height = at.height;
      picture = {
        width: at.width,
        height: at.height,
        image: new ImageData(at.width, at.height),
        canvas: offscreen,
      };
    }

    const { image } = picture;
    const { data } = image;
    const model = volume();
    const colours = palette();
    for (let v = 0; v < at.height; v++) {
      for (let u = 0; u < at.width; u++) {
        const index = readSlice(model, at, u, v);
        const colour = index === Bitmap.EMPTY ? undefined : colours[index];
        const offset = (drawingRow(layout, v) * at.width + u) * 4;
        data[offset] = colour?.r ?? 0;
        data[offset + 1] = colour?.g ?? 0;
        data[offset + 2] = colour?.b ?? 0;
        data[offset + 3] = colour === undefined ? 0 : colour.a;
      }
    }
    picture.canvas.getContext("2d")!.putImageData(image, 0, 0);
    return picture.canvas;
  };

  const [canvasSize, setCanvasSize] = createSignal<Vector2D>();

  const controller = createSliceController({
    canvas: () => canvas,
    size: canvasSize,
    volume,
    slice,
    plane,
    mode,
    mirror,
    paletteIndex: selectedPaletteIndex,
    onHover: () => undefined,
    onSlice: setSliceAt,
    onPick: choosePaletteIndex,
    doCommand: (command, description) =>
      doCommandAndUndo(command, true, description),
    onDraw: () => draw(),
  });

  const render = () => {
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    const at = slice();
    const layout = computeLayout(at);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
    }
    if (canvas.height !== Math.round(height * dpr)) {
      canvas.height = Math.round(height * dpr);
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    // The controller works out where the drawing stands, and a press is turned
    // back into a cell by inverting exactly that, so a cell and the place it is
    // drawn at cannot come apart.
    const { scale, at: origin } = controller.transform();

    context.translate(origin.x, origin.y);
    context.scale(scale, scale);
    context.imageSmoothingEnabled = false;

    /* The slice itself. */
    context.drawImage(
      pictureFor(at, layout),
      layout.drawing.x,
      layout.drawing.y,
    );

    /* A cell grid, once a cell is wide enough for a line to be worth drawing. */
    if (scale >= GRID_FROM) {
      context.strokeStyle = "rgb(0 0 0 / 25%)";
      context.lineWidth = 1 / scale;
      context.beginPath();
      for (let u = 0; u <= at.width; u++) {
        context.moveTo(layout.drawing.x + u, layout.drawing.y);
        context.lineTo(layout.drawing.x + u, layout.drawing.y + at.height);
      }
      for (let v = 0; v <= at.height; v++) {
        context.moveTo(layout.drawing.x, layout.drawing.y + v);
        context.lineTo(layout.drawing.x + at.width, layout.drawing.y + v);
      }
      context.stroke();
    }

    /* The border of the slice, in the colour of the axis it is cut along. */
    context.strokeStyle = maskColour(AXIS_MASK[planeSlicedAxis[plane()]]);
    context.lineWidth = 1 / scale;
    context.strokeRect(layout.drawing.x, layout.drawing.y, at.width, at.height);

    /* What the pointer is over, and what a stroke or a block in flight covers. */
    const outline = (cell: Vector2D, colour: string) => {
      const at2 = cellWorld(layout, cell);
      context.strokeStyle = colour;
      context.lineWidth = 2 / scale;
      context.strokeRect(at2.x, at2.y, 1, 1);
    };

    for (const cell of controller.stroke()?.cells ?? []) {
      outline(cell, "rgb(255 255 255 / 70%)");
    }
    const block = controller.block();
    if (block !== undefined) {
      const from = cellWorld(layout, block.from);
      const to = cellWorld(layout, block.to);
      context.strokeStyle = "rgb(255 255 255 / 70%)";
      context.lineWidth = 2 / scale;
      context.strokeRect(from.x, from.y, to.x - from.x + 1, to.y - from.y + 1);
    }

    /* The strip of slices either side of this one, each as tall as how much of
       it has anything in it. */
    const rows = computeStripRows(volume(), plane(), sliceAt(), (at3) =>
      sliceOccupancy(volume(), plane(), at3),
    );
    for (const row of rows) {
      const min = row.min;
      const max = row.max;
      context.fillStyle = "rgb(255 255 255 / 8%)";
      context.fillRect(min.x, min.y, max.x - min.x, max.y - min.y);
      if (row.at !== undefined) {
        context.fillStyle = maskColour(AXIS_MASK[planeSlicedAxis[plane()]]);
        context.globalAlpha = 0.15 + 0.85 * row.occupancy;
        context.fillRect(min.x, min.y, max.x - min.x, max.y - min.y);
        context.globalAlpha = 1;
      }
      if (row.current) {
        context.strokeStyle = "rgb(255 255 255 / 90%)";
        context.lineWidth = 2 / scale;
        context.strokeRect(min.x, min.y, max.x - min.x, max.y - min.y);
      }
    }

    /* Which slice of how many, which is the one number that cannot be read off
       the drawing itself. */
    context.fillStyle = "rgb(255 255 255 / 70%)";
    context.font = `${11 / scale}px sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(
      `${plane().toUpperCase()}  ${sliceAt() + 1} / ${sliceCount()}`,
      layout.strip.at.x,
      layout.strip.at.y - 8 / scale,
    );
  };

  let queued = false;
  const draw = () => {
    if (queued) {
      return;
    }
    queued = true;
    queueMicrotask(() => {
      queued = false;
      render();
    });
  };

  createEffect(
    () => {
      // Read every value the drawing is made of, so a change to any of them is
      // a change to the picture.
      volume();
      palette();
      slice();
      plane();
      sliceAt();
      controller.transform();
      controller.stroke();
      return undefined;
    },
    () => {
      draw();
    },
  );

  onSettled(() => {
    // The model says when it has been changed, which is the only account of it
    // a change made inside the model itself can give: a stroke writes into the
    // voxels of the one object holding them rather than replacing it, so
    // nothing the picture is read from here has moved by the time it is read.
    const stopListening = onRender(draw);

    // The canvas is measured by the browser rather than asked, and the watching
    // starts once the tree has settled and there is something to watch.
    const observer = new ResizeObserver(() => {
      setCanvasSize(
        Vector2D.create(
          Math.max(1, canvas.clientWidth),
          Math.max(1, canvas.clientHeight),
        ),
      );
      draw();
    });
    observer.observe(canvas);
    setCanvasSize(
      Vector2D.create(
        Math.max(1, canvas.clientWidth),
        Math.max(1, canvas.clientHeight),
      ),
    );
    draw();

    return () => {
      stopListening();
      observer.disconnect();
    };
  });

  return (
    <div class={styles.container}>
      <canvas
        class={styles.canvas}
        ref={canvas}
        onPointerDown={(event) => {
          canvas.setPointerCapture(event.pointerId);
          void controller.onPointerDown(event);
        }}
        onPointerMove={controller.onPointerMove}
        onPointerUp={() => draw()}
        onPointerCancel={() => draw()}
        onPointerOut={() => {
          controller.onPointerOut();
          draw();
        }}
        onWheel={(event) => {
          controller.onWheel(event);
          draw();
        }}
      />
    </div>
  );
};

export default SliceEditorView;
