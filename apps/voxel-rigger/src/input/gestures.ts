// Reading a camera gesture off the pointers touching the viewport: what one
// finger travelling means, and what two fingers moving and spreading mean.
//
// The tracker holds the pointers itself and reports only the movement since
// the last read, so a view can hand every pointer event straight to it and
// apply whatever comes back without keeping its own record of where a finger
// was. Which pointer began a bone drag is the view's business, not this one's.
export interface PointerSample {
  id: number;
  x: number;
  y: number;
}

/** A movement of the camera: a turn, a slide, or a change of distance. */
export interface CameraGesture {
  /** How far the view should turn, in pixels of drag. */
  orbit?: { dx: number; dy: number };
  /** How far the framed point should slide, in pixels of drag. */
  pan?: { dx: number; dy: number };
  /** What to multiply the distance by: above one comes nearer, below one goes further. */
  zoom?: number;
}

/** The centre and distance apart of the two pointers nearest the front. */
function span(samples: PointerSample[]): {
  centre: { x: number; y: number };
  distance: number;
} {
  const [first, second] = samples;
  return {
    centre: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
    distance: Math.hypot(first.x - second.x, first.y - second.y),
  };
}

/** The pointers touching the viewport, and the movement they add up to. */
export class GestureTracker {
  private samples: PointerSample[] = [];
  private centre: { x: number; y: number } | undefined;
  private distance = 0;

  /** How many pointers are down. */
  get pointers(): number {
    return this.samples.length;
  }

  /** Whether two or more pointers are down, which is a camera gesture rather
   * than whatever one finger began. */
  get twoFinger(): boolean {
    return this.samples.length >= 2;
  }

  /** Records a pointer going down. A second one starts the two-finger measure. */
  down(sample: PointerSample): void {
    const held = this.samples.find((candidate) => candidate.id === sample.id);
    if (held === undefined) {
      this.samples.push({ ...sample });
    } else {
      held.x = sample.x;
      held.y = sample.y;
    }

    if (this.samples.length >= 2) {
      const measured = span(this.samples);
      this.centre = measured.centre;
      this.distance = measured.distance;
    }
  }

  /** Records a pointer moving, and gives the camera movement it made. */
  move(sample: PointerSample): CameraGesture | undefined {
    const held = this.samples.find((candidate) => candidate.id === sample.id);

    if (held === undefined) {
      this.down(sample);
      return undefined;
    }

    const before = { x: held.x, y: held.y };
    held.x = sample.x;
    held.y = sample.y;

    if (this.samples.length >= 2) {
      const measured = span(this.samples);
      const pan =
        this.centre === undefined
          ? undefined
          : {
              dx: measured.centre.x - this.centre.x,
              dy: measured.centre.y - this.centre.y,
            };
      const zoom =
        this.distance > 0 && measured.distance > 0
          ? measured.distance / this.distance
          : undefined;

      this.centre = measured.centre;
      this.distance = measured.distance;

      const gesture: CameraGesture = { pan: pan ?? { dx: 0, dy: 0 } };
      if (zoom !== undefined && Math.abs(zoom - 1) > 1e-4) {
        gesture.zoom = zoom;
      }
      return gesture;
    }

    return { orbit: { dx: held.x - before.x, dy: held.y - before.y } };
  }

  /** Records a pointer lifting. */
  up(id: number): void {
    this.samples = this.samples.filter((sample) => sample.id !== id);

    if (this.samples.length >= 2) {
      const measured = span(this.samples);
      this.centre = measured.centre;
      this.distance = measured.distance;
    } else {
      this.centre = undefined;
      this.distance = 0;
    }
  }

  /**
   * The one pointer left down, or undefined when none is or several are. A
   * view lifts a camera gesture into an orbit on this, so the finger that
   * stayed keeps moving the view from where it actually is.
   */
  remaining(): PointerSample | undefined {
    return this.samples.length === 1 ? { ...this.samples[0] } : undefined;
  }

  /** Forgets every pointer, for a component tearing down. */
  clear(): void {
    this.samples = [];
    this.centre = undefined;
    this.distance = 0;
  }
}
