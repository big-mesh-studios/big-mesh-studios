import { resolve } from "path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ ssr: false })],
  worker: {
    format: "es",
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.tsx"),
        "typescript-cdn": resolve(__dirname, "src/typescript-cdn.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["solid-js", "@solidjs/web"],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
