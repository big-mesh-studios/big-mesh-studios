// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  decodeMessage,
  encodeMessage,
  type EditItem,
  type EditWire,
  type PoseWire,
} from "./messages";
import type { PoseMessage } from "./pose";

const poseMessage = (over: Partial<PoseMessage> = {}): PoseMessage => ({
  seq: 1,
  t: 1_000,
  x: 12.345678,
  y: 4,
  z: -3.141592,
  yaw: 0.785398,
  pitch: -0.1,
  ...over,
});

const pose = (over: Partial<PoseMessage> = {}): PoseWire => ({
  v: 1,
  type: "pose",
  ...poseMessage(over),
});

const edit = (over: Partial<EditItem> = {}): EditItem => ({
  x: 12,
  y: 4,
  z: -3,
  id: 1,
  ts: 1_000,
  ...over,
});

describe("pose wire codec", () => {
  it("round-trips a pose through the wire form", () => {
    const decoded = decodeMessage(encodeMessage(pose()));
    expect(decoded).not.toBeNull();
    if (decoded?.type !== "pose") {
      throw new Error("expected a pose message");
    }
    expect(decoded.seq).toBe(1);
    expect(decoded.t).toBe(1_000);
    expect(decoded.x).toBeCloseTo(12.35, 5);
    expect(decoded.z).toBeCloseTo(-3.14, 5);
    expect(decoded.yaw).toBeCloseTo(0.7854, 5);
    expect(decoded.pitch).toBe(-0.1);
  });

  it("rounds fields to keep the payload small", () => {
    const wire = encodeMessage(
      pose({ x: 1.0000001, yaw: 0.00000009 }),
    );
    expect(wire).toContain('"x":1');
    expect(wire).toContain('"yaw":0');
  });

  it("decodes a Uint8Array chunk", () => {
    const decoded = decodeMessage(
      new TextEncoder().encode(encodeMessage(pose())),
    );
    expect(decoded?.type).toBe("pose");
  });

  it("rejects malformed and non-message chunks", () => {
    expect(decodeMessage("not json")).toBeNull();
    expect(decodeMessage("{}")).toBeNull();
    expect(decodeMessage({})).toBeNull();
    expect(decodeMessage(null)).toBeNull();
  });

  it("rejects messages missing a field", () => {
    const { pitch, ...partial } = poseMessage();
    const wire = JSON.stringify({ ...partial, v: 1, type: "pose" });
    expect(decodeMessage(wire)).toBeNull();
  });
});

describe("edit wire codec", () => {
  it("round-trips an edit batch through the wire form", () => {
    const message: EditWire = {
      v: 1,
      type: "edit",
      seq: 7,
      t: 2_000,
      edits: [edit()],
    };
    const decoded = decodeMessage(encodeMessage(message));
    expect(decoded).not.toBeNull();
    expect(decoded).toEqual({
      v: 1,
      type: "edit",
      seq: 7,
      t: 2_000,
      edits: [edit()],
    });
  });

  it("rejects an edit batch with an out-of-bounds coordinate", () => {
    const bad: EditWire = {
      v: 1,
      type: "edit",
      seq: 1,
      t: 1,
      edits: [edit({ x: 1_000_000 })],
    };
    expect(decodeMessage(encodeMessage(bad))).toBeNull();
  });

  it("rejects an edit batch with an unknown voxel id", () => {
    const bad: EditWire = {
      v: 1,
      type: "edit",
      seq: 1,
      t: 1,
      edits: [edit({ id: 300 })],
    };
    expect(decodeMessage(encodeMessage(bad))).toBeNull();
  });

  it("rejects an oversized edit batch", () => {
    const many = Array.from({ length: 513 }, (_, i) => edit({ x: i }));
    const bad: EditWire = { v: 1, type: "edit", seq: 1, t: 1, edits: many };
    expect(decodeMessage(encodeMessage(bad))).toBeNull();
  });
});
