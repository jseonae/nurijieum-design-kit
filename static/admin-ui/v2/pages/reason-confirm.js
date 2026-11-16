/* 사유를 받는 확인 창: form[data-reason-confirm="문구"] — 제출 때 확인 창에 사유 칸을 함께 보이고, 2자 이상 적어야 보낸다.
 * 폼에 hidden name="reason" 이 있어야 한다. 제목 = data-reason-title, 단추 글자 = data-reason-verb, 위험 동작 = data-reason-danger. 서버도 사유를 다시 검사한다(SaveReason). */
(function () {
  'use strict';
  var MIN = 2;
  var seq = 0;
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/"/g, '&quot;'); }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches || !form.matches('form[data-reason-confirm]')) { return; }
    if (form.__reasonDone) { form.__reasonDone = false; return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    var submitter = e.submitter;
    var id = 'reason-confirm-' + (++seq);
    window.setTimeout(function () { var field = document.getElementById(id); if (field) { field.focus(); } }, 50);
    window.nvConfirm({
      title: form.getAttribute('data-reason-title') || '',
      html: '<p>' + esc(form.getAttribute('data-reason-confirm')) + '</p><div class="nv-field"><label class="nv-field__label" for="' + id + '">사유 <span class="req" aria-hidden="true">*</span></label>'
        + '<input class="nv-input" id="' + id + '" type="text" minlength="' + MIN + '" maxlength="500" autocomplete="off" placeholder="왜 하는지 적어 주세요."></div>',
      verb: form.getAttribute('data-reason-verb') || '',
      danger: form.hasAttribute('data-reason-danger')
    }).then(function (yes) {
      var input = document.getElementById(id);
      var reason = input ? input.value.trim() : '';
      if (!yes) { return; }
      if (reason.length < MIN) {
        if (window.nvToast) { window.nvToast('사유를 ' + MIN + '자 이상 적어 주세요.'); }
        return;
      }
      form.querySelector('input[name="reason"]').value = reason;
      form.__reasonDone = true;
      if (form.requestSubmit) { form.requestSubmit(submitter && submitter.form === form ? submitter : undefined); } else { form.submit(); }
    });
  }, true);
})();
