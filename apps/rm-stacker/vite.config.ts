/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { precompileJS } from "@random-mesh/rmsl/vite";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  base: "./",
  plugins: [
    precompileJS({ include: "src/model-gpu/voxel-picker-cpu.ts" }),
    tailwindcss(),
    solid({ ssr: false }),
  ],
  optimizeDeps: {
    include: ["@solidjs/signals"],
  },
  test: {
    // The solid plugin prefers jsdom, which is not installed; the test suite
    // is pure maths and runs in Node.
    environment: "node",
  },
});
