// hooks/useDisablePullToRefresh.js
import { useEffect } from "react";

export default function useDisablePullToRefresh(disabled) {
  useEffect(() => {
    if (!disabled) return; // only apply when true

    let maybePrevent = false;

    const touchstart = (e) => {
      if (e.touches.length !== 1) return;
      if (window.scrollY === 0) {
        maybePrevent = true;
      } else {
        maybePrevent = false;
      }
    };

    const touchmove = (e) => {
      if (maybePrevent) {
        maybePrevent = false;
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", touchstart, { passive: false });
    document.addEventListener("touchmove", touchmove, { passive: false });

    return () => {
      document.removeEventListener("touchstart", touchstart);
      document.removeEventListener("touchmove", touchmove);
    };
  }, [disabled]);
}
