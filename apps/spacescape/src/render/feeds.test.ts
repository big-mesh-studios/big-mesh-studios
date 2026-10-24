import { describe, expect, it } from "vitest";
import {
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
} from "@random-mesh/rmsl/scene";

import {
  aimCamera,
  createScreenLayer,
  MAX_LIVE_FEEDS,
  screenQuaternion,
} from "./feeds";
import type { HostCamera, HostScreen } from "../places/host";

/**
 * The feed maths, and the screen layer's bookkeeping.
 *
 * The maths is pure and checked without a canvas: a quaternion that stands a screen upright, and a
 * camera aimed at a point with the frame's own up. The layer is GL-free until something renders —
 * a `Scene`, a `Mesh` and a `WebGLRenderTarget` are all plain objects in rmsl — so the parts worth
 * testing are the ones a frame loop can get wrong: which screens become feeds, which are capped,
 * what a removed screen leaves behind, and whether a camera being drawn hides the screens showing
 * it.
 */

/** `x`, `y`, `z` and `w` of a quaternion, rounded so a comparison reads as one line. */
const rounded = (q: { x: number; y: number; z: number; w: number }): number[] =>
  [q.x, q.y, q.z, q.w].map((value) => Math.round(value * 1000) / 1000);

/** A camera the host would hold, with only the fields a feed reads. */
const camera = (id: string, at = { x: 0, y: 3, z: 0 }): HostCamera => ({
  id,
  at,
  target: { x: 0, y: 3, z: 10 },
  fov: undefined,
});

/** A screen the host would hold. */
const screen = (
  id: string,
  source: HostScreen["source"],
  at = { x: 0, y: 2, z: 5 },
): HostScreen => ({ id, source, at, yaw: 0, width: 2, height: 1 });

describe("a screen stands upright", () => {
  it("faces +Z with no yaw on flat ground, which is the convention everywhere else", () => {
    const turn = screenQuaternion({ x: 0, y: 1, z: 0 }, 0);
    // The identity: local +X is +X, +Y is +Y and +Z is +Z. A screen whose normal was `+Y` would
    // be lying on the ground, which is the bug this asserts against.
    expect(rounded(turn)).toEqual([0, 0, 0, 1]);
  });

  it("turns about up, so a quarter turn faces +X and keeps the screen's own up", () => {
    const up = { x: 0, y: 1, z: 0 };
    const turn = screenQuaternion(up, Math.PI / 2);
    // A right-handed turn of +90° about +Y takes +Z to +X.
    expect(rounded(turn)).toEqual([0, 0.707, 0, 0.707]);

    // Applying the quaternion to the quad's local axes: +Z is now +X, and +Y is still up. This
    // is the assertion the quaternion components alone only imply.
    const rotation = new Quaternion(turn.x, turn.y, turn.z, turn.w);
    const normal = new Vector3(0, 0, 1).applyQuaternion(rotation);
    const upright = new Vector3(0, 1, 0).applyQuaternion(rotation);
    expect(normal.x).toBeCloseTo(1);
    expect(normal.z).toBeCloseTo(0);
    expect(upright.y).toBeCloseTo(1);
  });
});

describe("a feed camera is aimed, not merely moved", () => {
  it("puts the camera at the view's position and looks at its target", () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    aimCamera(
      camera,
      { at: { x: 1, y: 2, z: 3 }, target: { x: 1, y: 2, z: 8 } },
      2,
      { x: 0, y: 1, z: 0 },
      50,
    );

    expect(camera.position.x).toBe(1);
    expect(camera.position.y).toBe(2);
    expect(camera.position.z).toBe(3);
    expect(camera.aspect).toBe(2);
    // The feed's aspect, not the player's, because the target is not the canvas.
    const forward = camera.getWorldDirection(new Vector3());
    expect(forward.z).toBeCloseTo(1);
    expect(forward.x).toBeCloseTo(0);
    expect(forward.y).toBeCloseTo(0);
  });

  it("uses the player's lens when the camera does not name one", () => {
    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    aimCamera(
      camera,
      { at: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 1 } },
      1,
      { x: 0, y: 1, z: 0 },
      72,
    );
    expect(camera.fov).toBe(72);
  });
});

