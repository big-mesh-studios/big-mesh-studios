/**
 * The editor's language-service files: that they are the sources the world compiles, that every
 * one a place imports resolves, and that the compiler settings point where the module says.
 *
 * ## What is being tested
 *
 * **A drift guard, and it is the point of this file.** The editor hands the worker the guest
 * library's source and the bundler compiles the guest library's source, which is the arrangement
 * that makes completions trustworthy. Two consequences follow, and both are invisible while they
 * hold:
 *
 * 1. **A second copy.** The natural mistake is to keep the editor's file and the bundler's
 *    `GUEST_SOURCE` apart, and then they drift silently — a function added to one is missing from
 *    the other, and the only symptom is a completion a place author was given by a tool that does
 *    not exist. Asserting the two imports are the same module would not catch that, because they
 *    are; what catches it is that both read one file, and this file says which one.
 * 2. **A dependency the editor cannot serve.** `place-api.ts` imports from another package, and
 *    the worker's filesystem is assembled by hand. A new import that nothing in the map resolves
 *    degrades to `any` in the editor and nowhere else, so a person is told a shape's `type` is a
 *    string and the world then refuses it.
 */

import { describe, expect, it } from "vitest";

import {
  EDITOR_COMPILER_OPTIONS,
  EDITOR_PATHS,
  GUEST_FILE,
  GUEST_LIBRARY_FILES,
  notServedByTheEditor,
} from "./guest-library-files";
import ts from "typescript";
// **Deliberately the same specifier `bundle.ts` uses.** The failure this guards is real and quiet:
// `guest/voxelscape.ts` is a one-line re-export and `guest/place-api.ts` is the library, so a
// module that reached for the alias would hand the editor a stub with no types in it while the
// bundler compiled the library — and the symptom would be completions that do nothing.
import GUEST_SOURCE from "../guest/place-api.ts?raw";
import { GUEST_MODULE } from "../bridge";

/** Every bare specifier a source imports, in one pass over `import … from "…"`. */
const bareSpecifiers = (source: string): string[] => {
  const specifiers = new Set<string>();
  const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  for (const [, specifier] of source.matchAll(pattern)) {
    if (specifier === undefined) continue;
    // **A relative specifier is a path inside the map, not a package to resolve.** It is checked
    // below by resolving it against the importing file's own directory.
    if (!specifier.startsWith(".")) specifiers.add(specifier);
  }
  return [...specifiers];
};

/** A relative specifier resolved against the directory of the file that imported it. */
const relativeTarget = (from: string, specifier: string): string => {
  const directory = from.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "." || segment === "") continue;
    else if (segment === "..") directory.pop();
    else directory.push(segment);
  }
  return directory.join("/");
};

describe("the guest library the editor serves", () => {
  it("is the source the bundler compiles, not a second copy", () => {
    // **The arrangement, asserted rather than assumed.** Both import the same module, so they are
    // the same string by construction — and this fails if either stops doing so, which is what
    // makes the pair of imports above worth writing out rather than sharing a constant.
    expect(GUEST_LIBRARY_FILES[GUEST_FILE]).toBe(GUEST_SOURCE);
    expect(GUEST_SOURCE.length).toBeGreaterThan(0);
    // **And not the alias**, which is a re-export and would give the editor a file with nothing
    // in it to complete against.
    expect(GUEST_SOURCE).not.toBe('export * from "./place-api";\n');
  });

  it("is the whole of the library, under the name a place imports it by", () => {
    // **`GUEST_MODULE` is what `bundle.ts` reserves**, so a mismatch here is an import that
    // compiles and then resolves to nothing at runtime.
    expect(EDITOR_PATHS[GUEST_MODULE]).toEqual([`./${GUEST_FILE}`]);
  });

  it("exposes every function a place can call", () => {
    // **A count, as a smoke alarm rather than a specification.** Thirty-seven is the `export const`
    // bindings `place-api.ts` declares today; the file exports fifty-one declarations in all, the
    // rest being types and one class. If this changes and the number below was not updated, the
    // author is missing something a function exists and the editor does not offer.
    //
    // **Counted from `export const`, because that is how the library declares them** — matching
    // `export function` would find nothing at all and the alarm would sit there reading zero.
    const declared = [...GUEST_SOURCE.matchAll(/^export const (\w+)/gm)].map(
      ([, name]) => name,
    );
    // **37 was the count before the four figure functions.** A literal here is a tripwire: it
    // fails when a function is added and someone has to look at the number rather than let it
    // drift, which is what it is for.
    // **50 after `level`**, which is the one function the level editor added: a place that
    // carries a level can read it, and that is the only way a script can find out what its own
    // place is made of. The count is a tripwire — it fails when a function is added and someone
    // has to look at the number rather than let it drift, which is what it is for.
    expect(declared).toHaveLength(50);
    expect(new Set(declared).size).toBe(declared.length);
    // **And the names a place is most likely to reach for first**, so the count above cannot pass
    // on a file that has the right number of exports and none of them callable from a place.
    for (const name of [
      "createShape",
      "removeShape",
      "level",
      "createZone",
      "createLight",
      "createMedium",
      "after",
      "onTick",
      "saveData",
      "loadData",
      "getHeightAt",
    ]) {
      expect(declared, name).toContain(name);
    }
  });
});

