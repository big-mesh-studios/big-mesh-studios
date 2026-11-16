// Vite's `?url` import suffix, declared so the browser branch of the module loader
// type-checks. The spacescape app has the same declaration in `src/places/`
// (`node-builtins.d.ts` carries its siblings); a package that loads its own asset needs
// one too.
declare module "*?url" {
  const url: string;
  export default url;
}
