/**
 * Reads a place script's whole vocabulary out of the world application's own sources and writes it
 * down as the artifact `src/places/reference/place-api.json` that the in-game `/place:docs` panel
 * renders.
 *
 *   node --experimental-transform-types tools/place-reference.ts           # redraw the drawing
 *   node --experimental-transform-types tools/place-reference.ts --check   # fail when it is stale
 *
 * A reference somebody maintains by hand is a reference that is wrong within a month, so this one is
 * read rather than written: the signatures, the option shapes, the event payloads and the bounds all
 * come out of the type checker, and a sentence comes from the JSDoc already above the declaration it
 * describes. What an author reads is therefore the engine's own account of itself.
 *
 * ## Ported from `apps/voxelscape/tools/place-reference.ts`, and where it parts ways
 *
 * The checker plumbing below — how a type is printed, how a JSDoc block becomes one line, how a
 * union's members are walked — is the sibling's and is reused. Four things are not, and each is a
 * place the sibling assumes the other way:
 *
 * - **The guest library is a real module, not an ambient declaration.** The sibling reads
 *   `declare module "voxelscape" { … }`; here the module is `guest/place-api.ts`, aliased by
 *   `paths`, so the extractors are handed the source file's own symbol.
 * - **Every guest function is `export const name = (…) => …`, not a `function` declaration**, so
 *   `functionsOf` accepts a variable declaration as well.
 * - **There are no effects, shapes or plans to read.** The effect vocabulary is the host's, not the
 *   author's — see `src/places/reference/types.ts` — so the sections and their extractors are gone.
 * - **A place's facts and bounds are separate modules**, `events.ts` and `limits.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import ts from "typescript";
import type {
  PlaceEvent,
  PlaceField,
  PlaceFunction,
  PlaceLimit,
  PlaceParam,
  PlaceReference,
  PlaceType,
  PlaceTypeVariant,
  PlaceValue,
} from "../src/places/reference/types.ts";

/** The application directory, whatever directory this was started from. */
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Where the drawing is held, read by the `/place:docs` panel. */
const DRAWING = join(APP_DIR, "src/places/reference/place-api.json");

const TS_CONFIG = join(APP_DIR, "tsconfig.json");
/** The guest library, under the name a place imports it by. */
const GUEST = "src/places/guest/place-api.ts";
/** The kinds a fact can be, and the sentences above them. */
const EVENTS = "src/places/events.ts";
/** Every bound the trusted side enforces. */
const LIMITS = "src/places/limits.ts";

/** The program the reference is read out of, and the checker that reads it. */
export interface Reading {
  checker: ts.TypeChecker;
  program: ts.Program;
  options: ts.CompilerOptions;
  sourceOf: (path: string) => ts.SourceFile;
}

/** The reading a test asks for without the writing, which `main` does on its own. */
export const reading = (): Reading => {
  const config = ts.readConfigFile(TS_CONFIG, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, APP_DIR);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const byPath = (path: string): ts.SourceFile | undefined => {
    const name = path.startsWith("/") ? relative(APP_DIR, path) : path;
    return program.getSourceFile(name) ?? program.getSourceFile(path);
  };
  return {
    checker: program.getTypeChecker(),
    program,
    options: parsed.options,
    sourceOf: (path: string): ts.SourceFile => {
      const found = byPath(path);
      if (found === undefined) {
        throw new Error(`no ${path} in the program`);
      }
      return found;
    },
  };
};

/**
 * How a type is printed, in the form a reader of the API wants: named types by
 * the name they are declared under, and nothing cut off at the end of a line.
 */
const TYPE_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

/**
 * One type as text, falling back to the declaration's own source when the
 * checker will not print it — which it does refuse for a few synthesized
 * signatures, and a reference with a blank signature is worse than one showing
 * what the source wrote.
 */
const typeText = (
  read: Reading,
  type: ts.Type,
  at: ts.Node,
  flags: ts.TypeFormatFlags = TYPE_FLAGS,
): string => {
  try {
    return read.checker.typeToString(type, at, flags);
  } catch {
    return at.getText().replace(/\s+/g, " ");
  }
};

