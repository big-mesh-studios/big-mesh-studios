/**
 * Live feeds: the render targets a screen shows, and the quads that show them.
 *
 * ## A screen is a surface, a feed is a pass
 *
 * A place says "put a monitor there showing the hallway camera" and the engine has to turn that
 * into pixels. The only way to do it without a readback — and a readback is a hundred kilobytes a
 * frame per screen — is to draw the world into a texture and let the monitor's own draw sample it.
 * That is what a `WebGLRenderTarget` is for, and rmsl 1.17 gives a target a `texture` a material
 * can name.
 *
 * So there are two things here, and they are deliberately separate:
 *
 * - **The feed** is a camera plus a target. It costs a pass, and only a handful can be drawn in a
 *   frame, which is why `MAX_LIVE_FEEDS` exists.
 * - **The screen** is a quad in the world. It costs nothing worth counting, which is why a place
 *   may have sixty-four of them and a room full of dark monitors is free.
 *
 * ## The resolution is derived, not chosen
 *
 * A script says how big a screen is in metres, not how many pixels to render. The pixels follow
 * from **how large the screen currently looks**: a monitor across a room is edge-on and far, so a
 * 64-pixel feed is honest; the one in front of the player is worth 512. The size is bucketed to a
 * power of two so walking towards a screen changes its target three or four times rather than
 * every frame, and the bucket never exceeds `MAX_FEED_SIZE`, which is what keeps a place from
 * asking for a four-kilopixel feed by putting a screen in a telescope.
 *
 * ## A screen showing the camera it is being fed by
 *
 * Sampling the texture that is attached to the currently bound framebuffer is undefined: the
 * attachment is a feedback loop, not an error. The engine therefore hides every screen whose
 * source is the camera being drawn, for the length of that pass, and puts it back afterwards. That
 * is the one ordering rule a caller has to know — draw the feed, then the world — and every other
 * ordering is already handled by `Renderer.render` restoring the canvas framebuffer on return.
 */

import {
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Side,
  WebGLRenderTarget,
  type Scene,
  type Texture,
} from "@random-mesh/rmsl/scene";
import {
  cross,
  normalize,
  onbFromDirection,
  rotateAboutAxis,
  type Quat,
  type Vec3,
} from "@big-mesh-studios/core";

import { quatFromBasis } from "../places/level/walls";
import type { HostCamera, HostImage, HostScreen } from "../places/host";

/**
 * How many live feeds are drawn in one frame.
 *
 * **Three, and the number is a frame budget rather than a design choice.** A live feed is a second
 * pass through the scene: every chunk, every figure, every cloud, drawn again from somewhere
 * else. A place with a camera in every room would otherwise pay for the whole world once per
 * screen. The rest keep their last picture, which is exactly what a room full of monitors should
 * look like.
 *
 * It lives here rather than in `places/limits.ts` for the reason `MAX_DRAWN_LIGHTS` lives in
 * `point-lights.ts`: this is how many the *renderer* can afford, not how many a place may
 * declare. `MAX_SCREENS` is the other question, and it is deliberately much larger.
 */
export const MAX_LIVE_FEEDS = 3;

/**
 * The sizes a feed is allowed to be, longest side first bucket.
 *
 * **Powers of two, because the choice is made once per bucket and a bucket should be worth
 * changing size for.** 64 is a monitor seen across a room and 512 is one the player could touch;
 * below 64 a live picture is a colour, and above 512 the screen is larger than the canvas it lands
 * on.
 */
const FEED_BUCKETS = [64, 128, 256, 512] as const;

/** The smallest and largest a feed may be, in pixels. Re-exported for the readout. */
export const MIN_FEED_SIZE = FEED_BUCKETS[0];
export const MAX_FEED_SIZE = FEED_BUCKETS[FEED_BUCKETS.length - 1];

