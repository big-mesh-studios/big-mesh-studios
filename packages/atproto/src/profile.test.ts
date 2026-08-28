// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pictureBlobCid, pictureBlobUrl } from "./profile";

describe("pictureBlobCid", () => {
  it("reads the link out of a profile record's picture blob", () => {
    expect(
      pictureBlobCid({
        $type: "app.bsky.actor.profile",
        avatar: {
          $type: "blob",
          ref: { $link: "bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3g" },
          mimeType: "image/jpeg",
          size: 256555,
        },
      }),
    ).toBe("bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3g");
  });

  it("is null for a profile that shows no picture", () => {
    expect(
      pictureBlobCid({ $type: "app.bsky.actor.profile", description: "hi" }),
    ).toBeNull();
  });

  it("is null for anything else the network hands back", () => {
    expect(pictureBlobCid(undefined)).toBeNull();
    expect(pictureBlobCid(null)).toBeNull();
    expect(pictureBlobCid("a string")).toBeNull();
    expect(pictureBlobCid({ avatar: "not a blob" })).toBeNull();
    expect(pictureBlobCid({ avatar: { ref: {} } })).toBeNull();
    expect(pictureBlobCid({ avatar: { ref: { $link: "" } } })).toBeNull();
  });
});

describe("pictureBlobUrl", () => {
  it("addresses the blob on the server hosting the account", () => {
    expect(
      pictureBlobUrl("https://pds.example", "did:plc:abc123", "bafkrei123"),
    ).toBe(
      "https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc123&cid=bafkrei123",
    );
  });
});
