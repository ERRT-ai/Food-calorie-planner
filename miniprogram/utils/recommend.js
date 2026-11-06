function recommend(items, { target, minProtein = 0, brand = '全部' }) {
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(minProtein) || minProtein < 0) throw new Error('请输入有效的热量和蛋白质目标');
  return items.filter(item => item.recommendationEligible !== false && Number.isFinite(item.kcal) && item.kcal > 0 &&
    (brand === '全部' || item.brand === brand) &&
    (minProtein === 0 || (Number.isFinite(item.protein) && item.protein >= minProtein)))
    .map(item => ({ ...item, difference: Math.round(Math.abs(item.kcal - target)),
      proteinLabel: item.protein == null ? '未提供' : item.protein + ' g',
      carbsLabel: item.carbs == null ? '未提供' : item.carbs + ' g',
      fatLabel: item.fat == null ? '未提供' : item.fat + ' g' }))
    .sort((a, b) => a.difference - b.difference).slice(0, 10);
}
module.exports = { recommend };
