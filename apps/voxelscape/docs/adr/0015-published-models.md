# Wear the models people publish, rather than the ones this repository ships

The monsters are drawn as a voxel model made in rm-stacker, which arrived here
as `public/models/zombie.zip`. Changing how a zombie looks therefore meant
committing a binary to this repository and waiting for the site to deploy, and
only the handful of people who can do both could change it at all.

rm-stacker already publishes what it draws. A model saved there can be written
to the account of whoever drew it as an `app.bms.stacker.model` record: the zip
byte for byte as a blob, with the name, the extent in voxels, and a small
picture beside it. The record key comes from the model's name, so publishing
the same name twice edits the drawing everybody is reading rather than leaving
two of them side by side.

So this world reads them. At startup the monsters are dressed in the model
published under `zombie` by one account — `bigmesh.eurosky.social`, the
account the studio publishes its own drawings to — and `/monsters:model`
points the same machinery at anybody else's. Touching up a monster is opening
the editor, drawing, and pressing publish; the next person to load the game is
wearing it, and nothing here was rebuilt.

## Reading takes no account and no session

A repository listing, a record, and a blob are all public in atproto. Reading
somebody's model needs `com.atproto.repo.listRecords`,
`com.atproto.repo.getRecord`, and `com.atproto.sync.getBlob` against the server
holding their account, and none of the three asks who is calling. Signed-out
players get the published models, and a player who has never signed in to
anything still sees whatever the artists have drawn.

That also settles what the shared account is: not an asset server this game
authenticates against, but one account among all the others, which happens to
be the one this world reads by default. The flow that fills it — sign in to
rm-stacker, draw, publish — is the flow anybody uses for their own art, so
"the studio's models" and "somebody's models" are the same thing read from
two different names.

## One vocabulary, one reader, published as a package

The record shape and the file format are rm-stacker's, and this repository held
a hand-made copy of both: the collection name, the record predicate, and a port
of the zip reader. Two copies of a format is two things to keep in step, and
the two programs would have drifted quietly — a record that no longer validates
here, a zip that reads back wrong.

The editor now publishes both as `@big-mesh-studios/rm-stacker`, and both are
taken from it: `./lexicon` for the collection and the record predicate,
`./format` for the reader. What is left here is what a drawing program has no
reason to hand back — the model's extent in voxels, which the ray marcher
needs, and a palette to fall back on for a file that carries none.

The package has no release yet, so it is pinned to a preview build published
for a commit. That pin moves to a version as soon as there is one.

## Considered options

- **Keep the zip in `public/models`.** Rejected as the only source, kept as the
  fallback: it is what a world whose model account has published nothing yet
  wears, and it keeps the game working with no network at all. What it cannot
  do is let the person drawing the monsters change them.
- **Read the models through the signed-in player's session.** Rejected: it
  would make signing in a precondition for seeing the world as it is meant to
  look, and nothing about these three calls needs a session. Reading a peer's
  presence records already goes to the server that holds them rather than the
  player's own (ADR 0010); this goes one step further and holds no session at
  all.
- **Copy the published models into this repository at build time.** Rejected:
  the drawing would be as old as the last deploy, which is the problem this
  removes. It would also give the artists a slower loop than the one they
  already have — publish, reload.
- **A collection of this world's own, say `app.bms.voxelscape.model`.**
  Rejected: it would need rm-stacker to know that this game exists and publish
  differently for it. The models are drawings somebody made, not assets made
  for this world, and reading them under the editor's own vocabulary is what
  lets any account's models be worn without them being published for us.
- **Pick the first model in the account rather than a named one.** Rejected:
  record keys come from the names people type, so "first" is alphabetical and
  would change under the artists' feet the moment somebody publishes `ant`.
  A name is asked for, and `/monsters:published` lists what an account has.
