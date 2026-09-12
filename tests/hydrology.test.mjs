import test from "node:test";
import assert from "node:assert/strict";
import {
  hydrologyStep,
  hydroGeneration,
  buildDam,
  setGate,
  waterSiteReason,
} from "../src/systems/hydrology.ts";
import { settlementTiles } from "../src/data/settlement.ts";
import { computeProduction } from "../src/systems/economy.ts";
import { climateStep, canalProject } from "../src/systems/climate.ts";
import { initialTown, emptyBag } from "../src/data/town.ts";
import { simulateTown } from "../src/game/TownSimulation.ts";
import { navigationGrid, findRoute } from "../src/npcs/navigation.ts";
const tiles = settlementTiles().overworld;
const wheel = (z = 0, id = "wheel") => ({
  id,
  type: "watermill",
  x: -5,
  z,
  world: "overworld",
  level: 1,
  rotation: 0,
  born: 0,
});
const cell = (x, z) => ({
  x,
  z,
  water: 30,
  scar: null,
  canal: true,
  channelWater: 0,
});
const total = (h, cells) =>
  h.reaches.reduce((s, r) => s + r.volume, 0) +
  cells.reduce((s, c) => s + (c.channelWater || 0), 0);
function advance(h, n, { rain = false, dry = false, cells = [] } = {}) {
  for (let i = 0; i < n; i++) h = hydrologyStep(h, tiles, cells, rain, dry);
  return h;
}
test("每tick河道、水渠满足水量守恒，旧状态不被修改", () => {
  const cells = [cell(-5, 0), cell(-4, 0)];
  let h = advance(undefined, 1);
  for (let i = 0; i < 1200; i++) {
    const before = total(h, cells),
      copy = structuredClone(h);
    const next = hydrologyStep(h, tiles, cells, i < 400, i >= 800);
    assert.deepEqual(h, copy);
    assert.ok(
      Math.abs(
        total(next, cells) -
          (before +
            next.inflow -
            next.outflow -
            next.evaporation -
            next.irrigation),
      ) < 1e-8,
    );
    assert.ok(
      next.reaches.every((r) => r.volume >= 0 && Number.isFinite(r.flow)),
    );
    h = next;
  }
});
test("旱季水位下降并停止水轮发电，暴雨恢复河水", () => {
  const full = advance(undefined, 900),
    dry = advance(full, 1800, { dry: true });
  assert.ok(hydroGeneration(wheel(), full) > 3);
  assert.equal(hydroGeneration(wheel(), dry), 0);
  assert.ok(dry.reaches.at(-1).volume < full.reaches.at(-1).volume);
  const rain = advance(dry, 1600, { rain: true });
  assert.ok(hydroGeneration(wheel(), rain) > 3);
});
test("关闸蓄水、下游逐渐断流，放流恢复；静水不能发电", () => {
  let normal = advance(undefined, 900),
    dam = buildDam(normal, 20, 30);
  assert.ok(dam);
  assert.equal(buildDam(normal, 19, 30), null);
  const closed = advance(setGate(dam, 0), 400);
  assert.equal(closed.reaches.find((r) => r.z === closed.damZ).flow, 0);
  assert.ok(
    closed.reaches.find((r) => r.z === closed.damZ).volume >
      normal.reaches.find((r) => r.z === closed.damZ).volume,
  );
  assert.ok(closed.reaches.at(-1).volume < normal.reaches.at(-1).volume);
  assert.equal(hydroGeneration(wheel(closed.damZ), closed), 0);
  assert.equal(hydroGeneration({ ...wheel(closed.damZ), x: -6 }, closed), 0);
  const released = advance(setGate(closed, 1), 180);
  assert.ok(hydroGeneration(wheel(3), released) > 3);
  assert.equal(setGate(dam, 2).gate, 1);
  assert.equal(setGate(dam, -1).gate, 0);
  const spill = advance(setGate(dam, 0), 1200, { rain: true });
  assert.ok(spill.reaches.find((r) => r.z === spill.damZ).flow > 0);
});
test("只有连通水渠能引河水，切断连接后消耗有限存水", () => {
  let h = advance(undefined, 500),
    cells = [cell(-5, 0), cell(-4, 0), cell(-2, 0)];
  h = advance(h, 120, { cells });
  assert.ok(cells[1].channelWater > 0);
  assert.equal(cells[2].channelWater, 0);
  cells = cells.slice(1);
  cells[0].water = 10;
  const stored = cells[0].channelWater;
  h = advance(h, 100, { cells });
  assert.ok(cells[0].channelWater < stored);
  const dried = advance(h, 900, { cells });
  assert.equal(cells[0].channelWater, 0);
  assert.ok(dried.reaches.length);
});
test("水力进入真实能源池，枯水导致工业停机，暂停与远离河道不发电", () => {
  const full = advance(undefined, 900),
    dry = advance(full, 1800, { dry: true });
  const b = wheel(),
    factory = { ...b, id: "factory", type: "furnace", x: 0 };
  const wet = computeProduction([b, factory], [], 0, 480, full),
    empty = computeProduction([b, factory], [], 0, 480, dry);
  assert.ok(wet.generation >= 3);
  assert.ok(!wet.offline.includes("factory"));
  assert.ok(empty.offline.includes("factory"));
  assert.equal(
    computeProduction([{ ...b, paused: true }], [], 0, 480, full).generation,
    0,
  );
  assert.equal(hydroGeneration({ ...b, x: 3 }, full), 0);
  assert.equal(hydroGeneration({ ...b, world: "nether" }, full), 0);
  const single = hydroGeneration(b, full),
    second = wheel(0, "second");
  assert.ok(
    hydroGeneration(b, full, [b, second]) +
      hydroGeneration(second, full, [b, second]) <=
      single + 1e-9,
  );
  let town = initialTown();
  town.day = 25;
  town.minute = 500;
  town.hydrology = dry;
  const result = simulateTown({
    town,
    buildings: [b, factory],
    npcs: [],
    bag: emptyBag(),
    currency: 100,
    tick: 0,
    weather: [],
    tiles: settlementTiles(),
    offline: empty.offline,
  });
  assert.equal(result.town.facilities.factory.status, "缺少电力");
});
test("河道影响选址与寻路，桥梁恢复跨河通行", () => {
  assert.ok(waterSiteReason("house", -6, 0, tiles));
  assert.ok(waterSiteReason("farm", -7, 0, tiles, [2, 2]));
  assert.equal(waterSiteReason("bridge", -6, 0, tiles), null);
  assert.ok(waterSiteReason("watermill", 0, 0, tiles));
  assert.equal(waterSiteReason("watermill", -5, 0, tiles), null);
  const start = { x: -7, z: 0 },
    end = [{ x: -5, z: 0 }];
  assert.equal(findRoute(start, end, navigationGrid(tiles, [])), null);
  assert.ok(
    findRoute(
      start,
      end,
      navigationGrid(tiles, [{ ...wheel(), type: "bridge", x: -6 }]),
    ),
  );
});
test("旧存档初始化、工程持久化、日内不能重复注入初始水量", () => {
  let t = initialTown();
  climateStep(t, [], tiles);
  assert.equal(t.hydrology.reaches.length, 9);
  t = canalProject(t, 5, 5, -5, 0, tiles);
  assert.ok(t);
  assert.equal(canalProject(t, 5, 5, -6, 0, tiles), null);
  const saved = JSON.parse(JSON.stringify(t));
  assert.deepEqual(saved, t);
  const input = structuredClone(t);
  climateStep(t, [], tiles);
  assert.deepEqual(input.climate.cells[0].channelWater, 0);
  assert.ok(t.climate.cells[0].channelWater > 0);
  const more = [...tiles, { x: -2, z: 2, born: 0 }],
    before = total(t.hydrology, t.climate.cells);
  const expanded = hydrologyStep(
    t.hydrology,
    more,
    t.climate.cells,
    false,
    false,
  );
  assert.ok(
    Math.abs(
      total(expanded, t.climate.cells) -
        (before +
          expanded.inflow -
          expanded.outflow -
          expanded.evaporation -
          expanded.irrigation),
    ) < 1e-8,
  );
});
