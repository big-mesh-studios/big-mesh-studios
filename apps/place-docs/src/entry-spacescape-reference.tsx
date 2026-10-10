import { renderToString } from "@solidjs/web";
import { SpacescapeReference } from "./SpacescapeReference";

/** The spacescape reference page's markup, as the prerender writes it into the template. */
export function render(): string {
  return renderToString(() => <SpacescapeReference />);
}
