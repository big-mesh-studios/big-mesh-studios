import { describe, expect, it } from "vitest";
import { cdnImageUrl } from "./cdn";

describe("cdnImageUrl", () => {
  it("wraps the address so the CDN fetches it rather than the caller", () => {
    const url = cdnImageUrl(
      "https://pds.example/xrpc/com.atproto.sync.getBlob?did=did:plc:abc&cid=bafkrei",
    );

    expect(url.startsWith("https://wsrv.nl/")).toBe(true);
    expect(url).toContain(
      encodeURIComponent(
        "https://pds.example/xrpc/com.atproto.sync.getBlob?did=did:plc:abc&cid=bafkrei",
      ),
    );
  });
});
