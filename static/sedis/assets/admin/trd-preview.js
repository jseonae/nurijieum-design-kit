/* adm_1202 사용자 화면 미리보기 — 콘솔에 없는 동작(드롭다운 · 표 좌우 이동은 .sd-trd-user 안만, 차트 확대 모달용 krds_modal).
   원본: 테마 vendor/krds/js/component/ui-script.js krds_dropEvent(다운로드 드롭다운) · pub/_common/resources/js/krds-custom.js cmTableScroll(표 좌우 이동).
   조각은 서버가 그려 주고 스크립트는 defer 라 표 초기화는 DOMContentLoaded 에서 한 번이면 된다. 클릭·키·스크롤은 document 에서 받는다.
   CSV·엑셀 링크는 미리보기에서 href 가 없다 — 누르면 메뉴만 닫힌다. */
(function () {
  'use strict';
  var ROOT = '.sd-trd-user';

  /* ---- 차트 확대 모달용 krds_modal ----
     cm-chart.js 는 전역 krds_modal.openModal(id) 만 부른다(원본 ui-script.js krds_modal). 콘솔에 없을 때만 필요한 만큼 채운다:
     열기(.shown → .in) · 닫기 버튼(.close-modal) · Esc · 배경 누름 · 초점 가둠 · 닫은 뒤 열었던 버튼(.modal-opened[data-modal-id])으로 초점 복귀. */
  if (typeof krds_modal === 'undefined') { // eslint-disable-line no-undef
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    var modalHandlers = {};
    var close = function (id) {
      var m = document.getElementById(id);
      if (!m || !m.classList.contains('shown')) return;
      m.classList.remove('in');
      var back = m.querySelector('.modal-back');
      if (back) back.classList.remove('in');
      setTimeout(function () { m.classList.remove('shown'); }, 350);
      document.body.classList.remove('scroll-no');
      var t = document.querySelector('.modal-opened[data-modal-id="' + id + '"]');
      if (t) { t.focus(); t.classList.remove('modal-opened'); t.removeAttribute('data-modal-id'); }
    };
    var open = function (id) {
      var m = document.getElementById(id);
      if (!m) return;
      var back = m.querySelector('.modal-back');
      document.body.classList.add('scroll-no');
      m.setAttribute('role', 'dialog');
      m.classList.add('shown');
      if (back) back.classList.add('in');
      setTimeout(function () { m.classList.add('in'); }, 150);
      setTimeout(function () { var f = m.querySelector(FOCUSABLE); if (f) f.focus(); }, 350);
      if (modalHandlers[id]) return;
      modalHandlers[id] = true;
      m.addEventListener('click', function (e) {
        if (e.target.closest('.close-modal') || !e.target.closest('.modal-content')) close(id);
      });
      m.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') { close(id); return; }
        if (e.key !== 'Tab') return;
        var f = m.querySelectorAll(FOCUSABLE);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    };
    window.krds_modal = { openModal: open, closeModal: close };
  }

  /* ---- 다운로드 드롭다운 ---- */
  function closeAll(except) {
    document.querySelectorAll(ROOT + ' .krds-drop-wrap').forEach(function (wrap) {
      if (wrap === except) return;
      var menu = wrap.querySelector('.drop-menu');
      var btn = wrap.querySelector('.drop-btn');
      if (menu) menu.style.display = 'none';
      if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }
  document.addEventListener('click', function (e) {
    var wrap = e.target.closest(ROOT + ' .krds-drop-wrap');
    if (!wrap) { closeAll(); return; }
    var btn = wrap.querySelector('.drop-btn');
    var menu = wrap.querySelector('.drop-menu');
    if (!btn || !menu) return;
    if (e.target.closest('.drop-btn')) {
      var open = menu.style.display === 'block';
      closeAll(wrap);
      menu.style.display = open ? 'none' : 'block';
      btn.classList.toggle('active', !open);
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    } else if (e.target.closest('.item-link')) {
      if (!e.target.closest('.item-link').getAttribute('href') || e.target.closest('.item-link').getAttribute('href') === '#') e.preventDefault();
      closeAll();
      btn.focus();
    }
  });
  /* Tab 으로 드롭다운을 벗어나면 닫는다(KRDS 와 같은 포커스 아웃 처리) */
  document.addEventListener('focusout', function (e) {
    var wrap = e.target.closest && e.target.closest(ROOT + ' .krds-drop-wrap');
    if (!wrap) return;
    if (e.relatedTarget && !wrap.contains(e.relatedTarget)) closeAll(); // relatedTarget 없음(Safari 버튼 누름 등)은 바깥 누름 처리에 맡긴다
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var wrap = e.target.closest && e.target.closest(ROOT + ' .krds-drop-wrap');
    closeAll();
    if (wrap) { var b = wrap.querySelector('.drop-btn'); if (b) b.focus(); }
  });

  /* ---- 표 좌우 이동 ---- */
  var seen = new WeakSet();
  function parts(box) {
    return { wrap: box.querySelector('.krds-table-wrap'), prev: box.querySelector('.cm-table-prev'), next: box.querySelector('.cm-table-next') };
  }
  function update(box) {
    var p = parts(box);
    if (!p.wrap || !p.prev || !p.next) return;
    var max = p.wrap.scrollWidth - p.wrap.clientWidth;
    var atStart = p.wrap.scrollLeft <= 1;
    var atEnd = p.wrap.scrollLeft >= max - 1;
    [[p.prev, atStart], [p.next, atEnd]].forEach(function (x) {
      if (x[1] && x[0] === document.activeElement) (x[0] === p.prev ? p.next : p.prev).focus();
      x[0].disabled = x[1];
    });
    box.classList.toggle('is-end', atEnd);
    box.classList.toggle('no-scroll', max <= 1);
    if (!atStart) box.classList.add('is-scrolled');
  }
  function setup() {
    document.querySelectorAll(ROOT + ' .drop-btn:not([aria-expanded])').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.querySelectorAll(ROOT + ' .cm-table-scroll').forEach(function (box) {
      if (seen.has(box)) return;
      seen.add(box);
      var wrap = box.querySelector('.krds-table-wrap');
      if (wrap && 'ResizeObserver' in window) new ResizeObserver(function () { update(box); }).observe(wrap);
      update(box);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest(ROOT + ' .cm-table-prev, ' + ROOT + ' .cm-table-next');
    if (!b) return;
    var box = b.closest('.cm-table-scroll');
    var wrap = box && box.querySelector('.krds-table-wrap');
    if (!wrap) return;
    var cell = wrap.querySelector('thead th:nth-child(2)');
    var step = cell ? cell.offsetWidth : wrap.clientWidth / 2;
    wrap.scrollBy({ left: b.classList.contains('cm-table-prev') ? -step : step, behavior: 'smooth' });
  });
  document.addEventListener('scroll', function (e) {
    var wrap = e.target;
    if (!wrap.closest || !wrap.matches('.krds-table-wrap')) return;
    var box = wrap.closest(ROOT + ' .cm-table-scroll');
    if (box) update(box);
  }, { capture: true, passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
