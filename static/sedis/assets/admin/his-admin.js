(function () {
  'use strict';
  function api(root) { return (root.getAttribute('data-api') || '').replace(/\/$/, ''); }
  function csrf() { var m = document.querySelector('meta[name="_csrf"]'); return m ? m.content : ''; }
  function message(root, kind, text) {
    var ok = root.querySelector('[data-his-ok]'), err = root.querySelector('[data-his-error]');
    if (ok) { ok.hidden = kind !== 'ok'; ok.textContent = kind === 'ok' ? text : ''; }
    if (err) { err.hidden = kind !== 'err'; err.textContent = kind === 'err' ? text : ''; }
  }
  function send(root, method, path, body) {
    var headers = { Accept: 'application/json' }, token = csrf();
    if (token) { headers['X-CSRF-Token'] = token; }
    var options = { method: method, headers: headers, credentials: 'same-origin' };
    if (body instanceof FormData) { options.body = body; }
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    return fetch(api(root) + path, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) { return { ok: response.ok, status: response.status, data: data }; });
    });
  }
  // 검증 결과는 ?uploaded={파일 ID} 로 부를 때만 나온다 — 업로드 직후에만 붙이고, 취소·반영 뒤에는 뗀다
  function reload(text, uploadedId) {
    sessionStorage.setItem('sedis-his-flash', text);
    location.href = location.pathname + (uploadedId ? '?uploaded=' + encodeURIComponent(uploadedId) : '');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-sedis-screen="his-imports"]');
    if (!root) { return; }
    var flash = sessionStorage.getItem('sedis-his-flash');
    if (flash) { sessionStorage.removeItem('sedis-his-flash'); message(root, 'ok', flash); }
    var form = root.querySelector('[data-his-upload]');
    var input = form.querySelector('[name="file"]'), drop = form.querySelector('[data-his-drop]');
    var dropText = form.querySelector('[data-his-drop-text]'), idleText = dropText.textContent, busy = false;
    function upload(file) {
      if (busy || !file) { return; }
      if (!/\.xlsx$/i.test(file.name)) { message(root, 'err', 'XLSX 파일만 올릴 수 있습니다'); return; }
      var data = new FormData(); data.append('file', file, file.name);
      busy = true; drop.classList.add('is-busy'); dropText.textContent = file.name + ' 검증 중…'; message(root, '', '');
      send(root, 'POST', '/history/imports', data).then(function (result) {
        if (result.ok) { reload(result.data.ok ? '파일을 검증했습니다. 변경 내용을 확인한 뒤 반영하세요.' : '파일에 오류가 있습니다. 검증 결과를 확인하세요.', result.data.id); return; }
        busy = false; drop.classList.remove('is-busy'); dropText.textContent = idleText;
        message(root, 'err', result.data.message || '파일을 검증하지 못했습니다.');
      }, function () {
        busy = false; drop.classList.remove('is-busy'); dropText.textContent = idleText;
        message(root, 'err', '파일을 검증하지 못했습니다.');
      });
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    input.addEventListener('change', function () { var f = input.files && input.files[0]; input.value = ''; upload(f); });
    ['dragenter', 'dragover'].forEach(function (t) {
      drop.addEventListener(t, function (event) { event.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      drop.addEventListener(t, function () { drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (event) {
      event.preventDefault();
      var list = event.dataTransfer && event.dataTransfer.files;
      if (list && list.length > 1) { message(root, 'err', '파일은 하나만 올릴 수 있습니다'); return; }
      upload(list && list[0]);
    });
    // 취소·반영하기는 편집 머리에, 확인 대기 파일 번호·확인 체크는 검증 결과 카드에 있다
    var box = root.querySelector('[data-his-preview]');
    var id = box && box.getAttribute('data-his-preview'), snapshot = box && box.getAttribute('data-snapshot');
    if (!id) { return; }
    var cancel = root.querySelector('button[data-his-cancel]');
    if (cancel) {
      cancel.addEventListener('click', function () {
        if (!window.confirm('확인 대기 파일을 취소할까요?')) { return; }
        send(root, 'DELETE', '/history/imports/' + encodeURIComponent(id)).then(function (result) {
          if (result.ok) { reload('확인 대기 파일을 취소했습니다.'); } else { message(root, 'err', result.data.message || '취소하지 못했습니다.'); }
        });
      });
    }
    var apply = root.querySelector('[data-his-apply]');
    if (!apply || apply.disabled) { return; }
    apply.addEventListener('click', function () {
      var confirmBox = box.querySelector('[data-his-confirm]');
      if (confirmBox && !confirmBox.checked) { message(root, 'err', '삭제 또는 공개 상태 변경 영향을 확인해 주세요.'); confirmBox.focus(); return; }
      apply.disabled = true;
      send(root, 'POST', '/history/imports/' + encodeURIComponent(id) + '/apply', {
        snapshot: snapshot, confirmDestructive: !!confirmBox
      }).then(function (result) {
        apply.disabled = false;
        if (result.ok) { reload('조사 변천사 데이터를 반영했습니다. 사용자 화면에도 바로 적용됩니다.'); }
        else { message(root, 'err', result.data.message || '반영하지 못했습니다.'); }
      });
    });
  });
})();
