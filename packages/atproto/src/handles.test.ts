// @vitest-environment node
import { describe, expect, it } from "vitest";
import { claimedHandle, confirmHandle } from "./handles";

const DID = "did:plc:abc123";

describe("claimedHandle", () => {
  it("reads the first at:// alias", () => {
    expect(
      claimedHandle({
        alsoKnownAs: ["https://example.com", "at://me.bsky.social"],
      }),
    ).toBe("me.bsky.social");
  });

  it("is null when the document claims nothing", () => {
    expect(claimedHandle({})).toBeNull();
    expect(claimedHandle({ alsoKnownAs: [] })).toBeNull();
    expect(claimedHandle({ alsoKnownAs: ["at://"] })).toBeNull();
  });
});

describe("confirmHandle", () => {
  it("confirms a handle that resolves back to the same DID", async () => {
    await expect(
      confirmHandle({
        did: DID,
        document: { alsoKnownAs: ["at://me.bsky.social"] },
        resolveDid: async () => DID,
      }),
    ).resolves.toBe("me.bsky.social");
  });

  it("rejects a handle that resolves to somebody else", async () => {
    await expect(
      confirmHandle({
        did: DID,
        document: { alsoKnownAs: ["at://someone-else.bsky.social"] },
        resolveDid: async () => "did:plc:zzz999",
      }),
    ).resolves.toBeNull();
  });

  it("rejects a handle that no longer resolves at all", async () => {
    await expect(
      confirmHandle({
        did: DID,
        document: { alsoKnownAs: ["at://expired.example.com"] },
        resolveDid: async () => {
          throw new Error("unable to resolve handle");
        },
      }),
    ).resolves.toBeNull();
  });

  it("asks nothing when the document claims no handle", async () => {
    let asked = 0;
    const handle = await confirmHandle({
      did: DID,
      document: {},
      resolveDid: async () => {
        asked++;
        return DID;
      },
    });
    expect(handle).toBeNull();
    expect(asked).toBe(0);
  });
});
