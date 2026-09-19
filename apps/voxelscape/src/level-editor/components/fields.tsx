import type { Dim3 } from "../types";
import styles from "./fields.module.css";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}

/** A labelled whole-number input, with buttons that step the value. */
export function NumberField(props: NumberFieldProps) {
  const step = (direction: 1 | -1) => {
    const next = props.value + direction * (props.step ?? 1);
    if (props.min !== undefined && next < props.min) {
      props.onChange(props.min);
      return;
    }
    props.onChange(next);
  };
  return (
    <label class={styles.field}>
      <span class={styles.label}>{props.label}</span>
      <span class={styles.stepper}>
        <input
          class={styles.input}
          type="number"
          value={props.value}
          step={props.step ?? 1}
          min={props.min}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isFinite(value)) {
              props.onChange(Math.round(value));
            }
          }}
        />
        <button
          type="button"
          class={styles.stepButton}
          aria-label={`Decrease ${props.label}`}
          onClick={() => step(-1)}
        >
          −
        </button>
        <button
          type="button"
          class={styles.stepButton}
          aria-label={`Increase ${props.label}`}
          onClick={() => step(1)}
        >
          +
        </button>
      </span>
    </label>
  );
}

/** Three number inputs editing one voxel coordinate. */
export function Vec3Field(props: {
  label: string;
  value: Dim3;
  onChange: (value: Dim3) => void;
}) {
  const set = (axis: 0 | 1 | 2, value: number) => {
    const next: Dim3 = [props.value[0], props.value[1], props.value[2]];
    next[axis] = value;
    props.onChange(next);
  };
  return (
    <fieldset class={styles.vec3}>
      <legend class={styles.label}>{props.label}</legend>
      <NumberField
        label="x"
        value={props.value[0]}
        onChange={(v) => set(0, v)}
      />
      <NumberField
        label="y"
        value={props.value[1]}
        onChange={(v) => set(1, v)}
      />
      <NumberField
        label="z"
        value={props.value[2]}
        onChange={(v) => set(2, v)}
      />
    </fieldset>
  );
}
