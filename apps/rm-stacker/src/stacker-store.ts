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

export function createStackerStore() {
  const initialSides: Sides = {
    front: createInitialImageData(32, 4),
    left: createInitialImageData(32, 4),
    right: createInitialImageData(32, 4),
    back: createInitialImageData(32, 4),
    top: createInitialImageData(32, 4),
    bottom: createInitialImageData(32, 4),
  };
  const initialDimensions: Dimensions3D = { width: 32, height: 32, depth: 32 };

  const [store, setStore] = createStore<StackerStore>({
    dimensions: initialDimensions,
    sides: initialSides,
    voxels: solveVoxels(
      initialSides,
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
          store.sides,
          new Uint8Array(
            store.dimensions.width * store.dimensions.height * store.dimensions.depth * 4,
          ),
        );
      });
    },
  };
}
