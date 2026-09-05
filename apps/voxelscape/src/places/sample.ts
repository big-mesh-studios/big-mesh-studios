// A small scripted place, written as a place creator would write it: two NPCs
// stand in the world, each running a short dialog tree, and picking an option
// makes the script answer — closing the dialog, or ending with a toast. It is
// the working example the script host is tested against, and the first script
// a player can load with the console while the world wires its dialog surface.
export const SAMPLE_PLACE_SCRIPT = String.raw`
var started = false;
var state = {};
var SHOP = "sable";
var GATE = "rook";

function key(player, npcId) { return player + "|" + npcId; }

function reply(player, npcId, prompt, options) {
  engine.dispatch("dialog", JSON.stringify({ player: player, npcId: npcId, prompt: prompt, options: options }));
}

function end(player, npcId, text) {
  engine.dispatch("dialog-close", JSON.stringify({ player: player, npcId: npcId }));
  engine.dispatch("toast", JSON.stringify({ player: player, text: text }));
}

function spawn() {
  engine.dispatch("npc", JSON.stringify({ id: SHOP, x: 40, z: 12, name: "Sable" }));
  engine.dispatch("npc", JSON.stringify({ id: GATE, x: -40, z: 12, name: "Rook" }));
}

// The shop's tree: greetings loop until an option that ends the talk.
function shopNode(player, node, option) {
  var k = key(player, SHOP);
  if (node === "greeting") {
    if (option === 0) {
      state[k] = "offer";
      reply(player, SHOP, "The potions are behind me... for a price.", ["I'll take a potion.", "Never mind."]);
      return;
    }
    end(player, SHOP, "Come back when your pockets are full.");
    return;
  }
  if (node === "offer") {
    if (option === 0) {
      end(player, SHOP, "Sold! A potion of courage, fresh from the cellar.");
      return;
    }
    state[k] = "greeting";
    reply(player, SHOP, "The shelves will still be here.", ["Buy a potion.", "Goodbye."]);
    return;
  }
}

function gateNode(player, node, option) {
  var k = key(player, GATE);
  if (node === "greeting") {
    if (option === 0) {
      state[k] = "lore";
      reply(player, GATE, "Beyond lies the broken mesa. Few come back.", ["What do you guard?", "Thanks, farewell."]);
      return;
    }
    end(player, GATE, "Mind the fog.");
    return;
  }
  if (node === "lore") {
    if (option === 0) {
      end(player, GATE, "A key of cloudstone, they say. I have seen neither.");
      return;
    }
    reply(player, GATE, "The mesa keeps its own counsel.", ["What do you guard?", "Thanks, farewell."]);
    return;
  }
}

function bmsTick(clockMs, eventsJson) {
  if (!started) {
    started = true;
    spawn();
  }
  var events = JSON.parse(eventsJson);
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var k = key(e.producer, e.npcId);
    if (e.kind === "npc-talk") {
      state[k] = "greeting";
      if (e.npcId === SHOP) {
        reply(e.producer, SHOP, "Welcome, traveller. My wares are humble.", ["Buy a potion.", "Goodbye."]);
      } else {
        reply(e.producer, GATE, "The way is shut until the mist lifts.", ["What lies beyond?", "Farewell."]);
      }
    } else if (e.kind === "npc-choose") {
      var node = state[k];
      if (!node) { continue; }
      if (e.npcId === SHOP) { shopNode(e.producer, node, e.option); }
      else { gateNode(e.producer, node, e.option); }
    } else if (e.kind === "npc-leave") {
      delete state[k];
    }
  }
}
`;
