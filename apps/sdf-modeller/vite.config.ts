import { appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import solid from "vite-plugin-solid";

/**
 * Where the paint diagnostics land.
 *
 * **Inside the app directory rather than `/tmp`,** because the file is meant to be read by
 * something other than the machine that wrote it, and a path outside the repository is one
 * nobody thinks to look for.
 */
const LOG_FILE = resolve(import.meta.dirname, "paint-log.jsonl");

/**
 * A dev-server endpoint the running app posts diagnostics to.
 *
 * ## Why this exists
 *
 * **Because a browser is the only place the paint path can be watched end to end, and the
 * person holding the phone cannot read a console.** Four rounds of this work went wrong in the
 * same way: something in the paint chain silently did nothing, the app looked inert, and the
 * only evidence was gone by the time anyone could look. Every hypothesis was checked against
 * the source instead of against the thing, and one of them — a brush raycasting the viewport
 * mesh — was two lines away from the version of the code that worked.
 *
 * So the app says what it is doing, to a file, and the file is read after the fact. That is not
 * a logging framework; it is a post box.
 *
 * ## Why it is dev-only
 *
 * **Because it writes a file and accepts anything anyone sends it.** Neither belongs in a
 * build. `apply: "serve"` is what scopes the plugin to the dev server, so a production bundle
 * has no route to it at all.
 *
 * ## Why JSON lines
 *
 * **Because it is appended to and read by tail.** One object per line means a run can be read
 * as it happens, and a line that is half-written is a line that is obviously incomplete rather
 * than a truncated document.
 */
const paintLog = (): Plugin => ({
  name: "sdf-modeller-paint-log",
  apply: "serve",
  configureServer(server) {
    // **Truncated on start.** Otherwise every run appends to the last, and "the log" is every
    // log anybody has ever produced, which is the opposite of readable.
    writeFileSync(LOG_FILE, "");

    server.middlewares.use("/__paint-log", (request, response, next) => {
      if (request.method === "GET") {
        // **A read endpoint as well as a write one,** so the whole run can be fetched from the
        // phone rather than only appended to from it.
        response.setHeader("content-type", "application/x-ndjson");
        response.end(
          `["${LOG_FILE.replace(/\\/g, "\\\\")}",` + `{"file":"${LOG_FILE}"}]`,
        );
        return;
      }
      if (request.method !== "POST") {
        next();
        return;
      }
      let body = "";
      request.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        try {
          // **A timestamp the run did not supply**, because the browser's clock is the one thing
          // here that cannot be trusted to compare against anything.
          appendFileSync(
            LOG_FILE,
            `${JSON.stringify({ at: new Date().toISOString(), ...JSON.parse(body) })}\n`,
          );
        } catch {
          // **A malformed line is still worth a line**, because "the app posted something the
          // server could not read" is itself the finding.
          appendFileSync(
            LOG_FILE,
            `${JSON.stringify({ at: new Date().toISOString(), bad: body.slice(0, 200) })}\n`,
          );
        }
        response.statusCode = 204;
        response.end();
      });
    });
  },
});

/**
 * A relative base, for the same reason as the other application: the built site is
 * served from a subdirectory on GitHub Pages and on any other static host, and a request
 * for `/assets/...` against a page at `/sdf-modeller/` is a 404 that no amount of
 * correctness elsewhere will fix.
 */
export default defineConfig({
  base: "./",

  plugins: [
    solid({
      ssr: false,
      // `include` narrows the plugin to the extensions that can hold JSX. Without it the
      // Solid compiler — a native binary with a WebAssembly fallback where there is no
      // binary for the platform — loads on the first transform of *any* file, which is
      // a thirty-megabyte dependency to start a test run that touches no JSX.
      include: /\.[jt]sx$/,
    }),
    paintLog(),
  ],

  server: {
    // A browser resolves `localhost` to `::1` first and Vite binds `::1` only when asked,
    // so naming the IPv4 address avoids the connection-refused a first run otherwise
    // spends its time on.
    host: "127.0.0.1",
  },

  optimizeDeps: {
    // **Only this application's own entry is scanned.** In a workspace the default
    // crawler walks the source of every app in the repository and fails on the
    // dependencies of any of them that are not installed here.
    entries: ["index.html"],
    include: ["@solidjs/signals"],
  },

  test: {
    // Node by default; a test that needs a DOM asks for one with a
    // `// @vitest-environment jsdom` comment at the top of its own file.
    environment: "node",
  },
});
