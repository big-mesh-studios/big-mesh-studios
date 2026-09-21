// The guest-side math a place script reaches through `"voxelscape"`: the
// shapes and helpers a script would otherwise re-derive with bare numbers.
// Everything here is compiled into the same synthetic module as
// `voxelscape-lib.ts`, so it runs in the sandbox like any other guest code —
// a `Vector3` is a plain object of the guest realm and never crosses the host
// boundary. Kept as a source string rather than a real module because the
// bundler compiles the synthetic `"voxelscape"` module from text rather than
// from an import graph.
export const VOXELSCAPE_MATH_SOURCE = `
/** A three-axis vector, its arithmetic returning new vectors so a script's
 * own value is never mutated out from under it. */
class Vector3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  static create(x, y, z) { return new Vector3(x, y, z); }
  static fromArray(a) { return new Vector3(a[0], a[1], a[2]); }
  static zero() { return new Vector3(0, 0, 0); }
  static one() { return new Vector3(1, 1, 1); }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  scale(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  mul(v) { return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v) {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  get length() { return Math.hypot(this.x, this.y, this.z); }
  unit() { var l = this.length; return l === 0 ? new Vector3(0, 0, 0) : this.scale(1 / l); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  lerp(v, t) {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }
  clone() { return new Vector3(this.x, this.y, this.z); }
  toArray() { return [this.x, this.y, this.z]; }
  equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
}

/** A two-axis vector, its arithmetic returning new vectors the way Vector3's does. */
class Vector2 {
  constructor(x, y) { this.x = x; this.y = y; }
  static create(x, y) { return new Vector2(x, y); }
  static fromArray(a) { return new Vector2(a[0], a[1]); }
  static zero() { return new Vector2(0, 0); }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vector2(this.x * s, this.y * s); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  get length() { return Math.hypot(this.x, this.y); }
  unit() { var l = this.length; return l === 0 ? new Vector2(0, 0) : this.scale(1 / l); }
  lerp(v, t) { return new Vector2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t); }
  toArray() { return [this.x, this.y]; }
}

/** A colour whose three channels run from 0 to 1, the range the world's own
 * colour arithmetic uses. */
class Color3 {
  constructor(r, g, b) { this.r = r; this.g = g; this.b = b; }
  static create(r, g, b) { return new Color3(r, g, b); }
  static fromRGB(r, g, b) { return new Color3(r / 255, g / 255, b / 255); }
  static fromHex(hex) {
    var text = hex.charAt(0) === "#" ? hex.slice(1) : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(text)) { return new Color3(0, 0, 0); }
    return Color3.fromRGB(
      parseInt(text.slice(0, 2), 16),
      parseInt(text.slice(2, 4), 16),
      parseInt(text.slice(4, 6), 16)
    );
  }
  lerp(c, t) {
    return new Color3(
      this.r + (c.r - this.r) * t,
      this.g + (c.g - this.g) * t,
      this.b + (c.b - this.b) * t
    );
  }
  toArray() { return [this.r, this.g, this.b]; }
}

/** Holds value within min and max. */
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** The point t of the way from a to b; t is not clamped. */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Eases t from 0 to 1 with zero slope at each end, clamping t first. */
function smoothstep(t) {
  var u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
}

/** A random integer from min to max, both included, from the seeded stream. */
function randint(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** A random real number from min up to but not including max, from the seeded stream. */
function randFloat(min, max) { return min + Math.random() * (max - min); }

/** One element of array, chosen from the seeded stream; undefined when empty. */
function choice(array) {
  return array.length === 0 ? undefined : array[Math.floor(Math.random() * array.length)];
}

export { Vector3, Vector2, Color3, clamp, lerp, smoothstep, randint, randFloat, choice };
`;
