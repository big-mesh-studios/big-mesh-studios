import { renderToString } from "@solidjs/web";
import { Reference } from "./Reference";

/** The reference page's markup, as the prerender writes it into the template. */
export function render(): string {
  return renderToString(() => <Reference />);
}
