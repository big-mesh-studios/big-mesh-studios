import type { JSX } from "@solidjs/web/jsx-runtime";

interface SampleProps {
  caption: string;
  language?: string;
  children: string;
}

/**
 * A run of script, as the guide shows it. The samples are the world's own demo
 * scripts, trimmed to the part under discussion, so a reader who copies one is
 * copying code this repository runs rather than code written to look right.
 */
export function Sample(props: SampleProps) {
  return (
    <figure class="sample">
      <figcaption class="caption">{props.caption}</figcaption>
      <pre>
        <code data-language={props.language ?? "ts"}>{props.children}</code>
      </pre>
    </figure>
  );
}

interface NoteProps {
  children: JSX.Element;
}

/** Something a reader will get wrong, said once, before they do. */
export function Note(props: NoteProps) {
  return (
    <p class="note">
      <strong>Careful.</strong> {props.children}
    </p>
  );
}
