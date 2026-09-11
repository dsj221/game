import test from 'node:test';
import assert from 'node:assert/strict';
import {getModelGeometry} from '../src/buildings/modelGeometry.ts';
test('精细树木和箱子的法线/颜色有效，细节面数保持预算内',()=>{
 for(const [id,budget] of [['tree',35000],['warehouse',12000],['orchard',55000]]){
  const model=getModelGeometry(id),g=model.solid;assert.ok(g.getAttribute('position').count/3<budget,id);
  for(const name of ['normal','color'])assert.ok([...g.getAttribute(name).array].every(Number.isFinite),id+name);
  assert.equal(getModelGeometry(id),model,'重复建筑复用几何');
 }
});
