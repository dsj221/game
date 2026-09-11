import type { Building, Tile } from "../types/index.ts";
import { buildingCells } from "../data/footprints.ts";
import {isRoad,roadStyles} from '../data/roads.ts';
export type Point = { x: number; z: number };
const key = (p: Point) => `${p.x},${p.z}`;
const steps = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const grids = new WeakMap<Tile[], WeakMap<Building[], Map<string, number>>>();
export function navigationGrid(tiles: Tile[], buildings: Building[]) {
  const cached = grids.get(tiles)?.get(buildings);
  if (cached) return cached;
  const grid = new Map<string, number>();
  for (const t of tiles)
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++)
        grid.set(`${t.x * 3 + x},${t.z * 3 + z}`, 2.5);
  for (const b of buildings)
    for (const c of buildingCells(b)) {
      if (isRoad(b.type))
        grid.set(key(c), roadStyles[b.type]?.weight??1);
      else grid.delete(key(c));
    }
  if (!grids.has(tiles)) grids.set(tiles, new WeakMap());
  grids.get(tiles)!.set(buildings, grid);
  return grid;
}
export function entrances(b: Building, grid: Map<string, number>) {
  const result = new Map<string, Point>();
  for (const c of buildingCells(b))
    for (const [dx, dz] of steps) {
      const p = { x: c.x + dx, z: c.z + dz };
      if (grid.has(key(p))) result.set(key(p), p);
    }
  return [...result.values()];
}
/** Weighted Dijkstra; routes are computed only when destinations or topology change. */
export function findRoute(
  start: Point,
  goals: Point[],
  grid: Map<string, number>,
): Point[] | null {
  const goal = new Set(goals.map(key)),
    first = key(start);
  if (!grid.has(first) || !goal.size) return null;
  const open = [first],
    cost = new Map([[first, 0]]),
    previous = new Map<string, string>();
  while (open.length) {
    open.sort((a, b) => cost.get(a)! - cost.get(b)!);
    const at = open.shift()!;
    if (goal.has(at)) {
      const path: Point[] = [];
      let k = at;
      while (k !== first) {
        const [x, z] = k.split(",").map(Number);
        path.unshift({ x, z });
        k = previous.get(k)!;
      }
      return path;
    }
    const [x, z] = at.split(",").map(Number);
    for (const [dx, dz] of steps) {
      const next = `${x + dx},${z + dz}`,
        weight = grid.get(next);
      if (!weight) continue;
      const value = cost.get(at)! + weight;
      if (value < (cost.get(next) ?? Infinity)) {
        cost.set(next, value);
        previous.set(next, at);
        if (!open.includes(next)) open.push(next);
      }
    }
  }
  return null;
}
