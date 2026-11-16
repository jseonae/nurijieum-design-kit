/*
 * 시계열 시각화 상세(sub_0103_상세) — 덧붙임 스크립트. 조건(그래프 g · 특성 구분 f · 특성 경로 path)은 GET 폼(#ts_detail_form)이라
 * 이 파일 없이도 「조회」 버튼으로 동작한다. 이 파일은 퍼블리싱 화면처럼 특성 구분·칩을 바꾸면 바로 다시 조회하고 「조회」 버튼을 숨긴다.
 * 퍼블리싱의 확인용 스크립트(kr/js/user-custom.js cmTsFeature — 칩 묶음 바꾸기)는 서버 조회로 바뀌어 옮기지 않았다.
 * 그래프 이미지(PNG·SVG)는 cm-chart.js 가 만들어 저장하고, 이 파일은 같은 조건으로 내려받기 기록 API(GET …/downloads)만 부른다.
 * 통계표(CSV)는 서버 주소 링크라 서버가 기록한다.
 */
(function () {
  'use strict';

  function init(root) {
    var form = document.getElementById('ts_detail_form');
    if (!form) { return; }

    // KRDS 버튼 display 가 hidden 속성을 이기므로 지운다(JS 가 있으면 바꾸면 바로 조회)
    root.querySelectorAll('[data-ts-submit]').forEach(function (button) { button.remove(); });

    root.querySelectorAll('select[name="f"], select[name="y"]').forEach(function (select) {
      select.addEventListener('change', function () { form.requestSubmit(); });
    });
    root.querySelectorAll('input[name="path"]').forEach(function (chip) {
      chip.addEventListener('change', function () { form.requestSubmit(); });
    });

    root.querySelectorAll('[data-chart-download="png"], [data-chart-download="svg"]').forEach(function (link) {
      link.addEventListener('click', function () { logImage(root, link.getAttribute('data-chart-download')); });
    });
  }

  // 기록 실패는 화면 동작(이미지 저장)에 영향을 주지 않는다
  function logImage(root, ext) {
    var api = root.getAttribute('data-api');
    var topic = root.getAttribute('data-ts-topic');
    if (!api || !topic || !window.fetch) { return; }
    var q = new URLSearchParams({ ext: ext });
    [['g', 'data-ts-graph'], ['f', 'data-ts-feature'], ['path', 'data-ts-path'], ['y', 'data-ts-year']].forEach(function (p) {
      var v = root.getAttribute(p[1]);
      if (v) { q.append(p[0], v); }
    });
    fetch(api + '/ts/topics/' + encodeURIComponent(topic) + '/downloads?' + q.toString(),
          { credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(function () {});
  }

  function start() {
    document.querySelectorAll('[data-sedis-screen="ts-detail"]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
