import manifest from "../../public/assets/building-icons/manifest.json" with { type: "json" };

// Keep the complete supplied collection available, including future facilities.
export const buildingIconCatalog = manifest.icons;
const iconsByKey = new Map(buildingIconCatalog.map((icon) => [icon.key, icon]));

// Use definition IDs: several different businesses share the same 3D model.
export const buildingIconKeys: Record<string, string> = {
  house: "thatched_cottage",
  residence: "thatched_cottage",
  shop: "market_stall",
  breadshop: "workshop_stall",
  cafe: "market_pavilion",
  market: "market_pavilion",
  mine: "mine_entrance",
  furnace: "blacksmith_forge",
  slime: "steam_machine",
  drill: "wooden_crane",
  generator: "steam_machine",
  windmill: "windmill",
  farm: "vegetable_garden",
  lumber: "log_pile",
  carpenter: "carpenter_workbench",
  bakery: "wood_fired_oven",
  portal: "magic_portal",
  endportal: "magic_portal",
  core: "crystal_obelisk",
  obsidian: "crystal_obelisk",
  lamp: "lantern_post",
  torch: "lantern_post",
  bridge: "arched_bridge",
  warehouse: "crate",
  park: "vine_pergola",
  flowerbed: "flower_planter",
  clock: "water_tower",
  studio: "tool_shop",
  apartment: "camp_tent",
  clinic: "shrine",
  school: "gazebo",
};

for (const icon of buildingIconCatalog) buildingIconKeys[`icon_${icon.key}`] = icon.key;

export function getBuildingIcon(type: string, size: 256 | 512 = 256) {
  if (type === "scenery_lake") return `${import.meta.env.BASE_URL}assets/building-icons/meadow-pond.png`;
  if (type === "scenery_grass") return `${import.meta.env.BASE_URL}assets/building-icons/meadow-grass.png`;
  if (type === "bench") return `${import.meta.env.BASE_URL}assets/building-icons/park-bench.png`;
  if (type === "road") return `${import.meta.env.BASE_URL}assets/building-icons/stone-road.png`;
  if (type === "tree") return `${import.meta.env.BASE_URL}assets/building-icons/square-crown-tree.png`;
  const icon = iconsByKey.get(buildingIconKeys[type] ?? type);
  return icon
    ? `${import.meta.env.BASE_URL}assets/building-icons/${size === 512 ? icon.file_512 : icon.file_256}`
    : undefined;
}

const viewNames = ["front_left", "front_right", "back_right", "back_left"];
const viewPrefixes: Record<string, string> = { tree: "tree", bench: "park_bench", road: "stone_road" };
export function getBuildingView(type: string, rotation = 0) {
  const prefix = viewPrefixes[type];
  return prefix ? `${import.meta.env.BASE_URL}assets/building-views/${prefix}_${viewNames[((rotation % 4) + 4) % 4]}.png` : undefined;
}
