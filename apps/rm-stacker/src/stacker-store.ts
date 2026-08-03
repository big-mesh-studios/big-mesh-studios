import { createStore } from "solid-js";
import { solveVoxels } from "./voxel-solver";

const createSquareViewImageData = (imageSize: number, squareSize: number): ImageData => {
  const data = new ImageData(imageSize, imageSize);
  const offsetPx = (imageSize - squareSize) / 2;
  for (let y = 0; y < squareSize; y++) {
    for (let x = 0; x < squareSize; x++) {
      const i = ((offsetPx + y) * imageSize + (offsetPx + x)) << 2;
      data.data[i + 0] = 0;
      data.data[i + 1] = 0;
      data.data[i + 2] = 255;
      data.data[i + 3] = 255;
    }
  }
  return data;
};

export function createStackerStore() {
  const initialSides = {
    front: createSquareViewImageData(32, 16),
    left: createSquareViewImageData(32, 16),
    right: createSquareViewImageData(32, 16),
    back: createSquareViewImageData(32, 16),
    top: createSquareViewImageData(32, 16),
    bottom: createSquareViewImageData(32, 16),
  };
  const initialDimensions = { x: 32, y: 32, z: 32 };

  const [store, setStore] = createStore({
    dimensions: initialDimensions,
    sides: initialSides,
    voxels: solveVoxels(
      initialSides,
      new Uint8Array(initialDimensions.x * initialDimensions.y * initialDimensions.z * 4),
    ),
  });

  return {
    store,
    setStore,
    updateVoxels() {
      setStore(store => {
        store.voxels = solveVoxels(
          store.sides,
          new Uint8Array(store.dimensions.x * store.dimensions.y * store.dimensions.z * 4),
        );
      });
    },
  };
}
