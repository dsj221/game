import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneryLayout} from '../src/world/sceneryLayout.ts';
const tiles=Array.from({length:9},(_,i)=>({x:i%3-1,z:Math.floor(i/3)-1,born:0}));
test('地景由坐标决定，数组排序不改变分布',()=>{
 const a=sceneryLayout(tiles,[]),b=sceneryLayout([...tiles].reverse(),[]);
 for(const kind of ['lakes','grass'])assert.deepEqual(a[kind].map(JSON.stringify).sort(),b[kind].map(JSON.stringify).sort());
});
test('建造仅移除占用位置，不让湖泊转移或草丛重排',()=>{
 const before=sceneryLayout(tiles,[]);assert.ok(before.lakes.length);
 const p=before.lakes[0];const after=sceneryLayout(tiles,[{...p}]);
 assert.deepEqual(after.lakes,before.lakes.filter(v=>v.x!==p.x||v.z!==p.z));
 assert.deepEqual(after.grass,before.grass);
});
test('扩地保留原有地景',()=>{
 const before=sceneryLayout(tiles,[]),after=sceneryLayout([...tiles,{x:2,z:0,born:0}],[]);
 for(const kind of ['lakes','grass'])for(const p of before[kind])assert.ok(after[kind].some(q=>q.x===p.x&&q.z===p.z));
});
