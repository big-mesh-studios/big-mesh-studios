-- place-api.luau — the guest library, handwritten over `engine` the way `guest/place-api.ts`
-- is, per plan decision 3: the same bridge, the same wire, the twin *handwritten* rather
-- than transpiled. This is the Phase 1 draft as much as the spike's fixture: a real file
-- that reaches the host through exactly the five members, in the order the plan says.
--
-- It is written loose (no `--!strict`): that is an observation for the ADR's open
-- question (b), not an accident — a JSON decoder's output has no inferable shape, so
-- strict mode and a hand-rolled decoder fight, and the fight is the argument against
-- requiring strictness on the load path.

local M = {}

-- JSON -----------------------------------------------------------------------
--
-- Not a spec implementation: enough grammar for what the bridge actually carries —
-- the payloads built below and the events/answers the host sends. Escapes handled:
-- \" \\ \/ \b \f \n \r \t \uXXXX. Numbers round-trip through tonumber, which is exact
-- for the doubles these values are.

local encodeJSON -- forward: arrays of tables recurse

local function is_array(t: table): boolean
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

  local readValue

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

-- The boundary ---------------------------------------------------------------

local function refuse(tag: string, refusal: string)
  error(tag .. ": " .. refusal, 2)
end

local function dispatch(tag: string, payload: table)
  local refusal = engine.dispatch(tag, encodeJSON(payload))
  if refusal ~= "" then
    refuse(tag, refusal)
  end
end

local function query(name: string, args: table)
  local result = nil
  local ok = pcall(function()
    result = decodeJSON(engine.query(name, encodeJSON(args)))
  end)
  if not ok then
    return nil
  end
  return result
end

-- Helpers -------------------------------------------------------------------

local function wireColour(color)
  if color == nil then
    return nil
  end
  if type(color) == "table" and color[1] ~= nil then
    return {
      r = math.floor(color[1] * 255 + 0.5),
      g = math.floor(color[2] * 255 + 0.5),
      b = math.floor(color[3] * 255 + 0.5),
    }
  end
  return color
end

local function isFiniteNumber(v)
  return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

local function isMedium(value)
  if type(value) ~= "table" then
    return false
  end
  local c = value
  if not isFiniteNumber(c.pushVx) then return false end
  if not isFiniteNumber(c.pushVz) then return false end
  if not isFiniteNumber(c.speedScale) then return false end
  if not isFiniteNumber(c.sink) then return false end
  if c.pushVy ~= nil and not isFiniteNumber(c.pushVy) then return false end
  return true
end

local function firstOrSelf(value, key)
  if type(value) == "table" then
    if key ~= nil and value[key] ~= nil then
      return value[key]
    end
    if value[1] ~= nil then
      return value[1]
    end
  end
  return value
end

-- ## Levels

local __levels = {}

M.level = function(name: string): string
  local found = __levels[name]
  if found == nil then
    error("this place carries no level called \"" .. name .. "\"", 2)
  end
  return found
end

-- ## Geometry / shapes

M.createShape = function(spec: table)
  dispatch("shape-add", spec)
end

M.removeShape = function(placeOrSpec, id)
  local place, theId
  if type(placeOrSpec) == "table" then
    place = placeOrSpec.place
    theId = placeOrSpec.id
  else
    place = placeOrSpec
    theId = id
  end
  dispatch("shape-remove", { place = place, id = theId })
end

M.removePlace = function(placeOrSpec)
  local place = type(placeOrSpec) == "table" and (placeOrSpec.place or placeOrSpec[1]) or placeOrSpec
  dispatch("place-remove", { place = place })
end

M.clearPlace = function(placeOrSpec)
  local place = type(placeOrSpec) == "table" and (placeOrSpec.place or placeOrSpec[1]) or placeOrSpec
  dispatch("place-clear", { place = place })
end

-- ## Items

M.defineItem = function(itemOrSpec, ...)
  local item
  if type(itemOrSpec) == "table" then
    item = itemOrSpec.item or itemOrSpec[1]
  else
    item = itemOrSpec
  end
  dispatch("item-define", { item = item })
end

M.giveItem = function(itemOrSpec, count)
  local item, c
  if type(itemOrSpec) == "table" then
    item = itemOrSpec.item or itemOrSpec[1]
    c = itemOrSpec.count
  else
    item = itemOrSpec
    c = count
  end
  dispatch("item-give", { item = item, count = c })
end

