import {validSchedule} from './workSchedule';
import {migrateMainWorld} from './mainWorld';
import {
  useBuildingStore as B,
  useGameStore as G,
  useNpcStore as N,
  useResourceStore as R,
  useSettingsStore as S,
  useWorldStore as W,
} from "../stores";
import { defs } from "../data/definitions";
import { buildingCells } from "../data/footprints";
import { notify } from "../game/actions";
import {useTownStore as T} from '../stores/useTownStore';
import {emptyBag,initialTown} from '../data/town';
import {makeCitizen} from '../data/settlement';
import {metrics} from '../game/TownSimulation';
import {initialDevelopment,civicProjects,commissions} from './development';
export const SAVE_KEY = "kuai-block-save-v2";
const LEGACY_KEY='kuai-block-save-v1';
let resetting = false;
export function snapshot() {
  return {
    version: 2,
    savedAt: Date.now(),
    resources: R.getState(),
    world: W.getState(),
    buildings: B.getState().buildings,
    npcs: N.getState().npcs,
    game: { ...G.getState(), floating: [] },
    settings: S.getState(),
    town:T.getState(),
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
  assert(d.version === 1 || d.version === 2, "不支持的存档版本");
  if(d.version===1){d.version=2;d.resources.bag={...emptyBag(),...d.resources.bag};const homes=d.buildings.filter(b=>defs[b.type]?.town?.capacity);d.npcs=d.npcs.map((n,i)=>({...makeCitizen(n.id,i,homes.filter(h=>h.world===n.world)[Math.floor(i/2)%Math.max(1,homes.filter(h=>h.world===n.world).length)]?.id||'',n.world),...n}));d.town=initialTown();d.town.legacy=true;d.town.minute=d.settings.hour*60;d.town.day=Math.floor(d.game.ticks/360)+1;d.town.nextEvent=d.game.ticks+95;d.town.level=Math.min(4,Math.max(1,Math.floor(d.npcs.filter(n=>n.modelType==='villager').length/6)+1));d.town.metrics=metrics(d.buildings,d.npcs,d.resources.bag);}
  assert(
    d.resources &&
      num(d.resources.currency,-1e15) &&
      num(d.resources.energy, 0, 480) &&
      d.resources.maxEnergy === 480,
    "资源数据无效",
  );
  for (const k of Object.keys(emptyBag()) as (keyof ReturnType<typeof emptyBag>)[])
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
        (w!=='overworld'||d.world.tiles[w].length > 0) &&
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
    assert(b.footprint === undefined || (Array.isArray(b.footprint) && b.footprint.length === 2 && b.footprint.every((v:number)=>Number.isInteger(v)&&v>=1&&v<=3)), "建筑占地无效");
    for (const p of buildingCells(b)) {
      assert(d.world.tiles[b.world].some(t=>Math.abs(t.x*3-p.x)<=1&&Math.abs(t.z*3-p.z)<=1), "建筑占地超出边界");
      const k = `${b.world},${p.x},${p.z}`;
      assert(!occupied.has(k), "建筑发生重叠");
      occupied.add(k);
    }
    ids.add(b.id);
  }
  assert(Array.isArray(d.npcs) && d.npcs.length <= 500, "居民数据无效");
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
  d.game.forestGifts ??= Math.floor(d.game.collected/20);
  assert(Number.isSafeInteger(d.game.forestGifts)&&num(d.game.forestGifts),'林间馈赠进度无效');
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
  assert(d.town&&d.town.revision===2&&num(d.town.day,1)&&num(d.town.minute,0,1439.999)&&Number.isInteger(d.town.level)&&num(d.town.level,1,5),'小镇时间或等级无效');
  for(const key of ['completed','claimed','events','eventHistory','reports','notices','pulses'] as const)assert(Array.isArray(d.town[key]),'小镇进度无效');
  for(const key of ['migrationProgress','departProgress','peakPopulation','totalSales','nextEvent','seed'] as const)assert(num(d.town[key]),'经营状态无效');
  assert(d.town.facilities&&d.town.builtCounts&&d.town.metrics&&d.town.ledger,'缺少经营数据');
  for(const f of Object.values(d.town.facilities))if(f.schedule!==undefined)assert(validSchedule(f.schedule),'员工排班无效');
  for(const f of Object.values(d.town.facilities))for(const key of ['progress','stock','staff','efficiency','revenue','costs','customers','satisfaction','priceFactor','produced','dailyRevenue','dailyCosts','dailyCustomers'] as const)assert(num(f[key]),'店铺数据无效');
  for(const n of d.npcs)if(n.modelType==='villager'){assert(num(n.wallet)&&num(n.happiness,0,100)&&num(n.health,0,100)&&num(n.age,0,130)&&n.needs&&typeof n.home==='string','居民生活数据无效');for(const need of Object.values(n.needs))assert(num(need,0,100),'居民需求无效');
    if(n.position)assert(num(n.position.x,-300,300)&&num(n.position.z,-300,300),'居民位置无效');
    if(n.route)assert(Array.isArray(n.route)&&n.route.length<=4500&&n.route.every(p=>num(p.x,-300,300)&&num(p.z,-300,300)),'居民路径无效');
    if(n.travelProgress!==undefined)assert(num(n.travelProgress,0,100),'居民移动进度无效');
  }
  const ledgerKeys = ["revenue","wages","maintenance","purchases","rent","sales","arrivals","departures","startHappiness"] as const;
  for (const ledger of [d.town.ledger, ...d.town.reports]) {
    for (const k of ledgerKeys) assert(num(ledger[k]), "日报金额无效");
    for (const bag of [ledger.produced, ledger.consumed]) {
      assert(bag && typeof bag === "object", "日报资源无效");
      for (const [key,value] of Object.entries(bag)) assert(key in emptyBag() && num(value), "日报资源无效");
    }
  }
  for (const r of d.town.reports) assert(num(r.day,1) && num(r.profit,-1e15) && num(r.population) && num(r.happiness,0,100), "历史日报无效");
  for (const e of d.town.events) assert(["rain","festival","flu"].includes(e.type) && num(e.remaining,0,10000) && num(e.duration,1,10000) && typeof e.title === "string", "事件数据无效");
  for (const v of Object.values(d.town.builtCounts)) assert(num(v), "建造进度无效");
  for (const k of ["completed","claimed","eventHistory"] as const) assert(d.town[k].every(v => typeof v === "string"), "任务进度无效");
  for (const k of ["food","fun","shopping"] as const) for (const n of d.npcs.filter(n=>n.modelType==="villager")) assert(num(n.needs?.[k],0,100), "居民需求无效");
  d.town.development ??= initialDevelopment();
  const dev=d.town.development;
  for(const k of ['boardDay','total','reputation','policyDay'] as const)assert(Number.isInteger(dev[k])&&num(dev[k],0,1e9),'发展进度数值无效');
  assert(['balanced','industry','leisure'].includes(dev.policy),'经营方针无效');
  assert(Array.isArray(dev.projects)&&dev.projects.length<=5&&new Set(dev.projects).size===dev.projects.length&&dev.projects.every(id=>civicProjects.some(p=>p.id===id)),'公共工程进度无效');
  assert(Array.isArray(dev.delivered)&&dev.delivered.length<=3&&new Set(dev.delivered).size===dev.delivered.length&&dev.delivered.every(id=>commissions.some(c=>id===`${dev.boardDay}:${c.id}`)),'委托进度无效');
  d.town.metrics = metrics(d.buildings,d.npcs,d.resources.bag,d.town.facilities);
  return d;
}
function apply(d: ReturnType<typeof snapshot>) {
  // Keep a recoverable copy before removing retired-world state.
  if(d.world.current!=='overworld'||d.buildings.some(b=>b.world!=='overworld'||['portal','endportal','core','netherplant','obsidian'].includes(b.type))||d.world.tiles.nether.length||d.world.tiles.end.length){
    if(!localStorage.getItem(SAVE_KEY+'-before-main-world'))localStorage.setItem(SAVE_KEY+'-before-main-world',JSON.stringify(d));
  }
  migrateMainWorld(d);
  d.town.metrics=metrics(d.buildings,d.npcs,d.resources.bag,d.town.facilities);
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
  T.setState(d.town,true);
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_KEY);
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
  localStorage.setItem(LEGACY_KEY+'-backup',localStorage.getItem(LEGACY_KEY)||'');
  localStorage.removeItem(LEGACY_KEY);
  location.reload();
}
