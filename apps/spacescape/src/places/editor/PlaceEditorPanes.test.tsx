// @vitest-environment jsdom
/**
 * When the code panes rebuild, and when they must not.
 *
 * ## Why the CodeMirror is mocked
 *
 * **The package spawns a language worker and a real editor**, neither of which belongs in a test
 * about one reactive decision. The mock records each mount, so "the open document was replaced"
 * and "a keystroke's echo was left alone" become two counts rather than a DOM inspection.
 *
 * ## The bug this pins
 *
 * Opening a folder or a published place while the editor was open adopted a new project, but the
 * active CodeMirror kept showing the old source when the file name stayed the same. Closing and
 * reopening the panel fixed it because that unmounted everything. `revision` is the signal that
 * makes an external replacement do the same rebuild without making every keystroke do it.
 */

import { describe, expect, it, vi } from "vitest";
import { createSignal, flush, type Accessor } from "solid-js";
import { render } from "@solidjs/web";

const { mounts } = vi.hoisted(() => ({ mounts: [] as string[] }));

vi.mock("@big-mesh-studios/solid-codemirror", () => ({
  darkTheme: {},
  LSPProvider: (props: { children?: unknown }) => props.children,
  CodeMirror: (props: { path: string }) => {
    mounts.push(props.path);
    return null;
  },
}));

vi.mock("@big-mesh-studios/ui/activity", () => ({
  Activity: (props: { when: boolean; children?: unknown }) =>
    props.when ? props.children : null,
}));

import { PlaceEditorPanes } from "./PlaceEditorPanes";

/** The panel over two signals, so a test can change one prop at a time. */
const Harness = (props: {
  revision: Accessor<number>;
  files: Accessor<Record<string, string>>;
}) => (
  <PlaceEditorPanes
    files={props.files()}
    active="main.ts"
    revision={props.revision()}
    onActive={() => {}}
    onInput={() => {}}
  />
);

const mount = (): {
  revision: ReturnType<typeof createSignal<number>>;
  files: ReturnType<typeof createSignal<Record<string, string>>>;
  container: HTMLElement;
  dispose: () => void;
} => {
  mounts.length = 0;
  const revision = createSignal(1);
  const files = createSignal<Record<string, string>>({
    "main.ts": "export {};\n",
  });
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(
    () => <Harness revision={revision[0]} files={files[0]} />,
    container,
  );
  flush();
  return { revision, files, container, dispose };
};

describe("rebuilding the code panes", () => {
  it("rebuilds when the revision changes, so an adopted project replaces the source", () => {
    const { revision, container, dispose } = mount();

    expect(mounts).toEqual(["main.ts"]);

    revision[1](2);
    flush();

    expect(mounts).toEqual(["main.ts", "main.ts"]);

    dispose();
    container.remove();
  });

  it("does not rebuild when only the source changes, because that is the typing echo", () => {
    const { files, container, dispose } = mount();

    expect(mounts).toEqual(["main.ts"]);

    files[1]({ "main.ts": "export const edited = 1;\n" });
    flush();

    // **Still one mount.** The source reached the provider, but the editor under the caret was
    // not replaced; CodeMirror already holds the text the person typed.
    expect(mounts).toEqual(["main.ts"]);

    dispose();
    container.remove();
  });
});
