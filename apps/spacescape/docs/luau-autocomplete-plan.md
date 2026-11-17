# Luau autocomplete: the analysis artifact, the worker, and the editor wiring

**Status: implemented (v1).** The artifact, loader, worker, editor source, fallback
ladder, and tests below are in the tree; the measured artifact is 3.38 MB (1.13 MB
gzipped), and `dist/luau.wasm` is byte-identical to its pre-target hash. The remaining
open items are the browser probe and the diagnostics/hover scope, both marked below. This
document stays as the record of the boundaries and traps, so the next person does not have
to rediscover them from the Luau playground's source.

**What shipped before this work** was the honest, small version: a Lezer grammar for
highlighting, indentation and folding, plus textual completion — the package's keywords
and base globals, the document's own identifiers, and the members of the five standard
libraries this VM opens (`packages/solid-codemirror/src/luau.ts`). **What was missing is
the one thing a grammar cannot know:** what a name _is_ at a position, and therefore what
may follow a dot.

**What ships now** is the analysis path described below: a lazily loaded
`luau-analysis.wasm`, an editor-only worker, and a completion source that asks types
first and falls back to the textual sources. Member completion, standard-library members,
the guest API through `require`, cross-file members, and `require("…")` specifiers are
implemented. Diagnostics and hover remain the next customers of the same artifact, not
part of v1.

**Why it is not a language server.** The official Luau playground does not use an LSP
either. It calls `Luau::autocomplete` from Luau's **Analysis** library, in the same wasm
module that runs the VM. That library is deliberately absent from
`packages/luau-runtime`'s build (ADR 0060 decision 8: the type checker is a tool, never a
load-path dependency), so there is no autocomplete entry point in the shipped
`luau.wasm` to call. Adding one means adding a **second artifact**, built from the same
pinned source, loaded by an editor-only worker, and never imported by anything on the
place load path.

