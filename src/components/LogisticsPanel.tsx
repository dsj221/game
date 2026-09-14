import {TransportControls} from "./TransportControls";
import { useTownStore as T } from "../stores/useTownStore";
import {
  useBuildingStore as B,
  useWorldStore as W,
  useUIStore as U,
} from "../stores";
import { resourceNames, defs } from "../data/definitions";
import type { Building, Resource } from "../types";
import {
  stockRule,
  setStockRule,
  freightReason,
  stockTotal,
  outsideTotal,
  setWarehousePriority,
} from "../systems/logistics";
import "./logistics.css";
import { ChainDiagnosis, locateFreight } from "./ChainDiagnosis";
export function LogisticsPanel({ building }: { building?: Building }) {
  const t = T(),
    buildings = B((s) => s.buildings),
    tiles = W((s) => s.tiles),
    overlay = U((s) => s.logisticsOverlay),
    l = t.logistics;
  if (!l) return <p>运行游戏后启用建筑库存与货运。</p>;
  const stores = building
    ? [l.stores[building.id]].filter(Boolean)
    : Object.values(l.stores).filter(
        (s) => s.warehouse || s.blocked || outsideTotal(s) > 0,
      );
  const resources = (bag: Partial<Record<Resource, number>>) =>
    Object.entries(bag)
      .filter(([, n]) => (n || 0) > 0.001)
      .map(
        ([r, n]) =>
          `${resourceNames[r as Resource]} ${n!.toFixed(n! % 1 ? 1 : 0)}`,
      )
      .join(" · ") || "空";
  return (
    <section className="logistics-panel">
      <h3>{building ? "建筑库存与运输" : "可见货运 · 面包 / 家具 / 工具"}</h3>
      <button
        aria-pressed={overlay}
        onClick={() => U.setState({ logisticsOverlay: !overlay })}
      >
        {overlay ? "关闭" : "显示"}物流地图
      </button>
      <p>蓝线取货 · 绿线送货 · 橙色拥堵 · 红色断路；点击堆货查看原因。</p>
      {!building && <ChainDiagnosis />}
      {!building && (
        <>
          <p>
            工坊补料优先，成品送往优先级最高且有空间的仓库。仓库可雇佣搬运员和推车，按班次沿道路实际运输。
          </p>
          <p>
            搬运员每趟 4 件，推车 8
            件；道路断开、队列拥堵或仓库满载时，货物留在现场。场外堆满后生产暂停。
          </p>
          <div className="freight-stats">
            <b>
              运输中 {l.haulers.filter((h) => h.destination).length} /{" "}
              {l.haulers.length}
            </b>
            <b>已送达 {l.delivered.toFixed(0)} 件</b>
            <b>
              堆货{" "}
              {Object.values(l.stores)
                .reduce((n, s) => n + outsideTotal(s), 0)
                .toFixed(0)}{" "}
              件
            </b>
          </div>
        </>
      )}
      {stores.map((s) => (
        <article key={s.id}>
          <b>
            {defs[buildings.find((b) => b.id === s.id)?.type || ""]?.name ||
              "原址待回收物资"}{" "}
            · ({s.x}, {s.z})
          </b>
          <p>
            室内 {(stockTotal(s) - outsideTotal(s)).toFixed(1)} / {s.capacity} ·
            场外 {outsideTotal(s).toFixed(1)}{" "}
            {freightReason(l, s, buildings, tiles)}
          </p>
          <button onClick={() => locateFreight(s)}>定位建筑</button>
          <p>库存：{resources(s.inside)}</p>
          {outsideTotal(s) > 0 && (
            <p className="cargo-warning">场外堆货：{resources(s.outside)}</p>
          )}
          {s.warehouse && !s.salvage && <TransportControls stock={s} level={buildings.find(b=>b.id===s.id)?.level || 1}/>}
          {s.warehouse && (
            <label>
              仓库收货优先级{" "}
              <select
                aria-label={`仓库 ${s.id} 收货优先级`}
                value={s.priority}
                onChange={(e) => {
                  const next = setWarehousePriority(
                    T.getState(),
                    s.id,
                    Number(e.target.value),
                  );
                  if (next) T.setState(next);
                }}
              >
                <option value={2}>高 · 优先入库</option>
                <option value={1}>普通</option>
                <option value={0}>低 · 有余力时收货</option>
              </select>
            </label>
          )}
          {s.warehouse && (
            <details>
              <summary>逐项仓储规则</summary>
              <p>
                最低储备禁止外运、建造和外贸消耗；降低储备可释放。目标值限制后续收货，在途货物仍会送达。总容量由全部物资共享。
              </p>
              <div className="stock-rules">
                {(Object.keys(resourceNames) as Resource[]).map((r) => {
                  const rule = stockRule(s, r);
                  const update = (next: typeof rule) => {
                    const value = setStockRule(T.getState(), s.id, r, next);
                    if (value) T.setState(value);
                  };
                  return (
                    <label key={r}>
                      <span>{resourceNames[r]}</span>
                      <input
                        aria-label={s.id + r + "允许储存"}
                        type="checkbox"
                        checked={rule.allowed}
                        onChange={(e) =>
                          update({ ...rule, allowed: e.target.checked })
                        }
                      />
                      <span>储备</span>
                      <input
                        aria-label={s.id + r + "最低储备"}
                        type="number"
                        min="0"
                        max={rule.target}
                        value={rule.minimum}
                        onChange={(e) =>
                          update({ ...rule, minimum: Number(e.target.value) })
                        }
                      />
                      <span>目标</span>
                      <input
                        aria-label={s.id + r + "目标库存"}
                        type="number"
                        min={rule.minimum}
                        max={s.capacity}
                        value={rule.target}
                        onChange={(e) =>
                          update({ ...rule, target: Number(e.target.value) })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </details>
          )}
          {building && defs[building.type]?.town?.sells && (
            <p>
              店内货架：{t.facilities[building.id]?.stock.toFixed(0) || 0}{" "}
              件（已完成采购）
            </p>
          )}
        </article>
      ))}
      <details open={!!building}>
        <summary>搬运员与推车</summary>
        {l.haulers
          .filter(
            (h) =>
              !building ||
              h.home === building.id ||
              h.source === building.id ||
              h.destination === building.id,
          )
          .map((h) => (
            <p key={h.id}>
              {h.cart ? "推车" : "搬运员"} · {h.status}
              {h.resource
                ? ` · ${resourceNames[h.resource]} ${h.amount.toFixed(1)} 件${h.loaded ? "（已装货）" : "（待取）"}`
                : ""}
              {h.destination
                ? ` → ${defs[buildings.find((b) => b.id === h.destination)?.type || ""]?.name || "回收料场"}`
                : ""}
            </p>
          ))}
      </details>
    </section>
  );
}