const tidy = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** What a JSDoc block above a node says, as one line. */
const nodeDoc = (node: ts.Node): string => {
  const comment = (node as { jsDoc?: readonly ts.JSDoc[] }).jsDoc?.[0]?.comment;
  if (comment === undefined) {
    return "";
  }
  const text =
    typeof comment === "string"
      ? comment
      : comment.map((part) => part.text).join("");
  return tidy(text);
};

/** What a symbol's own documentation says, as one line. */
const symbolDoc = (read: Reading, symbol: ts.Symbol): string =>
  tidy(
    ts
      .displayPartsToString(symbol.getDocumentationComment(read.checker))
      .replace(/\{@link [^}]+\}/g, (link) =>
        link
          .replace(/\{@link ([^|}]+)\|?([^}]*)\}/, "$2$1")
          .replace(/[{}]/g, ""),
      ),
  );

/** What a node or its symbol says, preferring the symbol's own account. */
const docOf = (read: Reading, node: ts.Node): string => {
  const symbol = read.checker.getSymbolAtLocation(node);
  return (symbol !== undefined ? symbolDoc(read, symbol) : "") || nodeDoc(node);
};

/** The fields an interface or class body declares, in declaration order. */
const membersOf = (
  read: Reading,
  declaration: ts.InterfaceDeclaration | ts.ClassDeclaration,
): PlaceField[] =>
  declaration.members
    .filter(
      (member): member is ts.PropertySignature | ts.MethodSignature =>
        ts.isPropertySignature(member) || ts.isMethodSignature(member),
    )
    .filter((member) => member.name !== undefined)
    .map((member) => {
      const symbol =
        member.name !== undefined
          ? read.checker.getSymbolAtLocation(member.name)
          : undefined;
      return {
        name: member.name!.getText().replace(/^["']|["']$/g, ""),
        type: typeText(
          read,
          read.checker.getTypeAtLocation(
            member.type ?? (member.name as ts.Node),
          ),
          member,
        ),
        optional: member.questionToken !== undefined,
        doc:
          (symbol !== undefined ? symbolDoc(read, symbol) : "") ||
          nodeDoc(member),
      };
    });

/** The named type declarations a source file exports, by name. */
const typeDeclarations = (
  source: ts.SourceFile,
): Map<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration> => {
  const found = new Map<
    string,
    ts.TypeAliasDeclaration | ts.InterfaceDeclaration
  >();
  for (const statement of source.statements) {
    if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement)) &&
      ts.isIdentifier(statement.name)
    ) {
      found.set(statement.name.text, statement);
    }
  }
  return found;
};

/**
 * The declaration a type node ends at, following an `import("…")` qualifier into
 * the file it points at — which is how the guest module's own declarations spell
 * a type the world owns elsewhere, such as the plan's shape vocabulary.
 */
const targetOf = (
  read: Reading,
  from: ts.SourceFile,
  node: ts.TypeNode,
): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | undefined => {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return typeDeclarations(from).get(node.typeName.text);
  }
  const specifier = node as ts.ImportTypeNode;
  const argument = specifier.argument;
  if (
    argument === undefined ||
    !ts.isLiteralTypeNode(argument) ||
    !ts.isStringLiteral(argument.literal)
  ) {
    return undefined;
  }
  // The qualifier is the bare name for `import("…").Shape` and a dotted path
  // for a name inside a namespace the pointed file also exports. A bare
  // `import("…")` is the module itself, which names no declaration here.
  const qualifier = specifier.qualifier;
  const named =
    qualifier === undefined
      ? ""
      : ts.isIdentifier(qualifier)
        ? qualifier.text
        : ts.isQualifiedName(qualifier)
          ? qualifier.right.text
          : "";
  if (named === "") {
    return undefined;
  }
  // The specifier is resolved the way the compiler resolves it, so an
  // extensionless one finds the file the way it does everywhere else.
  const resolved = ts.resolveModuleName(
    argument.literal.text,
    from.fileName,
    read.options,
    { fileExists: ts.sys.fileExists, readFile: ts.sys.readFile },
  ).resolvedModule;
  return resolved === undefined
    ? undefined
    : typeDeclarations(read.sourceOf(resolved.resolvedFileName)).get(named);
};

/** The type alias a source file declares under `name`. */
const aliasOf = (
  source: ts.SourceFile,
  name: string,
): ts.TypeAliasDeclaration => {
  const found = typeDeclarations(source).get(name);
  if (found === undefined || !ts.isTypeAliasDeclaration(found)) {
    throw new Error(`${source.fileName} declares no type alias ${name}`);
  }
  return found;
};

