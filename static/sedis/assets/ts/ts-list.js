/*
 * 시계열 시각화 목록(sub_0103) — 덧붙임 스크립트. 목록 조건은 GET 폼(#ts_list_form)이라 이 파일 없이도 동작한다.
 * 이 파일은 퍼블리싱 화면처럼 칩·표시 개수를 바꾸면 바로 다시 조회하게 하고, 분류 탭은 다시 조회 없이 KRDS 탭(ui-script.js)으로 넘긴다.
 * 퍼블리싱의 확인용 스크립트(kr/js/user-custom.js cmTsFilter — 카드 숨김)는 서버 조회로 바뀌어 옮기지 않았다.
 * 제출은 requestSubmit() — submit 이벤트가 나야 로딩 안내(assets/common/loading.js)가 뜬다(trd-status.js 와 같음).
 * 검색어 칸 Enter: 브라우저의 암묵적 제출은 폼의 기본 버튼 = 문서 순서로 첫 제출 버튼을 누른다. 퍼블리싱 배치에서 그 버튼은
 * 검색 버튼이 아니라 「주제별」 탭이고 탭 누름은 막으므로, 그 누름을 검색 버튼 제출로 바꾼다(배치·마크업은 그대로 둔다).
 */
(function () {
  'use strict';

  function activeTab(root) {
    var panel = root.querySelector('.cm-ts-filter .tab-conts.active');
    return panel && panel.id === 'panel_ts_02' ? 'trpr' : 'grp';
  }

  // 열어 둔 분류 탭을 조건에 넣는다(다시 조회한 화면이 같은 탭을 연다)
  function rememberTab(root, form) {
    var tab = form.querySelector('input[type="hidden"][name="tab"]');
    if (!tab) {
      tab = document.createElement('input');
      tab.type = 'hidden';
      tab.name = 'tab';
      form.appendChild(tab);
    }
    tab.value = activeTab(root);
  }

  function submit(root, form, submitter) {
    rememberTab(root, form);
    if (!form.requestSubmit) {
      form.submit();
    } else if (submitter) {
      form.requestSubmit(submitter);
    } else {
      form.requestSubmit();
    }
  }

  // 탭 버튼 누름이 암묵적 제출(검색어 칸 등 폼 컨트롤에서 Enter)에서 왔는가 — 그때 초점은 누른 버튼이 아니라 그 컨트롤에 있다.
  // 마우스·터치로 탭을 누르면 초점이 버튼으로 가거나(크롬·파이어폭스) 칸에서 빠지고(사파리), 키보드로 탭을 누르면 초점이 버튼이다.
  function implicitSubmission(form, button) {
    var focused = document.activeElement;
    return !!focused && focused !== button && focused.form === form;
  }

  function init(root) {
    var form = document.getElementById('ts_list_form');
    if (!form) { return; }

    // 분류 탭: JS 가 있으면 다시 조회하지 않고 KRDS 탭이 패널만 바꾼다(버튼의 제출을 막음).
    // 검색어 칸 Enter 가 누른 것으로 친 탭(암묵적 제출)이면 검색 버튼으로 제출한다 — 탭은 열어 둔 그대로(rememberTab).
    var search = root.querySelector('.cm-board-search button[type="submit"]');
    root.querySelectorAll('.cm-ts-filter .btn-tab[name="tab"]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        if (implicitSubmission(form, button)) {
          submit(root, form, search);
        }
      });
    });

    var all = root.querySelector('[data-ts-chip-all]');
    var groups = root.querySelectorAll('input[name="grp"]');
    if (all) {
      all.addEventListener('change', function () {
        if (all.checked) {
          groups.forEach(function (g) { g.checked = false; });
        } else if (!Array.prototype.some.call(groups, function (g) { return g.checked; })) {
          all.checked = true;
          return;
        }
        submit(root, form);
      });
    }
    groups.forEach(function (g) {
      g.addEventListener('change', function () {
        var any = Array.prototype.some.call(groups, function (x) { return x.checked; });
        if (all) { all.checked = !any; }
        submit(root, form);
      });
    });
    root.querySelectorAll('input[name="trpr"]').forEach(function (r) {
      r.addEventListener('change', function () { submit(root, form); });
    });
    var size = root.querySelector('select[name="n"]');
    if (size) {
      size.addEventListener('change', function () { submit(root, form); });
    }
    // 검색 버튼·Enter 로 제출할 때도 열어 둔 탭을 기억한다
    form.addEventListener('submit', function () { rememberTab(root, form); });
  }

  function start() {
    document.querySelectorAll('[data-sedis-screen="ts-list"]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
