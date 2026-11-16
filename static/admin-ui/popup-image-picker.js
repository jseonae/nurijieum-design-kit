/*
 * popup-image-picker.js — 팝업 다중 이미지 첨부 + 대표 지정 + 실시간 미리보기.
 *
 *  - [data-popup-media-picker] 버튼 → 이미지 창(cms-popup-mediapicker-modal) 열기 → 이미지 폴더 탐색기(image-explorer.js, pick)를
 *    {사이트 폴더}/popup 에서 연다(docs/images.md — 미디어 서비스는 쓰지 않는다). 그 자리에서 올리면 바로 골라진다.
 *  - 그림을 고르면 대상 폼(data-target-form)의 썸네일 스트립에 공개 주소(/images/…)로 추가하고 창을 닫는다.
 *  - 대표로/삭제 버튼(이벤트 위임) → 순서·뱃지·hidden input·미리보기 동기화
 *  - 그림별 대체 텍스트: 썸네일 줄 아래 「그림 N 대체 텍스트」 칸(순서 = 썸네일 순서, 300자, 비우면 공개 화면은 팝업 제목).
 *    값은 썸네일 li 의 data-alt 에 둔다.
 *  - hidden input: name="imageUrls"(다중, 순서대로) + name="imageUrl"(첫=대표) + name="imagesJson"([{url, alt}] 하나 —
 *    대체 텍스트를 이름 반복으로 보내면 값이 하나일 때 서버가 쉼표로 쪼갠다)
 *  - 미리보기: 폼의 data-preview-prefix 로 {prefix}-img/-placeholder/-title/-link 갱신
 *  - ESC / 오버레이 클릭 닫기 + 트리거로 포커스 복원
 *  content-image-picker.js(본문 이미지 삽입)와는 모달 id·data 속성이 달라 충돌하지 않는다.
 */
