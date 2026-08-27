// The editor's one view onto atproto: sign in, publish what is on the canvas,
// and open anything already published to that account. It reads the model out
// of the same store the canvas draws from and writes it with the same `save`
// the file menu uses, so what is published is byte for byte the file that
// would have been downloaded.
import { createMemo, createSignal, flush, For, Show, useContext } from "solid-js";
import { Button, Icon } from "../components/components";
import { StackerContext } from "../context";
import { load, save } from "../load-save";
import styles from "./AtprotoPanel.module.css";
import type { PublishedModel } from "./models";

/** What a model is called when the editor has nothing better to suggest. */
const DEFAULT_NAME = "sprite-stack";

export function AtprotoPanel() {
  const {
    atproto,
    sides,
    setSides,
    palette,
    setPalette,
    dimensions,
    updateVoxels,
    requestRender,
    requestAutoSave,
  } = useContext(StackerContext);

  const [name, setName] = createSignal(DEFAULT_NAME);
  const [handle, setHandle] = createSignal("");
  const [models, setModels] = createSignal<PublishedModel[] | null>(null);
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

  /** Lists what the account has published. */
  function refresh(): Promise<void> {
    return attempt("looking…", async () => {
      const found = await atproto.list();
      setModels(found);
      return found.length === 0 ? "nothing published yet" : null;
    });
  }

  function onSignIn(): Promise<void> {
    return attempt("signing in…", async () => {
      await atproto.signIn(handle());
      // A sign-in reports its own failure through `atproto.error` rather than
      // by throwing, so what happened is read off the account it left behind.
      flush();

      if (atproto.account() === null) {
        return null;
      }

      setHandle("");
      setModels(await atproto.list());

      return null;
    });
  }

  function onPublish(): Promise<void> {
    return attempt("publishing…", async () => {
      const published = await atproto.publish({
        name: name(),
        file: await save(sides(), palette()),
        dimensions: dimensions(),
      });
      // Shown straight away rather than by listing the repository again: the
      // record is already known, and this is the one model whose contents the
      // editor does not have to be told about.
      setModels(current =>
        current === null
          ? [published]
          : [published, ...current.filter(model => model.rkey !== published.rkey)],
      );

      return `published as ${published.rkey}`;
    });
  }

  /** Draws `model` onto the canvas, in place of whatever is there now. */
  function onOpen(model: PublishedModel): Promise<void> {
    return attempt("opening…", async () => {
      const result = await load(await atproto.open(model), palette());
      setSides(result.sides);
      setPalette(result.palette);
      setName(model.record.name);
      updateVoxels();
      requestRender();
      requestAutoSave();

      return `opened ${model.record.name}`;
    });
  }

  function onRemove(model: PublishedModel): Promise<void> {
    if (!window.confirm(`Take "${model.record.name}" down? This cannot be undone.`)) {
      return Promise.resolve();
    }

    return attempt("taking down…", async () => {
      await atproto.remove(model.rkey);
      setModels(current => current?.filter(other => other.rkey !== model.rkey) ?? null);

      return null;
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
        </div>

        <div class={styles.separator} />

        <div class={styles.section}>
          <div class={styles.row}>
            <div class={[styles.heading, styles.grow]}>Your models</div>
            <Button disabled={working()} onClick={() => void refresh()} title="Look again">
              <Icon kind="arrows-rotate" />
            </Button>
          </div>
          <Show when={models()?.length}>
            <div class={styles.models}>
              <For each={models() ?? []}>
                {model => (
                  <div class={styles.model}>
                    <Button
                      class={styles.modelName}
                      disabled={working()}
                      onClick={() => void onOpen(model)}
                      title="Open"
                    >
                      {model.record.name}
                    </Button>
                    <Button
                      disabled={working()}
                      onClick={() => void onRemove(model)}
                      title="Take down"
                    >
                      <Icon kind="trash" />
                    </Button>
                  </div>
                )}
              </For>
            </div>
          </Show>
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
