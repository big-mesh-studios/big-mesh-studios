// Reads a place script's whole vocabulary out of the world application's own
// sources and writes it down as one artifact the documentation site and the
// in-game `/place:docs` panel both render.
//
//   pnpm place-reference           # redraw packages/place-reference/src/place-api.json
//   pnpm place-reference --check   # fail if what it draws is stale, or a tag has no group
//
// A reference somebody maintains by hand is a reference that is wrong within a
// month, so this one is read rather than written: the function signatures, the
// effect and event payloads, the bounds the trusted side enforces, and the
// shape vocabulary all come out of the type checker, and every sentence comes
// from the JSDoc block already above the declaration it describes. What a
// script author reads is therefore the world's own account of itself, and a
// declaration that changes its documentation changes the reference with it.
//
// Two things here are not read out of the source, and both are judgements about
// reading rather than facts about the code: EFFECT_GROUPS below, which decides
// the order a script author meets the vocabulary in rather than the order the
// trusted side happens to validate it in, and the two MEANING tables further
// down, which hold the one-line account of every effect and fact the trusted
// side never wrote one for. A tag in neither is a tag the site would show blank,
// so `--check` fails on one — the way `tools/architecture.ts` fails on an import
// no rule allows.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import ts from "typescript";
import type {
  PlaceEffect,
  PlaceEffectGroup,
  PlaceEvent,
  PlaceField,
  PlaceFunction,
  PlaceLimit,
  PlaceParam,
  PlacePlanType,
  PlaceReference,
  PlaceShape,
  PlaceType,
  PlaceTypeVariant,
  PlaceValue,
} from "@big-mesh-studios/place-reference";

/** The application directory, whatever directory this was started from. */
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
/** The workspace root, two above the application. */
const ROOT_DIR = join(APP_DIR, "..", "..");
/** Where the drawing is held, read by both applications. */
const DRAWING = join(ROOT_DIR, "packages/place-reference/src/place-api.json");

const TS_CONFIG = join(APP_DIR, "tsconfig.json");
const VOXELSCAPE_DTS = "src/places/voxelscape.d.ts";
const EFFECTS = "src/places/effects.ts";
const EVENTS = "src/places/events.ts";
const SANDBOX = "src/places/sandbox.ts";
const PLAN_SHAPES = "src/world/plan-shapes.ts";
const PLACE_PLAN = "src/places/plan.ts";

/**
 * The families the effect vocabulary is read in, and what each is for. A tag
 * appears under exactly one; a tag under none is a gap the check reports.
 */
