import type { Building, Tile, Bag, Npc } from "../types/index.ts";
import { defs } from "../data/definitions.ts";
import { buildingCells } from "../data/footprints.ts";
export {isRoad as roadType} from '../data/roads.ts';
import {isRoad as roadType} from '../data/roads.ts';
export const key = (x: number, z: number) => `${x},${z}`;
export const onLand = (x: number, z: number, tiles: Tile[]) =>
  tiles.some((t) => Math.abs(x - t.x * 3) <= 1 && Math.abs(z - t.z * 3) <= 1);
export function canPlace(
  x: number,
  z: number,
  tiles: Tile[],
  buildings: Building[],
  ignore?: string,
  size: [number,number] = [1,1],
  rotation = 0,
) {
  const cells=buildingCells({x,z,rotation,footprint:size});
  const occupied=new Set(buildings.filter(b=>b.id!==ignore).flatMap(b=>buildingCells(b).map(p=>key(p.x,p.z))));
  return (
    Number.isInteger(x) &&
    Number.isInteger(z) &&
    cells.every(p=>onLand(p.x,p.z,tiles)&&!occupied.has(key(p.x,p.z)))
  );
}
export function edgeTiles(tiles: Tile[]) {
  const known = new Set(tiles.map((t) => key(t.x, t.z)));
  const result = new Map<string, [number, number]>();
  for (const t of tiles)
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = t.x + dx,
        z = t.z + dz;
      if (!known.has(key(x, z))) result.set(key(x, z), [x, z]);
    }
  return [...result.values()];
}
export function connectedBuildings(buildings: Building[]) {
  buildings = buildings.filter(b=>!b.paused);
  const roads = new Map(
    buildings.filter((b) => roadType(b.type)).map((b) => [key(b.x, b.z), b]),
  );
  const queue: string[] = [];
  const visited = new Set<string>();
  for (const b of buildings.filter(
    (b) => b.type === "market" || b.type === "warehouse",
  ))
    for (const cell of buildingCells(b)) for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = key(cell.x + dx, cell.z + dz);
      if (roads.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push(k);
      }
    }
  for (let i = 0; i < queue.length; i++) {
    const r = roads.get(queue[i])!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = key(r.x + dx, r.z + dz);
      if (roads.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push(k);
      }
    }
  }
  return buildings
    .filter(
      (b) =>
        visited.has(key(b.x, b.z)) ||
        b.type === "market" ||
        b.type === "warehouse" ||
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dz]) => buildingCells(b).some(p=>visited.has(key(p.x + dx, p.z + dz)))),
    )
    .map((b) => b.id);
}
export function computeProduction(
  buildings: Building[],
  npcs: Npc[],
  energy: number,
  maxEnergy: number,
) {
  const connected = ['overworld','nether','end'].flatMap(world => connectedBuildings(buildings.filter(b=>b.world===world && !b.paused)));
  const linked = new Set(connected);
  const helper = Math.min(
    0.25,
    npcs.filter((n) => n.modelType !== "villager").length * 0.025,
  );
  let generation = 0,
    consumption = 0,
    income = 0;
  const output: Bag = { wood: 0, stone: 0, iron: 0, redstone: 0, food: 0,wheat:0,flour:0,bread:0,furniture:0 };
  const offline: string[] = [];
  for (const b of buildings) if (!b.paused) generation += defs[b.type].power * b.level;
  let available = Math.min(maxEnergy, energy + generation);
  for (const b of buildings) {
    if (b.paused) continue;
    const d = defs[b.type],
      cost = d.energyCost * b.level;
    consumption += cost;
    if (cost > available) {
      offline.push(b.id);
      continue;
    }
    available -= cost;
    const efficiency = (linked.has(b.id) ? 1 : 0.5) * (1 + helper) * b.level;
    income += d.incomePerSecond * efficiency;
    for (const [r, v] of Object.entries(d.production))
      output[r as keyof Bag] += v * efficiency;
  }
  return {
    income,
    output,
    energy: available,
    generation,
    consumption,
    offline,
    connected,
  };
}
export const upgradePrice = (b: Building) =>
  Math.round(defs[b.type].upgradeCost * Math.pow(1.65, b.level - 1));
export const expansionPrice = (count: number) =>
    Math.round(300 * Math.pow(1.16, Math.max(0, count - 9)));
export const expansionTotal = (count: number, amount: number) =>
  Array.from({ length: amount }, (_, i) => expansionPrice(count + i)).reduce((a, b) => a + b, 0);
