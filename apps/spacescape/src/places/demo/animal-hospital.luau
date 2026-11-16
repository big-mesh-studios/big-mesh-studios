-- animal-hospital.luau — the Luau port of spacescape-places/animal-hospital's main.ts.
-- A built-in demo the moment Phase 1's host branches on `language: "luau"`, and the
-- spike's demo-sized payload before that: this file plus the guest library beside it
-- is a real place, of the size people actually write, running on the engine Phase 0
-- measures.
--
-- **What changed, honestly:** the TypeScript original spends roughly 200 of its 816
-- lines on `ActionSpec` / `JourneyNode` / `compileJourney` / `perform` — a hand-rolled
-- coroutine in generators, with the casts, because the QuickJS promise queue is never
-- pumped (ADR 0015, by design). Here the journey is *the language's own coroutine*:
-- `walkTo` is `coroutine.yield`, the executor is `coroutine.resume`, and the author
-- writes it linearly — the plan's example, verbatim. What remains is the part that was
-- never ceremony: the per-action motion of a patient walking, turning, and nagging at
-- the counter, which lives in `tickAction` as it did in the TypeScript, because that
-- is the place's behaviour rather than its plumbing.
--
-- Two porting notes an author transitioning will learn once, loudly, so they are here
-- rather than in a bug report: Luau locals are only visible to code written *after*
-- them (the journey below sits after the constants it walks between), and a place
-- script's `require` resolves only through the bundle's module table — the guest
-- library, and the place's own files, and nothing else.

local M = require("spacescape")

-- ## Journey actions
--
-- In the TypeScript, adding an action meant editing a mapped type, a union, and two
-- switches so the compiler could correlate `node.next`'s argument with the result type.
-- Here an action is a function that yields, and resumes with whatever the executor
-- sends back at that line. The discipline moves to `tickAction`'s dispatch below — the
-- same table the TS `switch` wrote, minus the machinery that made it type-check.

local function walkTo(x: number, z: number)
  return coroutine.yield("walkTo", x, z)
end

local function turnTo(yaw: number)
  return coroutine.yield("turnTo", yaw)
end

-- Resumes with "served" when the label reaches the patient, nil when they gave up.
local function waitAtCounter()
  return coroutine.yield("waitAtCounter")
end

local function waitInBed()
  return coroutine.yield("waitInBed")
end

local function ask(prompt: string, options: { string })
  return coroutine.yield("ask", prompt, options)
end

-- ## The world, as the original declares it

M.level("animal-hospital.json")

-- Ceiling lamps, one per bay; the building has a roof, so the sun does not reach
-- inside it. Same sentence, same numbers as the TypeScript — the port changes the
-- plumbing, not the place.
local LAMPS = {
  { id = "ward-west", at = { -350, -44, 60 } },
  { id = "ward-east", at = { -250, -44, 35 } },
  { id = "reception", at = { -340, -44, -10 } },
  { id = "ward-north", at = { -180, -44, -20 } },
  { id = "ward-north-east", at = { -100, -44, -20 } },
  { id = "ward-far-east", at = { -60, -44, -60 } },
  { id = "ward-far-north", at = { -200, -44, -110 } },
}

for _, lamp in ipairs(LAMPS) do
  M.createLight({
    id = lamp.id,
    at = lamp.at,
    colour = { r = 255, g = 228, b = 186 },
    radius = 220,
    intensity = 0.003,
  })
end

M.createLight({
  id = "front-door-daylight",
  at = { -267, -48, 108 },
  colour = { r = 190, g = 214, b = 255 },
  radius = 120,
  intensity = 0.0015,
})

local patientKinds = {
  { name = "Melty", model = "melty.sdfmod" },
}

-- The first bed in the north ward, approached from the corridor. The journey reads
-- these, so they are declared before it — Luau's scope is the file read downward.
local BED_APPROACH_X = -190.0
local BED_APPROACH_Z = -24.9

-- The intake journey, written exactly as the plan's example promised: linearly, with
-- the branch on the counter's outcome as an ordinary `if`.
local function patientJourney()
  walkTo(-267.0, -15.0)
  turnTo(-0.5 * math.pi)
  walkTo(-290.0, -15.0)

  local outcome = waitAtCounter()
  if outcome == "served" then
    turnTo(0.5 * math.pi)
    walkTo(-267.0, -15.0)
    turnTo(math.pi)
    walkTo(-267.0, BED_APPROACH_Z)
    turnTo(0.5 * math.pi)
    walkTo(BED_APPROACH_X, BED_APPROACH_Z)
    waitInBed()
  end
end

