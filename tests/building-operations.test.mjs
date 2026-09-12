import test from 'node:test';
import assert from 'node:assert/strict';
import {defs} from '../src/data/definitions.ts';
import {catalogOperations} from '../src/data/catalogOperations.ts';
import {influenceFor,influenceRules} from '../src/systems/buildingInfluence.ts';
import {computeProduction} from '../src/systems/economy.ts';
import {broadcastStep} from '../src/systems/broadcast.ts';
import {simulateTown,metrics} from '../src/game/TownSimulation.ts';
import {initialTown,emptyBag,emptyFacility} from '../src/data/town.ts';
import {makeCitizen} from '../src/data/settlement.ts';
import {isRoad} from '../src/data/roads.ts';
const b=(type,x=0,z=0,id=type,world='overworld')=>({id,type,x,z,world,level:1,rotation:0,born:0});
function scenario(type){
 const world=defs[type].world==='all'?'overworld':defs[type].world||'overworld';
 const buildings=[b('apartment',-2,0,'home',world),b(type,0,0,type,world)];
 const npcs=Array.from({length:Math.max(2,defs[type].town?.jobs||0)},(_,i)=>makeCitizen('n'+i,i,'home',world));
 const town=initialTown();town.minute=500;town.nextEvent=100000;
 return {town,buildings,npcs,bag:Object.fromEntries(Object.keys(emptyBag()).map(r=>[r,100])),currency:10000,tick:0,weather:[]};
}
test('61种建筑都有可执行经营路径，17种图鉴建筑全部补齐',()=>{
 assert.equal(Object.keys(defs).length,61);assert.equal(Object.keys(catalogOperations).length,17);
 for(const d of Object.values(defs))assert.ok(isRoad(d.id)||d.town?.capacity||d.town?.output||d.town?.sells||d.power||influenceRules[d.id]||['studio','portal','endportal'].includes(d.id),d.id+'没有实际效果');
});
for(const d of Object.values(defs).filter(d=>d.town?.output))test(d.name+'：有工人真实生产，原料计入消耗，暂停停止产出',()=>{
 let s=scenario(d.id);s.buildings.push(b('generator',4,0));
 for(let i=0;i<100;i++){const p=computeProduction(s.buildings,[],0,480);s=simulateTown({...s,offline:p.offline});}
 assert.ok(s.town.facilities[d.id].produced>0,d.id);
 for(const r of Object.keys(d.town.recipe||{})) assert.ok(s.town.ledger.consumed[r]>0,r);
 const count=s.town.facilities[d.id].produced;s.buildings=s.buildings.map(v=>v.id===d.id?{...v,paused:true}:v);
 s=simulateTown(s);assert.equal(s.town.facilities[d.id].produced,count);assert.equal(s.town.facilities[d.id].efficiency,0);
});
test('供水仅作用附近农业，跨世界/暂停/缺员失效，不无限叠加',()=>{
 const farm=b('farm'),well=b('icon_stone_well',1),tower=b('icon_water_tower',2);
 const normal=influenceFor(farm,[farm],defs).efficiency;
 assert.equal(influenceFor(farm,[farm,well,tower],defs).efficiency,normal+.15);
 assert.equal(influenceFor(farm,[farm,{...well,paused:true},{...tower,world:'nether'}],defs).efficiency,normal);
 assert.equal(influenceFor(farm,[farm,tower],defs,new Set(['farm'])).efficiency,normal);
 assert.equal(influenceFor(b('pottery'),[tower],defs).efficiency,normal);
 const s=scenario('icon_water_tower');s.npcs=[];assert.equal(simulateTown(s).town.facilities.icon_water_tower.status,'员工不足');
});
test('公共幸福、休闲、医疗遵循范围和世界，暂停环境失效',()=>{
 for(const [id,r] of Object.entries(influenceRules).filter(([,r])=>r.happiness||r.health)){
  const home=b('house'),service=b(id,1);
  const close=influenceFor(home,[home,service],defs);
  if(r.happiness)assert.ok(close.happiness>0,id);
  if(r.health)assert.ok(close.health,id);
  assert.equal(influenceFor(home,[home,{...service,x:30}],defs).happiness,0);
  assert.equal(influenceFor(home,[home,{...service,world:'nether'}],defs).health,false);
  assert.equal(influenceFor(home,[home,service],defs,new Set()).happiness,0);
 }
 const tree=b('tree');assert.ok(metrics([tree],[],emptyBag()).environment>metrics([{...tree,paused:true}],[],emptyBag()).environment);
});
test('电力真正阻止冶炼，恢复供电继续，停用电源不发电，共享池不重复消费',()=>{
 let s=scenario('furnace');const none=computeProduction(s.buildings,[],0,480);assert.deepEqual(none.offline,['furnace']);
 s=simulateTown({...s,offline:none.offline});assert.equal(s.town.facilities.furnace.status,'缺少电力');assert.equal(s.town.facilities.furnace.progress,0);
 s.buildings.push(b('generator',4));const power=computeProduction(s.buildings,[],0,480);s=simulateTown({...s,offline:power.offline});assert.ok(s.town.facilities.furnace.progress>0);
 assert.equal(computeProduction([b('generator'),{...b('core'),paused:true}],[],0,480).generation,20);
 const shared=computeProduction([b('furnace'),b('furnace',0,0,'other','nether')],[],3,480);assert.equal(shared.energy,0);assert.deepEqual(shared.offline,['other']);
});
for(const type of ['icon_tool_shop','tea_house'])test(type+'实际采购、成交和需求满足',()=>{
 let s=scenario(type);s.npcs.forEach(n=>{n.wallet=300;n.needs={food:0,fun:80,shopping:type==='tea_house'?0:80};});
 for(let i=0;i<12;i++)s=simulateTown(s);
 const f=s.town.facilities[type];assert.ok(f.customers>0);assert.ok(f.dailyRevenue>0&&f.dailyCosts>0);
 if(type==='tea_house')assert.ok(s.npcs.some(n=>n.needs.fun<60));
});
test('营地提供住房并收取真实租金',()=>{const s=scenario('icon_camp_tent');s.buildings=s.buildings.filter(v=>v.id!=='home');s.npcs.forEach(n=>n.home='');const result=simulateTown(s);assert.equal(result.npcs.filter(n=>n.home==='icon_camp_tent').length,2);assert.ok(result.town.facilities.icon_camp_tent.dailyRevenue>0);});
test('直播需要营业和员工，设备、节目、礼物进入实际结算',()=>{
 const buildings=[b('studio')],facilities={studio:{...emptyFacility(),status:'开放中',efficiency:1}},state={viewers:320,equipment:1,decor:0,program:'田园时光',camera:'演播室现场',gifts:0};
 const live=broadcastStep(buildings,facilities,state,true,15);assert.ok(live.income>0);assert.equal(live.gifts,1);assert.equal(live.revenues[0].amount,live.income);
 assert.equal(broadcastStep(buildings,facilities,state,false,15).income,0);
 assert.equal(broadcastStep([{...buildings[0],paused:true}],facilities,state,true,15).gifts,0);
 assert.ok(broadcastStep(buildings,facilities,{...state,equipment:2},true,15).income>live.income);
});
