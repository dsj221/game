import test from "node:test";
import assert from "node:assert/strict";
import { defs } from "../src/data/definitions.ts";
import { initialTown } from "../src/data/town.ts";
import {
  earnedTownAchievements,
  townAchievementProgress,
} from "../src/systems/townAchievements.ts";

const building = (type, x, z, id = type) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
  footprint: defs[type].size,
});

test("成就围绕真实经营与块间布局，不再依赖旧版直播和点击器", () => {
  const town = initialTown();
  town.totalSales = 1;
  town.development.total = 3;
  const buildings = [
    building("farm", 0, 0, "farm"),
    building("windmill", 2, 0, "mill"),
    building("bakery", 4, 0, "bakery"),
    building("breadshop", 6, 0, "shop"),
  ];
  const earned = earnedTownAchievements(town, buildings, defs);
  assert.ok(earned.includes("first_sale"));
  assert.ok(earned.includes("reaction"));
  assert.ok(earned.includes("grain_block"));
  assert.ok(earned.includes("bread_chain"));
  assert.ok(earned.includes("trusted"));
  assert.ok(!earned.includes("live"));
  assert.ok(!earned.includes("first"));
});

test("长期印记要求真实连续表现", () => {
  const town = initialTown();
  town.metrics.population = 20;
  town.metrics.happiness = 85;
  town.level = 5;
  town.reports = [1, 2, 3].map((day) => ({
    ...town.ledger,
    day,
    profit: 1,
    population: 20,
    happiness: 85,
  }));
  const progress = townAchievementProgress(town, [], defs);
  assert.equal(progress.profitable_days, true);
  assert.equal(progress.beloved, true);
  assert.equal(progress.dream_town, true);
  town.reports[1].profit = -1;
  assert.equal(townAchievementProgress(town, [], defs).profitable_days, false);
});
