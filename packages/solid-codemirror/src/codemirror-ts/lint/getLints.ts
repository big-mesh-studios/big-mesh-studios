import type { VirtualTypeScriptEnvironment } from "@typescript/vfs";
import type { DiagnosticWithLocation } from "typescript";
import { convertTSDiagnosticToCM, isDiagnosticWithLocation } from "./utils";

/**
 * Reads a file's syntactic and semantic diagnostics out of a TypeScript
 * environment. This is what `tsLinter` asks the worker for, and is exposed so
 * a caller can drive other surfaces with the same diagnostics.
 */
export function getLints({
  env,
  path,
}: {
  env: VirtualTypeScriptEnvironment;
  path: string;
}) {
  // Don't crash when the file has not reached the environment yet.
  const exists = env.getSourceFile(path);
  if (!exists) {
    return [];
  }

  const syntacticDiagnostics =
    env.languageService.getSyntacticDiagnostics(path);
  const semanticDiagnostics = env.languageService.getSemanticDiagnostics(path);

  const diagnostics = [...syntacticDiagnostics, ...semanticDiagnostics].filter(
    (diagnostic): diagnostic is DiagnosticWithLocation =>
      isDiagnosticWithLocation(diagnostic),
  );

  return diagnostics.map(convertTSDiagnosticToCM);
}
