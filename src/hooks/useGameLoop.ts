import { useEffect } from "react";
import { tick, cancelBuild, collect, panel } from "../game/actions";
import { load, save } from "../systems/persistence";
import { useUIStore as U, useWorldStore as W } from "../stores";
let loaded = false;
export function useGameLoop() {
  useEffect(() => {
    if (!loaded) {
      loaded = true;
      load();
    }
    const interval = setInterval(tick, 1000),
      autosave = setInterval(() => save(true), 10000);
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Escape") {
        cancelBuild();
        U.setState({ panel: null, modal: null });
      }
      if (e.key.toLowerCase() === "r" && U.getState().placement)
        U.setState((s) => ({ rotation: (s.rotation + 1) % 4 }));
      if (["1", "2", "3", "4"].includes(e.key) && !W.getState().interior)
        panel(
          (["shop", "village", "industry", "book"] as const)[Number(e.key) - 1],
        );
    };
    const before = () => save(true);
    window.addEventListener("keydown", down);
    window.addEventListener("beforeunload", before);
    window.addEventListener("pagehide", before);
    return () => {
      clearInterval(interval);
      clearInterval(autosave);
      window.removeEventListener("keydown", down);
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("pagehide", before);
    };
  }, []);
  const collecting = U((s) => s.collecting);
  useEffect(() => {
    if (!collecting) return;
    collect();
    const timer = setInterval(collect, 300);
    const stop = () => U.setState({ collecting: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, [collecting]);
}