/**
 * How many pixels one feed may hold at most.
 *
 * **The largest bucket squared**, and it is a cap rather than a field: a screen's aspect ratio
 * comes from its world size, so a long thin monitor at the top bucket is 512 by a few pixels
 * rather than 512 by 512. This bounds the worst case, which is a square.
 */
export const MAX_FEED_PIXELS = MAX_FEED_SIZE * MAX_FEED_SIZE;

/**
 * A black texel, shown until a photo or a feed has drawn its first frame.
 *
 * **Shared, and never disposed**, because it is the fallback for every screen that has no picture
 * yet and disposing it per screen would be a texture per screen for no gain. A `DataTexture`
 * rather than `null` because a material built with no map never creates its sampler, and a screen
 * that gains a picture later would then need a shader rebuild.
 */
const BLACK = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);

/**
 * The turn that stands a unit plane upright facing `yaw`.
 *
 * **The plane's own axes, built as a basis rather than as angles**, exactly as
 * `imagePlaneQuaternion` does for a picture on the ground: the columns of the rotation are the
 * images of the quad's local +X, +Y and +Z, and `quatFromBasis` is the standard matrix-to-quaternion
 * extraction.
 *
 * A screen is upright, so its local +Y is the world's up **at the screen**, not a constant. That is
 * what makes a monitor on a wall on a planet stand on that wall rather than tip towards the north
 * pole. Its local +Z is its facing, and at `yaw = 0` that is +Z on flat ground — the same
 * convention `lookAt` and the player's heading use.
 *
 * **`pitch` tips the plane away from upright, after the yaw.** A positive pitch raises the facing
 * towards the local up, so `Math.PI / 2` lays the plane face-up. The local up and facing turn
 * together about the plane's right axis, which keeps the basis orthonormal and the texture's top
 * edge on the far side of a face-up plane rather than its near side.
 *
 * **`b2` rather than `b1`**, negated, because `onbFromDirection` returns a basis in which
 * `b1 = +X` on flat ground: negating its second tangent is what gives the `+Z` that a yaw of zero
 * means everywhere else.
 */
export const screenQuaternion = (up: Vec3, yaw: number, pitch = 0): Quat => {
  const normalized = normalize(up);
  const upAt =
    normalized.x === 0 && normalized.y === 0 && normalized.z === 0
      ? { x: 0, y: 1, z: 0 }
      : normalized;
  const { b2 } = onbFromDirection(upAt);
  const facing = rotateAboutAxis({ x: -b2.x, y: -b2.y, z: -b2.z }, upAt, yaw);
  const right = cross(upAt, facing);
  if (pitch === 0) return quatFromBasis(right, upAt, facing);
  const tiltedUp = rotateAboutAxis(upAt, right, -pitch);
  const tiltedFacing = rotateAboutAxis(facing, right, -pitch);
  return quatFromBasis(right, tiltedUp, tiltedFacing);
};

/**
 * Points a camera through a place's camera definition.
 *
 * **The `up` is a parameter**, because it is a function of where the camera is (ADR 0037) and
 * `HostCamera` deliberately holds only a position and a target. A camera on the far side of a
 * planet needs that planet's up, not the player's.
 *
 * `fov` is absent for "the player's lens", which is what makes a feed look like the same world
 * seen from elsewhere rather than a different camera entirely.
 */
export const aimCamera = (
  camera: PerspectiveCamera,
  view: {
    readonly at: Vec3;
    readonly target: Vec3;
    readonly fov?: number | undefined;
  },
  aspect: number,
  up: Vec3,
  fallbackFov: number,
): void => {
  camera.up.set(up.x, up.y, up.z);
  camera.position.set(view.at.x, view.at.y, view.at.z);
  camera.fov = view.fov ?? fallbackFov;
  camera.aspect = aspect > 0 ? aspect : 1;
  camera.updateProjectionMatrix();
  camera.lookAt(view.target.x, view.target.y, view.target.z);
};

