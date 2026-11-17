/**
 * The client's half of the analysis seam, with a fake worker.
 *
 * A real `Worker` would instantiate three megabytes of wasm for a test about request
 * ordering; the fake records exactly what crossed and lets the test answer in whatever
 * order it likes. The artifact itself is tested in `packages/luau-runtime`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { LuauAnalysisClient } from "./luau-analysis";
import type {
  LuauAnalysisRequest,
  LuauAnalysisResponse,
} from "./luau-analysis-protocol";

class FakeWorker {
  onmessage: ((event: MessageEvent<LuauAnalysisResponse>) => void) | null =
    null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  readonly sent: LuauAnalysisRequest[] = [];
  terminated = false;

  postMessage(request: LuauAnalysisRequest): void {
    this.sent.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(response: LuauAnalysisResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<LuauAnalysisResponse>);
  }
}

const clientWith = (
  sources?: Readonly<Record<string, string>>,
  specifiers?: Readonly<Record<string, string>>,
): { client: LuauAnalysisClient; worker: FakeWorker } => {
  const worker = new FakeWorker();
  const client = new LuauAnalysisClient(() => worker as unknown as Worker);
  if (sources && specifiers) {
    client.configure(sources, specifiers);
  }
  return { client, worker };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("LuauAnalysisClient", () => {
  it("buffers sources and specifiers until the first completion", async () => {
    const { client, worker } = clientWith();
    client.configure({ "main.luau": "old" }, { "./door": "door.luau" });
    client.setSource("main.luau", "local d = require('./door')\nd.");

    // No worker and no wasm request yet: opening the editor is not a download.
    expect(worker.sent).toHaveLength(0);

    const result = client.complete({ path: "main.luau", line: 1, column: 2 });
    const configured = worker.sent[0];
    const asked = worker.sent[1];

    expect(configured).toMatchObject({
      kind: "configure",
      sources: { "main.luau": "local d = require('./door')\nd." },
      specifiers: { "./door": "door.luau" },
    });
    expect(asked).toMatchObject({
      kind: "complete",
      module: "main.luau",
      line: 1,
      column: 2,
    });

    worker.reply({
      id: (asked as { id: number }).id,
      kind: "items",
      items: [{ label: "door", kind: "variable" }],
    });

    await expect(result).resolves.toEqual([
      { label: "door", kind: "variable" },
    ]);
    client.dispose();
  });

  it("drops a superseded answer and resolves only the latest request", async () => {
    const { client, worker } = clientWith({ "main.luau": "t." }, {});

    const first = client.complete({ path: "main.luau", line: 0, column: 2 });
    const second = client.complete({ path: "main.luau", line: 0, column: 2 });

    const completions = worker.sent.filter(
      (request) => request.kind === "complete",
    );
    const firstId = (completions[0] as { id: number }).id;
    const secondId = (completions[1] as { id: number }).id;

    await expect(first).rejects.toThrow("superseded");

    worker.reply({
      id: firstId,
      kind: "items",
      items: [{ label: "stale", kind: "property" }],
    });
    worker.reply({
      id: secondId,
      kind: "items",
      items: [{ label: "fresh", kind: "property" }],
    });

    await expect(second).resolves.toEqual([
      { label: "fresh", kind: "property" },
    ]);
    client.dispose();
  });

  it("marks analysis dead after a worker error and stops posting", async () => {
    const { client, worker } = clientWith({ "main.luau": "t." }, {});

    const pending = client.complete({ path: "main.luau", line: 0, column: 2 });
    worker.onerror?.({ message: "boom" } as ErrorEvent);

    await expect(pending).rejects.toThrow("superseded");
    expect(worker.terminated).toBe(true);

    const posted = worker.sent.length;
    await expect(
      client.complete({ path: "main.luau", line: 0, column: 2 }),
    ).rejects.toThrow("unavailable");
    expect(worker.sent).toHaveLength(posted);
  });

  it("marks the worker dead when the artifact itself could not start", async () => {
    const { client, worker } = clientWith({ "main.luau": "t." }, {});

    const pending = client.complete({ path: "main.luau", line: 0, column: 2 });
    const id = (
      worker.sent.find((request) => request.kind === "complete") as {
        id: number;
      }
    ).id;

    worker.reply({
      id,
      kind: "error",
      message: "analysis artifact failed to load",
      fatal: true,
    });

    await expect(pending).rejects.toThrow("artifact failed to load");
    expect(worker.terminated).toBe(true);
    await expect(
      client.complete({ path: "main.luau", line: 0, column: 2 }),
    ).rejects.toThrow("unavailable");
  });

  it("times out and kills the worker after two consecutive misses", async () => {
    vi.useFakeTimers();
    const { client, worker } = clientWith({ "main.luau": "t." }, {});

    const first = client.complete({ path: "main.luau", line: 0, column: 2 });
    vi.advanceTimersByTime(1500);
    await expect(first).rejects.toThrow("timed out");
    expect(worker.terminated).toBe(false);

    const second = client.complete({ path: "main.luau", line: 0, column: 2 });
    vi.advanceTimersByTime(1500);
    await expect(second).rejects.toThrow("timed out");
    expect(worker.terminated).toBe(true);
  });

  it("exposes the bundler's specifier spellings", () => {
    const { client } = clientWith(
      {},
      { "./door": "door.luau", spacescape: "spacescape" },
    );

    expect(client.specifiers()).toEqual(["./door", "spacescape"]);
    client.dispose();
  });
});
