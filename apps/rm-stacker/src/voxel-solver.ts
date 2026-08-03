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
