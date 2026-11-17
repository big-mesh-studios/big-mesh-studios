/**
 * Type face of the built analysis Emscripten module factory. The implementation is
 * generated (`glue/CMakeLists.txt` → `dist/luau-analysis.mjs`); this is the committed
 * declaration beside it, so `src/analysis.ts` treats the artifact as the untyped
 * external it is and a fresh clone type-checks without a build.
 */
declare function createLuauAnalysisModule(
  options?: Record<string, unknown>,
): Promise<unknown>;
export default createLuauAnalysisModule;
