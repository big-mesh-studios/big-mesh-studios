import { Setter } from "@solidjs/signals";
import { Accessor, useContext } from "solid-js";
import { SIDE_AXES } from "../constants";
import { StackerContext } from "../context";
import { Dimensions3D, Vector2D } from "@big-mesh-studios/maths";
import { type SideKind } from "@big-mesh-studios/stacker/renderer";
import { Alignment3D, AlignmentKind } from "../types";
import { pointer } from "@big-mesh-studios/utils/pointer";
import { screenToWorld } from "../utils/utils";
import {
  computeSidePositions,
  intersectSides,
  SidePositions,
} from "./side-layout";

type EdgeKind = "top" | "bottom" | "left" | "right";

interface ActiveSideEdge {
  sideKind: SideKind;
  edgeKinds: EdgeKind[];
}

/** The canvas axis an edge slides along when it is dragged. */
const EDGE_TO_AXIS = {
  left: "x",
  right: "x",
  top: "y",
  bottom: "y",
} as const satisfies Record<EdgeKind, keyof Vector2D>;

/**
 * Left and top edges grow their panel by moving towards negative coordinates,
 * so their drag delta has to be negated before it is added to a dimension.
 */
const EDGE_TO_SIGN = {
  left: -1,
  right: 1,
  top: -1,
  bottom: 1,
} as const satisfies Record<EdgeKind, number>;

const MIN_DIMENSION = 1;

/** The model axis a dragged edge resizes, and how the panel is oriented on it. */
const getSideAxis = (sideKind: SideKind, edgeKind: EdgeKind) =>
  SIDE_AXES[sideKind][EDGE_TO_AXIS[edgeKind]];

const getDimensionKind = (sideKind: SideKind, edgeKind: EdgeKind) =>
  getSideAxis(sideKind, edgeKind).dimension;

/**
 * Which end of the model axis a dragged edge moves. An edge on the low side of
 * its image sits at the axis' minimum, unless the panel looks at that axis from
 * the opposite direction, which swaps the two.
 */
const getDimensionEnd = (
  sideKind: SideKind,
  edgeKind: EdgeKind,
): AlignmentKind => {
  const atImageStart = edgeKind === "left" || edgeKind === "top";
  return atImageStart !== getSideAxis(sideKind, edgeKind).flipped
    ? "min"
    : "max";
};

/**
 * Where an edge sits on the canvas for a given set of dimensions(). Left and top
 * edges sit on their panel's origin, right and bottom edges a whole panel
 * further along. Both the origin and the size follow the dimensions, which is
 * why a resize can move an edge without the pointer having moved it there.
 */
const getEdgePosition = (
  sideKind: SideKind,
  edgeKind: EdgeKind,
  dimensions: Dimensions3D,
): number => {
  const axis = EDGE_TO_AXIS[edgeKind];
  const sidePosition = computeSidePositions(dimensions)[sideKind][axis];
  return edgeKind === "left" || edgeKind === "top"
    ? sidePosition
    : sidePosition + dimensions[SIDE_AXES[sideKind][axis].dimension];
};

