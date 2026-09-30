// The published-place catalog: an overlay that lists the places a player can
// enter, opened by a place script's `catalog` effect or by the HUD's Places
// button and the B key. Opened with no account named — which is how the
// arcade's prompt opens it — it lists every place the public relay says an
// account holds; named with one, it lists that account's own. Either way the
// list is read straight from those accounts over atproto, and playing a place
// points the world at its `/<account>/<rkey>` address, the same route
// `place:join` walks.
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { isEditableTarget } from "../utils";
import type { PlaceListing, PublishedPlace } from "../places/place";
import styles from "./PlacesBrowser.module.css";

/** Places drawn before the rest wait behind "Show more", so the overlay's markup stays the size of one screen however many places there are. */
const PAGE_SIZE = 25;

/**
 * The last network-wide listing, kept for the life of the page: the catalog
 * asks for the whole network every time the lobby's arcade opens it, and a
 * listing's answer changes only when somebody publishes.
 */
let everyoneCache: PlaceListing | null = null;

/**
 * One place in the catalog: what it is called, which account published it, its
 * mode and how many scripts it ships, and the button that plays it. The account
 * is shown as the handle its own DID document claims, or as the account's
 * identifier when it has no handle that could be confirmed.
 */
const PlaceRow: Component<{
  place: PublishedPlace;
  onPlay(place: PublishedPlace): void;
}> = (props) => {
  const { placeEditor } = useVoxelscape();
  const [account, setAccount] = createSignal(props.place.repo);
  createEffect(
    () => props.place.repo,
    (repo) => {
      void placeEditor.resolveHandle(repo).then(setAccount);
    },
  );
  const scripts = (): string => {
    const count = props.place.record.scripts.length;
    return `${count} script${count === 1 ? "" : "s"}`;
  };
  return (
    <div class={styles.row}>
      <div class={styles.info}>
        <span class={styles.name}>{props.place.record.name}</span>
        <span class={styles.meta}>
          {account()}
          {props.place.record.mode !== undefined
            ? ` · ${props.place.record.mode}`
            : ""}
          {` · ${scripts()}`}
        </span>
      </div>
      <button
        class={styles.play}
        onClick={() => props.onPlay(props.place)}
        aria-label={`Play ${props.place.record.name}`}
      >
        Play
      </button>
    </div>
  );
};

export const PlacesBrowser: Component = () => {
  const { catalog, input, openCatalog, closeCatalog, placeEditor } =
    useVoxelscape();
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

  // Each time the catalog opens, seed the search field with what the opener
  // asked for and clear the previous list, so a panel from the arcade never
  // shows the search someone else made before it. An opener that named no
  // account is answered with the whole network instead of an empty field.
  createEffect(
    () => catalog(),
    (open) => {
      if (open === null) {
        return;
      }
      setQuery(open.query);
      setPlaces([]);
      setSearched(false);
      setError(null);
      if (open.query === "") {
        void listEveryone();
        return;
      }
      setEverywhere(false);
    },
  );

  createEffect(catalog, (open) => {
    if (open !== null) {
      return input.suspendPointerLock();
    }
  });

  /** Lists every published place, from the last listing when this page already has one. */
  const listEveryone = async (): Promise<void> => {
    setEverywhere(true);
    setSearching(true);
    setError(null);
    try {
      const listing = everyoneCache ?? (await placeEditor.places.listAll());
      everyoneCache ??= listing;
      setCapped(listing.capped);
      setPlaces(listing.places);
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
      setPlaces(await placeEditor.places.list(who));
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSearching(false);
    }
  };

  /** Points the address bar at `place`, whose route joins it the way a typed join does. */
  const play = async (place: PublishedPlace): Promise<void> => {
    closeCatalog();
    const handle = await placeEditor.resolveHandle(place.repo);
    window.location.hash = `#/${handle}/${place.rkey}`;
  };

  const handleKey = (e: KeyboardEvent): void => {
    if (isEditableTarget(e)) return;
    if (e.code === "KeyB") {
      if (catalog() === null) {
        openCatalog();
      } else {
        closeCatalog();
      }
      e.preventDefault();
    } else if (e.code === "Escape" && catalog() !== null) {
      closeCatalog();
      e.preventDefault();
    }
  };
  const handleToggle = (): void => {
    if (catalog() === null) {
      openCatalog();
    } else {
      closeCatalog();
    }
  };
  window.addEventListener("keydown", handleKey);
  window.addEventListener("toggle-catalog", handleToggle);
  onCleanup(() => {
    window.removeEventListener("keydown", handleKey);
    window.removeEventListener("toggle-catalog", handleToggle);
  });

  return (
    <Show when={catalog() !== null}>
      <div
        class={styles.overlay}
        // Closing on a pointer press rather than a click: a touch that opens
        // the catalog also synthesizes a compatibility click a moment later at
        // the same spot, which would land on this overlay and shut it again.
        // That click is not a pointer event, so a press is safe to act on.
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            closeCatalog();
          }
        }}
      >
        <div
          class={styles.panel}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div class={styles.header}>
            <span class={styles.title}>Places</span>
            <button
              class={styles.close}
              onClick={closeCatalog}
              aria-label="Close places"
            >
              ✕
            </button>
          </div>

          <div class={styles.search}>
            <input
              class={styles.field}
              type="text"
              placeholder="account handle or id…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void search();
                }
              }}
            />
            <button class={styles["search-btn"]} onClick={() => void search()}>
              Search
            </button>
          </div>
          <Show when={placeEditor.accountDid !== null}>
            <button
              class={styles.mine}
              onClick={() => {
                setQuery(placeEditor.accountDid!);
                void search();
              }}
            >
              My places
            </button>
          </Show>

          <div class={styles.body}>
            <Show when={error() !== null}>
              <p class={styles.error}>{error()}</p>
            </Show>
            <Show when={searching()}>
              <p class={styles.help}>searching…</p>
            </Show>
            <Show when={everywhere() && !searching() && places().length > 0}>
              <p class={styles.summary}>
                <span>
                  {capped() ? "the first" : "all"} {places().length} place
                  {places().length === 1 ? "" : "s"}, from {accounts()} account
                  {accounts() === 1 ? "" : "s"}
                </span>
                <button
                  class={styles.refresh}
                  onClick={() => {
                    everyoneCache = null;
                    void listEveryone();
                  }}
                >
                  Refresh
                </button>
              </p>
            </Show>
            <Show when={!searching() && searched() && places().length > 0}>
              <For each={visible()}>
                {(place) => (
                  <PlaceRow place={place} onPlay={(p) => void play(p)} />
                )}
              </For>
              <Show when={places().length > shown()}>
                <button
                  class={styles.more}
                  onClick={() => setShown(shown() + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, places().length - shown())} more
                </button>
              </Show>
            </Show>
            <Show when={!searching() && searched() && places().length === 0}>
              <p class={styles.help}>
                {everywhere()
                  ? "nobody has published a place yet"
                  : "no places published under that account"}
              </p>
            </Show>
          </div>

          <div class={styles.help}>Press B to open or close · Esc to close</div>
        </div>
      </div>
    </Show>
  );
};
