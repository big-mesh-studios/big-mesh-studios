# Spacescape cameras, photos and screens plan

A phased plan for first-class **virtual cameras**, **photos** and **viewable screens** in the
places API, so a place can do what a Roblox developer does with `Camera` +
`ViewportFrame` + `CaptureService` — and one thing Roblox cannot: sample a rendered frame
back into the world.

File references are to `apps/spacescape/src/` unless stated otherwise, and to
`~/GitHub/rmsl/src/` for the renderer phases.

## Decisions (agreed)

- **Both `lookAt` and `watchCamera` stay.** `lookAt` points the player's own camera at a spot;
  `watchCamera` takes the player's camera over entirely and puts it at a virtual camera's
  position. They are two claims on one camera, so each releases the other and `clearCamera`
  releases either.
- **`takePhoto` is not an event.** It returns a photo handle synchronously (the host has
  allocated it) and the pixels land a frame or two later. Nothing has to react to completion.
- **A photo is of the world, not of the screen.** It comes from a fresh world pass, so it never
  contains the crosshair, a dialog or the HUD. Same call, same picture, whatever the player had
  open.
- **Feeds are derived, never replicated.** Two peers running the same script render their own
  copy of a screen from the same camera definition; no pixels cross the wire.
- **Feed resolution is not the script's to choose.** It is derived from the surface the feed is
  drawn on and clamped to a bucket.
- **The rmsl change is a new published version.** `~/GitHub/rmsl` is ours and 1.16.1 is the
  version pinned here; this plan publishes 1.17.0.

---

## Phase 0 — rmsl: a render target you can sample

**The problem.** `WebGLRenderTarget` exposes `width` and `height` and nothing else. Its colour
texture is created inside `WebGLRenderer.makeRenderTarget` and kept in the private
`renderTargets` map. So a target can be drawn into and read back on the CPU
(`readPixels` / `readPixelsAsync`) and **cannot be drawn from**.

**The change.** A target owns a `Texture` that names its colour attachment, and `bindTexture`
binds that GL texture instead of uploading an image.

`~/GitHub/rmsl/src/scene/textures/RenderTargetTexture.ts` (new):

```ts
/** A texture whose GPU image is a render target's colour attachment, not an upload. */
export class RenderTargetTexture extends Texture {
  readonly isRenderTargetTexture = true;
  constructor(readonly target: WebGLRenderTarget) {
    super(null);
  }
}
```

`WebGLRenderTarget` gains `readonly texture: RenderTargetTexture` created in its constructor.
It takes no `bitmap` and never raises `version` — its contents change because a pass drew into
them, not because an image arrived.

`WebGLRenderer.bindTexture` gains a branch **before** the upload path:

```ts
if ((texture as { isRenderTargetTexture?: boolean }).isRenderTargetTexture) {
  const entry = this.renderTargetEntries(
    (texture as RenderTargetTexture).target,
  );
  gl.bindTexture(target, entry.color);
  return unit;
}
```

`renderTargetEntries` is `renderTargetFramebuffer` split so the entry (not just the
framebuffer) is reachable. Resizing must keep the GL texture object rather than replacing it,
or every screen in the world holds a dead handle — so `makeRenderTarget` keeps the existing
`color` and calls `texImage2D` again at the new size when only the size changed.

`WebGPURenderer` gets the same treatment, because an API that draws on one backend and reads
black on the other is worse than no API: `renderTargetTextures` adds `TEXTURE_BINDING` to the
colour texture's usage, `ensureGpuTexture` short-circuits to the target's colour texture, and
`onTextureDispose` refuses to destroy one it does not own.

**The one hazard.** Sampling a texture that is the currently bound framebuffer is undefined.
It cannot happen through this API if passes are ordered (draw every feed, then draw the world),
but a screen that is _inside_ the view of the camera feeding it is a feedback loop, not an
error — so the engine hides such a screen for that pass. That guard is Phase 3's, not rmsl's.

**Tests.** `~/GitHub/rmsl` has renderer tests against a headless GL harness; they assert that a
textured quad drawn into a target and then sampled by a second pass reads the expected colours,
and that resizing a target keeps the same `Texture`.

---