M.takeItem = function(itemOrSpec, count)
  local item, c
  if type(itemOrSpec) == "table" then
    item = itemOrSpec.item or itemOrSpec[1]
    c = itemOrSpec.count
  else
    item = itemOrSpec
    c = count
  end
  dispatch("item-take", { item = item, count = c })
end

M.holdItem = function(itemOrSpec)
  local item
  if type(itemOrSpec) == "table" then
    item = itemOrSpec.item
  else
    item = itemOrSpec
  end
  if item == nil then
    dispatch("item-hold", {})
  else
    dispatch("item-hold", { item = item })
  end
end

-- ## Talk

M.log = function(textOrSpec)
  local text
  if type(textOrSpec) == "table" then
    text = textOrSpec.text
  else
    text = textOrSpec
  end
  dispatch("log", { text = text })
end

M.narrate = function(whoOrSpec, text)
  local who, t
  if type(whoOrSpec) == "table" then
    who = whoOrSpec.who
    t = whoOrSpec.text
  else
    who = whoOrSpec
    t = text
  end
  dispatch("narrate", { who = who, text = t })
end

M.openDialog = function(spec: table)
  dispatch("dialog", spec)
end

M.closeDialog = function()
  dispatch("dialog-close", {})
end

M.endGame = function(titleOrSpec, text)
  local title, t
  if type(titleOrSpec) == "table" then
    title = titleOrSpec.title
    t = titleOrSpec.text
  else
    title = titleOrSpec
    t = text
  end
  dispatch("ending", { title = title, text = t })
end

M.toast = function(textOrSpec)
  local text
  if type(textOrSpec) == "table" then
    text = textOrSpec.text
  else
    text = textOrSpec
  end
  dispatch("toast", { text = text })
end

-- ## Figures

M.createProp = function(spec: table)
  local payload = { kind = "prop" }
  for key, value in pairs(spec) do
    payload[key] = value
  end
  dispatch("entity-add", payload)
end

M.createNpc = function(spec: table)
  local payload = { kind = "npc" }
  for key, value in pairs(spec) do
    payload[key] = value
  end
  dispatch("entity-add", payload)
end

M.moveEntity = function(idOrSpec, at, yaw)
  local id, a, y
  if type(idOrSpec) == "table" then
    id = idOrSpec.id
    a = idOrSpec.at
    y = idOrSpec.yaw
  else
    id = idOrSpec
    a = at
    y = yaw
  end
  dispatch("entity-move", { id = id, at = a, yaw = y })
end

M.setEntityUseDuration = function(idOrSpec, seconds)
  local id, s
  if type(idOrSpec) == "table" then
    id = idOrSpec.id
    s = idOrSpec.seconds
  else
    id = idOrSpec
    s = seconds
  end
  dispatch("entity-use-duration", { id = id, seconds = s })
end

M.removeEntity = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("entity-remove", { id = id })
end

-- ## Zones

M.createZone = function(spec: table)
  dispatch("zone-add", spec)
end

M.removeZone = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("zone-remove", { id = id })
end

-- ## Lights

M.createLight = function(spec: table)
  dispatch("light-add", spec)
  local id = spec.id
  return {
    id = id,
    remove = function()
      dispatch("light-remove", { id = id })
    end,
  }
end

M.removeLight = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("light-remove", { id = id })
end

-- ## Sounds

M.playSound = function(nameOrSpec, options)
  local name, opts
  if type(nameOrSpec) == "table" then
    name = nameOrSpec.name
    opts = nameOrSpec
  else
    name = nameOrSpec
    opts = options or {}
  end
  local id = opts.id
  if id == nil then id = "" end
  local payload = {
    name = name,
    volume = opts.volume,
    pitch = opts.pitch,
    loop = opts.loop,
  }
  if id ~= "" then
    payload.id = id
  end
  dispatch("sound", payload)
  return {
    id = id,
    stop = function()
      if id ~= "" then
        dispatch("sound-stop", { id = id })
      end
    end,
  }
end

M.stopSound = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("sound-stop", { id = id })
end

-- ## Beams and particles

M.createBeam = function(spec: table)
  local payload = {}
  for key, value in pairs(spec) do
    if key ~= "color" then
      payload[key] = value
    end
  end
  local colour = wireColour(spec.color)
  if colour == nil then
    colour = spec.colour
  end
  if colour ~= nil then
    payload.colour = colour
  end
  dispatch("beam", payload)
  local id = spec.id
  return {
    id = id,
    remove = function()
      dispatch("beam-remove", { id = id })
    end,
  }
end

