// One place for everything that is not drawing: what you are working on, what
// you can do with it, and everything else you could open instead.
//
// It sits over the editor rather than replacing it, and it leads with the
// drawing that is open. That is the whole reason it is not a page of its own:
// "export" and "publish" have to plainly mean *this* model, and a page that
// covers the canvas takes away the very thing those words refer to.
//
// Below that, everything you could open — the models published to your account
// and the files on disk this editor has seen. A card is drawn from what is
// already known about it, so a wall of them costs one small picture each rather
// than a zip, six panels decoded, a volume solved and a scene rendered.
import { fileOpen, fileSave, type FileWithHandle } from "browser-fs-access";
import {
  createEffect,
  createMemo,
  createSignal,
  flush,
  For,
  onCleanup,
  Show,
  useContext,
  type Accessor,
} from "solid-js";
import { thumbnailBlobCid, type PublishedModel } from "../atproto/models";
import { thumbnailFromSides } from "../atproto/thumbnail";
import { Button, Icon, IconButton } from "../components/components";
import { StackerContext } from "../context";
import { homeName } from "../home";
import { load, save } from "../load-save";
import {
  forgetFile,
  listRecentFiles,
  mayRead,
  rememberFile,
  type RecentFile,
} from "../recent-files";
import styles from "./ProfileModal.module.css";

/** One thing you could open, whichever kind of home it has. */
type Card =
  | { kind: "published"; key: string; name: string; at: number; model: PublishedModel }
  | { kind: "file"; key: string; name: string; at: number; file: RecentFile };