local PATIENT_ENTRY = { -267, -52.5, 85 }
local COUNTER_Z = -15.0
local COUNTER_X = -290.0
local PHOTO_DISAPPEAR_TIMEOUT_TICKS = 1000

local photoShown = false
local currentPhotoTimeoutTicks = 0

local FORMS_ID = "forms"
local FORMS_LOCATION = { -301.29, -48.54, -14.02 }
local FORMS_YAW = 1.6
local FORMS_SCALE = 3.55

local LABEL_ID = "label"
local LABEL_LOCATION = { -304.0, -48.8, -3.0 }
local LABEL_YAW = 0.4
local LABEL_SCALE = 1.75
local LABEL_NAME_PANEL_ID = "label-patient-name"

local formsShown = false
local formFilledOut = false
local computerProcessedForms = false
local labelPrinted = false
local holdingLabel = false

local RECEPTION_CAMERA = "reception-camera"

M.createCamera({
  id = RECEPTION_CAMERA,
  at = { -299.6, -45.4, -17.4 },
  target = { COUNTER_X, -46, COUNTER_Z },
  fov = 60,
})

local SECURITY_CAMERAS = {
  { id = "security-lobby", at = { -260, -39, 74 }, target = { -300, -51, 28 } },
  { id = "security-waiting", at = { -385, -39, 4 }, target = { -350, -51, 28 } },
  { id = "security-ward", at = { -185, -39, -10 }, target = { -195, -51, -49 } },
}

for _, camera in ipairs(SECURITY_CAMERAS) do
  M.createCamera({ id = camera.id, at = camera.at, target = camera.target, fov = 65 })
end

for index, camera in ipairs(SECURITY_CAMERAS) do
  M.createScreen({
    id = "security-monitor-" .. tostring(index),
    source = { camera = camera.id },
    at = { -389.2, -47.5, -36.5 + (index - 1) * 5.5 },
    yaw = math.pi / 2,
    width = 4,
    height = 2.25,
  })
end

local CAMERA_PROP = "level/prop-hospital-camera"
local RECEPTION_PHOTO = "reception-photo"
local RECEPTION_IMAGE = "reception-image"
local COMPUTER_PROP = "level/prop-hospital-computer"
local PRINTER_PROP = "level/prop-hospital-printer"

M.setEntityUseDuration(COMPUTER_PROP, 4)

local COMPUTER_PANEL_ID = "reception-computer-panel"
local COMPUTER_PANEL_PERIOD_MS = 8000

local computerPanel = M.createHudPanel({
  id = COMPUTER_PANEL_ID,
  entityId = COMPUTER_PROP,
  position = { 0, 0, 0.62 },
  yaw = 0,
  width = 1.1,
  height = 0.55,
  label = "Waiting for forms",
  value = 0,
  max = 100,
})

local computerPanelValue = -1
local computerPanelLabel = "Waiting for forms"

local function updateComputerPanel(now: number)
  local phase = (now % COMPUTER_PANEL_PERIOD_MS) / COMPUTER_PANEL_PERIOD_MS
  local value = math.floor(phase * 100)
  if value ~= computerPanelValue then
    computerPanelValue = value
    computerPanel.setValue(value)
  end
  local label =
    if value < 15 then "Waiting for forms"
    elseif value < 95 then "Processing forms"
    else "Forms ready"
  if label ~= computerPanelLabel then
    computerPanelLabel = label
    computerPanel.setLabel(label)
  end
end

-- ## Patients, journeys, and the executor
--
-- A running journey is the coroutine plus the action it is parked on. The TypeScript
-- needed `RunningAction`'s mapped union to keep `next`'s argument typed per action;
-- here the executor resumes with whatever the action's completion sends and the
-- journey receives it at the line that yielded — the language does the correlation.

local PATIENT_STEP = 0.3
local PATIENT_TURN_STEP = 0.1

local patients = {}

-- A resume returns `ok, yields...`; a journey error is the ok flag down with the
-- message in its place, and it surfaces as a step error that names the journey.
local function stepOf(ok, first, ...)
  if not ok then
    error("journey threw: " .. tostring(first), 0)
  end
  if first == nil then
    return nil
  end
  return { first, ... }
end

local function beginAction(patient, step)
  local name = step[1]
  if name == "walkTo" then
    return { type = name, x = step[2], z = step[3] }
  elseif name == "turnTo" then
    return { type = name, target = step[2] }
  elseif name == "waitAtCounter" then
    return { type = name, ticks = 0, beingPatient = false }
  elseif name == "waitInBed" then
    return { type = name }
  elseif name == "ask" then
    M.openDialog({ entityId = patient.id, prompt = step[2], options = step[3] })
    return { type = name }
  end
  error("journey asked for an unknown action " .. tostring(name))
