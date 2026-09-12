import test from "node:test";
import assert from "node:assert/strict";
import { defs } from "../src/data/definitions.ts";
import { emptyBag, initialTown } from "../src/data/town.ts";
import { makeCitizen } from "../src/data/settlement.ts";
import { simulateTown } from "../src/game/TownSimulation.ts";

const b = (type, x = 0, z = 0, id = type) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
});

test("家具、陶器和工具拥有互不替代的生产与销售路径", () => {
  assert.equal(defs.carpenter.town.output.furniture, 2);
  assert.equal(defs.pottery.town.output.pottery, 2);
  assert.equal(defs.icon_clay_kiln.town.output.pottery, 2);
  assert.equal(defs.icon_workshop_stall.town.output.tools, 1);
  assert.equal(defs.icon_tool_shop.town.sells, "tools");
});

test("生产周期消耗少量工具，无工具时保留低压力的90%产量", () => {
  const home = b("house", -2, 0, "home"),
    farm = b("farm", 0, 0, "farm");
  const make = (tools) => ({
    town: initialTown(),
    buildings: [home, farm],
    npcs: [0, 1].map((i) => ({
      ...makeCitizen(`n${i}`, i, home.id),
      workplace: farm.id,
    })),
    bag: { ...emptyBag(), tools },
    currency: 1000,
    tick: 0,
    weather: [],
  });
  let maintained = make(10),
    worn = make(0);
  maintained.town.minute = worn.town.minute = 500;
  for (let i = 0; i < 100; i++) {
    maintained = simulateTown(maintained);
    worn = simulateTown(worn);
  }
  assert.ok(maintained.town.ledger.consumed.tools > 0);
  const maintainedWork =
      (maintained.town.ledger.produced.wheat || 0) +
      maintained.town.facilities.farm.progress * 5,
    wornWork =
      (worn.town.ledger.produced.wheat || 0) +
      worn.town.facilities.farm.progress * 5;
  assert.ok(maintainedWork > wornWork);
  assert.ok(worn.town.ledger.produced.wheat > 0);
});

test("陶器进入餐饮消费，缺少陶器不会让基础食品链停摆", () => {
  const home = b("house", -2, 0, "home"),
    cafe = b("cafe", 0, 0, "cafe"),
    npcs = [0, 1].map((i) => ({
      ...makeCitizen(`c${i}`, i, home.id),
      workplace: cafe.id,
      wallet: 300,
      needs: { food: 80, fun: 80, shopping: 40 },
    }));
  let state = {
    town: initialTown(),
    buildings: [home, cafe],
    npcs,
    bag: { ...emptyBag(), bread: 100, pottery: 5 },
    currency: 1000,
    tick: 0,
    weather: [],
  };
  state.town.minute = 500;
  for (let i = 0; i < 30; i++) state = simulateTown(state);
  assert.ok(state.town.ledger.consumed.pottery > 0);
  assert.ok(state.town.totalSales > 0);
});
