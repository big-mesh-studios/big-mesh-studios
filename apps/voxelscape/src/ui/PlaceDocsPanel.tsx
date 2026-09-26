// The `/place:docs` overlay: the place reference, searchable, over the running
// world. It reads the committed drawing in `@big-mesh-studios/place-reference` —
// the same one `apps/place-docs` serves and the one the CI staleness check
// holds in step with the world's own declarations — so what a script author
// reads here is what the site says and what the editor type-checks against.
//
// The reference is a lazy chunk rather than part of the world's bundle: nothing
// here is needed to play, and the whole vocabulary is a hundred and thirty
// kilobytes of text that a visitor who never opens it should not download.
import {
  placeReference as reference,
  type PlaceField,
  type PlaceLimit,
  type PlacePlanType,
  type PlaceType,
  type PlaceTypeVariant,
} from "@big-mesh-studios/place-reference";
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onSettled,
  Show,
  type Component,
} from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import styles from "./PlaceDocsPanel.module.css";

/** One thing the reference lists, however it was read out of the sources. */
interface Entry {
  /** The name a reader searches for and the anchor a link points at. */
  name: string;
  /** What it is, in one sentence. */
  what: string;
  /** Every word this entry should be found by, lower-cased. */
  haystack: string;
  /** The type it is, where that says more than the sentence does. */
  signature?: string;
  /** The members of a union of literals, where it has any. */
  union?: readonly string[];
  /** The fields it declares, where it declares any. */
  fields?: readonly PlaceField[];
  /** The named shapes it is one of, where it is a union of them. */
  alternatives?: readonly PlaceTypeVariant[];
  /** What takes it away again, for an effect. */
  removedBy?: readonly string[];
}

/** One part of the reference: a heading and everything filed under it. */
interface Section {
  id: string;
  title: string;
  entries: Entry[];
}

const fieldsOf = (
  fields: readonly PlaceField[] | undefined,
): readonly PlaceField[] => fields ?? [];

const wordsOf = (
  ...parts: readonly (string | number | readonly unknown[])[]
): string =>
  parts
    .flatMap((part) => {
      if (typeof part === "string" || typeof part === "number") {
        return [String(part)];
      }
      if (Array.isArray(part)) {
        return [wordsOf(...(part as readonly (string | number)[]))];
      }
      return [];
    })
    .join(" ")
    .toLowerCase();

const fieldWords = (fields: readonly PlaceField[] | undefined): string =>
  fieldsOf(fields)
    .flatMap((field) => [field.name, field.type, field.doc])
    .join(" ");

const planEntry = (one: PlacePlanType): Entry => ({
  name: one.name,
  what: one.doc,
  haystack: wordsOf(one.name, one.doc, one.type, fieldWords(one.fields)),
  signature: one.type,
  fields: one.fields,
});

const typeEntry = (one: PlaceType): Entry => ({
  name: one.name,
  what: one.doc,
  haystack: wordsOf(
    one.name,
    one.doc,
    one.type,
    one.union,
    fieldWords(one.members),
    one.alternatives.map((alternative) =>
      wordsOf(
        alternative.name,
        alternative.doc,
        fieldWords(alternative.members),
      ),
    ),
  ),
  signature: one.type,
  union: one.union,
  fields: one.members,
  alternatives: one.alternatives,
});

const limitEntry = (one: PlaceLimit): Entry => ({
  name: one.name,
  what: one.doc,
  haystack: wordsOf(one.name, one.doc, one.value),
  signature: one.value,
});

/** Every effect, flattened out of the reading order they are grouped into. */
const everyEffect = reference.effects.flatMap((group) => group.effects);

/** The reference in the order it is read: the plan, then what a script reaches for. */
const SECTIONS: readonly Section[] = [
  {
    id: "plan",
    title: "The plan",
    entries: [
      ...reference.plan.map(planEntry),
      ...reference.shapes.map((one) => ({
        name: one.kind,
        what: one.doc,
        haystack: wordsOf(one.kind, one.doc, fieldWords(one.fields)),
        fields: one.fields,
      })),
    ],
  },
  {
    id: "functions",
    title: "Functions",
    entries: reference.functions.map((one) => ({
      name: one.name,
      what: one.doc,
      haystack: wordsOf(
        one.name,
        one.doc,
        one.signature,
        one.returns,
        one.params.flatMap((param) => [param.name, param.type, param.doc]),
      ),
      signature: one.signature,
    })),
  },
  {
    id: "queries",
    title: "Queries",
    entries: reference.values.map((one) => ({
      name: one.name,
      what: one.doc,
      haystack: wordsOf(one.name, one.doc, one.type),
      signature: one.type,
    })),
  },
  {
    id: "types",
    title: "Types",
    entries: reference.types.map(typeEntry),
  },
  {
    id: "effects",
    title: "Effects",
    entries: everyEffect.map((one) => ({
      name: one.tag,
      what: one.doc,
      haystack: wordsOf(
        one.tag,
        one.doc,
        fieldWords(one.fields),
        one.removedBy,
      ),
      fields: one.fields,
      removedBy: one.removedBy === "" ? [] : [one.removedBy],
    })),
  },
  {
    id: "facts",
    title: "Facts",
    entries: reference.events.map((one) => ({
      name: one.kind,
      what: one.doc,
      haystack: wordsOf(
        one.kind,
        one.doc,
        reference.eventCommon.map((field) => field.name),
        fieldWords(one.fields),
      ),
      fields: [
        ...reference.eventCommon.map((field): PlaceField => ({
          ...field,
          doc: field.doc ?? "",
        })),
        ...one.fields,
      ],
    })),
  },
  {
    id: "limits",
    title: "Limits",
    entries: reference.limits.map(limitEntry),
  },
];

