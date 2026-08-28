import { createSignal, onCleanup } from "solid-js";

export function createMediaQuery(query: string) {
  const mediaQuery = window.matchMedia(query);
  const controller = new AbortController();

  const [bool, setBool] = createSignal(handleDeviceChange(mediaQuery));

  function handleDeviceChange(event: MediaQueryList | MediaQueryListEvent) {
    if (event.matches) {
      return true;
    } else {
      return false;
    }
  }

  mediaQuery.addEventListener("change", event => setBool(handleDeviceChange(event)), {
    signal: controller.signal,
  });

  onCleanup(() => controller.abort());

  return bool;
}
