// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtprotoHarness } from "../multiplayer/harness/atproto-harness";
import { MonsterController } from "../monsters/monster-controller";
import { MONSTER_COLLECTION, type MonsterRecord } from "./monsters";
import { MonsterSync } from "./monster-sync";

const makePlayer = (
  did: string,
  harness: AtprotoHarness,
  players: Array<{ did: string; x: number; y: number; z: number }>,
): { controller: MonsterController; sync: MonsterSync } => {
  const controller = new MonsterController({
    seed: 42,
    heightAt: () => 10,
    solidAt: () => false,
    waterAt: () => false,
    getDid: () => did,
    getPlayers: () => players,
  });
  const sync = new MonsterSync({
    getRepoClient: () => harness.repoClient(),
    getDid: () => did,
    onRecords: (records) => controller.mergeFromAtproto(records),
    getRecordsToWrite: (now) => controller.recordsForPersistence(now),
    onPersisted: (ids) => controller.markPersisted(ids),
    fetchDirectory: (collection) =>
      Promise.resolve(harness.listReposByCollection(collection)),
  });
  return { controller, sync };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("monster sync", () => {
  it("persists owned monsters to the repo and discovers them into a second client", async () => {
    const harness = new AtprotoHarness();
    const playersA = [{ did: "a", x: 0, y: 11, z: 0 }];
    const a = makePlayer("a", harness, playersA);
    a.sync.start();
    a.controller.tick(1 / 60);
    // stand the player on the first monster so it is owned and written
    const [, m] = [...a.controller.monsters.entries()][0];
    playersA[0].x = m.pose.x;
    playersA[0].z = m.pose.z;
    a.controller.tick(1 / 60);
    await vi.advanceTimersByTimeAsync(2_000);

    const stored = harness.records("a", MONSTER_COLLECTION);
    expect(stored.length).toBeGreaterThan(0);
    const first = stored[0].value as MonsterRecord;
    expect(first.$type).toBe(MONSTER_COLLECTION);
    expect(first.owner).toBe("a");
    expect(first.seed).toBe(42);

    // a second client at the same spot discovers a's records and adopts them
    const b = makePlayer("b", harness, [
      { did: "b", x: playersA[0].x, y: playersA[0].y, z: playersA[0].z },
    ]);
    b.sync.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(b.controller.monsters.size).toBeGreaterThan(0);
    for (const record of stored) {
      const value = record.value as MonsterRecord;
      const adopted = b.controller.monsters.get(value.id);
      expect(adopted).toBeDefined();
      expect(adopted!.owner).toBe("a");
      expect(adopted!.pose.x).toBe(value.x);
    }
  });

  it("writes a state change immediately rather than waiting for the interval", async () => {
    const harness = new AtprotoHarness();
    const players = [{ did: "a", x: 0, y: 11, z: 0 }];
    const a = makePlayer("a", harness, players);
    a.sync.start();
    a.controller.tick(1 / 60);
    const [id, m] = [...a.controller.monsters.entries()][0];
    players[0].x = m.pose.x + 10; // within aggro: the zombie chases
    players[0].z = m.pose.z;
    a.controller.tick(1 / 60);
    await vi.advanceTimersByTimeAsync(2_000);
    const first = harness.records("a", MONSTER_COLLECTION)[0]
      .value as MonsterRecord;
    expect(first.state).toBe("chase");

    // stand on the zombie: chase -> attack is a state change, written at once
    players[0].x = m.pose.x;
    players[0].z = m.pose.z;
    a.controller.tick(1 / 60);
    await vi.advanceTimersByTimeAsync(1_000);
    const after = harness.records("a", MONSTER_COLLECTION)[0]
      .value as MonsterRecord;
    expect(after.id).toBe(id);
    expect(after.state).toBe("attack");
  });
});
