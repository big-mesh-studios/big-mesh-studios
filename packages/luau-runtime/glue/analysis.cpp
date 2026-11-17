/**
 * analysis.cpp — the entire C surface of the Luau analysis artifact.
 *
 * ## What this is, and what it is not
 *
 * `Luau::autocomplete`, from Luau's Analysis library, over the same pinned source as
 * `glue.cpp`'s VM. This artifact is a **tool**: it parses and type-checks editor text so
 * the editor can answer "what may follow this dot?" and nothing else. It does not run a
 * place, it does not link into `luau.wasm`, and `glue.cpp` is unchanged — decision 8 of
 * ADR 0060 is kept by the build, not by discipline.
 *
 * ## One session per worker
 *
 * The playground has one global `Frontend` and one `"main"` module because it is one
 * document. An editor has tabs, and a place has files that `require` one another, so a
 * session owns its resolvers, its frontend and its error slot. The worker that calls
 * these exports is itself the isolation boundary; the id map exists so a future second
 * pane or a diagnostics-only session can be added without changing the wire.
 *
 * ## The two resolvers are deliberately dumb
 *
 * Module rules belong to the bundler (`apps/spacescape/src/places/luau-bundle.ts`).
 * This side is an exact specifier lookup filled by the client, so there is no second
 * implementation of "strip `./`, strip `.luau`, reject `..`" to drift from the one that
 * decides what actually runs.
 *
 * ## Boundary discipline
 *
 * Every export catches C++ exceptions. `Frontend::check` throws on parser and checker
 * failures in some paths, and a throw reaching wasm would be a trap rather than a
 * completion list. A completion that fails is `{"error":"…"}` and the editor falls back
 * to its textual source; a source update that fails is a non-zero status and the last
 * error is readable through `analysis_last_error`.
 */

#include <Luau/Autocomplete.h>
#include <Luau/BuiltinDefinitions.h>
#include <Luau/Config.h>
#include <Luau/Frontend.h>
#include <Luau/ToString.h>
#include <Luau/Type.h>

#include <emscripten.h>