describe("every import the guest library makes", () => {
  it("resolves in the editor's filesystem, or is listed with a reason", () => {
    // **The failure this catches is a silent one.** An unresolvable specifier becomes `any` in the
    // editor and changes nothing in the world, so a person is told a shape's `type` is a string
    // and the place is then refused at runtime.
    const unmapped: string[] = [];

    for (const [path, source] of Object.entries(GUEST_LIBRARY_FILES)) {
      for (const specifier of bareSpecifiers(source)) {
        if (specifier.startsWith(".")) {
          if (
            !Object.hasOwn(GUEST_LIBRARY_FILES, relativeTarget(path, specifier))
          ) {
            unmapped.push(`${path} → ${specifier} (relative)`);
          }
          continue;
        }
        const served = Object.hasOwn(EDITOR_PATHS, specifier);
        if (!served && !Object.hasOwn(notServedByTheEditor, specifier)) {
          unmapped.push(`${path} → ${specifier}`);
        }
      }
    }

    expect(unmapped).toEqual([]);
  });

  it("has a reason for every specifier it does not serve", () => {
    // **An allowlist entry with an empty reason is worse than none**, because it reads as a
    // decision that was made and says nothing about what it was.
    for (const [specifier, reason] of Object.entries(notServedByTheEditor)) {
      expect(specifier, specifier).toMatch(/^(@[a-z-]+\/)?[a-z]/);
      expect(reason.length, specifier).toBeGreaterThan(30);
    }
  });

  it("serves nothing it claims to serve from a file it does not hold", () => {
    // **A `paths` entry pointing at a file the map lacks resolves to nothing at all**, which is
    // worse than an absent entry: the specifier looks handled.
    for (const [specifier, targets] of Object.entries(EDITOR_PATHS)) {
      for (const target of targets) {
        const path = target.replace(/^\.\//, "");
        expect(
          Object.hasOwn(GUEST_LIBRARY_FILES, path),
          `${specifier} → ${path}`,
        ).toBe(true);
      }
    }
  });
});

describe("the primitive table", () => {
  it("is served whole, so a shape literal narrows against the real table", () => {
    // **The nine primitives are the point.** `place-api.ts` derives its shape options from
    // `PRIMITIVES`, so the editor's completions for `createShape` are only as good as this table
    // being the real one rather than a stand-in.
    expect(GUEST_LIBRARY_FILES["packages/sdf/src/primitives.ts"]).toContain(
      "export const PRIMITIVES",
    );
    expect(GUEST_LIBRARY_FILES["packages/sdf/src/index.ts"]).toContain(
      "./primitives",
    );
  });

  it("names every shape a place may write", () => {
    // **A name checked against the served source rather than a list of its own**, because a list
    // of its own is the second copy this whole arrangement exists to avoid.
    const served = GUEST_LIBRARY_FILES["packages/sdf/src/primitives.ts"];
    for (const shape of ["Sphere", "Ellipsoid", "Box", "RoundBox", "Capsule"]) {
      expect(served, shape).toContain(`  ${shape}: {`);
    }
  });
});

describe("the compiler options", () => {
  it("resolve module specifiers, which is what the paths table needs", () => {
    // **`moduleResolution: "Bundler"` rather than the default**, because the worker's filesystem
    // is assembled by hand with no `node_modules` in it, and a bare specifier has to be resolved
    // by the table rather than by walking directories that are not there.
    expect(EDITOR_COMPILER_OPTIONS.moduleResolution).toBe(
      ts.ModuleResolutionKind.Bundler,
    );
    expect(EDITOR_COMPILER_OPTIONS.noEmit).toBe(true);
    expect(EDITOR_COMPILER_OPTIONS.strict).toBe(true);
  });

  it("target what a place is compiled for, so an author is not shown newer syntax", () => {
    // **ES2019, matching `bundle.ts`'s pinned options.** An editor that accepted `??=` while the
    // interpreter's compiler did not is an author who finds out at Run.
    expect(EDITOR_COMPILER_OPTIONS.target).toBe(ts.ScriptTarget.ES2019);
  });
});
