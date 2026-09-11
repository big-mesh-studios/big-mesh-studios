# The console and the place editor become one panel that grows

ADR 0028 named "the two ways in" for the world's scripting: the panel
(`/place:editor`'s CodeMirror modal) and the console (the `>_` terminal).
They sat unrelated — opening the panel left the console unreachable, so a
command could not be run while a script was open, and the two never
visually connected even though the panel's own Run/Publish are one console
command away. This decision makes them one element: `Console` renders a
single panel, anchored under the `>_` button, that holds just the terminal
until `/place:editor` is run from it, at which point the same panel grows to
also hold `PlaceEditorContent` (the manifest fields, tabs, and CodeMirror),
with the terminal staying docked at its bottom throughout. Closing the
editor shrinks the same panel back down to the bare terminal.

## One element, not two — the growth is a CSS `transition`, not a morph

The panel element itself is never unmounted or replaced: `Console` renders
it once, and `editorOpen()` (from `voxelscape.placeEditor.open()`) only ever
toggles a `.editorOpen` class on it and conditionally mounts
`PlaceEditorContent` inside. `.panel` and `.editorOpen` in
`Console.module.css` differ only in `width`/`height` (and, on a coarse
pointer, `inset`), all listed in an ordinary CSS `transition` — the browser
interpolates the box's size every frame, no different from a button that
grows on hover.

A first version tried the opposite: keep the popover and the editor as two
separately-mounted components (a `Show`-gated `PlaceEditor` swapped in for
a `Show`-gated `Console`) and use the View Transitions API
(`document.startViewTransition`) to animate the DOM snapshot from one into
the other. It worked in principle but fought the browser's machinery at
every step: the transition needed the "new" element to already be a real,
visible, differently-shaped thing to snapshot, which meant faking the
popover back open on close just to give the API something to morph into;
rapid or overlapping opens left ghosted, doubled frames since a new
transition could start before the previous one's snapshots had cleared;
and the visual result was two different elements crossfading inside an
outer box, not one element persisting. None of that is a problem for a
single element whose own size changes — there's no snapshot, no ghosting,
and nothing to fake, because it's the same node the whole time and its
focus, scroll position, and command history just stay where they were.

## The panel is CSS-anchored to the `>_` button, in both states

`.panel` keeps the anchor positioning the terminal always had —
`position-anchor: --console` on the panel, `anchor-name: --console` on the
button, `top: anchor(bottom)` / `right: anchor(inside)` — in both the small
and the grown state. Only `width`/`height` (and, under
`@media (any-pointer: coarse)`, an `inset: 0` override for the editor's
fullscreen state) change; the anchored edges stay computed the same way
throughout, so the panel just grows downward from the button rather than
jumping from one positioning scheme (anchored to a button) to another
(centered in the viewport), which is what the panel did before this change
and is part of why swapping elements read as a cut.

## The terminal's own markup and font are scoped to one wrapper

`TerminalBody` — the header naming the terminal, its collapsible scrollback,
and its always-present input row — is unchanged code, but it's now wrapped
in one `.terminal` div inside `.panel`, carrying `font: 12px monospace` and
the terminal's own text colour. That's deliberate, not incidental: `.panel`
itself carries no font, because it's shared with `PlaceEditorContent`'s
fields and buttons, which want the app's ordinary font, not the terminal's.
`.terminal` is `flex: 1` on its own (filling the small panel when there's
nothing else in it) and `flex: 0 0 auto` once `.editorOpen` is also on the
panel (shrinking to its own natural height so `PlaceEditorContent`'s
`.content`, the other flex child, is the one that claims the grown space).
`.editorOpen .output` additionally caps the scrollback's own height in that
state, so a long conversation doesn't push the input row out of view.

## The terminal's input always renders; only its scrollback collapses

Both states keep the input row always rendered — the request this addressed
was specifically to keep running commands possible while writing a script —
and only the `ConsoleOutput` scrollback above it hides behind the header's
expand/collapse chevron, defaulting to closed on a coarse pointer (where
`PlaceEditor.module.css`'s `.content` needs the room) and open otherwise.

## `Console` owns dismissal for both states; `PlaceEditorContent` owns none

Because the panel is one element, one place owns closing it: `Console`'s
`keydown` listener closes the editor on Escape (deferring to
`isEditableTarget` so typing in CodeMirror or a manifest field doesn't
close it out from under the cursor) or, if only the bare terminal is open,
closes that instead; a `pointerdown` outside the panel closes the bare
terminal the way a native popover's light-dismiss would; and a scrim behind
the panel, shown only while the editor is open, closes the editor on an
outside click. `PlaceEditorContent` no longer has an Escape handler or an
overlay of its own — it is purely content, laid out to fill whatever space
`Console` gives it above the terminal.

## Opening the panel checks whose place is currently loaded

Merging the two surfaces also made it easy to open the panel from wherever
you happen to be standing, including a place someone else published — and
Run hands a draft script to the same host driving the simulation everyone
else in a multiplayer place is currently seeing, so that's not a safe thing
to allow. `voxelscape.placeEditor.canEdit` (`create-voxelscape.ts`) is true
when the currently loaded place isn't a real published one at all (the
site's own fallback world, or a built-in demo — both `parsePlaceAtUri`-null)
or when it is one this signed-in account itself published;
`togglePlaceEditor` refuses to open the panel otherwise, with a line
explaining why in the terminal, the same way any other refused command
reports itself. Forking a place and granting another handle editing rights
are their own later features, not exceptions bolted onto this check now.

## Considered options

- **Keep the View Transitions approach and fix its rough edges one at a
  time.** Tried across several iterations — nesting a second
  `view-transition-name` for the terminal inside the panel's own name,
  forcing the popover back open on close, forcing focus not to be stolen on
  mount — before concluding the rough edges were the design, not bugs in
  it: two separately-mounted elements animated by browser snapshot, when
  one persistent element animated by CSS does the same job with none of the
  failure modes.
- **Give the panel a fixed viewport position instead of anchoring it to the
  button.** Tried briefly (bottom-right, independent of the button)
  because it sidestepped some anchor-positioning arithmetic; reverted
  because it broke the terminal's established place on screen for no
  reason once the anchor approach turned out to work fine at both sizes.
- **Share one `font`/color declaration across the whole panel.** Rejected:
  it's the shared element between two things — the terminal and the editor
  — that want different fonts, so the font has to live on a wrapper scoped
  to the part that wants it, not the shared root.

## Consequences

- `Console` is no longer just the terminal — it also renders
  `PlaceEditorContent` (from `PlaceEditor.tsx`) once the place editor is
  open, and owns the escape/outside-click dismissal that used to be split
  between the two components.
- `PlaceEditor.tsx` exports `PlaceEditorContent`, not a self-contained
  modal: no overlay, no scrim, no Escape handling, no `ConsoleDock` — just
  the draft state, manifest fields, tabs, and lazy CodeMirror panes, filling
  whatever space it's given.
- `PlaceEditorContent` itself is no longer lazy-loaded at the `App.tsx`
  level (it's cheap — no CodeMirror in it directly); only its CodeMirror
  tabs, split into `PlaceEditorPanes.tsx`, stay behind their own `lazy()` +
  `<Loading>` boundary, downloaded the first time a project actually has a
  script to show.
- `create-voxelscape.ts`'s `placeEditor.open`/`setOpen` are a plain Solid
  signal again — no view transition, no `flush()` — since there's no longer
  a DOM swap for one to wrap.
