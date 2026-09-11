import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyCommissions,developmentAction,initialDevelopment,civicProjects,developmentBonuses} from '../src/systems/development.ts';
import {initialTown,emptyBag} from '../src/data/town.ts';
import {simulateTown} from '../src/game/TownSimulation.ts';
import {makeCitizen} from '../src/data/settlement.ts';
const stock=()=>Object.fromEntries(Object.keys(emptyBag()).map(k=>[k,100]));
const building=(type,id=type)=>({id,type,world:'overworld',x:0,z:0,level:1,rotation:0,born:0});
test('每日3份确定性委托，等级分层，五级包含全货品挑战',()=>{
 for(let day=1;day<=20;day++)for(let level=1;level<=5;level++){const orders=dailyCommissions(day,level);assert.equal(orders.length,3);assert.equal(new Set(orders.map(o=>o.id)).size,3);assert.ok(orders.every(o=>o.level<=level));assert.deepEqual(orders,dailyCommissions(day,level));}
});
test('交付扣真实库存、记账和口碑，重放与旧日订单不能再次领取',()=>{
 const t=initialTown(),bag=stock(),order=dailyCommissions(1,1)[0];const r=developmentAction(t,bag,100,[],{kind:'order',id:order.id});assert.ok(!r.error);assert.equal(r.currency,100+order.coins);assert.equal(r.town.development.total,1);assert.equal(r.town.development.reputation,order.reputation);assert.equal(r.town.ledger.revenue,order.coins);
 for(const [key,n] of Object.entries(order.goods)){assert.equal(r.bag[key],bag[key]-n);assert.equal(r.town.ledger.consumed[key],n);}assert.equal(t.development.total,0);
 assert.ok(developmentAction(r.town,r.bag,r.currency,[],{kind:'order',id:order.id}).error);
 r.town.day++;assert.ok(developmentAction(r.town,r.bag,r.currency,[],{kind:'order',id:order.id}).error);
 const next=developmentAction(r.town,r.bag,r.currency,[],{kind:'order',id:dailyCommissions(2,1)[0].id});assert.equal(next.town.development.delivered.length,1);assert.equal(next.town.development.total,2);
});
test('库存不足零扣款、口粮保护必须明确允许才可绕过',()=>{
 const t=initialTown(),o=dailyCommissions(1,1).find(o=>o.goods.food);const bag={...emptyBag(),food:6};assert.ok(developmentAction(t,bag,100,[],{kind:'order',id:o.id}).error);
 const yes=developmentAction(t,bag,100,[],{kind:'order',id:o.id,allowFood:true});assert.equal(yes.bag.food,0);
 const no=developmentAction(t,emptyBag(),100,[],{kind:'order',id:o.id,allowFood:true});assert.ok(no.error);assert.equal(no.currency,100);
});
test('五章工程逐级检查设施、前置、材料并仅扣费一次',()=>{
 let t=initialTown(),bag=stock(),currency=10000;t.level=5;t.development.reputation=100;
 assert.ok(developmentAction(t,bag,currency,[],{kind:'project',id:'craft'}).error);
 for(const p of civicProjects){assert.ok(developmentAction(t,bag,currency,[],{kind:'project',id:p.id}).error);const r=developmentAction(t,bag,currency,[building(p.building)],{kind:'project',id:p.id});assert.ok(!r.error,r.error);assert.equal(r.currency,currency-p.coins);assert.ok(developmentAction(r.town,r.bag,r.currency,[building(p.building)],{kind:'project',id:p.id}).error);t=r.town;bag=r.bag;currency=r.currency;}
 assert.equal(t.development.projects.length,5);assert.equal(developmentBonuses(t.development).reward,1.2);
});
test('方针需要Lv2且每日只能改一次，隔日可更改',()=>{
 const t=initialTown();assert.ok(developmentAction(t,stock(),100,[],{kind:'policy',id:'industry'}).error);t.level=2;
 const r=developmentAction(t,stock(),100,[],{kind:'policy',id:'industry'});assert.equal(r.town.development.policy,'industry');assert.ok(developmentAction(r.town,stock(),100,[],{kind:'policy',id:'leisure'}).error);r.town.day++;assert.equal(developmentAction(r.town,stock(),100,[],{kind:'policy',id:'leisure'}).town.development.policy,'leisure');
});
test('工程和方针实际改变生产与工资维护，旧存档默认无加成',()=>{
 const home=building('house','home'),farm={...building('farm'),x:2};
 const s={town:initialTown(),buildings:[home,farm],npcs:[makeCitizen('a',0,'home'),makeCitizen('b',1,'home')],bag:stock(),currency:10000,tick:0,weather:[]};s.town.minute=500;s.town.nextEvent=100000;
 const upgraded=structuredClone(s);upgraded.town.development={...initialDevelopment(),projects:['granary','civic'],policy:'industry'};
 const base=simulateTown(s),boost=simulateTown(upgraded);assert.ok(boost.town.facilities.farm.progress>base.town.facilities.farm.progress);assert.ok(boost.town.ledger.wages>base.town.ledger.wages);assert.ok(boost.town.ledger.maintenance<base.town.ledger.maintenance);
 const legacy=structuredClone(s);delete legacy.town.development;assert.equal(simulateTown(legacy).town.facilities.farm.progress,base.town.facilities.farm.progress);
 let a=s,b=upgraded;for(let i=0;i<100;i++){a=simulateTown(a);b=simulateTown(b);}assert.ok(b.town.ledger.produced.food>a.town.ledger.produced.food);
});