/** The string literal a `"kind"`-shaped property of a union member carries. */
const literalOf = (member: ts.TypeLiteralNode, property: string): string => {
  for (const one of member.members) {
    if (
      ts.isPropertySignature(one) &&
      one.name !== undefined &&
      one.name.getText().replace(/^["']|["']$/g, "") === property &&
      one.type !== undefined &&
      ts.isLiteralTypeNode(one.type) &&
      ts.isStringLiteral(one.type.literal)
    ) {
      return one.type.literal.text;
    }
  }
  return "";
};

/** The fields a type literal node declares, read through the checker. */
const fieldsOfLiteral = (read: Reading, literal: ts.TypeLiteralNode) =>
  literal.members
    .filter(
      (member): member is ts.PropertySignature =>
        ts.isPropertySignature(member) && member.name !== undefined,
    )
    .map((member) => {
      const symbol = read.checker.getSymbolAtLocation(member.name!);
      return {
        name: member.name!.getText().replace(/^["']|["']$/g, ""),
        type: typeText(
          read,
          read.checker.getTypeAtLocation(member.type ?? member.name!),
          member,
        ),
        optional: member.questionToken !== undefined,
        doc:
          (symbol !== undefined ? symbolDoc(read, symbol) : "") ||
          nodeDoc(member),
      };
    });

const isGuestVisible = (declaration: ts.Declaration): boolean => {
  // A `const` is the one declaration whose `export` is not on itself: the
  // keyword is written on the statement that declares it, and the export symbol
  // names the declaration inside.
  const statement = ts.isVariableDeclaration(declaration)
    ? (declaration.parent.parent as ts.Statement)
    : declaration;
  return (
    (ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined
    )?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ===
    true
  );
};

/** The signatures one exported function has, as the editor's language service shows them. */
const functionsOf = (read: Reading, source: ts.SourceFile): PlaceFunction[] => {
  const symbol = read.checker.getSymbolAtLocation(source);
  if (symbol === undefined) {
    return [];
  }
  const found: PlaceFunction[] = [];
  for (const exported of read.checker.getExportsOfModule(symbol)) {
    const declaration = exported.getDeclarations()?.[0];
    if (
      declaration === undefined ||
      !(
        ts.isFunctionDeclaration(declaration) ||
        ts.isVariableDeclaration(declaration)
      ) ||
      !isGuestVisible(declaration)
    ) {
      continue;
    }
    const signature = read.checker
      .getTypeOfSymbolAtLocation(exported, declaration)
      .getCallSignatures()[0];
    if (signature === undefined) {
      continue;
    }
    const params: PlaceParam[] = signature.getParameters().map((param) => {
      const at = param.valueDeclaration ?? declaration;
      return {
        name: param.getName(),
        type: typeText(
          read,
          read.checker.getTypeOfSymbolAtLocation(param, at),
          at,
        ),
        optional:
          (param.flags & ts.SymbolFlags.Optional) !== 0 ||
          (ts.isParameter(at) && at.questionToken !== undefined),
        doc: symbolDoc(read, param),
      };
    });
    found.push({
      name: exported.getName(),
      signature: read.checker.signatureToString(
        signature,
        undefined,
        TYPE_FLAGS,
      ),
      doc: symbolDoc(read, exported),
      params,
      returns: typeText(read, signature.getReturnType(), declaration),
    });
  }
  return found.sort((one, another) => one.name.localeCompare(another.name));
};

/** The values the module exports, read without being called. */
const valuesOf = (read: Reading, source: ts.SourceFile): PlaceValue[] => {
  const symbol = read.checker.getSymbolAtLocation(source);
  if (symbol === undefined) {
    return [];
  }
  const found: PlaceValue[] = [];
  for (const exported of read.checker.getExportsOfModule(symbol)) {
    const declaration = exported.getDeclarations()?.[0];
    if (
      declaration === undefined ||
      !ts.isVariableDeclaration(declaration) ||
      !isGuestVisible(declaration)
    ) {
      continue;
    }
    const type = read.checker.getTypeOfSymbolAtLocation(exported, declaration);
    // **A function is a `functionsOf` entry, not a value.** A guest module exports both, and a
    // reference that listed `createShape` twice — once as a callable and once as a value — would
    // be telling an author there are two of them.
    if (type.getCallSignatures().length > 0) {
      continue;
    }
    found.push({
      name: exported.getName(),
      type: typeText(read, type, declaration),
      doc: symbolDoc(read, exported),
    });
  }
  return found.sort((one, another) => one.name.localeCompare(another.name));
};

/** The named type a union member refers to, when it refers to one. */
const referencedName = (member: ts.TypeNode): string =>
  ts.isTypeReferenceNode(member) && ts.isIdentifier(member.typeName)
    ? member.typeName.text
    : "";

/**
 * A union member as the single word a reference lists it by, when it is one: a
 * string literal carries its own text, and a keyword type spells itself. The
 * rest — a named shape, a tuple, an array — has no single word, and a union made
 * of those is expanded into alternatives instead.
 */
const literalMember = (read: Reading, member: ts.TypeNode): string => {
  if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
    return member.literal.text;
  }
  if (ts.isLiteralTypeNode(member)) {
    return typeText(read, read.checker.getTypeAtLocation(member), member);
  }
  if (member.kind === ts.SyntaxKind.StringKeyword) {
    return "string";
  }
  if (member.kind === ts.SyntaxKind.NumberKeyword) {
    return "number";
  }
  if (member.kind === ts.SyntaxKind.BooleanKeyword) {
    return "boolean";
  }
  if (ts.isTypeReferenceNode(member) && member.typeArguments) {
    return `${referencedName(member)}<${member.typeArguments
      .map((argument) => literalMember(read, argument))
      .filter((text) => text !== "")
      .join(", ")}>`;
  }
  return "";
};

/** Every named member of a union, expanded to the fields it declares. */
const alternativesOf = (
  read: Reading,
  declarations: Map<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration>,
  union: ts.UnionTypeNode,
): PlaceTypeVariant[] =>
  union.types.flatMap((member): PlaceTypeVariant[] => {
    const name = referencedName(member);
    if (name === "") {
      return [];
    }
    const declaration = declarations.get(name);
    if (declaration === undefined) {
      return [];
    }
    const fields = ts.isInterfaceDeclaration(declaration)
      ? membersOf(read, declaration)
      : typeFieldsOfAlias(read, declaration, declarations);
    return [{ name, doc: docOf(read, declaration), members: fields }];
  });

/**
 * The declaration a type alias actually stands for, when its own type node is an
 * `import("…")` qualifier — the way the guest module spells a type the world owns
 * somewhere else. The named declaration is what declares the shape, so that is
 * what gets read, and an alias is its own answer.
 *
 * Both kinds of declaration come back because the pointed name is an interface
 * about as often as it is an alias: `type Player = import("./sandbox").LivePlayer`
 * names a type, `type RaycastHit = import("./sandbox").RaycastHit` names an
 * interface, and reading the second as if it were the first leaves the alias
 * holding an `import` node nothing downstream can see through.
 */
const pointedAt = (
  read: Reading,
  alias: ts.TypeAliasDeclaration,
): ts.TypeAliasDeclaration | ts.InterfaceDeclaration => {
  if (!ts.isImportTypeNode(alias.type)) {
    return alias;
  }
  return targetOf(read, alias.getSourceFile(), alias.type) ?? alias;
};

/** The fields a type alias's own object type declares, following its own unions. */
const typeFieldsOfAlias = (
  read: Reading,
  alias: ts.TypeAliasDeclaration,
  declarations: Map<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration>,
): PlaceField[] => {
  const target = pointedAt(read, alias);
  if (ts.isInterfaceDeclaration(target)) {
    return membersOf(read, target);
  }
  if (ts.isTypeLiteralNode(target.type)) {
    return fieldsOfLiteral(read, target.type);
  }
  const name = referencedName(target.type);
  if (name !== "") {
    const named = declarations.get(name);
    if (named !== undefined && ts.isInterfaceDeclaration(named)) {
      return membersOf(read, named);
    }
  }
  return [];
};

/**
 * The type itself, for the names whose shape is not a list of fields. An alias
 * over a tuple, an array, or a mapped type has nothing else to draw, and a
 * reference that showed only its name would leave a script author with nothing
 * to read at all.
 *
 * The alias is expanded here and nowhere else. A field or a parameter is better
 * written with the name a script uses — `Voxel3` says more at a glance than
 * `[number, number, number]` — but an entry that is *only* the name has to be
 * the structure behind it, or it is a row with nothing on it.
 *
 * A utility type is the case where expanding is worse than not. Asked to print
 * `PayloadFor`, the checker substitutes the type argument into every branch of
 * the conditional and hands back a union of ninety expansions — a signature no
 * one reads, printed where a definition would do. Past a readable length the
 * declaration's own source is the better answer, because a type alias is written
 * in the source as the definition it is.
 */
const READABLE_TYPE = 160;

const spelledOut = (
  read: Reading,
  declaration: ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
): string => {
  const spelled = typeText(
    read,
    read.checker.getTypeAtLocation(declaration),
    declaration,
    TYPE_FLAGS | ts.TypeFormatFlags.InTypeAlias,
  );
  if (spelled.length <= READABLE_TYPE) {
    return spelled;
  }
  return tidy(
    ts.isTypeAliasDeclaration(declaration)
      ? declaration.type.getText()
      : declaration.getText(),
  );
};

/** Every type the module exports, with a union of literals or of named types expanded. */
const typesOf = (read: Reading, source: ts.SourceFile): PlaceType[] => {
  const symbol = read.checker.getSymbolAtLocation(source);
  if (symbol === undefined) {
    return [];
  }

  const found: PlaceType[] = [];
  for (const exported of read.checker.getExportsOfModule(symbol)) {
    const declaration = exported.getDeclarations()?.[0];
    if (declaration === undefined) {
      continue;
    }
    if (
      !isGuestVisible(declaration) ||
      (!ts.isInterfaceDeclaration(declaration) &&
        !ts.isClassDeclaration(declaration) &&
        !ts.isTypeAliasDeclaration(declaration))
    ) {
      continue;
    }
    if (ts.isInterfaceDeclaration(declaration)) {
      found.push({
        name: exported.getName(),
        doc: docOf(read, declaration),
        members: membersOf(read, declaration),
        union: [],
        alternatives: [],
        type: "",
      });
      continue;
    }
    if (ts.isClassDeclaration(declaration)) {
      found.push({
        name: exported.getName(),
        doc: docOf(read, declaration),
        members: declaration.members
          .filter((member) => ts.isPropertyDeclaration(member))
          .map((member) => ({
            name: member.name.getText().replace(/^["']|["']$/g, ""),
            type: typeText(
              read,
              read.checker.getTypeAtLocation(member.type ?? member.name),
              member,
            ),
            optional: member.questionToken !== undefined,
            doc: nodeDoc(member),
          })),
        union: [],
        alternatives: [],
        type: "",
      });
      continue;
    }
    if (
      !ts.isTypeAliasDeclaration(declaration) ||
      !isGuestVisible(declaration)
    ) {
      continue;
    }
    // A union's members are named after the file the shape is really declared
    // in, which is the one the alias that declares it lives in.
    const effective = pointedAt(read, declaration);
    const declarations = typeDeclarations(
      read.sourceOf(effective.getSourceFile().fileName),
    );
    let literals: string[] | undefined;
    let alternatives: PlaceTypeVariant[] = [];
    if (
      ts.isTypeAliasDeclaration(effective) &&
      ts.isUnionTypeNode(effective.type)
    ) {
      const texts = effective.type.types.map((member) =>
        literalMember(read, member),
      );
      literals = texts.every((text) => text !== "") ? texts : undefined;
      if (literals === undefined) {
        alternatives = alternativesOf(read, declarations, effective.type);
      }
    }
    const members = typeFieldsOfAlias(read, declaration, declarations);
    found.push({
      name: exported.getName(),
      doc: docOf(read, declaration),
      members,
      union: literals ?? [],
      alternatives,
      // A union is already drawn as its members, so spelling it out as well
      // would print the same list twice — once as a signature a reader has to
      // read through, and once as the members they came to see.
      type:
        members.length === 0 &&
        alternatives.length === 0 &&
        literals === undefined
          ? spelledOut(read, declaration)
          : "",
    });
  }
  return found.sort((one, another) => one.name.localeCompare(another.name));
};

// The vocabulary a script's `onTick` handler sees, and the bounds on its numbers.

/**
 * Every fact a script's `onTick` handler is handed, and the fields they all share.
 *
 * **The kinds and their fields come from the guest module's own `PlaceEventUnion`**, which is the
 * union a script matches against — not from the host's `ScriptEvent`, which is a different shape
 * behind a different boundary. The sentence for each kind is the host's, read off the JSDoc above
 * the kind in `events.ts`, because that is where the engine says what a fact means.
 */
const eventsOf = (
  read: Reading,
): { events: PlaceEvent[]; common: PlaceField[] } => {
  const meanings = eventMeanings(read);
  const source = read.sourceOf(GUEST);
  const declarations = typeDeclarations(source);
  const union = aliasOf(source, "PlaceEventUnion").type;
  if (!ts.isUnionTypeNode(union)) {
    throw new Error("PlaceEventUnion is not a union");
  }

  const events: PlaceEvent[] = [];
  for (const raw of union.types) {
    // **The source writes each member in parentheses**, and the checker keeps the
    // `ParenthesizedType`, so an intersection has to be unwrapped before it can be recognised.
    const member = unwrapParens(raw);
    if (!ts.isIntersectionTypeNode(member)) {
      continue;
    }
    const kind = kindOfBase(read, member.types);
    if (kind === "") {
      continue;
    }
    const fields = member.types
      .filter((one): one is ts.TypeLiteralNode => ts.isTypeLiteralNode(one))
      .flatMap((literal) => fieldsOfLiteral(read, literal));
    events.push({
      kind,
      doc: meanings.get(kind) ?? "",
      fields,
    });
  }

  // Every fact carries these however it was authored, read off the base the union is built from.
  const base = declarations.get("PlaceEventBase");
  const common =
    base !== undefined && ts.isTypeAliasDeclaration(base)
      ? fieldsOfLiteral(read, base.type as ts.TypeLiteralNode)
      : [];

  return { events, common };
};

/** A `/** … *\/` block's prose, with the delimiters and the leading asterisks taken off. */
const stripDocBlock = (text: string): string =>
  text
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, ""))
    .join(" ")
    .trim();

/** A type node with any parentheses around it removed, which the source writes freely. */
const unwrapParens = (node: ts.TypeNode): ts.TypeNode =>
  ts.isParenthesizedTypeNode(node) ? unwrapParens(node.type) : node;

/** The kind an intersection's `PlaceEventBase<"…">` names, or `""` when it names none. */
const kindOfBase = (read: Reading, parts: readonly ts.TypeNode[]): string => {
  for (const part of parts) {
    if (!ts.isTypeReferenceNode(part) || !ts.isIdentifier(part.typeName)) {
      continue;
    }
    if (part.typeName.text !== "PlaceEventBase") {
      continue;
    }
    const argument = part.typeArguments?.[0];
    if (argument !== undefined && ts.isLiteralTypeNode(argument)) {
      const literal = argument.literal;
      if (ts.isStringLiteral(literal)) {
        return literal.text;
      }
    }
  }
  return "";
};

/**
 * The sentence above each event kind, from `events.ts`.
 *
 * **The one table the source cannot be read for directly.** A kind is an array element, and a JSDoc
 * comment on one is not a symbol's documentation — it is attached to the element node — so this
 * walks `EVENT_KINDS`' initializer and reads the comment off each string literal.
 */
const eventMeanings = (read: Reading): Map<string, string> => {
  const text = read.sourceOf(EVENTS).getFullText();
  const meanings = new Map<string, string>();
  // **A comment and the literal it describes, taken as text.** A kind is an array element, and a
  // comment above one is leading trivia rather than a declaration's own JSDoc — neither
  // `nodeDoc` nor `ts.getJSDocCommentsAndTags` finds it, so the pair is matched directly.
  // **The body may not contain `*/`**, or the match backtracks past a comment that is not
  // followed by a kind and swallows everything up to one that is — which is how the file header
  // ended up as the account of `player-joined`.
  const pattern =
    /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/[ \t]*\n?[ \t]*"([a-z][a-z-]*)"/g;
  for (const [, body, kind] of text.matchAll(pattern)) {
    meanings.set(kind, tidy(stripDocBlock(`/**${body}*/`)));
  }
  return meanings;
};

/** Every bound the trusted side enforces, from the modules that declare them. */
const limitsOf = (read: Reading): PlaceLimit[] => {
  const found: PlaceLimit[] = [];
  const seen = new Set<string>();
  for (const path of [LIMITS, EVENTS]) {
    const source = read.sourceOf(path);
    const module = read.checker.getSymbolAtLocation(source);
    if (module === undefined) {
      continue;
    }
    for (const exported of read.checker.getExportsOfModule(module)) {
      const name = exported.getName();
      if (!/^(?:MAX|MIN)_/.test(name) || seen.has(name)) {
        continue;
      }
      const declaration = exported.getDeclarations()?.[0];
      if (declaration === undefined) {
        continue;
      }
      const value = read.checker.getTypeOfSymbolAtLocation(
        exported,
        declaration,
      );
      // A numeric bound reads best as the number it is, and a union of two reads best as the range
      // it spans, which is how a minimum and its maximum are declared together.
      const printed = value.isUnion()
        ? value.types
            .map((one) => (one.isLiteral() ? String(one.value) : ""))
            .filter((one) => one !== "")
            .join(" .. ")
        : value.isLiteral()
          ? String(value.value)
          : typeText(read, value, declaration);
      seen.add(name);
      found.push({ name, value: printed, doc: symbolDoc(read, exported) });
    }
  }
  return found.sort((one, another) => one.name.localeCompare(another.name));
};

// The drawing itself.

/** Everything a place script can reach, read out of the world's own sources. */
export const referenceOf = (read: Reading): PlaceReference => {
  const guest = read.sourceOf(GUEST);
  const { events, common } = eventsOf(read);
  return {
    sources: [GUEST, EVENTS, LIMITS],
    functions: functionsOf(read, guest),
    values: valuesOf(read, guest),
    types: typesOf(read, guest),
    events,
    eventCommon: common,
    limits: limitsOf(read),
  };
};

/** The entries no sentence reaches, which the reference would otherwise show blank. */
const undocumented = (reference: PlaceReference): string[] => {
  const gaps: string[] = [];
  for (const one of reference.functions) {
    if (one.doc === "") gaps.push(`function ${one.name}`);
  }
  for (const one of reference.values) {
    if (one.doc === "") gaps.push(`value ${one.name}`);
  }
  for (const one of reference.events) {
    if (one.doc === "") gaps.push(`event ${one.kind}`);
  }
  for (const one of reference.limits) {
    if (one.doc === "") gaps.push(`limit ${one.name}`);
  }
  for (const one of reference.types) {
    if (one.doc === "") gaps.push(`type ${one.name}`);
  }
  return gaps;
};

/**
 * The drawing as Prettier would write it, which is how it is held on disk. The repository formats
 * everything it holds, so a drawing written any other way is reformatted the next time the formatter
 * runs and stops matching what this reads — leaving `--check` failing until somebody redraws it.
 */
const formatted = async (drawing: string): Promise<string> =>
  format(drawing, { ...(await resolveConfig(DRAWING)), filepath: DRAWING });

export const main = async (): Promise<void> => {
  const checking = process.argv.includes("--check");
  const reference = referenceOf(reading());
  const drawing = await formatted(`${JSON.stringify(reference, null, 2)}\n`);
  if (!checking) {
    writeFileSync(DRAWING, drawing);
    console.log(
      `read ${reference.functions.length} functions, ${reference.types.length} types, ` +
        `${reference.values.length} values, ${reference.events.length} events and ` +
        `${reference.limits.length} limits into ${relative(APP_DIR, DRAWING)}`,
    );
  }

  const problems: string[] = [];
  if (checking) {
    let held = "";
    try {
      held = readFileSync(DRAWING, "utf8");
    } catch {
      held = "";
    }
    if (held !== drawing) {
      problems.push(
        `${relative(APP_DIR, DRAWING)} is not what the sources say any more; run \`pnpm place-reference\``,
      );
    }
  }
  for (const gap of undocumented(reference)) {
    problems.push(
      `no sentence reaches ${gap}; write one above the declaration it belongs to`,
    );
  }
  if (problems.length > 0) {
    console.error(problems.map((line) => `  ${line}`).join("\n"));
    process.exit(1);
  }
  if (checking) {
    console.log(
      `the drawing matches the sources: ${reference.functions.length} functions, ` +
        `${reference.types.length} types, ${reference.events.length} events`,
    );
  }
};

// Imported by its own tests, which want the reading without the writing, so the work only runs when
// this file is what was started.
if (
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("place-reference.ts")
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
