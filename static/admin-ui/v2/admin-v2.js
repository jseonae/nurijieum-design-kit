/* 누리지음 관리자 콘솔 UI v2 전용 동작. 기존 admin-*.js(reveal·tabs·drawer·tables·cmdk 등)는 그대로 쓰고,
 * 시안에만 있는 컴포넌트를 여기서 붙인다. 전부 data-* 훅 기반, 의존성 없음.
 *
 *  1) 슬라이드 패널   [data-panel-open="#id"] → .nv-panel#id 열기, [data-panel-close] 닫기, Esc, 배경 클릭, 포커스 트랩
 *                     legacy data-reveal 훅과 같이 쓰는 패널(.cms-admin-reveal 또는 data-panel-hidden-sync)은
 *                     hidden 으로 시작해도 되며, 열고 닫을 때 hidden 과 트리거 aria-expanded 를 맞춘다
 *  2) 모달            [data-modal-open="#id"] / [data-modal-close]
 *  3) 드롭메뉴        [data-dropmenu] 버튼 ↔ 형제 .nv-dropmenu__menu, 바깥 클릭·Esc 닫힘(메뉴 안에 포커스가 있었으면 단추로 되돌린다),
 *                     ↑·↓ 로 메뉴 항목 사이를 옮긴다.
 *                     열 때 화면 기준 위치(fixed)로 띄워 가로 스크롤 표(.nv-table-scroll — overflow-x 때문에 세로도
 *                     잘린다) 안에서 잘리거나 표에 세로 스크롤을 만들지 않는다. 아래 공간이 모자라면 위로 열고,
 *                     스크롤·창 크기 변경 때 닫는다(단추와 떨어지지 않게)
 *  4) 태그 입력       [data-tag-input] 컨테이너: Enter/쉼표로 .nv-tag 추가 + hidden input(name=data-tag-name)
 *  5) 표 선택         [data-select-all] ↔ [data-select-row], [data-selected-count] 갱신, tr[aria-selected],
 *                     [data-needs-selection] 활성/비활성, form[data-confirm] 제출 확인(선택 삭제)
 *                     전체 선택 확장: 범위 안 [data-select-matching data-total=M] 은 이 쪽을 전부 골랐을 때만 보이고,
 *                     [data-select-matching-on] 을 누르면 「검색 결과 전체 M건」 — [data-select-matching-value] 버튼 값이
 *                     "true" 가 되고 선택 수가 M 으로 바뀐다([data-select-matching-off]·체크 해제로 되돌림). 제출 버튼의
 *                     data-selection-announce 문구({n} = 선택 수)는 [data-selection-live] 로 읽어 준다.
 *                     [data-selection-optional] 제출 버튼(목록 엑셀다운로드)은 고른 것이 없어도 보낸다(서버가 지금 조건 전부)
 *  6) 상단 이동 버튼  [data-top-btn]: 400px 이상 스크롤 시 표시
 *  7) 미디어 올리기   [data-media-upload] 상자(data-upload-url · data-site-id · data-owner-type · data-owner-id · data-reload,
 *                     게시글이면 data-board-id — 서버가 게시판 첨부 허용 · 최대 개수를 검사) 안
 *                     [data-upload-submit] → [data-upload-file] 파일을 [data-upload-usage] 용도로 콘솔 업로드(/media-uploads)에 올리고,
 *                     성공하면 data-reload 로 간다. 용도 option 의 data-max-bytes 를 넘는 파일은 올리지 않는다. 결과는 [data-upload-status]
 *                     data-upload-auto 상자는 단추 없이 파일을 고르면 · 상자 안 .nv-dropzone 에 끌어놓으면 바로 올린다(용도는 숨은 [data-upload-usage])
 *  8) 파일 고르기 칸  label.nv-dropzone[data-file-drop] 안 input[type=file] — 끌어놓은 파일을 칸에 넣고(change 이벤트), 바로 뒤
 *                     .nv-file 칸에 고른 파일 이름 · 크기를 보인다(여러 개 칸은 파일마다 한 줄 · ✕ 로 그 파일만 빼고 제목에 (개수)). .nv-file 의 [data-file-clear] 는
 *                     선택 해제. input 의 data-max-files · data-max-bytes(고른 파일 합계)를 넘으면 data-limit-message 를 알리고 비운다
 *  9) 게시 방식       form 안 [data-publish-mode] 라디오가 SCHEDULED 면 같은 폼의 [data-schedule-at] 일시 칸을 열고 필수로(콘텐츠 · 게시글 등록)
 * 10) 말풍선         title 이 달린 요소에 마우스 · 키보드 초점이 오면 .nv-tip 으로 보인다(이벤트 위임 — 패널 · 창처럼 나중에 생긴 요소도 같다)
 * 11) 사이드바       현재 메뉴가 사이드바 스크롤 밖이면 보이게 옮긴다
 */
