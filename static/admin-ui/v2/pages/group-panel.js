/* 권한그룹관리 패널(퍼블리싱 키트 group-panel* · auth-group-panel, 모양 = admin-parts.css 의 .gp2 · .gpl · .gmem · .gplace · .kindpick):
 * 메뉴 · 게시판 · 권한 화면을 떠나지 않고 권한그룹 · 명단을 다룬다. 서버 = GroupPanelController(JSON), 열고 닫기 = admin-v2.js 패널 동작.
 * 목록(체크 + 그룹회원 + ⋮) → 상세(명단 · 누리집 접근권한 · 관리자메뉴) · 등록 · 수정 · 삭제 확인.
 *
 * 다른 스크립트와의 약속(권한 화면을 열 수 없는 계정에는 이 스크립트가 실리지 않아 window.groupPanel 이 없다. 추가 알림 문구는 addAccess · addManager 쪽 몫)
 *   window.groupPanel.setContext({name, canAccess(group), canManager(group), addAccess(groupId), addManager(groupId), has(group, mode)?, place?}) — null 이면 문맥 없음.
 *     문맥이 있으면 목록에 체크 칸과 「「name」 접근권한에 추가」가 생긴다. has 를 주지 않으면 「이미 있음」은 canAccess 로 미루어 본다(아래 present).
 *     place = 「이 ○○에 있음」의 ○○(없으면 접근권한 폼의 종류로 게시판 · 메뉴).
 *   window.groupPanel.open({gid, tab, mode, staffOnly, editing, bulk}) — 모두 생략 가능(그룹 목록). gid = 표의 줄 키(역할 코드, 기본 그룹은 anyone · member · staff),
 *     tab = members · perms · amenu, mode = access(기본) · manager(관리자 권한에서 엶 — 기본 · 회원 권한그룹은 고를 수 없다).
 *     mode 를 주지 않으면 연 단추가 #add-mgr 이거나 [data-group-mode="manager"] 안이면 manager 로 본다.
 *   그룹이 바뀌면 document 에 'group-panel:changed' {detail: {groups, deleted}} — groups = MenuAccessPanel.groups 모양, deleted = 지운 그룹 id 목록
 * 페이지 단추: [data-group-panel-open] 패널 열기, [data-group-open="줄 키" data-group-tab] 그 그룹 상세로, [data-group-new] 등록으로,
 * [data-group-edit="줄 키"] 수정으로, [data-group-delete="줄 키"] 지우기 확인, [data-group-bulk="줄 키"] 그 명단의 「명단 업로드」(엑셀). */
