# Fullscreen also locks the screen sideways

`/fullscreen` entered the document's fullscreen but left the device's
orientation alone, so a phone held upright showed the landscape-shaped world
turned on its side with the touch controls crowded into a corner.

## Landscape by default

Entering fullscreen now asks the screen orientation to lock to `landscape`
after `requestFullscreen` resolves, because the Screen Orientation API only
honours a lock while the document is fullscreen. A second token picks the other
way — `/fullscreen true portrait` — and `landscape` is what an omitted token
means. Leaving fullscreen calls `unlock`.

`ScreenOrientation.lock` is absent from the TypeScript DOM declarations, which
only carry `unlock`, `angle`, `type` and `onchange`, so the method is reached
through a local `Orientable` shape and feature-detected before it is called.
Where it is absent or the browser rejects it, the command still reports the
fullscreen and says the lock was unavailable.

## Considered options

- **Lock without entering fullscreen.** Rejected: browsers honour a lock only
  while fullscreen, so the request would be refused rather than applied.
- **A separate `/orient` command.** Rejected: the two are always wanted
  together, and one command keeps the unlock paired with the exit.

## Consequences

- The command's line says whether the orientation locked, so a player on a
  device that refused it can tell the fullscreen still took.
- The exit path unlocks the orientation before leaving fullscreen, so a later
  fullscreen does not inherit a stale lock.
