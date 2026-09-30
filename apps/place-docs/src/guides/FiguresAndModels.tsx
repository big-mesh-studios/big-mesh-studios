import { Note, Sample } from "../Sample";

/**
 * Figures and models: what wears a voxel model, how a model name is checked, and
 * why every id in a place script has to be derived rather than generated.
 */
export function FiguresAndModels() {
  return (
    <section class="guide" id="figures-and-models">
      <h2>Figures and models</h2>

      <p>
        A place is inhabited by <strong>figures</strong> — the NPCs a script
        places, the props it sets down, and the players themselves. Every figure
        wears a voxel model, and the models a place may wear are the ones{" "}
        <a href="../rm-stacker/">rm-stacker</a> published and the editor
        attached to it.
      </p>

      <h3>Placing an NPC</h3>
      <Sample caption="Two NPCs, from the sample place script">
        {`import { createNpc, dispatch, onTick } from "voxelscape";

function spawn() {
  createNpc({ id: "sable", x: 40, z: 12, name: "Sable" });
  createNpc({ id: "rook", x: -40, z: 12, name: "Rook" });
}`}
      </Sample>

      <p>
        The <code>id</code> is the one field that has no default, and it is not
        an oversight. Every peer in a place runs the same script against the
        same clock, so each must independently compute the identical id for the
        identical figure — a random one would place a different figure in every
        peer&rsquo;s world. Derive it from something deterministic, the way the
        Zombies demo derives an id from its population seed and spawn cell.
      </p>
      <Note>
        <code>createNpc</code> throws if a model name is not one the place
        actually attaches. Omitting <code>model</code> entirely is not the same
        as an unknown one: the world draws its own default figure, exactly as a
        hand-written <code>npc</code> effect with no model does.
      </Note>

      <h3>Dressing a player</h3>
      <p>
        A player can be dressed in one of the place&rsquo;s models, which is how
        a place gives a costume or a form. The empty string is a real value
        rather than a null, and means the plain cube:
      </p>
      <Sample caption="costume and undress">{`setPlayerModel("wolf", player);   // dress them
clearPlayerModel(player);        // take it off again`}</Sample>

      <h3>Standing figures in a plan</h3>
      <p>
        A plan may also stand figures among its shapes, so the land and its
        occupants are built in the same pass. Those take world <em>feet</em>,
        not voxels — the same coordinates a script&rsquo;s <code>npc</code>{" "}
        effect takes, and the opposite of the shapes beside them. Both are
        written out in full in the{" "}
        <a href="reference.html#plan-PlanNpc">reference</a>.
      </p>

      <h3>Talking to a figure</h3>
      <p>
        An NPC is not interactive on its own. Talking is a dialog you dispatch,
        and the reply arrives back as a fact on a later tick, which is where the
        figure&rsquo;s state lives:
      </p>
      <Sample caption="A dialog tree, from the sample place script">
        {`dispatch("dialog", {
  player: player,
  npcId: "sable",
  prompt: "Welcome, traveller. My wares are humble.",
  options: ["Buy a potion.", "Goodbye."],
});

// ...later, on a fact:
if (event.kind === "npc-choose" && event.npcId === "sable") {
  // event.option is the index the player picked
}`}
      </Sample>
      <p>
        The round trip through a fact is the pattern for anything a player does
        to a figure, and the reason a dialog handler keeps a little state: the
        script is told <em>which option was chosen</em>, not what the question
        was, so it has to remember where in the tree the conversation is.
      </p>

      <h3>Behaviours</h3>
      <p>
        A figure moves on its own only if a script tells it to. The{" "}
        <code>entity-set</code> effect sets a figure&rsquo;s attributes and the{" "}
        <code>figure-animate</code> effect drives a motion, while{" "}
        <code>zone</code> marks out an area a figure acts within. The{" "}
        <code>npc-remove</code> and <code>prop-remove</code> effects take a
        figure away again, by the same id it was placed with.
      </p>
    </section>
  );
}
