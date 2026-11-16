/* 점검 · 사용 설명서(qa-guide.html).
 * 설명서 ↔ 점검 전환, 점검자(이 브라우저에 기억), 흐름마다 결과 — 화면 가운데에 들어온 흐름(또는 누른 흐름)만 결과 단추가 켜진다.
 * 결과는 localStorage(회차 · 점검자별)에 먼저 남기고 서버로 보낸다. 못 보낸 것은 다음에 열 때 다시 보낸다. */
(function () {
  'use strict';
  var root = document.getElementById('qg');
  if (!root) { return; }
  var ROUND = root.getAttribute('data-round') || '';
  var SAVE_URL = root.getAttribute('data-save-url');
  var STORE = root.getAttribute('data-store') === 'on';
  var TITLE = root.getAttribute('data-title') || '점검';
  var csrfMeta = document.querySelector('meta[name="_csrf"]');
  var CSRF = csrfMeta ? csrfMeta.getAttribute('content') : '';
  var LABEL = { PASS: '통과', ISSUE: '문제', SKIP: '건너뜀' };
  var flows = Array.prototype.slice.call(document.querySelectorAll('.qg-flow'));
  var active = null;
  var author = null;
  var results = {};

  /* ── 저장소 */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function resultKey() { return 'nqa:r:' + ROUND + ':' + (author ? author.key : ''); }
  function newKey() {
    if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
    var s = ''; for (var i = 0; i < 4; i++) { s += Math.random().toString(16).slice(2, 10); } return s.slice(0, 8) + '-' + s.slice(8, 32);
  }

  /* ── 알림 */
  var toastEl = document.querySelector('[data-toast]');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) { return; }
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  /* ── 점검자 */
  var who = document.getElementById('qg-who');
  var whoForm = who && who.querySelector('[data-who-form]');
  var whoBtn = document.querySelector('[data-who-open]');
  var lastFocus = null;
  function openWho() {
    if (!who) { return; }
    lastFocus = document.activeElement;
    whoForm.name.value = author ? author.name : '';
    whoForm.team.value = author && author.team ? author.team : '';
    who.querySelector('[data-who-err]').hidden = true;
    who.hidden = false;
    document.body.style.overflow = 'hidden';
    whoForm.name.focus();
  }
  function closeWho() {
    if (!who) { return; }
    who.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  function paintWho() {
    if (!whoBtn) { return; }
    whoBtn.hidden = !author || root.getAttribute('data-mode') !== 'check';
    if (author) { whoBtn.querySelector('[data-who-label]').textContent = author.name + (author.team ? ' · ' + author.team : ''); }
  }
  if (whoForm) {
    whoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = whoForm.name.value.trim();
      if (!name) { who.querySelector('[data-who-err]').hidden = false; whoForm.name.focus(); return; }
      var team = whoForm.team.value.trim();
      var same = author && author.name === name && (author.team || '') === team;
      author = same ? author : { name: name, team: team, key: newKey() };
      store('nqa:author', author);
      results = load(resultKey(), {});
      closeWho();
      setMode('check');
      paintAll();
      resendUnsent();
      toast(name + ' 님으로 점검합니다');
    });
    who.querySelector('[data-who-cancel]').addEventListener('click', function () {
      closeWho();
      if (!author) { setMode('manual'); }
    });
    who.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); who.querySelector('[data-who-cancel]').click(); }
      if (e.key === 'Tab') {
        var f = who.querySelectorAll('input, button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  if (whoBtn) { whoBtn.addEventListener('click', openWho); }

  /* ── 보기 방식 */
  function setMode(mode) {
    root.setAttribute('data-mode', mode);
    store('nqa:mode', mode);
    document.querySelectorAll('[data-mode-set]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-mode-set') === mode));
    });
    var progress = document.querySelector('[data-progress]');
    if (progress) { progress.hidden = mode !== 'check'; }
    paintWho();
    if (mode === 'check') { pickActiveFromViewport(); } else { setActive(null); }
    paintAll();
  }
  document.querySelectorAll('[data-mode-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      var mode = b.getAttribute('data-mode-set');
      if (mode === 'check' && !author) { openWho(); return; }
      setMode(mode);
    });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var other = document.querySelector('[data-mode-set]:not([data-mode-set="' + b.getAttribute('data-mode-set') + '"])');
        other.focus(); other.click();
      }
    });
  });

  /* ── 흐름 활성화: 점검 모드에서 화면 가운데 띠에 걸친 흐름 */
  function setActive(flow) {
    if (active === flow) { return; }
    active = flow;
    flows.forEach(function (f) {
      var on = f === flow;
      f.classList.toggle('is-active', on);
      f.querySelectorAll('.qg-choice, [data-memo], [data-memo-save]').forEach(function (el) { el.disabled = !on; });
    });
  }
  function pickActiveFromViewport() {
    if (root.getAttribute('data-mode') !== 'check') { return; }
    var mid = window.innerHeight * 0.45;
    var hit = null;
    for (var i = 0; i < flows.length; i++) {
      var r = flows[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { hit = flows[i]; break; }
    }
    if (hit) { setActive(hit); }
  }
  var spyTicking = false;
  window.addEventListener('scroll', function () {
    if (spyTicking) { return; }
    spyTicking = true;
    requestAnimationFrame(function () { spyTicking = false; pickActiveFromViewport(); paintToc(); });
  }, { passive: true });
  flows.forEach(function (f) {
    f.querySelector('[data-flow-head]').addEventListener('click', function () {
      if (root.getAttribute('data-mode') === 'check') { setActive(f); }
    });
    f.addEventListener('focusin', function () {
      if (root.getAttribute('data-mode') === 'check') { setActive(f); }
    });
  });

  /* ── 목차: 지금 보는 흐름 */
  var tocLinks = {};
  document.querySelectorAll('[data-toc]').forEach(function (a) { tocLinks[a.getAttribute('data-toc')] = a; });
  function paintToc() {
    var mid = window.innerHeight * 0.45, current = null;
    for (var i = 0; i < flows.length; i++) {
      var r = flows[i].getBoundingClientRect();
      if (r.top <= mid) { current = flows[i]; } else { break; }
    }
    Object.keys(tocLinks).forEach(function (id) {
      tocLinks[id].classList.toggle('is-current', !!current && current.getAttribute('data-flow') === id);
    });
  }

  /* ── 결과 그리기 */
  function paintFlow(f) {
    var id = f.getAttribute('data-flow');
    var r = results[id];
    var result = r && r.result;
    if (result && root.getAttribute('data-mode') === 'check') { f.setAttribute('data-result', result); } else { f.removeAttribute('data-result'); }
    f.querySelectorAll('.qg-choice').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-choice') === result)); });
    var memo = f.querySelector('[data-memo]');
    if (memo && document.activeElement !== memo) { memo.value = r && r.memo ? r.memo : ''; }
    var badge = f.querySelector('[data-flow-badge]');
    if (badge) { badge.textContent = result && root.getAttribute('data-mode') === 'check' ? LABEL[result] : ''; }
    var state = f.querySelector('[data-result-state]');
    if (state) {
      state.classList.toggle('is-err', !!(r && r.sent === false && STORE));
      state.textContent = !r ? '' : (r.sent === false && STORE ? '서버에 못 보냄 — 이 브라우저에만 있음' : (STORE ? '보냄 ' + time(r.at) : '이 브라우저에 저장 ' + time(r.at)));
    }
    var dot = tocLinks[id] && tocLinks[id].querySelector('.qg-dot');
    if (dot) { if (result) { dot.setAttribute('data-result', result); } else { dot.removeAttribute('data-result'); } }
  }
  function time(iso) {
    if (!iso) { return ''; }
    var d = new Date(iso);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function paintProgress() {
    var n = flows.length, c = { PASS: 0, ISSUE: 0, SKIP: 0 };
    flows.forEach(function (f) { var r = results[f.getAttribute('data-flow')]; if (r && c[r.result] != null) { c[r.result]++; } });
    ['PASS', 'ISSUE', 'SKIP'].forEach(function (k) {
      var bar = document.querySelector('[data-bar="' + k.toLowerCase() + '"]');
      if (bar) { bar.style.width = (n ? c[k] / n * 100 : 0) + '%'; }
    });
    var text = document.querySelector('[data-progress-text]');
    if (text) {
      text.innerHTML = '<b>' + (c.PASS + c.ISSUE + c.SKIP) + '</b> / ' + n + ' 흐름 · 통과 ' + c.PASS + ' · 문제 <b>' + c.ISSUE + '</b> · 건너뜀 ' + c.SKIP;
    }
  }
  function paintAll() { flows.forEach(paintFlow); paintProgress(); paintToc(); }

  /* ── 결과 고르기 · 보내기 */
  function save(f, patch) {
    var id = f.getAttribute('data-flow');
    var next = Object.assign({}, results[id] || {}, patch, { at: new Date().toISOString(), sent: false });
    results[id] = next;
    store(resultKey(), results);
    paintFlow(f); paintProgress();
    send(id, next);
  }
  function send(id, r) {
    if (!STORE || !author) { return Promise.resolve(); }
    return fetch(SAVE_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': CSRF },
      body: JSON.stringify({ flowId: id, result: r.result, memo: r.memo || '', authorName: author.name, authorTeam: author.team || '', authorKey: author.key })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) { throw new Error(body.message || ('HTTP ' + res.status)); }
        if (results[id] === r) { r.sent = true; store(resultKey(), results); }
        var f = document.getElementById('flow-' + id);
        if (f) { paintFlow(f); }
      });
    }).catch(function (err) {
      toast('서버에 보내지 못했습니다 — ' + (err && err.message ? err.message : '연결 오류') + ' (이 브라우저에는 남아 있습니다)');
      var f = document.getElementById('flow-' + id);
      if (f) { paintFlow(f); }
    });
  }
  function resendUnsent() {
    Object.keys(results).forEach(function (id) {
      var r = results[id];
      if (r && r.sent === false && r.result && document.getElementById('flow-' + id)) { send(id, r); }
    });
  }
  flows.forEach(function (f) {
    f.querySelectorAll('.qg-choice').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) { return; }
        var choice = b.getAttribute('data-choice');
        var memo = f.querySelector('[data-memo]');
        save(f, { result: choice, memo: memo ? memo.value.trim() : '' });
        if (choice === 'ISSUE' && memo && !memo.value.trim()) { memo.focus(); toast('무엇이 달랐는지 메모를 남기고 「메모 저장」을 누르세요'); }
      });
    });
    var memoSave = f.querySelector('[data-memo-save]');
    if (memoSave) {
      memoSave.addEventListener('click', function () {
        var id = f.getAttribute('data-flow');
        var memo = f.querySelector('[data-memo]').value.trim();
        if (!results[id] || !results[id].result) { toast('먼저 통과 · 문제 · 건너뜀 중 하나를 고르세요'); return; }
        save(f, { memo: memo });
        toast('메모를 저장했습니다');
      });
    }
  });

  /* ── 내 결과 글로 복사 */
  var copyBtn = document.querySelector('[data-copy-mine]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var lines = [TITLE + ' — ' + ROUND + (author ? ' — ' + author.name + (author.team ? ' (' + author.team + ')' : '') : '')];
      flows.forEach(function (f) {
        var r = results[f.getAttribute('data-flow')];
        if (!r || !r.result) { return; }
        lines.push(('0' + f.getAttribute('data-no')).slice(-2) + '. ' + f.getAttribute('data-title') + ' — ' + LABEL[r.result]
          + (r.memo ? ' — ' + r.memo.replace(/\s*\n\s*/g, ' / ') : ''));
      });
      if (lines.length === 1) { lines.push('(아직 결과 없음)'); }
      copy(lines.join('\n'));
    });
  }
  function copy(text, done) {
    done = done || '내 결과를 복사했습니다';
    function fallback() {
      var area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      toast(ok ? done : '복사하지 못했습니다 — 주소를 직접 옮겨 적으세요: ' + text);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(done); }, fallback);
    } else { fallback(); }
  }

  /* ── 길 찾기 주소: 일반창 단계는 새 창(점검용 창 하나를 같이 써서 창이 쌓이지 않게), 시크릿창 단계는 주소 복사 —
     페이지가 시크릿창을 열 수는 없고, 일반 새 창은 관리자 로그인을 그대로 쓰므로 비회원 · 다른 계정 확인이 틀어진다.
     Ctrl · Shift · 가운데 단추로 누르면 브라우저 기본 동작(새 탭 등)을 그대로 둔다. */
  var WORK_WINDOW = 'nqa-work';
  function windowFeatures() {
    var w = Math.min(1440, (screen.availWidth || 1440) - 40);
    var h = Math.min(960, (screen.availHeight || 960) - 60);
    var left = Math.max(0, (screen.availWidth || w) - w);
    return 'popup=yes,width=' + w + ',height=' + h + ',left=' + left + ',top=0,resizable=yes,scrollbars=yes';
  }
  document.querySelectorAll('.qg-url').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) { return; }
      e.preventDefault();
      var step = a.closest('.qg-step');
      var url = a.href;
      if (step && step.getAttribute('data-window') === '시크릿창') {
        copy(url, '주소를 복사했습니다 — 시크릿창(Ctrl+Shift+N)을 열어 주소 칸에 붙여 넣으세요');
        return;
      }
      var win = window.open(url, WORK_WINDOW, windowFeatures());
      if (win) {
        try { win.focus(); } catch (err) { /* 다른 출처 창이면 포커스만 못 옮긴다 */ }
      } else {
        toast('브라우저가 새 창을 막았습니다 — 주소 표시줄의 팝업 차단 아이콘에서 이 사이트를 허용하세요');
      }
    });
  });

  /* ── 화면 캡처: 펼칠 때 읽는다 */
  document.querySelectorAll('.qg-shot').forEach(function (d) {
    d.addEventListener('toggle', function () {
      var img = d.querySelector('img[data-src]');
      if (d.open && img && !img.getAttribute('src')) { img.setAttribute('src', img.getAttribute('data-src')); }
    });
  });

  /* ── 시작 */
  author = load('nqa:author', null);
  if (author && (!author.name || !author.key)) { author = null; }
  results = author ? load(resultKey(), {}) : {};
  setMode(load('nqa:mode', 'manual') === 'check' && author ? 'check' : 'manual');
  paintAll();
  if (author) { resendUnsent(); }
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('qg-flow')) { setTimeout(function () { target.scrollIntoView(); setActive(root.getAttribute('data-mode') === 'check' ? target : null); }, 50); }
  }
})();
