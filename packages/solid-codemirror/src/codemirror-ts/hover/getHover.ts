import type { VirtualTypeScriptEnvironment } from "@typescript/vfs";
import type ts from "typescript";
import { createDebug } from "../../utils";

const debug = createDebug("codemirror-ts/getHover");

/**
 * This information is passed to the API consumer to allow
 * them to create tooltips however they wish.
 */
export interface HoverInfo {
  start: number;
  end: number;
  /** Type definitions returned by ts.LanguageService.getTypeDefinitionAtPosition() */
  typeDef: readonly ts.DefinitionInfo[] | undefined;
  /** Definitions returned by ts.LanguageService.getDefinitionAtPosition() */
  def: readonly ts.DefinitionInfo[] | undefined;
  quickInfo: ts.QuickInfo | undefined;
}

export function getHover({
  env,
  path,
  pos,
}: {
  env: VirtualTypeScriptEnvironment;
  path: string;
  pos: number;
}): HoverInfo | null {
  debug(`Getting hover info for ${path} at position ${pos}`);
  const sourcePos = pos;

  try {
    const quickInfo = env.languageService.getQuickInfoAtPosition(
      path,
      sourcePos,
    );

    debug("QuickInfo from TypeScript:", quickInfo);

    if (!quickInfo) {
      debug("No quickInfo returned from TypeScript");
      return null;
    }

    if (quickInfo.displayParts) {
      debug(
        "DisplayParts:",
        quickInfo.displayParts.map((p) => `"${p.text}" (${p.kind})`),
      );
    }

    if (quickInfo.documentation) {
      debug(
        "Documentation:",
        quickInfo.documentation.map((p) => `"${p.text}" (${p.kind})`),
      );
    }

    if (quickInfo.tags) {
      debug("Tags:", quickInfo.tags);
    }

    const start = quickInfo.textSpan.start;

    const typeDef = env.languageService.getTypeDefinitionAtPosition(
      path,
      sourcePos,
    );
    const def = env.languageService.getDefinitionAtPosition(path, sourcePos);

    const result = {
      start,
      end: start + quickInfo.textSpan.length,
      typeDef,
      def,
      quickInfo,
    };

    debug("Returning hover info:", result);
    return result;
  } catch (e) {
    debug("Error getting hover info:", e);
    return null;
  }
}
