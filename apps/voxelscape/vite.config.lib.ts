import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  plugins: [solid({ ssr: false })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib.ts"),
      name: "Voxelscape",
      fileName: (format) => `lib.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // Exclude peer dependencies to minimize library bundle size
      external: [
        "solid-js",
        "@solidjs/web",
        "@solidjs/signals",
        "three",
        "@random-mesh/rmsl",
        "@random-mesh/rmsl/scene",
      ],
      output: {
        globals: {
          "solid-js": "Solid",
          three: "THREE",
          "@random-mesh/rmsl": "rmsl",
          "@random-mesh/rmsl/scene": "scene",
        },
      },
    },
    outDir: "dist-lib",
    emptyOutDir: true,
  },
});
