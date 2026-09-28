// The one page, and how the address bar finds it.
//
// Addresses are real paths, not `#/paths`, so a page opened directly, reloaded,
// or followed from a link is answered for by the application rather than by a
// file on disk. The deployment copies `index.html` to `404.html` so that the
// server has something to answer with, and the router then reads the address it
// was asked for.
//
// `base` is where the application sits: the root while developing, a folder on
// the deployed site.
import { createRouter, defineRoutes } from "@solidjs/router";
import EditorPage from "./EditorPage";

export const routes = defineRoutes([
  { path: "/", component: EditorPage },
  // Anything else is the editor, rather than a dead end.
  { path: "*", component: EditorPage },
]);

export const Router = createRouter({ routes, base: import.meta.env.BASE_URL });
