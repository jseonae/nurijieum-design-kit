/*
 * admin-interactions.js — 관리자 콘솔 공통 상호작용 (접근성 100% 전제).
 *
 * 선언적 data-* 속성만으로 동작하며 외부 라이브러리에 의존하지 않는다.
 *   1) reveal-on-click : [data-reveal] 버튼이 대상 폼/패널의 hidden 을 토글
 *      (aria-expanded 동기화, 펼칠 때 첫 입력으로 포커스, Esc·취소 시 닫고 트리거로 복원).
 *      패널에 data-reveal-url="키=값" 이 있으면 열 때 주소에 붙이고(pushState) 뒤로가기로 닫으며, 그 주소로 들어오면 연다.
 *   2) tabs            : [data-tabs] 컨테이너의 [role=tab] 전환 (aria-selected/패널 hidden,
 *      좌우 화살표·Home/End 키보드 이동, 로빙 tabindex).
 *   3) url-open        : [data-url-open="#input"] 이 입력값 URL 을 새 탭으로 안전하게 연다.
 *   4) auto-submit     : [data-autosubmit] select/입력이 바뀌면 소속 form 을 제출(페이지당 수·필터).
 *   5) post-preview    : [data-post-preview] 버튼이 원본 폼의 data-preview-fields(공백 구분) 칸만 임시 폼에 옮겨 담아
 *      data-preview-action 으로 새 창(target=_blank) POST — 저장하지 않은 글·콘텐츠 미리보기.
 *
 * 모든 기능은 키보드 단독으로 완결되며 스크린리더 상태를 정확히 노출한다.
 */
