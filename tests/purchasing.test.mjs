import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateTown} from '../src/game/TownSimulation.ts';
import {initialTown,emptyBag} from '../src/data/town.ts';
import {makeCitizen} from '../src/data/settlement.ts';
import {onShift,validSchedule} from '../src/systems/workSchedule.ts';
import {emptyFacility} from '../src/data/town.ts';
test('排班支持夜班、全天、午休与旧存档默认，拒绝无效时间',()=>{
 const f={schedule:{start:20,end:6,lunch:false}};
 assert.equal(onShift(1380,f),true);assert.equal(onShift(120,f),true);assert.equal(onShift(360,f),false);
 assert.equal(onShift(750),false);assert.equal(onShift(750,undefined,true),true);
 assert.equal(onShift(750,{schedule:{start:0,end:24,lunch:false}}),true);
 assert.equal(validSchedule({start:8,end:8,lunch:false}),false);
 assert.equal(validSchedule({start:-1,end:25,lunch:false}),false);
});
test('自定义夜班真实成交，班外停止并保留排班数据',()=>{
 let s=scenario(1320);s.town.facilities.shop={...emptyFacility(),schedule:{start:22,end:6,lunch:false}};
 for(let i=0;i<25;i++)s=step(s);
 assert.ok(s.town.totalSales>0);assert.deepEqual(s.town.facilities.shop.schedule,{start:22,end:6,lunch:false});
 s.town.minute=360;const sales=s.town.totalSales;s=step(s);
 assert.equal(s.town.totalSales,sales);assert.equal(s.town.facilities.shop.status,'休息中');
});
function scenario(minute=480){
 const buildings=[{id:'home',type:'house',x:-2,z:0},{id:'shop',type:'shop',x:1,z:0}].map(b=>({...b,world:'overworld',level:1,rotation:0,born:0}));
 const npcs=[0,1].map(i=>({...makeCitizen('n'+i,i,'home'),needs:{food:60,fun:0,shopping:0},wallet:100}));
 const town=initialTown();town.minute=minute;town.nextEvent=100000;
 const tiles={overworld:[-1,0,1].flatMap(x=>[-1,0,1].map(z=>({x,z}))),nether:[],end:[]};
 return {town,buildings,npcs,bag:{...emptyBag(),food:100},currency:1000,tick:0,weather:[],tiles};
}
function step(s){return {...s,...simulateTown(s)};}
test('真实寻路：店员到岗、居民到店付款，推进首次消费',()=>{
 let s=scenario();s=step(s);assert.equal(s.town.facilities.shop.status,'员工未到岗');
 for(let i=0;i<60;i++)s=step(s);
 assert.ok(s.town.totalSales>0);assert.ok(s.town.facilities.shop.dailyRevenue>0);
 assert.ok(s.npcs.some(n=>n.lastPurchase>0));assert.ok(s.town.facilities.shop.stock>=0);
});
test('晚间店员仍在柜台服务，22点后停止成交',()=>{
 let s=scenario(1080);for(let i=0;i<50;i++)s=step(s);
 assert.ok(s.town.totalSales>0);assert.equal(s.npcs.find(n=>n.workplace==='shop').arrivedAt,'shop');
 s.town.minute=1320;const sales=s.town.totalSales;s=step(s);
 assert.equal(s.town.facilities.shop.status,'休息中');assert.equal(s.town.totalSales,sales);
});
test('无库存、暂停或没有可走土地时不能虚构消费',()=>{
 for(const mode of ['empty','paused','blocked']){
 let s=scenario();if(mode==='empty')s.bag.food=0;
 if(mode==='paused')s.buildings[1].paused=true;
 if(mode==='blocked')s.tiles.overworld=[];
 for(let i=0;i<40;i++)s=step(s);
 assert.equal(s.town.totalSales,0,mode);assert.ok(s.town.facilities.shop.stock>=0);
 }
});
test('买不起时不成交、不扣库存',()=>{
 let s=scenario();s.npcs.forEach(n=>n.wallet=0);
 for(let i=0;i<20;i++)s=step(s);
 assert.equal(s.town.totalSales,0);assert.equal(s.town.facilities.shop.stock,12);
});
