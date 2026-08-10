import { defineConfig } from "vite";
import precompileShaders from "./vite-precompile-shaders";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  base: "./",
  plugins: [precompileShaders(), tailwindcss(), solid({ ssr: false })],
  optimizeDeps: {
    include: ["@solidjs/signals"],
  },
});
