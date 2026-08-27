/**
 * Each group is exported twice under one name: as a module namespace holding
 * its functions, and as a type alias of the shape those functions operate on.
 * A call site importing `Vector2D` gets both `Vector2D.add(...)` and
 * `const a: Vector2D`.
 */

import type * as Vector2DModule from "./vector-2d";
import type * as Vector3DModule from "./vector-3d";
import type * as RGBModule from "./rgb";
import type * as RGBAModule from "./rgba";
import type * as HSVAModule from "./hsva";
import type * as BitmapModule from "./bitmap";
import type * as Matrix3x3Module from "./matrix-3x3";

export * as Vector2D from "./vector-2d";
export type Vector2D = Vector2DModule.Vector2D;

export * as Vector3D from "./vector-3d";
export type Vector3D = Vector3DModule.Vector3D;

export * as RGB from "./rgb";
export type RGB = RGBModule.RGB;

export * as RGBA from "./rgba";
export type RGBA = RGBAModule.RGBA;

export * as HSVA from "./hsva";
export type HSVA = HSVAModule.HSVA;

export * as Bitmap from "./bitmap";
export type Bitmap = BitmapModule.Bitmap;

export * as Matrix3x3 from "./matrix-3x3";
export type Matrix3x3 = Matrix3x3Module.Matrix3x3;
