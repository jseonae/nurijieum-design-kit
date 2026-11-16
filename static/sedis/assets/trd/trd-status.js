/*
 * 특수교육 현황(sub_0102·0102_01~05) — 덧붙임 스크립트. 조건은 GET 폼(#es_form)이라 이 파일 없이도 동작한다.
 * 이 파일은 퍼블리싱 화면처럼 보기 기준·급별 배치 선택을 바꾸면 바로 다시 조회하게 하고, JS 없을 때 쓰는 「조회」 버튼을 숨긴다.
 * 지표 탭(학생 수·기관 수)은 #es_tab_form 제출 버튼(name="metric")이라 누르면 서버가 그 지표로 다시 그린다.
 * 퍼블리싱의 확인용 스크립트(kr/js/user-custom.js cmEduBasis — 결과 블록 숨김)는 서버 조회로 바뀌어 옮기지 않았다.
 * 내려받기(#23): 그래프 이미지(PNG·SVG)는 cm-chart.js 가 만들어 저장하고, 이 파일은 같은 조건으로 기록 API(GET …/downloads)만 부른다.
 * 통계표(CSV·엑셀)는 서버 주소 링크라 서버가 기록한다.
 */
(function () {
  'use strict';

  function init(root) {
    var form = document.getElementById('es_form');
    if (!form) { return; }

    // .krds-btn 의 display 규칙이 hidden 속성을 덮어서 style 로 숨긴다
    root.querySelectorAll('[data-es-submit]').forEach(function (button) { button.hidden = true; button.style.display = 'none'; });

    // 지표 탭 버튼은 폼 제출이라 서버가 그 지표로 다시 그린다. KRDS 탭 스크립트(ui-script.js)가 제출 전에 탭·패널을 먼저 바꾸면
    // 빈 패널이 잠깐 보이고, 브라우저 뒤로가기(bfcache)가 그 상태를 되살린다 → 캡처 단계에서 KRDS 로 가는 클릭을 막는다(제출은 그대로)
    root.addEventListener('click', function (event) {
      if (event.target.closest('.cm-es-tab .btn-tab[form="es_tab_form"]')) { event.stopPropagation(); }
    }, true);

    root.querySelectorAll('[data-chart-download="png"], [data-chart-download="svg"]').forEach(function (link) {
      link.addEventListener('click', function () { logImage(root, link.getAttribute('data-chart-download')); });
    });

    // 다운로드 메뉴의 KRDS 「선택됨」(aria-selected) 걷어내기는 공용 cm-chart.js(SEDIS 추가 ⑨)가 한다

    root.querySelectorAll('select[form="es_form"]').forEach(function (select) {
      select.addEventListener('change', function () {
        // 보기 기준을 바꾸면 급별 배치 선택은 처음(전체 배치)으로 — 급별이 아닌 보기에는 필터가 없다
        if (select.name === 'view') {
          var place = root.querySelector('select[name="filter"]');
          if (place) { place.disabled = true; }
        }
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    });
  }

  // 기록 실패는 화면 동작(이미지 저장)에 영향을 주지 않는다
  function logImage(root, ext) {
    var api = root.getAttribute('data-api');
    if (!api || !window.fetch) { return; }
    var q = new URLSearchParams({ ext: ext });
    [['metric', 'data-trd-metric'], ['view', 'data-trd-view'], ['filter', 'data-trd-filter']].forEach(function (p) {
      var v = root.getAttribute(p[1]);
      if (v) { q.append(p[0], v); }
    });
    fetch(api + '/trd/status/downloads?' + q.toString(),
          { credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(function () {});
  }

  // 뒤로가기로 돌아온 화면(bfcache)은 서버가 그린 선택(li data-es-selected)으로 탭·패널을 맞춘다.
  // 탭 역할(role=tab·aria-controls·aria-selected)은 퍼블리싱에선 li 에 있지만 테마 스크립트가 버튼으로 옮긴다 — 둘 다 받는다
  function restoreTabs(root) {
    root.querySelectorAll('.cm-es-tab .tab li').forEach(function (li) {
      var on = li.hasAttribute('data-es-selected');
      var button = li.querySelector('.btn-tab');
      var tab = button && button.getAttribute('role') === 'tab' ? button : li;
      li.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) { panel.classList.toggle('active', on); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-sedis-screen="trd-status"]').forEach(init);
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { document.querySelectorAll('[data-sedis-screen="trd-status"]').forEach(restoreTabs); }
  });
})();
