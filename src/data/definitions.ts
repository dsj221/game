import type { BuildingDefinition, WorldDefinition, WorldId } from "../types";
import {townConfig,townNames,townPrices} from './town.ts';
import { buildingIconCatalog } from './buildingIcons.ts';
import { plannedFootprint } from './footprints.ts';
import {roadStyles} from './roads.ts';
import {catalogOperations} from './catalogOperations.ts';
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

const iconCategory: Record<string, string> = {
  storage: "生产", production: "生产", commercial: "商业", residential: "住宅",
  public: "公共", agriculture: "生产", decoration: "装饰", infrastructure: "道路",
  resource: "生产", special: "进阶",
};
const existingIconKeys = new Set(Object.values({
  house: "thatched_cottage", shop: "market_stall", market: "market_pavilion",
  mine: "mine_entrance", furnace: "blacksmith_forge", slime: "steam_machine",
  drill: "wooden_crane", generator: "steam_machine", windmill: "windmill",
  farm: "vegetable_garden", lumber: "log_pile", carpenter: "carpenter_workbench",
  bakery: "wood_fired_oven", portal: "magic_portal", endportal: "magic_portal",
  core: "crystal_obelisk", lamp: "lantern_post", torch: "lantern_post",
  bridge: "arched_bridge", warehouse: "crate", park: "vine_pergola", flowerbed: "flower_planter",
}));
for (const icon of buildingIconCatalog) {
  if (existingIconKeys.has(icon.key)) continue;
  definitions.push(def(`icon_${icon.key}`, icon.name_cn, iconCategory[icon.category] ?? "装饰", "house", 180 + icon.id * 55, 0, {
    description: `来自建筑图鉴的${icon.name_cn}，为小镇增添新的生活设施。`,
  }));
}
for(const [id,modelType,description] of [
 ['residence','house','舒适的双层住宅，提供 4 个居住名额。'],['apartment','apartment','更紧凑的居住空间，给八位邻居一个家。'],
 ['bakery','bakery','面粉 ×2 → 面包 ×4。缺少面粉时暂停生产。'],['breadshop','shop','从仓库采购面包，邻居来消费时才产生营业额。'],
 ['park','park','散步、聊天、看花。增加幸福度与环境评分，每日需要维护。'],['clinic','clinic','照顾居民健康，减轻流感影响。需要一名医护人员。'],
 ['flowerbed','flowerbed','一小簇花，就能让街角明亮起来。'],['bench','bench','给匆忙的脚步留一个休息的地方。'],
 ['carpenter','lumber','木材 ×5 → 家具 ×2，为小镇集市提供商品。'],['cafe','shop','一份甜点，一段悠闲时光。消费满足娱乐需求。'],['school','house','邻里孩子的学堂，提高家庭幸福度。'],
])definitions.push(def(id,townNames[id], '村庄',modelType,townPrices[id],0,{description}));
for(const d of definitions){d.town=townConfig[d.id];if(!d.town)continue;d.incomePerSecond=0;d.category=d.town.category;d.name=townNames[d.id]||d.name;d.cost=townPrices[d.id]??d.cost;d.upgradeCost=Math.round(d.cost*.8);if(d.town.capacity)d.population=d.town.capacity;if(['house','farm','lumber','windmill','shop'].includes(d.id)){d.materials=d.id==='house'?{wood:5}:undefined;d.description={house:'提供 2 个居住名额。有人入住后才产生租金；升级增加容量。',farm:'30 秒收获小麦 ×5、食物 ×3。员工不足会延长生产周期。',lumber:'20 秒生产木材 ×5，为住宅与家具制造提供原料。',windmill:'小麦 ×3 → 面粉 ×4，每个生产周期 18 秒。',shop:'采购食物，居民付款后获得营业额。无人消费时仍有工资和维护成本。'}[d.id]!;}if(d.id==='tree')d.production={};}
for (const d of definitions) if (['park'].includes(d.id)) d.influenceRadius=3; else if (['shop','breadshop','market','cafe'].includes(d.id)) d.influenceRadius=4; else if (['house','residence','apartment'].includes(d.id)) d.influenceRadius=3;
for(const [id,r] of Object.entries(roadStyles))if(id!=='road')definitions.push(def(id,r.name,'道路',id,r.cost,0,{maxLevel:1,description:`连接物流与居民通行。自动衔接直线、转角、丁字和十字路口；${id==='dirt_path'?'造价低，步行稍慢。':'可连续点击铺设。'}`}));
definitions.push(
 def('orchard','丰收果园','生产','orchard',350,0,{town:{category:'生产',jobs:2,wage:8,upkeep:3,unlock:2,cycle:40,output:{food:6},environment:2},description:'照料果树，每40秒收获6份食物；需要员工。',maxLevel:3}),
 def('tea_house','邻里茶馆','商业','tea_house',550,0,{town:{category:'商业',jobs:1,wage:10,upkeep:4,unlock:2,sells:'food',price:15,wholesale:3,happiness:2},description:'采购食物供邻居消费，产生真实销售收入，并改善附近幸福度。',maxLevel:3}),
 def('library','街角图书馆','公共','library',950,0,{town:{category:'公共',jobs:1,wage:10,upkeep:5,unlock:3,happiness:3,environment:2},description:'为周围四格住宅提供幸福度加成，每日有工资和维护成本。',maxLevel:3}),
 def('pottery','陶艺工坊','生产','pottery',700,0,{town:{category:'生产',jobs:2,wage:10,upkeep:4,unlock:3,cycle:40,recipe:{stone:3,wood:2},output:{furniture:2}},description:'石头3＋木材2加工成家具2，供应中央集市；附近住宅会受到工业噪声影响。',maxLevel:3}),
);
for (const d of definitions) {
  const operation = catalogOperations[d.id];
  if (operation) { d.town=operation.town; d.category=operation.town.category; d.description=operation.description; }
  if (d.id==='tree') d.description='改善环境评分，两格内住宅幸福加成0.5；木材由伐木场生产。';
  if (d.id==='obsidian') d.description='三格内生产设施效率提高15%，与仓库、干草棚物流加成不叠加；可辅助末地生产布局。';
  if (d.id==='studio') d.description='员工到岗并在工作时间直播，按观众数结算频道收入；设备与布置改善直播效果。';
}
export const defs = Object.fromEntries(
  definitions.map((d) => { d.size = plannedFootprint(d.id); if(d.town)d.maxLevel=3; return [d.id, d]; }),
) as Record<string, BuildingDefinition>;
export const resourceNames = {
  wood: "木材",
  stone: "石头",
  iron: "铁矿",
  redstone: "红石",
  food: "食物",
  wheat:'小麦',flour:'面粉',bread:'面包',furniture:'家具',
};
export const playableDefinitions=definitions.filter(d=>(d.world==='all'||d.world==='overworld')&&!['portal','endportal','core','netherplant','obsidian'].includes(d.id));
export const achievementDefs = [
  ["first", "万物第一次", "完成一次获取金币"],
  ["expand", "大桥在生长", "扩张一块大陆"],
  ["idle", "放下双手", "让世界运行一分钟"],
  ["live", "我们开播了", "切换一次直播节目"],
  ["audience", "整个世界听我说", "观众达到 1,000"],
  ["rain", "终于有雨季", "开启雨季"],
  ["farm", "麦田的风", "建设一块农田"],
  ["road", "通向远方", "铺设一段道路"],
  ["upgrade", "精益求精", "升级一座建筑"],
  ["rich", "亿点可能", "累计财富达到 100,000"],
  ["helper", "小帮手，大忙碌", "招募一个傀儡"],
  ["tree", "种下小宇宙", "种下一棵树"],
  ["build", "从一块到万物", "完成第一次建造"],
];
