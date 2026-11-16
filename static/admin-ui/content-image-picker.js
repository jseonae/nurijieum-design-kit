/**
 * 콘텐츠 편집기 「이미지 삽입」 창(docs/images.md) — images 폴더에서 그림을 고르거나 그 자리에서 바로 올려 본문에 넣는다.
 *  - 폴더 · 격자 · 올리기는 image-explorer.js(mode=pick — 퍼블리싱 .imgmodal 모양). 처음 여는 폴더 = 이 콘텐츠의 /images/{사이트코드}/{1차메뉴코드}/
 *    (수정 화면은 서버에 물어보고, 등록 화면은 사이트 폴더).
 *  - 대체 텍스트는 필수 — 비우고 [삽입]을 누르면 칸 아래에 알리고 넣지 않는다. 「꾸밈용 그림」을 고르면 alt="" 로 넣는다(KWCAG 적절한 대체 텍스트).
 *  - 고른 그림은 창 아래 「고른 그림」 줄(썸네일 · 이름 · 크기 · 주소)에 보인다.
 *  - 넣는 주소는 공개 주소 /images/… . 위지윅(textarea.__cmsWysiwyg)이면 커서 자리에, 아니면 textarea 커서 자리에
 *    HTML/HTML_RAW 는 <img src alt>, MARKDOWN 은 ![alt](url). TEXT 형식이면 버튼을 끈다.
 *  - 미디어 서비스는 쓰지 않는다. 창 안 버튼 · 리스너는 한 번만 붙인다(열 때마다 붙이면 여러 번 들어간다).
 *
 * 마크업: [data-image-picker][data-target][data-format-target?][data-image-folder? | data-folder-url? | data-content-id?] 버튼 + #cms-imagepicker-modal
 *        (data-base · data-site-id · data-site-folder).
 */
