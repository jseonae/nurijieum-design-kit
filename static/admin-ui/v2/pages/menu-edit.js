/* 메뉴 수정 · 게시판 수정 화면(퍼블리싱 2 · 3단계 .edx 틀).
 *  - 탭 전환(페이지 이동 없음). 저장 안 한 탭은 점(data-dirty), 저장 안 하고 다른 탭으로 가면 확인 창(nvParts.leave: 머무르기 · 버리고 이동 · 저장하고 이동)
 *  - 저장은 탭마다: 위 막대 저장 영역(.savehead[data-savehead=탭]) — 상태 글 · 되돌리기 · 「(탭 이름) 저장」
 *  - 바꾼 것이 있을 때만 사유 줄(.reasonbar[data-reasonbar=탭]) — 바뀐 내용 칩 · 사유(2자 이상) · 누리집 출력
 *  - 바뀐 칸은 이름 옆 점 + 「이전: 값」(.chg)
 *  - 메뉴 정보: 입력 오류 표시 · 담당자 찾기(검색 옵션창 · 상세 검색 모달) · 고치던 값 탭 보관(menu-draft.js)
 *  - 소스 수정: 콘텐츠 저장 경로의 폼이 이 탭으로 돌아오게 하고, 바뀐 것을 센다
 * 접근권한 탭은 menu-access.js 가 같은 저장 영역 · 사유 줄을 채운다. */
