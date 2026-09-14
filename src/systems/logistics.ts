import type { Bag, Building, Resource, Tile, WorldId } from "../types/index.ts";
import type { TownState } from "../types/town.ts";
import { defs } from "../data/definitions.ts";
import { emptyBag } from "../data/town.ts";
import { isRoad, roadStyles } from "../data/roads.ts";
import {
  navigationGrid,
  entrances,
  findRoute,
  type Point,
} from "../npcs/navigation.ts";
import { onShift, validSchedule, type WorkSchedule } from "./workSchedule.ts";
export type TransportPolicy = {
  porters: number;
  carts: number;
  schedule: WorkSchedule;
};
export type Stock = {
  id: string;
  x: number;
  z: number;
  world: WorldId;
  warehouse: boolean;
  salvage: boolean;
  active: boolean;
  priority: number;
  capacity: number;
  inside: Partial<Bag>;
  outside: Partial<Bag>;
  blocked: boolean;
  transport?: TransportPolicy;
  transportCosts?: { day: number; wages: number; maintenance: number };
  rules?: Partial<
    Record<Resource, { allowed: boolean; minimum: number; target: number }>
  >;
  production?: { day: number; amounts: Partial<Bag> };
};
export type Hauler = {
  id: string;
  home: string;
  cart: boolean;
  position: Point;
  route: Point[];
  progress: number;
  source?: string;
  destination?: string;
  resource?: Resource;
  amount: number;
  loaded: boolean;
  status:
    | "空闲"
    | "前往取货"
    | "运送货物"
    | "道路中断"
    | "等待通行"
    | "仓库暂停"
    | "下班休息";
};
export type Logistics = {
  stores: Record<string, Stock>;
  haulers: Hauler[];
  delivered: number;
  dispatchCursor: number;
};
const key = (p: Point) => `${p.x},${p.z}`;
const sum = (bag: Partial<Bag>) =>
  Object.values(bag).reduce((n, v) => n + (v || 0), 0);
export const stockAmount = (s: Stock | undefined, r: Resource) =>
  (s?.inside[r] || 0) + (s?.outside[r] || 0);
