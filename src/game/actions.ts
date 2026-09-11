import {
  useBuildingStore as B,
  useGameStore as G,
  useNpcStore as N,
  useResourceStore as R,
  useSettingsStore as S,
  useUIStore as U,
  useWorldStore as W,
} from "../stores";
import { defs } from "../data/definitions";
import {retiredBuildingTypes} from '../data/playable';
import { uid } from "../data/initial";
import { useTownStore as T } from "../stores/useTownStore";
import { simulateTown, metrics } from "./TownSimulation";
import {validSchedule,type WorkSchedule} from '../systems/workSchedule';
import {broadcastStep} from '../systems/broadcast';
import {developmentAction} from '../systems/development';
export function developTown(kind:'order'|'project'|'policy',id:string,allowFood=false){
  const result=developmentAction(T.getState(),R.getState().bag,R.getState().currency,B.getState().buildings,{kind,id,allowFood});
  if('error' in result)return notify(result.error);
  T.setState(result.town);R.setState({bag:result.bag,currency:result.currency});
  notify(result.message!);tone('build');
}
import { quests, townLevels, emptyFacility } from "../data/town";
import {
  canPlace,
  roadType,
  computeProduction,
  edgeTiles,
  expansionTotal,
  upgradePrice,
} from "../systems/economy";
import { tone } from "../systems/audio";
import {landRegions} from '../systems/land';
import type { Panel, Resource, WorldId } from "../types";
let toastTimer: ReturnType<typeof setTimeout>;
export function tick() {
  const settings = S.getState();
  for (let i = 0; i < settings.speed; i++) {
    const power = computeProduction(B.getState().buildings, [], R.getState().energy, 480);
    const result = simulateTown({
      town: T.getState(),
      buildings: B.getState().buildings,
      npcs: N.getState().npcs,
      bag: R.getState().bag,
      currency: R.getState().currency,
      tick: G.getState().ticks,
      weather: settings.weather,
      tiles: W.getState().tiles,
      offline: power.offline,
    });
    const broadcast = broadcastStep(result.buildings,result.town.facilities,G.getState(),true,result.tick);
    result.currency += broadcast.income;
    result.net += broadcast.income;
    result.town.ledger.revenue += broadcast.income;
    for (const revenue of broadcast.revenues) {
      const facility=result.town.facilities[revenue.id];
      facility.revenue+=revenue.amount; facility.dailyRevenue+=revenue.amount;
    }
    G.setState({viewers:broadcast.viewers,studioIncome:broadcast.income,gifts:broadcast.gifts});
    const oldNotice = T.getState().notices[0]?.id;
    T.setState(result.town);
    N.setState({ npcs: result.npcs });
    R.setState({
      bag: result.bag,
      currency: result.currency,
      income: result.net,
    });
    G.setState({
      ticks: result.tick,
      totalEarned: G.getState().totalEarned + Math.max(0, result.net),
    });
    if (settings.cycle) S.setState({ hour: result.town.minute / 60 });
    B.setState({ connected:power.connected, offline:power.offline });
    R.setState({energy:power.energy,generation:power.generation,consumption:power.consumption});
    const latest = result.town.notices[0];
    if (
      latest &&
      latest.id !== oldNotice &&
      ["resident", "quest", "level"].includes(latest.kind)
    ) {
      notify(latest.text);
      tone("build");
    }
    if (result.tick >= 60) achieve("idle");
    if (R.getState().currency >= 100000) achieve("rich");
  }
}
export function claimQuest(id: string) {
  const t = T.getState(),
    q = quests.find((q) => q.id === id);
  if (!q || !t.completed.includes(id) || t.claimed.includes(id)) return;
  R.setState((s) => ({ currency: s.currency + q.reward }));
  T.setState({ claimed: [...t.claimed, id] });
  notify(`愿望已完成，获得 ${q.reward} 金币`);
  tone("collect");
}
export function promoteTown(){
 const t=T.getState(),next=townLevels[t.level];
 const m=metrics(B.getState().buildings,N.getState().npcs,R.getState().bag,t.facilities);
 if(!next||m.population<next.population||m.happiness<(next.level>=3?70:45)||t.ledger.sales+t.reports.reduce((s,r)=>s+r.sales,0)<next.earned)return notify('晋级条件尚未全部满足');
 T.setState({level:next.level,upgradeReady:false});
 notify(`恭喜！小镇升至 Lv.${next.level} · ${next.name}`);tone('build');
}
export function goToQuest(id:string){
 const q=quests.find(q=>q.id===id);if(!q)return;
 U.setState({activeGuide:id,placement:null,moving:null});
 const all=B.getState().buildings.filter(b=>b.world==='overworld');
 if(W.getState().current!=='overworld')switchWorld('overworld');
 const focus=(b:typeof all[number])=>{selectBuilding(b.id);U.setState({cameraFocus:{x:b.x,z:b.z,nonce:Date.now()}});};
 if(q.action==='town'){panel('quests');return;}
 if(q.action==='village'||q.type==='population'){panel('village');return;}
 if(q.action==='happiness'||q.type==='environment'){U.setState({mapMode:q.action==='happiness'?'happiness':'environment'});const home=all.find(b=>defs[b.type].town?.capacity);if(home)focus(home);return;}
 if(q.action==='upgrade-home'){const home=all.find(b=>defs[b.type].town?.capacity&&b.level<defs[b.type].maxLevel);if(home)focus(home);return;}
 let type=q.action;
 if(q.type==='chain')type=['farm','windmill','bakery','breadshop'].find(type=>!all.some(b=>b.type===type))||'bakery';
 const existing=all.find(b=>b.type===type);
 if(existing&&(q.type==='sales'||q.type==='produced'||q.type==='revenue'||q.type==='chain'&&['farm','windmill','bakery','breadshop'].every(type=>all.some(b=>b.type===type)))){focus(existing);return;}
 beginBuild(type);
 if(U.getState().placement!==type)return;
 const candidates=W.getState().tiles.overworld.flatMap(t=>Array.from({length:9},(_,i)=>({x:t.x*3+i%3-1,z:t.z*3+Math.floor(i/3)-1}))).sort((a,b)=>(Math.abs(a.x)+Math.abs(a.z))-(Math.abs(b.x)+Math.abs(b.z)));
 const site=candidates.find(p=>canPlace(p.x,p.z,W.getState().tiles.overworld,all,undefined,defs[type].size));
 if(site)U.setState({hover:[site.x,site.z],cameraFocus:{...site,nonce:Date.now()}});
 else notify('当前没有足够连续空地，请移动建筑或扩张土地。');
}
export function removeBuilding(id: string) {
  const b = B.getState().buildings.find((b) => b.id === id);
  if (!b) return;
  const refund = Math.round(defs[b.type].cost * 0.5);
  B.setState((s) => ({
    buildings: s.buildings.filter((v) => v.id !== id),
    selected: null,
  }));
  N.setState((s) => ({
    npcs: s.npcs.map((n) => ({
      ...n,
      home: n.home === id ? "" : n.home,
      workplace: n.workplace === id ? "" : n.workplace,
    })),
  }));
  R.setState((s) => ({ currency: s.currency + refund }));
  const facilities = { ...T.getState().facilities };
  const f = facilities[id];
  const resource = defs[b.type].town?.sells;
  if (f && resource)
    R.setState((s) => ({
      bag: { ...s.bag, [resource]: s.bag[resource] + f.stock },
    }));
  delete facilities[id];
  T.setState({
    facilities,
    metrics: metrics(
      B.getState().buildings,
      N.getState().npcs,
      R.getState().bag,
    ),
  });
  panel(null);
  notify(
    `已拆除${defs[b.type].name}，回收 ${refund} 金币；居民会寻找新住处和工作。`,
  );
}
export function toggleBusiness(id: string) {
  B.setState((s) => ({
    buildings: s.buildings.map((b) =>
      b.id === id ? { ...b, paused: !b.paused } : b,
    ),
  }));
  notify("营业状态已更新，下个经营周期生效");
}
export function setPrice(id: string, factor: number) {
  if (!Number.isFinite(factor)) return;
  T.setState((t) => ({
    facilities: {
      ...t.facilities,
      [id]: {
        ...(t.facilities[id] || emptyFacility()),
        priceFactor: Math.max(0.7, Math.min(1.8, factor)),
      },
    },
  }));
}
export function setWorkSchedule(id:string,schedule:WorkSchedule|undefined){
  if(schedule&&!validSchedule(schedule)){notify('请选择不同的上下班时间');return;}
  if(!B.getState().buildings.some(b=>b.id===id&&defs[b.type].town?.jobs))return;
  T.setState(t=>({facilities:{...t.facilities,[id]:{...(t.facilities[id]||emptyFacility()),schedule}}}));
}
export function notify(toast: string) {
  U.setState({ toast });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => U.setState({ toast: "" }), 3200);
}
export function achieve(id: string) {
  if (!G.getState().achievements.includes(id)) {
    G.setState((s) => ({ achievements: [...s.achievements, id] }));
    tone("build");
  }
}
export function panel(panel: Panel, tab = "") {
  U.setState({ panel, tab });
  tone();
}
export function switchWorld(current: WorldId) {
  if(current!=='overworld')return;
  W.setState((s) => ({
    current,
    interior: false,
    visited: [...new Set([...s.visited, current])],
  }));
  U.setState({
    placement: null,
    moving: null,
    expand: null,
    panel: null,
    hover: null,
  });
  B.setState({ selected: null });
  if (current !== "overworld") achieve(current);
  if (W.getState().visited.length === 3) achieve("worlds");
  tone("build");
}
export function selectBuilding(id: string, inside = false) {
  const b = B.getState().buildings.find((b) => b.id === id);
  if (!b) return;
  B.setState({ selected: id });
  if(W.getState().current!==b.world)W.setState({current:b.world,interior:false});
  const [width,depth]=b.rotation%2?[(b.footprint??[1,1])[1],(b.footprint??[1,1])[0]]:(b.footprint??[1,1]);
  U.setState({cameraFocus:{x:b.x+(width-1)/2,z:b.z+(depth-1)/2,nonce:Date.now()}});
  if (inside && b.type === "studio") {
    W.setState({ interior: true });
    panel("studio", "节目");
  } else panel("detail");
}
export function unlocked(type: string) {
  if ((defs[type]?.town?.unlock || 1) > T.getState().level) return false;
  const req = defs[type].unlockRequirements;
  return (
    !req ||
    B.getState().buildings.some(
      (b) => b.world === W.getState().current && b.type === req,
    )
  );
}
export function beginBuild(type: string) {
  if(retiredBuildingTypes.has(type))return;
  if (!unlocked(type))
    return notify(
      `需要小镇 Lv.${defs[type]?.town?.unlock || 1}${defs[type]?.unlockRequirements ? `，并建设${defs[defs[type].unlockRequirements!].name}` : ""}`,
    );
  if (defs[type].world !== "all" && defs[type].world !== W.getState().current)
    return notify("这座设施属于另一个世界");
  U.setState({
    placement: type,
    moving: null,
    panel: null,
    rotation: 0,
    hover: null,
  });
  notify("选择空地建造 · R 旋转 · Esc 取消");
}
export function cancelBuild() {
  U.setState({ placement: null, moving: null, expand: null, hover: null, draggingBuilding: false });
}
export function buildAt(x: number, z: number) {
  const ui = U.getState(),
    world = W.getState().current;
  const all = B.getState().buildings;
  const local = all.filter((b) => b.world === world);
  if (!ui.placement) return;
  if (ui.placement === "expand") {
    if (
      edgeTiles(W.getState().tiles[world]).some(([a, b]) => a === x && b === z)
    )
      U.setState({ expand: ui.expand?.some(([a,b]) => a === x && b === z)
        ? ui.expand.filter(([a,b]) => a !== x || b !== z)
        : [...(ui.expand ?? []), [x,z]] });
    return;
  }
  const footprint = ui.moving ? (all.find(b=>b.id===ui.moving)?.footprint ?? [1,1] as [number,number]) : defs[ui.placement].size;
  if (!canPlace(x, z, W.getState().tiles[world], local, ui.moving || undefined, footprint, ui.rotation))
    return notify("这里已有建筑，或超出了大陆边界");
  if (ui.moving) {
    B.setState({
      buildings: all.map((b) =>
        b.id === ui.moving
          ? { ...b, x, z, rotation: ui.rotation, born: Date.now() }
          : b,
      ),
    });
    cancelBuild();
    tone("build");
    return;
  }
  const d = defs[ui.placement],
    r = R.getState();
  if (!unlocked(d.id)) return notify("这座设施尚未解锁");
  if (r.currency < d.cost) return notify("金币不足，按住获取金币或等待经营收入");
  for (const [k, v] of Object.entries(d.materials || {}))
    if (r.bag[k as Resource] < v)
      return notify(`${k === "wood" ? "木材" : "铁矿"}不足`);
  const bag = { ...r.bag };
  for (const [k, v] of Object.entries(d.materials || {}))
    bag[k as Resource] -= v;
  R.setState({ currency: r.currency - d.cost, bag });
  const id = uid();
  B.setState({
    buildings: [
      ...all,
      {
        id,
        type: d.id,
        footprint: [...d.size],
        world,
        x,
        z,
        rotation: ui.rotation,
        level: 1,
        born: Date.now(),
      },
    ],
  });
  G.setState((s) => ({ built: s.built + 1 }));
  T.setState((t) => ({
    builtCounts: { ...t.builtCounts, [d.id]: (t.builtCounts[d.id] || 0) + 1 },
    pulses: [
      ...t.pulses,
      { id: `build-${id}`, building: id, text: `-${d.cost} 金币`, tick: G.getState().ticks },
    ].slice(-12),
  }));
  achieve("build");
  if (["tree", "road", "farm"].includes(d.id)) achieve(d.id);
  tone("build");
  notify(`${d.name}已建成`);
  if (!roadType(d.id) && d.id !== "tree") cancelBuild();
}
export function expand() {
  const world = W.getState().current,
    tiles = W.getState().tiles,
    position = U.getState().expand;
  if (!position?.length) return;
  const cost = expansionTotal(tiles[world].length, position.length);
  if(world==='overworld')for(const [x,z] of position){const region=landRegions(tiles.overworld).find(r=>r.tiles.some(p=>p.x===x&&p.z===z));if(region&&(T.getState().level<region.level||T.getState().metrics.population<region.population))return notify(`${region.name}需要人口 ${region.population}，Lv.${region.level}`);}
  if (world === "overworld" && T.getState().metrics.population < 6)
    return notify("解锁南部林地需要人口达到 6");
  if (R.getState().currency < cost) return notify("金币不足");
  if (
    new Set(position.map(p => p.join(','))).size !== position.length ||
    !position.every(([a,b]) => edgeTiles(tiles[world]).some(([x,z]) => x === a && z === b))
  )
    return;
  R.setState((s) => ({ currency: s.currency - cost }));
  W.setState({
    tiles: {
      ...tiles,
      [world]: [
        ...tiles[world],
        ...position.map(([x,z]) => ({ x, z, born: Date.now() })),
      ],
    },
  });
  B.setState((s) => ({
    buildings: [
      ...s.buildings,
      ...position.flatMap(([px,pz]) => [{
        id: uid(),
        type: "tree",
        world,
        x: px * 3 - 1,
        z: pz * 3 - 1,
        level: 1,
        rotation: 0,
        born: Date.now(),
      },
      ...[0, 1, 2].map((i) => ({
        id: uid(),
        type: "road",
        world,
        x: px * 3 + i - 1,
        z: pz * 3,
        level: 1,
        rotation: 0,
        born: Date.now(),
      }))]),
    ],
  }));
  cancelBuild();
  achieve("expand");
  notify(`已扩建 ${position.length} 块土地，共花费 ${cost} 金币`);
  tone("build");
}
export function unlockRegion(id:string){
 const w=W.getState(),t=T.getState(),r=R.getState();
 if(w.current!=='overworld')return;
 const region=landRegions(w.tiles.overworld).find(z=>z.id===id);
 if(!region?.tiles.length)return;
 if(t.metrics.population<region.population||t.level<region.level)return notify(`需要人口 ${region.population}，Lv.${region.level}`);
 if(r.currency<region.cost)return notify('金币不足');
 R.setState({currency:r.currency-region.cost});
 W.setState({tiles:{...w.tiles,overworld:[...w.tiles.overworld,...region.tiles.map(p=>({...p,born:Date.now()}))]}});
 notify(`${region.name}已解锁，新增 ${region.tiles.length*9} 格土地`);
}
export function upgrade(id: string) {
  const b = B.getState().buildings.find((b) => b.id === id);
  if (!b) return;
  const price = upgradePrice(b);
  if (b.level >= defs[b.type].maxLevel) return notify("已达到最高等级");
  if (R.getState().currency < price) return notify("金币不足");
  R.setState((s) => ({ currency: s.currency - price }));
  B.setState((s) => ({
    buildings: s.buildings.map((v) =>
      v.id === id ? { ...v, level: v.level + 1, born: Date.now() } : v,
    ),
  }));
  achieve("upgrade");
  tone("build");
  notify(`${defs[b.type].name}升至 ${b.level + 1} 级`);
}
export function rotateBuilding(id:string){
 const b=B.getState().buildings.find(x=>x.id===id);if(!b)return;
 const rotation=(b.rotation+1)%4;
 if(!canPlace(b.x,b.z,W.getState().tiles[b.world],B.getState().buildings.filter(x=>x.world===b.world),id,b.footprint||[1,1],rotation))return notify('旋转后的占地被占用');
 B.setState(s=>({buildings:s.buildings.map(x=>x.id===id?{...x,rotation}:x)}));
}
export function collect() {
  if (S.getState().speed === 0) return;
  const game=G.getState();
  const gifts=game.forestGifts??Math.floor(game.collected/20);
  const value = 1+gifts;
  const completed=game.resonance+5>=100;
  R.setState((s) => ({
    currency: s.currency + value,
  }));
  T.setState(s=>({ledger:{...s.ledger,revenue:s.ledger.revenue+value}}));
  G.setState((s) => ({
    resonance: (s.resonance + 5) % 100,
    forestGifts:gifts+(completed?1:0),
    collected: s.collected + 1,
    totalEarned: s.totalEarned + value,
    floating: [...s.floating.slice(-4), { id: Date.now(), value }],
  }));
  achieve("first");
  if (completed) {
    R.setState((s) => ({
      energy: s.maxEnergy,
    }));
    notify(`林间馈赠完成：每次获取金币 +1，之后每次获得 ${value+1} 金币`);
    tone("build");
  } else tone("collect");
}
export function recruit(modelType = "copper") {
  const world = W.getState().current,
    local = N.getState().npcs.filter((n) => n.world === world);
  const capacity =
    6 +
    B.getState()
      .buildings.filter((b) => b.world === world)
      .reduce((n, b) => n + (defs[b.type].population || 0) * b.level, 0);
  if (local.length >= capacity) return notify("居住空间不足，请建设或升级房屋");
  if (
    modelType === "iron" &&
    !B.getState().buildings.some((b) => b.type === "clock" && b.level >= 2)
  )
    return notify("需要 2 级时光钟楼");
  const cost = modelType === "iron" ? 1800 : 650;
  if (R.getState().currency < cost) return notify("金币不足");
  R.setState((s) => ({ currency: s.currency - cost }));
  N.setState((s) => ({
    npcs: [
      ...s.npcs,
      {
        id: uid(),
        name: `${modelType === "iron" ? "铁杉" : "铜豆"} ${local.length + 1}`,
        profession: modelType === "iron" ? "铁傀儡" : "铜傀儡",
        level: 1,
        efficiency: modelType === "iron" ? 1.25 : 1.1,
        world,
        modelType,
        workplace:
          B.getState().buildings.find(
            (b) => b.world === world && b.type === "market",
          )?.id || "",
        phase: Math.random() * 10,
      },
    ],
  }));
  achieve("helper");
  notify("新伙伴已经来到大陆");
  tone("build");
}
export const priceOf = (resource: Resource) =>
  ({
    wood: 3,
    stone: 4,
    iron: 12,
    redstone: 24,
    food: 3,
    wheat: 2,
    flour: 4,
    bread: 7,
    furniture: 15,
  })[resource] *
  (1 +
    0.15 *
      Math.sin(
        G.getState().ticks / 30 +
          ["wood", "stone", "iron", "redstone", "food"].indexOf(resource),
      ));
