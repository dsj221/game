import type { Building, BuildingDefinition } from "../types/index.ts";
import { rotatedFootprint } from "../data/footprints.ts";
import { isRoad } from "../data/roads.ts";

export type SpatialReactionKind =
  "lanterns" | "hedge" | "arcade" | "stall" | "loading" | "channel" | "garden";

export interface SpatialReactionRule {
  id: string;
  name: string;
  description: string;
  a: string;
  b: string;
  kind: SpatialReactionKind;
  production?: number;
  happiness?: number;
  commerce?: number;
}

export interface SpatialReaction extends SpatialReactionRule {
  buildingA: string;
  buildingB: string;
  x: number;
  z: number;
  along: "x" | "z";
  length: number;
}

/**
 * The first matching rule wins. Specific production-chain reactions are kept
 * ahead of broad category reactions so every shared edge has one clear story.
 */
export const spatialReactionRules: readonly SpatialReactionRule[] = [
  {
    id: "grain-run",
    name: "风送谷道",
    description: "麦穗沿着短廊直达磨坊。",
    a: "farm",
    b: "windmill",
    kind: "channel",
    production: 0.12,
  },
  {
    id: "flour-arcade",
    name: "面粉连廊",
    description: "磨好的面粉不再绕路搬运。",
    a: "windmill",
    b: "bakery",
    kind: "arcade",
    production: 0.12,
  },
  {
    id: "oven-window",
    name: "出炉窗口",
    description: "面包从烤炉一侧直接摆上店铺窗口。",
    a: "bakery",
    b: "breadshop",
    kind: "stall",
    production: 0.08,
    commerce: 4,
  },
  {
    id: "timber-rack",
    name: "木作料架",
    description: "原木与木作台共享一座晾料架。",
    a: "lumber",
    b: "carpenter",
    kind: "loading",
    production: 0.12,
  },
  {
    id: "makers-gallery",
    name: "手作展廊",
    description: "新做好的物件成为集市的沿街陈列。",
    a: "carpenter",
    b: "market",
    kind: "stall",
    production: 0.08,
    commerce: 4,
  },
  {
    id: "pottery-gallery",
    name: "陶艺摊架",
    description: "窑火旁的作品在集市边自然成摊。",
    a: "pottery",
    b: "market",
    kind: "stall",
    production: 0.08,
    commerce: 4,
  },
  {
    id: "irrigation-edge",
    name: "田边引水渠",
    description: "水源沿田埂接入作物区。",
    a: "agriculture",
    b: "water",
    kind: "channel",
  },
  {
    id: "field-edge",
    name: "共用田埂",
    description: "相邻田地共用水渠与收获小径。",
    a: "agriculture",
    b: "agriculture",
    kind: "channel",
    production: 0.05,
  },
  {
    id: "loading-dock",
    name: "装卸月台",
    description: "生产设施与仓库共享装卸边界。",
    a: "production",
    b: "warehouse",
    kind: "loading",
    production: 0.1,
  },
  {
    id: "shared-yard",
    name: "共享小院",
    description: "两户人家打开围栏，共用一方小院。",
    a: "residential",
    b: "residential",
    kind: "garden",
    happiness: 1.5,
  },
  {
    id: "garden-edge",
    name: "邻里树篱",
    description: "住宅与绿地之间长出柔和的花篱。",
    a: "residential",
    b: "green",
    kind: "hedge",
    happiness: 1.5,
  },
  {
    id: "care-porch",
    name: "社区门廊",
    description: "家门与公共服务之间形成有顶步道。",
    a: "residential",
    b: "community",
    kind: "arcade",
    happiness: 1,
  },
  {
    id: "corner-terrace",
    name: "街角露台",
    description: "店铺把座位与招牌延伸到绿地边。",
    a: "commercial",
    b: "green",
    kind: "stall",
    commerce: 3,
    happiness: 0.5,
  },
  {
    id: "shopfront",
    name: "临街摊位",
    description: "正对街道的边界自动打开成小摊。",
    a: "commercial",
    b: "road",
    kind: "stall",
    commerce: 3,
  },
  {
    id: "wayfinding",
    name: "街区导览牌",
    description: "公共设施在临街边界生成导览入口。",
    a: "public",
    b: "road",
    kind: "arcade",
    happiness: 0.5,
  },
  {
    id: "lantern-link",
    name: "连店灯彩",
    description: "相邻店铺之间挂起一串街灯。",
    a: "commercial",
    b: "commercial",
    kind: "lanterns",
    commerce: 2,
  },
] as const;

