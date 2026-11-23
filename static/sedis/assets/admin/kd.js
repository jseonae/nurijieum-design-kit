/*
 * 핵심데이터 시각화 관리(adm_0801~) 화면 스크립트 — 누리지음 콘솔 안 조각에서 돈다(연결 서비스 계약 v1 §4).
 *  - API 기준: 조각 루트의 data-api(문맥 apiBase, 예: /api/console-9f3a/v1/svc/sedis), 없으면 <meta name="cms-svc-api">.
 *  - CSRF: 콘솔 페이지 <meta name="_csrf">(헤더 이름 <meta name="_csrf_header">, 기본 X-CSRF-Token).
 *  - 저장·삭제 뒤 이동: 조각 루트의 data-list-href(문맥 mount 로 만든 목록 주소) + done=created|updated|deleted|copied.
 *  - 오류 본문은 {code, message, errors:[{field, message}]} (dev_guide §7-2). 값은 textContent 로만 넣는다.
 *  - 화면마다 조각 루트의 data-sedis-screen 으로 나눈다(kd-group-* · kd-sttbl-*).
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
    var box = root.querySelector('[data-kd-error]');
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
        if (!first && !input.disabled) { first = input; }
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

  /** 목록으로. {@code params} 는 더 붙일 조건(예: 저장한 그룹의 조사연도 — 목록이 그 연도를 연다). */
  function goList(root, done, params) {
    var href = root.getAttribute('data-list-href');
    var query = [];
    Object.keys(params || {}).forEach(function (k) {
      if (params[k]) { query.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); }
    });
    query.push('done=' + encodeURIComponent(done));
    window.location.assign(href + (href.indexOf('?') < 0 ? '?' : '&') + query.join('&'));
  }

  /** 입력값 → 숫자. 비었거나 숫자가 아니면 null(서버가 기본값을 쓴다). */
  function intOrNull(value) {
    var v = String(value || '').trim();
    return /^-?\d+$/.test(v) ? parseInt(v, 10) : null;
  }

  /* ── 데이터 그룹 삭제(목록·수정 화면 공통) ── */
  function bindGroupDelete(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-kd-group-delete]');
      if (!button || button.disabled) { return; }
      if (button.getAttribute('data-blocked') === 'Y') {   // 서버도 같은 문구로 막는다(409)
        showAlert(root, '이 그룹에 속한 통계표가 있어 삭제할 수 없습니다');
        return;
      }
      var name = button.getAttribute('data-name') || '';
      if (!window.confirm('데이터 그룹 「' + name + '」을(를) 삭제할까요?')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'DELETE', '/kd/groups/' + encodeURIComponent(button.getAttribute('data-id')))
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

  /* ── 직전 연도 데이터 그룹 불러오기(adm_0801-03) ── */
  function bindGroupCopy(root) {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-kd-group-copy]');
      if (!button || button.disabled) { return; }
      var from = button.getAttribute('data-from');
      var to = button.getAttribute('data-to');
      var count = button.getAttribute('data-count');
      if (!window.confirm(from + '년 데이터 그룹 ' + count + '개를 ' + to + '년으로 불러올까요? 통계표는 불러오지 않습니다.')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'POST', '/kd/groups/copy', { fromYr: from, toYr: to })
        .then(function (result) {
          if (result.ok) {
            goList(root, 'copied');
            return;
          }
          showAlert(root, failureMessage(result, '불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          button.disabled = false;
        })
        .catch(function () {
          showAlert(root, '불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
          button.disabled = false;
        });
    });
  }

  /*
   * 고른 조사연도는 데이터 그룹·통계표 목록이 함께 쓴다(adm_0801-02). 콘솔 메뉴 링크에는 조건이 없으므로, 목록이 주소에 조사연도가 있으면
   * 기억하고(sessionStorage — 이 탭 동안), 없이 열렸는데 기억한 연도가 다르면 그 연도로 다시 연다.
   */
  var YEAR_KEY = 'sedis.kd.exmnYr';

  function keepYear(root) {
    var current = root.getAttribute('data-kd-year');
    var stored = null;
    try {
      if (root.getAttribute('data-kd-year-explicit') === 'Y') {
        window.sessionStorage.setItem(YEAR_KEY, current);
        return;
      }
      stored = window.sessionStorage.getItem(YEAR_KEY);
    } catch (e) {
      return;   // 저장소를 쓸 수 없으면 기본 연도 그대로
    }
    if (stored && stored !== current && /^(\d{4}|all)$/.test(stored)) {
      var url = new URL(window.location.href);
      url.searchParams.set('exmnYr', stored);
      url.searchParams.delete('page');
      url.searchParams.delete('dataGroupId');
      window.location.replace(url.toString());
    }
  }

  function initGroupList(root) {
    keepYear(root);
    bindGroupDelete(root);
    bindGroupCopy(root);
  }

  /* ── 통계표 목록(adm_0901): 삭제·선택삭제 ── */
  function initSttblList(root) {
    keepYear(root);
    root.addEventListener('click', function (event) {
      var one = event.target.closest('[data-kd-sttbl-delete]');
      var bulk = event.target.closest('[data-kd-sttbl-delete-selected]');
      var button = one || bulk;
      if (!button || button.disabled) { return; }
      var ids = one ? [one.getAttribute('data-id')]
        : Array.prototype.map.call(root.querySelectorAll('[data-select-row]:checked'), function (b) { return b.value; });
      if (!ids.length) { return; }
      var question = one ? '통계표 「' + (one.getAttribute('data-name') || '') + '」을(를) 삭제할까요?'
        : '선택한 통계표 ' + ids.length + '개를 삭제할까요?';
      if (!window.confirm(question + '\n올린 통계표 파일도 함께 지워지고 되돌릴 수 없습니다.')) { return; }
      button.disabled = true;
      showAlert(root, '');
      send(root, 'POST', '/kd/sttbls/delete', { sttblIds: ids })
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
    var form = root.querySelector('[data-kd-group-form]');
    if (!form) { return; }
    var id = root.getAttribute('data-id');
    var creating = !id;
    var year = form.querySelector('[name="exmnYr"]');
    var code = form.querySelector('[name="dataGroupCd"]');
    var seq = form.querySelector('[name="expsrSeq"]');
    var seqHint = form.querySelector('[data-kd-seq-hint]');
    var startYear = year.value;
    var busy = false;

    /*
     * 그룹 코드를 「조사연도_약어」로 맞춘다(adm_0802-02). 앞의 연도·구분자를 떼고 새 연도를 붙인다.
     * 2023_CAREER → 2026_CAREER · 2023CAREER → 2026_CAREER · 2023 → 2026_ · CAREER → 2026_CAREER · 빈칸 → 2026_
     */
    function codeForYear(yr, value) {
      var rest = String(value || '').trim().replace(/^(?:19|20)\d{2}/, '').replace(/^_+/, '');
      return yr + '_' + rest;
    }

    /* 조사연도를 바꾸면 그룹 코드를 그 연도로 맞추고(adm_0802-02), 노출순서 범위를 그 연도 기준으로 맞춘다(신규는 기본값 = 마지막) */
    year.addEventListener('change', function () {
      code.value = codeForYear(year.value, code.value);
      var option = year.options[year.selectedIndex];
      var count = parseInt(option.getAttribute('data-count') || '0', 10);
      var max = creating || year.value !== startYear ? count + 1 : count;
      seq.max = String(max);
      if (creating || year.value !== startYear) { seq.value = String(max); }
      if (seqHint) {
        seqHint.textContent = '같은 조사연도 안에서 1부터 차례로 순번 지정(1~' + max + ') · 저장하면 차례대로 순서가 매겨집니다';
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      var actvtn = form.querySelector('[name="actvtnYn"]');
      var body = {
        exmnYr: year.value,
        dataGroupNm: form.querySelector('[name="dataGroupNm"]').value,
        dataGroupCd: code.value,
        expsrSeq: intOrNull(seq.value),
        actvtnYn: actvtn && actvtn.checked ? 'Y' : 'N'
      };
      var submit = root.querySelector('button[type="submit"]');   // 편집 머리의 단추(form= 로 폼에 묶임)
      busy = true;
      if (submit) { submit.disabled = true; }
      send(root, creating ? 'POST' : 'PUT', '/kd/groups' + (creating ? '' : '/' + encodeURIComponent(id)), body)
        .then(function (result) {
          if (result.ok) {
            goList(root, creating ? 'created' : 'updated', { exmnYr: body.exmnYr });
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

  /* ── 통계표 등록·수정(adm_0902) ─────────────────────────────────────── */
  var GSEP = ' — ';

  /** multipart 요청(파일 + form JSON). Content-Type 은 브라우저가 경계값과 함께 정한다. */
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

  /** 값 표기 → 수(쉼표·% 제거). 형식이 아니면 null(서버 KdCsvReader.number 와 같은 규칙). */
  function num(v) {
    var s = String(v == null ? '' : v).trim();
    if (!/^[+-]?[0-9]+(,[0-9]+)*(\.[0-9]+)?%?$/.test(s)) { return null; }
    return parseFloat(s.replace(/,/g, '').replace('%', ''));
  }

  /** 대표 응답 추천 — 첫 값 열 최댓값 행, 콤보형(모든 행 「앞머리 — 응답」·앞머리 2개 이상)은 둘째 묶음에서(서버 KdCsvReader.card 와 같다). */
  function autoCard(rows) {
    var heads = [];
    var prefixed = rows.length > 0;
    rows.forEach(function (r) {
      var i = String(r[0]).indexOf(GSEP);
      if (i < 0) { prefixed = false; } else if (heads.indexOf(r[0].slice(0, i)) < 0) { heads.push(r[0].slice(0, i)); }
    });
    var gate = prefixed && heads.length >= 2;
    var best = null;
    var name = '';
    rows.forEach(function (r) {
      var se = r[0];
      if (gate) {
        if (se.indexOf(heads[1] + GSEP) !== 0) { return; }
        se = se.slice(heads[1].length + GSEP.length);
      }
      var v = num(r[1]);
      if (v != null && (best == null || v > best)) { best = v; name = se; }
    });
    return best == null ? { name: '', value: '' } : { name: name, value: best.toFixed(1) + '%' };
  }

  /*
   * 모집단 줄 — 「43,723명 · 특수학교 교사 293명」 글자 ↔ [{g, n, u, t}](g 조사대상 · n 수 · u 단위(명/건) · t 괄호 설명). 프로토타입 popParse·popFormat.
   * 조사대상 없이 숫자만이면 「전체」, 「특수학교 관리자 259명 · 교사 977명」처럼 줄여 쓴 집단은 앞 학교 유형을 붙여 푼다.
   * 저장값은 줄을 고쳤을 때만 다시 만든다 — 열어 보기만 하면 기존 표기 그대로.
   */
  function popParse(s) {
    var out = [];
    var pre = '';
    String(s || '').split(/\s*[·\/]\s*/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) {
      var m = x.match(/^(.*?)\s*([\d,]+)\s*(명|건)?\s*(\(.*\))?$/);
      if (!m) { out.push({ g: x, n: '', u: '명', t: '' }); return; }
      var g = (m[1] || '').trim();
      var pm = g.match(/^(특수학교|특수학급|특수교육지원센터|일반학교)(\s|$)/);
      if (pm) { pre = pm[1]; } else if (/^(관리자|교사)$/.test(g) && pre) { g = pre + ' ' + g; }
      out.push({ g: g || '전체', n: m[2].replace(/,/g, ''), u: m[3] || '명', t: m[4] || '' });
    });
    return out;
  }

  function popFormat(rows) {
    return rows.filter(function (r) { return r.n !== ''; }).map(function (r) {
      return (r.g && r.g !== '전체' ? r.g + ' ' : '') + Number(r.n).toLocaleString('ko-KR') + (r.u || '명') + (r.t || '');
    }).join(' · ');
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  /* 범례는 표시만(설계서 v1.4.12 adm_0902-03) — 미리보기 칸 안 범례 누름을 막는다(사용자 화면 kd-detail.js 와 같은 방식) */
  function blockLegend(scope) {
    scope.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('.cm-chart-legend-item, .cm-chart-legend-all')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
    var mark = function () {
      scope.querySelectorAll('.cm-chart-legend-item').forEach(function (b) {
        b.removeAttribute('aria-pressed');
        b.setAttribute('aria-disabled', 'true');
        b.setAttribute('tabindex', '-1');
      });
      scope.querySelectorAll('.cm-chart-legend-all').forEach(function (b) { b.remove(); });
    };
    new MutationObserver(mark).observe(scope, { childList: true, subtree: true });
  }

  function initSttblForm(root) {
    var form = root.querySelector('[data-kd-sttbl-form]');
    if (!form) { return; }
    var data = {};
    try { data = JSON.parse(root.getAttribute('data-kd-data') || '{}'); } catch (e) { data = {}; }
    var id = root.getAttribute('data-id');
    var creating = !id;
    var table = data.table || { cols: [], rows: [] };
    var file = null;
    var busy = false;
    var startGroup = form.querySelector('[name="dataGroupId"]').value;
    var q = function (sel) { return root.querySelector(sel); };
    var field = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var yearSel = field('exmnYr');
    var groupSel = field('dataGroupId');
    var seq = field('expsrSeq');
    var pv = q('[data-kd-pv]');
    var termsBox = q('[data-kd-terms]');
    var tags = q('[data-kd-tags]');
    var tagSel = q('[data-kd-target-select]');
    var popBox = q('[data-kd-pop]');
    var popValue = q('[data-kd-pop-value]');
    var popRows = null;
    var pvTimer = null;
    var pvSeq = 0;
    var lastYear = yearSel.value;
    if (pv) { blockLegend(pv); }

    function type() {
      var r = form.querySelector('[name="grphTypeCd"]:checked');
      return r ? r.value : '';
    }
    function status() {
      var r = form.querySelector('[name="pstgSttsCd"]:checked');
      return r ? r.value : 'DRAFT';
    }
    function targets() {
      return Array.prototype.map.call(tags.querySelectorAll('[data-kd-tag]'), function (b) { return b.getAttribute('data-value'); });
    }
    function group() {
      return ((data.groups || {})[yearSel.value] || []).filter(function (g) { return g.id === groupSel.value; })[0] || null;
    }
    function collect() {
      return {
        exmnYr: yearSel.value, dataGroupId: groupSel.value, sttblNm: field('sttblNm').value, grphTypeCd: type(),
        lfsdTtl: field('lfsdTtl').value, lfsdRspnsCnt: field('lfsdRspnsCnt').value, rgsdTtl: field('rgsdTtl').value,
        rgsdRspnsCnt: field('rgsdRspnsCnt').value, dataExpln: field('dataExpln').value, targets: targets(),
        poplMarkNm: popValue.value, srcNm: field('srcNm').value, orgtxtPstnNm: field('orgtxtPstnNm').value,
        idctExpln: field('idctExpln').value, rprsRspnsNm: field('rprsRspnsNm').value, rprsRspnsNvl: field('rprsRspnsNvl').value,
        pstgSttsCd: status(), expsrSeq: intOrNull(seq.value)
      };
    }
    function formData(withFile) {
      var fd = new FormData();
      fd.append('form', JSON.stringify(collect()));
      if (withFile && file) { fd.append('file', file, file.name); }
      if (!creating) { fd.append('sttblId', id); }
      return fd;
    }

    /* ① 통계표 업로드 — 서버 판독(저장 없음). 오류면 지금 표를 그대로 둔다 */
    function showFileErrors(errors) {
      var box = q('[data-kd-file-errors]');
      box.textContent = '';
      if (errors && errors.length) {
        box.appendChild(el('b', null, '올린 파일을 적용하지 않았습니다'));
        var ul = el('ul', 'sd-kd-errlist');
        errors.forEach(function (e) { ul.appendChild(el('li', null, e)); });
        box.appendChild(ul);
      }
      box.hidden = !(errors && errors.length);
    }
    function drawTable() {
      var box = q('[data-kd-table]');
      box.textContent = '';
      if (!table.rows.length) { box.appendChild(el('p', 'sd-kd-dim', '올린 통계표가 없습니다')); return; }
      var wrap = el('div', 'nv-table-scroll');
      // 2026-11-23: 표 스크롤 상자에 tabindex 를 강제로 주지 않는다
      var t = el('table', 'nv-table sd-kd-data');
      var cap = el('caption', 'nv-sr-only', '올린 통계표');
      t.appendChild(cap);
      var thead = el('thead');
      var hr = el('tr');
      table.cols.forEach(function (c, i) { var th = el('th', i ? 'col-num' : null, c); th.scope = 'col'; hr.appendChild(th); });
      thead.appendChild(hr);
      t.appendChild(thead);
      var tb = el('tbody');
      table.rows.forEach(function (r) {
        var tr = el('tr');
        r.forEach(function (v, i) { tr.appendChild(el('td', i ? 'col-num' : null, v)); });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      wrap.appendChild(t);
      box.appendChild(wrap);
    }
    q('[data-kd-file]').addEventListener('change', function (event) {
      var f = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!f) { return; }
      var fd = new FormData();
      fd.append('file', f, f.name);
      showAlert(root, '');
      sendForm(root, '/kd/sttbls/parse', fd).then(function (r) {
        if (!r.ok || !r.data) {
          showFileErrors([failureMessage(r, '파일을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.')]);
          return;
        }
        if (!r.data.ok) { showFileErrors(r.data.errors); return; }
        if (table.rows.length && !window.confirm('지금 통계표를 올린 파일로 바꿀까요?')) { return; }
        showFileErrors(null);
        file = f;
        table = { cols: r.data.cols, rows: r.data.rows };
        showTypeAlert('');
        q('[data-kd-file-name]').textContent = f.name;
        var hint = q('[data-kd-file-hint]');
        if (hint) { hint.hidden = true; }
        q('[data-kd-file-btn]').textContent = '다시 올리기';
        if (!field('rprsRspnsNm').value.trim()) {
          field('rprsRspnsNm').value = r.data.cardName || '';
          field('rprsRspnsNvl').value = r.data.cardValue || '';
        }
        drawTable();
        drawFixedNote();
        pubCheck();
        schedulePreview();
      }).catch(function () { showFileErrors(['파일을 읽지 못했습니다. 네트워크 연결을 확인해 주세요.']); });
    });

    /* ② 그래프 형태 — 선택은 담당자 판단(13종). 확정 그래프에서 유형을 바꾸면 되돌리기 안내 */
    function drawFixedNote() {
      var note = q('[data-kd-fixed-note]');
      note.hidden = !(data.fixed && !file && data.origType && type() && type() !== data.origType);
    }
    function showTypeAlert(message) {
      var box = q('[data-kd-type-error]');
      box.querySelector('div').textContent = message || '';
      box.hidden = !message;
      if (message) {
        box.setAttribute('tabindex', '-1');
        box.focus();
      }
    }
    function onType(event) {
      if (!table.rows.length) {
        if (event && event.target) { event.target.checked = false; }
        showTypeAlert('통계표를 먼저 업로드하세요.');
        q('[data-kd-combo]').hidden = true;
        pubCheck();
        return;
      }
      showTypeAlert('');
      q('[data-kd-combo]').hidden = !(type() === '4' || type() === '4-1');
      drawFixedNote();
      pubCheck();
      schedulePreview();
    }
    form.querySelectorAll('[name="grphTypeCd"]').forEach(function (r) { r.addEventListener('change', onType); });
    q('[data-kd-type-revert]').addEventListener('click', function () {
      var r = form.querySelector('[name="grphTypeCd"][value="' + data.origType + '"]');
      if (r) { r.checked = true; onType(); }
    });
    ['lfsdTtl', 'lfsdRspnsCnt', 'rgsdTtl', 'rgsdRspnsCnt', 'sttblNm'].forEach(function (n) { field(n).addEventListener('input', schedulePreview); });

    /* 미리보기 — 사용자 화면과 같은 렌더(서버 조각). 늦게 온 이전 응답은 버린다 */
    function refreshPreview() {
      var seqNo = ++pvSeq;
      sendForm(root, '/kd/sttbls/preview', formData(true)).then(function (r) {
        if (seqNo !== pvSeq || !r.ok || !r.data || r.data.html == null) { return; }
        var tmp = document.createElement('div');
        tmp.innerHTML = r.data.html;   // 서버 템플릿이 만든(값은 이스케이프된) 조각
        if (window.CmChart) {
          var cs = window.CmChart.charts || [];
          for (var i = cs.length - 1; i >= 0; i--) {
            if (pv.contains(cs[i].el)) { try { cs[i].dispose(); } catch (e) { /* 이미 떨어진 그래프 */ } cs.splice(i, 1); }
          }
        }
        var chart = tmp.querySelector('[data-kd-pv-chart]');
        var terms = tmp.querySelector('[data-kd-pv-terms]');
        pv.textContent = '';
        if (chart) { pv.appendChild(chart); }
        termsBox.textContent = '';
        if (terms) { termsBox.appendChild(terms); }
        if (window.CmChart) { window.CmChart.init(); }
      }).catch(function () { /* 미리보기 실패는 편집을 막지 않는다 */ });
    }
    function schedulePreview() {
      clearTimeout(pvTimer);
      pvTimer = setTimeout(refreshPreview, 400);
    }

    /* 조사연도 · 데이터 그룹 — 연도를 바꾸면 그 연도 그룹으로, 출처가 기본값이면 새 연도 기본 출처로(adm_0902-05) */
    function drawGroups() {
      var gs = (data.groups || {})[yearSel.value] || [];
      var keep = groupSel.value;
      groupSel.textContent = '';
      if (!gs.length) { groupSel.appendChild(new Option('이 연도에 데이터 그룹이 없습니다', '')); }
      gs.forEach(function (g) { groupSel.appendChild(new Option(g.active ? g.name : g.name + ' (비활성)', g.id)); });
      if (gs.some(function (g) { return g.id === keep; })) { groupSel.value = keep; }
    }
    function drawSeqHint(reset) {
      var g = group();
      var mine = !creating && groupSel.value === startGroup;
      var max = (g ? g.count : 0) + (mine ? 0 : 1);
      seq.max = String(Math.max(1, max));
      if (reset && !mine) { seq.value = String(Math.max(1, max)); }
      q('[data-kd-seq-hint]').textContent = '같은 데이터 그룹 내 1부터 차례로 순번 지정(1~' + Math.max(1, max) + ') · 저장하면 차례대로 순서 매겨짐';
    }
    yearSel.addEventListener('change', function () {
      var src = field('srcNm');
      var oldDefault = (data.sources || {})[lastYear] || '';
      if (!src.value.trim() || src.value.trim() === oldDefault) { src.value = (data.sources || {})[yearSel.value] || ''; }
      lastYear = yearSel.value;
      q('[data-kd-src-year]').textContent = yearSel.value;
      q('[data-kd-pop-year]').textContent = yearSel.value;
      drawGroups();
      drawSeqHint(true);
      pubCheck();
      schedulePreview();
    });
    groupSel.addEventListener('change', function () { drawSeqHint(true); pubCheck(); });
    q('[data-kd-src-default]').addEventListener('click', function () { field('srcNm').value = (data.sources || {})[yearSel.value] || ''; pubCheck(); });
    q('[data-kd-note-default]').addEventListener('click', function () { field('idctExpln').value = data.note || ''; });
    q('[data-kd-card-auto]').addEventListener('click', function () {
      var c = autoCard(table.rows);
      field('rprsRspnsNm').value = c.name;
      field('rprsRspnsNvl').value = c.value;
    });
    field('srcNm').addEventListener('input', pubCheck);
    form.querySelectorAll('[name="pstgSttsCd"]').forEach(function (r) { r.addEventListener('change', pubCheck); });

    /* 조사대상 — 선택 상자 + 「#새 키워드」 Enter, 태그의 × 를 누르면 뺀다. 새 키워드는 저장할 때 등록된다 */
    function syncTargets() {
      var now = targets();
      Array.prototype.forEach.call(tagSel.options, function (o) { if (o.value) { o.disabled = now.indexOf(o.value) >= 0; } });
      q('[data-kd-tags-empty]').hidden = now.length > 0;
    }
    function addTarget(v) {
      v = String(v || '').replace(/^#+/, '').trim();
      if (!v) { return; }
      if (targets().some(function (t) { return t.replace(/\s+/g, '') === v.replace(/\s+/g, ''); })) {
        showAlert(root, '이미 넣은 조사대상입니다');
        return;
      }
      var li = el('li');
      var tag = el('span', 'nv-tag', '#' + v);
      tag.setAttribute('data-kd-tag', '');
      tag.setAttribute('data-value', v);
      var b = el('button', null, '×');
      b.type = 'button';
      b.setAttribute('data-kd-tag-remove', '');
      b.setAttribute('aria-label', '조사대상 ' + v + ' 빼기');
      tag.appendChild(b);
      li.appendChild(tag);
      tags.appendChild(li);
      syncTargets();
      drawPop();
    }
    tagSel.addEventListener('change', function () { addTarget(tagSel.value); tagSel.value = ''; });
    q('[data-kd-target-new]').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); addTarget(event.target.value); event.target.value = ''; }
    });
    tags.addEventListener('click', function (event) {
      var b = event.target.closest('[data-kd-tag-remove]');
      if (!b) { return; }
      b.closest('li').remove();
      syncTargets();
      drawPop();
      tagSel.focus();   // 누른 단추가 사라지므로 키보드 위치를 선택 상자로 옮긴다
    });

    /* 모집단 줄 */
    function popSync() {
      popValue.value = popFormat(popRows);
      q('[data-kd-pop-preview]').textContent = popValue.value || '—';
    }
    function drawPop() {
      if (!popRows) { popRows = popParse(popValue.value); }
      if (!popRows.length) { popRows = [{ g: '전체', n: '', u: '명', t: '' }]; }
      var opts = ['전체'];
      Array.prototype.forEach.call(tagSel.options, function (o) { if (o.value && opts.indexOf(o.value) < 0) { opts.push(o.value); } });
      targets().forEach(function (t) { if (opts.indexOf(t) < 0) { opts.push(t); } });
      popBox.textContent = '';
      popRows.forEach(function (r, i) {
        var row = el('div', 'sd-kd-row-inline sd-kd-pop__row');
        var sel = el('select', 'nv-select');
        sel.setAttribute('aria-label', '모집단 ' + (i + 1) + ' 조사대상');
        opts.concat(r.g && opts.indexOf(r.g) < 0 ? [r.g] : []).forEach(function (o) {
          var op = new Option(o, o);
          op.selected = o === r.g;
          sel.appendChild(op);
        });
        sel.addEventListener('change', function () { r.g = sel.value; popSync(); });
        var inp = el('input', 'nv-input sd-kd-input-num');
        inp.inputMode = 'numeric';
        inp.placeholder = '수';
        inp.setAttribute('aria-label', '모집단 ' + (i + 1) + ' 수');
        inp.value = r.n ? Number(r.n).toLocaleString('ko-KR') : '';
        inp.addEventListener('input', function () { r.n = inp.value.replace(/[^\d]/g, ''); popSync(); });
        var unit = el('span', 'sd-kd-dim', (r.u || '명') + (r.t ? ' ' + r.t : ''));
        var del = el('button', 'nv-btn nv-btn--icon nv-btn--sm', '✕');
        del.type = 'button';
        del.setAttribute('aria-label', '모집단 ' + (i + 1) + ' 줄 삭제');
        del.addEventListener('click', function () {
          popRows.splice(i, 1);
          drawPop();
          popSync();
        });
        row.appendChild(sel);
        row.appendChild(inp);
        row.appendChild(unit);
        row.appendChild(del);
        popBox.appendChild(row);
      });
    }
    q('[data-kd-pop-add]').addEventListener('click', function () {
      var used = popRows.map(function (r) { return r.g; });
      var next = targets().filter(function (t) { return used.indexOf(t) < 0; })[0] || '전체';
      popRows.push({ g: next, n: '', u: '명', t: '' });
      drawPop();
    });

    /* 게시 조건 — 「게시」를 고르면 빠진 항목을 알린다(저장은 서버가 같은 규칙으로 막는다) */
    function pubCheck() {
      var box = q('[data-kd-pub-msg]');
      if (status() !== 'PUBLISHED') { box.hidden = true; return; }
      var miss = [];
      if (!field('sttblNm').value.trim()) { miss.push('통계표명'); }
      var g = group();
      if (!g) { miss.push('데이터 그룹'); } else if (!g.active) { miss.push('활성 데이터 그룹'); }
      if (!table.rows.length) { miss.push('통계표 업로드'); }
      if (!type()) { miss.push('그래프 유형'); }
      if (!field('srcNm').value.trim()) { miss.push('출처'); }
      box.textContent = miss.length ? '게시하려면 필요: ' + miss.join(' · ') : '';
      box.hidden = !miss.length;
    }
    field('sttblNm').addEventListener('input', pubCheck);

    /* 저장 */
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) { return; }
      clearFieldErrors(form);
      showAlert(root, '');
      showFileErrors(null);
      var submit = root.querySelector('button[type="submit"]');
      busy = true;
      if (submit) { submit.disabled = true; }
      var fd = formData(true);
      fd.delete('sttblId');
      sendForm(root, creating ? '/kd/sttbls' : '/kd/sttbls/' + encodeURIComponent(id), fd)
        .then(function (r) {
          if (r.ok && r.data && r.data.sttblId) {
            var href = root.getAttribute('data-list-href');
            window.location.assign(href + '/' + encodeURIComponent(r.data.sttblId) + '?done=' + (creating ? 'created' : 'updated'));
            return;
          }
          var errs = (r.data && r.data.errors) || [];
          var fileErrs = errs.filter(function (e) { return e.field === 'file'; }).map(function (e) { return e.message; });
          if (fileErrs.length) { showFileErrors(fileErrs); }
          var first = showFieldErrors(form, errs.filter(function (e) { return e.field !== 'file'; }));
          showAlert(root, failureMessage(r, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          if (first) { first.focus(); }
        })
        .catch(function () { showAlert(root, '저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); })
        .then(function () {
          busy = false;
          if (submit) { submit.disabled = false; }
        });
    });

    /* 삭제(수정 화면) */
    root.addEventListener('click', function (event) {
      var b = event.target.closest('[data-kd-sttbl-delete]');
      if (!b || b.disabled) { return; }
      if (!window.confirm('통계표 「' + (b.getAttribute('data-name') || '') + '」을(를) 삭제할까요?\n올린 통계표 파일도 함께 지워지고 되돌릴 수 없습니다.')) { return; }
      b.disabled = true;
      send(root, 'POST', '/kd/sttbls/delete', { sttblIds: [b.getAttribute('data-id')] }).then(function (r) {
        if (r.ok) { goList(root, 'deleted', { exmnYr: yearSel.value }); return; }
        showAlert(root, failureMessage(r, '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
        b.disabled = false;
      }).catch(function () { showAlert(root, '삭제하지 못했습니다. 네트워크 연결을 확인해 주세요.'); b.disabled = false; });
    });

    syncTargets();
    drawPop();
    drawSeqHint(false);
    pubCheck();
    refreshPreview();
  }

  /* ── 사용자 화면 미리보기(adm_0903) — 용어해설 조각을 맨 아래 칸으로, 범례는 표시만 ── */
  function initSttblView(root) {
    blockLegend(root);
    var terms = root.querySelector('[data-kd-pv-terms]');
    var slot = root.querySelector('[data-kd-view-terms]');
    if (terms && slot) { slot.appendChild(terms); }
  }

  function init() {
    // 콘솔 조각 정화기가 form 의 novalidate 를 지운다 — 브라우저 기본 검사(영문 말풍선) 대신 서버 검증 문구를 쓰도록 되살린다
    document.querySelectorAll('[data-sedis-screen^="kd-"] form').forEach(function (f) { f.noValidate = true; });
    document.querySelectorAll('[data-sedis-screen="kd-group-list"]').forEach(initGroupList);
    document.querySelectorAll('[data-sedis-screen="kd-group-form"]').forEach(initGroupForm);
    document.querySelectorAll('[data-sedis-screen="kd-sttbl-list"]').forEach(initSttblList);
    document.querySelectorAll('[data-sedis-screen="kd-sttbl-form"]').forEach(initSttblForm);
    document.querySelectorAll('[data-sedis-screen="kd-sttbl-view"]').forEach(initSttblView);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
