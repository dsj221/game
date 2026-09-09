import {
  useBuildingStore as B,
  useNpcStore as N,
  useResourceStore as R,
  useWorldStore as W,
  useUIStore as U,
} from "../stores";
import { useTownStore as T } from "../stores/useTownStore";
import { defs } from "../data/definitions";
import { placementReport } from "../systems/placement";
export function PlacementInfo({compact=false}:{compact?:boolean}) {
  const ui = U(),
    buildings = B((s) => s.buildings),
    npcs = N((s) => s.npcs),
    r = R(),
    w = W(),
    level = T((s) => s.level);
  if (!ui.hover || !ui.placement || ui.placement === "expand") return null;
  const old = buildings.find((b) => b.id === ui.moving),
    d = defs[ui.placement];
  const b = {
    id: old?.id || "preview",
    type: d.id,
    x: ui.hover[0],
    z: ui.hover[1],
    rotation: ui.rotation,
    footprint: old ? old.footprint || ([1, 1] as [number, number]) : d.size,
    world: w.current,
    level: old?.level || 1,
    born: 0,
  };
  const p = placementReport(
    b,
    buildings,
    w.tiles[w.current],
    npcs,
    r.bag,
    r.currency,
    level,
    !!old,
  );
  const status=p.reasons.length?`无法放置：${p.reasons.join('、')}`:'可以放置 · 点击地图确认';
  if(compact)return <span className={`placement-info placement-summary ${p.reasons.length?'invalid':''}`} title={status} role="status">{status}</span>;
  return (
    <div className="placement-info" aria-live="polite">
      <b>
        {p.reasons.length
          ? `无法建造：${p.reasons.join("、")}`
          : "可以放置 · 点击地图确认"}
      </b>
      <span>
        覆盖居民 {p.residents} 人 · 邻居幸福合计 {p.happiness.toFixed(1)} · 半径{" "}
        {p.influence.radius} 格
      </span>
      <span>
        每日维护 {p.upkeep} · 满编工资 {p.wages} · 预计客流{" "}
        {p.customers.toFixed(1)}
      </span>
      <span>
        收入上限约 {p.revenue.toFixed(0)} / 日（需员工、库存和消费需求）
      </span>
      <span>
        住宅服务：商业 {p.influence.commerce ? "有" : "无"} · 医疗{" "}
        {p.influence.health ? "有" : "无"} · 环境{" "}
        {p.influence.happiness.toFixed(1)}
      </span>
      {!p.influence.road && <span>附近无道路：生产及客流受罚；可低效运行</span>}
    </div>
  );
}
