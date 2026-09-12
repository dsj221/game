import type { Building, BuildingDefinition, Npc } from "../types/index.ts";
import { rotatedFootprint } from "../data/footprints.ts";
import { isRoad } from "../data/roads.ts";
import { spatialEffectsForBuilding } from "./spatialReactions.ts";
export const influenceRules: Record<
  string,
  {
    radius: number;
    happiness?: number;
    noise?: number;
    health?: boolean;
    commerce?: boolean;
    logistics?: boolean;
    irrigation?: boolean;
    leisure?: boolean;
  }
> = {
  park: { radius: 3, happiness: 8, leisure: true },
  tree: { radius: 2, happiness: 0.5 },
  lamp: { radius: 2, happiness: 1 },
  clock: { radius: 4, happiness: 5 },
  obsidian: { radius: 3, logistics: true },
  icon_workshop_stall: { radius: 2, noise: 1 },
  icon_clay_kiln: { radius: 3, noise: 3 },
  icon_stone_well: { radius: 3, irrigation: true },
  icon_water_tower: { radius: 5, irrigation: true },
  icon_water_shrine_tower: { radius: 6, irrigation: true },
  icon_hay_shed: { radius: 3, logistics: true },
  icon_signpost: { radius: 2, happiness: 1 },
  icon_village_gate: { radius: 4, happiness: 3 },
  icon_shrine: { radius: 3, happiness: 3, leisure: true },
  icon_gazebo: { radius: 3, happiness: 3, leisure: true },
  icon_central_fountain: { radius: 4, happiness: 4, leisure: true },
  icon_tool_shop: { radius: 5, commerce: true },
  icon_birdhouse: { radius: 2, happiness: 1 },
  icon_crystal_pool: { radius: 4, happiness: 4, leisure: true },
  library: { radius: 4, happiness: 3 },
  tea_house: { radius: 4, happiness: 2, commerce: true },
  orchard: { radius: 2, happiness: 1 },
  pottery: { radius: 2, noise: 2 },
  bench: { radius: 2, happiness: 2 },
  flowerbed: { radius: 2, happiness: 1 },
  clinic: { radius: 4, health: true, happiness: 3 },
  school: { radius: 4, happiness: 8 },
  shop: { radius: 5, commerce: true },
  breadshop: { radius: 5, commerce: true },
  market: { radius: 6, commerce: true },
  cafe: { radius: 5, commerce: true, happiness: 3 },
  lumber: { radius: 2, noise: 3 },
  bakery: { radius: 2, noise: 2 },
  furnace: { radius: 3, noise: 5 },
  mine: { radius: 3, noise: 5 },
  carpenter: { radius: 2, noise: 3 },
  warehouse: { radius: 3, logistics: true },
};
export function buildingDistance(a: Building, b: Building) {
  const [aw, ad] = rotatedFootprint(a.footprint, a.rotation),
    [bw, bd] = rotatedFootprint(b.footprint, b.rotation),
    aRight = a.x + aw - 1,
    bRight = b.x + bw - 1,
    aBottom = a.z + ad - 1,
    bBottom = b.z + bd - 1,
    dx = Math.max(0, a.x - bRight, b.x - aRight),
    dz = Math.max(0, a.z - bBottom, b.z - aBottom);
  return dx + dz;
}
export function operationalIds(
  buildings: Building[],
  npcs: Npc[],
  defs: Record<string, BuildingDefinition>,
  offline: readonly string[] = [],
  requireArrival = true,
) {
  const unavailable = new Set(offline);
  return new Set(
    buildings
      .filter(
        (b) =>
          !b.paused &&
          !unavailable.has(b.id) &&
          (!defs[b.type]?.town?.jobs ||
            npcs.some(
              (n) =>
                n.modelType === "villager" &&
                n.workplace === b.id &&
                (!requireArrival || n.arrivedAt === b.id),
            )),
      )
      .map((b) => b.id),
  );
}
export function influenceFor(
  building: Building,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
  activeIds?: ReadonlySet<string>,
) {
  const radius = influenceRules[building.type]?.radius ?? 3;
  const nearby: Record<string, number> = {};
  let happiness = 0,
    efficiency = 1,
    customers = 0,
    health = false,
    commerce = false,
    road = false,
    irrigation = false;
  for (const other of buildings) {
    if (
      other.id === building.id ||
      other.world !== building.world ||
      other.paused ||
      (activeIds && !activeIds.has(other.id))
    )
      continue;
    const distance = buildingDistance(building, other),
      rule = influenceRules[other.type];
    if (distance <= radius) {
      nearby[other.type] = (nearby[other.type] || 0) + 1;
      customers += (defs[other.type]?.town?.capacity || 0) * other.level * 2;
    }
    if (isRoad(other.type) && distance <= 1) road = true;
    if (rule && distance <= rule.radius) {
      let multiplier = 1;
      if (other.type === "park") {
        if (
          buildings.some(
            (b) =>
              b.world === other.world &&
              !b.paused &&
              (!activeIds || activeIds.has(b.id)) &&
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
              !b.paused &&
              (!activeIds || activeIds.has(b.id)) &&
              buildingDistance(b, other) <= 3,
          )
        )
          multiplier *= 1.1;
      }
      happiness += (rule.happiness || 0) * multiplier - (rule.noise || 0);
      health ||= !!rule.health;
      commerce ||= !!rule.commerce;
      if (rule.logistics) efficiency = 1.15;
      if (rule.irrigation) irrigation = true;
    }
  }
  const reactionBuildings = activeIds
    ? [
        building,
        ...buildings.filter(
          (other) => other.id !== building.id && activeIds.has(other.id),
        ),
      ]
    : buildings;
  const blockEffects = spatialEffectsForBuilding(
    building,
    reactionBuildings,
    defs,
  );
  happiness += blockEffects.happiness;
  efficiency += blockEffects.efficiency;
  customers += blockEffects.customers;
  if (road) efficiency += 0.1;
  if (
    irrigation &&
    ["farm", "orchard", "icon_carrot_patch", "icon_greenhouse"].includes(
      building.type,
    )
  )
    efficiency += 0.15;
  return {
    radius,
    nearby,
    happiness,
    efficiency,
    customers,
    health,
    commerce,
    road,
    irrigation,
    blockEffects,
  };
}
export function happinessFactors(
  n: Npc,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
  activeIds?: ReadonlySet<string>,
  developmentHappiness = 0,
  cached?: {
    home?: Building;
    work?: Building;
    influence?: { happiness: number; commerce: boolean; health: boolean };
  },
) {
  const home = cached ? cached.home : buildings.find((b) => b.id === n.home),
    work = cached ? cached.work : buildings.find((b) => b.id === n.workplace);
  const inf =
    cached?.influence ??
    (home ? influenceFor(home, buildings, defs, activeIds) : null);
  const distance = home && work ? buildingDistance(home, work) : 0;
  return {
    基础: 55,
    发展与方针: developmentHappiness,
    住房: home ? 15 : -15,
    就业: work ? 12 : -14,
    食品: 10 - Math.max(0, (n.needs?.food || 0) - 30) * 0.5,
    商业: inf?.commerce ? 5 : -3,
    休闲: -(n.needs?.fun || 0) * 0.09,
    医疗: (n.health ?? 90) < 60 ? -12 : inf?.health ? 3 : 0,
    环境: inf?.happiness || 0,
    个人记忆: Math.max(
      -3,
      Math.min(
        4,
        (n.memories || []).reduce((sum, memory) => sum + memory.happiness, 0),
      ),
    ),
    通勤: distance > 15 ? -12 : distance > 10 ? -8 : distance > 5 ? -4 : 0,
  };
}