/** How old a card reads. */
function when(at: number): string {
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

export function ProfileModal(props: { open: boolean; onClose: () => void }) {
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
    home,
    setHome,
    reset,
    undoRedoManager,
  } = useContext(StackerContext);

  const [cards, setCards] = createSignal<Card[]>([]);
  const [previews, setPreviews] = createSignal<Record<string, string>>({});
  const [busy, setBusy] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  const [handle, setHandle] = createSignal("");
  const [name, setName] = createSignal("");
  const [note, setNote] = createSignal<string | null>(null);

  const working = createMemo(() => busy() || atproto.status() === "connecting");

  // Every picture drawn from bytes is an address this modal made, and the
  // browser holds what is behind it until it is handed back.
  let held: string[] = [];
  const hold = (bytes: Uint8Array): string => {
    const address = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
    held.push(address);
    return address;
  };
  const release = () => {
    held.forEach(address => URL.revokeObjectURL(address));
    held = [];
  };
  onCleanup(release);

  /**
   * A picture of what is on the canvas, made only while the modal is open —
   * drawing one per stroke behind a closed modal would be work nobody sees.
   */
  const currentPreview: Accessor<string | null> = createMemo(() =>
    props.open ? hold(thumbnailFromSides(sides(), palette())) : null,
  );

  /** What the model is called, following its home until somebody types over it. */
  const shown = createMemo(() => (name() === "" ? homeName(home()) : name()));

  /** Gathers both kinds and works out where each picture comes from. */
  async function refresh(): Promise<void> {
    setBusy(true);

    try {
      const found: Card[] = [];
      const addresses: Record<string, string> = {};

      for (const file of await listRecentFiles()) {
        const key = `file:${file.id}`;
        found.push({ kind: "file", key, name: file.name, at: file.lastOpenedAt, file });
        addresses[key] = hold(file.thumbnail);
      }

      await atproto.restore();
      flush();

      if (atproto.account() !== null) {
        for (const model of await atproto.list()) {
          const key = `published:${model.rkey}`;
          found.push({
            kind: "published",
            key,
            name: model.record.name,
            at: Date.parse(model.record.createdAt),
            model,
          });
          const cid = thumbnailBlobCid(model.record);
          if (cid !== null) {
            addresses[key] = await atproto.blobAddress(model.repo, cid);
          }
        }
      }

      setCards(found.sort((a, b) => b.at - a.at));
      setPreviews(addresses);
    } catch {
      // Whatever went wrong is already on `atproto.error`, and shown below.
    } finally {
      setReady(true);
      setBusy(false);
    }
  }

  // Fetched the first time the modal is opened and not again on its own, so
  // that opening it to export something does not go back to the network every
  // time. Tracked as a plain flag rather than reactive state, because this runs
  // where a reactive read would go unnoticed and a write would be refused.
  let asked = false;
  createEffect(
    () => props.open,
    isOpen => {
      if (isOpen && !asked) {
        asked = true;
        void refresh();
      }
    },
  );

  /** Whether `card` is the drawing open in the editor right now. */
  function isOpenHere(card: Card): boolean {
    const where = home();
    return card.kind === "published"
      ? where.kind === "published" && where.rkey === card.model.rkey
      : where.kind === "file" && where.id === card.file.id;
  }

  /** The zip behind a card, from the account that holds it or from the disk. */
  async function contentsOf(card: Card): Promise<Blob | null> {
    if (card.kind === "published") {
      return atproto.open(card.model);
    }

    if (!(await mayRead(card.file.handle))) {
      window.alert(`"${card.file.name}" cannot be read without permission.`);
      return null;
    }

    return card.file.handle.getFile();
  }

  async function run(what: string, action: () => Promise<string | null>): Promise<void> {
    setBusy(true);
    setNote(what);

    try {
      setNote(await action());
    } catch {
      setNote(null);
    } finally {
      setBusy(false);
    }
  }

  /** Writes what is on the canvas out to a file of the person's choosing. */
  function exportCurrent(): Promise<void> {
    return run("exporting…", async () => {
      await fileSave(await save(sides(), palette()), {
        fileName: `${shown()}.zip`,
        extensions: [".zip"],
        description: "Sprite stack",
      });

      return null;
    });
  }

  /** Puts what is on the canvas in the account, which then becomes its home. */
  function publishCurrent(): Promise<void> {
    return run("publishing…", async () => {
      const published = await atproto.publish({
        name: shown(),
        file: await save(sides(), palette()),
        dimensions: dimensions(),
        thumbnail: thumbnailFromSides(sides(), palette()),
      });
      setHome({ kind: "published", rkey: published.rkey, name: published.record.name });
      await refresh();

      return `published as ${published.rkey}`;
    });
  }

  function signIn(): Promise<void> {
    return run("signing in…", async () => {
      await atproto.signIn(handle());
      // A sign-in reports its failure through `atproto.error` rather than by
      // throwing, so what happened is read off the account it left behind.
      flush();

      if (atproto.account() !== null) {
        setHandle("");
        await refresh();
      }

      return null;
    });
  }

  /** Draws a model onto the canvas, makes it the drawing's home, and stands aside. */
  function open(card: Card): Promise<void> {
    return run("opening…", async () => {
      const contents = await contentsOf(card);

      if (contents === null) {
        return null;
      }

      const result = await load(contents, palette());
      setSides(result.sides);
      setPalette(result.palette);
      setHome(
        card.kind === "published"
          ? { kind: "published", rkey: card.model.rkey, name: card.model.record.name }
          : { kind: "file", id: card.file.id, handle: card.file.handle, name: card.file.name },
      );
      setName("");
      updateVoxels();
      requestRender();
      requestAutoSave();
      props.onClose();

      return null;
    });
  }

  /** Takes a published model down, or forgets a file without touching the disk. */
  function drop(card: Card): Promise<void> {
    const asked =
      card.kind === "published"
        ? `Take "${card.name}" down? This cannot be undone.`
        : `Forget "${card.name}"? The file on disk is left alone.`;

    if (!window.confirm(asked)) {
      return Promise.resolve();
    }

    return run("removing…", async () => {
      if (card.kind === "published") {
        await atproto.remove(card.model.rkey);
      } else {
        await forgetFile(card.file.id);
      }
      setCards(current => current.filter(other => other.key !== card.key));

      return null;
    });
  }

  /** Opens a file from disk, remembering it so it shows here from now on. */
  function openFromDisk(): Promise<void> {
    return run("opening…", async () => {
      const file = (await fileOpen<false>({
        extensions: [".zip"],
        description: "Sprite stack",
        mimeTypes: ["application/zip"],
      })) as FileWithHandle;
      const result = await load(file, palette());

      setSides(result.sides);
      setPalette(result.palette);
      updateVoxels();
      flush();

      if (file.handle === undefined) {
        // This browser hands over the contents and nothing else, so there is
        // nothing to remember the file by afterwards.
        setHome({ kind: "nowhere" });
      } else {
        const remembered = await rememberFile({
          handle: file.handle,
          thumbnail: thumbnailFromSides(sides(), palette()),
          dimensions: dimensions(),
        });
        setHome({
          kind: "file",
          id: remembered.id,
          handle: file.handle,
          name: file.handle.name,
        });
        await refresh();
      }

      setName("");
      requestRender();
      requestAutoSave();
      props.onClose();

      return null;
    });
  }

  return (
    <div class={styles.modal}>
      <div class={styles.bar}>
        <div class={styles.title}>Your files</div>
        <Show
          when={atproto.account()}
          fallback={
            <>
              <input
                class={styles.input}
                placeholder="you.bsky.social"
                value={handle()}
                disabled={working()}
                onInput={event => setHandle(event.currentTarget.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    void signIn();
                  }
                }}
              />
              <IconButton
                kind="arrow-right-to-bracket"
                label="Sign in"
                disabled={working() || handle().trim() === ""}
                onClick={() => void signIn()}
              />
            </>
          }
        >
          <div class={styles.who}>{atproto.account()?.handle ?? atproto.account()?.did}</div>
          <Button disabled={working()} onClick={() => void atproto.signOut()} title="Sign out">
            <Icon kind="arrow-right-from-bracket" />
          </Button>
        </Show>
      </div>

      <div class={styles.current}>
        <div class={styles.currentPreview}>
          <Show when={currentPreview()} fallback={<Icon kind="cube" />}>
            <img class={styles.thumbnail} src={currentPreview()!} alt="What you are working on" />
          </Show>
        </div>
        <div class={styles.currentDetail}>
          <input
            class={styles.input}
            value={shown()}
            disabled={working()}
            onInput={event => setName(event.currentTarget.value)}
          />
          <div class={styles.where}>
            <Show when={home().kind === "published"}>
              <Icon kind="cloud" /> published
            </Show>
            <Show when={home().kind === "file"}>
              <Icon kind="floppy-disk" /> opened from a file
            </Show>
            <Show when={home().kind === "nowhere"}>not saved anywhere yet</Show>
            <span>
              · {dimensions().width}×{dimensions().height}×{dimensions().depth}
            </span>
          </div>
        </div>
        <div class={styles.currentActions}>
          <IconButton
            kind="file-arrow-down"
            label="Export"
            disabled={working()}
            onClick={() => void exportCurrent()}
          />
          <IconButton
            kind="cloud-arrow-up"
            label="Publish"
            disabled={working() || atproto.account() === null}
            title={atproto.account() === null ? "Sign in to publish" : "Publish to your account"}
            onClick={() => void publishCurrent()}
          />
        </div>
      </div>

      <div class={styles.body}>
        <div class={styles.bar} style={{ border: "none", padding: "0" }}>
          <div class={styles.heading}>Everything you can open</div>
          <IconButton
            kind="plus"
            label="New"
            disabled={working()}
            onClick={() => {
              if (!window.confirm("Start a new file? This will discard your current work.")) {
                return;
              }
              undoRedoManager.clear();
              reset();
              setName("");
              props.onClose();
            }}
          />
          <IconButton
            kind="folder-open"
            label="Open file"
            disabled={working()}
            onClick={() => void openFromDisk()}
          />
          <Button disabled={working()} onClick={() => void refresh()} title="Look again">
            <Icon kind="arrows-rotate" />
          </Button>
        </div>

        <Show when={note()}>
          <div class={styles.note}>{note()}</div>
        </Show>
        <Show when={atproto.error()}>
          <div class={styles.error}>
            <Icon kind="triangle-exclamation" /> {atproto.error()}
          </div>
        </Show>

        <Show
          when={cards().length}
          fallback={
            <Show when={ready()}>
              <div class={styles.empty}>Nothing here yet.</div>
            </Show>
          }
        >
          <div class={styles.grid}>
            <For each={cards()}>
              {card => (
                <div class={[styles.card, isOpenHere(card) ? styles.openHere : ""]}>
                  <button
                    class={styles.openCard}
                    disabled={working()}
                    onClick={() => void open(card)}
                    title="Open in the editor"
                  >
                    <div class={styles.preview}>
                      <Show
                        when={previews()[card.key]}
                        fallback={
                          <div class={styles.noPreview}>
                            <Icon kind="cube" />
                          </div>
                        }
                      >
                        <img
                          class={styles.thumbnail}
                          src={previews()[card.key]}
                          alt={card.name}
                          loading="lazy"
                        />
                      </Show>
                    </div>
                    <div class={styles.name}>
                      <Icon kind={card.kind === "published" ? "cloud" : "floppy-disk"} />{" "}
                      {card.name}
                    </div>
                  </button>
                  <div class={styles.meta}>
                    <span>{when(card.at)}</span>
                    <button
                      class={styles.cardAction}
                      disabled={working()}
                      onClick={() => void drop(card)}
                      title={card.kind === "published" ? "Take down" : "Forget this file"}
                    >
                      <Icon kind={card.kind === "published" ? "trash" : "xmark"} />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
