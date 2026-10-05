/**
 * Reads the `index.html` of each application that depends on this package and asserts the
 * `viewport` meta tag carries the tokens the rest of this package's CSS depends on.
 *
 * ## Why the scope is "apps that depend on this package"
 *
 * **Because the assertion is about a dependency, and only the consumers have it.** `baseline.css`
 * defines `--ui-safe-*` from `env(safe-area-inset-*)`, and those resolve to `0px` unless the
 * page's viewport meta tag says `viewport-fit=cover`. An application that never imports the
 * baseline has no safe-area rules to back, so it owes this package nothing — and its own entry
 * may not even be an `index.html` (a prerendered page has none).
 *
 * ## Why a test reads HTML
 *
 * **Because the dependency runs one way and nothing checks it.** There is no CSS
 * feature query that can detect the tag's absence: the browser simply letterboxes
 * and hands back zeroes, so the rules compile, apply, match, and do nothing.
 *
 * That is not a hypothetical failure. In the sibling monorepo, one application sets
 * `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)` and
 * `env(safe-area-inset-right)` on three separate selectors, and its `index.html` has
 * no `viewport-fit=cover` — **all three rules are dead, and the application has a
 * bottom sheet that a home indicator sits on top of.** Nothing reported it. The
 * declarations are correct; they are just never reached.
 *
 * So the assertion lives here, at the only place both halves are visible at once.
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APPS = fileURLToPath(new URL("../../../apps/", import.meta.url));

/**
 * The applications that depend on this package, and so consume its baseline.
 *
 * **Filtered by dependency rather than by scanning every directory.** An application that
 * does not import `@big-mesh-studios/ui` has no safe-area rules for a viewport tag to
 * keep alive, and may have no `index.html` at all.
 */
const appsUsingBaseline = async (): Promise<string[]> => {
  const entries = await readdir(APPS, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifest = await readFile(
      join(APPS, entry.name, "package.json"),
      "utf8",
    ).catch(() => null);
    if (manifest === null) continue;
    const dependency = (
      JSON.parse(manifest) as {
        dependencies?: Record<string, string>;
      }
    ).dependencies?.["@big-mesh-studios/ui"];
    if (dependency !== undefined) names.push(entry.name);
  }
  return names;
};

/** The `content` of the viewport meta tag, or null if there is not one. */
const viewportContent = async (html: string): Promise<string | null> => {
  const match = /<meta\s[^>]*name=["']viewport["'][^>]*>/i.exec(html);
  if (match === null) return null;
  const content = /content=["']([^"']*)["']/i.exec(match[0]);
  return content === null ? null : content[1];
};

describe("every application's viewport", () => {
  it("declares a viewport meta tag", async () => {
    const apps = await appsUsingBaseline();
    expect(
      apps.length,
      "no apps depend on @big-mesh-studios/ui — has the layout changed?",
    ).toBeGreaterThan(0);
    for (const name of apps) {
      const file = join(APPS, name, "index.html");
      const source = await readFile(file, "utf8").catch(() => null);
      expect(source, `${name}/index.html is missing`).not.toBeNull();
      expect(await viewportContent(source!), name).not.toBeNull();
    }
  });

  it("carries viewport-fit=cover, or the safe-area rules in the baseline are dead", async () => {
    // The pairing, asserted in the one place both halves can be seen. If an
    // application ever decides it wants letterboxing instead, this is the test to
    // delete — and deleting it should be a decision, not an oversight.
    for (const name of await appsUsingBaseline()) {
      const file = join(APPS, name, "index.html");
      const source = await readFile(file, "utf8").catch(() => null);
      if (source === null) continue;
      expect(
        await viewportContent(source),
        `${name} has no viewport-fit=cover, so --ui-safe-* resolves to 0px`,
      ).toContain("viewport-fit=cover");
    }
  });

  it("does not disable zoom unless the baseline raises its input font size", async () => {
    // `maximum-scale=1, user-scalable=no` is how the sibling's 3D editors rule out
    // iOS zooming the page when a small-font input takes focus. This repository's
    // applications are **deliberately zoomable**, so the baseline has to handle it
    // with `font-size: 16px` on inputs under a coarse pointer instead.
    //
    // The two are alternatives, not a menu: an application that pins
    // `maximum-scale=1` without needing to is overriding a user's accessibility
    // setting for no gain, and one that stays zoomable without the 16px rule zooms the
    // page in on its own command line.
    const baseline = await readFile(
      fileURLToPath(new URL("./baseline.css", import.meta.url)),
      "utf8",
    );
    const baselineZoomsSafely = /font-size:\s*16px/.test(baseline);
    expect(baselineZoomsSafely, "baseline.css lost its 16px input rule").toBe(
      true,
    );

    for (const name of await appsUsingBaseline()) {
      const source = await readFile(
        join(APPS, name, "index.html"),
        "utf8",
      ).catch(() => null);
      if (source === null) continue;
      const content = (await viewportContent(source)) ?? "";
      const pinsZoom =
        /maximum-scale\s*=\s*1(?!\.)/.test(content) ||
        /user-scalable\s*=\s*no/.test(content);
      if (pinsZoom) {
        // Allowed, but only if the baseline still has the rule — so removing the rule
        // and keeping the pin is what fails here, not the reverse.
        expect(baselineZoomsSafely, name).toBe(true);
      }
    }
  });
});
