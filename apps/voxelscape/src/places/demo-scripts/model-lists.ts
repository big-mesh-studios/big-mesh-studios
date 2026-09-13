// Every built-in demo's attached model files, kept apart from `demos.ts`
// itself so a plain node script (`tools/generate-demo-model-dts.ts`) can read
// them without pulling in `demos.ts`'s own `?raw` script imports, which only
// Vite knows how to resolve.

/**
 * The models the "Get a Snack at 4 AM" demo wears: its furniture, the store's
 * fixtures, and the items lying around.
 */
export const GASA4_MODELS = [
  "bed.zip",
  "bathtub.zip",
  "sofa.zip",
  "tv.zip",
  "table.zip",
  "counter.zip",
  "stove.zip",
  "fridge.zip",
  "bench.zip",
  "manhole.zip",
  "trash.zip",
  "register.zip",
  "shelf.zip",
  "vending.zip",
  "chips.zip",
  "orange.zip",
  "colgate.zip",
  "cola.zip",
  "egg.zip",
  "friedegg.zip",
  "juice.zip",
  "milk.zip",
  "tix.zip",
  "robux.zip",
  "plate.zip",
  "npc-sable.zip",
  "npc-rook.zip",
];

/**
 * The models the "Late to School" demo wears: its neighborhood characters, the
 * fixtures in its houses, school, and shops, and the items its game hands out.
 */
export const LATE_TO_SCHOOL_MODELS = [
  "npc-laugh.zip",
  "npc-alex.zip",
  "npc-james.zip",
  "npc-bully.zip",
  "npc-nerd.zip",
  "npc-homeless.zip",
  "npc-brit.zip",
  "npc-brett.zip",
  "npc-brad.zip",
  "npc-sleepa.zip",
  "npc-champ.zip",
  "npc-teacher.zip",
  "npc-lemonade.zip",
  "npc-pothead.zip",
  "npc-santa.zip",
  "npc-obby.zip",
  "npc-littlebro.zip",
  "npc-anomaly.zip",
  "bed.zip",
  "phone.zip",
  "mirror.zip",
  "bookshelf.zip",
  "counter.zip",
  "fridge.zip",
  "tv.zip",
  "sofa.zip",
  "door.zip",
  "mailbox.zip",
  "lemonade-stand.zip",
  "bus-stop.zip",
  "flower.zip",
  "gate.zip",
  "shelf.zip",
  "vending.zip",
  "slushie-machine.zip",
  "arcade.zip",
  "boarded-machine.zip",
  "dumpster.zip",
  "bench.zip",
  "desk.zip",
  "chair.zip",
  "locker.zip",
  "cafeteria-table.zip",
  "plate.zip",
  "poster.zip",
  "plush.zip",
  "banana.zip",
  "chips.zip",
  "key.zip",
  "matches.zip",
  "slushie.zip",
  "pizza.zip",
  "hotdog.zip",
  "salad.zip",
  "taco.zip",
  "historybook.zip",
  "roaster.zip",
  "hat.zip",
  "lemonade.zip",
  "foodbag.zip",
  "bean.zip",
  "cola.zip",
  "tix.zip",
];

/** The model the "Zombies" demo wears: the one figure its whole population is drawn as. */
export const ZOMBIES_MODELS = ["zombie.zip"];

/**
 * The models the "Zombies: The Mansion" demo wears: the horde itself, the
 * doors and window boards the breaches stand in, the racks the guns hang on,
 * and the furniture the rooms and courtyard answer with.
 */
export const ZOMBIES_MANSION_MODELS = [
  "zombie.zip",
  "door.zip",
  "bench.zip",
  "shelf.zip",
  "table.zip",
  "trash.zip",
  "poster.zip",
];

/**
 * The models the "Don't Poop Yourself at School" demo wears: lobby pickup,
 * hazard props, the four school staff, and the platform models used throughout
 * the nine-section course.
 */
export const DONT_POOP_MODELS = [
  "soap.zip",
  "wet-floor.zip",
  "platform.zip",
  "toilet-roll.zip",
  "npc-sable.zip",
  "npc-bully.zip",
  "npc-brad.zip",
  "npc-teacher.zip",
];
