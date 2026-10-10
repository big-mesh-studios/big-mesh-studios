import type {
  PlacePlanType,
  PlaceShape,
} from "@big-mesh-studios/place-reference";
import { placeReference as reference } from "@big-mesh-studios/place-reference";
import { For } from "solid-js";
import {
  Entry,
  FieldTable,
  Filter,
  FunctionEntry,
  LimitTable,
  NothingMatches,
  Section,
  TypeEntry,
  ValueEntry,
  haystackOf,
} from "./Entries";
import { Page } from "./Page";

/** One type of the plan vocabulary, which a handler receives or returns. */
function PlanEntry(props: { one: PlacePlanType }) {
  return (
    <Entry
      name={props.one.name}
      what={props.one.doc}
      haystack={haystackOf(props.one.name, props.one.doc, props.one.fields)}
      anchor={`plan-${props.one.name}`}
    >
      {props.one.type !== "" && (
        <p class="signature">
          <code class="type">{props.one.type}</code>
        </p>
      )}
      {props.one.fields.length > 0 && (
        <FieldTable
          caption={`Fields of ${props.one.name}`}
          fields={props.one.fields}
        />
      )}
    </Entry>
  );
}

/** One shape a plan entry may name, with the fields that place it. */
function ShapeEntry(props: { one: PlaceShape }) {
  return (
    <Entry
      name={props.one.kind}
      what={props.one.doc}
      haystack={haystackOf(props.one.kind, props.one.doc, props.one.fields)}
      anchor={`shape-${props.one.kind}`}
    >
      <FieldTable
        caption={`Fields of the ${props.one.kind} shape`}
        fields={props.one.fields}
      />
    </Entry>
  );
}

/** The whole reference, drawn from the artifact the generator writes. */
export function Reference() {
  const limits = (): number => reference.limits.length;
  return (
    <Page title="Place reference" app="voxelscape" appHref="voxelscape/">
      <section class="lede">
        <h1>Place reference</h1>
        <p>
          Everything a place script can reach, read out of voxelscape&rsquo;s
          own sources rather than written out by hand. The functions are what a
          script calls, the <a href="#effects">effects</a> are what it asks the
          world to change, and the <a href="#facts">facts</a> are what the world
          reports back. Every field carries the bounds the trusted side enforces
          on it, so what a script may send is here rather than in the source.
        </p>
        <Filter />
      </section>

      <Section
        id="plan"
        title="The plan"
        intro="What a place's terrain is built from. A handler registered with onPlan is given a PlanContext and returns a LevelPlan, and this is the vocabulary between them."
      >
        <For each={reference.plan}>{(one) => <PlanEntry one={one} />}</For>
        <For each={reference.shapes}>{(one) => <ShapeEntry one={one} />}</For>
      </Section>

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
        id="queries"
        title="World queries"
        intro="The read side. Each answers a question about the running world as a pure function of the shared clock and the replicated state, so every peer's script reads the same world at the same moment."
      >
        <For each={reference.values}>{(one) => <ValueEntry one={one} />}</For>
      </Section>

      <Section
        id="types"
        title="Types"
        intro="The shapes the above are written in — a fact's own fields, a handle's methods, and the plan shapes expanded."
      >
        <For each={reference.types}>{(one) => <TypeEntry one={one} />}</For>
      </Section>

      <Section
        id="effects"
        title="Effects"
        intro="What a script asks the world to change, through dispatch. Each is validated against the bounds below before the trusted side applies it, and a dispatch whose payload is out of bounds is dropped rather than clamped."
      >
        <For each={reference.effects}>
          {(group) => (
            <div class="group">
              <h3>{group.name}</h3>
              <p class="intro">{group.doc}</p>
              <For each={group.effects}>
                {(one) => (
                  <Entry
                    name={one.tag}
                    what={one.doc}
                    haystack={haystackOf(one.tag, one.doc, one.fields)}
                    anchor={`effect-${one.tag}`}
                  >
                    <FieldTable
                      caption={`Payload of the ${one.tag} effect`}
                      fields={one.fields}
                    />
                    {one.removedBy !== "" && (
                      <p class="undone">
                        Taken away by <code>{one.removedBy}</code>.
                      </p>
                    )}
                  </Entry>
                )}
              </For>
            </div>
          )}
        </For>
      </Section>

      <Section
        id="facts"
        title="Facts"
        intro="What the world reports back, handed to onTick. Every one of them also carries the fields below, whatever its own kind reports."
      >
        <FieldTable
          caption="The fields every fact carries"
          fields={reference.eventCommon}
        />
        <For each={reference.events}>
          {(one) => (
            <Entry
              name={one.kind}
              what={one.doc}
              haystack={haystackOf(one.kind, one.doc, one.fields)}
              anchor={`fact-${one.kind}`}
            >
              <FieldTable
                caption={`What a ${one.kind} fact carries`}
                fields={one.fields}
              />
            </Entry>
          )}
        </For>
      </Section>

      <Section
        id="limits"
        title="Limits"
        intro={`The ${limits()} bounds the trusted side enforces on a payload, each with the constant a script can compare against.`}
      >
        <LimitTable limits={reference.limits} />
      </Section>

      <NothingMatches />
    </Page>
  );
}
