// The model as it stands, and the files this browser has opened before.
//
// A model here has exactly two places to be: this browser, and a file. There is
// nowhere else to put one, so this is a list of files and a way to open and save
// them, and nothing on it needs a network to work.
import { fileOpen, fileSave, type FileWithHandle } from "browser-fs-access";
import { createSignal, For, onSettled, Show, useContext } from "solid-js";
import { BeetleContext } from "./context";
import { writeModel } from "./cvox-io";
import { fileName, homeName } from "./home";
import {
  forgetFile,
  listRecentFiles,
  mayRead,
  remembersFiles,
  rememberFile,
  type RecentFile,
} from "./recent-files";
import {
  Button,
  buttonStyle,
  IconButton,
  iconButtonStyle,
} from "./components/components";
import styles from "./FilesDialog.module.css";

/** The media type a model is written and read as, and the name it carries. */
const MIME = "application/octet-stream";
const EXTENSIONS = [".cvox"];

const modelBlob = (bytes: Uint8Array) =>
  new Blob([bytes as BlobPart], { type: MIME });

const when = (at: number) =>
  at === 0
    ? "never"
    : new Date(at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

export function FilesDialog() {
  const { volume, palette, dimensions, home, setHome, loadVolume, reset } =
    useContext(BeetleContext);

  const [files, setFiles] = createSignal<RecentFile[]>([]);
  const [busy, setBusy] = createSignal<string | undefined>(undefined);
  const [error, setError] = createSignal<string | undefined>(undefined);

  const refresh = async () => {
    setFiles(remembersFiles() ? await listRecentFiles() : []);
  };

  onSettled(() => {
    void refresh();
  });

  const open = async (file: RecentFile) => {
    if (!(await mayRead(file.handle))) {
      setError(
        "this browser will not hand the file back until it is asked again",
      );
      return;
    }
    setBusy("opening…");
    setError(undefined);
    try {
      const bytes = await (await file.handle.getFile()).arrayBuffer();
      await loadVolume(bytes, {
        kind: "file",
        id: file.id,
        handle: file.handle,
        name: file.name,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(undefined);
    }
  };

  const openFromDisk = async () => {
    setBusy("opening…");
    setError(undefined);
    try {
      const opened = (await fileOpen<false>({
        extensions: EXTENSIONS,
        mimeTypes: [MIME],
      })) as FileWithHandle;
      if (opened.handle === undefined) {
        // This browser hands over the contents and nothing else, so the model
        // can be read but has nowhere to be written back to.
        setError(
          "this browser will not give a handle to the file, so it cannot be saved back",
        );
        return;
      }
      const handle = opened.handle;
      const remembered = await rememberFile({
        handle,
        dimensions: dimensions(),
      });
      await open(remembered);
      await refresh();
    } catch (cause) {
      if ((cause as DOMException)?.name !== "AbortError") {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      setBusy(undefined);
    }
  };

  const save = async () => {
    setBusy("saving…");
    setError(undefined);
    try {
      const bytes = writeModel(volume(), palette());
      const current = home();

      if (current.kind === "file") {
        // A model already in a file is written back to that file, so that
        // saving twice in a row does not ask twice and does not make a copy.
        const writable = await current.handle.createWritable();
        await writable.write(modelBlob(bytes));
        await writable.close();
        return;
      }

      const handle = await fileSave(modelBlob(bytes), {
        fileName: fileName(current),
        extensions: EXTENSIONS,
      });
      if (handle === null) {
        // A save that handed back no handle is a save that went somewhere the
        // browser will not give back, so there is nowhere to write it again.
        setError(
          "this browser saved the model but will not give a handle to it",
        );
        return;
      }
      setHome({
        kind: "file",
        id: crypto.randomUUID(),
        handle,
        name: handle.name,
      });
      await rememberFile({ handle, dimensions: dimensions() });
      await refresh();
    } catch (cause) {
      if ((cause as DOMException)?.name !== "AbortError") {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      setBusy(undefined);
    }
  };

  const forget = async (file: RecentFile) => {
    await forgetFile(file.id);
    await refresh();
  };

  return (
    <div class={styles.dialog}>
      <div class={styles.toolbar}>
        <Button
          class={buttonStyle}
          onClick={reset}
          disabled={busy() !== undefined}
        >
          New
        </Button>
        <Button
          class={buttonStyle}
          onClick={openFromDisk}
          disabled={busy() !== undefined || !remembersFiles()}
        >
          Open
        </Button>
        <Button
          class={buttonStyle}
          onClick={save}
          disabled={busy() !== undefined}
        >
          Save
        </Button>
        <span class={styles.status}>
          {busy() ?? error() ?? homeName(home())}
        </span>
      </div>

      <Show
        when={remembersFiles()}
        fallback={
          <p class={styles.withoutFiles}>
            This browser cannot be given a handle to a file, so there is no list
            to keep. Saving writes the model out; opening one is left to the
            browser's own files.
          </p>
        }
      >
        <div class={styles.grid}>
          <For each={files()}>
            {(file) => (
              <div class={styles.card}>
                <button class={styles.open} onClick={() => open(file)}>
                  <span class={styles.name}>{file.name}</span>
                  <span class={styles.size}>
                    {file.dimensions.width}×{file.dimensions.height}×
                    {file.dimensions.depth}
                  </span>
                  <span class={styles.opened}>{when(file.lastOpenedAt)}</span>
                </button>
                <IconButton
                  class={iconButtonStyle}
                  kind="trash"
                  title="Forget this model"
                  onClick={() => forget(file)}
                />
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
