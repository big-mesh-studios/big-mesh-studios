/**
 * A development-only Vite config that mirrors the browser's console warnings and
 * errors into a JSONL file on disk.
 *
 * This exists so an agent can read the actual `[RMSL/scene]` warnings that a real
 * browser produces while the world renders. It wraps `console.warn`/`console.error`
 * before the application's own entry module runs, and POSTs each message to a tiny
 * dev-server middleware that appends it to `WARN_LOG`.
 *
 * Use it with:
 *   node_modules/.bin/vite --config tools/warn-log.vite.config.ts --host 0.0.0.0
 *
 * Delete it when the cleanup is done; nothing in the application imports it.
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Plugin, UserConfig } from "vite";

import base from "../vite.config";

const WARN_LOG =
  process.env.RMSL_WARN_LOG ??
  "/data/data/com.termux/files/usr/tmp/opencode/spacescape-warnings.jsonl";

/**
 * Runs in the page, in the `<head>`, before any application module. It must stay
 * dependency-free and must never throw into the page: a logging shim that breaks
 * the application is worse than the warnings it was meant to collect.
 */
const CLIENT_TAP = String.raw`
(() => {
  const ENDPOINT = "/__rmsl-warnings";
  const seen = new Map();
  const format = (value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack || value.name + ": " + value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const send = (payload) => {
    try {
      const body = JSON.stringify(payload);
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
      fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
    } catch {
      /* logging must never break the page */
    }
  };
  const emit = (level, message, stack) => {
    const key = level + "\u0000" + message;
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    // The first occurrence is the one with the useful stack. Later repeats are
    // counted and sent on page hide, so a per-frame warning cannot flood the log.
    if (count === 1) {
      send({
        time: new Date().toISOString(),
        level,
        message,
        stack: stack || null,
        repeats: 1,
        url: location.href,
      });
    }
  };
  for (const level of ["warn", "error"]) {
    const original = console[level];
    console[level] = function (...args) {
      try {
        emit(level, args.map(format).join(" "), new Error("console." + level).stack);
      } catch {
        /* ignore */
      }
      return original.apply(this, args);
    };
  }
  addEventListener("error", (event) => {
    emit("error", event.message, event.error && event.error.stack);
  });
  addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    emit("rejection", format(reason), reason && reason.stack);
  });
  addEventListener("pagehide", () => {
    const repeats = [];
    for (const [key, count] of seen) {
      if (count > 1) {
        const [level, message] = key.split("\u0000");
        repeats.push({ time: new Date().toISOString(), level, message, repeats: count });
      }
    }
    if (repeats.length) {
      try {
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([JSON.stringify({ repeats })], { type: "application/json" }),
        );
      } catch {
        /* ignore */
      }
    }
  });
})();
`;

function warnLogPlugin(): Plugin {
  return {
    name: "rmsl-warn-log",
    apply: "serve",

    configureServer(server) {
      mkdirSync(dirname(WARN_LOG), { recursive: true });
      writeFileSync(WARN_LOG, "");
      server.config.logger.info(`[rmsl-warn-log] writing browser warnings to ${WARN_LOG}`);

      server.middlewares.use("/__rmsl-warnings", (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) request.destroy();
        });
        request.on("end", () => {
          try {
            const payload = JSON.parse(body);
            if (Array.isArray(payload.repeats)) {
              for (const entry of payload.repeats) {
                appendFileSync(WARN_LOG, JSON.stringify(entry) + "\n");
              }
            } else {
              appendFileSync(WARN_LOG, JSON.stringify(payload) + "\n");
              if (typeof payload.message === "string" && payload.message.includes("[RMSL")) {
                server.config.logger.warn(
                  `[browser] ${payload.message}` +
                    (payload.stack ? `\n${payload.stack}` : ""),
                );
              }
            }
          } catch {
            /* malformed payloads are not worth failing the dev server over */
          }
          response.statusCode = 204;
          response.end();
        });
      });
    },

    transformIndexHtml() {
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: CLIENT_TAP,
          injectTo: "head-prepend" as const,
        },
      ];
    },
  };
}

const config: UserConfig = {
  ...base,
  plugins: [...(base.plugins ?? []), warnLogPlugin()],
};

export default config;
