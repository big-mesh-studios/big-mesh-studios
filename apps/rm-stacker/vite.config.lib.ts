/// <reference types="node" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

/**
 * Everything imported by name rather than by path is left for the consumer's
 * own bundler to resolve, so a package this library shares with the app that
 * embeds it — Solid above all — is present exactly once at runtime.
 */
const isBareImport = (id: string) => !id.startsWith(".") && !id.startsWith("/");

export default defineConfig({
  plugins: [solid({ ssr: false })],
  // The editor's client metadata document is served by the site, not shipped
  // to whoever installs the package.
  publicDir: false,
  build: {
    lib: {
      // One file per thing a consumer might want, rather than one barrel:
      // reading a published record should not pull in a zip decoder, and
      // reading a file should not pull in a lexicon.
      entry: {
        format: resolve(import.meta.dirname, "src/format.ts"),
        lexicon: resolve(import.meta.dirname, "src/lexicon.ts"),
      },
      formats: ["es"],
      fileName: (_format, entry) => `${entry}.js`,
    },
    rollupOptions: {
      external: isBareImport,
    },
    outDir: "dist-lib",
    emptyOutDir: true,
  },
});
