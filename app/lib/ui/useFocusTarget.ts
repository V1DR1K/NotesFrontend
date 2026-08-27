import { useEffect } from "react";

export function useFocusTarget(focusId: string | null | undefined, ready: boolean) {
  useEffect(() => {
    if (!focusId || !ready) return;
    let attempts = 0;
    let timer: number | undefined;
    const reveal = () => {
      const target = document.getElementById(`record-${focusId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("search-target");
        timer = window.setTimeout(() => target.classList.remove("search-target"), 2600);
        return;
      }
      if (attempts < 10) { attempts += 1; timer = window.setTimeout(reveal, 100); }
    };
    reveal();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [focusId, ready]);
}
