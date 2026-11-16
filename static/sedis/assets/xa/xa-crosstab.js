/*
 * 교차분석(sub_0201, root/sedis#9) 화면 스크립트 — 조각 루트 [data-sedis-screen="xa-crosstab"] 안에서 돈다.
 *  - API: {data-api}/crosstab/… (누리지음이 서명해 sedis-app /_cms/api/public/crosstab/** 로 넘긴다, 연구원만)
 *    surveys/{ds}(문항·하위 변수 칩) · topics/{tpc}/items(주제별 문항) · table(집계) · csv(내려받기 + 기록) · downloads(그래프 이미지 기록)
 *  - 상태는 주소 매개변수 ds·it·d·f·c·s(+tab)로 남긴다(설계서 sub_0201-01 — 새로고침·공유 때 서버가 검증해 복원)
 *  - 하위 변수 칩: 끌어다 놓기(분석 차원·조건/필터·되돌리기) + 키보드 대안(칩 누름 = 분석 차원, 놓인 칩 누름 = 제외)
 *    조건/필터 변수는 분석 차원에 남겨 둔 채 파란색(is-active)으로 표시하고, 그 칩을 누르면 조건만 제외한다(#116 디자인팀 협의 11/09).
 *    조건/필터 = 분석 차원의 부분집합 — 분석 차원에서 빠지면(되돌리기·교체) 그 조건도 빠진다
 *  - 통계표 머리글 합치기(단일 문항만, 프로토타입 mergePivot): 열 = 응답 범주 코드 묶음(cm), 행 = 차원 값 키 묶음(rm).
 *    머리글 끌어다 놓기로 합치고(설계서 sub_0201-07), 합친 칸 ✕ = 나누기. 키보드 대안(머리글 선택 → 「선택한 칸 합치기」)은 설계서·시안에 없어 뺐다(11/09).
 *    조사·문항·차원이 바뀌면 초기화. 주소에는 남기지 않고 table·csv·downloads 요청에만 붙인다
 *  - 그래프는 cm-chart.js 가 통계표(#cross_table)를 읽어 그린다 — 표를 다시 그린 뒤 render().
 *    머리글 칸의 글자(textContent)가 곧 그래프 이름이라 ✕ 는 글자 없는 SVG 로 둔다
 *  - 값은 textContent 로만 넣는다(문항명·라벨은 원천 표기 그대로라 HTML 로 해석하지 않는다)
 */
