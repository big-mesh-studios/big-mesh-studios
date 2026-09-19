import { expect, test } from "vitest";
import { ensureAnchor } from "./ensureAnchor";

test("ensureAnchor", () => {
  expect(ensureAnchor(/hi/, false)).toEqual(/(?:hi)$/);
  expect(ensureAnchor(/hi$/, false)).toEqual(/hi$/);
  expect(ensureAnchor(/hi$/, true)).toEqual(/^(?:hi$)/);
  expect(ensureAnchor(/^hi$/, true)).toEqual(/^hi$/);
});
