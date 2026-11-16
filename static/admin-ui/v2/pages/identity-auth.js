/* 「권한」 화면(퍼블리싱 키트 auth-*): 권한그룹 고르기 · 명단에 넣을 사람 찾기 · 상태 칩 거르기 · 서브관리자 권한그룹 「변경」 창 ·
 * 서브관리자 등록 패널(직원 명부) · 기간 선택 · 허용 IP 형식 검사 · 권한그룹 패널 뒤 표 새로 읽기. 검색 옵션창 · 떠 있는 창은 window.nvParts(admin-parts.js). */
(function () {
  'use strict';
  var parts = window.nvParts;
  function getJson(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (ex) { data = null; }
        if (!r.ok) { var failure = new Error(data && data.message ? data.message : '찾지 못했습니다. 잠시 뒤 다시 시도하세요.'); failure.status = r.status; throw failure; }
        return data;
      });
    });
  }

  /* ---------- 권한그룹명단관리: 권한그룹 고르기(버튼형 선택 칸 + 찾기 목록) ---------- */
  var gpick = document.querySelector('[data-roster-gpick]');
  if (gpick && parts) {
    var gsel = gpick.querySelector('.gsel');
    var glist = gpick.querySelector('.pick__list');
    var gq = glist.querySelector('input[type="search"]');
    var rows = function () { return Array.prototype.slice.call(glist.querySelectorAll('.pick__row')).filter(function (a) { return !a.hidden; }); };
    parts.popover(gsel, glist, { onOpen: function () { gq.value = ''; filterGroups(); } });
    var filterGroups = function () {
      var q = gq.value.trim().toLowerCase();
      var shown = 0;
      glist.querySelectorAll('.pick__row').forEach(function (a) {
        a.hidden = !!q && (a.getAttribute('data-gfind') || '').toLowerCase().indexOf(q) < 0;
        if (!a.hidden) { shown++; }
      });
      var empty = glist.querySelector('[data-gfind-empty]');
      if (empty) { empty.hidden = shown > 0; }
    };
    gq.addEventListener('input', filterGroups);
    // ↑ · ↓ 로 줄 사이를 옮기고 Enter 로 고른다(줄은 그 그룹 명단 주소)
    glist.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') { return; }
      var list = rows();
      if (!list.length) { return; }
      e.preventDefault();
      var i = list.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
      list[(i + list.length) % list.length].focus();
    });
  }

  /* ---------- 권한그룹명단관리: 검색 한 칸에서 사람을 찾아 바로 추가 ---------- */
  var picker = document.querySelector('[data-roster-picker]');
  if (picker && parts) {
    var form = picker;
    var site = picker.querySelector('[name="siteId"]');
    var kind = picker.getAttribute('data-kind');
    var shown = [];
    var roster = parts.pick(picker.querySelector('.pick'), {
      icon: 'user',
      empty: kind === 'staff' ? '찾는 직원 · 부서가 없습니다' : '찾는 회원이 없습니다',
      // 이미 명단에 있는 사람은 결과에서 뺀다. 사이트마다 줄이 따로라 고른 사이트를 함께 보낸다. 폐기한 사람은 고를 수 없게 보인다
      search: function (q) {
        return getJson(picker.getAttribute('data-search-url') + '?kind=' + encodeURIComponent(kind) + '&q=' + encodeURIComponent(q)
          + '&roleId=' + encodeURIComponent(picker.getAttribute('data-role-id')) + '&siteId=' + encodeURIComponent(site ? site.value : '*'))
          .then(function (people) {
            shown = people.map(function (p) { return { label: p.who || p.name, id: p.loginId || '', meta: p.sub, badge: p.badge || '', disabled: p.disabled, actorId: p.actorId, kind: p.kind }; });
            return shown;
          });
      },
      onPick: function (row) {
        form.querySelector('[name="actorId"]').value = row.actorId;
        form.submit();
      },
      // 검색 옵션창 맨 아래: 여러 명 한번에 고르기(roster-multi.js) — 관리자 권한그룹은 조직도, 회원 권한그룹은 검색 결과로
      foot: window.nvRosterMulti ? {
        label: '여러 명 한번에 고르기', meta: kind === 'staff' ? '부서 · 사람' : '회원', icon: 'users',
        onClick: function () {
          window.nvRosterMulti.open({
            base: picker.getAttribute('data-multi-base'), roleId: picker.getAttribute('data-role-id'), roleName: picker.getAttribute('data-role-name'),
            kind: kind, siteId: site ? site.value : '*', untilOptions: (picker.getAttribute('data-until-options') || '').split(',').filter(Boolean),
            onDone: function (result) {
              try { window.sessionStorage.setItem('nv-roster-added', String(result.added || 0)); } catch (ex) { /* 알림만 못 보인다 */ }
              window.location.reload();
            }
          });
        }
      } : null
    });
    // 여러 명 넣기 뒤 새로 읽은 화면: 넣은 건수를 알린다
    try {
      var addedCount = window.sessionStorage.getItem('nv-roster-added');
      if (addedCount !== null) {
        window.sessionStorage.removeItem('nv-roster-added');
        if (window.nvToast) { window.nvToast('명단에 ' + addedCount + '건 넣었습니다.'); }
      }
    } catch (ex) { /* 저장소를 못 쓰면 알림 없이 둔다 */ }
    if (site) { site.addEventListener('change', function () { if (roster.input.value.trim()) { roster.refresh(); } }); }
    // 부서 줄(그룹묶음)은 사람 아이콘 대신 묶음 아이콘(키트) — 옵션창 부품은 줄마다 아이콘을 받지 않아 그린 뒤 바꾼다
    var rosterList = picker.querySelector('.pick__list');
    if (rosterList && window.MutationObserver) {
      new MutationObserver(function () {
        rosterList.querySelectorAll('.pick__row[data-pick-index]').forEach(function (row) {
          var item = shown[Number(row.getAttribute('data-pick-index'))];
          var use = row.querySelector('svg use');
          if (item && item.kind === 'dept' && use && use.getAttribute('href') !== '#nv-i-users') { use.setAttribute('href', '#nv-i-users'); }
        });
      }).observe(rosterList, { childList: true });
    }
  }

  /* ---------- 상태 · 종류 칩: 표 줄을 화면 안에서 거른다(서버 필터 API 가 없다) ---------- */
  document.querySelectorAll('[data-segfilter]').forEach(function (group) {
    var table = document.querySelector(group.getAttribute('data-segfilter'));
    if (!table) { return; }
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-seg]');
      if (!b) { return; }
      var want = b.getAttribute('data-seg');
      group.querySelectorAll('button[data-seg]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.hasAttribute('data-filter-skip')) { return; }
        tr.hidden = !!want && tr.getAttribute('data-seg-value') !== want;
      });
    });
  });

  /* ---------- 서브관리자관리: 권한그룹 「변경」 → 작은 체크 목록 창. 표 가로 스크롤에 잘리지 않게 화면 기준으로 띄운다 ---------- */
  var openPops = [];
  if (parts) {
    document.querySelectorAll('[data-checkpop]').forEach(function (pencil) {
      var pop = document.getElementById(pencil.getAttribute('aria-controls'));
      if (!pop) { return; }
      var place = function () {
        var r = pencil.getBoundingClientRect();
        pop.style.position = 'fixed';
        var w = pop.offsetWidth, h = pop.offsetHeight;
        pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
        var top = r.bottom + 4;
        if (top + h > window.innerHeight - 8 && r.top - 4 - h >= 8) { top = r.top - 4 - h; }
        pop.style.top = top + 'px';
      };
      var ctl = parts.popover(pencil, pop, { onOpen: place });
      openPops.push(ctl);
    });
    // 화면이 움직이면 창이 단추에서 떨어지므로 닫는다(창 안 스크롤은 그대로)
    window.addEventListener('scroll', function (e) {
      if (e.target && e.target.closest && e.target.closest('.checkpop')) { return; }
      openPops.forEach(function (ctl) { if (ctl.isOpen()) { ctl.close(); } });
    }, true);
    window.addEventListener('resize', function () { openPops.forEach(function (ctl) { if (ctl.isOpen()) { ctl.close(); } }); });
  }

  // 기간 선택 · 서브관리자 권한그룹 체크(바로 저장): 패널이 표를 새로 그려도 듣도록 문서에서 받는다
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-until-select]')) { t.form.submit(); return; }
    if (!t.matches('[data-acctg]')) { return; }
    var groupForm = document.getElementById('sub-admin-group-form');
    var parts2 = t.getAttribute('data-acctg').split('|');
    groupForm.querySelector('[name="actorId"]').value = parts2[0];
    groupForm.querySelector('[name="roleId"]').value = parts2[1];
    groupForm.querySelector('[name="on"]').value = String(t.checked);
    groupForm.submit();
  });

  /* ---------- 서브관리자 등록 패널(직원 명부에서): 「찾아서 고르기」 · 「사번으로 입력」 → 권한그룹 → 등록 ---------- */
  var addPanel = document.getElementById('sub-admin-add-panel');
  if (addPanel && parts) {
    var aaForm = addPanel.querySelector('[data-sub-admin-add]');
    var empField = aaForm.querySelector('[data-aa-emp]');
    var findCard = addPanel.querySelector('[data-aa-find]');
    var idCard = addPanel.querySelector('[data-aa-id]');
    var pickedCard = addPanel.querySelector('[data-aa-picked]');
    var groupsCard = addPanel.querySelector('[data-aa-groups]');
    var note = addPanel.querySelector('[data-aa-note]');
    var submit = aaForm.querySelector('[data-aa-submit]');
    var okBox = idCard.querySelector('[data-aa-ok]');
    var errBox = idCard.querySelector('[data-aa-error]');
    var empInput = idCard.querySelector('#aaEmpNo');
    var nameInput = idCard.querySelector('#aaName');
    var mode = 'find';
    var fill = function (root, c) {
      root.querySelectorAll('[data-aa-org]').forEach(function (el) { el.textContent = c ? c.org : ''; });
      root.querySelectorAll('[data-aa-tel]').forEach(function (el) { el.textContent = c ? c.tel : ''; });
      root.querySelectorAll('[data-aa-email]').forEach(function (el) { el.textContent = c ? c.email : ''; });
    };
    var sync = function () {
      var on = !!empField.value;
      // 키트: 「찾아서 고르기」는 사람을 고른 뒤에 권한그룹 칸이 나오고, 「사번으로 입력」은 흐린 칸으로 미리 보인다
      groupsCard.hidden = mode === 'find' && !on;
      groupsCard.classList.toggle('is-disabled', !on);
      groupsCard.querySelectorAll('input[type="checkbox"]').forEach(function (box) { box.disabled = !on; if (!on) { box.checked = false; } });
      note.hidden = on || mode !== 'find';
      submit.disabled = !on || !groupsCard.querySelector('input[type="checkbox"]:checked');
    };
    var pick = function (c) {
      empField.value = c ? c.empNo : '';
      if (mode === 'find') {
        findCard.hidden = !!c;
        pickedCard.hidden = !c;
        if (c) {
          pickedCard.querySelector('[data-aa-name]').textContent = c.name;
          pickedCard.querySelector('[data-aa-login]').textContent = c.empNo;
          pickedCard.querySelector('[data-aa-kind]').textContent = c.account ? '직원 · 로그인 계정 있음' : '직원 · 등록하면 로그인 계정을 만듭니다';
          fill(pickedCard, c);
        }
      } else {
        okBox.hidden = !c;
        fill(okBox, c);
      }
      sync();
    };
    var blockedText = function (c) {
      return c.inactive ? '퇴직(사용 안 함) 직원입니다.' : c.discarded ? '계정 폐기한 직원입니다. 서브관리자관리에서 폐기를 해제하세요.'
        : c.already ? '이미 서브관리자입니다. 목록에서 권한그룹을 바꾸세요.' : '';
    };
    var finder = parts.pick(addPanel.querySelector('[data-aa-pick]'), {
      icon: 'user',
      empty: '찾는 직원이 없습니다',
      search: function (q) {
        return getJson(addPanel.getAttribute('data-candidates-url') + '?q=' + encodeURIComponent(q)).then(function (list) {
          return list.map(function (c) {
            var badge = c.inactive ? '퇴직' : c.discarded ? '폐기한 계정' : c.already ? '이미 서브관리자' : '';
            return { label: c.name, id: c.empNo, meta: c.org, badge: badge, disabled: !!badge, c: c };
          });
        });
      },
      onPick: function (row) {
        pick(row.c);
        var first = groupsCard.querySelector('input[type="checkbox"]:not([disabled])');
        if (first) { first.focus(); }
      }
    });
    var setError = function (message) {
      errBox.textContent = message || '';
      [empInput, nameInput].forEach(function (el) {
        if (message) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'aa-err'); } else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
      });
    };
    var setMode = function (next, focus) {
      mode = next;
      addPanel.querySelectorAll('[data-aa-mode]').forEach(function (tab) {
        var on = tab.getAttribute('data-aa-mode') === next;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) { tab.focus(); }
      });
      finder.clear();
      empField.value = '';
      findCard.hidden = next !== 'find';
      pickedCard.hidden = true;
      idCard.hidden = next !== 'id';
      okBox.hidden = true;
      setError('');
      sync();
    };
    addPanel.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-aa-mode]');
      if (tab) { if (tab.getAttribute('data-aa-mode') !== mode) { setMode(tab.getAttribute('data-aa-mode')); } return; }
      if (e.target.closest('[data-aa-repick]')) { pick(null); finder.input.focus(); return; }
      if (e.target.closest('[data-aa-check]')) {
        var no = empInput.value.trim(), name = nameInput.value.trim();
        if (!no || !name) { setError('사번과 이름을 모두 입력하세요.'); (no ? nameInput : empInput).focus(); return; }
        getJson(addPanel.getAttribute('data-check-url') + '?empNo=' + encodeURIComponent(no) + '&name=' + encodeURIComponent(name)).then(function (c) {
          // 맞는 직원이 없으면 서버가 200 + found:false 로 알린다(오류 응답이 아님)
          if (c && c.found === false) { pick(null); setError(c.message || '일치하는 직원이 없습니다. 사번과 이름을 다시 확인하세요.'); empInput.focus(); return; }
          var blocked = blockedText(c);
          if (blocked) { pick(null); setError(blocked); return; }
          setError('');
          pick(c);
        }).catch(function (error) { pick(null); setError(error.message); empInput.focus(); });
      }
    });
    // 등록 방법 탭: ← · → 로 옮긴다
    addPanel.querySelector('.seg').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
      e.preventDefault();
      setMode(mode === 'find' ? 'id' : 'find', true);
    });
    // 확인한 뒤 사번 · 이름을 고치면 다시 확인해야 한다
    [empInput, nameInput].forEach(function (el) {
      el.addEventListener('input', function () { if (empField.value) { pick(null); } setError(''); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); idCard.querySelector('[data-aa-check]').click(); } });
    });
    groupsCard.addEventListener('change', sync);
    aaForm.addEventListener('submit', function (e) { if (submit.disabled) { e.preventDefault(); } });
    addPanel.addEventListener('nv:panel-open', function () { setMode('find'); });
    sync();
  }

  /* ---------- 허용 IP 추가 패널: 보내기 전에 형식을 검사해 칸 아래에 오류를 보이고 입력값을 둔다. IPv6 와 숫자 범위는 서버가 본다 ---------- */
  var ipForm = document.querySelector('[data-ip-form]');
  if (ipForm) {
    ipForm.addEventListener('submit', function (e) {
      var ip = ipForm.querySelector('[name="ipCidr"]');
      var err = ipForm.querySelector('[data-ip-error]');
      var value = ip.value.trim();
      var ok = value.indexOf(':') >= 0 || /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(value) || /^(\d{1,3}\.){1,3}\*$/.test(value);
      err.textContent = ok ? '' : '예: 10.20.4.* · 10.20.8.0/24 · 211.43.12.7 꼴로 넣으세요.';
      ip.toggleAttribute('aria-invalid', !ok);
      if (!ok) { e.preventDefault(); ip.focus(); }
    });
    // 서버가 거절했으면(입력값 · 오류를 돌려줌) 패널을 다시 연다
    var ipPanel = document.getElementById('ip-add-panel');
    if (ipPanel && ipPanel.getAttribute('data-open-on-load') === 'true') {
      var opener = document.querySelector('[data-panel-open="#ip-add-panel"]');
      if (opener) { window.setTimeout(function () { opener.click(); }, 0); }
    }
  }

  // 권한그룹 패널에서 바꾸면 뒤 표(권한그룹 · 명단)를 바로 새로 읽는다. 패널이 열려 있으면 패널을 닫지 않고 표만 바꾸고 닫을 때 화면을 다시 연다
  // (서브관리자 표까지 맞추려고). 표에서 바로 지웠으면 화면을 바로 다시 연다
  var groupPanel = document.getElementById('group-panel');
  if (groupPanel) {
    var dirty = false;
    var seq = 0;
    var reload = function () {
      var url = new URL(window.location.href);
      var selected = document.querySelector('#id-tabs [role="tab"][aria-selected="true"]');
      if (selected) { url.searchParams.set('tab', selected.id.replace('id-tab-', '')); }
      window.location.assign(url.toString());
    };
    var refreshTables = function () {
      var mine = ++seq;
      fetch(window.location.href, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (html) {
          if (mine !== seq) { return; }
          var next = new DOMParser().parseFromString(html, 'text/html');
          ['#id-table-roles tbody', '#id-table-assign tbody', '#id-panel-roles .segchips', '#id-panel-assign .roster-head__count'].forEach(function (selector) {
            var now = document.querySelector(selector);
            var fresh = next.querySelector(selector);
            if (now && fresh) { now.innerHTML = fresh.innerHTML; }
          });
          // 서브관리자 표는 「변경」 창이 줄마다 묶여 있어 여기서 바꾸지 않는다 — dirty 를 두어 닫을 때 다시 연다
        })
        .catch(function () { /* 닫을 때 다시 연다 */ });
    };
    document.addEventListener('group-panel:changed', function () {
      if (groupPanel.classList.contains('is-open')) { dirty = true; refreshTables(); } else { reload(); }
    });
    groupPanel.addEventListener('nv:panel-close', function () { if (dirty) { reload(); } });
  }

  /* 허용 IP 사용 기간: 선택지 「날짜 직접 고르기」(pick)면 날짜 칸을 보이고 필수로. 다른 값이면 숨기고 보내지 않는다 */
  Array.prototype.forEach.call(document.querySelectorAll('select[data-until-pick]'), function (select) {
    var date = document.querySelector(select.getAttribute('data-until-pick'));
    if (!date) { return; }
    function sync(focus) {
      var picking = select.value === 'pick';
      date.hidden = !picking;
      date.required = picking;
      date.disabled = !picking;
      if (picking && focus) { date.focus(); if (date.showPicker) { try { date.showPicker(); } catch (ex) { /* 막힌 브라우저는 칸만 */ } } }
    }
    select.addEventListener('change', function () { sync(true); });
    sync(false);
  });
})();
