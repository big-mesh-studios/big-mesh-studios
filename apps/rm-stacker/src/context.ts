import { createContext } from "solid-js";
import { createStacker } from "./stacker-store";

export const StackerContext = createContext<ReturnType<typeof createStacker>>();