M.createParticle = function(spec: table)
  local payload = {}
  for key, value in pairs(spec) do
    if key ~= "color" then
      payload[key] = value
    end
  end
  local colour = wireColour(spec.color)
  if colour == nil then
    colour = spec.colour
  end
  if colour ~= nil then
    payload.colour = colour
  end
  dispatch("particle", payload)
  local id = spec.id
  return {
    id = id,
    remove = function()
      dispatch("particle-remove", { id = id })
    end,
  }
end

-- ## Fields (mediums)

M.createMedium = function(spec: table)
  dispatch("medium-add", spec)
end

M.removeMedium = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("medium-remove", { id = id })
end

M.getMediumAt = function(xOrSpec, y, z)
  local x, yy, zz
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.x ~= nil then
      x, yy, zz = s.x, s.y, s.z
    elseif s[1] ~= nil then
      x, yy, zz = s[1], s[2], s[3]
    else
      x, yy, zz = s[1], s[2], s[3]
    end
  else
    x, yy, zz = xOrSpec, y, z
  end
  local found = query("getMediumAt", { x, yy, zz })
  if not isMedium(found) then
    return nil
  end
  return found
end

-- ## Clock

M.setTime = function(secondsOrSpec)
  local seconds
  if type(secondsOrSpec) == "table" then
    seconds = secondsOrSpec.seconds
    if seconds == nil then seconds = secondsOrSpec[1] end
  else
    seconds = secondsOrSpec
  end
  dispatch("clock-set", { seconds = seconds })
end

M.setTimeSpeed = function(multiplierOrSpec)
  local m
  if type(multiplierOrSpec) == "table" then
    m = multiplierOrSpec.multiplier
    if m == nil then m = multiplierOrSpec[1] end
  else
    m = multiplierOrSpec
  end
  dispatch("clock-speed", { multiplier = m })
end

-- ## Player

M.movePlayer = function(xOrSpec, y, z, yaw)
  local x, yy, zz, yw
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.at ~= nil then
      x, yy, zz = s.at[1], s.at[2], s.at[3]
    else
      x, yy, zz = s.x or s[1], s.y or s[2], s.z or s[3]
    end
    yw = s.yaw
  else
    x, yy, zz, yw = xOrSpec, y, z, yaw
  end
  local payload = { at = { x, yy, zz } }
  if yw ~= nil then
    payload.yaw = yw
  end
  dispatch("player-place", payload)
end

M.setPlayerSpeed = function(multiplierOrSpec)
  local m
  if type(multiplierOrSpec) == "table" then
    m = multiplierOrSpec.multiplier
    if m == nil then m = multiplierOrSpec[1] end
  else
    m = multiplierOrSpec
  end
  dispatch("player-speed", { multiplier = m })
end

M.setPlayerJump = function(multiplierOrSpec)
  local m
  if type(multiplierOrSpec) == "table" then
    m = multiplierOrSpec.multiplier
    if m == nil then m = multiplierOrSpec[1] end
  else
    m = multiplierOrSpec
  end
  dispatch("player-jump", { multiplier = m })
end

M.setFlying = function(onOrSpec)
  local on
  if type(onOrSpec) == "table" then
    on = onOrSpec.on
    if on == nil then on = onOrSpec[1] end
  else
    on = onOrSpec
  end
  dispatch("player-fly", { on = on })
end

-- ## Camera

M.lookAt = function(xOrSpec, y, z, fov)
  local x, yy, zz, f
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.at ~= nil then
      x, yy, zz = s.at[1], s.at[2], s.at[3]
    else
      x, yy, zz = s.x or s[1], s.y or s[2], s.z or s[3]
    end
    f = s.fov
  else
    x, yy, zz, f = xOrSpec, y, z, fov
  end
  local payload = { at = { x, yy, zz } }
  if f ~= nil then
    payload.fov = f
  end
  dispatch("camera-look", payload)
end

M.clearCamera = function()
  dispatch("camera-clear", {})
end

M.createCamera = function(spec: table)
  dispatch("camera-add", spec)
end

M.moveCamera = function(idOrSpec, options)
  local id, opts
  if type(idOrSpec) == "table" then
    opts = idOrSpec
    id = opts.id
  else
    id = idOrSpec
    opts = options or {}
  end
  local payload = { id = id }
  if opts.at ~= nil then payload.at = opts.at end
  if opts.target ~= nil then payload.target = opts.target end
  if opts.fov ~= nil then payload.fov = opts.fov end
  dispatch("camera-move", payload)
end

M.removeCamera = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("camera-remove", { id = id })
end