const ENTRY_COUNT = SECTIONS.reduce(
  (total, one) => total + one.entries.length,
  0,
);

/** Whether an entry's words hold every one of the filter's terms. */
const matches = (entry: Entry, terms: readonly string[]): boolean =>
  terms.every((term) => entry.haystack.includes(term));

const FieldTable: Component<{ fields: readonly PlaceField[] }> = (props) => (
  <table class={styles.fields}>
    <thead>
      <tr>
        <th>Field</th>
        <th>Type</th>
        <th>What it is</th>
      </tr>
    </thead>
    <tbody>
      <For each={props.fields}>
        {(field) => (
          <tr>
            <td>
              {field.name}
              {field.optional && <span class={styles.optional}>?</span>}
            </td>
            <td class={styles.type}>{field.type}</td>
            <td>{field.doc}</td>
          </tr>
        )}
      </For>
    </tbody>
  </table>
);

const EntryView: Component<{ one: Entry }> = (props) => (
  <details class={styles.entry}>
    <summary>
      <code class={styles.name}>{props.one.name}</code>
      <span class={styles.what}>{props.one.what}</span>
    </summary>
    <div class={styles.entryBody}>
      <Show when={props.one.signature}>
        <p class={styles.signature}>{props.one.signature}</p>
      </Show>
      <Show when={(props.one.union?.length ?? 0) > 0}>
        <p class={styles.union}>
          One of{" "}
          <For each={props.one.union}>
            {(value, index) => (
              <>
                {index() > 0 && ", "}
                <code>{value}</code>
              </>
            )}
          </For>
          .
        </p>
      </Show>
      <Show when={props.one.fields && props.one.fields.length > 0}>
        <FieldTable fields={props.one.fields ?? []} />
      </Show>
      <For each={props.one.alternatives}>
        {(alternative) => (
          <div class={styles.alternatives}>
            <h4>
              <code>{alternative.name}</code> — {alternative.doc}
            </h4>
            <Show when={alternative.members.length > 0}>
              <FieldTable fields={alternative.members} />
            </Show>
          </div>
        )}
      </For>
      <Show when={(props.one.removedBy?.length ?? 0) > 0}>
        <p class={styles.removed}>
          Taken away by{" "}
          {props.one.removedBy?.map((one) => `\`${one}\``).join(", ")}.
        </p>
      </Show>
    </div>
  </details>
);

/**
 * The overlay itself. Escape closes it, a click on the backdrop closes it, and
 * the filter narrows every section at once — a search for `hud` should say
 * where the hits are rather than hide the sections that have none.
 */
const PlaceDocsPanel: Component = () => {
  const voxelscape = useVoxelscape();
  const [wanted, setWanted] = createSignal("");

  const terms = createMemo(() =>
    wanted()
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((one) => one !== ""),
  );

  const narrowed = createMemo(() => {
    const needles = terms();
    if (needles.length === 0) {
      return SECTIONS;
    }
    return SECTIONS.map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => matches(entry, needles)),
    })).filter((section) => section.entries.length > 0);
  });

  /** How many entries the filter is currently letting through. */
  const shown = createMemo(() =>
    narrowed().reduce((total, one) => total + one.entries.length, 0),
  );

  let filter: HTMLInputElement = null!;
  let sheet: HTMLDivElement = null!;

  const close = (): void => voxelscape.placeDocs.setOpen(false);

  const handleKey = (event: KeyboardEvent): void => {
    if (event.code === "Escape") {
      close();
      event.preventDefault();
      return;
    }
    // A slash reaches the filter from anywhere in the panel, the way it reaches
    // a terminal — a reference is something a reader types into.
    if (event.key === "/" && event.target !== filter) {
      filter.focus();
      event.preventDefault();
    }
  };
  window.addEventListener("keydown", handleKey);
  onCleanup(() => window.removeEventListener("keydown", handleKey));

  // The filter is what a reader comes here to type into, so it takes the focus
  // as the panel opens rather than the panel having to be tabbed into first.
  onSettled(() => filter.focus());

  return (
    <div
      class={styles.backdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        ref={sheet}
        class={styles.sheet}
        role="dialog"
        aria-label="place reference"
        aria-modal="true"
        tabindex={-1}
      >
        <div class={styles.bar}>
          <h2 class={styles.title}>Place reference</h2>
          <input
            ref={filter}
            class={styles.filter}
            type="search"
            placeholder="search every function, effect, fact, and limit…"
            aria-label="search the place reference"
            value={wanted()}
            onInput={(event) => setWanted(event.currentTarget.value)}
          />
          <span class={styles.count}>
            {shown() === ENTRY_COUNT
              ? `${ENTRY_COUNT} entries`
              : `${shown()} of ${ENTRY_COUNT}`}
          </span>
          <button class={styles.close} type="button" onClick={close}>
            close
          </button>
        </div>

        <div class={styles.body}>
          <Show
            when={narrowed().length > 0}
            fallback={<p class={styles.empty}>nothing matches that.</p>}
          >
            <For each={narrowed()}>
              {(section) => (
                <section class={styles.section}>
                  <h3 class={styles.sectionHeading}>
                    {section.title} · {section.entries.length}
                  </h3>
                  <For each={section.entries}>
                    {(entry) => <EntryView one={entry} />}
                  </For>
                </section>
              )}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default PlaceDocsPanel;
