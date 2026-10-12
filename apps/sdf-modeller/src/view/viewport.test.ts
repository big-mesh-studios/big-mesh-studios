// @vitest-environment jsdom
/**
 * The camera as a hand moves it.
 *
 * **Two of these are claims that are easy to get backwards and impossible to check by
 * looking at the app**: that a wheel turns the way the DOM means it to, and that a drag
 * reaches the half of the sphere below the model. Both were wrong in the shape they were
 * first written — the pitch clamp was written for an elevation angle and applied to a
 * polar one, which quietly confined the camera to the horizon — so both are pinned here
 * against numbers.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PerspectiveCamera } from "@random-mesh/rmsl/scene";

import {
  createOrbit,
  DEFAULT_ORBIT,
  MAX_PHI,
  MIN_PHI,
  type OrbitLimits,
} from "./viewport";

/** A canvas-shaped element with the controller's listeners bound to it. */
const harness = (limits: OrbitLimits = DEFAULT_ORBIT) => {
  const element = document.createElement("div");
  // **jsdom answers neither of these**, and the controller captures on the way down and
  // asks on the way up, so a drag cannot be driven without them.
  element.setPointerCapture = () => {};
  element.releasePointerCapture = () => {};
  element.hasPointerCapture = () => false;
  document.body.append(element);

  const camera = new PerspectiveCamera(45, 1, 0.01, 8000);
  const orbit = createOrbit(camera, limits);
  const detach = orbit.attach(element);

  const wheel = (deltaY: number, ctrlKey = false): boolean =>
    element.dispatchEvent(
      new WheelEvent("wheel", { deltaY, ctrlKey, cancelable: true }),
    );

  /**
   * One press and one move, as a single pointer travelling `dx` by `dy`.
   *
   * `getBoundingClientRect` is all zeroes in jsdom, so element-local coordinates are the
   * client ones and the deltas below are the pixels they say they are.
   */
  const drag = (dx: number, dy: number): void => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientX: 0, clientY: 0 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 1,
        clientX: dx,
        clientY: dy,
      }),
    );
  };

  return { camera, orbit, element, detach, wheel, drag };
};

const mounted: (() => void)[] = [];

const mountedHarness = (limits?: OrbitLimits) => {
  const made = harness(limits);
  mounted.push(() => {
    made.detach();
    made.element.remove();
  });
  return made;
};

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.();
});

describe("zooming with a wheel", () => {
  it("zooms in on a negative delta and out on a positive one", () => {
    // The DOM's own convention, pinned because the sign is easy to get backwards and a
    // wheel that turns the wrong way is the first thing anybody notices: a positive deltaY
    // is content moving down the page, which reads as pushing the world away.
    const { orbit, wheel } = mountedHarness();
    const start = orbit.state().radius;

    wheel(-100);
    const closer = orbit.state().radius;
    expect(closer).toBeLessThan(start);

    wheel(100);
    expect(orbit.state().radius).toBeGreaterThan(closer);
  });

  it("moves proportionally to the delta, so a notch is a notch", () => {
    // Exponential in the delta rather than stepped by its sign, which is what makes a
    // wheel feel the same at any speed: the same total travel produces the same total zoom
    // however the browser chose to deliver it.
    const { orbit, wheel } = mountedHarness();
    const start = orbit.state().radius;

    for (let i = 0; i < 20; i++) wheel(10);
    expect(orbit.state().radius / start).toBeCloseTo(
      Math.exp(200 * DEFAULT_ORBIT.zoomSpeed),
      9,
    );
  });

  it("gives one mouse notch a sensible amount of travel", () => {
    // Around a sixth of the radius: enough to feel deliberate, small enough that reaching
    // across a model takes a handful of notches rather than a scroll.
    const one = Math.exp(100 * DEFAULT_ORBIT.zoomSpeed);
    expect(one).toBeGreaterThan(1.1);
    expect(one).toBeLessThan(1.3);
  });

  it("zooms a trackpad pinch faster than the same delta from a mouse", () => {
    // A trackpad reports a pinch as a wheel with the control key held and a delta a small
    // fraction of a notch's, so at the wheel's own speed it arrives about twenty times too
    // slow. The speeds differ by exactly the ratio of the two, which is the whole of what
    // the second constant buys.
    const limits = DEFAULT_ORBIT;
    const mouse = Math.exp(4 * limits.zoomSpeed);
    const trackpad = Math.exp(4 * limits.trackpadZoomSpeed);

    expect(Math.log(trackpad) - Math.log(mouse)).toBeCloseTo(
      4 * (limits.trackpadZoomSpeed - limits.zoomSpeed),
      9,
    );
    expect(trackpad).toBeGreaterThan(mouse);
  });

  it("stops at the near and far limits rather than passing through the model", () => {
    const { orbit, wheel } = mountedHarness();

    for (let i = 0; i < 200; i++) wheel(-1000);
    expect(orbit.state().radius).toBe(DEFAULT_ORBIT.minRadius);

    for (let i = 0; i < 200; i++) wheel(1000);
    expect(orbit.state().radius).toBe(DEFAULT_ORBIT.maxRadius);
  });

  it("claims the gesture, so the page is not scrolled underneath it", () => {
    // `dispatchEvent` returns false only where the event was cancelled, so this asserts
    // the `preventDefault` happened without reaching past the DOM to spy on it.
    const { wheel } = mountedHarness();
    expect(wheel(100)).toBe(false);
  });

  it("leaves the wheel to a tool that has the canvas", () => {
    // Dolly is the one camera move a tool cannot have: moving the camera out from under
    // a part mid-drag would leave the handle the finger is holding somewhere else.
    const { orbit, wheel } = mountedHarness();
    const start = orbit.state().radius;

    orbit.setInteractive(false);
    wheel(-100);
    expect(orbit.state().radius).toBe(start);

    orbit.setInteractive(true);
    wheel(-100);
    expect(orbit.state().radius).toBeLessThan(start);
  });

  it("stops answering the wheel once detached", () => {
    const { orbit, wheel, detach } = harness();
    detach();

    const start = orbit.state().radius;
    wheel(-100);
    expect(orbit.state().radius).toBe(start);
  });
});

