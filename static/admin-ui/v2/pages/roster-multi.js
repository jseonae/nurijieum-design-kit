/* 「여러 명 한번에 고르기」 모달(퍼블리싱 키트 auth-roster-multi* · group-panel-multi*, 모양 = admin-parts.css .multimodal · .mtree2 · .mpick).
 * 권한그룹명단관리(identity-auth.js)와 권한그룹 패널(group-panel.js)이 같이 연다:
 *   window.nvRosterMulti.open({ base, roleId, roleName, kind: 'staff'|'member', siteId, untilOptions, onDone(result) })
 * 관리자 권한그룹: 왼쪽 조직도(부서 › 하위 부서 › 사람) + 검색. 부서를 고르면 부서 줄 하나(dept:부서ID)로 들어가고 그 부서에 지금 속한 사람만
 * 연한 체크(하위 부서는 포함하지 않는다 — 하위 부서는 따로 고른다). 아래에 고른 것이 있는 부서는 「−」.
 * 회원 권한그룹: 조직도 없이 검색 결과로만 여러 명. 검색으로 바꿔도 고른 것은 오른쪽에 남는다. 이미 든 사람 · 부서는 막는다.
 * 「N건 추가」 = POST {base}/groups/{roleId}/members/batch(서버가 줄마다 다시 검사한다). */
