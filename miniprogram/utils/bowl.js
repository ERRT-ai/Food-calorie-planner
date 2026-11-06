const nutrients = ['kcal', 'protein', 'carbs', 'fat'];
function calculateBowl(components) {
  if (!Array.isArray(components) || components.length === 0) throw new Error('请至少添加一项配料');
  const sums = Object.fromEntries(nutrients.map(key => [key, 0]));
  const missing = Object.fromEntries(nutrients.map(key => [key, []]));
  const lines = components.map((item, index) => {
    if (!item.name || !item.name.trim()) throw new Error(`请填写第${index + 1}项配料名称`);
    if (!['serving', 'per100g'].includes(item.basis)) throw new Error('请选择按份或按100克计算');
    if (!Number.isFinite(item.amount) || item.amount <= 0) throw new Error('实际份数或克数必须大于0');
    const factor = item.basis === 'per100g' ? item.amount / 100 : item.amount;
    const result = { ...item, name: item.name.trim() };
    for (const key of nutrients) {
      const value = item[key];
      if (value == null) { missing[key].push(result.name); result[key] = null; }
      else {
        if (!Number.isFinite(value) || value < 0) throw new Error('营养数值必须是非负数，未知请留空');
        result[key] = value * factor;
        sums[key] += result[key];
      }
    }
    return result;
  });
  const totals = Object.fromEntries(nutrients.map(key => [key, missing[key].length ? null : Math.round(sums[key] * 10) / 10]));
  const subtotals = Object.fromEntries(nutrients.map(key => [key, Math.round(sums[key] * 10) / 10]));
  return { totals, subtotals, missing, lines, complete: totals.kcal !== null };
}
module.exports = { calculateBowl };
