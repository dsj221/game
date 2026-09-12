import test from "node:test";
import assert from "node:assert/strict";
import { defs } from "../src/data/definitions.ts";
import {
  spatialReactions,
  reactionsForBuilding,
  spatialEffectsForBuilding,
  spatialReactionRules,
} from "../src/systems/spatialReactions.ts";

const b = (type, x, z, id = type, more = {}) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
  footprint: defs[type].size,
  ...more,
});

test("块间反应表包含高频空间组合且ID唯一", () => {
  assert.ok(spatialReactionRules.length >= 12);
  assert.equal(
    new Set(spatialReactionRules.map((rule) => rule.id)).size,
    spatialReactionRules.length,
  );
});

test("相邻生产链形成可见边界，距离、世界与暂停状态会阻断", () => {
  const farm = b("farm", 0, 0, "farm"),
    mill = b("windmill", 2, 0, "mill");
  const reactions = spatialReactions([farm, mill], defs);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].id, "grain-run");
  assert.equal(reactions[0].length, 2);
  assert.equal(reactions[0].along, "z");
  assert.equal(spatialReactions([farm, { ...mill, x: 3 }], defs).length, 0);
  assert.equal(
    spatialReactions([farm, { ...mill, world: "nether" }], defs).length,
    0,
  );
  assert.equal(
    spatialReactions([farm, { ...mill, paused: true }], defs).length,
    0,
  );
});

test("专属供应链规则优先于通用生产规则", () => {
  const bakery = b("bakery", 0, 0, "bakery"),
    shop = b("breadshop", 0, 1, "shop");
  const reaction = spatialReactions([bakery, shop], defs)[0];
  assert.equal(reaction.id, "oven-window");
  assert.equal(reaction.commerce, 4);
});

test("住宅、绿地、临街商业获得封顶且可解释的实际加成", () => {
  const home = b("house", 0, 0, "home", { footprint: [1, 1] });
  const tree = b("tree", 1, 0, "tree", { footprint: [1, 1] });
  const shop = b("shop", 0, 2, "shop", { footprint: [1, 1] });
  const road = b("road", 1, 2, "road", { footprint: [1, 1] });
  const all = [home, tree, shop, road];
  assert.equal(reactionsForBuilding(home, all, defs)[0].id, "garden-edge");
  assert.equal(spatialEffectsForBuilding(home, all, defs).happiness, 1.5);
  assert.equal(spatialEffectsForBuilding(shop, all, defs).customers, 3);
});

test("旋转后的长占地仍按真实共享边界计算", () => {
  const bakery = b("bakery", 0, 0, "bakery", { rotation: 1 });
  const shop = b("breadshop", 1, 0, "shop", { footprint: [1, 1] });
  const reaction = spatialReactions([bakery, shop], defs)[0];
  assert.equal(reaction.id, "oven-window");
  assert.equal(reaction.along, "z");
});
