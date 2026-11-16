/*
 * onboarding-tour.js — 첫 사용자 샌드박스 튜토리얼(가짜 데이터, 실제 저장 없음).
 *  - 사이트 → 주소 → 환영 콘텐츠 → 게시판 → 메뉴 단계를 시연으로 가르치고, 마무리에서 "/" 명령 팔레트로 핸드오프.
 *  - 자동 오픈: 대시보드가 비어있을 때([data-onboarding-empty="true"]) + 아직 안 본 경우(localStorage).
 *  - 수동 오픈: [data-onboarding-open] 클릭(언제나). command-palette.js 와 같은 독립 IIFE.
 *  - 마크업은 JS 가 생성(실제 화면 폼을 참조하지 않으므로 어느 페이지에서도 동일 동작). 스타일은 onboarding-tour.css.
 */
(function () {
  'use strict';

  var SEEN_KEY = 'cms-onboarding-seen';
  var GUIDE_KEY = 'cms-onboarding-guide';
  // 튜토리얼 완료 후 강조할 사이드바 항목(href 경로 끝으로 매칭).
  var GUIDE_TARGETS = ['/sites', '/navigation', '/content', '/board'];

  // 단계 정의. value 는 읽기 데모용 가짜 데이터(저장되지 않음).
  var STEPS = [
    {
      eyebrow: '1단계 · 사이트 만들기',
      title: '사이트를 만들어요',
      lead: '사이트는 하나의 웹사이트 단위입니다. 이름과 코드를 정하면 그 안에 메뉴·페이지·콘텐츠를 담을 수 있어요.',
      fields: [
        { label: '사이트명', value: '우리학교 (예시)' },
        { label: '사이트 코드', value: 'DEMO' },
        { label: '기본 언어', value: '한국어 (ko)' }
      ]
    },
    {
      eyebrow: '2단계 · 주소 정하기',
      title: '주소를 연결해요',
      lead: '주소는 방문자가 보는 URL 입니다. 메뉴를 만들 때 주소와 연결할 콘텐츠·게시판을 함께 정해요. 예를 들어 /welcome 주소를 환영 콘텐츠로 이어줍니다.',
      fields: [
        { label: '주소', value: '/welcome' },
        { label: '대상 유형', value: '콘텐츠 (CONTENT)' },
        { label: '공개 여부', value: '공개' }
      ]
    },
    {
      eyebrow: '3단계 · 환영 페이지 만들기',
      title: '환영 콘텐츠를 작성해요',
      lead: '이 콘텐츠를 사이트 홈으로 지정하면 방문자가 가장 먼저 보는 첫 화면이 됩니다.',
      fields: [
        { label: '제목', value: '환영합니다' },
        { label: '본문(마크다운)', value: '# 우리학교에 오신 것을 환영합니다\n\n새 소식과 안내를 이곳에서 확인하세요.', area: true }
      ]
    },
    {
      eyebrow: '4단계 · 게시판 만들기',
      title: '게시판을 만들어요',
      lead: '게시판은 공지·자료처럼 글이 쌓이는 공간입니다. 유형(일반/갤러리/문의)에 따라 보이는 방식이 달라져요.',
      fields: [
        { label: '게시판 이름', value: '공지사항' },
        { label: '게시판 코드', value: 'NOTICE' },
        { label: '타입', value: '일반 게시판 (GENERAL)' },
        { label: '접근 권한', value: '전체 공개' }
      ]
    },
    {
      eyebrow: '5단계 · 메뉴 등록',
      title: '메뉴에 연결해요',
      lead: '메뉴는 방문자가 보는 내비게이션입니다. 메뉴의 주소에 앞서 만든 콘텐츠·게시판을 연결하면 방문자가 클릭해 이동할 수 있어요.',
      fields: [
        { label: '메뉴명', value: '공지사항' },
        { label: '상위 메뉴', value: '(최상위)' },
        { label: '주소', value: '/welcome' },
        { label: '정렬', value: '0' }
      ]
    }
  ];

  var overlay, dialog, headEl, bodyEl, footEl, lastTrigger;
  var current = 0; // 0..STEPS.length-1 = 단계, STEPS.length = 마무리 카드
  var adminBase = '/console';

  function isOpen() { return overlay && !overlay.hasAttribute('hidden'); }

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  // ---- 렌더 ----
  function fieldHtml(f) {
    var cls = 'cms-admin-tour__input' + (f.area ? ' cms-admin-tour__input--area' : '');
    var val = String(f.value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div class="cms-admin-tour__field">'
      + '<span class="cms-admin-tour__label">' + f.label + '</span>'
      + '<div class="' + cls + '" aria-readonly="true">' + val + '</div>'
      + '</div>';
  }

  function renderStep(i) {
    var s = STEPS[i];
    headEl.innerHTML =
      '<div class="cms-admin-tour__headtext">'
      + '<p class="cms-admin-tour__eyebrow">' + s.eyebrow + '</p>'
      + '<h2 class="cms-admin-tour__title" id="cms-tour-title">' + s.title + '</h2>'
      + '</div>'
      + '<button type="button" class="cms-admin-tour__close" data-tour-close aria-label="튜토리얼 닫기">×</button>';

    bodyEl.innerHTML =
      '<p class="cms-admin-tour__lead">' + s.lead + '</p>'
      + '<p class="cms-admin-tour__note">※ 실제로 저장되지 않는 연습이에요</p>'
      + '<div class="cms-admin-tour__form">' + s.fields.map(fieldHtml).join('') + '</div>';

    var isLast = (i === STEPS.length - 1);
    footEl.innerHTML =
      dotsHtml(i)
      + '<div class="cms-admin-tour__foot-actions">'
      + (i > 0 ? '<button type="button" class="krds-btn medium secondary" data-tour-prev>← 이전</button>' : '')
      + '<button type="button" class="krds-btn medium tertiary" data-tour-skip>건너뛰기</button>'
      + '<button type="button" class="krds-btn medium primary" data-tour-next>'
        + (isLast ? '마치기 →' : '다음 →') + '</button>'
      + '</div>';
  }

  function renderFinish() {
    headEl.innerHTML =
      '<div class="cms-admin-tour__headtext">'
      + '<p class="cms-admin-tour__eyebrow">완료</p>'
      + '<h2 class="cms-admin-tour__title" id="cms-tour-title">🎉 다 배웠어요!</h2>'
      + '</div>'
      + '<button type="button" class="cms-admin-tour__close" data-tour-close aria-label="튜토리얼 닫기">×</button>';

    bodyEl.innerHTML =
      '<p class="cms-admin-tour__lead">이제 직접 만들어 보세요. <strong>왼쪽 메뉴에 강조 표시된 항목</strong>'
      + '(사이트·메뉴·콘텐츠·게시판)을 눌러 시작하면 됩니다.</p>'
      + '<p class="cms-admin-tour__lead">익숙해지면 <strong>아무 화면에서나 <code>/</code> 키</strong>를 눌러 '
      + '명령 팔레트로 빠르게 이동할 수 있어요.</p>';

    footEl.innerHTML =
      dotsHtml(STEPS.length)
      + '<div class="cms-admin-tour__foot-actions">'
      + '<button type="button" class="krds-btn medium secondary" data-tour-prev>← 이전</button>'
      + '<button type="button" class="krds-btn medium primary" data-tour-close>시작하기</button>'
      + '</div>';
  }

  function dotsHtml(activeIndex) {
    var html = '<div class="cms-admin-tour__dots" role="tablist" aria-label="튜토리얼 단계">';
    for (var i = 0; i < STEPS.length; i++) {
      var cur = (i === activeIndex) ? ' aria-current="step"' : '';
      html += '<button type="button" class="cms-admin-tour__dot" role="tab" data-tour-dot="' + i
        + '"' + cur + ' aria-label="' + (i + 1) + '단계로 이동"></button>';
    }
    return html + '</div>';
  }

  function render() {
    if (current >= STEPS.length) { renderFinish(); } else { renderStep(current); }
    // 본문 변경 후 다이얼로그 상단에 포커스 유지(스크린리더가 제목을 읽도록).
    var next = dialog.querySelector('[data-tour-next]') || dialog.querySelector('[data-tour-close]');
    if (next) { next.focus(); }
  }

  function go(delta) {
    var n = current + delta;
    if (n < 0) { n = 0; }
    if (n > STEPS.length) { n = STEPS.length; }
    current = n;
    render();
  }

  function goTo(i) { current = Math.max(0, Math.min(STEPS.length, i)); render(); }

  // ---- 열기/닫기 + 포커스 트랩 ----
  function open(trigger) {
    if (!overlay) { return; }
    lastTrigger = trigger || document.activeElement;
    current = 0;
    overlay.removeAttribute('hidden');
    render();
  }

  function close() {
    if (!isOpen()) { return; }
    markSeen();
    // 마지막(마무리 카드)까지 본 경우에만 사이드바 강조를 켠다. 중간 건너뛰기는 제외.
    if (current >= STEPS.length) {
      try { localStorage.setItem(GUIDE_KEY, JSON.stringify(GUIDE_TARGETS)); } catch (e) {}
      applyGuide();
    }
    overlay.setAttribute('hidden', '');
    if (lastTrigger && lastTrigger.focus) { lastTrigger.focus(); }
    lastTrigger = null;
  }

  function focusables() {
    return Array.prototype.slice.call(
      dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function onKeydown(e) {
    if (!isOpen()) { return; }
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
    if (e.key !== 'Tab') { return; }
    var f = focusables();
    if (!f.length) { return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---- 사이드바 메뉴 강조(튜토리얼 완료 후) ----
  function readGuide() {
    try { var v = JSON.parse(localStorage.getItem(GUIDE_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeGuide(list) {
    try {
      if (list.length) { localStorage.setItem(GUIDE_KEY, JSON.stringify(list)); }
      else { localStorage.removeItem(GUIDE_KEY); }
    } catch (e) {}
  }
  function navItems() {
    return Array.prototype.slice.call(document.querySelectorAll('a.cms-admin-side-nav__item'));
  }
  function matchSuffix(link, suffix) {
    var href = link.getAttribute('href') || '';
    var path;
    try { path = new URL(href, location.origin).pathname; } catch (e) { path = href.split('?')[0]; }
    return path.replace(/\/+$/, '').endsWith(suffix);
  }
  function applyGuide() {
    var pending = readGuide();
    var items = navItems();
    // 현재 보고 있는 페이지(aria-current=page)에 해당하는 항목은 방문 완료로 간주 → 제거.
    pending = pending.filter(function (suffix) {
      return !items.some(function (a) {
        return a.getAttribute('aria-current') === 'page' && matchSuffix(a, suffix);
      });
    });
    writeGuide(pending);
    items.forEach(function (a) {
      var hit = pending.some(function (suffix) { return matchSuffix(a, suffix); });
      a.classList.toggle('cms-admin-side-nav__item--guide', hit);
      if (hit && !a.__guideBound) {
        a.__guideBound = true;
        // 클릭(이동) 시 해당 항목을 목록에서 제거 → 도착 후 더 이상 강조 안 됨.
        a.addEventListener('click', function () {
          writeGuide(readGuide().filter(function (s) { return !matchSuffix(a, s); }));
        });
      }
    });
  }

  // ---- DOM 생성 ----
  function build() {
    overlay = document.createElement('div');
    overlay.className = 'cms-admin-tour';
    overlay.id = 'cms-onboarding-tour';
    overlay.setAttribute('hidden', '');

    var backdrop = document.createElement('div');
    backdrop.className = 'cms-admin-tour__backdrop';
    backdrop.setAttribute('data-tour-close', '');

    dialog = document.createElement('div');
    dialog.className = 'cms-admin-tour__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'cms-tour-title');

    headEl = document.createElement('div'); headEl.className = 'cms-admin-tour__head';
    bodyEl = document.createElement('div'); bodyEl.className = 'cms-admin-tour__body';
    footEl = document.createElement('div'); footEl.className = 'cms-admin-tour__foot';

    dialog.appendChild(headEl);
    dialog.appendChild(bodyEl);
    dialog.appendChild(footEl);
    overlay.appendChild(backdrop);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 이벤트 위임: 다이얼로그 내부 컨트롤.
    overlay.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tour-close],[data-tour-next],[data-tour-prev],[data-tour-skip],[data-tour-dot]');
      if (!t) { return; }
      if (t.hasAttribute('data-tour-close')) { close(); }
      else if (t.hasAttribute('data-tour-skip')) { close(); }
      else if (t.hasAttribute('data-tour-next')) { go(1); }
      else if (t.hasAttribute('data-tour-prev')) { go(-1); }
      else if (t.hasAttribute('data-tour-dot')) { goTo(parseInt(t.getAttribute('data-tour-dot'), 10)); }
    });
    document.addEventListener('keydown', onKeydown);
  }

  function init() {
    build();

    // adminBase: 대시보드 shell 루트가 알려줌(없으면 기본값).
    var root = document.querySelector('[data-admin-base]');
    if (root) { adminBase = root.getAttribute('data-admin-base') || adminBase; }

    // 수동 트리거(헤더 "시작 가이드" 등) — 언제나 열림.
    document.querySelectorAll('[data-onboarding-open]').forEach(function (b) {
      b.addEventListener('click', function () { open(b); });
    });

    // 튜토리얼을 이미 마쳤다면, 매 페이지에서 사이드바 강조를 칠하고 방문한 항목은 해제.
    applyGuide();

    // 자동 오픈: 빈 상태(사이트 0개) + 아직 안 본 경우.
    var empty = document.querySelector('[data-onboarding-empty="true"]');
    var seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
    if (empty && !seen) { open(null); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
}());
