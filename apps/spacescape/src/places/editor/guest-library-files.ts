/**
 * The files the place editor's language service reads, and the one compiler setting that points a
 * place's `import "voxelscape"` at the right one of them.
 *
 * ## Why the guest library is here rather than described
 *
 * **Because the editor is handed the same source the bundler compiles.** `bundle.ts` already ships
 * `guest/place-api.ts` as a string, and the guest library is a real `.ts` file in this repository
 * type-checked by its own `tsc` — which is ADR 0018's point and the reason `guest/voxelscape.ts`
 * is a one-line re-export rather than a `.d.ts`. So the editor feeds that source in under the name
 * a place imports it by, and a place author gets completions on all thirty-seven guest bindings
 * with no generated declarations and nothing that can drift from what runs.
 *
 * `guest/voxelscape.ts:19-27` records that the `.d.ts` route was tried here and failed: a `.d.ts`
 * reached through `paths` is resolved *as a module*, so a `declare module` inside it augments a
 * module that has to exist somewhere else. This is the route that works.
 *
 * ## The virtual filesystem mirrors the repository's own layout
 *
 * **Because the guest library's one relative import is `../bridge`, and a flat map would not
 * resolve it.** `place-api.ts` lives in `places/guest/` and reaches `places/bridge.ts`, so the
 * editor's files are named for where they really are. That is also why `paths` maps a specifier to
 * a path with `./` in it rather than to a bare name.
 *
 * ## `@big-mesh-studios/core` is deliberately absent
 *
 * **It is reached only through two internal `p: Vec3` signatures inside the primitive table** —
 * `halfExtents` and `sdf` take a point to measure at, and neither is anything a place author
 * writes. Every type that reaches an author — `ShapeType`, the parameter names, the
 * discriminated union a shape literal narrows against — resolves without it. Including it would
 * mean five more cross-package `?raw` imports that break silently the moment that package splits a
 * file, for one type that would only become `any` if it did.
 *
 * `notServedByTheEditor` below is the list of that exemption, and `guest-library-files.test.ts`
 * fails when a bare specifier the guest library imports is neither in the map nor on it — so the
 * day somebody imports something real, this is where it says so.
 */

import GUEST_SOURCE from "../guest/place-api.ts?raw";
import BRIDGE_SOURCE from "../bridge.ts?raw";
import SDF_INDEX_SOURCE from "../../../../../packages/sdf/src/index.ts?raw";
import SDF_PRIMITIVES_SOURCE from "../../../../../packages/sdf/src/primitives.ts?raw";

/** Where the guest library sits in the editor's filesystem, under the name a place imports. */
export const GUEST_FILE = "places/guest/voxelscape.ts";

/** The host's five methods, which `place-api.ts` names as types. */
const BRIDGE_FILE = "places/bridge.ts";

/** The primitive table, whose types are what a shape literal narrows against. */
const SDF_INDEX_FILE = "packages/sdf/src/index.ts";
const SDF_PRIMITIVES_FILE = "packages/sdf/src/primitives.ts";

/**
 * Every file the editor's language service holds, by the path it is held at.
 *
 * **A place's own files are not here** — the panel adds them, and only they change as somebody
 * types. Everything in this map is a fixed input: the guest library, the host interface it names,
 * and the primitive table.
 */
export const GUEST_LIBRARY_FILES: Readonly<Record<string, string>> = {
  [GUEST_FILE]: GUEST_SOURCE,
  [BRIDGE_FILE]: BRIDGE_SOURCE,
  [SDF_INDEX_FILE]: SDF_INDEX_SOURCE,
  [SDF_PRIMITIVES_FILE]: SDF_PRIMITIVES_SOURCE,
};

/**
 * Bare specifiers the guest library imports that the editor does not serve, each with the reason.
 *
 * **An allowlist rather than an exception**, because "the language service cannot resolve this" is
 * a sentence nobody should read without also reading why it was decided.
 */
export const notServedByTheEditor: Readonly<Record<string, string>> = {
  "@big-mesh-studios/core":
    "reached only through two internal `p: Vec3` signatures in the primitive table; every type a place author writes resolves without it",
};

/**
 * The compiler options the editor's language service is given.
 *
 * **`moduleResolution: "Bundler"` is what makes `paths` mean anything here.** The worker's virtual
 * environment is assembled file by file with no `node_modules` in it, so a bare specifier has to be
 * resolved by the `paths` table rather than by walking directories that are not there.
 *
 * `noEmit` because nothing is emitted: the editor type-checks, and `bundle.ts` is what transpiles.
 * `strict` because a place's source is compiled under it by `tsconfig.json`, so an editor that
 * disagreed would be the more forgiving of the two.
 *
 * **The options are TypeScript's own enum values rather than the strings they print as.** The
 * worker hands this straight to `createVirtualTypeScriptEnvironment`, which wants a
 * `CompilerOptions`; `ts` is imported as a value for that and costs nothing here, because
 * `bundle.ts` already imports the same module.
 */

import ts from "typescript";
import type * as TS from "typescript";
/**
 * Where each bare specifier a place's editor meets resolves to.
 *
 * **Its own export because `CompilerOptions` types `paths` as optional**, and the worker, the panes
 * and the drift-guard test all need to read it — none of which should have to narrow first, and
 * one of which would then be asserting against a value it had just proved might be absent.
 */
export const EDITOR_PATHS: Record<string, string[]> = {
  voxelscape: [`./${GUEST_FILE}`],
  "@big-mesh-studios/sdf": [`./${SDF_INDEX_FILE}`],
};

export const EDITOR_COMPILER_OPTIONS: TS.CompilerOptions = {
  target: ts.ScriptTarget.ES2019,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  baseUrl: ".",
  paths: EDITOR_PATHS,
};
