import { Accessor, Component, createEffect, createMemo, createRenderEffect, createSignal, createStore, latest, onSettled, runWithOwner, untrack } from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { Mode, ModeParams } from "./Mode";
import { createIdleMode } from "./modes/IdleMode";
import { createDrawMode } from "./modes/DrawMode";
import { Effect } from "./Effect";
import Palette from "./Palette";

type SideImage = {
  label: "Front" | "Left" | "Right" | "Back" | "Top" | "Bottom",
  pos: THREE.Vector2,
  data: ImageData,
}

type ImageCanvasCacheData = {
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
}

type ModeFactory = (params: ModeParams) => Mode

const createSquareViewImageData = (imageSize: number, squareSize: number): ImageData => {
  const data = new ImageData(imageSize, imageSize);
  const offsetPx = (imageSize - squareSize) / 2;
  for (let y = 0; y < squareSize; y++) {
    for (let x = 0; x < squareSize; x++) {
      const i = ((offsetPx + y) * imageSize + (offsetPx + x)) << 2;
      data.data[i + 0] = 0;
      data.data[i + 1] = 0;
      data.data[i + 2] = 255;
      data.data[i + 3] = 255;
    }
  }
  return data;
};


const findCollidingSideImage = ({x, y}: {x: number, y: number}, images: SideImage[]) => {
  return images.find(({pos, data: {height, width}}) => (
    pos.x < x && pos.y < y && pos.x + width >= x && pos.y + height >= y
  ))
}

