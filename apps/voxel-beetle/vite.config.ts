/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig(({ command }) => ({
  // Addresses are real paths, so an asset cannot be found relative to the page
  // that asked for it: `/big-mesh-studios/voxel-beetle/` and
  // `/big-mesh-studios/voxel-beetle/files` sit at different depths and a
  // relative address would resolve differently on each. The built site is
  // served from a folder on GitHub Pages and says so; the development server
  // keeps the root, and `import.meta.env.BASE_URL` tells the router which of the
  // two it is running under.
  base: command === "build" ? "/big-mesh-studios/voxel-beetle/" : "/",
  plugins: [solid({ ssr: false })],
  server: {
    // Named rather than left to the default, which listens on the version six
    // loopback address alone. A browser resolves `localhost` to the version
    // four one, finds nothing listening there, and refuses the connection.
    host: "127.0.0.1",
  },
  optimizeDeps: {
    include: ["@solidjs/signals"],
    // Only this app's page is scanned for dependencies. The monorepo carries
    // other applications whose dependencies are not installed here, and
    // crawling them fails the scan.
    entries: ["index.html"],
  },
  test: {
    // The solid plugin prefers jsdom, which is not installed; the test suite
    // is pure maths and runs in Node.
    environment: "node",
  },
}));