(function () {
  'use strict';

  function focusFirstField(panel) {
    var el = panel.querySelector(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]'
    );
    if (el) { el.focus(); }
  }

  // 1) reveal-on-click ------------------------------------------------------
  function setReveal(trigger, panel, open) {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) { focusFirstField(panel); }
  }

  // 주소에 남기는 화면([data-reveal-url="키=값"], 예: 게시글 수정 editPost=P1): 열면 history.pushState 로 주소에 붙이고,
  // 브라우저 뒤로가기(popstate)면 닫는다. 그 주소로 바로 들어오면(새로고침 · 링크 · 작업 뒤 돌아오기) 열린 채로 시작한다.
  function revealParam(panel) {
    var kv = (panel.getAttribute('data-reveal-url') || '').split('=');
    return kv.length === 2 && kv[0] ? kv : null;
  }
  function revealInUrl(panel) {
    var kv = revealParam(panel);
    return !!kv && new URLSearchParams(window.location.search).get(kv[0]) === kv[1];
  }
  function revealUrl(panel, open) {
    var kv = revealParam(panel);
    var url = new URL(window.location.href);
    if (open) { url.searchParams.set(kv[0], kv[1]); } else { url.searchParams.delete(kv[0]); }
    return url.pathname + url.search + url.hash;
  }
  function revealTriggers(panel) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-reveal="#' + CSS.escape(panel.id) + '"]'));
  }
  function revealTrigger(panel) {
    return panel.cmsRevealTrigger || revealTriggers(panel)[0] || null;
  }
  function shown(el) { return !!el && el.getClientRects().length > 0; }
  // 닫은 뒤 포커스: 연 단추가 보이면 그 단추, 아니면 보이는 다른 트리거, 트리거가 닫힌 드롭메뉴 안이면 그 줄의 ▾ 단추,
  // 그것도 없으면(주소로 바로 연 화면 등) 페이지 제목 — 포커스가 body 로 떨어지지 않게
  function focusAfterClose(panel) {
    var target = shown(panel.cmsRevealTrigger) ? panel.cmsRevealTrigger : revealTriggers(panel).filter(shown)[0];
    if (!target) {
      revealTriggers(panel).some(function (t) {
        var menu = t.closest('.nv-dropmenu');
        var button = menu ? menu.querySelector('[data-dropmenu]') : null;
        if (shown(button)) { target = button; }
        return !!target;
      });
    }
    if (!target) {
      target = document.querySelector('main h1') || document.querySelector('h1');
      if (target && !target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
    }
    if (target) { target.focus(); }
  }
  function openReveal(trigger, panel) {
    panel.cmsRevealTrigger = trigger;
    setReveal(trigger, panel, true);
    if (revealParam(panel) && !revealInUrl(panel)) {
      history.pushState({ cmsReveal: panel.id }, '', revealUrl(panel, true));
    }
  }
  function closeReveal(panel) {
    var trigger = revealTrigger(panel);
    if (revealParam(panel) && revealInUrl(panel)) {
      // 열 때 쌓은 기록이면 뒤로가기와 같게(popstate 가 닫는다), 주소로 바로 연 화면이면 주소에서만 뺀다
      if (history.state && history.state.cmsReveal === panel.id) { history.back(); return; }
      history.replaceState(history.state, '', revealUrl(panel, false));
    }
    if (trigger) { setReveal(trigger, panel, false); } else { panel.hidden = true; }
    focusAfterClose(panel);
  }

  function initReveal(root) {
    var triggers = root.querySelectorAll('[data-reveal]');
    triggers.forEach(function (trigger) {
      var sel = trigger.getAttribute('data-reveal');
      var panel = sel ? document.querySelector(sel) : null;
      if (!panel) { return; }
      // 기본 닫힘 (JS 미동작 시 noscript 대비는 hidden 미부여로 graceful degrade)
      if (!trigger.hasAttribute('aria-expanded')) {
        trigger.setAttribute('aria-expanded', String(!panel.hidden));
      }
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        if (panel.hidden) { openReveal(trigger, panel); } else { closeReveal(panel); }
      });
      // 패널 내부의 취소 버튼([data-reveal-cancel])·Esc 는 닫고 트리거로 포커스 복원 — 트리거가 여럿이어도 패널마다 한 번만 붙인다
      if (panel.cmsRevealBound) { return; }
      panel.cmsRevealBound = true;
      panel.querySelectorAll('[data-reveal-cancel]').forEach(function (cancel) {
        cancel.addEventListener('click', function (e) {
          e.preventDefault();
          closeReveal(panel);
        });
      });
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !panel.hidden) { closeReveal(panel); }
      });
    });
  }

  // 뒤로가기 · 앞으로가기: 주소에 있는 화면만 열어 둔다
  function syncRevealsWithUrl(focus) {
    document.querySelectorAll('[data-reveal-url][id]').forEach(function (panel) {
      var want = revealInUrl(panel);
      if (want !== panel.hidden) { return; }
      var trigger = revealTrigger(panel);
      if (trigger) { setReveal(trigger, panel, want); } else { panel.hidden = !want; }
      if (!want && focus) { focusAfterClose(panel); }
    });
  }
  window.addEventListener('popstate', function () { syncRevealsWithUrl(true); });
  // 편집기 등 화면 스크립트(admin-v2.js · 페이지 끝 스크립트)가 다 붙은 뒤에 연다
  window.addEventListener('load', function () { syncRevealsWithUrl(false); });

  // 2) tabs -----------------------------------------------------------------
  function initTabs(root) {
    root.querySelectorAll('[data-tabs]').forEach(function (group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll('[role=tab]'));
      if (!tabs.length) { return; }
      function activate(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panelId = t.getAttribute('aria-controls');
          var panel = panelId ? document.getElementById(panelId) : null;
          if (panel) { panel.hidden = !on; }
        });
        if (focus) { tab.focus(); }
      }
      tabs.forEach(function (tab, i) {
        if (!tab.hasAttribute('tabindex')) {
          tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
        }
        tab.addEventListener('click', function () { activate(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = tabs[(i + 1) % tabs.length]; }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
          else if (e.key === 'Home') { next = tabs[0]; }
          else if (e.key === 'End') { next = tabs[tabs.length - 1]; }
          if (next) { e.preventDefault(); activate(next, true); }
        });
      });
    });
  }

  // 3) url-open -------------------------------------------------------------
  function initUrlOpen(root) {
    root.querySelectorAll('[data-url-open]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var input = document.querySelector(btn.getAttribute('data-url-open'));
        var url = input ? (input.value || '').trim() : '';
        if (/^https?:\/\//i.test(url)) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else if (url) {
          alert('http(s):// 로 시작하는 URL만 열 수 있습니다.');
          if (input) { input.focus(); }
        }
      });
    });
  }

  // 4) auto-submit ----------------------------------------------------------
  function initAutoSubmit(root) {
    root.querySelectorAll('[data-autosubmit]').forEach(function (el) {
      el.addEventListener('change', function () {
        var form = el.form || el.closest('form');
        if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); }
      });
    });
  }

  // 5) 사이드내비 그룹 disclosure (TRACK 1) -------------------------------------
  function initNavGroups(root) {
    root.querySelectorAll('[data-nav-group-toggle]').forEach(function (btn) {
      var key = 'cms-nav-group:' + (btn.textContent || '').trim();
      try {
        var saved = localStorage.getItem(key);
        if (saved !== null) { btn.setAttribute('aria-expanded', saved); }
      } catch (e) { /* localStorage 불가 환경 무시 */ }
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        try { localStorage.setItem(key, String(open)); } catch (e2) { /* noop */ }
      });
    });
  }

  // [미리보기] — 저장하지 않은 내용을 새 창에서 공개 화면 모양으로. 글 칸만 옮겨 담은 임시 폼을 새 창으로 보낸다(파일은 올리지 않는다).
  // 위지윅 본문은 편집기 onChange·onBlur 때마다 글상자로 옮겨지므로(content-editor.js) 클릭 시점에도 최신이다.
  function initPostPreview(root) {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-post-preview]');
      if (!btn) { return; }
      var source = btn.form || btn.closest('form');
      var action = btn.getAttribute('data-preview-action');
      var fields = (btn.getAttribute('data-preview-fields') || '').split(/\s+/);
      if (!source || !action) { return; }
      var out = document.createElement('form');
      out.method = 'post';
      out.action = action;
      out.target = '_blank';
      out.hidden = true;
      function add(name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        out.appendChild(input);
      }
      Array.prototype.forEach.call(source.elements, function (el) {
        if (!el.name || el.disabled || fields.indexOf(el.name) < 0) { return; }
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) { return; }
        add(el.name, el.value);
      });
      var csrf = document.querySelector('meta[name="_csrf"]');
      if (csrf && csrf.content) { add('_csrf', csrf.content); }
      document.body.appendChild(out);
      out.submit();
      out.remove();
    });
  }

  // 6) 사이드바 접기 — 왼쪽 위 아이콘 하나로 접고 편다. 좁은 띠의 묶음 아이콘을 눌러도 펴진다.
  //    표시는 <html data-nav-collapsed>, 첫 그리기 상태는 head 조각이 먼저 적용한다. ≤1024px 은 서랍 메뉴라 CSS 가 이 상태를 쓰지 않는다.
  function initNavCollapse(root) {
    var fold = root.querySelector('[data-nav-collapse]');
    if (!fold) { return; }
    var html = document.documentElement;
    function apply(collapsed, remember) {
      if (collapsed) { html.setAttribute('data-nav-collapsed', ''); } else { html.removeAttribute('data-nav-collapsed'); }
      var label = collapsed ? '메뉴 펴기' : '메뉴 접기';
      fold.setAttribute('aria-expanded', String(!collapsed));
      fold.setAttribute('aria-label', label);
      fold.setAttribute('title', label);
      if (remember) {
        try { localStorage.setItem('cms-nav-collapsed', collapsed ? '1' : '0'); } catch (e) { /* localStorage 불가 환경 무시 */ }
      }
    }
    apply(html.hasAttribute('data-nav-collapsed'), false);
    fold.addEventListener('click', function () { apply(!html.hasAttribute('data-nav-collapsed'), true); });
    root.querySelectorAll('[data-nav-expand]').forEach(function (btn) {
      btn.addEventListener('click', function () { apply(false, true); fold.focus(); });
    });
  }

  // 7) 저장 사유: [수정하기]처럼 게시까지 하는 단추만 사유를 필수로 한다. 작은 게시 단추 폼(data-reason-prompt)은 눌렀을 때 묻는다.
  function initSaveReason(root) {
    var contentForm = root.querySelector('#ct-save-form');
    if (contentForm) { contentForm.noValidate = true; }
    root.querySelectorAll('button[form][type="submit"]').forEach(function (btn) {
      var field = root.querySelector('[data-save-reason][form="' + btn.getAttribute('form') + '"]');
      if (!field) { return; }
      btn.addEventListener('click', function () { field.required = btn.hasAttribute('data-reason-required'); });
    });
    root.querySelectorAll('form[data-reason-prompt]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        var field = form.querySelector('input[name="reason"]');
        if (!field || field.value.trim().length >= 2) { return; }
        var answer = window.prompt('게시 사유를 적어 주세요(2자 이상).', '');
        if (answer === null || answer.trim().length < 2) { e.preventDefault(); return; }
        field.value = answer.trim();
      });
    });
  }

  // 콘텐츠 저장 폼 오류는 브라우저 말풍선 대신 칸 아래 글 + 토스트로(메뉴 정보 탭과 같게). 어떤 칸이 필수인지는 위 단추 · content-editor.js 가 정한다.
  // window 에서 먼저 받아 막는다 — document 쪽 제출 처리(메뉴 화면의 이탈 경고 · 탭 보관 정리)가 돌기 전에.
  function saveFormError(el, text) {
    var err = document.createElement('span');
    err.className = 'nv-field__error ct-field-error';
    err.setAttribute('role', 'alert');
    err.setAttribute('data-field-error', '');
    err.textContent = text;
    (el.closest('.nv-field, .savebar__reason, .nv-savebar__reason') || el.parentNode).appendChild(err);
  }
  function saveFormErrors(form) {
    var errors = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) { return; }
      var value = (el.value || '').trim();
      if (el.hasAttribute('data-save-reason')) {
        if ((el.required || value) && Array.from(value).length < 2) {
          errors.push({ el: el, text: '사유를 2자 이상 적으세요(수정 이력 · 접속 기록에 남습니다).', reason: true });
        }
      } else if (el.required && !value) {
        var label = el.id ? form.ownerDocument.querySelector('label[for="' + el.id + '"]') : null;
        errors.push({ el: el, text: (label ? label.textContent.trim() + ' 칸' : '이 칸') + '을 채우세요.' });
      }
    });
    return errors;
  }
  window.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.id !== 'ct-save-form') { return; }
    form.ownerDocument.querySelectorAll('[data-field-error].ct-field-error').forEach(function (el) { el.remove(); });
    var errors = saveFormErrors(form);
    if (!errors.length) { return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    errors.forEach(function (item) { saveFormError(item.el, item.text); });
    if (errors[0].el.focus) { errors[0].el.focus(); }
    if (window.nvToast) {
      window.nvToast(errors.some(function (item) { return item.reason; }) ? '사유를 적어야 저장합니다.' : '입력값을 확인하세요.');
    }
  }, true);

  window.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.form || el.form.id !== 'ct-save-form') { return; }
    var line = el.closest('.nv-field, .savebar__reason, .nv-savebar__reason');
    var err = line ? line.querySelector('[data-field-error].ct-field-error') : null;
    if (err) { err.remove(); }
  }, true);

  function init(root) {
    root = root || document;
    initReveal(root);
    initSaveReason(root);
    initNavCollapse(root);
    initTabs(root);
    initUrlOpen(root);
    initAutoSubmit(root);
    initNavGroups(root);
  }

  // 문서 위임 한 번 — init 이 조각마다 다시 불려도 새 창이 겹쳐 뜨지 않게 init 밖에서 건다
  initPostPreview(document);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
  window.cmsAdminInteractions = { init: init };
})();