const PixelEditorView: Component<{
  ref?: (ctx: {
    getImages: () => ImageData[],
  }) => void,
  onUpdate():void
}> = (props) => {
  const frontViewImageData = createSquareViewImageData(32, 16);
  const leftViewImageData = createSquareViewImageData(32, 16);
  const rightViewImageData = createSquareViewImageData(32, 16);
  const backViewImageData = createSquareViewImageData(32, 16);
  const topViewImageData = createSquareViewImageData(32, 16);
  const bottomViewImageData = createSquareViewImageData(32, 16);
  const [ state, setState, ] = createStore<{
    mousePos: THREE.Vector2 | undefined,
    pointerDownCount: number,
    modeFactory: ModeFactory,
    images: SideImage[],
    selectedColourAccessor: Accessor<string> | undefined,
  }>({
    mousePos: undefined,
    pointerDownCount: 0,
    modeFactory: createIdleMode,
    images: [
      {
        label: "Front",
        pos: new THREE.Vector2(0.0, 0.0),
        data: frontViewImageData,
      },
      {
        label: "Left",
        pos: new THREE.Vector2(-40.0, 0.0),
        data: leftViewImageData,
      },
      {
        label: "Right",
        pos: new THREE.Vector2(40.0, 0.0),
        data: rightViewImageData,
      },
      {
        label: "Back",
        pos: new THREE.Vector2(80.0, 0.0),
        data: backViewImageData,
      },
      {
        label: "Top",
        pos: new THREE.Vector2(0.0, -40.0),
        data: topViewImageData,
      },
      {
        label: "Bottom",
        pos: new THREE.Vector2(0.0, 40.0),
        data: bottomViewImageData,
      },
    ],
    selectedColourAccessor: undefined,
  });
  const pointersDownByIdSet = new Set<number>();
  const setModeFactory = (modeFactory: ModeFactory) => {
    setState((s) => {
      s.modeFactory = modeFactory;
    });
  };
  const selectedColour = createMemo(() => state.selectedColourAccessor?.());
  const [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  const [ ctx, setCtx, ] = createSignal<CanvasRenderingContext2D>();
  const [ canvasSize, setCanvasSize, ] = createSignal<THREE.Vector2 | undefined>();
  const [ pan, setPan, ] = createSignal(new THREE.Vector2(-10.0, -10.0));
  const [ scale, setScale, ] = createSignal(8);
  const worldPtToScreenPt = (pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 => {
    out ??= new THREE.Vector2();
    out.copy(pt);
    out.sub(pan());
    out.multiplyScalar(scale());
    return out;
  };
  const screenPtToWorldPt = (pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 => {
    out ??= new THREE.Vector2();
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };
  const doEffect = (effect: Effect) => untrack(() => {
    switch (effect.type) {
      case "NoOperation": {
        break;
      }
      case "WritePixel": {
        const { x, y, colour, } = effect;

        const colour2 = new THREE.Color(colour);
        colour2.convertLinearToSRGB();

        const r = Math.max(0, Math.min(255, Math.round(colour2.r * 255.0)));
        const g = Math.max(0, Math.min(255, Math.round(colour2.g * 255.0)));
        const b = Math.max(0, Math.min(255, Math.round(colour2.b * 255.0)));

        const image = findCollidingSideImage(effect, state.images)
        if(!image) {
          break;
        }

        const localX = x - image.pos.x;
        const localY = y - image.pos.y;
        const offset = (localY * image.data.width + localX) << 2;
        image.data.data[offset + 0] = r;
        image.data.data[offset + 1] = g;
        image.data.data[offset + 2] = b;
        image.data.data[offset + 3] = 255;
        render();

        break;
      }
      case "ErasePixel": {
        const { x, y, } = effect;

        const image = findCollidingSideImage(effect, state.images)
        if(!image) {
          break;
        }

        const localX = x - image.pos.x;
        const localY = y - image.pos.y;
        const offset = (localY * image.data.width + localX) << 2;
        image.data.data[offset + 0] = 0;
        image.data.data[offset + 1] = 0;
        image.data.data[offset + 2] = 0;
        image.data.data[offset + 3] = 0;
        render();

        break;
      }
      default: {
        const x: never = effect;
        throw new Error(`Unreachable ${x}`);
      }
    }
  });
  const imageCanvasCache = new WeakMap<ImageData, ImageCanvasCacheData>();
  const modeParams: ModeParams = {
    mousePos: () => state.mousePos,
    pointerDownCount: () => state.pointerDownCount,
    screenPtToWorldPt,
    worldPtToScreenPt,
    images: () => state.images,
    doEffect,
    selectedColour,
    onUpdate: () => props.onUpdate()
  };
  const mode = createMemo(() => {
    const modeFactory = state.modeFactory;
    return untrack(() => modeFactory(modeParams));
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
      setCanvasSize(new THREE.Vector2(
        rect.width,
        rect.height,
      ));
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
      pan(),
      scale(),
      overlayDrawing(),
    ],
    () => {
      render();
    },
  );

  const  createImageCanvasCacheEntry = (image: SideImage) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.data.width;
    canvas.height = image.data.height;
    const ctx = canvas.getContext("2d")!;
    const imageCanvasCacheData = {
      canvas: canvas,
      ctx: ctx,
    };
    imageCanvasCache.set(image.data, imageCanvasCacheData)
    return imageCanvasCacheData
  }

  const render = () => untrack(() => {
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
    for (const image of state.images) {
      const imageCanvasCacheData = imageCanvasCache.get(image.data) ??  createImageCanvasCacheEntry(image)
      imageCanvasCacheData.ctx.putImageData(image.data, 0, 0);
      const lastImageSmoothingEnabled = _ctx.imageSmoothingEnabled;
      _ctx.imageSmoothingEnabled = false;
      _ctx.drawImage(
        imageCanvasCacheData.canvas,
        image.pos.x,
        image.pos.y,
      );
      _ctx.imageSmoothingEnabled = lastImageSmoothingEnabled;
      _ctx.strokeRect(image.pos.x, image.pos.y, image.data.width, image.data.height);
      if (_scale >= 5.0) {
        const a = Math.min(1.0, (_scale - 5.0) / 10.0);
        _ctx.save();
        _ctx.strokeStyle = `rgba(255,0,0,${a})`;
        _ctx.beginPath();
        const y1 = image.pos.y;
        const y2 = y1 + image.data.height;
        for (let i = 0; i < image.data.width; ++i) {
          const x = image.pos.x + i;
          _ctx.moveTo(x, y1);
          _ctx.lineTo(x, y2);
        }
        const x1 = image.pos.x;
        const x2 = image.pos.x + image.data.width;
        for (let i = 0; i < image.data.height; ++i) {
          const y = image.pos.y + i;
          _ctx.moveTo(x1, y);
          _ctx.lineTo(x2, y);
        }
        _ctx.stroke();
        _ctx.restore();
      }
      _ctx.font = "5px sans-serif";
      _ctx.fillStyle = "grey";
      const metrics = _ctx.measureText(image.label);
      _ctx.fillText(
        image.label,
        image.pos.x + 0.5 * (image.data.width - metrics.width),
        image.pos.y + image.data.height + metrics.actualBoundingBoxAscent + 1.0,
      );
    }
    if (_overlayDrawing) {
      _overlayDrawing(_ctx);
    }
    _ctx.restore();
  });

  const panScaleControllerSetters = {
    setPanX: (value: number) => {
      setPan((p) => new THREE.Vector2(value, p.y));
    },
    setPanY: (value: number) => {
      setPan((p) => new THREE.Vector2(p.x, value));
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
    onUpdate: (fn) => {
      fn(panScaleControllerSetters);
    },
    disable: disablePanZoom,
  });

  const onPointerDown = (e: PointerEvent) => {
    pointersDownByIdSet.add(e.pointerId);
    setState((s) => {
      s.pointerDownCount = pointersDownByIdSet.size;
    });
    panScaleControl.onPointerDown(e);
  };
  
  const onPointerUp = (e: PointerEvent) => {
    pointersDownByIdSet.delete(e.pointerId);
    setState((s) => {
      s.pointerDownCount = pointersDownByIdSet.size;
    });
    panScaleControl.onPointerUp(e);
  };
  
  const onPointerCancel = (e: PointerEvent) => {
    pointersDownByIdSet.delete(e.pointerId);
    setState((s) => {
      s.pointerDownCount = pointersDownByIdSet.size;
    });
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
    setState((s) => {
      s.mousePos = new THREE.Vector2(x, y);
    });
  };
  

  const onPointerOut = (_e: PointerEvent) => {
    setState((s) => {
      s.mousePos = undefined;
    });
  };

  createRenderEffect(
    () => props.ref,
    (ref) => {
      if (ref === undefined) {
        return;
      }
      runWithOwner(null, () => {
        ref({
          getImages: () => {
            const imagesByLabel = new Map(state.images.map((image) => [image.label, image.data]));
            return [
              imagesByLabel.get("Front")!,
              imagesByLabel.get("Left")!,
              imagesByLabel.get("Right")!,
              imagesByLabel.get("Back")!,
              imagesByLabel.get("Top")!,
              imagesByLabel.get("Bottom")!,
            ];
          },
        });
      });
    },
  );

  return (
    <div
      style={{
        "position": "relative",
        "width": "100%",
        "height": "100%",
        "overflow": "hidden",
      }}
    >
      <canvas
        class="bg-base-200"
        ref={setCanvas}
        style={{
          "width": "100%",
          "height": "100%",
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
          "position": "absolute",
          "left": "0",
          "top": "0",
          "bottom": "0",
          "overflow": "hidden",
          "display": "flex",
          "flex-direction": "column",
          "pointer-events": "none",
        }}
      >
        <div role="tablist" class="tabs tabs-box" style="pointer-events: auto;">
          <a
            role="tab"
            class={{
              "tab": true,
              "tab-active": activeModeButton() === "Idle"
            }}
            onClick={() => {
              setModeFactory(createIdleMode);
            }}
          >
            <i class="fa-solid fa-up-down-left-right"/>
          </a>
          <a
            role="tab"
            class={{
              "tab": true,
              "tab-active": activeModeButton() === "Draw"
            }}
            onClick={() => {
              setModeFactory((modeParams) => createDrawMode({ erase: false, modeParams, }));
            }}
          >
            <i class="fa-solid fa-pen"/>
          </a>
          <a
            role="tab"
            class={{
              "tab": true,
              "tab-active": activeModeButton() === "Erase"
            }}
            onClick={() => {
              setModeFactory((modeParams) => createDrawMode({ erase: true, modeParams, }));
            }}
          >
            <i class="fa-solid fa-eraser"/>
          </a>
        </div>
        <div style="flex-grow: 1; overflow: hidden;">
          <div style="height: 100%; display: inline-block; pointer-events: auto;">
            <Palette
              ref={(ctx) => {
                setState((s) => {
                  s.selectedColourAccessor = ctx.selectedColour;
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;

