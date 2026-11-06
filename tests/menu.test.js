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
test('Tims重复项合并，辣味版本与配料口径独立', () => {
  const tims = allMenu.filter(x => x.brand === 'Tims');
  assert.equal(tims.length, 49);
  assert.deepEqual(tims, require('../data/tims-xhs-screenshots.json'));
  assert.equal(tims.find(x => x.name === '菌菇鸡腿肉蔬菜卷').evidence.occurrences.length, 2);
  assert.equal(tims.find(x => x.name === '烤牛肉贝果堡（辣味）').kcal, 595);
  assert.equal(tims.find(x => x.name === '烤牛肉贝果堡（不辣）').kcal, 550);
  assert.equal(tims.find(x => x.name === '原味奶油芝士').serving, '1份（克重未提供）');
  assert.ok(tims.every(x => x.protein === null && x.carbs === null && x.fat === null));
});
test('袁记按原图保留份量、区间和酱料增量', () => {
  const yuanji = allMenu.filter(x => x.brand === '袁记云饺');
  assert.equal(yuanji.length, 95);
  assert.deepEqual(yuanji, require('../data/yuanji-xhs-screenshots.json'));
  const range = yuanji.find(x => x.name === '鲜虾蟹籽云吞（标准份）');
  assert.equal(range.kcal, null);
  assert.deepEqual([range.kcalMin, range.kcalMax], [675, 780]);
  const inconsistent = yuanji.find(x => x.name === '荠菜鲜肉饺（小份）');
  assert.equal(inconsistent.kcal, 520);
  assert.match(inconsistent.notes, /待核对/);
  assert.equal(yuanji.find(x => x.name === '香芋鲜肉饺（小份）').kcal, 480);
  assert.equal(yuanji.find(x => x.name === '花生酱').category, '酱料');
  assert.equal(yuanji.find(x => x.name === '鲜虾蟹籽云吞面（不喝汤）').kcal, 519);
  assert.ok(yuanji.every(x => x.protein === null));
});
test('喜家德按来源和份量保留不同数值', () => {
  const items = allMenu.filter(x => x.brand === '喜家德');
  assert.equal(items.length, 45);
  assert.equal(items.filter(x => x.sourceVersion === 'brand_account').length, 12);
  const sameName = items.filter(x => x.name === '喜三鲜水饺');
  assert.deepEqual(sameName.map(x => x.kcal), [535, 669, 720, 48]);
  const soup = items.find(x => x.name === '豆米鲜蔬锅');
  assert.equal(soup.kcal, 370);
  assert.equal(soup.kcalPer100g, 61);
  assert.equal(items.find(x => x.name === '凯里鲜蔬锅').kcalPer100g, null);
  assert.ok(items.every(x => x.protein === null));
});
