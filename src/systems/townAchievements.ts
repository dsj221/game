import type { Building, BuildingDefinition } from "../types/index.ts";
import type { TownState } from "../types/town.ts";
import { spatialReactions } from "./spatialReactions.ts";

/**
 * Achievements describe the current town fantasy: planning a good block,
 * running a healthy economy and improving residents' lives. Legacy save IDs
 * remain readable, but are intentionally not returned here.
 */
export function townAchievementProgress(
  town: TownState,
  buildings: Building[],
  definitions: Record<string, BuildingDefinition>,
) {
  const reactions = spatialReactions(buildings, definitions);
  const reactionIds = new Set(reactions.map((reaction) => reaction.id));
  const types = new Set(
    buildings
      .filter((building) => building.world === "overworld")
      .map((building) => building.type),
  );
  const recentReports = town.reports.slice(0, 3);

  return {
    first_sale: town.totalSales >= 1,
    reaction: reactions.length >= 1,
    grain_block: ["grain-run", "flour-arcade", "oven-window"].some((id) =>
      reactionIds.has(id),
    ),
    neighbor_block: ["shared-yard", "garden-edge", "care-porch"].some((id) =>
      reactionIds.has(id),
    ),
    bread_chain: ["farm", "windmill", "bakery", "breadshop"].every((type) =>
      types.has(type),
    ),
    trusted: (town.development?.total ?? 0) >= 3,
    profitable_days:
      recentReports.length === 3 &&
      recentReports.every((report) => report.profit > 0),
    beloved: town.metrics.population >= 20 && town.metrics.happiness >= 85,
    dream_town: town.level >= 5,
  } satisfies Record<string, boolean>;
}

export function earnedTownAchievements(
  town: TownState,
  buildings: Building[],
  definitions: Record<string, BuildingDefinition>,
) {
  return Object.entries(townAchievementProgress(town, buildings, definitions))
    .filter(([, earned]) => earned)
    .map(([id]) => id);
}
