import { LogisticsPanel } from './LogisticsPanel';
import { hydroGeneration, wheelReach } from '../systems/hydrology';
import type { Building } from "../types";
import { defs } from "../data/definitions";
import { influenceRules, buildingDistance } from "../systems/buildingInfluence";
import { useBuildingStore as B, useNpcStore as N } from "../stores";
import { useTownStore as T } from "../stores/useTownStore";
import { developmentBonuses } from "../systems/development";
import { onShift } from "../systems/workSchedule";
import {
  reactionsForBuilding,
  spatialEffectsForBuilding,
} from "../systems/spatialReactions";

export function OperatingEffects({ building: b }: { building: Building }) {
  const development = T((s) => s.development),
    bonuses = developmentBonuses(development);
  const buildings = B((s) => s.buildings),
    offline = B((s) => s.offline),
    npcs = N((s) => s.npcs),
    facilities = T((s) => s.facilities);
  const hydrology = T(s=>s.hydrology);
  const d = defs[b.type],
    c = d.town,
    rule = influenceRules[b.type];
  const staffed =
    !c?.jobs || npcs.some((n) => n.workplace === b.id && n.arrivedAt === b.id);
  const active = !b.paused && !offline.includes(b.id) && staffed;
  const minute = T((s) => s.minute),
    open = onShift(minute, facilities[b.id], !!c?.sells);
  const workers = npcs.filter((n) => n.workplace === b.id);
  const reason = b.paused
    ? "已暂停营业"
    : offline.includes(b.id)
      ? "缺少电力"
      : c?.jobs && !open
        ? "休息中（按下方员工排班）"
        : !staffed
          ? !workers.length
            ? "尚未分配员工"
            : workers.some((n) => n.state === "道路受阻")
              ? "员工道路受阻，请留出住宅到店铺的通路"
              : "员工正在前往岗位"
          : "";
  const neighbors = rule
    ? buildings.filter(
        (other) =>
          other.id !== b.id &&
          other.world === b.world &&
          buildingDistance(b, other) <= rule.radius,
      )
    : [];
  const homes = neighbors.filter((other) => defs[other.type].town?.capacity);
  const farms = neighbors.filter((other) =>
    ["farm", "orchard", "icon_greenhouse", "icon_carrot_patch"].includes(
      other.type,
    ),
  );
  const reactions = reactionsForBuilding(b, buildings, defs),
    blockEffects = spatialEffectsForBuilding(b, buildings, defs);
  return (
    <div className="recipe-card">
      {c?.sells && (
        <p>
          按员工排班营业。居民有需求、付得起售价且能走到店铺后自动购买；请保持住宅和店铺周边通路畅通。实际成交会推进“第一次营业”。
        </p>
      )}
      <LogisticsPanel building={b}/>
      <span className="eyebrow">实际经营效果</span>
      {!!d.power && (
        <p>发电：{(b.type === "watermill" ? hydroGeneration(b,hydrology,buildings) : b.paused ? 0 : d.power * b.level).toFixed(1)} E / Tick（共享能源池）</p>
      )}
      {b.type === "watermill" && <p>河道水位 {((wheelReach(b,hydrology)?.volume||0)/100).toFixed(2)} m · 实际过流 {(wheelReach(b,hydrology)?.flow||0).toFixed(2)}。低水位、断流或暂停时停止发电。</p>}
      {!!d.energyCost && (
        <p>
          用电需求：{d.energyCost * b.level} E / Tick ·{" "}
          {offline.includes(b.id) ? "缺电停机" : "供电正常"}
        </p>
      )}
      {rule && (
        <>
          <p>
            {rule.radius} 格范围 ·{" "}
            {reason
              ? `服务未生效：${reason}`
              : active
                ? "服务生效"
                : "服务未生效"}
          </p>
          {!!rule.happiness && (
            <p>
              覆盖 {homes.length} 座住宅 · 每座基础幸福 +{rule.happiness}
              （工业噪声与公园搭配会调整效果）
            </p>
          )}
          {rule.health && (
            <p>
              医疗覆盖 {homes.length} 座住宅 ·
              附近居民恢复健康并减轻流感影响，不跨世界生效。
            </p>
          )}
          {rule.irrigation && (
            <p>覆盖 {farms.length} 处农业 · 效率 +15%，供水设施之间不叠加。</p>
          )}
          {rule.logistics && <p>周边效率 +15%，同类物流加成不叠加。</p>}
          {!!rule.noise && (
            <p>周边住宅幸福 −{rule.noise}，建议与住宅保持距离。</p>
          )}
        </>
      )}
      {!!reactions.length && (
        <div className="block-reaction-summary">
          <span className="eyebrow">块间反应 · {reactions.length}</span>
          {reactions.map((reaction) => (
            <p key={`${reaction.buildingA}:${reaction.buildingB}`}>
              <b>{reaction.name}</b> · {reaction.description}
            </p>
          ))}
          <small>
            {blockEffects.efficiency > 0 &&
              `生产效率 +${Math.round(blockEffects.efficiency * 100)}% `}
            {blockEffects.happiness > 0 &&
              `邻里幸福 +${blockEffects.happiness.toFixed(1)} `}
            {blockEffects.customers > 0 &&
              `临街客流 +${blockEffects.customers.toFixed(0)}`}
          </small>
        </div>
      )}
      {!!c && (
        <small>
          每日维护 {(c.upkeep * b.level * bonuses.maintenance).toFixed(1)} 金币
          · 每位员工日薪 {c.jobs ? (c.wage * bonuses.wages).toFixed(1) : 0}{" "}
          金币（含发展加成）。范围和邻里加成不随升级增加；生产、住房、发电按等级提升。
        </small>
      )}
      {b.type === "studio" && (
        <p>
          今日频道实收 {facilities[b.id]?.dailyRevenue.toFixed(1) || "0"} 金币
        </p>
      )}
    </div>
  );
}
