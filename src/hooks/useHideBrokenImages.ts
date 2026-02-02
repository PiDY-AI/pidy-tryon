import { useEffect } from "react";

/**
 * Prevents browser-native broken-image placeholders (big X icons) from appearing.
 * We do this by listening for `error` events on <img> elements in the capture phase
 * and immediately hiding the failed image.
 */
export const useHideBrokenImages = () => {
  useEffect(() => {
    const onErrorCapture = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) {
        target.style.display = "none";
      }
    };

    window.addEventListener("error", onErrorCapture, true);
    return () => window.removeEventListener("error", onErrorCapture, true);
  }, []);
};
