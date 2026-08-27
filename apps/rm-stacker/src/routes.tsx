// The two pages, and how the address bar picks between them.
//
// Addresses are real paths — `/profile`, not `#/profile` — under whatever
// folder the site is served from. GitHub Pages has no idea `/profile` is a
// page rather than a missing file, so the deployment answers for one it cannot
// find with the application itself (see the workflow that copies `index.html`
// to `404.html`), and the router then reads the address it was asked for.
//
// `base` is where the application sits: the root while developing, a folder on
// the deployed site. Everything that has to build an address of its own reads
// the same value.
import { createRouter, defineRoutes } from "@solidjs/router";
import EditorPage from "./EditorPage";

export const routes = defineRoutes([
  { path: "/", component: EditorPage },
  // Anything else is the editor, rather than a dead end.
  { path: "*", component: EditorPage },
]);

export const Router = createRouter({ routes, base: import.meta.env.BASE_URL });
