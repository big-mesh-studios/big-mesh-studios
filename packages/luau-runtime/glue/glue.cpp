/**
 * glue.cpp — the entire C surface of the Luau runtime package.
 *
 * ## What this is
 *
 * Official Luau compiled to WebAssembly, behind exactly the exports Phase 0 promises to
 * freeze: `state_new(cap, seed) / state_close / compile / load / call / set_deadline`,
 * plus the C→JS trampoline for the five bridge members (`dispatch`, `query`, `onTick`,
 * `now`, `random` — see `bridge-library.js`, the JS half of that trampoline), plus the
 * coroutine entry points the plan needs to *measure* rather than assume: `eval` in its
 * modes, `resume`, `thread_status`. Nothing else leaves the wasm module.
 *
 * ## The three caps, and where each lives
 *
 * - **Deadline**: `set_deadline` records an absolute instant on `emscripten_get_now()`;
 *   the VM's interrupt callback compares against it at loop safepoints and raises a
 *   runtime error that unwinds to the enclosing protected call. Only `gc == -1` callbacks
 *   (VM and string-library safepoints) may trip it — an assist *during* a collection step
 *   defers to the next VM safepoint, because aborting out of the collector mid-cycle is
 *   how the QuickJS peer died once already. The probe measures whether that keeps the
 *   budget honest for coroutines; every thread passes through the same callback, so it
 *   should.
 * - **Memory**: `state_new` takes a byte cap and the VM allocates through `capped_alloc`,
 *   which tracks live bytes per state and answers `NULL` past the cap. Luau turns a NULL
 *   allocator result into a catchable `LUA_ERRMEM`. The accounting follows what lmem.cpp
 *   asserts — `(osize == 0) == (block == NULL)` — so on a new block `osize` is zero, not
 *   an object-type id as in stock Lua 5.1.
 * - **Stack**: not capped from here at all, which is the finding the spike exists to
 *   confirm or refute. Luau's VM grows nested *Luau* calls on its own heap (CallInfo
 *   arrays) rather than the C stack, so deep recursion should surface as the VM's own
 *   catchable "stack overflow" at `LUAI_MAXCALLS`, and nested *C* calls are bounded by
 *   `LUAI_MAXCCALLS` with a catchable "C stack overflow". What must not happen is a wasm
 *   trap. The probe measures honest depth on three hosts.
 *
 * ## Boundary discipline
 *
 * The VM is built with `LUA_USE_LONGJMP=1` — its errors are longjmps to the enclosing
 * protected call, and the binary carries no landing pads for them — but the *compiler*
 * half (Ast/Bytecode/Compiler) throws C++ the ordinary way, and Luau's own CMake says
 * `-fexceptions` for emscripten specifically so those are catchable in C++. So:
 *
 * 1. Everything the guest runs goes through `lua_pcall`/`luau_load`/`lua_resume`, which
 *    are protected internally; nothing escapes them as a foreign exception.
 * 2. Everything the *host* asks outside those (registry reads, `state_close`, the
 *    compiler) is additionally wrapped here, and the catch reports `STATUS_FATAL` with
 *    the C++ `what()` — a host that dies at a boundary is exactly what ADR 0015 was
 *    written against, and a refusal that names itself is the fix.
 * 3. `state_close` failures cannot return a status (the state is the thing that broke),
 *    so they land in `close_error()` for the host to read afterwards — the dispose test
 *    is where a regression here surfaces as a failing assertion instead of a dead
 *    process.
 *
 * ## Statuses — the frozen wire contract, mirrored in src/index.ts
 *
 * ```
 * 0 OK  1 LOAD  2 RUNTIME  3 DEADLINE  4 MEMORY  5 STACK  6 FATAL  7 YIELD
 * ```
 */

#include <lua.h>
#include <lualib.h>

// luacode.h is the C entry to the compiler: `luau_compile` and the lua_CompileOptions
// struct whose pinned values the spike freezes here.
#include <luacode.h>

#include <emscripten.h>

#include <cstdlib>
#include <cstring>
#include <new>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// The JS side of the bridge. Defined in bridge-library.js, imported by the
// module, reachable from the VM only through the five C closures below.
// ---------------------------------------------------------------------------

