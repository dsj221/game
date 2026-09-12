import test from "node:test";
import assert from "node:assert/strict";
import { defs } from "../src/data/definitions.ts";
import { makeCitizen } from "../src/data/settlement.ts";
import {
  residentWishStep,
  wishCause,
  wishResolved,
  memoryHappiness,
} from "../src/systems/residentWishes.ts";
import { happinessFactors } from "../src/systems/buildingInfluence.ts";

const b = (type, x, z, id = type) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  footprint: defs[type].size,
  level: 1,
  born: 0,
});
const metrics = {
  population: 1,
  capacity: 2,
  jobs: 1,
  employed: 1,
  unemployment: 0,
  happiness: 70,
  health: 90,
  environment: 50,
  attraction: 50,
  foodSupply: 4,
  foodDemand: 2,
  foodDays: 2,
  expected: 0,
  growthReason: "",
};
const context = (buildings, more = {}) => ({
  day: 1,
  tick: 0,
  focusIndex: 0,
  buildings,
  defs,
  metrics,
  facilities: {},
  homeInfluence: { commerce: false, health: false },
  ...more,
});

test("焦点居民会因真实长通勤产生带期限和多解法的独立愿望", () => {
  const home = b("house", 0, 0, "home"),
    work = b("farm", 8, 0, "work"),
    npc = makeCitizen("resident", 0, home.id);
  npc.workplace = work.id;
  const event = residentWishStep(npc, context([home, work]));
  assert.equal(event.kind, "created");
  assert.equal(npc.wish.cause, "commute");
  assert.equal(npc.wish.deadlineDay, 4);
  assert.ok(npc.wish.solutions.length >= 2);
});

test("改变布局可以解决愿望并留下长期正面记忆", () => {
  const home = b("house", 0, 0, "home"),
    work = b("farm", 8, 0, "work"),
    npc = makeCitizen("resident", 0, home.id);
  npc.workplace = work.id;
  residentWishStep(npc, context([home, work]));
  const moved = { ...work, x: 3 };
  assert.ok(wishResolved(npc.wish, npc, context([home, moved])));
  const event = residentWishStep(npc, context([home, moved], { tick: 1 }));
  assert.equal(event.kind, "resolved");
  assert.equal(npc.wish, undefined);
  assert.equal(npc.memories.at(-1).outcome, "resolved");
  assert.ok(memoryHappiness(npc) > 0);
  assert.ok(happinessFactors(npc, [home, moved], defs)["个人记忆"] > 0);
});

test("愿望过期只产生温和负面记忆，不会扣资源或制造死档", () => {
  const home = b("house", 0, 0, "home"),
    work = b("farm", 8, 0, "work"),
    npc = makeCitizen("resident", 0, home.id);
  npc.workplace = work.id;
  residentWishStep(npc, context([home, work]));
  const event = residentWishStep(
    npc,
    context([home, work], { day: 5, tick: 1 }),
  );
  assert.equal(event.kind, "missed");
  assert.equal(npc.memories.at(-1).outcome, "missed");
  assert.equal(memoryHappiness(npc), -0.75);
});

test("邻里愿望来自住宅周边布局，非焦点居民保持轻量模拟", () => {
  const home = b("house", 0, 0, "home"),
    npc = makeCitizen("resident", 0, home.id);
  assert.equal(wishCause(npc, context([home])), "neighbor");
  assert.equal(residentWishStep(npc, context([home], { focusIndex: 8 })), null);
  assert.equal(npc.wish, undefined);
});
