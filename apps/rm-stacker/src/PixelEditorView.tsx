import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  createTrackedEffect,
  latest,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { ModeKind, SideKind } from "./types";
import { Effect } from "./Effect";
import Palette from "./Palette";
import { StackerContext } from "./stacker-context";
import { Sides } from "./types";
import { load, save } from "./load-save";
import { fileOpen, fileSave, FileWithHandle } from "browser-fs-access";

interface ImageCanvasCacheData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

type Coordinates = Record<keyof Sides, { x: number; y: number }>;

const OPPOSING_KINDS = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
} as const;

const getOpposingOffset = (
  kind: SideKind,
  coordinate: { x: number; y: number },
  side: ImageData,
) => {
  if (kind === "top" || kind === "bottom") {
    const opposingY = side.height - coordinate.y - 1;
    return (opposingY * side.width + coordinate.x) << 2;
  }

  const opposingX = side.width - coordinate.x - 1;
  return (coordinate.y * side.width + opposingX) << 2;
};

const findCollidingSide = (
  position: { x: number; y: number },
  sides: Sides,
  coordinates: Coordinates,
) => {
  for (const kind in sides) {
    const coordinate = coordinates[kind as SideKind];
    const side = sides[kind as SideKind];
    if (
      coordinate.x <= position.x &&
      coordinate.y <= position.y &&
      coordinate.x + side.width > position.x &&
      coordinate.y + side.height > position.y
    ) {
      return { side, coordinate, kind: kind as SideKind };
    }
  }
};

const createPixelEditorController = ({
  canvas,
  mode,
  selectedColour,
  coordinates,
  onEffect,
}: {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  mode: Accessor<ModeKind>;
  selectedColour: Accessor<string | undefined>;
  coordinates: Accessor<Coordinates>;
  onEffect(): void;
}) => {
  const { store, updateVoxels } = useContext(StackerContext);

  const [pan, setPan] = createSignal(new THREE.Vector2(-10.0, -10.0));
  const [scale, setScale] = createSignal(8);
  const [pointerids, setPointerids] = createSignal(new Set<number>(), { equals: false });
  const [mousePos, setMousePos] = createSignal<THREE.Vector2>();

  const panScaleControllerSetters = {
    setPanX: (value: number) => {
      setPan(p => new THREE.Vector2(value, p.y));
    },
    setPanY: (value: number) => {
      setPan(p => new THREE.Vector2(p.x, value));
    },
    setScale,
  };

  const panScaleControl = createPanScaleControl({
    target: canvas,
    scale,
    panX: () => pan().x,
    panY: () => pan().y,
    onUpdate: fn => fn(panScaleControllerSetters),
    disable: () => mode() !== "Idle",
  });

  const screenToWorld = (pt: THREE.Vector2, out = new THREE.Vector2()): THREE.Vector2 => {
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };

  const mouseWorldPos = createMemo<THREE.Vector2 | undefined>(previous => {
    if (previous && mode() === "Idle") {
      return previous;
    }

    const _mousePos = mousePos();
    if (_mousePos === undefined) {
      return undefined;
    }

    const worldPos = screenToWorld(_mousePos);
    if (worldPos === undefined) {
      return undefined;
    }

    worldPos.x = Math.round(worldPos.x - 0.5);
    worldPos.y = Math.round(worldPos.y - 0.5);

    return worldPos;
  });

  const doEffect = (effect: Effect) => {
    return untrack(() => {
      switch (effect.type) {
        case "NoOperation": {
          break;
        }
        case "WritePixel": {
          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            break;
          }

          const { x, y, colour } = effect;
          const { coordinate, side, kind } = result;

          const colour2 = new THREE.Color(colour);
          colour2.convertLinearToSRGB();

          const r = Math.max(0, Math.min(255, Math.round(colour2.r * 255.0)));
          const g = Math.max(0, Math.min(255, Math.round(colour2.g * 255.0)));
          const b = Math.max(0, Math.min(255, Math.round(colour2.b * 255.0)));

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          side.data[offset + 0] = r;
          side.data[offset + 1] = g;
          side.data[offset + 2] = b;
          side.data[offset + 3] = 255;

          const opposingKind = OPPOSING_KINDS[kind];
          const opposingOffset = getOpposingOffset(kind, { x: localX, y: localY }, side);

          if (!store.sides[opposingKind].data[opposingOffset + 3]) {
            store.sides[opposingKind].data[opposingOffset + 0] = r;
            store.sides[opposingKind].data[opposingOffset + 1] = g;
            store.sides[opposingKind].data[opposingOffset + 2] = b;
            store.sides[opposingKind].data[opposingOffset + 3] = 255;
          }

          updateVoxels();
          onEffect();

          break;
        }
        case "ErasePixel": {
          const { x, y } = effect;

          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            break;
          }

          const { coordinate, side, kind } = result;

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          side.data[offset + 0] = 0;
          side.data[offset + 1] = 0;
          side.data[offset + 2] = 0;
          side.data[offset + 3] = 0;

          const opposingKind = OPPOSING_KINDS[kind];
          const opposingOffset = getOpposingOffset(kind, { x: localX, y: localY }, side);

          store.sides[opposingKind].data[opposingOffset + 0] = 0;
          store.sides[opposingKind].data[opposingOffset + 1] = 0;
          store.sides[opposingKind].data[opposingOffset + 2] = 0;
          store.sides[opposingKind].data[opposingOffset + 3] = 0;

          updateVoxels();
          onEffect();

          break;
        }
        default: {
          const x: never = effect;
          throw new Error(`Unreachable ${x}`);
        }
      }
    });
  };

  createTrackedEffect(() => {
    if (mode() === "Draw" || mode() === "Erase") {
      createEffect(
        () => [mouseWorldPos(), pointerids().size] as const,
        ([mousePixelPos, pointerDownCount]) => {
          if (mousePixelPos === undefined) {
            return;
          }

          if (pointerDownCount !== 1) {
            return;
          }

          switch (mode()) {
            case "Erase":
              doEffect(Effect.erasePixel(mousePixelPos.x, mousePixelPos.y));
              return;
            case "Draw":
              const _selectedColour = untrack(selectedColour);
              if (_selectedColour === undefined) {
                return;
              }
              doEffect(Effect.writePixel(mousePixelPos.x, mousePixelPos.y, _selectedColour));
              return;
          }
        },
      );
    }
  });

  return {
    pan,
    scale,
    overlayDrawing() {
      if (mode() === "Idle") {
        return;
      }

      const pixelPos = mouseWorldPos();

      if (!pixelPos) {
        return;
      }

      return (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = "green";
        ctx.fillRect(pixelPos.x, pixelPos.y, 1.0, 1.0);
      };
    },
    onPointerDown(e: PointerEvent) {
      setPointerids(set => set.add(e.pointerId));
      panScaleControl.onPointerDown(e);
    },
    onPointerUp(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerUp(e);
    },
    onPointerCancel(e: PointerEvent) {
      setPointerids(set => {
        set.delete(e.pointerId);
        return set;
      });
      panScaleControl.onPointerCancel(e);
    },
    onPointerMove(e: PointerEvent) {
      panScaleControl.onPointerMove(e);
      const _canvas = canvas();
      if (_canvas === undefined) {
        return;
      }
      const rect = _canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos(new THREE.Vector2(x, y));
    },
    onPointerOut(_e: PointerEvent) {
      setMousePos();
    },
    onWheel: panScaleControl.onWheel,
  };
};

