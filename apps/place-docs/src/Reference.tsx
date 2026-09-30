import type {
  PlaceField,
  PlaceFunction,
  PlaceLimit,
  PlacePlanType,
  PlaceType,
  PlaceValue,
} from "@big-mesh-studios/place-reference";
import { placeReference as reference } from "@big-mesh-studios/place-reference";
import type { JSX } from "@solidjs/web/jsx-runtime";
import { For } from "solid-js";
import { Page } from "./Page";

/**
 * Everything a row can be found by, lower-cased, for the filter to match
 * against. A row carries the words a reader would search for in one attribute
 * rather than the filter walking the rendered text, so what it matches is the
 * whole entry — a payload field's name and its sentence included — and not
 * whatever happens to be in the markup.
 */
/** What a haystack part can be: words, or a field list to take words from. */
type HaystackPart =
  string | number | readonly HaystackPart[] | readonly PlaceField[];

const haystackOf = (...parts: readonly HaystackPart[]): string =>
  parts.flatMap(wordsOf).join(" ").toLowerCase();

/**
 * One field's name, type, and sentence, as the words a filter matches on. A
 * field that may be left out carries the word the table labels it with, so
 * that what a reader can see on the page is also what they can search for.
 */
const fieldsOf = (fields: readonly PlaceField[]): string[] =>
  fields.flatMap((field) => [
    field.name,
    field.type,
    field.doc,
    ...(field.optional ? ["optional"] : []),
  ]);

const wordsOf = (part: HaystackPart): string[] =>
  typeof part === "string" || typeof part === "number"
    ? [String(part)]
    : part.flatMap((one) => (isField(one) ? fieldsOf([one]) : wordsOf(one)));

const isField = (one: unknown): one is PlaceField =>
  typeof one === "object" && one !== null && "name" in one && "type" in one;

interface FieldTableProps {
  caption: string;
  fields: readonly PlaceField[];
}

