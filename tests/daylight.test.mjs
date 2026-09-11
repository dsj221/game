import test from 'node:test';
import assert from 'node:assert/strict';
import {daylight,lightBlend} from '../src/systems/daylight.ts';
test('清晨黄昏连续渐变，午夜无回跳，日夜端点稳定',()=>{
 assert.equal(daylight(0),0);assert.equal(daylight(24),0);assert.equal(daylight(12),1);
 for(const h of [4.5,6,8,17,19,20.5,24])assert.ok(Math.abs(daylight(h+.001)-daylight(h-.001))<.002);
 for(let h=4.5;h<8;h+=.05)assert.ok(daylight(h+.05)>=daylight(h));
 for(let h=17;h<20.5;h+=.05)assert.ok(daylight(h+.05)<=daylight(h));
 assert.ok(daylight(12,true)<daylight(12));
});
test('平滑系数不随帧率改变速度，长时间切后台不会单帧跳变',()=>{
 const advance=rate=>{let v=0;for(let i=0;i<rate;i++)v+=(1-v)*lightBlend(1/rate);return v;};
 assert.ok(Math.abs(advance(30)-advance(120))<1e-10);assert.ok(lightBlend(30)<.25);
});
