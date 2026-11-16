/**
 * Bundling a place's Luau into one string the runtime can compile.
 *
 * **The twin of `bundle.ts`, and it inherits the three rules verbatim**, because they are
 * the whole argument for having a bundler at all: the operation list is recomputed on every
 * peer (ADR 0016), so two peers must reach byte-identical text from byte-identical files —
 *
 * 1. module ids assigned in `Object.keys(files).sort()` order, never arrival order;
 * 2. compile options pinned where the compiler is (the glue's `compile()`, frozen by
 *    ADR 0060 — this file does not restate them so it cannot drift from them);
 * 3. nothing read from the host environment.
 *
 * ## The one-chunk `require` shim
 *
 * Luau scripts import nothing natively — `require` is not a VM global (the isolation probe
 * asserts it), so the bundle supplies one as a program-scope *local*, with a module table
 * whose ids this function chose. A place cannot hand the resolver an argument it picked:
 * every string-literal `require` was rewritten to an id before rendering, and anything else
 * the source spelled is refused here, naming the file and the specifier — the same answer
 * `bundle.ts` gives, on the same grounds.
 *
 * **The resolver caches a module before calling its factory**, exactly as the TypeScript one
 * does: a cycle then terminates with a partially-filled table instead of recursing forever.
 *
 * ## What the rewrite reads, honestly
 *
 * `bundle.ts` gets AST-verified specifiers from `ts.transpileModule`; here the source is
 * scanned by regex, so the promise is narrower than the TypeScript twin's and is stated
 * rather than papered over: `require("literal")` is rewritten wherever it appears, and the
 * library's own text must not *spell* a quoted require in prose or it would be rewritten
 * harmlessly-to-id. A place calling `require` with a runtime-computed name is not refused at
 * bundle time like the JS non-literal check refuses; it fails at load, in the resolver,
 * naming the id — the resolver is the one surface the argument can never reach, which was
 * always the real guarantee. A parse-checking rewrite is a Phase 1 follow-up (the Ast is in
 * the build; an exported parse-only entry would make this exactly the twin).
 */

import GUEST_SOURCE from "./guest/place-api.luau?raw";
import {
  GUEST_MODULE,
  LEGACY_GUEST_MODULE,
  RESERVED_HOST_MODULE,
} from "./bridge";
import { BundleError, type PlaceFiles } from "./bundle";
import { MAX_SCRIPT_SOURCE } from "./limits";

/**
 * The library's levels fallback, replaced wholesale when a place carries levels. The
 * sentinel is one line of the guest file and nothing else in it matches — `place-api.luau`
 * says so beside its copy.
 */
const LEVELS_SENTINEL = "local __levels = {}";

