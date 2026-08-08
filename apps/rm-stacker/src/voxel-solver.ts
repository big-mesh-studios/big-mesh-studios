import { StackerStore } from "./stacker-store";
import { Axis, Dimensions3D, Sides, Vector3D } from "./types";

const OPPOSING_KINDS: Record<keyof Sides, keyof Sides> = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

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

/**
 * For each side, computes a mask (1 = needed) of the pixels whose rays pass
 * through at least one voxel that survives carving by every other *drawn* view.
 * Each face is auto-mirrored to its opposite by the editor, so the opposite face
 * is excluded (it is never an independent constraint). Faces with no opaque
 * pixels are treated as "not yet drawn" and don't constrain, so the guides
 * appear progressively as you draw more views.
 */
export function computeGuideMasks(
  store: Pick<StackerStore, "dimensions" | "sides">,
): Record<keyof Sides, Uint8Array> {
  const {
    dimensions: { height, width, depth },
  } = store;
  const views = createViews(store);
  const axisStride = {
    x: 1,
    y: width,
    z: width * height,
  };
  const axisLength = {
    x: width,
    y: height,
    z: depth,
  };
  const voxelCount = width * height * depth;
  const calcTargetIndex = ({ x, y, z }: Vector3D) => {
    return z * width * height + y * width + x;
  };

  const guides: Record<keyof Sides, Uint8Array> = {} as Record<keyof Sides, Uint8Array>;

  for (const target of views) {
    // Track which voxels survive carving by every other drawn view.
    const survives = new Uint8Array(voxelCount);
    survives.fill(1);
    let constrained = false;

    for (const other of views) {
      if (other === target || other.kind === OPPOSING_KINDS[target.kind]) {
        continue;
      }
      if (!sideHasOpaquePixels(other.side)) {
        continue;
      }
      constrained = true;
      const length = axisLength[other.axis];
      const stride = axisStride[other.axis];
      const data = other.side.data;
      for (let py = 0; py < other.side.height; ++py) {
        const rowOffset = py * other.side.width;
        for (let px = 0; px < other.side.width; ++px) {
          const sourceOffset = (rowOffset + px) << 2;
          if (data[sourceOffset + 3] !== 0) {
            continue;
          }
          let index = calcTargetIndex(other.fixedCoords(px, py));
          for (let i = 0; i < length; ++i) {
            survives[index] = 0;
            index += stride;
          }
        }
      }
    }

    // Project the surviving voxels onto the target face.
    const mask = new Uint8Array(target.side.width * target.side.height);
    if (constrained) {
      const length = axisLength[target.axis];
      const stride = axisStride[target.axis];
      for (let py = 0; py < target.side.height; ++py) {
        for (let px = 0; px < target.side.width; ++px) {
          let index = calcTargetIndex(target.fixedCoords(px, py));
          let needed = false;
          for (let i = 0; i < length && !needed; ++i) {
            if (survives[index] !== 0) {
              needed = true;
            }
            index += stride;
          }
          mask[py * target.side.width + px] = needed ? 1 : 0;
        }
      }
    }
    guides[target.kind] = mask;
  }

  return guides;
}

const sideHasOpaquePixels = (side: ImageData): boolean => {
  const data = side.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) {
      return true;
    }
  }
  return false;
};
