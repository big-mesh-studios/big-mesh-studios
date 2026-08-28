// The size of the box bounding a voxel model, matching the box the ray marcher
// intersects: the volume (normalized) padded by one voxel on each side, so
// rasterizing it limits the fragment shader to the pixels that could possibly
// land on a voxel. Ported from rm-stacker (MIT, big-mesh-studios).
import { Dimensions3D } from "./data";

export const boxSize = (dimensions: Dimensions3D) => {
  const normalized = Dimensions3D.normalize(dimensions);
  const scale = (axis: number, count: number) => axis * (1 + 2 / count);
  return {
    width: scale(normalized.width, dimensions.width),
    height: scale(normalized.height, dimensions.height),
    depth: scale(normalized.depth, dimensions.depth),
  };
};
