# voxel-beetle

A voxel editor that draws the voxels themselves.

A model is a box of voxels, one colour each, and you edit it by choosing a plane
— XY, YZ or ZX — choosing a slice along it, and drawing on that slice in 2D. The
slice stands in the model in the 3D preview beside it, and a tap in the preview
brings that voxel's slice to the front, so the two views drive each other.

The other editor in this repository, `rm-stacker`, describes a model as six flat
drawings and works the voxels out from them. That is quick to draw from and it
cannot hold every shape: two bumps standing on a diagonal come out of six sides
as four. This one draws the shape directly, so nothing is lost to how many faces
it is seen from.

## Saving

A model is written as [`.cvox`](https://github.com/JelleBouma/cvox), a losslessly
compressed voxel format. The whole palette travels with it, unused swatches and
all, and a model with a few thousand voxels is a few kilobytes. There is nothing
of this editor's in the file, so any tool that reads `.cvox` reads what this one
writes.

## Getting at it

```
pnpm dev:voxel-beetle
```

## Where the decisions are written down

[`docs/adr`](./docs/adr) — why a model is a volume, why the file is a plain
`.cvox`, how it is packed, what a finger does on the canvas, what the viewport
asks for, and why nothing is published yet.
