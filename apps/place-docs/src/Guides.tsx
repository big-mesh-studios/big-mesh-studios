import { Page } from "./Page";
import { EditorAndConsole } from "./guides/EditorAndConsole";
import { FiguresAndModels } from "./guides/FiguresAndModels";
import { FirstPlace } from "./guides/FirstPlace";
import { Presentation } from "./guides/Presentation";
import { RulesAndData } from "./guides/RulesAndData";
import { TerrainWithOnPlan } from "./guides/TerrainWithOnPlan";

/** The six guides, in the order a creator meets them. */
const GUIDES = [
  {
    id: "first-place",
    step: "One",
    title: "Your first place",
    blurb:
      "The one import, the one handler, and how a script changes the world.",
  },
  {
    id: "editor-and-console",
    step: "Two",
    title: "The editor and the console",
    blurb:
      "Where a place is written, where it is poked at, and where the reference lives in the world.",
  },
  {
    id: "terrain-with-onplan",
    step: "Three",
    title: "Terrain, with onPlan",
    blurb:
      "The six shapes a place's land is built from, and the coordinate that catches everyone.",
  },
  {
    id: "figures-and-models",
    step: "Four",
    title: "Figures and models",
    blurb:
      "NPCs, props, and the models rm-stacker published and this place attached.",
  },
  {
    id: "presentation",
    step: "Five",
    title: "Presentation",
    blurb:
      "The HUD, the scripted interface, and the light and sound of the land.",
  },
  {
    id: "rules-and-data",
    step: "Six",
    title: "Rules and data",
    blurb:
      "Scoring, teams, items, and the three scopes of what a place remembers.",
  },
];

/**
 * The guides, as one page. Each guide is a component of its own so a page this
 * long is a page of files rather than one file, and so the reading order and the
 * contents list above it are the only places the order is written down.
 */
export function Guides() {
  return (
    <Page title="Guides">
      <h1>Writing a place</h1>
      <div class="lede">
        <p>
          A place is a piece of the world with a script attached to it. This is
          how to write one, in six steps, from a single toast to a place that
          remembers you.
        </p>
        <p>
          Every sample here is drawn from a demo place in this repository,
          trimmed to the part under discussion. Every function, effect, fact,
          and bound they use is listed in the{" "}
          <a href="reference.html">reference</a>, which is read out of the
          world&rsquo;s own declarations and is the same artifact{" "}
          <code>/place:docs</code> opens in the world.
        </p>
      </div>

      <ol class="contents">
        {GUIDES.map((guide) => (
          <li>
            <a href={`#${guide.id}`}>
              <span class="step">{guide.step}</span>
              {guide.title}
              <span class="blurb">{guide.blurb}</span>
            </a>
          </li>
        ))}
      </ol>

      <FirstPlace />
      <EditorAndConsole />
      <TerrainWithOnPlan />
      <FiguresAndModels />
      <Presentation />
      <RulesAndData />
    </Page>
  );
}
