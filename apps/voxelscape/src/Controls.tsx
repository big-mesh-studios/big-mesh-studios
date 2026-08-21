import { Component, createSignal } from "solid-js";
import { queueJump, setTouchMove } from "./input";

type Axis = "up" | "down" | "left" | "right";

const AXES: Record<Axis, [number, number]> = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

const BTN_CLS =
  "pointer-events-auto flex items-center justify-center rounded-xl border border-white/40 " +
  "bg-white/15 text-white select-none touch-none active:bg-white/30";

const Controls: Component = () => {
  const [held, setHeld] = createSignal<Set<Axis>>(new Set());

  const recompute = (next: Set<Axis>): void => {
    setHeld(next);
    let x = 0;
    let y = 0;
    next.forEach((axis) => {
      const [dx, dy] = AXES[axis];
      x += dx;
      y += dy;
    });
    setTouchMove(x, y);
  };

  const press = (axis: Axis) => (e: PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const next = new Set(held());
    next.add(axis);
    recompute(next);
  };

  const release = (axis: Axis) => () => {
    const next = new Set(held());
    next.delete(axis);
    recompute(next);
  };

  const dpad = (axis: Axis, glyph: string) => (
    <button
      type="button"
      class={`${BTN_CLS} h-16 w-16 text-2xl font-bold`}
      onPointerDown={press(axis)}
      onPointerUp={release(axis)}
      onPointerCancel={release(axis)}
      onPointerLeave={release(axis)}
    >
      {glyph}
    </button>
  );

  return (
    <div
      class="pointer-events-none absolute inset-0"
      style={{ "-webkit-tap-highlight-color": "transparent" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div class="absolute bottom-6 left-6 grid grid-cols-3 grid-rows-3 gap-1">
        <div class="h-16 w-16" />
        {dpad("up", "▲")}
        <div class="h-16 w-16" />
        {dpad("left", "◀")}
        <div class="h-16 w-16" />
        {dpad("right", "▶")}
        <div class="h-16 w-16" />
        {dpad("down", "▼")}
        <div class="h-16 w-16" />
      </div>

      <button
        type="button"
        class={`${BTN_CLS} absolute bottom-10 right-8 h-20 w-20 rounded-full text-lg font-bold`}
        onPointerDown={(e) => {
          e.preventDefault();
          queueJump();
        }}
      >
        JUMP
      </button>
    </div>
  );
};

export default Controls;
