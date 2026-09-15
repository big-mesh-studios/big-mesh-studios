import { createContext } from "solid-js";
import type { LevelEditor } from "./level-editor-store";

/** The editor store the panels read through `useContext`. */
export const LevelEditorContext = createContext<LevelEditor>();
