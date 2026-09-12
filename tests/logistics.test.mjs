import test from "node:test";
import assert from "node:assert/strict";
import { initialTown, emptyBag } from "../src/data/town.ts";
import {
  prepareLogistics,
  logisticsStep,
  stockAmount,
  stockTotal,
  deposit,
  warehouseBag,
  outsideTotal,
  setWarehousePriority,
} from "../src/systems/logistics.ts";
import { simulateTown } from "../src/game/TownSimulation.ts";
import { makeCitizen } from "../src/data/settlement.ts";
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
  overworld: [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1].map((z) => ({ x, z, born: 0 })),
  ),
  nether: [],
  end: [],
};
const roads = () =>
  Array.from({ length: 7 }, (_, i) => b("r" + i, "road", i - 3, 0));
function setup(
  buildings = [b("w", "warehouse", -3, -1), b("f", "farm", 3, -1), ...roads()],
  bag = emptyBag(),
) {
  const t = initialTown();
  prepareLogistics(t, buildings, bag, tiles);
  return { town: t, buildings, bag, tick: 0 };
}
function step(s) {
  const before = structuredClone(s.town);
  const t = { ...s.town };
  prepareLogistics(t, s.buildings, s.bag, tiles);
  logisticsStep(t, s.buildings, s.bag, tiles, ++s.tick);
  assert.deepEqual(s.town, before);
  s.town = t;
  return s;
}
const goods = (s) =>
  Object.values(s.town.logistics.stores).reduce(
    (n, s) => n + stockTotal(s),
    0,
  ) +
  s.town.logistics.haulers.reduce((n, h) => n + (h.loaded ? h.amount : 0), 0);
test("成品留在建筑，搬运员实际取货、移动、交付后才进入全镇仓储；全程守恒", () => {
  const s = setup();
  deposit(s.town.logistics.stores.f, "wheat", 8);
  let carried = false,
    moved = false;
  assert.equal(s.bag.wheat, 0);
  for (let i = 0; i < 45; i++) {
    step(s);
    assert.ok(Math.abs(goods(s) - 8) < 1e-8);
    if (s.town.logistics.haulers.some((h) => h.loaded)) {
      carried = true;
      assert.ok(s.bag.wheat < 8);
    }
    if (s.town.logistics.haulers.some((h) => h.position.x !== -3)) moved = true;
  }
  assert.ok(carried && moved);
  assert.equal(s.bag.wheat, 8);
  assert.equal(s.town.logistics.delivered, 8);
});
test("高优先级仓库先收货，优先级持久化且不可写入非法值", () => {
  const s = setup([
    b("low", "warehouse", -3, -1),
    b("high", "warehouse", 3, -1),
    b("f", "bakery", 0, 1),
    ...roads(),
  ]);
  s.town = setWarehousePriority(s.town, "low", 0);
  s.town = setWarehousePriority(s.town, "high", 2);
  deposit(s.town.logistics.stores.f, "bread", 8);
  for (let i = 0; i < 40; i++) step(s);
  assert.equal(stockAmount(s.town.logistics.stores.high, "bread"), 8);
  assert.equal(stockAmount(s.town.logistics.stores.low, "bread"), 0);
  assert.equal(setWarehousePriority(s.town, "high", 9), null);
  assert.equal(
    JSON.parse(JSON.stringify(s.town)).logistics.stores.high.priority,
    2,
  );
});
test("断路成品在建筑外堆积，恢复道路后搬运清空，不瞬间转移", () => {
  const s = setup();
  s.buildings = s.buildings.filter((b) => b.id !== "r6");
  deposit(s.town.logistics.stores.f, "wheat", 16);
  for (let i = 0; i < 8; i++) step(s);
  assert.equal(s.bag.wheat, 0);
  assert.equal(outsideTotal(s.town.logistics.stores.f), 16);
  s.buildings.push(b("r6", "road", 3, 0));
  step(s);
  assert.equal(s.bag.wheat, 0);
  for (let i = 0; i < 65; i++) step(s);
  assert.equal(s.bag.wheat, 16);
  assert.equal(outsideTotal(s.town.logistics.stores.f), 0);
});
test("载货途中断路保留在途货物，修复后继续，不丢货不复制", () => {
  const s = setup();
  deposit(s.town.logistics.stores.f, "wheat", 8);
  while (!s.town.logistics.haulers.some((h) => h.loaded) && s.tick < 30)
    step(s);
  s.buildings = s.buildings.filter((b) => b.id !== "r3");
  for (let i = 0; i < 12; i++) step(s);
  assert.ok(s.town.logistics.haulers.some((h) => h.status === "道路中断"));
  assert.ok(Math.abs(goods(s) - 8) < 1e-8);
  s.buildings.push(b("r3", "road", 0, 0));
  for (let i = 0; i < 50; i++) step(s);
  assert.equal(s.bag.wheat, 8);
});
test("拆除建筑保留原址货物，外部买卖/建材消耗与仓库账实一致", () => {
  const s = setup();
  deposit(s.town.logistics.stores.f, "wheat", 6);
  s.buildings = s.buildings.filter((b) => b.id !== "f");
  step(s);
  assert.ok(s.town.logistics.stores.f.salvage);
  for (let i = 0; i < 40; i++) step(s);
  assert.equal(s.bag.wheat, 6);
  s.bag.wheat -= 2;
  s.bag.wood = 7;
  step(s);
  assert.equal(warehouseBag(s.town.logistics).wheat, 4);
  assert.equal(warehouseBag(s.town.logistics).wood, 7);
});
test("同一瓶颈上的多辆车排队且最终通过，不死锁", () => {
  const s = setup();
  s.town.logistics.haulers = Array.from({ length: 4 }, (_, i) => ({
    id: "haul:w:" + i,
    home: "w",
    cart: true,
    position: { x: 3, z: 0 },
    route: [],
    progress: 0,
    source: "f",
    destination: "w",
    resource: "wheat",
    amount: 1,
    loaded: true,
    status: "运送货物",
  }));
  step(s);
  assert.ok(s.town.logistics.haulers.some((h) => h.status === "等待通行"));
  for (let i = 0; i < 30; i++) step(s);
  assert.equal(s.bag.wheat, 4);
  assert.equal(goods(s), 4);
});
test("加工厂即使全镇有原料也需等送达，场外满载时停工，仍只使用既有资源", () => {
  const buildings = [
    b("w", "warehouse", -3, -1),
    b("mill", "windmill", 3, -1),
    b("home", "house", 2, 1),
    ...roads(),
  ];
  const town = initialTown();
  town.minute = 500;
  let s = {
    town,
    buildings,
    npcs: [
      {
        ...makeCitizen("n", 0, "home"),
        workplace: "mill",
        arrivedAt: "mill",
        position: { x: 3, z: 0 },
      },
    ],
    bag: { ...emptyBag(), wheat: 20, tools: 5 },
    currency: 1000,
    tick: 0,
    weather: [],
    tiles,
  };
  s = simulateTown(s);
  assert.equal(s.town.facilities.mill.status, "缺少原料");
  for (let i = 0; i < 90; i++) s = simulateTown(s);
  assert.ok((s.town.ledger.produced.flour || 0) > 0);
  deposit(s.town.logistics.stores.mill, "flour", 60);
  deposit(s.town.logistics.stores.mill, "wheat", 6);
  s.town.minute = 500;
  s.npcs[0].arrivedAt = "mill";
  s = simulateTown(s);
  assert.equal(s.town.facilities.mill.status, "堆货停工");
  assert.deepEqual(Object.keys(s.bag).sort(), Object.keys(emptyBag()).sort());
});

