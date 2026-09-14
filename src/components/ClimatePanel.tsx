import {WeatherForecastPanel} from "./WeatherForecastPanel";
import {spendableBag} from "../systems/logistics";
import { HydrologyPanel } from './HydrologyPanel';
import { useTownStore as T } from "../stores/useTownStore";
import { useResourceStore as R } from "../stores";
import {
  canalProject,
  forecast,
  seasonAt,
  seasonDay,
  seasonNames,
} from "../systems/climate";
export function ClimatePanel() {
  const t = T(),
    resources = R();
  const upcoming = forecast(t.day);
  return (
    <article className="event-card">
      <b>
        {seasonNames[seasonAt(t.day)]}季 · 第 {seasonDay(t.day)} / 14 天
      </b>
      <p>春播与排涝 · 夏季游客与缺水 · 秋收外贸 · 冬季储备与室内服务</p>
      {upcoming.length ? (
        upcoming.map((e) => (
          <p key={e.type}>
            预报：{e.startDay - t.day} 天后 · {e.title}（持续{" "}
            {e.endDay - e.startDay + 1} 天）
            <br />
            {e.description}
          </p>
        ))
      ) : (
        <p>未来 2 天无新事件。可趁现在备粮、储柴，在建筑详情中调整班次。</p>
      )}
      <p>
        冬季每位居民每天用 1 木材取暖；农田冬季效率为
        45%。泥路使货运通行耗时增加至2.5倍。水井需要附近河道补给；连通水渠引水灌溉，断流后消耗存水。
      </p>
      <WeatherForecastPanel/>
      <HydrologyPanel/>
      <details>
        <summary>地块与水渠工程 · {t.climate?.cells.length || 0} 处</summary>
        {(t.climate?.cells || []).map((c) => (
          <p key={`${c.x}:${c.z}`}>
            地块 ({c.x}, {c.z}) · 含水 {c.water.toFixed(0)}% ·{" "}
            {{
              mud: "泥泞",
              cracks: "干裂",
              stubble: "麦茬",
              snow: "积雪",
              ribbons: "庆典彩带",
              "": "正常",
            }[c.scar || ""] || "正常"}{" "}
            <button
              disabled={
                c.canal || spendableBag(T.getState(),resources.bag).wood < 5 || spendableBag(T.getState(),resources.bag).stone < 5
              }
              onClick={() => {
                const r = R.getState(),
                  next = canalProject(
                    T.getState(),
                    spendableBag(T.getState(),r.bag).wood,
                    spendableBag(T.getState(),r.bag).stone,
                    c.x,
                    c.z,
                  );
                if (next) {
                  T.setState(next);
                  R.setState({
                    bag: {
                      ...r.bag,
                      wood: r.bag.wood - 5,
                      stone: r.bag.stone - 5,
                    },
                  });
                }
              }}
            >
              {c.canal ? "水渠已建" : "修水渠 · 5 木材 + 5 石材"}
            </button>
          </p>
        ))}
      </details>
    </article>
  );
}
