import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('collector', Path(__file__).parents[1] / 'scripts/collect_note.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CollectorTest(unittest.TestCase):
    def parse(self, text):
        return collector.parse_lines(text, 'Wagas', 'https://example.test/note', '未核实', '未核实', '2026-11-06')

    def test_missing_macros_and_portion_are_unknown(self):
        item = self.parse('测试餐碗 540 kcal')[0]
        self.assertIsNone(item['protein'])
        self.assertEqual(item['basis'], 'unknown')
        self.assertEqual(item['reviewStatus'], 'pending')

    def test_macros_and_no_calorie_invention(self):
        items = self.parse('测试餐碗 540大卡 蛋白质25g 碳水60克 脂肪20g\n另一餐 蛋白质30g')
        self.assertEqual(len(items), 1)
        self.assertEqual((items[0]['protein'], items[0]['carbs'], items[0]['fat']), (25, 60, 20))

    def test_range_needs_manual_review(self):
        self.assertEqual(self.parse('测试餐 400-500 kcal'), [])

    def test_json_state_and_html_entities(self):
        self.assertEqual(collector.extract_text('<script>window.__INITIAL_STATE__={"note":{"title":"标题","desc":"测试餐 540kcal"}};</script>'), '标题\n测试餐 540kcal')
        self.assertEqual(collector.extract_text('<meta name="description" content="A &amp; B">'), 'A & B')

    def test_no_execution_of_javascript(self):
        self.assertEqual(collector.extract_text('<script>window.__INITIAL_STATE__=alert(1)</script>'), '')


if __name__ == '__main__':
    unittest.main()
