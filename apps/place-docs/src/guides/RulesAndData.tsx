import { Note, Sample } from "../Sample";

/**
 * The rules a place plays by and what it remembers: teams and scoring, items,
 * and the three scopes of remembered value.
 */
export function RulesAndData() {
  return (
    <section class="guide" id="rules-and-data">
      <h2>Rules and data</h2>

      <p>
        Everything so far has been a place that <em>exists</em>. This is the
        part that makes it a game: what a player has done, what it earned, and
        what the place remembers between visits.
      </p>

      <h3>Scoring</h3>
      <p>
        Scoring is a script&rsquo;s own arithmetic. A strike arrives as a fact
        and the script decides what it is worth — there is no built-in score,
        because what a hit means differs from place to place.
      </p>
      <Sample caption="A strike reported, and scored by the place">
        {`onTick((clockMs, events) => {
  for (const event of events) {
    if (event.kind === "entity-hit") {
      // The place decides what a hit is worth; the world only reports it.
      score[event.producer] = (score[event.producer] ?? 0) + event.amount;
    }
  }
});`}
      </Sample>
      <p>
        A number kept per player under a key is what the world can rank across
        players, which is what a leaderboard is: <code>player-value</code>{" "}
        writes it, <code>showLeaderboard</code> displays it, and it should be
        written whenever it changes.
      </p>

      <h3>Teams</h3>
      <p>
        <code>team-define</code> declares the teams a place has and{" "}
        <code>player-team</code> puts a player on one. Teams are a name and a
        colour, and nothing more — what a team <em>does</em> is still the
        script&rsquo;s, driven by the same facts.
      </p>

      <h3>Items</h3>
      <p>
        An item is declared with <code>item-define</code>, handed out with{" "}
        <code>item-give</code>, and taken with <code>item-take</code>. What
        happens when one is used arrives as an <code>item-used</code> fact, so
        the item is a name the world tracks and the meaning is the
        script&rsquo;s.
      </p>

      <h3>Ending</h3>
      <p>
        Every ending a place defines is listed by <code>getEndings</code>, and{" "}
        <code>ending</code> is how one is reached for a player — a title and the
        text it ends on. <code>restart</code> puts them back at the start, and{" "}
        <code>teleport</code> sends them to another place, optionally carrying
        data across with it.
      </p>

      <h3>What a place remembers</h3>
      <p>
        A place remembers a <strong>data value</strong> — a string, a finite
        number, or a boolean — under a key, at one of three{" "}
        <strong>scopes</strong>. The scope is the whole decision:
      </p>
      <ul>
        <li>
          <code>player</code> — one player&rsquo;s own value, kept with them
          wherever they play the place.
        </li>
        <li>
          <code>global</code> — one value shared by everyone in the place, for
          something a run changes for everybody at once.
        </li>
        <li>
          <code>account</code> — one value for the signed-in account, readable
          across places.
        </li>
      </ul>
      <Sample caption="A coin count per player, and a leaderboard from it">
        {`import { dispatch, getData, onTick, savePlayerData } from "voxelscape";

const coins = getData("player", player, "coins") ?? 0;

savePlayerData("coins", coins + 5, player);
dispatch("player-value", { player, key: "coins", value: coins + 5 });`}
      </Sample>
      <p>
        A read is <code>getData</code>, a write is <code>savePlayerData</code>,{" "}
        <code>saveGlobalData</code>, or <code>saveAccountData</code>, and a
        deletion is <code>deletePlayerData</code> or{" "}
        <code>deleteAccountData</code>. A missing value reads as{" "}
        <code>null</code> rather than throwing, so a place can ask for something
        it has never written.
      </p>
      <Note>
        <code>requestData</code> is the asynchronous form: it asks the world to
        read, and the answer arrives as a <code>data-loaded</code> fact on a
        later tick rather than in the return value. Use it when the read is
        across the network and the script should not block; <code>getData</code>{" "}
        is the one that answers now.
      </Note>

      <h3>Badges and the catalog</h3>
      <p>
        <code>awardBadge</code> awards a badge, remembered as that
        player&rsquo;s place data, and comes back as a <code>badge-earned</code>{" "}
        fact so a place can mark the moment. <code>openCatalog</code> opens the
        world&rsquo;s catalog — the search over published places a player enters
        a new one from — and <code>teleport</code> is how a script sends them
        there.
      </p>
    </section>
  );
}
