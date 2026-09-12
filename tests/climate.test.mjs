import test from "node:test";
import assert from "node:assert/strict";
import {
  seasonAt,
  seasonDay,
  forecast,
  climateStep,
  climateEfficiency,
  canalProject,
} from "../src/systems/climate.ts";
import { initialTown, emptyBag } from "../src/data/town.ts";
import { simulateTown } from "../src/game/TownSimulation.ts";
const farm = {
  id: "farm",
  type: "farm",
  world: "overworld",
  x: 0,
  z: 0,
  level: 1,
  rotation: 0,
  born: 0,
};
test("14日一季，跨年循环；事件提前两天预报", () => {
  assert.equal(seasonAt(14), 0);
  assert.equal(seasonAt(15), 1);
  assert.equal(seasonAt(57), 0);
  assert.equal(seasonDay(56), 14);
  assert.equal(forecast(2).length, 0);
  assert.equal(forecast(3)[0].startDay, 5);
  assert.equal(forecast(21)[0].type, "drought");
});
test("暴雨跨日积水，水渠减轻涝害，停雨后泥痕仍保留", () => {
  let wet = initialTown();
  wet.day = 4;
  climateStep(wet, [farm]);
  let drained = canalProject(wet, 5, 5, 0, 0);
  assert.ok(drained);
  assert.equal(wet.climate.cells[0].canal, false);
  for (let d = 5; d <= 9; d++) {
    wet.day = d;
    drained.day = d;
    climateStep(wet, [farm]);
    climateStep(drained, [farm]);
  }
  assert.equal(wet.climate.cells[0].scar, "mud");
  assert.ok(
    climateEfficiency(drained, farm, [farm]) >
      climateEfficiency(wet, farm, [farm]),
  );
  wet.day = 10;
  climateStep(wet, [farm]);
  assert.equal(wet.events.length, 0);
  assert.equal(wet.climate.cells[0].scar, "mud");
  assert.equal(canalProject(wet, 4, 5, 0, 0), null);
});
test("旱季改变土地；近邻水井保护农田；跨日不会修改输入", () => {
  const well = { ...farm, id: "well", type: "icon_stone_well", x: 2 };
  let dry = initialTown(),
    supplied = initialTown();
  for (let d = 22; d <= 26; d++) {
    dry.day = d;
    supplied.day = d;
    climateStep(dry, [farm]);
    climateStep(supplied, [farm, well]);
  }
  assert.equal(dry.climate.cells[0].scar, "cracks");
  assert.ok(supplied.climate.cells[0].water >= 45);
  const input = {
    town: dry,
    buildings: [farm],
    npcs: [],
    bag: emptyBag(),
    currency: 100,
    tick: 0,
    weather: [],
  };
  const before = structuredClone(input);
  simulateTown(input);
  assert.deepEqual(input, before);
});
test("节庆结束彩带仍保留，冬季按居民消耗木材", () => {
  const t = initialTown();
  t.day = 18;
  climateStep(t, [farm]);
  t.day = 22;
  climateStep(t, [farm]);
  assert.equal(t.climate.cells[0].scar, "ribbons");
  t.day = 43;
  const s = simulateTown({
    town: t,
    buildings: [],
    npcs: [
      {
        id: "n",
        name: "n",
        world: "overworld",
        modelType: "villager",
        workplace: "",
        level: 1,
        efficiency: 1,
        phase: 0,
      },
    ],
    bag: { ...emptyBag(), wood: 5 },
    currency: 100,
    tick: 0,
    weather: [],
  });
  assert.ok(s.bag.wood < 5);
  assert.ok(s.town.ledger.consumed.wood > 0);
});
