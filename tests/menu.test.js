const test = require('node:test');
const assert = require('node:assert/strict');
const menu = require('../miniprogram/data/menu');
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
