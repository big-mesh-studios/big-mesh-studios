import { describe, expect, it } from "vitest";
import { compileGlsl } from "@random-mesh/rmsl/glsl";
import { Scene } from "@random-mesh/rmsl/scene";

import { PaintSurface } from "../unwrapping/paint-surface";
import { modelMaterial } from "./model-material";

/**
 * Pretends the renderer has just uploaded the atlas.
 *
 * **A real renderer clears `needsUpdate` when it uploads, and this test has no renderer.** So
 * every case here has to clear it by hand, and without that the flag would still be true from
 * `attach` onwards — and every assertion about whether `sync` uploaded anything would pass for
 * the wrong reason.
 */
const uploaded = (material: ReturnType<typeof modelMaterial>): void => {
  if (material.texture !== undefined) material.texture.needsUpdate = false;
};

/** A surface with one stroke on it, so it is dirty and has something to upload. */
const painted = (): PaintSurface => {
  const surface = new PaintSurface(16, 16);
  surface.markChanged();
  return surface;
};

describe("ModelMaterial.sync", () => {
  it("uploads an atlas that has changed", () => {
    // **The whole bug this file exists for.** A stroke writes texels; the shader samples a GPU
    // copy of them. If nothing tells the renderer the copy is stale, the paint is correct in
    // memory and invisible on screen until something else happens to re-install the material.
    const material = modelMaterial(false);
    material.attach(painted());
    uploaded(material);

    material.sync(painted());

    expect(material.texture?.needsUpdate).toBe(true);
  });

  it("says nothing when nothing has changed", () => {
    // **The cost half.** rmsl re-uploads the entire atlas on every `needsUpdate`, so a model
    // sitting still with a four-megabyte texture must not re-send it sixty times a second. This
    // is the assertion that keeps `sync` in the frame loop rather than moving it into the
    // stamp path.
    const surface = painted();
    const material = modelMaterial(false);
    material.attach(surface);
    material.sync(surface);
    uploaded(material);

    material.sync(surface);

    expect(material.texture?.needsUpdate).toBe(false);
  });

  it("uploads once per call however many times a surface was stamped", () => {
    // **Coalescing, stated as behaviour.** The flag is set, not counted, so a frame that
    // received forty pointer moves asks for one upload — which is the only granularity rmsl
    // offers and the reason `sync` lives in the render loop.
    const surface = new PaintSurface(16, 16);
    const material = modelMaterial(false);
    material.attach(surface);
    uploaded(material);

    for (let dab = 0; dab < 40; dab++) surface.markChanged();
    material.sync(surface);
    const afterFirst = material.texture?.needsUpdate;
    uploaded(material);

    expect(afterFirst).toBe(true);
    // **And the flag is spent**, so the next frame with no paint does not upload again.
    expect(surface.dirty).toBe(false);
  });

  it("does nothing at all without a texture", () => {
    // **Before the first install there is nowhere to upload to**, and a stroke cannot have
    // happened without one — so this path is reached with a clean surface and must be harmless
    // rather than a reason to re-attach and paper over whatever came apart.
    const material = modelMaterial(false);
    expect(material.textured).toBe(false);

    expect(() => {
      material.sync(painted());
    }).not.toThrow();
  });

  it("carries the painted bytes by reference, not by copy", () => {
    // **The half that would break every other test if it were wrong.** The texture is built over
    // the surface's array, so a stamp after the upload changes what the *next* upload sends. A
    // copy at `attach` would mean a later stroke could never reach the GPU at all, and the
    // symptom would be exactly the one that was reported — paint visible only after a rebuild,
    // which rebuilds the texture from the current array and so appears to fix it.
    const surface = new PaintSurface(4, 4);
    const material = modelMaterial(false);
    material.attach(surface);

    surface.pixels[0] = 200;
    material.sync(surface);

    const texture = material.texture;
    expect(texture).toBeDefined();
    expect(texture?.image).toBe(surface.pixels);
  });
});

describe("modelMaterial", () => {
  it("takes the blend at construction rather than losing it on rebuild", () => {
    // **A rebuild makes a new material.** A blend set on the old one — or defaulted to zero on
    // the new one because nobody passed it — would reset on every edit, so the toggle would
    // appear to work and then spring back the first time anybody moved a slider.
    expect(modelMaterial(false, 1).blend).toBe(1);
    expect(modelMaterial(false).blend).toBe(0);
  });
});

/** The fragment stage a textured material compiles, as the driver's own source. */
const fragmentOf = (): string => {
  const material = modelMaterial(false, 0.5);
  material.attach(new PaintSurface(16, 16));
  return compileGlsl.fragment(material.build(new Scene()).fragmentRoot, {
    precision: "highp",
  });
};

