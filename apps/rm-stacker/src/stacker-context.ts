import { createContext } from "solid-js";
import { createStackerStore } from "./stacker-store";

export const StackerContext = createContext<ReturnType<typeof createStackerStore>>();