describe("orbiting round the model", () => {
  it("carries the camera underneath it", () => {
    // The claim this whole change was made for. `phi` is a polar angle, so the camera's
    // height is `cos(phi)` of a radius above the target — and a clamp that kept `phi`
    // within a quarter turn either side of the horizon kept `cos(phi)` positive
    // throughout, which is a camera that could never get under anything it was looking at.
    const { orbit, camera, drag } = mountedHarness();
    expect(camera.position.y).toBeGreaterThan(0);

    // A long drag upwards, in the steps a pointer actually arrives in.
    for (let i = 0; i < 40; i++) drag(0, -40);

    expect(orbit.state().phi).toBeGreaterThan(Math.PI / 2);
    expect(camera.position.y).toBeLessThan(0);
  });

  it("still carries the camera over the top", () => {
    const { orbit, camera, drag } = mountedHarness();

    for (let i = 0; i < 40; i++) drag(0, 40);

    expect(orbit.state().phi).toBeLessThan(Math.PI / 2);
    expect(camera.position.y).toBeGreaterThan(0);
  });

  it("stops just short of straight above and straight below", () => {
    // Where the view direction and the up vector are the same line there is no frame left
    // to describe, so the orbit is held a little off each pole.
    const { orbit, camera, drag } = mountedHarness();

    for (let i = 0; i < 200; i++) drag(0, 40);
    expect(orbit.state().phi).toBe(MIN_PHI);
    expect(camera.position.y).toBeGreaterThan(0);

    for (let i = 0; i < 400; i++) drag(0, -40);
    expect(orbit.state().phi).toBe(MAX_PHI);
    expect(camera.position.y).toBeLessThan(0);
  });

  it("keeps a camera framed on a model under the target", () => {
    // The target is the model's own centre, not the origin, and the underside is under
    // the centre rather than under the world.
    const { orbit, camera, drag } = mountedHarness();
    orbit.frame({ x: 5, y: 7, z: -2 }, 10);

    for (let i = 0; i < 40; i++) drag(0, -40);

    expect(camera.position.y).toBeLessThan(7);
    expect(camera.position.x).toBeGreaterThan(0);
  });

  it("turns a drag's width into yaw without changing the height", () => {
    // Yaw and pitch are separate terms: a sideways drag goes round the model and does not
    // climb it, so the hands on screen stay level however far round the view has come.
    const { orbit, camera, drag } = mountedHarness();
    const before = orbit.state().theta;
    const height = camera.position.y;

    drag(100, 0);

    expect(orbit.state().theta).not.toBe(before);
    expect(camera.position.y).toBeCloseTo(height, 9);
  });
});
