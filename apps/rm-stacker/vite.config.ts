/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { precompileJS } from "@random-mesh/rmsl/vite";
import solid from "vite-plugin-solid";

export default defineConfig(({ command }) => ({
  // Addresses are real paths now, so an asset cannot be found relative to the
  // page that asked for it: `/big-mesh-studios/rm-stacker/profile` and
  // `/big-mesh-studios/rm-stacker/` sit at different depths and a relative
  // address would resolve differently on each.
  // The built site is served from a folder on GitHub Pages and says so; the
  // development server keeps the root, and `import.meta.env.BASE_URL` tells
  // the router and the sign-in which of the two they are running under.
  base: command === "build" ? "/big-mesh-studios/rm-stacker/" : "/",
  plugins: [
    precompileJS({ include: "src/picking/voxel-picker-cpu.ts" }),
    solid({ ssr: false }),
  ],
  server: {
    // Named rather than left to the default, which listens on the version six
    // loopback address alone. A browser resolves `localhost` to the version
    // four one, finds nothing listening there, and refuses the connection.
    host: "127.0.0.1",
  },
  optimizeDeps: {
    include: ["@solidjs/signals"],
  },
  test: {
    // The solid plugin prefers jsdom, which is not installed; the test suite
    // is pure maths and runs in Node.
    environment: "node",
  },
}));
