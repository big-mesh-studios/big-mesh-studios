// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AVATAR_KINDS,
  AVATAR_TYPES,
  DEFAULT_AVATAR,
  avatarOfModel,
  isAvatarKind,
  readStoredAvatar,
  storeAvatar,
} from "./avatars";

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
};

const refusingStorage = {
  getItem: (): never => {
    throw new Error("denied");
  },
  setItem: (): never => {
    throw new Error("denied");
  },
};

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

describe("the avatars a player may be drawn as", () => {
  it("offers the cube as a model file of its own, so both look the same shape", () => {
    expect(AVATAR_TYPES.cube.model).toBe("");
    expect(AVATAR_TYPES.cube.motions).toBeUndefined();
    expect(AVATAR_TYPES.cube.gait).toBeUndefined();
  });

  it("draws the human from a bundled model that can walk", () => {
    expect(AVATAR_TYPES.human.model).toMatch(/\.zip$/);
    expect(AVATAR_TYPES.human.motions).toEqual({
      idle: "idle",
      walk: "walk",
      run: "run",
    });
    expect(AVATAR_TYPES.human.gait?.stride).toBeGreaterThan(0);
  });

  it("draws every kind at the height the player's own body is", () => {
    for (const kind of AVATAR_KINDS) {
      expect(AVATAR_TYPES[kind].height).toBeGreaterThan(0);
    }
  });

  it("resolves a kind from the model file a peer was told to draw", () => {
    expect(avatarOfModel(AVATAR_TYPES.human.model)?.kind).toBe("human");
    expect(avatarOfModel(AVATAR_TYPES.cube.model)?.kind).toBe("cube");
  });

  it("knows no avatar for a model a place script dressed a player in", () => {
    // Such a model is a figure, not an avatar: it has no legs the world's gait
    // knows how to move, and must not be handed a stride meant for another one.
    expect(avatarOfModel("banana.zip")).toBeUndefined();
  });

  it("recognises a kind only when it names one", () => {
    expect(isAvatarKind("human")).toBe(true);
    expect(isAvatarKind("cube")).toBe(true);
    expect(isAvatarKind("banana")).toBe(false);
    expect(isAvatarKind(undefined)).toBe(false);
  });
});

describe("remembering the chosen avatar", () => {
  it("reads back what was chosen", () => {
    vi.stubGlobal("localStorage", fakeStorage);
    expect(readStoredAvatar()).toBe(DEFAULT_AVATAR);
    storeAvatar("human");
    expect(readStoredAvatar()).toBe("human");
    storeAvatar("cube");
    expect(readStoredAvatar()).toBe("cube");
  });

  it("falls back to the default for a page holding something else", () => {
    vi.stubGlobal("localStorage", fakeStorage);
    storeAvatar("human");
    store.set("bms-voxelscape:avatar", "banana");
    expect(readStoredAvatar()).toBe(DEFAULT_AVATAR);
  });

  it("keeps playing when the page's storage refuses to be read or written", () => {
    // A private window, or a full quota, must not stop a world from coming up.
    vi.stubGlobal("localStorage", refusingStorage);
    expect(readStoredAvatar()).toBe(DEFAULT_AVATAR);
    expect(() => storeAvatar("human")).not.toThrow();
  });
});
