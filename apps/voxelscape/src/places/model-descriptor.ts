// What `createModel("name")` (ADR 0050) resolves to: a model's bare name and
// place file, and its real part and motion names, read once from the place's
// own attached bytes. Shared by the bundler (bundle.ts), which builds the
// table `createModel` reads from these, and the editor's generated types
// (model-dts.ts), which describe the same models as a `ModelsByName`
// interface.
import { loadFigure } from "@big-mesh-studios/stacker/format";

/**
 * A model's descriptor: its name and what it is made of.
 *
 * `name` is the bare name a script passes to `createModel` (e.g.
 * `"zombie"`) — `file` is the place's own file name for it (e.g.
 * `"zombie.zip"`), which is what the effects vocabulary's `model`/`modelUri`
 * fields still take, since they name a place file, not a model name.
 */
export interface ModelDescriptor {
  name: string;
  file: string;
  parts: string[];
  motions: string[];
}

/** The bare name a model file is created under, or null for a non-model file. */
export function modelSpecifierFor(file: string): string | null {
  return file.toLowerCase().endsWith(".zip") ? file.slice(0, -4) : null;
}

/**
 * The descriptor `createModel(specifier)` evaluates to: its parts and
 * motions, named the way the figure itself names them, in the order it
 * lists them.
 */
export async function modelDescriptorFor(
  specifier: string,
  file: string,
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
    file,
    parts: figure.parts.map((part) => part.name),
    motions: figure.motions.map((motion) => motion.name),
  };
}