export const stockTotal = (s: Stock) => sum(s.inside) + sum(s.outside);
export const outsideTotal = (s: Stock) => sum(s.outside);
export function deposit(s: Stock, r: Resource, amount: number) {
  const inside = Math.min(amount, Math.max(0, s.capacity - sum(s.inside)));
  s.inside[r] = (s.inside[r] || 0) + inside;
  s.outside[r] = (s.outside[r] || 0) + amount - inside;
}
export function takeStock(s: Stock, r: Resource, amount: number) {
  const count = Math.min(amount, stockAmount(s, r)),
    outside = Math.min(count, s.outside[r] || 0);
  s.outside[r] = Math.max(0, (s.outside[r] || 0) - outside);
  s.inside[r] = Math.max(0, (s.inside[r] || 0) - (count - outside));
  return count;
}
export function warehouseBag(l: Logistics) {
  const bag = emptyBag();
  for (const s of Object.values(l.stores).filter((s) => s.warehouse))
    for (const r of Object.keys(bag) as Resource[]) bag[r] += stockAmount(s, r);
  return bag;
}
export function cloneLogistics(l: Logistics): Logistics {
  return {
    ...l,
    stores: Object.fromEntries(
      Object.entries(l.stores).map(([id, s]) => [
        id,
        { ...s, inside: { ...s.inside }, outside: { ...s.outside } },
      ]),
    ),
    haulers: l.haulers.map((h) => ({
      ...h,
      position: { ...h.position },
      route: h.route.map((p) => ({ ...p })),
    })),
  };
}
function sortedWarehouses(l: Logistics) {
  return Object.values(l.stores)
    .filter((s) => s.warehouse)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
/** Reconcile UI purchases/construction with physical warehouse contents, never factory stock or cargo. */
export function reconcileBag(l: Logistics, bag: Bag) {
  const before = warehouseBag(l),
    warehouses = sortedWarehouses(l);
  for (const r of Object.keys(bag) as Resource[]) {
    let delta = bag[r] - before[r];
    if (delta > 1e-8) {
      for (const s of warehouses) {
        const rule = stockRule(s, r);
        const n = rule.allowed
          ? Math.max(
              0,
              Math.min(
                delta,
                s.capacity - sum(s.inside),
                rule.target - stockAmount(s, r),
              ),
            )
          : 0;
        deposit(s, r, n);
        delta -= n;
      }
      if (delta > 0 && warehouses[0]) {
        const first = warehouses[0];
        const delivery = (l.stores["external-delivery"] ||= {
          id: "external-delivery",
          x: first.x,
          z: first.z,
          world: first.world,
          warehouse: true,
          salvage: true,
          active: true,
          priority: 0,
          capacity: 0,
          inside: {},
          outside: {},
          blocked: false,
        });
        deposit(delivery, r, delta);
      }
    } else if (delta < -1e-8)
      for (const s of warehouses) {
        const used = takeStock(
          s,
          r,
          Math.min(
            -delta,
            Math.max(0, stockAmount(s, r) - stockRule(s, r).minimum),
          ),
        );
        delta += used;
        if (delta >= -1e-8) break;
      }
  }
}
function site(s: Stock, buildings: Building[]): Building {
  return (
    buildings.find((b) => b.id === s.id) || {
      id: s.id,
      type: "warehouse",
      x: s.x,
      z: s.z,
      world: s.world,
      rotation: 0,
      level: 1,
      born: 0,
    }
  );
}
function freightGrid(tiles: Tile[], buildings: Building[]) {
  const walk = navigationGrid(tiles, buildings),
    roads = new Map(
      buildings
        .filter((b) => isRoad(b.type) && !b.paused)
        .map((b) => [key(b), roadStyles[b.type]?.weight || 1]),
    );
  return new Map(
    [...walk].filter(([k]) => roads.has(k)).map(([k]) => [k, roads.get(k)!]),
  );
}
export function prepareLogistics(
  t: TownState,
  buildings: Building[],
  bag: Bag,
  tiles: Record<WorldId, Tile[]>,
) {
  const l = t.logistics
    ? cloneLogistics(t.logistics)
    : ({
        stores: {},
        haulers: [],
        delivered: 0,
        dispatchCursor: 0,
      } as Logistics);
  const ids = new Set(buildings.map((b) => b.id));
  for (const s of Object.values(l.stores))
    if (!ids.has(s.id)) {
      s.salvage = true;
      s.active = true;
      s.capacity = 0;
      s.rules = undefined;
      for (const r of Object.keys(s.inside) as Resource[]) {
        s.outside[r] = (s.outside[r] || 0) + (s.inside[r] || 0);
        s.inside[r] = 0;
      } /* preserve goods at the demolition site */
    }
  for (const b of buildings) {
    if (isRoad(b.type)) continue;
    const warehouse = b.type === "warehouse" || b.type === "market",
      old = l.stores[b.id];
    l.stores[b.id] = {
      id: b.id,
      x: b.x,
      z: b.z,
      world: b.world,
      warehouse,
      salvage: false,
      active: !b.paused,
      priority: old?.priority ?? 1,
      rules: old?.rules,
      production: old?.production,
      transport: old?.transport,
      transportCosts: old?.transportCosts,
      capacity: (warehouse ? 80 : 24) * b.level,
      inside: old?.inside || {},
      outside: old?.outside || {},
      blocked: false,
    };
  }
  if (!Object.values(l.stores).some((s) => s.warehouse)) {
    const road = buildings
        .filter((b) => b.world === "overworld" && isRoad(b.type))
        .sort(
          (a, b) =>
            Math.abs(a.x) + Math.abs(a.z) - Math.abs(b.x) - Math.abs(b.z),
        )[0],
      p = tiles.overworld[0];
    l.stores["landing-stock"] = {
      id: "landing-stock",
      x: road?.x ?? (p ? p.x * 3 : 0),
      z: road?.z ?? (p ? p.z * 3 : 0),
      world: "overworld",
      warehouse: true,
      salvage: true,
      active: true,
      priority: 0,
      capacity: 0,
      inside: {},
      outside: {},
      blocked: false,
    };
  }
  reconcileBag(l, bag);
  t.logistics = l;
  return l;
}
const incoming = (l: Logistics, id: string, r: Resource) =>
  l.haulers
    .filter((h) => h.destination === id && h.resource === r)
    .reduce((n, h) => n + h.amount, 0);
const reserved = (l: Logistics, id: string, r: Resource) =>
  l.haulers
    .filter((h) => h.source === id && !h.loaded && h.resource === r)
    .reduce((n, h) => n + h.amount, 0);
function sourceAvailable(
  l: Logistics,
  s: Stock,
  r: Resource,
  buildings: Building[],
) {
  const b = buildings.find((b) => b.id === s.id),
    output = b && defs[b.type]?.town?.output;
  return s.active && (s.warehouse || s.salvage || output?.[r])
    ? Math.max(
        0,
        stockAmount(s, r) -
          reserved(l, s.id, r) -
          (s.warehouse ? stockRule(s, r).minimum : 0) -
          (b && defs[b.type]?.town?.sells === r ? 8 * b.level : 0),
      )
    : 0;
}
function needs(s: Stock, t: TownState, buildings: Building[]): Partial<Bag> {
  if (s.salvage || !s.active) return {};
  const b = buildings.find((b) => b.id === s.id),
    c = b && defs[b.type]?.town;
  if (!b || !c) return {};
  const wanted: Partial<Bag> = {};
  if (s.warehouse)
    for (const r of Object.keys(s.rules || {}) as Resource[])
      if (stockRule(s, r).allowed) wanted[r] = stockRule(s, r).target;
  for (const [r, n] of Object.entries(c.recipe || {}))
    wanted[r as Resource] = n * 2;
  if (c.output) wanted.tools = Math.max(wanted.tools || 0, 1);
  if (c.jobs)
    wanted.food = Math.max(wanted.food || 0, Math.min(8, c.jobs * b.level * 2));
  if (c.sells)
    wanted[c.sells] = Math.max(
      wanted[c.sells] || 0,
      0,
      8 * b.level - (t.facilities[b.id]?.stock || 0),
    );
  if (
    (c.capacity || c.jobs) &&
    !c.sells &&
    !c.output?.bread &&
    stockAmount(s, "food") < 1
  )
    wanted.bread = Math.max(wanted.bread || 0, 2);
  if (c.capacity) {
    wanted.food = Math.min(8, c.capacity * b.level * 2);
    if (Math.floor((t.day - 1) / 14) % 4 === 3)
      wanted.wood = Math.min(8, c.capacity * b.level * 2);
  }
  if (["cafe", "tea_house"].includes(b.type)) wanted.pottery = 1;
  return wanted;
}
export function logisticsStep(
  t: TownState,
  buildings: Building[],
  bag: Bag,
  tiles: Record<WorldId, Tile[]>,
  tick: number,
) {
  const l = t.logistics!,
    warehouses = sortedWarehouses(l),
    grids = Object.fromEntries(
      (["overworld", "nether", "end"] as WorldId[]).map((w) => [
        w,
        freightGrid(
          tiles[w],
          buildings.filter((b) => b.world === w),
        ),
      ]),
    ) as Record<WorldId, Map<string, number>>;
  const ends = (s: Stock) => entrances(site(s, buildings), grids[s.world]);
  for (const s of warehouses.filter((s) => s.active)) {
    const b = buildings.find((b) => b.id === s.id),
      policy = transportPolicy(s, b?.level || 1),
      slots = s.salvage
        ? [0]
        : [
            ...Array.from({ length: policy.porters }, (_, i) => i * 2),
            ...Array.from({ length: policy.carts }, (_, i) => i * 2 + 1),
          ],
      entry = ends(s)[0];
    if (!entry) continue;
    for (const i of slots) {
      const id = `haul:${s.id}:${i}`;
      if (!l.haulers.some((h) => h.id === id))
        l.haulers.push({
          id,
          home: s.id,
          cart: i % 2 === 1,
          position: { ...entry },
          route: [],
          progress: 0,
          amount: 0,
          loaded: false,
          status: "空闲",
        });
    }
  }
  l.haulers = l.haulers.filter(
    (h) =>
      h.destination ||
      h.loaded ||
      (() => {
        const home = l.stores[h.home],
          b = buildings.find((b) => b.id === h.home),
          limit = home?.salvage
            ? stockTotal(home) > 0
              ? 1
              : 0
            : Math.min(6, (b?.level || 1) * 2);
        if (home && !home.salvage) {
          const p = transportPolicy(home, b?.level || 1),
            i = Number(h.id.split(":").at(-1));
          return Math.floor(i / 2) < (h.cart ? p.carts : p.porters);
        }
        return Number(h.id.split(":").at(-1)) < limit;
      })(),
  );
  const working = (h: Hauler) => {
    const home = l.stores[h.home],
      b = buildings.find((b) => b.id === h.home),
      p = transportPolicy(home, b?.level || 1),
      index = Math.floor(Number(h.id.split(":").at(-1)) / 2);
    return (
      !!home?.active &&
      (home.salvage ||
        (index < (h.cart ? p.carts : p.porters) &&
          onShift(t.minute, { schedule: p.schedule })))
    );
  };
  const clear = (h: Hauler) => {
    h.source = undefined;
    h.destination = undefined;
    h.resource = undefined;
    h.amount = 0;
    h.loaded = false;
    h.route = [];
    h.progress = 0;
    h.status = "空闲";
  };
  const occupied = new Set<string>();
  const order = [...l.haulers];
  if (order.length) {
    const at = tick % order.length;
    order.push(...order.splice(0, at));
  }
  for (const h of order) {
    const home = l.stores[h.home];
    if (!home?.active) {
      h.status = "仓库暂停";
      continue;
    }
    if (!h.destination || !h.resource) {
      h.status = working(h) ? "空闲" : "下班休息";
      continue;
    }
    let target: Stock | undefined =
      l.stores[h.loaded ? h.destination : h.source!];
    if (
      !target ||
      (!h.loaded && target.salvage && !stockAmount(target, h.resource))
    ) {
      if (!h.loaded) {
        clear(h);
        continue;
      }
      target = warehouses.find((s) => s.active && s.world === home.world);
      if (!target) continue;
      h.destination = target.id;
    }
    if (h.loaded && (!target.active || (target.salvage && !target.warehouse))) {
      const fallback = warehouses.find(
        (s) => s.active && s.world === home.world,
      );
      if (fallback) {
        target = fallback;
        h.destination = fallback.id;
      }
    }
    const grid = grids[home.world],
      goals = ends(target),
      end = h.route.at(-1) || h.position;
    if (
      !h.route.length ||
      h.route.some((p) => !grid.has(key(p))) ||
      !goals.some((p) => key(p) === key(end))
    ) {
      // A removed road under a hauler may be exited to an adjacent intact road.
      const routeGrid = new Map(grid);
      routeGrid.set(key(h.position), 1);
      const route = findRoute(h.position, goals, routeGrid);
      if (!route) {
        h.status = "道路中断";
        target.blocked = true;
        continue;
      }
      h.route = route;
    }
    if (h.route.length) {
      h.progress += 1;
      const next = h.route[0],
        mud = t.climate?.cells.some(
          (c) => c.x === next.x && c.z === next.z && c.water > 75,
        ),
        cost =
          (grid.get(key(next)) || 1) * (h.cart ? 1 : 1.6) * (mud ? 2.5 : 1);
      if (h.progress >= cost) {
        const k = `${home.world}:${key(next)}`;
        if (occupied.has(k)) {
          h.status = "等待通行";
          h.progress = Math.min(h.progress, cost);
          continue;
        }
        occupied.add(k);
        h.position = h.route.shift()!;
        h.progress -= cost;
      }
      h.status = h.loaded ? "运送货物" : "前往取货";
    }
    if (!h.route.length && goals.some((p) => key(p) === key(h.position))) {
      if (!h.loaded) {
        const source = l.stores[h.source!];
        if (!source?.active) {
          clear(h);
          continue;
        }
        h.amount = takeStock(
          source,
          h.resource,
          Math.min(
            h.amount,
            Math.max(
              0,
              stockAmount(source, h.resource) -
                (source.warehouse ? stockRule(source, h.resource).minimum : 0),
            ),
          ),
        );
        if (h.amount <= 0) {
          clear(h);
          continue;
        }
        h.loaded = true;
        h.status = "运送货物";
      } else {
        deposit(target, h.resource, h.amount);
        l.delivered += h.amount;
        clear(h);
      }
    }
  }
  // Dispatch urgent inputs first; completed goods then go to the highest-priority reachable warehouse.
  const destinations = Object.values(l.stores).filter(
    (s) => s.active && !s.salvage,
  );
  const urgent = destinations.map((s) => ({
    s,
    wanted: needs(s, t, buildings),
  }));
  if (urgent.length) {
    const offset = l.dispatchCursor++ % urgent.length;
    urgent.push(...urgent.splice(0, offset));
  }
  for (const h of order.filter((h) => !h.destination && working(h))) {
    const world = l.stores[h.home].world,
      grid = grids[world];
    let assigned = false;
    const assign = (
      source: Stock,
      target: Stock,
      r: Resource,
      amount: number,
    ) => {
      if (
        amount < 0.01 ||
        (target.warehouse && intakeRoom(l, target, r) < 0.01) ||
        source.world !== world ||
        target.world !== world ||
        source.id === target.id
      )
        return false;
      if (source.warehouse && target.warehouse && source.rules?.[r])
        amount = Math.min(
          amount,
          Math.max(
            0,
            stockAmount(source, r) -
              source.rules[r]!.target -
              reserved(l, source.id, r),
          ),
        );
      if (amount < 0.01) return false;
      const sourceGoals = ends(source),
        targetGoals = ends(target);
      if (!sourceGoals.length || !targetGoals.length) {
        source.blocked = true;
        return false;
      }
      const route = findRoute(h.position, sourceGoals, grid);
      if (!route) return false;
      const pickup = route.at(-1) || h.position,
        delivery = findRoute(pickup, targetGoals, grid);
      if (!delivery) {
        source.blocked = true;
        return false;
      }
      h.source = source.id;
      h.destination = target.id;
      h.resource = r;
      h.amount = Math.min(
        h.cart ? 8 : 4,
        amount,
        target.warehouse ? intakeRoom(l, target, r) : Infinity,
      );
      h.loaded = false;
      h.route = route;
      h.progress = 0;
      h.status = "前往取货";
      source.blocked = false;
      return true;
    };
    for (const { s, wanted } of urgent) {
      if (assigned) break;
      for (const [r, n] of Object.entries(wanted).sort(
        ([a], [b]) => Number(b === "food") - Number(a === "food"),
      ) as [Resource, number][]) {
        const need = Math.min(
          n - stockAmount(s, r) - incoming(l, s.id, r),
          Math.max(
            0,
            s.capacity -
              stockTotal(s) -
              l.haulers
                .filter((h) => h.destination === s.id)
                .reduce((a, h) => a + h.amount, 0),
          ),
        );
        if (need < Math.min(1, n / 2)) continue;
        const sources = Object.values(l.stores)
          .filter(
            (x) => x.id !== s.id && sourceAvailable(l, x, r, buildings) > 0,
          )
          .sort(
            (a, b) =>
              Math.abs(a.x - s.x) +
                Math.abs(a.z - s.z) +
                Math.abs(a.x - h.position.x) +
                Math.abs(a.z - h.position.z) -
                (Math.abs(b.x - s.x) +
                  Math.abs(b.z - s.z) +
                  Math.abs(b.x - h.position.x) +
                  Math.abs(b.z - h.position.z)) || b.priority - a.priority,
          );
        for (const source of sources)
          if (
            assign(
              source,
              s,
              r,
              Math.min(need, sourceAvailable(l, source, r, buildings)),
            )
          ) {
            assigned = true;
            break;
          }
        if (assigned) break;
      }
    }
    if (assigned) continue;
    for (const source of Object.values(l.stores).filter(
      (s) => !s.warehouse && s.active,
    )) {
      for (const r of Object.keys({
        ...source.inside,
        ...source.outside,
      }) as Resource[]) {
        const amount = sourceAvailable(l, source, r, buildings);
        if (amount < 0.01) continue;
        for (const target of warehouses.filter((s) => s.active && !s.salvage)) {
          const free =
            target.capacity -
            stockTotal(target) -
            l.haulers
              .filter((h) => h.destination === target.id)
              .reduce((a, h) => a + h.amount, 0);
          if (assign(source, target, r, Math.min(amount, free))) {
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
      if (assigned) break;
    }
  }
  // Disconnected output is moved outside immediately, remaining recoverable when a route returns.
  for (const s of Object.values(l.stores)) {
    const b = buildings.find((b) => b.id === s.id),
      output = b && defs[b.type]?.town?.output;
    if (output && !ends(s).length) s.blocked = true;
    if (s.blocked && output)
      for (const r of Object.keys(output) as Resource[]) {
        s.outside[r] = (s.outside[r] || 0) + (s.inside[r] || 0);
        s.inside[r] = 0;
      }
    if (!s.blocked)
      for (const r of Object.keys(s.outside) as Resource[]) {
        const n = Math.min(
          s.outside[r] || 0,
          Math.max(0, s.capacity - sum(s.inside)),
        );
        s.inside[r] = (s.inside[r] || 0) + n;
        s.outside[r] = (s.outside[r] || 0) - n;
      }
  }
  t.ledger = { ...t.ledger };
  let cost = 0;
  for (const s of warehouses.filter((s) => s.active && !s.salvage)) {
    const b = buildings.find((b) => b.id === s.id),
      p = transportPolicy(s, b?.level || 1),
      shift = onShift(t.minute, { schedule: p.schedule }),
      active = l.haulers.filter((h) => h.home === s.id && h.destination),
      wages =
        (shift ? p.porters * 6 + p.carts * 8 : 0) / 360 +
        active
          .filter((h) => !working(h))
          .reduce((n, h) => n + (h.cart ? 8 : 6) / 360, 0),
      maintenance =
        (Math.max(p.carts, active.filter((h) => h.cart).length) * 2) / 360;
    const old = s.transportCosts;
    s.transportCosts = {
      day: t.day,
      wages: (old?.day === t.day ? old.wages : 0) + wages,
      maintenance: (old?.day === t.day ? old.maintenance : 0) + maintenance,
    };
    t.ledger.wages += wages;
    t.ledger.maintenance += maintenance;
    cost += wages + maintenance;
  }
  Object.assign(bag, warehouseBag(l));
  return cost;
}
export function setWarehousePriority(
  t: TownState,
  id: string,
  priority: number,
): TownState | null {
  if (!t.logistics?.stores[id]?.warehouse || ![0, 1, 2].includes(priority))
    return null;
  return {
    ...t,
    logistics: {
      ...t.logistics,
      stores: {
        ...t.logistics.stores,
        [id]: { ...t.logistics.stores[id], priority },
      },
    },
  };
}

export const stockRule = (s: Stock, r: Resource) =>
  s.rules?.[r] || { allowed: true, minimum: 0, target: s.capacity };
export function intakeRoom(l: Logistics, s: Stock, r: Resource) {
  const rule = stockRule(s, r);
  return rule.allowed
    ? Math.max(
        0,
        Math.min(
          rule.target - stockAmount(s, r) - incoming(l, s.id, r),
          s.capacity -
            stockTotal(s) -
            l.haulers
              .filter((h) => h.destination === s.id)
              .reduce((n, h) => n + h.amount, 0),
        ),
      )
    : 0;
}
export function spendableBag(t: TownState, bag: Bag): Bag {
  const result = { ...bag };
  for (const s of Object.values(t.logistics?.stores || {}))
    if (s.warehouse)
      for (const r of Object.keys(result) as Resource[])
        result[r] = Math.max(
          0,
          result[r] - Math.min(stockAmount(s, r), stockRule(s, r).minimum),
        );
  return result;
}
export function setStockRule(
  t: TownState,
  id: string,
  r: Resource,
  rule: { allowed: boolean; minimum: number; target: number },
): TownState | null {
  const s = t.logistics?.stores[id];
  if (
    !s?.warehouse ||
    !Object.hasOwn(emptyBag(), r) ||
    typeof rule.allowed !== "boolean" ||
    ![rule.minimum, rule.target].every((n) => Number.isFinite(n) && n >= 0) ||
    rule.minimum > rule.target ||
    rule.target > s.capacity
  )
    return null;
  return {
    ...t,
    logistics: {
      ...t.logistics!,
      stores: {
        ...t.logistics!.stores,
        [id]: { ...s, rules: { ...s.rules, [r]: { ...rule } } },
      },
    },
  };
}
export function freightReason(
  l: Logistics,
  s: Stock,
  buildings: Building[],
  tiles: Record<WorldId, Tile[]>,
): string {
  if (!s.active) return "建筑已暂停";
  const grid = freightGrid(
      tiles[s.world],
      buildings.filter((b) => b.world === s.world),
    ),
    ends = entrances(site(s, buildings), grid);
  if (!ends.length) return "建筑未连接道路";
  const jobs = l.haulers.filter(
    (h) => h.source === s.id || h.destination === s.id,
  );
  if (jobs.some((h) => h.status === "道路中断")) return "运输路线中断";
  if (jobs.some((h) => h.status === "仓库暂停")) return "搬运员所属仓库已暂停";
  if (jobs.some((h) => h.status === "等待通行")) return "道路拥堵，等待通行";
  const warehouses = Object.values(l.stores).filter(
    (w) => w.warehouse && !w.salvage && w.world === s.world && w.id !== s.id,
  );
  if (!s.warehouse) {
    if (!warehouses.some((w) => w.active))
      return warehouses.length ? "目的仓库已暂停" : "缺少目的仓库";
    const reachable = warehouses.filter(
      (w) =>
        w.active &&
        findRoute(ends[0], entrances(site(w, buildings), grid), grid),
    );
    if (!reachable.length) return "道路与仓库不连通";
    const output =
      defs[buildings.find((b) => b.id === s.id)?.type || ""]?.town?.output ||
      s.outside;
    const goods = (Object.keys(output) as Resource[]).filter(
      (r) => stockAmount(s, r) > 0.01,
    );
    if (
      goods.length &&
      !reachable.some((w) => goods.some((r) => intakeRoom(l, w, r) > 0.01))
    )
      return reachable.every((w) => stockTotal(w) >= w.capacity)
        ? "目的仓库已满"
        : "仓库禁收或已达到目标库存";
  }
  if (
    !l.haulers.some(
      (h) => l.stores[h.home]?.active && l.stores[h.home]?.world === s.world,
    )
  )
    return "没有可用搬运员";
  if (jobs.length) return "已安排运输";
  if (outsideTotal(s) > 0.01) return "等待空闲搬运员";
  return "物流正常";
}

export function transportPolicy(
  s: Stock | undefined,
  level = 1,
): TransportPolicy {
  return (
    s?.transport || {
      porters: Math.min(3, level),
      carts: Math.min(3, level),
      schedule: { start: 0, end: 24, lunch: false },
    }
  );
}
export function validTransport(p: TransportPolicy) {
  return (
    !!p &&
    [p.porters, p.carts].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 6,
    ) &&
    validSchedule(p.schedule)
  );
}
export function transportDailyCost(p: TransportPolicy) {
  let ticks = 0;
  for (let minute = 0; minute < 1440; minute += 4)
    if (onShift(minute, { schedule: p.schedule })) ticks++;
  return {
    wages: ((p.porters * 6 + p.carts * 8) * ticks) / 360,
    maintenance: p.carts * 2,
  };
}
export function setTransport(
  t: TownState,
  id: string,
  p: TransportPolicy,
): TownState | null {
  const s = t.logistics?.stores[id];
  if (!s?.warehouse || s.salvage || !validTransport(p)) return null;
  return {
    ...t,
    logistics: {
      ...t.logistics!,
      stores: {
        ...t.logistics!.stores,
        [id]: { ...s, transport: { ...p, schedule: { ...p.schedule } } },
      },
    },
  };
}
