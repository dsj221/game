import { RIVER_X } from '../systems/hydrology.ts';
import type { Building, Tile } from "../types/index.ts";
import { buildingCells } from "../data/footprints.ts";

export function sceneryNoise(x: number, z: number, salt: number) {
  let n = Math.imul(x + salt * 31, 374761393) ^ Math.imul(z - salt * 17, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function sceneryLayout(tiles: Tile[], buildings: Building[]) {
  const occupied = new Set(buildings.flatMap(b => buildingCells(b).map(p=>`${p.x},${p.z}`)));
  const lakes: {x:number; z:number}[] = [], grass: {x:number; z:number}[] = [];
  // Each land tile owns its candidate: expansion and construction cannot reroll neighbors.
  for (const tile of tiles) {
    const starterPond = tile.x === 1 && tile.z === 1;
    const lake = starterPond || sceneryNoise(tile.x,tile.z,7) < .28;
    const lakeCell = starterPond ? 4 : Math.min(8, Math.floor(sceneryNoise(tile.x,tile.z,19)*9));
    for (let i=0;i<9;i++) {
      const x=tile.x*3+i%3-1, z=tile.z*3+Math.floor(i/3)-1;
      if (x === RIVER_X || occupied.has(`${x},${z}`)) continue;
      if (lake && i===lakeCell) lakes.push({x,z});
      else if (sceneryNoise(x,z,13)<.34) grass.push({x,z});
    }
  }
  return {lakes,grass};
}
