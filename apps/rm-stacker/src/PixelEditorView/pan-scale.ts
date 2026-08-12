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

  return {
    onPointerDown(event: PointerEvent & { currentTarget: HTMLElement }) {
      if (disable?.()) {
        return false;
      }

      const initialScreenPosition = { x: event.layerX, y: event.layerY };
      const initialWorldPosition = screenToWorld(initialScreenPosition, pan(), scale());
      activePointers.set(event.pointerId, initialScreenPosition);

      if (activePointers.size > 1) {
        pointer(event).then(() => activePointers.delete(event.pointerId));
        return true;
      }

      let previousDistance: number;
      let previousCenter: Vector2D;

      pointer(event, ({ event }) => {
        const screenPosition = { x: event.layerX, y: event.layerY };
        const worldPosition = screenToWorld(screenPosition, pan(), scale());

        if (activePointers.size === 1) {
          // Single finger drag / pan
          onUpdate(
            {
              x: initialWorldPosition.x - screenPosition.x / scale(),
              y: initialWorldPosition.y - screenPosition.y / scale(),
            },
            scale(),
          );
        } else if (activePointers.size === 2) {
          // Two finger pinch-zoom & pan
          const pointers = Array.from(activePointers.values());
          const deltaX = pointers[1].x - pointers[0].x;
          const deltaY = pointers[1].y - pointers[0].y;
          const currentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const currentCenter = {
            x: 0.5 * (pointers[0].x + pointers[1].x),
            y: 0.5 * (pointers[0].y + pointers[1].y),
          };

          if (!previousDistance || !previousCenter) {
            const pointers = Array.from(activePointers.values());
            const deltaX = pointers[1].x - pointers[0].x;
            const deltaY = pointers[1].y - pointers[0].y;
            previousDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            previousCenter = {
              x: 0.5 * (pointers[0].x + pointers[1].x),
              y: 0.5 * (pointers[0].y + pointers[1].y),
            };
          } else if (previousDistance > 0) {
            const oldScale = scale();
            const newScale = Math.max(minScale, oldScale * (currentDistance / previousDistance));

            // Keep that world point under the current midpoint (zoom + pan)
            const newPan = {
              x: worldPosition.x - currentCenter.x / newScale,
              y: worldPosition.y - currentCenter.y / newScale,
            };

            onUpdate(newPan, newScale);
          }

          previousDistance = currentDistance;
          previousCenter = currentCenter;
        }
      }).then(() => activePointers.delete(event.pointerId));

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
