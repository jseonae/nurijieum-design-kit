/* 관리자메뉴관리(시안 「관리자메뉴관리」).
   - 목록: 검색어를 입력하는 대로 화면에서 거른다(시안 renderList).
   - 메뉴 정보: 출력순서만. 저장 막대(시안 saveBar) — 저장된 상태 · 저장 안 한 변경 · 사유 · 취소 · 수정하기.
   - 접근권한: 권한그룹별 보기 · 고치기 표(시안 permHtml). 자료는 #am-access-data(JSON). 「상위 메뉴와 같게」면 상위 줄을 읽기로 보이고,
     권한그룹을 더하면 같게를 끄고 상위 줄을 이 메뉴로 옮긴다. 저장은 폼 그대로(cell = 역할ID|VIEW · 역할ID|EDIT, inherit, applyChildren, reason).
     서버가 다시 검사한다. */
(function () {
  'use strict';

  var REASON_ERR = '사유를 2자 이상 적으세요(수정 이력·접속 기록에 남습니다).';
  var lastToast = { text: '', at: 0 };
  function toast(text) {
    var now = Date.now();
    if (text === lastToast.text && now - lastToast.at < 800) { return; }   // 같은 안내를 겹쳐 띄우지 않는다
    lastToast = { text: text, at: now };
    if (window.nvToast) { window.nvToast(text); }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(name, cls) { return '<svg class="nv-icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#nv-i-' + name + '"/></svg>'; }

  /* ---------- 목록: 입력하는 대로 거르기 ---------- */
  var filter = document.querySelector('[data-am-filter]');
  if (filter) {
    var apply = function () {
      var q = filter.value.trim();
      var shown = 0;
      document.querySelectorAll('#am-table tbody tr[data-admin-menu]').forEach(function (tr) {
        var hit = !q || (tr.getAttribute('data-am-name') || '').indexOf(q) >= 0;
        tr.hidden = !hit;
        if (hit) { shown++; }
      });
      var total = document.querySelector('[data-am-total]');
      if (total) { total.textContent = String(shown); }
      var empty = document.querySelector('[data-am-empty]');
      if (empty) { empty.hidden = shown > 0; }
    };
    filter.addEventListener('input', apply);
    apply();
  }

  /* ---------- 저장 막대 공통 ---------- */
  function savebar(kind) { return document.querySelector('[data-am-savebar="' + kind + '"]'); }
  function setBar(kind, list) {
    var bar = savebar(kind);
    if (!bar) { return; }
    var clean = !list.length;
    bar.setAttribute('data-clean', String(clean));
    bar.querySelector('[data-am-count]').innerHTML = clean ? '저장된 상태입니다' : '저장 안 한 변경 <b>' + list.length + '</b>건';
    bar.querySelectorAll('[data-am-dirty]').forEach(function (el) { el.hidden = clean; });
    var toggle = bar.querySelector('[data-am-toggle]');
    var listEl = bar.querySelector('[data-am-list]');
    if (toggle) {
      toggle.hidden = clean;
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.textContent = open ? '접기' : '무엇이 바뀌나';
      listEl.hidden = clean || !open;
    } else {
      listEl.hidden = clean;
    }
    listEl.innerHTML = list.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    var save = bar.querySelector('[data-am-save]');
    var cancel = bar.querySelector('[data-am-cancel]');
    if (save) { save.disabled = clean; }
    if (cancel) { cancel.setAttribute('aria-disabled', String(clean)); cancel.classList.toggle('is-disabled', clean); }
  }
  function clearError(scope) { scope.querySelectorAll('[data-am-error]').forEach(function (el) { el.remove(); }); }
  function showError(input, text, id) {
    var err = document.createElement('span');
    err.className = 'nv-field__error';
    err.setAttribute('role', 'alert');
    err.setAttribute('data-am-error', '');
    if (id) { err.id = id; input.setAttribute('aria-describedby', id); }
    err.textContent = text;
    (input.closest('.nv-field, .savebar__reason') || input.parentNode).appendChild(err);
  }
  /* 사유 2자 이상 · 그 밖의 칸 검사. 문제가 있으면 칸 아래 글과 토스트(시안 needReason · 7141 · 7209) */
  function checkReason(form, kind, extra) {
    clearError(form.closest('main') || document);
    var bad = (extra || []).slice();
    var reason = savebar(kind).querySelector('[data-am-reason]');
    var noReason = Array.from((reason.value || '').trim()).length < 2;
    bad.forEach(function (b) { showError(b.input, b.text); });
    if (noReason) { showError(reason, REASON_ERR, 'am-reason-' + kind + '-err'); }
    if (!bad.length && !noReason) { return true; }
    (bad.length ? bad[0].input : reason).focus();
    toast(noReason && !bad.length ? '사유를 적어야 저장합니다.' : '입력값을 확인하세요.');
    return false;
  }

  /* ---------- 메뉴 정보: 출력순서 ---------- */
  var infoForm = document.querySelector('[data-am-form="info"]');
  if (infoForm) {
    var sort = infoForm.querySelector('#am-sort');
    var initial = sort.getAttribute('data-am-initial');
    var infoChanges = function () { return sort.value !== initial ? ['출력순서: ' + initial + ' → ' + (sort.value || '(빈 값)')] : []; };
    infoForm.addEventListener('input', function (e) {
      if (e.target.closest('.nv-field, .savebar__reason')) {
        var err = e.target.closest('.nv-field, .savebar__reason').querySelector('[data-am-error]');
        if (err) { err.remove(); }
      }
      setBar('info', infoChanges());
    });
    infoForm.addEventListener('submit', function (e) {
      var extra = [];
      if (!/^\d+$/.test(sort.value.trim())) { extra.push({ input: sort, text: '숫자를 넣으세요.' }); }
      if (!infoChanges().length || !checkReason(infoForm, 'info', extra)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    savebar('info').querySelector('[data-am-cancel]').addEventListener('click', function (e) {
      e.preventDefault();
      if (!infoChanges().length) { return; }
      sort.value = initial;
      clearError(infoForm);
      setBar('info', []);
      toast('고친 내용을 버렸습니다.');
    });
    setBar('info', []);
  }

  /* ---------- 접근권한 ---------- */
  var form = document.querySelector('[data-admin-menu-access]');
  var dataEl = document.getElementById('am-access-data');
  if (!form || !dataEl) { return; }
  var S;
  try { S = JSON.parse(dataEl.textContent || '{}'); } catch (e) { return; }
  var groups = S.groups || [];
  var locked = !!(S.fixed || S.high);
  var inheritBox = form.querySelector('[data-am-inherit]');
  var hintEl = form.querySelector('[data-am-inherit-hint]');
  var tableBox = form.querySelector('[data-am-table]');
  var addBox = form.querySelector('[data-am-add]');
  var newRows = {};

  function copy(rows) {
    var out = {};
    Object.keys(rows || {}).forEach(function (k) { out[k] = (rows[k] || []).slice(); });
    return out;
  }
  var saved = { inherit: !!(S.hasParent && S.inherit), rows: copy(S.inherit ? {} : S.own) };
  var draft = { inherit: saved.inherit, rows: copy(saved.inherit ? S.parentRows : S.own) };

  function group(id) { return groups.filter(function (g) { return g.id === id; })[0]; }
  function label(id) { var g = group(id); return g ? g.name + (g.code ? ' [' + g.code + ']' : '') : '(지운 그룹)'; }
  function following() { return draft.inherit && S.hasParent; }
  function effectiveOf(state) { return state.inherit && S.hasParent ? (S.parentRows || {}) : state.rows; }
  function cellsOf(rows, id) {
    var c = (rows[id] || []).slice();
    if (S.readOnly) { c = c.filter(function (x) { return x !== 'EDIT'; }); }
    return c;
  }
  function on(rows, id, a) { var c = cellsOf(rows, id); return c.indexOf(a) >= 0 || (a === 'VIEW' && c.indexOf('EDIT') >= 0); }
  function cellsText(c) { return c.indexOf('EDIT') >= 0 ? '보기 · 고치기' : c.indexOf('VIEW') >= 0 ? '보기' : '없음'; }

  /* 저장 안 한 변경 문장(서버 요약 줄과 같은 말) */
  function changes() {
    var out = [];
    if (draft.inherit !== saved.inherit && S.hasParent) { out.push(draft.inherit ? '상위 메뉴와 같게 바꿈' : '개별 설정으로 바꿈'); }
    var before = saved.inherit ? {} : saved.rows;
    var after = following() ? {} : draft.rows;
    var ids = Object.keys(before);
    Object.keys(after).forEach(function (id) { if (ids.indexOf(id) < 0) { ids.push(id); } });
    ids.forEach(function (id) {
      var b = cellsOf(before, id), a = cellsOf(after, id);
      if (!b.length && a.length) { out.push('「' + label(id) + '」 줄 추가 · ' + cellsText(a)); }
      else if (b.length && !a.length) { out.push('「' + label(id) + '」 줄 뺌'); }
      else if (cellsText(b) !== cellsText(a)) { out.push('「' + label(id) + '」 ' + cellsText(b) + ' → ' + cellsText(a)); }
    });
    return out;
  }

  var ACTS = S.readOnly ? [['VIEW', '보기', '콘솔 왼쪽 메뉴에 보이고 화면을 열 수 있음']]
    : [['VIEW', '보기', '콘솔 왼쪽 메뉴에 보이고 화면을 열 수 있음'], ['EDIT', '고치기', '이 화면에서 등록 · 수정 · 삭제']];

  function render(focusSel) {
    var ro = following() || locked;
    var rows = following() ? (S.parentRows || {}) : draft.rows;
    var savedEff = effectiveOf(saved);
    var heads = ACTS.map(function (a) { return '<th scope="col"><span class="th-tip" title="' + esc(a[1] + ' — ' + a[2]) + '">' + a[1] + '</span></th>'; }).join('');
    var body = '<tr class="is-base"><td class="ptable__who"><div class="who"><div><div class="who__name">최고관리자 [G900]</div>'
      + '<div class="who__meta" title="누리지음 사이트 관리자 등급 이상 — 모든 관리자 메뉴를 항상 보고 고칩니다">등급 · 항상 전부 허용</div></div></div></td>'
      + ACTS.map(function (a) {
        return '<td><label class="cellcheck is-implied" title="' + esc('최고관리자 · ' + a[1] + ' — 항상 허용') + '"><input type="checkbox" disabled aria-label="최고관리자 ' + a[1] + ' (항상 허용)"></label></td>';
      }).join('') + '<td></td></tr>';
    if (S.fixed) {
      body += '<tr class="is-base"><td class="ptable__who"><div class="who"><div><div class="who__name">직원 [G400]</div>'
        + '<div class="who__meta" title="관리자 권한그룹에 든 사람 전체">기본 · 관리자 권한그룹 전체</div></div></div></td>'
        + ACTS.map(function (a) {
          var yes = a[0] === 'VIEW';
          return '<td><label class="cellcheck' + (yes ? ' is-implied' : '') + '" title="' + esc('직원 · ' + a[1] + ' — ' + (yes ? '항상 허용' : '바꿀 수 없음')) + '"><input type="checkbox" disabled' + (yes ? ' checked' : '')
            + ' aria-label="직원 ' + a[1] + '"></label></td>';
        }).join('') + '<td></td></tr>';
    }
    if (!locked) {
      Object.keys(rows).forEach(function (id) {
        var g = group(id);
        var cells = ACTS.map(function (a) {
          var direct = cellsOf(rows, id).indexOf(a[0]) >= 0;
          var implied = !direct && on(rows, id, a[0]);
          var was = on(savedEff, id, a[0]), now = on(rows, id, a[0]);
          var changed = was !== now;
          var tip = (g ? g.name : label(id)) + ' · ' + a[1] + ' — '
            + (ro ? (locked ? '바꿀 수 없음' : '상위 메뉴를 따름(' + (now ? '허용' : '허용 안 함') + ')')
              : direct ? '직접 허용. 누르면 끕니다' : implied ? '「고치기」에 포함되어 저절로 허용' : '허용 안 함. 누르면 허용합니다')
            + (changed ? ' (저장 안 함: ' + (was ? '허용' : '안 함') + ' → ' + (now ? '허용' : '안 함') + ')' : '');
          return '<td><label class="cellcheck' + (implied ? ' is-implied' : '') + (changed ? ' is-changed' : '') + '" title="' + esc(tip) + '">'
            + '<input type="checkbox" name="cell" value="' + esc(id) + '|' + a[0] + '" data-am-cell="' + a[0] + '"' + (now ? ' checked' : '')
            + (ro || implied ? ' disabled' : '') + ' aria-label="' + esc(label(id) + ' ' + a[1]) + '"></label></td>';
        }).join('');
        var meta = following() ? '<span class="nv-badge" title="' + esc('상위 메뉴 「' + S.parentName + '」의 줄을 따릅니다. 바꾸려면 「상위 메뉴와 같게」를 끄세요.') + '">상위 따름</span>'
          : '관리자 권한그룹 · ' + (g ? g.count || 0 : 0) + '명';
        var name = g ? '<button type="button" class="fixlink" style="font-weight:600;text-decoration:none" data-opengroup="' + esc(g.roleCode || g.code) + '">' + esc(label(id)) + '</button>'
          : '<span class="who__name">' + esc(label(id)) + '</span>';
        var del = ro ? '' : '<button type="button" class="nv-btn nv-btn--icon nv-btn--ghost" data-am-remove="' + esc(id) + '" aria-label="' + esc(label(id)) + ' 줄 빼기"'
          + ' title="이 권한그룹 줄을 표에서 뺍니다(저장해야 반영)">' + icon('minus-circle') + '</button>';
        body += '<tr data-am-row="' + esc(id) + '"' + (newRows[id] ? ' class="is-new"' : '') + '><td class="ptable__who"><div class="who"><div><div>' + name + '</div><div class="who__meta">' + meta + '</div></div></div></td>'
          + cells + '<td style="width:4.8rem">' + del + '</td></tr>';
      });
    }
    tableBox.innerHTML = '<div class="ptable-wrap"><table class="ptable' + (ro ? ' ptable--ro' : '') + '"><thead><tr><th class="ptable__who" scope="col"><span>권한그룹</span></th>' + heads
      + '<th scope="col"><span class="nv-sr-only">줄 빼기</span></th></tr></thead><tbody>' + body + '</tbody></table></div>';
    newRows = {};
    if (addBox) {
      var present = Object.keys(rows);
      var staff = groups.filter(function (g) { return g.kind === 'staff' && present.indexOf(g.id) < 0; });
      var members = groups.filter(function (g) { return g.kind === 'member'; });
      addBox.innerHTML = '<div class="addrow"><label for="am-add-group" class="nv-sr-only">권한그룹 추가</label><select class="nv-select" id="am-add-group">'
        + '<option value="">권한그룹 추가…</option>'
        + (staff.length ? '<optgroup label="관리자 권한그룹">' + staff.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(label(g.id)) + ' (' + (g.count || 0) + '명)</option>'; }).join('') + '</optgroup>' : '')
        + (members.length ? '<optgroup label="회원 권한그룹 — 관리자메뉴관리에는 넣을 수 없음">' + members.map(function (g) { return '<option disabled>' + esc(label(g.id)) + '</option>'; }).join('') + '</optgroup>' : '')
        + (window.groupPanel ? '<option value="__manage">⚙ 권한그룹관리…</option>' : '')
        + '</select><span class="nv-text-subtle nv-text-sm">'
        + (following() ? '<b>지금은 「' + esc(S.parentName) + '」을 따릅니다.</b> 권한그룹을 추가하면 「상위 메뉴와 같게」가 꺼지고 이 메뉴만 따로 정합니다. ' : '')
        + '관리자메뉴관리에는 <b>관리자 권한그룹만</b> 넣을 수 있습니다.</span></div>';
    }
    if (inheritBox && !locked) { inheritBox.checked = following(); }
    if (hintEl && !locked && S.hasParent) {
      hintEl.textContent = following() ? '「' + S.parentName + '」을 보고 고칠 수 있는 권한그룹은 이 메뉴도 똑같이 보고 고칩니다.' : '「' + S.parentName + '」과 다르게 정했습니다.';
    }
    setBar('perm', changes());
    if (focusSel) { var f = form.querySelector(focusSel); if (f) { f.focus(); } }
  }

  function breakInherit() {
    if (!following()) { return false; }
    draft.inherit = false;
    draft.rows = copy(S.parentRows);
    return true;
  }
  function addGroup(id) {
    var broke = breakInherit();
    if (!draft.rows[id]) { draft.rows[id] = ['VIEW']; }
    newRows[id] = true;
    render('#am-add-group');
    toast((broke ? '「상위 메뉴와 같게」를 끄고 ' : '') + '「' + label(id) + '」을 추가했습니다. 칸을 확인하고 저장하세요.');
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t === inheritBox) {
      draft.inherit = t.checked;
      if (!t.checked) { draft.rows = Object.keys(S.own || {}).length ? copy(S.own) : copy(S.parentRows); }
      render();
      return;
    }
    if (t.id === 'am-add-group' && t.value) {
      var id = t.value;
      t.value = '';
      if (id === '__manage') { openPanel(); return; }
      addGroup(id);
      return;
    }
    if (t.hasAttribute('data-am-cell')) {
      var row = t.closest('[data-am-row]');
      if (!row) { return; }
      var gid = row.getAttribute('data-am-row');
      var cells = (draft.rows[gid] || []).filter(function (c) { return c !== t.getAttribute('data-am-cell'); });
      if (t.checked) { cells.push(t.getAttribute('data-am-cell')); }
      if (t.getAttribute('data-am-cell') === 'EDIT' && t.checked && cells.indexOf('VIEW') < 0) { cells.push('VIEW'); }
      if (t.getAttribute('data-am-cell') === 'VIEW' && !t.checked) { cells = []; }
      draft.rows[gid] = cells;
      render('[data-am-row="' + gid + '"] [data-am-cell="' + t.getAttribute('data-am-cell') + '"]');
    }
  });
  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-am-reason')) {
      var err = e.target.closest('.savebar__reason').querySelector('[data-am-error]');
      if (err) { err.remove(); }
    }
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-am-remove]');
    if (b) { delete draft.rows[b.getAttribute('data-am-remove')]; render('#am-add-group'); return; }
    var opener = e.target.closest('[data-opengroup]');
    if (opener && window.groupPanel) { window.groupPanel.open({ gid: opener.getAttribute('data-opengroup'), tab: 'members' }); return; }
    var toggle = e.target.closest('[data-am-toggle]');
    if (toggle) { toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true')); setBar('perm', changes()); return; }
    var cancel = e.target.closest('[data-am-cancel]');
    if (cancel) {
      e.preventDefault();
      if (!changes().length) { return; }
      draft = { inherit: saved.inherit, rows: copy(saved.inherit ? S.parentRows : S.own) };
      clearError(form);
      render();
      toast('저장된 상태로 되돌렸습니다.');
    }
  });
  form.addEventListener('submit', function (e) {
    if (!changes().length || !checkReason(form, 'perm', [])) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* 권한그룹 패널: 관리자메뉴관리에서 열면 관리자 권한그룹만 이 메뉴에 더할 수 있다(시안 6759 · 6796) */
  function openPanel() {
    if (!window.groupPanel) { return; }
    window.groupPanel.open({ staffOnly: true });
  }
  function connectPanel() {
    if (!window.groupPanel || locked) { return; }
    window.groupPanel.setContext({
      name: S.name,
      canAccess: function (g) {
        var mine = g && groups.filter(function (x) { return x.roleCode === g.id || x.code === g.id || x.id === g.id; })[0];
        return !!mine && mine.kind === 'staff' && !draft.rows[mine.id];
      },
      canManager: function () { return false; },
      addAccess: function (code) {
        var mine = groups.filter(function (x) { return x.roleCode === code || x.code === code || x.id === code; })[0];
        if (mine) { addGroup(mine.id); }
      }
    });
  }
  render();
  if (window.groupPanel) { connectPanel(); } else { window.addEventListener('load', connectPanel); }
})();
