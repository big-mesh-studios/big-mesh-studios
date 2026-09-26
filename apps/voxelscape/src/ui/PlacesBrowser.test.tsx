// @vitest-environment jsdom
import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/web";
import { describe, expect, it, vi } from "vitest";
import type { Voxelscape } from "../voxelscape/create-voxelscape";
import {
  PLACE_COLLECTION,
  type PlaceListing,
  type PlaceRecord,
  type PublishedPlace,
} from "../places/place";

const DID = "did:plc:mesamaker";

const place = (name: string, repo = DID): PublishedPlace => {
  const record: PlaceRecord = {
    $type: PLACE_COLLECTION,
    name,
    seed: 12_345,
    spawn: [128, 0, -64],
    createdAt: "2026-09-05T00:00:00.000Z",
    scripts: [],
    models: [],
  };
  return { repo, rkey: name.toLowerCase().replace(/\s+/g, "-"), record };
};

/**
 * The catalog drawn over a world that answers `listing`, begun with `query`.
 * The module is loaded afresh because the last network-wide listing is kept
 * for the life of the page, and one listing is not the next test's.
 */
const openOver = async (query: string, listing: PlaceListing) => {
  vi.resetModules();
  const { PlacesBrowser } = await import("./PlacesBrowser");
  const { VoxelscapeContext } =
    await import("../voxelscape/voxelscape-context");
  const closeCatalog = vi.fn();
  const [catalog] = createSignal<{ query: string } | null>({ query });
  const world = {
    catalog,
    closeCatalog,
    openCatalog: vi.fn(),
    input: { suspendPointerLock: () => () => {} },
    placeEditor: {
      accountDid: null,
      resolveHandle: async (did: string) => `handle.of.${did.slice(-4)}`,
      places: {
        list: async () => [],
        listAll: async () => listing,
      },
    },
  } as unknown as Voxelscape;
  const host = document.createElement("div");
  document.body.append(host);
  render(
    () => (
      <VoxelscapeContext value={world}>
        <PlacesBrowser />
      </VoxelscapeContext>
    ),
    host,
  );
  // A row's account label arrives a microtask after the row does: the handle
  // it shows is read from the identity service rather than carried in the
  // listing, so give that promise a turn before reading the overlay.
  await new Promise((resolve) => setTimeout(resolve, 0));
  flush();
  return { host, closeCatalog };
};

/** The buttons drawn for the places on show, by the label each one carries. */
const playButtons = (host: HTMLElement): string[] =>
  [...host.querySelectorAll<HTMLElement>('[aria-label^="Play"]')].map(
    (button) => button.getAttribute("aria-label") ?? "",
  );

/** The button whose own text is `label`. */
const button = (host: HTMLElement, label: string): HTMLElement => {
  const found = [...host.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (found === undefined) {
    throw new Error(`no button reading "${label}" among ${host.textContent}`);
  }
  return found;
};

describe("the place catalog", () => {
  it("draws the network's places, each labelled with the account that published it", async () => {
    const { host } = await openOver("", {
      places: [place("The Haunted Mesa"), place("An Apple Orchard")],
      capped: false,
    });

    const text = host.textContent ?? "";
    expect(text).toContain("The Haunted Mesa");
    expect(text).toContain("An Apple Orchard");
    expect(text).toContain(`handle.of.${DID.slice(-4)}`);
    expect(text).toContain("all 2 places, from 1 account");
    expect(text).not.toContain("searching");
  });

  it("keeps answering its own buttons after a listing arrives", async () => {
    const { host, closeCatalog } = await openOver("", {
      places: [place("The Haunted Mesa")],
      capped: false,
    });

    host.querySelector<HTMLElement>('[aria-label="Close places"]')!.click();
    flush();

    expect(closeCatalog).toHaveBeenCalled();
  });

  it("says a listing that stopped at a ceiling is the first of them", async () => {
    const { host } = await openOver("", {
      places: [place("The Haunted Mesa")],
      capped: true,
    });

    expect(host.textContent).toContain("the first 1 place, from 1 account");
  });

  it("shows one page of rows at a time, and the rest behind a button", async () => {
    const many = Array.from({ length: 30 }, (_, i) => place(`Mesa ${i}`));
    const { host } = await openOver("", { places: many, capped: true });

    expect(playButtons(host)).toHaveLength(25);
    expect(button(host, "Show 5 more")).toBeDefined();

    button(host, "Show 5 more").click();
    flush();

    expect(playButtons(host)).toHaveLength(30);
    expect(host.textContent).not.toContain("Show 5 more");
  });

  it("starts an account-seeded catalog on that account's field, not on the network", async () => {
    const { host } = await openOver("mesa.example", {
      places: [],
      capped: false,
    });

    const field = host.querySelector<HTMLInputElement>("input")!;
    expect(field.value).toBe("mesa.example");
    // Nothing is listed and nothing is asked for: the player presses Search.
    expect(playButtons(host)).toHaveLength(0);
    expect(host.textContent).not.toContain("from 1 account");
  });
});
