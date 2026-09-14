import test from "node:test";
import assert from "node:assert/strict";
import { initialTown, emptyBag } from "../src/data/town.ts";
import {
  prepareLogistics,
  logisticsStep,
  deposit,
  setTransport,
  transportDailyCost,
  transportPolicy,
  stockTotal,
} from "../src/systems/logistics.ts";
import { estimateWeather } from "../src/systems/weatherImpact.ts";
import { climateStep } from "../src/systems/climate.ts";
const b = (id, type, x, z) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
});
const tiles = {
  overworld: [-2, -1, 0, 1].flatMap((x) =>
    [-1, 0, 1].map((z) => ({ x, z, born: 0 })),
  ),
  nether: [],
  end: [],
};
const buildings = [
  b("w", "warehouse", -3, -1),
  b("f", "farm", 3, -1),
  ...Array.from({ length: 7 }, (_, i) => b("r" + i, "road", i - 3, 0)),
];
const policy = (porters, carts, start = 0, end = 24) => ({
  porters,
  carts,
  schedule: { start, end, lunch: false },
});
function fixture() {
  const t = initialTown(),
    bag = emptyBag();
  prepareLogistics(t, buildings, bag, tiles);
  deposit(t.logistics.stores.f, "wheat", 40);
  return { t, bag };
}
const goods = (t) =>
  Object.values(t.logistics.stores).reduce((n, s) => n + stockTotal(s), 0) +
  t.logistics.haulers.reduce((n, h) => n + (h.loaded ? h.amount : 0), 0);
