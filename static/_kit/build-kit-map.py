#!/usr/bin/env python3
"""pages.json -> static/_kit/kit-map.js (키트 화면 사이 링크 연결용 지도). 키트 전용, 실제 화면에 들어가지 않음.
쓰는 법: 저장소 맨 위에서  python3 static/_kit/build-kit-map.py"""
import json, os, unicodedata
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pages = json.load(open(os.path.join(root, 'pages.json'), encoding='utf-8'))
rows = []
for x in pages:
    r = x['rec']
    rows.append({'e': x['edition'], 'u': r['url'], 's': r['state'] or '',
                 'f': unicodedata.normalize('NFC', x['file'])})
out = os.path.join(root, 'static', '_kit', 'kit-map.js')
with open(out, 'w', encoding='utf-8') as fh:
    fh.write('/* 자동 생성(build-kit-map.py) — 직접 고치지 마세요. 판 e · 원래 주소 u · 상태 s · 키트 파일 f */\n')
    fh.write('window.KIT_MAP=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(rows), 'rows ->', out)
