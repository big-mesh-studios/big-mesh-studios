import shaders from "../shaders";
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
 * The precompiled picker reads the click's UV from
 * `ctx.uniforms[shaders.uClickUv]`, so this wrapper moves it there from the
 * friendly `ctx.uv` beside the other uniforms.
 */
export function voxelPicker(ctx: {
  uniforms: Record<string, number | boolean | ArrayLike<number>>;
  uv: Vec2;
  textures: Record<string, VoxelTexture>;
}): Vec3 {
  const uniforms = { ...ctx.uniforms, [shaders.uClickUv]: ctx.uv };
  return Array.from(cpuVoxelPicker({ ...ctx, uniforms })) as Vec3;
}
