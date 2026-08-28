# big-mesh-studios

Two applications that share a voxel model format: an editor somebody draws in,
and a world that wears what they drew, reachable from
[one front page](https://big-mesh-studios.github.io/big-mesh-studios/).

|                                        |                                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`apps/rm-stacker`](./apps/rm-stacker) | The editor. A voxel model is drawn by painting the six faces of a box, saved as a zip, and published to the artist's own atproto account. [Live site](https://big-mesh-studios.github.io/big-mesh-studios/rm-stacker/)                     |
| [`apps/homepage`](./apps/homepage)     | The front page. Names the other two and links to each; it is what the site root serves. [Live site](https://big-mesh-studios.github.io/big-mesh-studios/)                                                                                  |
| [`apps/voxelscape`](./apps/voxelscape) | The world. An infinite scrolling grid of procedurally generated terrain, whose monsters are dressed in a model read back from any account that published one. [Live site](https://big-mesh-studios.github.io/big-mesh-studios/voxelscape/) |

The world depends on the editor: it reads the editor's saved format and names
the published record's collection from the editor's own vocabulary, so the two
agree on both by importing rather than by copying.

## Working on either one

```sh
pnpm install
pnpm dev:rm-stacker      # the editor, on its own development server
pnpm dev:voxelscape      # the world, on its own development server
```

Both applications read the packages under `packages/` straight from source
across the workspace, so there is no library to build first and an edit to a
package is picked up the same way an edit inside an application is.

Run from the repository root, `pnpm check-types`, `pnpm test`, and
`pnpm format:check` each cover both applications.

## History

The two applications were separate repositories until they were merged here.
Both histories arrived whole, with every path rewritten to the place the file
sits today, so a log or a blame over any file reads back to its first commit
without a `--follow`. Branches that were open at the time kept their names
under an `rm-stacker/` or `voxelscape/` prefix, and the world's release tags
under a `voxelscape/` one.

## Reading further

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — the standards a comment or JSDoc
  block here has to meet, and the checks that pass before a change is done.
- [`CLAUDE.md`](./CLAUDE.md) — the same standards in short, plus what Solid 2
  changed from Solid 1.
- [`apps/voxelscape/CONTEXT.md`](./apps/voxelscape/CONTEXT.md) — the world's
  domain language.
- [`apps/voxelscape/docs/adr/`](./apps/voxelscape/docs/adr) — one file per
  non-obvious architectural decision in the world.

## License

[MIT](./LICENSE).
