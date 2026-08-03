import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  latest,
  onSettled,
  untrack,
  useContext,
} from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { ModeFactory, ModeParams, SideKind } from "./types";
import { createIdleMode } from "./modes/IdleMode";
import { createDrawMode } from "./modes/DrawMode";
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

const PixelEditorView: Component = () => {
  const { store, setStore, updateVoxels } = useContext(StackerContext);
  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);

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
  const pointersDownByIdSet = new Set<number>();
  const imageCanvasCache = new WeakMap<ImageData, ImageCanvasCacheData>();

  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [ctx, setCtx] = createSignal<CanvasRenderingContext2D>();
  const [canvasSize, setCanvasSize] = createSignal<THREE.Vector2 | undefined>();
  const [mousePos, setMousePos] = createSignal<THREE.Vector2>();
  const [pointerDownCount, setPointerDownCount] = createSignal<number>(0);
  const [modeFactory, setModeFactory] = createSignal<ModeFactory>(() => createIdleMode);
  const [pan, setPan] = createSignal(new THREE.Vector2(-10.0, -10.0));
  const [scale, setScale] = createSignal(8);
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

  const modeParams: ModeParams = {
    mousePos,
    pointerDownCount,
    selectedColour,
    store,
    doEffect(effect: Effect) {
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

            render();
            updateVoxels();

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

            render();
            updateVoxels();

            break;
          }
          default: {
            const x: never = effect;
            throw new Error(`Unreachable ${x}`);
          }
        }
      });
    },
    screenPtToWorldPt(pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 {
      out ??= new THREE.Vector2();
      out.copy(pt);
      out.multiplyScalar(1.0 / latest(scale));
      out.add(latest(pan));
      return out;
    },
    worldPtToScreenPt(pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 {
      out ??= new THREE.Vector2();
      out.copy(pt);
      out.sub(pan());
      out.multiplyScalar(scale());
      return out;
    },
  };
  const mode = createMemo(() => {
    const _modeFactory = modeFactory();
    return untrack(() => _modeFactory(modeParams));
  });
  const activeModeButton = createMemo(() => mode().activeModeButton?.());
  const overlayDrawing = createMemo(() => mode().overlayDrawing?.());
  const disablePanZoom = createMemo(() => mode().disablePanZoom?.() ?? false);

  onSettled(() => {
    const _canvas = canvas();
    if (_canvas === undefined) {
      return;
    }
    setCtx(_canvas.getContext("2d") ?? undefined);
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
    () => [canvasSize(), pan(), scale(), overlayDrawing()],
    () => {
      render();
    },
  );

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

  const render = () =>
    untrack(() => {
      const _ctx = ctx();
      if (_ctx === undefined) {
        return;
      }
      const _canvasSize = canvasSize();
      if (_canvasSize === undefined) {
        return;
      }
      const _pan = pan();
      const _scale = scale();
      const _overlayDrawing = overlayDrawing();
      _ctx.clearRect(0, 0, _canvasSize.x, _canvasSize.y);
      _ctx.save();
      _ctx.scale(_scale, _scale);
      _ctx.translate(-_pan.x, -_pan.y);
      _ctx.fillStyle = "red";
      _ctx.strokeStyle = "red";
      _ctx.lineWidth = 1 / _scale;

      for (const key of Object.keys(store.sides)) {
        const side = store.sides[key as keyof typeof store.sides];
        const coordinate = coordinates()[key as keyof typeof store.sides];

        const imageCanvasCacheData =
          imageCanvasCache.get(side) ?? createImageCanvasCacheEntry(side);
        imageCanvasCacheData.ctx.putImageData(side, 0, 0);
        const lastImageSmoothingEnabled = _ctx.imageSmoothingEnabled;
        _ctx.imageSmoothingEnabled = false;
        _ctx.drawImage(imageCanvasCacheData.canvas, coordinate.x, coordinate.y);
        _ctx.imageSmoothingEnabled = lastImageSmoothingEnabled;
        _ctx.strokeRect(coordinate.x, coordinate.y, side.width, side.height);
        if (_scale >= 5.0) {
          const a = Math.min(1.0, (_scale - 5.0) / 10.0);
          _ctx.save();
          _ctx.strokeStyle = `rgba(255,0,0,${a})`;
          _ctx.beginPath();
          const y1 = coordinate.y;
          const y2 = y1 + side.height;
          for (let i = 0; i < side.width; ++i) {
            const x = coordinate.x + i;
            _ctx.moveTo(x, y1);
            _ctx.lineTo(x, y2);
          }
          const x1 = coordinate.x;
          const x2 = coordinate.x + side.width;
          for (let i = 0; i < side.height; ++i) {
            const y = coordinate.y + i;
            _ctx.moveTo(x1, y);
            _ctx.lineTo(x2, y);
          }
          _ctx.stroke();
          _ctx.restore();
        }
        _ctx.font = "5px sans-serif";
        _ctx.fillStyle = "grey";
        const metrics = _ctx.measureText(key);
        _ctx.fillText(
          key,
          coordinate.x + 0.5 * (side.width - metrics.width),
          coordinate.y + side.height + metrics.actualBoundingBoxAscent + 1.0,
        );
      }
      if (_overlayDrawing) {
        _overlayDrawing(_ctx);
      }
      _ctx.restore();
    });

  const panScaleControllerSetters = {
    setPanX: (value: number) => {
      setPan(p => new THREE.Vector2(value, p.y));
    },
    setPanY: (value: number) => {
      setPan(p => new THREE.Vector2(p.x, value));
    },
    setScale: (value: number) => {
      setScale(value);
    },
  };

  const panScaleControl = createPanScaleControl({
    target: canvas,
    panX: () => pan().x,
    panY: () => pan().y,
    scale,
    onUpdate: fn => {
      fn(panScaleControllerSetters);
    },
    disable: disablePanZoom,
  });

  const updatePointerDownCount = () => {
    setPointerDownCount(pointersDownByIdSet.size);
  };

  const onPointerDown = (e: PointerEvent) => {
    pointersDownByIdSet.add(e.pointerId);
    updatePointerDownCount();
    panScaleControl.onPointerDown(e);
  };

  const onPointerUp = (e: PointerEvent) => {
    pointersDownByIdSet.delete(e.pointerId);
    updatePointerDownCount();
    panScaleControl.onPointerUp(e);
  };

  const onPointerCancel = (e: PointerEvent) => {
    pointersDownByIdSet.delete(e.pointerId);
    updatePointerDownCount();
    panScaleControl.onPointerCancel(e);
  };

  const onPointerMove = (e: PointerEvent) => {
    panScaleControl.onPointerMove(e);
    const _canvas = canvas();
    if (_canvas === undefined) {
      return;
    }
    const rect = _canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos(new THREE.Vector2(x, y));
  };

  const onPointerOut = (_e: PointerEvent) => {
    setMousePos();
  };

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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        onWheel={panScaleControl.onWheel}
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
              "tab-active": activeModeButton() === "Idle",
            }}
            onClick={() => {
              setModeFactory(() => createIdleMode);
            }}
          >
            <i class="fa-solid fa-up-down-left-right" />
          </a>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": activeModeButton() === "Draw",
            }}
            onClick={() => {
              setModeFactory(
                () => (modeParams: ModeParams) => createDrawMode({ erase: false, modeParams }),
              );
            }}
          >
            <i class="fa-solid fa-pen" />
          </a>
          <a
            role="tab"
            class={{
              tab: true,
              "tab-active": activeModeButton() === "Erase",
            }}
            onClick={() => {
              setModeFactory(
                () => (modeParams: ModeParams) => createDrawMode({ erase: true, modeParams }),
              );
            }}
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
            <Palette
              ref={ctx => {
                setSelectedColourAccessor(() => ctx.selectedColour);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;
