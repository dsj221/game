import type {Building} from '../types/index.ts';
import type {TownState} from '../types/town.ts';
import {defs} from '../data/definitions.ts';
export interface TownAdvice {id:string;priority:number;title:string;detail:string;building?:string;target:'village'|'daily'|'quests'}
export function townAdvice(t:TownState,buildings:Building[]):TownAdvice[]{
 const out:TownAdvice[]=[],m=t.metrics;
 if(m.population>0&&m.foodDays<.5)out.push({id:'food',priority:0,title:'食品储备偏低',detail:`仓库和店铺合计仅约 ${m.foodDays.toFixed(1)} 天储备。检查农田和食品店，或在集市应急进货。`,target:'village'});
 for(const b of buildings.filter(b=>b.world==='overworld'&&!b.paused)){
  const f=t.facilities[b.id];if(!f)continue;
  if(f.status==='缺少电力')out.push({id:`power:${b.id}`,priority:1,title:`${defs[b.type].name}缺少电力`,detail:'机器已停止生产。检查发电设施是否暂停，或补充风车、火把与发电机。',building:b.id,target:'village'});
  if(f.status==='缺少原料')out.push({id:`input:${b.id}`,priority:1,title:`${defs[b.type].name}缺少原料`,detail:'检查上游设施是否生产，再决定是否采购或扩建。',building:b.id,target:'village'});
  else if(f.status==='员工不足')out.push({id:`staff:${b.id}`,priority:2,title:`${defs[b.type].name}员工不足`,detail:`已分配 ${f.staff} 位员工。检查空房和闲置岗位；继续扩建可能加剧缺工。`,building:b.id,target:'village'});
 }
 if(m.population>0&&m.capacity<=m.population)out.push({id:'housing',priority:3,title:'住房已住满',detail:'新邻居暂时无法入住。可以升级现有住宅，或建造新住宅。',target:'village'});
 const reports=t.reports.slice(0,3);if(reports.length===3&&reports.every(r=>r.profit<0))out.push({id:'loss',priority:1,title:'连续三天经营亏损',detail:'查看历史日报，比较销售与工资、维护和采购成本。',target:'daily'});
 if(t.upgradeReady)out.push({id:'level',priority:0,title:'小镇可以升级了',detail:'升级条件已满足，前往确认并查看新解锁内容。',target:'quests'});
 return out.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}
