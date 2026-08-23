import { createContext } from "solid-js";
import { createStacker } from "./store/stacker-store";

export const StackerContext = createContext<ReturnType<typeof createStacker>>();
