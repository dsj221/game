import test from "node:test";
import assert from "node:assert/strict";
import {
  computeProduction,
  connectedBuildings,
  canPlace,
  edgeTiles,
  expansionPrice,
} from "../src/systems/economy.ts";
import { initialTiles, initialBuildings } from "../src/data/initial.ts";
const b = (id, type, x, z) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  level: 1,
  rotation: 0,
  born: 0,
});
test("道路必须连接集市，孤立道路不生效", () => {
  const buildings = [
    b("m", "market", 0, 0),
    b("r", "road", 1, 0),
    b("f", "farm", 2, 0),
    b("or", "road", 5, 0),
    b("of", "farm", 6, 0),
  ];
  const c = connectedBuildings(buildings);
  assert.ok(c.includes("f"));
  assert.ok(!c.includes("of"));
});
test("无道路设施产量减半，连通后恢复", () => {
  const disconnected = computeProduction([b("f", "farm", 2, 0)], [], 480, 480);
  const linked = computeProduction(
    [b("m", "market", 0, 0), b("r", "road", 1, 0), b("f", "farm", 2, 0)],
    [],
    480,
    480,
  );
  assert.equal(disconnected.output.food, 1.5);
  assert.equal(linked.output.food, 3);
});
test("能源耗尽后机器停止，建设电源后恢复", () => {
  const machine = b("d", "drill", 0, 0);
  const off = computeProduction([machine], [], 0, 480);
  assert.deepEqual(off.offline, ["d"]);
  assert.equal(off.output.iron, 0);
  const on = computeProduction(
    [machine, b("g", "generator", 1, 0)],
    [],
    0,
    480,
  );
  assert.equal(on.offline.length, 0);
  assert.equal(on.energy, 14);
  assert.ok(on.output.iron > 0);
});
test("拒绝越界与重叠放置，搬迁允许忽略自身", () => {
  const tiles = [{ x: 0, z: 0, born: 0 }],
    buildings = [b("h", "house", 0, 0)];
  assert.equal(canPlace(2, 0, tiles, buildings), false);
  assert.equal(canPlace(0, 0, tiles, buildings), false);
  assert.equal(canPlace(0, 0, tiles, buildings, "h"), true);
  assert.equal(canPlace(1, 1, tiles, buildings), true);
});
test("扩张只提供不重复的相邻地块，费用随规模增加", () => {
  const edge = edgeTiles([
    { x: 0, z: 0, born: 0 },
    { x: 1, z: 0, born: 0 },
  ]);
  assert.equal(edge.length, 6);
  assert.ok(!edge.some(([x, z]) => x === 0 && z === 0));
  assert.ok(expansionPrice(21) > expansionPrice(20));
});
test("三个世界的初始建筑均在地块内，且没有占用重叠", () => {
  const tiles = initialTiles(),
    buildings = initialBuildings(),
    occupied = new Set();
  for (const b of buildings) {
    const k = `${b.world},${b.x},${b.z}`;
    assert.ok(!occupied.has(k), `重叠 ${k} ${b.type}`);
    occupied.add(k);
    assert.ok(canPlace(b.x, b.z, tiles[b.world], []), `越界 ${k}`);
  }
});
