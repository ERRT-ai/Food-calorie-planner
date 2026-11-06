const test = require('node:test');
const assert = require('node:assert/strict');
const allMenu = require('../miniprogram/data/menu');
const menu = allMenu.filter(x => x.brand === 'Wagas');
const { recommend } = require('../miniprogram/utils/recommend');
test('截图去重且未提供的营养值保持未知', () => {
  assert.equal(menu.length, 50);
  assert.equal(new Set(menu.map(x => x.name)).size, 50);
  assert.equal(menu.filter(x => Number.isFinite(x.kcal)).length, 49);
  assert.ok(menu.every(x => x.protein === null && x.carbs === null && x.fat === null));
  assert.deepEqual(menu, require('../data/wagas-xhs-screenshots.json'));
});
test('遮挡热量不用于推荐，蛋白质未知不满足筛选', () => {
  assert.ok(recommend(menu, { target: 170 }).every(x => x.name !== '越式辣味鸡肉牛油果粉卷'));
  assert.equal(recommend(menu, { target: 600, minProtein: 1 }).length, 0);
});
test('每块口径和额外米饭热量不被混淆', () => {
  assert.equal(menu.find(x => x.name === '蔓越莓白巧克力饼干').serving, '块');
  const soup = menu.find(x => x.name === '韩式牛肉泡菜汤');
  assert.equal(soup.kcal, 402);
  assert.match(soup.notes, /662/);
});

test('麦当劳截图保留50项、零热量与未知规格', () => {
  const mcd = allMenu.filter(x => x.brand === '麦当劳');
  assert.equal(mcd.length, 50);
  assert.equal(new Set(mcd.map(x => x.name)).size, 50);
  assert.deepEqual(mcd, require('../data/mcdonalds-xhs-screenshots.json'));
  assert.equal(mcd.find(x => x.name === '无糖可口可乐').kcal, 0);
  assert.equal(mcd.find(x => x.name === '麦乐鸡（5块）').serving, '5块');
  assert.ok(mcd.every(x => x.source.url === null && x.protein === null));
  assert.ok(recommend(allMenu, { target: 500, brand: '麦当劳' }).every(x => x.brand === '麦当劳'));
});
test('肯德基做法版本、区间和蛋白质筛选保留原口径', () => {
  const kfc = allMenu.filter(x => x.brand === '肯德基');
  assert.equal(kfc.length, 52);
  assert.deepEqual(kfc, require('../data/kfc-xhs-screenshots.json'));
  const original = kfc.find(x => x.name === '吮指原味鸡');
  assert.equal(original.kcal, null);
  assert.equal(original.kcalMin, 240);
  assert.equal(original.kcalMax, 320);
  assert.equal(kfc.find(x => x.name === '香辣鸡腿堡（去酱）').kcal, 433);
  assert.equal(kfc.find(x => x.name === '薄脆炸全鸡（去皮）').kcal, 500);
  const results = recommend(allMenu, { target: 500, minProtein: 20, brand: '肯德基' });
  assert.ok(results.length > 0);
  assert.ok(results.every(x => x.protein >= 20 && Number.isFinite(x.kcal)));
});
