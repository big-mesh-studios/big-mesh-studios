# A place script lights the world and hangs labels over it

A script could place fires and explosions and nothing quieter: no lamp, no
torch, no neon sign, and no name or score floating over a figure. A fire
kindles a voxel of ember, which is a light source built into the terrain, but
it is scenery a script cannot aim. This decision adds two things a script can
place anywhere or hang over a figure: a point light, and a camera-facing label.

```ts
// effects.ts
| { tag: "light"; payload: { id; entityId?; x?; y?; z?; color?; range?; intensity? } }
| { tag: "light-remove"; payload: { id } }
| { tag: "billboard"; payload: { id; text; entityId?; x?; y?; z?; color?; scale?; height? } }
| { tag: "billboard-remove"; payload: { id } }
```

## A light is a scene light, not a drawn object

`VoxelLights` keeps one `PointLight` per scripted light and reconciles it
against the host's list each tick, the same way the figure renderer reconciles
its meshes. The renderer reads the scene's lights when it shades, so there is
no quad to draw and no shader to write — a light is the cheapest of the
presentation effects. Colour, range (the light's `distance`), and intensity are
bounded and validated at the effect boundary, and a light that names an
`entityId` is positioned from that figure's live pose each frame, so a torch
follows whoever carries it.

## A billboard is a canvas texture on a quad that faces the camera

`VoxelBillboards` draws a label's text onto a canvas once, wraps it in a
`MeshBasicMaterial`, and puts it on a quad; each frame it moves the quad to the
label's resolved position and copies the camera's quaternion so it always faces
the viewer. A label whose text and colour have not changed keeps its canvas, so
only a label that actually updates redraws. A figure-attached label hangs a
`height` above the figure's feet and follows its pose. The canvas is a browser
object, so the renderer draws nothing where there is no `document`, which keeps
it safe to construct anywhere.

## Considered options

- **Use fires or embers for all scripted light.** Rejected: a fire changes the
  terrain (its ember voxel) and cannot be placed in mid-air, recoloured, or
  aimed; a scene light is the right primitive for illumination alone.
- **Billboard via a 3D text mesh.** Rejected: the world has no font geometry or
  text shader, and a canvas the browser already knows how to draw is far less
  work for the same readable result.
- **A general particle system in this pass.** Rejected for now: the fire and
  explosion renderers already show how a bespoke shader is built, and a
  general emitter is its own decision (and its own bound) rather than a field
  on this one.

## Consequences

- `light`/`light-remove` and `billboard`/`billboard-remove` join the
  vocabulary; the lib gains `createLight`/`createBillboard` handles.
- A script can build lamps, torches, glowing signs, name tags, and score
  labels out of the same effect path it uses for everything else.
- Particles, decals, and per-entity material remain unbuilt; they are the
  remaining presentation gap.
