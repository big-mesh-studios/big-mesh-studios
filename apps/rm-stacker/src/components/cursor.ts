import { Vector2D } from "../maths";

/**
 * cursor
 *
 * @param initialEvent MouseEvent
 * @param callback called every onPointerMove
 * @returns Promise resolved onPointerUp
 */
export const cursor = (
  initialEvent: PointerEvent,
  callback: (event: { delta: Vector2D; event: PointerEvent; timespan: number }) => void,
) => {
  return new Promise<{ delta: Vector2D; event: PointerEvent; timespan: number }>(resolve => {
    let previous = {
      x: initialEvent.clientX,
      y: initialEvent.clientY,
    };
    const startTime = performance.now();
    const controller = new AbortController();

    function handle(event: PointerEvent) {
      const now = {
        x: event.clientX,
        y: event.clientY,
      };
      const delta = {
        x: now.x - previous.x,
        y: now.y - previous.y,
      };
      previous = now;
      return {
        delta,
        event,
        timespan: performance.now() - startTime,
      };
    }

    window.addEventListener(
      "pointermove",
      (event: PointerEvent) => callback(handle(event)),
      controller,
    );

    window.addEventListener(
      "pointerup",
      (event: PointerEvent) => {
        const result = handle(event);
        callback(result);
        resolve(result);
        controller.abort();
      },
      controller,
    );
  });
};
