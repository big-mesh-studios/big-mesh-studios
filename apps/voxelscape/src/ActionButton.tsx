import { createSignal, createMemo, type Accessor, type Component, type Signal, onCleanup, untrack, createRenderEffect } from "solid-js";
import { JSX } from "@solidjs/web";
import * as THREE from "three";

const MAX_HOLD_TIME = 1.0;

export function ActionButton(params: {
  position: Accessor<THREE.Vector2>,
  size: Accessor<number>,
  externalPressed?: Accessor<boolean>,
  colour?: Accessor<THREE.ColorRepresentation | undefined>,
  specialSlidePress?: Accessor<boolean>,
}): {
  position: Accessor<THREE.Vector2>,
  size: Accessor<number>,
  pressed: Accessor<boolean>,
  power: Accessor<number>,
  justReleased: Accessor<boolean>,
  justReleasedExternal: Accessor<boolean>,
  UI: Component,
} {
  const colour = createMemo(() => {
    let colour2 = params.colour?.();
    if (colour2 == undefined) {
      return { r: 255, g: 255, b: 255 };
    }
    let colour3 = new THREE.Color(colour2);
    return {
      r: Math.max(0, Math.min(255, Math.round(colour3.r * 255.0))),
      g: Math.max(0, Math.min(255, Math.round(colour3.g * 255.0))),
      b: Math.max(0, Math.min(255, Math.round(colour3.b * 255.0))),
    };
  });

  const [ divElement, setDivElement, ] = createSignal<HTMLDivElement>();

  const [pressed, setPressed] = createSignal(false);
  const [pressStartTime, setPressStartTime] = createSignal(0);
  const [wasPressed, setWasPressed] = createSignal(false);
  const [tick, setTick] = createSignal(0);
  const [externalWasPressed, setExternalWasPressed] = createSignal(false);

  const externalPressed = params.externalPressed || (() => false);

  let intervalId: number | undefined;
  let lastExternalPressed = false;

  const startTracking = () => {
    if (intervalId) return;
    intervalId = window.setInterval(() => {
      setTick(t => t + 1);
    }, 50);
  };

  const stopTracking = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  onCleanup(() => stopTracking());

  if (params.externalPressed != undefined) {
    requestAnimationFrame(function checkExternal() {
      const ext = externalPressed();
      if (ext && !lastExternalPressed) {
        setPressStartTime(performance.now());
        startTracking();
      }
      if (!ext && lastExternalPressed) {
        setExternalWasPressed(true);
      }
      lastExternalPressed = ext;
      requestAnimationFrame(checkExternal);
    });
  }

  const isPressed = () => pressed() || externalPressed();

  const power = createMemo(() => {
    tick();
    const p = isPressed();
    const t = pressStartTime();
    if (!p) return 0;
    const holdTime = (performance.now() - t) / 1000;
    return Math.min(holdTime / MAX_HOLD_TIME, 1.0);
  });

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
    setPressStartTime(performance.now());
    startTracking();
  };

  const handlePointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (e) => {
    setPressed(false);
    stopTracking();
    setWasPressed(true);
  };

  const handlePointerLeave: JSX.EventHandler<HTMLDivElement, PointerEvent> = (e) => {
    if (pressed()) {
      setPressed(false);
      stopTracking();
      setWasPressed(true);
    }
  };

  createRenderEffect(
    () => params.specialSlidePress?.() ?? false,
    (specialSlidePress) => {
      if (!specialSlidePress) {
        return;
      }
      // special press for using items without releasing the accelerator
      const handleSpecialPointerMove = (e: PointerEvent) => {
        let divElement2 = divElement();
        if (divElement2 === undefined) {
          return;
        }
        let clientX = e.clientX;
        let clientY = e.clientY;
        let overButton = document.elementFromPoint(clientX, clientY) === divElement2;
        if (overButton) {
          if (!pressed()) {
            setPressed(true);
            setWasPressed(false);
          }
        } else {
          if (pressed()) {
            setPressed(false);
            setWasPressed(true);
          }
        }
      };
      document.addEventListener("pointermove", handleSpecialPointerMove);
      onCleanup(() => {
        document.removeEventListener("pointermove", handleSpecialPointerMove);
      });
      //
    },
  )

  const UI: Component = () => {
    return (
      <div
        ref={setDivElement}
        style={{
          position: "absolute",
          left: `${params.position().x}px`,
          top: `${params.position().y}px`,
          width: `${params.size()}px`,
          height: `${params.size()}px`,
          "border-radius": `${0.5 * params.size()}px`,
          "background-color": `rgba(${colour().r},${colour().g},${colour().b},${isPressed() ? "0.8" : "0.5"})`,
          "user-select": "none",
          "touch-action": "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  };

  return {
    position: params.position,
    size: params.size,
    pressed: isPressed,
    power,
    justReleased: () => {
      if (wasPressed()) {
        setWasPressed(false);
        return true;
      }
      return false;
    },
    justReleasedExternal: () => {
      if (externalWasPressed()) {
        setExternalWasPressed(false);
        return true;
      }
      return false;
    },
    UI,
  };
}
