# 0052 — A shape may write its own width

## Context

The file format's stated reason for existing as it is (`packages/csg/src/serialise.ts`): _"The
layout is fixed-width and little-endian, which makes it seekable and impossible to misparse in a
way that yields plausible numbers: a shape's parameter count depends on its type, but its
position does not, because every shape's parameters are contiguous after the shape's type
byte."_

Every one of the nine primitives in ADR 0025's table is a fixed handful of numbers, so that
sentence and the table agreed with each other and `parameterFloats` could answer a shape's width
without being given a shape. Four readers took that answer for granted — the serialiser's read
and its write, the parameter count, and the script layer's checker.

Then a floor needed an outline. A floor is a drawn loop extruded by a thickness
(`apps/spacescape/docs/floor-plan.md`), which is a **list of points**, and a list's length is not
a function of what kind of list it is. There was no place in this repository to put that.

The tempting answer was not to put it anywhere. The walls feature, which shipped immediately
before, had already solved the neighbouring problem by not solving it: `wallParts` expands a
drawn polyline into one `{ type: "Box" }` per segment, and every box is a thing the format
already knows. That is why `draw-walls-plan.md` could promise _"no `@big-mesh-studios/sdf`
change, no `@big-mesh-studios/csg` change, no binary-format bump"_ — and why its Phase 7, _"a
real `Walls` primitive"_, was deferred. A floor is one solid with a boundary, not a dozen boxes,
so the deferral was not available.

The alternative was to leave the floor a level-only item and expand it into primitives the
format does know. There is no such expansion: a polygon is not a run of segments, which is the
whole reason to want it.

## Decision

**A parameter's arity is `1 | 3 | "variable"`, a variable parameter writes its own width as its
first float, and `FORMAT_VERSION` goes to 5.**

The count is an `f32` rather than a `u8` so the block stays 4-byte aligned and `floats * 4`
remains the only width arithmetic in the file. `parameterFloats` keeps answering a shape's
_fixed_ count — one per variable parameter — and `serialisedSize` now measures the shape rather
than the type.

**Versions 4 and 3 are read, and a model with nothing new in it is written at version 4.** Both
halves are the same decision: a version bump that orphans every existing model is not a version
bump, it is a migration nobody asked for, and the only files that genuinely need the newer build
are files containing something the older one could not have drawn.

**`PrimitiveParameter` became a union rather than gaining optional fields**, and that is the part
with teeth. A point list is not one number or three, has no `min` and no `step`, and has no
input; giving it `min: 3` and calling that a minimum size would make the one number on a polygon
that reads correctly the one number that means something else. It also means every reader that
switches on `arity` now has to say what it does about a third case, and **the compiler says so
rather than leaving a panel to render a list of points as a number field**. That is ADR 0025's
argument applied to the one gap the table had.

## Consequences

**Reading an older version is a claim about what its bytes mean, not about how wide they are.**
`READABLE_VERSIONS` holds the versions and `ABSENT_TRAILING_BYTES` says what each lacks — for
version 3, the trailing material byte ADR 0048 added, so its record is one byte shorter per
operation and its operations carry **no material field at all**: absent rather than zero, and
rather than a key with nothing under it. A buffer claiming a `Polygon` is refused by name, because
its count would be read as a width and every operation after it would land at a plausible offset.
Everything older than 3 is still refused, and the reason is not age: version 2 moved the capsule's
length from X to Y and made a colour count on any operation, so every field in such a file is
present, readable, and means something else.

**Writing the lowest version that can describe the model is what makes reading them worth
anything.** With an unconditional stamp, opening a project and saving it — with no polygon
anywhere in it — would produce a file the previous build cannot open, and the compatibility would
have a very short life. The cost is that the version byte is a function of the model's contents
rather than a constant, and the claim that it is safe is checkable: **for any model with no
variable-width shape, the version 4 and version 5 files are the same bytes with one differing**,
and `serialise.test.ts` asserts that by writing the same operations both ways and comparing.

The evidence that this worked is the repository's own models. All 39 files in
`apps/spacescape/public/models/` regenerate **byte-identical to `ce90c7f`**, the commit before
this feature: the same bytes the pre-floor build wrote, which every build since can read.

**A polygon anywhere in a model is enough to require version 5**, since the version describes the
file rather than the operation. That is the one case that genuinely needs a newer build, and it is
a case where the older one could not have rendered the contents anyway.

**A level reader now refuses an outline it cannot draw.** `checkOutline`
(`apps/spacescape/src/places/fields.ts`) refuses a point count outside the table's bounds, a
coordinate that is not a finite number in range, and two consecutive vertices at the same place.
The last is not a formatting complaint: the distance to an edge is a projection divided by the
edge's squared length, so a zero-length edge is a NaN, and a NaN in a field is a hole nothing
downstream can explain. **`MIN_SHAPE_SIZE` is a floor on a _size_ and these are positions** — a
vertex at the local origin is the centre vertex of a perfectly ordinary square, and routing the
coordinates through the same check would turn away every symmetrically drawn floor with no
error anywhere near the cause.

**`PRIMITIVE_NAMES` and a palette came apart.** `primitiveFromCode` walks `PRIMITIVE_NAMES`, so
that list has to keep every name a file can carry; a palette is a list of things to click, and
an outline is not a thing to click. `PALETTE_NAMES` filters on an `inPalette` flag, and the
level editor's toolbar reads the full list anyway — a floor is placed by drawing it.

## Alternatives

**A fixed capacity: `Polygon` always occupies `1 + 2N` floats, zero-padded.** This was
recommended and declined. It needs **no change to `serialise.ts` at all** — `parameterFloats`
stays constant, the version stays at 4, and no baked place is orphaned, because there is no bump.
The price is a hard cap on corners and bytes wasted on every triangle.

**It is recorded here rather than in a comment because it will look attractive again**, and after
the compatibility work it is a better option than it was: the dual-read and the lowest-version
writer now cost about thirty lines, and a fixed capacity would have bought the same
backwards compatibility for free while keeping the format's central invariant intact. The reason
to decline it was a preference for a variable-length shape being encoded as a variable-length
thing rather than a measurement, and that is still the whole of it.

**A separate section after the operations, with each operation holding an index.** Old readers
ignore trailing bytes, so no bump would be needed and there would be no padding. It needs a byte
per operation to hold the index, and ADR 0048 spent the last one on `material`, so the bump
comes back anyway with more moving parts.

**Leave the width derivable and cap the outline at a number of points that fits a float.** That
is the first option wearing a hat.
