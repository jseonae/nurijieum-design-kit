/*
 * 로딩 안내(PER-001 「대용량 분석·통계·시각화 화면은 로딩 상태를 사용자에게 명확하게 고지」) — 사용자 화면 공용 덧붙임 스크립트.
 * 교차분석(xa-crosstab.js 상태 상자 [data-xa-status])·AI 해설 도우미(ai-helper.js 답변 대기 aria-busy)와 같은 방식:
 * 글로 된 안내(role="status" aria-live="polite")와 바뀌는 구획의 aria-busy.
 *
 * 마크업(조각 템플릿 — 퍼블리싱에 없음. 숨기면 자리를 차지하지 않는 <p> 하나):
 *   <p role="status" aria-live="polite" data-sedis-loading data-sedis-loading-error="(실패 글)">…를 불러오는 중입니다.</p>
 *   안내가 알리는 구획 = 안내와 같은 부모 아래의 [aria-busy] 형제. 안내를 구획 안에 두지 않는 것은 aria-busy="true" 인 구획 안의
 *   바뀜은 화면낭독기가 미뤄 읽지 않을 수 있어서다.
 *  1) 그래프 — 구획이 cm-chart.js 그래프 자리([data-cm-chart], 서버가 aria-busy="true")면 서버가 안내를 보이게 그려 두고,
 *     cm-chart.js 가 그리면(그림 영역에 ECharts SVG — setOption 과 같은 차례) 안내를 숨기고 aria-busy="false".
 *     페이지를 다 받았는데(load) ECharts·cm-chart.js 가 없거나, 두 파일에서 오류가 나거나, load 뒤 GRACE 가 지나도 못 그렸으면
 *     안내 글을 data-sedis-loading-error 로 바꾼다 — 통계표는 서버가 그려 그대로 보인다.
 *  2) 다시 조회 — 화면 조각 안의 조건 폼을 제출하거나 쪽 번호를 누르면 다음 화면이 올 때까지 안내를 보이고 aria-busy="true".
 *     DELAY 안에 다음 화면이 오면 띄우지 않는다(깜박임). 조건 폼은 GET 이라 화면 전체가 바뀐다 — 서버 실패는 테마 화면이 맡는다.
 *     form.submit() 은 submit 이벤트가 없으므로 화면 JS 는 requestSubmit() 으로 제출한다(trd-status.js 와 같음).
 *     뒤로가기(bfcache)로 돌아오면 원래대로 숨긴다.
 * 화면 JS 보다 먼저(ECharts·cm-chart.js 앞) 싣는다 — 그래프를 그리는 순간과 오류를 놓치지 않게.
 */
(function () {
  'use strict';

  var DELAY = 300;
  var GRACE = 3000;
  var CHART_FILE = /\/chart\/cm-chart\.js|\/echarts[^/]*\.js/;

  var notices = [];
  var broken = false;
  var timer = null;

  function regions(notice) {
    return Array.prototype.filter.call(notice.parentElement.children, function (el) {
      return el !== notice && el.hasAttribute('aria-busy');
    });
  }

  function visible(el) {
    return el.offsetWidth > 0 && el.getClientRects().length > 0;
  }

  // cm-chart.js 가 그렸다 = 그래프 객체(el._cmChart)가 그림 표시를 했고 그림 영역에 ECharts SVG 가 있다
  function drawn(chart) {
    return !!(chart._cmChart && chart._cmChart.rendered && chart.querySelector('.cm-chart-body svg'));
  }

  function busy(it, on) {
    it.regions.forEach(function (el) { el.setAttribute('aria-busy', on ? 'true' : 'false'); });
  }

  // 화면낭독기가 바뀐 글을 읽도록 비웠다가 넣는다(xa-crosstab.js say 와 같음)
  function say(it, text) {
    var seq = ++it.seq;
    it.el.hidden = false;
    it.el.textContent = '';
    setTimeout(function () {
      if (seq === it.seq) { it.el.textContent = text; }
    }, 30);
  }

  function idle(it) {
    it.seq++;
    it.state = 'idle';
    it.el.hidden = true;
    it.el.textContent = it.text;
    busy(it, false);
  }

  function fail(it) {
    it.state = 'error';
    busy(it, false);
    say(it, it.error || it.text);
  }

  function check(it) {
    if (it.state !== 'chart') { return; }
    if (broken) {
      fail(it);
    } else if (it.charts.every(drawn)) {
      idle(it);
    }
  }

  function loaded() {
    if (!window.echarts || !window.CmChart) { broken = true; }
    notices.forEach(check);
    setTimeout(function () {
      notices.forEach(function (it) {
        check(it);
        if (it.state === 'chart' && it.charts.some(visible)) { fail(it); }
      });
    }, GRACE);
  }

  function requery(root, event) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      if (event.defaultPrevented) { return; }
      notices.forEach(function (it) {
        if (!root.contains(it.el)) { return; }
        it.state = 'wait';
        busy(it, true);
        say(it, it.text);
      });
    }, DELAY);
  }

  function bind(root) {
    root.addEventListener('submit', function (event) { requery(root, event); });
    root.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('.krds-pagination a[href]');
      if (!link || link.target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) { return; }
      requery(root, event);
    });
  }

  function start() {
    var roots = [];
    document.querySelectorAll('[data-sedis-loading]').forEach(function (el) {
      var it = {
        el: el,
        text: el.textContent.replace(/\s+/g, ' ').trim(),
        error: el.getAttribute('data-sedis-loading-error'),
        state: el.hidden ? 'idle' : 'chart',
        regions: regions(el),
        seq: 0
      };
      it.charts = it.regions.filter(function (r) { return r.hasAttribute('data-cm-chart'); });
      notices.push(it);
      check(it);
      if (it.state === 'chart') {
        var observer = new MutationObserver(function () {
          check(it);
          if (it.state !== 'chart') { observer.disconnect(); }
        });
        it.charts.forEach(function (c) { observer.observe(c, { childList: true, subtree: true }); });
      }
      var root = el.closest('[data-sedis-screen]');
      if (root && roots.indexOf(root) < 0) {
        roots.push(root);
        bind(root);
      }
    });
    if (document.readyState === 'complete') { loaded(); }
  }

  window.addEventListener('error', function (event) {
    if (!CHART_FILE.test(event.filename || '')) { return; }
    broken = true;
    notices.forEach(check);
  });
  window.addEventListener('load', loaded);
  window.addEventListener('pagehide', function () {
    clearTimeout(timer);
    timer = null;
  });
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) { return; }
    notices.forEach(function (it) {
      if (it.state === 'wait') { idle(it); }
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