test("集市从仓储移到货架不复制家具，并实际从其他仓库补货", () => {
  const buildings = [
    b("m", "market", 0, -1),
    b("home", "house", 1, 1),
    ...roads(),
  ];
  let town = initialTown();
  town.minute = 500;
  const npcs = [0, 1].map((i) => ({
    ...makeCitizen("n" + i, i, "home"),
    workplace: "m",
    arrivedAt: "m",
    position: { x: 0, z: 0 },
  }));
  let s = {
    town,
    buildings,
    npcs,
    bag: { ...emptyBag(), furniture: 10 },
    currency: 1000,
    tick: 0,
    weather: [],
    tiles,
  };
  s = simulateTown(s);
  assert.equal(s.town.facilities.m.stock, 10);
  assert.equal(s.bag.furniture, 0);
  s = simulateTown(s);
  assert.equal(s.town.facilities.m.stock, 10);
  assert.equal(s.bag.furniture, 0);
  const delivery = setup([
    b("w", "warehouse", -3, -1),
    b("m", "market", 3, -1),
    ...roads(),
  ]);
  deposit(delivery.town.logistics.stores.w, "furniture", 8);
  delivery.bag = warehouseBag(delivery.town.logistics);
  for (let i = 0; i < 35; i++) step(delivery);
  assert.equal(stockAmount(delivery.town.logistics.stores.m, "furniture"), 8);
  assert.equal(goods(delivery), 8);
});

for (const [makerType, shopType, resource] of [
  ["carpenter", "market", "furniture"],
  ["icon_workshop_stall", "icon_tool_shop", "tools"],
])
  test(`${resource}主链：原料送到工坊、成品运往店铺并成交`, async () => {
    const { defs } = await import("../src/data/definitions.ts");
    const buildings = [
      b("w", "warehouse", -3, -1),
      b("maker", makerType, 0, -1),
      b("sale", shopType, 3, -1),
      b("home", "apartment", 1, 1),
      ...roads(),
    ];
    const jobs = [
      ...Array(defs[makerType].town.jobs).fill("maker"),
      ...Array(defs[shopType].town.jobs).fill("sale"),
      "",
    ];
    const npcs = jobs.map((job, i) => ({
      ...makeCitizen("n" + i, i, "home"),
      workplace: job,
      arrivedAt: job || "home",
      position: { x: job === "sale" ? 3 : job === "maker" ? 0 : 1, z: 0 },
      wallet: 1000,
      needs: { food: 0, fun: 0, shopping: 80 },
    }));
    const town = initialTown();
    town.minute = 480;
    let s = {
      town,
      buildings,
      npcs,
      bag: { ...emptyBag(), wood: 30, iron: 10, food: 30 },
      currency: 2000,
      tick: 0,
      weather: [],
      tiles,
    };
    for (let i = 0; i < 180; i++) s = simulateTown(s);
    assert.ok(s.town.ledger.produced[resource] > 0);
    assert.ok(s.town.facilities.sale.customers > 0);
    assert.ok(s.town.logistics.delivered > 0);
  });