(function () {
  'use strict';
  var panel = document.getElementById('group-panel');
  var context = null;
  var BASE = panel.getAttribute('data-base');
  var ADMIN_MENUS = String(BASE || '').replace(/\/identity\/group-panel$/, '') + '/admin-menus';
  var body = document.getElementById('gp-body');
  var foot = document.getElementById('gp-foot');
  var KIND_TIP = {
    base: '기본 권한그룹 — 처음부터 있는 그룹이라 명단 · 삭제가 없습니다',
    staff: '관리자 권한그룹 — 서브관리자를 넣습니다. 접근권한 · 관리자 권한을 모두 받을 수 있습니다',
    member: '회원 권한그룹 — 누리집 회원만 넣습니다. 접근권한만 받고, 관리자 권한에는 넣을 수 없습니다'
  };
  var S = { view: 'list', gid: null, tab: 'members', form: null, q: '', pickQ: '', hl: null, error: '', loaded: false, mode: 'access', picked: {},
            groups: [], accessGroups: [], nextCode: '', untilOptions: [], members: null, access: null, adminMenus: null, bulk: null };
  var returnFocus = null;
  var pickTimer = null;
  var pickSeq = 0;
  var PROBE = '__nv_probe__';

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function icon(name, cls) { return '<svg class="nv-icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#nv-i-' + name + '"/></svg>'; }
  function tip(text) { return text ? ' title="' + esc(text) + '"' : ''; }
  function toast(text) { if (window.nvToast) { window.nvToast(text); } }
  function focusLater(selector) { window.setTimeout(function () { var el = panel.querySelector(selector); if (el) { el.focus(); } }, 80); }
  function isOpen() { return panel.classList.contains('is-open'); }
  function group(id) { return S.groups.filter(function (g) { return g.id === id; })[0] || null; }
  function accessGroup(id) { return S.accessGroups.filter(function (g) { return g.id === id; })[0] || null; }

  function api(path, options) {
    var o = options || {};
    var headers = window.cmsCsrf ? window.cmsCsrf.headers({ Accept: 'application/json' }) : { Accept: 'application/json' };
    var init = { method: o.method || 'GET', credentials: 'same-origin', headers: headers };
    if (o.form !== undefined) { init.body = o.form; } else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(o.body); }
    return fetch(BASE + path, init).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (ex) { data = null; }
        if (!res.ok) {
          var failure = new Error(data && data.message ? data.message : '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
          failure.field = data && data.field;
          throw failure;
        }
        if (data === null) { throw new Error('응답을 읽지 못했습니다. 로그인이 끊겼다면 다시 로그인해 주세요.'); }
        return data;
      });
    });
  }

  function loadGroups() {
    return api('/groups').then(function (data) {
      S.groups = data.groups;
      S.accessGroups = data.accessGroups;
      S.nextCode = data.nextCode;
      S.untilOptions = data.untilOptions;
      S.loaded = true;
    });
  }
  function notifyChanged(deleted) {
    document.dispatchEvent(new CustomEvent('group-panel:changed', { detail: { groups: S.accessGroups, deleted: deleted || [] } }));
  }
  /* 패널이 열려 있으면 머리에, 닫혀 있으면(권한 화면 표에서 지울 때) 본문 맨 위에 오류를 보인다 */
  function showError(message) {
    if (isOpen()) { S.error = message; render(); return; }
    var main = document.getElementById('main-content');
    if (!main) { toast(message); return; }
    var box = document.createElement('div');
    box.className = 'nv-alert nv-alert--err';
    box.setAttribute('role', 'alert');
    box.innerHTML = icon('x-circle') + '<div>' + esc(message) + '</div>';
    main.insertBefore(box, main.firstChild);
  }
  function fail(error) { showError(error.message); }

  /* ---------- 문맥(메뉴 · 게시판 접근권한, 관리자메뉴관리에서 연 패널) ---------- */
  function manager() { return S.mode === 'manager'; }
  function can(ag) {
    if (!context || !ag) { return false; }
    var f = manager() ? context.canManager : context.canAccess;
    return !!(f && f(ag));
  }
  /* 이미 이 메뉴에 있는 그룹: 문맥이 has 를 주면 그대로, 아니면 같은 그룹을 다른 id 로 물어 「id 때문에만 안 된다」면 있는 것으로 본다 */
  function present(ag) {
    if (!context || !ag) { return false; }
    if (context.has) { return !!context.has(ag, S.mode); }
    if (can(ag)) { return false; }
    var probe = {};
    Object.keys(ag).forEach(function (k) { probe[k] = ag[k]; });
    probe.id = PROBE;
    return can(probe);
  }
  function place() {
    if (context && context.place) { return context.place; }
    var form = document.getElementById('perm-form');
    try {
      var state = form ? JSON.parse(form.getAttribute('data-access-state') || '{}') : {};
      return state.kind === 'board' ? '게시판' : '메뉴';
    } catch (ex) {
      return '메뉴';
    }
  }
  function blockedText(g) {
    if (S.staffOnly && g.kind !== 'staff') { return '관리자메뉴에는 추가할 수 없음'; }
    if (context && manager() && g.kind !== 'staff') { return '관리자 권한에는 추가할 수 없음'; }
    return '';
  }
  function targetLabel() { return '「' + (context ? context.name : '') + '」 ' + (manager() ? '관리자 권한' : '접근권한'); }

  /* ---------- 그리기 ---------- */
  function kindBadge(g) {
    var cls = g.kind === 'base' ? '' : g.kind === 'staff' ? ' nv-badge--primary' : ' nv-badge--ok';
    return '<span class="nv-badge' + cls + '"' + tip(KIND_TIP[g.kind]) + '>' + (g.kind === 'base' ? '기본' : g.kind === 'staff' ? '관리자' : '회원') + '</span>';
  }
  function nameOf(g) { return '<b' + (g.roleTip ? ' class="tip-help"' + tip(g.roleTip) : '') + '>' + esc(g.name) + '</b>'; }
  function errorBox() { return S.error ? '<div class="nv-alert nv-alert--err" role="alert">' + icon('x-circle') + '<div>' + esc(S.error) + '</div></div>' : ''; }
  function loading() { return '<div class="nv-empty"><p class="nv-empty__desc">불러오는 중입니다.</p></div>'; }
  function back() { return '<button type="button" class="gp2__back" data-gback>' + icon('chevron-right', 'flip') + '권한그룹 목록</button>'; }
  function closeButton() { return '<button type="button" class="nv-btn nv-btn--lg nv-btn--outline" data-panel-close>닫기</button>'; }

  function moreMenu(g) {
    if (g.base) { return '<span class="gpl__dots"></span>'; }
    return '<span class="nv-dropmenu gpl__dots"><button type="button" class="nv-btn nv-btn--sm rowmore" data-dropmenu aria-haspopup="menu" aria-expanded="false" aria-label="' + esc(g.name) + ' 더보기" title="더보기">' + icon('more') + '</button>'
      + '<div class="nv-dropmenu__menu" role="menu" hidden>'
      + '<button type="button" class="nv-dropmenu__item" role="menuitem" data-gedit="' + esc(g.id) + '">' + icon('edit') + '수정하기</button>'
      + (g.grade || g.connected ? '' : '<button type="button" class="nv-dropmenu__item nv-dropmenu__item--danger" role="menuitem" data-gdel="' + esc(g.id) + '" title="쓰는 곳을 먼저 보여 줍니다">' + icon('trash') + '삭제하기</button>')
      + '</div></span>';
  }

  function listItems() {
    var q = S.q.trim();
    var upper = q.toUpperCase();
    var list = S.groups.filter(function (g) { return !q || g.name.indexOf(q) >= 0 || String(g.code).indexOf(upper) >= 0; });
    if (!list.length) { return '<div class="gempty"><b>찾는 권한그룹이 없습니다</b></div>'; }
    return '<ul class="gpl">' + list.map(function (g) {
      // 기본 권한그룹(누구나 · 일반회원 · 직원)은 접근권한 그룹 목록에 없다 — 같은 id 로 「이 ○○에 있음」을 본다(키트 group-panel)
      var ag = accessGroup(g.id) || (g.base ? { id: g.id, code: g.code, name: g.name, kind: 'base' } : null);
      var here = present(ag);
      var blocked = blockedText(g);
      var addable = !blocked && can(ag);
      var on = addable && !!S.picked[g.id];
      var meta = g.base ? esc(g.desc) : g.members + '명 · ' + esc(g.usage) + (g.desc ? ' · ' + esc(g.desc) : '');
      var check = context
        ? '<label class="nv-check gpl__chk"' + (addable || here ? '' : tip(blocked || '여기에는 추가할 수 없습니다')) + '><input type="checkbox" value="' + esc(g.id) + '" data-gpick'
          + (here || on ? ' checked' : '') + (addable ? '' : ' disabled') + ' aria-label="' + esc(g.name) + ' 고르기"></label>'
        : '';
      return '<li class="gpl__row' + (on ? ' is-on' : '') + (blocked ? ' is-blocked' : '') + (S.hl === g.id ? ' is-hl' : '') + '">' + check
        + '<div class="gpl__who"><div class="gpl__name">' + nameOf(g) + '<small>' + esc(g.code) + '</small>' + kindBadge(g)
        + (here ? '<span class="nv-badge nv-badge--info">이 ' + esc(place()) + '에 있음</span>' : '') + '</div>'
        + '<div class="gpl__meta">' + meta + (blocked ? ' · ' + esc(blocked) : '') + '</div></div>'
        + (g.base
          ? '<button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-gdetail="' + esc(g.id) + '" data-gtab="perms">누리집 접근권한</button>'
          : '<button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-gdetail="' + esc(g.id) + '">그룹회원</button>')
        + moreMenu(g) + '</li>';
    }).join('') + '</ul>';
  }

  function pickedIds() {
    return Object.keys(S.picked).filter(function (id) { return S.picked[id] && !blockedText(group(id) || {}) && can(accessGroup(id)); });
  }
  function renderListFoot() {
    var n = pickedIds().length;
    foot.innerHTML = closeButton()
      + (context ? '<button type="button" class="nv-btn nv-btn--lg nv-btn--primary" data-addpicked' + (n ? '' : ' disabled') + '>' + esc(targetLabel()) + '에 추가' + (n ? ' (' + n + ')' : '') + '</button>' : '');
  }
  function renderList() {
    body.innerHTML = errorBox()
      + '<p class="gp2__note">' + icon('info') + '이 패널에서 바꾼 내용은 바로 저장되고 접속기록에 남습니다. 사람을 그룹회원으로 추가하면 그 그룹의 접근권한 · 관리자 권한을 함께 받습니다.</p>'
      + '<div class="gsearch"><div class="nv-input-wrap nv-input-wrap--left">' + icon('search') + '<label for="g-q" class="nv-sr-only">권한그룹 찾기</label>'
      + '<input id="g-q" class="nv-input" type="search" placeholder="그룹명 · 그룹코드로 찾기" value="' + esc(S.q) + '"></div>'
      + '<button type="button" class="nv-btn nv-btn--primary" data-gnew>' + icon('plus') + '권한그룹 등록</button></div>'
      + '<div class="glist">' + listItems() + '</div>';
    renderListFoot();
  }

  /* 등록 · 수정: 목록과 같은 자리에 폼(키트 group-panel-add · -edit). 단추는 아래 막대 — form 속성으로 폼에 묶는다 */
  function renderForm() {
    var isNew = S.form === 'new';
    var g = isNew ? { name: '', kind: S.staffOnly ? 'staff' : 'staff', desc: '', code: S.nextCode } : group(S.form);
    if (!g) { S.view = 'list'; S.form = null; renderList(); return; }
    var kindOpt = function (value, title, sub) {
      var off = !isNew || (value === 'member' && S.staffOnly);
      return '<label class="kindpick__opt"><span class="nv-radio"><input type="radio" name="gf-kind" value="' + value + '"' + (g.kind === value ? ' checked' : '') + (off ? ' disabled' : '') + '></span>'
        + '<span><b>' + title + '</b><small>' + sub + '</small></span></label>';
    };
    body.innerHTML = errorBox() + back()
      + '<h3 class="gp2__formtitle">' + (isNew ? '권한그룹 등록' : '권한그룹 수정') + '</h3>'
      + '<form class="addcard" id="gform" data-gid="' + esc(S.form) + '" novalidate>'
      + '<div class="nv-field"><label class="nv-field__label" for="gf-name">그룹명 <span class="req" aria-hidden="true">*</span></label>'
      + '<input class="nv-input" id="gf-name" required maxlength="40" value="' + esc(g.name) + '" placeholder="예: 외부 평가위원" aria-describedby="gf-err"><span class="nv-field__error" id="gf-err" role="alert"></span></div>'
      + '<div class="nv-field"><label class="nv-field__label" for="gf-desc">그룹설명</label><input class="nv-input" id="gf-desc" maxlength="80" value="' + esc(g.desc || '') + '" placeholder="무엇을 하는 권한그룹인지 한 줄로"></div>'
      + '<div class="nv-field" role="radiogroup" aria-labelledby="gf-kind"><span class="nv-field__label" id="gf-kind">종류 <span class="req" aria-hidden="true">*</span></span>'
      + '<div class="kindpick">' + kindOpt('staff', '관리자', '서브관리자 · 부서') + kindOpt('member', '회원', '통합회원') + '</div>'
      + '<span class="nv-field__hint">' + (isNew ? (S.staffOnly ? '관리자메뉴관리에서 연 창이라 관리자 권한그룹만 만듭니다. ' : '관리자 권한에는 관리자 권한그룹만 추가할 수 있습니다. ') + '만든 뒤 바꿀 수 없습니다.' : '종류는 만든 뒤 바꿀 수 없습니다.') + '</span></div>'
      + '<div class="nv-field"><span class="nv-field__label">그룹코드</span><span class="gp2__code"><b>' + esc(g.code) + '</b> 자동으로 붙고 바꿀 수 없습니다</span></div>'
      + '</form>';
    foot.innerHTML = '<button type="button" class="nv-btn nv-btn--lg nv-btn--outline" data-gcancel>취소</button>'
      + '<button type="submit" form="gform" class="nv-btn nv-btn--lg nv-btn--primary">' + (isNew ? '등록하고 명단 추가' : '저장') + '</button>';
  }

  /* 명단 찾기 결과(옵션창). 폐기한 사람은 고를 수 없다 — 서브관리자관리에서 해제하면 다시 나온다 */
  function pickRows(people) {
    var g = group(S.gid);
    if (!people.length) {
      return '<p class="pick__row" role="option" aria-disabled="true">「' + esc(S.pickQ.trim()) + '」에 맞는 ' + (g && g.kind === 'staff' ? '직원 · 부서가' : '회원이') + ' 없습니다</p>';
    }
    return people.map(function (p) {
      var why = p.badge === '폐기한 계정' ? '서브관리자관리에서 폐기를 해제하면 넣을 수 있습니다.' : p.badge === '퇴직' ? '퇴직(사용 안 함) 직원은 넣을 수 없습니다.' : '';
      return '<button type="button" class="pick__row" role="option"' + (p.disabled ? ' aria-disabled="true"' + (why ? ' title="' + esc(why) + '"' : '') : ' data-pick="' + esc(p.actorId) + '"') + '>'
        + icon(p.kind === 'dept' ? 'users' : 'user') + esc(p.who || p.name) + (p.loginId ? ' <span class="pick__id">' + esc(p.loginId) + '</span>' : '')
        + '<span class="pick__meta">' + (p.badge ? '<span class="nv-badge">' + esc(p.badge) + '</span>' : esc(p.sub)) + '</span></button>';
    }).join('');
  }

  function untilSelect(row) {
    var now = row.validUntil ? String(row.validUntil).slice(0, 10) : '';
    var options = S.untilOptions.slice();
    if (now && options.indexOf(now) < 0) { options.unshift(now); }
    return '<select class="nv-select nv-select--sm" data-until="' + esc(row.assignmentId) + '" aria-label="' + esc(row.name) + ' 기간">'
      + '<option value=""' + (now ? '' : ' selected') + '>기간 없음</option>'
      + options.map(function (d) { return '<option value="' + esc(d) + '"' + (d === now ? ' selected' : '') + '>' + esc(d) + '까지</option>'; }).join('')
      + '</select>';
  }

  function membersTab(g) {
    var rows = S.members;
    var list;
    if (rows === null) {
      list = loading();
    } else if (!rows.length) {
      list = '<p class="gp2__count">총 <b>0</b></p><div class="gempty"><b>아직 명단이 없습니다</b><span>위에서 찾아 추가' + (g.grade ? '하세요' : '하거나 명단 업로드로 여러 명을 추가하세요') + '</span></div>';
    } else {
      list = '<p class="gp2__count">총 <b>' + rows.length + '</b></p><ul class="gmems">' + rows.map(function (row) {
        var dept = row.kind === 'dept';
        var sub = (dept ? '부서 · 부서원 ' + (row.deptMembers || 0) + '명 자동 포함' : row.loginId) + (row.org && row.org !== '-' ? ' · ' + row.org : '')
          + (row.siteId && row.siteId !== '*' ? ' · ' + row.siteName : '');
        return '<li class="gmem"><span class="mgr__icon"' + (dept ? ' title="그룹묶음(부서) — 그 부서에 지금 속한 직원 모두(하위 부서 제외)"' : '') + '>' + icon(dept ? 'users' : 'user') + '</span><div class="gmem__who"><b>' + esc(row.name)
          + (row.expired ? ' <span class="nv-badge nv-badge--warn">기간 지남</span>' : '') + '</b><span>' + esc(sub) + '</span></div>'
          + untilSelect(row)
          + '<button type="button" class="xbtn" data-unpick="' + esc(row.assignmentId) + '" aria-label="' + esc(row.name) + ' 명단에서 빼기" title="빼기 — 바로 저장됩니다">' + icon('close') + '</button></li>';
      }).join('') + '</ul>';
    }
    return '<div class="roster-add"><div class="pick"><div class="nv-input-wrap nv-input-wrap--left">' + icon('search')
      + '<label for="pick-q" class="nv-sr-only">' + (g.kind === 'staff' ? '명단에 추가할 직원 · 부서 찾기' : '명단에 추가할 회원 찾기') + '</label>'
      + '<input id="pick-q" class="nv-input" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="pick-list" aria-expanded="false" placeholder="'
      + (g.kind === 'staff' ? '직원 · 부서를 이름이나 사번으로 찾아 추가' : '회원 이름이나 회원ID로 찾아 추가') + '" value="' + esc(S.pickQ) + '"></div>'
      + '<div class="pick__list" id="pick-list" role="listbox" aria-label="찾은 사람" hidden></div></div>'
      + (g.grade ? '' : '<button type="button" class="nv-btn nv-btn--outline" data-gbulk aria-expanded="' + !!S.bulk + '" title="' + (g.kind === 'staff'
        ? '엑셀 서식에 사번 또는 부서코드와 기간(예: 2026-12-31)을 적어 올립니다. 미리 본 뒤 넣습니다' : '엑셀 서식에 회원ID와 기간(예: 2026-12-31)을 적어 올립니다. 미리 본 뒤 넣습니다') + '">' + icon('upload') + '명단 업로드</button>')
      + '</div>'
      + (S.bulk ? bulkBox(g) : '') + list;
  }

  /* 명단 업로드(엑셀): 서식 내려받기 → 파일 올리기(미리보기, 쓰지 않음) → 반영. 반영 때 서버가 다시 검사한다 */
  function bulkBox(g) {
    var rows = S.bulk.rows;
    var staffKind = g && g.kind === 'staff';
    var table = !rows ? '' : !rows.length ? '<div class="nv-empty"><p class="nv-empty__desc">파일에 넣을 사람이 없습니다.</p></div>'
      : '<div class="gbulk__scroll"><table class="nv-table"><caption class="nv-sr-only">파일 미리보기</caption><thead><tr><th scope="col">행</th><th scope="col">'
        + (staffKind ? '사번 · 부서코드' : '회원ID') + '</th><th scope="col">이름</th><th scope="col">기간</th><th scope="col">결과</th></tr></thead><tbody>'
        + rows.map(function (row) {
          return '<tr><td>' + esc(row.row) + '</td><td>' + (row.kind === 'dept' ? '<span class="nv-badge">부서</span> ' : '') + esc(row.loginId) + '</td><td>' + esc(row.name) + '</td><td>' + esc(row.until || '기간 없음') + '</td><td>'
            + (row.error ? '<span class="nv-text-err">' + esc(row.error) + '</span>' : '<span class="nv-badge nv-badge--ok">넣을 수 있음</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    var ready = rows ? rows.filter(function (row) { return !row.error; }).length : 0;
    return '<div class="gbulk">'
      + '<div class="gbulk__head"><a class="nv-btn nv-btn--sm nv-btn--outline" href="' + esc(BASE) + '/bulk/template?kind=' + (staffKind ? 'staff' : 'member') + '" download'
      + ' title="' + (staffKind ? '머리글: 사번 · 부서코드 · 기간. 행마다 사번이나 부서코드 하나' : '머리글: 회원ID · 기간') + '">' + icon('download') + '서식 내려받기</a>'
      + '<label class="nv-btn nv-btn--sm nv-btn--soft">' + icon('upload') + '파일 올리기<input class="nv-sr-only" id="gbulk-file" type="file" accept=".xlsx" data-gbulk-file></label>'
      + (S.bulk.busy ? '<span class="nv-text-sm nv-text-subtle" role="status">읽는 중입니다.</span>' : '')
      + (S.bulk.name ? '<span class="nv-text-sm nv-text-subtle">' + esc(S.bulk.name) + '</span>' : '') + '</div>'
      + table
      + (rows && rows.length ? '<div class="gbulk__foot"><span class="nv-text-sm">넣을 수 있음 ' + ready + '건 · 오류 ' + (rows.length - ready) + '건</span><button type="button" class="nv-btn nv-btn--sm nv-btn--primary" data-gbulk-apply' + (ready && !S.bulk.busy ? '' : ' disabled') + ' title="오류가 없는 줄만 넣습니다">' + ready + '건 넣기</button></div>' : '')
      + '</div>';
  }
  function bulkUpload(file) {
    var g = group(S.gid);
    var form = new FormData();
    form.append('file', file);
    S.bulk = { name: file.name, rows: null, busy: true };
    S.error = '';
    keepFocus();
    api('/groups/' + encodeURIComponent(g.roleId) + '/bulk/preview', { method: 'POST', form: form }).then(function (data) {
      S.bulk = { name: file.name, rows: data.rows, busy: false };
      keepFocus();
    }).catch(function (error) {
      S.bulk = { name: '', rows: null, busy: false };
      fail(error);
    });
  }
  function bulkApply() {
    var g = group(S.gid);
    var rows = S.bulk.rows.filter(function (row) { return !row.error; }).map(function (row) { return { row: row.row, loginId: row.loginId, until: row.until, kind: row.kind }; });
    S.bulk.busy = true;
    keepFocus();
    api('/groups/' + encodeURIComponent(g.roleId) + '/bulk/apply', { method: 'POST', body: { rows: rows } }).then(function (data) {
      toast('명단에 ' + data.added + '건을 넣었습니다.');
      var failed = (data.failed || []).map(function (row) { return row.row + '행 ' + row.loginId + ': ' + row.error; }).join(' · ');
      S.bulk = null;
      return refreshMembers('[data-gbulk]').then(function () {
        if (failed) { S.error = '넣지 못한 줄이 있습니다. ' + failed; render(); }
      });
    }).catch(function (error) {
      S.bulk.busy = false;
      fail(error);
    });
  }

  /* 누리집 접근권한 · 관리자메뉴 한 줄: 경로 「A › B › <b>C</b>」(C = 그 메뉴로 가는 링크) + 칸 배지 */
  function placeRow(row, badges) {
    var path = String(row.path || '').split(' › ');
    var last = path.pop();
    return '<li class="gplace"><span class="gplace__path">' + path.map(function (p) { return esc(p) + ' › '; }).join('')
      + '<a href="' + esc(row.url) + '"><b>' + esc(last) + '</b></a>' + (row.inherited ? '<span class="nv-badge">상위 따름</span>' : '') + '</span>'
      + '<span class="gplace__perm">' + badges + '</span></li>';
  }
  function permsTab() {
    var rows = S.access;
    if (rows === null) { return loading(); }
    if (!rows.length) { return '<div class="gempty"><b>아직 접근권한을 받은 누리집 메뉴가 없습니다</b></div>'; }
    return '<p class="gp2__count">총 <b>' + rows.length + '</b>곳</p><ul class="gplaces">' + rows.map(function (row) {
      return placeRow(row, row.acts.map(function (a) { return '<span class="nv-badge nv-badge--primary">' + esc(a) + '</span>'; }).join('')
        + (row.manager ? '<span class="nv-badge nv-badge--info">관리자 권한</span>' : ''));
    }).join('') + '</ul>';
  }

  /* 관리자메뉴: 이 권한그룹 사람의 콘솔 왼쪽에 보이는 메뉴(관리자메뉴관리의 보기 · 고치기) */
  function adminMenusTab() {
    var link = '<p class="gnote"><a href="' + esc(ADMIN_MENUS) + '">관리자메뉴관리로 가기</a></p>';
    var rows = S.adminMenus;
    if (rows === null || rows === undefined) { return loading(); }
    if (!rows.length) { return '<div class="gempty"><b>아직 받은 관리자 메뉴가 없습니다</b></div>' + link; }
    return '<p class="gp2__count">총 <b>' + rows.length + '</b>곳</p><ul class="gplaces">' + rows.map(function (row) {
      return placeRow(row, '<span class="nv-badge nv-badge--outline">' + esc(row.acts) + '</span>');
    }).join('') + '</ul>' + link;
  }

  function detailTabs(g) {
    return g.kind === 'staff' ? [['members', '명단'], ['perms', '누리집 접근권한'], ['amenu', '관리자메뉴']] : [['members', '명단'], ['perms', '누리집 접근권한']];
  }
  function renderDetail() {
    var g = group(S.gid);
    if (!g) { S.view = 'list'; S.gid = null; renderList(); return; }
    if (g.base) { S.tab = 'perms'; }
    var head = '<div class="gp2__head"><div><div class="gpl__name gp2__title">' + nameOf(g) + '<small>' + esc(g.code) + '</small>' + kindBadge(g) + '</div>'
      + '<p class="gp2__desc">' + esc(g.desc || '') + (g.base ? ' · 명단 없음' : '') + '</p></div>'
      + (g.base ? '' : '<button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-gedit="' + esc(g.id) + '">' + icon('edit') + '수정</button>') + '</div>';
    var content = g.base
      ? '<h3 class="gp2__formtitle gp2__subtitle">누리집 접근권한</h3>' + permsTab()
      : '<div class="nv-tabs gtabs gp2__tabs" role="tablist" aria-label="권한그룹 상세">' + detailTabs(g).map(function (t) {
          return '<button type="button" role="tab" aria-selected="' + (S.tab === t[0]) + '" tabindex="' + (S.tab === t[0] ? 0 : -1) + '" data-gt="' + t[0] + '">' + esc(t[1]) + '</button>';
        }).join('') + '</div>'
        + (S.tab === 'members' ? membersTab(g) : S.tab === 'amenu' ? adminMenusTab() : permsTab());
    body.innerHTML = errorBox() + back() + head + content;
    var ag = accessGroup(g.id) || (g.base ? { id: g.id, code: g.code, name: g.name, kind: 'base' } : null);
    var blocked = blockedText(g);
    var addButton = '';
    if (context && !blocked) {
      if (present(ag)) {
        addButton = '<button type="button" class="nv-btn nv-btn--lg nv-btn--primary" disabled>「' + esc(context.name) + '」에 이미 있음</button>';
      } else if (can(ag)) {
        addButton = '<button type="button" class="nv-btn nv-btn--lg nv-btn--primary" data-addto="' + esc(g.id) + '">' + esc(targetLabel()) + '에 추가</button>';
      }
    }
    foot.innerHTML = closeButton() + addButton;
  }

  function render() {
    if (!S.loaded) {
      body.innerHTML = errorBox() + (S.error ? '' : loading());
      foot.innerHTML = closeButton();
      return;
    }
    if (S.view === 'detail') {
      renderDetail();
      // 다시 그리면 찾기 결과 칸이 비므로 입력이 남아 있으면 다시 찾는다
      if (S.pickQ.trim() && panel.querySelector('#pick-list')) { searchPeople(); }
    } else if (S.view === 'form') {
      renderForm();
    } else {
      renderList();
    }
  }

  /* ---------- 상세 값 읽기 ---------- */
  function loadTab() {
    var g = group(S.gid);
    if (!g) { return; }
    if (S.tab === 'members' && !g.base) {
      var forId = g.id;
      api('/groups/' + encodeURIComponent(g.roleId) + '/members').then(function (rows) {
        if (S.gid === forId) { S.members = rows; if (S.tab === 'members') { keepFocus(); } }
      }).catch(fail);
    } else if (S.tab === 'amenu' && !g.base && g.kind === 'staff') {
      var amId = g.id;
      S.adminMenus = null;
      api('/groups/' + encodeURIComponent(g.roleId) + '/admin-menus').then(function (rows) {
        if (S.gid === amId) { S.adminMenus = rows; if (S.tab === 'amenu') { keepFocus(); } }
      }).catch(fail);
    } else if (S.tab === 'perms') {
      var key = g.id;
      api('/access?key=' + encodeURIComponent(key)).then(function (rows) {
        if (S.gid === key) { S.access = rows; if (S.tab === 'perms') { keepFocus(); } }
      }).catch(fail);
    }
  }
  /* 다시 그려도 입력 중인 칸 · 고른 값의 포커스를 지킨다 */
  function keepFocus() {
    var active = document.activeElement;
    var selector = active && active.id && panel.contains(active) ? '#' + active.id
      : active && active.matches && active.matches('[data-until]') ? '[data-until="' + active.getAttribute('data-until') + '"]'
        : active && active.matches && active.matches('[data-gt]') ? '[data-gt="' + active.getAttribute('data-gt') + '"]'
          : active && active.matches && active.matches('[data-gpick]') ? '[data-gpick][value="' + active.value + '"]' : null;
    render();
    if (selector) { var el = panel.querySelector(selector); if (el) { el.focus(); } }
  }
  function showDetail(id, tab) {
    var g = group(id);
    S.view = 'detail';
    S.gid = id;
    S.tab = g && g.base ? 'perms' : (tab === 'amenu' && g && g.kind !== 'staff' ? 'members' : (tab || 'members'));
    S.form = null;
    S.pickQ = '';
    S.members = null;
    S.access = null;
    S.adminMenus = null;
    S.error = '';
    S.bulk = null;
    render();
    loadTab();
  }
  function showList(highlight) {
    S.hl = highlight || null;
    S.view = 'list';
    S.gid = null;
    S.form = null;
    S.error = '';
    render();
  }
  function showForm(id) {
    S.view = 'form';
    S.form = id;
    S.error = '';
    render();
    focusLater('#gf-name');
  }

  /* ---------- 열기 · 닫기 ---------- */
  function open(options) {
    var o = options || {};
    returnFocus = document.activeElement;
    var opener = returnFocus && returnFocus.closest ? returnFocus : null;
    var mode = o.mode || (opener && (opener.id === 'add-mgr' || opener.closest('[data-group-mode="manager"]')) ? 'manager' : 'access');
    // staffOnly: 관리자메뉴관리에서 연 창 — 새 그룹은 관리자 권한그룹으로만 만든다
    Object.assign(S, { view: 'list', gid: null, tab: 'members', form: null, q: '', pickQ: '', hl: null, error: '', loaded: false, members: null, access: null,
      adminMenus: null, bulk: null, picked: {}, mode: mode, staffOnly: !!o.staffOnly });
    // 창 설명(제목 툴팁): 관리자메뉴관리에서 열면 그 문구
    var title = document.getElementById('gp-title');
    if (title) {
      if (!title.hasAttribute('data-title-default')) { title.setAttribute('data-title-default', title.getAttribute('title') || ''); }
      title.setAttribute('title', S.staffOnly ? '관리자메뉴관리에는 관리자 권한그룹만 넣을 수 있습니다. 권한그룹 변경은 바로 저장되고 접속기록에 남습니다.'
        : title.getAttribute('data-title-default'));
    }
    render();
    if (!isOpen()) { document.getElementById('group-panel-trigger').click(); }
    return loadGroups().then(function () {
      if (o.editing === 'new' || group(o.editing)) { showForm(o.editing); return; }
      if (o.gid && group(o.gid)) {
        showDetail(o.gid, o.tab);
        if (o.bulk) { S.bulk = { name: '', rows: null, busy: false }; render(); }
        focusLater(o.bulk ? '[data-gbulk]' : '[role="tab"][aria-selected="true"], [data-gback]');
        return;
      }
      render();
      focusLater('#g-q');
    }).catch(fail);
  }
  function close() { var x = panel.querySelector('.nv-panel__close'); if (x) { x.click(); } }
  panel.addEventListener('nv:panel-close', function () {
    window.clearTimeout(pickTimer);
    var el = returnFocus;
    returnFocus = null;
    if (el && el.focus && document.contains(el)) { el.focus(); }
  });

  /* ---------- 지우기 ---------- */
  function usageHtml(usage) {
    var menus = usage.menus || [];
    return '<p>명단 ' + esc(usage.count) + '명이 이 권한그룹의 접근권한과 관리자메뉴를 잃습니다.' + (menus.length ? ' 쓰는 곳:' : ' 쓰는 곳은 없습니다.') + ' 삭제하면 되돌릴 수 없습니다.</p>'
      + (menus.length ? '<ul class="gconfirm__list">' + menus.map(function (name) { return '<li>' + esc(name) + '</li>'; }).join('') + '</ul>' : '');
  }
  function askDelete(id) {
    var ready = S.loaded && group(id) ? Promise.resolve() : loadGroups();
    return ready.then(function () {
      var g = group(id);
      if (!g || !g.roleId) { return null; }
      return api('/groups/' + encodeURIComponent(g.roleId) + '/usage').then(function (usage) {
        return window.nvConfirm({ title: '「' + g.name + '」 권한그룹을 삭제할까요?', html: usageHtml(usage), verb: '삭제', danger: true }).then(function (yes) {
          if (!yes) { return null; }
          return api('/groups/' + encodeURIComponent(g.roleId) + '/delete', { method: 'POST' }).then(function () {
            toast('「' + g.name + '」 권한그룹을 지웠습니다.');
            if (S.gid === id) { S.view = 'list'; S.gid = null; }
            if (S.form === id) { S.view = 'list'; S.form = null; }
            delete S.picked[id];
            return loadGroups().then(function () {
              S.error = '';
              if (isOpen()) { render(); focusLater('#g-q'); }
              notifyChanged([id]);
            });
          });
        });
      });
    }).catch(fail);
  }

  /* ---------- 등록 · 수정 ---------- */
  function fieldError(message) {
    var err = panel.querySelector('#gf-err');
    if (err) { err.textContent = message; }
    var name = panel.querySelector('#gf-name');
    if (name) { name.setAttribute('aria-invalid', 'true'); name.focus(); }
  }
  function submitForm(form) {
    var id = form.getAttribute('data-gid');
    var isNew = id === 'new';
    var name = panel.querySelector('#gf-name').value.trim();
    var desc = panel.querySelector('#gf-desc').value.trim();
    if (!name) { fieldError('그룹명을 넣으세요.'); return; }
    if (S.groups.some(function (g) { return g.name === name && g.id !== id; })) { fieldError('「' + name + '」 권한그룹이 이미 있습니다.'); return; }
    var kind = S.staffOnly ? 'staff' : (form.querySelector('[name="gf-kind"]:checked') || {}).value || 'staff';
    var g = isNew ? null : group(id);
    var request = isNew ? api('/groups', { method: 'POST', body: { name: name, kind: kind, desc: desc } })
      : api('/groups/' + encodeURIComponent(g.roleId), { method: 'POST', body: { name: name, desc: desc } });
    request.then(function (saved) {
      return loadGroups().then(function () {
        S.error = '';
        if (isNew) {
          toast('권한그룹을 등록했습니다');
          showDetail(saved.id, 'members');
          focusLater('#pick-q');
        } else {
          toast('권한그룹을 저장했습니다.');
          showList(id);
          focusLater('.gpl__row.is-hl [data-gdetail]');
        }
        notifyChanged([]);
      });
    }).catch(function (error) {
      if (error.field === 'name') { fieldError(error.message); } else { fail(error); }
    });
  }

  /* ---------- 명단 ---------- */
  function pickList() { return panel.querySelector('#pick-list'); }
  function closePick() {
    var list = pickList();
    var input = panel.querySelector('#pick-q');
    if (list) { list.hidden = true; list.innerHTML = ''; }
    if (input) { input.setAttribute('aria-expanded', 'false'); }
  }
  function searchPeople() {
    var g = group(S.gid);
    var list = pickList();
    var input = panel.querySelector('#pick-q');
    if (!g || !list) { return; }
    var q = S.pickQ.trim();
    var seq = ++pickSeq;
    var show = function (html) {
      if (seq !== pickSeq || !pickList()) { return; }
      list.innerHTML = html;
      list.hidden = false;
      if (input) { input.setAttribute('aria-expanded', 'true'); }
    };
    // 검색어가 없으면 맨 아래 「여러 명 한번에 고르기」 줄만 보인다
    if (!q) { if (multiFoot(g)) { show(multiFoot(g)); } else { closePick(); } return; }
    api('/groups/' + encodeURIComponent(g.roleId) + '/people?q=' + encodeURIComponent(q))
      .then(function (people) { show(pickRows(people) + (multiFoot(g) ? '<div class="pick__sep" role="separator"></div>' + multiFoot(g) : '')); })
      .catch(function () { show('<p class="pick__row" role="option" aria-disabled="true">사람을 찾지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>'); });
  }
  /* 검색 옵션창 맨 아래 「여러 명 한번에 고르기」(roster-multi.js). 콘솔 등급 그룹은 한 명씩 넣는다 */
  function multiFoot(g) {
    if (!window.nvRosterMulti || !g || g.grade) { return ''; }
    return '<button type="button" class="pick__row pick__foot" role="option" data-gmulti>' + icon('users') + '여러 명 한번에 고르기<span class="pick__meta">'
      + (g.kind === 'staff' ? '부서 · 사람' : '회원') + '</span>' + icon('chevron-right') + '</button>';
  }
  function openMulti() {
    var g = group(S.gid);
    closePick();
    window.nvRosterMulti.open({
      base: BASE, roleId: g.roleId, roleName: g.name, kind: g.kind === 'staff' ? 'staff' : 'member', untilOptions: S.untilOptions,
      onDone: function (result) {
        toast('명단에 ' + (result.added || 0) + '건 넣었습니다.');
        refreshMembers('#pick-q');
      }
    });
  }
  function refreshMembers(afterFocus) {
    var g = group(S.gid);
    return Promise.all([loadGroups(), api('/groups/' + encodeURIComponent(g.roleId) + '/members')]).then(function (done) {
      S.members = done[1];
      S.error = '';
      render();
      if (afterFocus) { var el = panel.querySelector(afterFocus); if (el) { el.focus(); } }
      notifyChanged([]);
    });
  }

  /* ---------- 이벤트 ---------- */
  panel.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t || !panel.contains(t)) { return; }
    var d = t.dataset;
    if ('gnew' in d) { showForm('new'); return; }
    if (d.gedit) { showForm(d.gedit); return; }
    if ('gcancel' in d) {
      var was = S.form;
      if (was !== 'new' && S.gid === was) { S.view = 'detail'; S.form = null; render(); focusLater('[data-gedit]'); } else { showList(was === 'new' ? null : was); focusLater('#g-q'); }
      return;
    }
    if (d.gdetail) {
      showDetail(d.gdetail, d.gtab);
      focusLater('[role="tab"][aria-selected="true"], [data-gback]');
      return;
    }
    if ('gback' in d) { var from = S.gid || (S.form !== 'new' ? S.form : null); showList(from); focusLater('#g-q'); return; }
    if (d.gt) {
      S.tab = d.gt;
      S.members = d.gt === 'members' ? null : S.members;
      S.access = d.gt === 'perms' ? null : S.access;
      render();
      panel.querySelector('[data-gt="' + d.gt + '"]').focus();
      loadTab();
      return;
    }
    if (d.gdel) { askDelete(d.gdel); return; }
    if ('gbulk' in d) { S.bulk = S.bulk ? null : { name: '', rows: null, busy: false }; keepFocus(); var again = panel.querySelector('[data-gbulk]'); if (again) { again.focus(); } return; }
    if ('gbulkApply' in d) { bulkApply(); return; }
    if ('gmulti' in d) { openMulti(); return; }
    if (d.pick) {
      var g = group(S.gid);
      api('/groups/' + encodeURIComponent(g.roleId) + '/members', { method: 'POST', body: { actorId: d.pick } }).then(function () {
        toast('명단에 추가했습니다.');
        S.pickQ = '';
        return refreshMembers('#pick-q');
      }).catch(fail);
      return;
    }
    if (d.unpick) {
      var owner = group(S.gid);
      api('/groups/' + encodeURIComponent(owner.roleId) + '/members/' + encodeURIComponent(d.unpick) + '/revoke', { method: 'POST' })
        .then(function () { toast('명단에서 뺐습니다.'); return refreshMembers('#pick-q'); }).catch(fail);
      return;
    }
    if ('addpicked' in d) {
      var ids = pickedIds();
      ids.forEach(function (id) { if (manager()) { context.addManager(id); } else { context.addAccess(id); } });
      close();
      return;
    }
    if (d.addto) {
      if (manager()) { context.addManager(d.addto); } else { context.addAccess(d.addto); }
      close();
    }
  });
  panel.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'g-q') {
      S.q = t.value;
      var list = panel.querySelector('.glist');
      if (list) { list.innerHTML = listItems(); }
      return;
    }
    if (t.id === 'pick-q') {
      S.pickQ = t.value;
      window.clearTimeout(pickTimer);
      pickTimer = window.setTimeout(searchPeople, 200);
    }
  });
  // 옵션창 밖을 누르면 닫는다
  panel.addEventListener('mousedown', function (e) {
    var list = pickList();
    if (list && !list.hidden && !e.target.closest('.roster-add .pick')) { closePick(); }
  });
  var quietFocus = false;   // Esc 로 닫고 입력 칸으로 돌아올 때는 다시 열지 않는다
  panel.addEventListener('focusin', function (e) {
    if (!quietFocus && e.target.id === 'pick-q' && !S.pickQ.trim() && pickList() && pickList().hidden) { searchPeople(); }
  });
  /* 찾기 옵션창: ↓ 로 결과에 들어가 ↑ · ↓ 로 옮기고, Esc 로 닫고 입력 칸으로 */
  panel.addEventListener('keydown', function (e) {
    var list = pickList();
    if (!list || list.hidden) { return; }
    var inPick = e.target.id === 'pick-q' || list.contains(e.target);
    if (!inPick) { return; }
    var items = Array.prototype.slice.call(list.querySelectorAll('button.pick__row:not([aria-disabled="true"])'));
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePick(); quietFocus = true; panel.querySelector('#pick-q').focus(); quietFocus = false; return; }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
      e.preventDefault();
      var i = items.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
      items[(i + items.length) % items.length].focus();
    }
  }, true);
  panel.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-gbulk-file]')) {
      if (t.files && t.files[0]) { bulkUpload(t.files[0]); }
      return;
    }
    if (t.matches('[data-gpick]')) {
      S.picked[t.value] = t.checked;
      var row = t.closest('.gpl__row');
      if (row) { row.classList.toggle('is-on', t.checked); }
      renderListFoot();
      return;
    }
    if (!t.matches('[data-until]')) { return; }
    var g = group(S.gid);
    var id = t.getAttribute('data-until');
    api('/groups/' + encodeURIComponent(g.roleId) + '/members/' + encodeURIComponent(id) + '/period', { method: 'POST', body: { validUntil: t.value } }).then(function () {
      toast('기간을 바꿨습니다.');
      return refreshMembers('[data-until="' + id + '"]');
    }).catch(fail);
  });
  /* 등록 · 수정 폼: 단추는 아래 막대에 있어 form 속성으로 보낸다 */
  panel.addEventListener('submit', function (e) {
    if (e.target.id !== 'gform') { return; }
    e.preventDefault();
    submitForm(e.target);
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-group-panel-open], [data-group-open], [data-group-new], [data-group-edit], [data-group-delete], [data-group-bulk]') : null;
    if (!t || panel.contains(t)) { return; }
    if (t.hasAttribute('data-group-bulk')) { open({ gid: t.getAttribute('data-group-bulk'), tab: 'members', bulk: true }); return; }
    if (t.hasAttribute('data-group-open')) { open({ gid: t.getAttribute('data-group-open'), tab: t.getAttribute('data-group-tab') || 'members' }); return; }
    if (t.hasAttribute('data-group-panel-open')) { open(); return; }
    if (t.hasAttribute('data-group-new')) { open({ editing: 'new' }); return; }
    if (t.hasAttribute('data-group-edit')) { open({ editing: t.getAttribute('data-group-edit') }); return; }
    askDelete(t.getAttribute('data-group-delete'));
  });

  window.groupPanel = {
    setContext: function (value) { context = value || null; if (isOpen() && S.loaded) { render(); } },
    open: open
  };
})();
