import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  createTrackedEffect,
  storePath,
  untrack,
} from "solid-js";
import styles from "./ColorPicker.module.css";
import { RGBA, Vector2D } from "./maths";
import { pointer } from "./utils";

export function ColourPicker(props: {
  class?: string;
  colour?: RGBA;
  onColour?: (colour: RGBA) => void;
}) {
  const [state, setState] = createStore<{
    hue: number;
    saturation: number;
    brightness: number;
    alpha: number;
    userColour: RGBA | undefined;
    userRedText: string | undefined;
    userGreenText: string | undefined;
    userBlueText: string | undefined;
    userAlphaText: string | undefined;
  }>({
    hue: 0,
    saturation: 0,
    brightness: 255,
    alpha: 255,
    userColour: untrack(() => props.colour),
    userRedText: undefined,
    userGreenText: undefined,
    userBlueText: undefined,
    userAlphaText: undefined,
  });
  const [colourChartDiv, setColourChartDiv] = createSignal<HTMLDivElement>();
  const [colourChartSize, setColourChartSize] = createSignal<Vector2D | undefined>();

  createEffect(colourChartDiv, div => {
    if (div == undefined) {
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      const rect = div.getBoundingClientRect();
      const tmp = colourChartSize();
      setColourChartSize({ x: Math.max(1, rect.width), y: Math.max(1, rect.height) });
    });
    resizeObserver.observe(div);

    return () => {
      resizeObserver.unobserve(div);
      resizeObserver.disconnect();
    };
  });
  const canvas = createMemo(() => {
    const size = colourChartSize();
    if (size == undefined) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", `${size.x}`);
    canvas.setAttribute("height", `${size.y}`);
    canvas.style.setProperty("flex-grow", "1");
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
      return;
    }
    const imageData = new ImageData(Math.max(1, size.x), Math.max(1, size.y));
    // Phases:
    // - red to yellow
    // - yellow to green
    // - green to cyan
    // - cyan to blue
    // - blue to purple
    // - purple to red
    const phaseMax = 256 * 6;
    for (let j = 0; j < size.x; ++j) {
      let r: number;
      let g: number;
      let b: number;
      const phaseIndex = Math.floor((j * phaseMax) / size.x);
      if (phaseIndex < 256) {
        const idx = phaseIndex;
        r = 255;
        g = idx;
        b = 0;
      } else if (phaseIndex < 256 * 2) {
        const idx = phaseIndex - 256;
        r = 255 - idx;
        g = 255;
        b = 0;
      } else if (phaseIndex < 256 * 3) {
        const idx = phaseIndex - 256 * 2;
        r = 0;
        g = 255;
        b = idx;
      } else if (phaseIndex < 256 * 4) {
        const idx = phaseIndex - 256 * 3;
        r = 0;
        g = 255 - idx;
        b = 255;
      } else if (phaseIndex < 256 * 5) {
        const idx = phaseIndex - 256 * 4;
        r = idx;
        g = 0;
        b = 255;
      } else {
        const idx = phaseIndex - 256 * 5;
        r = 255;
        g = 0;
        b = 255 - idx;
      }
      let offset = j << 2;
      for (let i = 0; i < size.y; ++i) {
        const r2 = r + Math.floor(((256 - r) * i) / size.y);
        const g2 = g + Math.floor(((256 - g) * i) / size.y);
        const b2 = b + Math.floor(((256 - b) * i) / size.y);
        imageData.data[offset] = r2;
        imageData.data[offset + 1] = g2;
        imageData.data[offset + 2] = b2;
        imageData.data[offset + 3] = 255;
        offset += size.x << 2;
      }
    }
    const brightnessImageData = new ImageData(size.x, size.y);
    createEffect(
      () => state.brightness,
      () => {
        const brightness = state.brightness;
        const dataSize = (size.x * size.y) << 2;
        for (let i = 0; i < dataSize; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          const r2 = Math.floor((r * brightness) / 255.0);
          const g2 = Math.floor((g * brightness) / 255.0);
          const b2 = Math.floor((b * brightness) / 255.0);
          brightnessImageData.data[i] = r2;
          brightnessImageData.data[i + 1] = g2;
          brightnessImageData.data[i + 2] = b2;
          brightnessImageData.data[i + 3] = a;
        }
        ctx.putImageData(brightnessImageData, 0, 0);
      },
    );
    const sliderCanvas = document.createElement("canvas");
    sliderCanvas.setAttribute("width", "1");
    sliderCanvas.setAttribute("height", `${size.y}`);
    sliderCanvas.style.setProperty("flex-grow", "1");
    const sliderCtx = sliderCanvas.getContext("2d");
    if (sliderCtx == null) {
      return;
    }
    const sliderImageData = new ImageData(1, size.y);

    createEffect(
      () => (imageData.width * state.hue + state.saturation) << 2,
      offset => {
        const r = imageData.data[offset];
        const g = imageData.data[offset + 1];
        const b = imageData.data[offset + 2];
        for (let i = 0; i < size.y; ++i) {
          const offset = i << 2;
          const r2 = Math.floor((r * (size.y - 1 - i)) / (size.y - 1));
          const g2 = Math.floor((g * (size.y - 1 - i)) / (size.y - 1));
          const b2 = Math.floor((b * (size.y - 1 - i)) / (size.y - 1));
          sliderImageData.data[offset] = r2;
          sliderImageData.data[offset + 1] = g2;
          sliderImageData.data[offset + 2] = b2;
          sliderImageData.data[offset + 3] = 255;
        }
        sliderCtx.putImageData(sliderImageData, 0, 0);
      },
    );

    const alphaSliderCanvas = document.createElement("canvas");
    alphaSliderCanvas.style.setProperty(
      "background-image",
      "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
    );
    alphaSliderCanvas.style.setProperty("background-size", "20px 20px");
    alphaSliderCanvas.style.setProperty(
      "background-position",
      "0 0, 0 10px, 10px -10px, -10px 0px",
    );
    alphaSliderCanvas.setAttribute("width", "1");
    alphaSliderCanvas.setAttribute("height", `${size.y}`);
    alphaSliderCanvas.style.setProperty("flex-grow", "1");
    const alphaSliderCtx = alphaSliderCanvas.getContext("2d");
    if (alphaSliderCtx == null) {
      return;
    }
    const alphaSliderImageData = new ImageData(1, size.y);

    createTrackedEffect(() => {
      const offset = (imageData.width * state.hue + state.saturation) << 2;
      const r = imageData.data[offset];
      const g = imageData.data[offset + 1];
      const b = imageData.data[offset + 2];
      const a = imageData.data[offset + 3];
      for (let i = 0; i < size.y; ++i) {
        const offset = i << 2;
        const a2 = Math.floor((a * (size.y - 1 - i)) / (size.y - 1));
        alphaSliderImageData.data[offset] = r;
        alphaSliderImageData.data[offset + 1] = g;
        alphaSliderImageData.data[offset + 2] = b;
        alphaSliderImageData.data[offset + 3] = a2;
      }
      alphaSliderCtx.putImageData(alphaSliderImageData, 0, 0);
    });

    return {
      canvas,
      sliderCanvas,
      alphaSliderCanvas,
      size,
      sliderImageData,
      alphaSliderImageData,
    };
  });

  const colourInCanvas = createMemo(() => {
    state.brightness;
    state.hue;
    state.alpha;

    const _canvas = canvas();

    if (_canvas == undefined) {
      return undefined;
    }

    const i = Math.max(
      0,
      Math.min(_canvas.size.y, Math.floor(((255 - state.brightness) * _canvas.size.y) / 256)),
    );

    const offset = i << 2;
    const r = _canvas.sliderImageData.data[offset];
    const g = _canvas.sliderImageData.data[offset + 1];
    const b = _canvas.sliderImageData.data[offset + 2];
    const a = state.alpha;

    return { r, g, b, a };
  });

  const userRedFieldVal = createMemo(() => {
    if (state.userRedText == undefined) {
      return undefined;
    }
    const value = Number.parseFloat(state.userRedText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  const userGreenFieldVal = createMemo(() => {
    if (state.userGreenText == undefined) {
      return undefined;
    }
    const value = Number.parseFloat(state.userGreenText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  const userBlueFieldVal = createMemo(() => {
    if (state.userBlueText == undefined) {
      return undefined;
    }
    const value = Number.parseFloat(state.userBlueText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });
  const userAlphaFieldVal = createMemo(() => {
    if (state.userAlphaText == undefined) {
      return undefined;
    }
    const value = Number.parseFloat(state.userAlphaText);
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(255, value));
  });

  const currentColour = createMemo(() => {
    const colour = state.userColour ?? colourInCanvas();

    return {
      r: userRedFieldVal() ?? colour?.r ?? 0,
      g: userGreenFieldVal() ?? colour?.g ?? 0,
      b: userBlueFieldVal() ?? colour?.b ?? 0,
      a: userAlphaFieldVal() ?? colour?.a ?? 255,
    };
  });

  createEffect(
    () => props.colour,
    () => {
      const c = currentColour();
      if (c == undefined) {
        return;
      }
      if (props.colour == undefined) {
        return;
      }
      const c2 = props.colour;
      if (c2.r == c.r && c2.g == c.g && c2.b == c.b && c2.a == c.a) {
        return;
      }
      setState(storePath("userColour", c2));
    },
    { defer: true },
  );

  createEffect(
    () => [state.userColour, currentColour()] as const,
    ([userColour, currentColour]) => {
      if (userColour !== undefined || currentColour === undefined) {
        return;
      }
      props.onColour?.(currentColour);
    },
  );
  createEffect(canvas, canvas => {
    if (!canvas) {
      return;
    }

    if (
      state.userColour == undefined &&
      userRedFieldVal() == undefined &&
      userGreenFieldVal() == undefined &&
      userBlueFieldVal() == undefined &&
      userAlphaFieldVal() == undefined
    ) {
      return;
    }

    const c2 = {
      r: userRedFieldVal() ?? state.userColour?.r ?? 0,
      g: userGreenFieldVal() ?? state.userColour?.g ?? 0,
      b: userBlueFieldVal() ?? state.userColour?.b ?? 0,
      a: userAlphaFieldVal() ?? state.userColour?.a ?? 255,
    };
    const mv = Math.max(c2.r, c2.g, c2.b);
    const lv = Math.min(c2.r, c2.g, c2.b);
    const brightness = mv;
    const s = 255 / (mv - lv);
    if (!Number.isFinite(s)) {
      return;
    }
    const r = Math.floor((c2.r - lv) * s);
    const g = Math.floor((c2.g - lv) * s);
    const b = Math.floor((c2.b - lv) * s);

    // Phases:
    // - red to yellow
    // - yellow to green
    // - green to cyan
    // - cyan to blue
    // - blue to purple
    // - purple to red
    const rm = c2.r == mv;
    const gm = c2.g == mv;
    const bm = c2.b == mv;
    let hueIndex: number;
    if (rm && !gm && b == 0) {
      hueIndex = g;
    } else if (!rm && gm && b == 0) {
      hueIndex = 256 + (255 - r);
    } else if (r == 0 && gm && !bm) {
      hueIndex = 256 * 2 + b;
    } else if (r == 0 && !gm && bm) {
      hueIndex = 256 * 3 + (255 - g);
    } else if (!rm && g == 0 && bm) {
      hueIndex = 256 * 4 + r;
    } else {
      hueIndex = 256 * 5 + (255 - b);
    }

    const hue = Math.floor((canvas.size.x * hueIndex) / (256 * 6));
    const saturation = lv;

    setState(storePath({ hue, saturation }));
    setState(storePath("brightness", brightness));
    setState(storePath("alpha", c2.a));
  });

  return (
    <div class={[styles.colourPicker, props.class]}>
      <div
        style={{
          "flex-grow": "1",
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <div
          onPointerDown={async event => {
            const _canvas = canvas();
            if (!_canvas) {
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();

            await pointer(event, ({ event }) => {
              const x = event.clientX - rect.left;
              const y = event.clientY - rect.top;
              setState(storePath("userColour", undefined));
              setState(storePath("userRedText", undefined));
              setState(storePath("userGreenText", undefined));
              setState(storePath("userBlueText", undefined));

              const hue = Math.max(0, Math.min(_canvas.size.x - 1, Math.floor(x)));
              const saturation = Math.max(0, Math.min(_canvas.size.y - 1, Math.floor(y)));

              setState(
                storePath({
                  hue,
                  saturation,
                }),
              );
            });
          }}
          class={styles.hueSaturation}
        >
          <div
            ref={setColourChartDiv}
            style={{
              "flex-grow": "1",
              display: "flex",
              "flex-direction": "column",
            }}
          >
            {canvas()?.canvas}
          </div>
          <svg
            width={canvas()?.size.x ?? 300}
            height={canvas()?.size.y ?? 300}
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              right: "0",
              bottom: "0",
            }}
          >
            <circle
              cx={state.hue}
              cy={state.saturation}
              r="5"
              stroke="black"
              stroke-width={2}
              fill="none"
              pointer-events="none"
            />
          </svg>
        </div>
        <div
          class={styles.brightness}
          style={{ height: `${canvas()?.size.y ?? 0}px` }}
          onPointerDown={async event => {
            const _canvas = canvas();
            if (!_canvas) {
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();

            await pointer(event, ({ event }) => {
              const y = event.clientY - rect.top;

              setState(
                storePath(
                  "brightness",
                  Math.max(
                    0,
                    Math.min(
                      255,
                      Math.floor((256 * (_canvas.canvas.height - y)) / _canvas.canvas.height),
                    ),
                  ),
                ),
              );
            });
          }}
        >
          {canvas()?.sliderCanvas}
          <svg width={25} height={canvas()?.size.y ?? 0} class={styles.brightnessHandle}>
            <rect
              x={0}
              y={(canvas()?.size.y ?? 0) - (state.brightness * (canvas()?.size.y ?? 0)) / 255 - 5}
              width={24}
              height={10}
              fill="none"
              stroke="black"
              stroke-width={2}
              pointer-events="none"
            />
          </svg>
        </div>
        <div
          style={{ height: `${canvas()?.size.y ?? 0}px` }}

          onPointerDown={async event => {
            const _canvas = canvas();
            if (!_canvas) {
              return;
            }

            const rect = event.currentTarget.getBoundingClientRect();

            pointer(event, ({ event }) => {
              const y = event.clientY - rect.top;

              setState(
                storePath(
                  "alpha",
                  Math.max(
                    0,
                    Math.min(255, Math.floor((256 * (_canvas.size.y - y)) / _canvas.size.y)),
                  ),
                ),
              );
            });
          }}
          class={styles.alpha}
        >
          {canvas()?.alphaSliderCanvas}
          <svg width={25} height={canvas()?.size.y ?? 0} class={styles.alphaHandle}>
            <rect
              x={0}
              y={(canvas()?.size.y ?? 0) - (state.alpha * (canvas()?.size.y ?? 0)) / 255 - 5}
              width={24}
              height={10}
              fill="none"
              stroke="black"
              stroke-width={2}
              pointer-events="none"
            />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <div style={{ "flex-grow": "1" }}></div>
        <div>
          <table>
            <thead />
            <tbody>
              <tr>
                <td>Red:</td>
                <td>
                  <input
                    type="text"
                    value={state.userRedText ?? state.userColour?.r ?? colourInCanvas()?.r}
                    onInput={e => {
                      setState(storePath("userRedText", e.currentTarget.value));
                      setState(storePath("userGreenText", currentColour().g.toFixed(0)));
                      setState(storePath("userBlueText", currentColour().b.toFixed(0)));
                      setState(storePath("userAlphaText", currentColour().a.toFixed(0)));
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Green:</td>
                <td>
                  <input
                    type="text"
                    value={state.userGreenText ?? state.userColour?.g ?? colourInCanvas()?.g}
                    onInput={e => {
                      setState(storePath("userRedText", currentColour().r.toFixed(0)));
                      setState(storePath("userGreenText", e.currentTarget.value));
                      setState(storePath("userBlueText", currentColour().b.toFixed(0)));
                      setState(storePath("userAlphaText", currentColour().a.toFixed(0)));
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Blue:</td>
                <td>
                  <input
                    type="text"
                    value={state.userBlueText ?? state.userColour?.b ?? colourInCanvas()?.b}
                    onInput={e => {
                      setState(storePath("userRedText", currentColour().r.toFixed(0)));
                      setState(storePath("userGreenText", currentColour().g.toFixed(0)));
                      setState(storePath("userBlueText", e.currentTarget.value));
                      setState(storePath("userAlphaText", currentColour().a.toFixed(0)));
                    }}
                    size="4"
                  />
                </td>
              </tr>
              <tr>
                <td>Alpha:</td>
                <td>
                  <input
                    type="text"
                    value={state.userAlphaText ?? state.userColour?.a ?? colourInCanvas()?.a}
                    onInput={e => {
                      setState(storePath("userRedText", currentColour().r.toFixed(0)));
                      setState(storePath("userGreenText", currentColour().g.toFixed(0)));
                      setState(storePath("userBlueText", currentColour().b.toFixed(0)));
                      setState(storePath("userAlphaText", e.currentTarget.value));
                    }}
                    size="4"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class={styles.output}>
          <div
            style={{
              "background-color": RGBA.toCSS(currentColour()),
              opacity: currentColour().a / 255.0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
