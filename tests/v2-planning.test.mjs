import test from "node:test";
import assert from "node:assert/strict";
import {
  navigationGrid,
  findRoute,
  entrances,
} from "../src/npcs/navigation.ts";
import {
  influenceFor,
  happinessFactors,
} from "../src/systems/buildingInfluence.ts";
import { placementReport } from "../src/systems/placement.ts";
import { landRegions } from "../src/systems/land.ts";
import { advanceTravel } from "../src/npcs/travel.ts";
import { moveVisual } from "../src/npcs/visualTravel.ts";
import { simulateTown } from "../src/game/TownSimulation.ts";
import {
  settlementBuildings,
  settlementTiles,
  makeCitizen,
} from "../src/data/settlement.ts";
import { initialTown } from "../src/data/town.ts";
import { quests, townLevels } from "../src/data/town.ts";
import { defs } from "../src/data/definitions.ts";
import { emptyBag } from "../src/data/town.ts";
const b = (type, x, z, id = type) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
});
test("公园使附近住宅幸福增加，远处及停用公园不生效", () => {
  const home = b("house", 0, 0);
  assert.ok(influenceFor(home, [home, b("park", 2, 0)], defs).happiness > 0);
  assert.equal(influenceFor(home, [home, b("park", 20, 0)], defs).happiness, 0);
  assert.equal(
    influenceFor(home, [home, { ...b("park", 2, 0), paused: true }], defs)
      .happiness,
    0,
  );
});
test("失业扣分、就业加分，工业为负影响", () => {
  const home = b("house", 0, 0),
    work = b("lumber", 1, 0);
  assert.ok(influenceFor(home, [home, work], defs).happiness < 0);
  assert.ok(happinessFactors({ home: "house" }, [home, work], defs).就业 < 0);
  assert.ok(
    happinessFactors({ home: "house", workplace: "lumber" }, [home, work], defs)
      .就业 > 0,
  );
});
test("预览不变更资源，报告占地及金币不足", () => {
  const bag = emptyBag(),
    home = b("house", 0, 0),
    p = placementReport(
      b("park", 0, 0),
      [home],
      [{ x: 0, z: 0 }],
      [],
      bag,
      0,
      1,
    );
  assert.ok(p.reasons.includes("土地已占用"));
  assert.ok(p.reasons.includes("金币不足"));
  assert.deepEqual(bag, emptyBag());
});
test("路径绕过建筑，终点为建筑入口，无路返回null", () => {
  const tiles = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ],
    obstacle = b("house", 0, 0),
    goal = b("house", 3, 0, "goal");
  const grid = navigationGrid(tiles, [obstacle, goal]);
  const route = findRoute({ x: -1, z: 0 }, entrances(goal, grid), grid);
  assert.ok(route?.length);
  assert.ok(route.every((p) => !(p.x === 0 && p.z === 0)));
  assert.equal(findRoute({ x: -1, z: 0 }, [{ x: 99, z: 99 }], grid), null);
});
test("区域购买后以地图持久化，不重复增加地块", () => {
  const r = landRegions([])[0];
  assert.ok(r.tiles.length > 0);
  assert.equal(landRegions(r.tiles).find((x) => x.id === r.id).tiles.length, 0);
});
test("五章愿望覆盖最终等级，跳转目标有效且未提前开放", () => {
  assert.equal(new Set(quests.map((q) => q.id)).size, quests.length);
  for (let level = 1; level <= 5; level++)
    assert.ok(quests.some((q) => q.stage === level));
  for (const q of quests) {
    assert.ok(q.hint.length > 15);
    assert.ok(
      defs[q.action] ||
        ["town", "village", "happiness", "upgrade-home"].includes(q.action),
    );
    if (defs[q.action])
      assert.ok((defs[q.action].town?.unlock || 1) <= q.stage);
  }
  const s = {
    town: initialTown(),
    buildings: [],
    npcs: [],
    bag: emptyBag(),
    currency: 1000,
    tick: 0,
    weather: [],
  };
  s.town.metrics.happiness = 100;
  const next = simulateTown(s);
  assert.ok(!next.town.completed.includes("dream-living"));
});
test("每次晋级均提示等待确认，直到梦想之城", () => {
  for (let level = 1; level < 5; level++) {
    const next = townLevels[level],
      houses = Array.from({ length: Math.ceil(next.population / 2) }, (_, i) =>
        b("house", i * 2, 0, "home" + i),
      );
    const town = initialTown();
    town.level = level;
    town.ledger.sales = next.earned;
    const s = simulateTown({
      town,
      buildings: houses,
      npcs: Array.from({ length: next.population }, (_, i) =>
        makeCitizen("n" + i, i, "home" + Math.floor(i / 2)),
      ),
      bag: { ...emptyBag(), food: 1000 },
      currency: 10000,
      tick: 0,
      weather: [],
    });
    assert.equal(s.town.level, level);
    assert.equal(s.town.upgradeReady, true);
    assert.ok(s.town.notices.some((n) => n.text.includes("可以升级")));
  }
});
test("固定Tick真实到达，目标搬迁后重算路线", () => {
  const home = b("house", -1, 0),
    work = b("shop", 3, 0),
    tiles = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ],
    n = { home: "house" };
  advanceTravel(n, work, [home, work], tiles);
  assert.equal(n.arrivedAt, undefined);
  for (let i = 0; i < 30; i++) advanceTravel(n, work, [home, work], tiles);
  assert.equal(n.arrivedAt, "shop");
  const moved = { ...work, x: 4, z: 1 };
  advanceTravel(n, moved, [home, moved], tiles);
  assert.equal(n.travelTarget, "shop");
  for (let i = 0; i < 30; i++) advanceTravel(n, moved, [home, moved], tiles);
  assert.equal(n.arrivedAt, "shop");
});
test("居民保留经过的路径拐点，渲染按帧移动且不会越过转角", () => {
  const home = b("house", -1, 0),
    work = b("shop", 3, 0),
    tiles = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ],
    n = { home: "house" };
  for (let i = 0; i < 20; i++) advanceTravel(n, work, [home, work], tiles);
  assert.ok(n.movementTrail.length > 1);
  assert.equal(n.movementTrail.at(-1).step, n.movementStep);
  assert.ok(
    n.movementTrail.every(
      (p, i, a) =>
        !i || Math.abs(p.x - a[i - 1].x) + Math.abs(p.z - a[i - 1].z) === 1,
    ),
  );
  const position = { x: 0, z: 0 },
    queue = [
      { x: 1, z: 0 },
      { x: 1, z: 1 },
    ];
  moveVisual(
    position,
    queue,
    0.05,
    1,
    new Map([
      ["1,0", 1],
      ["1,1", 1],
    ]),
  );
  assert.ok(position.x > 0 && position.x < 1);
  assert.equal(position.z, 0);
  for (let i = 0; i < 40; i++)
    moveVisual(
      position,
      queue,
      0.05,
      1,
      new Map([
        ["1,0", 1],
        ["1,1", 1],
      ]),
    );
  assert.deepEqual(queue, []);
  assert.ok(Math.abs(position.x - 1) < 1e-8 && Math.abs(position.z - 1) < 1e-8);
});
test("含实际地图寻路的两天闭环：到岗生产、到店消费、保存可序列化", () => {
  const buildings = settlementBuildings();
  buildings.push(
    b("house", -3, -2, "h2"),
    b("house", -3, 0, "h3"),
    b("farm", -2, 0),
    b("windmill", -1, -2),
    b("bakery", 1, -2),
    b("breadshop", 2, 0),
    b("shop", -1, 0),
  );
  const homes = buildings.filter((x) => x.type === "house");
  let s = {
    buildings,
    tiles: settlementTiles(),
    npcs: Array.from({ length: 6 }, (_, i) =>
      makeCitizen("n" + i, i, homes[Math.floor(i / 2)].id),
    ),
    town: initialTown(),
    bag: { ...emptyBag(), food: 40, wheat: 10, flour: 8 },
    currency: 2000,
    tick: 0,
    weather: [],
  };
  for (let i = 0; i < 720; i++) s = simulateTown(s);
  assert.ok(s.town.totalSales > 0);
  assert.ok(s.town.reports.some((r) => (r.produced.bread || 0) > 0));
  assert.ok(s.npcs.every((n) => n.position));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(s)));
  console.log(
    "实际寻路两天",
    JSON.stringify({
      sales: s.town.totalSales,
      coins: Math.round(s.currency),
      happiness: Math.round(s.town.metrics.happiness),
    }),
  );
});
