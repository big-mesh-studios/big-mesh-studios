# A place script names a sound's volume, pitch, and loop, and stops it

The fixed `sound` vocabulary (ADR 0053) played a name once, at one volume, at
one pitch, and could not be turned off. A script could not lay a looping
ambience under a room, hush a sound, or stop one when its cause went away. This
decision adds an id, a volume, a pitch, and a loop to the `sound` effect, and a
`sound-stop` effect that reaches a loop by the id its author gave.

```ts
// effects.ts
| { tag: "sound"; payload: { player; name; id?; volume?; pitch?; loop? } }
| { tag: "sound-stop"; payload: { player; id } }
```

## The vocabulary stays fixed; only how a name plays is new

Name, volume, pitch, and loop are all bounded and validated at the effect
boundary, and the name is still one of the world's own keys — a place still
cannot point the audio layer at a file. `id` is required exactly when `loop` is
true, so every loop has something to stop it by, and a one-shot may carry an id
too, though stopping one is a no-op.

## The controller plays and stops, the world routes

`SoundController.playSfx` takes the extra options, starts a loop under its id,
and `stopSfx` stops it; its existing one-shot path now applies the named volume
and pitch and keeps the small random pitch drift that stops a horde of one
growl from chorusing. The host's `onSound` callback gains the options, and a
new `onSoundStop` reaches the same controller, so the effect path stays the
voice-tier chain it already was: a broadcast name plays on every local peer,
and a name aimed at one player is left for a later peer resolution.

## Considered options

- **Per-place audio files, with real volume and pitch control.** Still
  rejected, for the reasons ADR 0053 gave: untrusted bytes should not name a
  URL, and a fixed vocabulary is what keeps the controller small.
- **A general `AudioEmitter`/`AudioPlayer` graph.** Rejected for now: the
  world's audio is a handful of recordings plus weather, and a node graph for a
  place to build would be the general audio system the codebase says to avoid.
- **Positional (3D) playback.** Deferred: it needs a listener posed against
  each playing source, which belongs with a later audio change rather than with
  naming volume and pitch.

## Consequences

- `sound` gains four optional fields and `sound-stop` joins the vocabulary.
- `SoundController` tracks looping place-script sounds by id and releases them
  on stop and on dispose.
- A script can lay ambience, hush and sharpen an effect, and stop a loop when
  its cause is over, without a new audio system.