M.watchCamera = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("camera-watch", { id = id })
end

-- ## Photos

M.takePhoto = function(spec: table)
  local width = spec.width
  if width == nil then width = 1280 end
  local height = spec.height
  if height == nil then height = 720 end
  local payload = { id = spec.id, width = width, height = height }
  if spec.camera ~= nil then
    payload.camera = spec.camera
  end
  dispatch("photo-take", payload)
  return { id = spec.id, width = width, height = height }
end

M.removePhoto = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("photo-remove", { id = id })
end

-- ## Screens

M.createScreen = function(spec: table)
  dispatch("screen-add", spec)
end

M.moveScreen = function(idOrSpec, options)
  local id, opts
  if type(idOrSpec) == "table" then
    opts = idOrSpec
    id = opts.id
  else
    id = idOrSpec
    opts = options or {}
  end
  local payload = { id = id }
  if opts.source ~= nil then payload.source = opts.source end
  if opts.at ~= nil then payload.at = opts.at end
  if opts.yaw ~= nil then payload.yaw = opts.yaw end
  if opts.width ~= nil then payload.width = opts.width end
  if opts.height ~= nil then payload.height = opts.height end
  dispatch("screen-move", payload)
end

M.removeScreen = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("screen-remove", { id = id })
end

-- ## HUD images

M.showImage = function(spec: table)
  dispatch("image-show", spec)
end

M.hideImage = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("image-hide", { id = id })
end

-- ## HUD meters / labels / panels

M.createHudMeter = function(spec: table)
  local value = spec.value
  local label = spec.label
  local show = function()
    dispatch("hud-meter", { id = spec.id, label = label, value = value, max = spec.max })
  end
  show()
  return {
    id = spec.id,
    setValue = function(next)
      value = next
      show()
    end,
    setLabel = function(next)
      label = next
      show()
    end,
    remove = function()
      dispatch("hud-meter-remove", { id = spec.id })
    end,
  }
end

M.createHudLabel = function(spec: table)
  local text = spec.text
  local show = function()
    dispatch("hud-label", { id = spec.id, text = text })
  end
  show()
  return {
    id = spec.id,
    setText = function(next)
      text = next
      show()
    end,
    remove = function()
      dispatch("hud-label-remove", { id = spec.id })
    end,
  }
end

M.createHudPanel = function(spec: table)
  local value = spec.value
  local label = spec.label
  local show = function()
    dispatch("hud-panel", {
      id = spec.id,
      entityId = spec.entityId,
      position = spec.position,
      yaw = spec.yaw,
      pitch = spec.pitch,
      width = spec.width,
      height = spec.height,
      label = label,
      value = value,
      max = spec.max,
    })
  end
  show()
  return {
    id = spec.id,
    setValue = function(next)
      value = next
      show()
    end,
    setLabel = function(next)
      label = next
      show()
    end,
    remove = function()
      dispatch("hud-panel-remove", { id = spec.id })
    end,
  }
end

M.removeHudPanel = function(idOrSpec)
  local id = type(idOrSpec) == "table" and (idOrSpec.id or idOrSpec[1]) or idOrSpec
  dispatch("hud-panel-remove", { id = id })
end

-- ## Data

M.saveData = function(keyOrSpec, value)
  local key, val
  if type(keyOrSpec) == "table" then
    key = keyOrSpec.key
    val = keyOrSpec.value
  else
    key = keyOrSpec
    val = value
  end
  dispatch("data-set", { scope = "global", key = key, value = val })
end

M.loadData = function(keyOrSpec)
  local key = type(keyOrSpec) == "table" and (keyOrSpec.key or keyOrSpec[1]) or keyOrSpec
  local value = query("getData", { key })
  if type(value) == "string" then
    return value
  end
  return nil
end

M.deleteData = function(keyOrSpec)
  local key = type(keyOrSpec) == "table" and (keyOrSpec.key or keyOrSpec[1]) or keyOrSpec
  dispatch("data-delete", { scope = "global", key = key })
end

-- ## World queries

M.getSolidAt = function(xOrSpec, y, z)
  local x, yy, zz
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.x ~= nil then
      x, yy, zz = s.x, s.y, s.z
    else
      x, yy, zz = s[1], s[2], s[3]
    end
  else
    x, yy, zz = xOrSpec, y, z
  end
  local result = query("getSolidAt", { x, yy, zz })
  return result == true
end

