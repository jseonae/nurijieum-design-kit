/*
 * 핵심데이터 시각화 목록(sub_0104) — 덧붙임 스크립트. 목록 조건은 GET 폼(#kd_list_form)이라 이 파일 없이도 검색 버튼으로 동작한다.
 * 이 파일은 퍼블리싱 화면처럼 분야 칩·조사대상자·표시 개수를 바꾸면 바로 다시 조회한다(설계서 sub_0104-03·05·06).
 * 연도 탭은 다른 폼(#kd_year_form)의 제출 버튼이라 손대지 않는다.
 * 제출은 requestSubmit() — submit 이벤트가 나야 로딩 안내(assets/common/loading.js)가 뜬다(trd-status.js 와 같음).
 */
(function () {
  'use strict';

  function submit(form) {
    form.requestSubmit ? form.requestSubmit() : form.submit();
  }

  function init(root) {
    var form = document.getElementById('kd_list_form');
    if (!form) { return; }
    root.querySelectorAll('input[name="grp"]').forEach(function (chip) {
      chip.addEventListener('change', function () {
        // 분야를 바꾸면 그 분야에 없는 조사대상자가 남지 않도록 조사대상자를 푼다(프로토타입 renderNewsGrid 와 같음)
        var target = root.querySelector('select[name="trpr"]');
        if (target) { target.value = ''; }
        submit(form);
      });
    });
    root.querySelectorAll('select[name="trpr"], select[name="n"]').forEach(function (select) {
      select.addEventListener('change', function () { submit(form); });
    });
  }

  function start() {
    document.querySelectorAll('[data-sedis-screen="kd-list"]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
