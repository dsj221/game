import type {Bag,Building,Npc} from './index';
export type FacilityStatus='营业中'|'生产中'|'休息中'|'缺少原料'|'员工不足'|'等待顾客'|'等待补货'|'暂停营业'|'住宅'|'开放中';
export interface Facility {progress:number;stock:number;staff:number;efficiency:number;status:FacilityStatus;revenue:number;costs:number;customers:number;satisfaction:number;priceFactor:number;produced:number;dailyRevenue:number;dailyCosts:number;dailyCustomers:number}
export interface Ledger {revenue:number;wages:number;maintenance:number;purchases:number;rent:number;sales:number;arrivals:number;departures:number;produced:Partial<Bag>;consumed:Partial<Bag>;startHappiness:number}
export interface DailyReport extends Ledger {day:number;profit:number;population:number;happiness:number}
export interface TownEvent {id:string;type:'rain'|'festival'|'flu';title:string;description:string;remaining:number;duration:number}
export interface TownNotice {id:string;text:string;kind:'resident'|'production'|'quest'|'event'|'level';building?:string;tick:number}
export interface TownMetrics {population:number;capacity:number;jobs:number;employed:number;unemployment:number;happiness:number;health:number;environment:number;attraction:number;foodSupply:number;foodDemand:number;foodDays:number;expected:number;growthReason:string}
export interface TownState {day:number;minute:number;level:number;facilities:Record<string,Facility>;metrics:TownMetrics;ledger:Ledger;reports:DailyReport[];completed:string[];claimed:string[];events:TownEvent[];eventHistory:string[];nextEvent:number;seed:number;migrationProgress:number;departProgress:number;peakPopulation:number;totalSales:number;builtCounts:Record<string,number>;notices:TownNotice[];pulses:{id:string;building:string;text:string;tick:number}[];revision:number;legacy:boolean}
export interface SimInput {town:TownState;buildings:Building[];npcs:Npc[];bag:Bag;currency:number;tick:number;weather:string[]}
export interface SimOutput extends SimInput {net:number}
