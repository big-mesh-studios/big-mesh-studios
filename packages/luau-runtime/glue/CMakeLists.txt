# CMakeLists.txt — one executable, `luau.mjs` + `luau.wasm`, from glue.cpp over the
# pinned Luau in ../vendor/luau. This file is only reached by build.sh, and build.sh is
# only reached when pin.txt changes: emsdk must never be in the dev loop, per ADR 0015's
# Termux lesson. Normal development consumes dist/, which is committed.
#
# The subset that is built matters: Common, Ast, Bytecode, Compiler, VM. Not Analysis —
# decision 8 says the type checker is a tool, never a load-path dependency, and leaving
# it out of this build is how that stays true by construction rather than by discipline.

cmake_minimum_required(VERSION 3.16)
project(luau_glue CXX)

set(LUAU_BUILD_CLI OFF CACHE BOOL "" FORCE)
set(LUAU_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LUAU_BUILD_WEB OFF CACHE BOOL "" FORCE)
set(LUAU_WERROR OFF CACHE BOOL "" FORCE)
set(LUAU_EXTERN_C OFF CACHE BOOL "" FORCE)

# Emscripten's exception mode must be named on both sides of the link, because the
# reference to __cxa_throw from std:: machinery in the libraries is real (measured:
# every Ast/Compiler/Common object references it; omitting this on the link is the
# error "DISABLE_EXCEPTION_THROWING was set … required by symbol '__cxa_throw'").
# -fwasm-exceptions is the umbrella that says it once for compile and link: native
# wasm EH, exceptions catchable in C++ — which is what Luau's own LUAU_BUILD_WEB
# path arranges with -fexceptions, applied here because we are the web build.
add_compile_options(-fwasm-exceptions)

add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../vendor/luau ${CMAKE_BINARY_DIR}/luau EXCLUDE_FROM_ALL)

# The errors of this VM are longjmps, not wasm exceptions: the step deadline raises from
# the interrupt hook and lands in the enclosing lua_pcall exactly the way QuickJS's
# interrupt does, and the binary carries no exception tables for it.
target_compile_definitions(Luau.VM PUBLIC LUA_USE_LONGJMP=1)

# And the longjmps are the *wasm-native* kind, which is a compile-time fact about the
# objects, not just a link-time one: ldo.cpp calls _setjmp/_longjmp, and without this
# the emitted code references the JS `emscripten_longjmp` import, which the wasm-sjlj
# link refuses to provide (measured: `undefined symbol: emscripten_longjmp`). The flag
# must match on both sides of the link, so it is here rather than only in build.sh.
target_compile_options(Luau.VM PRIVATE "SHELL:-s SUPPORT_LONGJMP=wasm")

add_executable(luau glue.cpp)
set_target_properties(luau PROPERTIES SUFFIX ".mjs" OUTPUT_NAME "luau")
target_compile_features(luau PRIVATE cxx_std_17)
target_compile_definitions(luau PRIVATE
    LUAU_PINNED_TAG="${LUAU_PINNED_TAG}"
    LUAU_PINNED_COMMIT="${LUAU_PINNED_COMMIT}")
# The glue never calls setjmp itself, but emscripten's driver cross-checks that every
# object in the link agrees on the longjmp flavor, so it is named here as well.
target_compile_options(luau PRIVATE "SHELL:-s SUPPORT_LONGJMP=wasm")
target_link_libraries(luau PRIVATE Luau.VM Luau.Compiler)

# -O2, not -O3: this is a VM loop, and the difference between them was never measured to
# be worth a second binary's worth of build time on a phone. The spike measures what it
# gives; a pin bump is the moment to revisit, with numbers, not vibes.
target_link_options(luau PRIVATE
    "-O2"
    "-fwasm-exceptions"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s EXPORT_NAME=createLuauModule"
    "SHELL:-s EXPORT_ES6=1"
    "SHELL:-s ENVIRONMENT=web,worker,node"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s INITIAL_MEMORY=16MB"
    "SHELL:-s STACK_SIZE=1MB"
    "SHELL:-s EXPORTED_RUNTIME_METHODS=HEAPU8,HEAP8,HEAP32,HEAPU32,HEAPF64"
    "SHELL:-s EXPORTED_FUNCTIONS=_malloc,_free"
    "SHELL:-s EXIT_RUNTIME=0"
    "SHELL:-s FILESYSTEM=0"
    "SHELL:-s SUPPORT_LONGJMP=wasm"
    "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/bridge-library.js"
)