#include <algorithm>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace
{

// ---------------------------------------------------------------------------
// JSON. One escaper, used by every field: a type string can contain quotes, and a
// hand-built object that forgets one is a JSON parse failure in the editor rather than
// a type error anywhere.
// ---------------------------------------------------------------------------

std::string escapeJson(const std::string& text)
{
    std::string out;
    out.reserve(text.size() + 8);

    static const char* hex = "0123456789abcdef";
    for (unsigned char c : text)
    {
        switch (c)
        {
        case '"':
            out += "\\\"";
            break;
        case '\\':
            out += "\\\\";
            break;
        case '\b':
            out += "\\b";
            break;
        case '\f':
            out += "\\f";
            break;
        case '\n':
            out += "\\n";
            break;
        case '\r':
            out += "\\r";
            break;
        case '\t':
            out += "\\t";
            break;
        default:
            if (c < 0x20)
            {
                out += "\\u00";
                out += hex[c >> 4];
                out += hex[c & 0xf];
            }
            else
            {
                // UTF-8 bytes are passed through; the client decodes them as UTF-8.
                out += static_cast<char>(c);
            }
        }
    }
    return out;
}

std::string jsonString(const std::string& text)
{
    return "\"" + escapeJson(text) + "\"";
}

std::string jsonBool(bool value)
{
    return value ? "true" : "false";
}

char* copyString(const std::string& text)
{
    char* out = static_cast<char*>(malloc(text.size() + 1));
    if (out)
        memcpy(out, text.data(), text.size() + 1);
    return out;
}

// ---------------------------------------------------------------------------
// The resolvers. `Frontend` holds raw pointers to both, so a session declares them
// before the frontend and never moves them.
// ---------------------------------------------------------------------------

struct AnalysisFileResolver final : Luau::FileResolver
{
    std::unordered_map<std::string, std::string> sources;
    std::unordered_map<std::string, std::string> specifiers;

    std::optional<Luau::SourceCode> readSource(const Luau::ModuleName& name) override
    {
        auto it = sources.find(name);
        if (it == sources.end())
            return std::nullopt;
        return Luau::SourceCode{it->second, Luau::SourceCode::Module};
    }

    std::optional<Luau::ModuleInfo> resolveModule(const Luau::ModuleInfo*, Luau::AstExpr* node, const Luau::TypeCheckLimits&) override
    {
        auto* literal = node->as<Luau::AstExprConstantString>();
        if (!literal)
            return std::nullopt;

        std::string specifier(literal->value.data, literal->value.size);
        auto it = specifiers.find(specifier);
        if (it == specifiers.end())
            return std::nullopt;

        return Luau::ModuleInfo{it->second, false};
    }
};

struct AnalysisConfigResolver final : Luau::ConfigResolver
{
    Luau::Config config;

    const Luau::Config& getConfig(const Luau::ModuleName&, const Luau::TypeCheckLimits&) const override
    {
        return config;
    }
};

struct AnalysisSession
{
    AnalysisFileResolver resolver;
    AnalysisConfigResolver config;
    std::unique_ptr<Luau::Frontend> frontend;
    Luau::FrontendOptions options;
    std::string lastError;

    AnalysisSession()
    {
        options.retainFullTypeGraphs = true; // the type graph is the product
        options.forAutocomplete = true;      // precision where the source has it
        options.runLintChecks = false;       // lint is not this artifact's job
        options.moduleTimeLimitSec = 2.0;    // a pathological source must not own the worker

        config.config.mode = Luau::Mode::Nonstrict;

        frontend = std::make_unique<Luau::Frontend>(Luau::SolverMode::New, &resolver, &config, options);

        // The standard library types are what make `math.`, `table.` and `string.` real
        // completions rather than names only the textual fallback knows. Register them in
        // both environments, as the playground does: the ordinary globals for a check,
        // and the autocomplete globals the frontend consults for completions.
        Luau::registerBuiltinGlobals(*frontend, frontend->globals, false);
        Luau::freeze(frontend->globals.globalTypes);
        Luau::registerBuiltinGlobals(*frontend, frontend->globalsForAutocomplete, true);
        Luau::freeze(frontend->globalsForAutocomplete.globalTypes);
    }

    void markAllDirty()
    {
        for (const auto& [name, _] : resolver.sources)
            frontend->markDirty(name);
    }
};

std::unordered_map<int, std::unique_ptr<AnalysisSession>> g_sessions;
int g_nextSessionId = 1;

AnalysisSession* findSession(int id)
{
    auto it = g_sessions.find(id);
    return it == g_sessions.end() ? nullptr : it->second.get();
}

// ---------------------------------------------------------------------------
// Position bounds. CodeMirror can ask at the position after the final character,
// including on the empty line after a trailing newline. Anything past that is an
// empty answer rather than an assertion inside Luau.
// ---------------------------------------------------------------------------

bool positionInRange(const std::string& source, unsigned line, unsigned column)
{
    unsigned currentLine = 0;
    size_t lineStart = 0;

    for (;;)
    {
        size_t newline = source.find('\n', lineStart);
        bool last = newline == std::string::npos;
        size_t lineEnd = last ? source.size() : newline;

        if (currentLine == line)
        {
            // CRLF is one break to the editor; the CR is not a column the caret can sit
            // after on its own line.
            if (lineEnd > lineStart && source[lineEnd - 1] == '\r')
                --lineEnd;
            return column <= lineEnd - lineStart;
        }

        if (last)
            return false;

        lineStart = newline + 1;
        ++currentLine;
    }
}

const char* kindName(const Luau::AutocompleteEntry& entry)
{
    if (entry.type && Luau::get<Luau::FunctionType>(Luau::follow(*entry.type)))
        return "function";

    switch (entry.kind)
    {
    case Luau::AutocompleteEntryKind::Property:
        return "property";
    case Luau::AutocompleteEntryKind::Binding:
        return "variable";
    case Luau::AutocompleteEntryKind::Keyword:
        return "keyword";
    case Luau::AutocompleteEntryKind::String:
        return "constant";
    case Luau::AutocompleteEntryKind::Type:
        return "type";
    case Luau::AutocompleteEntryKind::Module:
    case Luau::AutocompleteEntryKind::RequirePath:
        return "module";
    case Luau::AutocompleteEntryKind::GeneratedFunction:
        return "function";
    case Luau::AutocompleteEntryKind::HotComment:
        return "text";
    }
    return "variable";
}

const char* parenthesesName(Luau::ParenthesesRecommendation recommendation)
{
    switch (recommendation)
    {
    case Luau::ParenthesesRecommendation::None:
        return "none";
    case Luau::ParenthesesRecommendation::CursorAfter:
        return "cursorAfter";
    case Luau::ParenthesesRecommendation::CursorInside:
        return "cursorInside";
    }
    return "none";
}

const char* typeCorrectName(Luau::TypeCorrectKind kind)
{
    switch (kind)
    {
    case Luau::TypeCorrectKind::None:
        return "none";
    case Luau::TypeCorrectKind::Correct:
        return "correct";
    case Luau::TypeCorrectKind::CorrectFunctionResult:
        return "correctFunctionResult";
    }
    return "none";
}

std::string itemsJson(const Luau::AutocompleteResult& result)
{
    // `AutocompleteEntryMap` is an unordered_map; sorting makes the wire deterministic
    // and tests independent of bucket order.
    std::vector<std::pair<std::string, const Luau::AutocompleteEntry*>> entries;
    entries.reserve(result.entryMap.size());
    for (const auto& [label, entry] : result.entryMap)
        entries.emplace_back(label, &entry);
    std::sort(entries.begin(), entries.end(), [](const auto& a, const auto& b)
    {
        return a.first < b.first;
    });

    std::string out = "{\"items\":[";
    bool first = true;
    for (const auto& [label, entry] : entries)
    {
        if (!first)
            out += ",";
        first = false;

        out += "{\"label\":";
        out += jsonString(label);
        out += ",\"kind\":";
        out += jsonString(kindName(*entry));

        if (entry->type)
        {
            out += ",\"detail\":";
            out += jsonString(Luau::toString(*entry->type));
        }

        if (entry->insertText)
        {
            out += ",\"insertText\":";
            out += jsonString(*entry->insertText);
        }

        out += ",\"deprecated\":";
        out += jsonBool(entry->deprecated);
        out += ",\"parentheses\":";
        out += jsonString(parenthesesName(entry->parens));
        out += ",\"typeCorrect\":";
        out += jsonString(typeCorrectName(entry->typeCorrect));
        out += ",\"replaceDotWithColon\":";
        out += jsonBool(entry->replaceDotWithColon);
        out += "}";
    }
    out += "]}";
    return out;
}

char* errorJson(const std::string& message)
{
    return copyString("{\"error\":" + jsonString(message) + "}");
}

void recordError(AnalysisSession* session, const std::string& message)
{
    if (session)
        session->lastError = message;
}

} // namespace

