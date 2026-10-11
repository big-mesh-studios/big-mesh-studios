/**
 * The pixels a brush writes into: one atlas-sized RGBA buffer, and the stamping that changes it.
 *
 * ## Why the buffer is the source of truth rather than the texture
 *
 * **Because a texture cannot be read back cheaply and a stroke must be undoable.** rmsl uploads a
 * `DataTexture` by handing the whole array to `texImage2D` whenever `needsUpdate` is set — there is
 * no sub-image upload anywhere in it, so a 1024² texture is four megabytes per frame no matter how
 * small the change. Reading the picture back off the card would be worse still.
 *
 * So the bytes live here, the texture is a view onto the same array, and a change is a change to
 * this buffer. The GPU copy is refreshed when something asks for it, and {@link PaintSurface.dirty}
 * is how it knows whether that is worth doing.
 *
 * ## Why strokes are stamped into UV space and not screen space
 *
 * **Because the texture is what a stroke has to survive being seen through.** A dab placed by
 * screen position would be a different part of the model depending on where the camera was when it
 * was drawn. A stroke is two texture-space points and a radius in texels, so it means the same
 * thing from every angle — which is the whole reason the coordinates were baked at all.
 *
 * ## Why a stroke is a segment and not a point
 *
 * **Because pointer events are far apart.** Two samples of one stroke can be a hundred pixels
 * apart, and stamping a circle at each would draw a dotted line rather than a stroke. The brush
 * is a capsule between the two, which is the same arithmetic `paint-surface` in the other codebase
 * uses and costs nothing to get right.
 */

/** A colour, four bytes, which is what both a part's colour and a texture's texel already are. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0 transparent, 255 opaque. */
  readonly a: number;
}

/**
 * A rectangle of texels, inclusive at both corners.
 *
 * **`undefined` for "nothing"** rather than an empty rectangle, because the common answer is
 * nothing — a stroke entirely off the atlas, a clear on an already-clear buffer — and an empty
 * rectangle would have to be checked against.
 */
export interface DirtyRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** One continuous mark, from where the stroke was to where it is now. */
export interface Stroke {
  /** Where it was, in texture coordinates, `0..1` in both axes. */
  readonly from: readonly [number, number];
  /** Where it is now, in texture coordinates. */
  readonly to: readonly [number, number];
  /** How wide, in texels. This is a diameter, so a radius of half a pixel is a point. */
  readonly width: number;
  /**
   * Where the brush stops being solid, `0..1`. Zero is a soft airbrush all the way to its
   * centre; one is a hard edge with no falloff at all.
   *
   * **Named `hardness` because the number goes up as the edge gets harder**, which is the
   * opposite of how a soft brush's slider reads in most painting software and therefore worth
   * spelling out here.
   */
  readonly hardness: number;
  readonly colour: Rgba;
}

const byte = (value: number): number =>
  value < 0 ? 0 : value > 255 ? 255 : Math.round(value);

/**
 * The atlas, as bytes, with a brush.
 *
 * **Mutable and owned by the caller rather than a signal or a store.** Everything that wants to
 * paint is a pointer event handler and a rebuild, both of which are outside Solid's reactive
 * graph; a signal here would mean a write per dab to render nothing. What the application reacts
 * to is the atlas changing, and {@link PaintSurface.changed} is that event.
 */
export class PaintSurface {
  readonly width: number;
  readonly height: number;
  /** Four bytes a texel, row-major from the top, and the texture's `image` verbatim. */
  readonly pixels: Uint8Array;

  private changedSince = false;

