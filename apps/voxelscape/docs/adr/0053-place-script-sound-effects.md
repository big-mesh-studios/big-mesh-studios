# A place script names a sound in a fixed world vocabulary the SoundController plays

"Zombies: The Mansion" is a zombies game with no sound, which is a zombies game
missing half its point: the horde that groans as it strikes, the guns that
report when they fire, the eerie that hangs before a wave pours, and the chime
that closes a cleared one. ADR 0007 deliberately kept the `SoundController`
weather-only and the codebase's language says to avoid a general `SFXPlayer` —
and nothing a place script can say today produces audio: there is no `sound`
effect in the vocabulary, and a script has no way to touch the world's audio
hardware at all. This decision adds one: a `sound` effect whose `name` must be
one of a fixed vocabulary of recordings the world itself ships, played through
the one controller that already owns the `AudioContext`, the volume, and the
unlock discipline.

```ts
// effects.ts
| { tag: "sound"; payload: { player: string; name: string } }
```

## A sound effect names a recording the world ships, never a file of its own

A place script is untrusted bytes from the network, so it can never point the
audio layer at a URL of its own making. `dispatch("sound", { player: "",
name: "zombie-growl" })` names one key in `SFX_URLS`, the map on the
`SoundController` that binds each accepted name to an `.ogg` served from
`public/audio/`. The name passes the same validation as every other effect
payload (`isShort(p.name, MAX_SOUND_NAME)` — 32 characters), and an unknown
name is a silent no-op, so a hostile or buggy place cannot smuggle a file path
or an unexpected copy through:

```ts
// sound-controller.ts
export const SFX_URLS: Record<string, string> = {
  "zombie-growl": ...,
  "wave-eerie": ...,
  "gun-pistol": ...,
  // ...
};
```

The vocabulary is the whole contract. New sounds are a new recording in
`public/audio/`, a note in its README, and one more key here — there is no
per-place audio, no scripting of synthesis parameters, no ducking or
orchestration. That is the same "not a general audio system" ADR 0007 drew:
the controller stays a small device with one job, and the fixed list is what
keeps it small.

## The world plays an effect locally; it is voice-tier and never converges

Like a toast, a `sound` effect tells the world to do something for the
listener, so it travels the same `onSound` callback chain (`ScriptHost` →
`ScriptConsole` → `create-voxelscape.ts`) and plays through the local
`SoundController`. A broadcast name (`player: ""`) means every peer plays its
own copy at the same shared-clock moment (ADR 0026's voice tier: "a message,
sound, or HUD element aimed at one player"). A peer never re-sends the effect —
the sound is a thing each peer does, not a fact they must agree on — so two
peers' copies of the eerie ring at the same instant but are each their own.
A name targeted at one named `player` is currently _not_ rendered: the world's
effect handler has no table from a player string to the speaker at this peer,
so the validation and the forward exist and the render is left to a future
peer-name resolution.

## A gun's report belongs to the player who fired it

The four mansion guns (ADR 0051) never route through the effect path: their
shots belong to the firing player alone, so the weapon block in
`create-voxelscape.ts` plays `"gun-" + heldItem.id` straight at the engine the
moment it clears cooldown. The item ids are the fixed vocabulary again:
`gun-pistol`, `gun-rifle`, `gun-shotgun`, `gun-machine`. Any place that sells
a gun with an id outside the list simply hears nothing.

## Considered options

- **Per-place audio bundled into the place zip.** Rejected: every peer would
  have to fetch and validate identical bytes, the manifest would gain a files
  section, and nothing about the mansion's five recordings needs the freedom of
  naming your own blobs. A fixed world vocabulary keeps the risk and the diff
  small.
- **Only procedural synthesis, as ADR 0007 kept it.** Rejected: a growl and a
  chime are voices; papering them over with filtered noise reads wrong, and the
  recordings are tiny (the whole set is ~50 KB).
- **A separate `SFXPlayer` class on top of the `SoundController`.** Rejected:
  that is the general audio manager the codebase says to avoid, only renamed.
  The one-shot machinery (decode on unlock, a fresh `BufferSource` per play,
  a light polyphony cap, a thumb of random pitch so a horde of one growl
  doesn't chorus) lives inside the controller that already owns the graph and
  the volume.

## Consequences

- A place script gains one validated effect, `sound`, whose name must be a key
  of the world's fixed vocabulary; anything else is dropped at the boundary.
- The mansion dispatches `zombie-growl` when a zombie strikes, `zombie-die`
  when one falls, `wave-complete` when the last of a wave dies, and
  `wave-eerie` the moment a new wave pours — with the wave's first spawn held
  back a beat (`WAVE_EERIE_LEAD_MS`) so the eerie lands first.
- The four guns play their own reports through the weapon block (ADR 0051),
  independent of the script, owned by the firing player.
- New recordings are three edits away and carry provenance in
  `public/audio/README.md`; the `sound` effect costs a place nothing it has to
  reason about, because "no sound for an unshipped name" is the default.
