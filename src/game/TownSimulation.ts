import { prepareLogistics, logisticsStep, warehouseBag, stockAmount, takeStock, deposit, outsideTotal } from '../systems/logistics.ts';
import { climateStep, climateEfficiency, seasonAt } from '../systems/climate.ts';
import type { Bag, Building, Npc, Resource } from "../types/index.ts";
import type {
  SimInput,
  SimOutput,
  TownState,
  TownMetrics,
  TownNotice,
  Facility,
} from "../types/town.ts";
import { defs } from "../data/definitions.ts";
import {
  emptyFacility,
  emptyLedger,
  quests,
  townLevels,
} from "../data/town.ts";
import { makeCitizen } from "../data/settlement.ts";
import { connectedBuildings } from "../systems/economy.ts";
import {
  influenceFor,
  happinessFactors,
  buildingDistance,
  influenceRules,
  operationalIds,
} from "../systems/buildingInfluence.ts";
import { advanceTravel } from "../npcs/travel.ts";
import { onShift } from "../systems/workSchedule.ts";
import { developmentBonuses } from "../systems/development.ts";
import { residentWishStep } from "../systems/residentWishes.ts";
const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
const cfg = (b: Building) => defs[b.type]?.town;
const cloneLedger = (ledger: TownState["ledger"]): TownState["ledger"] => ({
  ...ledger,
  produced: { ...ledger.produced },
  consumed: { ...ledger.consumed },
});
function cloneTown(source: TownState): TownState {
  return {
    ...source,
    development: source.development
      ? {
          ...source.development,
          delivered: [...source.development.delivered],
          projects: [...source.development.projects],
        }
      : undefined,
    facilities: Object.fromEntries(
      Object.entries(source.facilities).map(([id, facility]) => [
        id,
        {
          ...facility,
          schedule: facility.schedule ? { ...facility.schedule } : undefined,
        },
      ]),
    ),
    metrics: { ...source.metrics },
    ledger: cloneLedger(source.ledger),
    reports: source.reports.map((report) => ({
      ...report,
      produced: { ...report.produced },
      consumed: { ...report.consumed },
    })),
    completed: [...source.completed],
    claimed: [...source.claimed],
    events: source.events.map((event) => ({ ...event })),
    eventHistory: [...source.eventHistory],
    builtCounts: { ...source.builtCounts },
    notices: source.notices.map((notice) => ({ ...notice })),
    pulses: source.pulses.map((pulse) => ({ ...pulse })),
  };
}
function cloneNpcs(source: Npc[]): Npc[] {
  return source.map((npc) => ({
    ...npc,
    needs: npc.needs ? { ...npc.needs } : undefined,
    likes: npc.likes ? [...npc.likes] : undefined,
    position: npc.position ? { ...npc.position } : undefined,
    route: npc.route?.map((point) => ({ ...point })),
    wish: npc.wish
      ? { ...npc.wish, solutions: [...npc.wish.solutions] }
      : undefined,
    memories: npc.memories?.map((memory) => ({ ...memory })),
  }));
}
export const slots = (b: Building) => (cfg(b)?.jobs || 0) * b.level;
export const capacity = (b: Building) => (cfg(b)?.capacity || 0) * b.level;
export const isWorkTime = (minute: number) =>
  minute >= 480 && minute < 1080 && !(minute >= 720 && minute < 780);
