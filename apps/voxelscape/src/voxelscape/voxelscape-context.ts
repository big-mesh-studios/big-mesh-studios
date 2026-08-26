import { createContext, useContext } from "solid-js";
import type { Voxelscape } from "./create-voxelscape";

export const VoxelscapeContext = createContext<Voxelscape>();

export const useVoxelscape = (): Voxelscape => useContext(VoxelscapeContext);
