// Builds the scripts under `scripts/` as Node programs, so a script can import
// the app's own TypeScript — the rig vocabulary, the glTF reader, the bake — and
// run it without a browser.
//
// The sources are read straight from TypeScript, as the whole monorepo is, and
// the imports between them carry no extension: Node's own type stripping cannot
// resolve those, and neither can `node --experimental-transform-types`. Vite
// resolves them the way the dev server does, which is what makes one code path
// serve both the page and these scripts.
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist-node",
    emptyOutDir: true,
    minify: false,
    target: "node20",
    rollupOptions: {
      input: {
        "make-human-model": "scripts/make-human-model.ts",
      },
    },
  },
});
