/* 디자인 키트 전용(실제 화면에 들어가지 않음)
   1) 키트 화면 사이 링크 연결: 원래 주소(data-kit-href)를 kit-map.js 로 찾아 키트 파일로 잇는다.
      주소가 똑같은 화면이 없으면 같은 경로의 기본 화면으로 잇고(쿼리 값이 어긋나지 않을 때), 그래도 없으면 알림만.
   2) 상태 화면 연결: 단추 이름(aria-label · title · 글자)이 「더보기 · 패널 · 창 · 탭」 상태 이름과 같으면 그 상태 화면으로 간다.
      상태 화면에서 닫기 · 바깥 클릭 · Esc · 기본 탭을 누르면 기본 화면으로 돌아온다.
   3) 폼은 보내지 않는다. */
(function () {
  var me = document.currentScript && document.currentScript.src;
  var ROOT = me ? me.replace(/static\/_kit\/kit\.js(\?.*)?$/, '') : '';

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#1d2433;color:#fff;padding:10px 16px;border-radius:8px;font:14px/1.4 sans-serif;z-index:2147483647;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }
  function nfc(s) { try { return s.normalize('NFC'); } catch (e) { return s; } }
  function squash(s) { return nfc(String(s || '')).replace(/\s+/g, ''); }
  function go(file) { location.href = ROOT + file.split('/').map(encodeURIComponent).join('/'); }

  document.addEventListener('submit', function (e) { e.preventDefault(); toast('키트에서는 저장되지 않습니다'); }, true);

  function init() {
    var MAP = window.KIT_MAP || [];
    var here = nfc(decodeURIComponent(location.pathname));
    var mine = MAP.filter(function (r) { return here.slice(-r.f.length) === r.f; });
    if (!mine.length) { bindMissingToast(); return; }
    var ED = mine[0].e;
    var myUrls = {}; mine.forEach(function (r) { myUrls[r.u] = 1; });
    var isState = mine.every(function (r) { return !!r.s; });
    var baseFile = null;
    MAP.forEach(function (r) { if (!baseFile && r.e === ED && !r.s && myUrls[r.u]) baseFile = r.f; });

    // 1) 링크 연결
    function parse(u) { try { return new URL(u.replace(/&amp;/g, '&'), 'http://kit'); } catch (e) { return null; } }
    var bases = MAP.filter(function (r) { return r.e === ED && !r.s; });
    function resolve(href) {
      var L = parse(href); if (!L) return null;
      var exact = null, best = null, bestScore = -1;
      bases.forEach(function (r) {
        var C = parse(r.u); if (!C || C.pathname !== L.pathname) return;
        if (C.search === L.search) { exact = exact || r; return; }
        var score = 0, conflict = false;
        C.searchParams.forEach(function (v, k) {
          var lv = L.searchParams.get(k);
          if (lv === null || lv === '') return;          // 링크에 없는 값은 허용
          if (lv === v) score++; else conflict = true;
        });
        if (!conflict && score > bestScore) { best = r; bestScore = score; }
      });
      return exact || best;
    }
    var linked = 0;
    document.querySelectorAll('a[href="#kit-missing"][data-kit-href]').forEach(function (a) {
      var r = resolve(a.getAttribute('data-kit-href'));
      if (r) { a.setAttribute('href', ROOT + r.f); a.removeAttribute('target'); a.setAttribute('data-kit-linked', ''); linked++; }
    });

    // 2) 상태 화면 연결
    var states = MAP.filter(function (r) { return r.e === ED && r.s && myUrls[r.u] && r.s.indexOf(':') > 0; })
      .map(function (r) { return { f: r.f, kind: r.s.split(':')[0], name: squash(r.s.slice(r.s.indexOf(':') + 1)) }; });
    function namesOf(el) { return [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent].filter(Boolean).map(squash); }
    var CLOSERS = '.nv-panel__close,.nv-panel-backdrop,.nv-modal-backdrop,.cms-admin-cmdk__backdrop,[aria-label="닫기"],[data-dismiss],[data-close]';

    document.addEventListener('click', function (e) {
      var t = e.target;
      var miss = t.closest && t.closest('a[href="#kit-missing"]');
      if (miss) { e.preventDefault(); toast('키트에 없는 화면입니다: ' + (miss.getAttribute('data-kit-href') || '').replace(/&amp;/g, '&')); return; }
      if (t.closest && t.closest('a[href]:not([href^="#"]):not([href^="javascript"])')) return;   // 진짜 링크는 그대로
      var el = t.closest && t.closest('button,[role="button"],[role="tab"],[role="menuitem"],summary,a,[aria-label]');
      if (el) {
        var ns = namesOf(el);
        for (var i = 0; i < states.length; i++) {
          if (ns.indexOf(states[i].name) >= 0 && !here.endsWith(states[i].f)) { e.preventDefault(); e.stopPropagation(); go(states[i].f); return; }
        }
      }
      if (isState && baseFile) {
        var tab = t.closest && t.closest('[role="tab"]');
        if (tab || (t.closest && t.closest(CLOSERS))) { e.preventDefault(); go(baseFile); return; }
        var kind = mine[0].s.split(':')[0];
        if (kind === '더보기' && !(t.closest && t.closest('.nv-dropmenu__menu,[role="menu"]'))) { e.preventDefault(); go(baseFile); }
      }
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isState && baseFile) go(baseFile); });
    document.documentElement.setAttribute('data-kit-links', linked);
  }
  function bindMissingToast() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#kit-missing"]');
      if (a) { e.preventDefault(); toast('키트에 없는 화면입니다: ' + (a.getAttribute('data-kit-href') || '')); }
    }, true);
  }
  function start() {
    if (window.KIT_MAP) return init();
    var s = document.createElement('script'); s.src = ROOT + 'static/_kit/kit-map.js';
    s.onload = init; s.onerror = bindMissingToast; document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
