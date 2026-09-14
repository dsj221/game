import { Component, type ReactNode } from "react";
import { daylight } from "./systems/daylight";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Diamond,
  Expand,
  Globe,
  HelpCircle,
  Leaf,
  MousePointer2,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  ShoppingBag,
  Sun,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  Factory,
  CloudRain,
  Coins,
  Package,
} from "lucide-react";
import World from "./world/World";
import Drawer from "./components/Drawer";
import Settings from "./components/Settings";
import { TopHUD, BuildMenu, TownGoal, TownNews } from "./components/TownHUD";
import { useTownStore as T } from "./stores/useTownStore";
import { useGameLoop } from "./hooks/useGameLoop";
import {
  useBuildingStore as B,
  useGameStore as G,
  useNpcStore as N,
  useResourceStore as R,
  useSettingsStore as S,
  useUIStore as U,
  useWorldStore as W,
} from "./stores";
import {
  beginBuild,
  cancelBuild,
  expand,
  notify,
  panel,
  studioAction,
  switchWorld,
} from "./game/actions";
import { worlds, defs } from "./data/definitions";
import { influenceFor } from "./systems/buildingInfluence";
import { PlacementInfo } from "./components/PlacementInfo";
import { PlacementBar } from "./components/PlacementBar";
import { LandRegions } from "./components/LandRegions";
import { TownPromotion } from "./components/TownPromotion";
import { quests } from "./data/town";
import { expansionPrice, expansionTotal } from "./systems/economy";
import { save, exportSave } from "./systems/persistence";
import { format } from "./utils/format";
import type { WorldId } from "./types";
import { seasons, seasonIndex } from './data/artDirection';
class RenderBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="render-error">
        <h2>3D 场景暂时无法加载</h2>
        <p>请使用支持 WebGL 的现代浏览器并开启硬件加速。</p>
        <button onClick={() => location.reload()}>重新加载</button>
        <button onClick={exportSave}>导出当前进度</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  useGameLoop();
  const season = T(state => seasons[seasonIndex(state.day)].name);
  const r = R(),
    w = W(),
    s = S(),
    ui = U(),
    b = B(),
    n = N(),
    g = G();
  const local = b.buildings.filter(
    (v) => v.world === w.current && v.type !== "road",
  );
  const dark =
    w.current !== "overworld" ||
    daylight(s.hour, s.weather.includes("dusk")) < 0.5;
  const title = w.interior
    ? "我的直播间"
    : w.current === "overworld"
      ? "把日子，过成小世界。"
      : w.current === "nether"
        ? "在炽热中，发现生机。"
        : "星海之外，万物生长。";
  return (
    <div
      className={`app ${dark ? "dark-world" : ""} ${!s.border ? "borderless" : ""}`}
    >
      <TopHUD />
      <main className={ui.panel ? "has-drawer" : ""}>
        <section className={`world-area ${w.interior ? "interior" : ""}`}>
          <div
            className={`canvas-wrap ${s.effects ? "fade-world" : ""}`}
            key={`${w.current}-${w.interior}`}
          >
            <RenderBoundary>
              <World />
            </RenderBoundary>
          </div>
          <div className="world-top">
            <div className="world-tabs">
              {w.interior ? (
                <button
                  className="active"
                  onClick={() => {
                    W.setState({ interior: false });
                    panel(null);
                  }}
                >
                  <ArrowLeft size={15} /> 返回世界
                </button>
              ) : (
                (["overworld"] as WorldId[]).map((id, i) => (
                  <button
                    className={w.current === id ? "active" : ""}
                    key={id}
                    onClick={() => switchWorld(id)}
                  >
                    {i === 0 ? (
                      <Globe size={14} />
                    ) : i === 1 ? (
                      <span className="world-dot nether" />
                    ) : (
                      <span className="world-dot end" />
                    )}
                    {worlds[id].name}
                  </button>
                ))
              )}
            </div>
            <div className="world-title">
              <h1>{title}</h1>
              <p>
                {w.interior
                  ? "把每一个平凡瞬间，讲给远方的人。"
                  : "不必匆忙，你的世界正在慢慢生长。"}
              </p>
            </div>
            <TownGoal />
          </div>
          <TownNews />
          <div className="world-meta">
            <span className="small-dot" />{" "}
            {w.interior
              ? "频道正在直播"
              : `${season} · 第 ${T.getState().day} 天`}
            <span>
              {s.weather.includes("rain") ? (
                <CloudRain size={14} />
              ) : (
                <Sun size={14} />
              )}{" "}
              {Math.floor(s.hour).toString().padStart(2, "0")}:
              {Math.floor((s.hour % 1) * 60)
                .toString()
                .padStart(2, "0")}
            </span>
          </div>
          <div className="camera-tools">
            <button
              aria-label="重置镜头"
              title="重置镜头"
              onClick={() =>
                U.setState((v) => ({ cameraReset: v.cameraReset + 1 }))
              }
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label="建造模式"
              title="建造模式"
              onClick={() => panel("shop")}
            >
              <Plus size={19} />
            </button>
            <button
              aria-label="开垦大陆"
              title="开垦大陆"
              onClick={() =>
                U.setState({ placement: "expand", expand: null, panel: null })
              }
            >
              <Expand size={17} />
            </button>
          </div>
          <div className="world-bottom-info">
            <span>
              {w.tiles[w.current].length} 块土地 <i /> {local.length} 座设施{" "}
              <i /> {n.npcs.filter((v) => v.world === w.current).length} 位居民
            </span>
            <small>
              <MousePointer2 size={12} /> 左键平移 · 右键旋转 · 滚轮缩放
            </small>
          </div>
          {!w.interior && !ui.placement && (
            <div className="collect-area">
              <div className="resonance">
                <span>林间馈赠</span>
                <div>
                  <i style={{ width: `${g.resonance}%` }} />
                </div>
                <b>{g.resonance}%</b>
              </div>
              <button
                className={`collect-button ${ui.collecting ? "collecting" : ""}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  U.setState({ collecting: true });
                }}
                onPointerUp={() => U.setState({ collecting: false })}
                onPointerCancel={() => U.setState({ collecting: false })}
                onKeyDown={(event) => {
                  if (
                    (event.key === " " || event.key === "Enter") &&
                    !event.repeat
                  ) {
                    event.preventDefault();
                    U.setState({ collecting: true });
                  }
                }}
                onKeyUp={() => U.setState({ collecting: false })}
                onBlur={() => U.setState({ collecting: false })}
              >
                <Coins size={21} />
                <b>获取金币</b>
                <span>
                  +{1 + (g.forestGifts ?? Math.floor(g.collected / 20))} 金币
                </span>
                <small>按住</small>
              </button>
              <span className="collect-hint">
                每完成一次林间馈赠，单次获取金币永久 +1。
              </span>
            </div>
          )}
          {ui.placement && ui.placement !== "expand" && (
            <PlacementBar key={`${ui.placement}:${ui.moving || "new"}`} />
          )}
          {ui.placement === "expand" && (
            <div className="build-toolbar">
              <div>
                <LandRegions />
                <b>
                  {ui.placement === "expand"
                    ? "选择多块黄色边缘地块 · 再次点击取消选中"
                    : ui.moving
                      ? "给建筑找一个新位置"
                      : "点击空地，安放新的可能"}
                </b>
                <small>
                  {ui.placement === "expand"
                    ? ui.expand?.length
                      ? `已选 ${ui.expand.length} 块 · 合计 ${format(expansionTotal(w.tiles[w.current].length, ui.expand.length))} 金币`
                      : `南部林地 · 人口 ≥ 6 · 首块 ${format(expansionPrice(w.tiles[w.current].length))} 金币`
                    : `R 旋转 · 方向 ${ui.rotation * 90}° · Esc 取消`}
                </small>
                <PlacementInfo />
                {ui.activeGuide && (
                  <p className="active-guide">
                    {quests.find((q) => q.id === ui.activeGuide)?.hint}
                  </p>
                )}
              </div>
              {!!ui.expand?.length && (
                <button
                  className="primary"
                  onClick={expand}
                  disabled={
                    r.currency <
                    expansionTotal(w.tiles[w.current].length, ui.expand.length)
                  }
                >
                  确认扩建 {ui.expand.length} 块
                </button>
              )}
              <button aria-label="取消建造" onClick={cancelBuild}>
                <X size={18} />
              </button>
            </div>
          )}
          {ui.mapMode !== "none" && !ui.placement && (
            <div className="map-legend">
              绿色：良好 · 黄色：一般 · 红色：不足
              <br />
              幸福度仅显示已入住住宅；点击住宅查看原因。土地价值为服务覆盖指数。
            </div>
          )}
        </section>
        <Drawer />
      </main>
      <BuildMenu />
      {ui.toast && (
        <div
          className={`toast ${ui.placement ? "placement-toast" : ""}`}
          role="status"
        >
          <Check size={16} />
          {ui.toast}
        </div>
      )}
      <Settings />
      <TownPromotion />
    </div>
  );
}
