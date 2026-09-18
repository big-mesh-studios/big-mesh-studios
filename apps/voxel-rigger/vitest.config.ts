import { defineConfig } from "vitest/config";

// The test run is kept separate from the application build: the tests are pure
// maths and never mount a component, so they neither need the Solid plugin nor
// the browser environment it pulls in.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
