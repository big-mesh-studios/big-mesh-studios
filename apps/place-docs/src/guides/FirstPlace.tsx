import { Note, Sample } from "../Sample";

/**
 * The first script a creator writes, and the only two things every place script
 * does: register a handler the world calls, and ask the world to change
 * something.
 */
export function FirstPlace() {
  return (
    <section class="guide" id="first-place">
      <h2>Your first place</h2>

      <p>
        A <strong>place</strong> is a piece of the world with a script attached
        to it. The script is ordinary JavaScript that runs in a sandbox, and it
        reaches the world through exactly one import. Everything this
        documentation describes hangs off that:
      </p>

      <Sample caption="src/main.ts — the whole of a first place">
        {`import { dispatch, onTick } from "voxelscape";

// The world calls this every step with the shared clock and the facts since
// the last one. Everything a script does happens inside a handler it registers.
onTick((clockMs, events) => {
  for (const event of events) {
    // Say hello to whoever broke a block.
    if (event.kind === "block-broken") {
      dispatch("toast", { player: event.producer, text: "Careful with that." });
    }
  }
});`}
      </Sample>

      <h3>Opening the editor</h3>
      <p>
        Type <code>/place:editor</code> in the console. It is the same console
        every other command lives in — press <kbd>Escape</kbd> to close it. The
        editor is where scripts are written and where a place&rsquo;s models are
        attached; this documentation is what the editor&rsquo;s own language
        service checks a script against, so anything below that type-checks in
        the editor will type-check here.
      </p>

      <h3>What the sandbox gives you</h3>
      <p>
        The script has no DOM, no network, no filesystem, and no clock of its
        own. What it has is the <code>voxelscape</code> module and a shared
        clock every peer in the place agrees on. That is deliberate: two peers
        running the same script must reach the same answer, so anything that
        would let them disagree is absent rather than discouraged.
      </p>

      <h3>Reading and writing</h3>
      <p>
        Reading is a <strong>world query</strong> — a function in the module
        that answers a question about the running world, as a pure function of
        the clock and the replicated state. Writing is an{" "}
        <strong>effect</strong> — a call to <code>dispatch</code> naming a tag
        and a payload, which the trusted side validates and then applies.
      </p>

      <Sample caption="A query and an effect, side by side">
        {`import { dispatch, getHeightAt, onTick } from "voxelscape";

onTick((clockMs) => {
  // A read: what is under the player, answered without changing anything.
  const ground = getHeightAt(0, 0);

  // A write: ask the world to change something. The payload is typed against
  // the tag itself, so a misspelled field will not compile.
  dispatch("toast", { player: "", text: \`The ground here is at \${ground}\` });
});`}
      </Sample>

      <Note>
        Every effect and every fact has a fixed vocabulary, and the{" "}
        <a href="reference.html#effects">reference</a> lists all of them with
        the bounds the trusted side enforces. A payload outside those bounds is
        dropped rather than clamped, so a script that dispatches an oversized
        fill does nothing at all — it does not fill part of the box.
      </Note>

      <h3>Where to go next</h3>
      <p>
        A place that is only a toast is not much of a place. The guides below
        build one up in the order the world itself does: the terrain it stands
        on, the figures that walk it, the things a player sees, and the rules
        and data that make it a game.
      </p>
    </section>
  );
}
