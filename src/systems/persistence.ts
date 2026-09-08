import {
  useBuildingStore as B,
  useGameStore as G,
  useNpcStore as N,
  useResourceStore as R,
  useSettingsStore as S,
  useWorldStore as W,
} from "../stores";
import { defs } from "../data/definitions";
import { notify } from "../game/actions";
export const SAVE_KEY = "kuai-block-save-v1";
let resetting = false;
export function snapshot() {
  return {
    version: 1,
    savedAt: Date.now(),
    resources: R.getState(),
    world: W.getState(),
    buildings: B.getState().buildings,
    npcs: N.getState().npcs,
    game: { ...G.getState(), floating: [] },
    settings: S.getState(),
  };
}
export function save(silent = false) {
  if (resetting) return;
  try {
    const data = snapshot();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    G.setState({ lastSaved: data.savedAt });
    if (!silent) notify("世界已保存在此浏览器");
  } catch {
    if (!silent) notify("存档空间不足，请导出 JSON 备份");
  }
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
const num = (v: unknown, min = 0, max = 1e15) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function validate(data: unknown): ReturnType<typeof snapshot> {
  assert(data && typeof data === "object", "无效的存档");
  const d = data as ReturnType<typeof snapshot>;
  assert(d.version === 1, "不支持的存档版本");
  assert(
    d.resources &&
      num(d.resources.currency) &&
      num(d.resources.energy, 0, 480) &&
      d.resources.maxEnergy === 480,
    "资源数据无效",
  );
  for (const k of ["wood", "stone", "iron", "redstone", "food"] as const)
    assert(num(d.resources.bag?.[k]), "材料数据无效");
  assert(
    d.world &&
      ["overworld", "nether", "end"].includes(d.world.current) &&
      Array.isArray(d.world.visited) &&
      d.world.visited.every((w) => ["overworld", "nether", "end"].includes(w)),
    "世界数据无效",
  );
  for (const w of ["overworld", "nether", "end"] as const) {
    assert(
      Array.isArray(d.world.tiles?.[w]) &&
        d.world.tiles[w].length > 0 &&
        d.world.tiles[w].length <= 500,
      "地块数据无效",
    );
    const keys = new Set();
    for (const t of d.world.tiles[w]) {
      assert(
        Number.isInteger(t.x) &&
          Math.abs(t.x) < 100 &&
          Number.isInteger(t.z) &&
          Math.abs(t.z) < 100 &&
          num(t.born),
        "坐标无效",
      );
      const k = `${t.x},${t.z}`;
      assert(!keys.has(k), "地块重复");
      keys.add(k);
    }
  }
  assert(
    Array.isArray(d.buildings) && d.buildings.length <= 5000,
    "建筑数据无效",
  );
  const ids = new Set(),
    occupied = new Set();
  for (const b of d.buildings) {
    assert(
      defs[b.type] &&
        typeof b.id === "string" &&
        !ids.has(b.id) &&
        ["overworld", "nether", "end"].includes(b.world) &&
        Number.isInteger(b.level) &&
        num(b.level, 1, 10) &&
        num(b.rotation, 0, 3) &&
        num(b.born),
      "建筑数据无效",
    );
    assert(
      Number.isInteger(b.x) &&
        Number.isInteger(b.z) &&
        d.world.tiles[b.world].some(
          (t) => Math.abs(t.x * 3 - b.x) <= 1 && Math.abs(t.z * 3 - b.z) <= 1,
        ),
      "建筑超出边界",
    );
    const k = `${b.world},${b.x},${b.z}`;
    assert(!occupied.has(k), "建筑发生重叠");
    ids.add(b.id);
    occupied.add(k);
  }
  assert(Array.isArray(d.npcs) && d.npcs.length <= 200, "居民数据无效");
  for (const n of d.npcs)
    assert(
      typeof n.id === "string" &&
        typeof n.name === "string" &&
        n.name.length < 100 &&
        ["overworld", "nether", "end"].includes(n.world) &&
        ["villager", "copper", "iron"].includes(n.modelType) &&
        num(n.level, 1, 100) &&
        num(n.efficiency, 0, 10) &&
        num(n.phase),
      "居民数据无效",
    );
  assert(
    d.game &&
      Array.isArray(d.game.achievements) &&
      d.game.achievements.every((a) => typeof a === "string") &&
      ["田园时光", "工厂实录", "异界奇遇"].includes(d.game.program),
    "游戏数据无效",
  );
  for (const k of [
    "resonance",
    "ticks",
    "collected",
    "built",
    "viewers",
    "studioIncome",
    "gifts",
    "equipment",
    "decor",
    "orders",
    "totalEarned",
  ] as const)
    assert(num(d.game[k]), "进度数据无效");
  assert(
    d.settings &&
      [0, 1, 2, 4].includes(d.settings.speed) &&
      num(d.settings.hour, 0, 24) &&
      Array.isArray(d.settings.weather) &&
      d.settings.weather.every((w) =>
        [
          "rain",
          "snow",
          "fireflies",
          "meteors",
          "lanterns",
          "dusk",
          "station",
        ].includes(w),
      ) &&
      num(d.settings.volume, 0, 1),
    "设置数据无效",
  );
  return d;
}
function apply(d: ReturnType<typeof snapshot>) {
  R.setState(d.resources);
  W.setState({ ...d.world, interior: false });
  B.setState({
    buildings: d.buildings,
    selected: null,
    offline: [],
    connected: [],
  });
  N.setState({ npcs: d.npcs, selected: null });
  G.setState({ ...d.game, floating: [], lastSaved: d.savedAt });
  S.setState(d.settings);
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) apply(validate(JSON.parse(raw)));
  } catch {
    notify("旧存档无法读取，已保留原文件；可导入备份继续");
  }
}
export function exportSave() {
  save(true);
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `块间世界-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("存档已导出");
}
export async function importSave(file: File) {
  try {
    if (file.size > 5e6) throw new Error("存档文件不能超过 5 MB");
    const d = validate(JSON.parse(await file.text()));
    apply(d);
    save(true);
    notify("世界已恢复");
  } catch (e) {
    notify(`导入失败：${e instanceof Error ? e.message : "文件无效"}`);
  }
}
export function newGame() {
  resetting = true;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
