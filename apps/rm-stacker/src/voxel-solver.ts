import { Bitmap, Dimensions3D } from "./maths";
import { Axis, Sides, Vector3D } from "./types";

export type ViewSpec = {
  kind: keyof Sides;
  side: Bitmap;
  axis: Axis;
  fixedCoords: (px: number, py: number) => Vector3D;
  nearestAscending: boolean;
};

// Right-handed coordinate system: +x right, +y up, +z toward the viewer.
// The front face is at z = size - 1 (nearest to the front camera) and the
// back face is at z = 0. Each view fixes two coordinates and raymarches the
// remaining axis; the fixed coordinate tuples put the axis coordinate at 0.
const createViews = (
  { height, width, depth }: Dimensions3D,
  { front, left, right, back, top, bottom }: Sides,
): ViewSpec[] => {
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
  dimensions: Dimensions3D,
  sides: Sides,
  out: Uint8Array = new Uint8Array(dimensions.width * dimensions.height * dimensions.depth * 4),
): Uint8Array {
  const { height, width, depth } = dimensions;
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

  const views = createViews(dimensions, sides);

  // start off as white
  out.fill(255);

  // erase the silhouettes
  for (const { side, fixedCoords, axis } of views) {
    const length = axisLength[axis];
    const stride = axisStride[axis];

    for (let y = 0; y < side.height; ++y) {
      const rowOffset = y * side.width;

      for (let x = 0; x < side.width; ++x) {
        if (side.data[rowOffset + x] !== Bitmap.EMPTY) {
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
        const sourceOffset = rowOffset + px;

        if (data[sourceOffset] === Bitmap.EMPTY) {
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
              out[offset + 1] = data[sourceOffset];
              out[offset + 2] = data[sourceOffset];
              out[offset + 3] = 255;
            }
            break;
          }
          offset += stride;
        }
      }
    }
  }

  // Pack each solid voxel into the shader's 30-bit face-colour format: six
  // faces, five bits per colour index, with the top two alpha bits marking the
  // voxel solid. Which side paints which face follows the view raymarches above.
  const sideByKind = new Map(views.map(view => [view.kind, view]));

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      const py = height - 1 - y;

      for (let x = 0; x < width; x++) {
        const offset = (z * width * height + y * width + x) << 2;

        if (out[offset + 3] === 0) {
          continue;
        }

        const front = sideByKind.get("front")!;
        const back = sideByKind.get("back")!;
        const left = sideByKind.get("left")!;
        const right = sideByKind.get("right")!;
        const top = sideByKind.get("top")!;
        const bottom = sideByKind.get("bottom")!;

        // front: (x, py), back: (width-1-x, py), left: (z, py),
        // right: (depth-1-z, py), top: (x, z), bottom: (x, depth-1-z)
        const f = faceColourIndex(front, x, py);
        const b = faceColourIndex(back, width - 1 - x, py);
        const l = faceColourIndex(left, z, py);
        const r = faceColourIndex(right, depth - 1 - z, py);
        const t = faceColourIndex(top, x, z);
        const bo = faceColourIndex(bottom, x, depth - 1 - z);

        out[offset + 0] = f | ((b & 0b111) << 5);
        out[offset + 1] = ((b >> 3) & 0b11) | ((l & 0b11111) << 2) | ((r & 0b1) << 7);
        out[offset + 2] = ((r >> 1) & 0b1111) | ((t & 0b1111) << 4);
        out[offset + 3] = ((t >> 4) & 0b1) | ((bo & 0b11111) << 1) | 0b11000000;
      }
    }
  }

  return out;
}

/**
 * The palette index of the side cell at (px, py), which the packed format holds
 * in five bits. A solid voxel can still have an empty cell facing it, on a face
 * no panel has drawn on; those take index zero, the palette's black, which is
 * what the nearest-colour search this replaces also settled on.
 */
const faceColourIndex = (view: ViewSpec, px: number, py: number): number => {
  const index = view.side.data[py * view.side.width + px];
  return index === Bitmap.EMPTY ? 0 : index;
};
