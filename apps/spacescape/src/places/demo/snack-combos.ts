/**
 * The breakfast machine's pair table: what two items make, and what the machine says about it.
 *
 * ## Why this is its own file
 *
 * **Thirty-three rows of prose in the middle of a state machine is a state machine nobody can
 * read.** The table is data — every row is `[first, second, name, comment]` and nothing in it
 * runs — and it is the largest single thing in the demo. `snack.ts` imports it and asks one
 * question of it.
 *
 * **Copied entry for entry from `apps/voxelscape/src/places/demo-scripts/gasa4.ts`**, comments
 * and all, because this is a port and a joke that is not the demo's joke is a bug in the port.
 *
 * ## What is *not* a pair
 *
 * Most of what a player can feed it is not in the table at all, and the two catch-alls at the
 * bottom are the whole of what happens then: two drinks is not a breakfast, one food is a
 * breakfast because it is food, and everything else is a breakfast "technically". The table is
 * for the pairs somebody bothered to write a line about.
 */

/** `[first, second, title, comment]`. Which of the two is first does not matter. */
export const COMBOS: ReadonlyArray<readonly [string, string, string, string]> =
  [
    [
      "friedegg",
      "milk",
      "Perfect Breakfast",
      "Wow. This is it. This is the perfect breakfast. You did it.",
    ],
    [
      "egg",
      "milk",
      "Pergfect Breakfast",
      "What? Trying to make cake? You're making breakfast, not dessert. Cook the egg.",
    ],
    ["chips", "milk", "Soggy Chips", "Milk and chips. Kinda has a ring to it."],
    [
      "chips",
      "cola",
      "Stomach-aching Breakfast",
      "You ever try pilk? Well, Bloxy Colas aren't that.",
    ],
    [
      "chips",
      "witchbrew",
      "Stomach-aching Breakfast",
      "You ever try pilk? Well, Witch Brews aren't that.",
    ],
    [
      "hotbrew",
      "cola",
      "Balanced Beverages",
      "One cold drink. One hot drink. It cancels out.",
    ],
    ["milk", "colgate", "Dairy Mint", "At least it isn't orange juice."],
    ["milk", "icecream", "Lotta Dairy", "That's a lot of dairy."],
    [
      "fuel",
      "milk",
      "Fuel Just Isn't Good",
      "I don't have anything funny to say. You just put fuel in your breakfast.",
    ],
    [
      "fuel",
      "candy",
      "This Isn't Any Better",
      "Just because this is a limited time item does not mean it mixes well with fuel.",
    ],
    ["candy", "milk", "Spooky", "Milk, but spooky."],
    [
      "chips",
      "friedegg",
      "Chips and Eggs",
      "Weird combination, but at least you had the decency to cook the egg.",
    ],
    ["chips", "egg", "Chips and Eggs", "Weird combination. But okay."],
    [
      "colgate",
      "chips",
      "Mint Flavored Chips",
      "Toothpaste isn't a good appetizer.",
    ],
    [
      "chips",
      "icecream",
      "Chips and Ice Cream",
      "I knew two imps named Chips and Ice Cream.",
    ],
    ["juice", "chips", "Orange Flavored Chips", "Now it's soggy and orange."],
    [
      "candy",
      "chips",
      "Halloween Treats",
      "Looks like you came back from trick or treating.",
    ],
    [
      "candy",
      "chips",
      "Sugar Rush",
      "You're never going to sleep at this rate.",
    ],
    [
      "cola",
      "colgate",
      "Rotting Teeth",
      "I would say something scientific about why you shouldn't brush your teeth after drinking soda, but I kinda don't want to.",
    ],
    ["patty", "milk", "Epic Breakfast", "A breakfast for gamers."],
    [
      "icecream",
      "cola",
      "Ice Cream Soda",
      "Hey, not a bad dessert. Not a breakfast though.",
    ],
    [
      "candy",
      "hotbrew",
      "Unhealthy Halloween Snack",
      "What are you trying to do? Witchcraft? Hot!",
    ],
    [
      "icecream",
      "hotbrew",
      "Melted Ice Cream",
      "Well now that hot drink is gonna melt the ice cream.",
    ],
    [
      "egg",
      "hotbrew",
      "That's Not How That Works",
      "You can't just pour a hot drink onto an egg to cook it.",
    ],
    [
      "egg",
      "juice",
      "Alternative Pergfect Breakfast",
      "The egg isn't cooked, but orange juice is a good alternative to milk. I'll give you that.",
    ],
    [
      "friedegg",
      "juice",
      "Alternative Perfect Breakfast",
      "Okay, orange juice is a good alternative. I'll give you this one.",
    ],
    [
      "juice",
      "icecream",
      "Orange Ice Cream",
      "Hey, that actually kinda sounds good.",
    ],
    [
      "juice",
      "cola",
      "Orange Soda",
      "Okay, no, you can't just put orange juice into a soda that already has flavor to make orange soda.",
    ],
    [
      "candy",
      "juice",
      "Orange Candy",
      "The sweetness of the candy and the sour of the juice? No thanks.",
    ],
    [
      "icecream",
      "colgate",
      "Not So Mint Ice Cream",
      "This isn't how you make mint ice cream. I mean, the toothpaste isn't good either, but...",
    ],
    [
      "egg",
      "colgate",
      "Toothpasted Egg",
      "Please stop smearing the toothpaste on the egg like ketchup.",
    ],
    [
      "candy",
      "colgate",
      "Mint Candy",
      "It's a good idea to brush your teeth after eating some Halloween candy. The problem here is that you drank the toothpaste.",
    ],
    [
      "icecream",
      "egg",
      "Egged Ice Cream",
      "The ice cream already has eggs as one of its ingredients!",
    ],
  ];

/**
 * What the machine can name as the food half of a pair, and as the drink half.
 *
 * **Two sets rather than a property of the item**, because the machine's question is "is this a
 * drink" and nothing else in the demo asks it. An item that is a food and a drink would be a
 * different game.
 */
export const FOOD: ReadonlySet<string> = new Set([
  "friedegg",
  "egg",
  "patty",
  "sandvich",
  "chips",
]);
export const DRINK: ReadonlySet<string> = new Set([
  "milk",
  "cola",
  "juice",
  "witchbrew",
  "hotbrew",
]);

/**
 * What the machine makes of a pair: the line it says, and the ending card's title.
 *
 * **The title is always `"Breakfast"`.** Every one of these is the player having made breakfast,
 * however badly, and the thirteen endings are distinguished by *how* — the card's text is where
 * the difference lives. Returning a title as well is what lets the pair table be the only place
 * that decides the machine's outcome.
 */
export const machineResult = (
  a: string,
  b: string,
): readonly [string, string] => {
  for (const [first, second, name, comment] of COMBOS) {
    if ((a === first && b === second) || (a === second && b === first)) {
      return [`${name}. ${comment}`, "Breakfast"];
    }
  }
  if (DRINK.has(a) && DRINK.has(b)) {
    return ["Food? You got the drinks. But where's the food?", "Breakfast"];
  }
  if (FOOD.has(a) || FOOD.has(b)) {
    return ["Breakfast? ...It is food, at least.", "Breakfast"];
  }
  return ["Breakfast? ...It is food, technically.", "Breakfast"];
};