(function () {
  'use strict';
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---- 1) 슬라이드 패널 ------------------------------------------------------
  var panelState = { open: null, opener: null, backdrop: null };
  function ensureBackdrop() {
    if (!panelState.backdrop) {
      var b = document.createElement('div');
      b.className = 'nv-panel-backdrop';
      b.setAttribute('hidden', '');
      b.addEventListener('click', closePanel);
      document.body.appendChild(b);
      panelState.backdrop = b;
    }
    return panelState.backdrop;
  }
  function syncReveal(panel, open) {
    // legacy data-reveal 훅과 공존: 패널의 hidden 과 트리거의 aria-expanded 를 열림 상태에 맞춘다
    if (open) { panel.removeAttribute('hidden'); } else if (panel.hasAttribute('data-panel-hidden-sync') || panel.classList.contains('cms-admin-reveal')) { panel.setAttribute('hidden', ''); }
    if (panel.id) {
      qa('[data-reveal="#' + panel.id + '"], [data-panel-open="#' + panel.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    }
  }
  function openPanel(panel, opener) {
    if (!panel) { return; }
    closeDropmenus();
    if (panelState.open && panelState.open !== panel) { closePanel(); }
    ensureBackdrop().removeAttribute('hidden');
    syncReveal(panel, true);
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nv-lock');
    panelState.open = panel; panelState.opener = opener || document.activeElement;
    // 처음 초점: 닫기 X 가 아닌 첫 칸(내용을 그린 뒤 고른다). 칸이 없으면 패널 자체
    window.setTimeout(function () {
      var first = qa(FOCUSABLE, panel).filter(function (el) { return !el.matches('.nv-panel__close') && el.getClientRects().length; })[0];
      (first || panel).focus();
    }, 30);
    panel.dispatchEvent(new CustomEvent('nv:panel-open', { bubbles: true }));
  }
  function closePanel() {
    var panel = panelState.open;
    if (!panel) { return; }
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    syncReveal(panel, false);
    if (panelState.backdrop) { panelState.backdrop.setAttribute('hidden', ''); }
    document.body.classList.remove('nv-lock');
    panelState.open = null;
    if (panelState.opener && panelState.opener.focus) { panelState.opener.focus(); }
    panel.dispatchEvent(new CustomEvent('nv:panel-close', { bubbles: true }));
  }
  function trapFocus(container, e) {
    var items = qa(FOCUSABLE, container).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) { e.preventDefault(); container.focus(); return; }
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---- 2) 모달 ------------------------------------------------------------
  var modalState = { open: null, opener: null, onClose: null };
  function openModal(backdrop, opener) {
    if (!backdrop) { return; }
    backdrop.removeAttribute('hidden');
    document.body.classList.add('nv-lock');
    modalState.open = backdrop; modalState.opener = opener || document.activeElement;
    var first = q('[data-modal-initial]', backdrop) || q(FOCUSABLE, backdrop);
    window.setTimeout(function () { if (first) { first.focus(); } }, 30);
  }
  function closeModal() {
    var b = modalState.open;
    if (!b) { return; }
    b.setAttribute('hidden', '');
    // 패널 위에서 연 확인 창이면 패널이 열려 있는 동안 스크롤 잠금을 유지한다
    if (!panelState.open) { document.body.classList.remove('nv-lock'); }
    modalState.open = null;
    if (modalState.opener && modalState.opener.focus) { modalState.opener.focus(); }
    var after = modalState.onClose;
    modalState.onClose = null;
    if (after) { after(); }
  }

  /* 확인 창: 제목 · 본문 · 동사 단추 · 위험색. 처음 포커스는 취소, Esc · 배경은 취소. window.nvConfirm 으로 다른 스크립트도 쓴다.
     options = { title, message, html(이미 안전한 본문), verb, danger }. 결과는 Promise(true/false). */
  function nvConfirm(options) {
    var box = q('#nv-confirm');
    if (!box) {
      box = document.createElement('div');
      box.id = 'nv-confirm';
      box.className = 'nv-modal-backdrop';
      box.setAttribute('hidden', '');
      box.innerHTML = '<div class="nv-modal nv-modal--sm nv-modal--compact" role="alertdialog" aria-modal="true" aria-labelledby="nv-confirm-title" aria-describedby="nv-confirm-body">'
        + '<div class="nv-modal__head"><h2 class="nv-modal__title" id="nv-confirm-title"></h2></div>'
        + '<div class="nv-modal__body" id="nv-confirm-body"></div>'
        + '<div class="nv-modal__foot"><button type="button" class="nv-btn nv-btn--outline" data-modal-initial data-confirm-cancel>취소</button>'
        + '<button type="button" class="nv-btn" data-confirm-ok></button></div></div>';
      document.body.appendChild(box);
    }
    var ok = q('[data-confirm-ok]', box), cancel = q('[data-confirm-cancel]', box), body = q('#nv-confirm-body', box);
    q('#nv-confirm-title', box).textContent = options.title || '확인';
    if (options.html) { body.innerHTML = options.html; } else { body.textContent = options.message || ''; }
    ok.textContent = options.verb || '확인';
    ok.classList.toggle('nv-btn--danger', !!options.danger);
    ok.classList.toggle('nv-btn--primary', !options.danger);
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) { return; }
        settled = true;
        ok.onclick = cancel.onclick = box.onclick = null;
        modalState.onClose = null;
        if (modalState.open === box) { closeModal(); }
        resolve(value);
      }
      ok.onclick = function () { finish(true); };
      cancel.onclick = function () { finish(false); };
      box.onclick = function (e) { if (e.target === box) { finish(false); } };
      openModal(box, document.activeElement);
      modalState.onClose = function () { finish(false); };
    });
  }
  window.nvConfirm = nvConfirm;

  /* 토스트(.ntoast): 잠깐 보였다 사라지는 안내. 오류는 쓰지 않는다(배너 유지).
     opts = { href, linkText } 이면 끝에 링크(예: 「수정 이력 보기」). 한 번에 하나만 보인다. */
  var toastTimer = null;
  function nvToast(message, opts) {
    var stack = q('#nv-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'nv-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    stack.textContent = '';
    var toast = document.createElement('div');
    toast.className = 'ntoast';
    toast.innerHTML = '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-info"/></svg>';
    toast.appendChild(document.createTextNode(message));
    if (opts && opts.href) {
      var a = document.createElement('a');
      a.className = 'ntoast__link';
      a.href = opts.href;
      a.textContent = opts.linkText || '보기';
      toast.appendChild(document.createTextNode(' '));
      toast.appendChild(a);
    }
    stack.appendChild(toast);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.remove(); }, opts && opts.href ? 5000 : 2800);
  }
  window.nvToast = nvToast;
  /* 저장 성공 안내(flash)를 토스트로. 임시 비밀번호처럼 다시 볼 수 없는 값 · 링크 · 단추가 든 안내는 배너로 둔다. */
  function flashToToast() {
    qa('.nv-alert--ok[role="status"]').forEach(function (alert) {
      var text = alert.textContent.replace(/\s+/g, ' ').trim();
      if (!text || alert.hasAttribute('data-flash-keep') || alert.closest('.nv-panel, .nv-modal') || q('a, button, code, input', alert) || /비밀번호/.test(text)) { return; }
      alert.hidden = true;
      nvToast(text);
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', flashToToast); } else { flashToToast(); }

  // ---- 3) 드롭메뉴 ----------------------------------------------------------
  function closeDropmenus(except) {
    qa('[data-dropmenu][aria-expanded="true"]').forEach(function (btn) {
      if (btn === except) { return; }
      btn.setAttribute('aria-expanded', 'false');
      var menu = btn.parentNode.querySelector('.nv-dropmenu__menu');
      if (!menu) { return; }
      var hadFocus = menu.contains(document.activeElement);   // 숨기기 전에 — 숨기면 포커스가 body 로 떨어진다
      menu.setAttribute('hidden', '');
      unplaceDropmenu(menu);
      if (hadFocus) { btn.focus({ preventScroll: true }); }
    });
  }
  // ↑·↓: 열린 메뉴 안에서 다음 · 이전 항목으로(끝에서는 처음 · 끝으로 돈다)
  function moveInDropmenu(e) {
    var menu = e.target.closest && e.target.closest('.nv-dropmenu__menu');
    if (!menu) { return; }
    // 메뉴 항목만(로그아웃 폼의 숨은 _csrf 칸 같은 input 은 빼고)
    var items = qa('.nv-dropmenu__item:not([disabled])', menu);
    if (!items.length) { return; }
    e.preventDefault();
    var i = items.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
    items[(i + items.length) % items.length].focus();
  }
  var DROPMENU_GAP = 4;    // 단추와 메뉴 사이(px) — CSS 의 top: calc(100% + .4rem) 와 같은 간격
  var VIEWPORT_PAD = 8;    // 화면 가장자리 여백(px)
  function placeDropmenu(btn, menu) {
    var r = btn.getBoundingClientRect();
    menu.classList.add('nv-dropmenu__menu--fixed');
    var w = menu.offsetWidth, h = menu.offsetHeight;
    var left = Math.max(VIEWPORT_PAD, Math.min(r.right - w, window.innerWidth - w - VIEWPORT_PAD));   // 오른쪽 끝을 단추에 맞춤
    var top = r.bottom + DROPMENU_GAP;
    if (top + h > window.innerHeight - VIEWPORT_PAD && r.top - DROPMENU_GAP - h >= VIEWPORT_PAD) {
      top = r.top - DROPMENU_GAP - h;   // 아래가 모자라면 위로
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
  function unplaceDropmenu(menu) {
    menu.classList.remove('nv-dropmenu__menu--fixed');
    menu.style.left = '';
    menu.style.top = '';
  }
  function toggleDropmenu(btn) {
    var menu = btn.parentNode.querySelector('.nv-dropmenu__menu');
    if (!menu) { return; }
    var open = btn.getAttribute('aria-expanded') === 'true';
    closeDropmenus(btn);
    btn.setAttribute('aria-expanded', String(!open));
    if (open) { menu.setAttribute('hidden', ''); unplaceDropmenu(menu); }
    else {
      menu.removeAttribute('hidden');
      placeDropmenu(btn, menu);
      var f = q(FOCUSABLE, menu); if (f) { f.focus({ preventScroll: true }); }
    }
  }

  // ---- 4) 태그 입력 ----------------------------------------------------------
  function initTagInput(box) {
    var input = q('input[type="text"]', box);
    var name = box.getAttribute('data-tag-name') || 'tags';
    if (!input) { return; }
    function add(value) {
      value = (value || '').trim().replace(/,+$/, '');
      if (!value) { return; }
      var dup = qa('.nv-tag input[type="hidden"]', box).some(function (h) { return h.value === value; });
      if (dup) { return; }
      var tag = document.createElement('span');
      tag.className = 'nv-tag';
      tag.innerHTML = '<span></span><input type="hidden"><button type="button" aria-label="태그 삭제">&times;</button>';
      tag.firstChild.textContent = value;
      var hidden = tag.querySelector('input'); hidden.name = name; hidden.value = value;
      box.insertBefore(tag, input);
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); input.value = ''; }
      else if (e.key === 'Backspace' && !input.value) {
        var tags = qa('.nv-tag', box); if (tags.length) { tags[tags.length - 1].remove(); }
      }
    });
    input.addEventListener('blur', function () { if (input.value.trim()) { add(input.value); input.value = ''; } });
    box.addEventListener('click', function (e) {
      var btn = e.target.closest('.nv-tag button');
      if (btn) { btn.parentNode.remove(); input.focus(); }
    });
  }

  // ---- 5) 표 선택 ------------------------------------------------------------
  function syncSelection(scope) {
    // 목록/그리드처럼 같은 항목이 두 뷰에 있으면(미디어) 보이는 쪽만 센다. 값이 같은 다른 뷰의 체크박스는 mirrorSelection 이 맞춘다.
    var rows = qa('[data-select-row]', scope).filter(function (c) { return c.offsetParent !== null; });
    var checked = rows.filter(function (c) { return c.checked; });
    qa('[data-select-row]', scope).forEach(function (c) {
      var tr = c.closest('tr'); if (tr) { tr.setAttribute('aria-selected', String(c.checked)); }
    });
    var all = q('[data-select-all]', scope);
    var allOnPage = rows.length > 0 && checked.length === rows.length;
    if (all) { all.checked = allOnPage; all.indeterminate = checked.length > 0 && checked.length < rows.length; }
    var count = checked.length;
    var matching = scope.querySelector ? q('[data-select-matching]', scope) : null;
    if (matching) {
      var total = parseInt(matching.getAttribute('data-total'), 10) || 0;
      var offer = allOnPage && total > rows.length;
      var on = offer && matching.getAttribute('data-on') === 'true';
      matching.setAttribute('data-on', String(on));
      matching.hidden = !offer;
      qa('[data-select-page-count]', matching).forEach(function (el) { el.textContent = String(checked.length); });
      qa('[data-select-matching-page]', matching).forEach(function (el) { el.hidden = on; });
      qa('[data-select-matching-all]', matching).forEach(function (el) { el.hidden = !on; });
      qa('[data-select-matching-value]', scope).forEach(function (el) { el.value = on ? 'true' : 'false'; });
      if (on) { count = total; }
    }
    qa('[data-selected-count]', scope).forEach(function (el) { el.textContent = String(count); });
    qa('[data-needs-selection]', scope).forEach(function (el) { el.disabled = checked.length === 0; });
  }
  function selectionCount(scope) {
    var matching = q('[data-select-matching]', scope);
    if (matching && matching.getAttribute('data-on') === 'true') { return parseInt(matching.getAttribute('data-total'), 10) || 0; }
    return qa('[data-select-row]', scope).filter(function (c) { return c.checked && c.offsetParent !== null; }).length;
  }
  function announce(scope, text) {
    var live = q('[data-selection-live]', scope);
    if (live) { live.textContent = ''; window.setTimeout(function () { live.textContent = text; }, 30); }
  }
  function setMatching(el, on) {
    var scope = scopeOf(el);
    var matching = q('[data-select-matching]', scope);
    if (!matching) { return; }
    matching.setAttribute('data-on', String(on));
    syncSelection(scope);
    announce(scope, on ? '검색 결과 전체 ' + matching.getAttribute('data-total') + '건을 선택했습니다.'
      : '이 쪽 ' + selectionCount(scope) + '건만 선택했습니다.');
    var next = q(on ? '[data-select-matching-off]' : '[data-select-matching-on]', matching);
    if (next) { next.focus(); }
  }
  function scopeOf(el) { return el.closest('[data-select-scope]') || el.closest('form') || document; }

  // ---- 6) 상단 이동 -----------------------------------------------------------
  function initTopBtn(btn) {
    function sync() { btn.hidden = window.scrollY < 400; }
    window.addEventListener('scroll', sync, { passive: true });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    sync();
  }

  // ---- 7) 미디어 올리기 · 빼기 -------------------------------------------------
  // 화면을 다시 열지 않고 그 자리에서 고친다(쓰던 입력이 남는다). 상자 = [data-media-upload], 카드 = 상자의 .nv-attach(없으면 상자):
  //   [data-media-list] 첨부 줄이 들어가는 곳 · template[data-media-row] 줄 틀([data-media-item] · [data-media-name](a 면 href) ·
  //   [data-media-size] · [data-media-remove] · [data-media-view] PDF 면 보이는 미리보기 링크) · [data-media-count] 「제목 (개수)」 · [data-media-preview] 표지 img ·
  //   [data-media-empty] 표지가 없을 때만 보이는 것 · [data-media-remove][data-usage="COVER"] 표지 빼기 단추
  //   상자의 data-media-url(파일 주소 앞부분) · data-release-url(사용처 해제 주소 앞부분 — 뒤에 mediaId + /release) · data-attach-max 가 있으면
  //   개수가 차면 [data-media-gate] 를 숨기고 [data-media-full] 안내(data-full-text 의 {n})를 보인다. 서버 검사가 최종이다.
  function countTitle(el, n) {
    if (!el.hasAttribute('data-title-base')) { el.setAttribute('data-title-base', el.textContent.replace(/\s*\(\d+\)\s*$/, '')); }
    el.textContent = el.getAttribute('data-title-base') + ' (' + n + ')';
  }
  function setHidden(el, hide) { if (hide) { el.setAttribute('hidden', ''); } else { el.removeAttribute('hidden'); } }   // svg 에는 .hidden 속성이 없다
  function mediaScope(box) { return box.closest('.nv-attach') || box; }
  function mediaBoxOf(el) {
    var scope = el.closest('.nv-attach') || el.closest('[data-media-upload]');
    if (!scope) { return null; }
    return scope.matches('[data-media-upload]') ? scope : q('[data-media-upload]', scope);
  }
  function mediaSize(n) {
    return n < 1024 ? n + ' B' : n < 1048576 ? Math.floor(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  }
  function syncMedia(box) {
    var scope = mediaScope(box), list = q('[data-media-list]', scope);
    if (!list) { return; }
    var n = qa('[data-media-item]', list).length, max = +box.getAttribute('data-attach-max') || 0, full = max > 0 && n >= max;
    var title = q('[data-media-count]', scope);
    if (title) { countTitle(title, n); }
    qa('[data-media-gate]', scope).forEach(function (el) { setHidden(el, full); });
    qa('[data-media-full]', scope).forEach(function (el) { setHidden(el, !full); el.textContent = el.getAttribute('data-full-text').replace('{n}', n); });
  }
  function mediaUploaded(box, usage, m) {
    var scope = mediaScope(box), url = box.getAttribute('data-media-url') + m.mediaId + ':download?siteId=' + encodeURIComponent(box.getAttribute('data-site-id'));
    if (usage === 'COVER') {
      var img = q('[data-media-preview]', scope), rm = q('[data-media-remove][data-usage="COVER"]', scope);
      if (img) { img.src = url; setHidden(img, false); }
      qa('[data-media-empty]', scope).forEach(function (el) { setHidden(el, true); });
      if (rm) { rm.setAttribute('data-media-id', m.mediaId); setHidden(rm, false); }
      return;
    }
    var list = q('[data-media-list]', scope), tpl = q('template[data-media-row]', scope);
    if (!list || !tpl) { return; }
    var row = tpl.content.firstElementChild.cloneNode(true), name = q('[data-media-name]', row), rmBtn = q('[data-media-remove]', row);
    name.textContent = m.originalName;
    if (name.tagName === 'A') { name.setAttribute('href', url); name.setAttribute('download', m.originalName); }
    q('[data-media-size]', row).textContent = mediaSize(m.fileSize);
    var view = q('[data-media-view]', row);
    if (view && /\.pdf$/i.test(m.originalName || '')) { view.setAttribute('href', url); setHidden(view, false); }
    rmBtn.setAttribute('data-media-id', m.mediaId);
    rmBtn.setAttribute('aria-label', m.originalName + ' 빼기');
    list.appendChild(row);
    syncMedia(box);
  }
  function uploadMedia(btn, box) {
    var file = q('[data-upload-file]', box);
    var usage = q('[data-upload-usage]', box);
    var status = q('[data-upload-status]', box);
    if (!file.files.length) { status.textContent = '올릴 파일을 고르세요.'; return; }
    var max = parseInt((usage.selectedOptions ? usage.selectedOptions[0] : usage).getAttribute('data-max-bytes'), 10);
    if (max && file.files[0].size > max) { status.textContent = '올리기 실패: 파일이 너무 큽니다(최대 ' + Math.round(max / 1048576) + 'MB).'; file.value = ''; return; }
    var fd = new FormData();
    fd.append('file', file.files[0]);
    fd.append('siteId', box.getAttribute('data-site-id'));
    fd.append('traceId', 'bff-upload-' + Date.now());
    fd.append('ownerType', box.getAttribute('data-owner-type'));
    fd.append('ownerId', box.getAttribute('data-owner-id'));
    fd.append('usageType', usage.value);
    if (box.getAttribute('data-board-id')) { fd.append('boardId', box.getAttribute('data-board-id')); }   // 게시판 첨부 허용 · 최대 개수 검사
    btn.disabled = true;
    status.textContent = '올리는 중...';
    function done(message) { btn.disabled = false; file.value = ''; status.textContent = message; }   // 같은 입력으로 또 올릴 수 있게 비운다
    fetch(box.getAttribute('data-upload-url'), { method: 'POST', body: fd, credentials: 'same-origin', headers: (window.cmsCsrf ? window.cmsCsrf.headers() : {}) })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (x) { j = null; } return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.upstreamStatusCode >= 200 && res.j.upstreamStatusCode < 300) {
          var m = null;
          try { m = JSON.parse(res.j.upstreamResponseBody); } catch (x) { m = null; }
          if (m && m.mediaId) { mediaUploaded(box, usage.value, m); done('올렸습니다: ' + m.originalName); }
          else { done('올렸습니다. 화면을 다시 열면 목록에 보입니다.'); }
          return;
        }
        if (res.status === 413) { done('올리기 실패: 파일이 너무 큽니다(최대 25MB).'); }
        else if (res.j && res.j.executionStatus === 'BOARD_ATTACH_REFUSED') { done('올리기 실패: ' + res.j.message); }
        else if (res.j && res.j.upstreamStatusCode) { done('올리기 실패: 허용하지 않는 파일이거나 서버 오류입니다 (HTTP ' + res.j.upstreamStatusCode + ').'); }
        else { done('올리기 실패: ' + ((res.j && res.j.message) || ('HTTP ' + res.status))); }
      })
      .catch(function () { done('올리기 실패: 네트워크 오류'); });
  }
  // 줄 ✕ · 「썸네일 지우기」: 사용처 해제 주소로 보낸다(서버는 해제 뒤 화면으로 돌려보내는 폼 처리기 그대로 — 따라간 응답의 오류 안내를 읽는다).
  // 스크립트가 없으면 단추의 form= 숨은 폼이 그대로 제출된다.
  function removeMedia(btn) {
    var msg = btn.getAttribute('data-confirm');
    if (msg) {
      nvConfirm({ message: msg, verb: '빼기', danger: true }).then(function (yes) { if (yes) { removeMediaNow(btn); } });
      return;
    }
    removeMediaNow(btn);
  }
  function removeMediaNow(btn) {
    var box = mediaBoxOf(btn), status = q('[data-upload-status]', box), usage = btn.getAttribute('data-usage');
    btn.disabled = true;
    status.textContent = '빼는 중...';
    var headers = window.cmsCsrf ? window.cmsCsrf.headers() : {};
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetch(box.getAttribute('data-release-url') + btn.getAttribute('data-media-id') + '/release',
        { method: 'POST', credentials: 'same-origin', headers: headers, body: 'usageType=' + encodeURIComponent(usage) })
      .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, html: t }; }); })
      .then(function (res) {
        var err = res.ok ? new DOMParser().parseFromString(res.html, 'text/html').querySelector('.nv-alert--err') : null;
        btn.disabled = false;
        if (!res.ok || err) { status.textContent = '빼기 실패: ' + (err ? err.textContent.trim() : '서버 오류'); return; }
        var scope = mediaScope(box), focusTo;
        if (usage === 'COVER') {
          var img = q('[data-media-preview]', scope);
          if (img) { setHidden(img, true); img.removeAttribute('src'); }
          qa('[data-media-empty]', scope).forEach(function (el) { setHidden(el, false); });
          setHidden(btn, true);
          focusTo = q('[data-upload-file]', box);
          status.textContent = '지웠습니다.';
        } else {
          var item = btn.closest('[data-media-item]'), rows = qa('[data-media-item]', item.parentNode), at = rows.indexOf(item);
          item.remove();
          syncMedia(box);
          var left = qa('[data-media-item] [data-media-remove]', scope);
          focusTo = left[at] || left[at - 1] || q('[data-upload-file]', box);
          status.textContent = '뺐습니다.';
        }
        if (focusTo) { focusTo.focus(); }
      })
      .catch(function () { btn.disabled = false; status.textContent = '빼기 실패: 네트워크 오류'; });
  }

  // 자동 저장은 쓰지 않는다 — 예전 화면이 이 브라우저에 남긴 입력(nv-autosave:*)은 열 때 지운다
  function purgeOldAutosave() {
    try {
      var keys = [];
      for (var i = 0; i < window.localStorage.length; i++) { keys.push(window.localStorage.key(i)); }
      keys.forEach(function (k) { if (k.indexOf('nv-autosave:') === 0) { window.localStorage.removeItem(k); } });
    } catch (e) { /* localStorage 를 못 쓰면 지울 것도 없다 */ }
  }

  // ---- 이벤트 위임 -------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var t = e.target;
    var el;
    if ((el = t.closest('[data-panel-open]'))) { e.preventDefault(); openPanel(q(el.getAttribute('data-panel-open')), el); return; }
    if (t.closest('[data-panel-close]')) { e.preventDefault(); closePanel(); return; }
    if ((el = t.closest('[data-modal-open]'))) { e.preventDefault(); syncExportSelection(q(el.getAttribute('data-modal-open'))); openModal(q(el.getAttribute('data-modal-open')), el); return; }
    if (t.closest('[data-modal-close]')) { e.preventDefault(); closeModal(); return; }
    if ((el = t.closest('[data-copy-text]'))) { e.preventDefault(); copyText(el); return; }
    // data-modal-sticky: 배경을 눌러도 닫지 않는다(다시 볼 수 없는 값을 보이는 창 — 「확인」으로만 닫는다)
    if (modalState.open && t === modalState.open && !modalState.open.hasAttribute('data-modal-sticky')) { closeModal(); return; }
    if ((el = t.closest('[data-select-matching-on]'))) { e.preventDefault(); setMatching(el, true); return; }
    if ((el = t.closest('[data-select-matching-off]'))) { e.preventDefault(); setMatching(el, false); return; }
    if ((el = t.closest('[data-dropmenu]'))) { e.preventDefault(); toggleDropmenu(el); return; }
    if ((el = t.closest('[data-media-remove]')) && mediaBoxOf(el)) { e.preventDefault(); removeMedia(el); return; }
    if ((el = t.closest('[data-file-remove]'))) { removeChosenFile(el); return; }
    if ((el = t.closest('.nv-file [data-file-clear]')) && (el = el.closest('.nv-file').previousElementSibling) && el.matches('[data-file-drop]')) {
      var cleared = q('input[type="file"]', el);
      cleared.value = '';
      cleared.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if ((el = t.closest('[data-upload-submit]')) && el.closest('[data-media-upload]')) { e.preventDefault(); uploadMedia(el, el.closest('[data-media-upload]')); return; }
    if (t.closest('.nv-dropmenu__item')) { closeDropmenus(); return; }   // 항목 선택 후 닫힘(항목의 기본 동작은 유지)
    if (!t.closest('.nv-dropmenu__menu')) { closeDropmenus(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-select-all]')) {
      var scope = scopeOf(t);
      qa('[data-select-row]', scope).forEach(function (c) { c.checked = t.checked; });
      var matchingBox = q('[data-select-matching]', scope);
      if (matchingBox) { matchingBox.setAttribute('data-on', 'false'); }   // 다시 고르면 이 쪽 선택부터
      syncSelection(scope);
    } else if (t.matches('input[type="file"]') && t.closest('[data-file-drop]')) {
      showChosenFile(t.closest('[data-file-drop]'));
    } else if (t.matches('[data-publish-mode]') && t.form && q('[data-schedule-at]', t.form)) {
      // 9) 게시 방식 라디오: 예약 게시(SCHEDULED)를 고르면 같은 폼의 [data-schedule-at] 일시 칸을 열고 필수로
      var at = q('[data-schedule-at]', t.form), on = t.value === 'SCHEDULED';
      at.hidden = !on;
      q('input', at).disabled = !on;
      q('input', at).required = on;
    } else if (t.matches('[data-upload-file]') && t.closest('[data-media-upload][data-upload-auto]')) {
      uploadMedia(t, t.closest('[data-media-upload]'));
    } else if (t.matches('[data-select-row]')) {
      var rowScope = scopeOf(t);
      if (t.value) {   // 다른 뷰의 같은 항목도 함께 체크(제출 시 ids 중복은 서버가 걸러냄)
        qa('[data-select-row]', rowScope).forEach(function (c) { if (c !== t && c.value === t.value) { c.checked = t.checked; } });
      }
      syncSelection(rowScope);
    }
  });
  // 7) · 8) 끌어놓기: 올리기 상자는 놓은 파일을 바로 올리고, 파일 고르기 칸은 칸에 넣는다(change → 고른 파일 표시).
  function dropzoneOf(e) { return e.target.closest ? e.target.closest('[data-media-upload][data-upload-auto] .nv-dropzone, [data-file-drop]') : null; }
  function showChosenFile(drop) {
    var chip = drop.nextElementSibling;
    if (!chip || !chip.classList.contains('nv-file')) { return; }
    var input = q('input[type="file"]', drop);
    var files = Array.prototype.slice.call(input.files);
    var total = files.reduce(function (n, file) { return n + file.size; }, 0);
    // 칸의 상한(data-max-files · data-max-bytes = 고른 파일 합계)을 넘으면 고르지 않은 것으로 하고 data-limit-message 를 알린다
    var maxFiles = +input.getAttribute('data-max-files') || 0, maxBytes = +input.getAttribute('data-max-bytes') || 0;
    if ((maxFiles && files.length > maxFiles) || (maxBytes && total > maxBytes)) {
      window.alert(input.getAttribute('data-limit-message') || '고를 수 있는 파일 수 · 크기를 넘었습니다.');
      input.value = '';
      files = [];
    }
    function sizeText(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
    if (input.multiple) {
      // 여러 개 칸: 고른 파일마다 한 줄(이름 · 크기 · ✕ — 그 파일만 선택에서 뺀다), 카드 제목에 개수. .nv-file 원본은 틀로만 둔다
      qa('[data-file-row]', drop.parentNode).forEach(function (row) { row.remove(); });
      chip.hidden = true;
      var title = q('.nv-form-group__title', drop.parentNode);
      if (title) { countTitle(title, files.length); }
      var after = chip;
      files.forEach(function (file, i) {
        var row = chip.cloneNode(true);
        row.hidden = false;
        row.setAttribute('data-file-row', '');
        q('[data-file-name]', row).textContent = file.name;
        var rowSize = q('[data-file-size]', row);
        if (rowSize) { rowSize.textContent = sizeText(file.size); }
        var remove = q('[data-file-clear]', row);
        remove.removeAttribute('data-file-clear');
        remove.setAttribute('data-file-remove', String(i));
        remove.setAttribute('aria-label', file.name + ' 빼기');
        after.parentNode.insertBefore(row, after.nextSibling);
        after = row;
      });
      return;
    }
    // 고른 이미지(PNG · JPG)는 올리기 전에 바로 보인다(브라우저 안 미리보기 주소 — 바꾸거나 빼면 거둔다). 이미지가 아니면 보이지 않는다
    var preview = q('[data-file-preview]', drop.parentNode);
    if (preview) {
      if (preview.getAttribute('data-object-url')) { URL.revokeObjectURL(preview.getAttribute('data-object-url')); preview.removeAttribute('data-object-url'); }
      var image = files.length === 1 && /^image\/(png|jpeg)$/.test(files[0].type);
      if (image) {
        var objectUrl = URL.createObjectURL(files[0]);
        preview.setAttribute('data-object-url', objectUrl);
        preview.src = objectUrl;
      } else {
        preview.removeAttribute('src');
      }
      setHidden(preview, !image);
    }
    chip.hidden = !files.length;
    if (files.length) {
      q('[data-file-name]', chip).textContent = files[0].name;
      var size = q('[data-file-size]', chip);
      if (size) { size.textContent = sizeText(total); }
    }
  }
  // 여러 개 칸의 줄 ✕: 그 파일만 뺀 목록으로 input 을 다시 채우고(DataTransfer), 다음 줄 · 이전 줄 · 칸 순으로 초점을 옮긴다
  function removeChosenFile(button) {
    var row = button.closest('[data-file-row]');
    var drop = row.parentNode.querySelector('[data-file-drop]');
    var input = q('input[type="file"]', drop);
    var at = +button.getAttribute('data-file-remove');
    var keep = new DataTransfer();
    Array.prototype.forEach.call(input.files, function (file, i) { if (i !== at) { keep.items.add(file); } });
    input.files = keep.files;
    showChosenFile(drop);
    var rows = qa('[data-file-remove]', drop.parentNode);
    var next = rows[at] || rows[at - 1];
    (next || input).focus();
  }
  ['dragenter', 'dragover'].forEach(function (type) {
    document.addEventListener(type, function (e) { var z = dropzoneOf(e); if (z) { e.preventDefault(); z.classList.add('is-dragover'); } });
  });
  document.addEventListener('dragleave', function (e) { var z = dropzoneOf(e); if (z) { z.classList.remove('is-dragover'); } });
  document.addEventListener('drop', function (e) {
    var z = dropzoneOf(e);
    if (!z || !e.dataTransfer.files.length) { return; }
    e.preventDefault();
    z.classList.remove('is-dragover');
    if (z.hasAttribute('data-file-drop')) {
      var picked = q('input[type="file"]', z);
      picked.files = e.dataTransfer.files;
      picked.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    var box = z.closest('[data-media-upload]');
    var input = q('[data-upload-file]', box);
    input.files = e.dataTransfer.files;
    uploadMedia(input, box);
  });
  // 선택 삭제 등 form[data-confirm] 제출 확인. 버튼은 form= 속성으로 숨은 폼에 묶이므로 폼 쪽에서 한 번만 묻는다.
  // 같은 숨은 폼을 formaction 으로 나눠 쓰는 버튼(선택 활성화/비활성화)은 버튼의 data-confirm 이 우선하고, 빈 값이면 묻지 않는다.
  /* 로그아웃하면 이 탭에 보관한 메뉴 수정 내용(menu-draft.js)을 지운다 */
  document.addEventListener('submit', function (e) {
    if (!e.target.matches || !e.target.matches('[data-admin-logout-form]')) { return; }
    try {
      Object.keys(window.sessionStorage).forEach(function (k) { if (k.indexOf('nv.menuDraft.') === 0) { window.sessionStorage.removeItem(k); } });
    } catch (ex) {
      // 탭 보관을 쓸 수 없으면 지울 것도 없다
    }
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!(f instanceof HTMLFormElement) || !f.hasAttribute('data-confirm')) { return; }
    // 폼 안에 대상(ids · paths)이 있거나 form= 으로 묶인 체크박스가 하나라도 켜져 있어야 제출(선택 없이 제출되는 일은
    // 버튼 disabled 로 막지만 이중 방어). 부가 파일 표는 name="paths". data-confirm-one 은 한 건 처리 폼이라 선택을 따지지 않는다.
    var submitter = e.submitter;
    var inner = f.hasAttribute('data-confirm-one') || f.querySelector('[name="ids"], [name="paths"]') !== null
        || (submitter && submitter.hasAttribute('data-selection-optional'))
        || !f.id; // id 가 없는 폼은 form= 체크박스를 묶을 수 없다: 한 건 처리 폼이라 선택을 따지지 않는다
    if (!inner && !qa('input[type="checkbox"][form="' + f.id + '"]').some(function (c) { return c.checked; })) {
      e.preventDefault(); return;
    }
    var msg = submitter && submitter.hasAttribute('data-confirm') ? submitter.getAttribute('data-confirm') : f.getAttribute('data-confirm');
    if (submitter && submitter.hasAttribute('data-export-threshold')) { msg = largeExportMessage(submitter); }
    if (msg && !f.__nvConfirmed) {
      // 확인 창은 기다릴 수 없으므로 멈췄다가, 고르면 같은 단추로 다시 제출한다
      e.preventDefault();
      e.stopImmediatePropagation();
      var src = submitter && submitter.hasAttribute('data-confirm') ? submitter : f;
      var action = (submitter && submitter.getAttribute('formaction')) || f.getAttribute('action') || '';
      nvConfirm({
        title: src.getAttribute('data-confirm-title') || '',
        message: f.dataset.name ? msg.replace('{name}', f.dataset.name) : msg,
        verb: src.getAttribute('data-confirm-verb') || '',
        danger: src.hasAttribute('data-confirm-danger') || /\/(delete|discard|revoke)\b/.test(action)
      }).then(function (yes) {
        if (!yes) { return; }
        f.__nvConfirmed = true;
        if (f.requestSubmit) { f.requestSubmit(submitter && submitter.form === f ? submitter : undefined); } else { f.submit(); }
        f.__nvConfirmed = false;
      });
      return;
    }
    // 내려받기처럼 화면이 그대로인 제출은 무엇을 했는지 읽어 준다.
    if (submitter && submitter.hasAttribute('data-selection-announce')) {
      var scope = scopeOf(submitter);
      announce(scope, submitter.getAttribute('data-selection-announce').replace('{n}', String(selectionCount(scope))));
    }
  });
  // 열린 드롭메뉴는 화면 기준 위치라, 어디든(표 가로 스크롤 포함) 스크롤되거나 창 크기가 바뀌면 닫는다
  window.addEventListener('scroll', function (e) {
    if (e.target && e.target.closest && e.target.closest('.nv-dropmenu__menu')) { return; }
    closeDropmenus();
  }, true);
  window.addEventListener('resize', function () { closeDropmenus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalState.open) { if (!modalState.open.hasAttribute('data-modal-sticky')) { closeModal(); } return; }
      if (panelState.open) { closePanel(); return; }
      closeDropmenus();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { moveInDropmenu(e); }
    if (e.key === 'Tab') {
      if (modalState.open) { trapFocus(modalState.open, e); }
      else if (panelState.open) { trapFocus(panelState.open, e); }
    }
  });

  // 공개 범위 칸(board-forms publicAccessFields): 「역할 지정」을 고르면 역할 목록을 연다
  document.addEventListener('change', function (e) {
    var r = e.target;
    if (!r.matches('[data-audience-group] input[type="radio"]')) { return; }
    var roles = r.closest('[data-audience-group]').querySelector('[data-audience-roles]');
    if (roles) { roles.hidden = r.value !== 'ROLES'; }
  });

  /* 목록 엑셀 대량 경고: 단추의 data-export-total(지금 조건 건수) · data-export-threshold(기준). 고른 행이 있으면 고른 수로 본다. 기준 미만이면 묻지 않는다 */
  function largeExportMessage(btn) {
    var threshold = parseInt(btn.getAttribute('data-export-threshold'), 10) || 0;
    var selected = selectionCount(scopeOf(btn));
    var n = selected > 0 ? selected : (parseInt(btn.getAttribute('data-export-total'), 10) || 0);
    if (!threshold || n < threshold) { return ''; }
    return n.toLocaleString('ko-KR') + '건을 내려받습니다. 대량 내려받기입니다(' + threshold.toLocaleString('ko-KR') + '건 이상). 꼭 필요한 범위인지 확인하고, 쓰임이 끝나면 파일을 지우세요.';
  }
  /* 목록에서 고른 행만 받는 내려받기 창(data-export-selection = 체크박스가 묶인 폼 id): 창을 열 때 고른 ID 를 담고 건수 · 경고를 고른 수로 맞춘다. 고른 것이 없으면 지금 조건 전부 */
  function syncExportSelection(panel) {
    var formId = panel && panel.getAttribute('data-export-selection');
    if (!formId) { return; }
    var form = q('form', panel), picked = q('[data-export-picked]', panel), all = q('[data-export-all]', panel), warn = q('.nv-export__warn', panel);
    qa('input[data-export-id]', form).forEach(function (input) { input.remove(); });
    var ids = qa('input[type="checkbox"][name="ids"][form="' + formId + '"]').filter(function (c) { return c.checked; });
    ids.forEach(function (c) {
      var input = document.createElement('input');
      input.type = 'hidden'; input.name = 'ids'; input.value = c.value; input.setAttribute('data-export-id', '');
      form.appendChild(input);
    });
    var some = ids.length > 0;
    if (picked) { picked.hidden = !some; q('b', picked).textContent = ids.length.toLocaleString('ko-KR'); }
    if (all) { all.hidden = some; }
    if (warn && picked) { warn.hidden = some && ids.length < (parseInt(picked.getAttribute('data-export-threshold'), 10) || 0); }
  }
  /* [data-copy-text="#값 요소"] 단추: 그 요소의 글자를 클립보드로. 막혀 있으면(권한 · http) 글자를 골라 두고 Ctrl+C 를 안내한다 */
  function copyText(button) {
    var source = q(button.getAttribute('data-copy-text'));
    var text = source ? (source.value != null && source.tagName === 'INPUT' ? source.value : source.textContent).trim() : '';
    if (!text) { return; }
    function selectIt() {
      if (!source) { return; }
      var range = document.createRange(); range.selectNodeContents(source);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      nvToast('글자를 골라 두었습니다. Ctrl+C 로 복사하세요.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { nvToast('복사했습니다.'); }, selectIt);
      return;
    }
    // http(내부망 개발 서버)에서는 Clipboard API 가 없다 — 숨은 글상자로 execCommand 복사
    var area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    (modalState.open || document.body).appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    area.remove();
    if (ok) { nvToast('복사했습니다.'); } else { selectIt(); }
    if (button.focus) { button.focus(); }
  }
  /* 페이지가 열리면 바로 띄울 창(data-open-on-load) — 서버가 한 번만 실은 값을 보일 때 */
  function initOnLoadModals() {
    qa('.nv-modal-backdrop[data-open-on-load]').forEach(function (box) {
      document.body.appendChild(box);
      openModal(box, null);
    });
  }
  /* 내려받기 창(fragments/export): 부모 영역이 숨거나 잘려도 보이게 body 로 옮긴다. 사유 오류로 돌아오면 열린 채로 시작한다 */
  function initExportModals() {
    qa('[data-export-panel]').forEach(function (box) {
      document.body.appendChild(box);
      if (!box.hasAttribute('hidden')) {
        openModal(box, q('[data-modal-open="#' + box.id + '"]'));
      }
    });
  }
  /* 사유가 짧으면 창 안에 오류를 보이고, 맞으면 파일을 받는 동안 창을 닫는다(화면은 그대로다) */
  document.addEventListener('submit', function (e) {
    var box = e.target.closest ? e.target.closest('[data-export-panel]') : null;
    if (!box) { return; }
    var reason = q('[name="reason"]', box), err = q('.nv-field__error', box);
    if (reason.value.trim().length < 2) {
      e.preventDefault();
      err.textContent = '사유를 2자 이상 적으세요.';
      err.hidden = false;
      reason.setAttribute('aria-invalid', 'true');
      if ((reason.getAttribute('aria-describedby') || '').indexOf(err.id) < 0) {
        reason.setAttribute('aria-describedby', (err.id + ' ' + (reason.getAttribute('aria-describedby') || '')).trim());
      }
      reason.focus();
      return;
    }
    window.setTimeout(function () {
      reason.value = '';
      err.hidden = true;
      reason.removeAttribute('aria-invalid');
      closeModal();
      nvToast('내려받기를 시작했습니다.');
    }, 0);
  });

  // ---- 10) 말풍선 -----------------------------------------------------------
  /* 띄우는 동안만 title 을 data-nv-tip 으로 옮겨 브라우저 기본 툴팁과 겹치지 않게 하고, 닫을 때 되돌린다.
     화면낭독: 말풍선은 aria-describedby 로 잇고, title 이 유일한 이름이던 조작 요소는 aria-label 을 남긴다.
     비활성 단추도 pointerover 를 받는다(mouseover 는 브라우저에 따라 오지 않는다). */
  var TIP_SKIP = 'iframe, option, optgroup, link, style, object, embed, html, body';
  var tip = { box: null, owner: null, pending: null, timer: null, watch: null, pressed: false };

  function tipBox() {
    if (!tip.box) {
      tip.box = document.createElement('div');
      tip.box.id = 'nv-tip';
      tip.box.className = 'nv-tip';
      tip.box.setAttribute('role', 'tooltip');
      tip.box.hidden = true;
      document.body.appendChild(tip.box);
    }
    return tip.box;
  }
  function tipOwner(node) {
    var el = node && node.closest ? node.closest('[title]:not([title=""]), [data-nv-tip]') : null;
    return el && !el.matches(TIP_SKIP) ? el : null;
  }
  function placeTip(el) {
    var box = tipBox();
    box.style.left = '0px';
    box.style.top = '0px';
    var r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    var top = r.top - h - 8;
    if (top < 56) { top = r.bottom + 8; }
    box.style.top = Math.max(8, top) + 'px';
    box.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px';
  }
  /* title 이 곧 이름이던 조작 요소(아이콘 단추 등)는 title 을 떼도 이름이 남게 한다 */
  function keepAccessibleName(el, text) {
    if (!el.matches(FOCUSABLE) || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) { return; }
    var named = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? el.labels && el.labels.length : (el.textContent || '').trim();
    if (!named) { el.setAttribute('aria-label', text); }
  }
  function tipDescribe(el, on) {
    var ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== 'nv-tip'; });
    if (on) { ids.push('nv-tip'); }
    if (ids.length) { el.setAttribute('aria-describedby', ids.join(' ')); } else { el.removeAttribute('aria-describedby'); }
  }
  function hideTip() {
    window.clearTimeout(tip.timer);
    tip.timer = null;
    tip.pending = null;
    if (tip.watch) { tip.watch.disconnect(); }
    var el = tip.owner;
    tip.owner = null;
    if (tip.box) { tip.box.hidden = true; }
    if (!el) { return; }
    if (!el.hasAttribute('title')) { el.setAttribute('title', el.getAttribute('data-nv-tip') || ''); }
    el.removeAttribute('data-nv-tip');
    tipDescribe(el, false);
  }
  /* 띄운 동안 요소가 사라지거나 숨거나, 다른 스크립트가 title 을 바꾸면 따라간다 */
  function watchTip() {
    var el = tip.owner;
    if (!el) { return; }
    if (!document.contains(el) || !el.getClientRects().length) { hideTip(); return; }
    var changed = el.getAttribute('title');
    if (changed === null) { return; }
    el.removeAttribute('title');
    if (!changed) { el.removeAttribute('data-nv-tip'); tip.owner = null; tipDescribe(el, false); hideTip(); return; }
    el.setAttribute('data-nv-tip', changed);
    tipBox().textContent = changed;
    placeTip(el);
  }
  function openTip(el) {
    var text = el.getAttribute('title');
    tip.timer = null;
    tip.pending = null;
    if (!text || !document.contains(el)) { return; }
    keepAccessibleName(el, text);
    el.setAttribute('data-nv-tip', text);
    el.removeAttribute('title');
    tipDescribe(el, true);
    tip.owner = el;
    var box = tipBox();
    box.textContent = text;
    box.hidden = false;
    placeTip(el);
    if (!tip.watch) { tip.watch = new MutationObserver(watchTip); }
    tip.watch.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['title', 'hidden', 'class', 'style'] });
  }
  function showTip(el, now) {
    hideTip();
    if (now) { openTip(el); return; }
    tip.pending = el;
    tip.timer = window.setTimeout(function () { openTip(el); }, 150);
  }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') { return; }
    var el = tipOwner(e.target);
    if (!el) { if (tip.owner || tip.pending) { hideTip(); } return; }
    if (el !== tip.owner && el !== tip.pending) { showTip(el); }
  });
  document.addEventListener('pointerout', function (e) { if (!e.relatedTarget && e.pointerType !== 'touch') { hideTip(); } });
  // 누르면 말풍선만 접는다(title 은 포인터가 떠날 때까지 떼어 둔다 — 기본 툴팁이 바로 뜨지 않게)
  document.addEventListener('pointerdown', function () {
    tip.pressed = true;
    window.clearTimeout(tip.timer);
    tip.pending = null;
    if (tip.box) { tip.box.hidden = true; }
  }, true);
  ['pointerup', 'pointercancel'].forEach(function (type) {
    document.addEventListener(type, function () { tip.pressed = false; }, true);
  });
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (tip.pressed || !t.matches || !t.matches(':focus-visible')) { return; }
    var el = tipOwner(t);
    if (el) { showTip(el, true); } else if (tip.owner) { hideTip(); }
  });
  document.addEventListener('focusout', function (e) {
    if (tip.owner && tip.owner.contains(e.target)) { hideTip(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tip.box) { tip.box.hidden = true; }
  }, true);
  window.addEventListener('scroll', function (e) {
    if (tip.owner && !(e.target && e.target.closest && e.target.closest('.nv-tip'))) { hideTip(); }
  }, true);
  window.addEventListener('resize', hideTip);

  // ---- 11) 사이드바 현재 메뉴 --------------------------------------------------
  function revealCurrentNav() {
    var side = q('#admin-sidenav');
    var cur = side && q('.nv-sidebar__nav [aria-current="page"]', side);
    if (!cur || !cur.getClientRects().length) { return; }   // 접힌 묶음 · 좁은 띠
    // 이미 보이면 그대로, 아니면 필요한 만큼만. 위쪽은 고정된 로고 줄 아래부터가 보이는 곳이다
    var head = q('.nv-sidebar__top', side), pad = 8;
    var s = side.getBoundingClientRect(), r = cur.getBoundingClientRect();
    var top = s.top + (head ? head.offsetHeight : 0), bottom = s.top + side.clientHeight;
    if (r.top < top) { side.scrollTop -= top - r.top + pad; } else if (r.bottom > bottom) { side.scrollTop += r.bottom - bottom + pad; }
  }
  // 묶음 접힘 상태를 먼저 되살린다(admin-interactions.js 가 DOMContentLoaded 에 한다)
  if (document.readyState === 'complete') { revealCurrentNav(); } else { document.addEventListener('DOMContentLoaded', revealCurrentNav); }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-nav-collapse], [data-nav-expand]')) { window.setTimeout(revealCurrentNav, 0); }
  });

  // 사이트 전환 알약(.nv-header__site): select 밖(화살표 아이콘 · 여백)을 눌러도 목록을 펼친다.
  // 화살표는 CSS 로 select 위에 겹쳐 pointer-events:none 이라 대부분 select 가 바로 받고, 남은 여백만 여기서 연다.
  document.addEventListener('click', function (e) {
    var pill = e.target && e.target.closest ? e.target.closest('.nv-header__site') : null;
    if (!pill) { return; }
    var sel = pill.querySelector('select');
    if (!sel || e.target === sel || sel.disabled) { return; }
    sel.focus();
    try { if (typeof sel.showPicker === 'function') { sel.showPicker(); } } catch (err) { /* 사용자 동작이 아니면 막힘 — 포커스만 */ }
  });

  function init(root) {
    root = root || document;
    qa('[data-tag-input]', root).forEach(initTagInput);
    qa('[data-top-btn]', root).forEach(initTopBtn);
    qa('[data-select-scope]', root).forEach(syncSelection);
    if (root === document) { purgeOldAutosave(); initExportModals(); initOnLoadModals(); }
    qa('.nv-panel', root).forEach(function (p) { if (!p.hasAttribute('tabindex')) { p.setAttribute('tabindex', '-1'); } p.setAttribute('aria-hidden', 'true'); });
    // URL 해시로 패널 열기(예: ?…#panel-site-new) — 서버 렌더 폼 오류 후 재표시용
    if (location.hash && q(location.hash + '.nv-panel', root)) { openPanel(q(location.hash + '.nv-panel', root)); }
    qa('.nv-panel[data-panel-auto-open]', root).forEach(function (p) { openPanel(p); });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { init(document); }); }
  else { init(document); }
  window.nvAdmin = { init: init, openPanel: openPanel, closePanel: closePanel, openModal: openModal, closeModal: closeModal, syncSelection: syncSelection, revealCurrentNav: revealCurrentNav };
})();
