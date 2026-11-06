const test = require('node:test');
const assert = require('node:assert/strict');
const { recommend } = require('../miniprogram/utils/recommend');
const items = [{id:'a',brand:'测试品牌',kcal:500,protein:null},{id:'b',brand:'测试品牌',kcal:610,protein:30},{id:'c',brand:'其他',kcal:590,protein:20}];
test('按每份热量差排序',()=>assert.deepEqual(recommend(items,{target:600}).map(x=>x.id),['b','c','a']));
test('蛋白质未知不能满足最低要求',()=>assert.deepEqual(recommend(items,{target:500,minProtein:25}).map(x=>x.id),['b']));
test('筛选品牌并保留未知状态',()=>assert.equal(recommend(items,{target:500,brand:'测试品牌'})[0].proteinLabel,'未提供'));
test('拒绝无效输入',()=>{for(const target of [0,-1,NaN,Infinity]) assert.throws(()=>recommend(items,{target}));});
