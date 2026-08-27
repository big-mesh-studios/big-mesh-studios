# Split `maths` into one module per type

`src/utils/maths.ts` held eight `export namespace` blocks — `Vector2D`, `Vector3D`,
`Dimensions3D`, `RGB`, `RGBA`, `HSVA`, `Bitmap`, `Matrix3x3` — each merged with a
same-named interface, so a single imported name carried both the shape and the
operations on it.

TypeScript compiles a namespace to an immediately-invoked function expression that
assigns onto a mutable binding and hangs each member off it as a property. A bundler
cannot prove that call has no effect, so the whole block survives, and the property
assignments are opaque to member-level analysis. Bundling an entry that used nothing
but `Vector2D.create` produced 4,719 bytes against 4,923 for the entire module, with
all eight IIFEs present. Six of the eight groups had no caller outside `maths.ts` at
all, yet `Bitmap.toImageData`, `Matrix3x3.rotationY` and `HSVA.fromRGBA` all shipped
in `dist-lib/lib.es.js` and in the application bundle.

Each type now has its own module of functions under `src/utils/maths/`, and the shapes
those functions operate on are declared together in `types.ts`. `index.ts` re-exports
every group twice under one name: `export * as Vector2D from "./vector-2d"` for the
functions, and `export type Vector2D = Types.Vector2D` for the shape. A module namespace
is not a runtime object — `Vector2D.create` resolves statically to a top-level binding —
so Rollup drops the members nobody calls. Call sites did not move:
`import { Vector2D } from "../utils/maths"` still resolves, and still yields both
`Vector2D.add(...)` and `const a: Vector2D`.

Keeping the shapes out of the function modules is what stops each group from carrying
its own name as a member. Were `Vector2D` an interface exported from `vector-2d.ts`, the
star export would carry it, `Vector2D.Vector2D` would be a second spelling of the same
type, and the editor would offer it alongside `add` and `create`.

## Considered options

- **`export const Vector2D = { create, add, ... }`**: keeps the interface merging and
  needs no new files, but the object is a single binding, so touching one member
  retains every member. Measured at group granularity — an unused group dropped, an
  unused member of a used group did not. Rejected: it reclaims the six dead groups and
  nothing inside the two live ones, and flattening eight namespaces into one file
  collides on `create` and `equals` (four groups each), `toCSS` (three), and `clone`,
  `length` and `normalize` (two each).
- **`import * as Vector2D from "../utils/maths/vector-2d"` at each call site**: shakes
  exactly as well as the barrel, but the editor does not offer a namespace import as an
  auto-import, so every use has to be typed by hand.
- **`export type { Vector2D } from "./vector-2d"` beside the star export**: rejected
  because it does not compile. `export * as` claims the type space as well as the value
  space, so the pair is a duplicate identifier. A locally declared alias is a separate
  declaration and does not collide, which is why the barrel imports each module as a
  type and aliases through it.

## Consequences

- `lib.es.js` went from 407,278 to 401,027 bytes (109.0 kB gzipped, from 110.8) and
  `lib.umd.js` from 276,303 to 271,947. The saving exceeds the dead code alone because
  namespace members were property assignments whose names the minifier had to preserve;
  as module exports they rename freely.
- esbuild does not shake star-exports at member level (evanw/esbuild#1420), so this
  granularity is Rollup's. `vite build` bundles with Rollup and calls esbuild only to
  minify, and the dev server does not bundle at all, so both configurations in this
  repository get it — but an output bundled by esbuild would lose it silently.
- Adding a group costs an interface in `types.ts` plus two lines in `index.ts`, the star
  export and the type alias, and separates a group's shape from its functions.
- `Matrix3x3` is the one group whose shape stays with its functions: it is
  `export class Matrix3x3 extends Float32Array {}`, a runtime value that `create` calls
  with `new`, so a file of pure types cannot hold it. `Matrix3x3.Matrix3x3` therefore
  remains a second spelling of that one type, where the other six have none.
- `Dimensions3D` is gone rather than moved. Nothing anywhere called it, and its
  `width`/`height`/`depth` shape was `Vector3D` under other names, so its two functions
  moved onto `Vector3D` as `equals` and `normalizeToLongestAxis`. The second needed the
  longer name because `Vector3D.normalize` already means division by length, where this
  one divides by the largest component. Its private `Dimensions2D` base went with it,
  and neither was ever exported, so the public surface is unchanged.
