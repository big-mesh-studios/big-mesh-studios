
type ViewSpec = {
  img: ImageData,
  axis: 0 | 1 | 2,
  fixedCoords: (px: number, py: number) => [number, number, number],
  nearestAscending: boolean,
};

export function solveVoxels(params: {
  front: ImageData,
  left: ImageData,
  right: ImageData,
  back: ImageData,
  top: ImageData,
  bottom: ImageData,
  out: Uint8Array,
}) {
  let { front, left, right, back, top, bottom, out } = params;
  let size = front.width;
  if (
    front.height !== size || left.width !== size || left.height !== size || right.width !== size ||
    right.height !== size || back.width !== size || back.height !== size || top.width !== size ||
    top.height !== size || bottom.width !== size || bottom.height !== size
  ) {
    throw new Error("All image faces are expected to be square and of same size");
  }
  let outLength = size * size * size * 4;
  if (out.length !== outLength) {
    throw new Error(`out.lenght expected to be ${outLength}`);
  }
  let sizeSquared = size * size;
  let calcTargetOffset = (x: number, y: number, z: number) => {
    return (z * sizeSquared + y * size + x) << 2;
  };
  let axisStride = (axis: number) => {
    return axis === 0 ? 4 : axis === 1 ? size * 4 : sizeSquared * 4;
  };
  // Right-handed coordinate system: +x right, +y up, +z toward the viewer.
  // The front face is at z = size - 1 (nearest to the front camera) and the
  // back face is at z = 0. Each view fixes two coordinates and raymarches the
  // remaining axis; the fixed coordinate tuples put the axis coordinate at 0.
  let views: ViewSpec[] = [
    {
      img: front,
      axis: 2,
      fixedCoords: (px, py) => [px, size - 1 - py, 0],
      nearestAscending: false,
    },
    {
      img: back,
      axis: 2,
      fixedCoords: (px, py) => [size - 1 - px, size - 1 - py, 0],
      nearestAscending: true,
    },
    {
      img: left,
      axis: 0,
      fixedCoords: (px, py) => [0, size - 1 - py, px],
      nearestAscending: true,
    },
    {
      img: right,
      axis: 0,
      fixedCoords: (px, py) => [0, size - 1 - py, size - 1 - px],
      nearestAscending: false,
    },
    {
      img: top,
      axis: 1,
      fixedCoords: (px, py) => [px, 0, py],
      nearestAscending: false,
    },
    {
      img: bottom,
      axis: 1,
      fixedCoords: (px, py) => [px, 0, size - 1 - py],
      nearestAscending: true,
    },
  ];
  // start off as white and erase the silhouettes
  out.fill(255);
  for (let view of views) {
    let data = view.img.data;
    for (let py = 0; py < size; ++py) {
      let rowOffset = py * size;
      for (let px = 0; px < size; ++px) {
        let sourceOffset = (rowOffset + px) << 2;
        if (data[sourceOffset + 3] !== 0) {
          continue;
        }
        let [x, y, z] = view.fixedCoords(px, py);
        let offset = calcTargetOffset(x, y, z);
        let stride = axisStride(view.axis);
        for (let i = 0; i < size; ++i) {
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
  let painted = new Uint8Array(size * size * size);
  for (let view of views) {
    let data = view.img.data;
    for (let py = 0; py < size; ++py) {
      let rowOffset = py * size;
      for (let px = 0; px < size; ++px) {
        let sourceOffset = (rowOffset + px) << 2;
        if (data[sourceOffset + 3] === 0) {
          continue;
        }
        let [x, y, z] = view.fixedCoords(px, py);
        let offset = calcTargetOffset(x, y, z);
        let stride = axisStride(view.axis);
        if (!view.nearestAscending) {
          offset += (size - 1) * stride;
          stride = -stride;
        }
        for (let i = 0; i < size; ++i) {
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
}