describe("the screens in the world", () => {
  /** A scene and a view a frame loop would hand the layer. */
  const setup = () => {
    const scene = new Scene();
    const layer = createScreenLayer(scene);
    const view = {
      camera: new PerspectiveCamera(50, 16 / 9, 0.1, 1000),
      viewportHeight: 720,
      upAt: () => ({ x: 0, y: 1, z: 0 }),
    };
    return { scene, layer, view };
  };

  it("turns a screen whose camera exists into a feed, and leaves a photo alone", () => {
    const { scene, layer, view } = setup();
    const cameras = new Map([["hall", camera("hall")]]);
    layer.sync(
      [
        screen("live", { camera: "hall" }),
        screen("still", { photo: "shot" }),
        screen("dangling", { camera: "gone" }),
      ],
      cameras,
      new Map(),
      view,
    );

    // **Every screen is a quad, including the ones with no picture.** A monitor a place declared
    // is a monitor; what it shows is the part that can be missing.
    expect(scene.children).toHaveLength(3);
    expect(
      layer.feeds({ x: 0, y: 0, z: 0 }).map((feed) => feed.screen.id),
    ).toEqual(["live"]);
    layer.dispose();
  });

  it("caps the live feeds at MAX_LIVE_FEEDS and picks the nearest, whatever order they arrive in", () => {
    const { layer, view } = setup();
    const cameras = new Map([
      ["a", camera("a")],
      ["b", camera("b")],
      ["c", camera("c")],
    ]);
    const screens = [
      screen("far", { camera: "a" }, { x: 0, y: 0, z: 100 }),
      screen("near", { camera: "b" }, { x: 0, y: 0, z: 1 }),
      screen("middle", { camera: "c" }, { x: 0, y: 0, z: 10 }),
    ];
    layer.sync(screens, cameras, new Map(), view);

    const feeds = layer.feeds({ x: 0, y: 0, z: 0 });
    expect(feeds).toHaveLength(MAX_LIVE_FEEDS);
    expect(feeds.map((feed) => feed.screen.id)).toEqual(["near", "middle"]);
    layer.dispose();
  });

  it("shows black until a pass has drawn into the target, then names that target's texture", () => {
    const { layer, view } = setup();
    layer.sync(
      [screen("live", { camera: "hall" })],
      new Map([["hall", camera("hall")]]),
      new Map(),
      view,
    );

    const feed = layer.feeds({ x: 0, y: 0, z: 0 })[0]!;
    // **Undrawn is black, not whatever the driver left in the attachment.** The texture is only
    // named after the first pass, which is what `markRendered` records.
    expect(layer.textureOf("live")).not.toBe(feed.target.texture);
    layer.markRendered("live");
    expect(layer.textureOf("live")).toBe(feed.target.texture);
    layer.dispose();
  });

  it("hides the screens showing the camera being drawn, and puts them back", () => {
    const { scene, layer, view } = setup();
    const cameras = new Map([["hall", camera("hall")]]);
    layer.sync(
      [screen("one", { camera: "hall" }), screen("two", { camera: "hall" })],
      cameras,
      new Map(),
      view,
    );

    layer.hideShowing("hall", true);
    // **The quads go away; the feeds do not.** Hiding is what stops a pass sampling the texture
    // attached to its own framebuffer, and `markRendered` still has to find the screen afterwards.
    expect(scene.children.map((child) => child.visible)).toEqual([
      false,
      false,
    ]);
    expect(layer.feeds({ x: 0, y: 0, z: 0 })).toHaveLength(MAX_LIVE_FEEDS);

    layer.hideShowing("hall", false);
    expect(scene.children.map((child) => child.visible)).toEqual([true, true]);
    layer.dispose();
  });

  it("keeps a target's aspect ratio when a screen is resized without crossing a bucket", () => {
    // **The bucket is not the only reason to re-specify the attachment.** A monitor the player is
    // standing in front of can be made tall and thin by `moveScreen`, and a target that kept the
    // old ratio would stretch the picture into a shape the screen does not have.
    const { layer, view } = setup();
    const cameras = new Map([["hall", camera("hall")]]);
    layer.sync([screen("live", { camera: "hall" })], cameras, new Map(), view);
    const feed = layer.feeds({ x: 0, y: 0, z: 0 })[0]!;
    expect(feed.target.width / feed.target.height).toBeCloseTo(2);

    layer.sync(
      [{ ...screen("live", { camera: "hall" }), width: 1, height: 2 }],
      cameras,
      new Map(),
      view,
    );
    const resized = layer.feeds({ x: 0, y: 0, z: 0 })[0]!;
    expect(resized.target).toBe(feed.target);
    expect(resized.target.width / resized.target.height).toBeCloseTo(0.5);
    layer.dispose();
  });

  it("takes a screen's quad out of the scene when the host stops listing it", () => {
    const { scene, layer, view } = setup();
    const cameras = new Map([["hall", camera("hall")]]);
    layer.sync([screen("one", { camera: "hall" })], cameras, new Map(), view);
    expect(scene.children).toHaveLength(1);

    layer.sync([], cameras, new Map(), view);
    expect(scene.children).toHaveLength(0);
    expect(layer.feeds({ x: 0, y: 0, z: 0 })).toEqual([]);
    layer.dispose();
  });
});
