// Turns a voxel model's six side bitmaps into the bytes its material reads: a
// solid volume carved by the side silhouettes, each surviving voxel packed into
// four bytes holding six faces of five-bit palette index, with the top two
// alpha bits marking the voxel solid. Also encodes a palette as the one-row
// texel buffer the material's palette texture samples.
import type { RGBA } from "@big-mesh-studios/maths";
import { Bitmap, Dimensions3D, Vector3D } from "@big-mesh-studios/maths";
import {
  axisSides,
  dimensionAxes,
  dimensionKinds,
  type Axis,
  type Section,
  type Sides,
} from "./data";

export type ViewSpec = {
  kind: keyof Sides;
  side: Bitmap;
  axis: Axis;
  fixedCoords: (px: number, py: number) => Vector3D;
};

// Right-handed coordinate system: +x right, +y up, +z out of the front face
// toward the viewer. The front face is at z = depth - 1 (facing the camera at
// +z) and the back face is at z = 0. Each view fixes two coordinates and
// raymarches the remaining axis; the fixed coordinate tuples put the axis
// coordinate at 0.
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
      fixedCoords: (px, py) => Vector3D.create(px, 0, depth - 1 - py),
    },
  ];
};

/** One face bounding a stretch of an axis: a drawing, and where its cells sit. */
interface Face {
  /**
   * Where the cell `(px, py)` of this drawing stands in the volume, with the
   * coordinate along the axis it looks down left at zero.
   */
  fixedCoords: (px: number, py: number) => Vector3D;
  side: Bitmap;
}

/** A stretch of one axis and the two faces that close it. */
interface Segment {
  axis: Axis;
  /** The first index of the stretch. */
  from: number;
  /** One past its last index. */
  to: number;
  /** The face at the low end of the stretch, and the one at the high end. */
  faces: [Face, Face];
}

/**
 * Every stretch of every axis, in the order the axes are named, each with the
 * pair of faces that carve it and colour the voxels at its ends.
 *
 * An axis with no section across it is one stretch, closed by the two sides
 * that look along it. Each section divides the stretch it falls in, and hands
 * the two halves the faces it reveals.
 */
const createSegments = (
  dimensions: Dimensions3D,
  sections: Section[],
  views: ViewSpec[],
): Segment[] => {
  const viewByKind = new Map(views.map((view) => [view.kind, view]));
  const segments: Segment[] = [];

  for (const dimension of dimensionKinds) {
    const [lowKind, highKind] = axisSides[dimension];
    const low = viewByKind.get(lowKind)!;
    const high = viewByKind.get(highKind)!;
    const extent = dimensions[dimension];
    const axis = dimensionAxes[dimension];

    const cuts = sections
      .filter((section) => section.axis === dimension)
      .map((section) => ({
        ...section,
        at: Math.min(Math.max(section.at, 0), extent),
      }))
      .sort((one, other) => one.at - other.at);

    let from = 0;
    let opening: Face = { fixedCoords: low.fixedCoords, side: low.side };

    for (const cut of cuts) {
      segments.push({
        axis,
        from,
        to: cut.at,
        faces: [opening, { fixedCoords: high.fixedCoords, side: cut.before }],
      });
      from = cut.at;
      opening = { fixedCoords: low.fixedCoords, side: cut.after };
    }

    segments.push({
      axis,
      from,
      to: extent,
      faces: [opening, { fixedCoords: high.fixedCoords, side: high.side }],
    });
  }

  return segments;
};

/**
 * Which drawing a voxel's face takes its colour from, at each index along an
 * axis: the low end of its stretch in `low`, the high end in `high`.
 */
const facesAlong = (extent: number, segments: Segment[]) => {
  const low: Bitmap[] = new Array(extent);
  const high: Bitmap[] = new Array(extent);

  for (const segment of segments) {
    for (let index = segment.from; index < segment.to; index++) {
      low[index] = segment.faces[0].side;
      high[index] = segment.faces[1].side;
    }
  }

  return { low, high };
};

export function solveVoxels(
  dimensions: Dimensions3D,
  sides: Sides,
  sections: Section[] = [],
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

  const views = createViews(dimensions, sides);

  // Start off with every voxel solid, for the silhouettes to carve away. Only
  // the alpha byte is read until the packing below, which writes all four.
  out.fill(255);

  const segments = createSegments(dimensions, sections, views);

  // Erase the silhouettes. A face carves the stretch of the axis it closes and
  // no further, so a cut is what lets one stretch be carved away where the next
  // is left standing.
  for (const segment of segments) {
    const stride = axisStride[segment.axis];

    for (const { side, fixedCoords } of segment.faces) {
      for (let y = 0; y < side.height; ++y) {
        const rowOffset = y * side.width;

        for (let x = 0; x < side.width; ++x) {
          if (side.data[rowOffset + x] !== Bitmap.EMPTY) {
            continue;
          }

          let offset =
            calcTargetOffset(fixedCoords(x, y)) + segment.from * stride;

          for (let i = segment.from; i < segment.to; ++i) {
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
  }

  // Pack each surviving voxel into the shader's 30-bit face-colour format: six
  // faces, five bits per colour index, with the top two alpha bits marking the
  // voxel solid. Each face takes its colour from the drawing that looks at it —
  // the side where the voxel's stretch of the axis runs to the edge of the box,
  // and the face a section reveals where it does not.
  const along = {
    x: facesAlong(
      width,
      segments.filter((segment) => segment.axis === "x"),
    ),
    y: facesAlong(
      height,
      segments.filter((segment) => segment.axis === "y"),
    ),
    z: facesAlong(
      depth,
      segments.filter((segment) => segment.axis === "z"),
    ),
  };

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      const py = height - 1 - y;

      for (let x = 0; x < width; x++) {
        const offset = (z * width * height + y * width + x) << 2;

        if (out[offset + 3] === 0) {
          continue;
        }

        // front: (x, py), back: (width-1-x, py), left: (z, py),
        // right: (depth-1-z, py), top: (x, z), bottom: (x, depth-1-z)
        const f = faceColourIndex(along.z.high[z], x, py);
        const b = faceColourIndex(along.z.low[z], width - 1 - x, py);
        const l = faceColourIndex(along.x.low[x], z, py);
        const r = faceColourIndex(along.x.high[x], depth - 1 - z, py);
        const t = faceColourIndex(along.y.high[y], x, z);
        const bo = faceColourIndex(along.y.low[y], x, depth - 1 - z);

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
 * The palette index of the cell at (px, py) of `side`, which the packed format
 * holds in five bits. A solid voxel can still have an empty cell facing it, on
 * a face nothing has drawn on; those take index zero, the palette's black,
 * which is what the nearest-colour search this replaces also settled on.
 */
const faceColourIndex = (side: Bitmap, px: number, py: number): number => {
  const index = side.data[py * side.width + px];
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
