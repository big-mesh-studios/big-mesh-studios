/**
 * The published-place catalog: an overlay listing the places a person can load.
 *
 * ## Ported from `apps/voxelscape/src/ui/PlacesBrowser.tsx`, and adapted
 *
 * The sibling's version is opened by a place *script* (`catalog`) or a key, names an account
 * optionally, and walks a `#/<handle>/<rkey>` route to join one. This engine has no router and no
 * scripted UI, so it is opened by `/place:browse` and *loads* a place directly — the same path
 * `/place:load at://…` takes. What is carried over is the shape of the thing: the search field that
 * is either an account or the whole network, the "My places" shortcut, paging, and the
 * `capped() ? "the first" : "all"` honesty about a listing that stopped at a ceiling.
 *
 * ## Why it can list the whole network before anybody signs in
 *
 * **A published place is public** (ADR 0044), so the read path here takes no account and no token —
 * `PlaceLibrary` builds a plain client against whatever server a DID's document names. Only the
 * "My places" shortcut needs to know who is signed in, and it is hidden when nobody is.
 *
 * ## The listing is cached for the life of the page
 *
 * A network-wide listing reads up to two hundred accounts, and its answer changes only when somebody
 * publishes. Asking again every time the overlay opens would spend a great deal of the network's
 * patience to redraw the same list, so the last answer is kept until Refresh is pressed.
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

import type { PlaceListing, PublishedPlace } from "../place-record";
import type { PlaceLibrary } from "../../atproto/places";
import type { InputController } from "../../player/input";
import "./places-browser.css";

/** Places drawn before the rest wait behind "Show more", so the overlay stays one screen tall. */
const PAGE_SIZE = 25;

/**
 * The last network-wide listing, kept for the life of the page: the overlay asks for the whole
 * network every time it opens, and the answer changes only when somebody publishes.
 */
let everyoneCache: PlaceListing | null = null;

/** One place: what it is called, who published it, how many scripts it ships, and a way in. */
const PlaceRow: Component<{
  place: PublishedPlace;
  resolveHandle(did: string): Promise<string>;
  onPlay(place: PublishedPlace): void;
}> = (props) => {
  const [account, setAccount] = createSignal(props.place.repo);
  createEffect(
    () => props.place.repo,
    (repo) => {
      void props.resolveHandle(repo).then(setAccount);
    },
  );

  const scripts = (): string => {
    const count = props.place.record.scripts.length;
    return `${count} script${count === 1 ? "" : "s"}`;
  };

  return (
    <div class="place-browser-row">
      <div class="place-browser-info">
        <span class="place-browser-name">{props.place.record.name}</span>
        <span class="place-browser-meta">
          {account()} · {scripts()}
        </span>
      </div>
      <button
        type="button"
        class="place-browser-play"
        aria-label={`Load ${props.place.record.name}`}
        onClick={() => props.onPlay(props.place)}
      >
        load
      </button>
    </div>
  );
};

export interface PlacesBrowserProps {
  readonly open: boolean;
  onClose(): void;
  readonly library: PlaceLibrary;
  /** The signed-in account's DID for the "mine" shortcut, or null when nobody is signed in. */
  readonly accountDid: string | null;
  resolveHandle(did: string): Promise<string>;
  /** Loads `place`. The overlay closes itself first, so the world is not hidden by its own panel. */
  onPlay(place: PublishedPlace): void | Promise<void>;
  /** The game's input, read only for the pointer lock the overlay has to release. */
  readonly input: InputController;
}

