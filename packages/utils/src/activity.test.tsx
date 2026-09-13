// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/web";
import { createSignal, flush } from "solid-js";
import { Activity } from "./activity";

describe("Activity", () => {
  it("hides children with `display: none` instead of removing them from the DOM", () => {
    const host = document.createElement("div");
    const [when, setWhen] = createSignal(true);

    render(
      () => (
        <Activity when={when()}>
          <span class="content">hello</span>
        </Activity>
      ),
      host,
    );

    const wrapper = host.querySelector(".content")?.parentElement;
    expect(host.querySelector(".content")).not.toBeNull();
    expect(wrapper?.style.display).toBe("contents");

    setWhen(false);
    flush();
    // Still in the DOM — only hidden — unlike a `<Show>`, which would
    // unmount and remove it.
    expect(host.querySelector(".content")).not.toBeNull();
    expect(wrapper?.style.display).toBe("none");

    setWhen(true);
    flush();
    expect(wrapper?.style.display).toBe("contents");
  });

  it("never recreates the child element across a hide/show cycle", () => {
    const host = document.createElement("div");
    const [when, setWhen] = createSignal(true);
    let element!: HTMLDivElement;

    render(
      () => (
        <Activity when={when()}>
          <div class="pane" ref={(el) => (element = el)} />
        </Activity>
      ),
      host,
    );

    setWhen(false);
    flush();
    setWhen(true);
    flush();

    expect(host.querySelector(".pane")).toBe(element);
  });

  it("preserves component-local reactive state across a hide/show cycle", () => {
    const host = document.createElement("div");
    const [when, setWhen] = createSignal(true);
    const [count, setCount] = createSignal(0);

    render(
      () => (
        <Activity when={when()}>
          <span class="count">{count()}</span>
        </Activity>
      ),
      host,
    );

    setCount(3);
    flush();
    expect(host.querySelector(".count")?.textContent).toBe("3");

    setWhen(false);
    flush();
    setWhen(true);
    flush();

    // A `<Show>` toggle would have disposed and recreated this subtree,
    // resetting anything it owned — `count` itself lives outside Activity
    // here, but the DOM text it drove would still have been torn down and
    // rebuilt from scratch. It wasn't.
    expect(host.querySelector(".count")?.textContent).toBe("3");
  });

  it("picks up children that first render while already active", () => {
    const host = document.createElement("div");
    const [count, setCount] = createSignal(0);

    render(
      () => (
        <Activity when={true}>
          {count() > 0 ? <span class="content">{count()}</span> : null}
        </Activity>
      ),
      host,
    );

    expect(host.querySelector(".content")).toBeNull();

    setCount(1);
    flush();
    expect(host.querySelector(".content")?.textContent).toBe("1");
  });
});