extern "C"
{
    // Read a (string, string) pair out of the wasm heap, call the host's
    // `dispatch`/`query`, and get back a malloc'd UTF-8 buffer that the C side copies
    // into a Lua string and frees. The number-returning members need no marshalling.
    char* luau_dispatch(int state, const char* tag, unsigned tagLen, const char* json, unsigned jsonLen);
    char* luau_query(int state, const char* name, unsigned nameLen, const char* json, unsigned jsonLen);
    double luau_now(int state);
    double luau_random(int state);
}

enum
{
    STATUS_OK = 0,
    STATUS_LOAD = 1,     // syntax/bytecode-load failure
    STATUS_RUNTIME = 2,  // the script threw
    STATUS_DEADLINE = 3, // the step budget ran out
    STATUS_MEMORY = 4,   // the cap ran out
    STATUS_STACK = 5,    // the VM's own overflow — catchable, and the spike's proof it stays so
    STATUS_FATAL = 6,    // the VM could not continue
    STATUS_YIELD = 7,    // resume() returned because the thread yielded
};

// The VM's memory-exhaustion text; ldebug.h owns the literal, this mirrors it so the
// classification below can name a cap rather than forward an unknown error.
static const char* const kMemoryErrorMessage = "not enough memory";

enum
{
    CALL_DISCARD = 0, // a place: results are not a thing
    CALL_TEXT = 1,    // a probe expression: the first result as text
    CALL_THREAD = 2,  // a thread handed to the host, for resume()
};

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

struct LuauState
{
    int id = 0;
    lua_State* L = nullptr;

    // Cap: step deadline as an absolute emscripten_get_now() instant; 0 = no deadline.
    double deadline = 0.0;
    // Set by the interrupt hook when a run is cut off, so classification can tell "the
    // script was slow" from "the script threw" even when both arrive as one status.
    bool timedOut = false;
    // Only VM execution armed by an entry point may be interrupted: the hook must never
    // fire between entry points, when no protected call exists for the error to land in.
    bool running = false;

    // Cap: per-state memory accounting.
    unsigned long long memoryLimit = 0; // 0 means no cap — the probe's "before" row
    unsigned long long memoryUsed = 0;

    int handlerCount = 0;
    int threadCount = 0;

    std::string lastError;
    std::string lastTop;
    // The type the last CALL_TEXT saw at the top of the stack. Without it, `nil`
    // and `""` are the same bytes across the boundary, and a place author whose
    // dispatch answers "" would read as a script that returned nothing.
    int topType = -1;
};

static std::vector<LuauState*> g_states;
static int g_nextStateId = 1;

// state_close has no status to return — the state is the thing that broke — so its
// failure goes here, for close_error() and the dispose test to read afterwards.
static std::string g_closeError;

static LuauState* find_state(int id)
{
    for (LuauState* s : g_states)
        if (s->id == id)
            return s;
    return nullptr;
}

static LuauState* state_of(lua_State* L)
{
    return static_cast<LuauState*>(lua_callbacks(L)->userdata);
}

// ---------------------------------------------------------------------------
// Registry helpers. The engine table, the handlers and the threads live in the
// registry under string keys of our own — integer slots belong to the VM's ref
// machinery, and borrowing those would be a way to collide with it later.
// ---------------------------------------------------------------------------

static void registry_set(lua_State* L, const char* key)
{
    lua_pushliteral(L, "__glue_");
    lua_pushstring(L, key);
    lua_concat(L, 2); // __glue_<key>
    lua_pushvalue(L, -2);
    lua_settable(L, LUA_REGISTRYINDEX);
    lua_pop(L, 1);
}

static void registry_get(lua_State* L, const char* key)
{
    lua_pushliteral(L, "__glue_");
    lua_pushstring(L, key);
    lua_concat(L, 2);
    lua_gettable(L, LUA_REGISTRYINDEX);
}

// ---------------------------------------------------------------------------
// The memory cap, as an allocator.
// ---------------------------------------------------------------------------

