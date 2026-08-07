import { StackerStore } from "./stacker-store";
import { Axis, Dimensions3D, Sides, Vector3D } from "./types";

type ViewSpec = {
  side: ImageData;
  axis: Axis;
  fixedCoords: (px: number, py: number) => Vector3D;
  nearestAscending: boolean;
};

export function solveVoxels(
  {
    sides: { front, left, right, back, top, bottom },
    dimensions: { height, width, depth },
  }: Pick<StackerStore, "dimensions" | "sides">,
  out: Uint8Array,
): Uint8Array {
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

  // Right-handed coordinate system: +x right, +y up, +z toward the viewer.
  // The front face is at z = size - 1 (nearest to the front camera) and the
  // back face is at z = 0. Each view fixes two coordinates and raymarches the
  // remaining axis; the fixed coordinate tuples put the axis coordinate at 0.
  const views: ViewSpec[] = [
    {
      side: front,
      axis: "z",
      fixedCoords: (px, py) => ({ x: px, y: height - 1 - py, z: 0 }),
      nearestAscending: false,
    },
    {
      side: back,
      axis: "z",
      fixedCoords: (px, py) => ({ x: width - 1 - px, y: height - 1 - py, z: 0 }),
      nearestAscending: true,
    },
    {
      side: left,
      axis: "x",
      fixedCoords: (px, py) => ({ x: 0, y: height - 1 - py, z: px }),
      nearestAscending: true,
    },
    {
      side: right,
      axis: "x",
      fixedCoords: (px, py) => ({ x: 0, y: height - 1 - py, z: depth - 1 - px }),
      nearestAscending: false,
    },
    {
      side: top,
      axis: "y",
      fixedCoords: (px, py) => ({ x: px, y: 0, z: py }),
      nearestAscending: false,
    },
    {
      side: bottom,
      axis: "y",
      fixedCoords: (px, py) => ({ x: px, y: 0, z: depth - 1 - py }),
      nearestAscending: true,
    },
  ];

  // start off as white
  out.fill(255);

  // Cell masks: 1 where either view of a face pair has an opaque pixel at that
  // projected cell. Pair-then-index so column/row scans walk contiguous memory.
  const opaque = (side: ImageData, px: number, py: number) =>
    side.data[((py * side.width + px) << 2) + 3] !== 0;

  // XY plane (front/back), cell (x, y) -> xy[y * width + x]
  const xy = new Uint8Array(width * height);
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (
        opaque(views[0].side, x, height - 1 - y) ||
        opaque(views[1].side, width - 1 - x, height - 1 - y)
      ) {
        xy[y * width + x] = 1;
      }
    }
  }

  // XZ plane (top/bottom), cell (x, z) -> xz[z * width + x]
  const xz = new Uint8Array(width * depth);
  for (let z = 0; z < depth; ++z) {
    for (let x = 0; x < width; ++x) {
      if (opaque(views[4].side, x, z) || opaque(views[5].side, x, depth - 1 - z)) {
        xz[z * width + x] = 1;
      }
    }
  }

  // YZ plane (left/right), cell (y, z) -> yz[y * depth + z]
  const yz = new Uint8Array(height * depth);
  for (let y = 0; y < height; ++y) {
    for (let z = 0; z < depth; ++z) {
      if (
        opaque(views[2].side, z, height - 1 - y) ||
        opaque(views[3].side, depth - 1 - z, height - 1 - y)
      ) {
        yz[y * depth + z] = 1;
      }
    }
  }

  // An "aligned line" is the column/row of one face pair that runs through the
  // same coordinates a drawn pixel's ray projects onto. When a line holds no
  // pixels at all, that face pair behaves like a full line of pixels instead of
  // carving the volume.
  const xyColEmpty = new Uint8Array(width);
  const xzColEmpty = new Uint8Array(width);
  const yzRowEmpty = new Uint8Array(height);
  for (let x = 0; x < width; ++x) {
    for (let y = 0; y < height; ++y) {
      if (xy[y * width + x]) {
        xyColEmpty[x] = 1;
      }
    }
    for (let z = 0; z < depth; ++z) {
      if (xz[z * width + x]) {
        xzColEmpty[x] = 1;
      }
    }
  }
  for (let y = 0; y < height; ++y) {
    for (let z = 0; z < depth; ++z) {
      if (yz[y * depth + z]) {
        yzRowEmpty[y] = 1;
      }
    }
  }

  // Carve the volume. A voxel survives only if it sits inside a drawn
  // silhouette, and every face pair either has a pixel at that cell or its
  // aligned line is empty (the "full line of pixels" fallback).
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const xyCell = xy[y * width + x];

      for (let z = 0; z < depth; ++z) {
        const xzCell = xz[z * width + x];
        const yzCell = yz[y * depth + z];

        const present =
          (xyCell || xzCell || yzCell) &&
          (xyCell || !xyColEmpty[x]) &&
          (xzCell || !xzColEmpty[x]) &&
          (yzCell || !yzRowEmpty[y]);

        if (!present) {
          const offset = calcTargetOffset({ x, y, z });
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
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