/** A string-literal `require`, which is every module reference a Luau place may have. */
const LITERAL_REQUIRE = /require\(\s*(["'])([^"']*)\1\s*\)/g;

/**
 * The Luau twin's compiler: size, then specifier resolution.
 *
 * The TypeScript twin transpiles (module syntax to `require` calls, syntax errors out).
 * Luau source *is* the module form — the author already writes `require` — so what is left
 * for this step is the size check and the specifier scan. Syntax errors are not detected
 * here: the load-path compile (the glue's `compile`, on the frozen options) is the judge,
 * and its message names the bundle's line. Mapping a bundle line back to its file — which
 * is what the editor will one day highlight — is arithmetic over this function's own
 * assembly, and it is a named Phase 1 follow-up rather than something faked here.
 */
const check = (file: string, source: string): void => {
  if (source.length > MAX_SCRIPT_SOURCE) {
    throw new BundleError(
      file,
      `source is ${source.length} characters, over the ${MAX_SCRIPT_SOURCE}-character limit`,
    );
  }
};

/**
 * Resolve one `require` specifier to the **file name** it stands for — or to
 * `GUEST_MODULE` for the library, which is not a file. The caller maps names to ids;
 * resolution answers in the vocabulary the place itself used, so the refusal messages can
 * name what the author wrote.
 */
const resolveSpecifier = (
  from: string,
  specifier: string,
  files: PlaceFiles,
): string => {
  if (specifier === GUEST_MODULE || specifier === LEGACY_GUEST_MODULE) {
    return GUEST_MODULE;
  }
  if (specifier === RESERVED_HOST_MODULE) {
    throw new BundleError(
      from,
      `imports "${RESERVED_HOST_MODULE}", which is not available to a place`,
    );
  }
  if (specifier.includes("://")) {
    throw new BundleError(
      from,
      `imports "${specifier}" — a place may not reach outside itself`,
    );
  }
  if (specifier.startsWith("/")) {
    throw new BundleError(
      from,
      `imports "${specifier}" — an absolute path is not inside a place`,
    );
  }
  if (specifier.includes("..")) {
    throw new BundleError(
      from,
      `imports "${specifier}" — a place's files are a flat namespace`,
    );
  }

  // `./door` and `door` both mean `door`, and the extension is the host's business rather
  // than the script's — the flat-namespace rules `bundle.ts` states, ported with only the
  // extension list changed. A `.luau` place that imported a `.ts` file would be two
  // languages in one place, which decision 7 closed before this resolver could agree to.
  const bare = specifier.replace(/^\.\//, "").replace(/\.luau$/, "");
  if (bare === "") {
    throw new BundleError(from, `imports "${specifier}", which names nothing`);
  }
  if (bare.includes("/")) {
    throw new BundleError(
      from,
      `imports "${specifier}" — a place's files are a flat namespace, so a name has no directory`,
    );
  }

  for (const candidate of [`${bare}.luau`, bare]) {
    if (candidate in files) {
      return candidate;
    }
  }
  throw new BundleError(
    from,
    `imports "${specifier}", which is not one of this place's files`,
  );
};

/** Rewrite one module's `require` specifiers to the ids this function chose. */
const rewriteRequires = (
  file: string,
  source: string,
  files: PlaceFiles,
  ids: ReadonlyMap<string, string>,
): { luau: string; imports: string[] } => {
  const imports: string[] = [];
  const luau = source.replace(
    LITERAL_REQUIRE,
    (match, _quote: string, specifier: string) => {
      void match;
      const target = resolveSpecifier(file, specifier, files);
      if (target === GUEST_MODULE) return `require("${GUEST_MODULE}")`;
      imports.push(target);
      return `require("${ids.get(target)}")`;
    },
  );
  return { luau, imports };
};

/**
 * A level document's text as a Luau source string.
 *
 * Quoted-escaped rather than long-bracketed (`[[…]]`) on purpose: a JSON document can
 * contain `]]` (nested arrays, pretty-printed) and a format that breaks on its own content
 * is a format that gets blamed for the content.
 */
const luaString = (text: string): string => {
  let out = '"';
  for (const character of text) {
    switch (character) {
      case "\\":
        out += "\\\\";
        break;
      case '"':
        out += '\\"';
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default:
        out += character;
    }
  }
  return `${out}"`;
};

/** The injected `__levels` literal for a place that carries levels. */
const levelsTable = (levels: Readonly<Record<string, string>>): string => {
  const entries = Object.keys(levels)
    .sort()
    .map((name) => `    [${luaString(name)}] = ${luaString(levels[name]!)}`);
  return `local __levels = {\n${entries.join(",\n")}\n}`;
};

/** The guest library, with levels injected if the place carries any. */
const guestModuleSource = (
  levels: Readonly<Record<string, string>>,
): string => {
  if (Object.keys(levels).length === 0) return GUEST_SOURCE;
  // A function replacement: the level JSON can contain `$`, which `String.replace` would
  // otherwise read as a substitution pattern in the injected text.
  const injected = GUEST_SOURCE.replace(LEVELS_SENTINEL, () => levelsTable(levels));
  if (injected === GUEST_SOURCE) {
    // A library edited without its sentinel is a place that silently lost its levels —
    // the failure is loud here precisely because it would be silent later.
    throw new BundleError(
      "guest/place-api.luau",
      "is missing its levels sentinel; the bundler cannot inject documents it has nowhere to put",
    );
  }
  return injected;
};

/**
 * Bundles a Luau place.
 *
 * Same shape as `bundlePlace`: sorted ids, iterative reachability from the entry (a place
 * can import itself), guest library compiled once. The output is the whole program: the
 * body of `return function(engine) … end` — ADR 0060's decision 2, which is what makes
 * `engine` nameable only by the program's own scope.
 */
export const bundlePlaceLuau = (
  files: PlaceFiles,
  entry: string,
  levels: Readonly<Record<string, string>> = {},
): string => {
  if (!(entry in files)) {
    throw new BundleError(entry, "is not one of this place's files");
  }
  if (Object.keys(files).length === 0) {
    throw new BundleError(entry, "has no files");
  }

  const names = Object.keys(files).sort();
  const ids = new Map<string, string>();
  names.forEach((name, index) => ids.set(name, String(index)));

  const compiled = new Map<string, string>();
  compiled.set(GUEST_MODULE, guestModuleSource(levels));

  const pending: string[] = [entry];
  while (pending.length > 0) {
    const name = pending.pop() as string;
    if (compiled.has(name)) continue;

    check(name, files[name]);
    const { luau, imports } = rewriteRequires(name, files[name], files, ids);
    compiled.set(name, luau);
    for (const target of imports) pending.push(target);
  }

  return render(compiled, ids, ids.get(entry) as string);
};

/** Renders the one-chunk program. */
const render = (
  compiled: ReadonlyMap<string, string>,
  ids: ReadonlyMap<string, string>,
  entryId: string,
): string => {
  // Guest first, then place files by name — which is their id order, since the ids were
  // assigned from the sorted names above. The table is keyed by **id**, because that is
  // what `rewriteRequires` left in the module bodies and what the entry line asks for;
  // keying it by file name was the first draft's bug and the resolver said so by name.
  const ordered = [...compiled.keys()].sort((a, b) =>
    a === GUEST_MODULE ? -1 : b === GUEST_MODULE ? 1 : a.localeCompare(b),
  );
  const moduleEntries: string[] = [];
  for (const name of ordered) {
    const key = name === GUEST_MODULE ? GUEST_MODULE : (ids.get(name) as string);
    moduleEntries.push(
      `__modules[${luaString(key)}] = function()\n${compiled.get(name)}\nend`,
    );
  }

  return `return function(engine)
local __modules = {}
local __cache = {}
local function require(id)
  local cached = __cache[id]
  if cached ~= nil then return cached end
  local factory = __modules[id]
  if factory == nil then
    error("require: this place has no module called " .. tostring(id))
  end
  local exports = {}
  __cache[id] = exports
  local result = factory()
  if result ~= nil then __cache[id] = result end
  return __cache[id]
end
${moduleEntries.join("\n")}
require(${luaString(entryId)})
end`;
};
