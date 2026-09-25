// The published-place catalog: an overlay that lists every place one account
// has published, opened by a place script's `catalog` effect or by the HUD's
// Places button and the B key. The player names an account by handle or id,
// the list is read straight from that account's repository over atproto, and
// playing a place points the world at its `/<account>/<rkey>` address, the
// same route `place:join` walks.
import {
  Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { useVoxelscape } from "../voxelscape/voxelscape-context";
import { isEditableTarget } from "../utils";
import type { PublishedPlace } from "../places/place";
import styles from "./PlacesBrowser.module.css";

export const PlacesBrowser: Component = () => {
  const { catalog, input, openCatalog, closeCatalog, placeEditor } =
    useVoxelscape();
  const [query, setQuery] = createSignal("");
  const [places, setPlaces] = createSignal<PublishedPlace[]>([]);
  const [searched, setSearched] = createSignal(false);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Each time the catalog opens, seed the search field with what the opener
  // asked for and clear the previous list, so a panel from the arcade never
  // shows the search someone else made before it.
  createEffect(
    () => catalog(),
    (open) => {
      if (open !== null) {
        setQuery(open.query);
        setPlaces([]);
        setSearched(false);
        setError(null);
      }
    },
  );

  createEffect(catalog, (open) => {
    if (open !== null) {
      return input.suspendPointerLock();
    }
  });

  const search = async (): Promise<void> => {
    const who = query().trim();
    if (who === "") {
      setError("name an account by handle or id to list their places");
      return;
    }
    setSearching(true);
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
  const play = (place: PublishedPlace): void => {
    closeCatalog();
    window.location.hash = `#/${query().trim()}/${place.rkey}`;
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
            <Show when={!searching() && searched() && places().length > 0}>
              <For each={places()}>
                {(place) => (
                  <div class={styles.row}>
                    <div class={styles.info}>
                      <span class={styles.name}>{place.record.name}</span>
                      <span class={styles.meta}>
                        {place.record.mode !== undefined && place.record.mode}
                        {place.record.mode !== undefined ? " · " : ""}
                        {place.record.scripts.length} script
                        {place.record.scripts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      class={styles.play}
                      onClick={() => play(place)}
                      aria-label={`Play ${place.record.name}`}
                    >
                      Play
                    </button>
                  </div>
                )}
              </For>
            </Show>
            <Show when={!searching() && searched() && places().length === 0}>
              <p class={styles.help}>no places published under that account</p>
            </Show>
          </div>

          <div class={styles.help}>Press B to open or close · Esc to close</div>
        </div>
      </div>
    </Show>
  );
};
