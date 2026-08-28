import { defineConfig } from "astro/config";

// The site is served from a folder on GitHub Pages, one level below the
// domain, and the two applications sit in folders beside this one. Saying so
// here is what makes `import.meta.env.BASE_URL` point at the site root, which
// is what every address on this page is built from.
export default defineConfig({
  site: "https://big-mesh-studios.github.io",
  base: "/big-mesh-studios/",
});
