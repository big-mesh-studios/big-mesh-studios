import { Dimensions2D } from "./types";

export interface Vector2D {
  x: number;
  y: number;
}

export namespace Vector2D {
  export function round(a: Vector2D, out = { x: 0, y: 0 }) {
    out.x = Math.round(a.x - 0.5);
    out.y = Math.round(a.y - 0.5);
    return out;
  }

  export function sub(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x - b.x;
    out.y = a.y - b.y;
    return out;
  }

  export function add(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x + b.x;
    out.y = a.y + b.y;
    return out;
  }

  export function multiply(a: Vector2D, b: Vector2D, out = { x: 0, y: 0 }) {
    out.x = a.x * b.x;
    out.y = a.y * b.y;
    return out;
  }

  export function multiplyScalar(a: Vector2D, scalar: number, out = { x: 0, y: 0 }) {
    out.x = a.x * scalar;
    out.y = a.y * scalar;
    return out;
  }
}

/**********************************************************************************/
/*                                  Dimensions3D                                  */
/**********************************************************************************/

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

export namespace Dimensions3D {
  export function normalize(dimensions: Dimensions3D, out = { width: 0, height: 0, depth: 0 }) {
    const max = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    out.width = dimensions.width / max;
    out.height = dimensions.height / max;
    out.depth = dimensions.depth / max;
    return out;
  }

  export function equals(a: Dimensions3D, b: Dimensions3D) {
    return a.width === b.width && a.height === b.height && a.depth === b.depth;
  }
}

/**********************************************************************************/
/*                                      RGBA                                      */
/**********************************************************************************/

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export namespace RGBA {
  export function equals(a: RGBA, b: RGBA) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  export function toCSS({ r, g, b, a }: RGBA) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
