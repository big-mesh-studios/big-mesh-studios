import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// The site is served from a folder on GitHub Pages, one level below the
// domain, and the two applications sit in folders beside this one. Saying so
// here is what makes `import.meta.env.BASE_URL` point at the site root, which
// is what every address on the page is built from.
export default defineConfig({
  base: "/big-mesh-studios/",
  // Nothing on this page reacts, so the markup is generated once and served
  // as a file. Without `hydratable`, the compiler leaves out the keys and
  // comment markers that only a browser picking the page back up would read.
  plugins: [solid({ ssr: true, solid: { hydratable: false } })],
});
