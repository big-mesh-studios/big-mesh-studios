import { renderToString } from "@solidjs/web";
import { Guides } from "./Guides";

/** The guides page's markup, as the prerender writes it into the template. */
export function render(): string {
  return renderToString(() => <Guides />);
}
