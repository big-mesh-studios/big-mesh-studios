// The place script compiler and bundler: TypeScript is compiled to JavaScript
// and the project's script files are bundled into one global-scope file, the
// only form the sandbox interpreter accepts (ADR 0027). Every compile round is
// deterministic — pinned compiler options, module ids in sorted-file order, and
// a specifier table resolved once — so two peers that run the same files and
// the same entry produce the same bundle and converge (ADR 0026). A file may
// also import from `"voxelscape"` (ADR 0050) — `dispatch`/`onTick`/`onPlan`
// and the rest of the sandbox's host surface, alongside `createNpc`/
// `createProp` and `plan` — resolved to one synthetic module built from the
// standard library's hand-written source plus the place's own attached models
// and levels, included at most once regardless of how many files import it.
// That module reaches the real sandbox host object through its own
// internal-only import, never a specifier a project file's own source ever
// names. The entry module registers its hooks by calling
// `engine.onTick`/`engine.onPlan` as it runs, so running it is the bundle's
// whole handoff to the sandbox — nothing here reads its exports. Nothing here
// touches the interpreter: it turns a project into the string a
// `ScriptSandbox.load` can evaluate.
import type * as TS from "typescript";
import { loadTypeScript } from "@big-mesh-studios/code-mirror/typescript-cdn";
import { modelDescriptorFor, modelSpecifierFor } from "./model-descriptor";
import { VOXELSCAPE_LIB_SOURCE } from "./voxelscape-lib";
import { VOXELSCAPE_MATH_SOURCE } from "./voxelscape-math";

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

/** Every module specifier `path` statically imports or re-exports from, in the order it writes them. */
const importsOf = (ts: typeof TS, path: string, source: string): string[] => {
  const specifiers: string[] = [];
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
      specifiers.push((statement.moduleSpecifier as TS.StringLiteral).text);
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (statement.moduleSpecifier !== undefined) {
        specifiers.push((statement.moduleSpecifier as TS.StringLiteral).text);
      }
    }
  }
  return specifiers;
};

/** The virtual, never-a-real-file path the `"voxelscape"` synthetic module is kept under. */
const VOXELSCAPE_MODULE_PATH = "\0voxelscape";

/**
 * The project file `specifier` names, or `VOXELSCAPE_MODULE_PATH` for the
 * one reserved specifier every place script may otherwise-bare import,
 * `"voxelscape"`. Imports may only reach this place's own script files or
 * that one: a bare name, a `./`, or an extensionless or `.js`-ending name all
 * resolve against the flat set of project files, in a fixed order so a
 * bundle never depends on map iteration. `"engine-host"` is a second
 * reserved name, resolved the same way `"voxelscape"` itself used to be
 * called before this decision (a magic string `__require` bridges straight
 * to the sandbox's host object) — the `"voxelscape"` synthetic module's own
 * source is the only thing that ever imports it; no project file has a
 * reason to.
 */
