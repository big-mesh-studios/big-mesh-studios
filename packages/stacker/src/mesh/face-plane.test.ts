// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FacePlane, type MergedRectangle } from "./face-plane";

/** Every rectangle a plane covers itself with, in the order it finds them. */
const rectanglesOf = (plane: FacePlane): MergedRectangle[] => {
  const found: MergedRectangle[] = [];
  plane.eachRectangle((rectangle) => found.push(rectangle));
  return found;
};

describe("FacePlane", () => {
  it("covers nothing when nothing was set", () => {
    expect(rectanglesOf(new FacePlane(4, 4))).toEqual([]);
  });

  it("takes a row of matching faces as one wide rectangle", () => {
    const plane = new FacePlane(4, 4);
    for (let first = 0; first < 3; first++) {
      plane.set(first, 0, 7);
    }
    expect(rectanglesOf(plane)).toEqual([
      { first: 0, second: 0, wide: 3, tall: 1, index: 7 },
    ]);
  });

  it("grows a rectangle across rows that match along its whole width", () => {
    const plane = new FacePlane(4, 4);
    for (let second = 0; second < 3; second++) {
      for (let first = 0; first < 2; first++) {
        plane.set(first, second, 7);
      }
    }
    expect(rectanglesOf(plane)).toEqual([
      { first: 0, second: 0, wide: 2, tall: 3, index: 7 },
    ]);
  });

  it("stops a rectangle at a row that is only partly filled", () => {
    const plane = new FacePlane(4, 4);
    plane.set(0, 0, 7);
    plane.set(1, 0, 7);
    plane.set(0, 1, 7);
    const found = rectanglesOf(plane);
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ wide: 2, tall: 1 });
    expect(found[1]).toMatchObject({ first: 0, second: 1, wide: 1, tall: 1 });
  });

  it("keeps faces of different colours apart", () => {
    const plane = new FacePlane(4, 4);
    plane.set(0, 0, 7);
    plane.set(1, 0, 9);
    expect(rectanglesOf(plane).map((one) => one.index)).toEqual([7, 9]);
  });

  it("stops at the edge of the plane rather than reading past it", () => {
    const plane = new FacePlane(3, 2);
    for (let first = 0; first < 3; first++) {
      for (let second = 0; second < 2; second++) {
        plane.set(first, second, 4);
      }
    }
    expect(rectanglesOf(plane)).toEqual([
      { first: 0, second: 0, wide: 3, tall: 2, index: 4 },
    ]);
  });

  it("covers every face exactly once", () => {
    const plane = new FacePlane(5, 5);
    for (let second = 0; second < 5; second++) {
      for (let first = 0; first < 5; first++) {
        // A repeating band, so the rectangles are ragged rather than one block.
        plane.set(first, second, ((first + second) % 3) + 1);
      }
    }
    let covered = 0;
    for (const rectangle of rectanglesOf(plane)) {
      covered += rectangle.wide * rectangle.tall;
    }
    expect(covered).toBe(25);
  });

  it("forgets a slice when it is cleared for the next one", () => {
    const plane = new FacePlane(4, 4);
    plane.set(0, 0, 7);
    rectanglesOf(plane);
    plane.clear();
    expect(rectanglesOf(plane)).toEqual([]);
  });
});
