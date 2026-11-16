/*
 * 핵심데이터 시각화 상세(sub_0104_상세) — 덧붙임 스크립트.
 * 1) 범례는 표시만 한다(설계서 v1.4.11 sub_0104_상세-03 「범례는 표시만, 눌러도 계열을 끄지 않음」). 그래프 부품 cm-chart.js(디자인팀 원본 —
 *    고치지 않는다)의 범례 버튼은 누르면 계열을 숨기므로, 이 화면에서는 문서 캡처 단계에서 범례 누름을 막고 버튼을 읽기 전용으로 바꾼다.
 *    확대 모달(#modal_chart_zoom)의 범례도 같다. 시계열 상세는 범례 조회를 유지한다(이 파일은 이 화면만 싣는다).
 * 2) 그래프 이미지(PNG — 다운로드 메뉴 「이미지로 저장(PNG)」)는 cm-chart.js 가 만들어 저장하고, 이 파일은 내려받기 기록 API(GET …/downloads)만 부른다.
 *    통계표(CSV)는 서버 주소 링크라 서버가 기록한다.
 */
(function () {
  'use strict';

  var LEGEND = '.cm-chart-legend-item, .cm-chart-legend-all';

  function blockLegend(event) {
    var hit = event.target && event.target.closest && event.target.closest(LEGEND);
    if (!hit) { return; }
    event.preventDefault();
    event.stopPropagation();
  }

  // cm-chart.js 는 그릴 때마다 범례 버튼을 새로 만든다 — 만들어질 때마다 읽기 전용 표시로 바꾼다
  function markReadOnly(scope) {
    scope.querySelectorAll('.cm-chart-legend').forEach(function (legend) {
      legend.setAttribute('aria-label', '그래프 범례');
      legend.querySelectorAll('.cm-chart-legend-item').forEach(function (btn) {
        btn.removeAttribute('aria-pressed');
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('tabindex', '-1');
        var state = btn.querySelector('.sr-only');
        if (state) { state.remove(); }
      });
      legend.querySelectorAll('.cm-chart-legend-all').forEach(function (btn) { btn.remove(); });
    });
  }

  function watch(scope) {
    markReadOnly(scope);
    new MutationObserver(function () { markReadOnly(scope); }).observe(scope, { childList: true, subtree: true });
  }

  // 기록 실패는 화면 동작(이미지 저장)에 영향을 주지 않는다
  function logImage(root, ext) {
    var api = root.getAttribute('data-api');
    var id = root.getAttribute('data-kd-sttbl');
    if (!api || !id || !window.fetch) { return; }
    fetch(api + '/kd/sttbls/' + encodeURIComponent(id) + '/downloads?ext=' + encodeURIComponent(ext),
          { credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(function () {});
  }

  function init(root) {
    watch(root);
    root.querySelectorAll('[data-chart-download="png"], [data-chart-download="svg"]').forEach(function (link) {
      link.addEventListener('click', function () { logImage(root, link.getAttribute('data-chart-download')); });
    });
  }

  function start() {
    var roots = document.querySelectorAll('[data-sedis-screen="kd-detail"]');
    if (!roots.length) { return; }
    document.addEventListener('click', blockLegend, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { blockLegend(event); }
    }, true);
    roots.forEach(init);
    var zoom = document.getElementById('modal_chart_zoom');
    if (zoom) { watch(zoom); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
