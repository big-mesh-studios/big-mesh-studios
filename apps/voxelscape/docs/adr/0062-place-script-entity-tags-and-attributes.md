# A scripted figure carries tags and named attribute values

A place script that stands many NPCs and props has only their ids to tell them
apart. An id is a deterministic address — often a generated one like
`zombie:<cell>:<slot>` — which is the wrong key to write rules against: "every
enemy", "the boss", "whichever NPC is guarding the door" are facts about a
figure, not its address. This decision gives a scripted figure a small,
validated property bag: a list of tags and a table of named values, both
carried on the `npc`/`prop` effects and changeable afterwards with an
`entity-set` effect.

```ts
// effects.ts
| { tag: "entity-set"; payload: {
    id: string;
    tags?: string[];
    attributes?: Record<string, AttributeValue>; // string | number | boolean
  } }
```

## Tags and attributes are bounded, and nothing more general is

The payload takes a bounded list of short strings and a bounded table of
string, number, or boolean values, validated at the boundary the way every
other effect field is. There is deliberately no nested object, no function, no
instance reference: an attribute is a _value_, so it serialises the same for
every peer, and a `getEntity` snapshot can hand it back whole. The bounds
(`MAX_TAGS`, `MAX_ATTRIBUTES`, `MAX_TAG_LENGTH`, `MAX_ATTRIBUTE_STRING`) make
the read and the write cost a fixed maximum per figure.

A query reads them back by tag (`getEntitiesWithTag`) and in a snapshot
(`EntitySnapshot.tags`/`.attributes`), so CollectionService-style grouping
falls out of the read surface this ADR's sibling added (ADR 0061) rather than
needing a separate registry.

## The handle is the authoring surface; the effect is the wire form

`createNpc`/`createProp` take `tags`/`attributes` options, and the returned
handle gains `addTag`/`removeTag`/`setAttribute`/`getAttribute`. Each mutation
dispatches the whole current set as an `entity-set`, so the host replaces the
figure's bag with the handle's — the handle is the caller's one source of truth
for a figure it placed. `entity-set` is also the hand-written effect a script
can send without a handle, and it names tags, attributes, or both.

## Considered options

- **An attribute value of any JSON shape.** Rejected: a nested value makes one
  attribute's cost unbounded and its determinism depend on key order, which is
  exactly the class of innocent divergence ADR 0026 warns about.
- **Store attributes on a separate per-place key-value service.** Rejected:
  attributes describe a figure and should die with it; a separate service
  leaves orphaned state behind every removed NPC and needs its own cleanup.
- **Infer grouping from an id prefix.** Rejected: an id is the deterministic
  address a peer must reproduce independently (ADR 0026), not a name a creator
  should have to reserve a prefix in.

## Consequences

- `AttributeValue` is a shared type in `sandbox.ts`; the effect validator, the
  handle types, and `EntitySnapshot` all use it.
- A script can now say "everything tagged enemy within this box" and read each
  one's health, rather than keeping a second id list in its own globals.
- `ScriptedNpc`/`ScriptedProp` grow two fields, defaulted empty on placement so
  a figure placed by an older script behaves identically.