static void* capped_alloc(void* ud, void* ptr, size_t osize, size_t nsize)
{
    LuauState* s = static_cast<LuauState*>(ud);

    if (ptr == nullptr)
    {
        if (nsize == 0)
            return nullptr;
        if (s->memoryLimit != 0 && s->memoryUsed + nsize > s->memoryLimit)
            return nullptr;
        void* block = malloc(nsize);
        if (block)
            s->memoryUsed += nsize;
        return block;
    }

    if (nsize == 0)
    {
        free(ptr);
        s->memoryUsed -= osize;
        return nullptr;
    }

    if (s->memoryLimit != 0 && s->memoryUsed - osize + nsize > s->memoryLimit)
        return nullptr;

    void* block = realloc(ptr, nsize);
    if (block)
        s->memoryUsed = s->memoryUsed - osize + nsize;
    return block;
}

// ---------------------------------------------------------------------------
// The step deadline, as an interrupt hook.
// ---------------------------------------------------------------------------

static void interrupt_hook(lua_State* L, int gc)
{
    LuauState* s = static_cast<LuauState*>(lua_callbacks(L)->userdata);

    // GC assists (gc >= 0) must not abort out of a collection step; the next VM safepoint
    // catches the overrun just as honestly. And an unarmed state has no protected call
    // for the error to land in.
    if (gc != -1 || !s->running || s->deadline == 0.0)
        return;
    if (emscripten_get_now() <= s->deadline)
        return;

    s->timedOut = true;
    lua_pushliteral(L, "step deadline exceeded");
    lua_error(L); // raises and unwinds to the enclosing protected call; never returns
}

static void panic_hook(lua_State* L, int errcode)
{
    // An unprotected error: the VM is about to abort(). Recorded so a peer that somehow
    // survives this can at least say which error escaped protection — reaching here from
    // a place script would be a spike finding, not a feature.
    (void)L;
    LuauState* s = static_cast<LuauState*>(lua_callbacks(L)->userdata);
    if (s)
        s->lastError = "unprotected VM error (abort pending)";
    (void)errcode;
}

// ---------------------------------------------------------------------------
// The engine table: the five bridge members, and nothing else.
// ---------------------------------------------------------------------------

static int bridge_dispatch(lua_State* L)
{
    LuauState* s = state_of(L);
    size_t tagLen = 0, jsonLen = 0;
    const char* tag = lua_tolstring(L, 1, &tagLen);
    const char* json = lua_tolstring(L, 2, &jsonLen);
    if (!tag || !json)
    {
        lua_pushliteral(L, "dispatch takes a tag and a payload");
        return 1;
    }
    char* out = luau_dispatch(s->id, tag, unsigned(tagLen), json, unsigned(jsonLen));
    if (out)
    {
        lua_pushstring(L, out);
        free(out);
    }
    else
    {
        lua_pushliteral(L, "dispatch: host refused to answer");
    }
    return 1;
}

static int bridge_query(lua_State* L)
{
    LuauState* s = state_of(L);
    size_t nameLen = 0, jsonLen = 0;
    const char* name = lua_tolstring(L, 1, &nameLen);
    const char* json = lua_tolstring(L, 2, &jsonLen);
    if (!name || !json)
    {
        lua_pushliteral(L, "query takes a name and arguments");
        return 1;
    }

    // The closed set is checked here exactly as interpreter.ts checks it, so a name this
    // build does not have cannot reach the host by guessing. Phase 1's parity test pins
    // this list against GUEST_QUERIES.
    static const char* const kQueries[] = {
        "getSolidAt", "getHeightAt", "getWaterAt", "getMediumAt", "raycast", "getData",
    };
    bool known = false;
    for (const char* query : kQueries)
        known = known || strcmp(name, query) == 0;
    if (!known)
    {
        std::string refusal = "{\"error\":\"no query called ";
        refusal += name;
        refusal += "\"}";
        lua_pushlstring(L, refusal.c_str(), refusal.size());
        return 1;
    }

    char* out = luau_query(s->id, name, unsigned(nameLen), json, unsigned(jsonLen));
    if (out)
    {
        lua_pushstring(L, out);
        free(out);
    }
    else
    {
        lua_pushliteral(L, "{\"error\":\"query: host refused to answer\"}");
    }
    return 1;
}

