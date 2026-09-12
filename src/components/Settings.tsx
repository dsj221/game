import { useRef, useState } from "react";
import {
  CloudRain,
  Download,
  Moon,
  Snowflake,
  Sun,
  Upload,
  X,
  Sparkles,
  Lamp,
  Cloud,
  Star,
} from "lucide-react";
import { useSettingsStore as S, useUIStore as U } from "../stores";
import { achieve } from "../game/actions";
import { exportSave, importSave, newGame } from "../systems/persistence";
const options = [
  ["station", "气象台", Cloud],
  ["rain", "雨季", CloudRain],
  ["snow", "初雪", Snowflake],
  ["fireflies", "萤火虫", Sparkles],
  ["meteors", "流星观测", Star],
  ["lanterns", "园林灯饰", Lamp],
  ["dusk", "日暮", Moon],
] as const;
export default function Settings() {
  const modal = U((s) => s.modal),
    s = S(),
    [tab, setTab] = useState("世界故事"),
    [confirm, setConfirm] = useState(false),
    file = useRef<HTMLInputElement>(null!);
  if (!modal) return null;
  return (
    <div className="modal-shade" onClick={() => U.setState({ modal: null })}>
      <section
        className={`modal ${modal === "help" ? "help-modal" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <h1>{modal === "help" ? "欢迎来到块间" : "世界设置"}</h1>
          </div>
          <button
            className="icon-button"
            aria-label="关闭设置"
            onClick={() => U.setState({ modal: null })}
          >
            <X size={21} />
          </button>
        </header>
        {modal === "help" ? (
          <div className="help-body">
            <h2>不赶时间，建一个属于你的小世界。</h2>
            <p>
              住宅迎来邻居，岗位带来生产。农田的小麦经过磨坊和面包房变成面包，居民到店消费后才产生营业收入。
            </p>
            <div className="help-grid">
              {[
                ["左键拖动", "平移世界"],
                ["右键 / Shift + 左键", "旋转世界"],
                ["滚轮", "缩放镜头"],
                ["点击建筑", "查看经营详情与块间关系"],
                [
                  "1 · 2 · 3 · 4 · 5 · 6",
                  "住宅 · 生产 · 商业 · 公共 · 道路 · 装饰",
                ],
                ["R / Esc", "旋转建筑 / 取消建造"],
              ].map(([a, b]) => (
                <div key={a}>
                  <kbd>{a}</kbd>
                  <span>{b}</span>
                </div>
              ))}
            </div>
            <p>
              第一步：建一座住宅、一块农田和一家杂货店，领取邻里愿望奖励。白天工作，夜间休息；可用底部倍速加快日程。进度每
              10 秒自动保存，可在设置中导出备份。
            </p>
            <button
              className="primary"
              onClick={() => U.setState({ modal: null })}
            >
              走进我的世界
            </button>
          </div>
        ) : (
          <div className="settings-layout">
            <nav>
              {["界面边框", "分屏特效", "天空", "世界故事", "存档管理"].map(
                (t) => (
                  <button
                    className={tab === t ? "active" : ""}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ),
              )}
              <span>
                每一点改变
                <br />
                都在世界里发生。
              </span>
            </nav>
            <div className="settings-content">
              <div className="settings-caption">
                <h2>{tab}</h2>
                <span>实时应用至世界</span>
              </div>
              {tab === "世界故事" ? (
                <>
                  <p className="description">
                    给日常加一点天气，给夜晚留一些星光。
                  </p>
                  <div className="weather-grid">
                    {options.map(([id, name, Icon]) => (
                      <button
                        className={s.weather.includes(id) ? "active" : ""}
                        key={id}
                        onClick={() => {
                          S.setState({
                            weather: s.weather.includes(id)
                              ? s.weather.filter((w) => w !== id)
                              : [...s.weather, id],
                          });
                          if (id === "rain") achieve("rain");
                        }}
                      >
                        <Icon size={21} />
                        <span>{name}</span>
                        <i className="switch" />
                      </button>
                    ))}
                  </div>
                  <label className="setting-row">
                    昼夜自行交替{" "}
                    <input
                      type="checkbox"
                      checked={s.cycle}
                      onChange={(e) => S.setState({ cycle: e.target.checked })}
                    />
                  </label>
                  <label className="setting-row">
                    世界时间{" "}
                    <b>
                      {Math.floor(s.hour).toString().padStart(2, "0")}:
                      {Math.floor((s.hour % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                    </b>
                  </label>
                  <input
                    aria-label="世界时间"
                    className="wide"
                    type="range"
                    min="0"
                    max="23.9"
                    step=".1"
                    value={s.hour}
                    onChange={(e) =>
                      S.setState({ hour: Number(e.target.value), cycle: false })
                    }
                  />
                  <label className="setting-row">
                    时间速度 <b>{s.speed === 0 ? "暂停" : s.speed + "×"}</b>
                  </label>
                  <input
                    aria-label="时间速度"
                    className="wide"
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={[0, 1, 2, 4].indexOf(s.speed)}
                    onChange={(e) =>
                      S.setState({
                        speed: [0, 1, 2, 4][Number(e.target.value)],
                      })
                    }
                  />
                  <div className="range-labels">
                    <span>暂停</span>
                    <span>1×</span>
                    <span>2×</span>
                    <span>4×</span>
                  </div>
                </>
              ) : tab === "天空" ? (
                <>
                  <p>选择主世界的白昼色调。</p>
                  <div className="camera-grid">
                    {[
                      ["natural", "自然灰绿"],
                      ["warm", "暖日米白"],
                    ].map(([v, n]) => (
                      <button
                        className={s.sky === v ? "active" : ""}
                        key={v}
                        onClick={() => S.setState({ sky: v })}
                      >
                        <Sun size={16} /> {n}
                      </button>
                    ))}
                  </div>
                </>
              ) : tab === "界面边框" ? (
                <label className="setting-row">
                  显示精细界面边框
                  <input
                    type="checkbox"
                    checked={s.border}
                    onChange={(e) => S.setState({ border: e.target.checked })}
                  />
                </label>
              ) : tab === "分屏特效" ? (
                <>
                  <label className="setting-row">
                    世界切换淡入效果
                    <input
                      type="checkbox"
                      checked={s.effects}
                      onChange={(e) =>
                        S.setState({ effects: e.target.checked })
                      }
                    />
                  </label>
                  <label className="setting-row">
                    声音
                    <input
                      type="checkbox"
                      checked={s.sound}
                      onChange={(e) => S.setState({ sound: e.target.checked })}
                    />
                  </label>
                  <label className="setting-row">
                    音量
                    <input
                      aria-label="音量"
                      type="range"
                      min="0"
                      max=".5"
                      step=".01"
                      value={s.volume}
                      onChange={(e) =>
                        S.setState({ volume: Number(e.target.value) })
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <p className="description">
                    你的大陆保存在当前浏览器。导出一份存档，让它安心远行。
                  </p>
                  <button className="secondary wide" onClick={exportSave}>
                    <Download size={17} /> 导出存档 JSON
                  </button>
                  <button
                    className="secondary wide"
                    onClick={() => file.current.click()}
                  >
                    <Upload size={17} /> 导入存档 JSON
                  </button>
                  <input
                    hidden
                    type="file"
                    accept=".json,application/json"
                    ref={file}
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        void importSave(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                  <hr />
                  <button
                    className="danger wide"
                    onClick={() => setConfirm(true)}
                  >
                    新游戏
                  </button>
                  {confirm && (
                    <div className="confirm-reset">
                      <p>重新开始会替换此浏览器中的进度。建议先导出存档。</p>
                      <button className="danger" onClick={newGame}>
                        确认重新开始
                      </button>
                      <button onClick={() => setConfirm(false)}>
                        保留世界
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
