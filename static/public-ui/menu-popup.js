/*
 * 팝업창으로 여는 메뉴(링크 대상 _popup). 링크의 data-popup 을 보고 정해진 크기의 창으로 연다.
 * 스크립트가 없거나 Ctrl · Shift 클릭이면 링크(target=_blank)가 그대로 새 창으로 열린다.
 */
(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    var link = event.target && event.target.closest ? event.target.closest('a[data-popup]') : null;
    if (!link) {
      return;
    }
    event.preventDefault();
    window.open(link.href, '_blank', 'noopener,width=1000,height=700');
  });
})();
