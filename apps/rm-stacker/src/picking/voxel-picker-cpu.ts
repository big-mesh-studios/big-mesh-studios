import { compileJSFn, compileJSRoutine } from "@random-mesh/rmsl/js";
import { cpuVoxelPicker } from "../shaders-shared";

// This module is compiled once at build time by the precompileJS plugin from
// @random-mesh/rmsl/vite, which replaces it with a plain callable so the rmsl
// graph is never built (and rmsl is never shipped) in the browser. The exports
// here are the fallback that runs when the plugin is not active.
export const __RMSL_JS_CODE = {
  voxelPicker: compileJSFn(() => cpuVoxelPicker(), {
    name: "voxelPicker",
    params: [],
  }),
};

export const voxelPicker = compileJSRoutine(() => cpuVoxelPicker(), {
  name: "voxelPicker",
  params: [],
}).run;
