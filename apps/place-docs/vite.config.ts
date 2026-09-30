import { resolve } from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// The site is served from a folder on GitHub Pages, one level below the domain,
// and the other applications sit in folders beside this one. Saying so here is
// what makes `import.meta.env.BASE_URL` point at the documentation's own folder,
// which is what every address in these pages is built from.
export default defineConfig({
  base: "/big-mesh-studios/docs/",
  // Nothing on these pages reacts. The reference is drawn from the artifact at
  // build time and the only script is the filter over it, which is a dozen
  // lines of plain DOM rather than a framework, so the markup is generated once
  // and served as a file. Without `hydratable`, the compiler leaves out the keys
  // and comment markers that only a browser picking the page back up would read.
  plugins: [solid({ ssr: true, solid: { hydratable: false } })],
  build: {
    rollupOptions: {
      input: {
        guides: resolve(import.meta.dirname, "src/entry-guides.tsx"),
        reference: resolve(import.meta.dirname, "src/entry-reference.tsx"),
      },
    },
  },
});
