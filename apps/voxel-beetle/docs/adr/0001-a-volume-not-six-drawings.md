# A model is a box of voxels, not six drawings

`rm-stacker` describes a model as six bitmaps, one per side of its box, and
reconstructs the voxels from them: each side's silhouette carves away the run of
voxels along the axis it looks down. That form is compact and quick to draw from,
and it is also a constraint. Six flat silhouettes can only hold one shape along
every axis, so anything that varies along an axis needs a cut across it
(`rm-stacker/docs/adr/0002-sections.md`), and a cut between every pair of slices
is a box per voxel (`rm-stacker/docs/adr/0004-a-cut-drawn-as-boxes.md`).

A model here is instead the box of voxels itself. `packages/stacker`'s new
`./volume` entry point carries it: a palette index a voxel, `Bitmap.EMPTY` where
there is nothing, laid out a plane at a time. Drawing reaches a voxel directly
rather than through the two faces that bound it, so nothing has to be kept in
agreement with anything else, and there is no shape the box cannot hold.

## Considered options

- **Six sides, with a cut per slice.** Rejected: a cut per slice is a box per
  voxel, which is the box a volume already is, held in a larger structure.
- **Six sides, with a cut across each axis only where a drawing needs one.**
  Rejected: it keeps the run-pairing rule that a stroke on one face has to be
  answered on the other, which is a rule about keeping two flat views
  consistent rather than about the model.
- **A volume, kept alongside the six sides.** Rejected: the sides would then be a
  second description of the same thing that could disagree with it.

## Consequences

- The side vocabulary, the panel table, the run-pairing rule, the cut
  machinery, the guide masks and the parts hierarchy all go. `figurePlacement`,
  `FigureMeshes` and `solvePart` are shaped around parts and are not used here.
- A voxel takes one colour rather than a colour per face. The packed format the
  ray marcher reads has six five-bit face slots, so `packVolume` writes the same
  index into all six and `march.ts` and `material.ts` are untouched by that. The
  preview does not read the packed form at all any more
  ([ADR 0008](./0008-the-preview-is-a-mesh-not-a-march.md)), but the other three
  programs still draw with the ray marcher and the packing it reads, so
  `packVolume` stays.
- Mirroring a stroke reflects it within the slice being drawn, which is an
  index transform, rather than reaching across to the face on the other side of
  the run.
- A fill spreads within the plane it is drawn on and not through the box: a fill
  that reached through would repaint a shape on the far side of the model that
  is not on screen to be seen happening.
