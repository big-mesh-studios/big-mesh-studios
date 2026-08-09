import { fileOpen, fileSave, FileWithHandle } from "browser-fs-access";
import { Component, createEffect, createSignal, onSettled, untrack, useContext } from "solid-js";
import { SIDE_MASK } from "../constants";
import { load, save } from "../load-save";
import Palette from "../Palette";
import { StackerContext } from "../stacker-context";
import { createInitialSides } from "../stacker-store";
import { Dimensions2D, ModeKind, RGBA, Vector2D } from "../types";
import { keysOf, sideMaskToRGBA } from "../utils";
import { computeGuideMasks } from "./compute-guide-masks";
import { createPixelEditorController } from "./create-pixel-controller";

interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const PixelEditorView: Component = () => {
  const {
    store,
    setSides,
    undoRedoManager,
    doCommand,
    pushUndo,
    updateVoxels,
    coordinates,
    onRender,
  } = useContext(StackerContext);
  const imageCanvasCache = new WeakMap<ImageData, ImageCanvasCacheData>();

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [mode, setModeKind] = createSignal<ModeKind>("Idle");
  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);
  const [canvasSize, setCanvasSize] = createSignal<Dimensions2D | undefined>();
  const [selectedColour, setSelectedColour] = createSignal<RGBA | undefined>();

  const controller = createPixelEditorController({
    coordinates,
    mode,
    canvas,
    selectedColour,
    pushUndo,
    doCommand,
  });

  const onLoad = async () => {
    const file = await fileOpen<false>({
      extensions: [".zip"],
      description: "Sprite stack",
      mimeTypes: ["application/zip"],
    });
    const sides = await load(file);
    setSides(sides);
    updateVoxels();
    setFileHandle((file as FileWithHandle).handle ?? null);
    onSettled(() => {
      render();
    });
  };

  const onSave = async () => {
    const blob = await save(store.sides);
    setFileHandle(
      await fileSave(
        blob,
        {
          fileName: "sprite-stack.zip",
          extensions: [".zip"],
          description: "Sprite stack",
        },
        fileHandle(),
      ),
    );
  };

  const onSaveAs = async () => {
    const blob = await save(store.sides);
    setFileHandle(
      await fileSave(blob, {
        fileName: "sprite-stack.zip",
        extensions: [".zip"],
        description: "Sprite stack",
      }),
    );
  };

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
    coordinate,
    kind,
    scale,
  }: {
    ctx: CanvasRenderingContext2D;
    side: ImageData;
    guide: Uint8Array;
    coordinate: Vector2D;
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
            ctx.strokeStyle = sideMaskToRGBA(sideMask, 0.5);
            ctx.lineWidth = 2 / scale;
            ctx.strokeRect(coordinate.x + gx, coordinate.y + gy, 1.0, 1.0);
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
      const guides = computeGuideMasks(store);

      ctx.clearRect(0, 0, _canvasSize.width, _canvasSize.height);
      ctx.save();
      ctx.scale(_scale, _scale);
      ctx.translate(-_pan.x, -_pan.y);
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";

      for (const sideKind of keysOf(store.sides)) {
        const side = store.sides[sideKind];
        const coordinate = coordinates()[sideKind];

        const imageCanvasCacheData =
          imageCanvasCache.get(side) ?? createImageCanvasCacheEntry(side);
        imageCanvasCacheData.ctx.putImageData(side, 0, 0);

        const lastImageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imageCanvasCacheData.canvas, coordinate.x, coordinate.y);
        ctx.imageSmoothingEnabled = lastImageSmoothingEnabled;

        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = 1 / _scale;

        if (_scale >= 5.0) {
          const y1 = coordinate.y;
          const y2 = y1 + side.height;

          ctx.save();
          ctx.beginPath();

          for (let i = 0; i < side.width; ++i) {
            const x = coordinate.x + i;
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
          }

          const x1 = coordinate.x;

          const x2 = coordinate.x + side.width;

          for (let i = 0; i < side.height; ++i) {
            const y = coordinate.y + i;
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
          }

          ctx.stroke();
          ctx.restore();
        }

        const guide = guides[sideKind];

        if (guide !== undefined) {
          renderGuide({ ctx, side, guide, coordinate, kind: "outer", scale: _scale });
          renderGuide({ ctx, side, guide, coordinate, kind: "inner", scale: _scale });
        }

        ctx.lineWidth = 4 / _scale;
        ctx.strokeStyle = sideMaskToRGBA(SIDE_MASK[sideKind]);
        ctx.strokeRect(coordinate.x, coordinate.y, side.width, side.height);

        ctx.font = "5px sans-serif";
        ctx.fillStyle = "grey";
        const metrics = ctx.measureText(sideKind);
        ctx.fillText(
          sideKind,
          coordinate.x + 0.5 * (side.width - metrics.width),
          coordinate.y + side.height + metrics.actualBoundingBoxAscent + 1.0,
        );
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
      setCanvasSize(rect);
    });
    resizeObserver.observe(_canvas);

    return () => {
      resizeObserver.unobserve(_canvas);
      resizeObserver.disconnect();
    };
  });

  createEffect(
    () => [canvasSize(), controller.pan(), controller.scale(), controller.overlayDrawing()],
    () => render(),
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        class="bg-base-200"
        ref={setCanvas}
        style={{
          width: "100%",
          height: "100%",
          "touch-action": "none",
          cursor: controller.cursor(),
        }}
        onPointerDown={controller.onPointerDown}
        onPointerUp={controller.onPointerUp}
        onPointerCancel={controller.onPointerCancel}
        onPointerMove={controller.onPointerMove}
        onPointerOut={controller.onPointerOut}
        onWheel={controller.onWheel}
      />
      <div
        class="p-1"
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          bottom: "0",
          overflow: "hidden",
          display: "flex",
          "flex-direction": "column",
          "pointer-events": "none",
        }}
      >
        <div role="tablist" class="tabs tabs-box" style="pointer-events: auto;">
          <button
            role="button"
            class="tab"
            title="New File"
            onClick={() => {
              if (!window.confirm("Start a new file? This will discard your current work.")) {
                return;
              }
              undoRedoManager.clear();
              setSides(createInitialSides(store.dimensions));

              updateVoxels();
              render();
            }}
          >
            <i class="fa-solid fa-file"></i>
          </button>
          <button
            role="button"
            class="tab"
            onClick={() => {
              undoRedoManager.undo();
            }}
            disabled={!undoRedoManager.hasUndo()}
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
          <button
            role="button"
            class="tab"
            onClick={() => {
              undoRedoManager.redo();
            }}
            disabled={!undoRedoManager.hasRedo()}
          >
            <i class="fa-solid fa-arrow-rotate-right"></i>
          </button>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": mode() === "Idle",
            }}
            onClick={() => setModeKind("Idle")}
          >
            <i class="fa-solid fa-up-down-left-right" />
          </a>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": mode() === "Draw",
            }}
            onClick={() => setModeKind("Draw")}
          >
            <i class="fa-solid fa-pen" />
          </a>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": mode() === "Fill",
            }}
            onClick={() => setModeKind("Fill")}
          >
            <i class="fa-solid fa-fill" />
          </a>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": mode() === "Erase",
            }}
            onClick={() => setModeKind("Erase")}
          >
            <i class="fa-solid fa-eraser" />
          </a>
          <a role="button" class="tab" onClick={onSave}>
            <i class="fa-solid fa-floppy-disk" />
          </a>
          <a role="button" class="tab" onClick={onSaveAs}>
            <span class="relative" title="Save as">
              <i class="fa-solid fa-floppy-disk" />
              <i
                class="fa-solid fa-pen absolute text-[0.6em]"
                style="top: -0.15em; right: -0.3em;"
              />
            </span>
          </a>
          <a role="button" class="tab" onClick={onLoad}>
            <i class="fa-solid fa-folder" />
          </a>
        </div>
        <div class="badge badge-outline badge-sm mt-1" style="pointer-events: auto;">
          {fileHandle()?.name ?? "Untitled"}
        </div>
        <div style="flex-grow: 1; overflow: hidden;">
          <div style="height: 100%; display: inline-block; pointer-events: auto;">
            <Palette onSelect={setSelectedColour} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;
