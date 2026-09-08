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
import { uid } from "../data/initial";
import {
  canPlace,
  computeProduction,
  edgeTiles,
  expansionPrice,
  upgradePrice,
} from "../systems/economy";
import { tone } from "../systems/audio";
import type { Panel, Resource, WorldId } from "../types";
let toastTimer: ReturnType<typeof setTimeout>;
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
  if (inside && b.type === "studio") {
    W.setState({ interior: true });
    panel("studio", "节目");
  } else panel("detail");
}
export function unlocked(type: string) {
  const req = defs[type].unlockRequirements;
  return (
    !req ||
    B.getState().buildings.some(
      (b) => b.world === W.getState().current && b.type === req,
    )
  );
}
export function beginBuild(type: string) {
  if (!unlocked(type))
    return notify(`需要先建设${defs[defs[type].unlockRequirements!].name}`);
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
  U.setState({ placement: null, moving: null, expand: null, hover: null });
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
      U.setState({ expand: [x, z] });
    return;
  }
  if (!canPlace(x, z, W.getState().tiles[world], local, ui.moving || undefined))
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
  if (r.currency < d.cost) return notify("晶体不足，按住采集或等待生产");
  for (const [k, v] of Object.entries(d.materials || {}))
    if (r.bag[k as Resource] < v)
      return notify(`${k === "wood" ? "木材" : "铁矿"}不足`);
  const bag = { ...r.bag };
  for (const [k, v] of Object.entries(d.materials || {}))
    bag[k as Resource] -= v;
  R.setState({ currency: r.currency - d.cost, bag });
  B.setState({
    buildings: [
      ...all,
      {
        id: uid(),
        type: d.id,
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
  achieve("build");
  if (["tree", "road", "farm"].includes(d.id)) achieve(d.id);
  tone("build");
  notify(`${d.name}已建成`);
  if (d.id !== "road" && d.id !== "tree") cancelBuild();
}
export function expand() {
  const world = W.getState().current,
    tiles = W.getState().tiles,
    position = U.getState().expand;
  if (!position) return;
  const cost = expansionPrice(tiles[world].length);
  if (R.getState().currency < cost) return notify("晶体不足");
  if (
    !edgeTiles(tiles[world]).some(
      ([x, z]) => x === position[0] && z === position[1],
    )
  )
    return;
  R.setState((s) => ({ currency: s.currency - cost }));
  W.setState({
    tiles: {
      ...tiles,
      [world]: [
        ...tiles[world],
        { x: position[0], z: position[1], born: Date.now() },
      ],
    },
  });
  B.setState((s) => ({
    buildings: [
      ...s.buildings,
      {
        id: uid(),
        type: "tree",
        world,
        x: position[0] * 3 - 1,
        z: position[1] * 3 - 1,
        level: 1,
        rotation: 0,
        born: Date.now(),
      },
      ...[0, 1, 2].map((i) => ({
        id: uid(),
        type: "road",
        world,
        x: position[0] * 3 + i - 1,
        z: position[1] * 3,
        level: 1,
        rotation: 0,
        born: Date.now(),
      })),
    ],
  }));
  cancelBuild();
  achieve("expand");
  notify("新的土地，新的可能");
  tone("build");
}
export function upgrade(id: string) {
  const b = B.getState().buildings.find((b) => b.id === id);
  if (!b) return;
  const price = upgradePrice(b);
  if (b.level >= defs[b.type].maxLevel) return notify("已达到最高等级");
  if (R.getState().currency < price) return notify("晶体不足");
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
export function collect() {
  if (S.getState().speed === 0) return;
  const value = 60 + G.getState().built * 4;
  R.setState((s) => ({
    currency: s.currency + value,
    bag: {
      ...s.bag,
      wood: s.bag.wood + 2,
      stone: s.bag.stone + 2,
      iron: s.bag.iron + 1,
    },
  }));
  G.setState((s) => ({
    resonance: (s.resonance + 5) % 100,
    collected: s.collected + 1,
    totalEarned: s.totalEarned + value,
    floating: [...s.floating.slice(-4), { id: Date.now(), value }],
  }));
  achieve("first");
  if (G.getState().resonance === 0) {
    R.setState((s) => ({ currency: s.currency + 1500, energy: s.maxEnergy }));
    notify("世界共振！奖励 1,500 晶体，能源充满");
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
  if (R.getState().currency < cost) return notify("晶体不足");
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
  ({ wood: 5, stone: 4, iron: 12, redstone: 24, food: 3 })[resource] *
  (1 +
    0.15 *
      Math.sin(
        G.getState().ticks / 30 +
          ["wood", "stone", "iron", "redstone", "food"].indexOf(resource),
      ));
export function trade(resource: Resource, buy: boolean) {
  const r = R.getState(),
    price = Math.ceil(priceOf(resource) * 10 * (buy ? 1.15 : 1));
  if (buy && r.currency < price) return notify("晶体不足");
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
    notify("订单完成，获得 500 晶体");
  } else {
    const cost = action === "频道设备" ? s.equipment * 500 : 200;
    if (r.currency < cost) return notify("晶体不足");
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
export function tick() {
  const settings = S.getState();
  if (settings.speed === 0) return;
  for (let step = 0; step < settings.speed; step++) {
    let income = 0,
      generation = 0,
      consumption = 0;
    const r = R.getState(),
      bag = { ...r.bag };
    let energy = r.energy;
    const offline: string[] = [],
      connected: string[] = [];
    for (const world of ["overworld", "nether", "end"] as WorldId[]) {
      const result = computeProduction(
        B.getState().buildings.filter((b) => b.world === world),
        N.getState().npcs.filter((n) => n.world === world),
        energy,
        r.maxEnergy,
      );
      energy = result.energy;
      income += result.income;
      generation += result.generation;
      consumption += result.consumption;
      offline.push(...result.offline);
      connected.push(...result.connected);
      for (const k of Object.keys(bag) as Resource[])
        bag[k] += result.output[k];
    }
    const g = G.getState();
    const hasStudio = B.getState().buildings.some((b) => b.type === "studio");
    const fit =
      g.program === "田园时光"
        ? W.getState().current === "overworld"
        : g.program === "异界奇遇"
          ? W.getState().current !== "overworld"
          : true;
    const viewers = hasStudio
      ? Math.round(
          g.viewers +
            (Math.min(
              15000,
              500 * g.equipment * (fit ? 2 : 1) +
                g.decor * 100 +
                (g.camera === "演播室现场" ? 0 : 250),
            ) -
              g.viewers) *
              0.03,
        )
      : 0;
    const studioIncome = hasStudio ? viewers * 0.015 * g.equipment : 0;
    income += studioIncome;
    if (g.program === "工厂实录") income *= 1.1;
    const foodUse = N.getState().npcs.length * 0.08;
    bag.food = Math.max(0, bag.food - foodUse);
    if (bag.food < 1) income *= 0.75;
    R.setState({
      currency: r.currency + income,
      energy,
      bag,
      income,
      generation,
      consumption,
    });
    B.setState({ offline, connected });
    G.setState({
      ticks: g.ticks + 1,
      viewers,
      studioIncome,
      gifts: g.gifts + (g.ticks % 15 === 0 && hasStudio ? 1 : 0),
      totalEarned: g.totalEarned + income,
    });
    if (settings.cycle) S.setState((s) => ({ hour: (s.hour + 0.04) % 24 }));
    if (g.ticks >= 60) achieve("idle");
    if (viewers >= 1000) achieve("audience");
    if (r.currency >= 100000) achieve("rich");
  }
}
