const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBowl } = require('../miniprogram/utils/bowl');
const serving = (name, kcal, amount = 1) => ({ name, kcal, amount, basis: 'serving' });
test('按实际份量、克重和酱料相加', () => {
  const r = calculateBowl([serving('测试主食',200,.5), { name:'测试肉', kcal:150, basis:'per100g', amount:120 }, serving('测试酱料',40,.5)]);
  assert.equal(r.totals.kcal,300);
  assert.equal(r.totals.protein,null);
});
test('缺项不给出整碗总量，零热量有效', () => {
  const r = calculateBowl([serving('已知',100),serving('未知',null),serving('零',0)]);
  assert.equal(r.totals.kcal,null);
  assert.equal(r.subtotals.kcal,100);
  assert.deepEqual(r.missing.kcal,['未知']);
});
test('蛋白质独立累计，不从热量反推', () => {
  const r = calculateBowl([{...serving('测试配料',100),protein:20},{...serving('测试半份',50,.5),protein:10}]);
  assert.equal(r.totals.protein,25);
  assert.equal(r.totals.carbs,null);
});
test('验证单位、名称、份量和非有限数值', () => {
  assert.throws(()=>calculateBowl([]));
  for (const item of [serving('',100),serving('测试',100,0),serving('测试',-1),serving('测试',NaN),{...serving('测试',100),basis:'unknown'}]) assert.throws(()=>calculateBowl([item]));
});
