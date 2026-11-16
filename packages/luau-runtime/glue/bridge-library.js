// bridge-library.js — the C→JS trampoline for the five bridge members.
//
// This is an Emscripten *JS library*: its functions become wasm imports, reachable from
// glue.cpp's `extern "C"` declarations. The contract is the same one interpreter.ts draws
// by hand five times — numbers in, strings out, nothing crossing as an object — and the
// marshalling is visible here rather than hidden in a helper so that the next member
// added to the bridge cannot be added by accident with the wrong shape.
//
// `Module.luauHosts` is a Map<number, BridgeHost> the TS side installs before the first
// state is created; the state id each C call carries selects which place's host answers.
// Strings cross through the wasm heap: read with a length the C side knows, return as a
// malloc'd buffer the C side copies into a Lua string and frees. The numbers need no
// marshalling at all.

var BridgeLibrary = {
  // Decode a (ptr, len) string out of the wasm heap.
  $luauReadString: (ptr, len) => {
    return new TextDecoder().decode(HEAPU8.subarray(ptr, ptr + len));
  },

  // Encode a JS string into the wasm heap and hand back the pointer; the C side owns it
  // from here and frees it after pushing the Lua string.
  $luauWriteString: (text) => {
    const bytes = new TextEncoder().encode(text);
    const ptr = _malloc(bytes.length + 1);
    HEAPU8.set(bytes, ptr);
    HEAP8[ptr + bytes.length] = 0;
    return ptr;
  },

  $luauHost: (state) => {
    const hosts = Module["luauHosts"];
    const host = hosts ? hosts.get(state) : undefined;
    if (!host) {
      throw new Error("luau bridge: no host for state " + state);
    }
    return host;
  },

  luau_dispatch: (state, tagPtr, tagLen, jsonPtr, jsonLen) => {
    const host = luauHost(state);
    const refusal = host.dispatch(
      luauReadString(tagPtr, tagLen),
      luauReadString(jsonPtr, jsonLen),
    );
    return luauWriteString(refusal);
  },

  luau_query: (state, namePtr, nameLen, jsonPtr, jsonLen) => {
    const host = luauHost(state);
    const answer = host.query(
      luauReadString(namePtr, nameLen),
      luauReadString(jsonPtr, jsonLen),
    );
    return luauWriteString(answer);
  },

  // Answers engine.now() — the shared clock, a number, no marshalling.
  luau_now: (state) => luauHost(state).now(),

  // Answers engine.random() — the host's seeded generator, not the VM's.
  luau_random: (state) => luauHost(state).random(),
};

addToLibrary(BridgeLibrary);
