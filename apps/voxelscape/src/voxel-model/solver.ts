// Turns a voxel model's six side bitmaps into the bytes its material reads:
// a solid volume carved by the side silhouettes, each surviving voxel packed
// into four bytes holding six faces of five-bit palette index with the top two
// alpha bits marking the voxel solid. Also encodes a palette as the one-row
// texel buffer the material's palette texture samples. Ported from rm-stacker
// (MIT, big-mesh-studios).
import { Bitmap, Dimensions3D, Vector3D, type RGBA } from "./data";

export type ViewSpec = {
  kind: string;
  side: Bitmap;
  axis: "x" | "y" | "z";
  fixedCoords: (px: number, py: number) => Vector3D;
};

// Right-handed coordinate system: +x right, +y up, +z out of the front face
// toward the viewer. The front face is at z = depth - 1 (facing the camera at
// +z) and the back face is at z = 0. Each view fixes two coordinates and
// carves along the remaining axis.
const createViews = (
  { height, width, depth }: Dimensions3D,
  { front, left, right, back, top, bottom }: Record<string, Bitmap>,
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
      fixedCoords: (px, py) =>
        Vector3D.create(width - 1 - px, height - 1 - py, 0),
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
      fixedCoords: (px, py) =>
        Vector3D.create(0, height - 1 - py, depth - 1 - px),
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
      fixedCoords: (px, py) => Vector3D.create(px, 0, 1 - depth - py),
    },
  ];
};

export function solveVoxels(
  dimensions: Dimensions3D,
  sides: Record<string, Bitmap>,
  out: Uint8Array = new Uint8Array(
    dimensions.width * dimensions.height * dimensions.depth * 4,
  ),
): Uint8Array {
  const { height, width, depth } = dimensions;
  const outLength = width * height * depth * 4;
  if (out.length !== outLength) {
    throw new Error(`out.length expected to be ${outLength}`);
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

  // Start off with every voxel solid, for the silhouettes to carve away.
  out.fill(255);

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
  // voxel solid.
  const sideByKind = new Map(views.map((view) => [view.kind, view]));

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

        const f = faceColourIndex(front, x, py);
        const b = faceColourIndex(back, width - 1 - x, py);
        const l = faceColourIndex(left, z, py);
        const r = faceColourIndex(right, depth - 1 - z, py);
        const t = faceColourIndex(top, x, z);
        const bo = faceColourIndex(bottom, x, depth - 1 - z);

        out[offset + 0] = f | ((b & 0b111) << 5);
        out[offset + 1] =
          ((b >> 3) & 0b11) | ((l & 0b11111) << 2) | ((r & 0b1) << 7);
        out[offset + 2] = ((r >> 1) & 0b1111) | ((t & 0b1111) << 4);
        out[offset + 3] = ((t >> 4) & 0b1) | ((bo & 0b11111) << 1) | 0b11000000;
      }
    }
  }

  return out;
}

/**
 * The palette index of the side cell at (px, py), which the packed format holds
 * in five bits. A solid voxel can still have an empty cell facing it; those
 * take index zero, the palette's black.
 */
const faceColourIndex = (view: ViewSpec, px: number, py: number): number => {
  const index = view.side.data[py * view.side.width + px];
  return index === Bitmap.EMPTY ? 0 : index;
};

/** The palette as the material wants it: one row of texels, RGBA, in order. */
export function encodePalette(palette: RGBA[]): Uint8Array {
  const data = new Uint8Array(palette.length * 4);
  palette.forEach(({ r, g, b, a }, i) => {
    const offset = i << 2;
    data[offset + 0] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  });
  return data;
}
