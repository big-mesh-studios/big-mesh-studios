import type { PlaceReference } from "@big-mesh-studios/place-reference";
import { For } from "solid-js";
import drawing from "../../spacescape/src/places/reference/place-api.json";
import {
  EventEntry,
  FieldTable,
  Filter,
  FunctionEntry,
  LimitTable,
  NothingMatches,
  Section,
  TypeEntry,
  ValueEntry,
} from "./Entries";
import { Page } from "./Page";

/**
 * The same reference voxelscape's page serves, read out of spacescape's own
 * sources instead.
 *
 * Both worlds let a place be scripted, both draw what a script can reach out of
 * their own declarations, and both keep that drawing beside the game so the
 * in-game panel and this page cannot disagree. This drawing has no `effects`,
 * `shapes` or `plan` — a place author there writes `createShape` and
 * `createZone` rather than dispatching a tagged effect — so the sections below
 * are the ones its surface actually has.
 */
const reference: Pick<
  PlaceReference,
  "functions" | "values" | "types" | "events" | "eventCommon" | "limits"
> = drawing;

/** The whole reference, drawn from the artifact the generator writes. */
export function SpacescapeReference() {
  const limits = (): number => reference.limits.length;
  return (
    <Page title="Place reference" app="spacescape" appHref="spacescape/">
      <section class="lede">
        <h1>Place reference</h1>
        <p>
          Everything a place script can reach in spacescape, read out of the
          world&rsquo;s own sources rather than written out by hand. The{" "}
          <a href="#functions">functions</a> are what a script calls, the{" "}
          <a href="#events">events</a> are what the world hands back on every
          tick, and the <a href="#limits">limits</a> are the bounds it refuses
          to go past. The same list is what <code>/place:docs</code> opens
          inside the world.
        </p>
        <Filter />
      </section>

      <Section
        id="functions"
        title="Functions"
        intro="What a script calls. Every one of these is bound into the module a script imports, whether or not the script calls it."
      >
        <For each={reference.functions}>
          {(one) => <FunctionEntry one={one} />}
        </For>
      </Section>

      <Section
        id="values"
        title="Values"
        intro="What a script imports and reads without calling it."
      >
        <For each={reference.values}>{(one) => <ValueEntry one={one} />}</For>
      </Section>

      <Section
        id="types"
        title="Types"
        intro="The shapes the above are written in — an option object's fields, and a union of named types expanded."
      >
        <For each={reference.types}>{(one) => <TypeEntry one={one} />}</For>
      </Section>

      <Section
        id="events"
        title="Events"
        intro="What the world reports back, handed to the handler given to onTick. Every one of them also carries the fields below, whatever its own kind reports."
      >
        <FieldTable
          caption="The fields every event carries"
          fields={reference.eventCommon}
        />
        <For each={reference.events}>{(one) => <EventEntry one={one} />}</For>
      </Section>

      <Section
        id="limits"
        title="Limits"
        intro={`The ${limits()} bounds the world enforces on a script's own values, each with the constant a script can compare against.`}
      >
        <LimitTable limits={reference.limits} />
      </Section>

      <NothingMatches />
    </Page>
  );
}
