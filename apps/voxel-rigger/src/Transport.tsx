// The transport: playing the selected motion, scrubbing it, and stepping a
// frame at a time.
import { Show, useContext, type Component } from "solid-js";
import { RigContext } from "./context";
import styles from "./EditorPage.module.css";

const Transport: Component = () => {
  const rig = useContext(RigContext);

  const frames = () => {
    const motion = rig.motion();
    return motion === undefined
      ? 0
      : Math.round(motion.duration * motion.framesPerSecond);
  };

  const frame = () => {
    const motion = rig.motion();
    return motion === undefined
      ? 0
      : Math.round(rig.time() * motion.framesPerSecond);
  };

  return (
    <div class={styles.transport}>
      <button
        disabled={rig.motion() === undefined}
        onClick={() => rig.setPlaying(!rig.playing())}
      >
        {rig.playing() ? "Pause" : "Play"}
      </button>
      <button
        disabled={rig.motion() === undefined}
        onClick={() => {
          rig.setPlaying(false);
          rig.setTime(0);
        }}
      >
        Stop
      </button>
      <button
        disabled={rig.motion() === undefined}
        onClick={() => rig.stepFrame(-1)}
      >
        ◀ frame
      </button>
      <button
        disabled={rig.motion() === undefined}
        onClick={() => rig.stepFrame(1)}
      >
        frame ▶
      </button>
      <button
        disabled={rig.skeleton().bones.length === 0}
        title="Write the current bone transforms into the motion at this moment"
        onClick={() => rig.keyPose()}
      >
        Key pose
      </button>
      <button
        disabled={rig.motion() === undefined}
        onClick={() => rig.clearKey()}
      >
        Clear key
      </button>

      <Show
        when={rig.motion()}
        fallback={<span class={styles.frame}>no motion</span>}
      >
        <input
          class={styles.scrub}
          type="range"
          min="0"
          max={Math.max(rig.duration(), 0.0001)}
          step="0.001"
          value={rig.time()}
          onInput={(event) => {
            rig.setPlaying(false);
            rig.setTime(Number(event.currentTarget.value));
          }}
        />
        <span class={styles.frame}>
          {frame()} / {frames()}
        </span>
        <span class={styles.tag}>{rig.motion()!.name}</span>
      </Show>
    </div>
  );
};

export default Transport;
