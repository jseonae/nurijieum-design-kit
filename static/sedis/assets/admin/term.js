/*
 * 용어해설 관리(adm_0701·0702) 화면 스크립트 — 누리지음 콘솔 안 조각에서 돈다(연결 서비스 계약 v1 §4).
 *  - API 기준: 조각 루트의 data-api(문맥 apiBase, 예: /api/console-9f3a/v1/svc/sedis), 없으면 <meta name="cms-svc-api">.
 *  - CSRF: 콘솔 페이지 <meta name="_csrf">(헤더 이름 <meta name="_csrf_header">, 기본 X-CSRF-Token).
 *  - 저장 뒤 이동: 조각 루트의 data-list-href(문맥 mount 로 만든 목록 주소).
 *  - 오류 본문은 {code, message, errors:[{field, message}]} (dev_guide §7-2). 값은 textContent 로만 넣는다.
 */
(function () {
  'use strict';

  function meta(name) {
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? (m.getAttribute('content') || '') : '';
  }

  function apiBase(root) {
    return root.getAttribute('data-api') || meta('cms-svc-api');
  }

  function send(root, method, path, body) {
    var headers = { 'Accept': 'application/json' };
    var multipart = typeof FormData !== 'undefined' && body instanceof FormData;   // 파일은 브라우저가 경계(boundary)까지 붙여 보낸다
    if (body !== undefined && !multipart) {
      headers['Content-Type'] = 'application/json';
    }
    var token = meta('_csrf');
    if (token) {
      headers[meta('_csrf_header') || 'X-CSRF-Token'] = token;
    }
    return fetch(apiBase(root) + path, {
      method: method,
      headers: headers,
      credentials: 'same-origin',
      body: body === undefined || multipart ? body : JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function showAlert(root, message) {
    var box = root.querySelector('[data-term-error]');
    if (!box) { return; }
    box.textContent = message || '';
    box.hidden = !message;
    if (message) {
      box.setAttribute('tabindex', '-1');
      box.focus();
    }
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach(function (el) {
      el.textContent = '';
      el.hidden = true;
    });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showFieldErrors(form, errors) {
    var first = null;
    (errors || []).forEach(function (err) {
      var slot = form.querySelector('[data-error-for="' + err.field + '"]');
      var input = form.querySelector('[name="' + err.field + '"]');
      if (slot) {
        slot.textContent = err.message;
        slot.hidden = false;
      }
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!first) { first = input; }
      }
    });
    return first;
  }

  function failureMessage(result) {
    if (result.data && result.data.message) {
      return result.data.message;
    }
    if (result.status === 401 || result.status === 403) {
      return '권한이 없거나 로그인이 끝났습니다. 다시 로그인해 주세요.';
    }
    return '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function withDone(href, done) {
    return href + (href.indexOf('?') < 0 ? '?' : '&') + 'done=' + encodeURIComponent(done);
  }

  function initForm(root) {
    bindDelete(root);
    var form = root.querySelector('[data-term-form]');
    if (!form) { return; }
    var trmId = root.getAttribute('data-trm-id');
    var creating = !trmId;
    var busy = false;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var useYn = form.querySelector('[name="useYn"]');
      var ai = form.querySelector('[name="aiExusYn"]');   // 등록 화면에만 있다
      var aiOnly = !!(ai && ai.checked);
      var body = {
        trmNm: form.querySelector('[name="trmNm"]').value,
        trmDfn: form.querySelector('[name="trmDfn"]').value,
        srcNm: form.querySelector('[name="srcNm"]').value,
        useYn: useYn && useYn.checked ? 'Y' : 'N'
      };
      if (ai) { body.aiExusYn = aiOnly ? 'Y' : 'N'; }
      var submit = root.querySelector('[type="submit"][form="sd-term-form"]');   // 단추는 편집 머리(form 밖)에 있다
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, creating ? 'POST' : 'PUT', '/gls/terms' + (creating ? '' : '/' + encodeURIComponent(trmId)), body)
        .then(function (result) {
          if (result.ok) {
            var listHref = root.getAttribute('data-list-href');
            if (aiOnly) { listHref += (listHref.indexOf('?') < 0 ? '?' : '&') + 'ai=Y'; }   // 방금 등록한 용어가 보이는 탭으로
            window.location.assign(withDone(listHref, creating ? 'created' : 'updated'));
            return;
          }
          var first = showFieldErrors(form, result.data && result.data.errors);
          showAlert(root, failureMessage(result));
          if (first) { first.focus(); }
        })
        .catch(function () {
          showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.');
        })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });
  }

  // 삭제(adm_0701-03 작업 메뉴·adm_0702-01 수정 머리) — DELETE {apiBase}/gls/terms/{id}. 서버는 논리 삭제(행은 남김)하고, 목록으로 옮겨 「삭제했습니다.」
  function bindDelete(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-term-delete]');
      if (!button || button.disabled) { return; }
      var name = button.getAttribute('data-name') || '';
      if (!window.confirm('용어 「' + name + '」을(를) 삭제할까요?')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'DELETE', '/gls/terms/' + encodeURIComponent(button.getAttribute('data-trm-id')))
        .then(function (result) {
          if (result.ok) {
            window.location.assign(withDone(root.getAttribute('data-list-href'), 'deleted'));
            return;
          }
          showAlert(root, result.data && result.data.message ? result.data.message : '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          button.disabled = false;
        })
        .catch(function () {
          showAlert(root, '삭제하지 못했습니다. 네트워크 연결을 확인해 주세요.');
          button.disabled = false;
        });
    });
  }

  // 엑셀 일괄 등록(목록 화면의 슬라이드 패널) — 파일을 고르면 바로 검증(POST /gls/terms/import/check),
  // 「등록하기」에 같은 파일을 다시 보낸다(POST /gls/terms/import). 끌어놓기는 콘솔 admin-v2.js 가 파일을 input 에 넣고 change 를 일으킨다.
  // API·이동은 조각 루트(root), 오류는 패널 안 칸에 보인다(목록 쪽 칸은 패널 뒤에 가려진다).
  function initImport(root) {
    var panel = root.querySelector('[data-term-import-panel]');
    if (!panel) { return; }
    var input = panel.querySelector('[name="file"]');
    var drop = panel.querySelector('[data-term-import-drop]');
    var apply = panel.querySelector('[data-term-import-apply]');
    var result = panel.querySelector('[data-term-import-result]');
    if (!input || !drop || !apply || !result) { return; }
    var file = null;      // 검증을 통과한 파일(등록 때 다시 보낸다)
    var count = 0;
    var busy = false;
    var opened = 0;       // 패널을 닫을 때마다 늘린다 — 닫기 전에 보낸 검증의 늦은 응답을 버리는 데 쓴다

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) { node.className = className; }
      if (text !== undefined) { node.textContent = text; }
      return node;
    }

    function setBusy(value) {
      busy = value;
      drop.classList.toggle('is-busy', value);
    }

    function resetResult(message) {
      file = null;
      count = 0;
      apply.disabled = true;
      result.replaceChildren();
      var head = el('div', 'sd-term-import-head');
      head.appendChild(el('h3', 'sd-term-import-title', '검증 결과'));
      result.appendChild(head);
      if (message) { result.appendChild(el('p', 'sd-term-import-dim', message)); }
      return head;
    }

    function badge(head, ok) {
      head.appendChild(el('span', 'nv-badge ' + (ok ? 'nv-badge--ok' : 'nv-badge--err'), ok ? '검증 통과' : '오류'));
    }

    function fileLine(name) {
      var line = el('p', 'sd-term-import-file');
      line.appendChild(el('b', null, name));
      return line;
    }

    function errorBox(title, errors) {
      var box = el('div', 'nv-alert nv-alert--err');
      box.setAttribute('role', 'alert');
      var body = el('div');
      body.appendChild(el('b', null, title));
      var list = el('ul', 'sd-term-import-errlist');
      (errors || []).forEach(function (text) { list.appendChild(el('li', null, text)); });
      body.appendChild(list);
      box.appendChild(body);
      return box;
    }

    function rowsTable(rows) {
      var wrap = el('div', 'nv-table-scroll');
      var table = el('table', 'nv-table sd-term-import-table');
      table.appendChild(el('caption', 'nv-sr-only', '등록할 용어'));
      var tr = el('tr');
      ['행', '용어', '정의', '출처', '상태'].forEach(function (h) {
        var th = el('th', null, h);
        th.scope = 'col';
        tr.appendChild(th);
      });
      table.appendChild(el('thead')).appendChild(tr);
      var tbody = el('tbody');
      rows.forEach(function (r) {
        var row = el('tr');
        [r.excelRow, r.trmNm, r.dfnFirstLine, r.srcNm, r.useYn === 'Y' ? '사용' : '미사용'].forEach(function (v) {
          row.appendChild(el('td', null, v === null || v === undefined ? '' : String(v)));
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    function showCheck(picked, data) {
      var head = resetResult();
      var ok = !data.errors || data.errors.length === 0;
      badge(head, ok);
      result.appendChild(fileLine(picked.name));
      if (!ok) {
        result.appendChild(errorBox('오류가 있어 등록할 수 없습니다.', data.errors));
        return;
      }
      result.appendChild(el('p', null, data.count + '건을 등록합니다.'));
      result.appendChild(rowsTable(data.rows || []));
      file = picked;
      count = data.count;
      apply.disabled = false;
    }

    function check(picked) {
      if (busy || !picked) { return; }
      showAlert(panel, '');
      if (!/\.xlsx$/i.test(picked.name)) { showAlert(panel, 'XLSX 파일만 올릴 수 있습니다'); return; }
      resetResult('검증 중입니다…');
      var data = new FormData();
      data.append('file', picked, picked.name);
      setBusy(true);
      var sentIn = opened;
      send(root, 'POST', '/gls/terms/import/check', data)
        .then(function (res) {
          if (sentIn !== opened) { return; }
          if (res.ok && res.data) {
            showCheck(picked, res.data);
          } else {
            resetResult();
            showAlert(panel, res.data && res.data.message ? res.data.message : '파일을 검증하지 못했습니다.');
          }
        })
        .catch(function () {
          if (sentIn !== opened) { return; }
          resetResult();
          showAlert(panel, '파일을 검증하지 못했습니다. 네트워크 연결을 확인해 주세요.');
        })
        .then(function () { setBusy(false); });
    }

    // 취소·✕·Esc·배경 클릭 모두 이 이벤트를 거친다. 등록하지 않은 내용은 남기지 않는다
    panel.addEventListener('nv:panel-close', function () {
      opened++;
      resetResult();
      result.replaceChildren();
      showAlert(panel, '');
    });

    input.addEventListener('change', function () {
      var list = input.files;
      var picked = list && list[0];
      var many = list && list.length > 1;
      input.value = '';   // 같은 파일을 다시 골라도 change 가 일어나게 비운다
      if (many) { showAlert(panel, '파일은 하나만 올릴 수 있습니다'); return; }
      check(picked);
    });
    apply.addEventListener('click', function () {
      if (busy || !file || apply.disabled) { return; }
      if (!window.confirm(count + '건을 등록할까요?')) { return; }
      var data = new FormData();
      data.append('file', file, file.name);
      showAlert(panel, '');
      setBusy(true);
      apply.disabled = true;
      send(root, 'POST', '/gls/terms/import', data)
        .then(function (res) {
          if (res.ok) {
            window.location.assign(withDone(root.getAttribute('data-list-href'), 'imported'));
            return;
          }
          // 실패하면 「검증 통과」를 지우고 다시 올리게 한다
          badge(resetResult('파일을 확인해 다시 올려 주세요.'), false);
          showAlert(panel, failureMessage(res));
          if (res.data && res.data.errors && res.data.errors.length) {
            var texts = res.data.errors.map(function (e) { return typeof e === 'string' ? e : (e.message || ''); });
            result.appendChild(errorBox('등록하지 않았습니다.', texts));
          }
        })
        .catch(function () {
          badge(resetResult('파일을 확인해 다시 올려 주세요.'), false);
          showAlert(panel, '등록하지 못했습니다. 네트워크 연결을 확인해 주세요.');
        })
        .then(function () { setBusy(false); });
    });
  }

  function init() {
    document.querySelectorAll('[data-sedis-screen="term-form"]').forEach(initForm);
    document.querySelectorAll('[data-sedis-screen="term-list"]').forEach(function (root) {
      bindDelete(root);
      initImport(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