(function () {
  'use strict';

  var modal, explorerEl, closeBtn, lastTrigger, currentFormId;
  var explorer = null;

  function init() {
    modal = document.getElementById('cms-popup-mediapicker-modal');
    if (modal) {
      explorerEl = modal.querySelector('[data-popup-explorer]');
      closeBtn = modal.querySelector('.cms-admin-mediapicker__close');
      if (closeBtn) { closeBtn.addEventListener('click', closeModal); }
      modal.addEventListener('click', function (e) { if (e.target === modal) { closeModal(); } });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') { closeModal(); }
      });
    }

    // 피커 열기 위임
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-popup-media-picker]');
      if (!btn) { return; }
      e.preventDefault();
      if (!modal) { return; }
      lastTrigger = btn;
      currentFormId = btn.getAttribute('data-target-form');
      openModal();
    });

    // 대표로 / 삭제 위임
    document.addEventListener('click', function (e) {
      var repBtn = e.target.closest('.cms-admin-popup-image-strip__rep-btn');
      if (repBtn) {
        e.preventDefault();
        setRepresentative(repBtn.closest('.cms-admin-popup-image-strip__item'));
        return;
      }
      var delBtn = e.target.closest('.cms-admin-popup-image-strip__del-btn');
      if (delBtn) {
        e.preventDefault();
        removeImage(delBtn.closest('.cms-admin-popup-image-strip__item'));
      }
    });

    // 제목/링크/대체 텍스트 입력 → hidden · 미리보기 실시간 갱신
    document.addEventListener('input', function (e) {
      var form = e.target.form;
      if (!form || !form.querySelector('.cms-admin-popup-image-strip')) { return; }
      var altFor = e.target.getAttribute && e.target.getAttribute('data-alt-for');
      if (altFor) {
        var item = form.querySelectorAll('.cms-admin-popup-image-strip__item')[Number(altFor)];
        if (item) { item.setAttribute('data-alt', e.target.value); }
        syncHiddenInputs(form);
      }
      syncPreview(form);
    });

    // 수정 폼: data-initial-images(JSON, 대체 텍스트 포함) — 없으면 data-initial-urls — 로 초기 썸네일 렌더
    document.querySelectorAll('.cms-admin-popup-image-strip[data-initial-images], .cms-admin-popup-image-strip[data-initial-urls]')
      .forEach(function (strip) {
        initialImages(strip).forEach(function (image) { appendImageToStrip(strip, image.url, image.alt); });
        var form = strip.closest('form');
        syncHiddenInputs(form);
        syncPreview(form);
      });
  }

  function initialImages(strip) {
    var json = strip.getAttribute('data-initial-images');
    if (json) {
      try {
        var list = JSON.parse(json);
        if (Array.isArray(list)) {
          return list.filter(function (it) { return it && it.url; })
            .map(function (it) { return { url: String(it.url).trim(), alt: it.alt || '' }; });
        }
      } catch (err) { /* 읽을 수 없으면 주소 목록으로 */ }
    }
    return (strip.getAttribute('data-initial-urls') || '').split(',')
      .map(function (u) { return u.trim(); }).filter(Boolean)
      .map(function (u) { return { url: u, alt: '' }; });
  }

  function openModal() {
    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('hidden');
    if (closeBtn) { setTimeout(function () { closeBtn.focus(); }, 30); }
    if (!explorerEl || !window.cmsImageExplorer) { return; }
    var folder = modal.getAttribute('data-popup-folder') || 'common';
    if (!explorer) {
      explorer = window.cmsImageExplorer.mount(explorerEl, {
        base: modal.getAttribute('data-base'),
        siteId: modal.getAttribute('data-site-id'),
        folder: folder,
        canWrite: modal.getAttribute('data-can-write') !== 'false',
        mode: 'pick',
        onSelect: function (file) {
          if (file) { appendImage(file.url, currentFormId); }
        }
      });
    } else {
      explorer.reload();
    }
  }

  function appendImage(url, formId) {
    var form = formId ? document.getElementById(formId) : null;
    var strip = form ? form.querySelector('.cms-admin-popup-image-strip') : null;
    if (!form || !strip || !url) { closeModal(); return; }
    appendImageToStrip(strip, url);
    syncHiddenInputs(form);
    syncPreview(form);
    closeModal();
  }

  function appendImageToStrip(strip, url, alt) {
    var addLi = strip.querySelector('.cms-admin-popup-image-strip__add');
    var isFirst = strip.querySelectorAll('.cms-admin-popup-image-strip__item').length === 0;
    var li = document.createElement('li');
    li.className = 'cms-admin-popup-image-strip__item' + (isFirst ? ' cms-admin-popup-image-strip__item--rep' : '');
    li.setAttribute('data-url', url);
    li.setAttribute('data-alt', alt || '');

    var img = document.createElement('img');
    img.className = 'cms-admin-popup-image-strip__img';
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    li.appendChild(img);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'cms-admin-popup-image-strip__del-btn';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', '이미지 삭제');
    li.appendChild(delBtn);

    if (addLi) { strip.insertBefore(li, addLi); } else { strip.appendChild(li); }
    rebuildBadges(strip);
  }

  function setRepresentative(li) {
    if (!li) { return; }
    var strip = li.closest('.cms-admin-popup-image-strip');
    var firstItem = strip.querySelector('.cms-admin-popup-image-strip__item');
    if (firstItem && firstItem !== li) { strip.insertBefore(li, firstItem); }
    rebuildBadges(strip);
    var form = strip.closest('form');
    syncHiddenInputs(form);
    syncPreview(form);
  }

  function removeImage(li) {
    if (!li) { return; }
    var strip = li.closest('.cms-admin-popup-image-strip');
    var form = strip.closest('form');
    li.remove();
    rebuildBadges(strip);
    syncHiddenInputs(form);
    syncPreview(form);
  }

  // 첫 항목=대표(뱃지), 나머지=대표로 버튼. idempotent 재구성.
  function rebuildBadges(strip) {
    var items = strip.querySelectorAll('.cms-admin-popup-image-strip__item');
    items.forEach(function (item, idx) {
      item.querySelectorAll('.cms-admin-popup-image-strip__badge, .cms-admin-popup-image-strip__rep-btn')
        .forEach(function (el) { el.remove(); });
      item.classList.toggle('cms-admin-popup-image-strip__item--rep', idx === 0);
      var delBtn = item.querySelector('.cms-admin-popup-image-strip__del-btn');
      if (idx === 0) {
        var badge = document.createElement('span');
        badge.className = 'cms-admin-popup-image-strip__badge';
        badge.textContent = '대표';
        badge.setAttribute('aria-label', '대표 이미지');
        item.insertBefore(badge, delBtn);
      } else {
        var repBtn = document.createElement('button');
        repBtn.type = 'button';
        repBtn.className = 'cms-admin-popup-image-strip__rep-btn';
        repBtn.textContent = '대표로';
        repBtn.setAttribute('aria-label', '이 이미지를 대표로 지정');
        item.insertBefore(repBtn, delBtn);
      }
    });
    rebuildAlts(strip);
  }

  // 그림별 대체 텍스트 칸(썸네일 줄 바로 아래 목록). 추가 · 삭제 · 대표 바꾸기 때만 다시 그린다(입력 중에는 그대로).
  function rebuildAlts(strip) {
    var list = strip.nextElementSibling;
    if (!list || !list.classList.contains('cms-admin-popup-image-alts')) {
      list = document.createElement('ol');
      list.className = 'cms-admin-popup-image-alts';
      list.setAttribute('aria-label', '그림별 대체 텍스트');
      strip.parentNode.insertBefore(list, strip.nextSibling);
    }
    list.innerHTML = '';
    var items = strip.querySelectorAll('.cms-admin-popup-image-strip__item');
    list.hidden = items.length === 0;
    items.forEach(function (item, idx) {
      var id = (strip.id || 'popup-image-strip') + '-alt-' + idx;
      var row = document.createElement('li');
      row.className = 'cms-admin-popup-image-alts__item';
      var label = document.createElement('label');
      label.className = 'cms-admin-popup-image-alts__label';
      label.setAttribute('for', id);
      label.textContent = '그림 ' + (idx + 1) + (idx === 0 ? '(대표)' : '') + ' 대체 텍스트';
      var input = document.createElement('input');
      input.type = 'text';
      input.id = id;
      input.className = 'cms-admin-popup-image-alts__input';
      input.maxLength = 300;
      input.placeholder = '비우면 팝업 제목';
      input.value = item.getAttribute('data-alt') || '';
      input.setAttribute('data-alt-for', String(idx));
      row.appendChild(label);
      row.appendChild(input);
      list.appendChild(row);
    });
  }

  function syncHiddenInputs(form) {
    if (!form) { return; }
    form.querySelectorAll('input[type="hidden"][name="imageUrls"], input[type="hidden"][name="imageUrl"], '
      + 'input[type="hidden"][name="imagesJson"]').forEach(function (el) { el.remove(); });
    var items = form.querySelectorAll('.cms-admin-popup-image-strip__item');
    var json = document.createElement('input');
    json.type = 'hidden';
    json.name = 'imagesJson';
    json.value = JSON.stringify(Array.prototype.map.call(items, function (item) {
      return { url: item.getAttribute('data-url') || '', alt: (item.getAttribute('data-alt') || '').trim() };
    }));
    form.appendChild(json);
    items.forEach(function (item, idx) {
      var url = item.getAttribute('data-url') || '';
      var inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = 'imageUrls';
      inp.value = url;
      form.appendChild(inp);
      if (idx === 0) {
        var rep = document.createElement('input');
        rep.type = 'hidden';
        rep.name = 'imageUrl';
        rep.value = url;
        form.appendChild(rep);
      }
    });
  }

  function syncPreview(form) {
    if (!form) { return; }
    var prefix = form.getAttribute('data-preview-prefix');
    if (!prefix) { return; }
    var titleEl = form.querySelector('[name="title"]');
    var linkEl = form.querySelector('[name="linkUrl"]');
    var firstItem = form.querySelector('.cms-admin-popup-image-strip__item');
    var previewImg = document.getElementById(prefix + '-img');
    var placeholder = document.getElementById(prefix + '-placeholder');
    var previewTitle = document.getElementById(prefix + '-title');
    var previewLink = document.getElementById(prefix + '-link');

    if (previewTitle) { previewTitle.textContent = (titleEl && titleEl.value) ? titleEl.value : '—'; }
    if (previewLink) {
      var link = linkEl ? (linkEl.value || '').trim() : '';
      previewLink.href = link || '#';
      previewLink.hidden = !link;
    }
    if (previewImg && placeholder) {
      var url = firstItem ? (firstItem.getAttribute('data-url') || '') : '';
      var alt = firstItem ? (firstItem.getAttribute('data-alt') || '').trim() : '';
      previewImg.alt = alt || ((titleEl && titleEl.value) ? titleEl.value : '');
      if (url) { previewImg.src = url; previewImg.hidden = false; placeholder.hidden = true; }
      else { previewImg.removeAttribute('src'); previewImg.hidden = true; placeholder.hidden = false; }
    }
  }

  function closeModal() {
    if (!modal) { return; }
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('hidden', '');
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
