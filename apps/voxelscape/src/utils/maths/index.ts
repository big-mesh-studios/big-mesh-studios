/**
 * Each group is exported twice under one name: as a module namespace holding
 * its functions, and as a type alias of the shape those functions operate on.
 * A call site importing `Vector2D` gets both `Vector2D.add(...)` and
 * `const a: Vector2D`.
 */

import type * as Matrix3x3Module from "./matrix-3x3";
import type * as Types from "./types";

export * as Vector2D from "./vector-2d";
export type Vector2D = Types.Vector2D;

export * as Vector3D from "./vector-3d";
export type Vector3D = Types.Vector3D;

export * as RGB from "./rgb";
export type RGB = Types.RGB;

export * as RGBA from "./rgba";
export type RGBA = Types.RGBA;

export * as HSVA from "./hsva";
export type HSVA = Types.HSVA;

export * as Bitmap from "./bitmap";
export type Bitmap = Types.Bitmap;

// Matrix3x3 is a class rather than an interface, so its shape is a runtime
// value and lives with its functions rather than in types.ts.
export * as Matrix3x3 from "./matrix-3x3";
export type Matrix3x3 = Matrix3x3Module.Matrix3x3;
