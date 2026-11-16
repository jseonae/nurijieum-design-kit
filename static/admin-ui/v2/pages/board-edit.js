/* 게시판 수정 화면: 저장할 때 입력 확인. 브라우저 말풍선 대신 칸 아래 오류와 토스트, 입력값은 그대로 둔다.
 * menu-edit.js 의 제출 표시(보관본 정리 · 떠날 때 묻기)가 돌기 전에 막으려고 window 단계에서 본다. */
(function () {
  'use strict';
  var REASON = '사유를 2자 이상 적으세요.';
  var NAME = '게시판명을 입력하세요.';

  function showError(input, message) {
    var id = input.id + '-err';
    var err = document.getElementById(id);
    if (!message) {
      if (err) { err.remove(); }
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      return;
    }
    if (!err) {
      err = document.createElement('span');
      err.id = id;
      err.className = 'nv-field__error';
      err.setAttribute('role', 'alert');
      input.parentNode.appendChild(err);
    }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', id);
  }
  function messageFor(input) {
    if (input.name === 'reason') { return input.value.trim().length < 2 ? REASON : ''; }
    return input.name === 'boardName' && !input.value.trim() ? NAME : '';
  }
  function check(form) {
    var inputs = form.querySelectorAll('[name="boardName"], [name="reason"]');
    var bad = [];
    inputs.forEach(function (input) {
      var message = messageFor(input);
      showError(input, message);
      if (message) { bad.push(input); }
    });
    return bad;
  }

  window.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.id !== 'info-form' && form.id !== 'perm-form') { return; }
    var bad = check(form);
    if (!bad.length) { return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    bad[0].focus();
    bad[0].scrollIntoView({ block: 'center' });
    if (window.nvToast) {
      window.nvToast(bad.some(function (input) { return input.name === 'boardName'; }) ? '입력값과 사유를 확인하세요.' : '사유를 적어야 저장합니다.');
    }
  }, true);

  /* 고치면 그 칸의 오류를 지운다 */
  document.addEventListener('input', function (e) {
    var input = e.target;
    if (input.getAttribute && input.getAttribute('aria-invalid') === 'true' && !messageFor(input)) { showError(input, ''); }
  });
})();
