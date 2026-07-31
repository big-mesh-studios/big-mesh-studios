import { Component, createEffect, createMemo, createSignal, createStore, latest, onSettled, untrack } from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "@random-mesh/rm-pan-scale";
import { Mode, ModeParams } from "./Mode";
import { createIdleMode } from "./modes/IdleMode";
import { createDrawMode } from "./modes/DrawMode";

const PixelEditorView: Component<{}> = (props) => {
  let imageData = new ImageData(32, 32);
  let [ state, setState, ] = createStore<{
    mkMode: (modeParams: ModeParams) => Mode,
    images: {
      pos: THREE.Vector2,
      data: ImageData,
    }[],
  }>({
    mkMode: createIdleMode,
    images: [
      {
        pos: new THREE.Vector2(0.0, 0.0),
        data: imageData,
      },
    ],
  });
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
  let modeParams: ModeParams = {
    screenPtToWorldPt,
    worldPtToScreenPt,
    images: () => state.images,
  };
  let mode = createMemo(() => {
    let mkMode = state.mkMode;
    return untrack(() => mkMode(modeParams));
  });
  let activeModeButton = createMemo(() => mode().activeModeButton);
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
    ],
    () => {
      render();
    },
  );

  let render = () => {
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
    ctx2.clearRect(0, 0, canvasSize2.x, canvasSize2.y);
    ctx2.save();
    ctx2.scale(scale2, scale2);
    ctx2.translate(-pan2.x, -pan2.y);
    ctx2.fillStyle = "red";
    ctx2.strokeStyle = "red";
    ctx2.lineWidth = 1 / scale2;
    for (let image of state.images) {
      ctx2.putImageData(
        image.data,
        image.pos.x,
        image.pos.y,
      );
      ctx2.strokeRect(image.pos.x, image.pos.y, image.data.width, image.data.height);
      if (scale2 >= 5.0) {
        let a = Math.min(1.0, (scale2 - 5.0) / 10.0);
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
      }
    }
    ctx2.restore();
  };

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
    }
  });
  
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
              setMkMode(createDrawMode);
            }}
          >
            <i class="fa-solid fa-pen"/>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PixelEditorView;