end

-- Shortest signed angle from `from` to `to`, in [-π, π].
local function wrapAngle(angle: number): number
  while angle > math.pi do
    angle -= 2 * math.pi
  end
  while angle < -math.pi do
    angle += 2 * math.pi
  end
  return angle
end

-- The nag lines, at the tick offsets the original uses. Indexing a table by the tick
-- counter replaces TS's `switch (state.ticks)` exactly; `[0]` keys are why this table
-- is not an array.
local NAG_LINES = {
  [0] = "Hello!",
  [300] = "I am here for an appointment.",
  [600] = "",
  [900] = "Hello! Is anybody there?",
  [1200] = "",
  [1500] = "Hello Hello Hello!!! Does anybody work here!!!",
}

-- Runs one tick of an action; returns whether the action is complete. The same
-- switch the TypeScript wrote, shaped as the if-chain Luau has.
local function tickAction(patient, running)
  if running.type == "walkTo" then
    local dx = running.x - patient.at[1]
    local dz = running.z - patient.at[3]
    local distance = math.sqrt(dx * dx + dz * dz)
    if distance <= PATIENT_STEP then
      patient.at[1] = running.x
      patient.at[3] = running.z
      M.moveEntity(patient.id, patient.at, patient.yaw)
      return true
    end
    patient.at[1] += (dx / distance) * PATIENT_STEP
    patient.at[3] += (dz / distance) * PATIENT_STEP
    M.moveEntity(patient.id, patient.at, patient.yaw)
    return false
  elseif running.type == "turnTo" then
    local remaining = wrapAngle(running.target - patient.yaw)
    if math.abs(remaining) <= PATIENT_TURN_STEP then
      patient.yaw = running.target
      M.moveEntity(patient.id, patient.at, patient.yaw)
      return true
    end
    patient.yaw += (if remaining < 0 then -1 else 1) * PATIENT_TURN_STEP
    M.moveEntity(patient.id, patient.at, patient.yaw)
    return false
  elseif running.type == "waitAtCounter" then
    if running.outcome ~= nil then
      return true
    end
    if running.beingPatient then
      if running.ticks == 0 then
        M.narrate(patient.id, "")
      end
      running.ticks += 1
      if running.ticks > 2000 then
        running.beingPatient = false
        running.ticks = 0
      end
      return false
    end
    local line = NAG_LINES[running.ticks]
    if line ~= nil then
      M.narrate(patient.id, line)
    end
    running.ticks += 1
    return false
  elseif running.type == "waitInBed" then
    return false
  elseif running.type == "ask" then
    return running.answer ~= nil
  end
  error("tickAction: unknown action")
end

local function finishValue(running)
  if running.type == "waitAtCounter" then
    return running.outcome
  elseif running.type == "ask" then
    return running.answer or 0
  end
  return nil
end

-- Advances one patient by at most one action, synchronously, inside the step budget.
-- The TS port reached here through `step.next(result)` across a compiled chain of
-- closures; here it is the resume the whole plan was written for.
local function updatePatientJourney(patient)
  if coroutine.status(patient.co) == "dead" then
    return
  end
  if patient.running == nil then
    patient.running = beginAction(patient, patient.step)
  end
  if not tickAction(patient, patient.running) then
    return
  end
  local finished = patient.running
  patient.running = nil
  patient.step = stepOf(coroutine.resume(patient.co, finishValue(finished)))
end

local nextId = 0

