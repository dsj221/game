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
import { useTownStore as T } from "../stores/useTownStore";
import { simulateTown, metrics } from "./TownSimulation";
import { quests, townLevels, emptyFacility } from "../data/town";
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
export function tick() {
  const settings = S.getState();
  for (let i = 0; i < settings.speed; i++) {
    const result = simulateTown({
      town: T.getState(),
      buildings: B.getState().buildings,
      npcs: N.getState().npcs,
      bag: R.getState().bag,
      currency: R.getState().currency,
      tick: G.getState().ticks,
      weather: settings.weather,
    });
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
    const connected: string[] = [];
    let generation = 0,
      consumption = 0;
    const offline: string[] = [];
    for (const world of ["overworld", "nether", "end"] as WorldId[]) {
      const power = computeProduction(
        B.getState().buildings.filter((b) => b.world === world),
        [],
        R.getState().energy,
        480,
      );
      connected.push(...power.connected);
      generation += power.generation;
      consumption += power.consumption;
      offline.push(...power.offline);
    }
    B.setState({ connected, offline });
    R.setState((s) => ({
      energy: Math.max(0, Math.min(480, s.energy + generation - consumption)),
      generation,
      consumption,
    }));
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
  if (!unlocked(d.id)) return notify("这座设施尚未解锁");
  if (r.currency < d.cost) return notify("金币不足，按住采集或等待生产");
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
  T.setState((t) => ({
    builtCounts: { ...t.builtCounts, [d.id]: (t.builtCounts[d.id] || 0) + 1 },
  }));
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
  if (R.getState().currency < cost) return notify("金币不足");
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
export function collect() {
  if (S.getState().speed === 0) return;
  const value = 0;
  R.setState((s) => ({
    currency: s.currency + value,
    bag: {
      ...s.bag,
      wood: s.bag.wood + 1,
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
    R.setState((s) => ({
      bag: { ...s.bag, wood: s.bag.wood + 5 },
      energy: s.maxEnergy,
    }));
    notify("林间的馈赠：额外获得 5 木材");
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