/**
 * A GLSL vector, enough of one to run the shader's own arithmetic.
 *
 * **JavaScript arrays are not vectors**: `array * 2` is `NaN` and `array + array` concatenates.
 * GLSL overloads `*`, `+` and `-` on vectors and JavaScript cannot, so the line is *parsed* and
 * the operators are applied here rather than handed to `eval` — and anything this does not
 * understand throws rather than quietly evaluating to `undefined`.
 */
class Vec {
  constructor(readonly c: readonly number[]) {}
  static of(...c: number[]): Vec {
    return new Vec(c);
  }
  /** Componentwise, which is what every operator GLSL overloads on a vector does. */
  each(f: (v: number, i: number) => number): Vec {
    return new Vec(this.c.map(f));
  }
}

type Value = number | Vec;

/**
 * The arithmetic GLSL gives its built-ins, over the values the line's operands can be.
 *
 * **`vec3(x)` splats and the binary ones broadcast**, because GLSL does both and the line uses
 * both: `vec3(0.00001)` is three components of that value, not one, and a scalar against a
 * vector is a vector. Getting the splat wrong is what turns two of the three channels to NaN.
 */
const GLSL = {
  vec3: (...c: number[]): Vec =>
    c.length === 1 ? new Vec([c[0]!, c[0]!, c[0]!]) : new Vec(c),
  pow: (a: Vec, b: Vec | number): Vec =>
    a.each((v, i) => Math.pow(v, typeof b === "number" ? b : b.c[i]!)),
  max: (a: Vec, b: Vec | number): Vec =>
    a.each((v, i) => Math.max(v, typeof b === "number" ? b : b.c[i]!)),
  mix: (a: Vec, b: Vec, t: number): Vec =>
    new Vec(a.c.map((v, i) => v + (b.c[i]! - v) * t)),
} as const;

/**
 * Evaluates one GLSL expression, because the only place the material's arithmetic exists is the
 * source rmsl generates for it and JavaScript cannot run that directly.
 *
 * **A precedence-climbing parse of the four operators and the calls the line uses**, refusing
 * anything else. The alternative — restating the formula in TypeScript — would test the test's
 * own copy of it, which is the one thing a test of a compiled shader must not do.
 */
const evaluateGlsl = (source: string, scope: Record<string, Value>): Vec => {
  const tokens =
    source.match(/[A-Za-z_]\w*(?:\.\w+)*|\d+\.?\d*|[()+*/,-]/g) ?? [];
  let at = 0;
  const peek = (): string | undefined => tokens[at];
  const take = (what: string): string => {
    const token = tokens[at];
    if (token !== what) {
      throw new Error(`expected "${what}", found "${token ?? "end of line"}"`);
    }
    at++;
    return token;
  };

  const primary = (): Value => {
    const token = peek();
    if (token === undefined) throw new Error("the expression ended early");
    if (token === "(") {
      take("(");
      const inner = expression();
      take(")");
      return inner;
    }
    if (/^\d/.test(token)) {
      at++;
      return Number(token);
    }
    at++;
    const [name, ...swizzles] = token.split(".");
    // A call names either a variable holding a function or a GLSL built-in; a bare
    // name is a value in scope.
    if (peek() === "(") {
      take("(");
      const args: Value[] = [];
      if (peek() !== ")") {
        args.push(expression());
        while (peek() === ",") {
          take(",");
          args.push(expression());
        }
      }
      take(")");
      const built = (scope[name!] ??
        GLSL[name as keyof typeof GLSL]) as unknown as
        ((...a: never[]) => Value) | undefined;
      if (built === undefined) throw new Error(`no "${name}"`);
      if (swizzles.length > 0)
        throw new Error(`a call cannot be swizzled: "${token}"`);
      return built(...(args as never[]));
    }

    const value = scope[name!];
    if (value === undefined) throw new Error(`no value for "${name}"`);
    let out: Value = value;
    for (const swizzle of swizzles) {
      const base = out;
      if (typeof base === "number") throw new Error(`"${swizzle}" of a number`);
      out = swizzle === "w" ? base.c[3]! : new Vec(base.c.slice(0, 3));
    }
    return out;
  };

  /**
   * GLSL's componentwise arithmetic, including the broadcast of a scalar against a vector.
   *
   * **The broadcast is the half that matters**: the line contains both `1.0 - texel.w`, which
   * is scalar, and `texel.w * stroke`, which is a scalar times a three-component vector, and
   * adding a scalar to a vector without broadcasting is how a parser quietly returns NaN.
   */
  const combine = (a: Value, b: Value, token: "+" | "-" | "*"): Value => {
    if (typeof a === "number" && typeof b === "number") {
      return token === "+" ? a + b : token === "-" ? a - b : a * b;
    }
    const x = typeof a === "number" ? new Vec([a]) : a;
    const y = typeof b === "number" ? new Vec([b]) : b;
    const at = (v: Vec, i: number): number =>
      v.c.length === 1 ? v.c[0]! : v.c[i]!;
    const width = Math.max(x.c.length, y.c.length);
    const out = new Vec(
      Array.from({ length: width }, (_, i) => {
        const [p, q] = [at(x, i), at(y, i)];
        return token === "+" ? p + q : token === "-" ? p - q : p * q;
      }),
    );
    return x.c.length === 1 && y.c.length === 1 ? out.c[0]! : out;
  };

  const term = (): Value => {
    let left = primary();
    while (peek() === "*") {
      take("*");
      left = combine(left, primary(), "*");
    }
    return left;
  };

  const expression = (): Value => {
    let left = term();
    for (;;) {
      const token = peek();
      if (token !== "+" && token !== "-") return left;
      take(token);
      left = combine(left, term(), token);
    }
  };

  const result = expression();
  if (at !== tokens.length) throw new Error(`trailing "${tokens[at]}"`);
  if (typeof result === "number")
    throw new Error("the line did not produce a vector");
  return result;
};

