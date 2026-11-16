-- place-api.luau — the guest library, handwritten over `engine` the way `guest/place-api.ts`
-- is, per plan decision 3: the same bridge, the same wire, the twin *handwritten* rather
-- than transpiled. This is the Phase 1 draft as much as the spike's fixture: a real file
-- that reaches the host through exactly the five members, in the order the plan says.
--
-- It is written loose (no `--!strict`): that is an observation for the ADR's open
-- question (b), not an accident — a JSON decoder's output has no inferable shape, so
-- strict mode and a hand-rolled decoder fight, and the fight is the argument against
-- requiring strictness on the load path.
--
-- ## What crosses
--
-- Every effect is `engine.dispatch(tag, jsonText)`; every read of the world is
-- `engine.query(name, jsonText)`. Nothing crosses as an object, so this file owns the
-- JSON: `encodeJSON` is the hand-built payload side, `decodeJSON` parses the events and
-- query answers the host sends. A production bundler (Phase 1) would share one copy;
-- the spike earns the right to ask for it by writing it once, here, by hand.

local M = {}

-- JSON -----------------------------------------------------------------------
--
-- Not a spec implementation: enough grammar for what the bridge actually carries —
-- the payloads built below and the events/answers the host sends. Escapes handled:
-- \" \\ \/ \b \f \n \r \t \uXXXX. Numbers round-trip through tonumber, which is exact
-- for the doubles these values are.

local encodeJSON -- forward: arrays of tables recurse

local function is_array(t: table): boolean
  -- #t counts the contiguous integer prefix; a table is an array when that prefix
  -- covers every key. Maps with integer keys are the case the host never sends and
  -- this library never builds, so the ambiguity is left to the places that cannot
  -- create it.
  local n = #t
  if n == 0 then
    return next(t) == nil and true or false
  end
  local count = 0
  for _ in t do
    count += 1
  end
  return count == n
end

