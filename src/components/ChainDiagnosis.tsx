import { useTownStore as T } from "../stores/useTownStore";
import {
  useBuildingStore as B,
  useUIStore as U,
  useWorldStore as W,
} from "../stores";
import { defs, resourceNames } from "../data/definitions";
import { stockAmount, freightReason } from "../systems/logistics";
import type { Resource, Building } from "../types";
export function locateFreight(b: {
  id: string;
  x: number;
  z: number;
  world: Building["world"];
}) {
  W.setState({ current: b.world });
  B.setState({ selected: b.id });
  U.setState({
    cameraFocus: { x: b.x, z: b.z, nonce: Date.now() },
    panel: "detail",
  });
}
const chains: { name: string; stages: [string, Resource][] }[] = [
  {
    name: "面包",
    stages: [
      ["farm", "wheat"],
      ["windmill", "flour"],
      ["bakery", "bread"],
      ["breadshop", "bread"],
    ],
  },
  {
    name: "家具",
    stages: [
      ["lumber", "wood"],
      ["carpenter", "furniture"],
      ["market", "furniture"],
    ],
  },
  {
    name: "工具",
    stages: [
      ["lumber", "wood"],
      ["mine", "iron"],
      ["icon_workshop_stall", "tools"],
      ["icon_tool_shop", "tools"],
    ],
  },
];
export function ChainDiagnosis() {
  const t = T(),
    buildings = B((s) => s.buildings),
    tiles = W((s) => s.tiles);
  return (
    <section className="chain-diagnosis">
      <h3>三条主链诊断</h3>
      <p>
        显示今日实际产出、库存与在途货物；点击已有建筑定位。工具链的木材和铁矿并行供料。
      </p>
      {chains.map((chain) => (
        <article key={chain.name}>
          <h4>
            {chain.name} ·{" "}
            {chain.name === "工具"
              ? "木材 + 铁矿 → 制造 → 销售"
              : "原料 → 加工 → 销售"}
          </h4>
          <p>
            当前瓶颈：
            {chain.stages
              .flatMap(([type]) => {
                const sites = buildings.filter((b) => b.type === type);
                if (!sites.length) return [defs[type]?.name + "未建设"];
                return sites
                  .filter((b) =>
                    /缺少|不足|停工|断电/.test(
                      t.facilities[b.id]?.status || "",
                    ),
                  )
                  .map(
                    (b) => defs[type]?.name + "：" + t.facilities[b.id].status,
                  );
              })
              .join("；") || "未发现生产缺口，查看各段物流状态"}
          </p>
          <div className="chain-flow">
            {chain.stages.map(([type, r]) => {
              const sites = buildings.filter((b) => b.type === type);
              return (
                <div key={type}>
                  <strong>{defs[type]?.name || type}</strong>
                  {!sites.length ? (
                    <p>尚未建设</p>
                  ) : (
                    sites.map((b) => {
                      const s = t.logistics?.stores[b.id],
                        f = t.facilities[b.id],
                        reason =
                          s && t.logistics
                            ? freightReason(t.logistics, s, buildings, tiles)
                            : "等待物流初始化";
                      return (
                        <button key={b.id} onClick={() => locateFreight(b)}>
                          <b>
                            ({b.x}, {b.z}) · {resourceNames[r]}
                          </b>
                          <span>
                            库存 {stockAmount(s, r).toFixed(1)} · 货架{" "}
                            {(f?.stock || 0).toFixed(1)}
                          </span>
                          <span>
                            在途{" "}
                            {(
                              t.logistics?.haulers
                                .filter(
                                  (h) =>
                                    h.destination === b.id &&
                                    h.resource === r &&
                                    h.loaded,
                                )
                                .reduce((n, h) => n + h.amount, 0) || 0
                            ).toFixed(1)}
                          </span>
                          {defs[type]?.town?.sells ? (
                            <span>今日成交 {f?.dailyCustomers || 0} 人次</span>
                          ) : (
                            <span>
                              今日实产{" "}
                              {(s?.production?.day === t.day
                                ? s.production.amounts[r] || 0
                                : 0
                              ).toFixed(1)}{" "}
                              · 均速{" "}
                              {(
                                (s?.production?.day === t.day
                                  ? s.production.amounts[r] || 0
                                  : 0) / Math.max(1, t.minute / 60)
                              ).toFixed(1)}{" "}
                              件/游戏时
                            </span>
                          )}
                          <span>
                            {f?.status || "等待开工"} · {reason}
                          </span>
                          {Object.entries(defs[type]?.town?.recipe || {}).map(
                            ([input, n]) => (
                              <span key={input}>
                                {resourceNames[input as Resource]}：
                                {stockAmount(s, input as Resource).toFixed(1)} /
                                每批 {n}
                              </span>
                            ),
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
