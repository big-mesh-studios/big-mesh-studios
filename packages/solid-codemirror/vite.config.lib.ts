import { resolve } from "path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  // Root-relative ("/assets/...") asset URLs are meaningless once this
  // package's dist/ is consumed from inside another app's own build — a
  // consumer's bundler resolves that leading slash against its own public
  // dir, not this package's. Relative URLs resolve correctly wherever the
  // published files end up.
  base: "./",
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