/** One live feed the application should draw, and the screen that will show it. */
export interface ScreenFeed {
  readonly screen: HostScreen;
  readonly camera: HostCamera;
  readonly target: WebGLRenderTarget;
}

/** One HUD feed the application should draw and read back. */
export interface HudFeed {
  readonly image: HostImage;
  readonly camera: HostCamera;
  readonly target: WebGLRenderTarget;
}

/** What the screen layer needs to know about the frame it is being synced for. */
export interface ScreenView {
  /** The camera the player sees through, so a screen's pixels follow its size on screen. */
  readonly camera: PerspectiveCamera;
  /** The drawing buffer's height in pixels. */
  readonly viewportHeight: number;
  /** Which way is up where a point is, because up is a function of position (ADR 0037). */
  readonly upAt: (point: Vec3) => Vec3;
}

interface ScreenEntry {
  readonly id: string;
  screen: HostScreen;
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  /** The feed's target, when the screen shows a camera that still exists. */
  target: WebGLRenderTarget | undefined;
  /** Which camera this screen shows, if any. */
  camera: HostCamera | undefined;
  /** The bucket the target was last sized for, so distance does not resize it every frame. */
  bucket: number;
  /**
   * The width-over-height the target was last sized for.
   *
   * **Separate from the bucket, because a screen can change shape without changing bucket.**
   * `moveScreen` may set a new width and height on a monitor the player is standing in front of,
   * and a target that kept the old ratio would stretch the picture — the bucket crossing a
   * boundary is not the only reason to re-specify the attachment.
   */
  aspect: number;
  /**
   * Whether the target holds a frame yet.
   *
   * **Because an undrawn target's contents are undefined**, and a monitor that shows whatever
   * memory the driver left there for one frame is worse than one that is black. The map is swapped
   * to the target's texture only after the first pass has drawn into it.
   */
  drawn: boolean;
  /** Hidden for the length of a pass because it shows the camera being drawn. */
  suppressed: boolean;
}

export interface ScreenLayer {
  /**
   * Makes the quads match `screens`, and chooses each live feed's resolution from where the
   * player's camera is.
   *
   * `photos` is the texture of every photo that exists, so a screen showing a still is drawn from
   * it with no pass at all. A photo that has not been captured yet is black, which is the documented
   * state of a photo between `takePhoto` and its first frame.
   */
  sync(
    screens: readonly HostScreen[],
    cameras: ReadonlyMap<string, HostCamera>,
    photos: ReadonlyMap<string, Texture>,
    view: ScreenView,
  ): void;
  /** The live feeds to draw this frame, nearest the player first and capped at `MAX_LIVE_FEEDS`. */
  feeds(player: Vec3): readonly ScreenFeed[];
  /**
   * Records that a feed's target now holds a frame.
   *
   * **Called after the pass, not before it**, so a screen never names a target that has not been
   * drawn into. The next `sync` swaps its material to the new texture.
   */
  markRendered(id: string): void;
  /** Hides every screen showing `cameraId`, for the length of that camera's own pass. */
  hideShowing(cameraId: string, hidden: boolean): void;
  /** Every screen's map, for a caller that needs to know what is on screen right now. */
  textureOf(id: string): Texture | undefined;
  /** Removes every screen, keeping the geometry and the pool. Used when a place goes away. */
  clear(): void;
  dispose(): void;
}

/**
 * The screens in the world, and the feeds behind them.
 *
 * **One geometry for every screen**, because a quad is a quad: the size lives on the mesh's scale.
 * A material per screen, because the map differs. Targets are pooled rather than freed when a
 * screen goes away — rmsl has no public "release this target" yet, and a pool keeps the cost of a
 * place that adds and removes monitors from growing without bound.
 */
