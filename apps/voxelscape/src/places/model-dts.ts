// The ambient `.d.ts` a place's attached models generate for the script
// editor: one `declare module "<name>"` block per model, typed from its real
// parts and motions, so a `with { type: "model" }` import autocompletes and
// type-checks against the actual figure rather than a bare `unknown`. Read
// only by the editor's language-service worker — the bundler (bundle.ts)
// reaches the same data through model-descriptor.ts on its own, and neither
// depends on the other.
import {
  modelDescriptorFor,
  modelSpecifierFor,
  type ModelDescriptor,
} from "./model-descriptor";

const literalUnion = (names: string[]): string =>
  names.length === 0
    ? "never"
    : names.map((name) => JSON.stringify(name)).join(" | ");

/**
 * The ambient declaration binding `specifier` to `descriptor`'s shape.
 *
 * `specifier` has to be bare, not relative: TypeScript's resolver only ever
 * consults an ambient `declare module` for a specifier that does not start
 * with `.` or `/`, so a `declare module "./zombie"` block is silently
 * ignored no matter what else is in the program.
 */
export function generateModelDts(
  descriptor: ModelDescriptor,
  specifier: string,
): string {
  return `declare module "${specifier}" {
  const model: {
    readonly name: ${JSON.stringify(descriptor.name)};
    readonly file: ${JSON.stringify(descriptor.file)};
    readonly parts: readonly (${literalUnion(descriptor.parts)})[];
    readonly motions: readonly (${literalUnion(descriptor.motions)})[];
  };
  export default model;
}
`;
}

/**
 * The ambient `.d.ts` covering every model a place has attached — a pure
 * function of the model set alone, so the editor never has to re-parse a
 * script's own text to know what to type. A model whose bytes will not
 * decode contributes no block rather than breaking the pane for every
 * other tab, the same tolerance `loadBuiltinDemo` already shows a bad model
 * file.
 */
export async function generateProjectModelsDts(
  models: Record<string, Uint8Array>,
): Promise<string> {
  const blocks = await Promise.all(
    Object.entries(models).map(async ([file, bytes]) => {
      const specifier = modelSpecifierFor(file);
      if (specifier === null) {
        return "";
      }
      try {
        return generateModelDts(
          await modelDescriptorFor(specifier, file, bytes),
          specifier,
        );
      } catch {
        return "";
      }
    }),
  );
  return blocks.filter((block) => block !== "").join("\n");
}
