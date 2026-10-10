/**
 * The in-game reference: every function, type, fact and bound a place script can reach, rendered
 * from the drawing `tools/place-reference.ts` produces.
 *
 * ## Why this is a panel and not a documentation site
 *
 * **Because the moment a person needs it is the moment they are writing a place**, which is inside
 * this application with the world running behind it. voxelscape also serves its reference from a
 * documentation site, and that is a build step and a second application; this engine's authoring
 * already happens in a panel (`/place:editor`) with a live language service typing every function,
 * so the reference's job here is the readable overview — what is there, and what it means — rather
 * than a page somebody leaves the game to read.
 *
 * ## The drawing is the source of truth, and it is generated
 *
 * ADR 0017 promised that the effect table would be what a generated reference document is read
 * from. This engine's effect table turned out not to be part of an author's API at all — the
 * vocabulary is the host's, and an author writes the `create*` functions — so the reference is
 * built from the guest library, the events and the limits instead. See
 * `src/places/reference/types.ts` for that argument, and `tools/place-reference.ts` for the reader.
 * Nothing here is written by hand, so nothing here can say a thing the engine does not do.
 */

import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js";

import { placeReference } from "./index";
import type { PlaceField, PlaceFunction, PlaceType } from "./types";
import type { InputController } from "../../player/input";
import "./place-docs.css";

/** How a field reads: its name, whether it may be left out, its type, and its sentence. */
const Field: Component<{ field: PlaceField }> = (props) => (
  <li class="place-docs-field">
    <code>
      {props.field.name}
      {props.field.optional ? "?" : ""}: {props.field.type}
    </code>
    <Show when={props.field.doc !== ""}>
      <span class="place-docs-note"> — {props.field.doc}</span>
    </Show>
  </li>
);

/** One function: what it is called, what it takes, what it gives back. */
const FunctionEntry: Component<{ fn: PlaceFunction }> = (props) => (
  <div class="place-docs-entry">
    <code class="place-docs-signature">
      {props.fn.name}
      {props.fn.signature}
    </code>
    <p class="place-docs-doc">{props.fn.doc}</p>
    <Show when={props.fn.params.length > 0}>
      <ul>
        <For each={props.fn.params}>{(param) => <Field field={param} />}</For>
      </ul>
    </Show>
    <Show when={props.fn.returns !== "void"}>
      <p class="place-docs-returns">returns {props.fn.returns}</p>
    </Show>
  </div>
);

/** One type: its fields, or the values a union admits, or the alias itself. */
const TypeEntry: Component<{ type: PlaceType }> = (props) => (
  <div class="place-docs-entry">
    <code class="place-docs-signature">{props.type.name}</code>
    <p class="place-docs-doc">{props.type.doc}</p>
    <Show when={props.type.union.length > 0}>
      <p class="place-docs-note">{props.type.union.join(" · ")}</p>
    </Show>
    <Show when={props.type.members.length > 0}>
      <ul>
        <For each={props.type.members}>
          {(member) => <Field field={member} />}
        </For>
      </ul>
    </Show>
    <For each={props.type.alternatives}>
      {(variant) => (
        <div class="place-docs-variant">
          <code>{variant.name}</code>
          <span class="place-docs-note"> — {variant.doc}</span>
          <ul>
            <For each={variant.members}>
              {(member) => <Field field={member} />}
            </For>
          </ul>
        </div>
      )}
    </For>
    <Show
      when={
        props.type.members.length === 0 &&
        props.type.union.length === 0 &&
        props.type.alternatives.length === 0 &&
        props.type.type !== ""
      }
    >
      <code class="place-docs-note">{props.type.type}</code>
    </Show>
  </div>
);

export interface PlaceDocsProps {
  readonly open: boolean;
  onClose(): void;
  /** The game's input, read only for the pointer lock the overlay has to release. */
  readonly input: InputController;
}

type Section = "functions" | "types" | "events" | "limits";

const SECTIONS: readonly { id: Section; label: string }[] = [
  { id: "functions", label: "functions" },
  { id: "types", label: "types" },
  { id: "events", label: "events" },
  { id: "limits", label: "limits" },
];

export const PlaceDocs: Component<PlaceDocsProps> = (props) => {
  const [section, setSection] = createSignal<Section>("functions");
  const [query, setQuery] = createSignal("");

  /** What the current section shows, filtered by the search field. */
  const functions = createMemo(() => {
    const needle = query().trim().toLowerCase();
    return placeReference.functions.filter(
      (fn) => needle === "" || fn.name.toLowerCase().includes(needle),
    );
  });
  const types = createMemo(() => {
    const needle = query().trim().toLowerCase();
    return placeReference.types.filter(
      (one) => needle === "" || one.name.toLowerCase().includes(needle),
    );
  });
  const events = createMemo(() => {
    const needle = query().trim().toLowerCase();
    return placeReference.events.filter(
      (one) => needle === "" || one.kind.toLowerCase().includes(needle),
    );
  });
  const limits = createMemo(() => {
    const needle = query().trim().toLowerCase();
    return placeReference.limits.filter(
      (one) => needle === "" || one.name.toLowerCase().includes(needle),
    );
  });

  // Releasing the pointer lock is what makes the panel usable: a locked pointer swallows every
  // scroll and click aimed anywhere but the crosshair.
  createEffect(
    () => (props.open ? props.input : null),
    (input) => (input === null ? undefined : input.suspendPointerLock()),
  );

  const controller = new AbortController();
  onCleanup(() => controller.abort());

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && props.open) {
        event.preventDefault();
        props.onClose();
      }
    },
    { signal: controller.signal },
  );

  return (
    <Show when={props.open}>
      <div
        class="place-docs-overlay"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div class="place-docs-panel">
          <div class="place-docs-header">
            <span class="place-docs-title">place reference</span>
            <button
              type="button"
              class="place-docs-close"
              aria-label="close"
              onClick={props.onClose}
            >
              ×
            </button>
          </div>

          <div class="place-docs-toolbar">
            <For each={SECTIONS}>
              {(entry) => (
                <button
                  type="button"
                  class={`place-docs-tab${
                    section() === entry.id ? " place-docs-tab-active" : ""
                  }`}
                  onClick={() => setSection(entry.id)}
                >
                  {entry.label}
                </button>
              )}
            </For>
            <input
              class="place-docs-search"
              type="text"
              placeholder="filter…"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          </div>

          <div class="place-docs-body">
            <Show when={section() === "functions"}>
              <For each={functions()}>{(fn) => <FunctionEntry fn={fn} />}</For>
            </Show>

            <Show when={section() === "types"}>
              <For each={types()}>{(one) => <TypeEntry type={one} />}</For>
            </Show>

            <Show when={section() === "events"}>
              <div class="place-docs-entry">
                <code class="place-docs-signature">every event carries</code>
                <ul>
                  <For each={placeReference.eventCommon}>
                    {(field) => <Field field={field} />}
                  </For>
                </ul>
              </div>
              <For each={events()}>
                {(event) => (
                  <div class="place-docs-entry">
                    <code class="place-docs-signature">{event.kind}</code>
                    <p class="place-docs-doc">{event.doc}</p>
                    <ul>
                      <For each={event.fields}>
                        {(field) => <Field field={field} />}
                      </For>
                    </ul>
                  </div>
                )}
              </For>
            </Show>

            <Show when={section() === "limits"}>
              <For each={limits()}>
                {(limit) => (
                  <div class="place-docs-entry">
                    <code class="place-docs-signature">
                      {limit.name} = {limit.value}
                    </code>
                    <p class="place-docs-doc">{limit.doc}</p>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
