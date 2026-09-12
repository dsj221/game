import type {
  Building,
  BuildingDefinition,
  Npc,
  ResidentWish,
  ResidentWishCause,
} from "../types/index.ts";
import type { Facility, TownMetrics } from "../types/town.ts";
import { buildingDistance } from "./buildingInfluence.ts";
import { isRoad } from "../data/roads.ts";

export interface ResidentWishContext {
  day: number;
  tick: number;
  focusIndex: number;
  buildings: Building[];
  defs: Record<string, BuildingDefinition>;
  metrics: TownMetrics;
  facilities: Record<string, Facility>;
  homeInfluence?: { commerce: boolean; health: boolean };
}

const leisureTypes = new Set([
  "park",
  "bench",
  "cafe",
  "tea_house",
  "library",
  "icon_gazebo",
  "icon_shrine",
  "icon_central_fountain",
  "icon_crystal_pool",
]);
const greenTypes = new Set([
  "park",
  "tree",
  "flowerbed",
  "orchard",
  "icon_flower_planter",
  "icon_vine_pergola",
  "icon_birdhouse",
  "icon_crystal_pool",
]);

const info: Record<
  ResidentWishCause,
  Pick<ResidentWish, "title" | "story" | "solutions">
> = {
  commute: {
    title: "想把路上的时间还给傍晚",
    story: "每天走到工作地点要花很久，我想早点回家看看窗灯。",
    solutions: [
      "把住所或工作地点搬到 5 格以内",
      "让两端临街，并把通勤控制在 10 格以内",
    ],
  },
  food: {
    title: "想在街角买到今天的饭",
    story: "最近总要到仓库领口粮，我希望小镇的餐桌能稳定下来。",
    solutions: [
      "把全镇食品储备提高到至少 2 天",
      "让这位居民完成一次食品或面包消费",
    ],
  },
  health: {
    title: "想安心养好这场小病",
    story: "身体一直不太舒服，如果附近有人照看就好了。",
    solutions: ["让住所获得诊所覆盖", "把健康度恢复到 76 以上"],
  },
  leisure: {
    title: "想有一个下班后停留的地方",
    story: "工作之外的日子也该有风、树荫和可以坐一会儿的角落。",
    solutions: [
      "在住所附近设置公园或休闲设施",
      "通过散步、咖啡馆或茶馆把休闲需求降到 35 以下",
    ],
  },
  shopping: {
    title: "想逛一家真正属于邻里的店",
    story: "我攒了一点钱，却总找不到顺路又合适的小店。",
    solutions: [
      "让住所进入商业服务范围",
      "完成一次购物，把购物需求降到 30 以下",
    ],
  },
  neighbor: {
    title: "想让家门口更像一个街坊",
    story: "推开门有些空荡，我想认识隔壁的人，或者照看一小片绿色。",
    solutions: ["让另一座住宅与家直接相邻", "让树木、花坛或公园与家直接相邻"],
  },
};

function near(
  building: Building | undefined,
  buildings: Building[],
  predicate: (candidate: Building) => boolean,
  distance = 1,
) {
  return (
    !!building &&
    buildings.some(
      (candidate) =>
        candidate.id !== building.id &&
        candidate.world === building.world &&
        !candidate.paused &&
        predicate(candidate) &&
        buildingDistance(building, candidate) <= distance,
    )
  );
}

function hasRoad(building: Building | undefined, buildings: Building[]) {
  return near(building, buildings, (candidate) => isRoad(candidate.type), 1);
}

