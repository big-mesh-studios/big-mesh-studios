// @vitest-environment jsdom
/**
 * Reading a chosen file, which is the half of the loader that can be tested without a browser
 * image decoder.
 *
 * **The bytes and the mime type are the thing that has to round-trip**, so they are the thing
 * pinned here: an empty `type` must stay empty rather than be guessed into `image/png`, because
 * a guessed format is a saved reference whose media type the file never had.
 */
import { describe, expect, it } from "vitest";

import { readReferenceImage } from "./image-loader";

const fakeFile = (bytes: readonly number[], type: string): File =>
  ({
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
    type,
  }) as unknown as File;

describe("readReferenceImage", () => {
  it("copies the bytes and the mime type verbatim", async () => {
    const image = await readReferenceImage(
      fakeFile([1, 2, 3, 4], "image/jpeg"),
    );
    expect([...image.bytes]).toEqual([1, 2, 3, 4]);
    expect(image.mime).toBe("image/jpeg");
  });

  it("keeps an empty mime type rather than guessing one", async () => {
    const image = await readReferenceImage(fakeFile([9], ""));
    expect(image.mime).toBe("");
  });
});
