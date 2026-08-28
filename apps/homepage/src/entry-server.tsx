import { renderToString } from "@solidjs/web";
import { App } from "./App";

/** The page's markup, as the prerender writes it into the template. */
export function render() {
  return renderToString(() => <App />);
}
