import test from 'node:test';
import assert from 'node:assert/strict';
import {roadStyles,isRoad} from '../src/data/roads.ts';
import {navigationGrid,findRoute} from '../src/npcs/navigation.ts';
import {connectedBuildings} from '../src/systems/economy.ts';
import {getRoadGeometry} from '../src/buildings/modelGeometry.ts';
import {initialTown,emptyBag} from '../src/data/town.ts';
import {settlementBuildings,settlementNpcs} from '../src/data/settlement.ts';
import {simulateTown} from '../src/game/TownSimulation.ts';
test('每种道路都支持寻路与仓库物流，路口形状缓存相互独立',()=>{
 for(const type of Object.keys(roadStyles)){
  assert.ok(isRoad(type));const buildings=[{id:'w',type:'warehouse',x:-1,z:0,world:'overworld',rotation:0},{id:'r',type,x:0,z:0,world:'overworld',rotation:0},{id:'f',type:'farm',x:1,z:0,world:'overworld',rotation:0}];
  const grid=navigationGrid([{x:0,z:0,born:0}],buildings);assert.equal(grid.get('0,0'),roadStyles[type].weight);assert.ok(findRoute({x:0,z:-1},[{x:0,z:1}],grid));assert.ok(connectedBuildings(buildings).includes('f'));
  assert.notEqual(getRoadGeometry(type,3),getRoadGeometry(type,5));assert.equal(getRoadGeometry(type,15),getRoadGeometry(type,15));
 }
});
test('新增陶艺工坊真实消耗原料并生产家具',()=>{
 const buildings=[...settlementBuildings(),{id:'pot',type:'pottery',x:0,z:0,rotation:0,world:'overworld',level:1,born:0}];
 let s={town:initialTown(),buildings,npcs:settlementNpcs(buildings),bag:{...emptyBag(),wood:30,stone:18,food:20},currency:2000,tick:0,weather:[]};s.town.minute=500;
 for(let i=0;i<100;i++)s=simulateTown(s);
 assert.ok(s.bag.furniture>0);assert.ok(s.bag.stone<18);assert.ok(s.town.facilities.pot.costs>0);
});