local function spawnPatient(): string
  local kind = patientKinds[M.randint(1, #patientKinds)]
  local id = "patient:" .. tostring(nextId)
  nextId += 1
  local at = { PATIENT_ENTRY[1], PATIENT_ENTRY[2], PATIENT_ENTRY[3] }
  M.createNpc({
    id = id,
    at = at,
    name = kind.name,
    model = kind.model,
    scale = 3.5,
    meshResolution = 0.02,
    yaw = math.pi,
  })
  local co = coroutine.create(patientJourney)
  local patient = {
    id = id,
    name = kind.name,
    at = at,
    yaw = math.pi,
    co = co,
    step = nil,
    running = nil,
  }
  -- Running it once up front is what `compileJourney` did to the generator: the
  -- journey runs to its first yield and parks there, and nothing executes twice.
  patient.step = stepOf(coroutine.resume(co))
  table.insert(patients, patient)
  return id
end

local function waitingAtCounter(patient): boolean
  return patient.running ~= nil and patient.running.type == "waitAtCounter"
end

local function servePatient(patient)
  if waitingAtCounter(patient) then
    patient.running.outcome = "served"
  end
end

local function makePatientWaitPatiently(patient)
  if waitingAtCounter(patient) then
    patient.running.beingPatient = true
    patient.running.ticks = 0
    M.narrate(patient.id, "")
  end
end

local function photographReception()
  M.removePhoto(RECEPTION_PHOTO)
  M.takePhoto({
    id = RECEPTION_PHOTO,
    camera = RECEPTION_CAMERA,
    width = 640,
    height = 360,
  })
  M.showImage({
    id = RECEPTION_IMAGE,
    source = { photo = RECEPTION_PHOTO },
    corner = "top-right",
    width = 256,
    height = 144,
  })
  photoShown = true
end

local function clearPhoto()
  M.hideImage(RECEPTION_IMAGE)
  M.removePhoto(RECEPTION_PHOTO)
  photoShown = false
end

local function showForms()
  M.createProp({
    id = FORMS_ID,
    at = FORMS_LOCATION,
    yaw = FORMS_YAW,
    model = "forms.sdfmod",
    scale = FORMS_SCALE,
  })
  M.setEntityUseDuration(FORMS_ID, 4)
  formsShown = true
end

local function hideForm()
  M.removeEntity(FORMS_ID)
  formsShown = false
end

local function fillOutForms()
  formFilledOut = true
  hideForm()
  for _, patient in ipairs(patients) do
    if waitingAtCounter(patient) then
      makePatientWaitPatiently(patient)
      break
    end
  end
end

local function giveLabelToPatient(patient)
  servePatient(patient)
  clearPhoto()
  formFilledOut = false
  computerProcessedForms = false
  labelPrinted = false
  holdingLabel = false
end

local function patientForLabel()
  local fallback = nil
  for _, patient in ipairs(patients) do
    if waitingAtCounter(patient) then
      if patient.running.beingPatient then
        return patient
      end
      fallback = fallback or patient
    end
  end
  return fallback
end

local function printLabel()
  M.createProp({
    id = LABEL_ID,
    at = LABEL_LOCATION,
    yaw = LABEL_YAW,
    model = "label.sdfmod",
    scale = LABEL_SCALE,
  })
  local patient = patientForLabel()
  M.createHudPanel({
    id = LABEL_NAME_PANEL_ID,
    entityId = LABEL_ID,
    position = { 0, 0.3, 0 },
    yaw = 0,
    pitch = math.pi / 2,
    width = 1.3,
    height = 0.65,
    label = if patient ~= nil then patient.name else "Patient",
    value = 1,
    max = 1,
  })
  labelPrinted = true
end

local function takeLabel()
  M.removeEntity(LABEL_ID)
  holdingLabel = true
end

spawnPatient()

M.onTick(function(info)
  for _, event in ipairs(info.events) do
    local kind = event.kind
    if kind == "zone-entered" then
      M.log("arrived at " .. tostring(event.zoneId))
    elseif kind == "zone-left" then
      M.log("left " .. tostring(event.zoneId))
    elseif kind == "entity-used" and event.entityId == CAMERA_PROP then
      photographReception()
      if not formsShown and not formFilledOut then
        showForms()
      end
    elseif kind == "entity-used" and event.entityId == FORMS_ID then
      fillOutForms()
    elseif kind == "entity-used" and event.entityId == COMPUTER_PROP then
      if not computerProcessedForms then
        computerProcessedForms = true
      end
    elseif kind == "entity-used" and event.entityId == PRINTER_PROP then
      if computerProcessedForms and not labelPrinted then
        M.log("PRINTER")
        printLabel()
      end
    elseif kind == "entity-used" and event.entityId == LABEL_ID then
      takeLabel()
    elseif kind == "npc-talk" then
      if holdingLabel then
        for _, patient in ipairs(patients) do
          if waitingAtCounter(patient) then
            if event.entityId == patient.id then
              giveLabelToPatient(patient)
            end
            break
          end
        end
      end
    elseif kind == "npc-choose" then
      for _, patient in ipairs(patients) do
        if event.entityId == patient.id and waitingAtCounter(patient) == false
          and patient.running ~= nil and patient.running.type == "ask" then
          patient.running.answer = event.option
          break
        end
      end
    end
  end

  for _, patient in ipairs(patients) do
    updatePatientJourney(patient)
  end

  if photoShown then
    currentPhotoTimeoutTicks += 1
    if currentPhotoTimeoutTicks >= PHOTO_DISAPPEAR_TIMEOUT_TICKS then
      clearPhoto()
      currentPhotoTimeoutTicks = 0
    end
  end

  updateComputerPanel(info.now)
end)
