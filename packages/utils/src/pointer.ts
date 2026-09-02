import { Vector2D } from "@big-mesh-studios/maths";

interface CustomPointerEvent<T extends HTMLElement> {
  delta: Vector2D;
  totalDelta: Vector2D;
  event: PointerEvent & { currentTarget: T };
  timespan: number;
  pointers: Map<number, PointerEvent>;
}

export const POINTER_EVENT_MAP = new Map<
  HTMLElement,
  Map<number, PointerEvent>
>();

export function getPointerSize(element: HTMLElement) {
  return POINTER_EVENT_MAP.get(element)?.size ?? 0;
}

export function getPointers(element: HTMLElement) {
  return POINTER_EVENT_MAP.get(element)?.values();
}

/**
 * Follows a pointer from the event that started a drag until the drag ends.
 *
 * The element the initial event came from captures the pointer, so its moves keep
 * arriving while the pointer is outside that element.
 *
 * @param initialEvent the pointerdown event that started the drag
 * @param callback called on every pointermove, and once more when the drag ends
 * @returns Promise resolved on pointerup, or on pointercancel when the browser
 * takes the pointer over for a gesture of its own
 */

export function pointer<T extends HTMLElement>(
  initialEvent: PointerEvent & { currentTarget: T },
  callback?: (event: CustomPointerEvent<T>) => void,
  options?: { signal: AbortSignal },
): Promise<CustomPointerEvent<T>> {
  const { promise, resolve } = Promise.withResolvers<CustomPointerEvent<T>>();
  let totalDelta = {
    x: 0,
    y: 0,
  };
  let previous = {
    x: initialEvent.clientX,
    y: initialEvent.clientY,
  };
  const startTime = performance.now();
  const controller = new AbortController();
  const pointerId = initialEvent.pointerId;
  const element = initialEvent.currentTarget;
  element.setPointerCapture(pointerId);

  const pointers =
    POINTER_EVENT_MAP.get(element) ?? new Map<number, PointerEvent>();
  POINTER_EVENT_MAP.set(element, pointers);
  pointers.set(pointerId, initialEvent);

  options?.signal.addEventListener("abort", () => controller.abort());

  function handleEvent(event: PointerEvent) {
    const now = Vector2D.create(event.clientX, event.clientY);
    const delta = Vector2D.sub(now, previous);
    previous = now;
    totalDelta = Vector2D.add(totalDelta, delta);
    pointers.set(event.pointerId, event);
    return {
      delta,
      totalDelta,
      event: event as PointerEvent & { currentTarget: T },
      timespan: performance.now() - startTime,
      pointers,
    };
  }

  function handleFinalEvent(event: PointerEvent) {
    const result = handleEvent(event);
    // The same pointer can be followed by more than one caller at a time, and
    // the first of them to finish is the one that gives the capture back.
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        POINTER_EVENT_MAP.delete(element);
      }
    }
    callback?.(result);
    resolve(result);
    controller.abort();
  }

  // A second finger on the same element raises its own events here. They belong
  // to whichever call is following that pointer, so anything that is not this
  // one has to be passed over rather than mistaken for this drag moving or
  // ending.
  const forThisPointer =
    (handle: (event: PointerEvent) => void) => (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      handle(event);
    };

  if (callback) {
    element.addEventListener(
      "pointermove",
      forThisPointer((event) => callback(handleEvent(event))),
      controller,
    );
  }
  element.addEventListener(
    "pointercancel",
    forThisPointer(handleFinalEvent),
    controller,
  );
  element.addEventListener(
    "pointerup",
    forThisPointer(handleFinalEvent),
    controller,
  );

  return promise;
}
