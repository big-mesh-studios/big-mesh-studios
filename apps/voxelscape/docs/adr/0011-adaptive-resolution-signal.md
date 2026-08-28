# Judge render resolution by met refresh deadlines, not by a millisecond budget

`AdaptiveResolution` used to compare an exponential moving average of the
frame gap against a fixed 16.7-millisecond budget: above 1.25 times it, step
the scale down; below 0.6 times it, step back up. The gap it averaged is the
time between `requestAnimationFrame` callbacks, which is not the render cost —
`requestAnimationFrame` delivers frames on the display's refresh boundaries,
so on a 60 hertz display a frame costing 2 milliseconds and one costing 15 are
both reported 16.7 milliseconds apart.

That made the two directions asymmetric in a way that only ever lost
resolution. Stepping down needed a gap above 20.9 milliseconds, which any
missed refresh boundary supplies, because the next gap up from 16.7 is 33.3.
Stepping up needed the average below 10 milliseconds, which a 60 hertz display
cannot report at all. Once the scale went down it stayed down for the rest of
the session, and every return from a hidden page pushed it down another step:
`requestAnimationFrame` doesn't fire while the page is hidden, so the first
frame back reported the whole absence as one frame's gap, which took about 45
frames to decay back under the threshold — past the 30 sustained slow frames a
step down required.

We now judge each frame as having met or missed a 60-per-second deadline,
rather than measuring how long it took, and treat both directions as claims
that the following frames have to bear out:

- **Stepping down** is a measurement: a frame gap over 1.5 times the target
  interval missed its boundary, and a run of them that misses more often than
  it hits steps the scale down.
- **Stepping up** is a probe. A met deadline says a frame fit inside the
  interval but never how much room it had, so the only way to learn whether a
  higher scale fits is to try it and watch. A probe that goes on to miss
  deadlines is refuted, the scale returns to where it came from, and each
  successive refutation doubles the wait before trying that scale again — a
  device that cannot hold the higher scale stops pulsing between the two
  within a few attempts.

  Both counts leak rather than reset. Requiring an unbroken run of met
  deadlines to step up sounds stricter and is in fact useless here: this world
  streams terrain in while the player walks, and a mesh handed over or a
  garbage collection drops a frame often enough that a run of a hundred and
  twenty clean ones essentially never happens. A scaler asking for one never
  steps up at all, which is the bug it was built to fix. A missed deadline
  instead cancels four met ones, so a scale that mostly holds still climbs
  while a scale missing a fifth of its frames does not.

- **A descent** is also a claim, checked against a different failure: frames
  miss deadlines for reasons resolution has no bearing on — a mesh rebuild on
  the main thread, a browser throttling the loop on battery. Once a descent
  has given up half the scale, and so three quarters of the pixels, and the
  mean frame gap is no better for it, fill rate is not what the frames are
  waiting on. The scale goes back to where the descent started, with the same
  doubling wait before descending again.

Frame gaps longer than a second are discarded rather than judged. A hidden page
is handled separately and more bluntly: it still receives frames, roughly one a
second rather than sixty, and every one of them misses its deadline by any
measure taken here, so `createRenderLoop` feeds the scaler nothing at all while
`document.hidden` is set. On the way back it also forgets its previous
timestamp, so the first frame is measured against nothing, and holds the scale
for a second while the browser reinstates the textures and programs it
reclaimed.

The scaler is also now constructed by `createVoxelscape` and passed into
`createRenderLoop`, rather than created inside it. `mount` can run again after
an unmount, and a scale that took seconds of measurement to find is worth more
than a fresh controller's default. It is what `/resolution` reaches to report
the current scale, pin one, or hand control back.

## Considered options

- **Keep the millisecond budget and only fix the stall.** Rejected — resetting
  the timestamp on `visibilitychange` stops the ratchet from advancing, but the
  scale still cannot climb back on a 60 hertz display, so any scale already
  lost stays lost.
- **Feed the scaler `GpuTimer` instead of the frame gap.** This measures real
  render cost and would make stepping up a calculation rather than a probe. It
  depends on `EXT_disjoint_timer_query_webgl2`, which WebKit does not ship, so
  Safari — a MacBook's default browser — would need the probe path regardless,
  and the timer's readback is why `frame()` exists to feed gaps that must not
  be judged. Worth revisiting as a refinement on top of the probe, not instead
  of it.
- **Estimate the display's refresh interval from the smallest recent gap and
  target that**, rather than fixing the target at 60 per second. Rejected: a
  device that misses every single frame never reports a gap of one interval,
  so the estimate reads as a slow display and the scaler concludes it is
  keeping up — precisely the device that most needs to step down. The estimate
  also chases 120 hertz on a display that offers it, trading resolution for a
  frame rate above 60 that the scaler has no reason to want.
- **Make the whole thing opt-in.** Rejected — it leaves a scaler that only ever
  loses resolution behind a flag, and the choice it puts to the player is one
  they have no way to make. `/resolution` covers the case where they want to
  overrule it anyway.

## Consequences

- A device that genuinely cannot hold full resolution reaches its working
  scale in about the same time as before, but now pulses briefly to the next
  scale up a handful of times on the way to leaving it alone — the cost of
  probing being the only way to discover headroom.
- A device whose load drops — the player leaves a dense area, a mesh rebuild
  finishes — climbs back to full resolution over roughly fifteen seconds,
  which it previously never did at all.
- Frames slowed by something other than pixels no longer cost resolution. The
  scaler still tries lowering it first, because it cannot tell the two apart
  in advance, but it gives the resolution back within a few hundred frames.
- `adaptive.test.ts` drives the scaler through a model that quantises frame
  cost to refresh boundaries. The previous model fed back raw cost, which is
  what let a scaler that could never step up on real hardware pass a test
  asserting that it recovers.
