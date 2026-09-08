import { useSettingsStore } from "../stores";
let context: AudioContext | undefined;
export function tone(kind = "click") {
  const s = useSettingsStore.getState();
  if (!s.sound) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const o = context.createOscillator(),
      g = context.createGain();
    o.type = kind === "build" ? "triangle" : "sine";
    o.frequency.setValueAtTime(
      kind === "collect" ? 650 : kind === "build" ? 330 : 440,
      context.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      kind === "build" ? 660 : 880,
      context.currentTime + 0.12,
    );
    g.gain.setValueAtTime(s.volume * 0.3, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    o.connect(g);
    g.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.22);
  } catch {
    /* Audio is optional on restrictive browsers. */
  }
}