## Phase 1 — Cameras and a full-screen view

No render-to-texture at all. This alone gives the security-camera feel.

**Effects** (`places/effects.ts`): `camera-add`, `camera-move`, `camera-remove`,
`camera-watch`. The existing `camera-look` and `camera-clear` stay.

**Host** (`places/host.ts`): a `HostCamera` table beside the lights, in the same shape and for
the same reason — a camera is data, and what the host can own it owns (ADR 0019).

```ts
interface HostCamera {
  readonly id: string;
  readonly at: Vec3;
  readonly target: Vec3;
  readonly fov: number | undefined;
}
get cameraList(): readonly HostCamera[];
```

**Guest** (`places/guest/place-api.ts`):

```ts
createCamera({ id, at, target, fov? }): void
moveCamera(id, { at?, target?, fov? }): void
removeCamera(id): void
watchCamera(id): void   // clearCamera() returns to the player
```

**Application.** `engine/game.ts` already has `lookAt`/`clearCamera` overriding the camera after
`placeCamera`. `watchCamera` is a second override with the same release, so `Game` grows one
field (`cameraView: HostCamera | undefined`) and one branch in the camera placement it already
does. `clearCameraLook` clears both, so `clearCamera()` is the single way back to the player's
own eye.

**Limits.** `MAX_CAMERAS = 32`, `MAX_CAMERA_FOV` bounds.

**Animal hospital, after this phase:** using `prop-hospital-camera` calls `watchCamera`.

---

## Phase 2 — Photos

**Effect** `photo-take`, a **local** effect like `narrate` — it is a fact about this player's
machine, not the world, so it never enters the event log and is never replicated.

```ts
const shot = takePhoto({ id, camera?, width?, height? });  // → { id, width, height }
```

Omitted `camera` means the player's own view, rendered into a throwaway target rather than read
off the canvas, which is what keeps the HUD out of the picture.

**Application.** A photo request is a job on a queue drained by the frame loop, one per frame:

