import shaders from "./shaders";
import { voxelPicker as cpuVoxelPicker } from "./voxel-picker-cpu";

type Vec2 = [number, number];
type Vec3 = [number, number, number];

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
