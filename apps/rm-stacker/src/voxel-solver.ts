import { Bitmap, Dimensions3D, Vector3D } from "./maths";
import { Axis, Sides } from "./types";

export type ViewSpec = {
  kind: keyof Sides;
  side: Bitmap;
  axis: Axis;
  fixedCoords: (px: number, py: number) => Vector3D;
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
      fixedCoords: (px, py) => Vector3D.create(px, height - 1 - py, 0),
    },
    {
      kind: "back",
      side: back,
      axis: "z",
      fixedCoords: (px, py) => Vector3D.create(width - 1 - px, height - 1 - py, 0),
    },
    {
      kind: "left",
      side: left,
      axis: "x",
      fixedCoords: (px, py) => Vector3D.create(0, height - 1 - py, px),
    },
    {
      kind: "right",
      side: right,
      axis: "x",
      fixedCoords: (px, py) => Vector3D.create(0, height - 1 - py, depth - 1 - px),
    },
    {
      kind: "top",
      side: top,
      axis: "y",
      fixedCoords: (px, py) => Vector3D.create(px, 0, py),
    },
    {
      kind: "bottom",
      side: bottom,
      axis: "y",
      fixedCoords: (px, py) => Vector3D.create(px, 0, depth - 1 - py),
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

  // Start off with every voxel solid, for the silhouettes to carve away. Only
  // the alpha byte is read until the packing below, which writes all four.
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

  // Pack each surviving voxel into the shader's 30-bit face-colour format: six
  // faces, five bits per colour index, with the top two alpha bits marking the
  // voxel solid. Each face takes its colour from the panel that looks at it,
  // read at the position the coordinates below work out.
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
