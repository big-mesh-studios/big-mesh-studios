import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  base: "./",
  server: {
    // Named rather than left to the default, which listens on the version six
    // loopback address alone. A browser resolves `localhost` to the version
    // four one, finds nothing listening there, and refuses the connection.
    host: "127.0.0.1",
  },
  plugins: [solid({ ssr: false })],
});
