import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateMainWorld} from '../src/systems/mainWorld.ts';
import {playableDefinitions} from '../src/data/definitions.ts';
import {initialTown,emptyFacility} from '../src/data/town.ts';
import {settlementTiles} from '../src/data/settlement.ts';
test('新局只有主世界地块，商城不含退休建筑',()=>{
 assert.equal(settlementTiles().nether.length,0);assert.equal(settlementTiles().end.length,0);
 assert.ok(playableDefinitions.every(d=>!['portal','endportal','core','netherplant','obsidian'].includes(d.id)));
});
test('旧存档迁移只清理退休世界，主世界设施与资源进度不受影响',()=>{
 const town=initialTown();town.facilities={house:emptyFacility(),portal:emptyFacility()};town.totalSales=42;
 const d={town,buildings:[{id:'house',type:'house',world:'overworld'},{id:'portal',type:'portal',world:'overworld'},{id:'other',type:'farm',world:'nether'}],npcs:[{id:'a',world:'overworld',workplace:'portal'},{id:'b',world:'end',workplace:'other'}],world:{current:'end',visited:['overworld','end'],tiles:{overworld:[{x:0,z:0}],nether:[{}],end:[{}]}},game:{program:'异界奇遇',achievements:['first','end','worlds']}};
 migrateMainWorld(d);assert.equal(d.world.current,'overworld');assert.deepEqual(d.buildings.map(b=>b.id),['house']);assert.equal(d.npcs.length,1);assert.equal(d.npcs[0].workplace,'');assert.equal(d.town.totalSales,42);assert.deepEqual(Object.keys(d.town.facilities),['house']);assert.deepEqual(d.game.achievements,['first']);assert.equal(d.game.program,'田园时光');
 assert.deepEqual(migrateMainWorld(structuredClone(d)),d);
});
