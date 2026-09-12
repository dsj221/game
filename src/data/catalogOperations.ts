import type { BuildingDefinition } from "../types/index.ts";

type Operation = NonNullable<BuildingDefinition["town"]>;
const operation = (
  category: Operation["category"],
  more: Partial<Operation> = {},
): Operation => ({
  category,
  jobs: 0,
  wage: 10,
  upkeep: 2,
  unlock: 1,
  ...more,
});

// Uses existing resources and wallets: no separate, untracked passive income.
export const catalogOperations: Record<
  string,
  { town: Operation; description: string }
> = {
  icon_workshop_stall: {
    town: operation("生产", {
      jobs: 1,
      cycle: 35,
      recipe: { wood: 3, iron: 1 },
      output: { tools: 1 },
      unlock: 2,
    }),
    description: "木材3＋铁矿1 → 工具1，每35秒一个周期；工具维持生产设施效率。",
  },
  icon_clay_kiln: {
    town: operation("生产", {
      jobs: 2,
      cycle: 30,
      recipe: { stone: 3, wood: 1 },
      output: { pottery: 2 },
      unlock: 3,
    }),
    description: "石头3＋木材1 → 陶器2，每30秒一个周期；陶器供餐饮与节庆使用。",
  },
  icon_greenhouse: {
    town: operation("生产", {
      jobs: 2,
      cycle: 35,
      output: { food: 5 },
      unlock: 2,
    }),
    description: "每35秒生产食物5，需要两名工人；温室不受连绵春雨的减产影响。",
  },
  icon_carrot_patch: {
    town: operation("生产", { jobs: 1, cycle: 25, output: { food: 3 } }),
    description: "每25秒收获食物3，需要一名工人；石井和水塔可提高效率。",
  },
  icon_stone_well: {
    town: operation("公共"),
    description:
      "三格内农田、果园、温室与胡萝卜田效率提高15%；同类供水加成不叠加。",
  },
  icon_water_tower: {
    town: operation("公共", { jobs: 1, upkeep: 5, unlock: 2 }),
    description: "配备员工后，五格内农业效率提高15%；与石井、水源塔不叠加。",
  },
  icon_water_shrine_tower: {
    town: operation("公共", { jobs: 1, upkeep: 6, unlock: 3 }),
    description: "配备员工后，六格内农业效率提高15%；与其他供水设施不叠加。",
  },
  icon_hay_shed: {
    town: operation("公共", { upkeep: 3 }),
    description:
      "三格内生产设施获得15%周边物流效率加成；与仓库加成不叠加，不替代道路物流终点。",
  },
  icon_signpost: {
    town: operation("装饰", { happiness: 1, upkeep: 0 }),
    description:
      "清晰的路标让邻里更舒心：两格内住宅幸福加成1。不是可通行道路。",
  },
  icon_village_gate: {
    town: operation("装饰", { happiness: 3, environment: 2, unlock: 2 }),
    description: "四格内住宅幸福加成3，小镇环境评分增加2。",
  },
  icon_shrine: {
    town: operation("公共", { happiness: 3, environment: 2 }),
    description: "三格内住宅幸福加成3，环境评分增加2；居民可前来休闲。",
  },
  icon_gazebo: {
    town: operation("公共", { happiness: 3, environment: 2 }),
    description: "三格内住宅幸福加成3，提供晚间休闲目的地。",
  },
  icon_central_fountain: {
    town: operation("公共", {
      happiness: 4,
      environment: 5,
      upkeep: 5,
      unlock: 2,
    }),
    description: "四格内住宅幸福加成4；三格内公园幸福效果额外提高10%。",
  },
  icon_tool_shop: {
    town: operation("商业", {
      jobs: 1,
      sells: "tools",
      price: 35,
      wholesale: 10,
      unlock: 2,
    }),
    description:
      "采购工具，每件进货10金币、基础售价35金币；居民购买，也为生产设施提供维护用品。",
  },
  icon_camp_tent: {
    town: operation("住宅", { capacity: 2, rent: 6, upkeep: 1 }),
    description:
      "提供两个居住名额，每位住户每日基础租金6金币；升级增加容量和租金。",
  },
  icon_birdhouse: {
    town: operation("装饰", { happiness: 1, environment: 3, upkeep: 0 }),
    description: "两格内住宅幸福加成1，小镇环境评分增加3。",
  },
  icon_crystal_pool: {
    town: operation("装饰", {
      happiness: 4,
      environment: 5,
      upkeep: 4,
      unlock: 3,
    }),
    description: "四格内住宅幸福加成4；三格内公园幸福效果额外提高10%。",
  },
};
