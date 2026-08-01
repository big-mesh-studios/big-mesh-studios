import { Component, createEffect, createMemo, createSignal, createStore, latest, onSettled, untrack } from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { Mode, ModeParams } from "./Mode";
import { createIdleMode } from "./modes/IdleMode";
import { createDrawMode } from "./modes/DrawMode";
import { Effect } from "./Effect";

const PixelEditorView: Component<{}> = (props) => {
  let frontViewImageData = new ImageData(32, 32);
  let leftViewImageData = new ImageData(32, 32);
  let rightViewImageData = new ImageData(32, 32);
  let backViewImageData = new ImageData(32, 32);
  let topViewImageData = new ImageData(32, 32);
  let bottomViewImageData = new ImageData(32, 32);
  let [ state, setState, ] = createStore<{
    mousePos: THREE.Vector2 | undefined,
    pointerDownCount: number,
    mkMode: (modeParams: ModeParams) => Mode,
    images: {
      label: "Front" | "Left" | "Right" | "Back" | "Top" | "Bottom",
      pos: THREE.Vector2,
      data: ImageData,
    }[],
  }>({
    mousePos: undefined,
    pointerDownCount: 0,
    mkMode: createIdleMode,
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
  });
  let pointersDownByIdSet = new Set<number>();
  let setMkMode = (mkMode: (modeParams: ModeParams) => Mode) => {
    setState((s) => {
      s.mkMode = mkMode;
    });
  };
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  let [ ctx, setCtx, ] = createSignal<CanvasRenderingContext2D>();
  let [ canvasSize, setCanvasSize, ] = createSignal<THREE.Vector2 | undefined>();
  let [ pan, setPan, ] = createSignal(new THREE.Vector2(-10.0, -10.0));
  let [ scale, setScale, ] = createSignal(8);
  let worldPtToScreenPt = (pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 => {
    out ??= new THREE.Vector2();
    out.copy(pt);
    out.sub(pan());
    out.multiplyScalar(scale());
    return out;
  };
  let screenPtToWorldPt = (pt: THREE.Vector2, out?: THREE.Vector2): THREE.Vector2 => {
    out ??= new THREE.Vector2();
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };
  let doEffect = (effect: Effect) => untrack(() => {
    switch (effect.type) {
      case "NoOperation": {
        break;
      }
      case "WritePixel": {
        let { x, y, colour, } = effect;
        let colour2 = new THREE.Color(colour);
        let r = Math.max(0, Math.min(255, Math.round(colour2.r * 255.0)));
        let g = Math.max(0, Math.min(255, Math.round(colour2.g * 255.0)));
        let b = Math.max(0, Math.min(255, Math.round(colour2.b * 255.0)));
        for (let image of state.images) {
          let pos = image.pos;
          let width = image.data.width;
          let height = image.data.height;
          if (pos.x > x || pos.y > y || pos.x + width <= x || pos.y + height <= y) {
            continue;
          }
          let localX = x - pos.x;
          let localY = y - pos.y;
          let offset = (localY * width + localX) << 2;
          image.data.data[offset + 0] = r;
          image.data.data[offset + 1] = g;
          image.data.data[offset + 2] = b;
          image.data.data[offset + 3] = 255;
          render();
          break;
        }
        break;
      }
      case "ErasePixel": {
        let { x, y, } = effect;
        for (let image of state.images) {
          let pos = image.pos;
          let width = image.data.width;
          let height = image.data.height;
          if (pos.x > x || pos.y > y || pos.x + width <= x || pos.y + height <= y) {
            continue;
          }
          let localX = x - pos.x;
          let localY = y - pos.y;
          let offset = (localY * width + localX) << 2;
          image.data.data[offset + 0] = 0;
          image.data.data[offset + 1] = 0;
          image.data.data[offset + 2] = 0;
          image.data.data[offset + 3] = 0;
          render();
          break;
        }
        break;
      }
      default: {
        let x: never = effect;
        throw new Error(`Unreachable ${x}`);
      }
    }
  });
  let imageCanvasCache = new WeakMap<ImageData, {
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  }>();
  let modeParams: ModeParams = {
    mousePos: () => state.mousePos,
    pointerDownCount: () => state.pointerDownCount,
    screenPtToWorldPt,
    worldPtToScreenPt,
    images: () => state.images,
    doEffect,
  };
  let mode = createMemo(() => {
    let mkMode = state.mkMode;
    return untrack(() => mkMode(modeParams));
  });
  let activeModeButton = createMemo(() => mode().activeModeButton?.());
  let overlayDrawing = createMemo(() => mode().overlayDrawing?.());
  let disablePanZoom = createMemo(() => mode().disablePanZoom?.() ?? false);
  onSettled(() => {
    let canvas2 = canvas();
    if (canvas2 === undefined) {
      return;
    }
    setCtx(canvas2.getContext("2d") ?? undefined);
    let resizeObserver = new ResizeObserver(() => {
      let rect = canvas2.getBoundingClientRect();
      canvas2.width = rect.width;
      canvas2.height = rect.height;
      setCanvasSize(new THREE.Vector2(
        rect.width,
        rect.height,
      ));
    });
    resizeObserver.observe(canvas2);
    return () => {
      resizeObserver.unobserve(canvas2);
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

  let render = () => untrack(() => {
    let ctx2 = ctx();
    if (ctx2 === undefined) {
      return;
    }
    let canvasSize2 = canvasSize();
    if (canvasSize2 === undefined) {
      return;
    }
    let pan2 = pan();
    let scale2 = scale();
    let overlayDrawing2 = overlayDrawing();
    ctx2.clearRect(0, 0, canvasSize2.x, canvasSize2.y);
    ctx2.save();
    ctx2.scale(scale2, scale2);
    ctx2.translate(-pan2.x, -pan2.y);
    ctx2.fillStyle = "red";
    ctx2.strokeStyle = "red";
    ctx2.lineWidth = 1 / scale2;
    for (let image of state.images) {
      let imageCanvasCache2 = imageCanvasCache.get(image.data);
      if (imageCanvasCache2 === undefined) {
        let canvas3 = document.createElement("canvas");
        canvas3.width = image.data.width;
        canvas3.height = image.data.height;
        let ctx3 = canvas3.getContext("2d")!;
        imageCanvasCache2 = {
          canvas: canvas3,
          ctx: ctx3,
        };
        imageCanvasCache.set(image.data, imageCanvasCache2);
      }
      imageCanvasCache2.ctx.putImageData(image.data, 0, 0);
      let lastImageSmoothingEnabled = ctx2.imageSmoothingEnabled;
      ctx2.imageSmoothingEnabled = false;
      ctx2.drawImage(
        imageCanvasCache2.canvas,
        image.pos.x,
        image.pos.y,
      );
      ctx2.imageSmoothingEnabled = lastImageSmoothingEnabled;
      ctx2.strokeRect(image.pos.x, image.pos.y, image.data.width, image.data.height);
      if (scale2 >= 5.0) {
        let a = Math.min(1.0, (scale2 - 5.0) / 10.0);
        ctx2.save();
        ctx2.strokeStyle = `rgba(255,0,0,${a})`;
        ctx2.beginPath();
        let y1 = image.pos.y;
        let y2 = y1 + image.data.height;
        for (let i = 0; i < image.data.width; ++i) {
          let x = image.pos.x + i;
          ctx2.moveTo(x, y1);
          ctx2.lineTo(x, y2);
        }
        let x1 = image.pos.x;
        let x2 = image.pos.x + image.data.width;
        for (let i = 0; i < image.data.height; ++i) {
          let y = image.pos.y + i;
          ctx2.moveTo(x1, y);
          ctx2.lineTo(x2, y);
        }
        ctx2.stroke();
        ctx2.restore();
      }
      ctx2.font = "5px sans-serif";
      ctx2.fillStyle = "grey";
      let metrics = ctx2.measureText(image.label);
      ctx2.fillText(
        image.label,
        image.pos.x + 0.5 * (image.data.width - metrics.width),
        image.pos.y + image.data.height + metrics.actualBoundingBoxAscent + 1.0,
      );
    }
    if (overlayDrawing2) {
      overlayDrawing2(ctx2);
    }
    ctx2.restore();
  });

  let panScaleControllerSetters = {
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
  let {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerMove,
    onWheel,
  } = createPanScaleControl({
    target: canvas,
    panX: () => pan().x,
    panY: () => pan().y,
    scale,
    onUpdate: (fn) => {
      fn(panScaleControllerSetters);
    },
    disable: disablePanZoom,
  });

  {
    let onPointerDown2 = onPointerDown;
    onPointerDown = (e: PointerEvent) => {
      pointersDownByIdSet.add(e.pointerId);
      setState((s) => {
        s.pointerDownCount = pointersDownByIdSet.size;
      });
      onPointerDown2(e);
    };
  }
  {
    let onPointerUp2 = onPointerUp;
    onPointerUp = (e: PointerEvent) => {
      pointersDownByIdSet.delete(e.pointerId);
      setState((s) => {
        s.pointerDownCount = pointersDownByIdSet.size;
      });
      onPointerUp2(e);
    };
  }
  {
    let onPointerCancel2 = onPointerCancel;
    onPointerCancel = (e: PointerEvent) => {
      pointersDownByIdSet.delete(e.pointerId);
      setState((s) => {
        s.pointerDownCount = pointersDownByIdSet.size;
      });
      onPointerCancel2(e);
    };
  }
  {
    let onPointerMove2 = onPointerMove;
    onPointerMove = (e: PointerEvent) => {
      onPointerMove2(e);
      let canvas2 = canvas();
      if (canvas2 === undefined) {
        return;
      }
      let rect = canvas2.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      setState((s) => {
        s.mousePos = new THREE.Vector2(x, y);
      });
    };
  }

  let onPointerOut = (_e: PointerEvent) => {
    setState((s) => {
      s.mousePos = undefined;
    });
  };
  
  return (
    <div
      style={{
        "position": "relative",
        "width": "100%",
        "height": "100%",
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
        onWheel={onWheel}
      />
      <div
        class="p-1"
        style={{
          "position": "absolute",
          "left": "0",
          "top": "0",
        }}
      >
        <div role="tablist" class="tabs tabs-box">
          <a
            role="tab"
            class={{
              "tab": true,
              "tab-active": activeModeButton() === "Idle"
            }}
            onClick={() => {
              setMkMode(createIdleMode);
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
              setMkMode((modeParams) => createDrawMode({ erase: false, modeParams, }));
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
              setMkMode((modeParams) => createDrawMode({ erase: true, modeParams, }));
            }}
          >
            <i class="fa-solid fa-eraser"/>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;

