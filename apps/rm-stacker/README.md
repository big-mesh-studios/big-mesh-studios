# rm-stacker

**Create voxel models by drawing the six faces of a box.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rm--stacker-6abe30?style=for-the-badge&logo=githubpages&logoColor=white)](https://big-mesh-studios.github.io/rm-stacker/)
[![GitHub](https://img.shields.io/badge/GitHub-big--mesh--studios%2Frm--stacker-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/big-mesh-studios/rm-stacker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://github.com/big-mesh-studios/rm-stacker/blob/main/LICENSE)

## What is it?

rm-stacker is a browser-based tool for making **sprite stacks** - hand-drawn voxel
art models. Instead of placing individual voxels in 3D space, you draw the six
faces of a cube (`front`, `back`, `left`, `right`, `top`, `bottom`) just like any
other pixel-art sprite. A voxel solver then reconstructs the 3D volume from those
faces, and a real-time WebGL preview renders the finished model.

Everything runs locally in your browser - there is no backend and nothing to
install. Try it in the **[live demo](https://big-mesh-studios.github.io/rm-stacker/)**.

## Features

- **Six-face pixel editor** - draw on any of the six sides of the model in a
  single pan-and-zoom canvas. Drawing on one face is mirrored to its opposing
  face automatically.
- **Draw, erase, and pan tools** - switch between pen, eraser, and idle
  (pan/zoom) modes with the toolbar.
- **DawnBringer 32 palette** - a curated 32-colour retro palette, ready to pick.
- **Live 3D preview** - the voxel volume is raymarched in WebGL2 and auto-rotates
  as you draw, so you see the result instantly.
- **Portable file format** - save your model as a `.zip` containing one PNG per
  face, and load any existing sprite stack back in.
- **Publish to your own repository** - sign in with an atproto account and put a
  model where anyone can read it, or open one somebody else has published.

## How to use

1. Open the app - either the **[live demo](https://big-mesh-studios.github.io/rm-stacker/)**
   or your local build.
2. **Pick a colour** from the DawnBringer 32 palette on the left.
3. **Draw** with the pen tool. The other face of the box updates as you paint.
4. Switch to the **eraser** to remove pixels.
5. Use the **idle** tool to pan and zoom around the canvas (scroll to zoom).
6. Watch your model take shape in the 3D preview on the right.
7. **Save** your work as a `.zip` file (`sprite-stack.zip`), or **load** an
   existing `.zip` to keep editing.

## File format

A saved sprite stack is a `.zip` archive containing one PNG per face:

```
sprite-stack.zip
├── front.png
├── back.png
├── left.png
├── right.png
├── top.png
└── bottom.png
```

Each image's opaque pixels define the silhouette of the model; the solver carves
the volume from the overlapping faces and colours the remaining voxels from the
nearest face. Missing faces load as empty.

## Publishing

Models can be published to an [atproto](https://atproto.com/) account, so that
a drawing lives somewhere anyone can read it rather than only on the machine it
was drawn on. Open the cloud panel, sign in with a handle, name the model and
publish: the same `.zip` the file menu saves is uploaded to the account's own
server, and a record in the `app.bms.stacker.model` collection points at it.

Publishing under a name that has been used before replaces what is there, so a
drawing can be touched up without anyone reading it having to follow a new
address. Reading needs no account at all - name any handle in the panel to list
and open what that artist has published.

## Using it as a library

The editor is also published as a package, so that a game or a tool can read
what it writes without reimplementing either half. Two entry points, each
standing alone - reading a record does not pull in a zip decoder, and reading a
file does not pull in a lexicon:

```sh
pnpm add @big-mesh-studios/rm-stacker
```

```ts
import { load, save } from "@big-mesh-studios/rm-stacker/format";
import { blobUrl, isModelRecord, modelBlobCid } from "@big-mesh-studios/rm-stacker/lexicon";

// A record out of somebody's repository, turned into voxels.
if (isModelRecord(value)) {
  const file = await fetch(blobUrl(service, did, modelBlobCid(value)));
  const { sides, palette } = await load(await file.blob(), fallbackPalette);
}
```

Solid and [rmsl](https://www.npmjs.com/package/@random-mesh/rmsl) are peer
dependencies rather than bundled, so an app embedding this ends up with one
copy of each rather than two.

## Tech stack

| Layer      | Tech                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| UI         | [SolidJS](https://www.solidjs.com/) + TypeScript                                                                    |
| Styling    | [Tailwind CSS](https://tailwindcss.com/) + [daisyUI](https://daisyui.com/)                                          |
| Rendering  | WebGL2 raymarching via [rmsl](https://www.npmjs.com/package/@random-mesh/rmsl)                                      |
| Build      | [Vite](https://vitejs.dev/)                                                                                         |
| Files      | [JSZip](https://stuk.github.io/jszip/) + [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) |
| Publishing | [atcute](https://github.com/mary-ext/atcute) against [atproto](https://atproto.com/)                                |

## Development

Prerequisites: [Node.js](https://nodejs.org/) with [pnpm](https://pnpm.io/).

```sh
pnpm install      # install dependencies
pnpm dev          # start the dev server
pnpm build        # build the editor for production (outputs to dist/)
pnpm build-lib    # build the published package (outputs to dist-lib/)
pnpm test         # run tests
pnpm check-types  # type-check the codebase
```

The dev server prints `http://localhost:5173/`, but signing in only works on
`http://127.0.0.1:5173/` - an OAuth redirect target may not be named
"localhost". The app moves itself across on load, so opening either address is
fine.

## License

Released under the [MIT License](https://github.com/big-mesh-studios/rm-stacker/blob/main/LICENSE).
