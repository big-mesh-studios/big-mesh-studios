// Stands in for the `.d.ts` the real place editor generates live from this
// demo's own `public/models/zombie.zip` (ADR 0046), so `zombies.ts` — an
// ordinary source file in this project, not only something loaded through
// the editor — type-checks the same way any other file here does. Loosely
// typed on purpose: the real, precise literal-union types only exist live,
// generated from the model's actual bytes; hand-duplicating them here would
// drift the moment the checked-in model changes.
declare module "zombie" {
  const model: {
    readonly name: "zombie";
    readonly parts: readonly string[];
    readonly motions: readonly string[];
  };
  export default model;
}
