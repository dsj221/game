import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTown,emptyFacility,emptyLedger} from '../src/data/town.ts';
import {townAdvice} from '../src/systems/townAdvice.ts';
test('经营诊断排序、暂停/其他世界过滤，不在正常休息时误报缺工',()=>{
 const t=initialTown();t.metrics.foodDays=.1;t.metrics.capacity=20;
 const b=(id,world='overworld',paused=false)=>({id,type:'bakery',world,paused});
 t.facilities.a={...emptyFacility(),status:'缺少原料'};t.facilities.b={...emptyFacility(),status:'员工不足'};t.facilities.c={...emptyFacility(),status:'休息中'};
 const list=townAdvice(t,[b('a'),b('b','nether'),b('c'),b('b','overworld',true)]);
 assert.deepEqual(list.map(a=>a.id),['food','input:a']);assert.equal(list[1].building,'a');
});
test('连续亏损只看已结算三天，升级建议独立显示',()=>{
 const t=initialTown();t.metrics.foodDays=3;t.metrics.capacity=20;t.upgradeReady=true;
 t.reports=[1,2,3].map(day=>({...emptyLedger(),day,profit:-10,population:2,happiness:78}));
 assert.deepEqual(townAdvice(t,[]).map(a=>a.id),['level','loss']);
 t.reports[0].profit=1;assert.deepEqual(townAdvice(t,[]).map(a=>a.id),['level']);
});