(function () {
  'use strict';
  if (window.nvRosterMulti) { return; }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function icon(name) { return '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-' + name + '"/></svg>'; }
  function json(url, options) {
    var headers = window.cmsCsrf ? window.cmsCsrf.headers({ Accept: 'application/json' }) : { Accept: 'application/json' };
    var init = { method: 'GET', credentials: 'same-origin', headers: headers };
    if (options && options.body) {
      init.method = 'POST';
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    return fetch(url, init).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (ex) { data = null; }
        if (!r.ok) { throw new Error(data && data.message ? data.message : '처리하지 못했습니다. 잠시 뒤 다시 시도하세요.'); }
        return data;
      });
    });
  }

  var box = null;
  var O = null;     // 연 값
  var S = null;     // 상태
  var timer = null;
  var seq = 0;

  function build() {
    box = document.createElement('div');
    box.className = 'nv-modal-backdrop';
    box.id = 'roster-multi';
    box.hidden = true;
    box.innerHTML = '<div class="nv-modal multimodal" role="dialog" aria-modal="true" aria-labelledby="mm-t" aria-describedby="mm-d">'
      + '<div class="nv-modal__head"><div><h2 class="nv-modal__title" id="mm-t">명단 여러 명 고르기</h2><p class="findmodal__desc" id="mm-d"></p></div>'
      + '<button type="button" class="modal-x" aria-label="닫기" data-mm-close>' + icon('close') + '</button></div>'
      + '<div class="multimodal__body">'
      + '<div class="multimodal__left"><div class="nv-input-wrap nv-input-wrap--left">' + icon('search')
      + '<label for="mm-q" class="nv-sr-only" data-mm-qlabel></label><input id="mm-q" class="nv-input" type="search" autocomplete="off" data-modal-initial></div>'
      + '<div class="mm-left" data-mm-left></div></div>'
      + '<div class="multimodal__right"><div class="mpick__head"><span data-mm-count></span><button type="button" class="fixlink" data-mm-clear>모두 빼기</button></div>'
      + '<ul class="mpick" data-mm-picked aria-label="고른 명단"></ul>'
      + '<div class="nv-field"><label class="nv-field__label" for="mm-period">기간</label><select id="mm-period" class="nv-select" data-mm-until></select>'
      + '<span class="nv-field__hint">고른 명단에 함께 적용됩니다</span></div>'
      + '<p class="nv-field__error" role="alert" data-mm-error></p></div>'
      + '</div>'
      + '<div class="nv-modal__foot"><button type="button" class="nv-btn nv-btn--outline" data-mm-close>취소</button>'
      + '<button type="button" class="nv-btn nv-btn--primary" data-mm-add disabled>추가</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', onClick);
    box.addEventListener('change', onChange);
    box.querySelector('#mm-q').addEventListener('input', function (e) {
      window.clearTimeout(timer);
      var q = e.target.value.trim();
      timer = window.setTimeout(function () { S.q = q; if (q) { search(q); } else { S.results = null; renderLeft(); } }, 200);
    });
  }

  function staff() { return O.kind === 'staff'; }
  function nodeOf(deptId) { return S.byDept[deptId] || null; }
  /* 고른 것들의 위 부서(「−」 표시) */
  function mixedSet() {
    var mixed = {};
    Object.keys(S.picked).forEach(function (key) {
      var p = S.picked[key];
      var up = p.kind === 'dept' ? (nodeOf(p.deptId) || {}).parentId : p.deptId;
      for (var guard = 0; up && guard < 20; guard++) {
        mixed[up] = true;
        up = (nodeOf(up) || {}).parentId;
      }
    });
    return mixed;
  }
  function deptPicked(deptId) { return !!deptId && !!S.picked['dept:' + deptId]; }

  function personRow(p, depth, role) {
    var implied = p.kind !== 'dept' && deptPicked(p.deptId);
    var on = !!S.picked[p.actorId];
    var dis = p.disabled || implied;
    var cls = 'mtree2__row' + (implied ? ' is-imp' : on ? ' is-on' : '') + (p.disabled ? ' is-dis' : '');
    var tip = implied ? ' title="부서 「' + esc((nodeOf(p.deptId) || {}).name || '') + '」로 함께 포함됩니다"' : '';
    return '<li class="' + cls + '" style="--d:' + depth + '" role="' + role + '"' + (role === 'treeitem' ? ' aria-level="' + (depth + 1) + '"' : ' aria-selected="' + (on || implied) + '"') + tip + '>'
      + '<span class="mtree2__chev"></span><label class="nv-check"><input type="checkbox" data-mm-pick="' + esc(p.actorId) + '"' + (on || implied ? ' checked' : '') + (dis ? ' disabled' : '')
      + ' aria-label="' + esc((p.who || p.name) + ' 고르기') + '"></label>' + icon(p.kind === 'dept' ? 'users' : 'user')
      + '<span class="mtree2__name">' + esc(p.who || p.name) + '</span><span class="mtree2__meta">' + esc(p.loginId ? p.loginId + (p.sub && p.sub !== '-' ? ' · ' + p.sub : '') : p.sub || '') + '</span>'
      + (p.badge ? '<span class="nv-badge">' + esc(p.badge) + '</span>' : '') + '</li>';
  }

  function deptRow(n, mixed) {
    var key = n.actorId;
    var on = !!S.picked[key];
    var mix = !on && !!mixed[n.deptId];
    var dis = n.listed || !n.active;
    var open = !!S.open[n.deptId];
    var cls = 'mtree2__row' + (on ? ' is-on' : mix ? ' is-mix' : '') + (dis ? ' is-dis' : '');
    return '<li class="' + cls + '" style="--d:' + n.depth + '" role="treeitem" aria-level="' + (n.depth + 1) + '"' + (n.children ? ' aria-expanded="' + open + '"' : '') + '>'
      + (n.children ? '<button type="button" class="mtree2__chev" aria-expanded="' + open + '" aria-label="' + esc(n.name) + (open ? ' 접기' : ' 펼치기') + '" data-mm-toggle="' + esc(n.deptId) + '">' + icon('chevron-right') + '</button>'
        : '<span class="mtree2__chev"></span>')
      + '<label class="nv-check"><input type="checkbox" data-mm-pick="' + esc(key) + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + (mix ? ' aria-checked="mixed"' : '')
      + ' aria-label="' + esc(n.name + ' 고르기') + '"' + (dis ? '' : ' title="부서를 고르면 그 부서에 지금 속한 직원이 모두 들어갑니다(하위 부서 제외)"') + '></label>'
      + icon(n.depth === 0 ? 'sitemap' : 'users') + '<span class="mtree2__name">' + esc(n.name) + '</span><span class="mtree2__meta">' + n.count + '명</span>'
      + (n.listed ? '<span class="nv-badge">이미 명단에 있음</span>' : !n.active ? '<span class="nv-badge">사용 안 함</span>' : '') + '</li>';
  }

  function treeHtml() {
    if (S.nodes === null) { return '<p class="nv-text-sm nv-text-subtle" role="status">조직도를 불러오는 중입니다.</p>'; }
    if (!S.nodes.length) { return '<p class="nv-text-sm nv-text-subtle">부서가 없습니다. 이름이나 사번으로 찾으세요.</p>'; }
    var mixed = mixedSet();
    var html = '';
    var hiddenBelow = null;   // 접힌 부서의 깊이
    S.nodes.forEach(function (n) {
      if (hiddenBelow !== null && n.depth > hiddenBelow) { return; }
      hiddenBelow = null;
      html += deptRow(n, mixed);
      if (!S.open[n.deptId]) { hiddenBelow = n.depth; return; }
      var people = S.people[n.deptId];
      if (people === undefined) { return; }
      if (people === null) { html += '<li class="mtree2__row" style="--d:' + (n.depth + 1) + '" role="treeitem" aria-level="' + (n.depth + 2) + '"><span class="mtree2__meta">불러오는 중입니다.</span></li>'; return; }
      people.forEach(function (p) { html += personRow(p, n.depth + 1, 'treeitem'); });
    });
    return '<ul class="mtree2" role="tree" aria-label="조직도">' + html + '</ul>';
  }

  function resultsHtml() {
    if (S.results === null) { return '<p class="nv-text-sm nv-text-subtle" role="status">찾는 중입니다.</p>'; }
    var pickable = S.results.filter(function (p) { return !p.disabled && !(p.kind !== 'dept' && deptPicked(p.deptId)); });
    var head = '<div class="mres__head"><span>찾은 결과 <b>' + S.results.length + '</b></span>'
      + (pickable.length ? '<button type="button" class="fixlink" data-mm-all>결과 모두 고르기</button>' : '') + '</div>';
    if (!S.results.length) { return head + '<p class="nv-text-sm nv-text-subtle">「' + esc(S.q) + '」에 맞는 ' + (staff() ? '직원 · 부서가' : '회원이') + ' 없습니다.</p>'; }
    return head + '<ul class="mtree2" role="listbox" aria-multiselectable="true" aria-label="찾은 결과">' + S.results.map(function (p) {
      if (p.kind === 'dept') {
        var n = nodeOf((p.actorId || '').replace(/^dept:/, ''));
        if (n) { return deptRow({ actorId: n.actorId, deptId: n.deptId, depth: 0, name: n.name, count: n.count, children: false, listed: p.disabled && p.badge === '이미 명단에 있음', active: n.active }, mixedSet()); }
      }
      return personRow(p, 0, 'option');
    }).join('') + '</ul>';
  }

  function renderLeft() {
    var left = box.querySelector('[data-mm-left]');
    left.innerHTML = S.q ? resultsHtml() : staff() ? treeHtml() : '<p class="nv-text-sm nv-text-subtle">이름이나 회원ID로 찾아 고르세요.</p>';
  }

  function renderRight() {
    var keys = Object.keys(S.picked);
    var people = 0;
    keys.forEach(function (k) { var p = S.picked[k]; people += p.kind === 'dept' ? (p.count || 0) : 1; });
    box.querySelector('[data-mm-count]').innerHTML = '선택 <b>' + keys.length + '건</b>' + (staff() ? ' · 총 ' + people + '명' : '');
    box.querySelector('[data-mm-clear]').hidden = !keys.length;
    box.querySelector('[data-mm-picked]').innerHTML = keys.length ? keys.map(function (k) {
      var p = S.picked[k];
      var node = p.kind === 'dept' ? nodeOf(p.deptId) : null;
      var sub = p.kind === 'dept' ? (node && node.parentId && nodeOf(node.parentId) ? nodeOf(node.parentId).name + ' · ' : '') + '부서 · ' + (p.count || 0) + '명 자동 포함' : p.sub || '';
      return '<li class="mpick__row">' + icon(p.kind === 'dept' ? (node && node.depth > 0 ? 'users' : 'sitemap') : 'user') + '<span class="mpick__who"><b>' + esc(p.label) + '</b><span>' + esc(sub) + '</span></span>'
        + '<button type="button" class="xbtn" data-mm-drop="' + esc(k) + '" aria-label="' + esc(p.label) + ' 빼기" title="빼기">' + icon('close') + '</button></li>';
    }).join('') : '<li class="mpick__row"><span class="mpick__who"><span>부서 · 사람을 고르세요</span></span></li>';
    var add = box.querySelector('[data-mm-add]');
    add.disabled = !keys.length || S.busy;
    add.textContent = keys.length ? keys.length + '건 추가' : '추가';
  }

  function render() { renderLeft(); renderRight(); }

  function search(q) {
    var mine = ++seq;
    S.results = null;
    renderLeft();
    json(O.base + '/groups/' + encodeURIComponent(O.roleId) + '/people?mark=true&q=' + encodeURIComponent(q))
      .then(function (rows) { if (mine === seq) { S.results = rows || []; renderLeft(); } })
      .catch(function (error) { if (mine === seq) { S.results = []; renderLeft(); showError(error.message); } });
  }

  function loadPeople(deptId) {
    S.people[deptId] = null;
    renderLeft();
    json(O.base + '/groups/' + encodeURIComponent(O.roleId) + '/org/' + encodeURIComponent(deptId) + '/members' + (O.siteId ? '?siteId=' + encodeURIComponent(O.siteId) : ''))
      .then(function (rows) { S.people[deptId] = rows || []; renderLeft(); })
      .catch(function (error) { delete S.people[deptId]; S.open[deptId] = false; renderLeft(); showError(error.message); });
  }

  function showError(message) { box.querySelector('[data-mm-error]').textContent = message || ''; }

  /* 고를 수 있는 값을 찾는다: 조직도 · 펼친 부서원 · 찾은 결과 */
  function lookup(key) {
    if (key.indexOf('dept:') === 0) {
      var n = nodeOf(key.slice(5));
      if (n) { return { actorId: key, kind: 'dept', deptId: n.deptId, label: n.name, count: n.count }; }
    }
    var found = null;
    Object.keys(S.people).forEach(function (d) { (S.people[d] || []).forEach(function (p) { if (p.actorId === key) { found = p; } }); });
    (S.results || []).forEach(function (p) { if (p.actorId === key) { found = p; } });
    if (!found) { return null; }
    if (found.kind === 'dept') {
      var count = /부서원 (\d+)명/.exec(found.sub || '');
      return { actorId: key, kind: 'dept', deptId: key.slice(5), label: found.who || found.name, count: count ? Number(count[1]) : 0 };
    }
    var where = found.deptId && nodeOf(found.deptId) ? nodeOf(found.deptId).name : '';
    var what = found.sub && found.sub !== '-' && found.sub.indexOf(where) < 0 ? found.sub : '';
    return { actorId: key, kind: found.kind || 'person', deptId: found.deptId, label: found.who && found.loginId ? found.who + ' (' + found.loginId + ')' : found.name,
      sub: [where, what].filter(Boolean).join(' · ') || found.sub };
  }

  function setPicked(key, on) {
    if (!on) { delete S.picked[key]; return; }
    var item = lookup(key);
    if (!item) { return; }
    S.picked[key] = item;
    // 부서를 고르면 그 부서 사람으로 따로 고른 줄은 부서 줄에 포함되므로 뺀다(하위 부서 줄은 그대로)
    if (item.kind === 'dept') {
      Object.keys(S.picked).forEach(function (k) { var p = S.picked[k]; if (p.kind !== 'dept' && p.deptId === item.deptId) { delete S.picked[k]; } });
    }
  }

  function keepFocus(selector) {
    var active = document.activeElement;
    var key = active && active.getAttribute ? active.getAttribute(selector) : null;
    return function () {
      if (!key) { return; }
      var el = box.querySelector('[' + selector + '="' + key.replace(/"/g, '\\"') + '"]');
      if (el) { el.focus(); }
    };
  }

  function onChange(e) {
    var t = e.target;
    if (t.matches('[data-mm-pick]')) {
      var back = keepFocus('data-mm-pick');
      setPicked(t.getAttribute('data-mm-pick'), t.checked);
      showError('');
      render();
      back();
    }
  }

  function onClick(e) {
    var t = e.target.closest('button');
    if (!t || !box.contains(t)) { if (e.target === box) { close(); } return; }
    if (t.hasAttribute('data-mm-close')) { close(); return; }
    if (t.hasAttribute('data-mm-toggle')) {
      var id = t.getAttribute('data-mm-toggle');
      var back = keepFocus('data-mm-toggle');
      S.open[id] = !S.open[id];
      if (S.open[id] && S.people[id] === undefined) { loadPeople(id); } else { renderLeft(); }
      back();
      return;
    }
    if (t.hasAttribute('data-mm-drop')) { delete S.picked[t.getAttribute('data-mm-drop')]; render(); box.querySelector('#mm-q').focus(); return; }
    if (t.hasAttribute('data-mm-clear')) { S.picked = {}; render(); box.querySelector('#mm-q').focus(); return; }
    if (t.hasAttribute('data-mm-all')) {
      (S.results || []).forEach(function (p) { if (!p.disabled && !(p.kind !== 'dept' && deptPicked(p.deptId))) { setPicked(p.actorId, true); } });
      render();
      return;
    }
    if (t.hasAttribute('data-mm-add')) { submit(); }
  }

  function submit() {
    var keys = Object.keys(S.picked);
    if (!keys.length || S.busy) { return; }
    S.busy = true;
    showError('');
    renderRight();
    var until = box.querySelector('[data-mm-until]').value;
    json(O.base + '/groups/' + encodeURIComponent(O.roleId) + '/members/batch', { body: { actorIds: keys, validUntil: until, siteId: O.siteId || '*' } })
      .then(function (result) {
        S.busy = false;
        var failed = result.failed || [];
        if (!failed.length) {
          close();
          if (O.onDone) { O.onDone(result); }
          return;
        }
        // 넣은 것은 오른쪽에서 빼고, 실패한 줄은 남겨 까닭을 보인다
        var keep = {};
        failed.forEach(function (f) { if (S.picked[f.actorId]) { keep[f.actorId] = S.picked[f.actorId]; } });
        S.picked = keep;
        render();
        showError((result.added ? result.added + '건 넣었습니다. ' : '') + '넣지 못한 ' + failed.length + '건 — '
          + failed.map(function (f) { return f.name + ': ' + f.error; }).join(' · '));
        if (O.onDone && result.added) { O.onDone(result, true); }
      })
      .catch(function (error) { S.busy = false; renderRight(); showError(error.message); });
  }

  function close() {
    if (!box || box.hidden) { return; }
    if (window.nvAdmin && window.nvAdmin.closeModal) { window.nvAdmin.closeModal(); } else { box.hidden = true; }
  }

  function open(options) {
    if (!box) { build(); }
    O = options || {};
    S = { q: '', picked: {}, nodes: staff() ? null : [], byDept: {}, people: {}, open: {}, results: null, busy: false };
    box.querySelector('#mm-d').textContent = '「' + (O.roleName || '') + '」 명단에 추가할 ' + (staff() ? '부서 · 사람' : '회원') + '을 고르세요';
    var q = box.querySelector('#mm-q');
    q.value = '';
    q.placeholder = staff() ? '부서 · 이름 · 사번으로 찾기' : '이름 · 회원ID로 찾기';
    box.querySelector('[data-mm-qlabel]').textContent = q.placeholder;
    var until = box.querySelector('[data-mm-until]');
    until.innerHTML = '<option value="">기간 없음</option>' + (O.untilOptions || []).map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + '까지</option>'; }).join('');
    showError('');
    render();
    if (window.nvAdmin && window.nvAdmin.openModal) { window.nvAdmin.openModal(box, document.activeElement); } else { box.hidden = false; q.focus(); }
    if (staff()) {
      json(O.base + '/groups/' + encodeURIComponent(O.roleId) + '/org' + (O.siteId ? '?siteId=' + encodeURIComponent(O.siteId) : ''))
        .then(function (data) {
          S.nodes = data.nodes || [];
          S.nodes.forEach(function (n) { S.byDept[n.deptId] = n; if (n.depth === 0) { S.open[n.deptId] = true; } });
          renderLeft();
          // 처음 펼친 최상위 부서의 사람
          S.nodes.filter(function (n) { return n.depth === 0 && n.children; }).forEach(function (n) { loadPeople(n.deptId); });
        })
        .catch(function (error) { S.nodes = []; renderLeft(); showError(error.message); });
    }
  }

  window.nvRosterMulti = { open: open };
})();
