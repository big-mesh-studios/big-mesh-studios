// A small simulator driving a population of `PlayerSim`s under vitest's fake
// timers: it starts every player, steps the whole population forward (each
// player's controller `tick` plus the fake-clock timers that drive presence,
// discovery, and handshake polling), and offers graph analysis over the live
// connections so the harness can assert on mesh topology.
import { vi } from "vitest";
import { CLUSTER_DEFAULTS } from "../roster";
import type { ClusterOptions } from "../roster";
import { AtprotoHarness } from "./atproto-harness";
import { createPlayerSim, type PlayerSim } from "./player";
import { TransportHarness } from "./transport-harness";

/** A deterministic PRNG, so placements and tests are reproducible. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface SimulatorOptions {
  /** Where each player starts: index i's { x, z }. */
  placements: Array<{ x: number; z: number }>;
  seed?: number | null;
  clusterOptions?: Partial<ClusterOptions>;
}

export interface Simulator {
  players: PlayerSim[];
  harness: AtprotoHarness;
  transport: TransportHarness;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  /** Moves one simulated player. */
  move(did: string, x: number, z: number): void;
  /** One tick of every player plus `ms` of fake-clock time. */
  step(ms?: number): Promise<void>;
  /** Steps until `predicate` is true or `maxMs` of fake time has elapsed. */
  runUntil(
    maxMs: number,
    predicate: () => boolean,
    stepMs?: number,
  ): Promise<boolean>;
  /** Runs a fixed amount of fake time in `stepMs` increments. */
  run(totalMs: number, stepMs?: number): Promise<void>;
  connected(did: string): string[];
  edges(): Array<[string, string]>;
  maxDegree(): number;
  degreeDistribution(): Map<number, number>;
  /** Connected components of the undirected connection graph (BFS). */
  components(): string[][];
  isConnected(): boolean;
  /** Mean share of in-range players each player is directly linked to. */
  coverage(): { mean: number; withinRange: number; linked: number };
  report(): string;
}

export const createSimulator = (options: SimulatorOptions): Simulator => {
  const harness = new AtprotoHarness();
  const transport = new TransportHarness();
  const players: PlayerSim[] = options.placements.map((p, i) =>
    createPlayerSim({
      did: `did:plc:p${i}`,
      harness,
      transport,
      x: p.x,
      z: p.z,
      seed: options.seed ?? null,
      clusterOptions: options.clusterOptions,
    }),
  );

  const step = async (ms = 150): Promise<void> => {
    for (const player of players) {
      player.controller.tick(1 / 60, player.pose);
    }
    await vi.advanceTimersByTimeAsync(ms);
    // drain any microtasks queued by transport/atproto callbacks
    await Promise.resolve();
    await Promise.resolve();
  };

  const run = async (totalMs: number, stepMs = 150): Promise<void> => {
    const frames = Math.ceil(totalMs / stepMs);
    for (let i = 0; i < frames; i++) {
      await step(stepMs);
    }
  };

  const runUntil = async (
    maxMs: number,
    predicate: () => boolean,
    stepMs = 150,
  ): Promise<boolean> => {
    let elapsed = 0;
    while (elapsed < maxMs) {
      if (predicate()) {
        return true;
      }
      await step(stepMs);
      elapsed += stepMs;
    }
    return predicate();
  };

  const edges = (): Array<[string, string]> => {
    const seen = new Set<string>();
    const out: Array<[string, string]> = [];
    for (const player of players) {
      for (const other of player.controller.connectedDids()) {
        const key = [player.did, other].sort().join("↔");
        if (!seen.has(key)) {
          seen.add(key);
          out.push([player.did, other]);
        }
      }
    }
    return out;
  };

  const degreeDistribution = (): Map<number, number> => {
    const dist = new Map<number, number>();
    for (const player of players) {
      const d = player.controller.connectedDids().length;
      dist.set(d, (dist.get(d) ?? 0) + 1);
    }
    return dist;
  };

  const components = (): string[][] => {
    const adj = new Map<string, string[]>();
    for (const [a, b] of edges()) {
      let la = adj.get(a);
      if (la === undefined) {
        la = [];
        adj.set(a, la);
      }
      la.push(b);
      let lb = adj.get(b);
      if (lb === undefined) {
        lb = [];
        adj.set(b, lb);
      }
      lb.push(a);
    }
    const visited = new Set<string>();
    const out: string[][] = [];
    for (const player of players) {
      if (visited.has(player.did)) {
        continue;
      }
      const comp: string[] = [];
      const queue = [player.did];
      visited.add(player.did);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        comp.push(cur);
        for (const next of adj.get(cur) ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      out.push(comp);
    }
    return out;
  };

  const coverage = (): {
    mean: number;
    withinRange: number;
    linked: number;
  } => {
    const maxD2 = CLUSTER_DEFAULTS.maxDistance ** 2;
    let withinRange = 0;
    let linked = 0;
    for (const player of players) {
      const others = players.filter((o) => o.did !== player.did);
      const connected = new Set(player.controller.connectedDids());
      const inRange = others.filter((o) => {
        const dx = o.pose.x - player.pose.x;
        const dz = o.pose.z - player.pose.z;
        return dx * dx + dz * dz <= maxD2;
      });
      withinRange += inRange.length;
      linked += inRange.filter((o) => connected.has(o.did)).length;
    }
    return {
      mean: withinRange === 0 ? 0 : linked / withinRange,
      withinRange,
      linked,
    };
  };

  const report = (): string => {
    const dist = degreeDistribution();
    const comps = components();
    const cov = coverage();
    const maxD = [...dist.keys()].reduce((a, b) => Math.max(a, b), 0);
    const sorted = [...dist.entries()].sort((a, b) => a[0] - b[0]);
    const sizes = comps.map((c) => c.length).sort((a, b) => b - a);
    return (
      `players=${players.length} edges=${edges().length} ` +
      `maxDegree=${maxD} degree=${sorted.map(([d, n]) => `${d}:${n}`).join(",")} ` +
      `components=${sizes.join("+")} connected=${comps.length === 1} ` +
      `coverage=${(cov.mean * 100).toFixed(1)}% (${cov.linked}/${cov.withinRange} in-range linked)`
    );
  };

  return {
    players,
    harness,
    transport,
    startAll: async () => {
      await Promise.all(players.map((p) => p.start()));
    },
    stopAll: async () => {
      await Promise.all(players.map((p) => p.stop()));
    },
    move: (did, x, z) => {
      const player = players.find((p) => p.did === did);
      if (player !== undefined) {
        player.pose.x = x;
        player.pose.z = z;
      }
    },
    step,
    runUntil,
    run,
    connected: (did) =>
      players.find((p) => p.did === did)?.controller.connectedDids() ?? [],
    edges,
    maxDegree: () => {
      let max = 0;
      for (const player of players) {
        max = Math.max(max, player.controller.connectedDids().length);
      }
      return max;
    },
    degreeDistribution,
    components,
    isConnected: () => {
      const comps = components();
      return players.length === 0 || comps.length === 1;
    },
    coverage,
    report,
  };
};

/** A jittered grid placement over `width`x`height`, deterministic per seed. */
export const gridPlacements = (
  cols: number,
  rows: number,
  width: number,
  height: number,
  seed = 1,
): Array<{ x: number; z: number }> => {
  const rand = mulberry32(seed);
  const out: Array<{ x: number; z: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        x: (c / (cols - 1) - 0.5) * width + (rand() - 0.5) * 4,
        z: (r / (rows - 1) - 0.5) * height + (rand() - 0.5) * 4,
      });
    }
  }
  return out;
};
