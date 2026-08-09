import { Setter } from "@solidjs/signals";
import { Accessor, createSignal, useContext } from "solid-js";
import { SIDE_AXES } from "../constants";
import { StackerContext } from "../stacker-context";
import { computeCoordinates, ResizeOptions } from "../stacker-store";
import type {
  Coordinates,
  DimensionEnd,
  DimensionEnds,
  Dimensions3D,
  SideKind,
  Sides,
  Vector2D,
} from "../types";
import { areDimensions3DEqual, findCollidingSide } from "../utils";

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
const getDimensionEnd = (sideKind: SideKind, edgeKind: EdgeKind): DimensionEnd => {
  const atImageStart = edgeKind === "left" || edgeKind === "top";
  return atImageStart !== getSideAxis(sideKind, edgeKind).flipped ? "min" : "max";
};

/**
 * Where an edge sits on the canvas for a given set of dimensions. Left and top
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
  const origin = computeCoordinates(dimensions)[sideKind][axis];
  return edgeKind === "left" || edgeKind === "top"
    ? origin
    : origin + dimensions[SIDE_AXES[sideKind][axis].dimension];
};

export function createEdgeController({
  mouseWorldPos,
  coordinates,
  scale,
  pan,
  resize,
  setPan,
  setCursor,
}: {
  mouseWorldPos: Accessor<Vector2D | undefined>;
  coordinates: Accessor<Coordinates>;
  scale: Accessor<number>;
  pan: Accessor<Vector2D>;
  resize: (options: ResizeOptions) => void;
  setPan: Setter<Vector2D>;
  setCursor: Setter<string | undefined>;
}) {
  const { store } = useContext(StackerContext);
  const [activeEdge, setActiveEdge] = createSignal<{
    edge: ActiveSideEdge;
    initialPosition: Vector2D;
    initialDimensions: Dimensions3D;
    initialSides: Sides;
    initialPan: Vector2D;
  }>();

  const EDGE_TRESHOLD = 10;
  const findColidingEdge = (): ActiveSideEdge | false => {
    const position = mouseWorldPos();

    if (!position) {
      return false;
    }

    const collidingSide = findCollidingSide(position, store.sides, coordinates());

    if (!collidingSide) {
      return false;
    }

    const { coordinate, side, kind } = collidingSide;

    const distances = {
      left: Math.abs(coordinate.x - position.x),
      right: Math.abs(coordinate.x + side.width - position.x),
      top: Math.abs(coordinate.y - position.y),
      bottom: Math.abs(coordinate.y + side.height - position.y),
    };

    // On a panel that is narrower than the threshold both of an axis' edges are
    // in reach at once. They resize the same dimension in opposite directions, so
    // let the nearest one win instead of having them cancel each other out.
    const getNearestEdge = (start: EdgeKind, end: EdgeKind) => {
      const nearest = distances[start] <= distances[end] ? start : end;
      return distances[nearest] * scale() < EDGE_TRESHOLD ? nearest : undefined;
    };

    const edgeKinds = [getNearestEdge("left", "right"), getNearestEdge("top", "bottom")].filter(
      (edgeKind): edgeKind is EdgeKind => edgeKind !== undefined,
    );

    if (edgeKinds.length === 0) {
      return false;
    }

    return { sideKind: kind, edgeKinds };
  };

  function updateCursor() {
    const collidingEdge = findColidingEdge();

    // Update cursor
    if (collidingEdge) {
      const n = collidingEdge.edgeKinds.includes("bottom");
      const s = collidingEdge.edgeKinds.includes("top");
      const e = collidingEdge.edgeKinds.includes("left");
      const w = collidingEdge.edgeKinds.includes("right");
      if ((n && e) || (s && w)) {
        setCursor("nesw-resize");
      } else if ((n && w) || (s && e)) {
        setCursor("nwse-resize");
      } else if (n || s) {
        setCursor("row-resize");
      } else if (e || w) {
        setCursor("col-resize");
      }
    } else {
      setCursor(undefined);
    }
  }

  return {
    active: () => !!activeEdge(),
    onPointerEnd: () => setActiveEdge(undefined),
    onPointerDown(event: PointerEvent) {
      const _mouseWorldPos = mouseWorldPos();

      if (!_mouseWorldPos) {
        return false;
      }

      const collidingEdge = findColidingEdge();

      if (collidingEdge) {
        setActiveEdge({
          edge: collidingEdge,
          initialPosition: { x: event.clientX, y: event.clientY },
          initialDimensions: { ...store.dimensions },
          // Every step of the drag re-frames these rather than the panels of the
          // step before, so pulling an edge back out restores what shrinking it
          // pushed out of the box.
          initialSides: store.sides,
          initialPan: pan(),
        });

        return true;
      }

      return false;
    },
    onPointerMove(event: PointerEvent) {
      updateCursor();

      const _activeEdge = activeEdge();

      if (!_activeEdge) {
        return;
      }

      const {
        initialPosition,
        edge: { sideKind, edgeKinds },
        initialDimensions,
        initialSides,
        initialPan,
      } = _activeEdge;

      const delta = {
        x: Math.round((event.clientX - initialPosition.x) / scale()),
        y: Math.round((event.clientY - initialPosition.y) / scale()),
      };

      const newDimensions = { ...initialDimensions };
      const growEnds: DimensionEnds = {};

      for (const edgeKind of edgeKinds) {
        const dimensionKind = getDimensionKind(sideKind, edgeKind);

        newDimensions[dimensionKind] = Math.max(
          MIN_DIMENSION,
          newDimensions[dimensionKind] + delta[EDGE_TO_AXIS[edgeKind]] * EDGE_TO_SIGN[edgeKind],
        );
        growEnds[dimensionKind] = getDimensionEnd(sideKind, edgeKind);
      }

      // Both the panels and the pan follow whole pixels, so most moves land on
      // the dimensions we already have and there is nothing to re-frame.
      if (areDimensions3DEqual(newDimensions, store.dimensions)) {
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
        dimensions: newDimensions,
        growEnds,
        from: { sides: initialSides, dimensions: initialDimensions },
      });
      setPan(newPan);
    },
  };
}
