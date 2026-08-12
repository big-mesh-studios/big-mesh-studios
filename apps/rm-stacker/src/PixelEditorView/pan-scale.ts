import { Accessor } from "solid-js";
import { Vector2D } from "../maths";
import { pointer, screenToWorld } from "../utils";

interface PanScaleTransform {
  pan: Vector2D;
  scale: number;
}

function zoomAboutPoint(
  transform: PanScaleTransform,
  screenPoint: Vector2D,
  factor: number,
  minScale = 0.01,
): PanScaleTransform {
  const newScale = Math.max(minScale, transform.scale * factor);
  const worldX = transform.pan.x + screenPoint.x / transform.scale;
  const worldY = transform.pan.y + screenPoint.y / transform.scale;
  return {
    pan: {
      x: worldX - screenPoint.x / newScale,
      y: worldY - screenPoint.y / newScale,
    },
    scale: newScale,
  };
}

/**********************************************************************************/
/*                            Create Pan Scale Control                            */
/**********************************************************************************/

export interface PanScaleControlParams {
  target: Accessor<HTMLElement | undefined>;
  pan: Accessor<Vector2D>;
  scale: Accessor<number>;
  onUpdate(pan: Vector2D, scale: number): void;
  disable?: Accessor<boolean>;
  minScale?: number;
}

export interface PanScaleControl {
  onPointerDown(e: PointerEvent & { currentTarget: HTMLElement }): boolean;
  onWheel(e: WheelEvent): void;
}

export function createPanScaleControl({
  pan,
  scale,
  onUpdate,
  disable,
  minScale = 0.01,
  target,
}: PanScaleControlParams): PanScaleControl {
  const activePointers = new Map<number, Vector2D>();

  // A pinch is measured from one frame to the next, so how far apart the fingers
  // were and where their midpoint sat belong to the gesture rather than to
  // either finger, and both fingers read and write them.
  let previousSpan: { distance: number; center: Vector2D } | undefined;

  const measureSpan = () => {
    const [first, second] = Array.from(activePointers.values());
    return {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      center: {
        x: 0.5 * (first.x + second.x),
        y: 0.5 * (first.y + second.y),
      },
    };
  };

  return {
    onPointerDown(event: PointerEvent & { currentTarget: HTMLElement }) {
      if (disable?.()) {
        return false;
      }

      const initialScreenPosition = { x: event.layerX, y: event.layerY };
      activePointers.set(event.pointerId, initialScreenPosition);

      // Where the world sat under this finger when the gesture it is currently
      // part of began. A finger joining or leaving changes what the gesture
      // measures, so this is taken again whenever that happens.
      let anchorWorldPosition = screenToWorld(initialScreenPosition, pan(), scale());
      let anchoredPointerCount = activePointers.size;
      previousSpan = undefined;

      pointer(event, ({ event }) => {
        const screenPosition = { x: event.layerX, y: event.layerY };

        // Keep this finger's position current, so a pinch measures the span
        // between where both fingers are now rather than where they went down.
        activePointers.set(event.pointerId, screenPosition);

        if (activePointers.size !== anchoredPointerCount) {
          anchorWorldPosition = screenToWorld(screenPosition, pan(), scale());
          anchoredPointerCount = activePointers.size;
          previousSpan = undefined;
        }

        if (activePointers.size === 1) {
          // One finger drags the world along under itself.
          onUpdate(
            {
              x: anchorWorldPosition.x - screenPosition.x / scale(),
              y: anchorWorldPosition.y - screenPosition.y / scale(),
            },
            scale(),
          );
          return;
        }

        if (activePointers.size !== 2) {
          return;
        }

        // Two fingers zoom by however much the span between them grew and pan by
        // however far their midpoint travelled.
        const span = measureSpan();

        if (previousSpan !== undefined && previousSpan.distance > 0) {
          const newScale = Math.max(minScale, scale() * (span.distance / previousSpan.distance));

          // Whatever sat under the midpoint a frame ago should still sit under
          // the midpoint now, at the scale the pinch has just asked for.
          const anchor = screenToWorld(previousSpan.center, pan(), scale());

          onUpdate(
            {
              x: anchor.x - span.center.x / newScale,
              y: anchor.y - span.center.y / newScale,
            },
            newScale,
          );
        }

        previousSpan = span;
      }).then(() => {
        activePointers.delete(event.pointerId);
        previousSpan = undefined;
      });

      return true;
    },

    onWheel: (event: WheelEvent) => {
      if (disable?.()) {
        return;
      }

      const _target = target();
      if (_target === undefined) {
        return;
      }

      if (event.deltaY === 0) {
        return;
      }

      const signY = event.deltaY > 0 ? -1 : 1;
      const oldScale = scale();
      const next = zoomAboutPoint(
        { pan: pan(), scale: oldScale },
        { x: event.layerX, y: event.layerY },
        Math.pow(1.1, signY),
        minScale,
      );
      onUpdate(next.pan, next.scale);
    },
  };
}
