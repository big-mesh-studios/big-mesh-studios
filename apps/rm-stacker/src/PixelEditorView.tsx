import { Component, createEffect, createSignal, latest, onSettled } from "solid-js";
import * as THREE from "three";
import { createPanScaleControl } from "./PanScaleControl";

const PixelEditorView: Component<{}> = (props) => {
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  let [ ctx, setCtx, ] = createSignal<CanvasRenderingContext2D>();
  let [ canvasSize, setCanvasSize, ] = createSignal<THREE.Vector2 | undefined>();
  let [ pan, setPan, ] = createSignal(new THREE.Vector2(0.0, 0.0));
  let [ scale, setScale, ] = createSignal(1.0);
  let worldPtToScreenPt = (pt: THREE.Vector2, out: THREE.Vector2): THREE.Vector2 => {
    out.copy(pt);
    out.sub(pan());
    out.multiplyScalar(scale());
    return out;
  };
  let screenPtToWorldPt = (pt: THREE.Vector2, out: THREE.Vector2): THREE.Vector2 => {
    out.copy(pt);
    out.multiplyScalar(1.0 / latest(scale));
    out.add(latest(pan));
    return out;
  };
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
    let pt = new THREE.Vector2(30, 30);
    ctx2.strokeRect(pt.x, pt.y, 100, 100);
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
  );
};

export default PixelEditorView;