export function trade(resource: Resource, buy: boolean) {
  const r = R.getState(),
    price = Math.ceil(priceOf(resource) * 10 * (buy ? 1.15 : 1));
  if (buy && r.currency < price) return notify("金币不足");
  if (!buy && r.bag[resource] < 10) return notify("资源不足 10 份");
  R.setState({
    currency: r.currency + (buy ? -price : price),
    bag: { ...r.bag, [resource]: r.bag[resource] + (buy ? 10 : -10) },
  });
  tone("collect");
}
export function setProgram(program: string) {
  G.setState({ program });
  achieve("live");
  tone();
}
export function studioAction(action: string) {
  if (!B.getState().buildings.some(b=>b.type==='studio' && !b.paused)) return notify('请先建设并开放直播间');
  const s = G.getState(),
    r = R.getState();
  if (action === "收礼") {
    if (s.gifts < 1) return notify("还没有礼物，直播运行时会收到观众礼物");
    R.setState({ currency: r.currency + s.gifts * 40 });
    G.setState({ gifts: 0 });
    notify("观众的心意已经收下");
  } else if (action === "订单") {
    if (r.bag.food < 30 || r.bag.wood < 20)
      return notify("订单需要 30 食物与 20 木材");
    R.setState({
      currency: r.currency + 500,
      bag: { ...r.bag, food: r.bag.food - 30, wood: r.bag.wood - 20 },
    });
    G.setState({ orders: s.orders + 1 });
    notify("订单完成，获得 500 金币");
  } else {
    const cost = action === "频道设备" ? s.equipment * 500 : 200;
    if (r.currency < cost) return notify("金币不足");
    R.setState({ currency: r.currency - cost });
    G.setState(
      action === "频道设备"
        ? { equipment: s.equipment + 1 }
        : { decor: s.decor + 1 },
    );
    notify(
      action === "频道设备"
        ? "频道设备已升级，收入与观众上限提高"
        : "室内布置已更新",
    );
  }
  tone("build");
}
