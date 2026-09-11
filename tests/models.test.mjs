import test from "node:test";
import assert from "node:assert/strict";
import { definitions } from "../src/data/definitions.ts";
import { getModelGeometry } from "../src/buildings/modelGeometry.ts";
import { buildingIconKeys } from '../src/data/buildingIcons.ts';
test('建筑严格使用原图映射，共用原图的设施共用对应模型',()=>{
  for(const d of definitions){
    const key=buildingIconKeys[d.id];
    if(key)assert.equal(getModelGeometry(d.id),getModelGeometry(`icon_${key}`),d.id);
  }
});
test("全部可建造建筑拥有有限、接地、位于占地范围内的实体几何", () => {
  for (const d of definitions) {
    const model = getModelGeometry(d.id);
    assert.ok(model.solid.getAttribute("position").count > 0, d.id);
    for (const mesh of [model.solid, model.lights].filter(Boolean)) {
      assert.ok(
        [...mesh.getAttribute("position").array].every(Number.isFinite),
        d.id,
      );
      const box = mesh.boundingBox;
      assert.ok(box.min.x >= -0.471 && box.max.x <= 0.471, `${d.id} x`);
      assert.ok(box.min.z >= -0.471 && box.max.z <= 0.471, `${d.id} z`);
      assert.ok(box.min.y >= -0.001, `${d.id} underground`);
    }
    assert.equal(getModelGeometry(d.id), model, "geometry cache");
  }
  console.log(`已覆盖 ${definitions.length} 种建筑模型`);
});
