import { build } from "esbuild";
import type { Plugin } from "vite";

// Precompiles the rmsl shader graph in src/shaders.ts (written as a plain
// module) by bundling and executing it once at build time, then rewriting the
// module to a JSON export of the compiled GLSL strings. This moves all the
// shader construction out of the browser: rmsl is never shipped, and the
// fragment/vertex sources are just constants at runtime.

const TARGET = "/src/shaders.ts";

const normalizePath = (p: string) => p.replaceAll("\\", "/");
const dirname = (p: string) => {
  const i = p.lastIndexOf("/");
  return i === -1 ? "." : p.slice(0, i);
};

// FNV-1a over the source, used just as a cache key for dev HMR.
const hashSource = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

export default function precompileShaders(): Plugin {
  const cache = new Map<string, string>();

  return {
    name: "remesh:precompile-shaders",
    enforce: "pre",
    async transform(code, id) {
      const filePath = normalizePath(id);
      if (!filePath.endsWith(TARGET)) {
        return null;
      }

      const hash = hashSource(code);
      const cached = cache.get(hash);
      if (cached !== undefined) {
        return { code: cached, map: null };
      }

      const compiled = await compileShaders(code, filePath);
      cache.set(hash, compiled);
      return { code: compiled, map: null };
    },
  };
}

async function compileShaders(code: string, filePath: string): Promise<string> {
  let bundle: string;
  try {
    const result = await build({
      stdin: {
        contents: code,
        resolveDir: dirname(filePath),
        sourcefile: filePath,
        loader: "ts",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      write: false,
      logLevel: "silent",
    });
    bundle = result.outputFiles[0].text;
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Failed to bundle shaders for compile-time evaluation:\n${e.message}`;
    }
    throw e;
  }

  const dataUrl = `data:text/javascript,${encodeURIComponent(bundle)}`;
  const mod: unknown = await import(dataUrl);
  const shaders = (mod as { default?: unknown }).default;
  if (shaders === undefined) {
    throw new Error(`${filePath} must have a default export of the compiled shaders`);
  }

  return `export default ${JSON.stringify(shaders)};`;
}
