/**
 * Fog: two layers of air, for two jobs that cannot share one number.
 *
 * ## The two jobs
 *
 * **The near field closes the chunk window.** The window is four chunks on a side, 1280 world units,
 * and the camera's far plane is four hundred thousand, so the terrain stops at a small fraction of the
 * depth of the frame and its edge is a hard line the eye resolves perfectly well. A distance
 * exponential steep enough to hide that line is what the first term is, and its far distance is **the
 * window's radius** rather than an art decision.
 *
 * **The atmosphere is a spherical shell around the planet**, and it is what reveals the surface from
 * above. It cannot be the same term: hiding a 1280-unit window needs an extinction that swallows
 * everything past it, and that same extinction swallows the whole planet from orbit — the surface is
 * thousands of units away in every direction, and a distance law cannot tell "far" from "the air is
 * thin up here". So the second term integrates the air along the eye→fragment ray through the shell
 * (`atmosphere.ts`), and the two are summed as optical depths:
 *
 *     fog = 1 − exp(−τ_near − τ_air)
 *
 * ## Why the near term is switched off with altitude
 *
 * `nearField` scales the window term and is set each frame to the complement of the globe's own
 * opacity, so it falls from one to zero across the 420→900-unit band where the streamed chunks
 * crossfade to the far-field globe. That coupling is the point: the near term exists to hide where the
 * chunks *end*, and once the globe has taken over there is no window edge left to hide. Above the
 * band the fog is the atmosphere and nothing else, which is why the planet is visible from up there.
 *
 * ## Why exponential rather than the reference's smoothstep
 *
 * `big-mesh-studios`'s voxelscape ramps fog with `smoothstep(near, far, distance)`, which is a
 * straight line between two distances and has a visible terminus: everything past `far` is one flat
 * colour, and the band where it reaches that colour is a ring. An exponential has no terminus and no
 * ring — it never arrives, and the eye cannot find the place where it stops.
 */

import type { Node, UniformNode } from "@random-mesh/rmsl";
import { exp, float } from "@random-mesh/rmsl";
import type { Builder } from "@random-mesh/rmsl/scene";

import { BLOCK_WORLD } from "../constants";
import {
  ATMOSPHERE_EXTINCTION,
  ATMOSPHERE_HEIGHT,
  ATMOSPHERE_SCALE_HEIGHT,
  DEFAULT_PLANET_RADIUS,
  airMassNode,
} from "./atmosphere";

/** Where the fog starts, in world units. */
export const FOG_NEAR = 500;

/**
 * Where the fog has effectively hidden everything.
 *
 * Four chunks on a side, which is where the streaming window stops placing cells. Not
 * the far plane: the terrain genuinely ends here, and this is the distance that fact
 * is visible at.
 */
export const FOG_FAR = 4 * BLOCK_WORLD;

/**
 * How steeply the fog closes, in multiples of "fully fogged" over `FOG_FAR - FOG_NEAR`.
 *
 * Three and a half, chosen so that at `FOG_FAR` about three per cent of the surface
 * still shows. Steeper would reach solid sooner and start banding in the gradient;
 * shallower would let the window's edge through.
 */
export const FOG_FALLOFF = 3.5;

/**
 * How fast the air thins with height, in world units.
 *
 * The scale height of the atmosphere term, re-exported from `atmosphere.ts`, which integrates the
 * column that reveals the planet. Kept here because every caller that configures a fog has always
 * reached for it, and because the near-field term and the column have to agree about the air they
 * are both made of.
 */
export const FOG_SCALE_HEIGHT = ATMOSPHERE_SCALE_HEIGHT;

/**
 * The radius of the world this fog is in, so the column can tell a height above the ground from a
 * distance from the eye.
 *
 * Re-exported from `atmosphere.ts`, where the shell is defined, so a caller can keep reaching it
 * through the fog it configures.
 */
export { DEFAULT_PLANET_RADIUS };

export class Fog {
  /** What everything fades towards: the sky at the horizon. */
  colour: [number, number, number] = [0.53, 0.81, 0.92];

  /**
   * This world's sea level, so the column can tell a height above the ground from a distance
   * from the eye.
   *
   * **A distance from the centre on a sphere and an altitude on a plane**, and the field is
   * named `seaLevel` rather than `planetRadius` because that is the only name both shapes fit
   * under. It defaults to the library's planet radius — which every caller in this repository
   * used to get without saying so, and which is the right answer for exactly one of the two
   * worlds this application can build.
   *
   * **Assigned rather than readonly, and read per draw through a uniform thunk.** A world can
   * change shape while it runs, and moving this costs nothing for the reason `Fog.nearField`
   * does not need a `needsUpdate` either.
   */
  seaLevel: number;

  /**
   * Whether this world has a silhouette for the air to sit against.
   *
   * **Read per draw and not compiled in**, because the near-field term is world-independent and
   * only the atmosphere column branches on it — a uniform costs one select per fragment against a
   * material that has to be rebuilt, and a fog is the one material here that every surface in the
   * scene shares.
   */
  spherical: boolean;

  /** How far the shell reaches above the sea. */
  readonly atmosphereHeight: number;

  /** How fast the air thins with height. */
  readonly scaleHeight: number;

