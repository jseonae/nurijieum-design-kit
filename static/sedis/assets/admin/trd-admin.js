/*
 * 특수교육 현황 관리자(adm_1101·1102·1201·1202) 화면 스크립트 — 누리지음 콘솔 안 조각에서 돈다(연결 서비스 계약 v1 §4).
 *  - API 기준: 조각 루트 data-api(문맥 apiBase), 없으면 <meta name="cms-svc-api">. CSRF: <meta name="_csrf">(헤더 X-CSRF-Token).
 *  - adm_1102 공표 계 저장: PUT {api}/trd/published-sums · adm_1201 설명·출처 저장: PUT {api}/trd/phrases/{분기 ID}
 *  - 저장 뒤 다시 읽어(값·※ 표시가 바뀜) 완료 안내를 보인다. 오류 본문 {code, message, errors:[{field, message}]}, 값은 textContent 로만.
 *  - adm_1201 미리보기: 설명·출처 칸을 고치면 미리보기(사용자 화면 조각 cms/trd/status :: result)의 설명 줄·출처 문장이 바로 바뀐다.
 *    adm_1202 의 동작은 admin/trd-preview.js.
 *  - adm_1001 원본: 새 파일 올리기 POST {api}/trd/sources(multipart) · 반영 POST {api}/trd/sources/{id}/apply · 취소 DELETE {api}/trd/sources/{id}.
 */
