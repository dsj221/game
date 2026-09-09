import type { Building, BuildingDefinition, Npc } from "../types/index.ts";
import { buildingCells } from "../data/footprints.ts";
export const influenceRules: Record<
  string,
  {
    radius: number;
    happiness?: number;
    noise?: number;
    health?: boolean;
    commerce?: boolean;
    logistics?: boolean;
  }
> = {
  park: { radius: 3, happiness: 5 },
  bench: { radius: 2, happiness: 2 },
  flowerbed: { radius: 2, happiness: 1 },
  clinic: { radius: 4, health: true },
  school: { radius: 4, happiness: 3 },
  shop: { radius: 5, commerce: true },
  breadshop: { radius: 5, commerce: true },
  market: { radius: 6, commerce: true },
  cafe: { radius: 5, commerce: true },
  lumber: { radius: 2, noise: 3 },
  bakery: { radius: 2, noise: 2 },
  furnace: { radius: 3, noise: 5 },
  mine: { radius: 3, noise: 5 },
  carpenter: { radius: 2, noise: 3 },
  warehouse: { radius: 3, logistics: true },
};
export function buildingDistance(a: Building, b: Building) {
  let distance = Infinity;
  for (const x of buildingCells(a))
    for (const y of buildingCells(b))
      distance = Math.min(distance, Math.abs(x.x - y.x) + Math.abs(x.z - y.z));
  return distance;
}
export function influenceFor(
  building: Building,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
) {
  const radius = influenceRules[building.type]?.radius ?? 3;
  const nearby: Record<string, number> = {};
  let happiness = 0,
    efficiency = 1,
    customers = 0,
    health = false,
    commerce = false,
    road = false;
  for (const other of buildings) {
    if (
      other.id === building.id ||
      other.world !== building.world ||
      other.paused
    )
      continue;
    const distance = buildingDistance(building, other),
      rule = influenceRules[other.type];
    if (distance <= radius) {
      nearby[other.type] = (nearby[other.type] || 0) + 1;
      customers += (defs[other.type]?.town?.capacity || 0) * other.level * 2;
    }
    if (["road", "bridge"].includes(other.type) && distance <= 1) road = true;
    if (rule && distance <= rule.radius) {
      let multiplier = 1;
      if (other.type === "park") {
        if (
          buildings.some(
            (b) =>
              b.world === other.world &&
              !b.paused &&
              influenceRules[b.type]?.noise &&
              buildingDistance(b, other) <= 3,
          )
        )
          multiplier *= 0.7;
        if (
          buildings.some(
            (b) =>
              b.world === other.world &&
              ["icon_crystal_pool", "icon_central_fountain"].includes(b.type) &&
              buildingDistance(b, other) <= 3,
          )
        )
          multiplier *= 1.1;
      }
      happiness += (rule.happiness || 0) * multiplier - (rule.noise || 0);
      health ||= !!rule.health;
      commerce ||= !!rule.commerce;
      if (rule.logistics) efficiency = 1.15;
    }
  }
  if (road) efficiency += 0.1;
  return {
    radius,
    nearby,
    happiness,
    efficiency,
    customers,
    health,
    commerce,
    road,
  };
}
export function happinessFactors(
  n: Npc,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
) {
  const home = buildings.find((b) => b.id === n.home),
    work = buildings.find((b) => b.id === n.workplace);
  const inf = home ? influenceFor(home, buildings, defs) : null;
  const distance = home && work ? buildingDistance(home, work) : 0;
  return {
    基础: 55,
    住房: home ? 15 : -15,
    就业: work ? 12 : -14,
    食品: 10 - Math.max(0, (n.needs?.food || 0) - 30) * 0.5,
    商业: inf?.commerce ? 5 : -3,
    休闲: -(n.needs?.fun || 0) * 0.09,
    医疗: (n.health || 90) < 60 ? -12 : inf?.health ? 3 : 0,
    环境: inf?.happiness || 0,
    通勤: distance > 15 ? -12 : distance > 10 ? -8 : distance > 5 ? -4 : 0,
  };
}
