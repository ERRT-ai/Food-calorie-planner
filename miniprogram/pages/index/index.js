const menu = require('../../data/menu');
const { recommend } = require('../../utils/recommend');
Page({
  data: { target: '600', minProtein: '0', brands: ['全部', 'Wagas', '麦当劳', '肯德基', 'Tims', '袁记云饺', '喜家德', '奈雪的茶'], brandIndex: 0, results: [], error: '', searched: false },
  onTarget(e) { this.setData({ target: e.detail.value }); },
  onProtein(e) { this.setData({ minProtein: e.detail.value }); },
  onBrand(e) { this.setData({ brandIndex: Number(e.detail.value) }); },
  search() {
    try {
      const target = this.data.target.trim() ? Number(this.data.target) : NaN;
      const minProtein = this.data.minProtein.trim() ? Number(this.data.minProtein) : NaN;
      const results = recommend(menu, { target, minProtein, brand: this.data.brands[this.data.brandIndex] });
      this.setData({ results, error: '', searched: true });
    } catch (e) { this.setData({ error: e.message, results: [], searched: false }); }
  }
});