static int bridge_on_tick(lua_State* L)
{
    LuauState* s = state_of(L);
    if (!lua_isfunction(L, 1))
        return 0;
    registry_get(L, "handlers");
    lua_pushvalue(L, 1);
    lua_rawseti(L, -2, ++s->handlerCount);
    lua_pop(L, 1);
    return 0;
}

static int bridge_now(lua_State* L)
{
    lua_pushnumber(L, luau_now(state_of(L)->id));
    return 1;
}

static int bridge_random(lua_State* L)
{
    // The host's seeded generator, bridged in JS. The VM's own math.random is *also*
    // seeded — from the place seed at state_new; decision 5 says both are deterministic,
    // and the probe's numbers row agrees them.
    lua_pushnumber(L, luau_random(state_of(L)->id));
    return 1;
}

static void install_engine(lua_State* L)
{
    lua_newtable(L);
    lua_pushcfunction(L, bridge_dispatch, "dispatch");
    lua_setfield(L, -2, "dispatch");
    lua_pushcfunction(L, bridge_query, "query");
    lua_setfield(L, -2, "query");
    lua_pushcfunction(L, bridge_on_tick, "onTick");
    lua_setfield(L, -2, "onTick");
    lua_pushcfunction(L, bridge_now, "now");
    lua_setfield(L, -2, "now");
    lua_pushcfunction(L, bridge_random, "random");
    lua_setfield(L, -2, "random");
    // Read-only: a script that does `engine.dispatch = nil` is a bug in that script, and
    // the failure should be at the assignment, not on the next frame with no cause.
    lua_setreadonly(L, -1, 1);
    registry_set(L, "engine");

    lua_newtable(L);
    registry_set(L, "handlers");
    lua_newtable(L);
    registry_set(L, "threads");
}

static void open_libs_minimally(lua_State* L)
{
    // base, coroutine, string, table, math — the smallest set the guest library needs.
    // There is no `os`, no `io`, no `debug`, no `require`: not denied, absent.
    //
    // base installs into the globals directly and is not re-set as a named global.
    lua_pushcfunction(L, luaopen_base, "base");
    lua_call(L, 0, 0);

    struct Named
    {
        const char* name;
        lua_CFunction fn;
    };
    static const Named kNamed[] = {
        {"coroutine", luaopen_coroutine},
        {"string", luaopen_string},
        {"table", luaopen_table},
        {"math", luaopen_math},
        // utf8 is open because the guest library's JSON decoder reaches utf8.char for
        // \uXXXX escapes — the one library the *bridge contract* needs, not the script.
        {"utf8", luaopen_utf8},
    };
    for (const Named& lib : kNamed)
    {
        lua_pushcfunction(L, lib.fn, lib.name);
        if (lua_pcall(L, 0, 1, 0) == 0)
            lua_setglobal(L, lib.name);
        else
            lua_settop(L, 0);
    }

    // `loadstring` and `load` come with base and are the Function-constructor analogue:
    // code they compile runs in global scope. Nothing good is in global scope, which is
    // the point of decision 2, so both are removed — and the isolation probe asserts it.
    lua_pushnil(L);
    lua_setglobal(L, "loadstring");
    lua_pushnil(L);
    lua_setglobal(L, "load");
}

