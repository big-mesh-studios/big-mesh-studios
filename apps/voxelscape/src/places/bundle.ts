// The place script compiler and bundler: TypeScript is compiled to JavaScript
// and the project's script files are bundled into one global-scope file, the
// only form the sandbox interpreter accepts (ADR 0027). Every compile round is
// deterministic — pinned compiler options, module ids in sorted-file order, and
// a specifier table resolved once — so two peers that run the same files and
// the same entry produce the same bundle and converge (ADR 0026). The bundle's
// entry module must export `bmsTick`; the bundle installs it as the global the
// sandbox steps. Nothing here touches the interpreter: it turns a project into
// the string a `ScriptSandbox.load` can evaluate.
import type * as TS from "typescript";
import { loadTypeScript } from "@big-mesh-studios/code-mirror/typescript-cdn";
import { modelDescriptorFor, resolveModelFile } from "./model-descriptor";
import { SCRIPTED_FIGURES_SOURCE } from "./scripted-figures-lib";

/** A place script that could not be compiled or bundled, in words a creator can act on. */
export class PlaceBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceBundleError";
  }
}

/** The TypeScript compiler, loaded only when a script is first bundled. */
const typescript = (): Promise<typeof TS> => loadTypeScript();

/** The compiler options a bundle is pinned to, so output never drifts between runs. */
const compilerOptions = (ts: typeof TS): TS.CompilerOptions => ({
  target: ts.ScriptTarget.ES2019,
  module: ts.ModuleKind.CommonJS,
  // The default-`import` interop the editor's language service also assumes,
  // so the same source reads the same in the panel and at load.
  esModuleInterop: true,
  // Each file is compiled on its own; a type that the compiler would otherwise
  // decide is checked by never producing it.
  isolatedModules: true,
  skipLibCheck: true,
});

/**
 * Compiles one script file to CommonJS. The `.js`/`.ts` split does not change
 * the compiled form — both go through the same compiler with the same options —
 * so a project written in either language bundles identically.
 */
const transpileFile = async (
  ts: typeof TS,
  path: string,
  source: string,
): Promise<string> => {
  const result = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: compilerOptions(ts),
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new PlaceBundleError(
      errors
        .map((diagnostic) => describeDiagnostic(ts, path, source, diagnostic))
        .join("\n"),
    );
  }
  return result.outputText;
};

/** One diagnostic as `path:line:col — TS###: message`, pointing at the source a creator wrote. */
const describeDiagnostic = (
  ts: typeof TS,
  path: string,
  source: string,
  diagnostic: TS.Diagnostic,
): string => {
  const position =
    diagnostic.start === undefined
      ? { line: 0, character: 0 }
      : ts.getLineAndCharacterOfPosition(
          ts.createSourceFile(path, source, ts.ScriptTarget.Latest, false),
          diagnostic.start,
        );
  const code = diagnostic.code;
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  return `${path}:${position.line + 1}:${position.character + 1} — TS${code}: ${message}`;
};

/** One import or re-export's specifier, and whether it names a model (ADR 0046). */
interface ScriptImport {
  specifier: string;
  isModelImport: boolean;
}

/** Every module specifier `path` statically imports or re-exports from, in the order it writes them. */
const importsOf = (
  ts: typeof TS,
  path: string,
  source: string,
): ScriptImport[] => {
  const specifiers: ScriptImport[] = [];
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  for (const statement of file.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      !statement.importClause?.isTypeOnly
    ) {
      const typeAttribute = statement.attributes?.elements.find(
        (element) => element.name.text === "type",
      );
      specifiers.push({
        specifier: (statement.moduleSpecifier as TS.StringLiteral).text,
        isModelImport:
          (typeAttribute?.value as TS.StringLiteral | undefined)?.text ===
          "model",
      });
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (statement.moduleSpecifier !== undefined) {
        specifiers.push({
          specifier: (statement.moduleSpecifier as TS.StringLiteral).text,
          isModelImport: false,
        });
      }
    }
  }
  return specifiers;
};

/**
 * The project file `specifier` names, or null when it names none. Imports may
 * only reach this place's own script files: a bare name, a `./`, or an
 * extensionless or `.js`-ending name all resolve against the flat set of
 * project files, in a fixed order so a bundle never depends on map iteration.
 */
