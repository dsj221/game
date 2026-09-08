import { Component, type ReactNode } from "react";
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
  Pickaxe,
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
import { worlds } from "./data/definitions";
import { expansionPrice } from "./systems/economy";
import { save, exportSave } from "./systems/persistence";
import { format } from "./utils/format";
import type { WorldId } from "./types";
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
  const r = R(),
    w = W(),
    g = G(),
    s = S(),
    ui = U(),
    b = B(),
    n = N();
  const local = b.buildings.filter(
    (v) => v.world === w.current && v.type !== "road",
  );
  const dark =
    w.current !== "overworld" ||
    s.hour < 6 ||
    s.hour > 19 ||
    s.weather.includes("dusk");
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
                (Object.keys(worlds) as WorldId[]).map((id, i) => (
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
              <span className="eyebrow">
                {w.interior
                  ? "BLOCKCAST · ON AIR"
                  : "A LITTLE WORLD, A LITTLE WONDER"}
              </span>
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
              : `${worlds[w.current].name} · 第 ${T.getState().day} 天`}
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
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  U.setState({ collecting: true });
                }}
                onPointerUp={() => U.setState({ collecting: false })}
                onPointerCancel={() => U.setState({ collecting: false })}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    U.setState({ collecting: true });
                  }
                }}
                onKeyUp={() => U.setState({ collecting: false })}
                onBlur={() => U.setState({ collecting: false })}
              >
                <Pickaxe size={21} />
                <b>采集</b>
                <span>+1 木材</span>
                <small>按住</small>
              </button>
              <span className="collect-hint">一锤一镐，也是一种生活。</span>
            </div>
          )}
          {ui.placement && (
            <div className="build-toolbar">
              <div>
                <b>
                  {ui.placement === "expand"
                    ? "选择黄色边缘地块"
                    : ui.moving
                      ? "给建筑找一个新位置"
                      : "点击空地，安放新的可能"}
                </b>
                <small>
                  {ui.placement === "expand"
                    ? `开垦费用 ${format(expansionPrice(w.tiles[w.current].length))} 金币`
                    : `R 旋转 · 方向 ${ui.rotation * 90}° · Esc 取消`}
                </small>
              </div>
              {ui.expand && (
                <button className="primary" onClick={expand}>
                  确认建造
                </button>
              )}
              <button aria-label="取消建造" onClick={cancelBuild}>
                <X size={18} />
              </button>
            </div>
          )}
        </section>
        <Drawer />
      </main>
      <BuildMenu />
      {ui.toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {ui.toast}
        </div>
      )}
      <Settings />
    </div>
  );
}
