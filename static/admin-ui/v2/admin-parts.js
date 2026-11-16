/* 관리자 화면 개선 부품(2026-11 퍼블리싱) — 동작. 모양은 admin-parts.css.
   화면 스크립트가 window.nvParts 로 부른다. 저장 · 조회는 하지 않는다(각 화면 스크립트 몫).

   savehead(el, state)      머리 막대 저장 영역의 상태 글과 버튼
   reasonbar(el, changes)   사유 입력 줄의 바뀐 내용 칩(3건 넘으면 「외 N건」)
   tabDirty(tab, on)        저장 안 한 탭 점
   leave(tab, opts)         저장 안 하고 다른 탭으로 갈 때 확인 창 → Promise('stay' | 'discard' | 'save')
   pick(root, opts)         검색 옵션창(입력 칸 + 결과 줄). 화살표 · Enter · Esc
   popover(trigger, pop)    작은 체크 목록 창 · 찾기 목록 같은 떠 있는 창 열고 닫기 */
(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 1) 머리 막대 저장 영역. state = { dirty: 건수, saved: '저장됨 · 방금 · 이름' } */
  function savehead(el, state) {
    if (!el) { return; }
    var status = el.querySelector('.savehead__status');
    var dirty = state && state.dirty ? state.dirty : 0;
    if (status) {
      status.classList.toggle('savehead__status--dirty', dirty > 0);
      status.textContent = dirty > 0 ? '저장 안 한 변경 ' + dirty + '건' : (state && state.saved) || '저장된 상태입니다';
    }
    el.querySelectorAll('[data-savehead-action]').forEach(function (b) { b.disabled = dirty === 0; });
  }

  /* 2) 사유 입력 줄. changes = [{ name, from, to }] 또는 [{ name, text }]. 비면 줄을 숨긴다. */
  var CHIP_MAX = 3;
  function reasonbar(el, changes, label) {
    if (!el) { return; }
    var list = changes || [];
    el.hidden = list.length === 0;
    var box = el.querySelector('.reasonbar__changes');
    if (!box) { return; }
    var open = box.getAttribute('data-open') === 'true';
    var shown = open ? list : list.slice(0, CHIP_MAX);
    var html = '<span class="reasonbar__label">' + esc(label || box.getAttribute('data-label') || '바뀐 내용') + '</span>';
    shown.forEach(function (c) {
      html += '<span class="reasonbar__chip"><span class="reasonbar__chip-name">' + esc(c.name) + '</span>';
      if (c.text != null) { html += esc(c.text); }
      else {
        if (c.from != null && c.from !== '') { html += '<span class="reasonbar__chip-from">' + esc(c.from) + '</span>→ '; }
        html += esc(c.to == null || c.to === '' ? '(비움)' : c.to);
      }
      html += '</span>';
    });
    if (list.length > CHIP_MAX) {
      html += '<button type="button" class="reasonbar__more" data-reasonbar-more aria-expanded="' + open + '">' + (open ? '접기' : '외 ' + (list.length - CHIP_MAX) + '건') + '</button>';
    }
    box.innerHTML = html;
    var more = box.querySelector('[data-reasonbar-more]');
    if (more) {
      more.addEventListener('click', function () {
        box.setAttribute('data-open', String(!open));
        reasonbar(el, list, label);
        var again = box.querySelector('[data-reasonbar-more]');
        if (again) { again.focus(); }
      });
    }
  }

  /* 4) 저장 안 한 탭 점 */
  function tabDirty(tab, on) {
    if (!tab) { return; }
    if (on) { tab.setAttribute('data-dirty', 'true'); } else { tab.removeAttribute('data-dirty'); }
  }

  /* 5) 탭 이동 확인 창 — 누른 탭 아래. opts = { title, desc, canSave } */
  var openLeave = null;
  function closeLeave(result) {
    if (!openLeave) { return; }
    var cur = openLeave;
    openLeave = null;
    cur.pop.remove();
    document.removeEventListener('keydown', cur.onKey, true);
    document.removeEventListener('mousedown', cur.onDown, true);
    if (result === 'stay' && cur.tab) { cur.tab.focus(); }
    cur.resolve(result);
  }
  function leave(tab, opts) {
    closeLeave('stay');
    var o = opts || {};
    return new Promise(function (resolve) {
      var pop = document.createElement('div');
      pop.className = 'leavepop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-modal', 'false');
      pop.id = 'nv-leavepop';
      pop.setAttribute('aria-labelledby', 'nv-leavepop-title');
      pop.innerHTML = '<div class="leavepop__title" id="nv-leavepop-title">' + esc(o.title || '저장 안 한 변경이 있습니다') + '</div>'
        + '<p class="leavepop__desc">' + esc(o.desc || '저장하지 않고 이동하면 바꾼 내용은 사라집니다.') + '</p>'
        + '<div class="leavepop__foot"><button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-leave="stay">머무르기</button>'
        + '<button type="button" class="nv-btn nv-btn--sm nv-btn--outline is-danger-text" data-leave="discard">버리고 이동</button>'
        + (o.canSave === false ? '' : '<button type="button" class="nv-btn nv-btn--sm nv-btn--primary" data-leave="save">저장하고 이동</button>')
        + '</div>';
      document.body.appendChild(pop);
      var r = tab.getBoundingClientRect();
      var w = pop.offsetWidth;
      pop.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 8)) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
      var state = {
        pop: pop, tab: tab, resolve: resolve,
        onKey: function (e) {
          if (e.key === 'Escape') { e.preventDefault(); closeLeave('stay'); return; }
          if (e.key === 'Tab') {
            var items = Array.prototype.slice.call(pop.querySelectorAll('button'));
            var i = items.indexOf(document.activeElement);
            if (i === -1 || (e.shiftKey && i === 0) || (!e.shiftKey && i === items.length - 1)) {
              e.preventDefault();
              items[e.shiftKey ? items.length - 1 : 0].focus();
            }
          }
        },
        onDown: function (e) { if (!pop.contains(e.target)) { closeLeave('stay'); } }
      };
      openLeave = state;
      pop.addEventListener('click', function (e) {
        var b = e.target.closest('[data-leave]');
        if (b) { closeLeave(b.getAttribute('data-leave')); }
      });
      document.addEventListener('keydown', state.onKey, true);
      document.addEventListener('mousedown', state.onDown, true);
      pop.querySelector('[data-leave="stay"]').focus();
    });
  }

  /* 7) 검색 옵션창.
     root 안에 input 하나와 .pick__list 하나가 있어야 한다(없으면 만든다).
     opts = {
       search(q) → Promise<rows> | rows   rows = [{ label, id, meta, disabled, badge, value }]
       onPick(row)                        줄을 고름
       foot: { label, meta, onClick }     맨 아래 줄(상세 검색 · 여러 명 한번에 고르기). 없으면 안 그림
       minLength: 1, delay: 200, icon: 'user', empty: '찾은 결과가 없습니다'
     } */
  var pickSeq = 0;
  function pick(root, opts) {
    var o = opts || {};
    var input = root.querySelector('input');
    var list = root.querySelector('.pick__list');
    if (!list) {
      list = document.createElement('div');
      list.className = 'pick__list';
      root.appendChild(list);
    }
    if (!root.classList.contains('pick')) { root.classList.add('pick'); }
    var listId = list.id || ('nv-pick-' + (++pickSeq));
    list.id = listId;
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('autocomplete', 'off');
    var rows = [];
    var timer = null;
    var seq = 0;
    var icon = o.icon === undefined ? 'user' : o.icon;

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function options() { return Array.prototype.slice.call(list.querySelectorAll('.pick__row:not([aria-disabled="true"])')); }
    function mark(el) {
      list.querySelectorAll('.pick__row').forEach(function (r) { r.setAttribute('aria-selected', String(r === el)); });
      if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
    }
    function render(found, q) {
      rows = found || [];
      var html = '';
      rows.forEach(function (r, i) {
        html += '<button type="button" class="pick__row" role="option" tabindex="-1" id="' + listId + '-' + i + '" data-pick-index="' + i + '"'
          + (r.disabled ? ' aria-disabled="true"' : '') + ' aria-selected="false">'
          + (icon ? '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-' + icon + '"/></svg>' : '')
          + esc(r.label) + (r.id ? ' <span class="pick__id">' + esc(r.id) + '</span>' : '')
          + '<span class="pick__meta">' + (r.badge ? '<span class="nv-badge">' + esc(r.badge) + '</span>' : esc(r.meta || '')) + '</span></button>';
      });
      if (!rows.length && q) { html += '<p class="pick__row" aria-disabled="true" role="option">' + esc(o.empty || '찾은 결과가 없습니다') + '</p>'; }
      if (o.foot) {
        html += (html ? '<div class="pick__sep" role="separator"></div>' : '')
          + '<button type="button" class="pick__row pick__foot" tabindex="-1" id="' + listId + '-foot" data-pick-foot role="option" aria-selected="false">'
          + '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-' + (o.foot.icon || 'search') + '"/></svg>' + esc(o.foot.label)
          + (o.foot.meta ? '<span class="pick__meta">' + esc(o.foot.meta) + '</span>' : '')
          + '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-chevron-right"/></svg></button>';
      }
      list.innerHTML = html;
      list.hidden = !html;
      input.setAttribute('aria-expanded', String(!!html));
    }
    function run() {
      var q = input.value.trim();
      if (q.length < (o.minLength == null ? 1 : o.minLength)) { render([], ''); if (!o.foot) { close(); } return; }
      var mine = ++seq;
      Promise.resolve(o.search(q)).then(function (found) { if (mine === seq) { render(found, q); } })
        .catch(function () { if (mine === seq) { render([], q); list.insertAdjacentHTML('afterbegin', '<p class="pick__row" aria-disabled="true" role="option">찾지 못했습니다. 잠시 뒤 다시 시도하세요.</p>'); } });
    }
    function choose(el) {
      if (!el || el.getAttribute('aria-disabled') === 'true') { return; }
      if (el.hasAttribute('data-pick-foot')) { close(); if (o.foot && o.foot.onClick) { o.foot.onClick(input.value.trim()); } return; }
      var row = rows[Number(el.getAttribute('data-pick-index'))];
      close();
      if (o.onPick) { o.onPick(row); }
    }
    input.addEventListener('input', function () { window.clearTimeout(timer); timer = window.setTimeout(run, o.delay == null ? 200 : o.delay); });
    input.addEventListener('focus', function () { if (input.value.trim() || o.foot) { run(); } });
    input.addEventListener('keydown', function (e) {
      var items = options();
      var cur = list.querySelector('.pick__row[aria-selected="true"]');
      var i = items.indexOf(cur);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) { run(); return; }
        e.preventDefault();
        if (!items.length) { return; }
        i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
        mark(items[i]);
      } else if (e.key === 'Enter') {
        if (cur && !list.hidden) { e.preventDefault(); choose(cur); }
        else if (!list.hidden) { e.preventDefault(); }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
      }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 입력 칸 포커스를 잃지 않게
    list.addEventListener('click', function (e) { choose(e.target.closest('.pick__row')); });
    document.addEventListener('mousedown', function (e) { if (!root.contains(e.target)) { close(); } });
    return { close: close, refresh: run, input: input, clear: function () { input.value = ''; close(); } };
  }

  /* 8) 떠 있는 작은 창(체크 목록 · 찾기 목록). trigger 의 aria-expanded 와 pop.hidden 을 맞춘다.
     바깥 누름 · Esc 로 닫고 trigger 로 포커스를 돌려준다. opts.onOpen / onClose */
  function popover(trigger, pop, opts) {
    var o = opts || {};
    pop.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (pop.id) { trigger.setAttribute('aria-controls', pop.id); }
    var holder = trigger.closest('[data-open]') || null;
    function set(open, focusBack) {
      pop.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (holder) { holder.setAttribute('data-open', String(open)); }
      if (open) {
        if (o.onOpen) { o.onOpen(); }
        var f = pop.querySelector('input:not([disabled]), button:not([disabled]), a[href]');
        if (f) { f.focus(); }
      } else {
        if (o.onClose) { o.onClose(); }
        if (focusBack) { trigger.focus(); }
      }
    }
    trigger.addEventListener('click', function () { set(pop.hidden, false); });
    document.addEventListener('mousedown', function (e) {
      if (!pop.hidden && !pop.contains(e.target) && !trigger.contains(e.target)) { set(false, false); }
    });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); set(false, true); } });
    return { open: function () { set(true); }, close: function () { set(false, true); }, isOpen: function () { return !pop.hidden; } };
  }

  window.nvParts = {
    esc: esc, savehead: savehead, reasonbar: reasonbar, tabDirty: tabDirty,
    leave: leave, pick: pick, popover: popover
  };
})();
