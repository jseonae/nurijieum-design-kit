/*
 * 시계열 관리(adm_0101~) 화면 스크립트 — 누리지음 콘솔 안 조각에서 돈다(연결 서비스 계약 v1 §4).
 *  - API 기준: 조각 루트의 data-api(문맥 apiBase, 예: /api/console-9f3a/v1/svc/sedis), 없으면 <meta name="cms-svc-api">.
 *  - CSRF: 콘솔 페이지 <meta name="_csrf">(헤더 이름 <meta name="_csrf_header">, 기본 X-CSRF-Token).
 *  - 저장·삭제 뒤 이동: 조각 루트의 data-list-href(문맥 mount 로 만든 목록 주소) + ?done=created|updated|deleted.
 *  - 오류 본문은 {code, message, errors:[{field, message}]} (dev_guide §7-2). 값은 textContent 로만 넣는다.
 *  - 화면마다 조각 루트의 data-sedis-screen 으로 나눈다(ts-group-* · ts-topic-* · ts-source-* · ts-label-* · ts-intg-*).
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
    if (body !== undefined) {
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
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  /** 오류 알림 박스(nv-alert--err) — 콘솔 스타일 가이드처럼 ⊗ 아이콘 + 문구. 빈 문구면 감춘다. */
  function showAlert(root, message) {
    var box = root.querySelector('[data-ts-error]');
    if (!box) { return; }
    box.textContent = '';
    if (message) {
      box.innerHTML = '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-x-circle"/></svg>';
      var text = document.createElement('div');
      text.textContent = message;
      box.appendChild(text);
    }
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

  function failureMessage(result, fallback) {
    if (result.data && result.data.message) {
      return result.data.message;
    }
    if (result.status === 401 || result.status === 403) {
      return '권한이 없거나 로그인이 끝났습니다. 다시 로그인해 주세요.';
    }
    return fallback;
  }

  function goList(root, done) {
    var href = root.getAttribute('data-list-href');
    window.location.assign(href + (href.indexOf('?') < 0 ? '?' : '&') + 'done=' + encodeURIComponent(done));
  }

  /** 입력값 → 숫자. 비었거나 숫자가 아니면 null(서버가 기본값을 쓴다). */
  function intOrNull(value) {
    var v = String(value || '').trim();
    return /^-?\d+$/.test(v) ? parseInt(v, 10) : null;
  }

  /* ── 데이터 그룹 삭제(목록·수정 화면 공통) ── */
  function bindGroupDelete(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ts-group-delete]');
      if (!button || button.disabled) { return; }
      if (button.getAttribute('data-blocked') === 'Y') {   // V-09 — 서버도 같은 문구로 막는다(409)
        showAlert(root, '이 그룹에 속한 데이터 주제가 있어 삭제할 수 없습니다');
        return;
      }
      var name = button.getAttribute('data-name') || '';
      if (!window.confirm('데이터 그룹 「' + name + '」을(를) 삭제할까요?')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'DELETE', '/ts/groups/' + encodeURIComponent(button.getAttribute('data-id')))
        .then(function (result) {
          if (result.ok) {
            goList(root, 'deleted');
            return;
          }
          showAlert(root, failureMessage(result, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          button.disabled = false;
        })
        .catch(function () {
          showAlert(root, '삭제하지 못했습니다. 네트워크 연결을 확인해 주세요.');
          button.disabled = false;
        });
    });
  }

  function initGroupForm(root) {
    bindGroupDelete(root);
    var form = root.querySelector('[data-ts-group-form]');
    if (!form) { return; }
    var id = root.getAttribute('data-id');
    var creating = !id;
    var busy = false;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var actvtn = form.querySelector('[name="actvtnYn"]');
      var body = {
        dataGroupCd: form.querySelector('[name="dataGroupCd"]').value,
        dataGroupNm: form.querySelector('[name="dataGroupNm"]').value,
        expsrSeq: intOrNull(form.querySelector('[name="expsrSeq"]').value),
        actvtnYn: actvtn && actvtn.checked ? 'Y' : 'N'
      };
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, creating ? 'POST' : 'PUT', '/ts/groups' + (creating ? '' : '/' + encodeURIComponent(id)), body)
        .then(function (result) {
          if (result.ok) {
            goList(root, creating ? 'created' : 'updated');
            return;
          }
          var first = showFieldErrors(form, result.data && result.data.errors);
          showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
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

  /* ── 데이터 주제 삭제(목록·수정 화면 공통) ── */
  function bindTopicDelete(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ts-topic-delete]');
      if (!button || button.disabled) { return; }
      var name = button.getAttribute('data-name') || '';
      if (!window.confirm('데이터 주제 「' + name + '」을(를) 삭제할까요?\n연결된 원본은 미연결로 남고 그래프 설정도 지워집니다.')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'DELETE', '/ts/topics/' + encodeURIComponent(button.getAttribute('data-id')))
        .then(function (result) {
          if (result.ok) {
            goList(root, 'deleted');
            return;
          }
          showAlert(root, failureMessage(result, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          button.disabled = false;
        })
        .catch(function () {
          showAlert(root, '삭제하지 못했습니다. 네트워크 연결을 확인해 주세요.');
          button.disabled = false;
        });
    });
  }

  /*
   * 연결 원본 표(adm_0202-03) — 관리자 프로토타입 drawSJ·toggleSJ·pairWhy 규칙.
   *  - 연결·추천 근거 칸: 데이터 주제명과 통계표명이 똑같은(앞뒤 공백만 뺌) 원본에만 「통계표명 일치」, 선택과 상관없이.
   *  - 추천(보이기에만 씀): 선택한 다른 연도 원본과 통계표명(띄어쓰기·가운뎃점 제외) 일치 → 표 번호 일치.
   *  - 보이기: 선택 · 「전체 원본 보기」 · 주제명과 똑같은 원본(다른 주제에 연결돼 있어도) · 추천이면서 미연결 ·
   *    (선택이 없으면) 미연결.
   *  - 등록·수정: 주제명을 입력하면(input) 주제명과 똑같은 사용 원본을 연도마다 1개 자동 선택. 화면을 열 때는 고르지 않는다.
   *    다른 주제에 연결된 원본은 옮기기 확인이 필요해 고르지 않는다. 주제명을 바꾸면 자동으로 고른 것만 다시 고르고,
   *    사용자가 직접 고르거나 푼 원본·이미 이 주제에 연결된 원본은 건드리지 않는다.
   *  - 같은 연도 사용 원본 두 개는 고를 수 없다(V-06). 다른 주제에 연결된 원본은 확인 뒤 옮긴다.
   */
  function initOrgnlTable(root) {
    var self = root.getAttribute('data-id') || '';
    var rows = Array.prototype.slice.call(root.querySelectorAll('[data-ts-orgnl]'));
    var nameInput = root.querySelector('[name="dataTpcNm"]');
    var auto = [];     // 주제명으로 자동 선택한 원본
    var manual = [];   // 사용자가 직접 고르거나 푼 원본 — 자동 선택이 다시 건드리지 않는다
    var all = root.querySelector('[data-ts-orgnl-all]');
    var empty = root.querySelector('[data-ts-orgnl-empty]');
    var result = root.querySelector('[data-ts-orgnl-result]');
    function attr(row, name) { return row.getAttribute('data-' + name) || ''; }
    function box(row) { return row.querySelector('input[type="checkbox"]'); }
    function used(row) { return attr(row, 'use') === 'Y'; }
    function sameName(r) {
      var nm = nameInput ? nameInput.value.trim() : '';
      return !!nm && nm === attr(r, 'sttbl-nm').trim();
    }
    function free(r) { return !attr(r, 'tpc') || attr(r, 'tpc') === self; }
    function why(a, b) {
      if (attr(a, 'yr') === attr(b, 'yr')) { return ''; }
      if (attr(a, 'nm') === attr(b, 'nm')) { return '통계표명 일치'; }
      if (attr(a, 'tbl') && attr(a, 'tbl') === attr(b, 'tbl')) { return '표 번호 일치'; }
      return '';
    }
    function draw() {
      var members = rows.filter(function (r) { return box(r).checked; });
      var usedMembers = members.filter(used);
      var shown = 0;
      rows.forEach(function (r) {
        var on = box(r).checked;
        var linked = attr(r, 'tpc') && attr(r, 'tpc') !== self;
        var w = '';
        if (sameName(r)) {
          w = '통계표명 일치';
        } else {
          usedMembers.some(function (m) { if (m !== r) { w = why(m, r); } return !!w; });
        }
        var visible = on || (all && all.checked) || (w && (free(r) || sameName(r))) || (!members.length && !attr(r, 'tpc') && used(r));
        r.hidden = !visible;
        r.classList.toggle('is-on', on);
        if (visible) { shown++; }
        var cell = r.querySelector('[data-ts-why]');
        var label = sameName(r) ? '통계표명 일치' : '';   // 근거 칸은 주제명과 똑같은 원본만(담당자 지정·표 번호 일치는 표시 안 함)
        cell.textContent = '';
        if (label) {
          var badge = document.createElement('span');
          badge.className = 'nv-badge nv-badge--info';
          badge.textContent = label;
          cell.appendChild(badge);
        } else if (linked) {
          cell.textContent = '-';
        }
      });
      if (empty) { empty.hidden = shown > 0; }
      if (result) {
        result.textContent = '';
        var ys = usedMembers.map(function (m) { return attr(m, 'yr'); }).sort();
        if (!ys.length) {
          var none = document.createElement('p');
          none.className = 'sd-ts-dim';
          none.textContent = '연결할 원본을 고르세요';
          result.appendChild(none);
          return;
        }
        var chips = document.createElement('div');
        chips.className = 'sd-ts-years';
        ys.forEach(function (y) {
          var c = document.createElement('span');
          c.className = 'nv-badge nv-badge--primary';
          c.textContent = y;
          chips.appendChild(c);
        });
        result.appendChild(chips);
        var latest = usedMembers.slice().sort(function (a, b) { return attr(a, 'yr') < attr(b, 'yr') ? -1 : 1; }).pop();
        var nm = document.createElement('p');
        nm.className = 'sd-ts-result-name';
        nm.textContent = '통계표명 「' + attr(latest, 'sttbl-nm') + '」';
        result.appendChild(nm);
      }
    }
    rows.forEach(function (r) {
      box(r).addEventListener('change', function (event) {
        var input = event.target;
        auto = auto.filter(function (a) { return a !== r; });   // 직접 고른·푼 것은 주제명을 바꿔도 그대로
        if (manual.indexOf(r) < 0) { manual.push(r); }
        if (input.checked) {
          var clash = used(r) && rows.some(function (o) { return o !== r && box(o).checked && used(o) && attr(o, 'yr') === attr(r, 'yr'); });
          if (clash) {
            input.checked = false;
            showAlert(root, attr(r, 'yr') + '년 사용 원본이 이미 선택되어 있습니다 — 연도마다 1개');
            return;
          }
          if (attr(r, 'tpc') && attr(r, 'tpc') !== self
              && !window.confirm('이 원본은 「' + attr(r, 'tpc-nm') + '」에 연결되어 있습니다. 이 데이터 주제로 옮길까요?\n원래 데이터 주제는 게시 중이면 작성 상태로 돌아갑니다.')) {
            input.checked = false;
            return;
          }
        }
        showAlert(root, '');
        draw();
      });
    });
    if (all) { all.addEventListener('change', draw); }
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        auto.forEach(function (r) { if (!sameName(r)) { box(r).checked = false; } });
        auto = auto.filter(function (r) { return box(r).checked; });
        rows.forEach(function (r) {
          if (box(r).checked || box(r).disabled || !used(r) || !free(r) || !sameName(r) || manual.indexOf(r) >= 0) { return; }
          var taken = rows.some(function (o) { return box(o).checked && used(o) && attr(o, 'yr') === attr(r, 'yr'); });
          if (!taken) {
            box(r).checked = true;
            auto.push(r);
          }
        });
        draw();
      });
    }
    draw();
  }

  function initTopicForm(root) {
    bindTopicDelete(root);
    initOrgnlTable(root);
    var form = root.querySelector('[data-ts-topic-form]');
    if (!form) { return; }
    var id = root.getAttribute('data-id');
    var creating = !id;
    var busy = false;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var orgnlIds = Array.prototype.map.call(form.querySelectorAll('[name="orgnlIds"]:checked'), function (el) { return el.value; });
      var body = {
        dataTpcNm: form.querySelector('[name="dataTpcNm"]').value,
        dataGroupId: form.querySelector('[name="dataGroupId"]').value,
        expsrSeq: intOrNull(form.querySelector('[name="expsrSeq"]').value),
        orgnlIds: orgnlIds
      };
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, creating ? 'POST' : 'PUT', '/ts/topics' + (creating ? '' : '/' + encodeURIComponent(id)), body)
        .then(function (result) {
          if (result.ok) {
            goList(root, creating ? 'created' : 'updated');
            return;
          }
          var first = showFieldErrors(form, result.data && result.data.errors);
          showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          if (first && first.type !== 'checkbox') { first.focus(); }
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

  /* ── 통계표 원본(adm_0301~0303) ── */

  /** multipart 전송(원본 판독·등록). Content-Type 은 브라우저가 boundary 와 함께 정한다. */
  function sendForm(root, path, formData) {
    var headers = { 'Accept': 'application/json' };
    var token = meta('_csrf');
    if (token) {
      headers[meta('_csrf_header') || 'X-CSRF-Token'] = token;
    }
    return fetch(apiBase(root) + path, { method: 'POST', headers: headers, credentials: 'same-origin', body: formData })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
          return { ok: res.ok, status: res.status, data: data };
        });
      });
  }

  function confirmThen(root, button, question, method, path, body, done, fallback) {
    if (!window.confirm(question)) { return; }
    button.disabled = true;
    showAlert(root, '');
    send(root, method, path, body)
      .then(function (result) {
        if (result.ok) { done(); return; }
        showAlert(root, failureMessage(result, fallback));
        button.disabled = false;
      })
      .catch(function () {
        showAlert(root, fallback);
        button.disabled = false;
      });
  }

  function reloadWith(root, done) {
    var href = root.getAttribute('data-here-href') || root.getAttribute('data-list-href');
    window.location.assign(href + (href.indexOf('?') < 0 ? '?' : '&') + 'done=' + encodeURIComponent(done));
  }

  /*
   * 원본 목록 — 행 선택·선택 수·「선택 삭제」 활성은 콘솔 공통 스크립트(admin-v2.js 의 data-select-* 훅)가 맡고,
   * 여기서는 선택 삭제·삭제 요청만 보낸다.
   */
  function initSourceList(root) {
    root.addEventListener('click', function (event) {
      var del = event.target.closest('[data-ts-source-delete]');
      var bulk = event.target.closest('[data-ts-source-delete-selected]');
      if (del && !del.disabled) {
        confirmThen(root, del, '원본 「' + del.getAttribute('data-name') + '」을(를) 삭제할까요?\n연결된 데이터 주제는 다시 통합해야 합니다.',
          'DELETE', '/ts/sources/' + encodeURIComponent(del.getAttribute('data-id')), undefined,
          function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (bulk && !bulk.disabled) {
        var ids = Array.prototype.map.call(root.querySelectorAll('[data-select-row]:checked'), function (b) { return b.value; });
        if (!ids.length) { return; }
        confirmThen(root, bulk, '선택한 원본 ' + ids.length + '개를 삭제할까요?\n연결된 데이터 주제는 다시 통합해야 합니다.',
          'POST', '/ts/sources/delete', { orgnlIds: ids },
          function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });
  }

  /** 데이터 주제 고르기 — 「새 데이터 주제」면 주제명·그룹 입력란을 보인다. */
  function bindTopicPick(root) {
    var pick = root.querySelector('[data-ts-topic-pick]');
    var box = root.querySelector('[data-ts-new-topic]');
    if (!pick || !box) { return; }
    function toggle() { box.hidden = pick.value !== '__new'; }
    pick.addEventListener('change', toggle);
    toggle();
  }

  /** 고른 값 → 요청 값(mode·dataTpcId·newTpcNm·newGroupId). */
  function topicChoice(form, current) {
    var v = form.querySelector('[data-ts-topic-pick]').value;
    var c = { mode: 'NONE' };
    if (v === '__auto') { c.mode = 'AUTO'; }
    else if (v === '__new') {
      c.mode = 'NEW';
      c.newTpcNm = form.querySelector('[name="newTpcNm"]').value;
      c.newGroupId = form.querySelector('[name="newGroupId"]').value;
    } else if (v && v !== current) { c.mode = 'TOPIC'; c.dataTpcId = v; }
    return c;
  }

  function drawPreview(target, preview) {
    target.textContent = '';
    if (!preview || !preview.rows || !preview.rows.length) {
      var p = document.createElement('p');
      p.className = 'sd-ts-dim';
      p.textContent = '미리 볼 수 없는 파일입니다.';
      target.appendChild(p);
      return;
    }
    var table = document.createElement('table');
    table.className = 'sd-ts-preview-table';
    preview.rows.forEach(function (row, i) {
      var tr = document.createElement('tr');
      if (i < preview.headerRows) { tr.className = 'is-head'; }
      row.forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    target.appendChild(table);
  }

  /*
   * 원본 등록(adm_0302) — 고른 파일을 목록으로 들고 있다(여러 번 고르기·끌어놓기로 더하고, ✕ 로 뺀다).
   * 목록이 바뀔 때마다 {apiBase}/ts/sources/check 로 판독만 받아 「올린 원본」을 그리고, 행을 고르면 미리보기를 바꾼다.
   */
  function initSourceNew(root) {
    bindTopicPick(root);
    var form = root.querySelector('[data-ts-source-form]');
    var input = form.querySelector('[name="files"]');
    var drop = root.querySelector('[data-ts-drop]');
    var body = root.querySelector('[data-ts-ups]');
    var preview = root.querySelector('[data-ts-preview]');
    var previewName = root.querySelector('[data-ts-preview-name]');
    var files = [];
    var checks = [];
    var current = 0;
    var busy = false;
    var LNKG = { NM_CCRNC: '통계표명 일치', TBLNO_CCRNC: '표 번호 일치' };

    function cell(tr, text, cls) {
      var td = document.createElement('td');
      if (cls) { td.className = cls; }
      td.textContent = text;
      tr.appendChild(td);
      return td;
    }
    function showPreview(i) {
      current = i;
      Array.prototype.forEach.call(body.querySelectorAll('tr'), function (tr, k) { tr.classList.toggle('is-on', k === i); });
      if (!checks[i]) {
        preview.textContent = '';
        var p = document.createElement('p');
        p.className = 'sd-ts-dim';
        p.textContent = '목록에서 파일을 고르면 원본이 그대로 보입니다';
        preview.appendChild(p);
        if (previewName) { previewName.textContent = ''; }
        return;
      }
      drawPreview(preview, checks[i].preview);
      if (previewName) { previewName.textContent = '— ' + checks[i].fileName; }
    }
    function drawChecks() {
      body.textContent = '';
      if (!checks.length) {
        var tr0 = document.createElement('tr');
        var td0 = cell(tr0, '올린 파일이 없습니다', 'sd-ts-dim');
        td0.colSpan = 6;
        body.appendChild(tr0);
        showPreview(-1);
        return;
      }
      checks.forEach(function (c, i) {
        var tr = document.createElement('tr');
        tr.className = 'sd-ts-pick-row';
        tr.tabIndex = 0;
        tr.setAttribute('aria-label', c.fileName + ' 미리보기');
        cell(tr, c.exmnYr || '-');
        cell(tr, c.sttblId || '-', 'is-code');
        var nm = cell(tr, c.sttblNm || c.fileName);
        if (c.message) {
          var why = document.createElement('div');
          why.className = 'sd-ts-sub';
          why.textContent = c.message;
          nm.appendChild(why);
        }
        cell(tr, c.recommend ? c.recommend.dataTpcNm + ' (' + (LNKG[c.recommend.lnkgMthCd] || '') + ')' : '-');
        var st = document.createElement('td');
        var badge = document.createElement('span');
        badge.className = 'nv-badge ' + (c.state === 'OK' ? 'nv-badge--ok' : 'nv-badge--err');
        badge.textContent = c.stateNm;
        st.appendChild(badge);
        tr.appendChild(st);
        var act = document.createElement('td');
        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'nv-btn nv-btn--icon nv-btn--sm';
        x.setAttribute('aria-label', c.fileName + ' 목록에서 제외');
        x.innerHTML = '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-close"/></svg>';
        x.addEventListener('click', function (event) {
          event.stopPropagation();
          files.splice(i, 1);
          recheck(Math.min(current, files.length - 1));
        });
        act.appendChild(x);
        tr.appendChild(act);
        tr.addEventListener('click', function () { showPreview(i); });
        tr.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showPreview(i); }
        });
        body.appendChild(tr);
      });
      showPreview(current >= 0 && current < checks.length ? current : 0);
    }
    function filesData() {
      var fd = new FormData();
      files.forEach(function (f) { fd.append('files', f, f.name); });
      return fd;
    }
    function recheck(keep) {
      showAlert(root, '');
      current = keep;
      if (!files.length) { checks = []; drawChecks(); return; }
      sendForm(root, '/ts/sources/check', filesData())
        .then(function (result) {
          if (!result.ok) { showAlert(root, failureMessage(result, '파일을 읽지 못했습니다.')); return; }
          checks = result.data || [];
          drawChecks();
        })
        .catch(function () { showAlert(root, '파일을 읽지 못했습니다. 네트워크 연결을 확인해 주세요.'); });
    }
    function add(list) {
      var added = Array.prototype.filter.call(list || [], function (f) { return /\.csv$/i.test(f.name); });
      if (!added.length) { showAlert(root, 'CSV 파일만 올릴 수 있습니다'); return; }
      added.forEach(function (f) {
        if (!files.some(function (g) { return g.name === f.name && g.size === f.size; })) { files.push(f); }
      });
      recheck(files.length - added.length);
    }

    input.addEventListener('change', function () { add(input.files); input.value = ''; });
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (t) {
        drop.addEventListener(t, function (event) { event.preventDefault(); drop.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(function (t) {
        drop.addEventListener(t, function () { drop.classList.remove('is-over'); });
      });
      drop.addEventListener('drop', function (event) {
        event.preventDefault();
        add(event.dataTransfer && event.dataTransfer.files);
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      if (!files.length) { showAlert(root, '원본 파일을 올리세요'); return; }
      var fd = filesData();
      var choice = topicChoice(form, '');
      Object.keys(choice).forEach(function (k) { fd.append(k, choice[k]); });
      var use = form.querySelector('[name="useYn"]:checked');
      fd.append('useYn', use ? use.value : 'Y');
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      sendForm(root, '/ts/sources', fd)
        .then(function (result) {
          if (result.ok) { goList(root, 'created'); return; }
          var first = showFieldErrors(form, (result.data && result.data.errors || []).filter(function (e) { return e.field !== 'files'; }));
          var msgs = (result.data && result.data.errors || []).filter(function (e) { return e.field === 'files'; }).map(function (e) { return e.message; });
          showAlert(root, failureMessage(result, '등록하지 못했습니다. 잠시 후 다시 시도해 주세요.') + (msgs.length > 1 ? ' (' + msgs.join(' · ') + ')' : ''));
          if (first) { first.focus(); }
        })
        .catch(function () { showAlert(root, '등록하지 못했습니다. 네트워크 연결을 확인해 주세요.'); })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });
  }

  function initSourceDetail(root) {
    bindTopicPick(root);
    var form = root.querySelector('[data-ts-source-detail-form]');
    var id = root.getAttribute('data-id');
    var current = root.getAttribute('data-current') || '';
    var busy = false;
    root.addEventListener('click', function (event) {
      var del = event.target.closest('[data-ts-source-delete]');
      if (del && !del.disabled) {
        confirmThen(root, del, '원본 「' + del.getAttribute('data-name') + '」을(를) 삭제할까요?\n연결된 데이터 주제는 다시 통합해야 합니다.',
          'DELETE', '/ts/sources/' + encodeURIComponent(id), undefined,
          function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var body = topicChoice(form, current);
      var use = form.querySelector('[name="useYn"]:checked');
      body.useYn = use ? use.value : null;
      if (body.mode === 'TOPIC' && current
          && !window.confirm('이 원본을 다른 데이터 주제로 옮길까요?\n두 데이터 주제 모두 다시 통합해야 하고, 게시 중이면 작성 상태로 돌아갑니다.')) {
        return;
      }
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, 'PUT', '/ts/sources/' + encodeURIComponent(id), body)
        .then(function (result) {
          if (result.ok) { goList(root, 'updated'); return; }
          var first = showFieldErrors(form, result.data && result.data.errors);
          showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          if (first) { first.focus(); }
        })
        .catch(function () { showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });
  }

  /* ── 라벨 사전(adm_0601·0602) — 저장·삭제하면 서버가 전 주제를 재판정한다 ── */
  function bindLabelDelete(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ts-label-delete]');
      if (!button || button.disabled) { return; }
      confirmThen(root, button, '라벨 「' + (button.getAttribute('data-name') || '') + '」을(를) 삭제할까요?\n이 라벨로 이어진 통계표는 다시 통합해야 할 수 있습니다.',
        'DELETE', '/ts/labels/' + encodeURIComponent(button.getAttribute('data-id')), undefined,
        function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    });
  }

  function initLabelForm(root) {
    bindLabelDelete(root);
    var form = root.querySelector('[data-ts-label-form]');
    if (!form) { return; }
    var id = root.getAttribute('data-id');
    var creating = !id;
    var busy = false;
    // 적용 범위 — 「선택한 통계표만」일 때만 체크박스 목록을 쓴다. 찾기는 화면에서만 거른다(고른 값은 그대로)
    var topics = form.querySelector('[data-ts-label-topics]');
    var count = form.querySelector('[data-ts-label-topic-count]');
    function scopeAll() {
      var on = form.querySelector('[name="wholAplcnYn"]:checked');
      return !on || on.value !== 'N';
    }
    function topicIds() {
      return Array.prototype.map.call(form.querySelectorAll('[name="dataTpcIds"]:checked'), function (b) { return b.value; });
    }
    var topicQ = form.querySelector('[data-ts-label-topic-q]');
    var onlyOn = form.querySelector('[data-ts-label-topic-only]');
    var empty = form.querySelector('[data-ts-label-topic-empty]');
    var appliedQ = '';   // 찾기는 Enter(또는 지우기 ×)로 적용한 검색어로만 거른다
    // 표 줄 — 고른 줄 강조(is-on), 찾기·「선택한 통계표만 보기」로 보이기만 바꾼다
    function drawTopics() {
      if (topics) { topics.disabled = scopeAll(); }
      if (count) { count.textContent = '선택 ' + topicIds().length + '개'; }
      var q = appliedQ;
      var shown = 0;
      form.querySelectorAll('[data-ts-label-topic]').forEach(function (tr) {
        var on = tr.querySelector('[name="dataTpcIds"]').checked;
        tr.classList.toggle('is-on', on);
        tr.hidden = (onlyOn && onlyOn.checked && !on)
          || (q !== '' && (tr.getAttribute('data-text') || '').replace(/\s+/g, '').indexOf(q) < 0);
        if (!tr.hidden) { shown++; }
      });
      if (empty) { empty.hidden = shown > 0; }
    }
    form.querySelectorAll('[name="wholAplcnYn"], [name="dataTpcIds"], [data-ts-label-topic-only]').forEach(function (el) {
      el.addEventListener('change', drawTopics);
    });
    if (topicQ) {
      topicQ.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') { return; }
        event.preventDefault();   // 폼 저장 대신 찾기(한글 조합 중 Enter 도 — 값에 조합 글자가 들어 있다. 두 번 와도 같은 결과)
        appliedQ = topicQ.value.replace(/\s+/g, '');
        drawTopics();
      });
      topicQ.addEventListener('input', function () {
        if (topicQ.value === '' && appliedQ !== '') { appliedQ = ''; drawTopics(); }   // 지우기(×)·전부 지우면 전체 다시
      });
    }
    drawTopics();
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var chg = form.querySelector('[name="chgSeCd"]:checked');
      var scrn = form.querySelector('[name="scrnIndctYn"]');
      var all = scopeAll();
      var body = {
        lblSeCd: form.querySelector('[name="lblSeCd"]').value,
        stdLblNm: form.querySelector('[name="stdLblNm"]').value,
        orgnlLblNm: form.querySelector('[name="orgnlLblNm"]').value,
        chgSeCd: chg ? chg.value : null,
        bssCn: form.querySelector('[name="bssCn"]').value,
        gdPhrsCn: form.querySelector('[name="gdPhrsCn"]').value,
        scrnIndctYn: scrn && scrn.checked ? 'Y' : 'N',
        wholAplcnYn: all ? 'Y' : 'N',
        dataTpcIds: all ? [] : topicIds()
      };
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, creating ? 'POST' : 'PUT', '/ts/labels' + (creating ? '' : '/' + encodeURIComponent(id)), body)
        .then(function (result) {
          if (result.ok) { goList(root, creating ? 'created' : 'updated'); return; }
          var first = showFieldErrors(form, result.data && result.data.errors);
          showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          if (first) { first.focus(); }
        })
        .catch(function () { showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });
  }

  /* ── 통계표 통합(adm_0401·0402) ── */
  function initIntgList(root) {
    root.addEventListener('click', function (event) {
      var del = event.target.closest('[data-ts-intg-delete]');
      var bulk = event.target.closest('[data-ts-intg-delete-selected]');
      var ids = null;
      var button = del || bulk;
      if (!button || button.disabled) { return; }
      if (del) {
        ids = [del.getAttribute('data-id')];
      } else {
        ids = Array.prototype.map.call(root.querySelectorAll('[data-select-row]:checked'), function (b) { return b.value; });
        if (!ids.length) { return; }
      }
      var q = del ? '「' + del.getAttribute('data-name') + '」 데이터 주제를 삭제할까요?' : '선택한 통계표 ' + ids.length + '개(데이터 주제)를 삭제할까요?';
      confirmThen(root, button, q + '\n그래프·통합 데이터도 함께 지워지고, 연결 원본은 미연결로 남습니다.',
        'POST', '/ts/integrations/delete', { dataTpcIds: ids },
        function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    });
  }

  function initIntgForm(root) {
    var id = root.getAttribute('data-id');
    var base = '/ts/integrations/' + encodeURIComponent(id);
    root.addEventListener('click', function (event) {
      var rm = event.target.closest('[data-ts-intg-remove]');
      var add = event.target.closest('[data-ts-intg-add]');
      var run = event.target.closest('[data-ts-intg-run]');
      var chip = event.target.closest('[data-ts-target-remove]');
      var del = event.target.closest('[data-ts-intg-delete]');
      if (rm && !rm.disabled) {
        confirmThen(root, rm, '「' + rm.getAttribute('data-name') + '」 원본을 이 통계표에서 제외할까요?\n원본은 보관되고, 다시 통합해야 하며 게시 중이면 작성 상태로 돌아갑니다.',
          'DELETE', base + '/sources/' + encodeURIComponent(rm.getAttribute('data-orgnl')), undefined,
          function () { reloadWith(root, 'removed'); }, '제외하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (add && !add.disabled) {
        confirmThen(root, add, '「' + add.getAttribute('data-name') + '」 원본을 이 통계표에 추가할까요?',
          'POST', base + '/sources/' + encodeURIComponent(add.getAttribute('data-orgnl')), undefined,
          function () { reloadWith(root, 'added'); }, '추가하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (run && !run.disabled) {
        // 측정값 표(통합 실행 옆 측정값 선택이 있을 때)는 고른 측정값으로 통합한다 — 그래프 비율·모집단 함께(2026-11-11)
        var pickMeasure = root.querySelector('[data-ts-intg-measure]');
        if (pickMeasure && !pickMeasure.value) {
          showAlert(root, '측정값을 고르세요. 고른 측정값으로 그래프 비율과 모집단을 보입니다.');
          pickMeasure.focus();
          return;
        }
        confirmThen(root, run, (pickMeasure ? '「' + pickMeasure.value + '」 기준으로 ' : '') + '통합을 실행할까요? 저장된 통합 데이터가 원본 기준으로 다시 만들어지고, 이전 값으로 되돌릴 수 없습니다.',
          'POST', base + '/run', pickMeasure ? { measure: pickMeasure.value } : undefined,
          function () { reloadWith(root, 'run'); }, '통합하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (chip) {
        var tag = chip.closest('[data-ts-target]');
        tag.parentNode.removeChild(tag);
      } else if (del && !del.disabled) {
        confirmThen(root, del, '「' + del.getAttribute('data-name') + '」 데이터 주제를 삭제할까요?\n그래프·통합 데이터도 함께 지워지고, 연결 원본은 미연결로 남습니다.',
          'POST', '/ts/integrations/delete', { dataTpcIds: [id] },
          function () { goList(root, 'deleted'); }, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    });
    // 조사대상 — 고르면 바로 태그로(프로토타입 addTag). 이미 고른 대상은 다시 넣지 않는다(V-12)
    var pick = root.querySelector('[data-ts-target-pick]');
    if (pick) {
      pick.addEventListener('change', function () {
        var cd = pick.value;
        if (!cd) { return; }
        var text = pick.options[pick.selectedIndex].text;
        pick.value = '';
        if (root.querySelector('[data-ts-target][data-cd="' + cd + '"]')) {
          showAlert(root, '이미 추가한 조사대상입니다');
          return;
        }
        var tag = document.createElement('span');
        tag.className = 'nv-tag';
        tag.setAttribute('data-ts-target', '');
        tag.setAttribute('data-cd', cd);
        tag.appendChild(document.createTextNode(text));
        var x = document.createElement('button');
        x.type = 'button';
        x.setAttribute('data-ts-target-remove', '');
        x.setAttribute('aria-label', text + ' 빼기');
        x.textContent = '\u00d7';
        tag.appendChild(x);
        root.querySelector('[data-ts-targets]').appendChild(tag);
      });
    }
    // ② 조회 특성 — 한 단계를 바꾸면 아래 단계는 서버가 다시 고른다(소계 우선, 프로토타입 qPath)
    var query = root.querySelector('[data-ts-intg-query]');
    if (query) {
      query.querySelectorAll('select[data-level]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var lv = parseInt(sel.getAttribute('data-level'), 10);
          query.querySelectorAll('select[data-level]').forEach(function (o) {
            if (parseInt(o.getAttribute('data-level'), 10) > lv) { o.disabled = true; }
          });
          query.submit();
        });
      });
    }
    root.querySelectorAll('[data-ts-intg-confirm]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var button = form.querySelector('button[type="submit"]');
        var std = form.querySelector('[name="std"]').value;
        var scope = form.querySelector('[name="wholAplcnYn"]');
        var whol = scope ? scope.value : 'Y';
        confirmThen(root, button, '「' + form.getAttribute('data-orig') + '」 → 「' + std + '」 연결을 확정할까요?\n라벨 사전에 저장되어 '
            + (whol === 'N' ? '이 통계표에만' : '모든 통계표에') + ' 적용됩니다.',
          'POST', base + '/labels', { lblSeCd: form.getAttribute('data-se'), orgnlLblNm: form.getAttribute('data-orig'), stdLblNm: std,
            chgSeCd: form.querySelector('[name="chgSeCd"]').value, wholAplcnYn: whol },
          function () { reloadWith(root, 'labeled'); }, '연결을 확정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      });
    });
    var settings = root.querySelector('[data-ts-intg-settings]');
    var busy = false;
    settings.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(settings);
      showAlert(root, '');
      var pstg = settings.querySelector('[name="pstgSttsCd"]:checked');
      var body = {
        pstgSttsCd: pstg ? pstg.value : null,
        targets: Array.prototype.map.call(root.querySelectorAll('[data-ts-target]'), function (c) { return c.getAttribute('data-cd'); })
      };
      var submit = root.querySelector('button[type="submit"][form="sd-ts-intg-settings"]');
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, 'PUT', base + '/settings', body)
        .then(function (result) {
          if (result.ok) { reloadWith(root, 'updated'); return; }
          var first = showFieldErrors(settings, result.data && result.data.errors);
          showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          if (first) { first.focus(); }
        })
        .catch(function () { showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });
  }

  /* ── 그래프 시각화 설정(adm_0502) — 그래프 구성(순서·유형·기본) · 지표정보 · 출력 요청/중지 ── */
  function phraseItem(text) {
    var li = document.createElement('li');
    li.setAttribute('data-ts-phrase', '');
    var ta = document.createElement('textarea');
    ta.className = 'nv-textarea';
    ta.rows = 2;
    ta.maxLength = 1300;
    ta.setAttribute('aria-label', '문구');
    ta.value = text;
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'nv-btn nv-btn--icon nv-btn--sm nv-btn--danger';
    rm.setAttribute('data-ts-phrase-remove', '');
    rm.setAttribute('aria-label', '삭제');
    rm.innerHTML = '<svg class="nv-icon" aria-hidden="true"><use href="#nv-i-trash"/></svg>';   // 고정 문자열(화면 렌더 줄과 같은 아이콘)
    li.appendChild(ta);
    li.appendChild(rm);
    return li;
  }

  /** 문구 칸(연도별 표기 변경·안내 문구) — 지우기·추가·기본값으로 되돌리기. 값은 화면에서만 바뀌고 「저장하기」가 보낸다. */
  function initPhrases(box) {
    var list = box.querySelector('[data-ts-phrase-list]');
    var empty = box.querySelector('[data-ts-phrase-empty]');
    var input = box.querySelector('[data-ts-phrase-new]');
    function draw() { if (empty) { empty.hidden = !!list.querySelector('[data-ts-phrase]'); } }
    function add() {
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      list.appendChild(phraseItem(v.indexOf('\u203b') === 0 ? v : '\u203b ' + v));   // 앞 「※ 」(프로토타입 addNote)
      input.value = '';
      draw();
    }
    box.addEventListener('click', function (event) {
      var rm = event.target.closest('[data-ts-phrase-remove]');
      if (rm) { rm.closest('[data-ts-phrase]').remove(); draw(); }
      else if (event.target.closest('[data-ts-phrase-add]')) { add(); }
      else if (event.target.closest('[data-ts-phrase-reset]')) {
        list.textContent = '';
        box.querySelectorAll('[data-ts-phrase-default] li').forEach(function (li) { list.appendChild(phraseItem(li.textContent)); });
        draw();
      }
    });
    if (input) {
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') { event.preventDefault(); add(); }
      });
    }
    draw();
  }

  function phraseValues(root, name) {
    var box = root.querySelector('[data-ts-phrases="' + name + '"]');
    return box ? Array.prototype.map.call(box.querySelectorAll('[data-ts-phrase] textarea'), function (t) { return t.value; }) : null;
  }

  function initGraphForm(root) {
    var id = root.getAttribute('data-id');
    var rows = root.querySelector('[data-ts-graph-rows]');
    var tpl = root.querySelector('[data-ts-graph-template] tr');
    var count = root.querySelector('[data-ts-graph-count]');
    function list() { return rows ? Array.prototype.slice.call(rows.querySelectorAll('[data-ts-graph]')) : []; }
    function draw() {
      list().forEach(function (tr, i) { tr.querySelector('[data-ts-graph-no]').textContent = String(i + 1); });
      if (count) { count.textContent = list().length + '개'; }
    }
    root.addEventListener('click', function (event) {
      var up = event.target.closest('[data-ts-graph-up]');
      var down = event.target.closest('[data-ts-graph-down]');
      var rm = event.target.closest('[data-ts-graph-remove]');
      var add = event.target.closest('[data-ts-graph-add]');
      var save = event.target.closest('[data-ts-graph-save]');
      if (up || down) {
        var tr = (up || down).closest('[data-ts-graph]');
        if (up && tr.previousElementSibling) { rows.insertBefore(tr, tr.previousElementSibling); }
        if (down && tr.nextElementSibling) { rows.insertBefore(tr.nextElementSibling, tr); }
        draw();
      } else if (rm) {
        var gone = rm.closest('[data-ts-graph]');
        var wasBasic = gone.querySelector('[name="basic"]').checked;
        gone.parentNode.removeChild(gone);
        if (wasBasic && list().length) { list()[0].querySelector('[name="basic"]').checked = true; }   // 프로토타입: 기본을 지우면 첫 그래프
        draw();
      } else if (add && tpl) {
        var row = tpl.cloneNode(true);
        var radio = row.querySelector('[type="radio"]');
        radio.name = 'basic';
        radio.checked = !list().length;
        rows.appendChild(row);
        draw();
        row.querySelector('[name="typeCd"]').focus();
      } else if (save && !save.disabled) {
        saveAll(save).then(function (result) { if (result && result.ok) { reloadWith(root, 'updated'); } });
      } else if (event.target.closest('[data-ts-graph-publish]')) {
        var pub = event.target.closest('[data-ts-graph-publish]');
        if (pub.disabled) { return; }
        saveAll(pub).then(function (result) {
          if (!result || !result.ok) { return; }
          pub.disabled = true;
          return send(root, 'POST', '/ts/graphs/' + encodeURIComponent(id) + '/publish').then(function (r) {
            if (r.ok) { reloadWith(root, 'published'); return; }
            // 저장은 됐고 출력만 막힌 경우(예: 원본이 바뀌어 재실행 필요) — 바뀐 상태를 보이도록 새로 그린다
            showAlert(root, failureMessage(r, '출력하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
            pub.disabled = false;
          });
        }).catch(function () { showAlert(root, '출력하지 못했습니다. 네트워크 연결을 확인해 주세요.'); pub.disabled = false; });
      } else if (event.target.closest('[data-ts-graph-hide]')) {
        var hide = event.target.closest('[data-ts-graph-hide]');
        confirmThen(root, hide, '사용자 화면 출력을 중지할까요?\n사용자 화면에서 이 통계표가 보이지 않게 됩니다(저장하지 않은 변경은 버려집니다).',
          'POST', '/ts/graphs/' + encodeURIComponent(id) + '/hide', undefined,
          function () { reloadWith(root, 'hidden'); }, '출력을 중지하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (event.target.closest('[data-ts-source-reset]')) {
        var src = root.querySelector('[data-ts-source]');
        src.value = src.getAttribute('data-default') || '';
      }
    });
    /** 지금 화면의 그래프 구성 + 지표정보(저장하기 · 미리보기 공통). */
    function collect() {
      var body = { graphs: list().map(function (tr) {
          var sn = tr.getAttribute('data-sn');
          return {
            grphSn: sn ? parseInt(sn, 10) : null,
            typeCd: tr.querySelector('[name="typeCd"]').value,
            basic: tr.querySelector('[name="basic"]').checked
          };
        }) };
      body.marks = phraseValues(root, 'marks');
      body.notes = phraseValues(root, 'notes');
      var src = root.querySelector('[data-ts-source]');
      body.source = src ? src.value : null;
      return body;
    }

    /* 03 미리보기 — 구성·지표정보를 바꾸면 저장 전 값으로 다시 그린다(설계서 0502-03, 0503 과 같은 본문 조각).
       미리보기 안의 그래프 고르기·조회 연도·특성별 조회도 같은 요청에 조건(g·f·path·y)을 실어 다시 그린다. */
    var pv = root.querySelector('[data-ts-graph-pv]');
    var pvTimer = null;
    var pvSeq = 0;
    function pvCond(extra) {
      var c = { g: null, f: null, path: null, y: null };
      if (!pv) { return c; }
      var on = pv.querySelector('button[name="g"][aria-pressed="true"]');
      var y = pv.querySelector('#sd_ts_pv_year');
      var f = pv.querySelector('#sd_ts_pv_feature');
      var path = pv.querySelector('input[name="path"]:checked');
      c.g = on ? on.value : null;
      c.y = y ? y.value : null;
      c.f = f ? f.value : null;
      c.path = path ? path.value : null;
      Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; });
      return c;
    }
    function refreshPreview(extra) {
      if (!pv) { return; }
      var c = pvCond(extra);
      var seq = ++pvSeq;
      send(root, 'POST', '/ts/graphs/' + encodeURIComponent(id) + '/preview',
        { draft: collect(), g: c.g, f: c.f, path: c.path, y: c.y })
        .then(function (r) {
          if (seq !== pvSeq || !r.ok || !r.data) { return; }   // 늦게 온 이전 응답은 버린다
          if (window.CmChart) {   // 미리보기 칸 안의 그래프 정리 뒤 바꿔 넣기
            var cs = window.CmChart.charts;
            for (var i = cs.length - 1; i >= 0; i--) {
              if (pv.contains(cs[i].el)) { try { cs[i].dispose(); } catch (e) { /* 이미 떨어진 그래프 */ } cs.splice(i, 1); }
            }
          }
          pv.innerHTML = r.data.html;   // 서버 템플릿이 만든(값은 이스케이프된) 조각
          bindPreview();
          if (window.CmChart) { window.CmChart.init(); }
        })
        .catch(function () { /* 미리보기 실패는 편집을 막지 않는다 */ });
    }
    function schedulePreview() {
      clearTimeout(pvTimer);
      pvTimer = setTimeout(function () { refreshPreview(); }, 400);
    }
    function bindPreview() {
      if (!pv) { return; }
      pv.querySelectorAll('[data-ts-pv-submit]').forEach(function (b) { b.remove(); });
      var form = pv.querySelector('#sd_ts_pv_form');
      if (form) { form.addEventListener('submit', function (event) { event.preventDefault(); }); }
      pv.querySelectorAll('button[name="g"]').forEach(function (b) {
        b.addEventListener('click', function (event) {
          event.preventDefault();
          refreshPreview({ g: b.value, f: null, path: null, y: null });   // 탭을 바꾸면 그 그래프 기본 조건(설계서 0503-02)
        });
      });
      pv.querySelectorAll('[data-ts-pv-auto]').forEach(function (el) {
        el.addEventListener('change', function () { refreshPreview(el.id === 'sd_ts_pv_feature' ? { path: null } : null); });
      });
    }
    root.addEventListener('change', function (event) {
      if (!pv || !pv.contains(event.target)) { schedulePreview(); }
    });
    root.addEventListener('input', function (event) {
      if (event.target.closest('[data-ts-phrases] textarea, [data-ts-source]')) { schedulePreview(); }
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.closest('[data-ts-phrase-new]')) { schedulePreview(); }   // Enter 로 문구 추가
    });
    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-ts-graph-up], [data-ts-graph-down], [data-ts-graph-remove], [data-ts-graph-add],'
          + ' [data-ts-phrase-remove], [data-ts-phrase-add], [data-ts-phrase-reset], [data-ts-source-reset]')) { schedulePreview(); }
    });

    /** 저장하기 — 그래프 구성 + 지표정보. 결과(ok·data)를 돌려준다(검증에 걸리면 알림을 띄우고 ok=false). */
    function saveAll(button) {
      showAlert(root, '');
      var body = collect();
      button.disabled = true;
      return send(root, 'PUT', '/ts/graphs/' + encodeURIComponent(id), body)
        .then(function (result) {
          if (!result.ok) { showAlert(root, failureMessage(result, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')); }
          return result;
        })
        .catch(function () { showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); return null; })
        .then(function (result) { button.disabled = false; return result; });
    }
    root.querySelectorAll('[data-ts-phrases]').forEach(initPhrases);
    bindPreview();
    draw();
  }

  // 사용자 화면 미리보기(adm_0503) — 조건(g·f·path·y)은 GET 폼이라 JS 없이 「조회」로 동작. JS 가 있으면 바꾸면 바로 조회
  function initGraphPreview(root) {
    var form = root.querySelector('#sd_ts_pv_form');
    if (!form) { return; }
    root.querySelectorAll('[data-ts-pv-submit]').forEach(function (b) { b.remove(); });
    root.querySelectorAll('[data-ts-pv-auto]').forEach(function (el) {
      el.addEventListener('change', function () { form.submit(); });
    });
  }

  function init() {
    // 콘솔 조각 정화기가 form 의 novalidate 를 지운다 — 브라우저 기본 검사(영문 말풍선) 대신 서버 검증 문구를 쓰도록 되살린다
    document.querySelectorAll('[data-sedis-screen^="ts-"] form').forEach(function (f) { f.noValidate = true; });
    document.querySelectorAll('[data-sedis-screen="ts-source-list"]').forEach(initSourceList);
    document.querySelectorAll('[data-sedis-screen="ts-source-new"]').forEach(initSourceNew);
    document.querySelectorAll('[data-sedis-screen="ts-source-detail"]').forEach(initSourceDetail);
    document.querySelectorAll('[data-sedis-screen="ts-group-list"]').forEach(bindGroupDelete);
    document.querySelectorAll('[data-sedis-screen="ts-group-form"]').forEach(initGroupForm);
    document.querySelectorAll('[data-sedis-screen="ts-topic-list"]').forEach(bindTopicDelete);
    document.querySelectorAll('[data-sedis-screen="ts-topic-form"]').forEach(initTopicForm);
    document.querySelectorAll('[data-sedis-screen="ts-label-list"]').forEach(bindLabelDelete);
    document.querySelectorAll('[data-sedis-screen="ts-label-form"]').forEach(initLabelForm);
    document.querySelectorAll('[data-sedis-screen="ts-intg-list"]').forEach(initIntgList);
    document.querySelectorAll('[data-sedis-screen="ts-intg-form"]').forEach(initIntgForm);
    document.querySelectorAll('[data-sedis-screen="ts-graph-form"]').forEach(initGraphForm);
    document.querySelectorAll('[data-sedis-screen="ts-graph-preview"]').forEach(initGraphPreview);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
