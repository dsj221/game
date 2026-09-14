import { useEffect } from "react";
import { useTownStore as T } from "../stores/useTownStore";
import {
  useBuildingStore as B,
  useWorldStore as W,
  useUIStore as U,
} from "../stores";
import { estimateWeather } from "../systems/weatherImpact";
import { locateFreight } from "./ChainDiagnosis";
export function WeatherForecastPanel() {
  const t = T(),
    buildings = B((s) => s.buildings),
    tiles = W((s) => s.tiles.overworld),
    impact = U((s) => s.weatherImpact),
    overlay = U((s) => s.weatherRiskOverlay),
    channels =
      t.climate?.cells
        .filter((c) => c.canal)
        .map((c) => `${c.x},${c.z}`)
        .join(";") || "";
  const update = () =>
    U.setState({
      weatherImpact: estimateWeather(
        T.getState(),
        B.getState().buildings,
        W.getState().tiles.overworld,
      ),
    });
  useEffect(() => {
    update();
  }, [t.day, buildings, tiles, t.hydrology?.gate, t.hydrology?.damZ, channels]);
  return (
    <section className="weather-impact">
      <h3>天气影响估算</h3>
      <button onClick={update}>更新影响估算</button>
      <button
        aria-pressed={overlay}
        onClick={() => U.setState({ weatherRiskOverlay: !overlay })}
      >
        {overlay ? "隐藏" : "显示"}天气风险地图
      </button>
      {impact && (
        <>
          <p>
            第 {impact.day} 天 {Math.floor(impact.minute / 60)}:
            {String(impact.minute % 60).padStart(2, "0")} 的估算 ·{" "}
            {impact.event} · 向前推演 {impact.days} 天
          </p>
          <p>
            可调配河水与渠水 {impact.water.toFixed(1)} 单位，
            {impact.storageDays === null
              ? `预测期内未耗尽（至少 ${impact.days} 天）`
              : `预计 ${impact.storageDays.toFixed(1)} 天后低于可用水位`}
            。
          </p>
          <p>
            水力发电：当前 {impact.powerNow.toFixed(1)} → 预测最低{" "}
            {impact.powerMin.toFixed(1)}，最大下降{" "}
            {impact.powerNow > 0
              ? Math.max(
                  0,
                  (1 - impact.powerMin / impact.powerNow) * 100,
                ).toFixed(0)
              : 0}
            %。
          </p>
          <p>
            按当前闸门、渠道与建筑不变推演，含未来天气与灌溉；总水量仍有剩余时，未连通农田也可能先缺水。工程改变后会重新估算。
          </p>
          {impact.risks.length ? (
            impact.risks.map((r) => (
              <p key={r.id + r.kind}>
                <button
                  onClick={() => {
                    const b = buildings.find((b) => b.id === r.id);
                    if (b) locateFreight(b);
                    U.setState({ weatherRiskOverlay: true });
                  }}
                >
                  {r.kind} · ({r.x}, {r.z}) · {r.afterDays.toFixed(1)} 天后
                  {r.kind === "发电下降"
                    ? `降至 ${r.value.toFixed(1)}`
                    : `土壤含水 ${r.value.toFixed(0)}%`}
                </button>
              </p>
            ))
          ) : (
            <p>预测期内未发现农田缺水、受涝或水轮机明显减产风险。</p>
          )}
        </>
      )}
    </section>
  );
}
