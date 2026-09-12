import { forecast, seasonAt, seasonDay, seasonNames } from '../systems/climate';
import {
  Coins,
  Users,
  Heart,
  Wheat,
  Leaf,
  Pause,
  Play,
  Settings2,
  Save,
  HelpCircle,
  Volume2,
  VolumeX,
  Home,
  Factory,
  ShoppingBag,
  Flower2,
  Trees,
  Route,
  BookOpen,
  Newspaper,
  ChevronRight,
  Gift,
  ArrowRight,
  Lock,
  Trophy,
} from "lucide-react";
import { useTownStore as T } from "../stores/useTownStore";
import {
  useResourceStore as R,
  useUIStore as U,
  useSettingsStore as S,
  useWorldStore as W,
  useBuildingStore as B,
  useGameStore as G,
} from "../stores";
import { quests, townLevels } from "../data/town";
import { questProgress } from "../game/TownSimulation";
import {
  beginBuild,
  claimQuest,
  panel,
  studioAction,
  goToQuest,
} from "../game/actions";
import { save } from "../systems/persistence";
import { format } from "../utils/format";
export function TopHUD() {
  const t = T(),
    r = R(),
    s = S();
  return (
    <header className="topbar town-topbar">
      <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
        <span className="brand-mark">
          <span />
          <span />
          <span />
        </span>
        <span>
          块间<small>KUAI–BLOCK</small>
        </span>
      </a>
      <button className="town-clock" onClick={() => panel("daily")}>
        <span>第 {t.day} 天</span>
        <b>
          {Math.floor(t.minute / 60)
            .toString()
            .padStart(2, "0")}
          :
          {Math.floor(t.minute % 60)
            .toString()
            .padStart(2, "0")}
        </b>
        <small>慢慢来，日子还长</small>
      </button>
      <button
        className="hud-pill coins primary"
        onClick={() => panel("daily")}
        aria-label="查看经营日报"
      >
        <Coins size={20} />
        <div>
          <b data-testid="currency">{format(r.currency)}</b>
          <small>{`今日净额 ${(t.ledger.revenue - t.ledger.wages - t.ledger.maintenance - t.ledger.purchases).toFixed(0)}`}</small>
        </div>
      </button>
      <button className="hud-pill primary" onClick={() => panel("village")}>
        <Users size={18} />
        <div>
          <b data-testid="population">
            {t.metrics.population} / {t.metrics.capacity}
          </b>
          <small>住在这里的人</small>
        </div>
      </button>
      <button className="hud-pill primary" onClick={() => panel("village")}>
        <Heart size={18} />
        <div>
          <b>{Math.round(t.metrics.happiness)}%</b>
          <small>幸福度</small>
        </div>
      </button>
      <div className="hud-pill resource-hud">
        <Wheat size={18} />
        <div>
          <b>{format(r.bag.food + r.bag.bread)}</b>
          <small>食品储备</small>
        </div>
      </div>
      <div className="hud-pill resource-hud">
        <Leaf size={18} />
        <div>
          <b>{format(r.bag.wood)}</b>
          <small>木材</small>
        </div>
      </div>
      <button className="level-badge" onClick={() => panel("quests")}>
        Lv.{t.level}
        <small>{townLevels[t.level - 1].name}</small>
      </button>
      <div className="top-actions">
        <select
          aria-label="地图信息模式"
          value={U((s) => s.mapMode)}
          onChange={(e) =>
            U.setState({
              mapMode: e.target.value as ReturnType<
                typeof U.getState
              >["mapMode"],
            })
          }
        >
          {Object.entries({
            none: "地图视图",
            happiness: "幸福度",
            commerce: "商业覆盖",
            jobs: "就业覆盖",
            food: "食品覆盖",
            health: "医疗覆盖",
            environment: "环境",
            roads: "道路覆盖",
            value: "土地价值",
          }).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label={s.sound ? "关闭声音" : "开启声音"}
          onClick={() => S.setState({ sound: !s.sound })}
        >
          {s.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          className="icon-button"
          aria-label="保存世界"
          onClick={() => save()}
        >
          <Save size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="帮助"
          onClick={() => U.setState({ modal: "help" })}
        >
          <HelpCircle size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="世界设置"
          onClick={() => U.setState({ modal: "settings" })}
        >
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
}
export function BuildMenu() {
  const ui = U(),
    s = S(),
    w = W(),
    g = G();
  return (
    <footer className="bottom-bar town-bottom">
      <div className="speed-controls">
        {[0, 1, 2, 4].map((v) => (
          <button
            key={v}
            className={s.speed === v ? "active" : ""}
            aria-label={v === 0 ? "暂停游戏" : `${v}倍速`}
            onClick={() => S.setState({ speed: v })}
          >
            {v === 0 ? (
              <Pause size={13} />
            ) : v === 1 ? (
              <Play size={13} />
            ) : (
              v + "×"
            )}
          </button>
        ))}
      </div>
      <nav className="build-categories">
        {w.interior
          ? ["节目", "频道设备", "整理房间", "室内装扮", "收礼"].map((v, i) => (
              <button
                key={v}
                onClick={() => (i ? studioAction(v) : panel("studio", "节目"))}
              >
                {v}
              </button>
            ))
          : (
              [
                ["住宅", Home],
                ["生产", Factory],
                ["商业", ShoppingBag],
                ["公共", Trees],
                ["道路", Route],
                ["装饰", Flower2],
              ] as const
            ).map(([name, Icon], i) => (
              <button
                key={name}
                className={
                  ui.panel === "shop" && ui.category === name ? "active" : ""
                }
                onClick={() =>
                  U.setState({ panel: "shop", tab: "发现", category: name })
                }
              >
                <Icon size={20} />
                <span>{name}</span>
                <kbd
                  title={`键盘快捷键 ${i + 1}`}
                  aria-label={`快捷键 ${i + 1}`}
                >
                  按 {i + 1}
                </kbd>
              </button>
            ))}
      </nav>
      <div className="town-management">
        <button
          title="居民与供需"
          aria-label="居民与供需"
          onClick={() => panel("village")}
        >
          <Users size={19} />
        </button>
        <button
          title="邻里愿望"
          className="wishes-entry"
          aria-label="邻里愿望"
          onClick={() => panel("quests")}
        >
          <BookOpen size={19} />
          <span>邻里愿望</span>
        </button>
        <button
          title="小镇日报"
          aria-label="小镇日报"
          onClick={() => panel("daily")}
        >
          <Newspaper size={19} />
        </button>
        <button
          title="街区手记"
          aria-label="街区手记"
          onClick={() => panel("book")}
        >
          <Trophy size={19} />
        </button>
      </div>
    </footer>
  );
}
export function TownGoal() {
  const t = T(),
    b = B((s) => s.buildings),
    q =
      quests.find((q) => q.stage <= t.level && !t.claimed.includes(q.id)) ||
      quests[quests.length - 1],
    ready = t.completed.includes(q.id) && !t.claimed.includes(q.id);
  const progress = Math.min(q.count, questProgress(t, b, q.id));
  return (
    <div className={`next-goal town-goal ${ready ? "ready" : ""}`}>
      <button className="wishes-heading" onClick={() => panel("quests")}>
        邻里愿望 · 查看全部 <ChevronRight size={15} />
      </button>
      <span>
        {ready ? "一个心愿，已经实现" : "下一件小小的事"}
        {ready ? <Gift size={15} /> : <ChevronRight size={15} />}
      </span>
      <b>{q.title}</b>
      <small>{ready ? `领取 ${q.reward} 金币奖励` : q.text}</small>
      <div className="quest-progress">
        <i style={{ width: `${(progress / q.count) * 100}%` }} />
      </div>
      <span>
        {progress} / {q.count}
        <em>{ready ? "点击领取" : "直接前往完成"}</em>
      </span>
      <button
        className="wish-direct"
        onClick={() => (ready ? claimQuest(q.id) : goToQuest(q.id))}
      >
        {ready ? "领取奖励" : "前往当前任务"} <ArrowRight size={13} />
      </button>
    </div>
  );
}
export function TownNews() {
  const t = T();
  return (
    <div className="town-news">
      <button onClick={() => panel("daily")}><b>{seasonNames[seasonAt(t.day)]} · {seasonDay(t.day)}/14 天</b><small>{forecast(t.day).map(e=>e.title+' · '+(e.startDay-t.day)+' 天后').join(' / ') || '天气与地块 · 查看准备事项'}</small></button>
      {t.legacy && (
        <button onClick={() => U.setState({ modal: "settings" })}>
          原有世界已接入经营规则 · 设置中可开始全新聚落
        </button>
      )}
      {t.events.map((e) => (
        <button
          className={`event-pill ${e.type}`}
          key={e.id}
          onClick={() => panel("daily")}
        >
          <span className="small-dot" />
          <span>
            <b>{e.title}</b>
            <small>
              {e.description} · 剩余 {(e.remaining / 360).toFixed(1)} 天
            </small>
          </span>
          <ChevronRight size={14} />
        </button>
      ))}
      {t.reports.length > 0 && (
        <button onClick={() => panel("daily")}>
          <Newspaper size={14} /> 第 {t.reports[0].day} 天日报已送达
        </button>
      )}
      {t.metrics.foodDays < 0.5 && (
        <button className="food-warning" onClick={() => panel("village")}>
          <Wheat size={15} /> 食品不足，邻居有点饿了 <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