const resolveSpecifier = (
  files: Set<string>,
  specifier: string,
): string | null => {
  if (
    specifier.includes("://") ||
    specifier.startsWith("/") ||
    specifier.includes("..")
  ) {
    return null;
  }
  const base = specifier.replace(/^\.\//, "");
  // A `.js` suffix also names the sibling `.ts` file, the way the NodeNext
  // resolvers authors likely saw this import behave.
  const asTypeScript = base.endsWith(".js")
    ? `${base.slice(0, -3)}.ts`
    : `${base}.ts`;
  for (const candidate of [
    base,
    asTypeScript,
    `${base}.js`,
    `${base}/index.ts`,
    `${base}/index.js`,
  ]) {
    if (files.has(candidate)) {
      return candidate;
    }
  }
  return null;
};

/** One module in the bundle: its compiled code, its name, and how its specifiers resolve. */
interface BundledModule {
  path: string;
  code: string;
  requires: Record<string, number>;
}

/** The virtual, never-a-real-file path a model's synthetic module is kept under. */
const modelModulePath = (name: string) => `\0model:${name}`;

/**
 * The reserved, always-available specifier naming the hand-written
 * `ScriptedNpc`/`ScriptedProp` standard library (`scripted-figures-lib.ts`).
 * Recognized outright, the same way every other bare specifier is otherwise
 * rejected — no `with { type: ... }` attribute needed, since this exact name
 * never means anything else. Takes precedence over a model import of the
 * same name, on the (deliberately unhandled) assumption that no place ever
 * attaches a model actually called "scripted-figures".
 */
const STDLIB_SPECIFIER = "scripted-figures";
const STDLIB_MODULE_PATH = "\0scripted-figures";

/**
 * Compiles and bundles a place project into one global-scope script. Each
 * project file becomes a CommonJS module evaluated through `require`, with
 * ids assigned in sorted-file order so the output is byte-for-byte
 * reproducible. A `with { type: "model" }` import (ADR 0046) instead becomes
 * a synthetic module holding an inert `{name, file, parts, motions}`
 * descriptor, one per distinct model name the project's files actually
 * import, resolved against `models` (bytes already attached to the place,
 * keyed by file name). Importing the reserved `"scripted-figures"` specifier
 * resolves to one shared synthetic module compiled from
 * `SCRIPTED_FIGURES_SOURCE`, included at most once regardless of how many
 * files import it. The bundle runs the entry module and installs the
 * `bmsTick` its exports carry as the global the sandbox steps; an entry that
 * exports none fails at load.
 *
 * @throws {PlaceBundleError} When a model import names a relative or
 * absolute specifier (only a bare name can be typed by the editor's ambient
 * declarations, so only a bare name is accepted here), or names a model
 * `models` does not carry.
 */
export const bundlePlaceProject = async (
  files: Record<string, string>,
  entry: string,
  models: Record<string, Uint8Array> = {},
): Promise<string> => {
  const ts = await typescript();
  if (files[entry] === undefined) {
    throw new PlaceBundleError(
      `the entry script "${entry}" is not a file of this project`,
    );
  }
  const paths = Object.keys(files).sort();
  const fileSet = new Set(paths);

  // A first pass over every file's imports, so every model name any of them
  // names — and whether the standard library is used at all — is known
  // before ids are handed out to anything.
  const importsByPath = new Map<string, ScriptImport[]>();
  const modelNames = new Set<string>();
  let usesStdlib = false;

  for (const path of paths) {
    const imports = importsOf(ts, path, files[path]);
    importsByPath.set(path, imports);

    for (const { specifier, isModelImport } of imports) {
      if (specifier === STDLIB_SPECIFIER) {
        usesStdlib = true;
        continue;
      }
      if (!isModelImport) {
        continue;
      }
      if (specifier.startsWith(".") || specifier.includes("://")) {
        throw new PlaceBundleError(
          `${path} imports "${specifier}" as a model — a model import names a bare model, not a path`,
        );
      }
      if (resolveModelFile(models, specifier) === null) {
        throw new PlaceBundleError(
          `${path} imports "${specifier}" as a model — this place carries no such model`,
        );
      }
      modelNames.add(specifier);
    }
  }

  const sortedModelNames = [...modelNames].sort();
  const ids = new Map(
    [
      ...paths,
      ...(usesStdlib ? [STDLIB_MODULE_PATH] : []),
      ...sortedModelNames.map(modelModulePath),
    ].map((path, index) => [path, index]),
  );

  const modules: BundledModule[] = [];
  for (const path of paths) {
    const code = await transpileFile(ts, path, files[path]);
    const requires: Record<string, number> = {};
    for (const { specifier, isModelImport } of importsByPath.get(path)!) {
      if (specifier === STDLIB_SPECIFIER) {
        requires[specifier] = ids.get(STDLIB_MODULE_PATH)!;
        continue;
      }
      if (isModelImport) {
        requires[specifier] = ids.get(modelModulePath(specifier))!;
        continue;
      }
      const target = resolveSpecifier(fileSet, specifier);
      if (target === null) {
        throw new PlaceBundleError(
          `${path} imports "${specifier}" — imports may only come from this place's own script files`,
        );
      }
      requires[specifier] = ids.get(target)!;
    }
    modules.push({ path, code, requires });
  }

  if (usesStdlib) {
    const code = await transpileFile(
      ts,
      STDLIB_MODULE_PATH,
      SCRIPTED_FIGURES_SOURCE,
    );
    modules.push({ path: STDLIB_MODULE_PATH, code, requires: {} });
  }

  for (const name of sortedModelNames) {
    const file = resolveModelFile(models, name)!;
    const descriptor = await modelDescriptorFor(name, file, models[file]);
    modules.push({
      path: modelModulePath(name),
      code: `module.exports = ${JSON.stringify(descriptor)};`,
      requires: {},
    });
  }

  const entryId = ids.get(entry)!;
  return outputFor(modules, entry, entryId);
};

/** Renders the module table, the `require` shim, and the entry handoff as one script. */
const outputFor = (
  modules: BundledModule[],
  entry: string,
  entryId: number,
): string => {
  const table = modules.map(({ path, code, requires }) => ({
    path,
    code,
    requires,
  }));
  return `var __modules = ${JSON.stringify(table)};
var __cache = [];
function __require(id) {
  var cached = __cache[id];
  if (cached !== undefined) {
    return cached.exports;
  }
  var slot = __modules[id];
  var module = { exports: {} };
  __cache[id] = module;
  new Function("module", "exports", "require", slot.code)(module, module.exports, function (specifier) {
    var target = slot.requires[specifier];
    if (target === undefined) {
      throw new Error("cannot resolve import \\"" + specifier + "\\" from \\"" + slot.path + "\\"");
    }
    return __require(target);
  });
  return module.exports;
}
(function () {
  var entry = __require(${entryId});
  globalThis.bmsTick = typeof entry.bmsTick === "function" ? entry.bmsTick : undefined;
  globalThis.bmsPlan = typeof entry.bmsPlan === "function" ? entry.bmsPlan : undefined;
  if (typeof globalThis.bmsTick !== "function") {
    throw new Error('the entry script "${entry}" must export a bmsTick function');
  }
})();
`;
};