/** The fields one entry declares, in the order it declares them. */
function FieldTable(props: FieldTableProps) {
  return (
    <table class="fields">
      <caption>{props.caption}</caption>
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <For each={props.fields}>
          {(field) => (
            <tr>
              <td>
                <code>{field.name}</code>
                {field.optional && <span class="optional">optional</span>}
              </td>
              <td>
                <code class="type">{field.type}</code>
              </td>
              <td class="doc">{field.doc}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

interface EntryProps {
  /** The name the entry goes by, shown in the summary. */
  name: string;
  /** What it is, shown beside the name and read first by the filter. */
  what: string;
  /** The words a search for this entry should find. */
  haystack: string;
  /** The anchor a link from a guide points at. */
  anchor?: string;
  children?: JSX.Element;
}

/**
 * One entry in the reference, closed until it is opened. Every entry is a
 * `details` rather than a heading and a table, so a page of nine hundred of
 * them opens instantly, stays as a document a reader can search, and prints
 * without a script at all.
 */
function Entry(props: EntryProps) {
  return (
    <details
      class="entry"
      id={props.anchor}
      data-row=""
      data-haystack={props.haystack}
    >
      <summary>
        <code class="name">{props.name}</code>
        <span class="what">{props.what}</span>
      </summary>
      {props.children}
    </details>
  );
}

interface SectionProps {
  id: string;
  title: string;
  intro: string;
  children: JSX.Element;
}

/** One part of the reference, with the count of what it holds. */
function Section(props: SectionProps) {
  return (
    <section id={props.id} data-section="" class="section">
      <h2>{props.title}</h2>
      <p class="intro">{props.intro}</p>
      {props.children}
    </section>
  );
}

/** One function, its signature first and its parameters underneath. */
function FunctionEntry(props: { one: PlaceFunction }) {
  return (
    <Entry
      name={props.one.name}
      what={props.one.doc}
      haystack={haystackOf(
        props.one.name,
        props.one.doc,
        props.one.signature,
        props.one.returns,
        props.one.params.flatMap((param) => [
          param.name,
          param.type,
          param.doc,
        ]),
      )}
      anchor={`function-${props.one.name}`}
    >
      <p class="signature">
        <code>{props.one.signature}</code>
      </p>
      {props.one.params.length > 0 && (
        <FieldTable
          caption={`Parameters of ${props.one.name}`}
          fields={props.one.params.map((param) => ({
            name: param.name,
            type: param.type,
            optional: param.optional,
            doc: param.doc,
          }))}
        />
      )}
      <p class="returns">
        Returns <code class="type">{props.one.returns}</code>
      </p>
    </Entry>
  );
}

/** One world query, which is a value rather than a call. */
function ValueEntry(props: { one: PlaceValue }) {
  return (
    <Entry
      name={props.one.name}
      what={props.one.doc}
      haystack={haystackOf(props.one.name, props.one.doc, props.one.type)}
      anchor={`value-${props.one.name}`}
    >
      <p class="signature">
        <code>
          {props.one.name}: {props.one.type}
        </code>
      </p>
    </Entry>
  );
}

/** One type the module exports, drawn as fields, a union, or a spelled-out type. */
function TypeEntry(props: { one: PlaceType }) {
  return (
    <Entry
      name={props.one.name}
      what={props.one.doc}
      haystack={haystackOf(
        props.one.name,
        props.one.doc,
        props.one.type,
        props.one.union,
        props.one.members,
        props.one.alternatives.flatMap((one) => [
          one.name,
          one.doc,
          one.members,
        ]),
      )}
      anchor={`type-${props.one.name}`}
    >
      {props.one.type !== "" && (
        <p class="signature">
          <code class="type">{props.one.type}</code>
        </p>
      )}
      {props.one.union.length > 0 && (
        <p class="union">
          One of{" "}
          <For each={props.one.union}>
            {(value, index) => (
              <>
                {index() > 0 && ", "}
                <code class="type">{value}</code>
              </>
            )}
          </For>
          .
        </p>
      )}
      {props.one.members.length > 0 && (
        <FieldTable
          caption={`Fields of ${props.one.name}`}
          fields={props.one.members}
        />
      )}
      {props.one.alternatives.map((alternative) => (
        <div class="alternative">
          <h4>
            <code>{alternative.name}</code>
            <span class="what">{alternative.doc}</span>
          </h4>
          <FieldTable
            caption={`Fields of ${alternative.name}`}
            fields={alternative.members}
          />
        </div>
      ))}
    </Entry>
  );
}

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

/** The whole reference, drawn from the artifact the generator writes. */
export function Reference() {
  const limits = (): number => reference.limits.length;
  return (
    <Page title="Place reference">
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
        <p class="filter">
          <label for="filter">Filter</label>
          <input
            id="filter"
            type="search"
            placeholder="npc, dialog, checkpoint, optional…"
            autocomplete="off"
          />
          <button id="clear" type="button">
            Clear
          </button>
          <span id="shown" class="shown" />
          <a id="jump" class="jump" href="#functions" hidden>
            first match
          </a>
        </p>
      </section>

      <Section
        id="plan"
        title="The plan"
        intro="What a place's terrain is built from. A handler registered with onPlan is given a PlanContext and returns a LevelPlan, and this is the vocabulary between them."
      >
        <For each={reference.plan}>{(one) => <PlanEntry one={one} />}</For>
        <For each={reference.shapes}>
          {(one) => (
            <Entry
              name={one.kind}
              what={one.doc}
              haystack={haystackOf(one.kind, one.doc, one.fields)}
              anchor={`shape-${one.kind}`}
            >
              <FieldTable
                caption={`Fields of the ${one.kind} shape`}
                fields={one.fields}
              />
            </Entry>
          )}
        </For>
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
        <table class="fields limits">
          <thead>
            <tr>
              <th>Constant</th>
              <th>Value</th>
              <th>What it bounds</th>
            </tr>
          </thead>
          <tbody>
            <For each={reference.limits as readonly PlaceLimit[]}>
              {(one) => (
                <tr
                  data-row=""
                  data-haystack={`${one.name} ${one.value} ${one.doc}`.toLowerCase()}
                >
                  <td>
                    <code>{one.name}</code>
                  </td>
                  <td>
                    <code class="type">{one.value}</code>
                  </td>
                  <td class="doc">{one.doc}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Section>

      <p id="empty" class="empty" hidden>
        Nothing here carries that. Try a shorter word, or one at a time.
      </p>
    </Page>
  );
}