export const PlacesBrowser: Component<PlacesBrowserProps> = (props) => {
  const [query, setQuery] = createSignal("");
  const [places, setPlaces] = createSignal<PublishedPlace[]>([]);
  const [searched, setSearched] = createSignal(false);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  /** Whether the places on show are every account's, rather than one the search field names. */
  const [everywhere, setEverywhere] = createSignal(false);
  /** Whether the last network-wide listing stopped at a ceiling with places left out. */
  const [capped, setCapped] = createSignal(false);
  /** How many of the places found are on show. */
  const [shown, setShown] = createSignal(PAGE_SIZE);
  const visible = createMemo(() => places().slice(0, shown()));
  const accounts = createMemo(
    () => new Set(places().map((place) => place.repo)).size,
  );

  // A list that has just arrived is shown from its first page again.
  createEffect(places, () => {
    setShown(PAGE_SIZE);
  });

  // **Opening asks for the whole network straight away**, because the common case is somebody who
  // does not yet know an account to search for — an empty overlay with a search field would be a
  // catalog with nothing in it.
  createEffect(
    () => props.open,
    (open) => {
      if (!open) return;
      void listEveryone();
    },
  );

  // Releasing the pointer lock is what makes the overlay usable at all: a locked pointer swallows
  // every click aimed anywhere but the crosshair, which includes a "load" button.
  createEffect(
    () => (props.open ? props.input : null),
    (input) => (input === null ? undefined : input.suspendPointerLock()),
  );

  const listEveryone = async (): Promise<void> => {
    setEverywhere(true);
    setSearching(true);
    setError(null);
    try {
      const listing = everyoneCache ?? (await props.library.listAll());
      everyoneCache ??= listing;
      setCapped(listing.capped);
      setPlaces([...listing.places]);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSearching(false);
    }
  };

  const search = async (): Promise<void> => {
    const who = query().trim();
    if (who === "") {
      setError("name an account by handle or id to list their places");
      return;
    }
    setSearching(true);
    setEverywhere(false);
    setPlaces([]);
    setSearched(false);
    setError(null);
    try {
      setPlaces(await props.library.list(who));
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSearching(false);
    }
  };

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
        class="place-browser-overlay"
        // **Closing on a pointer press rather than a click.** A touch that opens the overlay also
        // synthesizes a compatibility click a moment later at the same spot, which would land here
        // and shut it again; that click is not a pointer event, so a press is safe to act on.
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div class="place-browser-panel">
          <div class="place-browser-header">
            <span class="place-browser-title">published places</span>
            <button
              type="button"
              class="place-browser-close"
              aria-label="close"
              onClick={props.onClose}
            >
              ×
            </button>
          </div>

          <div class="place-browser-search">
            <input
              class="place-browser-field"
              type="text"
              placeholder="account handle or id…"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void search();
                }
              }}
            />
            <button
              type="button"
              class="place-browser-search-btn"
              onClick={() => void search()}
            >
              search
            </button>
            <Show when={props.accountDid !== null}>
              <button
                type="button"
                class="place-browser-mine"
                onClick={() => {
                  setQuery(props.accountDid ?? "");
                  void search();
                }}
              >
                mine
              </button>
            </Show>
          </div>

          <div class="place-browser-body">
            <Show when={error() !== null}>
              <p class="place-browser-error">{error()}</p>
            </Show>
            <Show when={searching()}>
              <p class="place-browser-help">searching…</p>
            </Show>
            <Show when={everywhere() && !searching() && places().length > 0}>
              <p class="place-browser-summary">
                <span>
                  {capped() ? "the first" : "all"} {places().length} place
                  {places().length === 1 ? "" : "s"}, from {accounts()} account
                  {accounts() === 1 ? "" : "s"}
                </span>
                {/* **Refresh is the only way to ask again**, because the listing is cached: a
                    catalog that re-read two hundred accounts every time it opened would spend the
                    network's patience redrawing a list that only changes when somebody publishes. */}
                <button
                  type="button"
                  class="place-browser-refresh"
                  onClick={() => {
                    everyoneCache = null;
                    void listEveryone();
                  }}
                >
                  refresh
                </button>
              </p>
            </Show>
            <Show when={!searching() && searched() && places().length > 0}>
              <For each={visible()}>
                {(place) => (
                  <PlaceRow
                    place={place}
                    resolveHandle={props.resolveHandle}
                    onPlay={(chosen) => {
                      props.onClose();
                      void props.onPlay(chosen);
                    }}
                  />
                )}
              </For>
              <Show when={places().length > shown()}>
                <button
                  type="button"
                  class="place-browser-more"
                  onClick={() => setShown(shown() + PAGE_SIZE)}
                >
                  show {Math.min(PAGE_SIZE, places().length - shown())} more
                </button>
              </Show>
            </Show>
            <Show when={!searching() && searched() && places().length === 0}>
              <p class="place-browser-help">
                {everywhere()
                  ? "nothing is published yet"
                  : "no places published under that account"}
              </p>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
