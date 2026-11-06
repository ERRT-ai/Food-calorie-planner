const test = require('node:test');
const assert = require('node:assert/strict');
const { fromLibrary, searchComponents } = require('../miniprogram/utils/components');
const { calculateBowl } = require('../miniprogram/utils/bowl');
const item = { id:'test',name:'测试豆皮',brand:'测试来源',kcal:50,protein:null,serving:'1份（克重未知）',source:{title:'测试图'}};
test('图示份量需确认，确认后可以作为组件相加',()=>{
 const row = fromLibrary(item);
 assert.equal(row.needsConfirmation,true);
 assert.throws(()=>calculateBowl([{...row,protein:null,carbs:null,fat:null,basis:'serving',amount:1,kcal:50}]));
 assert.equal(calculateBowl([{...row,protein:null,carbs:null,fat:null,basis:'serving',amount:2,kcal:50,portionConfirmed:true}]).totals.kcal,100);
});
test('每100g数据不沿用每份的蛋白质',()=>{
 const row = fromLibrary({...item,kcal:null,kcalPer100g:150,protein:20});
 assert.equal(row.basisIndex,1);
 assert.equal(row.amount,'');
 assert.equal(row.protein,'');
});
test('零热量保留、区间拒绝，检索按品牌与名称',()=>{
 assert.equal(fromLibrary({...item,kcal:0}).kcal,'0');
 assert.throws(()=>fromLibrary({...item,kcal:null,kcalMin:10,kcalMax:20}));
 assert.equal(searchComponents([item],'豆皮').length,1);
 assert.equal(searchComponents([item],'').length,0);
});
