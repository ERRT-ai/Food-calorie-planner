# 今晚吃多少 · Dinner Calorie Planner

微信原生小程序：参考 Wagas、Tims 等品牌每份餐食的热量推荐晚餐，并展示有公开来源的蛋白质、碳水和脂肪。

## 当前状态

可运行的基础版本：目标热量输入、最低蛋白质筛选、品牌筛选、按热量差排序、空状态和数据来源展示。
已录入用户提供的小红书截图：50 款 Wagas 餐品，其中 49 款有可读热量，1 款因水印遮挡留空。均为第三方参考值，非品牌官方数据。蛋白质、碳水、脂肪未提供。Tims 暂无数据。 不使用 USDA，也不将估算值冒充品牌官方数据。尚未完成微信开发者工具实机验证或微信审核发布。

## 开发

1. 微信开发者工具导入仓库根目录。
2. 使用测试号体验；正式开发需在本地配置自己的 AppID。
3. 在 `miniprogram/data/menu.js` 录入经核验且获准使用的数据。
4. Node.js 18+ 执行 `npm test` 验证推荐算法。

## 菜单数据约定

每条记录包含 `id`, `brand`, `name`, `region`, `serving`, `kcal`, `protein`, `carbs`, `fat` 和 `source`。
`source` 包含 `title`, `url`, `verifiedAt`（YYYY-MM-DD）, `permission`（数据使用依据）。
营养值均为**每份**，热量单位 kcal，其他单位 g。未知值为 null，不是 0。
品牌数据必须记录地区、份量、官方出处与更新时间，不混用不同地区菜单；公开可查看不等于可批量转载。
蛋白质要求大于 0 时，排除蛋白质未知的餐食。

## 下一步

确定品牌所在地区与官方数据来源，核验使用权限后录入菜单；再扩展餐食组合、忌口和在家复刻食谱。

## 小红书公开笔记采集（Python 3.9+，无第三方依赖）

```bash
python scripts/collect_note.py --brand Wagas --url 'https://xhslink.cn/o/1wjbyWMuJP1'
# 若页面不可读：将有权使用的正文或人工核对的图片文字保存到 work/note.txt
python scripts/collect_note.py --brand Wagas --url '原始笔记链接' --text-file work/note.txt
python -m unittest discover -s tests -p 'test_*.py'
```

转录格式为一行一道菜，例如：`测试餐碗 540 kcal 蛋白质 25g`（此行仅展示格式，不是真实品牌数据）。
默认结果保存到 `work/note-candidates.json`，包含来源、采集时间、原始证据行和待审核状态。
来源类型始终标为第三方笔记；未提供的蛋白质、碳水、脂肪为 null。
份量和地区默认“未核实”，可在核对原文后通过 `--serving`、`--region` 设置。
不推断每100克到每份的换算，不把区间热量当成精确数值。
脚本检查 robots.txt；不会登录、使用 Cookie、生成签名、绕过验证或自动 OCR 配图。
跨域短链接跳转会停止，需提供浏览器打开后的完整公开链接。
只处理公开元描述和严格 JSON 状态中的文字，图片、动态加载及非 JSON 脚本可能无法解析。
候选数据不会自动写入正式菜单。需要人工核对菜名、份量、营养口径与数据使用依据。

本次检查：Wagas 与 Tims 中国官网未找到可直接采集的完整营养表；FatSecret 搜索结果中有部分 Tims 记录，但不是品牌官方数据，未写入菜单。用户提供的小红书短链接在当前环境返回 404，未提取到笔记数值。