(function () {
  'use strict';

  var modal, explorerEl, altInput, altError, decoInput, insertBtn, chosenEl, pickedBox;
  var explorer = null;
  var trigger = null;
  var picked = null;
  var folderCache = {};

  function escapeAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeMarkdown(value) {
    return String(value).replace(/[\[\]\\]/g, '\\$&');
  }

  function formatOf(btn) {
    var select = document.getElementById(btn.getAttribute('data-format-target'));
    return select ? select.value : 'HTML';
  }

  // TEXT 형식에는 그림이 나오지 않으므로 버튼을 끈다(초안이 아니어서 서버가 끈 버튼은 건드리지 않는다).
  function syncTriggerState(btn) {
    if (btn.hasAttribute('data-server-disabled')) return;
    btn.disabled = formatOf(btn) === 'TEXT';
    btn.title = btn.disabled ? 'TEXT 형식에는 그림을 넣을 수 없습니다' : (btn.getAttribute('data-picker-title') || '');
  }

  // 처음 본 버튼: 서버가 꺼 둔 버튼(발행된 버전 등)을 기억해 형식이 바뀌어도 켜지 않는다.
  function seeButton(btn) {
    if (btn.__imagePickerSeen) return;
    btn.__imagePickerSeen = true;
    if (btn.disabled) btn.setAttribute('data-server-disabled', '');
    if (btn.title) btn.setAttribute('data-picker-title', btn.title);
    syncTriggerState(btn);
  }

  function setAltError(text) {
    altError.textContent = text || '';
    altError.hidden = !text;
    if (text) {
      altInput.setAttribute('aria-invalid', 'true');
      altInput.setAttribute('aria-describedby', 'cms-imagepicker-alt-hint cms-imagepicker-alt-error');
    } else {
      altInput.removeAttribute('aria-invalid');
      altInput.setAttribute('aria-describedby', 'cms-imagepicker-alt-hint');
    }
  }

  // [삽입]은 그림을 고르면 켜진다. 대체 텍스트가 없으면 눌렀을 때 칸 아래에 알린다(insert).
  function updateInsertState() {
    if (decoInput.checked || altInput.value.trim()) setAltError('');
    insertBtn.disabled = !picked;
    chosenEl.textContent = picked ? window.cmsImageExplorer.readableUrl(picked.url) : '아직 고르지 않았습니다';
    if (pickedBox) {
      pickedBox.hidden = !picked;
      var thumb = pickedBox.querySelector('[data-imagepicker-thumb]');
      var name = pickedBox.querySelector('[data-imagepicker-name]');
      var size = pickedBox.querySelector('[data-imagepicker-size]');
      if (picked) {
        name.textContent = picked.name;
        size.textContent = picked.sizeLabel || '';
        var img = thumb.querySelector('img');
        if (!img) {
          thumb.textContent = '';
          img = document.createElement('img');
          img.alt = '';
          img.addEventListener('load', function () {
            if (img.naturalWidth) size.textContent = img.naturalWidth + '×' + img.naturalHeight + ' px' + (picked && picked.sizeLabel ? ' · ' + picked.sizeLabel : '');
          });
          thumb.appendChild(img);
        }
        img.src = picked.url;
      }
    }
  }

  /*
   * 처음 여는 폴더: 버튼의 data-image-folder(정해진 폴더, 예: 팝업 {사이트}/popup) → data-folder-url(서버에 묻기, 예: 게시판의
   * 1차 메뉴 폴더) → data-content-id(콘텐츠의 1차 메뉴 폴더) → 사이트 폴더 → common.
   */
  function startFolder(btn) {
    var siteFolder = modal.getAttribute('data-site-folder') || 'common';
    var fixed = btn.getAttribute('data-image-folder');
    if (fixed) return Promise.resolve(fixed);
    var url = btn.getAttribute('data-folder-url');
    var contentId = btn.getAttribute('data-content-id');
    if (!url && contentId) {
      url = modal.getAttribute('data-base') + '/content/' + encodeURIComponent(modal.getAttribute('data-site-id'))
        + '/' + encodeURIComponent(contentId) + '/image-folder';
    }
    if (!url) return Promise.resolve(siteFolder);
    if (folderCache[url]) return Promise.resolve(folderCache[url]);
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (body) {
        var folder = body && body.folder ? body.folder : siteFolder;
        folderCache[url] = folder;
        return folder;
      })
      .catch(function () { return siteFolder; });
  }

  function open(btn) {
    trigger = btn;
    picked = null;
    altInput.value = '';
    decoInput.checked = false;
    altInput.disabled = false;
    setAltError('');
    updateInsertState();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nv-lock');
    // 다시 열 때: 불러오는 사이 사용자가 폴더를 바꿨으면 이 콘텐츠의 폴더로 되돌리지 않는다(되돌리면 고른 폴더 목록이 사라진다)
    var openedAt = explorer ? explorer.folder() : null;
    var ready = startFolder(btn).then(function (folder) {
      if (!explorer) {
        explorer = window.cmsImageExplorer.mount(explorerEl, {
          base: modal.getAttribute('data-base'),
          siteId: modal.getAttribute('data-site-id'),
          folder: folder,
          canWrite: modal.getAttribute('data-can-write') !== 'false',
          mode: 'pick',
          layout: 'imgmodal',
          onSelect: function (file) {
            picked = file;
            if (file && !altInput.value.trim() && !decoInput.checked) {
              altInput.focus();
            }
            updateInsertState();
          }
        });
        return explorer.ready;
      }
      return explorer.reload().then(function () {
        if (explorer.folder() === openedAt && openedAt !== folder) return explorer.open(folder);
      });
    });
    setTimeout(function () { altInput.focus(); }, 30);
    return ready;
  }

  /**
   * 편집기에 붙여넣기 · 끌어 놓기한 그림 파일(content-editor.js): 그 textarea 의 「이미지 삽입」 버튼으로 창을 열고 처음 폴더에 바로 올린다.
   * 올린 그림이 골라진 채로 대체 텍스트를 기다린다. 버튼이 없거나 꺼져 있으면 false(편집기가 안내 문구를 띄운다).
   */
  function openWithFiles(textarea, files) {
    if (!modal || !textarea || !textarea.id) return false;
    var btn = document.querySelector('[data-image-picker][data-target="' + textarea.id + '"]');
    if (!btn || btn.disabled) return false;
    var named = files.map(uniqueName);
    open(btn).then(function () { return explorer && explorer.upload(named); });
    return true;
  }

  // 화면 캡처를 붙여넣으면 이름이 늘 image.png 라 두 번째부터 「같은 이름」이 된다 — 그런 이름은 붙여넣은 시각으로 바꾼다.
  var pasteSeq = 0;
  function uniqueName(file) {
    if (!/^(image|blob)?\.(png|jpe?g|gif|webp)$/i.test(file.name || '') && file.name) return file;
    var ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    pasteSeq += 1;
    try {
      return new File([file], 'paste-' + stamp + '-' + pasteSeq + '.' + ext, { type: file.type });
    } catch (e) {
      return file;
    }
  }

  function close() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nv-lock');
    if (trigger) trigger.focus();
  }

  function insert() {
    if (!picked || !trigger) return;
    if (!decoInput.checked && !altInput.value.trim()) {
      setAltError('대체 텍스트를 적거나 「꾸밈용 그림」을 고르세요.');
      altInput.focus();
      return;
    }
    var alt = decoInput.checked ? '' : altInput.value.trim();
    var target = document.getElementById(trigger.getAttribute('data-target'));
    if (!target) return;
    var format = formatOf(trigger);
    var text = format === 'MARKDOWN'
      ? '![' + escapeMarkdown(alt) + '](' + picked.url + ')'
      : '<img src="' + escapeAttr(picked.url) + '" alt="' + escapeAttr(alt) + '">';
    var wysiwyg = target.__cmsWysiwyg;
    close();
    if (wysiwyg && (format === 'HTML' || format === 'HTML_RAW')) {
      wysiwyg.insertHtml(text);
      return;
    }
    var start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
    var end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start;
    target.value = target.value.substring(0, start) + text + target.value.substring(end);
    target.selectionStart = target.selectionEnd = start + text.length;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
  }

  function focusables() {
    return Array.prototype.filter.call(
      modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; });
  }

  function init() {
    modal = document.getElementById('cms-imagepicker-modal');
    if (!modal || !window.cmsImageExplorer) return;
    explorerEl = modal.querySelector('[data-imagepicker-explorer]');
    altInput = modal.querySelector('[data-imagepicker-alt]');
    decoInput = modal.querySelector('[data-imagepicker-deco]');
    insertBtn = modal.querySelector('[data-imagepicker-insert]');
    chosenEl = modal.querySelector('[data-imagepicker-chosen]');
    altError = modal.querySelector('[data-imagepicker-alt-error]');
    pickedBox = modal.querySelector('[data-imagepicker-picked]');

    // 버튼은 문서 단위로 위임한다 — 게시글 수정 패널처럼 나중에 주입되는 편집기의 버튼도 같은 창을 쓴다.
    document.querySelectorAll('[data-image-picker]').forEach(seeButton);
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-image-picker]');
      if (!btn) return;
      seeButton(btn);
      if (!btn.disabled) open(btn);
    });
    document.addEventListener('change', function (e) {
      if (!e.target.id) return;
      document.querySelectorAll('[data-image-picker][data-format-target="' + e.target.id + '"]').forEach(function (btn) {
        seeButton(btn);
        syncTriggerState(btn);
      });
    });
    modal.querySelectorAll('[data-imagepicker-close]').forEach(function (b) { b.addEventListener('click', close); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    altInput.addEventListener('input', updateInsertState);
    decoInput.addEventListener('change', function () {
      altInput.disabled = decoInput.checked;
      updateInsertState();
    });
    altInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (!insertBtn.disabled) insert(); }
    });
    insertBtn.addEventListener('click', insert);
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  window.cmsImagePicker = { openWithFiles: openWithFiles };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
