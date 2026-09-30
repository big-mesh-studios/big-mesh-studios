// A figure as the triangles something would be printed from.
//
// A model is drawn as geometry rather than marched, and the geometry is already
// triangles in the arrays a vertex buffer is bound from. So printing it is the
// same sweep the preview runs, over the same volumes, followed by the two things
// a printer wants and a screen does not: a size, and a place to stand.
//
// The sweep here is the mesher's own, chunk by chunk, so a model wider than one
// chunk is meshed the same way it is drawn and comes out with the same faces. A
// part is swept in its own voxel space and posed afterwards, which is what lets a
// part be turned about its pivot and still be a solid, and which is why nothing
// here knows about meshes or a scene graph: this is arithmetic over arrays.
import { Vector3D } from "@big-mesh-studios/maths";
import {
  boundsCentre,
  figurePlacement,
  standingPoint,
  type FigureBounds,
} from "../box";
import {
  composePose,
  partDimensions,
  type Figure,
  type Part,
  type PartPose,
} from "../data";
import {
  allChunks,
  chunkAt,
  chunkCounts,
  chunkExtent,
  chunkOrigin,
  colourLaneAt,
  createMeshBuilder,
  Growable,
  meshChunkFaces,
  type MeshBuilder,
} from "../mesh";
import { packedFaces } from "../solver";
import { solvePart } from "../solved";

/**
 * One part of a figure as a solid, standing where its pose puts it, measured in
 * millimetres from the corner of the bed it is printed against.
 */
export interface PrintPart {
  name: string;
  /** Three floats a vertex, in millimetres. */
  vertices: Float32Array;
  /** Three of them a triangle, counting from the start of `vertices`. */
  triangles: Uint32Array;
  /** The palette slot the face of each triangle shows, one a triangle. */
  colour: Uint8Array;
}

/** How large a figure is to be printed. */
export interface PrintOptions {
  /** How tall the whole figure stands, in millimetres, on the bed. */
  height: number;
}

/**
 * Every part of `figure` as a solid, stood on a bed and measured in millimetres.
 * A part with nothing drawn in it is left out, because a mesh of no triangles is
 * not a solid.
 *
 * @throws when there is no height to print, which is a figure with no parts
 * standing or a height that is not a size.
 */
export function printFigure(
  figure: Figure,
  options: PrintOptions,
): PrintPart[] {
  const bounds = figurePlacement(figure).bounds;
  const tall = bounds.dimensions.height;

  if (!Number.isFinite(options.height) || options.height <= 0) {
    throw new Error("a printed model needs a height above the bed");
  }

  if (tall <= 0) {
    throw new Error("this figure has no height to print");
  }

  const stand = bedStanding(bounds, options.height / tall);
  const into = createMeshBuilder();

  return figure.parts
    .map((part) => printedPart(part, composePose(figure, part), stand, into))
    .filter((part) => part.triangles.length > 0);
}

/**
 * `part`'s own faces, swept in its own voxel space and then posed, so that the
 * turn, the scale and the roots a part hangs off are applied to geometry rather
 * than to a box drawn around it.
 *
 * @param stand What turns a point of the figure into a point on the bed.
 * @param into The sweep's own scratch, reused across the chunks of every part so
 * that a builder which has met the largest chunk allocates nothing again.
 * @returns The part as a solid, with no triangles at all where nothing was drawn.
 */
function printedPart(
  part: Part,
  pose: PartPose,
  stand: (point: Vector3D) => Vector3D,
  into: MeshBuilder,
): PrintPart {
  const dimensions = partDimensions(part);
  const faces = packedFaces(dimensions, solvePart(part).voxels);
  const counts = chunkCounts(dimensions);

  const vertices = new Growable<Float32Array>(Float32Array);
  const triangles = new Growable<Uint32Array>(Uint32Array);
  const colour = new Growable<Uint8Array>(Uint8Array);

  // A chunk counts from the start of its own vertices, so a part meshed as
  // several chunks needs each chunk's indices lifted onto the ones before it.
  let first = 0;

  for (const key of allChunks(dimensions)) {
    const at = chunkAt(key, counts);
    const meshed = meshChunkFaces(
      dimensions,
      faces,
      chunkOrigin(at),
      chunkExtent(dimensions, at),
      into,
    );

    for (let v = 0; v < meshed.positions.length; v += 3) {
      const placed = stand(
        standingPoint(
          pose,
          part.pivot,
          meshed.positions[v],
          meshed.positions[v + 1],
          meshed.positions[v + 2],
        ),
      );
      vertices.pushTriple(placed.x, placed.y, placed.z);
    }

    for (let t = 0; t < meshed.indices.length; t += 3) {
      triangles.pushTriple(
        first + meshed.indices[t],
        first + meshed.indices[t + 1],
        first + meshed.indices[t + 2],
      );
      // A rectangle is merged from faces showing one colour, so the first of a
      // triangle's three vertices names the colour of all three.
      colour.push(meshed.packed[colourLaneAt(meshed.indices[t])]);
    }

    first += meshed.positions.length / 3;
  }

  return {
    name: part.name,
    vertices: vertices.exact(),
    triangles: triangles.exact(),
    colour: colour.exact(),
  };
}

/**
 * What turns a point of the figure into a point of the printed model, measured
 * from the corner of the bed and in millimetres.
 *
 * Three steps, and the order is the whole of it. The figure is first brought
 * over the origin with its underside on the bed, then stood up, and only then
 * measured: standing it up after the shift is what puts the underside of the
 * figure — whichever way the turn happened to leave it — flat on the bed rather
 * than on its side.
 *
 * The figure is drawn with `+y` up and a slicer reads `+z` up, so the turn is
 * `(x, y, z) -> (x, -z, y)`. It is right-handed and so is a turn rather than a
 * mirror, which is what leaves the mesher's outward winding outward.
 *
 * @param bounds The box the figure's parts together fill, in voxels from the
 * figure's origin.
 * @param millimetres How many millimetres one voxel is measured as.
 */
function bedStanding(
  bounds: FigureBounds,
  millimetres: number,
): (point: Vector3D) => Vector3D {
  const centre = boundsCentre(bounds);

  return ({ x, y, z }: Vector3D) =>
    Vector3D.create(
      (x - centre.x) * millimetres,
      -(z - centre.z) * millimetres,
      (y - bounds.low.y) * millimetres,
    );
}
