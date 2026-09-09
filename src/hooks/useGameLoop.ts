import { useEffect } from "react";
import { tick, cancelBuild, collect, panel } from "../game/actions";
import { save } from "../systems/persistence";
import { useUIStore as U, useWorldStore as W } from "../stores";
export function useGameLoop() {
  useEffect(() => {
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
      if (["1", "2", "3", "4",'5','6'].includes(e.key) && !W.getState().interior)
        U.setState({panel:'shop',tab:'发现',category:['住宅','生产','商业','公共','道路','装饰'][Number(e.key)-1]});
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
    const timer = setInterval(collect, 800);
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