static void seed_random(lua_State* L, int seed)
{
    // math.random* seeded from the place seed at load, per the plan. Luau's generator is
    // its own (documented, deterministic); the host-side mulberry32 behind engine.random
    // is agreed against it in the probe, not assumed equal.
    lua_getglobal(L, "math");
    lua_getfield(L, -1, "randomseed");
    lua_pushinteger(L, seed);
    if (lua_pcall(L, 1, 0, 0) != 0)
        lua_settop(L, 0);
    else
        lua_pop(L, 1); // the math table
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

// Reads the error object off the top of the stack and decides which cap or fault caught
// the run. Order matters: the deadline flag outranks everything (a script can throw at
// the very instant the hook fires, and both arrive as one status), then the VM's
// documented messages, then the generic runtime error.
static int status_for(LuauState* s, int protectedStatus)
{
    const char* message = lua_tostring(s->L, -1);
    s->lastError = message ? message : "runtime error";

    if (s->timedOut)
        return STATUS_DEADLINE;
    if (protectedStatus == LUA_ERRMEM || s->lastError.find(kMemoryErrorMessage) != std::string::npos)
        return STATUS_MEMORY;
    // Covers both "stack overflow" (Luau frames, heap-backed) and "C stack overflow"
    // (C frames, LUAI_MAXCCALLS) — both catchable, which is exactly what row 3 of the
    // caps table asserts on three hosts.
    if (s->lastError.find("stack overflow") != std::string::npos)
        return STATUS_STACK;
    // The VM's "error while handling an error" lands here once recursion passes even the
    // overflow handler's headroom — a distinct failure worth counting honestly rather
    // than dressing up as a stack error.
    if (protectedStatus == LUA_ERRERR)
        return STATUS_FATAL;
    return STATUS_RUNTIME;
}

// The loaded closure is on the stack. Stage 1 runs the chunk, which produced — per
// decision 2 — the entry `function(engine)`. Stage 2 calls that, with or without the
// engine depending on the caller. Both stages run inside the armed window, so one
// deadline covers the pair, the way load() covers a place's own registration code.
static int call_loaded(LuauState* s, int mode, int withEngine)
{
    s->running = true;
    s->timedOut = false;

    int entryStatus = lua_pcall(s->L, 0, 1, 0);
    if (entryStatus != 0)
    {
        int status = status_for(s, entryStatus);
        lua_settop(s->L, 0);
        s->running = false;
        return status;
    }

    if (!lua_isfunction(s->L, -1))
    {
        s->lastError = "the compiled chunk did not produce a function to call";
        lua_settop(s->L, 0);
        s->running = false;
        return STATUS_LOAD;
    }

    int nargs = 0;
    if (withEngine)
    {
        registry_get(s->L, "engine");
        nargs = 1;
    }

    int nresults = mode == CALL_DISCARD ? 0 : 1;
    int runStatus = lua_pcall(s->L, nargs, nresults, 0);
    if (runStatus != 0)
    {
        int status = status_for(s, runStatus);
        lua_settop(s->L, 0);
        s->running = false;
        return status;
    }

    if (mode == CALL_TEXT)
    {
        s->topType = lua_type(s->L, -1);
        const char* top = lua_tostring(s->L, -1); // coerces numbers, leaves tables nil
        s->lastTop = top ? top : "";
    }
    else if (mode == CALL_THREAD)
    {
        if (!lua_isthread(s->L, -1))
        {
            s->lastError = "the value handed to the host is not a thread";
            lua_settop(s->L, 0);
            s->running = false;
            return STATUS_RUNTIME;
        }
        registry_get(s->L, "threads");
        lua_pushvalue(s->L, -2);
        lua_rawseti(s->L, -2, ++s->threadCount);
        lua_pop(s->L, 2); // threads table and the thread value
    }

    s->running = false;
    return STATUS_OK;
}

static int eval_inner(int id, const char* source, int length, int withEngine, int mode)
{
    // The probe's and the tests' answer channel: wrap the source exactly the way the plan
    // says a place program is wrapped — the body of `return function(engine) … end` —
    // and run it. `mode` decides what happens to the first result.
    LuauState* s = find_state(id);
    if (!s)
        return STATUS_FATAL;

    std::string wrapped = withEngine ? "return function(engine)\n" : "return function()\n";
    // The JS side hands (ptr, len) with no terminator — this is the one place the
    // difference between a C string and a counted one is visible from here.
    wrapped += std::string(source, size_t(length));
    wrapped += "\nend";

    lua_CompileOptions options = {};
    options.optimizationLevel = 1;
    options.debugLevel = 1;
    size_t size = 0;
    char* bytecode = luau_compile(wrapped.c_str(), wrapped.size(), &options, &size);
    if (!bytecode)
    {
        s->lastError = "compile: allocation failed";
        return STATUS_FATAL;
    }
    int loadStatus = luau_load(s->L, "eval.luau", bytecode, size, 0);
    free(bytecode);
    if (loadStatus != 0)
    {
        const char* message = lua_tostring(s->L, -1);
        s->lastError = message ? message : "load failed";
        lua_settop(s->L, 0);
        return STATUS_LOAD;
    }
    return call_loaded(s, mode, withEngine);
}

// ---------------------------------------------------------------------------
// The try/catch wrapper: foreign C++ (compiler bad_alloc, std::length_error) caught at
// the boundary is reported as FATAL naming itself, never allowed to reach the JS side
// as a wasm trap. `s->running` is cleared because a throw can land between arming and
// disarming, and an armed state left running would interrupt the *next* run.
// ---------------------------------------------------------------------------

#define GLUE_TRY(body)                    \
    try                                     \
    {                                       \
        body                                \
    }                                       \
    catch (const std::exception& e)         \
    {                                       \
        LuauState* s = find_state(id);      \
        if (s)                              \
        {                                   \
            s->running = false;             \
            s->lastError = e.what();        \
        }                                   \
        return STATUS_FATAL;                \
    }                                       \
    catch (...)                             \
    {                                       \
        LuauState* s = find_state(id);      \
        if (s)                              \
        {                                   \
            s->running = false;             \
            s->lastError = "unknown C++ exception at the glue boundary"; \
        }                                   \
        return STATUS_FATAL;                \
    }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int state_new(int memoryLimitBytes, int seed)
    {
        // Note: this construction is the one path without protection — the library
        // opens and engine install allocate before any lua_pcall exists to land in.
        // It is safe as long as the cap exceeds the runtime's own few-hundred-KB
        // startup cost; a cap below that would abort rather than error, and the spike
        // does not use one. Recorded as a known limit in the README.
        LuauState* s = new (std::nothrow) LuauState();
        if (!s)
            return 0;
        s->id = g_nextStateId++;
        s->memoryLimit = unsigned(memoryLimitBytes);
        s->L = lua_newstate(capped_alloc, s);
        if (!s->L)
        {
            delete s;
            return 0;
        }

        lua_Callbacks* cb = lua_callbacks(s->L);
        cb->userdata = s;
        cb->interrupt = interrupt_hook;
        cb->panic = panic_hook;

        open_libs_minimally(s->L);
        install_engine(s->L);
        seed_random(s->L, seed);
        lua_settop(s->L, 0);

        g_states.push_back(s);
        return s->id;
    }

    EMSCRIPTEN_KEEPALIVE
    void state_close(int id)
    {
        for (size_t i = 0; i < g_states.size(); ++i)
        {
            if (g_states[i]->id != id)
                continue;
            LuauState* s = g_states[i];
            g_states.erase(g_states.begin() + long(i));
            s->deadline = 0.0;
            // A free that fails is the QuickJS story (`list_empty` → abort) told in
            // this VM, so the catch is load-bearing: the failure lands in
            // close_error() and the dispose test is where it surfaces — never as a
            // dead process. The bookkeeping must die with the state either way: a
            // peer that refused to free a state should not keep accounting it.
            try
            {
                lua_close(s->L);
            }
            catch (const std::exception& e)
            {
                g_closeError = e.what();
            }
            catch (...)
            {
                g_closeError = "unknown C++ exception during state_close";
            }
            delete s;
            return;
        }
    }

    EMSCRIPTEN_KEEPALIVE
    char* close_error()
    {
        // The failure of the last state_close, as a string: "" means the state freed
        // cleanly. `interpreter.test.ts` asserts the same property for QuickJS
        // ("dispose() does not abort"), and this is where that assertion lives here.
        char* out = static_cast<char*>(malloc(g_closeError.size() + 1));
        if (out)
            memcpy(out, g_closeError.data(), g_closeError.size() + 1);
        g_closeError.clear();
        return out;
    }

    EMSCRIPTEN_KEEPALIVE
    int compile(int id, const char* source, int length, int* outPtr, int* outLen)
    {
        GLUE_TRY(
            LuauState* s = find_state(id);
            if (!s)
                return STATUS_FATAL;

            // The pinned compile options — the bundler's rule #2 before there is a
            // bundler: one frozen struct, so one source is one bytecode across peers.
            lua_CompileOptions options = {};
            options.optimizationLevel = 1;
            options.debugLevel = 1;

            size_t size = 0;
            char* bytecode = luau_compile(source, size_t(length), &options, &size);
            if (!bytecode)
            {
                s->lastError = "compile: allocation failed";
                return STATUS_FATAL;
            }
            // A syntax error is not a failure here: luau_compile encodes it into the
            // module, and luau_load is where it surfaces — with a real message.
            *outPtr = int(uintptr_t(bytecode));
            *outLen = int(size);
            return STATUS_OK;
        )
    }

    EMSCRIPTEN_KEEPALIVE
    int load(int id, const char* bytecode, int length)
    {
        GLUE_TRY(
            LuauState* s = find_state(id);
            if (!s)
                return STATUS_FATAL;
            int status = luau_load(s->L, "place.luau", bytecode, size_t(length), 0);
            if (status != 0)
            {
                const char* message = lua_tostring(s->L, -1);
                s->lastError = message ? message : "load failed";
                lua_settop(s->L, 0);
                return STATUS_LOAD;
            }
            return STATUS_OK;
        )
    }

    EMSCRIPTEN_KEEPALIVE
    void set_deadline(int id, double budgetMs)
    {
        LuauState* s = find_state(id);
        if (!s)
            return;
        // An absolute instant on the VM's own clock, so a step budget never disagrees
        // with the clock it is measured against. 0 clears it: work outside a step is
        // unlimited.
        s->deadline = budgetMs <= 0.0 ? 0.0 : emscripten_get_now() + budgetMs;
    }

    EMSCRIPTEN_KEEPALIVE
    int call(int id)
    {
        GLUE_TRY(
            LuauState* s = find_state(id);
            if (!s)
                return STATUS_FATAL;
            return call_loaded(s, CALL_DISCARD, 1);
        )
    }

    EMSCRIPTEN_KEEPALIVE
    int step(int id, const char* clockJson, int clockLen, const char* eventsJson, int eventsLen)
    {
        GLUE_TRY(
            LuauState* s = find_state(id);
            if (!s)
                return STATUS_FATAL;
            if (s->handlerCount == 0)
                return STATUS_OK;

            // The budget covers all handlers together, as in interpreter.ts: a place
            // cannot buy time by registering handlers. The deadline was armed by the
            // host before this call; the armed window runs from first handler to last.
            registry_get(s->L, "handlers");
            for (int i = 1; i <= s->handlerCount; ++i)
            {
                s->running = true;
                s->timedOut = false;

                lua_rawgeti(s->L, -1, i);
                if (!lua_isfunction(s->L, -1))
                {
                    lua_pop(s->L, 1);
                    s->running = false;
                    continue;
                }
                lua_pushlstring(s->L, clockJson, size_t(clockLen));
                lua_pushlstring(s->L, eventsJson, size_t(eventsLen));
                int called = lua_pcall(s->L, 2, 0, 0);
                s->running = false;
                if (called != 0)
                {
                    int status = status_for(s, called);
                    lua_settop(s->L, 0); // drops the message *and* the handlers table
                    return status;       // one handler that throws ends the step
                }
            }
            lua_pop(s->L, 1);
            return STATUS_OK;
        )
    }

    EMSCRIPTEN_KEEPALIVE
    int eval(int id, const char* source, int length, int withEngine, int mode)
    {
        GLUE_TRY(
            return eval_inner(id, source, length, withEngine, mode);
        )
    }

    EMSCRIPTEN_KEEPALIVE
    int resume(int id, int threadIndex, const char* argJson, int argLen, int hasArg)
    {
        GLUE_TRY(
            // The host-driven coroutine resume: this is the seam the plan's example
            // sits on ("the executor coroutine.resume's the thread inside a
            // synchronous step"). One argument, a string, the way steps pass clock
            // and events.
            LuauState* s = find_state(id);
            if (!s)
                return STATUS_FATAL;

            // The thread lookup itself: a registry read cannot throw (GC never runs at
            // raw table access), but it can need stack, and stack growth answers 0
            // under the cap rather than raising — which is the protected answer.
            if (!lua_checkstack(s->L, 4))
            {
                s->lastError = kMemoryErrorMessage;
                return STATUS_MEMORY;
            }
            registry_get(s->L, "threads");
            lua_rawgeti(s->L, -1, threadIndex);
            lua_State* co = lua_tothread(s->L, -1);
            lua_pop(s->L, 2);
            if (!co)
            {
                s->lastError = "no thread at that index";
                return STATUS_RUNTIME;
            }

            int nargs = 0;
            if (hasArg)
            {
                lua_checkstack(co, 1);
                lua_pushlstring(co, argJson, size_t(argLen));
                nargs = 1;
            }

            s->running = true;
            s->timedOut = false;
            int status = lua_resume(co, s->L, nargs);
            s->running = false;

            // Results live on the thread's stack; move them to the main one for reading.
            int n = lua_gettop(co);
            if (status == LUA_OK || status == LUA_YIELD)
            {
                if (n > 0)
                {
                    lua_checkstack(s->L, n);
                    lua_xmove(co, s->L, n);
                }
                s->topType = lua_type(s->L, -1);
                const char* top = lua_tostring(s->L, -1);
                s->lastTop = top ? top : "";
                lua_settop(s->L, 0);
                return status == LUA_YIELD ? STATUS_YIELD : STATUS_OK;
            }

            // Error: the message sits on the thread's stack; bring it home and classify.
            if (n > 0)
            {
                lua_checkstack(s->L, 1);
                lua_xmove(co, s->L, 1);
            }
            int classified = status_for(s, status);
            lua_settop(s->L, 0);
            return classified;
        )
    }

    EMSCRIPTEN_KEEPALIVE
    int thread_status(int id, int threadIndex)
    {
        // Host-side reads answer with numbers rather than exceptions: -1 means "the
        // host could not ask", which a caller can act on; the VM's own codes mean
        // whatever lua_CoStatus says they mean.
        LuauState* s = find_state(id);
        if (!s)
            return -1;
        if (!lua_checkstack(s->L, 4))
        {
            s->lastError = kMemoryErrorMessage;
            return -1;
        }
        registry_get(s->L, "threads");
        lua_rawgeti(s->L, -1, threadIndex);
        lua_State* co = lua_tothread(s->L, -1);
        if (!co)
        {
            lua_pop(s->L, 2);
            return -1;
        }
        int status = lua_costatus(s->L, co);
        lua_pop(s->L, 2);
        return status;
    }

    EMSCRIPTEN_KEEPALIVE
    int handler_count(int id)
    {
        LuauState* s = find_state(id);
        return s ? s->handlerCount : 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int top_type(int id)
    {
        // The `lua_Type` of whatever the last CALL_TEXT or resume left as the top
        // value — nil is *nil*, "" is *""*, and a host that cannot tell them apart
        // is a host that misreads a place's own answers.
        LuauState* s = find_state(id);
        return s ? s->topType : -1;
    }

    EMSCRIPTEN_KEEPALIVE
    int thread_count(int id)
    {
        LuauState* s = find_state(id);
        return s ? s->threadCount : 0;
    }

    EMSCRIPTEN_KEEPALIVE
    char* last_error(int id)
    {
        LuauState* s = find_state(id);
        std::string text = s ? s->lastError : std::string("no such state");
        if (s)
            s->lastError.clear();
        char* out = static_cast<char*>(malloc(text.size() + 1));
        if (out)
            memcpy(out, text.data(), text.size() + 1);
        return out;
    }

    EMSCRIPTEN_KEEPALIVE
    char* top_string(int id)
    {
        LuauState* s = find_state(id);
        static const std::string empty;
        const std::string& text = s ? s->lastTop : empty;
        char* out = static_cast<char*>(malloc(text.size() + 1));
        if (out)
            memcpy(out, text.data(), text.size() + 1);
        return out;
    }

    EMSCRIPTEN_KEEPALIVE
    int mem_used(int id)
    {
        LuauState* s = find_state(id);
        return s ? int(s->memoryUsed) : -1;
    }

    EMSCRIPTEN_KEEPALIVE
    char* version()
    {
        static const std::string kVersion = LUAU_PINNED_TAG " " LUAU_PINNED_COMMIT;
        char* out = static_cast<char*>(malloc(kVersion.size() + 1));
        if (out)
            memcpy(out, kVersion.data(), kVersion.size() + 1);
        return out;
    }
}

// Emscripten links an executable; this module is never "run", only instantiated and
// used through the exports above. main is outside the extern "C" block — C++ requires
// it, and the compiler said so.
int main()
{
    return 0;
}
