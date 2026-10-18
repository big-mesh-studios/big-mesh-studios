import type { CompletionContext } from "@codemirror/autocomplete";
import type { VirtualTypeScriptEnvironment } from "@typescript/vfs";
import type ts from "typescript";
import type { RawCompletion, RawCompletionItem } from "../types";
import { DEFAULT_CODEMIRROR_TYPE_ICONS } from "./icons";
import { matchBefore } from "./matchBefore";

// Holds `ts.ScriptElementKind.warning` as a plain string so no bundled
// TypeScript module is needed here; the enum value has never changed.
const TS_COMPLETE_BLOCKLIST = ["warning"] as readonly string[];

/**
 * How many candidates may have their details resolved in one request.
 *
 * **Because `getCompletionsAtPosition` returns every symbol in scope** — over a
 * thousand in a place script — and leaves the prefix filtering to the editor.
 * Asking for details for all of them costs several seconds, while CodeMirror is
 * waiting to show a popup that will only contain the few that match. The limit
 * bounds that wait; entries past it still arrive as completions, just without
 * the documentation panel.
 */
const DETAIL_LIMIT = 100;

/** Whether a name is close enough to the typed word to be worth detailing. */
function matchesTypedWord(name: string, word: string): boolean {
  if (word === "") {
    return true;
  }
  const lowerName = name.toLowerCase();
  const lowerWord = word.toLowerCase();
  return lowerName.startsWith(lowerWord) || lowerName.includes(lowerWord);
}

export interface AutocompletionInfo {
  start: number;
  end: number;
  typeDef: readonly ts.DefinitionInfo[] | undefined;
  quickInfo: ts.QuickInfo | undefined;
}

export async function getAutocompletion({
  env,
  path,
  context,
}: {
  env: VirtualTypeScriptEnvironment;
  path: string;
  /**
   * Allow this to be a subset of the full CompletionContext
   * object, because the raw object isn't serializable.
   */
  context: Pick<CompletionContext, "pos" | "explicit">;
}): Promise<RawCompletion | null> {
  const { pos, explicit } = context;
  const rawContents = env.getSourceFile(path)?.getFullText();

  if (!rawContents) return null;

  // If there's space behind the cursor, don't try and autocomplete.
  // https://codemirror.net/examples/autocompletion/
  let word = matchBefore(rawContents, pos, /\w*/);
  if (!word?.text) {
    word = matchBefore(rawContents, pos, /\./);
  }

  if (!word?.text && !explicit) return null;

  const completionInfo = env.languageService.getCompletionsAtPosition(
    path,
    pos,
    {
      includeCompletionsForModuleExports: true,
      includeCompletionsForImportStatements: true,
    },
    {},
  );

  // TODO: build ATA support for a 'loading' state
  // while types are being fetched
  if (!completionInfo) return null;

  // A bare `.` has no word to compare against, but a member list is short
  // enough that all of its entries are worth detailing anyway.
  const typed = word?.text === "." ? "" : (word?.text ?? "");
  let detailed = 0;

  const options = completionInfo.entries
    .filter((entry) => !TS_COMPLETE_BLOCKLIST.includes(entry.kind))
    .map((entry): RawCompletionItem => {
      let type = entry.kind ? String(entry.kind) : undefined;

      if (type === "member") type = "property";

      if (type && !DEFAULT_CODEMIRROR_TYPE_ICONS.has(type)) {
        type = undefined;
      }

      // **Details only for candidates the popup may actually show.** They are
      // the expensive part — each can trigger type checking — and resolving
      // every symbol in scope is what made a bare-word request take seconds.
      let details:
        | ReturnType<typeof env.languageService.getCompletionEntryDetails>
        | undefined;
      if (detailed < DETAIL_LIMIT && matchesTypedWord(entry.name, typed)) {
        detailed += 1;
        details = env.languageService.getCompletionEntryDetails(
          path,
          pos,
          entry.name,
          {},
          entry.source,
          {},
          entry.data,
        );
      }

      return {
        label: entry.name,
        codeActions: details?.codeActions,
        displayParts: details?.displayParts ?? [],
        documentation: details?.documentation,
        tags: details?.tags,
        type,
      };
    });

  return {
    from: word ? (word.text === "." ? word.to : word.from) : pos,
    options,
  };
}
