import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildingCells,rotatedFootprint} from '../src/data/footprints.ts';
import {canPlace,connectedBuildings} from '../src/systems/economy.ts';
import {sceneryLayout} from '../src/world/sceneryLayout.ts';
const tiles=Array.from({length:9},(_,i)=>({x:i%3-1,z:Math.floor(i/3)-1,born:0}));
const b={id:'large',type:'warehouse',x:0,z:0,rotation:0,footprint:[2,2]};
test('占地旋转交换长宽，旧建筑保留单格',()=>{
 assert.deepEqual(rotatedFootprint([3,2],1),[2,3]);
 assert.equal(buildingCells(b).length,4);
 assert.equal(buildingCells({...b,footprint:undefined}).length,1);
});
test('建筑所有占地均参与边界与碰撞，搬迁忽略自身',()=>{
 assert.equal(canPlace(1,1,tiles,[b]),false);
 assert.equal(canPlace(4,3,tiles,[],undefined,[2,2]),false);
 assert.equal(canPlace(3,4,tiles,[],undefined,[2,1],0),true);
 assert.equal(canPlace(3,4,tiles,[],undefined,[2,1],1),false);
 assert.equal(canPlace(0,0,tiles,[b],'large',[2,2]),true);
});
test('道路可连接大型仓库远端边缘',()=>{
 const road={id:'road',type:'road',x:2,z:1,rotation:0};
 assert.ok(connectedBuildings([b,road]).includes('road'));
});
test('地景避开建筑完整占地',()=>{
 const occupied=new Set(buildingCells(b).map(p=>`${p.x},${p.z}`));
 const s=sceneryLayout(tiles,[b]);
 for(const p of [...s.lakes,...s.grass])assert.equal(occupied.has(`${p.x},${p.z}`),false);
});