const EFFECT_GROUPS: readonly { name: string; doc: string; tags: string[] }[] =
  [
    {
      name: "Figures",
      doc: "NPCs, props, and everything hung on them or standing in one of their zones.",
      tags: [
        "npc",
        "npc-remove",
        "npc-die",
        "prop",
        "prop-remove",
        "entity-set",
        "figure-animate",
        "figure-stop",
        "entity-look",
        "entity-look-clear",
        "prompt",
        "prompt-remove",
        "zone",
        "zone-remove",
      ],
    },
    {
      name: "The world",
      doc: "Voxels, structures, scenery, and the clock a place's world keeps.",
      tags: [
        "block-set",
        "block-fill",
        "block-clear",
        "structure",
        "structure-remove",
        "fire",
        "time",
        "void",
      ],
    },
    {
      name: "The player",
      doc: "Where a player is put, how fast and high they move, and what happens to their body and health.",
      tags: [
        "player-place",
        "player-face",
        "player-speed",
        "player-jump",
        "player-damage",
        "player-heal",
        "player-max-health",
        "player-push",
        "player-kill",
        "player-respawn",
        "player-checkpoint",
        "player-control",
        "player-model",
      ],
    },
    {
      name: "Rules and scoring",
      doc: "Sides, scores, conversations, and the endings a place can reach.",
      tags: [
        "team-define",
        "player-team",
        "player-value",
        "report-hit",
        "dialog",
        "dialog-close",
        "ending",
        "restart",
      ],
    },
    {
      name: "Items",
      doc: "The items a place defines for its own game, and what a player carries.",
      tags: ["item-define", "item-give", "item-take", "item-hold"],
    },
    {
      name: "Movement and physics",
      doc: "The boxes that push, grip, or block, and the timers a rule counts down.",
      tags: ["field", "field-remove", "barrier", "barrier-remove", "timer"],
    },
    {
      name: "The camera",
      doc: "Where a player looks, and the shots a place plays in front of them.",
      tags: [
        "cutscene",
        "camera",
        "camera-follow",
        "camera-follow-clear",
        "explosion",
      ],
    },
    {
      name: "Presentation",
      doc: "What a player reads or hears over the world.",
      tags: ["hud", "hud-remove", "toast", "narrate", "sound", "sound-stop"],
    },
    {
      name: "Scripted interface",
      doc: "The panels, labels, bars, buttons, and images a place puts in the page.",
      tags: [
        "ui-panel",
        "ui-label",
        "ui-bar",
        "ui-button",
        "ui-image",
        "ui-remove",
      ],
    },
    {
      name: "World dressing",
      doc: "The lights, labels, particles, storms, marks, sheets, and beams placed in the world itself.",
      tags: [
        "light",
        "light-remove",
        "billboard",
        "billboard-remove",
        "particle",
        "particle-remove",
        "storm",
        "storm-remove",
        "decal",
        "decal-remove",
        "rift",
        "rift-remove",
        "beam",
        "beam-remove",
      ],
    },
    {
      name: "Input",
      doc: "The keys a place listens on, over and above what the key already does.",
      tags: ["bind"],
    },
    {
      name: "Places and data",
      doc: "What a place remembers, who has earned what, and where a player can be sent.",
      tags: [
        "data-set",
        "data-delete",
        "data-get",
        "badge-award",
        "teleport",
        "catalog",
      ],
    },
  ];

/**
 * The one-line account of every effect and of every fact, for the tags whose own
 * source never wrote one. The trusted side declares what a tag's payload is and
 * bounds it, but a payload is not a sentence: a tag's meaning is settled in
 * `CONTEXT.md` and in the type it belongs to, not in the case arm validating it.
 * These are that meaning, one line each, in the same words the world already
 * uses for the thing — so the reference, the domain language, and the code are
 * three accounts of one vocabulary rather than three vocabularies.
 *
 * A tag with a documented payload in its own source keeps that documentation;
 * these fill what is missing, and `--check` fails on a tag listed in neither.
 *
 * The two are separate tables because one name is in both: a `timer` effect sets
 * a deadline, and the `timer` fact reports that it came due. One key holding both
 * would have the second overwrite the first, so the shared name is only ever safe
 * because the two are read from separate maps.
 */
