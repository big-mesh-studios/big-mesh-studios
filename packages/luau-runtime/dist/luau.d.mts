/**
 * Type face of the built Emscripten module factory. The implementation is generated
 * (`glue/CMakeLists.txt` → `dist/luau.mjs`); this is the committed declaration beside
 * it, so the typed bindings and `tsc --noEmit` treat the artifact as the untyped
 * external it is — the same shape `@jitl/quickjs-*` packages ship for their loader.
 */
declare function createLuauModule(
  options?: Record<string, unknown>,
): Promise<unknown>;
export default createLuauModule;