export const createScreenLayer = (scene: Scene): ScreenLayer => {
  const geometry = new PlaneGeometry(1, 1);
  const entries = new Map<string, ScreenEntry>();
  /**
   * Targets nobody is using.
   *
   * **A pool rather than a leak.** `WebGLRenderTarget` has no dispose in rmsl 1.17, and every
   * target holds a framebuffer, a colour texture and a depth renderbuffer on the renderer's
   * context. A place that replaces its monitors would otherwise leak three GL objects per screen.
   * Popping from here means the number of targets ever allocated is the high-water mark of
   * simultaneous feeds, not the number ever created.
   */
  const pool: WebGLRenderTarget[] = [];
  /**
   * Materials nobody is using.
   *
   * **For the same reason, one level up.** rmsl has no `Material.dispose`, and the renderer keys
   * its compiled programs by material — so a screen that is removed and made again would leave a
   * program in that map forever. A screen's material is always the same shape (a `MeshBasicMaterial`
   * with a map, two-sided), so one spare can be handed straight to the next screen.
   */
  const spareMaterials: MeshBasicMaterial[] = [];

  const release = (target: WebGLRenderTarget | undefined): void => {
    if (target !== undefined) pool.push(target);
  };

  const remove = (entry: ScreenEntry): void => {
    scene.remove(entry.mesh);
    release(entry.target);
    spareMaterials.push(entry.material);
    entries.delete(entry.id);
  };

  /**
   * Picks a bucket for a screen, from how large it currently is on the player's screen.
   *
   * **The distance is the one thing that changes**, so this is called every `sync` and only
   * touches the target when the bucket changes. That is the whole trick: a player walking towards
   * a monitor crosses three bucket boundaries and the target is remade three times, rather than
   * every time the distance changes by a centimetre.
   */
  const chooseBucket = (screen: HostScreen, view: ScreenView): number => {
    const camera = view.camera;
    const distance = Math.max(
      0.01,
      Math.hypot(
        screen.at.x - camera.position.x,
        screen.at.y - camera.position.y,
        screen.at.z - camera.position.z,
      ),
    );
    // The world height the viewport covers at the screen's distance. `fov` is vertical and in
    // degrees, as `PerspectiveCamera` takes it.
    const halfHeight = distance * Math.tan((camera.fov * Math.PI) / 360);
    const pixelsPerUnit = view.viewportHeight / (2 * halfHeight);
    const longest = Math.max(screen.width, screen.height) * pixelsPerUnit;
    for (const bucket of FEED_BUCKETS) {
      if (bucket >= longest) return bucket;
    }
    return MAX_FEED_SIZE;
  };

  /** Gives a target the bucket's size, keeping the screen's aspect ratio. */
  const sizeTo = (
    target: WebGLRenderTarget,
    screen: HostScreen,
    bucket: number,
  ): void => {
    const aspect = screen.width / screen.height;
    if (aspect >= 1) {
      target.width = bucket;
      target.height = Math.max(1, Math.round(bucket / aspect));
    } else {
      target.height = bucket;
      target.width = Math.max(1, Math.round(bucket * aspect));
    }
  };

  const ensure = (screen: HostScreen): ScreenEntry => {
    const existing = entries.get(screen.id);
    if (existing !== undefined) return existing;
    // **A spare, or a new one.** The two-sided choice and the map are the whole material, so a
    // reused one is indistinguishable from a fresh one once `sync` sets its map.
    const material =
      spareMaterials.pop() ??
      new MeshBasicMaterial({
        map: BLACK,
        // **Two-sided**, because a screen is a surface with a back: a monitor on a stand is
        // walked around, and a picture that vanishes from behind is a bug the player sees
        // immediately.
        side: Side.DoubleSide,
      });
    material.map = BLACK;
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);
    const entry: ScreenEntry = {
      id: screen.id,
      screen,
      mesh,
      material,
      target: undefined,
      camera: undefined,
      bucket: 0,
      aspect: 0,
      drawn: false,
      suppressed: false,
    };
    entries.set(screen.id, entry);
    return entry;
  };

  return {
    sync(screens, cameras, photos, view): void {
      const live = new Set(screens.map((screen) => screen.id));
      for (const entry of [...entries.values()]) {
        if (!live.has(entry.id)) remove(entry);
      }

      for (const screen of screens) {
        const entry = ensure(screen);
        entry.screen = screen;
        const camera =
          "camera" in screen.source
            ? cameras.get(screen.source.camera)
            : undefined;

        if (camera !== undefined) {
          if (entry.target === undefined) {
            entry.target = pool.pop() ?? new WebGLRenderTarget(1, 1);
            entry.bucket = 0;
            entry.aspect = 0;
          }
          const bucket = chooseBucket(screen, view);
          const aspect = screen.width / screen.height;
          if (bucket !== entry.bucket || aspect !== entry.aspect) {
            sizeTo(entry.target, screen, bucket);
            entry.bucket = bucket;
            entry.aspect = aspect;
            // **A resized target is a target with no frame in it**, because making it again is
            // what a resize does. Black for one frame beats sampling an incomplete attachment.
            entry.drawn = false;
          }
          entry.camera = camera;
          entry.material.map = entry.drawn ? entry.target.texture : BLACK;
        } else {
          // A photo, or a camera that has gone. The host removes screens when a camera is removed,
          // so the second case is a race rather than a state; black is the honest answer for both.
          release(entry.target);
          entry.target = undefined;
          entry.camera = undefined;
          entry.bucket = 0;
          entry.aspect = 0;
          entry.drawn = false;
          entry.material.map =
            "photo" in screen.source
              ? (photos.get(screen.source.photo) ?? BLACK)
              : BLACK;
        }

        entry.mesh.position.set(screen.at.x, screen.at.y, screen.at.z);
        // **The screen's up is the world's up where it stands.** `+Y` is only correct on a flat
        // world, and the one thing this layer must not assume is that the world is flat.
        const turn = screenQuaternion(view.upAt(screen.at), screen.yaw);
        entry.mesh.quaternion.set(turn.x, turn.y, turn.z, turn.w);
        entry.mesh.scale.set(screen.width, screen.height, 1);
        entry.mesh.visible = !entry.suppressed;
      }
    },

    feeds(player): readonly ScreenFeed[] {
      const live: ScreenFeed[] = [];
      for (const entry of entries.values()) {
        if (entry.target === undefined || entry.camera === undefined) continue;
        live.push({
          screen: entry.screen,
          camera: entry.camera,
          target: entry.target,
        });
      }
      // **Nearest first, ties by id**, exactly as `visibleLights` sorts: peers at the same place
      // must choose the same screens, and map iteration order is not a tie-break.
      live.sort((a, b) => {
        const da =
          (a.screen.at.x - player.x) ** 2 +
          (a.screen.at.y - player.y) ** 2 +
          (a.screen.at.z - player.z) ** 2;
        const db =
          (b.screen.at.x - player.x) ** 2 +
          (b.screen.at.y - player.y) ** 2 +
          (b.screen.at.z - player.z) ** 2;
        return da - db || (a.screen.id < b.screen.id ? -1 : 1);
      });
      return live.slice(0, MAX_LIVE_FEEDS);
    },

    markRendered(id): void {
      const entry = entries.get(id);
      if (entry === undefined || entry.target === undefined) return;
      entry.drawn = true;
      entry.material.map = entry.target.texture;
    },

    hideShowing(cameraId, hidden): void {
      for (const entry of entries.values()) {
        if (entry.camera?.id !== cameraId) continue;
        entry.suppressed = hidden;
        entry.mesh.visible = !hidden;
      }
    },

    textureOf(id): Texture | undefined {
      return entries.get(id)?.material.map ?? undefined;
    },

    clear(): void {
      for (const entry of [...entries.values()]) remove(entry);
    },

    dispose(): void {
      for (const entry of [...entries.values()]) remove(entry);
      geometry.dispose();
      pool.length = 0;
      spareMaterials.length = 0;
    },
  };
};

