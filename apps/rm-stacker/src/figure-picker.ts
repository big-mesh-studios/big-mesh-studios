// A pointer's ray followed through a whole figure rather than through one
// part's volume: which voxel of which part it meets first. The traversal is the
// same CPU marcher a single volume is picked with, asked once per part.
import {
  Dimensions3D,
  Matrix3x3,
  type Dimensions2D,
  type RGBA,
  type Vector2D,
  type Vector3D,
} from "@big-mesh-studios/maths";
import {
  encodePalette,
  type FigureFraming,
  type PartPlacement,
  type SolvedPart,
} from "@big-mesh-studios/stacker/renderer";
import shaders from "./shaders";
import { voxelPicker } from "./voxel-picker";
import { AMBIENT_COLOUR, LIGHT_COLOUR } from "./voxel-preview-scene";

/** A voxel a ray met, and the part whose volume holds it. */
export interface FigurePick {
  part: string;
  voxel: [number, number, number];
}

/** A figure as it stands to be picked, and the view it is being looked at in. */
export interface FigurePickView {
  /** Every part's volume, in the order the figure holds them. */
  solved: readonly SolvedPart[];
  /** Where each part stands in voxels, and what its box is scaled by, in that same order. */
  placements: readonly PartPlacement[];
  /** How those voxels are drawn in the world the camera stands in. */
  framing: FigureFraming;
  /** The colours the volumes address. */
  palette: RGBA[];
  /** Where the pointer is, as a fraction of the canvas from its bottom left. */
  uv: Vector2D;
  /** The size of the drawing buffer the marcher builds its ray across. */
  resolution: Dimensions2D;
  /** How far down the z axis the camera stands from the origin it looks at. */
  cameraDistance: number;
  /** The turn that carries a point of the world into the figure's own space. */
  worldToModel: Matrix3x3;
  /** The turn that carries a point of the figure's space out into the world. */
  modelToWorld: Matrix3x3;
  /** Which way the light comes from, in the figure's own space. */
  lightDirection: Vector3D;
  /** Whether the colours are shown flat rather than lit. */
  unlit: boolean;
}

/**
 * The voxel a ray from `view.uv` meets first anywhere in the figure, or
 * undefined when it meets none.
 *
 * The marcher walks a volume standing at the origin, so a part is asked about
 * by moving the camera by where that part stands instead — out of the figure's
 * space and into the world, then away by the part's own place — which puts the
 * same ray in the part's own terms. It hands back which voxel a ray met and not
 * how far along it, so the parts that were met are ranked afterwards by how
 * near the camera the voxel each of them named is drawn. Every part of a figure
 * is drawn at one voxel size, so the nearest voxel centre is the nearest voxel.
 */
export function pickFigure(view: FigurePickView): FigurePick | undefined {
  const encodedPalette = encodePalette(view.palette);
  const partOffset: Vector3D = { x: 0, y: 0, z: 0 };
  const stands = { position: { x: 0, y: 0, z: 0 }, scale: 0 };
  const voxelCentre: Vector3D = { x: 0, y: 0, z: 0 };
  const inWorld: Vector3D = { x: 0, y: 0, z: 0 };
  const normalized: Dimensions3D = { width: 0, height: 0, depth: 0 };

  let nearest: FigurePick | undefined;
  let nearestDistance = Infinity;

  const { focus, voxelSize } = view.framing;

  view.solved.forEach(({ name, dimensions, voxels }, index) => {
    const placed = view.placements[index];

    if (placed === undefined || voxels.length === 0) {
      return;
    }

    // The placement measures the part in voxels from the figure's origin; the
    // marcher wants it where the camera sees it, which is what the framing says.
    stands.position.x = (placed.position.x - focus.x) * voxelSize;
    stands.position.y = (placed.position.y - focus.y) * voxelSize;
    stands.position.z = (placed.position.z - focus.z) * voxelSize;
    stands.scale = placed.scale * voxelSize;

    Dimensions3D.normalize(dimensions, normalized);
    Matrix3x3.transform(view.modelToWorld, stands.position, partOffset);

    const met = voxelPicker({
      uniforms: {
        [shaders.uResolution]: [view.resolution.width, view.resolution.height],
        [shaders.uDimensions]: [
          normalized.width,
          normalized.height,
          normalized.depth,
        ],
        [shaders.uVoxelCount]: [
          dimensions.width,
          dimensions.height,
          dimensions.depth,
        ],
        [shaders.uLightDir]: [
          view.lightDirection.x,
          view.lightDirection.y,
          view.lightDirection.z,
        ],
        [shaders.uLightColour]: Array.from(LIGHT_COLOUR),
        [shaders.uAmbientColour]: Array.from(AMBIENT_COLOUR),
        [shaders.uCameraPosition]: [
          -partOffset.x / stands.scale,
          -partOffset.y / stands.scale,
          (view.cameraDistance - partOffset.z) / stands.scale,
        ],
        [shaders.uWorldToModel]: Array.from(view.worldToModel),
        [shaders.uUnlit]: view.unlit,
      },
      varying: { vUv: [view.uv.x, view.uv.y] },
      textures: {
        [shaders.uVoxels]: {
          data: voxels,
          width: dimensions.width,
          height: dimensions.height,
          depth: dimensions.depth,
        },
        [shaders.uPalette]: {
          data: encodedPalette,
          width: view.palette.length,
          height: 1,
        },
      },
    });

    if (met[0] < 0) {
      return;
    }

    // The marcher anchors cell 0 at half the normalized box below the origin,
    // so a cell's centre is that corner plus half a cell along each axis.
    voxelCentre.x =
      (normalized.width * (met[0] + 0.5)) / dimensions.width -
      normalized.width / 2;
    voxelCentre.y =
      (normalized.height * (met[1] + 0.5)) / dimensions.height -
      normalized.height / 2;
    voxelCentre.z =
      (normalized.depth * (met[2] + 0.5)) / dimensions.depth -
      normalized.depth / 2;

    // Out of the part's own space, up to the size and the place the figure
    // draws it at, and from there into the world the camera stands in.
    voxelCentre.x = voxelCentre.x * stands.scale + stands.position.x;
    voxelCentre.y = voxelCentre.y * stands.scale + stands.position.y;
    voxelCentre.z = voxelCentre.z * stands.scale + stands.position.z;
    Matrix3x3.transform(view.modelToWorld, voxelCentre, inWorld);

    const away = Math.hypot(
      inWorld.x,
      inWorld.y,
      inWorld.z - view.cameraDistance,
    );

    if (away < nearestDistance) {
      nearestDistance = away;
      nearest = { part: name, voxel: [met[0], met[1], met[2]] };
    }
  });

  return nearest;
}