export function wishResolved(
  wish: ResidentWish,
  npc: Npc,
  context: ResidentWishContext,
) {
  const home = context.buildings.find((building) => building.id === npc.home),
    work = context.buildings.find((building) => building.id === npc.workplace),
    commute = home && work ? buildingDistance(home, work) : Infinity;
  switch (wish.cause) {
    case "commute":
      return (
        commute <= 5 ||
        (commute <= 10 &&
          hasRoad(home, context.buildings) &&
          hasRoad(work, context.buildings))
      );
    case "food":
      return (npc.needs?.food || 0) < 35 || context.metrics.foodDays >= 2;
    case "health":
      return (npc.health || 0) >= 76 || !!context.homeInfluence?.health;
    case "leisure":
      return (
        (npc.needs?.fun || 0) < 35 ||
        near(
          home,
          context.buildings,
          (building) => leisureTypes.has(building.type),
          3,
        )
      );
    case "shopping":
      return (
        (npc.needs?.shopping || 0) < 30 || !!context.homeInfluence?.commerce
      );
    case "neighbor":
      return near(
        home,
        context.buildings,
        (building) =>
          context.defs[building.type]?.town?.category === "住宅" ||
          greenTypes.has(building.type),
      );
  }
}

export function wishCause(
  npc: Npc,
  context: ResidentWishContext,
): ResidentWishCause | null {
  const home = context.buildings.find((building) => building.id === npc.home),
    work = context.buildings.find((building) => building.id === npc.workplace),
    commute = home && work ? buildingDistance(home, work) : 0;
  if (commute > 6) return "commute";
  if ((npc.health || 90) < 65) return "health";
  if ((npc.needs?.food || 0) > 58 || context.metrics.foodDays < 0.75)
    return "food";
  if ((npc.needs?.fun || 0) > 58) return "leisure";
  if ((npc.needs?.shopping || 0) > 58) return "shopping";
  if (
    home &&
    !near(
      home,
      context.buildings,
      (building) =>
        context.defs[building.type]?.town?.category === "住宅" ||
        greenTypes.has(building.type),
    )
  )
    return "neighbor";
  return null;
}

function remember(
  npc: Npc,
  wish: ResidentWish,
  day: number,
  outcome: "resolved" | "missed",
) {
  const resolved = outcome === "resolved";
  npc.memories = [
    ...(npc.memories || []),
    {
      id: `${wish.id}:${outcome}`,
      title: wish.title,
      text: resolved
        ? "小镇回应了我的想法，这里开始有家的感觉。"
        : "这件事暂时没有解决，但我还愿意再等等。",
      day,
      outcome,
      happiness: resolved ? 1.25 : -0.75,
    },
  ].slice(-6);
  npc.recent = resolved
    ? `“${wish.title}”已经有了答案，我会记得小镇为我做的改变。`
    : `“${wish.title}”没能及时实现，希望以后还有机会。`;
  npc.wish = undefined;
  npc.wishCooldownUntil = day + 2;
}

export function residentWishStep(npc: Npc, context: ResidentWishContext) {
  if (context.focusIndex >= 8 || npc.modelType !== "villager") return null;
  if (npc.wish) {
    if (wishResolved(npc.wish, npc, context)) {
      const title = npc.wish.title;
      remember(npc, npc.wish, context.day, "resolved");
      return {
        kind: "resolved" as const,
        text: `${npc.name}的愿望“${title}”有了答案。`,
      };
    }
    if (context.day > npc.wish.deadlineDay) {
      const title = npc.wish.title;
      remember(npc, npc.wish, context.day, "missed");
      return {
        kind: "missed" as const,
        text: `${npc.name}的愿望“${title}”暂时落空。`,
      };
    }
    return null;
  }
  if (
    (npc.wishCooldownUntil || 0) > context.day ||
    context.tick % 45 !== (context.focusIndex * 11) % 45
  )
    return null;
  const cause = wishCause(npc, context);
  if (!cause) return null;
  npc.wish = {
    id: `wish-${npc.id}-${context.day}-${cause}`,
    cause,
    ...info[cause],
    createdDay: context.day,
    deadlineDay: context.day + 3,
    solutions: [...info[cause].solutions],
  };
  npc.recent = info[cause].story;
  return {
    kind: "created" as const,
    text: `${npc.name}有了一个个人愿望：${info[cause].title}`,
  };
}

export function memoryHappiness(npc: Npc) {
  return Math.max(
    -3,
    Math.min(
      4,
      (npc.memories || []).reduce((sum, memory) => sum + memory.happiness, 0),
    ),
  );
}