M.getHeightAt = function(xOrSpec, z)
  local x, zz
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.x ~= nil then
      x, zz = s.x, s.z
    else
      x, zz = s[1], s[2]
    end
  else
    x, zz = xOrSpec, z
  end
  local h = query("getHeightAt", { x, zz })
  if type(h) == "number" then
    return h
  end
  return 0
end

M.getWaterAt = function(xOrSpec, y, z)
  local x, yy, zz
  if type(xOrSpec) == "table" then
    local s = xOrSpec
    if s.x ~= nil then
      x, yy, zz = s.x, s.y, s.z
    else
      x, yy, zz = s[1], s[2], s[3]
    end
  else
    x, yy, zz = xOrSpec, y, z
  end
  local result = query("getWaterAt", { x, yy, zz })
  return result == true
end

M.raycast = function(originOrSpec, direction, maxDistance)
  local origin, dir, maxD
  if type(originOrSpec) == "table" and originOrSpec.origin ~= nil then
    origin = originOrSpec.origin
    dir = originOrSpec.direction
    maxD = originOrSpec.maxDistance
  else
    origin = originOrSpec
    dir = direction
    maxD = maxDistance
  end
  local hit = query("raycast", { origin, dir, maxD })
  if type(hit) ~= "table" then
    return nil
  end
  if type(hit.kind) ~= "string" then
    return nil
  end
  if type(hit.distance) ~= "number" then
    return nil
  end
  if type(hit.point) ~= "table" or type(hit.normal) ~= "table" then
    return nil
  end
  return hit
end

-- ## Timers

M.after = function(idOrSpec, delayMs)
  local id, delay
  if type(idOrSpec) == "table" then
    id = idOrSpec.id
    delay = idOrSpec.afterMs
    if delay == nil then delay = idOrSpec.delayMs end
    if delay == nil then delay = idOrSpec.delay end
  else
    id = idOrSpec
    delay = delayMs
  end
  dispatch("timer", { id = id, afterMs = delay })
end

-- ## Events

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

M.EVENT_KINDS = {
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
}

M.onTick = function(handler)
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

-- ## Small maths

M.clamp = function(value, low, high)
  if value < low then return low end
  if value > high then return high end
  return value
end

M.lerp = function(a, b, t)
  return a + (b - a) * t
end

M.random = function()
  return engine.random()
end

M.randint = function(lo: number, hi: number): number
  return lo + math.floor(engine.random() * (hi - lo + 1))
end

M.randFloat = function(low, high)
  return low + engine.random() * (high - low)
end

M.choice = function(items)
  if type(items) ~= "table" or #items == 0 then
    return nil
  end
  return items[M.randint(1, #items)]
end

-- ## Vector3

local Vector3 = {}
Vector3.__index = Vector3

function Vector3.new(x, y, z)
  local v = { x = x or 0, y = y or 0, z = z or 0 }
  v.length = math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  return setmetatable(v, Vector3)
end

function Vector3.zero()
  return Vector3.new(0, 0, 0)
end

function Vector3.one()
  return Vector3.new(1, 1, 1)
end

function Vector3.fromArray(values)
  return Vector3.new(values[1], values[2], values[3])
end

function Vector3:add(other)
  return Vector3.new(self.x + other.x, self.y + other.y, self.z + other.z)
end

function Vector3:subtract(other)
  return Vector3.new(self.x - other.x, self.y - other.y, self.z - other.z)
end

function Vector3:scale(factor)
  return Vector3.new(self.x * factor, self.y * factor, self.z * factor)
end

function Vector3:dot(other)
  return self.x * other.x + self.y * other.y + self.z * other.z
end

function Vector3:cross(other)
  return Vector3.new(
    self.y * other.z - self.z * other.y,
    self.z * other.x - self.x * other.z,
    self.x * other.y - self.y * other.x
  )
end

function Vector3:unit()
  local len = self.length
  if len == 0 then
    return Vector3.zero()
  end
  return self:scale(1 / len)
end

function Vector3:lerp(other, t)
  return Vector3.new(
    M.lerp(self.x, other.x, t),
    M.lerp(self.y, other.y, t),
    M.lerp(self.z, other.z, t)
  )
end

function Vector3:toArray()
  return { self.x, self.y, self.z }
end

function Vector3:equals(other)
  return self.x == other.x and self.y == other.y and self.z == other.z
end

setmetatable(Vector3, {
  __call = function(_, x, y, z)
    return Vector3.new(x, y, z)
  end,
})

M.Vector3 = Vector3

-- ## PlaceError marker

M.PlaceError = "PlaceError"

return M
