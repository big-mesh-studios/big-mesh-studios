import { SIDE_MASK } from "./constants";
import { StackerStore } from "./stacker-store";
import { Axis, Dimensions2D, SideKind, Sides, Vector3D } from "./types";

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

export type ViewSpec = {
  kind: keyof Sides;
  side: ImageData;
  axis: Axis;
  fixedCoords: (px: number, py: number) => Vector3D;
  nearestAscending: boolean;
};

// Right-handed coordinate system: +x right, +y up, +z toward the viewer.
// The front face is at z = size - 1 (nearest to the front camera) and the
// back face is at z = 0. Each view fixes two coordinates and raymarches the
// remaining axis; the fixed coordinate tuples put the axis coordinate at 0.
export const createViews = ({
  sides: { front, left, right, back, top, bottom },
  dimensions: { height, width, depth },
}: Pick<StackerStore, "dimensions" | "sides">): ViewSpec[] => {
  return [
    {
      kind: "front",
      side: front,
      axis: "z",
      fixedCoords: (px, py) => ({ x: px, y: height - 1 - py, z: 0 }),
      nearestAscending: false,
    },
    {
      kind: "back",
      side: back,
      axis: "z",
      fixedCoords: (px, py) => ({ x: width - 1 - px, y: height - 1 - py, z: 0 }),
      nearestAscending: true,
    },
    {
      kind: "left",
      side: left,
      axis: "x",
      fixedCoords: (px, py) => ({ x: 0, y: height - 1 - py, z: px }),
      nearestAscending: true,
    },
    {
      kind: "right",
      side: right,
      axis: "x",
      fixedCoords: (px, py) => ({ x: 0, y: height - 1 - py, z: depth - 1 - px }),
      nearestAscending: false,
    },
    {
      kind: "top",
      side: top,
      axis: "y",
      fixedCoords: (px, py) => ({ x: px, y: 0, z: py }),
      nearestAscending: false,
    },
    {
      kind: "bottom",
      side: bottom,
      axis: "y",
      fixedCoords: (px, py) => ({ x: px, y: 0, z: depth - 1 - py }),
      nearestAscending: true,
    },
  ];
};

export function solveVoxels(
  store: Pick<StackerStore, "dimensions" | "sides">,
  out: Uint8Array,
): Uint8Array {
  const {
    dimensions: { height, width, depth },
  } = store;
  const outLength = width * height * depth * 4;
  if (out.length !== outLength) {
    throw new Error(`out.lenght expected to be ${outLength}`);
  }

  const calcTargetOffset = ({ x, y, z }: Vector3D) => {
    return (z * width * height + y * width + x) << 2;
  };

  const axisStride = {
    x: 4,
    y: width * 4,
    z: width * height * 4,
  };

  const axisLength = {
    x: width,
    y: height,
    z: depth,
  };

  const views = createViews(store);

  // start off as white
  out.fill(255);

  // erase the silhouettes
  for (const { side, fixedCoords, axis } of views) {
    const length = axisLength[axis];
    const stride = axisStride[axis];

    for (let y = 0; y < side.height; ++y) {
      const rowOffset = y * side.width;

      for (let x = 0; x < side.width; ++x) {
        const sourceOffset = (rowOffset + x) << 2;

        if (side.data[sourceOffset + 3] !== 0) {
          continue;
        }

        let offset = calcTargetOffset(fixedCoords(x, y));

        for (let i = 0; i < length; ++i) {
          if (out[offset + 3] !== 0) {
            out[offset] = 0;
            out[offset + 1] = 0;
            out[offset + 2] = 0;
            out[offset + 3] = 0;
          }
          offset += stride;
        }
      }
    }
  }

  // colour the remaining voxels by casting each opaque pixel ray to the
  // nearest surviving voxel; views processed first take priority on overlap
  const painted = new Uint8Array(width * height * depth);
  for (const view of views) {
    const data = view.side.data;
    const imgWidth = view.side.width;
    const imgHeight = view.side.height;
    const length = axisLength[view.axis];

    for (let py = 0; py < imgHeight; ++py) {
      const rowOffset = py * imgWidth;

      for (let px = 0; px < imgWidth; ++px) {
        const sourceOffset = (rowOffset + px) << 2;

        if (data[sourceOffset + 3] === 0) {
          continue;
        }

        let offset = calcTargetOffset(view.fixedCoords(px, py));
        let stride = axisStride[view.axis];

        if (!view.nearestAscending) {
          offset += (length - 1) * stride;
          stride = -stride;
        }

        for (let i = 0; i < length; ++i) {
          if (out[offset + 3] !== 0) {
            if (painted[offset >> 2] === 0) {
              painted[offset >> 2] = 1;
              out[offset] = data[sourceOffset];
              out[offset + 1] = data[sourceOffset + 1];
              out[offset + 2] = data[sourceOffset + 2];
              out[offset + 3] = 255;
            }
            break;
          }
          offset += stride;
        }
      }
    }
  }

  return out;
}

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
