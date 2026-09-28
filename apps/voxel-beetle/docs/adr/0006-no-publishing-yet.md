# A model is not published, only saved

A model here is written to a file and remembered in this browser. It is not
published to an account, and there is no sign-in.

A published model is a record in somebody's repository, and the world's model
library reads a particular record: `app.bms.stacker.model`, whose parts carry
their six sides and the two faces of each cut as separate image blobs, and whose
dimensions and palette are in the record so a listing can be drawn without
fetching any of it. A model here is a volume. It has no sides, no cuts and no
parts, so it does not fit that record's shape, and publishing it as one would
either fail its validation or mean a second collection.

A second collection is what the world already turned down once, for a good
reason (`apps/voxelscape/docs/adr/0015-published-models.md`): the editor would
have to know the world exists and publish differently for it. The alternative is
to extend the record the world already reads, and to teach the world's library a
volume — which means its round trip through the zip format, which assumes six
side images a part, has to be replaced rather than extended.

Neither is a large piece of work, but both are work on somebody else's data
model, and the file format is the part worth settling first: a record can carry
whatever the editor ends up writing, but not before the editor knows what it
writes.

## Consequences

- The editor has no dependency on the atproto packages, no OAuth client, no
  client metadata document, and no popup channel to be given a name distinct from
  any other application's.
- Its copy in this browser is stored under its own database name, so it and the
  other editor do not fight over one store.
- `open` and `save` are the whole of the file surface. A browser that will not
  hand over a handle to a file can still save one and open one, and says so
  rather than offering a button that will not work.
- The cards in the file list carry a model's name, its size and when it was last
  opened, and no picture: drawing one would mean the offscreen renderer, which is
  shaped around a figure of posed parts and is not used here.
