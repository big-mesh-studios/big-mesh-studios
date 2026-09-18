// The rig every view reads through context. The context is created without a
// default, so a view outside the provider throws rather than reading an empty
// rig.
import { createContext } from "solid-js";
import { createRig } from "./rig-store";

export const RigContext = createContext<ReturnType<typeof createRig>>();