const addResource = (bag: Partial<Bag>, r: Resource, n: number) => {
  bag[r] = (bag[r] || 0) + n;
};
function note(
  t: TownState,
  text: string,
  kind: TownNotice["kind"],
  tick: number,
  building?: string,
) {
  t.notices = [
    {
      id: `${tick}-${kind}-${t.notices.length}-${text.slice(0, 8)}`,
      text,
      kind,
      tick,
      building,
    },
    ...t.notices,
  ].slice(0, 30);
}
export function questProgress(t: TownState, buildings: Building[], id: string) {
  const q = quests.find((q) => q.id === id);
  if (!q) return 0;
  const count = (type: string) =>
    buildings.filter((b) => b.world === "overworld" && b.type === type).length;
  switch (q.type) {
    case "level":
      return t.level;
    case "happiness":
      return t.metrics.happiness;
    case "employed":
      return t.metrics.employed;
    case "housing-upgrade":
      return buildings.filter(
        (b) =>
          b.world === "overworld" &&
          (defs[b.type]?.town?.capacity || 0) > 0 &&
          b.level >= 2,
      ).length;
    case "produced":
      return (
        (t.ledger.produced[q.target as Resource] || 0) +
        t.reports.reduce(
          (sum, r) => sum + (r.produced[q.target as Resource] || 0),
          0,
        )
      );
    case "build":
      return t.builtCounts[q.target] || 0;
    case "population":
      return t.peakPopulation;
    case "sales":
      return t.totalSales;
    case "chain":
      return Number(count("bakery") > 0) + Number(count("breadshop") > 0);
    case "building":
      return count(q.target);
    case "environment":
      return t.metrics.environment;
    case "revenue":
      return Math.max(t.ledger.sales, ...t.reports.map((r) => r.sales));
    default:
      return 0;
  }
}
export function metrics(
  buildings: Building[],
  npcs: Npc[],
  bag: Bag,
  facilities: Record<string, Facility> = {},
): TownMetrics {
  const locals = npcs.filter(
      (n) => n.world === "overworld" && n.modelType === "villager",
    ),
    local = buildings.filter((b) => b.world === "overworld");
  const pop = locals.length,
    cap = local.reduce((n, b) => n + capacity(b), 0),
    jobs = local.filter((b) => !b.paused).reduce((n, b) => n + slots(b), 0),
    employed = locals.filter(
      (n) =>
        n.workplace && local.some((b) => b.id === n.workplace && !b.paused),
    ).length;
  const environment = clamp(
    48 +
      local.reduce(
        (n, b) => n + (b.paused ? 0 : (cfg(b)?.environment || 0) * b.level),
        0,
      ) -
      local.filter((b) => ["furnace", "drill"].includes(b.type)).length * 3,
  );
  const happiness = pop
      ? locals.reduce((n, p) => n + (p.happiness ?? 78), 0) / pop
      : 70,
    health = pop ? locals.reduce((n, p) => n + (p.health ?? 90), 0) / pop : 90;
  const foodDemand = Math.max(1, pop * 2),
    foodSupply = local.reduce((n, b) => {
      const c = cfg(b);
      if (!c?.output || b.paused) return n;
      const staff = locals.filter((p) => p.workplace === b.id).length;
      return (
        n +
        ((((c.output.food || 0) + (c.output.bread || 0)) * 360) /
          (c.cycle || 30)) *
          0.375 *
          (c.jobs ? Math.min(1, staff / slots(b)) : 1)
      );
    }, 0);
  const shopFood = local.reduce(
    (sum, b) =>
      sum +
      (["food", "bread"].includes(cfg(b)?.sells || "")
        ? facilities[b.id]?.stock || 0
        : 0),
    0,
  );
  const foodDays = (bag.food + bag.bread + shopFood) / foodDemand;
  const attraction = clamp(
    happiness * 0.6 +
      environment * 0.25 +
      Math.min(15, Math.max(0, jobs - pop) * 5) -
      (foodDays < 0.5 ? 25 : 0) -
      (jobs < pop ? (pop - jobs) * 6 : 0),
  );
  let reason = "住房、岗位与食物充足，邻居正在考虑搬来。";
  if (cap <= pop) reason = "没有空余住房：建设或升级住宅。";
  else if (foodDays < 0.5)
    reason = "食品供应不足：增加农田，或从集市补充食物。";
  else if (happiness < 45) reason = "居民不够满意：补足食物与休闲设施。";
  else if (jobs <= employed) reason = "新增岗位较少，入住速度放缓。";
  return {
    population: pop,
    capacity: cap,
    jobs,
    employed,
    unemployment: pop ? ((pop - employed) / pop) * 100 : 0,
    happiness,
    health,
    environment,
    foodDemand,
    foodSupply,
    foodDays,
    attraction,
    expected:
      cap > pop && foodDays >= 0.5 && happiness >= 45
        ? Math.min(cap - pop, Math.max(1, jobs - employed))
        : 0,
    growthReason: reason,
  };
}
function assignHomesAndJobs(buildings: Building[], npcs: Npc[]) {
  const homes = buildings.filter((b) => capacity(b) > 0),
    jobs = buildings.filter((b) => slots(b) > 0 && !b.paused),
    homeById = new Map(homes.map((home) => [home.id, home])),
    jobById = new Map(jobs.map((job) => [job.id, job]));
  const homeUse = new Map<string, number>(),
    jobUse = new Map<string, number>();
  for (const n of npcs) {
    if (n.modelType !== "villager") continue;
    const h = homeById.get(n.home || "");
    if (!h || h.world !== n.world || (homeUse.get(h.id) || 0) >= capacity(h))
      n.home = "";
    else homeUse.set(h.id, (homeUse.get(h.id) || 0) + 1);
    const job = jobById.get(n.workplace || "");
    if (
      !job ||
      job.world !== n.world ||
      (jobUse.get(job.id) || 0) >= slots(job)
    )
      n.workplace = "";
    else jobUse.set(job.id, (jobUse.get(job.id) || 0) + 1);
  }
  // Give each recipe stage a worker before filling second seats.
  for (const job of jobs.filter((b) => !(jobUse.get(b.id) || 0))) {
    const worker = npcs.find(
      (n) =>
        n.modelType === "villager" &&
        n.world === job.world &&
        (jobUse.get(n.workplace) || 0) > 1,
    );
    if (worker) {
      jobUse.set(worker.workplace, (jobUse.get(worker.workplace) || 0) - 1);
      worker.workplace = job.id;
      jobUse.set(job.id, 1);
    }
  }
  for (const n of npcs) {
    if (n.modelType !== "villager") continue;
    if (!n.home) {
      const h = homes.find(
        (b) => b.world === n.world && (homeUse.get(b.id) || 0) < capacity(b),
      );
      if (h) {
        n.home = h.id;
        homeUse.set(h.id, (homeUse.get(h.id) || 0) + 1);
      }
    }
    if (!n.workplace) {
      const home = homeById.get(n.home || "");
      let j: Building | undefined,
        best = Infinity;
      for (const candidate of jobs) {
        if (
          candidate.world !== n.world ||
          (jobUse.get(candidate.id) || 0) >= slots(candidate)
        )
          continue;
        const score =
          (jobUse.get(candidate.id) || 0) * 10 +
          (cfg(candidate)?.sells ? 0 : cfg(candidate)?.output ? 1 : 2) +
          (home
            ? (Math.abs(candidate.x - home.x) +
                Math.abs(candidate.z - home.z)) *
              0.01
            : 0);
        if (score < best) {
          best = score;
          j = candidate;
        }
      }
      if (j) {
        n.workplace = j.id;
        jobUse.set(j.id, (jobUse.get(j.id) || 0) + 1);
      }
    }
    const work = jobById.get(n.workplace || "");
    n.income = work ? cfg(work)!.wage || 30 : 0;
    n.profession = work
      ? {
          farm: "农人",
          lumber: "伐木工",
          windmill: "磨坊工",
          bakery: "面包师",
          shop: "店员",
          breadshop: "面包店员",
          clinic: "医护人员",
          school: "教师",
          carpenter: "木匠",
          cafe: "咖啡师",
        }[work.type] || "工匠"
      : "待业";
  }
}
/** One deterministic economic second; simulation state is copied, React is not involved. */
export function simulateTown(input: SimInput): SimOutput {
  const t = cloneTown(input.town),
    npcs = cloneNpcs(input.npcs),
    bag = { ...input.bag },
    buildings = input.buildings;
  let currency = input.currency;
  const before = currency;
  const tick = input.tick + 1;
  const bonuses = developmentBonuses(t.development);
  const localBuildings = Object.fromEntries(
    ["overworld", "nether", "end"].map((world) => [
      world,
      buildings.filter((b) => b.world === world),
    ]),
  );
  const pulse = (b: Building, text: string) => {
    t.pulses = [
      ...t.pulses.filter((p) => tick - p.tick < 4),
      { id: `${tick}-${b.id}-${text}`, building: b.id, text, tick },
    ].slice(-12);
  };
  t.pulses = t.pulses.filter((p) => tick - p.tick < 4);
  t.minute += 4;
  if (t.minute >= 1440) {
    t.minute -= 1440;
    const m = metrics(buildings, npcs, bag, t.facilities);
    t.reports = [
      {
        ...cloneLedger(t.ledger),
        day: t.day,
        profit:
          t.ledger.revenue -
          t.ledger.wages -
          t.ledger.maintenance -
          t.ledger.purchases,
        population: m.population,
        happiness: m.happiness,
      },
      ...t.reports,
    ].slice(0, 14);
    note(t, `第 ${t.day} 天的小镇日报已送达。`, "event", tick);
    t.day++;
    t.ledger = emptyLedger(m.happiness);
    for (const f of Object.values(t.facilities)) {
      f.dailyRevenue = 0;
      f.dailyCosts = 0;
      f.dailyCustomers = 0;
    }
  }
  climateStep(t, buildings, input.tiles?.overworld);
  if (input.tiles) {
    prepareLogistics(t, buildings, bag, input.tiles);
    logisticsStep(t, buildings, bag, input.tiles, tick);
  }
  if (seasonAt(t.day) === 3) {
    const residents = npcs.filter(n => n.world === "overworld" && n.modelType === "villager");
    for(const n of residents) {
      const local = input.tiles ? t.logistics?.stores[n.home||''] : undefined;
      const fuel = input.tiles ? local ? takeStock(local,'wood',1/360) : 0 : Math.min(bag.wood,1/360);
      if(!input.tiles) bag.wood -= fuel;
      t.ledger.consumed.wood = (t.ledger.consumed.wood || 0) + fuel;
      if(fuel < 1/360) n.health = Math.max(0,(n.health ?? 80)-.025);
    }
  }
  assignHomesAndJobs(buildings, npcs);
  const buildingById = new Map(
      buildings.map((building) => [building.id, building]),
    ),
    workersByBuilding = new Map<string, Npc[]>(),
    residentsByBuilding = new Map<string, Npc[]>();
  for (const npc of npcs) {
    if (npc.workplace) {
      const workers = workersByBuilding.get(npc.workplace) || [];
      workers.push(npc);
      workersByBuilding.set(npc.workplace, workers);
    }
    if (npc.home) {
      const residents = residentsByBuilding.get(npc.home) || [];
      residents.push(npc);
      residentsByBuilding.set(npc.home, residents);
    }
  }
  const rain =
      input.weather.includes("rain"),
    festival = t.events.some((e) => e.type === "festival"),
    flu = t.events.some((e) => e.type === "flu");
  const offline = new Set(input.offline || []);
  const activeIds = operationalIds(
    buildings,
    npcs,
    defs,
    input.offline,
    !!input.tiles,
  );
  for (const b of buildings)
    if (cfg(b)?.jobs && !onShift(t.minute, t.facilities[b.id], !!cfg(b)?.sells))
      activeIds.delete(b.id);
  // Spatial state is stable within one Tick. Compute it once instead of
  // rescanning every building for every resident and service check.
  const activeInfluence = new Map(
    buildings
      .filter((building) => cfg(building))
      .map((building) => [
        building.id,
        influenceFor(building, buildings, defs, activeIds),
      ]),
  );
  const connections = new Set<string>();
  for (const world of ["overworld", "nether", "end"])
    connectedBuildings(buildings.filter((b) => b.world === world)).forEach(
      (id) => connections.add(id),
    );
  const validIds = new Set(buildings.map((b) => b.id));
  for (const id of Object.keys(t.facilities))
    if (!validIds.has(id)) delete t.facilities[id];
  for (const b of buildings) {
    const c = cfg(b);
    if (!c) continue;
    const f = (t.facilities[b.id] ??= emptyFacility());
    const localStock = input.tiles ? t.logistics?.stores[b.id] : undefined;
    const available = (r:Resource) => localStock ? stockAmount(localStock,r) : bag[r];
    const consume = (r:Resource,n:number) => {if(localStock)takeStock(localStock,r,n);else bag[r]-=n;};
    const shift = onShift(t.minute, f, !!c.sells);
    const staff = (workersByBuilding.get(b.id) || []).filter(
      (n) => n.modelType === "villager",
    );
    f.staff = staff.length;
    const influence = activeInfluence.get(b.id)!;
    f.efficiency =
      (c.jobs ? Math.min(1, staff.length / slots(b)) : 1) *
      (input.tiles && c.jobs
        ? staff.filter((n) => n.arrivedAt === b.id).length /
          Math.max(1, staff.length)
        : 1) *
      (input.tiles || connections.has(b.id) || ["住宅", "公共", "装饰"].includes(c.category)
        ? 1
        : 0.5) *
      influence.efficiency *
      climateEfficiency(t, b, buildings) *
      (flu && !influence.health ? 0.8 : 1) *
      (c.output ? bonuses.production * (c.recipe ? bonuses.processing : 1) : 1);
    if (b.paused) {
      f.efficiency = 0;
      f.status = "暂停营业";
      continue;
    }
    const upkeep = ((c.upkeep * b.level) / 360) * bonuses.maintenance;
    currency -= upkeep;
    f.costs += upkeep;
    f.dailyCosts += upkeep;
    t.ledger.maintenance += upkeep;
    if (shift) {
      for (const n of staff) {
        const wage = ((n.income || 0) / 135) * bonuses.wages;
        currency -= wage;
        n.wallet = (n.wallet ?? 70) + wage;
        t.ledger.wages += wage;
        f.costs += wage;
        f.dailyCosts += wage;
      }
    }
    if (offline.has(b.id)) {
      f.status = "缺少电力";
      f.efficiency = 0;
      continue;
    }
    if (c.capacity) {
      f.status = "住宅";
      for (const n of residentsByBuilding.get(b.id) || []) {
        const rent = Math.min(n.wallet || 0, ((c.rent || 0) * b.level) / 360);
        n.wallet = (n.wallet || 0) - rent;
        currency += rent;
        f.revenue += rent;
        f.dailyRevenue += rent;
        t.ledger.revenue += rent;
        t.ledger.rent += rent;
      }
      continue;
    }
    if (c.sells) {
      if (!shift) {
        f.status = "休息中";
        continue;
      }
      if (!staff.length) {
        f.status = "员工不足";
        continue;
      }
      if (!activeIds.has(b.id)) {
        f.status = "员工未到岗";
        continue;
      }
      const want = Math.min(
        12 * b.level - f.stock,
        available(c.sells),
        Math.max(0, Math.floor(currency / Math.max(1, c.wholesale || 1))),
      );
      if (want >= 1) {
        const count = Math.floor(want),
          cost = count * (c.wholesale || 1);
        consume(c.sells, count);
        f.stock += count;
        currency -= cost;
        f.costs += cost;
        f.dailyCosts += cost;
        t.ledger.purchases += cost;
      }
      f.status = f.stock >= 1 ? "等待顾客" : "等待补货";
      continue;
    }
    if (!c.output) {
      if (c.jobs && !shift) {
        f.status = "休息中";
        f.efficiency = 0;
        continue;
      }
      f.status = c.jobs && !activeIds.has(b.id) ? "员工不足" : "开放中";
      continue;
    }
    if (!shift) {
      f.status = "休息中";
      continue;
    }
    if (c.jobs && !staff.length) {
      f.status = "员工不足";
      continue;
    }
    if (
      Object.entries(c.recipe || {}).some(([r, n]) => available(r as Resource) < n)
    ) {
      f.status = "缺少原料";
      continue;
    }
    if(localStock && outsideTotal(localStock) >= localStock.capacity) {f.status="堆货停工";continue;}
    f.status = staff.length < slots(b) ? "员工不足" : "生产中";
    const toolUse = 0.05 * b.level,
      maintained = available("tools") >= toolUse;
    f.progress += (f.efficiency * (maintained ? 1 : 0.9)) / (c.cycle || 30);
    if (f.progress >= 1) {
      f.progress -= 1;
      if (maintained) {
        consume("tools",toolUse);
        addResource(t.ledger.consumed, "tools", toolUse);
      }
      for (const [r, n] of Object.entries(c.recipe || {})) {
        consume(r as Resource,n);
        addResource(t.ledger.consumed, r as Resource, n);
      }
      for (const [r, n] of Object.entries(c.output)) {
        const quantity =
          n *
          b.level *
          (b.type === "farm" && rain ? 0.8 : 1) *
          (["food", "wheat"].includes(r) ? bonuses.food : 1);
        if(localStock)deposit(localStock,r as Resource,quantity);else bag[r as Resource] += quantity;
        addResource(t.ledger.produced, r as Resource, quantity);
        f.produced += quantity;
        pulse(
          b,
          `+${Number(quantity.toFixed(1))} ${{ wood: "木材", stone: "石材", food: "食物", wheat: "小麦", flour: "面粉", bread: "面包", furniture: "家具", pottery: "陶器", tools: "工具", iron: "铁矿", redstone: "机巧零件" }[r as Resource]}`,
        );
      }
    }
  }
  const shops = buildings.filter((b) => cfg(b)?.sells && activeIds.has(b.id)),
    parks = buildings.filter(
      (b) => influenceRules[b.type]?.leisure && activeIds.has(b.id),
    ),
    shopAppeal = new Map(
      shops.map((shop) => [
        shop.id,
        activeInfluence.get(shop.id)?.blockEffects.customers || 0,
      ]),
    ),
    consumerMetrics = metrics(buildings, npcs, bag, t.facilities);
  for (const [index, n] of npcs.entries()) {
    if (n.modelType !== "villager") continue;
    n.wallet = (n.wallet || 0) + 24 / 360; // Household remittances keep purchasing power circulating.
    n.needs ??= { food: 18, fun: 20, shopping: 15 };
    n.needs.food = clamp(n.needs.food + 0.28);
    n.needs.fun = clamp(n.needs.fun + (n.age! < 30 ? 0.15 : 0.1));
    n.needs.shopping = clamp(n.needs.shopping + 0.08);
    const residence = buildingById.get(n.home || "");
    const residenceInfluence = residence
      ? activeInfluence.get(residence.id)
      : undefined;
    const hasClinic = !!residenceInfluence?.health;
    const localParks = parks.filter(
      (b) =>
        b.world === n.world &&
        (!residence ||
          buildingDistance(residence, b) <=
            (influenceRules[b.type]?.radius || 3)),
    );
    n.health = clamp(
      (n.health ?? 90) +
        (hasClinic ? 0.035 : 0) -
        (flu && !hasClinic ? 0.11 : 0) -
        (n.needs.food > 80 ? 0.05 : 0),
    );
    const foodNeed = n.needs.food > 32,
      funNeed = n.needs.fun > 40,
      shoppingNeed = n.needs.shopping > 35;
    const workplace = buildingById.get(n.workplace || "");
    const shopShift =
      !!workplace &&
      onShift(t.minute, t.facilities[workplace.id], !!cfg(workplace)?.sells);
    const shop = shops
      .filter(
        (b) =>
          b.world === n.world &&
          (!residence ||
            buildingDistance(residence, b) <=
              (influenceRules[b.type]?.radius || 5)) &&
          t.facilities[b.id]?.staff > 0 &&
          t.facilities[b.id].stock >= 1 &&
          t.facilities[b.id].priceFactor <= 1.5 &&
          (festival ||
            (foodNeed && ["food", "bread"].includes(cfg(b)?.sells || "")) ||
            (funNeed && ["cafe", "tea_house"].includes(b.type)) ||
            (shoppingNeed && !["food", "bread"].includes(cfg(b)?.sells || ""))),
      )
      .sort((a, b) => {
        if (a.id === n.travelTarget) return -1;
        if (b.id === n.travelTarget) return 1;
        const pref = (v: Building) =>
          (cfg(v)?.sells === "food" || cfg(v)?.sells === "bread" ? 0 : 1) -
          (shopAppeal.get(v.id) || 0) * 0.02;
        return foodNeed
          ? pref(a) -
              pref(b) +
              ((index + Math.floor(tick / 19)) % 2
                ? (cfg(a)?.sells === "bread" ? -0.1 : 0) -
                  (cfg(b)?.sells === "bread" ? -0.1 : 0)
                : 0)
          : pref(a) - pref(b);
      })[0];
    let bought = false;
    if (input.tiles) {
      const leisure =
        t.minute >= 1080 && t.minute < 1260 ? localParks[0] : undefined;
      // Keep shop staff at the counter throughout opening hours.
      const destination =
        shopShift && cfg(workplace!)?.sells
          ? workplace
          : shop && (foodNeed || funNeed || shoppingNeed || festival)
            ? shop
            : shopShift
              ? workplace
              : leisure || residence;
      n.destination = destination?.id;
      advanceTravel(
        n,
        destination,
        localBuildings[n.world],
        input.tiles[n.world],
      );
    }
    if (
      shop &&
      t.facilities[shop.id].stock >= 1 &&
      (!input.tiles || n.arrivedAt === shop.id) &&
      (foodNeed || funNeed || shoppingNeed || festival) &&
      tick - (n.lastPurchase ?? -100) > 18 &&
      (() => {
        const appeal = shopAppeal.get(shop.id) || 0;
        const cadence = input.tiles || connections.has(shop.id)
          ? appeal > 0
            ? 5
            : 6
          : appeal > 0
            ? 9
            : 12;
        return tick % cadence === index % cadence;
      })()
    ) {
      const c = cfg(shop)!,
        f = t.facilities[shop.id];
      const scarcity =
        c.sells === "food" || c.sells === "bread"
          ? 1 + clamp(1 - consumerMetrics.foodDays, 0, 0.2)
          : 1;
      const price = Math.round(
        (c.price || 12) * f.priceFactor * (festival ? 1.3 : seasonAt(t.day) === 2 ? 1.15 : 1) * scarcity,
      );
      if ((n.wallet || 0) >= price && f.priceFactor <= 1.5) {
        n.wallet = (n.wallet || 0) - price;
        currency += price;
        f.stock -= 1;
        f.revenue += price;
        f.dailyRevenue += price;
        f.customers++;
        f.dailyCustomers++;
        f.status = "营业中";
        t.ledger.revenue += price;
        t.ledger.sales += price;
        t.totalSales++;
        addResource(t.ledger.consumed, c.sells!, 1);
        const shopStock = input.tiles ? t.logistics?.stores[shop.id] : undefined;
        const tableware =
          (["cafe", "tea_house"].includes(shop.type) || festival) &&
          (shopStock ? stockAmount(shopStock,"pottery") : bag.pottery) >= 0.1;
        if (tableware) {
          if(shopStock)takeStock(shopStock,"pottery",.1);else bag.pottery -= 0.1;
          addResource(t.ledger.consumed, "pottery", 0.1);
        }
        n.lastPurchase = tick;
        n.destination = shop.id;
        n.state = "购物消费";
        n.recent = `在${defs[shop.type].name}买到了${c.sells === "food" ? "新鲜食物" : c.sells === "bread" ? "面包" : c.sells === "tools" ? "顺手的工具" : c.sells === "pottery" ? "喜欢的陶器" : "心仪的家具"}，花了 ${price} 金币。`;
        if (c.sells === "food" || c.sells === "bread")
          n.needs.food = clamp(n.needs.food - 55);
        n.needs.shopping = clamp(n.needs.shopping - 35);
        if (["cafe", "tea_house"].includes(shop.type) || festival)
          n.needs.fun = clamp(n.needs.fun - (tableware ? 35 : 25));
        f.satisfaction = clamp(95 - (f.priceFactor - 1) * 35);
        pulse(shop, `+${price} 金币`);
        bought = true;
      } else {
        n.recent = "这家店有点贵，我再看看。";
        n.needs.shopping = clamp(n.needs.shopping + 0.5);
      }
    }
    const homeStock = input.tiles ? t.logistics?.stores[n.home||""] : undefined;
    if (n.needs.food > 75 && (homeStock ? stockAmount(homeStock,"food") : input.tiles ? 0 : bag.food) >= 1 && (!input.tiles || n.arrivedAt === n.home) && tick % 12 === index % 12) {
      if(homeStock)takeStock(homeStock,"food",1);else bag.food -= 1;
      n.needs.food = clamp(n.needs.food - 35);
      addResource(t.ledger.consumed, "food", 1);
      n.recent = input.tiles ? "吃到了搬运员送到家中的储备粮。" : "在社区仓库领到一份食物，希望街角很快有商店。";
    }
    if (!bought && tick - (n.lastPurchase ?? -100) > 12) {
      if (shopShift) {
        n.state = "正在工作";
        n.destination = n.workplace;
      } else if (t.minute >= 1380 || t.minute < 420) {
        n.state = "在家睡觉";
        n.destination = n.home;
        n.needs.fun = clamp(n.needs.fun - 0.2);
      } else if (t.minute >= 1140 && t.minute < 1260 && localParks.length) {
        const park = localParks[0];
        n.state = "邻里休闲";
        n.destination = park.id;
        if (!input.tiles || n.arrivedAt === park.id)
          n.needs.fun = clamp(n.needs.fun - 0.9);
      } else if (shopShift && n.workplace) {
        n.state = "正在工作";
        n.destination = n.workplace;
      } else if (t.minute >= 720 && t.minute < 780) {
        n.state = "午间用餐";
        n.destination = shop?.id || n.home;
      } else {
        n.state =
          t.minute >= 1260 ? "回家休息" : n.workplace ? "邻里散步" : "寻找工作";
        n.destination = n.home;
      }
    }
    if (input.tiles) {
      n.destination = n.travelTarget;
      if (!n.arrivedAt) n.state = n.route ? "正在前往目的地" : "道路受阻";
    }
    const wishEvent = residentWishStep(n, {
      day: t.day,
      tick,
      focusIndex: index,
      buildings,
      defs,
      metrics: consumerMetrics,
      facilities: t.facilities,
      homeInfluence: residenceInfluence,
    });
    if (wishEvent) note(t, wishEvent.text, "resident", tick, residence?.id);
    const target = clamp(
      Object.values(
        happinessFactors(n, buildings, defs, activeIds, bonuses.happiness, {
          home: residence,
          work: workplace,
          influence: residenceInfluence,
        }),
      ).reduce((a, b) => a + b, 0),
    );
    n.happiness = clamp(
      (n.happiness ?? 78) + (target - (n.happiness ?? 78)) * 0.025,
    );
  }
  t.metrics = metrics(buildings, npcs, bag, t.facilities);
  const m = t.metrics;
  if (m.expected > 0) {
    t.migrationProgress +=
      (m.attraction / 100) * (m.jobs > m.employed ? 1 : 0.25);
    if (t.migrationProgress >= 14 && npcs.length < 500) {
      const home = buildings.find(
        (b) =>
          b.world === "overworld" &&
          capacity(b) > npcs.filter((n) => n.home === b.id).length,
      );
      if (home) {
        const n = makeCitizen(
          `citizen-${tick}-${npcs.length}`,
          npcs.length,
          home.id,
        );
        npcs.push(n);
        t.ledger.arrivals++;
        t.migrationProgress = 0;
        note(
          t,
          `${n.name}搬入了${defs[home.type].name}！`,
          "resident",
          tick,
          home.id,
        );
        pulse(home, "新邻居入住");
      }
    }
  } else t.migrationProgress = Math.max(0, t.migrationProgress - 0.1);
  if (m.happiness < 30 || m.capacity < m.population) {
    t.departProgress++;
    if (
      t.departProgress >= 90 &&
      npcs.filter((n) => n.modelType === "villager").length > 1
    ) {
      const index = npcs.findIndex(
        (n) =>
          n.modelType === "villager" && (!n.home || (n.happiness || 0) < 35),
      );
      if (index >= 0) {
        const [leaving] = npcs.splice(index, 1);
        t.ledger.departures++;
        note(
          t,
          `${leaving.name}暂时搬离了小镇。改善居住与供应，迎接下一次重逢。`,
          "resident",
          tick,
        );
      }
      t.departProgress = 0;
    }
  } else t.departProgress = 0;
  t.metrics = metrics(buildings, npcs, bag, t.facilities);
  t.peakPopulation = Math.max(t.peakPopulation, t.metrics.population);
  const next = townLevels[t.level];
  if (
    next &&
    t.metrics.population >= next.population &&
    t.metrics.happiness >= (next.level >= 3 ? 70 : 45) &&
    t.ledger.sales + t.reports.reduce((sum, r) => sum + r.sales, 0) >=
      next.earned
  ) {
    if (!t.upgradeReady)
      note(
        t,
        `小镇可以升级了！确认晋级 Lv.${next.level} · ${next.name}。`,
        "level",
        tick,
      );
    t.upgradeReady = true;
  } else t.upgradeReady = false;
  for (const q of quests)
    if (
      !t.completed.includes(q.id) &&
      t.level >= q.stage &&
      questProgress(t, buildings, q.id) >= q.count
    ) {
      t.completed.push(q.id);
      note(
        t,
        `愿望达成：${q.title}，可以领取 ${q.reward} 金币。`,
        "quest",
        tick,
      );
    }
  if(input.tiles && t.logistics) Object.assign(bag,warehouseBag(t.logistics));
  return {
    ...input,
    town: t,
    npcs,
    bag,
    currency,
    tick,
    net: currency - before,
  };
}
