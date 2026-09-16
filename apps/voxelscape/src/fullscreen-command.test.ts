// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCommands,
  type Commander,
  type CommandsParams,
} from "./commands";

/** The console, built with no owning objects — the fullscreen command reaches none. */
const commands = (): Commander =>
  createCommands({} as unknown as CommandsParams);

interface OrientationStub {
  lock: ReturnType<typeof vi.fn>;
  unlock: ReturnType<typeof vi.fn>;
}

const setOrientation = (orientation: OrientationStub | undefined): void => {
  Object.defineProperty(window.screen, "orientation", {
    configurable: true,
    value: orientation,
  });
};

const setFullscreenElement = (element: Element | null): void => {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  });
};

const requestFullscreen = vi.fn().mockResolvedValue(undefined);
const exitFullscreen = vi.fn().mockResolvedValue(undefined);

afterEach(() => {
  vi.clearAllMocks();
  delete (window.screen as { orientation?: unknown }).orientation;
  setFullscreenElement(null);
});

describe("/fullscreen's orientation lock", () => {
  it("enters fullscreen, then locks landscape by default", async () => {
    const orientation = {
      lock: vi.fn().mockResolvedValue(undefined),
      unlock: vi.fn(),
    };
    setOrientation(orientation);
    document.body.requestFullscreen = requestFullscreen;

    const said = await commands().run("/fullscreen");
    expect(requestFullscreen).toHaveBeenCalled();
    expect(orientation.lock).toHaveBeenCalledWith("landscape");
    expect(said).toContain("landscape locked");
  });

  it("locks the orientation it is asked for", async () => {
    const orientation = {
      lock: vi.fn().mockResolvedValue(undefined),
      unlock: vi.fn(),
    };
    setOrientation(orientation);
    document.body.requestFullscreen = requestFullscreen;

    await commands().run("/fullscreen true portrait");
    expect(orientation.lock).toHaveBeenCalledWith("portrait");
  });

  it("still reports success when the browser refuses the lock", async () => {
    const orientation = {
      lock: vi.fn().mockRejectedValue(new Error("not allowed")),
      unlock: vi.fn(),
    };
    setOrientation(orientation);
    document.body.requestFullscreen = requestFullscreen;

    const said = await commands().run("/fullscreen");
    expect(requestFullscreen).toHaveBeenCalled();
    expect(said).toContain("orientation lock unavailable");
  });

  it("unlocks the orientation and leaves fullscreen", async () => {
    const orientation = {
      lock: vi.fn(),
      unlock: vi.fn(),
    };
    setOrientation(orientation);
    document.exitFullscreen = exitFullscreen;
    setFullscreenElement(document.body);

    await commands().run("/fullscreen false");
    expect(orientation.unlock).toHaveBeenCalled();
    expect(exitFullscreen).toHaveBeenCalled();
  });

  it("reports an unavailable lock when the API is absent", async () => {
    setOrientation(undefined);
    document.body.requestFullscreen = requestFullscreen;

    const said = await commands().run("/fullscreen");
    expect(said).toContain("orientation lock unavailable");
  });
});
