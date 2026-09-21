# The voxelscape module ships a small guest-side math library

A place script had bare JavaScript numbers and arrays. Aiming, offsets,
colour, and the seeded random it must use for anything that has to converge
across peers all had to be re-derived by hand, and a script that reached for
the wrong shape (an object where a `[x, y, z]` tuple was expected) found out at
run time. This decision gives the `"voxelscape"` module a small set of value
types and helpers, written as guest source and compiled into the same module
the rest of the host surface comes from.

## The library is guest code, not host functions

`Vector3`, `Vector2`, `Color3`, `clamp`, `lerp`, `smoothstep`, `randint`,
`randFloat`, and `choice` are plain classes and functions defined in the
sandbox's own realm. They cross no boundary, allocate only guest objects, and
use the already-seeded `Math.random`, so a `randint` is deterministic per peer
exactly as `Math.random` is (ADR 0027). Nothing here can reach the host, and
the host never sees a `Vector3` — a script converts it to an array before
dispatching, or calls a helper that already expects one.

## Kept as a source string beside the hand-written library

The bundler builds the synthetic `"voxelscape"` module from text, not from an
import graph, so the math lives in `voxelscape-math.ts` as the guest source it
will become and is concatenated ahead of `voxelscape-lib.ts`. The author-facing
`voxelscape.d.ts` declares the same names as ambient classes and functions, so
the editor and `tsc` type a script's `Vector3` the same way the sandbox runs
it.

## Considered options

- **A real imported module bundled like a project file.** Rejected: the only
  specifiers a project file may import are its own files and `"voxelscape"`;
  making the math a second reserved specifier reintroduces the two-dependency
  split ADR 0050 folded away.
- **Host functions returning JSON, parsed into guest objects.** Rejected: the
  point is cheap local arithmetic a script does thousands of times; a boundary
  crossing per vector operation is the wrong side of the seam.
- **A full vector/CFrame library mirroring another engine's.** Rejected for
  now: the world is axis-aligned voxels and boxes, and a `Vector3` with the
  handful of operations scripts actually reach for covers the need without
  committing to a rotation type the world has no place for yet.

## Consequences

- A script can `import { Vector3, Color3, clamp } from "voxelscape"` and get
  typed, deterministic value types with no new host surface.
- The math is included in the synthetic module only where a file imports
  `"voxelscape"`, so a project that never uses it pays nothing.
- Adding to the library is one edit to the guest source and one to
  `voxelscape.d.ts`; a function that needs the world belongs in the query
  surface instead.