(function () {
  'use strict';

  var FLASH_KEY = 'sd-trd-flash';
  var FLASH_ERR_KEY = 'sd-trd-flash-err';

  function meta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? (m.getAttribute('content') || '') : '';
  }

  function send(root, method, path, body) {
    var headers = { 'Accept': 'application/json' };
    if (body !== undefined && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; }
    var token = meta('_csrf');
    if (token) { headers[meta('_csrf_header') || 'X-CSRF-Token'] = token; }
    return fetch((root.getAttribute('data-api') || meta('cms-svc-api')) + path, {
      method: method, headers: headers, credentials: 'same-origin',
      body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body))
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        return { ok: res.ok, status: res.status, data: data };
      });
    }, function () { return { ok: false, status: 0, data: null }; });
  }

  function alertBox(root, kind, message) {
    var box = root.querySelector(kind === 'ok' ? '[data-trd-ok]' : '[data-trd-error]');
    var other = root.querySelector(kind === 'ok' ? '[data-trd-error]' : '[data-trd-ok]');
    if (other) { other.hidden = true; }
    if (!box) { return; }
    box.textContent = message || '';
    box.hidden = !message;
    if (message) { box.setAttribute('tabindex', '-1'); box.focus(); }
  }

  function clearErrors(form) {
    form.querySelectorAll('[data-error-slot]').forEach(function (el) { el.textContent = ''; el.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  // 필드 오류: 칸 옆 안내(data-error-slot) + 입력 칸 aria-invalid. 공표 계 칸은 data-error-for, 그 밖은 name 으로 찾는다
  function showErrors(form, errors) {
    var first = null;
    (errors || []).forEach(function (err) {
      var slot = form.querySelector('[data-error-slot="' + err.field + '"]');
      var input = form.querySelector('[data-error-for="' + err.field + '"]') || form.querySelector('[name="' + err.field + '"]');
      if (!input && /^sums\[(\d+)]\.(\w+)$/.test(err.field)) {
        var m = err.field.match(/^sums\[(\d+)]\.(\w+)$/);
        var row = form.querySelectorAll('[data-trd-sum-row]')[Number(m[1])];
        input = row ? row.querySelector('[name="' + m[2] + '"]') : null;
      }
      if (slot) { slot.textContent = err.message; slot.hidden = false; }
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (slot && slot.id) { input.setAttribute('aria-describedby', slot.id); }
        if (!first) { first = input; }
      }
    });
    return first;
  }

  function fail(root, form, result) {
    var msg = result.data && result.data.message ? result.data.message
      : (result.status === 0 ? '서버에 닿지 않습니다. 잠시 뒤 다시 시도하세요.' : '저장하지 못했습니다(' + result.status + ').');
    alertBox(root, 'err', msg);
    var first = showErrors(form, result.data && result.data.errors);
    if (first) { first.focus(); }
  }

  // 성공일 때만 — 다시 읽은 뒤 완료 안내(nv-alert--ok, role=status)
  function done(message) {
    reloadWith(FLASH_KEY, message);
  }

  // 서버는 받았지만 결과가 오류일 때(올린 파일 읽기 오류) — 다시 읽은 뒤 오류 알림(nv-alert--err, role=alert)
  function doneWithError(message) {
    reloadWith(FLASH_ERR_KEY, message);
  }

  function reloadWith(key, message) {
    try { sessionStorage.setItem(key, message); } catch (e) { /* 저장소 없음 — 안내 없이 다시 읽기 */ }
    window.location.reload();
  }

  function takeFlash(key) {
    try { var msg = sessionStorage.getItem(key); sessionStorage.removeItem(key); return msg; } catch (e) { return null; }
  }

  function showFlash(root) {
    var err = takeFlash(FLASH_ERR_KEY);
    var msg = takeFlash(FLASH_KEY);
    if (err) { alertBox(root, 'err', err); } else if (msg) { alertBox(root, 'ok', msg); }
  }

  // 증가율 표시 — 설계서 adm_1102-04 는 선택 상자(표시 Y · 미표시 N)
  function growth(el) {
    return el.tagName === 'SELECT' ? el.value === 'Y' : el.checked;
  }

  // adm_1102-04 공표 계
  function initSums(root) {
    var form = root.querySelector('[data-trd-sums]');
    if (!form) { return; }
    form.querySelectorAll('[data-trd-sum-row]').forEach(function (row) {
      var count = row.querySelector('[name="count"]');
      var na = row.querySelector('[name="uncounted"]');
      var sync = function () { count.disabled = na.checked; if (na.checked) { count.value = ''; } };
      na.addEventListener('change', sync);
      sync();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      var sums = Array.prototype.map.call(form.querySelectorAll('[data-trd-sum-row]'), function (row) {
        return {
          year: row.getAttribute('data-year'),
          count: row.querySelector('[name="count"]').value,
          uncounted: row.querySelector('[name="uncounted"]').checked,
          source: row.querySelector('[name="source"]').value,
          note: row.querySelector('[name="note"]').value,
          growthShown: growth(row.querySelector('[name="growthShown"]'))
        };
      });
      send(root, 'PUT', '/trd/published-sums', { sums: sums }).then(function (r) {
        if (r.ok) { done('공표 계를 저장했습니다. 사용자 화면에 바로 반영됩니다.'); } else { fail(root, form, r); }
      });
    });
  }

  // adm_1201 설명·출처 + 입력 중 미리보기
  function lines(el, text) {
    el.textContent = '';
    String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (line, i) {
      if (i > 0) { el.appendChild(document.createElement('br')); }
      el.appendChild(document.createTextNode(line));
    });
  }

  function initPhrases(root) {
    var form = root.querySelector('[data-trd-phrases]');
    if (!form) { return; }
    var desc = form.querySelector('[name="description"]');
    var src = form.querySelector('[name="source"]');
    // 미리보기(cms/trd/status :: result)의 설명 줄·출처 문장. 설명은 카드 머리(<strong data-es-head>) 뒤에 오고, 출처 상자(.cm-es-source)는 비면 숨긴다
    var liveDesc = root.querySelector('[data-trd-live-desc]');
    var head = root.querySelector('[data-es-head]');
    var liveSrc = root.querySelector('[data-trd-live-src]');
    var srcBox = liveSrc ? liveSrc.closest('.cm-es-source') : null;
    var range = root.getAttribute('data-year-range') || '';
    var render = function () {
      if (liveDesc) {
        lines(liveDesc, desc.value);
        // 카드 머리가 있으면 첫 설명 줄도 머리 아래로(서버 렌더와 같게), 머리가 없으면 첫 줄은 그대로
        if (head && liveDesc.firstChild) { liveDesc.insertBefore(document.createElement('br'), liveDesc.firstChild); }
      }
      if (liveSrc) {
        // 사용자 화면과 같은 규칙(TrdStatusView.sourceLines) — 앞 줄은 잇고 마지막 줄만 아래로
        var all = src.value.split('{연도범위}').join(range).trim().split(/\s*\n\s*/);
        lines(liveSrc, all.length < 3 ? all.join('\n') : all.slice(0, -1).join(' ') + '\n' + all[all.length - 1]);
      }
      if (srcBox) { srcBox.hidden = !src.value.trim(); }
    };
    desc.addEventListener('input', render);
    src.addEventListener('input', render);
    render();
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      send(root, 'PUT', '/trd/phrases/' + encodeURIComponent(root.getAttribute('data-branch')),
        { description: desc.value, source: src.value }).then(function (r) {
        if (r.ok) { done('설명·출처를 저장했습니다. 사용자 화면에 바로 반영됩니다.'); } else { fail(root, form, r); }
      });
    });
  }

  // adm_1001 새 파일 올리기 — multipart(file·kind). Content-Type 은 브라우저가 boundary 와 함께 정한다
  function initUpload(root) {
    root.querySelectorAll('form[data-trd-upload]').forEach(function (form) {
      // 설계서 adm_1001-02 「작업」 칸: 「새 파일 올리기」 버튼이 숨은 파일 칸을 열고, 고르면 바로 올린다(JS 없으면 파일 칸 + 「올리기」)
      var pick = form.querySelector('[data-trd-upload-pick]');
      var file = form.querySelector('[data-trd-upload-file]');
      var submit = form.querySelector('[data-trd-upload-submit]');
      if (pick && file) {
        pick.hidden = false;
        file.hidden = true;
        if (submit) { submit.hidden = true; submit.style.display = 'none'; }   // .nv-btn 의 display 가 hidden 을 덮는다
        pick.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () {
          if (file.files && file.files.length) { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
        });
      }
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var input = form.querySelector('input[type="file"]');
        if (!input.files || !input.files.length) {
          alertBox(root, 'err', '올릴 파일을 선택해 주세요');
          (pick && !pick.hidden ? pick : input).focus();
          return;
        }
        var fd = new FormData();
        fd.append('kind', form.getAttribute('data-kind'));
        fd.append('file', input.files[0], input.files[0].name);
        var button = pick && !pick.hidden ? pick : form.querySelector('button[type="submit"]');
        button.disabled = true;
        send(root, 'POST', '/trd/sources', fd).then(function (r) {
          button.disabled = false;
          if (r.ok) {
            if (r.data && r.data.ok) {
              done('파일을 올렸습니다. 아래 「올린 파일 확인」을 본 뒤 반영하세요.');
            } else {
              doneWithError('올린 파일에 읽기 오류가 있어 반영할 수 없습니다. 아래 오류를 확인하고 고친 파일을 다시 올리세요.');
            }
          } else {
            alertBox(root, 'err', r.data && r.data.message ? r.data.message : '파일을 올리지 못했습니다(' + r.status + ').');
          }
        });
      });
    });
  }

  // adm_1001-05·06 새 연도 공표 계 · 취소 · 반영(빠진 연도·두 원본 연도 범위 차이면 확인 창)
  function initChecks(root) {
    root.querySelectorAll('[data-trd-check]').forEach(function (box) {
      var id = box.getAttribute('data-trd-check');
      box.querySelectorAll('[data-trd-newsum]').forEach(function (row) {
        var count = row.querySelector('[name="count"]');
        var na = row.querySelector('[name="uncounted"]');
        na.addEventListener('change', function () { count.disabled = na.checked; if (na.checked) { count.value = ''; } });
      });
      var cancel = box.querySelector('[data-trd-cancel]');
      if (cancel) {
        cancel.addEventListener('click', function () {
          send(root, 'DELETE', '/trd/sources/' + encodeURIComponent(id)).then(function (r) {
            if (r.ok) { done('올린 파일을 취소했습니다.'); } else { fail(root, box, r); }
          });
        });
      }
      var apply = box.querySelector('[data-trd-apply]');
      if (!apply) { return; }
      apply.addEventListener('click', function () {
        clearErrors(box);
        var sums = Array.prototype.map.call(box.querySelectorAll('[data-trd-newsum]'), function (row) {
          return {
            year: row.getAttribute('data-year'),
            count: row.querySelector('[name="count"]').value,
            uncounted: row.querySelector('[name="uncounted"]').checked,
            source: row.querySelector('[name="source"]').value
          };
        });
        // 서버가 공표 계·출처를 먼저 검사하고, 그다음 빠진 연도·범위 차이면 409(field confirm) — 그때만 확인 창을 띄워 confirm: true 로 다시 보낸다
        var post = function (confirm) {
          apply.disabled = true;
          send(root, 'POST', '/trd/sources/' + encodeURIComponent(id) + '/apply', { sums: sums, confirm: confirm }).then(function (r) {
            apply.disabled = false;
            if (r.ok) { done('반영했습니다. 통계표 통합·그래프·사용자 화면이 새 원본 기준으로 바뀌었습니다.'); return; }
            var askConfirm = !confirm && r.status === 409 && r.data && (r.data.errors || []).some(function (e) { return e.field === 'confirm'; });
            if (askConfirm) {
              if (window.confirm('빠진 연도 또는 두 원본의 연도 범위 차이가 있습니다. 그대로 반영할까요?')) { post(true); }
              return;
            }
            fail(root, box, r);
          });
        };
        post(false);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-sedis-screen^="trd-"]').forEach(function (root) {
      showFlash(root);
      initSums(root);
      initPhrases(root);
      initUpload(root);
      initChecks(root);
    });
  });
})();
