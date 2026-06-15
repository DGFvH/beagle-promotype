import { useEffect, useRef } from "react";

// Presenter keyboard shortcuts (ignored when typing in inputs).
export function usePresenterShortcuts({
  enabled,
  onToggleAutoplay,
  onDecide,
  onTabLive,
  onTabLineage,
  onMethodology,
  onResetDemo,
}) {
  const latest = useRef({
    onToggleAutoplay,
    onDecide,
    onTabLive,
    onTabLineage,
    onMethodology,
    onResetDemo,
  });
  latest.current = {
    onToggleAutoplay,
    onDecide,
    onTabLive,
    onTabLineage,
    onMethodology,
    onResetDemo,
  };

  useEffect(() => {
    if (!enabled) return undefined;

    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        latest.current.onToggleAutoplay?.();
      } else if (k === "d") {
        latest.current.onDecide?.();
      } else if (k === "l") {
        latest.current.onTabLineage?.();
      } else if (k === "v") {
        latest.current.onTabLive?.();
      } else if (k === "m") {
        latest.current.onMethodology?.();
      } else if (k === "r") {
        latest.current.onResetDemo?.();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function readDemoParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    autoDemo: params.get("demo") === "1" || params.get("demo") === "true",
    present: params.get("present") === "1" || params.get("present") === "true",
  };
}
