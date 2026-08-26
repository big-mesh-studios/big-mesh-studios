// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodePose, encodePose, type PoseMessage } from "./pose";

const message = (over: Partial<PoseMessage> = {}): PoseMessage => ({
  seq: 1,
  t: 1_000,
  x: 12.345678,
  y: 4,
  z: -3.141592,
  yaw: 0.785398,
  pitch: -0.1,
  ...over,
});

describe("pose wire codec", () => {
  it("round-trips a pose through the wire form", () => {
    const wire = encodePose(message());
    const decoded = decodePose(wire);
    expect(decoded).not.toBeNull();
    expect(decoded!.seq).toBe(1);
    expect(decoded!.t).toBe(1_000);
    expect(decoded!.x).toBeCloseTo(12.35, 5);
    expect(decoded!.z).toBeCloseTo(-3.14, 5);
    expect(decoded!.yaw).toBeCloseTo(0.7854, 5);
    expect(decoded!.pitch).toBe(-0.1);
  });

  it("rounds fields to keep the payload small", () => {
    const wire = encodePose(message({ x: 1.0000001, yaw: 0.00000009 }));
    expect(wire).toContain('"x":1');
    expect(wire).toContain('"yaw":0');
  });

  it("decodes a Uint8Array chunk", () => {
    const wire = encodePose(message());
    const decoded = decodePose(new TextEncoder().encode(wire));
    expect(decoded?.seq).toBe(1);
  });

  it("rejects malformed and non-pose chunks", () => {
    expect(decodePose("not json")).toBeNull();
    expect(decodePose("{}")).toBeNull();
    expect(decodePose({})).toBeNull();
    expect(decodePose(null)).toBeNull();
  });

  it("rejects messages missing a field", () => {
    const { pitch, ...partial } = message();
    const wire = JSON.stringify({ ...partial, v: 1 });
    expect(decodePose(wire)).toBeNull();
  });
});
