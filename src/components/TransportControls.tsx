import { useTownStore as T } from "../stores/useTownStore";
import {
  transportPolicy,
  transportDailyCost,
  setTransport,
  type Stock,
  type TransportPolicy,
} from "../systems/logistics";
export function TransportControls({
  stock,
  level,
}: {
  stock: Stock;
  level: number;
}) {
  const day = T((s) => s.day);
  const p = transportPolicy(stock, level),
    cost = transportDailyCost(p);
  const update = (next: TransportPolicy) => {
    const t = setTransport(T.getState(), stock.id, next);
    if (t) T.setState(t);
  };
  return (
    <details>
      <summary>运力与班次</summary>
      <p>
        雇佣运输队独立于居民岗位。搬运员日薪 6；推车含驾驶员日薪 8，另每日维护
        2。工资按排班时长计，维护按日计。
      </p>
      <div className="stock-rules">
        {(["porters", "carts"] as const).map((k) => (
          <label key={k}>
            {k === "porters" ? "搬运员" : "推车"}
            <input
              aria-label={stock.id + k}
              type="number"
              min="0"
              max="6"
              value={p[k]}
              onChange={(e) => update({ ...p, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label>
          上班
          <input
            aria-label={stock.id + "运输上班"}
            type="number"
            min="0"
            max="23"
            value={p.schedule.start}
            onChange={(e) =>
              update({
                ...p,
                schedule: { ...p.schedule, start: Number(e.target.value) },
              })
            }
          />
          点，下班
          <input
            aria-label={stock.id + "运输下班"}
            type="number"
            min="0"
            max="24"
            value={p.schedule.end}
            onChange={(e) =>
              update({
                ...p,
                schedule: { ...p.schedule, end: Number(e.target.value) },
              })
            }
          />
          点
        </label>
        <label>
          <input
            type="checkbox"
            checked={p.schedule.lunch}
            onChange={(e) =>
              update({
                ...p,
                schedule: { ...p.schedule, lunch: e.target.checked },
              })
            }
          />
          12–13 点午休
        </label>
      </div>
      <p>
        预计每日：工资 {cost.wages.toFixed(1)} + 维护{" "}
        {cost.maintenance.toFixed(1)} 金币。今日已计{" "}
        {(stock.transportCosts?.day === day
          ? stock.transportCosts.wages
          : 0
        ).toFixed(1)}{" "}
        +{" "}
        {(stock.transportCosts?.day === day
          ? stock.transportCosts.maintenance
          : 0
        ).toFixed(1)}
        。
      </p>
      <p>
        支持跨午夜班次。下班或缩编后完成已接订单，按原工资补计加班；暂停仓库停止运输与计费。
      </p>
    </details>
  );
}
