import { Accessor } from "@solidjs/signals";
import { createContext } from "solid-js";
import { createStacker } from "./stacker-store";

export const StackerContext = createContext<ReturnType<typeof createStacker>>();
export const LayoutContext = createContext<Accessor<"column" | "row">>();
