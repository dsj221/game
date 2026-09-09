import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expansionTotal, expansionPrice } from '../src/systems/economy.ts';
test('批量扩建逐块计价，空选不收费', () => {
  assert.equal(expansionTotal(9, 0), 0);
  assert.equal(expansionTotal(9, 2), 648);
  assert.equal(expansionTotal(12, 3), [12,13,14].reduce((sum,n)=>sum+expansionPrice(n),0));
});