1. size a target (clamped to `MAX_PHOTO_PIXELS` and the renderer's `MAX_TEXTURE_SIZE`)
2. `renderer.render(scene, camera, target)` — lights swapped to the photo camera's, as the feed
   pass will do in Phase 3
3. `readPixelsAsync(target)` — no pipeline stall
4. flip rows bottom-up into an `ImageData`, `putImageData` onto a per-photo `OffscreenCanvas`,
   and hand the canvas to a `Texture` (a canvas is a `TexImageSource`)

The canvas is the photo. There is no PNG encode unless the player saves it (Phase 5), which
keeps a photo cheap to take and cheap to display.

**Limits.** `MAX_PHOTOS = 16`, `MAX_PHOTO_PIXELS = 1920 × 1080`, `MIN/MAX_PHOTO_SIZE`.

**No `HostEffects` growth for the render** — `takePhoto` returns immediately from the host and
the app owns the queue. A photo id that has no pixels yet is simply black.

---

## Phase 3 — World screens

**Effects** `screen-add`, `screen-move`, `screen-remove`.

```ts
createScreen({
  id,
  source: { camera } | { photo },
  at,
  yaw,
  width,
  height,
});
```

**Application.** Screens are reconciled against `host.screenList` into a `Map<id, ScreenMesh>`,
exactly as `figure-set` reconciles figures. Each live screen gets a `WebGLRenderTarget` at a
resolution derived from its on-screen size, bucketed to 64/128/256/512 and capped by
`MAX_FEED_PIXELS`, never chosen by the script.

The frame loop, before the main pass:

1. sort live feeds by distance from the player, truncate to `MAX_LIVE_FEEDS`
2. for each: swap `material.lights.lights` to `host.visibleLights(feed.camera.position, 8)`,
   hide any screen whose source camera is this one, `renderer.render(scene, camera, target)`,
   restore in a `finally`
3. main pass draws each screen as a `MeshBasicMaterial` quad with `map: target.texture`

Screen geometry follows `level-editor/view/image-plane.ts`: one `PlaneGeometry`, oriented by
`quatFromBasis`. There is **no `emissive` field**: rmsl has no textured lit material, so
`MeshBasicMaterial` is the only thing that can show a feed at all, and a flag nothing reads would
be a lie in the API.

**Limits.** `MAX_SCREENS = 64`, `MAX_LIVE_FEEDS = 2`, `MAX_SCREEN_SIZE`, `MAX_FEED_PIXELS`.

---

## Phase 4 — HUD images

**Effects** `image-show`, `image-hide`, `source` shared with screens.

```ts
showImage({ id, source, corner | { x, y }, width, height }): void
hideImage(id): void
```

Drawn by `places/ui/PlaceOverlay.tsx` as a DOM `<img>`-less canvas element — the feed's
`OffscreenCanvas` for a photo, or a `Canvas2D` copy of a feed's pixels. **HUD live feeds need a
readback**, because the DOM cannot sample a GL texture; they are therefore capped at a low rate
(≈15 Hz) and a small size, and a HUD feed of a camera is the one case where Phase 3's GPU
sampling cannot be reused. A photo in the HUD costs nothing — it is already a canvas.

If that proves too costly, the alternative is a second no-clear render pass over the canvas,
which needs an rmsl change (`render` always clears). Deferred until measured.

---

## Phase 5 — Saving a photo

`promptSavePhoto(id)` encodes the canvases to a PNG on demand and offers it as a download. The
places API never sees bytes; the guest only ever holds an opaque id.

---

## Order and gates

| Phase | Gate                                    |
| ----- | --------------------------------------- |
| 0     | rmsl 1.17.0 published and bumped here   |
| 1     | none — pure engine work                 |
| 2     | none                                    |
| 3     | Phase 0                                 |
| 4     | none (photos) / readback budget (feeds) |
| 5     | Phase 2                                 |

## What is deliberately not here

- **Video capture.** Roblox caps it at 30 s; nothing in this engine records, and a place that
  wants a recording is asking for an encoder we do not have.
- **Sending a photo to another peer.** Photos are local. A shared photo is a shared _camera_ and
  a shared _screen_, which is already free.
- **Recording into the level document.** A photo is not geometry and never enters the fold.

---

## As built

What actually landed, and where it differs from the plan above. Everything here is in
`src/render/feeds.ts`, `src/render/photos.ts` and the `app.tsx` frame loop.

### Files

| File                         | Holds                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `places/limits.ts`           | `MAX_CAMERAS`, `MIN/MAX_CAMERA_FOV`, `MAX_SCREENS`, `MIN/MAX_SCREEN_SIZE`, `MAX_PHOTOS`, `MIN/MAX_PHOTO_SIZE`, `MAX_PHOTO_PIXELS`, `MAX_HUD_IMAGES`, `MIN/MAX_HUD_IMAGE` |
| `places/fields.ts`           | the `image-source` field kind, so `{ camera }` and `{ photo }` are validated as one field                                                                                |
| `places/effects.ts`          | `camera-add`/`-move`/`-remove`/`-watch`, `photo-take`/`-remove`, `screen-add`/`-move`/`-remove`, `image-show`/`-hide`                                                    |
| `places/host.ts`             | the camera, photo, screen and HUD-image tables, and the `camera-remove` cascade                                                                                          |
| `places/guest/place-api.ts`  | `createCamera`, `moveCamera`, `removeCamera`, `watchCamera`, `takePhoto`, `removePhoto`, `createScreen`, `moveScreen`, `removeScreen`, `showImage`, `hideImage`          |
| `engine/game.ts`             | `cameraView` and `watchCamera`, released by `clearCameraLook`                                                                                                            |
| `render/feeds.ts`            | `createScreenLayer`, `createHudFeedLayer`, `screenQuaternion`, `aimCamera`, `MAX_LIVE_FEEDS`                                                                             |
| `render/photos.ts`           | `createPhotoLayer`: one target, a queue of one job a frame, a canvas per photo                                                                                           |
| `places/ui/PlaceOverlay.tsx` | a `<canvas>` per HUD image, redrawn on a revision counter                                                                                                                |

### Deviations from the plan

- **`emissive` is gone**, from the effects, the host and the guest API. rmsl 1.17's only textured
  material is `MeshBasicMaterial`, so every screen is unlit whether or not it says so. An option
  that is accepted and ignored is worse than one that does not exist.
- **Render targets are pooled, not freed.** rmsl 1.17 has no public way to release a target, and
  each one holds a framebuffer, a colour texture and a depth renderbuffer. `createScreenLayer` and
  `createHudFeedLayer` each keep a pool and push a target back when its screen or image goes away,
  so the number of targets ever allocated is the high-water mark of simultaneous feeds rather than
  the number ever created. Photos need no pool: there is exactly one target for all of them.
- **A photo has one target, resized per job.** A target is a surface, photos are captured one at a
  time, and a target per photo would be a framebuffer held for as long as the place keeps the
  picture. The layer is busy from the moment a job is handed out until its readback resolves, so
  the next job cannot overwrite pixels that are still being read.
- **A screen's up is the world's up where it stands.** `ScreenView` carries `upAt`, because up is a
  function of position (ADR 0037) and a monitor on a sphere must not tip towards the north pole.
  `screenQuaternion` builds the quad's basis from that up and the yaw, negating `onbFromDirection`'s
  second tangent so `yaw = 0` faces `+Z` — the same convention as `lookAt` and player heading.
- **Buckets are chosen from on-screen size, not distance.** `chooseBucket` projects the screen's
  longest side through the player's vertical field of view and the drawing buffer's height, then
  rounds up to the next of 64/128/256/512. A screen's aspect ratio is preserved, so a wide monitor
  at the top bucket is 512 × something rather than 512². `MAX_FEED_PIXELS` is therefore a bound on
  the square case.
- **A resized target counts as undrawn.** `sync` sets `drawn = false` and shows `BLACK` for the
  frame the bucket changes, because resizing re-specifies the attachment.
- **`lookAt` and `watchCamera` release each other.** One camera, one claim: `camera-look`
  clears the host's `watched`, `camera-watch` clears the engine's look target, and
  `clearCamera` clears both. Without that, the answer would depend on which was written last.
- **Removing a camera or a photo removes what was showing it.** A screen or HUD image whose
  source is gone has no pixels and no way to get any, so it would be a black rectangle the place
  could no longer explain. The cascade is the one outcome a script can predict.
- **HUD live feeds are read back at `HUD_FEED_INTERVAL_MS = 66`** (about 15 Hz), one target per
  image at the image's own size, with an in-flight set so a copy is never queued over another. A
  photo in the HUD is a `drawImage` from the photo's canvas and costs nothing.
- **The overlay never holds pixels.** It is given the list, a revision counter and a `drawImage`
  callback; the application owns both canvases. `revision` is what makes a live feed redraw, since
  its id, size and corner do not change when its pixels do.
- **The self-reference guard is per screen, per pass.** `hideShowing(cameraId, true)` hides every
  screen whose source is the camera being drawn, around the pass and in a `finally`. A HUD feed
  passes `false`: nothing on screen samples the HUD target.
- **The light swap is four assignments in a `finally`.** `drawFeed` saves and restores the point
  lights on the terrain material, `GAME_WATER.material` and `FIGURE_TINT.material`, so a feed in a
  lit room is lit by that room's lamps and the main pass still sees the player's.

### Still open

- **A feed only shows what the player's streaming has loaded.** Chunks are meshed around the
  player, so a camera in a room the player has walked away from sees the empty world it has
  streamed out. A security-camera wall in one building is fine; a camera on the other side of a
  planet is a camera pointed at nothing, and the fix is streaming around feeds rather than
  anything in `feeds.ts`.
- **Phase 5 is not built.** There is no `promptSavePhoto`; a photo exists as a canvas in
  `render/photos.ts` and nothing encodes it.
- **The animal hospital has not been ported** to these APIs yet, and its
  `spacescape.d.ts` is still the snapshot taken at commit `9c2c627`.

### rmsl 1.17.0 is published

The catalog in `pnpm-workspace.yaml` now pins `"@random-mesh/rmsl": "1.17.0"`, the version is
listed in `minimumReleaseAgeExclude`, and `pnpm install` replaced the local `dist` shim that
this work was developed against. `tsc --noEmit`, the production build and the full test suite
were re-run against the published package; nothing was needed beyond the version bump, because
the shim was a copy of the same `dist`.
