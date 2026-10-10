import type {
  PlaceEvent,
  PlaceField,
  PlaceFunction,
  PlaceLimit,
  PlaceType,
  PlaceValue,
} from "@big-mesh-studios/place-reference";
import type { JSX } from "@solidjs/web/jsx-runtime";
import { For } from "solid-js";

/**
 * How an entry is drawn: the row a filter narrows, the table of fields, and the
 * one function, value, type, event and bound shape both applications publish.
 *
 * Two worlds let a place script be written, and each reads its own vocabulary out
 * of its own sources: voxelscape's from `@big-mesh-studios/place-reference` and
 * spacescape's from beside its game. The two drawings are the same shape — a
 * function's name and signature, a type's fields, an event's fields, a limit's
 * constant — so the drawing lives here once and each page hands over what it read.
 * A shape either drawing adds is added here rather than in one page, or the two
 * references drift apart in how they look before they drift apart in what they say.
 */

/** What a haystack part can be: words, or a field list to take words from. */
type HaystackPart =
  string | number | readonly HaystackPart[] | readonly PlaceField[];

const haystackOf = (...parts: readonly HaystackPart[]): string =>
  parts.flatMap(wordsOf).join(" ").toLowerCase();

export { haystackOf };

const wordsOf = (part: HaystackPart): string[] =>
  typeof part === "string" || typeof part === "number"
    ? [String(part)]
    : part.flatMap((one) => (isField(one) ? fieldsOf([one]) : wordsOf(one)));

/**
 * One field's name, type, and sentence, as the words a filter matches on. A
 * field that may be left out carries the word the table labels it with, so that
 * what a reader can see on the page is also what they can search for.
 */
const fieldsOf = (fields: readonly PlaceField[]): string[] =>
  fields.flatMap((field) => [
    field.name,
    field.type,
    field.doc,
    ...(field.optional ? ["optional"] : []),
  ]);

const isField = (one: unknown): one is PlaceField =>
  typeof one === "object" && one !== null && "name" in one && "type" in one;

interface FieldTableProps {
  caption: string;
  fields: readonly PlaceField[];
}

/** The fields one entry declares, in the order it declares them. */
export function FieldTable(props: FieldTableProps) {
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
export function Entry(props: EntryProps) {
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
export function Section(props: SectionProps) {
  return (
    <section id={props.id} data-section="" class="section">
      <h2>{props.title}</h2>
      <p class="intro">{props.intro}</p>
      {props.children}
    </section>
  );
}

/** The filter every reference page carries, above its first section. */
export function Filter() {
  return (
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
  );
}

/** Said on a filter that matches nothing, where every section is hidden. */
export function NothingMatches() {
  return (
    <p id="empty" class="empty" hidden>
      Nothing here carries that. Try a shorter word, or one at a time.
    </p>
  );
}

/** One function, its signature first and its parameters underneath. */
export function FunctionEntry(props: { one: PlaceFunction }) {
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
          fields={props.one.params}
        />
      )}
      <p class="returns">
        Returns <code class="type">{props.one.returns}</code>
      </p>
    </Entry>
  );
}

/** One value a script imports and reads without calling it. */
export function ValueEntry(props: { one: PlaceValue }) {
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
export function TypeEntry(props: { one: PlaceType }) {
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
          {alternative.members.length > 0 && (
            <FieldTable
              caption={`Fields of ${alternative.name}`}
              fields={alternative.members}
            />
          )}
        </div>
      ))}
    </Entry>
  );
}

/** One event kind a script's handler is handed, with the fields only it carries. */
export function EventEntry(props: { one: PlaceEvent }) {
  return (
    <Entry
      name={props.one.kind}
      what={props.one.doc}
      haystack={haystackOf(props.one.kind, props.one.doc, props.one.fields)}
      anchor={`event-${props.one.kind}`}
    >
      {props.one.fields.length > 0 && (
        <FieldTable
          caption={`What a ${props.one.kind} event carries`}
          fields={props.one.fields}
        />
      )}
    </Entry>
  );
}

/** Every bound the trusted side enforces, each with the constant to compare against. */
export function LimitTable(props: { limits: readonly PlaceLimit[] }) {
  return (
    <table class="fields limits">
      <thead>
        <tr>
          <th>Constant</th>
          <th>Value</th>
          <th>What it bounds</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.limits}>
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
  );
}
