import { Note, Sample } from "../Sample";

/**
 * The editor and the console: the two places a creator works, and what each is
 * for. The in-game reference panel is the same artifact this site renders, so
 * a creator never has to leave the world to look a payload up.
 */
export function EditorAndConsole() {
  return (
    <section class="guide" id="editor-and-console">
      <h2>The editor and the console</h2>

      <p>
        Two ways in, and they are not interchangeable. The{" "}
        <strong>editor</strong> is where a place is authored: its scripts, its
        models, its name. The <strong>console</strong> is where the running
        world is poked at, by whoever is holding the keyboard.
      </p>

      <h3>The editor</h3>
      <Sample caption="the two commands that open it">{`/place:editor            the script editor
/place:level-editor     the terrain editor, for the shape of the land`}</Sample>

      <p>
        The script editor lists the files a place ships and lets you edit them
        with the same editor everything else in this project uses. Underneath,
        it runs a TypeScript language service over your scripts with the{" "}
        <code>voxelscape</code> module in scope — the same declaration this
        site&rsquo;s reference is read from. That means completion, hover
        documentation, and an inline error all come from the world&rsquo;s own
        types rather than from anything written here, and a script that
        type-checks in the editor is a script the world can run.
      </p>

      <h3>Attaching models</h3>
      <p>
        A place carries its own models: voxel figures published from{" "}
        <a href="../rm-stacker/">rm-stacker</a> and attached to this place. They
        are not imported by name into a script; they are attached to the place,
        and the editor generates a declaration from the attached files&rsquo;
        own bytes. <code>createNpc</code> then checks the model name you pass
        against exactly those, so a typo in a model name is a compile error
        rather than a figure that never appears.
      </p>
      <Note>
        The model name is checked at two different moments on purpose. At build
        time the name is checked against the models the place has attached; at
        run time it is checked against the models actually loaded, and an
        unknown one throws the moment the call runs. Attaching a model after a
        script is written is therefore safe, and removing one the script names
        is not.
      </Note>

      <h3>The console</h3>
      <p>
        Press <kbd>Escape</kbd> for the console. Every command in the world is
        declared in one place and named for what the player has rather than what
        the code is built on, which is why the account commands are{" "}
        <code>/account:*</code>. A few are worth knowing while writing a place:
      </p>
      <Sample caption="the commands a creator reaches for">{`/place:docs                this reference, in the world
/place:editor               the script editor
/place:level-editor        the terrain editor
/clock:speed 4             run the day-night clock four times as fast
/weather snow               pin the weather
/place:demos               list the built-in demo places
/place:demo <id>           play one of them`}</Sample>

      <p>
        <code>/place:demos</code> and <code>/place:demo &lt;id&gt;</code> are
        the quickest way to see one of the built-in demos running. Those demos
        are ordinary place scripts in this repository, and every sample in these
        guides is drawn from one of them.
      </p>

      <h3>The reference, in the world</h3>
      <p>
        <code>/place:docs</code> opens the same reference this site serves,
        rendered from the same committed artifact. It is the whole vocabulary:
        every function, effect, fact, and bound. Having it open in a second
        window or on a second monitor while writing a script is the intended way
        to work — it is searchable, and it needs no connection to anything.
      </p>
    </section>
  );
}