/**
 * The HUD feeds: a small target per image, read back into a canvas for the overlay.
 *
 * **This is the one place a feed cannot stay on the GPU**, because the DOM cannot sample a GL
 * texture. The readback is therefore deliberate and bounded: the target is the HUD image's own
 * size (never more than `MAX_HUD_IMAGE`), and the caller draws it at a low rate. A photo in the
 * HUD does not come through here at all — it is already a canvas.
 */
export const createHudFeedLayer = (): {
  sync(
    images: readonly HostImage[],
    cameras: ReadonlyMap<string, HostCamera>,
  ): void;
  feeds(): readonly HudFeed[];
  /** Copies a feed's pixels into its canvas. Resolves when the copy has landed. */
  capture(
    feed: HudFeed,
    renderer: {
      readPixelsAsync(target: WebGLRenderTarget): Promise<Uint8Array>;
    },
  ): Promise<void>;
  canvas(id: string): CanvasImageSource | undefined;
  /** The entry's pixel size, so a caller can draw the canvas without reading its width. */
  sizeOf(id: string): { width: number; height: number } | undefined;
  dispose(): void;
} => {
  interface HudEntry {
    image: HostImage;
    target: WebGLRenderTarget;
    camera: HostCamera;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  }
  const entries = new Map<string, HudEntry>();
  const pool: WebGLRenderTarget[] = [];

  const remove = (id: string): void => {
    const entry = entries.get(id);
    if (entry === undefined) return;
    pool.push(entry.target);
    entries.delete(id);
  };

  return {
    sync(images, cameras): void {
      const live = new Set<string>();
      for (const image of images) {
        if (!("camera" in image.source)) continue;
        const camera = cameras.get(image.source.camera);
        if (camera === undefined) continue;
        live.add(image.id);
        const existing = entries.get(image.id);
        if (
          existing !== undefined &&
          // **By id, not by identity.** A camera that pans is a new `HostCamera` object every
          // frame, and comparing references would rebuild the target, the canvas and its context
          // sixty times a second for a camera that only moved.
          existing.camera.id === camera.id &&
          existing.image.width === image.width &&
          existing.image.height === image.height
        ) {
          existing.image = image;
          existing.camera = camera;
          continue;
        }
        if (existing !== undefined) remove(image.id);
        const target = pool.pop() ?? new WebGLRenderTarget(1, 1);
        target.width = image.width;
        target.height = image.height;
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (context === null) {
          pool.push(target);
          continue;
        }
        entries.set(image.id, {
          image,
          target,
          camera,
          canvas,
          context,
        });
      }
      for (const id of [...entries.keys()]) {
        if (!live.has(id)) remove(id);
      }
    },

    feeds(): readonly HudFeed[] {
      return [...entries.values()].map((entry) => ({
        image: entry.image,
        camera: entry.camera,
        target: entry.target,
      }));
    },

    async capture(feed, renderer): Promise<void> {
      const entry = entries.get(feed.image.id);
      if (entry === undefined) return;
      const pixels = await renderer.readPixelsAsync(entry.target);
      // **Flipped here, once.** GL reads bottom row first and a canvas draws top row first, and a
      // HUD image upside down is a bug that looks like a shader problem.
      const width = entry.target.width;
      const height = entry.target.height;
      const flipped = new Uint8ClampedArray(pixels.length);
      const row = width * 4;
      for (let y = 0; y < height; y++) {
        flipped.set(
          pixels.subarray(y * row, y * row + row),
          (height - 1 - y) * row,
        );
      }
      entry.context.putImageData(new ImageData(flipped, width, height), 0, 0);
    },

    canvas(id): CanvasImageSource | undefined {
      return entries.get(id)?.canvas;
    },

    sizeOf(id): { width: number; height: number } | undefined {
      const entry = entries.get(id);
      return entry === undefined
        ? undefined
        : { width: entry.image.width, height: entry.image.height };
    },

    dispose(): void {
      entries.clear();
      pool.length = 0;
    },
  };
};
