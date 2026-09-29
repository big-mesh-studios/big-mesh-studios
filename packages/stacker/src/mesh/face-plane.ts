// Merging a plane of voxel faces into as few rectangles as it takes to cover
// them, with no DOM, GPU or renderer dependency so it can be tested by filling
// a plane by hand.
//
// The mesher emits one quad per exposed face, and a model of any size shows
// thousands of faces that are the same colour on the same plane. Any rectangle
// of those draws identically as one quad, and every vertex saved is bytes not
// built, not merged, not sent to the graphics card and not transformed while
// drawing.
//
// A voxel in this editor carries one colour rather than a colour a face, so
// unlike a lit terrain mesher there is nothing else for a face to disagree
// about: the palette index is the whole of what a face shows, and matching it is
// the whole of the merge.

/** What one rectangle of merged faces covers, and what it shows. */
export interface MergedRectangle {
  /** Where it starts, in cells along the plane's first axis. */
  first: number;
  /** Where it starts, in cells along the plane's second axis. */
  second: number;
  /** How many cells it covers along the first axis. */
  wide: number;
  /** How many cells it covers along the second axis. */
  tall: number;
  /** The palette index every cell in it shows. */
  index: number;
}

/** No face is exposed at this cell. */
const EMPTY = -1;

/**
 * One plane of a chunk's faces: the faces exposed in one direction, from one
 * slice of the volume. Reused across slices, so a sweep allocates one per axis
 * rather than one per slice.
 */
export class FacePlane {
  private readonly indices: Int32Array;
  private readonly taken: Uint8Array;

  /**
   * @param wide Cells along the plane's first axis.
   * @param tall Cells along its second.
   */
  constructor(
    readonly wide: number,
    readonly tall: number,
  ) {
    this.indices = new Int32Array(wide * tall);
    this.taken = new Uint8Array(wide * tall);
    this.clear();
  }

  /** Empties the plane, for the next slice to fill. */
  clear(): void {
    this.indices.fill(EMPTY);
    this.taken.fill(0);
  }

  /**
   * Records the face at one cell.
   *
   * @param first Its position along the plane's first axis.
   * @param second Its position along the second.
   * @param index The palette index the face shows.
   */
  set(first: number, second: number, index: number): void {
    this.indices[second * this.wide + first] = index;
  }

  /**
   * Covers every face recorded with as few rectangles as a greedy sweep finds:
   * each one grows along the first axis while the faces beside it match, then
   * along the second while whole rows of them match.
   *
   * @param report Called once per rectangle, in the order they are found.
   */
  eachRectangle(report: (rectangle: MergedRectangle) => void): void {
    for (let second = 0; second < this.tall; second++) {
      for (let first = 0; first < this.wide; first++) {
        const at = second * this.wide + first;
        const index = this.indices[at];
        if (index === EMPTY || this.taken[at] === 1) {
          continue;
        }

        let wide = 1;
        while (first + wide < this.wide && this.matches(at + wide, index)) {
          wide++;
        }

        let tall = 1;
        while (second + tall < this.tall) {
          const row = at + tall * this.wide;
          let whole = true;
          for (let step = 0; step < wide; step++) {
            if (!this.matches(row + step, index)) {
              whole = false;
              break;
            }
          }
          if (!whole) {
            break;
          }
          tall++;
        }

        for (let row = 0; row < tall; row++) {
          const start = at + row * this.wide;
          this.taken.fill(1, start, start + wide);
        }
        report({ first, second, wide, tall, index });
      }
    }
  }

  /** Whether the cell at `at` is a free face showing the same colour. */
  private matches(at: number, index: number): boolean {
    return this.taken[at] === 0 && this.indices[at] === index;
  }
}
