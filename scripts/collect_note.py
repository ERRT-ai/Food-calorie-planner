"""Collect public note text or import transcribed text; never execute page scripts."""
import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ALLOWED = {'xhslink.cn', 'xhslink.com', 'www.xiaohongshu.com', 'xiaohongshu.com'}
AGENT = 'ChatGPT-User'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.description = []
        self.script = False
        self.buffer = []
        self.notes = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name', attrs.get('property')) in ('description', 'og:description'):
            self.description.append(attrs.get('content', ''))
        if tag == 'script':
            self.script = True
            self.buffer = []

    def handle_data(self, data):
        if self.script:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag != 'script' or not self.script:
            return
        self.script = False
        raw = ''.join(self.buffer).strip()
        marker = 'window.__INITIAL_STATE__='
        if raw.startswith(marker):
            raw = raw[len(marker):].rstrip(';')
        try:
            value = json.loads(raw)
        except (ValueError, TypeError):
            return  # No eval or execution of JavaScript (including non-JSON state).
        self.walk(value)

    def walk(self, value):
        if isinstance(value, dict):
            if isinstance(value.get('desc'), str) and isinstance(value.get('title'), str):
                self.notes.append(value['title'] + '\n' + value['desc'])
            for child in value.values():
                self.walk(child)
        elif isinstance(value, list):
            for child in value:
                self.walk(child)


def extract_text(html):
    page = Page()
    page.feed(html)
    return '\n'.join(dict.fromkeys(page.notes or page.description))


def parse_lines(text, brand, source_url, region, serving, captured_at):
    """One product per line: 菜名 540 kcal 蛋白质 25g. No portion inference."""
    records = []
    for line in text.splitlines():
        match = re.fullmatch(r'\s*(.+?)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(kcal|千卡|大卡)(.*)', line, re.I)
        if not match:
            continue
        name, energy, _, tail = match.groups()
        if re.search(r'\d\s*[-~～至]\s*$', name):
            continue
        name = name.strip(' :：-·')
        # A second energy value, range or serving conversion needs human review.
        if not name or re.search(r'\d\s*[-~～至]\s*$|\d\s*(?:kcal|千卡|大卡)', name + tail, re.I):
            continue
        def macro(label):
            m = re.search(label + r'\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(?:g|克)', tail, re.I)
            return float(m.group(1)) if m else None
        records.append({
            'id': hashlib.sha256((source_url + brand + line).encode()).hexdigest()[:16],
            'brand': brand, 'name': name, 'region': region, 'serving': serving,
            'kcal': float(energy), 'protein': macro('蛋白质'),
            'carbs': macro('碳水(?:化合物|物)?'), 'fat': macro('脂肪'),
            'basis': 'unknown' if serving == '未核实' else 'as_transcribed',
            'reviewStatus': 'pending',
            'source': {'type': 'community_note', 'title': '小红书第三方笔记（待核对）',
                       'url': source_url, 'capturedAt': captured_at,
                       'permission': '未核实；不代表品牌官方信息'},
            'evidence': line.strip(),
        })
    return records


def fetch_public(url):
    # No login cookies, signing APIs or verification bypass.
    if urlparse(url).scheme != 'https' or urlparse(url).hostname not in ALLOWED:
        raise ValueError('仅支持指定小红书 HTTPS 公开链接')
    from urllib.request import HTTPRedirectHandler, build_opener
    class PublicRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if urlparse(newurl).scheme != 'https' or urlparse(newurl).hostname not in ALLOWED:
                raise ValueError('重定向离开允许的公开域名，已停止')
            if urlparse(newurl).netloc != urlparse(req.full_url).netloc:
                raise ValueError('短链接跳转到新域名，请用浏览器打开后将完整公开笔记链接传给 --url')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    opener = build_opener(PublicRedirect())
    from urllib.robotparser import RobotFileParser
    origin = 'https://' + urlparse(url).netloc
    robots = RobotFileParser()
    try:
        with urlopen(Request(origin + '/robots.txt', headers={'User-Agent': AGENT}), timeout=15) as response:
            rules = response.read(500_000).decode('utf-8', errors='replace')
        robots.parse(rules.splitlines())
        if not robots.can_fetch(AGENT, url):
            raise ValueError('robots.txt 不允许读取；请导入有权使用的笔记文字')
    except HTTPError as error:
        if error.code != 404:
            raise ValueError('无法确认 robots.txt 规则，停止在线采集') from error
    with opener.open(Request(url, headers={'User-Agent': AGENT}), timeout=20) as response:
        body = response.read(4_000_001)
        if len(body) > 4_000_000:
            raise ValueError('页面超过 4 MB，已停止')
        html = body.decode('utf-8', errors='replace')
        final_url = response.url
    text = extract_text(html)
    if not text or any(marker in final_url for marker in ('/login', '/404', '/captcha')):
        raise ValueError('页面不可公开读取，或需要登录/验证；请使用 --text-file 导入笔记文字')
    return text, final_url


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True, help='原始笔记链接，始终保留作为来源')
    parser.add_argument('--brand', required=True, choices=['Wagas', 'Tims'])
    parser.add_argument('--text-file', type=Path, help='复制的正文或人工核对过的图片转录文字')
    parser.add_argument('--region', default='未核实')
    parser.add_argument('--serving', default='未核实')
    parser.add_argument('--output', type=Path, default=Path('work/note-candidates.json'))
    args = parser.parse_args()
    stamp = datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
    report = {'sourceUrl': args.url, 'capturedAt': stamp, 'status': 'blocked', 'records': []}
    try:
        if args.text_file:
            text, final_url = args.text_file.read_text(encoding='utf-8'), args.url
        else:
            text, final_url = fetch_public(args.url)
        records = parse_lines(text, args.brand, args.url, args.region, args.serving, stamp)
        report.update(status='needs_review' if records else 'no_nutrition_found', resolvedUrl=final_url, records=records)
        report['message'] = '候选数据需核对餐名、份量、地区与图片；不会自动写入小程序菜单'
    except (OSError, ValueError) as error:
        report['message'] = str(error)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'count': len(report['records']), 'output': str(args.output)}, ensure_ascii=False))
    return 1 if report['status'] == 'blocked' else 0


if __name__ == '__main__':
    sys.exit(main())
