/*
 * 게시판 스킨(누리지음 기본 공개 화면) 동작 — 스크립트가 없어도 화면은 쓸 수 있다(점진 향상).
 *  - [data-bd-size]   : 쪽당 개수를 바꾸면 검색 폼을 바로 보낸다(없으면 [검색] 단추로 함께 보낸다)
 *  - [data-bd-expand] : FAQ 「모두 펼치기 / 모두 접기」
 *  - [data-bd-photo]  : 갤러리 상세 대표 그림 넘기기 · 작은 그림 고르기 · 1 / N · 확대 보기 주소
 */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function bindSize() {
    document.querySelectorAll('[data-bd-size]').forEach(function (select) {
      select.addEventListener('change', function () {
        if (select.form) {
          select.form.submit();
        }
      });
    });
  }

  function bindExpand() {
    document.querySelectorAll('[data-bd-expand]').forEach(function (button) {
      var list = document.getElementById(button.getAttribute('aria-controls'));
      if (!list) {
        return;
      }
      var label = button.querySelector('[data-bd-expand-label]') || button;
      function items() {
        return Array.prototype.slice.call(list.querySelectorAll('details'));
      }
      function sync() {
        var all = items();
        var open = all.length > 0 && all.every(function (d) { return d.open; });
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        label.textContent = open ? '모두 접기' : '모두 펼치기';
      }
      button.addEventListener('click', function () {
        var open = button.getAttribute('aria-expanded') !== 'true';
        items().forEach(function (d) { d.open = open; });
        sync();
      });
      list.addEventListener('toggle', sync, true);
      sync();
    });
  }

  function bindPhoto() {
    document.querySelectorAll('[data-bd-photo]').forEach(function (root) {
      var main = root.querySelector('[data-bd-photo-main]');
      var count = root.querySelector('[data-bd-photo-count]');
      var zoom = root.querySelector('[data-bd-photo-zoom]');
      var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-bd-photo-thumb]'));
      if (!main || thumbs.length === 0) {
        return;
      }
      var index = 0;
      function show(next) {
        index = (next + thumbs.length) % thumbs.length;
        var t = thumbs[index];
        main.src = t.getAttribute('data-src');
        main.alt = t.getAttribute('data-alt') || '';
        if (zoom) {
          zoom.href = t.getAttribute('data-src');
        }
        if (count) {
          count.textContent = (index + 1) + ' / ' + thumbs.length;
        }
        thumbs.forEach(function (b, i) {
          b.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
      }
      thumbs.forEach(function (b, i) {
        b.addEventListener('click', function () { show(i); });
      });
      var prev = root.querySelector('[data-bd-photo-prev]');
      var next = root.querySelector('[data-bd-photo-next]');
      if (prev) {
        prev.addEventListener('click', function () { show(index - 1); });
      }
      if (next) {
        next.addEventListener('click', function () { show(index + 1); });
      }
      root.addEventListener('keydown', function (e) {
        if (e.target.closest('input, textarea, select')) {
          return;
        }
        if (e.key === 'ArrowLeft') {
          show(index - 1);
        } else if (e.key === 'ArrowRight') {
          show(index + 1);
        }
      });
    });
  }

  onReady(function () {
    bindSize();
    bindExpand();
    bindPhoto();
  });
}());