const agriculture = new Set([
  "farm",
  "orchard",
  "icon_carrot_patch",
  "icon_greenhouse",
]);
const water = new Set([
  "icon_stone_well",
  "icon_water_tower",
  "icon_water_shrine_tower",
  "icon_crystal_pool",
]);
const green = new Set([
  "park",
  "tree",
  "flowerbed",
  "orchard",
  "icon_flower_planter",
  "icon_vine_pergola",
  "icon_birdhouse",
  "icon_crystal_pool",
]);
const community = new Set([
  "clinic",
  "school",
  "library",
  "park",
  "icon_shrine",
  "icon_gazebo",
  "icon_central_fountain",
]);

function hasTag(
  building: Building,
  tag: string,
  defs: Record<string, BuildingDefinition>,
) {
  if (building.type === tag) return true;
  const category = defs[building.type]?.town?.category;
  if (tag === "road") return isRoad(building.type);
  if (tag === "residential") return category === "住宅";
  if (tag === "commercial") return category === "商业";
  if (tag === "production") return category === "生产";
  if (tag === "public") return category === "公共";
  if (tag === "warehouse")
    return building.type === "warehouse" || building.type === "icon_hay_shed";
  if (tag === "agriculture") return agriculture.has(building.type);
  if (tag === "water") return water.has(building.type);
  if (tag === "green") return green.has(building.type);
  if (tag === "community") return community.has(building.type);
  return false;
}

function matchRule(
  a: Building,
  b: Building,
  defs: Record<string, BuildingDefinition>,
) {
  return spatialReactionRules.find(
    (rule) =>
      (hasTag(a, rule.a, defs) && hasTag(b, rule.b, defs)) ||
      (hasTag(a, rule.b, defs) && hasTag(b, rule.a, defs)),
  );
}

function sharedEdge(a: Building, b: Building) {
  const [aw, ad] = rotatedFootprint(a.footprint, a.rotation),
    [bw, bd] = rotatedFootprint(b.footprint, b.rotation),
    aRight = a.x + aw - 1,
    bRight = b.x + bw - 1,
    aBottom = a.z + ad - 1,
    bBottom = b.z + bd - 1;
  if (aRight + 1 === b.x || bRight + 1 === a.x) {
    const start = Math.max(a.z, b.z),
      end = Math.min(aBottom, bBottom);
    if (start <= end)
      return {
        x: aRight + 1 === b.x ? aRight + 0.5 : bRight + 0.5,
        z: (start + end) / 2,
        along: "z" as const,
        length: end - start + 1,
      };
  }
  if (aBottom + 1 === b.z || bBottom + 1 === a.z) {
    const start = Math.max(a.x, b.x),
      end = Math.min(aRight, bRight);
    if (start <= end)
      return {
        x: (start + end) / 2,
        z: aBottom + 1 === b.z ? aBottom + 0.5 : bBottom + 0.5,
        along: "x" as const,
        length: end - start + 1,
      };
  }
  return null;
}

export function spatialReactions(
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
): SpatialReaction[] {
  const result: SpatialReaction[] = [];
  for (let i = 0; i < buildings.length; i++) {
    const a = buildings[i];
    if (a.paused) continue;
    for (let j = i + 1; j < buildings.length; j++) {
      const b = buildings[j];
      if (b.paused || a.world !== b.world) continue;
      const edge = sharedEdge(a, b);
      if (!edge) continue;
      const rule = matchRule(a, b, defs);
      if (!rule) continue;
      result.push({ ...rule, buildingA: a.id, buildingB: b.id, ...edge });
    }
  }
  return result;
}

export function reactionsForBuilding(
  building: Building,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
) {
  if (building.paused) return [];
  const result: SpatialReaction[] = [];
  for (const other of buildings) {
    if (
      other.id === building.id ||
      other.paused ||
      other.world !== building.world
    )
      continue;
    const edge = sharedEdge(building, other);
    if (!edge) continue;
    const rule = matchRule(building, other, defs);
    if (rule)
      result.push({
        ...rule,
        buildingA: building.id,
        buildingB: other.id,
        ...edge,
      });
  }
  return result;
}

export function spatialEffectsForBuilding(
  building: Building,
  buildings: Building[],
  defs: Record<string, BuildingDefinition>,
) {
  const reactions = reactionsForBuilding(building, buildings, defs);
  return {
    reactions,
    // Caps keep dense blocks helpful without turning adjacency into a mandatory exploit.
    efficiency: Math.min(
      0.2,
      reactions.reduce((sum, reaction) => sum + (reaction.production || 0), 0),
    ),
    happiness: Math.min(
      4,
      reactions.reduce((sum, reaction) => sum + (reaction.happiness || 0), 0),
    ),
    customers: Math.min(
      12,
      reactions.reduce((sum, reaction) => sum + (reaction.commerce || 0), 0),
    ),
  };
}
