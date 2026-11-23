/*
 * 민원 처리(묻고 답하기) — templates/admin-v2/pages/board-qna-process.html
 *  - 처리 상태 선택: 고른 상태의 안내 · 필수 입력만 보인다. 처리완료 · 일부답변은 [답변 등록]으로 바뀌므로 [상태 저장]을 숨기고
 *    답변 양식에 결과(COMPLETED · PARTIAL)와 추가 답변 예정일을 넘긴다.
 *  - 종결이면 잠김: [처리 상태 변경] → 선택을 열고 종결 해제(reopen=true)로 보낸다.
 *  - 담당자 찾기 창(메뉴 담당자와 같은 창 · 같은 명부, 이 게시판의 staff-search) — 고르면 부서지정 중이면 상태 양식에 채우고,
 *    아니면 담당자만 바로 바꾼다.
 *  - 답변 삭제: 사유를 받는 창.
 * 상태 규칙은 서버가 다시 본다(필수 입력 400 · 잠금 409 → 위 알림).
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-qna-process]');
  if (!root) { return; }

  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function openModal(box, opener) { if (window.nvAdmin) { window.nvAdmin.openModal(box, opener); } else { box.hidden = false; } }
  function closeModal(box) { if (window.nvAdmin) { window.nvAdmin.closeModal(); } else { box.hidden = true; } }

  /* ---- 처리 상태 선택 ---- */
  var statusForm = q('[data-status-form]');
  var select = q('[data-status-select]');
  var picker = q('[data-status-picker]');
  var answerForm = q('[data-answer-form]');
  var saveBtn = q('[data-status-save]');
  var dueInput = q('[data-due-input]');

  function syncStatus() {
    if (!select) { return; }
    var v = select.value;
    qa('[data-for]', statusForm).forEach(function (el) {
      var on = el.getAttribute('data-for').split(' ').indexOf(v) >= 0;
      el.hidden = !on;
      qa('input, textarea, select', el).forEach(function (f) { f.disabled = !on; });
    });
    var viaAnswer = v === 'COMPLETED' || v === 'PARTIAL';
    if (saveBtn) { saveBtn.hidden = viaAnswer && !!answerForm; }
    if (answerForm) {
      q('[data-answer-result]', answerForm).value = v === 'PARTIAL' ? 'PARTIAL' : 'COMPLETED';
      syncDue();
    }
  }
  function syncDue() {
    if (answerForm && dueInput) { q('[data-answer-due]', answerForm).value = select && select.value === 'PARTIAL' ? dueInput.value : ''; }
  }
  if (select) {
    select.addEventListener('change', syncStatus);
    syncStatus();
  }
  if (dueInput) { dueInput.addEventListener('input', syncDue); }
  if (answerForm) {
    answerForm.addEventListener('submit', function (e) {
      syncDue();
      if (select && select.value === 'PARTIAL' && dueInput && !dueInput.value) {
        e.preventDefault();
        dueInput.focus();
        dueInput.setCustomValidity('일부답변은 추가 답변 예정일이 필요합니다.');
        dueInput.reportValidity();
      }
    });
    if (dueInput) { dueInput.addEventListener('input', function () { dueInput.setCustomValidity(''); }); }
  }

  /* ---- 종결 잠금 해제 ---- */
  var unlock = q('[data-unlock]');
  if (unlock && picker) {
    unlock.addEventListener('click', function () {
      q('[data-reopen]', statusForm).value = 'true';
      picker.hidden = false;
      unlock.hidden = true;
      var note = q('[data-lock-note]', statusForm);
      if (note) { note.innerHTML = '<p>· 종결을 해제해 선택한 상태로 되돌립니다. 등록된 답변은 그대로 남고, [상태 저장]을 누르면 처리 이력에 기록됩니다.</p>'; }
      // 종결 해제 뒤 처음 고를 상태 = 처리중(시안 「처리 상태 변경」)
      if (select) { select.value = 'IN_PROGRESS'; syncStatus(); select.focus(); }
      if (saveBtn) { saveBtn.hidden = false; }
    });
  }

  /* ---- 담당자 찾기 ---- */
  var modal = q('[data-owner-find]');
  var openBtn = q('[data-staff-open]');
  var staffForm = q('[data-staff-form]');
  var searchUrl = root.getAttribute('data-staff-search');
  var PAGE = 10, page = 0, total = 0, found = [], deptsLoaded = false;
  if (modal && openBtn && searchUrl) {
    var desc = q('.findmodal__desc', modal);
    if (desc) { desc.textContent = '이 민원을 맡을 담당자(콘솔 계정이 있는 직원)를 찾아 고르세요.'; }
    var render = function () {
      q('[data-owner-find-total]', modal).innerHTML = '총 <b>' + total.toLocaleString('ko-KR') + '</b>명';
      q('[data-owner-find-rows]', modal).innerHTML = found.map(function (p, i) {
        return '<tr><td><label class="nv-radio"><input type="radio" name="owner-find-pick" value="' + esc(p.id) + '" aria-label="' + esc(p.name) + ' 고르기"></label></td>'
          + '<td><span class="findtable__no">' + (total - (page * PAGE + i)) + '</span></td>'
          + '<td>' + esc(p.org || '—') + '</td><td class="findtable__name">' + esc(p.name) + '</td><td class="nv-mono">' + esc(p.tel || '—') + '</td>'
          + '<td>' + esc(p.email || '—') + '</td><td class="nv-mono">' + esc(p.login || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="7"><div class="nv-empty nv-empty--search"><p class="nv-empty__title">찾은 담당자가 없습니다</p><p class="nv-empty__desc">검색어를 바꿔 다시 찾아 보세요.</p></div></td></tr>';
      var pages = Math.max(1, Math.ceil(total / PAGE));
      var pager = q('[data-owner-find-pager]', modal);
      pager.hidden = pages <= 1;
      var html = '<button type="button" class="pager__btn" data-find-page="' + (page - 1) + '"' + (page === 0 ? ' disabled' : '') + '>이전</button>';
      for (var n = Math.floor(page / 10) * 10; n <= Math.min(pages - 1, Math.floor(page / 10) * 10 + 9); n++) {
        html += '<button type="button" class="pager__btn" data-find-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + (n + 1) + '</button>';
      }
      html += '<button type="button" class="pager__btn" data-find-page="' + (page + 1) + '"' + (page >= pages - 1 ? ' disabled' : '') + '>다음</button>';
      pager.innerHTML = html;
      q('[data-owner-find-pick]', modal).disabled = true;
    };
    var run = function () {
      var params = 'q=' + encodeURIComponent(q('[data-owner-find-q]', modal).value.trim())
        + '&field=' + encodeURIComponent(q('[data-owner-find-field]', modal).value)
        + '&dept=' + encodeURIComponent(q('[data-owner-find-dept]', modal).value)
        + '&offset=' + (page * PAGE) + '&limit=' + PAGE;
      q('[data-owner-find-total]', modal).textContent = '찾는 중…';
      fetch(searchUrl + '?' + params, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (res) {
          found = res.items || [];
          total = res.total || 0;
          if (!deptsLoaded) {
            deptsLoaded = true;
            q('[data-owner-find-dept]', modal).innerHTML = '<option value="">부서 전체</option>' + (res.departments || []).map(function (d) {
              return '<option value="' + esc(d.id) + '">' + new Array(Math.min(Number(d.depth) || 0, 6) + 1).join('  ') + esc(d.name) + '</option>';
            }).join('');
          }
          render();
        }).catch(function () { q('[data-owner-find-total]', modal).textContent = '찾지 못했습니다. 잠시 뒤 다시 시도하세요.'; });
    };
    var fill = function (form, person) {
      qa('[data-staff-field]', form).forEach(function (f) { f.value = person[f.getAttribute('data-staff-field')] || ''; });
    };
    var show = function (person) {
      var view = q('[data-staff-view]');
      view.innerHTML = '<p><strong>' + esc(person.name) + '</strong> ' + esc(person.org || '') + '</p>'
        + '<p class="nv-text-sm nv-text-subtle">' + esc(person.tel || '') + (person.email ? ' · ' + esc(person.email) : '') + '</p>';
    };
    openBtn.addEventListener('click', function () {
      q('[data-owner-find-q]', modal).value = '';
      openModal(modal, openBtn);
      page = 0;
      run();
    });
    q('[data-owner-find-form]', modal).addEventListener('submit', function (e) { e.preventDefault(); page = 0; run(); });
    q('[data-owner-find-dept]', modal).addEventListener('change', function () { page = 0; run(); });
    qa('[data-owner-find-close]', modal).forEach(function (b) { b.addEventListener('click', function () { closeModal(modal); }); });
    modal.addEventListener('click', function (e) {
      var go = e.target.closest('[data-find-page]');
      if (go && !go.disabled) { page = Number(go.getAttribute('data-find-page')); run(); }
    });
    modal.addEventListener('change', function (e) {
      if (e.target.name === 'owner-find-pick') { q('[data-owner-find-pick]', modal).disabled = false; }
    });
    q('[data-owner-find-pick]', modal).addEventListener('click', function () {
      var picked = q('input[name="owner-find-pick"]:checked', modal);
      var person = picked && found.filter(function (p) { return p.id === picked.value; })[0];
      if (!person) { return; }
      closeModal(modal);
      show(person);
      if (select && !picker.hidden && select.value === 'ASSIGNED') {
        // 부서지정을 고른 중 — 상태 양식에 담고 [상태 저장]을 기다린다
        fill(statusForm, person);
        if (saveBtn) { saveBtn.focus(); }
      } else if (staffForm) {
        fill(staffForm, person);
        staffForm.submit();
      }
    });
  }

  /* ---- 답변 삭제(사유) ---- */
  var delModal = q('[data-answer-delete-modal]');
  if (delModal) {
    var delForm = q('[data-answer-delete-form]', delModal);
    qa('[data-answer-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        delForm.action = delForm.getAttribute('data-action-base') + encodeURIComponent(btn.getAttribute('data-answer-id')) + '/delete';
        q('textarea', delForm).value = '';
        openModal(delModal, btn);
      });
    });
  }
}());