  constructor(width: number, height: number, pixels?: Uint8Array) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.pixels =
      pixels !== undefined && pixels.length === this.width * this.height * 4
        ? pixels
        : new Uint8Array(this.width * this.height * 4);
  }

  /**
   * Whether anything has changed since this was last read.
   *
   * **A getter that clears the flag**, so "is it dirty" and "mark it clean" are one call and
   * there is no way to ask the question without also answering it. Two readers racing would
   * otherwise both see dirty and both upload.
   */
  get dirty(): boolean {
    const was = this.changedSince;
    this.changedSince = false;
    return was;
  }

  /** Marks the buffer as changed, for a change made through something other than {@link stamp}. */
  markChanged = (): void => {
    this.changedSince = true;
  };

  /**
   * Paints one stroke, and says which texels it touched.
   *
   * **A capsule between the two points, blended per channel.** The falloff is a smoothstep from
   * `hardness` to the edge rather than a linear ramp, because a linear one has a visible crease
   * where the brush stops, and a crease in a texture is a line that nobody drew.
   *
   * **Clipped to the atlas rather than wrapping.** A stroke that leaves the picture leaves it;
   * wrapping would paint the opposite side of the atlas from a drag that ran off the edge, which
   * is a thing a person would have to undo by hand.
   */
  stamp = (stroke: Stroke): DirtyRect | undefined => {
    const radius = Math.max(0.5, stroke.width / 2);
    const fromX = stroke.from[0] * this.width;
    const fromY = stroke.from[1] * this.height;
    const toX = stroke.to[0] * this.width;
    const toY = stroke.to[1] * this.height;

    const left = Math.floor(Math.min(fromX, toX) - radius);
    const right = Math.ceil(Math.max(fromX, toX) + radius);
    const top = Math.floor(Math.min(fromY, toY) - radius);
    const bottom = Math.ceil(Math.max(fromY, toY) + radius);

    if (right < 0 || bottom < 0 || left >= this.width || top >= this.height) {
      return undefined;
    }

    const edgeX = byte(stroke.colour.r);
    const edgeY = byte(stroke.colour.g);
    const edgeZ = byte(stroke.colour.b);
    const edgeA = byte(stroke.colour.a);
    const hardness = Math.min(1, Math.max(0, stroke.hardness));

    const segmentX = toX - fromX;
    const segmentY = toY - fromY;
    const segmentSq = segmentX * segmentX + segmentY * segmentY;

    let x0 = left;
    let y0 = top;
    let x1 = right;
    let y1 = bottom;

    // **Clamp once, outside the loop.** A brush two hundred texels wide on a 1024 atlas is
    // forty thousand iterations, and clamping per texel would be a comparison per texel for
    // nothing.
    const clampedX0 = Math.max(0, x0);
    const clampedY0 = Math.max(0, y0);
    const x1c = Math.min(this.width - 1, x1);
    const y1c = Math.min(this.height - 1, y1);
    x0 = clampedX0;
    y0 = clampedY0;
    x1 = x1c;
    y1 = y1c;
    if (x1 < x0 || y1 < y0) return undefined;

    for (let y = y0; y <= y1; y++) {
      const row = y * this.width;
      for (let x = x0; x <= x1; x++) {
        // **Where the texel sits along the stroke**, which is a capsule rather than a circle:
        // the same projection the field functions use, and a stamp every texel would not be.
        const px = x + 0.5 - fromX;
        const py = y + 0.5 - fromY;
        let along = 0;
        if (segmentSq > 0) {
          along = (px * segmentX + py * segmentY) / segmentSq;
          along = along < 0 ? 0 : along > 1 ? 1 : along;
        }
        const dx = px - segmentX * along;
        const dy = py - segmentY * along;
        const distance = Math.hypot(dx, dy);
        if (distance > radius) continue;

        const alpha = edgeA * falloff(distance / radius, hardness);
        if (alpha <= 0) continue;

        const at = (row + x) * 4;
        const keep = 1 - alpha / 255;
        this.pixels[at] = Math.round(
          edgeX * (alpha / 255) + this.pixels[at]! * keep,
        );
        this.pixels[at + 1] = Math.round(
          edgeY * (alpha / 255) + this.pixels[at + 1]! * keep,
        );
        this.pixels[at + 2] = Math.round(
          edgeZ * (alpha / 255) + this.pixels[at + 2]! * keep,
        );
        this.pixels[at + 3] = Math.max(
          this.pixels[at + 3]!,
          byte(this.pixels[at + 3]! * keep + 255 * (alpha / 255)),
        );
      }
    }

    this.changedSince = true;
    return { x0, y0, x1, y1 };
  };

  /**
   * Wipes the whole atlas, and says so.
   *
   * **To transparent, not to white.** A part's own colour shows through wherever the texture is
   * clear, which is what makes the modulate blend in the material work — a white fill would
   * erase every part colour in the model at once.
   */
  clear = (): DirtyRect => {
    this.pixels.fill(0);
    this.changedSince = true;
    return { x0: 0, y0: 0, x1: this.width - 1, y1: this.height - 1 };
  };

  /**
   * The texel at a texture coordinate, nearest neighbour.
   *
   * **Out of range answers transparent**, because every caller of this is asking "what colour is
   * the picture over there" and the honest answer for outside the picture is nothing.
   */
  sample = (u: number, v: number): Rgba => {
    const x = Math.floor(u * this.width);
    const y = Math.floor(v * this.height);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const at = (y * this.width + x) * 4;
    return {
      r: this.pixels[at]!,
      g: this.pixels[at + 1]!,
      b: this.pixels[at + 2]!,
      a: this.pixels[at + 3]!,
    };
  };

  /** A copy of a rectangle's bytes, for an undo entry. */
  snapshot = (rect: DirtyRect): Uint8Array => {
    const stride = this.width * 4;
    const span = rect.x1 - rect.x0 + 1;
    const out = new Uint8Array((rect.y1 - rect.y0 + 1) * span * 4);
    for (let y = rect.y0; y <= rect.y1; y++) {
      const from = y * stride + rect.x0 * 4;
      out.set(
        this.pixels.subarray(from, from + span * 4),
        (y - rect.y0) * span * 4,
      );
    }
    return out;
  };

  /**
   * Puts a snapshot back.
   *
   * **A parameter rather than "undo the last stamp",** because a stroke is many stamps — a drag
   * across a figure is one stroke and dozens of calls — and the undo entry belongs to the stroke,
   * not to the dab.
   */
  restore = (rect: DirtyRect, bytes: Uint8Array): void => {
    const stride = this.width * 4;
    const span = rect.x1 - rect.x0 + 1;
    for (let y = rect.y0; y <= rect.y1; y++) {
      const at = y * stride + rect.x0 * 4;
      this.pixels.set(
        bytes.subarray((y - rect.y0) * span * 4, (y - rect.y0 + 1) * span * 4),
        at,
      );
    }
    this.changedSince = true;
  };

  /**
   * The surface as the bytes of a PNG.
   *
   * **No row flip, which is the whole reason this is here rather than in the writer.** The
   * pixels are row-major from the top and a canvas's `ImageData` is row-major from the top, so
   * the two agree; `print/thumbnail.ts:168` has to flip because OpenGL hands pixels back
   * bottom-up and this does not. Both look like the same three lines, and one of them has to
   * carry the reason — so this is the one that does.
   *
   * **The PNG rather than raw bytes, because a file is read by other things.** `texture.png`
   * is openable by anything with a decoder, and a project file whose atlas was a raw RGBA dump
   * would be readable only by this application.
   *
   * @returns The PNG, or `undefined` where there is no DOM to encode one in.
   */
  toPng = async (): Promise<Blob | undefined> => {
    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const context = canvas.getContext("2d");
    if (context === null) return undefined;

    const image = context.createImageData(this.width, this.height);
    image.data.set(this.pixels);
    context.putImageData(image, 0, 0);

    // **Null as undefined, because `toBlob` answers null and this module answers optional
    // things with undefined.** Two ways of saying "nothing" in one file is one too many.
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    return blob ?? undefined;
  };

  /**
   * A surface read out of a PNG, or undefined where it cannot be decoded.
   *
   * **`createImageBitmap` rather than an `Image` element**, because decoding through an element
   * needs a document and this is the one path that would otherwise force a DOM into everything
   * between opening a file and having pixels.
   *
   * **The decoded pixels are copied rather than adopted.** `getImageData` hands back a fresh
   * array each call, but the surface takes ownership of whatever it is given and this one is
   * only guaranteed to be plain bytes until the next statement — so the copy is four megabytes
   * spent on making the ownership unambiguous, which is cheap next to the decode beside it.
   */
  static readonly fromPng = async (
    blob: Blob,
  ): Promise<PaintSurface | undefined> => {
    let picture: ImageBitmap;
    try {
      picture = await createImageBitmap(blob);
    } catch {
      return undefined;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = picture.width;
      canvas.height = picture.height;

      const context = canvas.getContext("2d");
      if (context === null) return undefined;
      context.drawImage(picture, 0, 0);

      const image = context.getImageData(0, 0, picture.width, picture.height);
      const pixels = new Uint8Array(image.data);
      return new PaintSurface(picture.width, picture.height, pixels);
    } finally {
      // **Closed whatever happened.** An `ImageBitmap` holds GPU memory until it is closed, and
      // a failed decode that left one open would leak it for the life of the document.
      picture.close();
    }
  };
}

/**
 * How much of a texel the brush puts down, `0..1`.
 *
 * **A smoothstep from `hardness` to the edge.** Flat inside, then `1 - smoothstep`, so the brush
 * is solid where it is meant to be solid and has no crease at the place it stops.
 */
const falloff = (distance: number, hardness: number): number => {
  if (hardness >= 1) return 1;
  if (distance <= hardness) return 1;
  const t = (distance - hardness) / (1 - hardness);
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth;
};