const PixelEditorView: Component = () => {
  const { store, setStore, updateVoxels } = useContext(StackerContext);
  const imageCanvasCache = new WeakMap<ImageData, ImageCanvasCacheData>();

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [mode, setModeKind] = createSignal<ModeKind>("Idle");

  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);
  const [canvasSize, setCanvasSize] = createSignal<THREE.Vector2 | undefined>();

  const [selectedColourAccessor, setSelectedColourAccessor] = createSignal<
    Accessor<string> | undefined
  >();

  const selectedColour = createMemo(() => selectedColourAccessor()?.());

  const PADDING = 6;
  const coordinates = createMemo(() => {
    return {
      front: new THREE.Vector2(0.0, 0.0),
      left: new THREE.Vector2(-(store.dimensions.depth + PADDING), 0.0),
      right: new THREE.Vector2(store.dimensions.width + PADDING, 0.0),
      back: new THREE.Vector2(store.dimensions.width + store.dimensions.depth + PADDING * 2, 0.0),
      top: new THREE.Vector2(0.0, -(store.dimensions.depth + PADDING)),
      bottom: new THREE.Vector2(0.0, store.dimensions.height + PADDING),
    };
  });

  const controller = createPixelEditorController({
    coordinates,
    mode,
    canvas,
    selectedColour,
    onEffect() {
      render();
    },
  });

  const onLoad = async () => {
    const file = await fileOpen<false>({
      extensions: [".zip"],
      description: "Sprite stack",
      mimeTypes: ["application/zip"],
    });
    const sides = await load(file);
    setStore(s => {
      s.sides = sides;
    });
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

      ctx.clearRect(0, 0, _canvasSize.x, _canvasSize.y);
      ctx.save();
      ctx.scale(_scale, _scale);
      ctx.translate(-_pan.x, -_pan.y);
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1 / _scale;

      for (const key of Object.keys(store.sides)) {
        const side = store.sides[key as keyof typeof store.sides];
        const coordinate = coordinates()[key as keyof typeof store.sides];

        const imageCanvasCacheData =
          imageCanvasCache.get(side) ?? createImageCanvasCacheEntry(side);
        imageCanvasCacheData.ctx.putImageData(side, 0, 0);

        const lastImageSmoothingEnabled = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imageCanvasCacheData.canvas, coordinate.x, coordinate.y);
        ctx.imageSmoothingEnabled = lastImageSmoothingEnabled;
        ctx.strokeRect(coordinate.x, coordinate.y, side.width, side.height);

        if (_scale >= 5.0) {
          const y1 = coordinate.y;
          const y2 = y1 + side.height;
          const a = Math.min(1.0, (_scale - 5.0) / 10.0);

          ctx.save();
          ctx.strokeStyle = `rgba(255,0,0,${a})`;
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

        ctx.font = "5px sans-serif";
        ctx.fillStyle = "grey";
        const metrics = ctx.measureText(key);
        ctx.fillText(
          key,
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
            <Palette ref={ctx => setSelectedColourAccessor(() => ctx.selectedColour)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;
