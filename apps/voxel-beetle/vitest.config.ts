import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

// The maths runs in node, where it needs nothing. One file mounts part of the
// editor, which needs the Solid plugin; it asks for jsdom itself, at the top of
// its own file. The 3D preview is not mounted anywhere here, because it wants a
// graphics card and there is none to be had.
export default defineConfig({
  plugins: [solid({ ssr: false })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
