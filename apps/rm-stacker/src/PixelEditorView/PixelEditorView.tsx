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
import { Vector2D } from "../maths";
import { keysOf, sideMaskToCSS } from "../utils";
import { computeGuideMasks } from "./compute-guide-masks";
import { createPixelEditorController } from "./create-pixel-controller";
import styles from "./PixelEditorView.module.css";
import { computeSidePositions, LABEL_HEIGHT } from "./side-layout";

interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
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
  const { sides, doCommand, pushUndo, onRender, dimensions, mode } = useContext(StackerContext);
  const imageCanvasCache = new WeakMap<ImageData, ImageCanvasCacheData>();

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [canvasSize, setCanvasSize] = createSignal<THREE.Vector2 | undefined>();

  const sidePositions = createMemo(() => computeSidePositions(dimensions()));

  const controller = createPixelEditorController({
    canvas,
    sidePositions,
    doCommand,
    pushUndo,
  });

  const createImageCanvasCacheEntry = (image: ImageData) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    const imageCanvasCacheData = {
      canvas: canvas,
      ctx: ctx,
    };
    imageCanvasCache.set(image, imageCanvasCacheData);
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
    side: ImageData;
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
          const alpha = side.data[(index << 2) + 3];

          if (!alpha) {
            ctx.strokeStyle = sideMaskToCSS(sideMask);
            ctx.lineWidth = 0.25 / scale;
            ctx.strokeRect(sidePosition.x + gx, sidePosition.y + gy, 1.0, 1.0);
          }
        }
      }
    }
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

      for (const sideKind of keysOf(sides())) {
        const side = sides()[sideKind];
        const sidePosition = sidePositions()[sideKind];

        const imageCanvasCacheData =
          imageCanvasCache.get(side) ?? createImageCanvasCacheEntry(side);
        imageCanvasCacheData.ctx.putImageData(side, 0, 0);

        const lastImageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imageCanvasCacheData.canvas, sidePosition.x, sidePosition.y);
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

        const guide = guides[sideKind];

        if (guide !== undefined) {
          renderGuide({ ctx, side, guide, sidePosition, kind: "outer", scale: _scale });
          renderGuide({ ctx, side, guide, sidePosition, kind: "inner", scale: _scale });
        }

        const sideColor = sideMaskToCSS(SIDE_MASK[sideKind]);

        ctx.lineWidth = 1 / _scale;
        ctx.strokeStyle = sideColor;
        ctx.strokeRect(sidePosition.x, sidePosition.y, side.width, side.height);

        ctx.fillStyle = sideColor;

        ctx.font = "1.75px sans-serif";
        const metrics = ctx.measureText(sideKind);

        const overflow = Math.max(Math.ceil(metrics.width) + 2 - side.width, 0);

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
          sideKind,
          sidePosition.x + 0.5 * (side.width - metrics.width),
          sidePosition.y + side.height + metrics.actualBoundingBoxAscent / 2 + LABEL_HEIGHT / 2,
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
            { x: sidePosition.x + side.width - 1, y: sidePosition.y + side.height },
            { x: sidePosition.x + side.width, y: sidePosition.y + side.height - 1 },
          ]);
        }
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
    () => [canvasSize(), controller.pan(), controller.scale(), controller.overlayDrawing(), mode()],
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
        onTouchStart={event => event.preventDefault()}
        onWheel={controller.onWheel}
      />
    </div>
  );
};

export default PixelEditorView;
