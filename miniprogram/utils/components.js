// Keep source serving units intact when importing ingredients into a combination.
function fromLibrary(item) {
  const perServing = Number.isFinite(item.kcal);
  if (!perServing && !Number.isFinite(item.kcalPer100g)) throw new Error('此条目没有可用于计算的单值热量');
  return {
    libraryId: item.id, name: item.name, basisIndex: perServing ? 0 : 1,
    amount: perServing ? '1' : '',
    kcal: String(perServing ? item.kcal : item.kcalPer100g),
    protein: perServing && item.protein != null ? String(item.protein) : '',
    carbs: perServing && item.carbs != null ? String(item.carbs) : '',
    fat: perServing && item.fat != null ? String(item.fat) : '',
    baseServing: perServing ? item.serving : '100g',
    needsConfirmation: perServing && /未知|未提供|未核实/.test(item.serving || ''),
    portionConfirmed: false,
    source: `${item.brand} · ${item.source.title}${item.source.url ? ' · ' + item.source.url : ''}`,
    sourceNotes: item.notes || ''
  };
}
function searchComponents(items, query) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return items.filter(item => (Number.isFinite(item.kcal) || Number.isFinite(item.kcalPer100g)) &&
    `${item.brand} ${item.name}`.toLowerCase().includes(term)).slice(0, 30);
}
module.exports = { fromLibrary, searchComponents };
