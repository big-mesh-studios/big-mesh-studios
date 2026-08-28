// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MonsterSnapshot } from "../monsters/monster";
import {
  MONSTER_COLLECTION,
  isMonsterRecord,
  makeMonsterRecord,
  recordBeats,
  recordToSnapshot,
  type MonsterRecord,
} from "./monsters";

const makeSnapshot = (
  overrides: Partial<MonsterSnapshot> = {},
): MonsterSnapshot => ({
  id: "m1_0_0_0",
  kind: "zombie",
  pose: { x: 10.4, y: 11.6, z: -3.2, yaw: Math.PI / 4, vx: 2, vz: 0 },
  hp: 20,
  maxHp: 20,
  state: "chase",
  wanderLeft: 0,
  cooldown: 0,
  owner: "did:plc:owner",
  authoritativeAt: 5_000,
  updatedAt: 5_000,
  ...overrides,
});

describe("monster record codec", () => {
  it("makes a record with coarse integer fields from a snapshot", () => {
    const record = makeMonsterRecord(
      makeSnapshot(),
      42,
      "2026-08-27T00:00:00Z",
    );
    expect(record.$type).toBe(MONSTER_COLLECTION);
    expect(record.id).toBe("m1_0_0_0");
    expect(record.kind).toBe("zombie");
    expect(record.owner).toBe("did:plc:owner");
    expect(record.seed).toBe(42);
    expect(record.x).toBe(10);
    expect(record.y).toBe(12);
    expect(record.z).toBe(-3);
    expect(record.yawDeg).toBe(45);
    expect(record.hp).toBe(20);
    expect(record.state).toBe("chase");
    expect(record.updatedAt).toBe(5_000);
  });

  it("normalizes yaw to a degree in 0..359", () => {
    const negative = makeMonsterRecord(
      makeSnapshot({ pose: { ...makeSnapshot().pose, yaw: -Math.PI / 2 } }),
      1,
      "t",
    );
    expect(negative.yawDeg).toBe(270);
    const wrap = makeMonsterRecord(
      makeSnapshot({ pose: { ...makeSnapshot().pose, yaw: Math.PI * 1.75 } }),
      1,
      "t",
    );
    expect(wrap.yawDeg).toBe(315);
  });

  it("round-trips a record back into a snapshot", () => {
    const record = makeMonsterRecord(
      makeSnapshot(),
      42,
      "2026-08-27T00:00:00Z",
    );
    const snapshot = recordToSnapshot(record, 9_999);
    expect(snapshot.id).toBe("m1_0_0_0");
    expect(snapshot.kind).toBe("zombie");
    expect(snapshot.owner).toBe("did:plc:owner");
    expect(snapshot.state).toBe("chase");
    expect(snapshot.pose.x).toBe(10);
    expect(snapshot.pose.z).toBe(-3);
    expect(snapshot.pose.yaw).toBeCloseTo(Math.PI / 4, 5);
    expect(snapshot.pose.vx).toBe(0);
    // the record's producing time becomes the ordering key; the arrival time
    // drives the reader's dead reckoning
    expect(snapshot.authoritativeAt).toBe(5_000);
    expect(snapshot.updatedAt).toBe(9_999);
  });

  it("accepts only well-formed records", () => {
    const valid = makeMonsterRecord(makeSnapshot(), 42, "t");
    expect(isMonsterRecord(valid)).toBe(true);

    expect(
      isMonsterRecord({ ...valid, $type: "app.bms.voxelscape.edit" }),
    ).toBe(false);
    expect(isMonsterRecord({ ...valid, kind: "skeleton" })).toBe(false);
    expect(isMonsterRecord({ ...valid, x: 1.5 })).toBe(false);
    expect(isMonsterRecord({ ...valid, state: "flying" })).toBe(false);
    expect(isMonsterRecord({ ...valid, yawDeg: "north" })).toBe(false);
    expect(isMonsterRecord(null)).toBe(false);
  });
});

describe("monster record merge", () => {
  const record = (overrides: Partial<MonsterRecord> = {}): MonsterRecord => ({
    ...makeMonsterRecord(makeSnapshot(), 42, "t"),
    ...overrides,
  });

  it("prefers the newer record", () => {
    const existing = { authoritativeAt: 1_000, owner: "did:a" };
    expect(recordBeats(existing, record({ updatedAt: 2_000 }))).toBe(true);
    expect(recordBeats(existing, record({ updatedAt: 500 }))).toBe(false);
  });

  it("breaks updatedAt ties deterministically by owner DID", () => {
    const existing = { authoritativeAt: 1_000, owner: "did:a" };
    expect(
      recordBeats(existing, record({ updatedAt: 1_000, owner: "did:b" })),
    ).toBe(true);
    expect(
      recordBeats(existing, record({ updatedAt: 1_000, owner: "did:0" })),
    ).toBe(false);
    expect(
      recordBeats(existing, record({ updatedAt: 1_000, owner: "did:a" })),
    ).toBe(false);
  });
});
