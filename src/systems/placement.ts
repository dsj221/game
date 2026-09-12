import { waterSiteReason } from './hydrology.ts';
import type { Building, Bag, Tile, Npc } from "../types/index.ts";
import { defs, resourceNames } from "../data/definitions.ts";
import { buildingCells } from "../data/footprints.ts";
import { onLand } from "./economy.ts";
import { influenceFor, buildingDistance } from "./buildingInfluence.ts";
import { reactionsForBuilding } from "./spatialReactions.ts";
export function placementReport(
  b: Building,
  buildings: Building[],
  tiles: Tile[],
  npcs: Npc[],
  bag: Bag,
  currency: number,
  level: number,
  moving = false,
) {
  const local = buildings.filter((x) => x.world === b.world && x.id !== b.id),
    d = defs[b.type],
    all = [...local, b];
  const cells = buildingCells(b),
    occupied = new Set(
      local.flatMap((x) => buildingCells(x).map((p) => `${p.x},${p.z}`)),
    );
  const reasons: string[] = [];
  const waterReason = waterSiteReason(b.type,b.x,b.z,tiles,b.footprint,b.rotation);
  if(waterReason) reasons.push(waterReason);
  if (cells.some((p) => !onLand(p.x, p.z, tiles))) reasons.push("地块未解锁");
  if (cells.some((p) => occupied.has(`${p.x},${p.z}`)))
    reasons.push("土地已占用");
  if (!moving) {
    if (currency < d.cost) reasons.push("金币不足");
    if (level < (d.town?.unlock || 1))
      reasons.push(`需要 Lv.${d.town?.unlock}`);
    for (const [r, n] of Object.entries(d.materials || {}))
      if (bag[r as keyof Bag] < n)
        reasons.push(`缺少${resourceNames[r as keyof Bag]}`);
  }
  const influence = influenceFor(b, all, defs);
  const residents = npcs.filter(
    (n) =>
      n.world === b.world &&
      local.some(
        (h) => h.id === n.home && buildingDistance(b, h) <= influence.radius,
      ),
  );
  let happiness = 0;
  for (const n of residents) {
    const h = local.find((x) => x.id === n.home)!;
    happiness +=
      influenceFor(h, all, defs).happiness -
      influenceFor(h, local, defs).happiness;
  }
  const customers = d.town?.sells
    ? residents.length * 2 * (influence.road ? 1 : 0.5)
    : 0;
  return {
    reasons,
    influence,
    residents: residents.length,
    happiness,
    customers,
    upkeep: d.town?.upkeep || 0,
    wages: (d.town?.jobs || 0) * (d.town?.wage || 0),
    revenue: customers * (d.town?.price || 0),
    reactions: reactionsForBuilding(b, all, defs),
  };
}