(function () {
  'use strict';

  var MAX_DIMS = 3;

  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) { e.textContent = text; }
    return e;
  }

  function init(root) {
    var api = (root.getAttribute('data-api') || '') + '/crosstab';
    var st = {
      tab: root.getAttribute('data-tab') || 'survey',
      ds: root.getAttribute('data-ds') || null,
      it: root.getAttribute('data-it') || null,
      dims: (root.getAttribute('data-d') || '').split(',').filter(Boolean),
      filters: parseFilters(root.getAttribute('data-f')),
      c: root.getAttribute('data-c') || 'AND',
      s: root.getAttribute('data-s') || 'value',
      meta: null, items: [], topicItems: [], topic: null, result: null, shown: null, seq: 0,
      // 머리글 합치기: cm·rm = [[구성 키…], …]
      cm: [], rm: [], mergeSig: ''
    };
    var live = el('p', { 'class': 'sr-only', 'aria-live': 'polite' });
    root.appendChild(live);
    function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

    // ───── 요청 ─────
    function get(path) {
      return fetch(api + path, { credentials: 'same-origin', cache: 'no-store', headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          return res.text().then(function (t) {
            var data = null;
            try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
            if (!res.ok) { throw new Error(data && data.message ? data.message : '응답 ' + res.status); }
            return data;
          });
        });
    }
    function query() {
      var q = new URLSearchParams();
      if (st.ds) { q.set('ds', st.ds); }
      if (st.it) { q.set('it', st.it); }
      if (st.dims.length) { q.set('d', st.dims.join(',')); }
      var f = filterParam();
      if (f) { q.set('f', f); }
      if (st.c !== 'AND') { q.set('c', st.c); }
      if (st.s !== 'value') { q.set('s', st.s); }
      return q;
    }
    function dataQuery() {
      var q = query();
      if (st.cm.length) { q.set('cm', st.cm.map(function (g) { return g.join('.'); }).join('~')); }
      if (st.rm.length) { q.set('rm', st.rm.map(function (g) { return g.join('.'); }).join('~')); }
      return q;
    }
    function filterParam() {
      return Object.keys(st.filters).filter(function (k) { return st.filters[k].length; })
        .map(function (k) { return k + ':' + st.filters[k].join('.'); }).join('~');
    }
    function syncUrl() {
      var q = query();
      if (st.tab === 'topic') { q.set('tab', 'topic'); }
      var s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    }

    // ───── 조사·주제·문항 ─────
    function surveyName() {
      return st.meta ? st.meta.name : ((root.querySelector('[data-xa-survey]:checked + label') || {}).textContent || '');
    }
    function chips(disabled) {
      $$(root, '[data-xa-survey], [data-xa-topic]').forEach(function (r) { r.disabled = disabled; });
    }
    function loadSurvey(ds, keepIt) {
      st.ds = ds;
      if (!keepIt) { st.it = null; st.dims = []; st.filters = {}; }
      var radio = $$(root, '[data-xa-survey]').filter(function (r) { return r.value === ds; })[0];
      if (radio) { radio.checked = true; }
      status('loading', '⏳ ' + (radio ? radio.nextElementSibling.textContent : ds) + ' 데이터를 불러오는 중…');
      chips(true);
      return get('/surveys/' + encodeURIComponent(ds)).then(function (m) {
        chips(false);
        st.meta = m;
        st.items = m.items;
        var names = m.chips.map(function (c) { return c.id; });
        st.dims = st.dims.filter(function (d) { return names.indexOf(d) >= 0; });
        Object.keys(st.filters).forEach(function (k) { if (names.indexOf(k) < 0) { delete st.filters[k]; } });
        fillItems('survey');
        if (st.tab === 'topic') { fillItems('topic'); }
        drawVars();
        refresh();
      }, function (e) {
        chips(false);
        status('error', '데이터를 불러오지 못했습니다: ' + ((radio && radio.nextElementSibling.textContent) || ds) + ' (' + e.message + ')');
      });
    }
    function loadTopic(tpc) {
      st.topic = tpc;
      return get('/topics/' + encodeURIComponent(tpc) + '/items').then(function (items) {
        st.topicItems = items;
        fillItems('topic');
      }, function (e) { status('error', '데이터를 불러오지 못했습니다: 주제 (' + e.message + ')'); });
    }
    function itemSelect(panel) { return $(root, '[data-xa-panel="' + panel + '"] [data-xa-item]'); }
    function fillItems(panel, q) {
      var select = itemSelect(panel);
      if (!select) { return; }
      var list = panel === 'topic' ? st.topicItems : st.items;
      var term = (q || '').trim().toLowerCase();
      var shown = list.filter(function (i) { return !term || i.display.toLowerCase().indexOf(term) >= 0; });
      select.textContent = '';
      if (!list.length) {
        // 문구: 목록이 비었을 때 = 디자인 시안 「탐색 방식을 먼저 선택해 주세요.」, 목록이 있을 때 = 화면설계서 「— 문항을 선택하세요 —」(11/09)
        select.appendChild(el('option', { value: '' }, '탐색 방식을 먼저 선택해 주세요.'));
        select.disabled = true;
        return;
      }
      select.disabled = false;
      select.appendChild(el('option', { value: '' }, shown.length ? '— 문항을 선택하세요 —' : '검색 결과 없음'));
      var groups = {};
      shown.forEach(function (i) {
        var name = panel === 'topic' ? '' : (i.multi ? '다중응답' : '단일 문항');
        var parent = select;
        if (name) {
          if (!groups[name]) { groups[name] = el('optgroup', { label: name }); select.appendChild(groups[name]); }
          parent = groups[name];
        }
        var value = panel === 'topic' ? i.surveyId + '|' + i.id : i.id;
        var o = el('option', { value: value }, i.display);
        if (i.surveyId === st.ds && i.id === st.it) { o.selected = true; }
        parent.appendChild(o);
      });
    }

    // ───── 하위 변수(칩·분석 차원·조건) ─────
    function chipOf(id) { return st.meta ? st.meta.chips.filter(function (c) { return c.id === id; })[0] : null; }
    function used(id) { return st.dims.indexOf(id) >= 0 || Object.prototype.hasOwnProperty.call(st.filters, id); }
    function filtered(id) { return Object.prototype.hasOwnProperty.call(st.filters, id); }
    // place: pool(하위 변수) · dim(분석 차원) — 분석 차원 칩은 조건/필터에도 있으면 파란색
    function chipButton(c, place) {
      var active = place === 'dim' && filtered(c.id);
      var b = el('button', { type: 'button', 'class': 'cm-var-chip' + (active ? ' is-active' : ''), draggable: 'true',
        'aria-describedby': place === 'dim' ? 'cross_var_guide cross_dim_guide' : 'cross_var_guide', 'data-var': c.id });
      b.appendChild(el('span', { 'class': 'handle', 'aria-hidden': 'true' }, '⠿'));
      b.appendChild(document.createTextNode(c.name));
      if (place === 'dim') { b.appendChild(el('span', { 'class': 'sr-only' }, active ? ' — 조건/필터 적용 중, 누르면 조건 제외' : ' — 누르면 분석 차원에서 제외')); }
      b.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; });
      return b;
    }
    function drawVars() {
      var pool = $(root, '[data-xa-pool]');
      var dims = $(root, '[data-xa-dims]');
      var filters = $(root, '[data-xa-filters]');
      pool.textContent = '';
      dims.textContent = '';
      var all = st.meta ? st.meta.chips : [];
      all.filter(function (c) { return !used(c.id); }).forEach(function (c) {
        var li = el('li');
        var b = chipButton(c, 'pool');
        b.addEventListener('click', function () { addDim(c.id); });
        li.appendChild(b);
        pool.appendChild(li);
      });
      if (!all.length) { pool.appendChild(el('li', { 'class': 'empty' }, '이 조사에는 하위 변수가 없습니다.')); }
      st.dims.forEach(function (id) {
        var c = chipOf(id);
        if (!c) { return; }
        var li = el('li');
        var b = chipButton(c, 'dim');
        b.addEventListener('click', function () { if (filtered(id)) { removeFilter(id); } else { removeVar(id); } });
        li.appendChild(b);
        dims.appendChild(li);
      });
      dims.classList.toggle('is-empty', !st.dims.length);
      if (!st.dims.length) {
        // 빈 칸 안내는 화면설계서 sub_0201-04 문구 하나(분석 방식과 관계없이, 11/09)
        dims.appendChild(el('li', { 'class': 'empty' }, '분석할 변수를 이곳으로 드래그하여 입력해주세요. 새로운 변수를 놓으면 기존 변수와 교체됩니다.'));
      }
      drawFilters(filters);
    }
    function drawFilters(box) {
      box.textContent = '';
      var keys = Object.keys(st.filters);
      box.classList.toggle('is-empty', !keys.length);
      if (!keys.length) { box.appendChild(el('p', { 'class': 'empty' }, '변수를 끌어다 놓고 추가한 후 값을 선택하세요.')); return; }
      keys.forEach(function (id) {
        var c = chipOf(id);
        if (!c) { return; }
        var fs = el('fieldset', { 'class': 'krds-check-area cm-cross-cond', 'data-var': id });
        fs.appendChild(el('legend', {}, c.name));
        // 「전체」 한 단추 — 누르면 값을 모두 고르고 「해제」로 바뀐다. 「해제」를 누르면 모두 풀고 「전체」로(#116). 「조건 제외」 단추는 두지 않는다
        var tools = el('div', { 'class': 'cm-cross-cond-btns' });
        var allBtn = el('button', { type: 'button', 'class': 'krds-btn xsmall tertiary' });
        var allTxt = el('span');
        allBtn.appendChild(allTxt);
        allBtn.appendChild(el('span', { 'class': 'sr-only' }, ' — ' + c.name));
        tools.appendChild(allBtn);
        fs.appendChild(tools);
        var syncAll = function () {
          var boxes = $$(fs, 'input[type=checkbox]');
          var all = boxes.length > 0 && boxes.every(function (x) { return x.checked; });
          allTxt.textContent = all ? '해제' : '전체';
          allBtn.setAttribute('data-all', all ? 'Y' : 'N');
        };
        c.values.forEach(function (v, i) {
          var wrap = el('div', { 'class': 'krds-form-check medium' });
          var idv = 'xa_f_' + id + '_' + i;
          var input = el('input', { type: 'checkbox', id: idv, value: String(v.code) });
          input.checked = st.filters[id].indexOf(v.code) >= 0;
          input.addEventListener('change', function () { readFilter(fs, id); syncAll(); refresh(); });
          wrap.appendChild(input);
          wrap.appendChild(el('label', { 'for': idv }, v.label));
          fs.appendChild(wrap);
        });
        syncAll();
        allBtn.addEventListener('click', function () {
          var on = allBtn.getAttribute('data-all') !== 'Y';
          $$(fs, 'input[type=checkbox]').forEach(function (x) { x.checked = on; });
          readFilter(fs, id);
          syncAll();
          refresh();
        });
        box.appendChild(fs);
      });
    }
    function readFilter(fs, id) {
      st.filters[id] = $$(fs, 'input[type=checkbox]:checked').map(function (x) { return Number(x.value); });
    }
    // 칩·조건 단추를 누르면 drawVars 가 목록을 다시 그려 누른 단추가 사라지고 초점이 문서(body)로 빠진다 — 옮겨 간 칩으로 초점을 잇는다
    function hadFocus() { return root.contains(document.activeElement); }
    function refocusChip(id, had) {
      if (!had || (document.activeElement && document.activeElement !== document.body && root.contains(document.activeElement))) { return; }
      var b = $(root, '.cm-var-chip[data-var="' + id + '"]');
      if (b) { b.focus(); }
    }
    // 분석 차원에 넣는다(개별 = 교체, 중첩 = 최대 MAX_DIMS). 이미 있으면 그대로. 못 넣으면 false
    function putDim(id) {
      if (st.dims.indexOf(id) >= 0) { return true; }
      if ($(root, '[data-xa-mode]').value === 'multi') {
        if (st.dims.length >= MAX_DIMS) { say('분석 차원은 ' + MAX_DIMS + '개까지입니다.'); return false; }
        st.dims.push(id);
      } else {
        st.dims = [id];
      }
      // 조건/필터는 분석 차원의 부분집합 — 교체로 빠진 변수의 조건도 뺀다
      Object.keys(st.filters).forEach(function (k) { if (st.dims.indexOf(k) < 0) { delete st.filters[k]; } });
      return true;
    }
    function addDim(id) {
      if (!chipOf(id)) { return; }
      var had = hadFocus();
      if (st.dims.indexOf(id) >= 0 || !putDim(id)) { drawVars(); refocusChip(id, had); return; }
      say(chipOf(id).name + ' 을(를) 분석 차원에 넣었습니다.');
      drawVars();
      refocusChip(id, had);
      refresh();
    }
    // 조건/필터에 넣는다 — 분석 차원 칩은 그대로 두고 파란색으로. 하위 변수에서 바로 놓으면 분석 차원에도 넣는다
    function addFilter(id) {
      if (!chipOf(id)) { return; }
      if (!putDim(id)) { drawVars(); return; }
      if (!st.filters[id]) { st.filters[id] = []; }
      say(chipOf(id).name + ' 을(를) 조건/필터에 넣었습니다. 값을 선택하세요.');
      drawVars();
      var first = $(root, '[data-xa-filters] fieldset[data-var="' + id + '"] input');
      if (first) { first.focus(); }
      refresh();
    }
    // 조건만 뺀다 — 분석 차원 칩은 남고 파란색이 풀린다
    function removeFilter(id) {
      var had = hadFocus();
      delete st.filters[id];
      say((chipOf(id) || { name: id }).name + ' 의 조건을 제외했습니다.');
      drawVars();
      refocusChip(id, had);
      refresh();
    }
    function removeVar(id) {
      var had = hadFocus();
      st.dims = st.dims.filter(function (d) { return d !== id; });
      delete st.filters[id];
      say((chipOf(id) || { name: id }).name + ' 을(를) 제외했습니다.');
      drawVars();
      refocusChip(id, had);
      refresh();
    }
    function dropZone(zone, onDrop) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        var id = e.dataTransfer.getData('text/plain');
        if (id) { onDrop(id); }
      });
    }

    // ───── 결과 ─────
    function status(kind, text) {
      var box = $(root, '[data-xa-status]');
      box.textContent = text || '';
      box.hidden = !text;
      box.setAttribute('data-state', kind);
      if (kind !== 'default') { $(root, '[data-xa-table-wrap]').hidden = true; }
    }
    function before() {
      st.result = null;
      st.shown = null;
      $(root, '[data-xa-types]').hidden = true;
      $(root, '[data-xa-chart-title]').textContent = '선택한 하위 변수, 분석 차원, 조건/필터에 맞춘 그래프가 그려집니다.';
      $(root, '[data-xa-chart-host]').hidden = true;
      $(root, '[data-xa-question]').textContent = '';
      $(root, '[data-xa-notes]').textContent = '';
      status('before', '위 분석 항목(문항)을 선택해서 그려진 그래프의 통계표가 표시됩니다.');
    }
    // 문항(또는 조사)이 바뀌면 새 결과가 올 때까지 이전 그래프·제목·문항명·각주를 남기지 않고 빈 칸으로 둔다
    function clearResult() {
      st.result = null;
      st.shown = null;
      $(root, '[data-xa-types]').hidden = true;
      $(root, '[data-xa-chart-title]').textContent = '';
      $(root, '[data-xa-chart-host]').hidden = true;
      $(root, '[data-xa-question]').textContent = '';
      $(root, '[data-xa-notes]').textContent = '';
    }
    function refresh() {
      syncUrl();
      // 구조(조사·문항·차원)가 바뀌면 합치기 초기화(프로토타입 recompute 와 같음) — 조건·정렬은 그대로 둔다
      var sig = st.ds + '::' + (st.it || '') + '::' + st.dims.join(',');
      if (sig !== st.mergeSig) { st.cm = []; st.rm = []; st.mergeSig = sig; }
      if (!st.ds || !st.it) { before(); return; }
      if (st.shown !== st.ds + '::' + st.it) { clearResult(); }
      var my = ++st.seq;
      status('loading', '⏳ ' + surveyName() + ' 데이터를 불러오는 중…');
      chips(true);
      get('/table?' + dataQuery().toString()).then(function (r) {
        if (my !== st.seq) { return; }
        chips(false);
        render(r);
      }, function (e) {
        if (my !== st.seq) { return; }
        chips(false);
        clearResult();
        status('error', '데이터를 불러오지 못했습니다: ' + surveyName() + ' (' + e.message + ')');
      });
    }
    function pctCell(cell, tag) {
      var td = el(tag || 'td');
      if (cell.masked) {
        td.appendChild(el('span', { 'aria-hidden': 'true' }, 'x'));
        td.appendChild(el('span', { 'class': 'sr-only' }, '가림'));
      } else {
        td.textContent = Number(cell.pct).toFixed(1) + '%';
      }
      return td;
    }
    function render(r) {
      // 표 전체 「계」의 실제 응답자 수가 기준 미만이면 서버가 표를 주지 않는다(#152) — 그래프·통계표 없이 안내만
      if (!r.table) {
        clearResult();
        st.shown = st.ds + '::' + st.it;
        status('small', r.notes[0]);
        return;
      }
      st.result = r;
      st.shown = st.ds + '::' + st.it;
      var t = r.table;
      var table = $(root, '#cross_table');
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      thead.textContent = '';
      tbody.textContent = '';
      var mergeable = !t.multi;
      var hr = el('tr');
      if (t.dims.length) {
        hr.appendChild(el('th', { scope: 'col' }, t.dims.join(' × ')));
        // 「계」 열(가중 사례수·응답자수)은 두지 않는다(#152) — 사례수는 각주 첫 줄
        t.columns.forEach(function (c) {
          hr.appendChild(mergeable ? headCell('th', { scope: 'col' }, 'col', colKeys(c), c.label) : el('th', { scope: 'col' }, c.label));
        });
        thead.appendChild(hr);
        var rows = [t.total].concat(t.rows);
        rows.forEach(function (row, i) {
          var tr = el('tr');
          if (i === 0) { tr.className = 'sum'; tr.setAttribute('data-chart-skip', ''); }
          var label = i === 0 ? '전체' : row.labels.join(' · ');
          tr.appendChild(mergeable && i > 0 ? headCell('th', { scope: 'row' }, 'row', rowKeys(row), label) : el('th', { scope: 'row' }, label));
          row.cells.forEach(function (c) { tr.appendChild(pctCell(c)); });
          tbody.appendChild(tr);
        });
      } else {
        hr.appendChild(el('th', { scope: 'col' }, '응답 항목'));
        hr.appendChild(el('th', { scope: 'col' }, t.multi ? '응답률(%)' : '비율(%)'));
        thead.appendChild(hr);
        if (!t.multi) {
          var sum = el('tr', { 'class': 'sum', 'data-chart-skip': '' });
          sum.appendChild(el('th', { scope: 'row' }, '전체'));
          sum.appendChild(el('td', {}, '100.0%'));
          tbody.appendChild(sum);
        }
        // 차원이 없으면 응답 범주가 행으로 놓인다 — 합치기는 그대로 열(cm)
        t.columns.forEach(function (c, i) {
          var tr = el('tr');
          tr.appendChild(mergeable ? headCell('th', { scope: 'row' }, 'col', colKeys(c), c.label) : el('th', { scope: 'row' }, c.label));
          tr.appendChild(pctCell(t.total.cells[i]));
          tbody.appendChild(tr);
        });
      }
      $(root, '[data-xa-caption]').textContent = r.itemName + (t.dims.length ? ' ' + t.dims.join(' × ') + '별' : '') +
        (t.multi ? ' 응답률 표' : ' 응답 비율 표') + '입니다. 「전체」 행과 응답 항목 ' + t.columns.length + '개로 구성되어 있습니다.';
      $(root, '[data-xa-question]').textContent = r.itemName;
      var notes = $(root, '[data-xa-notes]');
      notes.textContent = '';
      r.notes.forEach(function (n) { notes.appendChild(el('li', {}, n)); });
      if (t.multi) { notes.appendChild(el('li', {}, '다중응답 — 셀 값은 그 집단에서 항목을 택한 응답률(중복 선택이라 합계가 100%를 넘을 수 있음), 응답자수는 1개 이상 응답한 인원(가중).')); }
      status('default', '');
      $(root, '[data-xa-table-wrap]').hidden = false;
      $(root, '[data-xa-types]').hidden = false;
      $(root, '[data-xa-chart-title]').textContent = r.title;
      var csv = $(root, '[data-xa-csv]');
      csv.setAttribute('href', api + '/csv?' + dataQuery().toString());
      drawChart(r.title);
    }

    // ───── 머리글 합치기 ─────
    function colKeys(c) { return (c.members || [c.code]).map(String); }
    function rowKeys(row) { return row.members || [row.codes.join('_')]; }
    // 머리글 칸 = 끌 수 있는 글자(라벨만) + 합친 칸이면 ✕ 단추(글자 없는 SVG, 이름은 aria-label)
    function headCell(tag, attrs, type, keys, label) {
      var cell = el(tag, attrs);
      var merged = keys.length > 1;
      var b = el('span', { draggable: 'true', 'data-xa-head': type }, label);
      b._keys = keys;
      var s = b.style;
      s.cursor = 'grab';
      if (merged) { s.textDecoration = 'underline dotted'; }
      cell.appendChild(b);
      if (merged) {
        var x = el('button', { type: 'button', 'aria-label': '「' + label + '」 나누기', title: '나누기', 'data-xa-split': type });
        x._keys = keys;
        x.style.border = '0'; x.style.background = 'none'; x.style.padding = '0 0.2rem'; x.style.marginLeft = '0.4rem';
        x.style.cursor = 'pointer'; x.style.color = 'inherit'; x.style.verticalAlign = 'middle';
        x.appendChild(crossIcon());
        cell.appendChild(x);
      }
      return cell;
    }
    function crossIcon() {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', '12'); svg.setAttribute('height', '12'); svg.setAttribute('viewBox', '0 0 12 12');
      svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', 'M2 2 10 10M10 2 2 10');
      p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.8'); p.setAttribute('fill', 'none');
      svg.appendChild(p);
      return svg;
    }
    // 프로토타입 mergeGroups — 고른 묶음을 하나로(겹치는 기존 묶음은 흡수), splitGroup — 그 칸이 든 묶음을 없앤다
    function mergeGroups(list, groups) {
      var all = [];
      groups.forEach(function (g) { g.forEach(function (k) { if (all.indexOf(k) < 0) { all.push(k); } }); });
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].some(function (k) { return all.indexOf(k) >= 0; })) { list.splice(i, 1); }
      }
      if (all.length > 1) { list.push(all); }
      return all;
    }
    function splitGroup(list, keys) {
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].some(function (k) { return keys.indexOf(k) >= 0; })) { list.splice(i, 1); }
      }
    }
    function merge(type, groups) {
      mergeGroups(type === 'col' ? st.cm : st.rm, groups);
      say((type === 'col' ? '열 ' : '행 ') + groups.length + '칸을 합쳤습니다.');
      refresh();
    }
    function headStyle(b, kind) {
      b.style.outline = kind === 'drop' ? '2px dashed currentColor' : '';
      b.style.outlineOffset = kind ? '2px' : '';
    }
    function sameKeys(a, b) { return a.join() === b.join(); }
    function headOf(target, type) {
      var b = target && target.closest ? target.closest('[data-xa-head]') : null;
      return b && (!type || b.getAttribute('data-xa-head') === type) ? b : null;
    }
    function bindMerge(table) {
      var drag = null;
      table.addEventListener('dragstart', function (e) {
        var b = headOf(e.target);
        if (!b) { return; }
        drag = { type: b.getAttribute('data-xa-head'), keys: b._keys };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', b.textContent);
      });
      table.addEventListener('dragover', function (e) {
        var b = drag && headOf(e.target, drag.type);
        if (b && !sameKeys(b._keys, drag.keys)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; headStyle(b, 'drop'); }
      });
      table.addEventListener('dragleave', function (e) {
        var b = headOf(e.target);
        if (b) { headStyle(b, ''); }
      });
      table.addEventListener('drop', function (e) {
        var b = drag && headOf(e.target, drag.type);
        if (!b) { drag = null; return; }
        e.preventDefault();
        var d = drag;
        drag = null;
        if (!sameKeys(b._keys, d.keys)) { merge(d.type, [d.keys, b._keys]); }
      });
      table.addEventListener('dragend', function () {
        drag = null;
        $$(table, '[data-xa-head]').forEach(function (o) { headStyle(o, ''); });
      });
      table.addEventListener('click', function (e) {
        var x = e.target.closest ? e.target.closest('[data-xa-split]') : null;
        if (x) {
          var type = x.getAttribute('data-xa-split');
          splitGroup(type === 'col' ? st.cm : st.rm, x._keys);
          say('합친 칸을 나눴습니다.');
          refresh();
        }
      });
    }
    function drawChart(title) {
      var host = $(root, '[data-xa-chart-host]');
      host.hidden = false;
      if (!host._cmChart) {
        host.setAttribute('data-cm-chart', 'bar');
        host.setAttribute('data-chart-table', '#cross_table');
        host.setAttribute('data-chart-unit', '%');
        host.setAttribute('data-chart-tools', '#cross_tool');
        host.setAttribute('data-chart-source', '#section_07');
        host.setAttribute('data-chart-title', title);
        if (window.CmChart) { window.CmChart.init(); }
      }
      var chart = host._cmChart;
      if (!chart) { return; }
      chart.config.title = title;
      host.setAttribute('data-chart-title', title);
      var plot = host.querySelector('.cm-chart-plot');
      if (plot) { plot.setAttribute('aria-label', title); }
      chart.render();
    }
    function logImage(ext) {
      if (!st.result) { return; }
      var q = dataQuery();
      q.set('ext', ext);
      fetch(api + '/downloads?' + q.toString(), { credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(function () {});
    }

    // 다른 주제·다른 탐색 방식 탭으로 옮기면 고른 문항·분석 차원·조건/필터를 해제한다(#147) — 조사 칩을 바꿀 때(loadSurvey 새로 열기)와 같다
    function clearSelection() {
      if (!st.it && !st.dims.length && !Object.keys(st.filters).length) { return; }
      st.it = null; st.dims = []; st.filters = {};
      fillItems('survey');
      fillItems('topic');
      drawVars();
      refresh();
    }

    // ───── 이벤트 ─────
    $(root, '[data-xa-year]').addEventListener('change', function (e) {
      var y = e.target.value;
      var first = null;
      $$(root, '[data-xa-panel="survey"] .krds-form-chip').forEach(function (chip) {
        var on = chip.getAttribute('data-year') === y;
        chip.hidden = !on;
        if (on && !first) { first = chip.querySelector('[data-xa-survey]'); }
      });
      if (first) { loadSurvey(first.value, false); }
    });
    $$(root, '[data-xa-survey]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) { loadSurvey(r.value, false); } });
    });
    $$(root, '[data-xa-topic]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) { return; }
        clearSelection();
        loadTopic(r.value);
      });
    });
    $$(root, '[role="tablist"] li').forEach(function (li) {
      li.addEventListener('click', function () {
        // KRDS ui-script 가 탭 id·role 을 li 에서 안쪽 button 으로 옮긴다 — 둘 다 본다
        var tab = li.id === 'tab_cross_01' || li.querySelector('#tab_cross_01') ? 'topic' : 'survey';
        if (tab === st.tab) { return; }
        st.tab = tab;
        clearSelection();
        syncUrl();
      });
    });
    $$(root, '[data-xa-panel]').forEach(function (panel) {
      var name = panel.getAttribute('data-xa-panel');
      var search = panel.querySelector('[data-xa-search]');
      var select = panel.querySelector('[data-xa-item]');
      var run = function () { fillItems(name, search.value); };
      search.addEventListener('input', run);
      panel.querySelector('[data-xa-search-btn]').addEventListener('click', function () { run(); select.focus(); });
      select.addEventListener('change', function () {
        var v = select.value;
        if (name === 'topic' && v) {
          var i = v.indexOf('|');
          var ds = v.slice(0, i);
          var it = v.slice(i + 1);
          if (ds !== st.ds) { st.it = it; st.dims = []; st.filters = {}; loadSurvey(ds, true); return; }
          st.it = it;
        } else {
          st.it = v || null;
        }
        refresh();
      });
    });
    $(root, '[data-xa-mode]').addEventListener('change', function () { drawVars(); });
    $(root, '[data-xa-join]').addEventListener('change', function (e) { st.c = e.target.value; refresh(); });
    $$(root, '[data-xa-sort]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) { st.s = r.getAttribute('data-xa-sort'); refresh(); } });
    });
    $$(root, '[data-chart-download="png"], [data-chart-download="svg"]').forEach(function (a) {
      a.addEventListener('click', function () { logImage(a.getAttribute('data-chart-download')); });
    });
    $(root, '[data-xa-csv]').addEventListener('click', function (e) { if (!st.result) { e.preventDefault(); } });
    dropZone($(root, '[data-xa-dims]'), addDim);
    dropZone($(root, '[data-xa-filters]'), addFilter);
    dropZone($(root, '[data-xa-pool]'), removeVar);
    bindMerge($(root, '#cross_table'));

    // ───── 처음 상태 ─────
    var y = $(root, '[data-xa-year]');
    if (y) {
      $$(root, '[data-xa-panel="survey"] .krds-form-chip').forEach(function (chip) { chip.hidden = chip.getAttribute('data-year') !== y.value; });
    }
    if (st.ds) { loadSurvey(st.ds, true); } else { before(); drawVars(); }
  }

  function parseFilters(f) {
    var out = {};
    (f || '').split('~').filter(Boolean).forEach(function (part) {
      var i = part.indexOf(':');
      if (i > 0) { out[part.slice(0, i)] = part.slice(i + 1).split('.').filter(Boolean).map(Number); }
    });
    return out;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-sedis-screen="xa-crosstab"]').forEach(init);
  });
})();
