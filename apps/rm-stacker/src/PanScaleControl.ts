export function createPanScaleControl(params: {
  target: () => HTMLElement | undefined,
  panX: () => number,
  panY: () => number,
  scale: () => number,
  onUpdate: (fn: (params: {
    setPanX: (value: number) => void,
    setPanY: (value: number) => void,
    setScale: (value: number) => void,
  }) => void) => void,
}): {
  onPointerDown: (e: PointerEvent) => void,
  onPointerUp: (e: PointerEvent) => void,
  onPointerCancel: (e: PointerEvent) => void,
  onPointerMove: (e: PointerEvent) => void,
  onWheel: (e: WheelEvent) => void,
} {
  let { target, panX, panY, scale, onUpdate, } = params;
  const activePointers = new Map<number, { x: number, y: number, }>();
  let prevDist: number | undefined = undefined;
  let prevCenter: { x: number, y: number, } | undefined = undefined;
  let grabOffsetX: number | undefined = undefined;
  let grabOffsetY: number | undefined = undefined;
  let resetSinglePointerGrab = () => {
    if (activePointers.size === 1) {
      const [, pos] = activePointers.entries().next().value!;
      grabOffsetX = pos.x / scale() + panX();
      grabOffsetY = pos.y / scale() + panY();
    } else {
      grabOffsetX = undefined;
      grabOffsetY = undefined;
    }
  };

  let result = {
    onPointerDown: (e: PointerEvent) => {
      let target2 = target();
      if (target2 === undefined) {
        return;
      }
      try {
        target2.setPointerCapture(e.pointerId);
      } catch (_) {}

      let rect = target2.getBoundingClientRect();
      let pos = { x: e.clientX - rect.left, y: e.clientY - rect.top, };
      activePointers.set(e.pointerId, pos);

      if (activePointers.size === 1) {
        grabOffsetX = pos.x / scale() + panX();
        grabOffsetY = pos.y / scale() + panY();
      } else if (activePointers.size === 2) {
        grabOffsetX = undefined;
        grabOffsetY = undefined;
        let pts = Array.from(activePointers.values());
        let dx = pts[1].x - pts[0].x;
        let dy = pts[1].y - pts[0].y;
        prevDist = Math.sqrt(dx * dx + dy * dy);
        prevCenter = {
          x: 0.5 * (pts[0].x + pts[1].x),
          y: 0.5 * (pts[0].y + pts[1].y),
        };
      }
    },

    onPointerMove: (e: PointerEvent) => {
      let target2 = target();
      if (target2 === undefined || !activePointers.has(e.pointerId)) {
        return;
      }

      let rect = target2.getBoundingClientRect();
      let pos = { x: e.clientX - rect.x, y: e.clientY - rect.y, };
      activePointers.set(e.pointerId, pos);

      if (activePointers.size === 1 && grabOffsetX !== undefined && grabOffsetY !== undefined) {
        let grabOffsetX2 = grabOffsetX;
        let grabOffsetY2 = grabOffsetY;
        // Single finger drag / pan
        onUpdate(({ setPanX, setPanY, }) => {
          setPanX(grabOffsetX2 - pos.x / scale());
          setPanY(grabOffsetY2 - pos.y / scale());
        });
      } else if (activePointers.size === 2) {
        // Two finger pinch-zoom & pan
        let pts = Array.from(activePointers.values());
        let dx = pts[1].x - pts[0].x;
        let dy = pts[1].y - pts[0].y;
        let currDist = Math.sqrt(dx * dx + dy * dy);
        let currCenter = {
          x: 0.5 * (pts[0].x + pts[1].x),
          y: 0.5 * (pts[0].y + pts[1].y),
        };

        if (prevDist !== undefined && prevCenter !== undefined && prevDist > 0) {
          let oldScale = scale();
          let zoomFactor = currDist / prevDist;
          let newScale = Math.max(0.01, oldScale * zoomFactor);

          // Convert previous screen center to world coordinates
          let worldX = panX() + (prevCenter.x / oldScale);
          let worldY = panY() + (prevCenter.y / oldScale);

          // Adjust pan to keep world point centered under the new pinch midpoint
          let newPanX = worldX - (currCenter.x / newScale);
          let newPanY = worldY - (currCenter.y / newScale);

          onUpdate(({ setPanX, setPanY, setScale, }) => {
            setPanX(newPanX);
            setPanY(newPanY);
            setScale(newScale);
          });
        }

        prevDist = currDist;
        prevCenter = currCenter;
      }
    },

    onPointerUp: (e: PointerEvent) => {
      let target2 = target();
      if (target2 === undefined) {
        return;
      }

      if (activePointers.has(e.pointerId)) {
        try {
          target2.releasePointerCapture(e.pointerId);
        } catch (_) {}
        activePointers.delete(e.pointerId);
      }

      if (activePointers.size < 2) {
        prevDist = undefined;
        prevCenter = undefined;
      }

      resetSinglePointerGrab();
    },

    onPointerCancel: (e: PointerEvent) => {
      result.onPointerUp(e);
    },

    onWheel: (e: WheelEvent) => {
      let target2 = target();
      if (target2 === undefined) {
        return;
      }
      let wheelY = e.deltaY > 0 ? -1 : 1;
      if (wheelY === 0) {
        return;
      }
      let rect = target2.getBoundingClientRect();
      let x = e.clientX - rect.x;
      let y = e.clientY - rect.y;
      let oldScale = scale();
      let newScale = Math.max(0.01, oldScale * Math.pow(1.1, wheelY));
      
      let worldX = panX() + (x / oldScale);
      let worldY = panY() + (y / oldScale);
      
      let newPanX = worldX - (x / newScale);
      let newPanY = worldY - (y / newScale);

      onUpdate(({ setPanX, setPanY, setScale, }) => {
        setPanX(newPanX);
        setPanY(newPanY);
        setScale(newScale);
      });
    },
  };
  return result;
}
