// Everything you have published, as a wall of pictures rather than a list of
// names. Its own page, not a panel over the editor: looking through past work
// is what you came to do, so it gets the whole window while you do it.
//
// A card is drawn from the record alone — the small picture, the name, and the
// extent the record carries — so a wall of them costs one small image each
// instead of a zip, six panels decoded, a volume solved and a scene rendered.
// A model published before pictures existed simply shows no picture.
import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, flush, For, onSettled, Show, useContext } from "solid-js";
import { thumbnailBlobCid, type PublishedModel } from "../atproto/models";
import { Button, Icon } from "../components/components";
import { StackerContext } from "../context";
import { load } from "../load-save";
import styles from "./ProfilePage.module.css";

/** How a model's age reads on its card. */
function published(when: string): string {
  const at = Date.parse(when);

  if (!Number.isFinite(at)) {
    return "";
  }

  const days = Math.floor((Date.now() - at) / 86_400_000);

  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  if (days < 30) {
    return `${days} days ago`;
  }

  return new Date(at).toLocaleDateString();
}

export default function ProfilePage() {
  const { atproto, setSides, setPalette, palette, updateVoxels, requestRender, requestAutoSave } =
    useContext(StackerContext);
  const navigate = useNavigate();

  const [models, setModels] = createSignal<PublishedModel[] | null>(null);
  const [addresses, setAddresses] = createSignal<Record<string, string>>({});
  const [busy, setBusy] = createSignal(false);

  const working = createMemo(() => busy() || atproto.status() === "connecting");

  /**
   * Fetches the listing, then works out where each picture is served from. The
   * addresses arrive in one write rather than one per model, so the grid is
   * laid out once instead of reflowing as each card finds its picture.
   */
  async function refresh(): Promise<void> {
    setBusy(true);

    try {
      await atproto.restore();
      // A signed-out visitor is not a failure to report; the page asks them to
      // sign in instead, so there is nothing to list and nothing to say.
      flush();

      if (atproto.account() === null) {
        setModels(null);
        return;
      }

      const found = await atproto.list();
      setModels(found);

      const located: Record<string, string> = {};
      for (const model of found) {
        const cid = thumbnailBlobCid(model.record);
        if (cid !== null) {
          located[model.rkey] = await atproto.blobAddress(model.repo, cid);
        }
      }
      setAddresses(located);
    } catch {
      // Whatever went wrong is already on `atproto.error`, and shown below.
    } finally {
      setBusy(false);
    }
  }

  // Nothing is listed until it is asked for, and opening the page is the ask.
  // Started once the page is on screen rather than while it is being built:
  // the first thing `refresh` does is say it is busy, and a component may not
  // write to reactive state while it is still assembling itself.
  onSettled(() => void refresh());

  /** Takes a model down, and drops its card without asking the network again. */
  async function remove(model: PublishedModel): Promise<void> {
    if (!window.confirm(`Take "${model.record.name}" down? This cannot be undone.`)) {
      return;
    }

    setBusy(true);

    try {
      await atproto.remove(model.rkey);
      setModels(current => current?.filter(other => other.rkey !== model.rkey) ?? null);
    } catch {
      // Already reported through `atproto.error`.
    } finally {
      setBusy(false);
    }
  }

  /** Draws `model` onto the canvas and goes back to it. */
  async function open(model: PublishedModel): Promise<void> {
    setBusy(true);

    try {
      const result = await load(await atproto.open(model), palette());
      setSides(result.sides);
      setPalette(result.palette);
      updateVoxels();
      requestRender();
      requestAutoSave();
      navigate("/");
    } catch {
      // Already reported through `atproto.error`.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class={styles.page}>
      <div class={styles.bar}>
        <Button onClick={() => navigate("/")} title="Back to the editor">
          <Icon kind="arrow-left" />
        </Button>
        <div class={styles.title}>Your models</div>
        <Show when={atproto.account()}>
          <div class={styles.who}>{atproto.account()?.handle ?? atproto.account()?.did}</div>
        </Show>
        <Button disabled={working()} onClick={() => void refresh()} title="Look again">
          <Icon kind="arrows-rotate" />
        </Button>
      </div>

      <div class={styles.body}>
        <Show when={atproto.account() === null && !working()}>
          <div class={styles.empty}>
            <div>Sign in to see what you have published.</div>
            <Button onClick={() => navigate("/")}>
              <Icon kind="arrow-left" /> Back to the editor
            </Button>
          </div>
        </Show>

        <Show when={atproto.error()}>
          <div class={styles.error}>
            <Icon kind="triangle-exclamation" /> {atproto.error()}
          </div>
        </Show>

        <Show when={models()?.length}>
          <div class={styles.grid}>
            <For each={models() ?? []}>
              {model => (
                <div class={styles.card}>
                  <button
                    class={styles.openCard}
                    disabled={working()}
                    onClick={() => void open(model)}
                    title="Open in the editor"
                  >
                    <div class={styles.preview}>
                      <Show
                        when={addresses()[model.rkey]}
                        fallback={
                          <div class={styles.noPreview}>
                            <Icon kind="cube" />
                          </div>
                        }
                      >
                        <img
                          class={styles.thumbnail}
                          src={addresses()[model.rkey]}
                          alt={model.record.name}
                          loading="lazy"
                        />
                      </Show>
                    </div>
                    <div class={styles.name}>{model.record.name}</div>
                  </button>
                  <div class={styles.meta}>
                    <span>
                      {model.record.dimensions.width}×{model.record.dimensions.height}×
                      {model.record.dimensions.depth}
                    </span>
                    <span>{published(model.record.createdAt)}</span>
                    <button
                      class={styles.takeDown}
                      disabled={working()}
                      onClick={() => void remove(model)}
                      title="Take down"
                    >
                      <Icon kind="trash" />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={models()?.length === 0}>
          <div class={styles.empty}>
            <div>Nothing published yet.</div>
            <Button onClick={() => navigate("/")}>
              <Icon kind="arrow-left" /> Back to the editor
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
