import type { Tile } from "../types/index.ts";
export function landRegions(tiles: Tile[]) {
  const known = new Set(tiles.map((t) => `${t.x},${t.z}`));
  return [
    {
      id: "south",
      name: "南部林地",
      population: 6,
      level: 2,
      cost: 700,
      x1: -1,
      x2: 1,
      z1: 2,
      z2: 3,
    },
    {
      id: "east",
      name: "东岸草甸",
      population: 10,
      level: 2,
      cost: 1200,
      x1: 2,
      x2: 3,
      z1: -1,
      z2: 3,
    },
    {
      id: "north",
      name: "北山原野",
      population: 20,
      level: 3,
      cost: 2000,
      x1: -1,
      x2: 3,
      z1: -3,
      z2: -2,
    },
    {
      id: "west",
      name: "西部河谷",
      population: 30,
      level: 3,
      cost: 3000,
      x1: -3,
      x2: -2,
      z1: -3,
      z2: 3,
    },
  ].map((r) => ({
    ...r,
    tiles: Array.from(
      { length: (r.x2 - r.x1 + 1) * (r.z2 - r.z1 + 1) },
      (_, i) => ({
        x: r.x1 + (i % (r.x2 - r.x1 + 1)),
        z: r.z1 + Math.floor(i / (r.x2 - r.x1 + 1)),
        born: 0,
      }),
    ).filter((t) => !known.has(`${t.x},${t.z}`)),
  }));
}