const EFFECT_MEANING: Readonly<Record<string, string>> = {
  npc: "Stands an NPC, a scripted figure wearing one of the place's models.",
  "npc-remove": "Takes an NPC off the world.",
  "npc-die": "Ends an NPC's life: it falls over and is gone.",
  prop: "Stands a prop, a scripted figure that is scenery, a seat, or a solid platform.",
  "prop-remove": "Takes a prop off the world.",
  "entity-set": "Sets entity tags and attributes on a scripted figure.",
  "figure-animate": "Plays a figure animation, a model's own saved motion.",
  "figure-stop": "Stops a figure animation where it stands.",
  "entity-look":
    "Tints a scripted figure and holds back the share of its opacity that is kept.",
  "entity-look-clear": "Takes an entity look off a scripted figure.",
  prompt:
    "Stands a labelled interaction on a figure, answered when a player uses it.",
  "prompt-remove": "Takes a player prompt off a figure.",
  zone: "Stands a box around a figure, reported when a player enters or leaves it.",
  "zone-remove": "Takes a zone off the world.",
  "block-set": "Sets one voxel, as a scripted block edit.",
  "block-fill": "Fills a box with one voxel id, as a scripted block edit.",
  "block-clear": "Clears a box back to air, as a scripted block edit.",
  structure:
    "Stands a set of plan shapes, the same vocabulary `onPlan` builds the place's terrain from.",
  "structure-remove": "Takes a structure off the world.",
  fire: "Lights scenery that kindles the terrain voxel it stands on.",
  time: "Moves the place clock, or the rate it runs at, for every peer at once.",
  void: "Sets the kill plane: a player whose feet fall below it dies and returns to their checkpoint.",
  "player-place": "Puts a player somewhere in the place.",
  "player-face": "Turns a player to look at a point.",
  "player-speed": "Scales how fast a player walks and runs.",
  "player-jump": "Scales how high a player jumps.",
  "player-damage": "Damages a player, as hearts.",
  "player-heal": "Heals a player.",
  "player-max-health": "Sets the hearts a player has to spend.",
  "player-push": "Pushes a player with a velocity of its own.",
  "player-kill": "Kills a player.",
  "player-respawn": "Stands a dead player back up at the place's own start.",
  "player-checkpoint":
    "Remembers where one player is put back on their feet after dying.",
  "player-control":
    "Takes a player's movement and tools away, or gives them back.",
  "player-model": "Gives a player a model to wear in place of the plain cube.",
  "team-define": "Defines a team a player may be put on.",
  "player-team": "Puts a player on a team.",
  "player-value":
    "Keeps a flat number per player under a key, to be ranked across them.",
  "report-hit":
    "Reports a player's strike on a figure, for the script to score.",
  dialog:
    "Opens a dialog with an NPC: a prompt and the options a player picks from.",
  "dialog-close": "Closes the dialog an NPC is holding open.",
  ending: "Ends the place for a player, with a title and the text it ends on.",
  restart: "Restarts the place for a player.",
  "item-define": "Declares an item a place hands out and listens for.",
  "item-give": "Gives an item to a player's inventory.",
  "item-take": "Takes an item out of a player's inventory.",
  "item-hold": "Selects an item a player is holding.",
  field: "Fills a box with one movement behaviour: a push, or quicksand.",
  "field-remove": "Takes a field off the world.",
  barrier:
    "Stands a box only a player's body collides with. Nothing script-steered hits it.",
  "barrier-remove": "Takes a barrier off the world.",
  timer:
    "Sets a deadline that reaches the script as a `timer` fact when it comes due.",
  cutscene:
    "Plays a list of camera shots for one player, and takes their movement and tools away while it runs.",
  camera:
    "Plays one camera shot: where the view goes, what it looks at, and how long it lasts.",
  "camera-follow":
    "Holds a chase view on a scripted figure, sampling its live pose each frame.",
  "camera-follow-clear": "Gives the player their own view back.",
  explosion: "Bursts an explosion in the world.",
  hud: "Shows one player a HUD readout: a bar with a value and a maximum, or a line of text.",
  "hud-remove": "Takes a HUD readout away.",
  toast: "Shows one player a short message that fades.",
  narrate: "Says a line of speech in one player's name.",
  sound: "Plays one of the world's own sounds for one player.",
  "sound-stop": "Stops a looping sound by its id.",
  "ui-panel": "Shows one player a panel of items, docked to a screen corner.",
  "ui-label": "Puts a line of text into a panel.",
  "ui-bar": "Puts a labelled bar into a panel.",
  "ui-button":
    "Puts a button into a panel; its press arrives as a `ui-clicked` fact.",
  "ui-image": "Puts an item-sprite image into a panel.",
  "ui-remove":
    "Takes an item off a panel, or the whole panel when `item` is omitted.",
  light:
    "Lights a point in the world, or hangs a light over a scripted figure.",
  "light-remove": "Puts a scripted light out.",
  billboard:
    "Shows a world-space label standing in the place or hanging over a figure.",
  "billboard-remove": "Takes a billboard down.",
  particle: "Runs a particle emitter, one of the world's fixed particle kinds.",
  "particle-remove": "Stops a particle emitter.",
  storm: "Stands a dust storm, a wall or a funnel, in the world.",
  "storm-remove": "Takes a dust storm away.",
  decal:
    "Lays a flat mark on the ground, one of the world's fixed decal shapes.",
  "decal-remove": "Lifts a decal.",
  rift: "Stands a flat, churning sheet in the world, the surface a portal shows.",
  "rift-remove": "Takes a rift down.",
  beam: "Draws a straight glowing line between two points, each either a place in the world or a figure.",
  "beam-remove": "Takes a beam down.",
  bind: "Listens on a key code, reporting every press and release on it as an `input` fact.",
  "data-set": "Writes a place data value, for one player or for everyone.",
  "data-delete": "Deletes a place data value.",
  "data-get":
    "Asks for a synced place data value, answered by a `data-loaded` fact.",
  "badge-award":
    "Awards a player a badge, remembered as that player's place data.",
  teleport:
    "Sends one player to another place, named as a published place or a built-in demo.",
  catalog:
    "Opens the place catalog for one player: every published place, or the account the effect names.",
};

