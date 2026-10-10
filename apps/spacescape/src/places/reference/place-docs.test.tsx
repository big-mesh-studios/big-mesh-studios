// @vitest-environment jsdom

/**
 * The reference panel as a mounted component, over the committed drawing.
 *
 * What is being tested is the markup rather than the data: the drawing holds every function's name,
 * and the panel is the only thing that decides whether a reader is shown it. A signature reads as
 * `(id: string, delayMs: number): void` on its own, and forty-eight of those in a row is a list of
 * calls with nothing saying which function each one belongs to — which is how the panel read before
 * the name was printed beside the signature.
 *
 * The panel is mounted with a real `InputController` because opening it suspends the pointer lock,
 * and nothing here asserts on geometry: jsdom has no layout, and where the panel sits is the
 * stylesheet's claim.
 */

import { flush } from "solid-js";
import { render } from "@solidjs/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createInput, type InputController } from "../../player/input";
import { PlaceDocs } from "./PlaceDocs";
import { placeReference } from "./index";

let root: HTMLDivElement | undefined;
let input: InputController | undefined;
let unmount: (() => void) | undefined;

beforeEach(() => {
  input = createInput();
  root = document.createElement("div");
  document.body.append(root);
  unmount = render(
    () => <PlaceDocs open={true} onClose={() => {}} input={input!} />,
    root,
  );
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  root?.remove();
  root = undefined;
  input?.dispose();
  input = undefined;
});

/** The signature line of every entry the functions tab is showing. */
const signatures = (): string[] =>
  [...root!.querySelectorAll(".place-docs-entry .place-docs-signature")].map(
    (element) => element.textContent ?? "",
  );

describe("the place reference panel", () => {
  it("names every function beside its signature", () => {
    // **The claim the panel exists to make good on.** A function a reader cannot name is a function
    // they cannot call, and the drawing has held the names all along — the panel was printing the
    // signature alone and dropping them.
    const shown = signatures();
    expect(shown).toHaveLength(placeReference.functions.length);
    for (const fn of placeReference.functions) {
      expect(shown).toContain(`${fn.name}${fn.signature}`);
    }
  });

  it("prints a name and a signature that read as one call", () => {
    // **The generic case, which is the one a naive `name + " " + signature` gets wrong.** `choice`
    // takes a type parameter between its name and its parameters, so a space would print a call that
    // does not typecheck.
    const choice = placeReference.functions.find((fn) => fn.name === "choice");
    expect(choice?.signature.startsWith("<T>")).toBe(true);
    expect(signatures()).toContain(`choice${choice?.signature}`);
  });

  it("names every type, event, and limit it shows", () => {
    // **The other three sections, which get their heading from the same field and are worth holding
    // to the same claim.** Types show `name`, events show `kind`, and limits show `name = value`.
    const tab = (label: string): void => {
      const button = [...root!.querySelectorAll("button")].find(
        (one) => one.textContent === label,
      );
      button?.click();
      // A setter's value reaches the DOM after a microtask flush rather than synchronously.
      flush();
    };

    tab("types");
    expect(signatures()).toEqual(placeReference.types.map((one) => one.name));

    tab("events");
    expect(signatures()).toContain("player-joined");
    for (const event of placeReference.events) {
      expect(signatures()).toContain(event.kind);
    }

    tab("limits");
    expect(signatures()).toEqual(
      placeReference.limits.map((one) => `${one.name} = ${one.value}`),
    );
  });
});
