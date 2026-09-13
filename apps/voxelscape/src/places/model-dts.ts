// The ambient `.d.ts` a place's attached models generate for the script
// editor: one combined `declare module "voxelscape" { interface ModelsByName
// {...} } }` augmentation, typed from each model's real parts and motions, so
// `createNpc`/`createProp` (ADR 0050) autocomplete and type-check a model
// name against the actual figure rather than a bare `string`. Read only by
// the editor's language-service worker — the bundler (bundle.ts) reaches the
// same data through model-descriptor.ts on its own, and neither depends on
// the other.
import {
  modelDescriptorFor,
  modelSpecifierFor,
  type ModelDescriptor,
} from "./model-descriptor";

const literalUnion = (names: string[]): string =>
  names.length === 0
    ? "never"
    : names.map((name) => JSON.stringify(name)).join(" | ");

/** One model's entry in the generated `ModelsByName` interface, keyed by its bare specifier. */
function modelsByNameEntry(descriptor: ModelDescriptor): string {
  return `    ${JSON.stringify(descriptor.name)}: {
      readonly name: ${JSON.stringify(descriptor.name)};
      readonly file: ${JSON.stringify(descriptor.file)};
      readonly parts: readonly (${literalUnion(descriptor.parts)})[];
      readonly motions: readonly (${literalUnion(descriptor.motions)})[];
    };`;
}

/**
 * The ambient `.d.ts` covering every model a place has attached — a pure
 * function of the model set alone, so the editor never has to re-parse a
 * script's own text to know what to type. A model whose bytes will not
 * decode contributes no entry rather than breaking the pane for every other
 * tab, the same tolerance `loadBuiltinDemo` already shows a bad model file.
 * Merges with `voxelscape.d.ts`'s own (empty) `ModelsByName` interface by
 * TypeScript's own declaration-merging rules — this file never needs to know
 * that interface exists anywhere else.
 */
export async function generateProjectModelsDts(
  models: Record<string, Uint8Array>,
): Promise<string> {
  const entries = await Promise.all(
    Object.entries(models).map(async ([file, bytes]) => {
      const specifier = modelSpecifierFor(file);
      if (specifier === null) {
        return "";
      }
      try {
        return modelsByNameEntry(
          await modelDescriptorFor(specifier, file, bytes),
        );
      } catch {
        return "";
      }
    }),
  );
  const body = entries.filter((entry) => entry !== "").join("\n");
  if (body === "") {
    return "";
  }
  return `declare module "voxelscape" {
  interface ModelsByName {
${body}
  }
}
`;
}
