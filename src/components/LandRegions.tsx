import { useTownStore as T } from "../stores/useTownStore";
import {
  useWorldStore as W,
  useResourceStore as R,
  useUIStore as U,
} from "../stores";
import { landRegions } from "../systems/land";
import { unlockRegion } from "../game/actions";
export function LandRegions() {
  const w = W(),
    t = T(),
    r = R(),
    placement = U((s) => s.placement);
  if (placement !== "expand" || w.current !== "overworld") return null;
  return (
    <div className="land-regions">
      <b>土地分区 · 已购区域自动随存档保存</b>
      {landRegions(w.tiles.overworld).map((z) => (
        <button
          key={z.id}
          disabled={
            !z.tiles.length ||
            r.currency < z.cost ||
            t.level < z.level ||
            t.metrics.population < z.population
          }
          onClick={() => unlockRegion(z.id)}
        >
          {z.name} ·{" "}
          {z.tiles.length
            ? `${z.cost} 金币 / ${z.tiles.length * 9} 格 · 人口 ${z.population} · Lv.${z.level}`
            : "已解锁"}
        </button>
      ))}
    </div>
  );
}
