import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import * as THREE from "three";
import { SIDE_MASK } from "../constants";
import { StackerContext } from "../context";
import { Bitmap, Vector2D } from "@big-mesh-studios/maths";
import { axisColour, panelLabel, panelTable, sectionLines } from "../panels";
import { sideMaskToCSS } from "../utils/utils";
import { computeGuideMasks } from "./compute-guide-masks";
import { createPixelEditorController } from "./create-pixel-controller";
import styles from "./PixelEditorView.module.css";
import {
  computePanelLabels,
  computePanelPositions,
  computeSliceLayouts,
  computeSliceMarkers,
  LABEL_FONT,
  LABEL_HEIGHT,
  MARKER_RADIUS,
  type Box,
  type SliceMarker,
} from "./side-layout";

interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
}

function fillPath(ctx: CanvasRenderingContext2D, [start, ...path]: Vector2D[]) {
  ctx.beginPath();

  ctx.moveTo(start.x, start.y);

  for (const vector of path) {
    ctx.lineTo(vector.x, vector.y);
  }

  ctx.fill();
}

const PixelEditorView: Component = () => {
  const {
    sides,
    selectedPart,
    doCommand,
    pushUndo,
    onRender,
    dimensions,
    mode,
    palette,
  } = useContext(StackerContext);
  const imageCanvasCache = new WeakMap<Bitmap, ImageCanvasCacheData>();

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [canvasSize, setCanvasSize] = createSignal<THREE.Vector2 | undefined>();

  const panelPositions = createMemo(() =>
    computePanelPositions(selectedPart(), dimensions()),
  );
  const panelLabels = createMemo(() =>
    computePanelLabels(selectedPart(), panelPositions()),
  );
  const sliceLayouts = createMemo(() =>
    computeSliceLayouts(selectedPart(), dimensions()),
  );
  const sliceMarkers = createMemo(() =>
    computeSliceMarkers(selectedPart(), dimensions(), panelPositions()),
  );

  const controller = createPixelEditorController({
    canvas,
    panelPositions,
    panelLabels,
    sliceLayouts,
    sliceMarkers,
    doCommand,
    pushUndo,
  });

  const createImageCanvasCacheEntry = (bitmap: Bitmap) => {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    const imageCanvasCacheData = {
      canvas,
      ctx,
      image: new ImageData(bitmap.width, bitmap.height),
    };
    imageCanvasCache.set(bitmap, imageCanvasCacheData);
    return imageCanvasCacheData;
  };

  const renderGuide = ({
    ctx,
    side,
    guide,
    sidePosition,
    kind,
    scale,
  }: {
    ctx: CanvasRenderingContext2D;
    side: Bitmap;
    guide: Uint8Array;
    sidePosition: Vector2D;
    kind: "inner" | "outer";
    scale: number;
  }) => {
    for (let gy = 0; gy < side.height; ++gy) {
      for (let gx = 0; gx < side.width; ++gx) {
        const index = gy * side.width + gx;
        const sideMask = guide[index];

        if (sideMask === 0) {
          continue;
        }

        if (
          sideMask === 0b001 || sideMask === 0b010 || sideMask === 0b100
            ? kind === "outer"
            : kind === "inner"
        ) {
          if (Bitmap.isEmpty(side, gx, gy)) {
            ctx.strokeStyle = sideMaskToCSS(sideMask);
            ctx.lineWidth = 0.25 / scale;
            ctx.strokeRect(sidePosition.x + gx, sidePosition.y + gy, 1.0, 1.0);
          }
        }
      }
    }
  };

  /**
   * A box filled in `colour` with `text` standing in the middle of it, which is
   * what a panel's name and a slice's number are both shown as.
   */
  const fillLabel = (
    ctx: CanvasRenderingContext2D,
    box: Box,
    text: string,
    colour: string,
    scale: number,
  ) => {
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;

    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1 / scale;
    ctx.fillRect(box.min.x, box.min.y, width, height);
    ctx.strokeRect(box.min.x, box.min.y, width, height);

    ctx.font = LABEL_FONT;
    const metrics = ctx.measureText(text);

    ctx.fillStyle = "oklch(23.26% .014 253.1)";
    ctx.fillText(
      text,
      box.min.x + 0.5 * (width - metrics.width),
      box.min.y + 0.5 * height + metrics.actualBoundingBoxAscent / 2,
    );
  };

  /**
   * A round `colour` with `text` standing in the middle of it, which is how a
   * slice's number is shown beside the cut it belongs to: a thing to take hold
   * of rather than a thing drawn on, and round so it says so.
   */
  const middleOf = (box: Box) => ({
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
  });

  /**
   * The line a cut is drawn as, carried on past the edge of the panel and out
   * to the number standing for it, so that the two are one line.
   */
  const strokeMarkerLine = (
    ctx: CanvasRenderingContext2D,
    marker: SliceMarker,
    colour: string,
    scale: number,
  ) => {
    const middle = middleOf(marker.box);

    ctx.strokeStyle = colour;
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.moveTo(marker.at.x, marker.at.y);
    ctx.lineTo(middle.x, middle.y);
    ctx.stroke();
  };

  const fillMarker = (
    ctx: CanvasRenderingContext2D,
    box: Box,
    text: string,
    colour: string,
  ) => {
    const middle = middleOf(box);

    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(middle.x, middle.y, MARKER_RADIUS, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = LABEL_FONT;
    const metrics = ctx.measureText(text);

    ctx.fillStyle = "oklch(23.26% .014 253.1)";
    ctx.fillText(
      text,
      middle.x - metrics.width / 2,
      middle.y + metrics.actualBoundingBoxAscent / 2,
    );
  };

  let ctx: CanvasRenderingContext2D | undefined | null;
  const render = () => {
    untrack(() => {
      ctx ??= canvas()?.getContext("2d");

      if (!ctx) {
        return;
      }

      const _canvasSize = canvasSize();
      if (_canvasSize === undefined) {
        return;
      }

      const _pan = controller.pan();
      const _scale = controller.scale();
      const _overlayDrawing = controller.overlayDrawing();
      const guides = computeGuideMasks(sides());

      ctx.clearRect(0, 0, _canvasSize.x, _canvasSize.y);
      ctx.save();
      ctx.scale(_scale, _scale);
      ctx.translate(-_pan.x, -_pan.y);

      const table = panelTable(selectedPart());

      for (const panelKind of table.kinds) {
        const side = table.bitmap(panelKind);
        const sidePosition = panelPositions()[panelKind];
        const sideKind = table.side(panelKind);

        if (
          side === undefined ||
          sidePosition === undefined ||
          sideKind === undefined
        ) {
          continue;
        }

        const label = panelLabel(selectedPart(), panelKind);

        const imageCanvasCacheData =
          imageCanvasCache.get(side) ?? createImageCanvasCacheEntry(side);
        Bitmap.toImageData(side, palette(), imageCanvasCacheData.image);
        imageCanvasCacheData.ctx.putImageData(imageCanvasCacheData.image, 0, 0);

        const lastImageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          imageCanvasCacheData.canvas,
          sidePosition.x,
          sidePosition.y,
        );
        ctx.imageSmoothingEnabled = lastImageSmoothingEnabled;

        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = 1 / _scale;

        if (_scale >= 5.0) {
          const y1 = sidePosition.y;
          const y2 = y1 + side.height;

          ctx.save();
          ctx.beginPath();

          for (let i = 0; i < side.width; ++i) {
            const x = sidePosition.x + i;
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
          }

          const x1 = sidePosition.x;
          const x2 = sidePosition.x + side.width;

          for (let i = 0; i < side.height; ++i) {
            const y = sidePosition.y + i;
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
          }

          ctx.stroke();
          ctx.restore();
        }

        const guide = panelKind === sideKind ? guides[sideKind] : undefined;

        if (guide !== undefined) {
          renderGuide({
            ctx,
            side,
            guide,
            sidePosition,
            kind: "outer",
            scale: _scale,
          });
          renderGuide({
            ctx,
            side,
            guide,
            sidePosition,
            kind: "inner",
            scale: _scale,
          });
        }

        // Every cut standing through what is drawn on this panel, in the
        // colour of the axis it cuts across, so a panel shows where the part
        // is cut as well as what is drawn on it.
        for (const cut of sectionLines(
          selectedPart(),
          panelKind,
          dimensions(),
        )) {
          ctx.strokeStyle = axisColour(cut.axis);
          ctx.lineWidth = 2 / _scale;
          ctx.beginPath();

          if (cut.along === "x") {
            ctx.moveTo(sidePosition.x + cut.line, sidePosition.y);
            ctx.lineTo(sidePosition.x + cut.line, sidePosition.y + side.height);
          } else {
            ctx.moveTo(sidePosition.x, sidePosition.y + cut.line);
            ctx.lineTo(sidePosition.x + side.width, sidePosition.y + cut.line);
          }

          ctx.stroke();
        }

        const sideColor = sideMaskToCSS(SIDE_MASK[sideKind]);

        ctx.lineWidth = 1 / _scale;
        ctx.strokeStyle = sideColor;
        ctx.strokeRect(sidePosition.x, sidePosition.y, side.width, side.height);

        ctx.fillStyle = sideColor;

        ctx.font = LABEL_FONT;
        const metrics = ctx.measureText(label);

        // How far the label reaches past the panel it names, so that a name
        // longer than the panel is wide still has a box around it: half a cell
        // of clear space either side of the writing and no more.
        const overflow = Math.max(Math.ceil(metrics.width) + 1 - side.width, 0);

        ctx.fillRect(
          sidePosition.x - overflow / 2,
          sidePosition.y + side.height,
          side.width + overflow,
          LABEL_HEIGHT,
        );
        ctx.strokeRect(
          sidePosition.x - overflow / 2,
          sidePosition.y + side.height,
          side.width + overflow,
          LABEL_HEIGHT,
        );

        ctx.fillStyle = "oklch(23.26% .014 253.1)";

        ctx.fillText(
          label,
          sidePosition.x + 0.5 * (side.width - metrics.width),
          sidePosition.y +
            side.height +
            metrics.actualBoundingBoxAscent / 2 +
            LABEL_HEIGHT / 2,
        );

        if (mode() === "Idle") {
          ctx.fillStyle = sideColor;

          fillPath(ctx, [
            sidePosition,
            { x: sidePosition.x + 1, y: sidePosition.y },
            { x: sidePosition.x, y: sidePosition.y + 1 },
          ]);

          fillPath(ctx, [
            { x: sidePosition.x + side.width, y: sidePosition.y },
            { x: sidePosition.x + side.width - 1, y: sidePosition.y },
            { x: sidePosition.x + side.width, y: sidePosition.y + 1 },
          ]);

          fillPath(ctx, [
            { x: sidePosition.x, y: sidePosition.y + side.height },
            { x: sidePosition.x + 1, y: sidePosition.y + side.height },
            { x: sidePosition.x, y: sidePosition.y + side.height - 1 },
          ]);

          fillPath(ctx, [
            { x: sidePosition.x + side.width, y: sidePosition.y + side.height },
            {
              x: sidePosition.x + side.width - 1,
              y: sidePosition.y + side.height,
            },
            {
              x: sidePosition.x + side.width,
              y: sidePosition.y + side.height - 1,
            },
          ]);
        }
      }

      // Each slice stands in a dashed box of its own, in the colour of the axis
      // it cuts across, with its number on a tab at the corner: what is inside
      // the box is one cut through the part, not two more sides of it.
      for (const slice of sliceLayouts()) {
        const colour = axisColour(slice.axis);

        ctx.strokeStyle = colour;
        ctx.lineWidth = 1 / _scale;
        ctx.setLineDash([1 / _scale, 1 / _scale]);
        ctx.strokeRect(
          slice.box.min.x,
          slice.box.min.y,
          slice.box.max.x - slice.box.min.x,
          slice.box.max.y - slice.box.min.y,
        );
        ctx.setLineDash([]);

        fillLabel(ctx, slice.label, slice.number, colour, _scale);
        // At the corner opposite its number: what takes the cut away again.
        fillLabel(ctx, slice.remove, "×", colour, _scale);
      }

      // The same number again, standing outside the panels the cut crosses, so
      // a cut seen in a drawing can be followed to the faces it reveals. Every
      // line is drawn before any number, so a line reaching a number in the far
      // lane passes under the one in the near lane rather than over it.
      for (const marker of sliceMarkers()) {
        strokeMarkerLine(ctx, marker, axisColour(marker.axis), _scale);
      }

      for (const marker of sliceMarkers()) {
        fillMarker(ctx, marker.box, marker.number, axisColour(marker.axis));
      }

      if (_overlayDrawing) {
        _overlayDrawing(ctx);
      }

      ctx.restore();
    });
  };

  queueMicrotask(() => onRender(render));

  onSettled(() => {
    const _canvas = canvas();

    if (_canvas === undefined) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      const rect = _canvas.getBoundingClientRect();
      _canvas.width = rect.width;
      _canvas.height = rect.height;
      setCanvasSize(new THREE.Vector2(rect.width, rect.height));
    });
    resizeObserver.observe(_canvas);

    return () => {
      resizeObserver.unobserve(_canvas);
      resizeObserver.disconnect();
    };
  });

  createEffect(
    () => [
      canvasSize(),
      controller.pan(),
      controller.scale(),
      controller.overlayDrawing(),
      mode(),
    ],
    () => render(),
  );

  return (
    <div class={styles.container}>
      <canvas
        class={styles.canvas}
        ref={setCanvas}
        style={{ cursor: controller.cursor() }}
        onPointerDown={controller.onPointerDown}
        onPointerMove={controller.onPointerMove}
        onPointerUp={controller.onPointerUp}
        onPointerCancel={controller.onPointerCancel}
        onPointerOut={controller.onPointerOut}
        onTouchStart={(event) => event.preventDefault()}
        onWheel={controller.onWheel}
      />
    </div>
  );
};

export default PixelEditorView;
