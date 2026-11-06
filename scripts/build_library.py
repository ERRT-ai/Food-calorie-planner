"""Build browsable food library and app dataset from screenshot transcriptions."""
import argparse
import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    records = []
    for path in sorted([*(ROOT / 'data').glob('*-xhs-screenshots.json'), *(ROOT / 'data').glob('*-official-foods.json')]):
        records.extend(json.loads(path.read_text(encoding='utf-8')))
    ids = [r['id'] for r in records]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate food IDs')
    for item in records:
        for key in ('kcal', 'protein', 'carbs', 'fat'):
            value = item[key]
            if value is not None and (not isinstance(value, (int, float)) or value < 0):
                raise ValueError(f'Invalid {key}: {item["id"]}')
    dump = json.dumps(records, ensure_ascii=False, indent=2)
    output = {'food-library/foods.json': dump + '\n',
              'miniprogram/data/menu.js': '// 自动生成：运行 python scripts/build_library.py；第三方截图参考值，非官方。\nmodule.exports = ' + dump + ';\n'}
    columns = ['id', 'brand', 'name', 'category', 'serving', 'kcal', 'kcalMin', 'kcalMax', 'kcalPer100g', 'sourceVersion', 'sourceWeightLabel', 'preparation', 'recommendationEligible', 'protein', 'carbs', 'fat', 'region', 'notes', 'sourceTitle', 'sourceUrl', 'transcribedAt', 'reviewStatus']
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=columns)
    writer.writeheader()
    for item in records:
        row = {key: item.get(key) for key in columns}
        row.update(sourceTitle=item['source']['title'], sourceUrl=item['source']['url'], transcribedAt=item['source']['transcribedAt'])
        writer.writerow(row)
    output['food-library/foods.csv'] = '\ufeff' + stream.getvalue()
    def cell(value):
        return '未提供' if value is None else str(value).replace('|', '\\|').replace('\n', ' ')
    brands = sorted({r['brand'] for r in records})
    index = ['# 食物热量库', '', f'共 **{len(records)} 条**，来自用户截图与品牌公开网页。按品牌、餐食及做法版本区分，来源与核对状态逐条保留。', '', '| 品牌 | 条目 | 热量可读 |', '| --- | ---: | ---: |']
    for brand in brands:
        items = [r for r in records if r['brand'] == brand]
        slug = {'Wagas': 'wagas', '麦当劳': 'mcdonalds', '肯德基': 'kfc', 'Tims': 'tims', '袁记云饺': 'yuanji', '喜家德': 'xijiade', '奈雪的茶': 'naixue', '和府捞面': 'hefu', '乡村基': 'country', '老乡鸡': 'laoxiangji', '未确认品牌食材': 'hotpot', '鸡柳大人': 'jiliu', '未确认品牌中式菜': 'unknown-dishes', '未确认品牌炸串': 'unknown-skewers', '超级碗FOODBOWL': 'foodbowl'}[brand]
        index.append(f'| [{brand}]({slug}.md) | {len(items)} | {sum(r["kcal"] is not None for r in items)} |')
        lines = [f'# {brand} 热量参考', '', '单位：热量 kcal，蛋白质、碳水、脂肪 g。未知不是零；份量以该行注明为准。', '', '| 餐食 | 类别 | 份量 | kcal | 蛋白质 | 碳水 | 脂肪 | 备注 |', '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |']
        for item in items:
            kcal = item['kcal']
            if kcal is None and 'kcalMin' in item:
                kcal = f'{item["kcalMin"]}–{item["kcalMax"]}'
            values = [item['name'], item['category'], item['serving'], kcal, item['protein'], item['carbs'], item['fat'], item['notes'] + ' 来源：' + item['source']['title']]
            lines.append('| ' + ' | '.join(cell(v) for v in values) + ' |')
        lines += ['', '## 来源', '', '；'.join(dict.fromkeys(r['source']['title'] for r in items)), '', '转录日期：' + items[0]['source']['transcribedAt'], '', items[0]['source']['url'] or '未提供原笔记链接；可在 JSON 中用 evidence 页码与位置对照用户截图。', '']
        output[f'food-library/{slug}.md'] = '\n'.join(lines)
    index += ['', '## 下载和使用', '', '- [CSV 表格](foods.csv)：Excel/WPS 导入，UTF-8 BOM；空单元格表示未知。', '- [JSON 数据](foods.json)：保留来源、页码、位置、区间和待核对备注。', '- 原始转录维护在 [`data/`](../data/)，执行 `python scripts/build_library.py` 同步所有导出与小程序。', '- 执行 `python scripts/build_library.py --check` 检查导出是否与原始转录一致。', '', '## 数据口径', '', '热量按图中对应份量记录，不是统一每100克。去酱、带皮／去皮属于独立版本，不代表可互相累加。区间不取平均值。营养约数保留来源说明。截图发布日期、地区和当前在售状态未核实。水印遮挡值留空，图片热量与宏量营养素不一致时保留原值并备注。', '', '多数条目的宏量营养值暂缺；肯德基及部分麦当劳限定餐品按较清晰截图转录，不表示经过官方验证。部分餐食、包装与饮料规格仍待核对。', '', '不使用 USDA。原图及原作者内容的再分发许可未核实，本目录仅包含结构化转录和来源说明；未上传整张截图。', '']
    output['food-library/README.md'] = '\n'.join(index)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    stale = []
    for relative, contents in build().items():
        path = ROOT / relative
        if args.check:
            if not path.exists() or path.read_bytes() != contents.encode('utf-8'):
                stale.append(relative)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(contents.encode('utf-8'))
    if stale:
        raise SystemExit('Out of date: ' + ', '.join(stale))
    print('Library exports match source data.' if args.check else 'Built food library and app dataset.')


if __name__ == '__main__':
    main()
