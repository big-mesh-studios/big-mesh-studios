// Stands in for the `models.d.ts` augmentation the real place editor
// generates live from this demo's own `public/models/zombie.zip`
// (`model-dts.ts`, ADR 0050), so `zombies.ts` — an ordinary source file in
// this project, not only something loaded through the editor — type-checks
// the same way any other file here does. Merges with `voxelscape.d.ts`'s own
// (empty) `ModelsByName` interface by declaration merging; loosely typed on
// purpose — the real, precise literal-union types only exist live, generated
// from the model's actual bytes, so hand-duplicating them here would drift
// the moment the checked-in model changes.
declare module "voxelscape" {
  interface ModelsByName {
    zombie: {
      readonly name: "zombie";
      readonly file: "zombie.zip";
      readonly parts: readonly string[];
      readonly motions: readonly string[];
    };
  }
}
