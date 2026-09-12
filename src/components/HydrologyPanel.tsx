import { useState } from "react";
import { useTownStore as T } from "../stores/useTownStore";
import {
  useResourceStore as R,
  useWorldStore as W,
  useBuildingStore as B,
  useUIStore as U,
} from "../stores";
import {
  buildDam,
  setGate,
  hydroGeneration,
  waterKey,
} from "../systems/hydrology";
import { canalProject } from "../systems/climate";
import { beginBuild } from "../game/actions";
import "./hydrology.css";
export function HydrologyPanel() {
  const t = T(),
    r = R(),
    tiles = W((s) => s.tiles.overworld),
    buildings = B((s) => s.buildings);
  const [selected, select] = useState<{ x: number; z: number } | null>(null);
  const h = t.hydrology;
  const points = tiles.flatMap((t) =>
    Array.from({ length: 9 }, (_, i) => ({
      x: t.x * 3 + (i % 3) - 1,
      z: t.z * 3 + Math.floor(i / 3) - 1,
    })),
  );
  const xmin = Math.min(...points.map((p) => p.x)),
    xmax = Math.max(...points.map((p) => p.x)),
    zmin = Math.min(...points.map((p) => p.z)),
    zmax = Math.max(...points.map((p) => p.z));
  const land = new Set(points.map((p) => waterKey(p.x, p.z))),
    channels = new Map(
      t.climate?.cells
        .filter((c) => c.canal)
        .map((c) => [waterKey(c.x, c.z), c]),
    );
  const reach = h?.reaches.find(
    (p) => p.x === selected?.x && p.z === selected?.z,
  );
  const channel = selected
    ? channels.get(waterKey(selected.x, selected.z))
    : undefined;
  const power = buildings.reduce(
    (n, b) => n + hydroGeneration(b, h, buildings),
    0,
  );
  return (
    <section className="hydrology-panel">
      <h3>河道 · 蓄水与水力</h3>
      {!h?.reaches.length ? (
        <p>当前土地未包含河道；向西扩张可接入河流。</p>
      ) : (
        <>
          <div className="water-stats">
            <span>
              上游水位 <b>{(h.reaches[0].volume / 100).toFixed(2)} m</b>
            </span>
            <span>
              下游水位 <b>{(h.reaches.at(-1)!.volume / 100).toFixed(2)} m</b>
            </span>
            <span>
              水力发电 <b>{power.toFixed(1)} E / 秒</b>
            </span>
          </div>
          <p>
            河水向下游流动。旱季来水减少，暴雨可能漫过河岸；低于 0.18 m
            时水轮机停转、水渠停止取水。
          </p>
          {h.damZ === null ? (
            <button
              disabled={r.bag.wood < 20 || r.bag.stone < 30}
              onClick={() => {
                const resources = R.getState(),
                  town = T.getState(),
                  next = buildDam(
                    town.hydrology,
                    resources.bag.wood,
                    resources.bag.stone,
                  );
                if (next) {
                  T.setState({ hydrology: next });
                  R.setState({
                    bag: {
                      ...resources.bag,
                      wood: resources.bag.wood - 20,
                      stone: resources.bag.stone - 30,
                    },
                  });
                }
              }}
            >
              建蓄水闸 · 20 木材 + 30 石材
            </button>
          ) : (
            <div className="gate-controls">
              <p>
                闸门 ({h.reaches[0].x}, {h.damZ}) · 开度{" "}
                {Math.round(h.gate * 100)}% · 闸前水位{" "}
                {(
                  (h.reaches.find((r) => r.z === h.damZ)?.volume || 0) / 100
                ).toFixed(2)}{" "}
                m
              </p>
              {[
                [0, "关闭蓄水"],
                [0.25, "节水放流"],
                [1, "全开排洪"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={h.gate === value}
                  onClick={() => {
                    const current = T.getState().hydrology;
                    if (current)
                      T.setState({
                        hydrology: setGate(current, Number(value)),
                      });
                  }}
                >
                  {label}
                </button>
              ))}
              <p>
                关闸减少下游灌溉与发电；超过 3 m
                自动溢流。闸前高水位也会浸湿邻近土地。
              </p>
            </div>
          )}
        </>
      )}
      <details open>
        <summary>水渠施工图 · 点击地块选择</summary>
        <p>
          蓝色为河道，青色为有水水渠，棕色为空渠。相邻水渠连通，断开的水渠不会凭空获得河水。
        </p>
        <div className="water-map-scroll">
          <div
            className="water-map"
            role="group"
            aria-label="河道与水渠施工图"
            style={{ gridTemplateColumns: `repeat(${xmax - xmin + 1},24px)` }}
          >
            {Array.from(
              { length: (xmax - xmin + 1) * (zmax - zmin + 1) },
              (_, i) => {
                const x = xmin + (i % (xmax - xmin + 1)),
                  z = zmin + Math.floor(i / (xmax - xmin + 1)),
                  key = waterKey(x, z),
                  river = h?.reaches.find((r) => r.x === x && r.z === z),
                  c = channels.get(key),
                  exists = land.has(key),
                  building = buildings.find(
                    (b) => b.world === "overworld" && b.x === x && b.z === z,
                  );
                return (
                  <button
                    key={key}
                    disabled={!exists}
                    aria-label={`地块 ${x},${z}${river ? " 河道" : c ? " 水渠" : ""}`}
                    aria-pressed={selected?.x === x && selected?.z === z}
                    className={
                      river
                        ? "river"
                        : c
                          ? (c.channelWater || 0) > 0
                            ? "wet-channel"
                            : "dry-channel"
                          : ""
                    }
                    title={`${x},${z}${river ? " · 水位 " + (river.volume / 100).toFixed(2) + "m" : building ? " · " + building.type : ""}`}
                    onClick={() => {
                      select({ x, z });
                      U.setState({ cameraFocus: { x, z, nonce: Date.now() } });
                    }}
                  >
                    {river ? "↓" : c ? "＋" : building ? "▪" : ""}
                  </button>
                );
              },
            )}
          </div>
        </div>
        {selected && (
          <div className="water-selection">
            <b>
              地块 ({selected.x}, {selected.z})
            </b>
            <p>
              {reach
                ? `河道水位 ${(reach.volume / 100).toFixed(2)} m · 过流 ${reach.flow.toFixed(2)} 水量/秒`
                : channel
                  ? `水渠存水 ${(channel.channelWater || 0).toFixed(2)} / 10`
                  : "可修建地下水渠，不占用建筑位置"}
            </p>
            {!reach && (
              <button
                disabled={!!channel || r.bag.wood < 5 || r.bag.stone < 5}
                onClick={() => {
                  const resources = R.getState(),
                    next = canalProject(
                      T.getState(),
                      resources.bag.wood,
                      resources.bag.stone,
                      selected.x,
                      selected.z,
                      tiles,
                    );
                  if (next) {
                    T.setState(next);
                    R.setState({
                      bag: {
                        ...resources.bag,
                        wood: resources.bag.wood - 5,
                        stone: resources.bag.stone - 5,
                      },
                    });
                  }
                }}
              >
                {channel ? "此处水渠已建" : "挖水渠 · 5 木材 + 5 石材"}
              </button>
            )}
          </div>
        )}
      </details>
      <button onClick={() => beginBuild("watermill")}>
        建造河畔水轮机 · Lv.2
      </button>
    </section>
  );
}
