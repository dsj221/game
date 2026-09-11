import type { Building } from "../types/index.ts";

export const footprintSizes: Record<string, [number, number]> = {
  orchard:[2,2],tea_house:[2,2],library:[2,2],pottery:[2,2],
  residence:[2,2], apartment:[2,2], market:[3,2], studio:[2,2],
  farm:[2,2], lumber:[2,2], windmill:[2,2], mine:[3,2],
  furnace:[2,1], slime:[2,2], drill:[2,2], generator:[2,1],
  warehouse:[2,2], bakery:[2,1], carpenter:[2,2], cafe:[2,1],
  park:[3,3], clinic:[2,2], school:[3,2], portal:[2,1], endportal:[2,1],
  icon_greenhouse:[2,2], icon_water_tower:[2,2], icon_village_gate:[2,1],
  icon_camp_tent:[2,1], icon_central_fountain:[2,2], icon_gazebo:[2,2],
  icon_hay_shed:[2,1], icon_carrot_patch:[2,2], icon_clay_kiln:[2,1],
  icon_tool_shop:[2,1], icon_water_shrine_tower:[2,2], icon_crystal_pool:[2,2],
};
export const plannedFootprint = (type:string):[number,number] => footprintSizes[type] ?? [1,1];
// Missing footprint means a legacy, one-cell building. Never silently enlarge saved towns.
export function rotatedFootprint(size: [number,number] = [1,1], rotation=0):[number,number] {
  return rotation%2 ? [size[1],size[0]] : size;
}
export function buildingCells(b: Pick<Building,'x'|'z'|'rotation'|'footprint'>) {
  const [w,h]=rotatedFootprint(b.footprint,b.rotation);
  return Array.from({length:w*h},(_,i)=>({x:b.x+i%w,z:b.z+Math.floor(i/w)}));
}
