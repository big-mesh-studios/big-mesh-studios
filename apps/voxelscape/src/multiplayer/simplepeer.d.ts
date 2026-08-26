// simple-peer's `simplepeer.min.js` is a fully self-contained browser bundle
// (its Node-only deps — `readable-stream`, `buffer`, `process` — are inlined),
// so it bundles cleanly with Vite without Node polyfills, unlike its `main`
// entry (`index.js`). The types come from `@types/simple-peer`.
declare module "simple-peer/simplepeer.min.js" {
  import SimplePeer from "simple-peer";
  export default SimplePeer;
}
