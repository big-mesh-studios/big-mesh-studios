import { createStore } from "solid-js";
import { solveVoxels } from "./voxel-solver";
import type { Dimensions2D, Dimensions3D, Sides, Vector2D } from "./types";

export interface StackerStore {
  dimensions: Dimensions3D;
  sides: Sides;
  voxels: Uint8Array;
}

const createInitialImageData = (
  dimensions: Dimensions2D | number,
  padding: Vector2D | number,
): ImageData => {
  dimensions =
    typeof dimensions === "number" ? { width: dimensions, height: dimensions } : dimensions;
  padding = typeof padding === "number" ? { x: padding, y: padding } : padding;

  const data = new ImageData(dimensions.width, dimensions.height);

  for (let y = 0; y < dimensions.height - padding.y * 2; y++) {
    for (let x = 0; x < dimensions.width - padding.x * 2; x++) {
      const i = ((padding.y + y) * dimensions.width + (padding.x + x)) << 2;

      data.data[i + 0] = 0;
      data.data[i + 1] = 0;
      data.data[i + 2] = 255;
      data.data[i + 3] = 255;
    }
  }
  return data;
};

const createInitialSides = (dimensions: Dimensions3D) => {
  return {
    front: createInitialImageData({ width: dimensions.width, height: dimensions.height }, 4),
    back: createInitialImageData({ width: dimensions.width, height: dimensions.height }, 4),
    left: createInitialImageData({ width: dimensions.depth, height: dimensions.height }, 4),
    right: createInitialImageData({ width: dimensions.depth, height: dimensions.height }, 4),
    top: createInitialImageData({ width: dimensions.width, height: dimensions.depth }, 4),
    bottom: createInitialImageData({ width: dimensions.width, height: dimensions.depth }, 4),
  };
};

export function createStackerStore() {
  const initialDimensions: Dimensions3D = { width: 32, height: 64, depth: 16 };
  const initialSides: Sides = createInitialSides(initialDimensions);

  const [store, setStore] = createStore<StackerStore>({
    dimensions: initialDimensions,
    sides: initialSides,
    voxels: solveVoxels(
      { sides: initialSides, dimensions: initialDimensions },
      new Uint8Array(
        initialDimensions.width * initialDimensions.height * initialDimensions.depth * 4,
      ),
    ),
  });

  return {
    store,
    setStore,
    updateVoxels() {
      setStore(store => {
        store.voxels = solveVoxels(
          store,
          new Uint8Array(
            store.dimensions.width * store.dimensions.height * store.dimensions.depth * 4,
          ),
        );
      });
    },
  };
}