(function () {
  'use strict';
  var root = document.querySelector('[data-menu-edit]');
  if (!root) { return; }
  var P = window.nvParts || null;
  var menuId = root.getAttribute('data-menu-id');
  var drafts = window.menuDraft;
  var flashOk = root.hasAttribute('data-flash-ok');
  if (drafts) { drafts.settle(menuId, flashOk); }
  var NEXT_KEY = 'nv.menuEdit.next';

  function esc(v) { return P ? P.esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function toast(text, opts) { if (window.nvToast) { window.nvToast(text, opts); } }

  /* ── 탭 ─────────────────────────────────────────────────────────── */
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-mtab]'));
  function tabOf(key) { return root.querySelector('[data-mtab="' + key + '"]'); }
  function tabName(key) { var t = tabOf(key); return t ? t.textContent.trim() : key; }
  function currentKey() {
    var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    return on ? on.getAttribute('data-mtab') : null;
  }
  function headOf(key) { return root.querySelector('[data-savehead="' + key + '"]'); }
  function barOf(key) { return root.querySelector('[data-reasonbar="' + key + '"]'); }
  /* 탭을 떠날 때 잃는 변경 건수(서버에 이미 있는 임시저장본은 세지 않는다) */
  function lossOf(key) { var h = headOf(key); return h ? Number(h.getAttribute('data-loss') || 0) : 0; }
  function showTab(key, focus) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-mtab') === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) { tab.focus(); }
    });
    root.querySelectorAll('[data-mpanel]').forEach(function (panel) { panel.hidden = panel.getAttribute('data-mpanel') !== key; });
    root.querySelectorAll('[data-savehead]').forEach(function (h) { h.hidden = h.getAttribute('data-savehead') !== key; });
    root.querySelectorAll('[data-reasonbar]').forEach(function (b) {
      var mine = b.getAttribute('data-reasonbar') === key;
      b.hidden = !mine || b.getAttribute('data-has-changes') !== 'true';
    });
    var url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url.pathname + url.search);
    root.querySelectorAll('[data-menu-near]').forEach(function (a) {
      var near = new URL(a.href);
      near.searchParams.set('tab', key);
      a.href = near.pathname + near.search;
    });
    // 숨겨져 있던 편집기는 보일 때 크기를 다시 잰다
    window.dispatchEvent(new Event('resize'));
  }
  function remember(next) {
    try { window.sessionStorage.setItem(NEXT_KEY, JSON.stringify({ id: menuId, tab: next })); } catch (e) { /* 보관을 못 쓰면 저장한 탭에 남는다 */ }
  }
  function takeNext() {
    try {
      var kept = JSON.parse(window.sessionStorage.getItem(NEXT_KEY));
      window.sessionStorage.removeItem(NEXT_KEY);
      return kept && kept.id === menuId ? kept.tab : null;
    } catch (e) { return null; }
  }
  /* 저장 안 한 변경이 있는 탭을 떠나려 하면 묻는다 */
  function requestTab(key, focus) {
    var cur = currentKey();
    if (!key || key === cur) { return; }
    var loss = cur ? lossOf(cur) : 0;
    if (!loss || !P) { showTab(key, focus); return; }
    var head = headOf(cur);
    var save = head && head.querySelector('[data-save], [data-access-save]');
    P.leave(tabOf(key), {
      title: '「' + tabName(cur) + '」에 저장 안 한 변경 ' + loss + '건이 있습니다',
      desc: '저장하지 않고 이동하면 바꾼 내용은 사라집니다.',
      canSave: !!save
    }).then(function (answer) {
      if (answer === 'discard') {
        discard(cur, key);
      } else if (answer === 'save' && save) {
        remember(key);
        save.click();
      }
    });
  }
  var discarders = {};
  function discard(cur, next) {
    var how = discarders[cur];
    if (how) { how(next); return; }
    var revert = headOf(cur) && headOf(cur).querySelector('[data-revert], [data-access-revert]');
    if (revert) { revert.click(); }
    showTab(next, true);
  }
  tabs.forEach(function (tab, index) {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', function () { requestTab(tab.getAttribute('data-mtab'), false); });
    tab.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) { return; }
      e.preventDefault();
      requestTab(tabs[(index + step + tabs.length) % tabs.length].getAttribute('data-mtab'), true);
    });
  });

  /* ── 저장 영역 · 사유 줄 · 탭 점: 탭마다 같은 모양으로 그린다(접근권한은 menu-access.js 가 window.menuEditUi 로) ── */
  function paint(key, state) {
    var head = headOf(key);
    var count = state.count || 0;
    if (head) {
      if (P) {
        P.savehead(head, { dirty: count, saved: state.saved || head.getAttribute('data-saved-text') });
      }
      head.setAttribute('data-loss', String(state.loss == null ? count : state.loss));
      var save = head.querySelector('[data-save], [data-access-save]');
      if (save && state.canSave != null) { save.disabled = !state.canSave; }
    }
    var bar = barOf(key);
    if (bar) {
      var has = (state.changes || []).length > 0;
      bar.setAttribute('data-has-changes', String(has));
      if (P) { P.reasonbar(bar, state.changes || []); }
      bar.hidden = !has || currentKey() !== key;
    }
    if (P) { P.tabDirty(tabOf(key), (state.loss == null ? count : state.loss) > 0); }
  }
  window.menuEditUi = { paint: paint, showTab: showTab, setDiscard: function (key, fn) { discarders[key] = fn; } };
  /* 저장했으면 그 탭 상태 글을 「저장됨 · 방금 · 이름」으로 */
  if (flashOk) {
    var savedBy = root.getAttribute('data-saved-by');
    var savedHead = headOf(currentKey());
    if (savedHead) { savedHead.setAttribute('data-saved-text', '저장됨 · 방금' + (savedBy ? ' · ' + savedBy : '')); }
    var flashMsg = root.getAttribute('data-flash-msg');
    if (flashMsg && tabOf('hist')) {
      document.addEventListener('DOMContentLoaded', function () { toast(/수정 이력/.test(flashMsg) ? flashMsg : flashMsg + ' 수정 이력에 남았습니다.', { href: '?tab=hist', linkText: '수정 이력 보기' }); });   // 키트 menu-edit-info-saved
    }
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.ntoast__link[href="?tab=hist"]') : null;
    if (link && tabOf('hist')) { e.preventDefault(); requestTab('hist', true); }
  });

  /* ── 칸 이름과 지금 값 ─────────────────────────────────────────── */
  function labelOf(el) {
    if (el.hasAttribute('data-change-label')) { return el.getAttribute('data-change-label'); }
    // 링크 줄 · 연결 대상 칸은 칸 이름으로 센다(입력 칸의 aria-label 은 「링크URL 직접입력」 · 「콘텐츠 선택」 같은 동작 이름)
    if (el.hasAttribute('data-address-input') || el.hasAttribute('data-address-pick') || el.getAttribute('data-target-types') === 'EXTERNAL_URL') { return '링크URL'; }
    if (el.classList.contains('cms-route-target__pick')) { return '연결 대상'; }
    if (el.getAttribute('aria-label')) { return el.getAttribute('aria-label'); }
    var lab = labelElOf(el);
    return lab ? lab.textContent.replace(/\*/g, '').replace(/이전:.*$/, '').trim() : el.name;
  }
  /* 「이전: 값」을 붙일 칸 이름 */
  function labelElOf(el) {
    if (el.closest('[data-owner]')) { return document.getElementById('e-owner-label'); }
    var by = el.getAttribute('aria-labelledby');
    if (by && document.getElementById(by.split(' ')[0])) { return document.getElementById(by.split(' ')[0]); }
    var opt = el.closest('.edx-opt');
    if (opt) { return opt.querySelector('.nv-field__label'); }
    var field = el.closest('.nv-field');
    return field ? field.querySelector('.nv-field__label') : null;
  }
  function textOf(el) {
    // 주소 칸의 「/」는 직접입력을 잇게 하려고 스크립트가 채운 값이라 주소가 없는 것과 같다
    if (el.hasAttribute('data-address-input') && el.value.trim() === '/') { return ''; }
    if (el.tagName === 'SELECT') { return el.selectedIndex >= 0 ? el.options[el.selectedIndex].text.trim() : ''; }
    if (el.type === 'checkbox') { return el.checked ? '켬' : '끔'; }
    return el.value.trim();
  }
  function fieldsOf(form) {
    return Array.prototype.filter.call(form.elements, function (el) {
      if (!el.name && el.getAttribute('role') !== 'switch') { return false; }
      if (el.name === 'reason' || el.name === '_csrf' || /Was$/.test(el.name) || el.name === 'returnEdit' || el.name === 'out' || el.name === 'outGiven') { return false; }
      return el.type !== 'submit' && el.type !== 'button' && !(el.type === 'hidden' && !el.hasAttribute('data-change-label') && !el.closest('[data-owner]'));
    });
  }
  function clearMarks(scope) { scope.querySelectorAll('[data-chg]').forEach(function (m) { m.remove(); }); }
  function mark(labelEl, prev) {
    if (!labelEl || labelEl.querySelector('[data-chg]')) { return; }
    var chg = document.createElement('span');
    chg.className = 'chg';
    chg.setAttribute('data-chg', '');
    chg.innerHTML = '<span class="chg__dot" aria-hidden="true"></span><span class="chg__prev"></span>';
    chg.lastChild.textContent = '이전: ' + (prev || '없음');
    labelEl.appendChild(chg);
  }

  /* ── 입력 오류: 칸 아래 글로 보이고 첫 오류로 옮긴다 ───────────────── */
  function clearErrors(scope) {
    scope.querySelectorAll('[data-field-error]').forEach(function (el) { el.remove(); });
    scope.querySelectorAll('[aria-invalid="true"][data-err-marked]').forEach(function (el) { el.removeAttribute('aria-invalid'); el.removeAttribute('data-err-marked'); });
  }
  function showError(el, text) {
    var err = document.createElement('span');
    err.className = 'nv-field__error';
    err.setAttribute('role', 'alert');
    err.setAttribute('data-field-error', '');
    err.id = (el.id || 'f') + '-err';
    err.textContent = text;
    (el.closest('.reasonbar__input, .nv-field') || el.parentNode).appendChild(err);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('data-err-marked', '');
  }
  function reasonError(input) {
    var text = input ? input.value.trim() : '';
    return input && Array.from(text).length < 2 ? '사유를 2자 이상 적으세요.' : null;
  }
  function failed(errors) {
    errors.forEach(function (e) { showError(e.el, e.text); });
    var first = errors[0].el;
    if (first.focus && !first.hidden) { first.focus(); }
    var noReason = errors.some(function (e) { return e.el.name === 'reason'; });
    toast(noReason && errors.length === 1 ? '사유를 적어야 저장합니다.' : '입력값을 확인하세요.');
    return false;
  }
  function validInfo(form) {
    clearErrors(document);
    var errors = [];
    var add = function (el, text) { if (el) { errors.push({ el: el, text: text }); } };
    var name = form.querySelector('#e-mname');
    if (name && !name.value.trim()) { add(name, '메뉴명을 입력하세요.'); }
    var code = form.querySelector('[data-menu-code-edit]');
    var parent = form.querySelector('[data-parent-select]');
    // 그대로 둔 코드는 보지 않는다(서비스도 바뀐 코드만 검사한다. 옛 메뉴의 코드가 꼴에 맞지 않아도 저장이 막히지 않게)
    if (code && !code.disabled && code.value !== code.defaultValue && (code.value.trim() || code.required)) {
      var value = code.value.trim();
      var used = (code.getAttribute('data-used-codes') || '').split(',');
      var option = parent && parent.options[parent.selectedIndex];
      var parentCode = option ? option.getAttribute('data-code') : null;
      if (!/^sub\d{2}(_\d{2}){0,4}$/i.test(value)) {
        add(code, 'sub01 · sub01_01 · sub01_01_01 꼴로 넣으세요.');
      } else if (parent && !parent.value && value.indexOf('_') >= 0) {
        add(code, '최상위 메뉴코드는 sub01 꼴입니다.');
      } else if (parentCode && (value.toLowerCase().indexOf(parentCode.toLowerCase() + '_') !== 0 || value.split('_').length !== parentCode.split('_').length + 1)) {
        add(code, '상위 메뉴코드 아래여야 합니다(예: ' + parentCode + '_01).');
      } else if (used.indexOf(value.toLowerCase()) >= 0) {
        add(code, value + ' 은 다른 메뉴가 쓰고 있습니다.');
      }
    }
    var type = form.querySelector('[data-route-target-type]');
    var kind = type ? type.value : '';
    var path = form.querySelector('[data-address-input]');
    if (path && path.required) {
      var address = path.value.trim();
      if (!address || address === '/') {
        add(path.hidden ? form.querySelector('[data-address-pick]') : path, '주소를 / 뒤에 이어서 입력하세요.');
      } else if (!/^\/\S*$/.test(address)) {
        add(path, '링크URL은 /로 시작해야 합니다(예: /intro/greeting).');
      }
    }
    if (kind === 'EXTERNAL_URL') {
      var url = form.querySelector('input[data-target-types="EXTERNAL_URL"]');
      if (url && url.value !== url.defaultValue && !/^https?:\/\/\S+$/.test(url.value.trim())) { add(url, 'https:// 로 시작하는 주소를 넣으세요.'); }
    }
    if (['CONTENT', 'BOARD', 'EXTENSION_PROGRAM', 'PAGE'].indexOf(kind) >= 0) {
      var target = form.querySelector('.cms-route-target__pick:not([disabled]):not([data-target-types="EXTERNAL_URL"])');
      if (target && !target.value.trim()) { add(target, '연결 대상을 고르세요.'); }
    }
    var sort = form.querySelector('#e-msort');
    if (sort && !/^-?\d+$/.test(sort.value.trim())) {
      add(sort, '숫자를 넣으세요.');
    } else if (sort && Number(sort.value) < 0) {
      add(sort, '0 이상 숫자를 넣으세요.');
    }
    var board = form.querySelector('[name="boardName"]');
    if (board && !board.value.trim()) { add(board, '게시판명을 입력하세요.'); }
    var reason = document.getElementById('reason-info');
    var why = reasonError(reason);
    if (why) { add(reason, why); }
    return errors.length ? failed(errors) : true;
  }
  function validPerm() {
    clearErrors(document);
    var reason = document.getElementById('reason-perm');
    var why = reasonError(reason);
    return why ? failed([{ el: reason, text: why }]) : true;
  }
  document.addEventListener('input', function (e) {
    var line = e.target.closest ? e.target.closest('.nv-field, .reasonbar__input') : null;
    if (line && line.querySelector('[data-field-error]')) { clearErrors(line); }
  });

  /* ── 메뉴 정보 · 게시판 정보 ───────────────────────────────────── */
  var infoForm = document.getElementById('info-form');
  var syncOwner = null;
  var noteOwner = null;
  if (infoForm) {
    infoForm.noValidate = true;
    var infoHead = headOf('info');
    var revertBtn = infoHead ? infoHead.querySelector('[data-revert]') : null;
    var snapshot = function () {
      var values = [];
      fieldsOf(infoForm).forEach(function (el) { if (!el.disabled) { values.push({ el: el, label: labelOf(el), text: textOf(el) }); } });
      return values;
    };
    var initial = snapshot();
    var infoBase = JSON.stringify(initial.map(function (v) { return v.text; }));
    var infoReady = false;
    var ownerField = function (k) { return infoForm.querySelector('[data-owner-field="' + k + '"]'); };
    var ownerWas = function (k) { var f = ownerField(k); var v = f && initial.filter(function (x) { return x.el === f; })[0]; return v ? v.text : ''; };
    /* 다른 칸이 켜야 쓸 수 있는 칸([data-enabled-by="칸 id"], 게시판의 최대 첨부 개수) */
    var syncDependents = function () {
      infoForm.querySelectorAll('[data-enabled-by]').forEach(function (el) {
        var by = document.getElementById(el.getAttribute('data-enabled-by'));
        if (by) { el.disabled = !by.checked; }
      });
    };
    var refresh = function () {
      syncDependents();
      var changes = [];
      var silent = [];   // 담당자를 고를 때 따라 바뀌는 칸은 담당자 한 줄로 센다. 이름이 같은 다른 사람이면 아이디를 적는다
      clearMarks(infoForm);
      fieldsOf(infoForm).forEach(function (el) {
        var was = initial.filter(function (v) { return v.el === el; })[0];
        var now = el.disabled ? null : textOf(el);
        var item = null;
        if (was && now !== null && was.text !== now) {
          item = { el: el, name: was.label, from: was.text || '없음', to: now || '없음' };
        } else if (!was && now) {
          item = { el: el, name: labelOf(el), from: '없음', to: now };
        }
        if (item) { (el.hasAttribute('data-change-silent') ? silent : changes).push(item); }
      });
      var ownerNamed = changes.filter(function (c) { return c.el === ownerField('name'); })[0];
      if (ownerNamed) {
        ownerNamed.name = '담당자';
      } else if (silent.some(function (c) { return c.el === ownerField('id'); })) {
        // 이름이 같은 다른 사람: 아이디로 적는다
        var login = function (v) { return String(v || '').replace(/^(member|emp):/, ''); };
        changes.push({ el: ownerField('name'), name: '담당자', from: (ownerWas('name') || '없음') + (ownerWas('id') ? ' (' + login(ownerWas('id')) + ')' : ''),
          to: (ownerField('name').value || '없음') + (ownerField('id').value ? ' (' + login(ownerField('id').value) + ')' : '') });
      }
      changes.forEach(function (c) {
        if (c.el.closest('[data-owner]')) {
          mark(document.getElementById('e-owner-label'), ownerWas('name') ? ownerWas('name') + (ownerWas('id') ? ' (' + ownerWas('id').replace(/^(member|emp):/, '') + ')' : '') : '없음');
        } else {
          mark(labelElOf(c.el), c.from);
        }
      });
      var clean = changes.length === 0;
      paint('info', { count: changes.length, canSave: !clean, changes: changes.map(function (c) { return { name: c.name, from: c.from, to: c.to }; }) });
      if (revertBtn) { revertBtn.disabled = clean; }
      if (noteOwner) { noteOwner(); }
      if (drafts && infoReady) {
        if (clean) {
          drafts.drop(menuId, 'info');
        } else {
          drafts.save(menuId, 'info', infoBase, changes.length, fieldsOf(infoForm).map(function (el) {
            return el.type === 'checkbox' ? el.checked : el.value;
          }));
        }
      }
    };
    var sourceOpen = infoForm.querySelector('[data-source-open]');
    if (sourceOpen) {
      var syncSourceOpen = function () {
        var picked = infoForm.querySelector('select[data-target-types="CONTENT"]');
        var savedId = infoForm.querySelector('[name="targetIdWas"]');
        var savedType = infoForm.querySelector('[name="targetTypeWas"]');
        sourceOpen.hidden = !root.querySelector('[data-mtab="src"]') || !picked || picked.disabled || !picked.value
          || picked.value !== savedId.value || savedType.value !== 'CONTENT';
      };
      sourceOpen.addEventListener('click', function () { requestTab('src', true); });
      infoForm.addEventListener('change', syncSourceOpen);
      document.addEventListener('DOMContentLoaded', syncSourceOpen);
    }
    infoForm.addEventListener('input', refresh);
    infoForm.addEventListener('change', refresh);
    var revertInfo = function (quiet) {
      infoForm.reset();
      infoForm.querySelectorAll('[role="switch"]').forEach(function (sw) { if (sw.previousElementSibling) { sw.previousElementSibling.value = String(sw.checked); } });
      // 숨은 칸은 폼 초기화로 돌아오지 않는다(담당자)
      initial.forEach(function (v) { if (v.el.type === 'hidden') { v.el.value = v.el.defaultValue; } });
      var type = infoForm.querySelector('[data-route-target-type]');
      if (type && window.menuTypeSync) { window.menuTypeSync(type); }
      var parentPick = infoForm.querySelector('[data-parent-select]');
      if (parentPick) { parentPick.dispatchEvent(new Event('change', { bubbles: true })); }
      clearErrors(document);
      var reason = document.getElementById('reason-info');
      if (reason) { reason.value = ''; }
      if (typeof syncOwner === 'function') { syncOwner(); }
      refresh();
      if (!quiet) { toast('고친 내용을 버렸습니다.'); }
    };
    if (revertBtn) {
      revertBtn.addEventListener('click', function () {
        revertInfo(false);
        // 누른 단추가 비활성이 되어 초점이 사라지지 않게 지금 탭으로 옮긴다
        var infoTab = tabOf('info');
        if (infoTab) { infoTab.focus(); }
      });
    }
    window.menuEditUi.setDiscard('info', function (next) { revertInfo(true); showTab(next, true); });

    /* 담당자: 「담당자 변경」 → 칸 아래 검색창 + 옵션창 → 「상세 검색」 모달 */
    var owner = infoForm.querySelector('[data-owner]');
    if (owner) {
      var picker = owner.querySelector('[data-owner-picker]');
      var query = owner.querySelector('#owner-q');
      var pickBtn = owner.querySelector('[data-ownerpick]');
      var pickLabel = owner.querySelector('[data-ownerpick-label]');
      var clearOwner = owner.querySelector('[data-ownerclear]');
      var note = owner.querySelector('[data-owner-note]');
      var searchUrl = pickBtn.getAttribute('data-search-url');
      var loginOf = function (id) { return String(id || '').replace(/^(member|emp):/, ''); };
      var show = function (k) { return owner.querySelector('[data-owner-show="' + k + '"]'); };
      /* 담당 부서는 읽기 전용: 저장 때 서버가 담당자의 직원 명부(부서 · 직위)에서 정한다. 고를 때는 같은 규칙의 미리보기(manager-profile)를 보인다 */
      var profileUrl = owner.getAttribute('data-profile-url');
      var deptWas = show('dept').getAttribute('data-was') || '';
      var profiles = {};
      var loading = {};
      var loadProfile = function (id) {
        if (!profileUrl || !id || profiles[id] || loading[id]) { return; }
        loading[id] = true;
        fetch(profileUrl + '?id=' + encodeURIComponent(id), { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (p) {
            profiles[id] = p;
            if (ownerField('id').value !== id) { return; }
            ownerField('tel').value = p.tel || '';
            ownerField('email').value = p.email || '';
            syncOwner();
            refresh();
          })
          .catch(function () { /* 미리보기를 못 읽어도 저장 때 서버가 정한다 */ })
          .then(function () { loading[id] = false; });
      };
      var ownerDept = function () {
        var id = ownerField('id').value;
        if (id === ownerWas('id') && ownerField('name').value === ownerWas('name')) { return deptWas; }
        if (!id) { return ''; }
        if (profiles[id]) { return profiles[id].dept || ''; }
        loadProfile(id);
        return null;
      };
      syncOwner = function () {
        var name = ownerField('name').value;
        var id = ownerField('id').value;
        var nameBox = show('name');
        nameBox.innerHTML = '';
        var b = document.createElement('b');
        b.textContent = name || '없음';
        nameBox.appendChild(b);
        if (id) {
          var small = document.createElement('small');
          small.className = 'nv-mono';
          small.textContent = loginOf(id);
          nameBox.appendChild(small);
        }
        nameBox.classList.toggle('ro-val--empty', !name);
        ['tel', 'email'].forEach(function (k) {
          show(k).textContent = ownerField(k).value || '—';
          show(k).classList.toggle('ro-val--empty', !ownerField(k).value);
        });
        var dept = ownerDept();
        if (dept !== null) {
          show('dept').textContent = dept || '—';
          show('dept').classList.toggle('ro-val--empty', !dept);
        }
        var empty = !id && !name;
        clearOwner.hidden = empty;
        pickLabel.textContent = empty ? '담당자 찾기' : '담당자 변경';
      };
      /* 담당자가 바뀌면 미리 알린다: 누리집 「정보담당자」와 관리자 권한의 담당자 */
      noteOwner = function () {
        var wasId = ownerWas('id'), wasName = ownerWas('name');
        var nowId = ownerField('id').value, nowName = ownerField('name').value;
        /* 키트 owner-changed · owner-empty: 안내가 뜨는 동안 아래 설명 줄(.edx-hint)은 감춘다 */
        var ownerHint = owner.querySelector('.edx-hint');
        if (wasId === nowId && wasName === nowName) { note.hidden = true; note.innerHTML = ''; if (ownerHint) { ownerHint.hidden = false; } return; }
        note.hidden = false;
        if (ownerHint) { ownerHint.hidden = true; }
        if (!nowId && !nowName) {
          var who = wasName + (wasId ? '(' + loginOf(wasId) + ')' : '');
          note.innerHTML = '<b>담당자 없이 저장됩니다</b><span>저장하면 누리집 「정보담당자」가 비고, ' + esc(who) + '은 이 메뉴 「관리자 권한」에서 빠집니다.</span>'
            + '<button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-owner-restore>' + esc(wasName || loginOf(wasId)) + ' 다시 지정</button>';
        } else {
          note.innerHTML = '<b>담당자가 바뀝니다</b><span>저장하면 누리집 「정보담당자」와 이 메뉴 「관리자 권한」의 담당자도 ' + esc(nowName || loginOf(nowId)) + '(으)로 바뀝니다.</span>';
        }
      };
      /* 담당자가 바뀌면 이전 담당자의 부서 · 연락처 · 이메일을 남기지 않는다. 콘솔 계정 · 명부에 없는 사람은 이 값들이 없어 비어 있다 */
      var setOwner = function (p) {
        ownerField('id').value = p ? p.id : '';
        ownerField('name').value = p ? p.name : '';
        ownerField('tel').value = p ? p.tel || '' : '';
        ownerField('email').value = p ? p.email || '' : '';
        // 미리보기가 오기 전에는 찾기 결과의 부서를 보인다
        show('dept').textContent = p && p.org ? p.org : '—';
        show('dept').classList.toggle('ro-val--empty', !(p && p.org));
        syncOwner();
        closePicker(false);
        refresh();
      };
      owner.addEventListener('click', function (e) {
        if (e.target.closest('[data-owner-restore]')) {
          ['id', 'name', 'tel', 'email'].forEach(function (k) { ownerField(k).value = ownerField(k).defaultValue; });
          syncOwner();
          refresh();
          pickBtn.focus();
        }
      });
      var search = function (q) {
        return fetch(searchUrl + '?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
      };
      var openPicker = function () {
        picker.hidden = false;
        pickBtn.setAttribute('aria-expanded', 'true');
        query.focus();
      };
      var closePicker = function (focusBack) {
        if (picker.hidden) { return; }
        picker.hidden = true;
        pickBtn.setAttribute('aria-expanded', 'false');
        if (ownerPick) { ownerPick.clear(); }
        if (focusBack) { pickBtn.focus(); }
      };
      var ownerPick = P ? P.pick(owner.querySelector('[data-owner-pick]'), {
        search: function (q) {
          return search(q).then(function (people) {
            var curId = ownerField('id').value;
            return people.map(function (p) {
              var now = curId && p.id === curId;
              return { label: p.name, id: p.login || loginOf(p.id), meta: p.org || '', badge: now ? '현재 담당자' : null, disabled: now, value: p };
            });
          });
        },
        onPick: function (row) { setOwner(row.value); pickBtn.focus(); },
        foot: { label: '상세 검색', meta: '부서 · 연락처 · 이메일 · 아이디로 찾기', onClick: function (q) { openFind(q); } },
        empty: '맞는 서브관리자가 없습니다. 회원은 고를 수 없습니다.'
      }) : null;
      pickBtn.addEventListener('click', function () { if (picker.hidden) { openPicker(); } else { closePicker(true); } });
      owner.querySelector('[data-pickclose]').addEventListener('click', function () { closePicker(true); });
      clearOwner.addEventListener('click', function () { setOwner(null); pickBtn.focus(); });
      query.addEventListener('keydown', function (e) {
        // 옵션창이 닫힌 뒤의 Esc 는 검색창을 닫는다(옵션창이 열려 있으면 nvParts.pick 이 먼저 닫는다)
        if (e.key === 'Escape') { e.preventDefault(); closePicker(true); }
      });

      /* 상세 검색 모달: 찾기 · 항목 · 부서 거르기 · 쪽 나누기는 서버(manager-search?limit=)가 한다. 검색어가 비면 전체 */
      var modal = document.querySelector('[data-owner-find]');
      var found = [];
      var page = 0;
      var total = 0;
      var PAGE = 10;
      var deptsLoaded = false;
      var openFind = function (q) {
        if (!modal) { return; }
        modal.querySelector('[data-owner-find-q]').value = q || '';
        // 옵션창 검색어를 들고 오므로 항목은 「전체」부터(이름이 아닌 사번 · 부서 · 연락처를 쳤어도 0건이 되지 않게)
        modal.querySelector('[data-owner-find-field]').value = 'all';
        if (window.nvAdmin) { window.nvAdmin.openModal(modal, pickBtn); } else { modal.hidden = false; }
        window.setTimeout(function () { modal.querySelector('[data-owner-find-q]').focus(); }, 40);
        page = 0;
        runFind();
      };
      var closeFind = function () { if (window.nvAdmin) { window.nvAdmin.closeModal(); } else { modal.hidden = true; } };
      var renderFind = function () {
        var curId = ownerField('id').value;
        var totalEl = modal.querySelector('[data-owner-find-total]');
        totalEl.innerHTML = '총 <b>' + total.toLocaleString('ko-KR') + '</b>명';
        var pages = Math.max(1, Math.ceil(total / PAGE));
        var body = modal.querySelector('[data-owner-find-rows]');
        body.innerHTML = found.map(function (p, i) {
          var now = curId && p.id === curId;
          var no = total - (page * PAGE + i);
          return '<tr><td><label class="nv-radio"><input type="radio" name="owner-find-pick" value="' + esc(p.id) + '"' + (now ? ' disabled' : '') + ' aria-label="' + esc(p.name) + ' 고르기"></label></td>'
            + '<td>' + (now ? '<span class="chip-now">현재</span>' : '<span class="findtable__no">' + no + '</span>') + '</td>'
            + '<td>' + esc(p.org || '—') + '</td><td class="findtable__name">' + esc(p.name) + '</td><td class="nv-mono">' + esc(p.tel || '—') + '</td>'
            + '<td>' + esc(p.email || '—') + '</td><td class="nv-mono">' + esc(p.login || loginOf(p.id)) + '</td></tr>';
        }).join('') || '<tr><td colspan="7"><div class="nv-empty"><p class="nv-empty__title">찾은 서브관리자가 없습니다.</p></div></td></tr>';
        var pager = modal.querySelector('[data-owner-find-pager]');
        pager.hidden = pages <= 1;
        // 쪽 번호는 열 개씩 묶어 보인다(키트 .pager)
        var first = Math.floor(page / 10) * 10;
        var last = Math.min(pages - 1, first + 9);
        var html = '<button type="button" class="pager__btn" data-find-page="' + (page - 1) + '"' + (page === 0 ? ' disabled' : '') + '><svg class="nv-icon flip" aria-hidden="true"><use href="#nv-i-chevron-right"/></svg>이전</button>';
        for (var n = first; n <= last; n++) {
          html += '<button type="button" class="pager__btn" data-find-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + (n + 1) + '</button>';
        }
        html += '<button type="button" class="pager__btn" data-find-page="' + (page + 1) + '"' + (page >= pages - 1 ? ' disabled' : '') + '>다음<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-chevron-right"/></svg></button>';
        pager.innerHTML = html;
        modal.querySelector('[data-owner-find-pick]').disabled = true;
      };
      var fillDepts = function (depts) {
        if (deptsLoaded) { return; }
        deptsLoaded = true;
        var deptSel = modal.querySelector('[data-owner-find-dept]');
        deptSel.innerHTML = '<option value="">부서 전체</option>' + (depts || []).map(function (d) {
          var pad = new Array(Math.min(Number(d.depth) || 0, 6) + 1).join('\u00a0\u00a0');
          return '<option value="' + esc(d.id) + '">' + pad + esc(d.name) + '</option>';
        }).join('');
      };
      var runFind = function () {
        var q = modal.querySelector('[data-owner-find-q]').value.trim();
        var totalEl = modal.querySelector('[data-owner-find-total]');
        var params = 'q=' + encodeURIComponent(q)
          + '&field=' + encodeURIComponent(modal.querySelector('[data-owner-find-field]').value)
          + '&dept=' + encodeURIComponent(modal.querySelector('[data-owner-find-dept]').value)
          + '&offset=' + (page * PAGE) + '&limit=' + PAGE;
        totalEl.textContent = '찾는 중…';
        fetch(searchUrl + '?' + params, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (res) {
            found = res.items || [];
            total = res.total || 0;
            fillDepts(res.departments);
            renderFind();
          }).catch(function () { totalEl.textContent = '찾지 못했습니다. 잠시 뒤 다시 시도하세요.'; });
      };
      if (modal) {
        modal.querySelector('[data-owner-find-form]').addEventListener('submit', function (e) { e.preventDefault(); page = 0; runFind(); });
        modal.querySelector('[data-owner-find-dept]').addEventListener('change', function () { page = 0; runFind(); });
        modal.querySelectorAll('[data-owner-find-close]').forEach(function (b) { b.addEventListener('click', closeFind); });
        modal.addEventListener('click', function (e) {
          var go = e.target.closest('[data-find-page]');
          if (go && !go.disabled) { page = Number(go.getAttribute('data-find-page')); runFind(); }
        });
        modal.addEventListener('change', function (e) {
          if (e.target.name === 'owner-find-pick') { modal.querySelector('[data-owner-find-pick]').disabled = false; }
        });
        modal.querySelector('[data-owner-find-pick]').addEventListener('click', function () {
          var picked = modal.querySelector('input[name="owner-find-pick"]:checked');
          var person = picked && found.filter(function (p) { return p.id === picked.value; })[0];
          if (!person) { return; }
          closeFind();
          setOwner(person);
          pickBtn.focus();
        });
      }
    }
    refresh();

    /* 고치던 값 되살리기: 메뉴 유형을 먼저 맞춰야 켜지는 칸이 정해진다(navigation.js 의 첫 정렬 뒤에 돈다) */
    document.addEventListener('DOMContentLoaded', function () {
      var kept = drafts ? drafts.load(menuId, 'info', infoBase) : null;
      var els = fieldsOf(infoForm);
      if (kept && kept.length === els.length) {
        var typeSelect = infoForm.querySelector('[data-route-target-type]');
        if (typeSelect) {
          var typeAt = els.indexOf(typeSelect);
          if (typeAt >= 0) { typeSelect.value = kept[typeAt]; }
          if (window.menuTypeSync) { window.menuTypeSync(typeSelect); }
        }
        els.forEach(function (el, i) {
          syncDependents();
          if (el.disabled || kept[i] === null || kept[i] === undefined) { return; }
          if (el.type === 'checkbox') {
            el.checked = kept[i];
            if (el.getAttribute('role') === 'switch' && el.previousElementSibling) { el.previousElementSibling.value = String(el.checked); }
          } else {
            el.value = kept[i];
          }
        });
        var parentRestored = infoForm.querySelector('[data-parent-select]');
        if (parentRestored) { parentRestored.dispatchEvent(new Event('change', { bubbles: true })); }
        if (typeof syncOwner === 'function') { syncOwner(); }
      }
      // 게시판 [추가]에서 돌아왔으면 보관본이 덮은 칸에 새 게시판을 다시 고른다
      if (window.menuApplyPick) { window.menuApplyPick(); }
      infoReady = true;
      refresh();
    });
  }

  /* ── 소스 수정: 콘텐츠 저장 경로의 폼들이 이 탭으로 돌아오게 한다. 폼이 탭 안에 있거나 탭 안의 입력과 이어져 있다 ── */
  var source = root.querySelector('[data-menu-source]');
  if (source) {
    source.querySelectorAll('form').forEach(function (form) {
      var back = document.createElement('input');
      back.type = 'hidden';
      back.name = 'returnMenu';
      back.value = menuId;
      form.appendChild(back);
    });
    /* 버전 상태 필터는 탭을 다시 읽을 뿐이고 고친 내용은 보관본으로 되살아난다 — 묻지 않고 바로 바꾼다(보관을 못 쓰면 content-editor.js 가 묻는다) */
    // 편집기 조각의 안내 글은 콘텐츠 관리 단추 이름([수정하기])으로 적혀 있다 — 이 탭의 단추는 위 막대 「소스 저장」
    source.querySelectorAll('[data-edit-base]').forEach(function (p) { p.textContent = p.textContent.split('[수정하기]는').join('[소스 저장]은').split('[수정하기]').join('[소스 저장]'); });
    var versionFilter = source.querySelector('[data-version-filter]');
    if (versionFilter && drafts) { versionFilter.setAttribute('data-unsaved-skip', ''); }
    var srcHead = headOf('src');
    if (srcHead) {
      var srcLabels = { ctTitle: '제목', ctBody: '본문', ctFormat: '본문 형식', ctSummary: '요약' };
      var tracked = Object.keys(srcLabels).map(function (id) { return document.getElementById(id); }).filter(Boolean);
      var srcValues = function () { return tracked.map(function (el) { return el.value; }); };
      var srcInitial = srcValues();
      var srcBase = JSON.stringify(srcInitial);
      var otherDirty = false;   // SEO 처럼 따로 저장하는 칸: 보관하지 않고, 떠날 때 묻는 데만 쓴다
      var reasonMark = barOf('src') ? barOf('src').querySelector('[data-reason-mark]') : null;
      var publishBox = source.querySelector('[data-publish-setting]');
      var publishNow = function () {
        var checked = publishBox && publishBox.querySelector('[data-publish-mode]:checked');
        var at = publishBox && publishBox.querySelector('input[name="publishAt"]');
        return { mode: checked ? checked.value : '', at: at ? at.value : '' };
      };
      var publishFirst = publishNow();
      var hasServerDraft = srcHead.hasAttribute('data-server-draft');
      var srcRevert = srcHead.querySelector('[data-revert]');
      var refreshSrc = function () {
        var now = srcValues();
        var changes = [];
        var changed = 0;
        now.forEach(function (v, i) {
          if (v !== srcInitial[i]) {
            changed += 1;
            changes.push({ name: srcLabels[tracked[i].id], text: '고침' });
          }
        });
        // 이미 예약한 버전의 예약 시각 · 방식을 바꾸면 「소스 저장」으로 저장할 것이 생긴다
        var publish = publishNow();
        if (publishFirst.mode === 'schedule' && (publish.mode !== 'schedule' || publish.at !== publishFirst.at)) {
          changes.push({ name: '예약', text: '바꿈' });
        }
        var unsaved = changes.length;
        // 서버에 임시저장본이 있으면 고칠 것이 없어도 저장할 것이 있다(게시해야 끝난다). 나가도 사라지지 않으니 떠날 때 묻지 않는다
        if (unsaved === 0 && hasServerDraft) { changes.push({ name: '본문', text: '임시저장본(게시 전)' }); }
        var saveable = changes.length > 0;
        if (otherDirty) { changes.push({ name: '따로 저장하는 칸', text: '고침' }); }
        var loss = unsaved + (otherDirty ? 1 : 0);
        srcHead.setAttribute('data-clean', String(changes.length === 0));
        if (reasonMark) { reasonMark.hidden = publish.mode === 'draft'; }
        paint('src', { count: changes.length, loss: loss, canSave: saveable, changes: changes });
        if (srcRevert) { srcRevert.disabled = changed === 0 && !otherDirty; }
        if (drafts) {
          if (changed === 0) { drafts.drop(menuId, 'src'); } else { drafts.save(menuId, 'src', srcBase, changed, now); }
        }
      };
      var onSrcEdit = function (e) {
        // 사유와 버전 상태 필터는 저장할 내용이 아니다
        if (e.target.id === 'ct-reason' || e.target.closest('[data-version-filter]')) { return; }
        // 위지윅 안의 입력은 글상자로 옮겨진 뒤 글상자 값으로 센다. 게시 방식 · 예약 시각은 본문 변경이 아니다
        if (tracked.indexOf(e.target) < 0 && !e.target.closest('.sun-editor') && !e.target.closest('[data-publish-setting]')) { otherDirty = true; }
        refreshSrc();
      };
      /* 고치던 본문 되살리기: 편집기(content-editor.js)가 DOMContentLoaded 에 글상자 값을 읽어 뜨므로 그 전에 넣는다 */
      var srcKept = drafts ? drafts.load(menuId, 'src', srcBase) : null;
      if (srcKept && srcKept.length === tracked.length) {
        tracked.forEach(function (el, i) { el.value = srcKept[i]; });
      }
      refreshSrc();
      source.addEventListener('input', onSrcEdit);
      source.addEventListener('change', function (e) { if (e.target.closest('[data-publish-setting]')) { refreshSrc(); } });
      /* 되돌리기: 편집기 본문은 저장된 것으로 다시 읽는다(보관본을 지우고 이 탭을 다시 연다) */
      var reloadSource = function (tab) {
        if (drafts) { drafts.drop(menuId, 'src'); }
        submitting = true;
        var url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.location.replace(url.pathname + url.search);
      };
      if (srcRevert) { srcRevert.addEventListener('click', function () { reloadSource('src'); }); }
      window.menuEditUi.setDiscard('src', function (next) { reloadSource(next); });
      /* 아래 줄 [미리보기]: 고치던 내용을 이 화면 안 미리보기로 */
      var previewBtn = source.querySelector('[data-source-preview]');
      var viewPreview = source.querySelector('.cms-admin-editor [data-view-set="preview"]');
      if (previewBtn && viewPreview) {
        previewBtn.addEventListener('click', function () {
          viewPreview.click();
          viewPreview.focus();
        });
      }
    }
  }

  /* ── 떠날 때 · 저장 보낼 때 ─────────────────────────────────────── */
  /* 저장 안 한 변경은 탭에 보관되므로 목록 · 이전/다음 · 옆 메뉴로 나갈 때는 묻지 않는다. 탭 닫기 · 새로 고침, 소스 탭 안의 버전 열기처럼
   * 보관본이 이어지지 않는 경우에만 묻는다 */
  var submitting = false;
  var leavingKept = false;
  window.addEventListener('beforeunload', function (e) {
    var dirty = Array.prototype.some.call(root.querySelectorAll('[data-savehead]'), function (h) { return Number(h.getAttribute('data-loss') || 0) > 0; });
    if (submitting || (drafts && leavingKept) || !dirty) { return; }
    e.preventDefault();
    e.returnValue = '';
  });
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    leavingKept = !!link && (!link.closest('[data-mpanel]') || link.hasAttribute('data-draft-kept')) && link.target !== '_blank' && !link.hasAttribute('download');
  }, true);
  var PARTS = { 'info-form': 'info', 'perm-form': 'perm', 'ct-save-form': 'src' };
  var permForm = document.getElementById('perm-form');
  if (permForm) { permForm.noValidate = true; }
  document.addEventListener('submit', function (e) {
    var invalid = (e.target === infoForm && !validInfo(infoForm)) || (e.target === permForm && !validPerm());
    if (invalid) {
      e.preventDefault();
      e.stopImmediatePropagation();
      try { window.sessionStorage.removeItem(NEXT_KEY); } catch (err) { /* 없음 */ }
      return;
    }
    submitting = true;
    var part = PARTS[e.target.id];
    if (drafts && part) { drafts.submitting(menuId, part); }
  }, true);

  /* 「저장하고 이동」으로 저장했으면 가려던 탭을 연다 */
  var next = takeNext();
  if (next && flashOk && tabOf(next)) { showTab(next, false); }
})();