export function createEdgeController({
  pan,
  scale,
  setCursorStyle,
  setPan,
  sidePositions,
}: {
  pan: Accessor<Vector2D>;
  scale: Accessor<number>;
  setCursorStyle: Setter<string | undefined>;
  setPan: Setter<Vector2D>;
  sidePositions: Accessor<SidePositions>;
}) {
  const { sides, sections, parts, resize, pushUndo, snapshot, dimensions } =
    useContext(StackerContext);

  const EDGE_TRESHOLD = 10;
  const findColidingEdge = (
    _worldPointer: Vector2D,
  ): ActiveSideEdge | false => {
    const intersection = intersectSides({
      worldPosition: _worldPointer,
      sides: sides(),
      sidePositions: sidePositions(),
    });

    if (!intersection) {
      return false;
    }

    const { side, kind, position } = intersection;

    const distances = {
      left: Math.abs(position.x),
      right: Math.abs(side.width - position.x),
      top: Math.abs(position.y),
      bottom: Math.abs(side.height - position.y),
    };

    // On a panel that is narrower than the threshold both of an axis' edges are
    // in reach at once. They resize the same dimension in opposite directions, so
    // let the nearest one win instead of having them cancel each other out.
    const getNearestEdge = (start: EdgeKind, end: EdgeKind) => {
      const nearest = distances[start] <= distances[end] ? start : end;
      return distances[nearest] * scale() < EDGE_TRESHOLD ? nearest : undefined;
    };

    const edgeKinds = [
      getNearestEdge("left", "right"),
      getNearestEdge("top", "bottom"),
    ].filter((edgeKind): edgeKind is EdgeKind => edgeKind !== undefined);

    if (edgeKinds.length === 0) {
      return false;
    }

    return { sideKind: kind, edgeKinds };
  };

  // A resize belongs to the one finger that started it, so the caller can tell
  // that a second finger has nothing to start here.
  let resizing = false;

  return {
    active: () => resizing,
    onPointerMove(event: PointerEvent & { currentTarget: HTMLElement }) {
      const screenPosition = { x: event.layerX, y: event.layerY };
      const worldPosition = screenToWorld(screenPosition, pan(), scale());
      const roundedWorldPosition = Vector2D.round(worldPosition);

      const collidingEdge = findColidingEdge(roundedWorldPosition);

      if (!collidingEdge) {
        setCursorStyle(undefined);
        return;
      }

      const n = collidingEdge.edgeKinds.includes("bottom");
      const s = collidingEdge.edgeKinds.includes("top");
      const e = collidingEdge.edgeKinds.includes("left");
      const w = collidingEdge.edgeKinds.includes("right");

      if ((n && e) || (s && w)) {
        setCursorStyle("nesw-resize");
      } else if ((n && w) || (s && e)) {
        setCursorStyle("nwse-resize");
      } else if (n || s) {
        setCursorStyle("row-resize");
      } else if (e || w) {
        setCursorStyle("col-resize");
      }
    },
    onPointerDown(event: PointerEvent & { currentTarget: HTMLElement }) {
      const screenPosition = { x: event.layerX, y: event.layerY };
      const worldPosition = screenToWorld(screenPosition, pan(), scale());

      const collidingEdge = findColidingEdge(worldPosition);

      if (!collidingEdge) {
        return false;
      }

      const { edgeKinds, sideKind } = collidingEdge;
      const initialDimensions = { ...dimensions() };
      const initialSides = { ...sides() };
      const initialSections = sections();
      // Re-framing replaces the part rather than drawing over its panels, so
      // the figure held here goes on describing the box the drag started from.
      const initialParts = parts();
      const initialPan = { ...pan() };

      resizing = true;

      event.currentTarget.setPointerCapture(event.pointerId);

      pointer(event, ({ event }) => {
        const delta = {
          x: Math.round((event.layerX - screenPosition.x) / scale()),
          y: Math.round((event.layerY - screenPosition.y) / scale()),
        };

        const newDimensions = { ...initialDimensions };
        const alignment: Alignment3D = {};

        for (const edgeKind of edgeKinds) {
          const dimensionKind = getDimensionKind(sideKind, edgeKind);

          newDimensions[dimensionKind] = Math.max(
            MIN_DIMENSION,
            newDimensions[dimensionKind] +
              delta[EDGE_TO_AXIS[edgeKind]] * EDGE_TO_SIGN[edgeKind],
          );
          alignment[dimensionKind] = getDimensionEnd(sideKind, edgeKind);
        }

        // Both the panels and the pan follow whole pixels, so most moves land on
        // the dimensions we already have and there is nothing to re-frame.
        if (Dimensions3D.equals(newDimensions, dimensions())) {
          return;
        }

        // Keep the dragged edge under the pointer. Resizing already moves an edge
        // by however much its own panel grew and shifted, so only the difference
        // between that and the distance dragged is left for the pan to cover.
        const newPan = { ...initialPan };

        for (const edgeKind of edgeKinds) {
          const dimensionKind = getDimensionKind(sideKind, edgeKind);
          const dragged =
            (newDimensions[dimensionKind] - initialDimensions[dimensionKind]) *
            EDGE_TO_SIGN[edgeKind];
          const moved =
            getEdgePosition(sideKind, edgeKind, newDimensions) -
            getEdgePosition(sideKind, edgeKind, initialDimensions);

          newPan[EDGE_TO_AXIS[edgeKind]] += moved - dragged;
        }

        resize({
          from: {
            sides: initialSides,
            sections: initialSections,
            dimensions: initialDimensions,
          },
          to: {
            dimensions: newDimensions,
            alignment,
          },
        });

        setPan(newPan);
      }).then(() => {
        if (
          initialDimensions.width !== dimensions().width ||
          initialDimensions.height !== dimensions().height ||
          initialDimensions.depth !== dimensions().depth
        ) {
          pushUndo(snapshot(initialParts), "Resize");
        }

        resizing = false;
      });

      return true;
    },
  };
}
