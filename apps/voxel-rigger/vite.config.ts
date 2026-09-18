import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
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
});