local function escapeString(s: string): string
  local out = {}
  for i = 1, #s do
    local c = s:sub(i, i)
    if c == '"' then
      out[#out + 1] = '\\"'
    elseif c == "\\" then
      out[#out + 1] = "\\\\"
    elseif c == "\n" then
      out[#out + 1] = "\\n"
    elseif c == "\r" then
      out[#out + 1] = "\\r"
    elseif c == "\t" then
      out[#out + 1] = "\\t"
    else
      out[#out + 1] = c
    end
  end
  return table.concat(out)
end

encodeJSON = function(value): string
  local kind = typeof(value)
  if kind == "string" then
    return "\"" .. escapeString(value) .. "\""
  elseif kind == "number" then
    if value == math.floor(value) and math.abs(value) < 1e15 then
      return string.format("%d", value)
    end
    return string.format("%.17g", value)
  elseif kind == "boolean" then
    return value and "true" or "false"
  elseif kind == "nil" then
    return "null"
  elseif kind == "table" then
    if is_array(value) then
      local parts = {}
      for _, item in ipairs(value) do
        parts[#parts + 1] = encodeJSON(item)
      end
      return "[" .. table.concat(parts, ",") .. "]"
    end
    local parts = {}
    -- Sorted keys: the payload bytes are part of the dispatch trace, and a map that
    -- iterated differently between peers would be two worlds that agreed everywhere
    -- except here. Arrays and ipairs are still what the docs will tell authors to
    -- prefer — the same sentence the plan's decision 6 writes for the docs page.
    local keys = {}
    for k in pairs(value) do
      keys[#keys + 1] = tostring(k)
    end
    table.sort(keys)
    for _, k in ipairs(keys) do
      local v = value[k]
      if v ~= nil then
        parts[#parts + 1] = "\"" .. escapeString(k) .. "\":" .. encodeJSON(v)
      end
    end
    return "{" .. table.concat(parts, ",") .. "}"
  end
  error("encodeJSON: cannot encode a " .. kind, 2)
end

-- A recursive-descent reader over exactly the grammar the host sends. Position is an
-- upvalue cell rather than a parameter because every function's contract is "advance
-- or throw."
local function decodeJSON(text: string)
  local pos = 1

  local function skipSpace()
    while pos <= #text and text:sub(pos, pos):find("^%s") do
      pos += 1
    end
  end

  local function peek(): string
    return text:sub(pos, pos)
  end

  local function expect(literal: string)
    if text:sub(pos, pos + #literal - 1) ~= literal then
      error("decodeJSON: expected " .. literal .. " at " .. tostring(pos), 2)
    end
    pos += #literal
  end

  local readValue -- forward

  local function readString(): string
    expect("\"")
    local parts = {}
    while true do
      if pos > #text then
        error("decodeJSON: unterminated string", 2)
      end
      local c = text:sub(pos, pos)
      if c == "\"" then
        pos += 1
        return table.concat(parts)
      elseif c == "\\" then
        local e = text:sub(pos + 1, pos + 1)
        if e == "n" then
          parts[#parts + 1] = "\n"
        elseif e == "t" then
          parts[#parts + 1] = "\t"
        elseif e == "r" then
          parts[#parts + 1] = "\r"
        elseif e == "b" then
          parts[#parts + 1] = "\b"
        elseif e == "f" then
          parts[#parts + 1] = "\f"
        elseif e == "u" then
          -- Basic plane only; astral pairs would be a way to need a UTF-8 encoder at
          -- 2 AM, and no place event has ever carried an emoji.
          local hex = text:sub(pos + 2, pos + 5)
          parts[#parts + 1] = utf8.char(tonumber(hex, 16))
          pos += 4
        else
          parts[#parts + 1] = e
        end
        pos += 2
      else
        parts[#parts + 1] = c
        pos += 1
      end
    end
  end

  readValue = function()
    skipSpace()
    local c = peek()
    if c == "{" then
      pos += 1
      local obj = {}
      skipSpace()
      if peek() == "}" then
        pos += 1
        return obj
      end
      while true do
        skipSpace()
        local key = readString()
        skipSpace()
        expect(":")
        obj[key] = readValue()
        skipSpace()
        if peek() == "," then
          pos += 1
        elseif peek() == "}" then
          pos += 1
          return obj
        else
          error("decodeJSON: expected , or } at " .. tostring(pos), 2)
        end
      end
    elseif c == "[" then
      pos += 1
      local arr = {}
      skipSpace()
      if peek() == "]" then
        pos += 1
        return arr
      end
      while true do
        arr[#arr + 1] = readValue()
        skipSpace()
        if peek() == "," then
          pos += 1
        elseif peek() == "]" then
          pos += 1
          return arr
        else
          error("decodeJSON: expected , or ] at " .. tostring(pos), 2)
        end
      end
    elseif c == "\"" then
      return readString()
    elseif c == "t" then
      expect("true")
      return true
    elseif c == "f" then
      expect("false")
      return false
    elseif c == "n" then
      expect("null")
      return nil
    else
      local start = pos
      while pos <= #text and text:sub(pos, pos):match("^[-+0-9eE%.]$") do
        pos += 1
      end
      local number = tonumber(text:sub(start, pos - 1))
      if number == nil then
        error("decodeJSON: bad value at " .. tostring(start), 2)
      end
      return number
    end
  end

  local value = readValue()
  skipSpace()
  if pos <= #text then
    error("decodeJSON: trailing input at " .. tostring(pos), 2)
  end
  return value
end

M.decodeJSON = decodeJSON
M.encodeJSON = encodeJSON

-- The boundary ---------------------------------------------------------------

local function refuse(tag: string, refusal: string)
  -- The bridge's own convention: "" is success, anything else is the sentence, and
  -- throwing it at the line that caused it is what ADR 0015 bought on purpose.
  error(tag .. ": " .. refusal, 2)
end

local function dispatch(tag: string, payload: table)
  local refusal = engine.dispatch(tag, encodeJSON(payload))
  if refusal ~= "" then
    refuse(tag, refusal)
  end
end

local function query(name: string, args: table)
  return decodeJSON(engine.query(name, encodeJSON(args)))
end

M.query = query

-- The vocabulary the port uses; every one is one `engine.dispatch` away. The tag
-- names match apps/spacescape's effects.ts today; Phase 1's parity test pins the list.

M.pi = math.pi

-- ## Levels
--
-- `bundlePlaceLuau` replaces the empty table below with one holding this place's level
-- documents, the way the TypeScript twin gets a `const __levels` appended by `bundle.ts` —
-- a value travelling with the program rather than through the bridge, because the bridge
-- carries strings and numbers and a level is already the text of a whole document.
--
-- **`level(name)` dispatches nothing.** The host folds the levels into the world itself,
-- before the script runs — that order is what "the script has the last word" means — and
-- what an author's call asserts is *presence*: a place that asks for a level it does not
-- carry should throw at that line, not open into a world with no building in it. The
-- returned text is there for scripts that want to read the document; the hospital just
-- asserts.
local __levels = {}

M.level = function(name: string): string
  local found = __levels[name]
  if found == nil then
    error("this place carries no level called \"" .. name .. "\"", 2)
  end
  return found
end

M.log = function(text: string)
  dispatch("log", { text = text })
end

M.narrate = function(who: string, text: string)
  dispatch("narrate", { who = who, text = text })
end

M.createLight = function(spec: table)
  dispatch("light-add", spec)
end

M.removeLight = function(id: string)
  dispatch("light-remove", { id = id })
end

-- **One tag, two kinds, one id space** — `entity-add` with `kind`, exactly as the
-- TypeScript twin shapes it. Two names for one effect would be two places to differ,
-- which is the sentence `place-api.ts` writes about `moveProp`/`moveNpc`, arriving here
-- a stage earlier, at the vocabulary itself.
M.createNpc = function(spec: table)
  local payload = { kind = "npc" }
  for key, value in pairs(spec) do
    payload[key] = value
  end
  dispatch("entity-add", payload)
end

M.createProp = function(spec: table)
  local payload = { kind = "prop" }
  for key, value in pairs(spec) do
    payload[key] = value
  end
  dispatch("entity-add", payload)
end

M.moveEntity = function(id: string, at: { number }, yaw: number)
  dispatch("entity-move", { id = id, at = at, yaw = yaw })
end

M.removeEntity = function(id: string)
  dispatch("entity-remove", { id = id })
end

M.setEntityUseDuration = function(id: string, seconds: number)
  dispatch("entity-use-duration", { id = id, seconds = seconds })
end

M.createCamera = function(spec: table)
  dispatch("camera-add", spec)
end

M.removeCamera = function(id: string)
  dispatch("camera-remove", { id = id })
end

M.createScreen = function(spec: table)
  dispatch("screen-add", spec)
end

M.removeScreen = function(id: string)
  dispatch("screen-remove", { id = id })
end

M.createHudPanel = function(spec: table)
  dispatch("hud-panel", spec)
  -- The handle updates in place, same id, same shape: which is why creating one is
  -- once-per-thing rather than once-per-frame (the TS twin says the same sentence).
  -- The last label and value live in this closure because the payload is rebuilt whole.
  local last = { value = spec.value }
  local rebuild = function(label: string?, value: number?)
    if label ~= nil then
      spec.label = label
    end
    if value ~= nil then
      last.value = value
    end
    dispatch("hud-panel", {
      id = spec.id,
      entityId = spec.entityId,
      position = spec.position,
      yaw = spec.yaw,
      pitch = spec.pitch,
      width = spec.width,
      height = spec.height,
      label = spec.label,
      value = last.value,
      max = spec.max,
    })
  end
  return {
    setValue = function(value: number)
      rebuild(nil, value)
    end,
    setLabel = function(label: string)
      rebuild(label, nil)
    end,
  }
end

M.removeHudPanel = function(id: string)
  dispatch("hud-panel-remove", { id = id })
end

M.takePhoto = function(spec: table)
  dispatch("photo-take", spec)
end

M.removePhoto = function(id: string)
  dispatch("photo-remove", { id = id })
end

M.showImage = function(spec: table)
  dispatch("image-show", spec)
end

M.hideImage = function(id: string)
  dispatch("image-hide", { id = id })
end

M.openDialog = function(spec: table)
  dispatch("dialog", spec)
end

M.randint = function(lo: number, hi: number): number
  -- The host's seeded draw, bridged: the same generator the TypeScript places get,
  -- so `patientKind` is one world for both languages, not two that happen to agree.
  return lo + math.floor(engine.random() * (hi - lo + 1))
end

-- ## Event kinds
--
-- The closed set from `events.ts`, and the reason a hand-written decoder needs it: a
-- host from a later build may send a kind this library has never heard of, and dropping
-- it is the version-skew answer — `undefined` in a field the docs promise is a string
-- is not.
local EVENT_KINDS = {}
for _, kind in ipairs({
  "player-joined",
  "player-left",
  "player-died",
  "zone-entered",
  "zone-left",
  "entity-used",
  "item-used",
  "npc-talk",
  "npc-choose",
  "timer",
  "data-changed",
}) do
  EVENT_KINDS[kind] = true
end

M.onTick = function(handler)
  -- **The tick, parsed the way `parseTick` parses it in the TypeScript twin, and the
  -- unwrapping of `payload` is the part that was missing once.** The wire nests a
  -- fact's own fields under `payload` — that is what `events.ts` validates, and nesting
  -- is what keeps a payload field from colliding with `kind` and `at` — but the shape a
  -- script is written against is the flat one: `event.entityId`, not
  -- `event.payload.entityId`. A library that forgets to unwrap hands every script a
  -- silently-nil field, which is how "take the patient's photo" stopped working without
  -- a single refusal saying anything.
  --
  -- A malformed clock or list becomes an empty tick: the alternative is a script that
  -- cannot start, reported as a parse error in a file the author cannot see.
  engine.onTick(function(clockJson: string, eventsJson: string)
    local now = tonumber(clockJson)
    if now == nil then
      now = engine.now()
    end

    local events = {}
    local decoded = nil
    local ok = pcall(function()
      decoded = decodeJSON(eventsJson)
    end)
    if ok and typeof(decoded) == "table" then
      for _, candidate in ipairs(decoded) do
        if typeof(candidate) == "table" then
          local kind = candidate.kind
          if typeof(kind) == "string" and EVENT_KINDS[kind] == true then
            local producer = candidate.producer
            local event = {
              kind = kind,
              producer = if typeof(producer) == "string" then producer else "local",
            }
            local payload = candidate.payload
            if typeof(payload) == "table" then
              for field, value in pairs(payload) do
                event[field] = value
              end
            end
            events[#events + 1] = event
          end
        end
      end
    end

    handler({ now = now, events = events })
  end)
end

M.PlaceError = "PlaceError" -- marker for the docs; the throws above carry the sentence

return M