extern "C"
{

EMSCRIPTEN_KEEPALIVE
int analysis_create()
{
    try
    {
        auto session = std::make_unique<AnalysisSession>();
        int id = g_nextSessionId++;
        g_sessions[id] = std::move(session);
        return id;
    }
    catch (...)
    {
        return 0;
    }
}

EMSCRIPTEN_KEEPALIVE
void analysis_destroy(int id)
{
    g_sessions.erase(id);
}

EMSCRIPTEN_KEEPALIVE
int analysis_set_source(int id, const char* name, const char* source, int length)
{
    try
    {
        AnalysisSession* session = findSession(id);
        if (!session || !name || !source || length < 0)
            return 1;

        std::string moduleName(name);
        session->resolver.sources[moduleName] = std::string(source, static_cast<size_t>(length));
        session->frontend->markDirty(moduleName);
        return 0;
    }
    catch (const std::exception& e)
    {
        recordError(findSession(id), e.what());
        return 1;
    }
    catch (...)
    {
        recordError(findSession(id), "unknown C++ exception in analysis_set_source");
        return 1;
    }
}

EMSCRIPTEN_KEEPALIVE
int analysis_remove_source(int id, const char* name)
{
    try
    {
        AnalysisSession* session = findSession(id);
        if (!session || !name)
            return 1;

        std::string moduleName(name);
        // Mark the module and its dependents dirty *before* dropping the source: a
        // dependent that is rechecked afterwards must see a missing module, not a stale
        // copy of the one that was just deleted.
        session->frontend->markDirty(moduleName);
        session->resolver.sources.erase(moduleName);
        return 0;
    }
    catch (const std::exception& e)
    {
        recordError(findSession(id), e.what());
        return 1;
    }
    catch (...)
    {
        recordError(findSession(id), "unknown C++ exception in analysis_remove_source");
        return 1;
    }
}

EMSCRIPTEN_KEEPALIVE
int analysis_set_specifier(int id, const char* specifier, const char* module)
{
    try
    {
        AnalysisSession* session = findSession(id);
        if (!session || !specifier || !module)
            return 1;

        session->resolver.specifiers[std::string(specifier)] = std::string(module);
        session->markAllDirty();
        return 0;
    }
    catch (const std::exception& e)
    {
        recordError(findSession(id), e.what());
        return 1;
    }
    catch (...)
    {
        recordError(findSession(id), "unknown C++ exception in analysis_set_specifier");
        return 1;
    }
}

EMSCRIPTEN_KEEPALIVE
void analysis_clear_specifiers(int id)
{
    try
    {
        AnalysisSession* session = findSession(id);
        if (!session)
            return;
        session->resolver.specifiers.clear();
        session->markAllDirty();
    }
    catch (...)
    {
        recordError(findSession(id), "unknown C++ exception in analysis_clear_specifiers");
    }
}

EMSCRIPTEN_KEEPALIVE
void analysis_reset(int id)
{
    try
    {
        AnalysisSession* session = findSession(id);
        if (!session)
            return;
        session->frontend->clear();
        session->resolver.sources.clear();
        session->resolver.specifiers.clear();
        session->lastError.clear();
    }
    catch (...)
    {
        recordError(findSession(id), "unknown C++ exception in analysis_reset");
    }
}

EMSCRIPTEN_KEEPALIVE
char* analysis_complete(int id, const char* module, int line, int column)
{
    AnalysisSession* session = findSession(id);
    std::string error;

    try
    {
        if (!session || !module)
            return copyString("{\"items\":[]}");

        std::string moduleName(module);
        auto sourceIt = session->resolver.sources.find(moduleName);
        if (sourceIt == session->resolver.sources.end())
            return copyString("{\"items\":[]}");

        if (line < 0 || column < 0 ||
            !positionInRange(sourceIt->second, static_cast<unsigned>(line), static_cast<unsigned>(column)))
            return copyString("{\"items\":[]}");

        // **The step the prior art exists to make unmissable:** autocomplete reads a
        // *checked* module out of the frontend. Calling only `Luau::autocomplete` returns
        // an empty map forever.
        session->frontend->check(moduleName, session->options);

        Luau::AutocompleteResult result = Luau::autocomplete(
            *session->frontend, moduleName,
            Luau::Position{static_cast<unsigned>(line), static_cast<unsigned>(column)}, nullptr);

        return copyString(itemsJson(result));
    }
    catch (const std::exception& e)
    {
        error = e.what();
    }
    catch (...)
    {
        error = "unknown C++ exception in analysis_complete";
    }

    recordError(session, error);
    return errorJson(error);
}

EMSCRIPTEN_KEEPALIVE
char* analysis_last_error(int id)
{
    static const std::string empty;
    AnalysisSession* session = findSession(id);
    std::string text = session ? session->lastError : empty;
    if (session)
        session->lastError.clear();
    return copyString(text);
}

EMSCRIPTEN_KEEPALIVE
char* analysis_version()
{
    static const std::string version = LUAU_PINNED_TAG " " LUAU_PINNED_COMMIT;
    return copyString(version);
}

} // extern "C"

// Emscripten links an executable; this module is instantiated, never run.
int main()
{
    return 0;
}
