# Voxel solidity: how the marcher should find out a voxel is there

Measurements for the experiment on `voxel-solidity-experiments`. Reproduce with
`npx vite`, open `/bench.html`, and call `__benchAll()` in the console; the solve
numbers come from `__benchSolveAll`, `__benchSolveColumn`, `__benchSolveCells`
and `__benchLegacySolve`.

Machine: Apple M1, Chrome, ANGLE Metal. GPU timer queries
(`EXT_disjoint_timer_query_webgl2`), medians of 40 presented draws at 1024².
Fixture: a cube with roughly one cell in seven carved out of each panel,
emptiness mirrored onto opposing panels.

Numbers move about 4% between runs, so only compare within a table, and treat
differences under about 0.02 ms as noise.

## Drawing a frame (ms)

Every variant was checked pixel-identical to the committed six-panel render
before being timed, and every one of them was.

| variant | what the marcher does per step | 15³ | 32³ | 64³ |
| --- | --- | --- | --- | --- |
| `legacy` (before the panels) | one lookup, CPU-solved volume with the face colours packed into it | 0.572 | 0.605 | **0.616** |
| `panels` (committed) | six panel lookups | 0.607 | 0.684 | 0.702 |
| `mirrored` | three panel lookups | 0.600 | 0.678 | 0.687 |
| `packed` | three lookups, two panels per texture | 0.572 | 0.609 | **0.623** |
| `atlas` | one lookup, z-slices in a square grid | 0.594 | 0.678 | 0.654 |
| `columnDiv` | one lookup, z-slices in one column, found by dividing | 0.611 | 0.649 | 0.661 |
| `column` | one lookup, z-slices in one column, found by multiplying | 0.560 | 0.628 | **0.614** |
| `volume` | one lookup, 3D texture, solidity only | 0.563 | 0.608 | **0.616** |

## Solving the volume ahead of the march (ms per edit)

| pass | 15³ | 32³ | 64³ |
| --- | --- | --- | --- |
| GPU, whole volume, square grid | 0.033 | 0.039 | 0.078 |
| GPU, whole volume, single column | 0.031 | 0.036 | 0.078 |
| GPU, the run behind one edited cell | 0.030 | 0.034 | 0.042 |
| GPU, the runs behind ten edited cells | 0.033 | 0.037 | 0.047 |
| CPU, whole volume — what `legacy` paid per edit | 0.300 | 1.700 | **11.400** |

The CPU row is the original `solveVoxels`, timed in the browser on wall clock.
The same pass under node measures 19.2 ms at 64³; the browser's JIT is faster, so
the browser number is the fair one. Reusing the output buffer or allocating a
fresh one each time measured the same, so the cost is the per-voxel packing loop
rather than allocation. The volume was uploaded per edit as well: 13 KiB, 128 KiB
and 1024 KiB against the 6 × 3.5 KiB, 6 × 16 KiB and 6 × 64 KiB the panels cost.

## What the numbers say

**The port cost about 12% of a frame and saved 11 ms of an edit.** `legacy` draws
at 0.616 ms and `panels` at 0.702 ms at 64³ — but `legacy` also ran an 11.4 ms
CPU pass over every voxel on every edit, on the main thread, once per command.
That is most of a 60 Hz frame budget spent per drawn pixel, against 0.086 ms per
frame recovered. The port was a large win.

**The atlas was slow because of an integer division, not texture locality.**
`columnDiv` and `column` read the same texture in the same layout and differ only
in how they find the slice — dividing z by the tiles per row, or multiplying
because in a single column the slice index *is* z. That one change is worth about
0.047 ms at 64³, essentially the whole gap between the atlas and a 3D texture.
Integer division by a value only known at runtime is expensive, and it happened
on every step of every ray.

**A real 3D texture buys nothing.** Once the division is gone, `column` (0.614)
and `volume` (0.616) are the same speed. There is no locality advantage left to
chase, so a pre-pass writing into a 3D texture — which WebGL2 can only fill one
z-slice per draw — has no reason to exist.

**The packed face colours cost nothing either.** `legacy` unpacks six five-bit
indices out of the voxel it fetched; `volume` fetches solidity alone and reads
the colour off a panel. Both land at 0.616. The unpacking the port retired was
never the expensive part.

**A solved volume buys nothing over `packed`.** `packed` (0.623) sits within noise
of `legacy`, `column` and `volume`, while needing no pre-pass, no extra texture
and no state to keep in sync. A solve pass costs 0.078 ms per edit and about a
hundred lines of WebGL to earn a difference that cannot be distinguished from
run-to-run variance.

**Incremental solving is near-worthless.** Redrawing the run behind one edited
cell costs 0.042 ms against 0.078 ms for redrawing all 262,144 voxels at 64³. The
pass is dominated by fixed overhead, not by how many voxels it touches.

So: `packed` is the change worth making. It recovers what the port cost per
frame, halves the upload, adds no state, and matches the fastest thing measured —
including the version that came before the panels.
