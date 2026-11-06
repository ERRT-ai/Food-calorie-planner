const { calculateBowl } = require('../../utils/bowl');
let nextId = 1;
const emptyRow = () => ({ id: nextId++, categoryIndex: 0, name: '', basisIndex: 0, amount: '1', kcal: '', protein: '', carbs: '', fat: '', source: '' });
const numberOrNull = value => String(value).trim() === '' ? null : Number(value);
Page({
  data: { categories: ['主食', '蛋白质食材', '蔬菜', '撒料', '酱料'], bases: ['每份', '每100克'], rows: [], result: null, error: '', target: '600' },
  onLoad() { this.setData({ rows: [emptyRow()] }); },
  add() { this.setData({ rows: [...this.data.rows, emptyRow()], result: null }); },
  remove(e) { this.setData({ rows: this.data.rows.filter(row => row.id !== Number(e.currentTarget.dataset.id)), result: null }); },
  edit(e) {
    const { id, field } = e.currentTarget.dataset;
    const rows = this.data.rows.map(row => {
      if (row.id !== Number(id)) return row;
      const updated = { ...row, [field]: field.endsWith('Index') ? Number(e.detail.value) : e.detail.value };
      if (field === 'basisIndex') { updated.amount = ''; for (const key of ['kcal', 'protein', 'carbs', 'fat']) updated[key] = ''; }
      return updated;
    });
    this.setData({ rows, result: null, error: '' });
  },
  targetInput(e) { this.setData({ target: e.detail.value, result: null }); },
  calculate() {
    try {
      const target = numberOrNull(this.data.target);
      if (target !== null && (!Number.isFinite(target) || target <= 0)) throw new Error('目标热量须大于0，或留空');
      const result = calculateBowl(this.data.rows.map(row => ({
        id: row.id, name: row.name, category: this.data.categories[row.categoryIndex], basis: row.basisIndex === 0 ? 'serving' : 'per100g',
        amount: numberOrNull(row.amount), kcal: numberOrNull(row.kcal), protein: numberOrNull(row.protein),
        carbs: numberOrNull(row.carbs), fat: numberOrNull(row.fat), source: row.source.trim() || '用户手动录入（未核验）'
      })));
      const label = key => result.totals[key] === null ? '未提供完整数据' : result.totals[key] + (key === 'kcal' ? ' kcal' : ' g');
      const comparison = result.complete && target !== null ? (result.totals.kcal <= target ? '距目标还剩 ' + Math.round((target - result.totals.kcal) * 10) / 10 : '超过目标 ' + Math.round((result.totals.kcal - target) * 10) / 10) + ' kcal' : '';
      this.setData({ result: { ...result, energyLabel: label('kcal'), proteinLabel: label('protein'), carbsLabel: label('carbs'), fatLabel: label('fat'), missingLabel: result.missing.kcal.join('、'), comparison, lines: result.lines.map(line => ({ ...line, energyLabel: line.kcal === null ? '热量未知' : Math.round(line.kcal * 10) / 10 + ' kcal' })) }, error: '' });
    } catch (e) { this.setData({ error: e.message, result: null }); }
  }
});
