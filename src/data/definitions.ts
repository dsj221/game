import type { BuildingDefinition, WorldDefinition, WorldId } from "../types";
export const worlds: Record<WorldId, WorldDefinition> = {
  overworld: {
    id: "overworld",
    name: "主世界",
    background: "#eef2e8",
    tileColor: "#93ae6e",
    earth: "#aa9070",
    accent: "#557858",
    ambientLight: 1.6,
  },
  nether: {
    id: "nether",
    name: "下界",
    background: "#271f21",
    tileColor: "#84483f",
    earth: "#493235",
    accent: "#e99d6b",
    ambientLight: 1.1,
  },
  end: {
    id: "end",
    name: "末地",
    background: "#202335",
    tileColor: "#d4ceaa",
    earth: "#777287",
    accent: "#b9a3de",
    ambientLight: 1.3,
  },
};
const def = (
  id: string,
  name: string,
  category: string,
  modelType: string,
  cost: number,
  income: number,
  extras: Partial<BuildingDefinition> = {},
): BuildingDefinition => ({
  id,
  name,
  category,
  modelType,
  cost,
  incomePerSecond: income,
  world: "all",
  description: "让小小的世界多一份生机。",
  size: [1, 1],
  upgradeCost: Math.round(cost * 0.65),
  maxLevel: 10,
  energyCost: 0,
  power: 0,
  production: {},
  ...extras,
});
export const definitions: BuildingDefinition[] = [
  def("house", "林间小屋", "村庄", "house", 420, 3, {
    population: 3,
    description: "安放日常的温柔角落。提供 3 个居民名额。",
    materials: { wood: 15 },
  }),
  def("shop", "杂货铺", "村庄", "shop", 650, 12, {
    description: "从麦面包到一束鲜花，让货物在邻里之间流动。",
  }),
  def("market", "中央集市", "村庄", "market", 1200, 25, {
    description: "连接道路网络，开放资源交易、商人订单与直播间。",
  }),
  def("clock", "时光钟楼", "村庄", "clock", 1600, 14, {
    description: "小镇的心跳。升级到 2 级解锁铁傀儡。",
  }),
  def("studio", "我的直播间", "直播", "studio", 2200, 18, {
    description: "把小世界的日常，分享给远方的人。双击进入室内。",
    unlockRequirements: "market",
  }),
  def("mine", "采石矿区", "工程", "mine", 800, 4, {
    production: { stone: 3, iron: 1 },
    description: "从岩层中采集石头和铁矿。道路连通后产量翻倍。",
  }),
  def("furnace", "熔炉", "红石", "furnace", 700, 8, {
    energyCost: 3,
    production: { iron: 2 },
    description: "消耗电力熔炼铁矿。缺电时停止生产。",
  }),
  def("slime", "史莱姆机械组", "红石", "slime", 1450, 18, {
    energyCost: 5,
    production: { redstone: 1 },
    unlockRequirements: "furnace",
    description: "活塞与黏液的默契，提高红石材料产出。",
  }),
  def("drill", "红石钻机", "红石", "drill", 1800, 20, {
    energyCost: 6,
    production: { iron: 3, stone: 3 },
    unlockRequirements: "furnace",
    description: "深入岩层的自动采矿机，每秒开采铁矿与石料。",
    materials: { iron: 20 },
  }),
  def("windmill", "谷风磨坊", "工程", "windmill", 1300, 5, {
    power: 12,
    production: { food: 1 },
    description: "把风变成电力，每秒补充 12 E。",
  }),
  def("farm", "麦穗农田", "村庄", "farm", 350, 2, {
    production: { food: 3 },
    description: "随风摇摆的麦田，为居民提供持续食物。",
  }),
  def("lumber", "林木工坊", "村庄", "lumber", 600, 4, {
    production: { wood: 3 },
    description: "可持续采伐与木材加工，每秒产出木材。",
  }),
  def("portal", "绯红传送门", "下界", "portal", 2000, 12, {
    description: "一扇通往炽热大地的门。详情中可穿越世界。",
  }),
  def("endportal", "星隙传送装置", "末地", "endportal", 2600, 16, {
    description: "紫色晶体连接着星海另一端。",
  }),
  def("generator", "红石发电机", "红石", "generator", 1000, 0, {
    power: 20,
    description: "每秒产生 20 E，保障工厂持续运转。",
  }),
  def("core", "能量核心", "末地", "core", 3400, 10, {
    power: 40,
    world: "end",
    description: "悬浮水晶释放稳定能量，每秒产生 40 E。",
  }),
  def("tree", "方冠树", "工具", "tree", 80, 0, {
    production: { wood: 0.2 },
    description: "给大陆添一抹绿意，缓慢产出木材。",
  }),
  def("lamp", "园林路灯", "工具", "lamp", 100, 0, {
    description: "白昼沉默，夜间点亮回家的路。",
  }),
  def("road", "石砖道路", "工具", "road", 35, 0, {
    description: "连接生产设施与集市。道路连通时生产效率为 100%。",
  }),
  def("bridge", "木栈桥", "村庄", "bridge", 150, 0, {
    description: "木制物流路段，可连接石砖道路。",
  }),
  def("warehouse", "货运仓库", "工程", "warehouse", 900, 6, {
    description: "道路网络的物流终点，接收周边生产设施的货物。",
  }),
  def("torch", "红石火把", "红石", "torch", 180, 0, {
    power: 2,
    description: "照亮工厂，也提供每秒 2 E 微型动力。",
  }),
  def("netherplant", "绯红菌丛", "下界", "tree", 160, 1, {
    world: "nether",
    production: { redstone: 0.3 },
    description: "在熔岩岸边生长，凝结少量红石。",
  }),
  def("obsidian", "黑曜石柱", "末地", "obsidian", 900, 6, {
    world: "end",
    description: "守望星海的古老石柱。",
  }),
];
export const defs = Object.fromEntries(
  definitions.map((d) => [d.id, d]),
) as Record<string, BuildingDefinition>;
export const resourceNames = {
  wood: "木材",
  stone: "石头",
  iron: "铁矿",
  redstone: "红石",
  food: "食物",
};
export const achievementDefs = [
  ["first", "万物第一次", "完成一次采集"],
  ["expand", "大桥在生长", "扩张一块大陆"],
  ["idle", "放下双手", "让世界运行一分钟"],
  ["live", "我们开播了", "切换一次直播节目"],
  ["nether", "另一个天空", "抵达下界"],
  ["end", "龙也来上班", "抵达末地"],
  ["audience", "整个世界听我说", "观众达到 1,000"],
  ["rain", "终于有雨季", "开启雨季"],
  ["farm", "麦田的风", "建设一块农田"],
  ["road", "通向远方", "铺设一段道路"],
  ["upgrade", "精益求精", "升级一座建筑"],
  ["worlds", "世界之外", "探索三个世界"],
  ["rich", "亿点可能", "累计财富达到 100,000"],
  ["helper", "小帮手，大忙碌", "招募一个傀儡"],
  ["tree", "种下小宇宙", "种下一棵树"],
  ["build", "从一块到万物", "完成第一次建造"],
];
