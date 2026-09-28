# The viewport is not locked against the reader's own pinch and zoom

`rm-stacker` asks for `maximum-scale=1.0, user-scalable=no`. This editor does
not, and asks for `viewport-fit=cover` instead.

The two canoes on the canvas set `touch-action: none` on themselves, which is
what actually stops a gesture on a canvas from also zooming the page. So the
viewport lock was redundant where it was wanted and harmful everywhere else: it
stops a reader enlarging a menu label or a list of file names, which is
Resize Text and Reflow, and the touch targets along the toolbar are small enough
to need it.

`viewport-fit=cover` is what makes `env(safe-area-inset-*)` report a size at all.
Without it the insets resolve to zero, so a toolbar laid out to keep clear of a
notch or a home indicator is laid out as though there were neither. Every use of
`env()` here carries a `0px` fallback, which is what makes the declaration valid
where a browser reports no inset at all — the world uses `env()` with no
fallback in three places, and those three rules are currently no-ops.

## Consequences

- The toolbar's margins become the larger of the interface's own margin and the
  display's safe area, on each edge separately.
- A file field is given a font size of at least sixteen pixels under a coarse
  pointer, because below that a phone zooms the page in when it takes focus and
  never zooms it back out.
- The editor's own gestures are unaffected: a finger on a canvas belongs to the
  canvas, and a pinch there zooms the drawing.
