import { compileJS, compileJSFn } from "@random-mesh/rmsl";
import { cpuVoxelPicker, cpuVoxelRenderer } from "./shaders-shared";

// This module is compiled once at build time by the precompileJS plugin from
// @random-mesh/rmsl/vite, which replaces it with a plain callable so the rmsl
// graph is never built (and rmsl is never shipped) in the browser. The exports
// here are the fallback that runs when the plugin is not active.
export const __RMSL_JS_CODE = {
  voxelPicker: compileJSFn(() => cpuVoxelPicker(), {
    name: "voxelPicker",
    params: [],
  }),
  voxelRenderer: compileJSFn(() => cpuVoxelRenderer(), {
    name: "voxelRenderer",
    params: [],
  }),
};

export const voxelPicker = compileJS(() => cpuVoxelPicker(), {
  name: "voxelPicker",
  params: [],
});

export const voxelRenderer = compileJS(() => cpuVoxelRenderer(), {
  name: "voxelRenderer",
  params: [],
});
