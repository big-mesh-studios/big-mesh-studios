// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BucketTool } from "./bucket-tool";
import type { ToolContext } from "./tool";

/** A bucket backed by a stub editor that always lets a scoop through. */
const makeBucket = (): BucketTool => {
  const editing = {
    isScoopable: () => true,
    sourceKind: () => "water" as "water",
    scoop: () => true,
    pourFluid: () => true,
    pick: () => ({ target: [0, 0, 0], place: null, distance: 1 }),
  };
  const ctx = { editing } as unknown as ToolContext;
  return new BucketTool(ctx);
};

const voxelPick = {
  primary: { kind: "voxel" as const, voxel: [0, 0, 0] as [number, number, number], distance: 1 },
  secondary: [0, 0, 0] as [number, number, number],
};

describe("BucketTool held pose", () => {
  it("always reports a rest pose, so the hand draws the bucket", () => {
    const bucket = makeBucket();
    const pose = bucket.pose();
    expect(pose.x).toBeGreaterThan(0);
    expect(pose.y).toBeLessThan(0);
    expect(pose.z).toBeLessThan(0);
    expect(Number.isFinite(pose.roll)).toBe(true);
    // held by the handle: the grip sits above the card's centre
    expect(pose.handle?.y).toBeLessThan(0);
  });

  it("dips toward the world on a scoop and settles back to rest", () => {
    const bucket = makeBucket();
    bucket.secondary(voxelPick);
    expect(bucket.fill).toBe("water");
    // a beat into the dip, so the tilt has started
    bucket.update(0.05);
    const dipped = bucket.pose();
    expect(dipped.roll).toBeGreaterThan(0);

    // long enough to finish the dip and the settle
    for (let i = 0; i < 100; i++) {
      bucket.update(0.02);
    }
    const settled = bucket.pose();
    expect(settled.x).toBe(0.5);
    expect(settled.y).toBe(-0.3);
    expect(settled.roll).toBeCloseTo(-0.06);
  });
});