/**
 * What one texel does to a part colour, evaluated on the shader's own compiled line.
 *
 * **The generated GLSL is the only place this arithmetic exists**, so that is what runs. The
 * two variables are found by the lines that declare them rather than by a name rmsl happens to
 * have numbered this time.
 */
const mixedBy = (texel: number[], part: number[], blend: number): number[] => {
  const source = fragmentOf();
  const colour = /vec4 (_rmsl_\d+) = _rmsl_v\d+;/.exec(source)?.[1];
  const sampled = /vec4 (_rmsl_\d+) = texture\(/.exec(source)?.[1];
  expect(
    colour,
    "the line the shader copies the vertex colour into",
  ).toBeDefined();
  expect(sampled, "the line the shader samples the atlas into").toBeDefined();
  const line = new RegExp(`${colour}\\.xyz = (.*);`).exec(source)?.[1];
  expect(line, "the shader's own mix line").toBeDefined();
  return evaluateGlsl(line!, {
    [colour!]: new Vec(part),
    [sampled!]: new Vec(texel),
    paintBlend: blend,
  }).c as number[];
};

const bytes = (colour: readonly number[]): number[] =>
  colour.map((c) => Math.round(c * 255));

describe("the painted atlas in the shader", () => {
  it("leaves an unpainted model at its own colour at every blend", () => {
    // **The bug this is here for.** A model somebody has baked but not yet painted on is the
    // state the paint tool leaves the model in for a second, and the state every model is in
    // until somebody draws. The old formula divided by `1 + blend` there, so at `blend = 1` an
    // unpainted model came out at half brightness and nothing on the screen said why.
    for (const blend of [0, 0.5, 1]) {
      expect(bytes(mixedBy([0, 0, 0, 0], [0.8, 0.3, 0.2], blend))).toEqual([
        204, 77, 51,
      ]);
    }
  });

  it("replaces the part colour with a stroke at one and tints it at the other", () => {
    // **What `blend` is documented to mean, and the whole of what the two arms are for.** The
    // old line had one formula for both, so it could only ever do the first and the slider did
    // something else — at `blend = 1` an unpainted model came out at half brightness, which is
    // neither replacing nor tinting and is the symptom this rewrite was made for.
    const opaqueStroke = [0.25, 0.5, 0.75, 1];
    const linear: number[] = opaqueStroke
      .slice(0, 3)
      .map((c) => Math.pow(c, 2.2));

    // Replacing: the stroke stands where it covers.
    expect(bytes(mixedBy(opaqueStroke, [0.8, 0.3, 0.2], 0))).toEqual(
      linear.map((c) => Math.round(c * 255)),
    );
    // Tinting: the part's own colour keeps showing through underneath it.
    expect(bytes(mixedBy(opaqueStroke, [0.8, 0.3, 0.2], 1))).toEqual(
      [0.8, 0.3, 0.2].map((c, i) => Math.round(c * linear[i]! * 255)),
    );
    // And halfway is halfway between the two, rather than the old line's third answer.
    const half = bytes(mixedBy(opaqueStroke, [0.8, 0.3, 0.2], 0.5));
    const replaced = linear.map((c) => Math.round(c * 255));
    const tinted = [0.8, 0.3, 0.2].map((c, i) =>
      Math.round(c * linear[i]! * 255),
    );
    half.forEach((channel, i) => {
      expect(channel).toBeCloseTo((replaced[i]! + tinted[i]!) / 2, 0);
    });
  });

  it("floors the sRGB curve rather than raising zero to a fractional power", () => {
    // **A driver that spells `pow` as `exp2(y * log2(x))` has to get `log2(0)` right.** GLSL
    // says zero; the ones that do not say NaN, and a NaN multiplied by a coverage of zero is
    // still a NaN. The floor is one `max` and costs nothing measurable.
    expect(fragmentOf()).toMatch(/pow\(max\(/);
  });
});
