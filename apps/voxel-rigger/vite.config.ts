import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig(({ command }) => ({
  // The folder GitHub Pages serves this application from. A built asset
  // addresses itself from the site root, and the bundled samples are fetched
  // through `import.meta.env.BASE_URL`, which Vite sets to this same value, so
  // a build under a folder and a development server at the root both find what
  // they ask for.
  base: command === "build" ? "/big-mesh-studios/voxel-rigger/" : "/",
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
}));
