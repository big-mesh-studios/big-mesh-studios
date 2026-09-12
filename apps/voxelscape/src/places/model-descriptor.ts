// What a place script's `with { type: "model" }` import resolves to: the bare
// specifier it names, and that model's real part and motion names, read once
// from the place's own attached bytes. Shared by the bundler (ADR 0046),
// which compiles the import to this as a plain data literal, and the editor's
// generated types (model-dts.ts), which describe it as one.
import { loadFigure } from "@big-mesh-studios/stacker/format";

/** A model import's runtime value: its name, and what it is made of. */
export interface ModelDescriptor {
  name: string;
  parts: string[];
  motions: string[];
}

/** The bare specifier a model file is imported under, or null for a non-model file. */
export function modelSpecifierFor(file: string): string | null {
  return file.toLowerCase().endsWith(".zip") ? file.slice(0, -4) : null;
}

/** The project's model file `specifier` names, or null when it names none. */
export function resolveModelFile(
  models: Record<string, Uint8Array>,
  specifier: string,
): string | null {
  if (models[specifier] !== undefined) {
    return specifier;
  }
  const zipName = `${specifier}.zip`;
  return models[zipName] !== undefined ? zipName : null;
}

/**
 * The descriptor a model import evaluates to: its parts and motions, named
 * the way the figure itself names them, in the order it lists them.
 */
export async function modelDescriptorFor(
  specifier: string,
  bytes: Uint8Array,
): Promise<ModelDescriptor> {
  // `loadFigure` reads its argument through JSZip, which accepts a typed
  // array directly — passed this way rather than wrapped in a `Blob`, this
  // works the same in a browser and in the plain Node environment the
  // bundler's own tests run under, where JSZip's Blob support detection does
  // not hold.
  const figure = await loadFigure(bytes as unknown as Blob);
  return {
    name: specifier,
    parts: figure.parts.map((part) => part.name),
    motions: figure.motions.map((motion) => motion.name),
  };
}
