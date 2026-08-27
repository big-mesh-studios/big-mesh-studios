export interface Vector2D {
  x: number;
  y: number;
}

export function create(x = 0, y = 0) {
  return {
    x,
    y,
  };
}

export function floor(a: Vector2D, out = create()) {
  out.x = Math.floor(a.x);
  out.y = Math.floor(a.y);
  return out;
}

export function length(a: Vector2D) {
  return Math.hypot(a.x, a.y);
}

export function subtract(a: Vector2D, b: Vector2D, out = create()) {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  return out;
}

export function add(a: Vector2D, b: Vector2D, out = create()) {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  return out;
}

export function multiply(a: Vector2D, b: Vector2D, out = create()) {
  out.x = a.x * b.x;
  out.y = a.y * b.y;
  return out;
}

export function multiplyScalar(a: Vector2D, scalar: number, out = create()) {
  out.x = a.x * scalar;
  out.y = a.y * scalar;
  return out;
}

export function max(a: Vector2D, b: Vector2D, out = create()) {
  out.x = Math.max(a.x, b.x);
  out.y = Math.max(a.y, b.y);
  return out;
}

export function min(a: Vector2D, b: Vector2D, out = create()) {
  out.x = Math.min(a.x, b.x);
  out.y = Math.min(a.y, b.y);
  return out;
}

export function clamp(
  a: Vector2D,
  min: Vector2D,
  max: Vector2D,
  out = create(),
) {
  out.x = Math.max(Math.min(a.x, max.x), min.x);
  out.y = Math.max(Math.min(a.y, max.y), min.y);
  return out;
}

export function clone(a: Vector2D) {
  return create(a.x, a.y);
}

export const EMPTY = Object.freeze(create());