const resolveSpecifier = (
  files: Set<string>,
  specifier: string,
): string | null => {
  if (specifier === "voxelscape") {
    return VOXELSCAPE_MODULE_PATH;
  }
  if (specifier === "engine-host") {
    return "engine-host";
  }
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

/** A specifier resolved to another project file's module id, or to the sandbox's host object. */
type ResolvedSpecifier = number | "engine-host";

/** One module in the bundle: its compiled code, its name, and how its specifiers resolve. */
interface BundledModule {
  path: string;
  code: string;
  requires: Record<string, ResolvedSpecifier>;
}

/**
 * The `"voxelscape"` synthetic module's own source: the hand-written
 * standard library and the guest-side math, plus a table of every model and
 * every level this place attaches — not only ones some script happens to
 * import — so a name unknown to the type system but still attached still
 * resolves. A model whose bytes will not decode is left out of its table
 * rather than failing the whole place's load, the same tolerance `model-dts.ts`
 * shows the editor. A level is plain text, so it always fits.
 */
const voxelscapeModuleSource = async (
  models: Record<string, Uint8Array>,
  levels: Record<string, string>,
): Promise<string> => {
  const table: Record<string, unknown> = {};
  for (const [file, bytes] of Object.entries(models)) {
    const specifier = modelSpecifierFor(file);
    if (specifier === null) {
      continue;
    }
    try {
      table[specifier] = await modelDescriptorFor(specifier, file, bytes);
    } catch {
      continue;
    }
  }
  return `${VOXELSCAPE_MATH_SOURCE}
${VOXELSCAPE_LIB_SOURCE}
const __models = ${JSON.stringify(table)};
const __levels = ${JSON.stringify(levels)};
`;
};

/**
 * Compiles and bundles a place project into one global-scope script. Each
 * project file becomes a CommonJS module evaluated through `require`, with
 * ids assigned in sorted-file order so the output is byte-for-byte
 * reproducible. A file may also import from `"voxelscape"`, resolved to one
 * synthetic module built from `models` (bytes already attached to the place,
 * keyed by file name), `levels` (plan text already attached to the place, keyed
 * by the name `plan` takes), and included at most once regardless of how many
 * files import it. The bundle runs the entry module for its side effects and
 * nothing else; a script that never calls `engine.onTick` loads without
 * error but the sandbox steps nothing.
 */
export const bundlePlaceProject = async (
  files: Record<string, string>,
  entry: string,
  models: Record<string, Uint8Array> = {},
  levels: Record<string, string> = {},
): Promise<string> => {
  const ts = await typescript();
  if (files[entry] === undefined) {
    throw new PlaceBundleError(
      `the entry script "${entry}" is not a file of this project`,
    );
  }
  const paths = Object.keys(files).sort();
  const fileSet = new Set(paths);

  // A first pass over every file's imports, so whether "voxelscape" is used
  // anywhere is known before ids are handed out to anything.
  const importsByPath = new Map<string, string[]>();
  let usesVoxelscape = false;
  for (const path of paths) {
    const specifiers = importsOf(ts, path, files[path]);
    importsByPath.set(path, specifiers);
    if (specifiers.includes("voxelscape")) {
      usesVoxelscape = true;
    }
  }

  const voxelscapeSource = usesVoxelscape
    ? await voxelscapeModuleSource(models, levels)
    : "";
  if (usesVoxelscape) {
    importsByPath.set(
      VOXELSCAPE_MODULE_PATH,
      importsOf(ts, VOXELSCAPE_MODULE_PATH, voxelscapeSource),
    );
  }

  const compilePaths = usesVoxelscape
    ? [...paths, VOXELSCAPE_MODULE_PATH]
    : paths;
  const ids = new Map(compilePaths.map((path, index) => [path, index]));

  const modules: BundledModule[] = [];
  for (const path of compilePaths) {
    const source =
      path === VOXELSCAPE_MODULE_PATH ? voxelscapeSource : files[path];
    const code = await transpileFile(ts, path, source);
    const requires: Record<string, ResolvedSpecifier> = {};
    for (const specifier of importsByPath.get(path)!) {
      const target = resolveSpecifier(fileSet, specifier);
      if (target === null) {
        throw new PlaceBundleError(
          `${path} imports "${specifier}" — imports may only come from this place's own script files, or "voxelscape"`,
        );
      }
      requires[specifier] =
        target === "engine-host" ? "engine-host" : ids.get(target)!;
    }
    modules.push({ path, code, requires });
  }

  const entryId = ids.get(entry)!;
  return outputFor(modules, entryId);
};

/**
 * Renders the module table and the `require` shim as one script, ending in a
 * call into the entry module for its side effects — registering with `engine`
 * is all an entry module does, so nothing here reads what it exports.
 */
const outputFor = (modules: BundledModule[], entryId: number): string => {
  const table = modules.map(({ path, code, requires }) => ({
    path,
    code,
    requires,
  }));
  return `var __modules = ${JSON.stringify(table)};
var __cache = [];
var __engineHost;
function __require(id) {
  if (id === "engine-host") {
    if (__engineHost === undefined) {
      __engineHost = {
        dispatch: function (tag, payload) { engine.dispatch(tag, JSON.stringify(payload)); },
        log: engine.log,
        getNow: engine.getNow,
        getEndings: engine.getEndings,
        getPlayers: engine.getPlayers,
        getHeightAt: engine.getHeightAt,
        getSolidAt: engine.getSolidAt,
        getWaterAt: engine.getWaterAt,
        getBlockAt: engine.getBlockAt,
        getEntity: engine.getEntity,
        getEntitiesInBox: engine.getEntitiesInBox,
        getEntitiesInSphere: engine.getEntitiesInSphere,
        getEntitiesWithTag: engine.getEntitiesWithTag,
        getPlayer: engine.getPlayer,
        getPlayersInBox: engine.getPlayersInBox,
        getLocalPlayer: engine.getLocalPlayer,
        getInput: engine.getInput,
        getPlayerValue: engine.getPlayerValue,
        getLeaderboard: engine.getLeaderboard,
        getData: engine.getData,
        getDataLeaderboard: engine.getDataLeaderboard,
        raycast: engine.raycast,
        findPath: engine.findPath,
        getHeldItem: engine.getHeldItem,
        onTick: engine.onTick,
        onPlan: engine.onPlan,
        blocks: engine.blocks,
      };
    }
    return __engineHost;
  }
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
__require(${entryId});
`;
};