/** The same account of every fact, which shares one name with the effects. */
const EVENT_MEANING: Readonly<Record<string, string>> = {
  "block-broken": "A player, or the world, broke a voxel.",
  "block-placed": "A player, or the world, placed a voxel.",
  "entity-killed": "A scripted figure was killed, and by whatever did it.",
  "player-joined": "A player entered the place.",
  "player-left": "A player left the place.",
  "entity-used": "A player used a figure, with an item in hand.",
  input: "A bound key went down or came up.",
  "prompt-triggered": "A player answered a player prompt.",
  "entity-hit": "A figure was hit, and by how much and from where.",
  "item-used": "A player used an item.",
  "zone-entered": "A player entered a zone.",
  "zone-left": "A player left a zone.",
  "npc-talk": "A player opened a dialog with an NPC.",
  "npc-choose": "A player chose one of a dialog's options.",
  "npc-leave": "A player closed a dialog with an NPC.",
  timer: "A deadline a `timer` effect set has come due.",
  "player-touched": "A player's cube first overlapped a hazard.",
  "player-died": "A player died, and of what.",
  "data-changed":
    "A place data value was written or deleted, so every peer folds the same change.",
  "data-loaded":
    "A `data-get` was answered, with the value or with the fact there is none.",
  "badge-earned": "A player earned a badge, folded by every peer.",
  "player-teleported": "A player was sent to another place.",
  "ui-clicked": "A player pressed a button in a panel.",
};

/**
 * The effects whose undoing does not follow from their own name, for the rest
 * of which dropping a `-remove` suffix is the whole rule.
 */
const REMOVED_BY: Record<string, string> = {
  dialog: "dialog-close",
  "camera-follow": "camera-follow-clear",
  "entity-look": "entity-look-clear",
  "figure-animate": "figure-stop",
};

/** One parsed effect's union member: the fields its payload declares. */
interface EffectOf {
  tag: string;
  doc: string;
  fields: PlaceField[];
}

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

// The `voxelscape` module itself, and everything it exports.

/** The ambient `declare module "voxelscape"` the world application's own type is written in. */
const moduleOf = (source: ts.SourceFile): ts.ModuleDeclaration => {
  for (const statement of source.statements) {
    if (
      ts.isModuleDeclaration(statement) &&
      ts.isStringLiteral(statement.name)
    ) {
      if (statement.name.text === "voxelscape") {
        return statement;
      }
    }
  }
  throw new Error(`${source.fileName} declares no module "voxelscape"`);
};

