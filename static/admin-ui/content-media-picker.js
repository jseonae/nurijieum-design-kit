/**
 * P0-③ 본문 미디어 삽입 — 미디어 피커 JS (vanilla, no framework)
 *
 * 요구사항:
 *  - "이미지 삽입" 버튼 → 모달 열기 → GET /media-picker?siteId=... → 그리드 렌더
 *  - 아이템 클릭 → 대상 textarea에 커서 위치(또는 선택 영역)에 삽입
 *  - 형식 select 값에 따라 MARKDOWN(`![name](url)`) / 그 외(`<img src="url" alt="name">`)
 *  - ESC · 오버레이 클릭으로 닫기, 닫힐 때 트리거 버튼으로 포커스 복원
 *  - 에러·빈 목록 처리
 *
 * E2 — 삽입 형식 확인:
 *  insertMedia()는 data-format-target 셀렉트 값을 읽어 MARKDOWN이면
 *  `![name](url)`, 그 외(HTML/TEXT)이면 `<img src="url" alt="name">`를 삽입.
 *  content-management.html의 버전 편집 폼은 fmt-{versionId} select를 data-format-target으로
 *  연결하므로 형식 선택이 올바르게 반영됩니다.
 *
 * E2 — 소유자 정보:
 *  /media-picker JSON 응답 항목에 ownerType·ownerId·usageType 필드가 있으면
 *  그리드 카드에 배지로 표시합니다(없으면 숨김). 새 백엔드 호출은 없습니다.
 */
(function () {
  'use strict';

  var modal = null;
  var grid = null;
  var closeBtn = null;
  var lastTrigger = null;
  var currentTargetId = null;
  var currentFormatId = null;

  function init() {
    modal = document.getElementById('cms-mediapicker-modal');
    if (!modal) return;

    grid = modal.querySelector('.cms-admin-mediapicker__grid');
    closeBtn = modal.querySelector('.cms-admin-mediapicker__close');

    // 닫기 버튼
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    // 오버레이 클릭 닫기
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // ESC 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });

    // "이미지 삽입" 버튼 위임
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-media-picker]');
      if (!btn) return;
      lastTrigger = btn;
      currentTargetId = btn.getAttribute('data-target');
      currentFormatId = btn.getAttribute('data-format-target');
      openModal(btn);
    });
  }

  function openModal(btn) {
    if (!modal) return;

    var adminBase = modal.getAttribute('data-admin-base') || '';
    var siteId = modal.getAttribute('data-site-id') || '';

    // 로딩 상태
    if (grid) {
      grid.innerHTML = '<p class="cms-admin-mediapicker__loading">미디어를 불러오는 중...</p>';
    }

    modal.setAttribute('aria-hidden', 'false');
    modal.removeAttribute('hidden');

    // 첫 번째 포커스 가능 요소로 포커스
    var focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      setTimeout(function () { focusable.focus(); }, 50);
    }

    // 미디어 목록 fetch
    var url = adminBase + '/media-picker?siteId=' + encodeURIComponent(siteId);
    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (items) {
        renderGrid(items);
      })
      .catch(function () {
        if (grid) {
          grid.innerHTML = '<p class="cms-admin-mediapicker__empty cms-admin-mediapicker__empty--error">미디어를 불러올 수 없습니다. 잠시 후 다시 시도하세요.</p>';
        }
      });
  }

  function renderGrid(items) {
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = '<p class="cms-admin-mediapicker__empty">등록된 미디어가 없습니다.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var safeName = escapeHtml(item.name || item.mediaId);
      var safeUrl = escapeHtml(item.url);
      var safeKind = escapeHtml(item.kind);
      var safeSize = escapeHtml(item.sizeText || '');

      var thumbHtml;
      if (item.kind === 'image') {
        thumbHtml = '<img src="' + safeUrl + '" alt="" loading="lazy" class="cms-admin-mediapicker__thumb-img">';
      } else {
        thumbHtml = '<span class="cms-admin-mediapicker__kind-label" aria-hidden="true">' + safeKind.toUpperCase() + '</span>';
      }

      // E2: 소유자 정보 배지 — ownerType·ownerId·usageType이 있을 때만 표시
      var ownerBadge = '';
      if (item.ownerType || item.ownerId || item.usageType) {
        var ownerParts = [];
        if (item.ownerType) { ownerParts.push(escapeHtml(item.ownerType)); }
        if (item.ownerId)   { ownerParts.push(escapeHtml(item.ownerId)); }
        if (item.usageType) { ownerParts.push(escapeHtml(item.usageType)); }
        ownerBadge = ' <span class="cms-admin-mediapicker__owner-badge cms-admin-pill" title="소유자 정보">'
          + ownerParts.join(' · ') + '</span>';
      }

      html += '<button type="button" class="cms-admin-mediapicker__item"'
        + ' data-media-url="' + safeUrl + '"'
        + ' data-media-name="' + safeName + '"'
        + ' title="' + safeName + ' (' + safeSize + ')"'
        + '>'
        + '<span class="cms-admin-mediapicker__thumb">' + thumbHtml + '</span>'
        + '<span class="cms-admin-mediapicker__item-name">' + safeName + '</span>'
        + '<span class="cms-admin-mediapicker__item-meta">' + safeSize + ownerBadge + '</span>'
        + '</button>';
    }
    grid.innerHTML = html;

    // 아이템 클릭 핸들러
    grid.addEventListener('click', function (e) {
      var itemBtn = e.target.closest('.cms-admin-mediapicker__item');
      if (!itemBtn) return;
      var mediaUrl = itemBtn.getAttribute('data-media-url') || '';
      var mediaName = itemBtn.getAttribute('data-media-name') || '';
      insertMedia(mediaUrl, mediaName);
    });
  }

  function insertMedia(url, name) {
    var textarea = currentTargetId ? document.getElementById(currentTargetId) : null;
    var formatSel = currentFormatId ? document.getElementById(currentFormatId) : null;

    if (!textarea) {
      console.error('[media-picker] 삽입 대상 textarea를 찾을 수 없습니다. data-target="'
        + (currentTargetId || '(미지정)') + '" 에 해당하는 요소가 없습니다.');
      closeModal();
      return;
    }

    var format = formatSel ? formatSel.value : 'HTML';
    var text;
    if (format === 'MARKDOWN') {
      text = '![' + name + '](' + url + ')';
    } else {
      text = '<img src="' + url + '" alt="' + name + '">';
    }

    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var before = textarea.value.substring(0, start);
    var after = textarea.value.substring(end);
    textarea.value = before + text + after;

    // 커서를 삽입 텍스트 뒤로 이동
    var cursor = start + text.length;
    textarea.selectionStart = cursor;
    textarea.selectionEnd = cursor;

    closeModal();
    textarea.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('hidden', '');
    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
