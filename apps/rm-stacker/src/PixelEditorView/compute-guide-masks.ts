import { SIDE_MASK } from "../constants";
import { StackerStore } from "../stacker-store";
import { Dimensions2D, SideKind, Sides } from "../types";

/**
 * For each primary face and each of its two axes: the perpendicular face whose
 * silhouette bounds that axis, which line of it to read, and whether the index
 * has to be counted from the other end.
 *
 * The mirrored entries are the ones that translate a z index between two faces
 * that walk z in opposite directions: `right` pixel x sits at z = depth - 1 - x,
 * while `top` pixel y sits at z = y.
 */
const SIDE_AXIS_MAPPING = {
  front: {
    x: { side: "top", axis: "column", mirror: false },
    y: { side: "right", axis: "row", mirror: false },
  },
  right: {
    x: { side: "top", axis: "row", mirror: true },
    y: { side: "front", axis: "row", mirror: false },
  },
  top: {
    x: { side: "front", axis: "column", mirror: false },
    y: { side: "right", axis: "column", mirror: true },
  },
} as const;

function isColumnEmpty(side: ImageData, index: number, mirror = false) {
  const _index = mirror ? side.width - 1 - index : index;
  for (let y = 0; y < side.height; y++) {
    const offset = ((y * side.width + _index) << 2) + 3;
    if (side.data[offset] !== 0) {
      return false;
    }
  }
  return true;
}

function isRowEmpty(side: ImageData, index: number, mirror = false) {
  const _index = mirror ? side.height - 1 - index : index;
  for (let x = 0; x < side.width; x++) {
    const offset = ((_index * side.width + x) << 2) + 3;
    if (side.data[offset] !== 0) {
      return false;
    }
  }
  return true;
}

function isLineEmpty(side: ImageData, line: "row" | "column", index: number, mirror: boolean) {
  return line === "column" ? isColumnEmpty(side, index, mirror) : isRowEmpty(side, index, mirror);
}

function mirrorX(source: Uint8Array, dimensions: Dimensions2D) {
  const array = new Uint8Array(source.length);

  for (let x = 0; x < dimensions.width; x++) {
    for (let y = 0; y < dimensions.height; y++) {
      array[y * dimensions.width + x] = source[y * dimensions.width + (dimensions.width - x - 1)];
    }
  }

  return array;
}

function mirrorY(source: Uint8Array, dimensions: Dimensions2D) {
  const array = new Uint8Array(source.length);

  for (let x = 0; x < dimensions.width; x++) {
    for (let y = 0; y < dimensions.height; y++) {
      array[y * dimensions.width + x] = source[(dimensions.height - y - 1) * dimensions.width + x];
    }
  }

  return array;
}

export function computeGuideMasks(
  store: Pick<StackerStore, "dimensions" | "sides">,
): Record<keyof Sides, Uint8Array> {
  const primaryKinds = ["front", "top", "right"] satisfies Array<SideKind>;

  const guides = {} as Record<keyof Sides, Uint8Array>;

  for (const kind of primaryKinds) {
    const side = store.sides[kind as SideKind];
    const guide = new Uint8Array(side.width * side.height);

    const { side: xSide, axis: xLine, mirror: xMirror } = SIDE_AXIS_MAPPING[kind].x;
    const { side: ySide, axis: yLine, mirror: yMirror } = SIDE_AXIS_MAPPING[kind].y;

    for (let x = 0; x < side.width; x++) {
      if (isLineEmpty(store.sides[xSide], xLine, x, xMirror)) {
        continue;
      }

      for (let y = 0; y < side.height; y++) {
        guide[x + y * side.width] |= SIDE_MASK[xSide];
      }
    }

    for (let y = 0; y < side.height; y++) {
      if (isLineEmpty(store.sides[ySide], yLine, y, yMirror)) {
        continue;
      }

      for (let x = 0; x < side.width; x++) {
        guide[x + y * side.width] |= SIDE_MASK[ySide];
      }
    }

    guides[kind] = guide;
  }

  guides.left = mirrorX(guides.right, store.sides.left);
  guides.bottom = mirrorY(guides.top, store.sides.bottom);
  guides.back = mirrorX(guides.front, store.sides.back);

  return guides;
}
