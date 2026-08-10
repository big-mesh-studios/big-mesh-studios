import { Dimensions2D } from "./types";

export interface Vector2D {
  x: number;
  y: number;
}

export namespace Vector2D {
  export function round(vector: Vector2D) {
    return {
      x: Math.round(vector.x - 0.5),
      y: Math.round(vector.y - 0.5),
    };
  }

  export function sub(a: Vector2D, b: Vector2D) {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
    };
  }

  export function add(a: Vector2D, b: Vector2D) {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
    };
  }

  export function intersects(position: Vector2D, origin: Vector2D, dimensions: Dimensions2D) {
    return (
      position.x >= origin.x &&
      position.x < origin.x + dimensions.width &&
      position.y >= origin.y &&
      position.y < origin.y + dimensions.height
    );
  }
}

/**********************************************************************************/
/*                                  Dimensions3D                                  */
/**********************************************************************************/

export interface Dimensions3D extends Dimensions2D {
  depth: number;
}

export namespace Dimensions3D {
  export function normalize(dimensions: Dimensions3D) {
    const max = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    return {
      width: dimensions.width / max,
      height: dimensions.height / max,
      depth: dimensions.depth / max,
    };
  }

  export function equals(a: Dimensions3D, b: Dimensions3D) {
    return a.width === b.width && a.height === b.height && a.depth === b.depth;
  }
}
