# A model opts into being found by backlinking to registries it chooses

ADR 0015 settled how a model is _read_: given an account, `ModelLibrary`
lists, finds, and opens whatever it has published, no session required. The
place editor's models pane, newly split out of the manifest fields into its
own pane, reads exactly that way — an account's own models, or any other
account's by typing its handle. Both still need a starting point: a handle
somebody already knows. Nothing answers "what models exist that I haven't
been pointed at yet," and nothing in `ModelRecord` was ever meant to answer
it — `name`, `dimensions`, `thumbnail` describe what a model _is_, not
whether the person who drew it wants it easy to stumble on.

This decision adds that as its own, separate thing: a **registry**, a small
record anyone can publish, and a `registries` field on `ModelRecord` — an
array of the registries a model's own account has chosen to point it at.
Browsing a registry means asking
[Constellation](https://constellation.microcosm.blue/), the atproto backlink
index already read for place edits (`atproto/constellation.ts`), for every
model that backlinks to it.

## The link means "list me here," not "I am about this"

A model backlinking to a registry isn't describing itself, the way its name
or its dimensions do — it's a publisher's own decision to be found through
that particular listing, the same kind of choice as submitting a page to a
directory. That's what makes the link an honest one to model as a real
atproto reference rather than something invented purely to give an indexer a
target: the registry is genuinely what the link is _about_.

It also means the field is opt-in the way a place's own mode already lets a
creator choose solo over multiplayer without either one being the broken
choice: a model that lists no registries isn't broken or hidden, it's simply
not part of that particular kind of browsing — the same as it already isn't
part of anyone's browsing today, before this decision.
Every existing way to find a model — knowing the account, `/monsters:model`,
the models pane's own account/handle lookup — keeps working exactly as it
does now, registries or not.

## Many registries, not one

A single registry owned by this project would make discovery something only
this project's account controls — every model that wanted to be found at all
would have to ask this one account first. Making `registries` an array
instead of a single field avoids that by construction: a registry is just
another record type anyone can publish, the same way a model is, and a model
opts into as many as its own publisher wants — an official listing, a
friend's curated collection, a collection for one genre of drawing. None of
them is privileged over another by the schema; a browsing UI simply has to
be told, or default to, which one it's showing.

## Constellation already indexes array-valued links this way

Constellation's own path syntax is documented, not assumed: from its
readme's own terms — _"Arrays are noted by `[]` and cannot contain a
specific index"_ — and shown live in its own example response for
`GET /links/all/count`:

```json
"app.bsky.graph.starterpack": {
  ".feeds[].creator.did": 1,
  ".feeds[].creator.labels[].src": 1
}
```

`.feeds[].creator.did` is exactly the shape a `registries: string[]` field
needs: an array of plain links, matched without an index. Browsing a
registry is `getBacklinks(registryUri, MODEL_COLLECTION, ".registries[]")` —
the same generic call `constellation.ts` already makes for place edits, only
pointed at a different collection and path.

## Considered options

- **One registry, owned by this project's own account.** Rejected: it turns
  "is my model discoverable at all" into a question about whether one
  specific account has chosen to include it, which is exactly the kind of
  gatekeeping a model's own publisher backlinking to whichever registries
  _they_ choose avoids.
- **Backlink from the place to the model it uses, instead.** A different,
  still-live idea from earlier in this design, kept separate rather than
  folded in here: that answers "which models are actually in use, and by how
  many places" (a popularity signal, built from a relationship that already
  has to exist for a place to load its models), not "which models want to be
  found." A model can opt into a registry long before any place uses it, and
  a model in heavy use by places never has to publish anywhere to be found
  that way.
- **Crawl the whole network for `app.bms.stacker.model` records directly**
  (via UFOs or similar). Set aside earlier in this same design conversation:
  the closest tool (UFOs) has no documented, stable API and caps its record
  endpoint at a small window of recent samples, not a complete or paginated
  listing — nothing to build a reliable "browse everything" feature against
  today.
- **No registry at all — keep discovery to "know an account."** This is
  where the models pane already stands as of this session, and it stays
  true and useful on its own; a registry adds a way to start from nothing
  rather than replacing it.

## Consequences

- `ModelRecord` (`packages/stacker/src/lexicon.ts`) gains an optional
  `registries: string[]` field — at-uris, empty or absent for a model that
  hasn't opted into any. This is the shared lexicon both programs read, so
  the field, like the rest of the record shape, belongs to rm-stacker to
  publish and voxelscape to read, not the other way around.
- A registry needs its own small record type of its own — proposed as
  `app.bms.stacker.registry`, following `app.bms.stacker.model`'s own
  naming — holding at minimum a name for what it claims to be about, so a
  browsing UI has something to show before listing what's in it.
- rm-stacker needs its own UI for choosing which registries a model
  publishes into — this decision is about the mechanism, not that UI, which
  is unbuilt.
- The place editor's models pane (`PlaceEditor.tsx`) gains a third way to
  browse alongside "mine" and "by handle": browsing a registry, backed by
  the `getBacklinks` call above. Also unbuilt — this ADR records the
  decision and the verified mechanism ahead of writing either half of it.
