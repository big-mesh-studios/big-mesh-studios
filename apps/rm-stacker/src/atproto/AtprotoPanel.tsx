// Who you are signed in as, and publishing what is on the canvas. Looking
// through what has already been published is a page of its own — a wall of
// pictures needs room this panel does not have — so this stays the small strip
// of controls that belong beside the editor.
//
// It reads the model out of the same store the canvas draws from and writes it
// with the same `save` the file menu uses, so what is published is byte for
// byte the file that would have been downloaded.
import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, flush, Show, useContext } from "solid-js";
import { Button, Icon } from "../components/components";
import { StackerContext } from "../context";
import { save } from "../load-save";
import styles from "./AtprotoPanel.module.css";
import { thumbnailFromSides } from "./thumbnail";

/** What a model is called when the editor has nothing better to suggest. */
const DEFAULT_NAME = "sprite-stack";

export function AtprotoPanel() {
  const { atproto, sides, palette, dimensions } = useContext(StackerContext);
  const navigate = useNavigate();

  const [name, setName] = createSignal(DEFAULT_NAME);
  const [handle, setHandle] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [note, setNote] = createSignal<string | null>(null);

  /** Whether anything is out on the network, this panel's own doing or not. */
  const working = createMemo(() => busy() || atproto.status() === "connecting");

  /**
   * Runs one thing that talks to the network, keeping the panel from starting a
   * second while it is out and showing `pending` until it is done. What the
   * action hands back is what the panel then says about it, and a failure says
   * nothing: the reason is already on `atproto.error`, and reporting it twice
   * in two voices reads as two separate problems.
   */
  async function attempt(pending: string, action: () => Promise<string | null>): Promise<void> {
    setBusy(true);
    setNote(pending);

    try {
      setNote(await action());
    } catch {
      setNote(null);
    } finally {
      setBusy(false);
    }
  }

  function onSignIn(): Promise<void> {
    return attempt("signing in…", async () => {
      await atproto.signIn(handle());
      // A sign-in reports its own failure through `atproto.error` rather than
      // by throwing, so what happened is read off the account it left behind.
      flush();

      if (atproto.account() !== null) {
        setHandle("");
      }

      return null;
    });
  }

  function onPublish(): Promise<void> {
    return attempt("publishing…", async () => {
      const published = await atproto.publish({
        name: name(),
        file: await save(sides(), palette()),
        dimensions: dimensions(),
        thumbnail: thumbnailFromSides(sides(), palette()),
      });

      return `published as ${published.rkey}`;
    });
  }

  return (
    <div class={styles.panel}>
      <Show
        when={atproto.account() !== null}
        fallback={
          <div class={styles.section}>
            <div class={styles.heading}>Sign in to publish</div>
            <div class={styles.row}>
              <input
                class={[styles.input, styles.grow]}
                placeholder="you.bsky.social"
                value={handle()}
                disabled={working()}
                onInput={event => setHandle(event.currentTarget.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    void onSignIn();
                  }
                }}
              />
              <Button
                disabled={working() || handle().trim() === ""}
                onClick={() => void onSignIn()}
                title="Sign in"
              >
                <Icon kind="arrow-right-to-bracket" />
              </Button>
            </div>
          </div>
        }
      >
        <div class={styles.section}>
          <div class={styles.heading}>Signed in as</div>
          <div class={styles.row}>
            <div class={[styles.account, styles.grow]}>
              {atproto.account()?.handle ?? atproto.account()?.did}
            </div>
            <Button disabled={working()} onClick={() => void atproto.signOut()} title="Sign out">
              <Icon kind="arrow-right-from-bracket" />
            </Button>
          </div>
        </div>

        <div class={styles.separator} />

        <div class={styles.section}>
          <div class={styles.heading}>Publish this model</div>
          <div class={styles.row}>
            <input
              class={[styles.input, styles.grow]}
              placeholder={DEFAULT_NAME}
              value={name()}
              disabled={working()}
              onInput={event => setName(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  void onPublish();
                }
              }}
            />
            <Button
              disabled={working() || name().trim() === ""}
              onClick={() => void onPublish()}
              title="Publish"
            >
              <Icon kind="cloud-arrow-up" />
            </Button>
          </div>
          <Button onClick={() => navigate("/profile")}>
            <Icon kind="grip" /> See everything you have published
          </Button>
        </div>
      </Show>

      <Show when={note()}>
        <div class={styles.note}>{note()}</div>
      </Show>
      <Show when={atproto.error()}>
        <div class={styles.error}>
          <Icon kind="triangle-exclamation" /> {atproto.error()}
        </div>
      </Show>
    </div>
  );
}
