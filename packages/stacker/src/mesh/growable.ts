// A growable typed array, and the only way geometry is accumulated here: the
// mesher writes its vertices into one of these as it sweeps a chunk, and what
// leaves it is bound straight to a vertex buffer. Building boxed numbers first
// and copying them to typed arrays afterwards would cost eight bytes an entry
// to hold and a pass over every one of them to convert.
//
// A builder is worth reusing across chunks. The buffer doubles when it fills, so
// a builder that has met the largest chunk never grows again, and `clear`
// empties it for the next chunk without giving the buffer back.

/**
 * A growable typed array: appends into a buffer that doubles when full, so a
 * chunk's geometry is built directly in the layout the vertex buffer wants. The
 * logical length is tracked separately from the capacity, and `array` returns a
 * view of exactly the written elements.
 */
export class Growable<T extends Float32Array | Uint32Array | Uint8Array> {
  private buf: T;
  private readonly ctor: new (size: number) => T;
  private readonly chunk: number;
  length = 0;

  constructor(ctor: new (size: number) => T, chunk = 1024) {
    this.ctor = ctor;
    this.chunk = chunk;
    this.buf = new ctor(chunk);
  }

  /** Grows the backing buffer so at least `amount` more elements fit. */
  private growBy(amount: number): void {
    const needed = this.length + amount;
    if (needed <= this.buf.length) {
      return;
    }
    let size = this.buf.length;
    while (size < needed) {
      size = Math.max(size * 2, this.chunk);
    }
    const next = new this.ctor(size);
    next.set(this.buf.subarray(0, this.length));
    this.buf = next;
  }

  /** Appends three, which is a position or a triangle's indices. */
  pushTriple(first: number, second: number, third: number): void {
    this.growBy(3);
    this.buf[this.length] = first;
    this.buf[this.length + 1] = second;
    this.buf[this.length + 2] = third;
    this.length += 3;
  }

  /** Appends four, which is one vertex's group of packed lanes. */
  pushQuad(first: number, second: number, third: number, fourth: number): void {
    this.growBy(4);
    this.buf[this.length] = first;
    this.buf[this.length + 1] = second;
    this.buf[this.length + 2] = third;
    this.buf[this.length + 3] = fourth;
    this.length += 4;
  }

  /** Appends one, which is a palette index or anything else a byte holds. */
  push(value: number): void {
    this.growBy(1);
    this.buf[this.length] = value;
    this.length += 1;
  }

  /** Forgets everything written, keeping the buffer for what is written next. */
  clear(): void {
    this.length = 0;
  }

  /**
   * The written elements as an array of their own, at exactly their length. A
   * copy, unlike `array`: what a caller keeps is outlived by the next chunk
   * written, and cannot be a view onto a buffer that will be overwritten.
   */
  exact(): T {
    const out = new this.ctor(this.length);
    out.set(this.buf.subarray(0, this.length));
    return out;
  }
}
