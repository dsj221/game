import type {Bag,Building,Resource} from '../types/index.ts';
import type {TownState} from '../types/town.ts';
export type Policy='balanced'|'industry'|'leisure';
export interface Development {boardDay:number;delivered:string[];total:number;reputation:number;projects:string[];policy:Policy;policyDay:number}
export const initialDevelopment=():Development=>({boardDay:0,delivered:[],total:0,reputation:0,projects:[],policy:'balanced',policyDay:0});
export interface Commission {id:string;level:number;client:string;title:string;story:string;goods:Partial<Bag>;coins:number;reputation:number}
export const commissions:Commission[]=[
 {id:'picnic',level:1,client:'林小雨',title:'带去河边的午餐',story:'邻居约好去河边坐坐，我来准备大家的午餐。',goods:{food:6},coins:65,reputation:2},
 {id:'fence',level:1,client:'阿禾',title:'修好院子的小篱笆',story:'春风吹松了篱笆，需要一些结实木料。',goods:{wood:8},coins:70,reputation:2},
 {id:'seed',level:1,client:'山下农庄',title:'交换一袋麦种',story:'今年打算多种一块田，你的麦子正合适。',goods:{wheat:8},coins:75,reputation:2},
 {id:'breakfast',level:2,client:'河湾驿站',title:'赶早路的旅人',story:'驿站明早要招待一队旅客，请准备面包。',goods:{bread:8,food:4},coins:150,reputation:3},
 {id:'flour',level:2,client:'陈奶奶',title:'重温老家的味道',story:'把面粉磨细一些，我想做小时候吃过的点心。',goods:{flour:10},coins:130,reputation:3},
 {id:'orchard',level:2,client:'山间茶社',title:'茶席上的鲜果',story:'客人喜欢你们镇的收成，留些新鲜果蔬给我们吧。',goods:{food:15,wood:4},coins:165,reputation:3},
 {id:'chairs',level:3,client:'邻镇学堂',title:'新学期的课桌',story:'新来的孩子多了，教室里还缺几套家具。',goods:{furniture:6,wood:8},coins:290,reputation:4},
 {id:'kiln',level:3,client:'行脚商人',title:'远行的陶器箱',story:'把镇上的手工制品装好，我会带去更远的市集。',goods:{furniture:5,bread:6},coins:280,reputation:4},
 {id:'repairs',level:3,client:'石桥工班',title:'入冬前修好桥',story:'趁天气尚好，把桥面的石块和铁件补齐。',goods:{stone:15,iron:5},coins:300,reputation:4},
 {id:'power',level:4,client:'远方工坊',title:'一箱机械零件',story:'新机器即将开工，需要可靠的矿材与红石。',goods:{iron:12,redstone:6},coins:480,reputation:5},
 {id:'festival',level:4,client:'节庆筹备组',title:'摆满长街的宴席',story:'让每位来访的客人都记得这条热闹街道。',goods:{bread:20,furniture:8},coins:600,reputation:5},
 {id:'exhibition',level:5,client:'万镇博览会',title:'来自梦想之城的礼物',story:'用食物、手艺和技术，向远方介绍你的小镇。',goods:{bread:20,furniture:12,redstone:10},coins:950,reputation:8},
];
export const civicProjects=[
 {id:'granary',level:1,rep:4,title:'共享粮仓计划',building:'warehouse',cost:{wood:15,stone:8},coins:120,effect:'食物与小麦产量永久 +10%'},
 {id:'craft',level:2,rep:12,title:'匠人互助社',building:'icon_workshop_stall',cost:{wood:25,flour:10},coins:250,effect:'加工设施生产效率永久 +10%'},
 {id:'civic',level:3,rep:24,title:'公共服务联营',building:'library',cost:{furniture:10,stone:25},coins:450,effect:'全镇设施维护费永久 −10%'},
 {id:'garden',level:4,rep:40,title:'花园城镇计划',building:'park',cost:{wood:40,furniture:15},coins:650,effect:'居民幸福目标永久 +3'},
 {id:'fair',level:5,rep:60,title:'万镇博览会',building:'icon_village_gate',cost:{furniture:25,iron:20,redstone:15},coins:1000,effect:'委托金币奖励永久 +20%，获得「远方也知道的小镇」称号'},
] satisfies {id:string;level:number;rep:number;title:string;building:string;cost:Partial<Bag>;coins:number;effect:string}[];
export function dailyCommissions(day:number,level:number){
 const pool=commissions.filter(c=>c.level<=level);
 return Array.from({length:3},(_,slot)=>({...pool[(day*3+slot)%pool.length],id:`${day}:${pool[(day*3+slot)%pool.length].id}`}));
}
export function developmentBonuses(d:Development=initialDevelopment()) {
 return {food:d.projects.includes('granary')?1.1:1,processing:d.projects.includes('craft')?1.1:1,maintenance:d.projects.includes('civic')?.9:1,happiness:(d.projects.includes('garden')?3:0)+(d.policy==='leisure'?4:0),production:d.policy==='industry'?1.15:d.policy==='leisure'?.9:1,wages:d.policy==='industry'?1.2:1,reward:d.projects.includes('fair')?1.2:1};
}
export function developmentAction(town:TownState,bag:Bag,currency:number,buildings:Building[],action:{kind:'order'|'project'|'policy';id:string;allowFood?:boolean}) {
 const t=structuredClone(town),stock={...bag},d=t.development??=initialDevelopment();
 const fail=(error:string)=>({error,town,bag,currency});
 if(d.boardDay!==t.day){d.boardDay=t.day;d.delivered=[];}
 if(action.kind==='policy'){
  if(!['balanced','industry','leisure'].includes(action.id))return fail('未知方针');
  if(t.level<2)return fail('小镇 Lv.2 解锁经营方针');
  if(d.policy===action.id)return fail('已经采用这一方针');
  if(d.policyDay===t.day)return fail('每天只能调整一次方针，明天再试');
  d.policy=action.id as Policy;d.policyDay=t.day;
  return {town:t,bag:stock,currency,message:'经营方针已调整，下个经营Tick生效'};
 }
 let goods:Partial<Bag>,reward=0,cost=0;
 const order=dailyCommissions(t.day,t.level).find(c=>c.id===action.id);
 const project=civicProjects.find(c=>c.id===action.id);
 if(action.kind==='order'){
  if(d.delivered.length>=3)return fail('今日三份委托已完成，明天会有新的来信');
  if(!order||d.delivered.includes(action.id))return fail('委托已交付或已换日，请查看今日委托');
  goods=order.goods;reward=Math.round(order.coins*developmentBonuses(d).reward);
 }else{
  if(!project||d.projects.includes(action.id))return fail('工程不存在或已完成');
  const index=civicProjects.indexOf(project);
  if(t.level<project.level||d.reputation<project.rep||(index>0&&!d.projects.includes(civicProjects[index-1].id)))return fail('小镇等级、口碑或前置工程尚未满足');
  if(!buildings.some(b=>b.type===project.building&&b.world==='overworld'&&!b.paused))return fail('请先建设并开放工程所需设施');
  goods=project.cost;cost=project.coins;
 }
 if(currency<cost)return fail('金币不足');
 for(const [r,n] of Object.entries(goods))if(stock[r as Resource]<n)return fail('库存不足，请先完成生产');
 if(!action.allowFood && ((goods.food||0)+(goods.bread||0)>0) && stock.food+stock.bread-(goods.food||0)-(goods.bread||0)<t.metrics.population*2)return fail('交付后不足每人2份口粮；请补充库存，或明确允许使用口粮');
 for(const [r,n] of Object.entries(goods)){stock[r as Resource]-=n;t.ledger.consumed[r as Resource]=(t.ledger.consumed[r as Resource]||0)+n;}
 if(action.kind==='order'){d.delivered.push(action.id);d.total++;d.reputation+=order!.reputation;t.ledger.revenue+=reward;}
 else{d.projects.push(action.id);t.ledger.purchases+=cost;}
 return {town:t,bag:stock,currency:currency+reward-cost,message:action.kind==='order'?`委托已交付：+${reward}金币，+${order!.reputation}口碑`:`${project!.title}竣工，永久奖励已生效`};
}