test("运力人数为可配置且有成本的实际搬运能力", () => {
  const run = (p) => {
    let { t, bag } = fixture();
    t = setTransport(t, "w", p);
    let cost = 0;
    for (let i = 0; i < 40; i++)
      cost += logisticsStep(t, buildings, bag, tiles, i);
    assert.equal(goods(t), 40);
    return { delivered: t.logistics.delivered, cost };
  };
  const none = run(policy(0, 0)),
    one = run(policy(1, 0)),
    many = run(policy(2, 2));
  assert.equal(none.delivered, 0);
  assert.equal(none.cost, 0);
  assert.ok(many.delivered > one.delivered);
  assert.ok(many.cost > one.cost);
  assert.equal(transportDailyCost(policy(1, 1)).wages, 14);
  assert.equal(transportDailyCost(policy(1, 1, 22, 6)).wages, 14 / 3);
  assert.equal(setTransport(fixture().t, "w", policy(-1, 1)), null);
  assert.equal(setTransport(fixture().t, "w", policy(7, 1)), null);
});
test("下班及缩编完成在途订单，停止新派单；旧档保留默认运力", () => {
  let { t, bag } = fixture();
  assert.equal(transportPolicy(t.logistics.stores.w).carts, 1);
  t = setTransport(t, "w", policy(0, 1, 8, 18));
  t.minute = 0;
  logisticsStep(t, buildings, bag, tiles, 0);
  assert.ok(t.logistics.haulers.every((h) => !h.destination));
  t.minute = 480;
  for (let i = 0; i < 30 && !t.logistics.haulers.some((h) => h.loaded); i++)
    logisticsStep(t, buildings, bag, tiles, i);
  assert.ok(t.logistics.haulers.some((h) => h.loaded));
  t = setTransport(t, "w", policy(0, 0));
  t.minute = 1200;
  for (let i = 0; i < 40; i++) {
    prepareLogistics(t, buildings, bag, tiles);
    logisticsStep(t, buildings, bag, tiles, i);
  }
  assert.equal(goods(t), 40);
  assert.equal(t.logistics.haulers.length, 0);
  assert.ok(t.logistics.delivered > 0);
});
test("工资维护费用进入账簿，暂停仓库不计费，排班引用不会修改旧状态", () => {
  let { t, bag } = fixture();
  t = setTransport(t, "w", policy(1, 1));
  const before = structuredClone(t);
  const next = { ...t };
  prepareLogistics(next, buildings, bag, tiles);
  const cost = logisticsStep(next, buildings, bag, tiles, 1);
  assert.deepEqual(t, before);
  assert.ok(Math.abs(cost - 16 / 360) < 1e-9);
  assert.ok(Math.abs(next.ledger.wages - t.ledger.wages - 14 / 360) < 1e-9);
  const paused = buildings.map((b) =>
    b.id === "w" ? { ...b, paused: true } : b,
  );
  prepareLogistics(next, paused, bag, tiles);
  assert.equal(logisticsStep(next, paused, bag, tiles, 2), 0);
});
test("天气预报提前两天预测断水、农田风险及发电下降，不修改实际城镇", () => {
  const t = initialTown();
  t.day = 21;
  t.minute = 0;
  const sites = [b("farm", "farm", -4, 0), b("wheel", "watermill", -6, 0)];
  climateStep(t, sites, tiles.overworld);
  const old = structuredClone(t),
    result = estimateWeather(t, sites, tiles.overworld);
  assert.deepEqual(t, old);
  assert.equal(result.event, "夏季缺水");
  assert.ok(result.risks.some((r) => r.id === "farm" && r.kind === "缺水"));
  assert.ok(result.powerMin < result.powerNow);
  assert.ok(result.storageDays !== null);
  assert.ok(result.risks.every((r) => r.afterDays <= result.days));
});
test("预报复用真实土壤与河水演进，已缺水立即预警，连通渠道改善农田风险", () => {
  const t = initialTown();
  t.day = 23;
  t.minute = 0;
  const sites = [b("farm", "farm", -5, 0)];
  climateStep(t, sites, tiles.overworld);
  t.climate.cells.find((c) => c.x === -5).water = 10;
  const dry = estimateWeather(t, sites, tiles.overworld);
  assert.equal(dry.risks.find((r) => r.id === "farm").afterDays, 0);
  const wet = structuredClone(t);
  wet.climate.cells[0] = {
    ...wet.climate.cells[0],
    canal: true,
    channelWater: 10,
    water: 65,
  };
  const result = estimateWeather(wet, sites, tiles.overworld);
  const direct = structuredClone(wet);
  let first = null;
  for (let i = 0; i <= result.days * 360; i++) {
    if (i) {
      direct.minute += 4;
      if (direct.minute >= 1440) {
        direct.day++;
        direct.minute -= 1440;
      }
      climateStep(direct, sites, tiles.overworld);
    }
    if (first === null && direct.climate.cells[0].water < 25) first = i / 360;
  }
  assert.equal(
    result.risks.find((r) => r.kind === "缺水")?.afterDays ?? null,
    first,
  );
  assert.ok(first === null || first > 0);
});

test("低于一件的工具补货按半目标触发，不因残余小数永久缺工具", () => {
  let { t, bag } = fixture();
  const sites = buildings.map((b) =>
    b.id === "f" ? { ...b, type: "windmill" } : b,
  );
  t.logistics.stores.f.inside = { tools: 0.04 };
  t.logistics.stores.f.outside = {};
  deposit(t.logistics.stores.w, "tools", 8);
  bag.tools = 8;
  for (let i = 0; i < 40; i++) logisticsStep(t, sites, bag, tiles, i);
  assert.ok((t.logistics.stores.f.inside.tools || 0) >= 0.99);
});

test('运输支出只扣一次货币，并计入建筑成本及日报',async()=>{const {simulateTown}=await import('../src/game/TownSimulation.ts');let {t,bag}=fixture();const result=simulateTown({town:t,bag,buildings:[buildings[0]],npcs:[],currency:1000,tick:0,weather:[],tiles});const cost=result.town.ledger.wages+result.town.ledger.maintenance+result.town.ledger.purchases;assert.ok(Math.abs(1000-result.currency-cost)<1e-8);assert.ok(Math.abs(result.town.facilities.w.dailyCosts-cost)<1e-8);});