  /**
   * How much of the near-field window fog is showing, 0 to 1.
   *
   * **Driven per frame with the complement of the globe's opacity.** One at the ground, where the
   * chunks are the surface and their window's edge has to be hidden; zero above the 420→900 band,
   * where the globe has taken over and there is no window edge left. The frame loop writes it
   * alongside the materials' own opacity, from the same `globeOpacityAt`, so the two cannot drift.
   *
   * **And one on a flat world, deliberately.** There is no globe to fade in, so nothing ever
   * writes it below 1 — and that is the right value rather than the absence of one: a height
   * field has a window edge at `FOG_FAR` and nothing beyond it, so the window fog is the whole of
   * what hides the edge.
   */
  nearField = 1;

  /**
   * Whether any fog is mixed in at all.
   *
   * **A real off switch, where `nearField = 0` is not one.** Zeroing the near field only removes
   * the window term; the atmosphere column is world-independent and still tints everything toward
   * the fog colour, so a level editor wanting bare geometry cannot get there by turning one of
   * the two knobs down. The level editor sets this false while it is open — fog hides the exact
   * edges a person is placing against — and restores it on close.
   *
   * **A flag rather than a zeroed colour or distance**, because those are meaningful values and a
   * fog that disabled itself by being set to one of them would be indistinguishable from a
   * world that had asked for it.
   */
  enabled = true;

  private uniform?: UniformNode<"vec3">;
  private enabledUniform?: UniformNode<"float">;
  private seaLevelUniform?: UniformNode<"float">;
  private sphericalUniform?: UniformNode<"float">;
  private atmosphereUniform?: UniformNode<"float">;
  private scaleUniform?: UniformNode<"float">;
  private nearFieldUniform?: UniformNode<"float">;

  constructor(
    seaLevel = DEFAULT_PLANET_RADIUS,
    scaleHeight = FOG_SCALE_HEIGHT,
    atmosphereHeight = ATMOSPHERE_HEIGHT,
    spherical = true,
  ) {
    this.seaLevel = seaLevel;
    this.scaleHeight = scaleHeight;
    this.atmosphereHeight = atmosphereHeight;
    this.spherical = spherical;
  }

  /**
   * Points the fog at a different world.
   *
   * **Two assignments, and no `needsUpdate`** — both numbers are read through uniform thunks on
   * each draw, which is the same arrangement `nearField` has had since it was written.
   */
  setWorld(world: {
    readonly seaLevel: number;
    readonly spherical: boolean;
  }): void {
    this.seaLevel = world.seaLevel;
    this.spherical = world.spherical;
  }

  declare(b: Builder): void {
    this.uniform = b.materialUniform("uFogColour", "vec3", () => this.colour);
    this.seaLevelUniform = b.materialUniform(
      "uFogSeaLevel",
      "float",
      () => this.seaLevel,
    );
    this.sphericalUniform = b.materialUniform("uFogSpherical", "float", () =>
      this.spherical ? 1 : 0,
    );
    this.atmosphereUniform = b.materialUniform(
      "uFogAtmosphere",
      "float",
      () => this.atmosphereHeight,
    );
    this.scaleUniform = b.materialUniform(
      "uFogScale",
      "float",
      () => this.scaleHeight,
    );
    this.nearFieldUniform = b.materialUniform(
      "uFogNearField",
      "float",
      () => this.nearField,
    );
    this.enabledUniform = b.materialUniform("uFogEnabled", "float", () =>
      this.enabled ? 1 : 0,
    );
  }

  /**
   * `colour` faded towards the fog colour by the air between the fragment and the eye.
   *
   * Two optical depths are summed and passed through one exponential, so neither term can invert the
   * mix on its own: the near term clamps at zero and the column is never negative, so the weight is
   * in `[0, 1)` at every distance. The old law had to clamp `distance − FOG_NEAR` to avoid
   * extrapolating *past* the surface colour near the eye; with the sum that case cannot arise.
   */
  apply(b: Builder, colour: Node<"vec3">): Node<"vec3"> {
    // The near field: the window closure, switched off as the globe takes over. **World
    // independent** — it is a distance from the eye and nothing else — which is why one fog
    // serves a planet and a height field without this term knowing.
    const nearTau = b.positionWorld
      .sub(b.cameraPosition)
      .length()
      .sub(float(FOG_NEAR))
      .max(float(0))
      .mul(float(FOG_FALLOFF / (FOG_FAR - FOG_NEAR)))
      .mul(this.nearFieldUniform!);

    // The atmosphere: the column through the shell, which is what is left from orbit. **The only
    // term here that asks what shape the world is**, and it asks through `airMassNode` rather than
    // at this call site — the sphere's quadratic and the plane's two divisions are both behind
    // that one flag.
    const airTau = airMassNode(
      b.cameraPosition,
      b.positionWorld,
      this.seaLevelUniform!,
      this.atmosphereUniform!,
      this.scaleUniform!,
      this.sphericalUniform!.greaterThan(0.5),
    ).mul(float(ATMOSPHERE_EXTINCTION));

    // **The enabled flag is a multiplier on the amount, not an early return**, because the node
    // graph is compiled once and there is no branch to take: zero is the identity for the mix,
    // so a disabled fog costs one multiply and leaves `colour` untouched.
    const amount = float(1)
      .sub(exp(nearTau.add(airTau).negate()))
      .mul(this.enabledUniform!);
    return colour.mix(this.uniform!, amount);
  }
}

/**
 * The fog colour the day implies.
 *
 * Kept as a function rather than left to each caller to remember which of the sky's two
 * colours fog wants: the horizon's, because fog is what the horizon looks like when it
 * is full of air.
 */
export const fogColourOf = (
  skyColour: [number, number, number],
): [number, number, number] => skyColour;
