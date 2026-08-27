export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D extends Vector2D {
  z: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSVA {
  /** Hue in degrees, `0..360`. */
  h: number;
  /** Saturation, `0..1`. */
  s: number;
  /** Value (brightness), `0..1`. */
  v: number;
  /** Alpha, `0..1`. */
  a: number;
}

export interface Bitmap {
  width: number;
  height: number;
  /** One palette index per cell, row by row. `EMPTY` where nothing is drawn. */
  data: Uint8Array;
}
