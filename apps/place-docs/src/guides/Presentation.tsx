import { Note, Sample } from "../Sample";

/**
 * What a player sees and hears: the HUD, the scripted interface, and the
 * dressing of the world itself. All of it is drawn from a fixed vocabulary the
 * world ships, never from a file or URL a script supplies.
 */
export function Presentation() {
  return (
    <section class="guide" id="presentation">
      <h2>Presentation</h2>

      <p>
        A place that changes nothing the player can see is a place nobody
        remembers. The presentation effects come in two families: the{" "}
        <strong>scripted interface</strong>, which a place builds out of named
        panels and items, and <strong>world dressing</strong>, the light and
        sound and weather that make the land feel like somewhere.
      </p>

      <h3>The HUD</h3>
      <p>
        A HUD readout is a line in a player&rsquo;s overlay. It is named, so a
        later <code>hud</code> with the same id replaces it, and{" "}
        <code>hud-remove</code> takes it away. The empty player string means
        everyone locally, which is the usual case for a single-player place.
      </p>
      <Sample caption="A health bar and a count, from the Cube Cavern demo">
        {`dispatch("hud", { player: "", id: "hp", kind: "bar", label: "Health", value: health, max: maxHealth });
dispatch("hud", { player: "", id: "coins", kind: "text", label: "Coins", text: \`\${coins}\` });`}
      </Sample>
      <p>
        A bar needs a <code>max</code>; a text readout needs a <code>text</code>
        . Dispatch the same id every time the value changes rather than creating
        a new readout each time — a bar with a fresh id every tick is a bar the
        player watches multiply.
      </p>

      <h3>Panels, and what goes in them</h3>
      <p>
        Anything more than a readout is a <strong>panel</strong>: a docked box
        that items are added to. A panel is opened once by id, items are added
        and updated under that id, and <code>ui-remove</code> closes it.
      </p>
      <Sample caption="A panel, a label, a bar, and a button">
        {`dispatch("ui-panel", { player: "", id: "hud", title: "Status", anchor: "bottom-left" });
dispatch("ui-label", { player: "", panel: "hud", id: "hp-label", text: "Health" });
dispatch("ui-bar",   { player: "", panel: "hud", id: "hp", value: 80, max: 100 });
dispatch("ui-button", { player: "", panel: "hud", id: "heal", text: "Rest", onClick: "heal" });`}
      </Sample>
      <p>
        The five item effects are <code>ui-label</code>, <code>ui-bar</code>,{" "}
        <code>ui-button</code>, <code>ui-image</code>, and{" "}
        <code>ui-remove</code>; every one takes the panel it belongs to, and
        every one is named so a later dispatch can update it in place. A
        button&rsquo;s <code>onClick</code> is a tag, not a function: the
        sandbox has no way to call back into a script, so the click arrives as a
        fact and the script answers it on the next tick.
      </p>

      <h3>Light, sound, and weather</h3>
      <p>
        The land itself is dressed with the same vocabulary:{" "}
        <code>createLight</code> places a light and <code>light-remove</code>{" "}
        takes it away; <code>createStorm</code> sets the weather;{" "}
        <code>createBillboard</code>, <code>createDecal</code>, and{" "}
        <code>createParticle</code> add the scenery.
      </p>
      <Sample caption="A sound with an id, and the stop that reaches it">
        {`dispatch("sound", { player: "", name: "ambience", id: "wind", loop: true, volume: 0.4 });
// ...and much later, in another tick:
dispatch("sound-stop", { player: "", id: "wind" });`}
      </Sample>
      <Note>
        A sound names one of the world&rsquo;s own fixed sounds, never a file or
        a URL — a place cannot ship audio of its own. The same goes for
        billboard images. <code>id</code> is required to loop, and a loop with
        no
        <code>sound-stop</code> left behind is a sound that plays until the
        place is left.
      </Note>

      <h3>Talking to the player</h3>
      <p>
        Two smaller surfaces round it out. <code>toast</code> is a short message
        in the corner, for something that does not deserve a panel, and{" "}
        <code>narrate</code> is a line of prose for a moment that deserves one.
      </p>
    </section>
  );
}
