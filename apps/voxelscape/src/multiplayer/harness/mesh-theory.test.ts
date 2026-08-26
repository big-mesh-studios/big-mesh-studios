// @vitest-environment node
// The mesh-theory harness: drives real `MultiplayerController` instances for a
// whole population of simulated players against an in-memory stand-in for
// atproto (repos + relay discovery) and a deterministic fake WebRTC transport,
// then asserts on the topology and dynamics of the cluster that forms. This
// verifies the theory — bounded degree, connectivity at sufficient density,
// hysteresis, staleness, cluster isolation, fault handling — without any
// accounts, network, or browsers.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNAL_COLLECTION } from "../signal";
import { PRESENCE_COLLECTION } from "../presence";
import { CLUSTER_DEFAULTS } from "../roster";
import { createSimulator, gridPlacements } from "./simulate";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cluster mesh theory", () => {
  it("two players form a connection via the atproto mailbox and exchange poses", async () => {
    const sim = createSimulator({
      placements: [
        { x: 0, z: 0 },
        { x: 3, z: 0 },
      ],
    });
    await sim.startAll();
    const a = sim.players[0]; // did:plc:p0 — the lower DID, so the initiator
    const b = sim.players[1];

    const connected = await sim.runUntil(
      25_000,
      () => a.controller.connections === 1 && b.controller.connections === 1,
    );
    expect(connected).toBe(true);
    expect(a.controller.connectedDids()).toEqual([b.did]);
    expect(b.controller.connectedDids()).toEqual([a.did]);
    // The roster counts only other players, never this player's own presence.
    expect(a.controller.rosterSize).toBe(1);
    expect(b.controller.rosterSize).toBe(1);

    // The whole handshake is exactly two records: one offer in the
    // initiator's repo addressed to the responder, one answer the other way.
    const aSignals = sim.harness.records(a.did, SIGNAL_COLLECTION);
    const bSignals = sim.harness.records(b.did, SIGNAL_COLLECTION);
    expect(aSignals).toHaveLength(1);
    expect(bSignals).toHaveLength(1);
    const offer = aSignals[0].value as {
      to: string;
      kind: string;
      seq: number;
    };
    const answer = bSignals[0].value as {
      to: string;
      kind: string;
      seq: number;
    };
    expect(offer.to).toBe(b.did);
    expect(offer.kind).toBe("offer");
    expect(answer.to).toBe(a.did);
    expect(answer.kind).toBe("answer");

    // Move B; A should receive B's new position over the data channel.
    sim.move(b.did, 10, 0);
    const received = await sim.runUntil(3_000, () => {
      const p = a.latestPose(b.did);
      return p !== undefined && Math.abs(p.x - 10) < 0.5;
    });
    expect(received).toBe(true);
    const latest = a.latestPose(b.did)!;
    expect(latest.x).toBeCloseTo(10, 1);
    expect(latest.z).toBeCloseTo(0, 1);
    expect(latest.seq).toBeGreaterThan(0);
  });

  it("30 players in a bounded area form a connected mesh with bounded degree", async () => {
    const placements = gridPlacements(6, 5, 96, 80, 42);
    expect(placements).toHaveLength(30);
    const sim = createSimulator({ placements, seed: 54321 });
    await sim.startAll();
    await sim.run(60_000);

    // Degree is bounded by the candidate set (k + buffer), never by
    // population — the core unbounded-population property.
    const bound = CLUSTER_DEFAULTS.k + CLUSTER_DEFAULTS.buffer;
    expect(sim.maxDegree()).toBeLessThanOrEqual(bound);

    // No edge ever exceeds maxDistance.
    const maxD2 = CLUSTER_DEFAULTS.maxDistance ** 2;
    for (const [a, b] of sim.edges()) {
      const pa = sim.players.find((p) => p.did === a)!;
      const pb = sim.players.find((p) => p.did === b)!;
      const dx = pa.pose.x - pb.pose.x;
      const dz = pa.pose.z - pb.pose.z;
      expect(dx * dx + dz * dz).toBeLessThanOrEqual(maxD2);
    }

    // At this density the mesh is one connected component.
    expect(sim.isConnected()).toBe(true);
    console.log(`[30-player mesh] ${sim.report()}`);
  });

  it("the selection buffer prevents churn at the cutoff; without it the mesh flaps", async () => {
    // A at the origin, five fixed peers on a small circle around it, and two
    // equidistant peers X and Y (X at +d, Y fixed at -4). The closer of X and
    // Y holds A's 6th selection slot, so moving X across the 3.5..4.5 cutoff
    // swaps which of X/Y is selected. X and Y both keep A in their own top-6
    // (A is their nearest neighbour), so the pair is *mutually* reachable
    // whenever it is selected — a genuine connect/disconnect boundary.
    const ring = (n: number, radius: number): Array<{ x: number; z: number }> =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return { x: Math.cos(a) * radius, z: Math.sin(a) * radius };
      });
    const placements = [
      { x: 0, z: 0 }, // A
      ...ring(5, 1), // fixed peers, all within A's reach
      { x: 3.5, z: 0 }, // X (oscillates)
      { x: -4, z: 0 }, // Y (fixed)
    ];

    const runOscillation = async (clusterOptions: object): Promise<number> => {
      const sim = createSimulator({ placements, seed: 7, clusterOptions });
      await sim.startAll();
      await sim.run(20_000); // settle the base mesh
      const a = sim.players[0];
      const x = sim.players[6];
      let flips = 0;
      let prev = a.controller.connectedDids().includes(x.did);
      const move = async (to: number): Promise<void> => {
        sim.move(x.did, to, 0);
        await sim.run(20_000); // well past a discovery pass on every side
        const cur = a.controller.connectedDids().includes(x.did);
        if (cur !== prev) {
          flips++;
        }
        prev = cur;
      };
      // 5-unit jumps (over the presence republish threshold) so the new
      // position reaches A promptly.
      await move(8.5); // X falls to A's 7th-slot side
      await move(3.5); // X returns to the selected slot
      await move(8.5);
      await move(3.5);
      await sim.stopAll();
      return flips;
    };

    // With the default buffer, X stays inside the candidate set the whole
    // time, so the connection never churns.
    const withHysteresis = await runOscillation({});
    expect(withHysteresis).toBe(0);

    // Without the buffer or hysteresis window, each crossing re-links X.
    const withoutHysteresis = await runOscillation({
      buffer: 0,
      hysteresisMs: 0,
    });
    expect(withoutHysteresis).toBeGreaterThanOrEqual(2);
  });

  it("stopping a player removes its presence, disconnects it, and restarting reconnects", async () => {
    const sim = createSimulator({
      placements: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
      ],
    });
    await sim.startAll();
    const a = sim.players[0];
    const b = sim.players[1];
    expect(
      await sim.runUntil(25_000, () => a.controller.connections === 1),
    ).toBe(true);

    await b.stop();
    // The presence record is deleted, so discovery stops listing B.
    expect(
      sim.harness.listReposByCollection(PRESENCE_COLLECTION),
    ).not.toContain(b.did);
    // The transport teardown reaches A, which drops the link.
    expect(
      await sim.runUntil(5_000, () => a.controller.connections === 0),
    ).toBe(true);
    expect(a.controller.connectedDids()).toEqual([]);

    // B returns: the mesh rebuilds the link.
    await b.start();
    expect(
      await sim.runUntil(40_000, () => a.controller.connections === 1),
    ).toBe(true);
  });

  it("two distant clusters form independently with no cross-cluster edges", async () => {
    const near = gridPlacements(5, 2, 64, 32, 1);
    const far = gridPlacements(5, 2, 64, 32, 2).map((p) => ({
      x: p.x + 2_000,
      z: p.z,
    }));
    const sim = createSimulator({ placements: [...near, ...far], seed: 9 });
    await sim.startAll();
    await sim.run(60_000);

    const clusterA = new Set(sim.players.slice(0, 10).map((p) => p.did));
    const clusterB = new Set(sim.players.slice(10, 20).map((p) => p.did));

    for (const [a, b] of sim.edges()) {
      expect(clusterA.has(a) === clusterA.has(b)).toBe(true);
    }

    const comps = sim.components();
    const compA = comps.find((c) => c.includes(sim.players[0].did))!;
    const compB = comps.find((c) => c.includes(sim.players[10].did))!;
    expect([...compA].sort()).toEqual([...clusterA].sort());
    expect([...compB].sort()).toEqual([...clusterB].sort());
    expect(sim.maxDegree()).toBeLessThanOrEqual(
      CLUSTER_DEFAULTS.k + CLUSTER_DEFAULTS.buffer,
    );
    console.log(`[two-cluster mesh] ${sim.report()}`);
  });

  it("killing one side's transport closes the link on the survivor", async () => {
    const sim = createSimulator({
      placements: [
        { x: 0, z: 0 },
        { x: 2, z: 0 },
      ],
    });
    await sim.startAll();
    const a = sim.players[0];
    const b = sim.players[1];
    expect(
      await sim.runUntil(25_000, () => a.controller.connections === 1),
    ).toBe(true);

    // Kill B's transport for the pair; A (the survivor) observes the close.
    sim.transport.peer(b.did, a.did)?.destroy();
    expect(
      await sim.runUntil(2_000, () => a.controller.connections === 0),
    ).toBe(true);

    // No further poses reach A once the link is gone.
    const after = a.poseCountFor(b.did);
    await sim.run(2_000);
    expect(a.poseCountFor(b.did)).toBe(after);
  });
});