/**
 * Whether a declaration is one a script can name. A shorthand ambient module —
 * `declare module "voxelscape" { … }` with no body — is a declaration the
 * checker treats as exporting every top-level name in it, whether or not the
 * keyword is written, because there is no other way to declare one. The thirty
 * names the module keeps to itself — `EffectTag`, `ParsedEffect`, `PayloadFor`,
 * and the option shapes behind the `create*` functions — come back out of
 * `getExportsOfModule` along with the real surface, and a reference that listed
 * them would send a script author after a name no import gives them. The
 * explicit `export` is the only thing that says which is which.
 */
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
const functionsOf = (
  read: Reading,
  module: ts.ModuleDeclaration,
): PlaceFunction[] => {
  const symbol = read.checker.getSymbolAtLocation(module.name);
  if (symbol === undefined) {
    return [];
  }
  const found: PlaceFunction[] = [];
  for (const exported of read.checker.getExportsOfModule(symbol)) {
    const declaration = exported.getDeclarations()?.[0];
    if (
      declaration === undefined ||
      !ts.isFunctionDeclaration(declaration) ||
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
const valuesOf = (
  read: Reading,
  module: ts.ModuleDeclaration,
): PlaceValue[] => {
  const symbol = read.checker.getSymbolAtLocation(module.name);
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
    found.push({
      name: exported.getName(),
      type: typeText(
        read,
        read.checker.getTypeOfSymbolAtLocation(exported, declaration),
        declaration,
      ),
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
const typesOf = (read: Reading, module: ts.ModuleDeclaration): PlaceType[] => {
  const symbol = read.checker.getSymbolAtLocation(module.name);
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

// The three vocabularies the trusted side owns.

/** Every effect a script may dispatch, with the fields its payload declares. */
const effectsOf = (read: Reading): EffectOf[] => {
  const source = read.sourceOf(EFFECTS);
  const union = aliasOf(source, "ParsedEffect").type;
  if (!ts.isUnionTypeNode(union)) {
    throw new Error("ParsedEffect is not a union");
  }
  const found: EffectOf[] = [];
  for (const member of union.types) {
    if (!ts.isTypeLiteralNode(member)) {
      continue;
    }
    const tag = literalOf(member, "tag");
    const payload = member.members.find(
      (one): one is ts.PropertySignature =>
        ts.isPropertySignature(one) &&
        one.name.getText().replace(/^["']|["']$/g, "") === "payload",
    );
    if (tag === "" || payload?.type === undefined) {
      continue;
    }
    found.push({
      tag,
      doc: nodeDoc(payload) || (EFFECT_MEANING[tag] ?? ""),
      fields: ts.isTypeLiteralNode(payload.type)
        ? fieldsOfLiteral(read, payload.type)
        : [],
    });
  }
  return found;
};

/** The families the effects are read in, in the order the table gives them. */
const groupedEffects = (effects: EffectOf[]): PlaceEffectGroup[] => {
  const byTag = new Map(effects.map((one) => [one.tag, one]));
  const grouped = EFFECT_GROUPS.map((group): PlaceEffectGroup => ({
    name: group.name,
    doc: group.doc,
    effects: group.tags.flatMap((tag): PlaceEffect[] => {
      const effect = byTag.get(tag);
      return effect === undefined
        ? []
        : [
            {
              tag: effect.tag,
              doc: effect.doc,
              fields: effect.fields,
              removedBy:
                REMOVED_BY[effect.tag] ??
                (effect.tag.endsWith("-remove")
                  ? effect.tag.slice(0, -"-remove".length)
                  : ""),
            },
          ];
    }),
  }));
  const groupedTags = new Set(
    grouped.flatMap((group) => group.effects.map((one) => one.tag)),
  );
  const missing = effects
    .map((one) => one.tag)
    .filter((tag) => !groupedTags.has(tag));
  if (missing.length > 0) {
    throw new Error(
      `the effect table leaves ${missing.join(", ")} out; add it to EFFECT_GROUPS`,
    );
  }
  return grouped;
};

/** Every fact a script's `onTick` handler is handed, and the fields they share. */
const eventsOf = (
  read: Reading,
): { events: PlaceEvent[]; common: PlaceField[] } => {
  const source = read.sourceOf(EVENTS);
  const union = aliasOf(source, "ScriptEventPayload").type;
  if (!ts.isUnionTypeNode(union)) {
    throw new Error("ScriptEventPayload is not a union");
  }
  const events: PlaceEvent[] = [];
  for (const member of union.types) {
    if (!ts.isTypeLiteralNode(member)) {
      continue;
    }
    const kind = literalOf(member, "kind");
    if (kind === "") {
      continue;
    }
    const fields = fieldsOfLiteral(read, member).filter(
      (field) => field.name !== "kind",
    );
    // The kind's own account is written above the property that names the kind,
    // so a fact's one-line description is that property's comment.
    const named = member.members.find(
      (one) =>
        ts.isPropertySignature(one) &&
        one.name.getText().replace(/^["']|["']$/g, "") === "kind",
    );
    events.push({
      kind,
      doc:
        (named === undefined ? "" : nodeDoc(named)) ||
        (EVENT_MEANING[kind] ?? ""),
      fields,
    });
  }
  const whole = aliasOf(source, "ScriptEvent").type;
  const common = ts.isIntersectionTypeNode(whole)
    ? fieldsOfLiteral(read, whole.types[1] as ts.TypeLiteralNode)
    : [];
  return { events, common };
};

/** Every bound the trusted side enforces, from the two modules that declare them. */
const limitsOf = (read: Reading): PlaceLimit[] => {
  const found: PlaceLimit[] = [];
  const seen = new Set<string>();
  for (const path of [EFFECTS, EVENTS]) {
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
      // A numeric bound reads best as the number it is, and a union of two
      // reads best as the range it spans, which is how a minimum and its
      // maximum are declared together.
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

/** Every shape a place's plan may paint, and the fields that place each one. */
const shapesOf = (read: Reading): PlaceShape[] => {
  const source = read.sourceOf(PLAN_SHAPES);
  const declarations = typeDeclarations(source);
  const union = aliasOf(source, "PlanShape").type;
  if (!ts.isUnionTypeNode(union)) {
    throw new Error("PlanShape is not a union");
  }
  const found: PlaceShape[] = [];
  for (const member of union.types) {
    const name = referencedName(member);
    const declaration = declarations.get(name);
    if (name === "" || declaration === undefined) {
      continue;
    }
    const fields = ts.isInterfaceDeclaration(declaration)
      ? membersOf(read, declaration)
      : [];
    found.push({
      kind:
        fields.find((field) => field.name === "kind")?.type.replace(/"/g, "") ??
        name,
      doc: docOf(read, declaration),
      fields: fields.filter((field) => field.name !== "kind"),
    });
  }
  return found;
};

/** Every type a plan is written in, for a script to build one and read one back. */
const planTypesOf = (read: Reading): PlacePlanType[] => {
  const from = (path: string, names: string[]): PlacePlanType[] => {
    const source = read.sourceOf(path);
    const declarations = typeDeclarations(source);
    return names.flatMap((name): PlacePlanType[] => {
      const declaration = declarations.get(name);
      if (declaration === undefined) {
        return [];
      }
      const fields = ts.isInterfaceDeclaration(declaration)
        ? membersOf(read, declaration)
        : typeFieldsOfAlias(read, declaration, declarations);
      return [
        {
          name,
          doc: docOf(read, declaration),
          fields,
          type: fields.length === 0 ? spelledOut(read, declaration) : "",
        },
      ];
    });
  };
  return [
    ...from(PLAN_SHAPES, ["Voxel3", "StructurePlan"]),
    ...from(PLACE_PLAN, ["PlanContext", "LevelPlan", "PlanNpc", "PlanProp"]),
  ];
};

// The drawing itself.

/** Everything a place script can reach, read out of the world's own sources. */
export const referenceOf = (read: Reading): PlaceReference => {
  const module = moduleOf(read.sourceOf(VOXELSCAPE_DTS));
  const { events, common } = eventsOf(read);
  return {
    sources: [
      VOXELSCAPE_DTS,
      EFFECTS,
      EVENTS,
      SANDBOX,
      PLAN_SHAPES,
      PLACE_PLAN,
    ],
    functions: functionsOf(read, module),
    values: valuesOf(read, module),
    types: typesOf(read, module),
    effects: groupedEffects(effectsOf(read)),
    events,
    eventCommon: common,
    limits: limitsOf(read),
    shapes: shapesOf(read),
    plan: planTypesOf(read),
  };
};

/** The groups in `EFFECT_GROUPS` that no effect ended up under. */
const unusedGroups = (reference: PlaceReference): string[] =>
  EFFECT_GROUPS.filter((group) =>
    reference.effects.every(
      (drawn) => drawn.name !== group.name || drawn.effects.length === 0,
    ),
  ).map((group) => group.name);

/** The entries no sentence reaches, which the reference would otherwise show blank. */
const undocumented = (reference: PlaceReference): string[] => {
  const gaps: string[] = [];
  for (const one of reference.functions) {
    if (one.doc === "") gaps.push(`function ${one.name}`);
  }
  for (const one of reference.values) {
    if (one.doc === "") gaps.push(`value ${one.name}`);
  }
  for (const group of reference.effects) {
    for (const one of group.effects) {
      if (one.doc === "") gaps.push(`effect ${one.tag}`);
    }
  }
  for (const one of reference.events) {
    if (one.doc === "") gaps.push(`event ${one.kind}`);
  }
  for (const one of reference.limits) {
    if (one.doc === "") gaps.push(`limit ${one.name}`);
  }
  for (const one of reference.shapes) {
    if (one.doc === "") gaps.push(`shape ${one.kind}`);
  }
  for (const one of reference.types) {
    if (one.doc === "") gaps.push(`type ${one.name}`);
  }
  for (const one of reference.plan) {
    if (one.doc === "") gaps.push(`plan type ${one.name}`);
  }
  return gaps;
};

/**
 * The drawing as Prettier would write it, which is how it is held on disk. The
 * repository formats everything it holds, so a drawing written any other way is
 * reformatted the next time the formatter runs and stops matching what this
 * reads — leaving `--check` failing until somebody redraws it, which puts it
 * straight back.
 */
const formatted = async (drawing: string): Promise<string> =>
  format(drawing, { ...(await resolveConfig(DRAWING)), filepath: DRAWING });

export const main = async (): Promise<void> => {
  const checking = process.argv.includes("--check");
  const reference = referenceOf(reading());
  const drawing = await formatted(`${JSON.stringify(reference, null, 2)}\n`);
  if (!checking) {
    writeFileSync(DRAWING, drawing);
    const effects = reference.effects.flatMap((group) => group.effects);
    console.log(
      `read ${reference.functions.length} functions, ${reference.types.length} types, ` +
        `${effects.length} effects, ${reference.events.length} events, ` +
        `${reference.shapes.length} shapes, and ${reference.limits.length} limits ` +
        `into ${relative(APP_DIR, DRAWING)}`,
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
  for (const group of unusedGroups(reference)) {
    problems.push(
      `the ${group} group in EFFECT_GROUPS holds no effect; take it out or point it at tags that exist`,
    );
  }
  for (const gap of undocumented(reference)) {
    problems.push(
      `no sentence reaches ${gap}; write one above the declaration it belongs to, or — for an effect or a fact — one in the MEANING table beside the others`,
    );
  }
  if (problems.length > 0) {
    console.error(problems.map((line) => `  ${line}`).join("\n"));
    process.exit(1);
  }
  if (checking) {
    console.log(
      `the drawing matches the sources: ${reference.functions.length} functions, ` +
        `${reference.effects.flatMap((one) => one.effects).length} effects, ` +
        `${reference.events.length} events`,
    );
  }
};

// Imported by its own tests, which want the reading without the writing, so the
// work only runs when this file is what was started.
if (
  process.argv[1] !== undefined &&
  process.argv[1].endsWith("place-reference.ts")
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