**Read this with** `apps/spacescape/docs/luau-scripting-plan.md` (Phase 3 is this work),
`docs/adr/0060-a-place-may-also-be-written-in-luau.md` (decision 8, and "What this does
not decide"), and `packages/luau-runtime/README.md` (the artifact and pin discipline).

## The prior art, read from source

`luau-lang/playground` is the reference implementation, not a dependency. Three files
matter:

| Where                             | What it does                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `wasm/src/playground.cpp`         | `luau_autocomplete(code, line, col)`: a `Frontend`, a `FileResolver`, `check`, then `Luau::autocomplete` |
| `wasm/CMakeLists.txt`             | Builds `Luau.Analysis`, `Luau.Config`, `Luau.Require`, `Luau.CodeGen` and the VM into one binary         |
| `src/lib/editor/lspExtensions.ts` | The CodeMirror completion source and the `.`/`:`/`require("` triggers                                    |

The core of their C++, verbatim in shape:

```cpp
Luau::FrontendOptions opts;
opts.retainFullTypeGraphs = true;
opts.forAutocomplete = true;
opts.runLintChecks = false;
frontend->check(moduleName, opts);

Luau::AutocompleteResult result =
    Luau::autocomplete(*frontend, moduleName, {line, col}, nullptr);
```

Three facts follow from that, and they decide this whole plan:

1. **`autocomplete` does not check the module first.** `Frontend::check` is the caller's
   job; `autocomplete` reads the checked module out of the frontend's resolver. A glue
   that calls only `autocomplete` returns `{}` forever.
2. **`nullptr` is the `StringCompletionCallback`.** The playground does `require("…")`
   completion in TypeScript (by matching the string before the cursor), not through
   Luau's callback. We will do the same, because our module rules are the bundler's.
3. **The playground's binary is not our binary.** Theirs is 4.7 MB uncompressed / 1.56 MB
   gzipped and includes CodeGen and Require, which we do not need for completion. Our
   subset's size is a measurement, not an extrapolation.

The pinned API, from `vendor/luau` at `0.747`:

```cpp
// Analysis/include/Luau/Frontend.h
Frontend(SolverMode mode, FileResolver* fileResolver,
         ConfigResolver* configResolver, FrontendOptions options = {});
CheckResult check(const ModuleName& name, std::optional<FrontendOptions> = {});
void markDirty(const ModuleName& name, std::vector<ModuleName>* = nullptr);

// Analysis/include/Luau/Autocomplete.h
AutocompleteResult autocomplete(Frontend& frontend, const ModuleName& moduleName,
                                Position position, StringCompletionCallback callback);
```

`markDirty` traverses dependents (`Frontend.cpp`), so marking an edited module is enough
to invalidate everything that requires it.

## The shape of the work

Six pieces, in dependency order. None of them touches `luau.wasm`.

```
  luau-runtime                         spacescape                              solid-codemirror
  ────────────                         ──────────                              ────────────────
  glue/analysis.cpp   ──────┐
  dist/luau-analysis.wasm   │
  src/analysis.ts           ├──►  places/editor/luau-analysis.worker.ts
       (typed loader)       │          (postMessage + sessions)
                            └──►  places/editor/luau-analysis.ts  ──────────►  luau.ts
                                   (lazy client, specifier map,                 (composed source)
                                    fallback)                                   index.tsx
                                                                                (`luauAnalysis` prop)
```

**The boundary is the subpath export.** `@big-mesh-studios/luau-runtime` keeps its
current `.` entry exactly as it is; the analysis loader lives behind
`"./analysis"`. Nothing in `src/index.ts` imports it. That is a compile-time and
bundler-level separation, not a code-review convention.

## Step 1 — the analysis artifact

### 1.1 A second CMake target, not a second build

`glue/CMakeLists.txt` already includes the whole vendored Luau tree with
`add_subdirectory(... EXCLUDE_FROM_ALL)` and links only `Luau.VM Luau.Compiler` into the
execution target. `Luau.Analysis` is available in that tree; it is simply not linked.

Add one executable **beside** the existing one, not inside it:

```cmake
add_executable(luau_analysis analysis.cpp)
set_target_properties(luau_analysis PROPERTIES
    SUFFIX ".mjs" OUTPUT_NAME "luau-analysis")
target_compile_features(luau_analysis PRIVATE cxx_std_17)
target_link_libraries(luau_analysis PRIVATE
    Luau.Analysis Luau.Config Luau.Compiler Luau.Ast Luau.Common)
```

`Luau.Analysis` publicly links `Luau.Ast` and `Luau.Config`, and privately links
`Luau.Compiler` and `Luau.VM`; naming the ones we mean keeps the link line readable and
is what the playground does. Do **not** add `Luau.CodeGen` or `Luau.Require` — completion
does not need bytecode generation or Luau's own require machinery, and every unused
library is size we would carry on a phone.

**The proof that the boundary held** is that the existing target's link line does not
change and `dist/luau.wasm`'s SHA-256 still matches `pin.txt` after the second target is
built. If that hash moves, something was added to the execution target and should be
taken back out.

**Two build details that will bite once:**

- The analysis artifact does not run scripts, so it does not need `SUPPORT_LONGJMP`.
  If the linker pulls VM objects that reference `_setjmp` anyway, the fix is the same
  `SHELL:-s SUPPORT_LONGJMP=wasm` the VM target already carries — add it to the analysis
  link options, do not remove it from the VM.
- `-fwasm-exceptions` is already global (`add_compile_options`), which is what makes
  `Luau::autocomplete`'s C++ exceptions catchable at the glue boundary. Do not add
  `-fno-exceptions` for size.

### 1.2 One session per worker, not one global

The playground has one global `Frontend` and one `"main"` module. That is fine for a
single-document playground and wrong for an editor with tabs and a shared guest library.
Give every analysis worker a **session**:

```cpp
struct AnalysisSession {
    AnalysisFileResolver resolver;       // owns sources + specifier map
    AnalysisConfigResolver config;       // Mode::Nonstrict
    std::unique_ptr<Luau::Frontend> frontend;
    std::string lastError;
};
```

`Frontend` holds raw pointers to the resolvers, so the resolvers must outlive it and
must not move: declare them before `frontend`, or heap-allocate each. A
`std::unordered_map<int, std::unique_ptr<AnalysisSession>>` keyed by a monotonically
increasing id is enough; there is one session in practice, and the map makes a future
second pane or a diagnostics-only session free.

The `FrontendOptions` for every check, matching the playground:

```cpp
Luau::FrontendOptions options;
options.retainFullTypeGraphs = true;   // types are the product; without it the graph is gone
options.forAutocomplete = true;        // strict-enough checking for precise members
options.runLintChecks = false;         // lint is not this artifact's job
options.moduleTimeLimitSec = 2.0;      // a pathological source must not own the worker
```

Construct the frontend with `Luau::SolverMode::New` (the playground's default), a
`Config` whose `mode` is `Luau::Mode::Nonstrict`, and that same options struct:

```cpp
frontend = std::make_unique<Luau::Frontend>(
    Luau::SolverMode::New, &resolver, &config, options);
```

Then pass the same `options` to every `check` call — `check` takes an override, and a
frontend built with `forAutocomplete` but checked without it is a subtle way to get the
old solver's weaker answer. Do not require `--!strict`: ADR 0060 resolved that for the
load path, and the same unannotated code is what the editor sees. `forAutocomplete` is
what buys precision where the source has it.

### 1.3 Module resolution: one source of truth

The bundler already owns the flat-namespace rules (`apps/spacescape/src/places/luau-bundle.ts`):
`spacescape`/`voxelscape` for the guest library, `./name` and `name`, `.luau` optional,
no `://`, no absolute paths, no `..`, no directories. **The analyzer must not grow a
second copy of those rules.**

Instead, invert the direction: the TypeScript side sends the analyzer a **specifier
map**, and the C++ resolver is an exact lookup.

```ts
// apps/spacescape/src/places/luau-bundle.ts, exported next to resolveSpecifier
luauModuleSpecifiers(files: PlaceFiles): Record<string, string>
// {
//   "spacescape": "spacescape", "voxelscape": "spacescape",
//   "door": "door.luau", "./door": "door.luau",
//   "door.luau": "door.luau", "./door.luau": "door.luau",
// }
```

The C++ side then has no policy at all:

```cpp
std::optional<Luau::ModuleInfo>
AnalysisFileResolver::resolveModule(const Luau::ModuleInfo*, Luau::AstExpr* node,
                                    const Luau::TypeCheckLimits&) override {
    auto* literal = node->as<Luau::AstExprConstantString>();
    if (!literal) return std::nullopt;
    std::string specifier(literal->value.data, literal->value.size);
    auto it = specifiers.find(specifier);
    if (it == specifiers.end()) return std::nullopt;
    return Luau::ModuleInfo{it->second, false};
}
```

**Why this shape and not a normalizer in C++:** a specifier map with the bundler's own
resolver as its author cannot drift; a second implementation of "strip `./`, strip
`.luau`, reject `..`" is a bug waiting for the day the bundler changes. The cost is a
few duplicate strings in the map (the sources themselves are stored once), which is
nothing next to a place's script.

**Why not register every spelling directly:** the specifier map is one object, sent once
per file-set change, and `readSource(name)` still stores each source once. The map's
keys are the only thing that multiplies.

`readSource` is a plain map lookup returning
`Luau::SourceCode{source, Luau::SourceCode::Module}`. Every place file is a module — the
demo's `main.luau` starts with `local M = require("spacescape")` — so there is no
`Script` entry to special-case. `getHumanReadableModuleName` returns the name unchanged;
diagnostics are not in this artifact yet.

### 1.4 The C++ surface

Mirror the existing glue's conventions (`glue.cpp`): `EMSCRIPTEN_KEEPALIVE`, `char*`
returns that the TS side frees with `_free`, no pointers surviving a call, and a
`GLUE_TRY`-style macro that catches `std::exception` and `...` at every boundary.

```
int   analysis_create();
void  analysis_destroy(int session);

int   analysis_set_source(int session, const char* name,
                          const char* source, int length);
int   analysis_remove_source(int session, const char* name);
int   analysis_set_specifier(int session, const char* specifier,
                             const char* module);
void  analysis_clear_specifiers(int session);
void  analysis_reset(int session);       // Frontend::clear + empty maps

char* analysis_complete(int session, const char* module, int line, int column);
char* analysis_last_error(int session);
```

- `set_source` replaces the text, calls `frontend->markDirty(name)`, and returns a
  status. A syntax error is **not** an error here: the parser recovers, and completion
  still works on the half-written line — which is exactly the state an editor is in.
- `set_specifier` is called once per mapping; no JSON parser in C++ and no escaping
  problem for module names.
- `remove_source` is for a deleted tab. `reset` is for a project revision, where the
  frontend's caches would otherwise describe a place that no longer exists. It calls
  `Frontend::clear()` and empties both maps.
- `analysis_complete` calls `frontend->check(module, options)` before
  `Luau::autocomplete` — skipping it is the no-op the prior art warns about — then returns
  `{"items":[…]}` or `{"error":"…"}`: never a throw across the wasm boundary, never a
  partially written object. Sort the entries by label before emitting;
  `AutocompleteEntryMap` is an `unordered_map` and tests should not depend on bucket order.

The JSON item is the playground's, plus the fields CodeMirror can actually use:

```json
{
  "label": "insert",
  "kind": "function",
  "detail": "(table, number) -> ()",
  "insertText": "insert",
  "deprecated": false,
  "parentheses": "cursorInside",
  "typeCorrect": "correct",
  "replaceDotWithColon": false
}
```

- `kind` folds `AutocompleteEntryKind` into the small set CodeMirror renders:
  `Property` → `property`, `Binding` → `variable`, `Keyword` → `keyword`,
  `String` → `constant`, `Type` → `type`, `Module` → `module`, and anything whose
  `entry.type` follows to a `FunctionType` → `function`.
- `detail` is `Luau::toString(*entry.type)`; it is the type string the playground shows.
- `insertText` comes from `entry.insertText` when present.
- `parentheses` maps `ParenthesesRecommendation::{None,CursorAfter,CursorInside}`.
- `typeCorrect` maps `TypeCorrectKind::{None,Correct,CorrectFunctionResult}` so the
  editor can boost the expected shape.
- `replaceDotWithColon` is the one field worth carrying even in v1: a `:` method after a
  `.` is a real correction, and CodeMirror's `apply` can make it.

Escape strings once (`"`, `\`, control characters, UTF-8 passed through) and reuse the
helper for every field. A type string can contain quotes; a hand-built `ostringstream`
that forgets one is a JSON parse failure in the editor, not a type error anywhere.

### 1.5 Positions: the byte-column trap

CodeMirror positions are UTF-16 code units. Luau's lexer computes
`Position(line, offset - lineOffset)` over the **UTF-8 bytes** of the source
(`Ast/src/Lexer.cpp`). For ASCII they agree; for a line with `"é"` before the cursor they
do not, and the completion silently lands in the middle of a string literal.

The conversion is the client's job, and it is one line:

```ts
const line = state.doc.lineAt(pos);
const prefix = state.doc.sliceString(line.from, pos);
const column = new TextEncoder().encode(prefix).length; // bytes, not UTF-16
const lineNumber = line.number - 1; // Luau lines are 0-based
```

Test it with a line that has non-ASCII text before the cursor. The playground passes
`pos - line.from`, which is right for ASCII and quietly wrong otherwise; do not copy
that part.

Also guard the C++ side: a line or column past the end of the source returns an empty
result rather than letting `findAncestryAtPositionForAutocomplete` assert. The editor can
ask at any position, including after the last character of the last line.

### 1.6 Caps and failure handling

Analysis runs on **untrusted authored input**, which is the same argument ADR 0015 made
for the VM. It does not run world code, but it does parse and type-check whatever is in
the editor, and a recursive type alias can be pathological. Three caps, all cheap:

- `moduleTimeLimitSec = 2.0` in `FrontendOptions` (per module).
- `-s MAXIMUM_MEMORY=256MB` on the artifact, so a runaway analysis fails with a wasm OOM
  that the worker can report instead of taking the tab down.
- A worker-level watchdog in the client: if a completion has not answered in ~1.5 s,
  reject it, record the failure, and let the textual source answer. If it happens twice,
  terminate the worker and mark analysis dead for this editor session; the next open gets
  a fresh one.

Every C++ entry point catches, so a `check` or `autocomplete` that throws becomes
`{"error": …}` and the editor falls back. The worker is disposable by design; nothing
outside it depends on a session surviving.

## Step 2 — build, pin, and the artifact check

`build.sh` is the only place emscripten is reached, and `--check` is the only thing the
dev loop and CI run. Extend both, without changing what the existing two artifacts mean:

1. `build.sh` copies `luau-analysis.mjs` and `luau-analysis.wasm` from `build/` into
   `dist/` beside the existing pair.
2. The hash loop grows from `luau.wasm luau.mjs` to all four files, writing
   `# artifact luau-analysis.wasm = …` and `# artifact luau-analysis.mjs = …` into
   `pin.txt`.
3. `--check` verifies all four hashes and `git ls-files --error-unmatch` for
   `dist/luau-analysis.wasm`, `dist/luau-analysis.mjs`, and the new `dist/luau-analysis.d.mts`.
   The "a fresh clone must have it" rule does not stop applying because the file is
   optional at runtime.
4. `pin.txt` keeps one tag and one commit for both artifacts (`0.747` /
   `c87565b8b0db5d5d5bfd2b8b00ad6573e5d06d9f` at the time of writing). There is no world
   in which the analysis artifact is allowed to come from a different Luau revision than
   the VM — the whole point of the pin is that the types and the runtime agree.
5. `package.json` gains `"./analysis": "./src/analysis.ts"` (and the artifact files stay
   in the published package, as `dist/` already does).

**Link flags for the analysis target**, starting from the VM's set:

```
-O2 -fwasm-exceptions
-s MODULARIZE=1 -s EXPORT_NAME=createLuauAnalysisModule -s EXPORT_ES6=1
-s ENVIRONMENT=web,worker,node
-s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=32MB -s MAXIMUM_MEMORY=256MB
-s STACK_SIZE=1MB
-s FILESYSTEM=0 -s EXIT_RUNTIME=0
-s EXPORTED_RUNTIME_METHODS=HEAPU8,HEAP8,HEAP32,HEAPU32,HEAPF64
-s EXPORTED_FUNCTIONS=_malloc,_free
```

`ENVIRONMENT` includes `node` because the wrapper's tests run under Vitest; the browser
block still fetches the bytes explicitly (ADR 0015's lesson), so neither loader is
allowed to guess a path. `INITIAL_MEMORY` is 32 MB because `retainFullTypeGraphs` is
memory-hungry and because the playground's measured value is the only prior art we have;
`MAXIMUM_MEMORY` is the cap that keeps a bad source from eating the tab. `STACK_SIZE=1MB`
matches the playground; the C++ type checker recurses over nested expressions, so a
deeply nested fixture belongs in the measurement, not in an assumption. If it overflows,
raise the stack and re-measure — do not catch the trap and call it a fallback.

**Measure before tuning.** `-fno-rtti`, `-flto`, and `--closure` are all plausible size
levers; none is assumed. The first build records the numbers, and only then does a
measurement justify a second build. The existing artifact is built at `-O2` for the same
reason ("a pin bump is the moment to revisit, with numbers, not vibes").

## Step 3 — the TypeScript loader

New file `packages/luau-runtime/src/analysis.ts`, mirroring `src/index.ts`'s two-branch
load exactly:

- **Node:** `readFile(join(root, "dist", "luau-analysis.wasm"))`, import
  `dist/luau-analysis.mjs` through `pathToFileURL`, pass `wasmBinary`.
- **Browser:** `import("../dist/luau-analysis.wasm?url")`, fetch, import the mjs
  statically, pass `wasmBinary`.

`dist/luau-analysis.d.mts` is hand-written like `dist/luau.d.mts`: it is the type of the
factory the artifact exports, not a generated file, and it is committed with the bytes so
a fresh clone type-checks.

The wrapper owns a module-level `analysisPromise` (one instance, like `modulePromise`),
and a single session per worker — no id map is needed, because the worker is the unit of
isolation and a second tab gets a second worker. Methods are synchronous once created:

```ts
export interface LuauAnalysisCompletion {
  label: string;
  kind:
    | "property"
    | "variable"
    | "keyword"
    | "constant"
    | "type"
    | "function"
    | "module"
    | "text";
  detail?: string;
  insertText?: string;
  deprecated?: boolean;
  parentheses?: "none" | "cursorAfter" | "cursorInside";
  typeCorrect?: "none" | "correct" | "correctFunctionResult";
  replaceDotWithColon?: boolean;
}

export class LuauAnalysis {
  static create(): Promise<LuauAnalysis>;
  setSource(name: string, source: string): void;
  removeSource(name: string): void;
  setSpecifier(specifier: string, module: string): void;
  reset(): void;
  complete(
    module: string,
    line: number,
    column: number,
  ): LuauAnalysisCompletion[];
  dispose(): void;
}
```

The wrapper is also where the **artifact version string** lives:
`LuauAnalysis.version()` returns the pin's `<tag> <commit>` the way `LuauState.version()`
does, and the worker logs it once. When a completion looks wrong across app versions,
that string is the first fact to ask for — the ADR's reproducibility rule applied to the
tool.

## Step 4 — the worker (in the app)

The worker belongs to `apps/spacescape/src/places/editor/`, not to the runtime package,
because it is the piece that knows a place's files and their bundling rules. It is tiny
and deliberately has no framework:

```ts
// luau-analysis.worker.ts
import { LuauAnalysis } from "@big-mesh-studios/luau-runtime/analysis";

let analysis: Promise<LuauAnalysis> | undefined;

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  switch (data.kind) {
    case "configure":
      // Create the analysis lazily, then register sources and specifiers.
      break;
    case "source":
      // One file changed; the analyzer keeps the rest.
      break;
    case "complete":
      // Post { id, items } or { id, error }.
      break;
    case "reset":
      // Free the frontend; the next configure starts a fresh one.
      break;
  }
};
```

**Raw `postMessage`, not Comlink.** The protocol is four messages, and the two things it
needs — dropping stale responses and knowing which request failed — are exactly what a
request id gives for free. Comlink would add a dependency to the app for a proxy over a
function that is already synchronous on the worker side.

Request/response shape:

```ts
type Request =
  | {
      id: number;
      kind: "configure";
      sources: Record<string, string>;
      specifiers: Record<string, string>;
    }
  | { id: number; kind: "source"; name: string; source: string }
  | {
      id: number;
      kind: "complete";
      module: string;
      line: number;
      column: number;
    }
  | { id: number; kind: "reset" };

type Response =
  | { id: number; kind: "items"; items: LuauAnalysisCompletion[] }
  | { id: number; kind: "error"; message: string };
```

`configure` is sent once per project revision and whenever the file set changes; `source`
is sent on every `onInput`, including for files that are not in front. That keeps the
analyzer's view of `door.luau` current while the author is editing `main.luau`, which is
what makes cross-file completion trustworthy without re-sending every file per keystroke.

The worker creates `LuauAnalysis` lazily on the first `complete`, not on
`configure` — opening a `.luau` tab must not download a multi-megabyte artifact. The
client may warm it after an idle callback if the measurement says the first completion
is too slow; that is a tuning decision, not an architectural one.

## Step 5 — the editor source and the `CodeMirror` prop

`packages/solid-codemirror` stays app-agnostic. It gains one optional prop and one
composed completion source; it does not learn what a place or a guest library is.

**The completion type is re-declared, not imported.** `solid-codemirror` must not depend
on `luau-runtime`; the app's client returns values that are structurally the same, so the
editor package owns the small shape in `types.ts` and the assignment is checked where the
two meet (in `PlaceEditorPanes`). Rename it on this side if the two ever need to differ;
the compiler will say so.

```ts
export interface LuauCompletionItem {
  label: string;
  kind:
    | "property"
    | "variable"
    | "keyword"
    | "constant"
    | "type"
    | "function"
    | "module"
    | "text";
  detail?: string;
  insertText?: string;
  deprecated?: boolean;
  parentheses?: "none" | "cursorAfter" | "cursorInside";
  typeCorrect?: "none" | "correct" | "correctFunctionResult";
  replaceDotWithColon?: boolean;
}

export interface LuauAnalyzer {
  complete(request: {
    path: string;
    line: number; // 0-based
    column: number; // UTF-8 bytes into the line
  }): Promise<LuauCompletionItem[]>;
  /**
   * The specifier spellings the bundler accepts, for `require("…")` completion.
   * The analyzer does not answer that request; the client already holds the map.
   */
  specifiers?(): readonly string[];
}
```

`luau.ts` exports `luau(options?: { path: string; analysis?: LuauAnalyzer })`. The `path`
is the document's key, because the analyzer needs to know which module the position is
in; it comes straight from `CodeMirror`'s `path` prop. With no analysis, the extension is
exactly today's. With one, it returns the grammar plus

```ts
autocompletion({ override: [luauCompletion(options.analysis)] });
```

and `luauCompletion` is the place where the order of authority is written down:

1. If the cursor is not in a position worth asking about (inside a comment or a
   non-`require` string node — the same syntax-tree check `libraryMembers` already does),
   go straight to textual. The analyzer would return `{}` for a comment anyway, and this
   saves a round trip.
2. Ask the analyzer with the byte column from Step 1.5.
3. If it returns items, return them, with `from` at the start of the word being replaced
   (or at the cursor after `.`/`:`).
4. If it returns none, throws, or times out, return the textual sources — the same
   `documentWords` and `libraryMembers` functions, called directly.
5. Never install the composed source in language data. It is an `override`, precisely so
   that walking `languageDataAt("autocomplete")` from inside it cannot find itself. (The
   TS pane already relies on `override` winning over `basicSetup`'s default
   `autocompletion()`; mirror that.)

`documentWords` still filters the package's vocabulary, so the fallback does not repeat
keywords. When analysis answers, keywords come from `Luau::autocomplete` itself
(`AutocompleteEntryKind::Keyword`), so the package's flat list is not needed in that
branch.

**Triggers.** CodeMirror's `activateOnTyping` starts on word characters, not on `.`.
Add the playground's small `ViewPlugin`: on `keyup` for `.` or `:`, and on a character
(or backspace) inside `require("…")`, call `startCompletion(view)` on the next task so
the character has landed. Set `activateOnTypingDelay: 150` and coalesce: the client keeps
only the latest request id, so a burst of keystrokes produces one wasm call, not five.

**Mapping an item to a CodeMirror option:**

- `type` from `kind`; `detail` from `detail`; `boost` when `typeCorrect !== "none"`.
- `apply` = `insertText ?? label`, wrapped in a function only when
  `replaceDotWithColon` is true, so the preceding `.` becomes `:`. Otherwise the string
  form lets CodeMirror do the insertion.
- `parentheses`: `cursorInside` appends `()` and places the cursor inside;
  `cursorAfter` appends `()`. A string completion cannot express that, so those two use
  an `apply` function.
- `validFor: /^\w*$/` for a plain word; the property case can use the same matcher after
  the dot.

**`CodeMirror` plumbing.** `index.tsx` gains `luauAnalysis?: LuauAnalyzer`, passed into
`createEditor` and included in the rebuild effect's tracked tuple. The analyzer identity
is stable for a given editor session (the lazy client is created once), so this does not
cause rebuild churn; a caller that replaces it gets a rebuilt editor, which is correct.

## Step 6 — the guest library and cross-file completion

The guest library is what makes `require("spacescape")` worth completing. It is a real
Luau module with annotated function parameters (`M.createNpc = function(spec: table)`),
so even unannotated overall, `M.` completes every member name and a useful signature
string. Register it under the analysis module name `spacescape`; map the legacy
`voxelscape` specifier to the same source in the specifier map. `bridge.ts` owns those
names; the map is built from its constants, not retyped.

Use the **same source the bundler compiles**: export `guestModuleSource(levels)` from
`luau-bundle.ts` (renaming it to something like `luauGuestSource`) and call it from the
analysis client. Today `PlaceEditorPanes` does not receive a place's levels, and levels
are runtime data rather than types, so the default sentinel is fine for v1; if levels
ever inform a type, pass them down rather than growing a second guest source.

`require("…")` completion is TypeScript's, as in the playground: detect the string
bounds before the cursor, list the specifier map's keys (filtered by prefix), and insert
the spelling the author is already using (`./door` stays `./door`). The editor package
asks the client's `specifiers()` for those keys; the analyzer is not asked, and its
`StringCompletionCallback` stays `nullptr`.

**Honest limit:** the guest library's `spec: table` parameters mean nested completion
inside a spec literal (`M.createNpc({ ki| })`) is weak. Member completion on the module
is strong; spec fields are not. A typed twin of the guest library would fix that, and it
is deliberately not part of v1 — see Open Questions.

## The fallback ladder

Every rung is a working editor, which is the same promise the panel already makes about
the TypeScript worker:

| Failure                              | What the author sees                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| Analysis never requested             | Today's textual completion; no worker, no wasm download      |
| Worker fails to start (CSP, bad URL) | Textual; one warning; no retry this session                  |
| Wasm fetch/instantiate fails         | Textual; one warning; analysis marked dead                   |
| `complete` exceeds ~1.5 s            | Textual; timeout recorded; a second timeout kills the worker |
| `autocomplete` returns `{"error":…}` | Textual; error logged once per session                       |
| Analyzer returns an empty list       | Textual                                                      |

**An empty analysis result falls through to textual, not to an empty popup.** That is a
deliberate superset: the analysis is authoritative about types, but a heuristic keyword
list on top of it is not a correctness hazard the way hiding a keyword would be. Inside
comments the syntax-tree guard already skips the analyzer, so the fallback is not being
used to paper over a wrong empty answer.

## Tests

### The glue and the loader (`packages/luau-runtime`)

Run under Node, against the committed artifact, the way `spike.test.ts` runs the VM:

- **Members from a local table.** `local t = { alpha = 1 }\nt.` completes `alpha`.
- **Members from the standard library.** `math.` contains `floor`; `table.` contains
  `insert`. This is the case the textual source fakes today; the test proves the real
  one agrees.
- **Guest API through `require`.** `local M = require("spacescape")\nM.` contains `log`,
  `createNpc`, and `randint` — the names an author actually uses.
- **Legacy alias.** `require("voxelscape")` resolves to the same module and completes the
  same members.
- **Cross-file.** `local door = require("./door")\ndoor.` completes a member defined in
  `door.luau`, with both sources registered.
- **Edit invalidates dependents.** Complete `door.`; change `door.luau` to add a member;
  complete again; the new member is there. This is `markDirty`'s dependent traversal
  under test, not an implementation detail.
- **Comments are empty.** `-- math.` returns no items.
- **Byte columns.** A line with `"é"` before `math.` completes when given the byte column
  and fails when given the UTF-16 column — the test that keeps the conversion honest.
- **Position past EOF** returns an empty list, not a trap.
- **Dispose.** `dispose()` does not abort; a second session after a reset still works
  (the `state_close` discipline, applied to the tool).
- **Determinism.** The same request twice returns the same ordered labels.
- **Version string** matches `pin.txt`'s tag and commit.

### The editor source (`packages/solid-codemirror`)

- A fake analyzer returning items after `table.` produces those labels and the request
  carries the 0-based line and the byte column.
- A fake analyzer that rejects, times out, or returns `[]` leaves the textual labels
  present — the fallback is asserted, not assumed.
- `luau()` with no analyzer behaves exactly as today (the existing three tests stay
  green, unchanged).
- The composed source is not discoverable through `languageDataAt`, which is the
  recursion trap from Step 5 made into a test.

### The client and the worker (`apps/spacescape`)

- A fake worker factory: `setSource` before the worker exists is buffered and replayed on
  first `complete`; the wasm is not requested until then.
- Out-of-order responses are dropped; only the latest request id is applied.
- A worker error marks analysis dead, and subsequent completions go straight to textual
  without posting.
- `places/editor/PlaceEditorPanes.test.tsx` gains the case that matters at the app seam:
  a `.luau` pane receives an analyzer when the project has one, and a `.ts` pane does
  not.

### The boundary (the test that keeps decision 8 true)

- `packages/luau-runtime/src/index.ts` has no import of `./analysis` (a source assertion
  is enough; the subpath export is the real boundary, but the assertion catches a stray
  convenience import).
- A production `spacescape` build emits `luau-analysis-*` as its own chunk and the entry
  chunk does not contain the analysis wasm.
- `build.sh --check` passes with the four hashes, and `dist/luau.wasm` still matches its
  pre-change hash.

## Size and speed: what to measure, and where to write it down

Add `analysis-probe.html` beside `luau-probe.html`, served by the same `pnpm probe`. It
loads the analysis artifact, analyzes the demo place, and prints:

| Number                                   | Why it decides something                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `.wasm` bytes and `gzip -9` bytes        | The download every author on a phone pays once                           |
| `.mjs` bytes                             | The loader, small but not zero                                           |
| instantiate time (cold, phone)           | Whether prefetch-on-idle is worth it                                     |
| first completion (cold)                  | The number the user experiences after Ctrl+Space                         |
| warm completion p50 / p95                | Whether 150 ms debounce is invisible or additive                         |
| wasm memory high-water on the demo place | `retainFullTypeGraphs`' real cost, and the `MAXIMUM_MEMORY` sanity check |

Record them in `packages/luau-runtime/README.md` and in the ADR update below. The
playground's 1.56 MB gzipped is context, not a target; their binary includes CodeGen and
Require.

**Decision gates, set before measuring so the numbers cannot be rationalized after:**
if the artifact is over ~2 MB gzipped, or warm p95 is over ~150 ms on the demo place,
stop and revisit rather than shipping: drop `retainFullTypeGraphs` (weaker detail),
strip further (no `-fno-rtti` unless it measurably helps), or keep the textual editor.
A completion popup that makes typing feel worse is a regression, not a feature.

## Docs and ADR

- `apps/spacescape/docs/luau-scripting-plan.md`: Phase 3 moves from "optional IDE chrome" to a link to
  this document and, when done, the measured result. The decision 8 sentence stays; this
  is the lazy chrome it permits.
- `docs/adr/0060-a-place-may-also-be-written-in-luau.md`: append an update to "What this
  does not decide" — the analysis artifact, its measured size, and that `luau.wasm` is
  byte-identical. Decision 8 is unchanged, which is the point: the tool got an artifact,
  the load path did not.
- `packages/luau-runtime/README.md`: the artifact table grows a second row, the "consume
  it" section points at the `./analysis` subpath, and the frozen-surface section states
  the rule in one sentence: _analysis is a tool, its artifact is lazy, and the execution
  artifact does not link it._
- `packages/solid-codemirror`: no README change beyond the prop's doc comment; the
  package still knows nothing about places.

## Risks, honestly listed

1. **Analysis is a much less stable API than the VM.** `Frontend`, `FileResolver`, and
   `AutocompleteEntry` are internal-ish headers that move between Luau releases. A pin
   bump now means re-measuring both artifacts and re-running the conformance tests, not
   just `--check`. That cost is real and belongs in the pin-bump checklist.
2. **Size on a phone.** Multi-megabyte artifact, lazy but not free. Mitigated by the
   gates above, not by optimism.
3. **`retainFullTypeGraphs` memory.** It is what makes the detail strings useful and what
   makes a big place expensive. Measure before choosing an `INITIAL_MEMORY`; a cap that
   is too low turns a completed analysis into an abort.
4. **Type quality on loose code.** The guest library decodes JSON by hand and annotates
   only parameters; `M.` completes well, nested specs do not. Saying so is better than a
   typed twin that drifts.
5. **Two resolvers.** Solved by making the bundler's rules the only author of the
   specifier map, and by the shared-helper test. If someone later adds normalization in
   C++, the test is what notices.
6. **Position drift.** Byte columns, CRLF, and the last line. The byte-column test and
   the bounds guard are the whole mitigation; skip them and the bug is invisible on
   ASCII.
7. **Worker lifetime.** One worker per open editor panel, disposed with the panel. A
   project revision resets the session; a wedged worker is terminated, not reused. The
   fallback must not depend on the worker ever answering.

## Open questions

- **Is a typed twin of the guest library worth it?** It would make `spec` fields
  complete and signatures exact, at the price of a second source that can drift from the
  one that runs. A name-parity test plus the existing `place-api.luau` annotations might
  be enough; decide after measuring completion quality on the demo, not before.
- **Prefetch policy.** First request only, or idle-after-focus? The measurement decides;
  the architecture does not care.
- **Should diagnostics and hover ship in the same artifact?** `Frontend::check` already
  returns them, and the playground exposes all three. They are deliberately out of scope
  here: autocomplete is the feature that replaces a known gap, and diagnostics are a
  separate UX question (where do errors appear, and how loud are they). The artifact's
  API leaves room; do not grow the scope on the way in.
- **Do we ever stop shipping the textual standard-library list?** Not until the analysis
  path is proven on every browser we support. It is the fallback, and it is small.
- **`moduleTimeLimitSec`** 2 s is a guess. Measure the demo and the worst fixture; the
  value belongs in the probe output, not in a comment.

## Implementation checklist

Copy this into the PR description. Each line is a thing that can be wrong on its own.

**Artifact**

- [x] `glue/analysis.cpp`: session, resolvers, specifier map, four exports plus reset.
- [x] `glue/CMakeLists.txt`: `luau_analysis` target; execution target's link line untouched.
- [x] `build.sh`: copy four artifacts; hash all four; `--check` tracks the two new `dist/` files.
- [x] `pin.txt`: two new `# artifact` lines, filled by the build.
- [x] Build on a machine with emsdk; **confirm `dist/luau.wasm`'s hash did not change**.
- [ ] Measure size/time on the probe; record in `README.md`. (Size is measured: 3.38 MB /
      1.13 MB gzipped. The browser probe and warm/cold timings are still open.)

**Wrapper**

- [x] `src/analysis.ts`: both load branches, typed methods, `version()`, `dispose()`.
- [x] `package.json`: `"./analysis"` subpath; no import of it from `src/index.ts`.
- [x] `dist/luau-analysis.d.mts`: hand-written factory types, committed with the artifact.
- [x] `src/analysis.test.ts`: the glue and loader tests above.

**Worker and client**

- [x] `luau-analysis.worker.ts`: configure/source/complete/reset, lazy create, error responses.
- [x] `luau-analysis.ts`: lazy spawn, buffered sources, latest-id coalescing, timeout, dead state.
- [x] `luau-bundle.ts`: export `luauGuestSource` and `luauModuleSpecifiers`; test that every
      emitted spelling resolves back through the bundler.
- [x] Client test with a fake worker.

**Editor**

- [x] `luau.ts`: `LuauAnalyzer`, `luau({ path, analysis })`, composed override, byte column,
      triggers, item→option mapping, textual fallback.
- [x] `index.tsx`: `luauAnalysis` prop, tracked in the rebuild effect.
- [x] `PlaceEditorPanes.tsx`: create the client once when a `.luau` file exists; push sources on
      input; pass it to Luau panes; dispose on cleanup.
- [x] Tests: source fallback, position conversion, no-recursion, pane wiring.

**Proof**

- [x] `pnpm --filter @big-mesh-studios/luau-runtime check-wasm`
- [x] `pnpm --filter @big-mesh-studios/luau-runtime test`
- [x] `pnpm --filter @big-mesh-studios/solid-codemirror check-types test build`
- [x] `pnpm --filter @big-mesh-studios/spacescape check-types test build`
- [x] Confirm the analysis chunk is separate and the entry chunk has no analysis bytes.
- [x] Docs: scripting plan Phase 3, ADR 0060 update, runtime README.

## What this plan deliberately does not do

- It does not add Analysis to `luau.wasm`, and it does not create a path where the
  interpreter imports the analyzer. Decision 8 is the reason the two targets exist.
- It does not build an LSP, a language server process, or a second editor package.
  Completion is a completion source over a wasm call, the same shape the playground
  proves.
- It does not diagnose or hover. Those are the same artifact's next customers, not this
  feature's scope.
- It does not require `--!strict`, regenerate the guest library, or change what runs in
  a place. The editor gets a better view of the code that already ships.
