import shaders from "./shaders";
import {
  voxelPicker as cpuVoxelPicker,
  voxelRenderer as cpuVoxelRenderer,
} from "./voxel-picker-cpu";

type Vec2 = [number, number];
type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

type VoxelTexture = {
  data: Uint8Array;
  width: number;
  height: number;
  depth?: number;
};

/**
 * The precompiled picker reads the UV varying from `ctx.varyings[shaders.vUv]`,
 * so a caller hands the friendly `ctx.varying.vUv` and this wrapper moves it
 * into the compiled slot. `shaders.vUv` is the same slot name the GPU shader
 * uses, which keeps the two in agreement.
 */
export function voxelPicker(ctx: {
  uniforms: Record<string, number | boolean | ArrayLike<number>>;
  varying: { vUv: Vec2 };
  varyings?: Record<string, Vec2>;
  textures: Record<string, VoxelTexture>;
}): Vec3 {
  const varyings = ctx.varyings ?? {};
  varyings[shaders.vUv] = ctx.varying.vUv;
  return cpuVoxelPicker({ ...ctx, varyings }) as Vec3;
}

/**
 * The colour the fragment shader would have drawn at `varying.vUv`, as red,
 * green, blue and alpha from nought to one. The same march, palette and light
 * the preview draws with — so a picture made this way and the preview on screen
 * are the same rendering, not two that resemble each other.
 */
export function voxelRenderer(ctx: {
  uniforms: Record<string, number | boolean | ArrayLike<number>>;
  varying: { vUv: Vec2 };
  varyings?: Record<string, Vec2>;
  textures: Record<string, VoxelTexture>;
}): Vec4 {
  const varyings = ctx.varyings ?? {};
  varyings[shaders.vUv] = ctx.varying.vUv;
  return cpuVoxelRenderer({ ...ctx, varyings }) as Vec4;
}
