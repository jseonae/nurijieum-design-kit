/* 메뉴 수정 · 게시판 수정 「접근권한」 탭(퍼블리싱 2 · 3단계 접근권한 공통안).
 *  「상위 메뉴와 같게」 체크 한 줄 · 권한그룹별 표(오른쪽 ✕ 로 줄 빼기) · 「권한그룹 추가」 버튼 + 찾기 목록 ·
 *  관리자 권한 카드(✕) · 「관리자 권한 추가」 버튼 + 찾기 목록(관리자 ID 로 사람 찾기) · 오른쪽 「적용 요약」.
 * 처음 값은 서버가 data-access-state 로 준다(MenuAccessPanel). 저장은 폼 전송(MenuAccessAdminController).
 * 저장 영역 · 사유 줄 · 탭 점은 menu-edit.js 의 window.menuEditUi.paint('perm', …) 로 그린다.
 * 메뉴 수정 화면(폼에 batch 칸이 있다)은 변경 건수 · 되돌리기 · 저장이 탭에 보관한 같은 사이트의 모든 메뉴 초안에 걸친다(menu-draft.js).
 * 권한그룹 명단 · 관리는 window.groupPanel(권한이 없으면 없다) 로 열고, 없으면 그 항목을 그리지 않는다. */
(function () {
  'use strict';
  var form = document.getElementById('perm-form');
  if (!form) { return; }
  var S = JSON.parse(form.getAttribute('data-access-state'));
  var root = form.querySelector('[data-access-root]');
  var summary = form.querySelector('[data-access-summary]');
  var head = document.querySelector('[data-savehead="perm"]');
  var reasonbar = document.querySelector('[data-reasonbar="perm"]');
  var applyChildren = false;   // 「하위 메뉴 N개도 상위 메뉴와 같게로」(저장 때만 보내는 값)
  var ui = function () { return window.menuEditUi || null; };
  var ACTIONS = {
    group: [{ k: 'view', l: '보기', h: '메뉴가 GNB · 전체메뉴에 보이고 들어갈 수 있음' }],
    content: [{ k: 'view', l: '보기', h: '콘텐츠 페이지를 볼 수 있음' }],
    board: [
      { k: 'list', l: '목록', h: '글 목록을 볼 수 있음' },
      { k: 'read', l: '읽기', h: '글 본문을 읽을 수 있음' },
      { k: 'write', l: '쓰기', h: '콘솔에서 글을 쓰고 고치고 지움. 관리자 권한그룹만 켭니다(공개 글쓰기 없음)' },
      { k: 'reply', l: '답변', h: '콘솔에서 글에 답변을 닮. 관리자 권한그룹만 켭니다(공개 글쓰기 없음)' },
      { k: 'down', l: '다운로드', h: '첨부 파일을 내려받을 수 있음' }
    ],
    service: [{ k: 'view', l: '보기', h: '화면에 들어갈 수 있음. 자료 내려받기는 화면 안에서 연결 서비스가 정합니다' }],
    link: [{ k: 'view', l: '보기', h: '메뉴가 보이고, 누르면 바깥 주소로 감' }]
  };
  var IMPLIES = { read: ['list'], write: ['list', 'read'], reply: ['list', 'read'], down: ['list', 'read'] };
  var VIEWSET = { group: ['view'], content: ['view'], board: ['list', 'read', 'down'], service: ['view'], link: ['view'] };
  var BASE = {
    anyone: { id: 'anyone', code: 'G100', name: '누구나', kind: 'base', meta: '기본 · 비회원 포함' },
    member: { id: 'member', code: 'G300', name: '일반회원', kind: 'base', meta: '기본 · 회원 전체' },
    staff: { id: 'staff', code: 'G400', name: '직원', kind: 'base', meta: '기본 · 쓰기 · 답변만' }
  };
  var KIND_TIP = {
    anyone: '누구나 [G100] — 로그인하지 않은 방문자까지 모두',
    member: '일반회원 [G300] — 로그인한 회원 모두. 「누구나」 칸도 함께 받습니다',
    staff: '직원 [G400] — 관리자 권한그룹에 든 직원 모두. 직원은 공개 회원이 아니어서 게시판 쓰기 · 답변만 받습니다',
    staffGone: '공개 메뉴에는 직원 줄을 두지 않습니다(직원은 공개 회원이 아닙니다). 옛 설정이 남아 있어 보입니다 — ✕ 로 빼고 저장하세요',
    staffGroup: '관리자 권한그룹 — 서브관리자를 넣습니다. 접근권한 · 관리자 권한을 모두 받을 수 있습니다',
    memberGroup: '회원 권한그룹 — 누리집 회원만 넣습니다. 접근권한만 받고, 관리자 권한에는 넣을 수 없습니다'
  };
  var acts = ACTIONS[S.kind] || ACTIONS.content;
  var allKeys = acts.map(function (a) { return a.k; });
  var viewset = VIEWSET[S.kind] || ['view'];
  var isBoard = S.kind === 'board';
  /* 기본 줄: 누구나 · 일반회원. 직원 [G400] 줄은 게시판에만(쓰기 · 답변) 둔다 — 공개 메뉴에 남은 옛 직원 줄은 「없어진 줄」로 보여 ✕ 로 뺀다 */
  var BASE_IDS = isBoard ? ['anyone', 'member', 'staff'] : ['anyone', 'member'];
  var roleLock = S.requiredRoles && S.requiredRoles.length > 0;
  var shared = S.shared && S.shared.length > 1;
  var batchField = form.querySelector('[data-access-field="batch"]');
  var onBoardScreen = isBoard && !batchField;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function mgrOf(list) { return list.map(function (x) { return { t: x.t, id: x.id, name: x.name, login: x.login, org: x.org }; }); }
  var saved = { inherit: !!S.inherit, rows: S.rows || {}, mgrs: mgrOf(S.managers || []) };
  var draft = clone(saved);
  /* 저장 안 한 변경은 메뉴 수정 화면에서 탭에 보관한다(menu-draft.js). 게시판 권한 화면은 보관하지 않는다.
   * 게시판 · 화면을 함께 쓰는 메뉴는 접근권한이 하나라 첫 메뉴 자리에 초안 하나만 둔다 */
  var drafts = batchField && window.menuDraft ? window.menuDraft : null;
  var editRoot = form.closest('[data-menu-edit]');
  var pageId = editRoot ? editRoot.getAttribute('data-menu-id') : null;
  var keepId = drafts ? ((S.sharedIds && S.sharedIds[0]) || pageId) : null;
  var keepBase = JSON.stringify(saved);
  var keepLabel = S.sharedNames && S.sharedNames.length > 1 ? S.sharedNames.join(' · ') + (isBoard ? '(같은 게시판)' : '(같은 화면)') : S.name;
  if (drafts) {
    // 일괄 저장이 돌아왔으면 끝난 메뉴의 초안을 지운다(실패한 메뉴의 초안은 남아 다시 저장할 수 있다)
    (form.getAttribute('data-access-done') || '').split(',').filter(Boolean).forEach(function (id) {
      drafts.drop(id === pageId ? keepId : id, 'perm');
    });
    var kept = drafts.load(keepId, 'perm', keepBase);
    if (kept) { draft = kept; }
  }
  function otherDrafts() {
    return drafts ? drafts.entries('perm', S.siteId).filter(function (entry) { return entry.id !== keepId; }) : [];
  }
  var newRows = {};   // 방금 더한 줄: 한 번 강조하고 지운다
  var warnMin = false;   // 마지막 줄을 빼려 할 때의 경고
  var adding = null;     // 열린 찾기 목록: 'group' | 'mgr'
  var mgrMode = 'groups';   // 관리자 권한 찾기 목록: groups | person
  function toast(text) { if (window.nvToast) { window.nvToast(text); } }

  function group(id) {
    if (BASE[id]) { return BASE[id]; }
    var g = (S.groups || []).filter(function (x) { return x.id === id; })[0];
    return g || null;
  }
  function gname(g) { return g.code ? g.name + ' [' + g.code + ']' : g.name; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/"/g, '&quot;'); }
  function icon(n, cls) { return '<svg class="nv-icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#nv-i-' + n + '"/></svg>'; }
  function label(x) { return (acts.filter(function (y) { return y.k === x; })[0] || {}).l || x; }

  function expand(list) {
    var out = {};
    (list || []).forEach(function (a) {
      if (allKeys.indexOf(a) < 0) { return; }
      out[a] = true;
      (IMPLIES[a] || []).forEach(function (x) { if (allKeys.indexOf(x) >= 0) { out[x] = true; } });
    });
    return out;
  }
  /* 상위 메뉴 규칙: 보기 줄 하나를 이 메뉴의 보기 칸 전부로 */
  function parentEffective() {
    var res = {};
    Object.keys(S.parentRows || {}).forEach(function (g) {
      var one = {};
      viewset.forEach(function (a) { one[a] = true; });
      res[g] = one;
    });
    return res;
  }
  function effective(p) {
    if (p.inherit && S.hasParent) { return parentEffective(); }
    var res = {};
    Object.keys(p.rows).forEach(function (g) { res[g] = expand(p.rows[g]); });
    return res;
  }
  /* 쌓이는 기본 줄: 일반회원 ⊇ 누구나. 직원은 공개 회원이 아니라 일반회원 칸을 받지 않는다(11/10) */
  function withBase(eff) {
    var out = {};
    Object.keys(eff).forEach(function (g) { out[g] = Object.assign({}, eff[g]); });
    out.member = out.member || {};
    Object.keys(out.anyone || {}).forEach(function (a) { out.member[a] = true; });
    return out;
  }
  /* 공개 메뉴에 남은 옛 직원 줄(없어진 줄) */
  function staffGone(gid) { return gid === 'staff' && !isBoard && !roleLock; }

  /* 상위를 따르다 끌 때 물려받는 관리자 권한: 상위 관리자에서 이 메뉴 담당자를 뺀 것 */
  function parentMgrsCopy() {
    var seen = {};
    return mgrOf((S.parentManagers || []).filter(function (x) {
      var key = x.t + '|' + x.id;
      if (seen[key]) { return false; }
      seen[key] = true;
      return !(x.t === 'person' && (S.owners || []).some(function (o) { return o.id === x.id; }));
    }));
  }
  /* 「상위 메뉴와 같게」 끄기: 줄이 비어 있으면 상위 값으로 시작하고, 관리자 권한이 비어 있으면 상위 관리자를 가져온다 */
  function breakInherit() {
    var following = draft.inherit && S.hasParent;
    draft.inherit = false;
    if (!following) { return; }
    if (Object.keys(draft.rows).length === 0) {
      var from = parentEffective();
      Object.keys(from).forEach(function (g) { draft.rows[g] = Object.keys(from[g]); });
    }
    if (S.hasManagers && draft.mgrs.length === 0) { draft.mgrs = parentMgrsCopy(); }
  }
  function newCells(g) { return isBoard && g && g.kind === 'staff' ? ['write', 'reply'] : viewset.slice(); }

  /* 칸 하나를 켤 수 있는 줄인지: 게시판의 쓰기 · 답변은 직원 · 관리자 권한그룹만, 공개 칸(목록 · 읽기 · 다운로드)은 직원 · 관리자 권한그룹에 없다.
     공개 메뉴의 옛 직원 줄은 칸을 켜고 끄지 않는다(✕ 로 뺀다) */
  function blocked(g, key) {
    if (staffGone(g.id)) { return true; }
    if (!isBoard) { return false; }
    var consoleCell = key === 'write' || key === 'reply';
    if (g.id === 'staff') { return !consoleCell; }
    return consoleCell ? g.kind !== 'staff' : g.kind === 'staff';
  }

  /* 이 메뉴의 변경: [{ name, text }]. withChildren: 「하위 메뉴도」 체크까지(보관하지 않는 값이라 건수 계산에만) */
  function changes(withChildren) {
    var out = [];
    if (draft.inherit !== saved.inherit) { out.push({ name: '상위 메뉴와 같게', text: draft.inherit ? '켬' : '끔(개별 설정)' }); }
    if (!draft.inherit) {
      var was = saved.inherit ? parentEffective() : effective(saved);
      var now = effective(draft);
      var keys = {};
      Object.keys(now).concat(Object.keys(was)).forEach(function (k) { keys[k] = true; });
      Object.keys(keys).forEach(function (k) {
        var g = group(k);
        var name = g ? gname(g) : '(지운 그룹)';
        var a = now[k] || {}, b = was[k] || {};
        var hadRow = !!was[k], hasRow = !!now[k];
        if (hadRow && !hasRow) { out.push({ name: '권한그룹 빼기', text: name }); return; }
        var on = allKeys.filter(function (x) { return a[x] && !b[x]; });
        var off = allKeys.filter(function (x) { return b[x] && !a[x]; });
        // 새 줄은 「권한그룹 추가」 한 줄로(켠 칸을 함께 적는다)
        if (!hadRow && hasRow) {
          var direct = allKeys.filter(function (x) { return (draft.rows[k] || []).indexOf(x) >= 0; });
          out.push({ name: '권한그룹 추가', text: name + ((direct.length ? direct : on).length ? ' · ' + (direct.length ? direct : on).map(label).join(' · ') : '') });
          return;
        }
        if (on.length) { out.push({ name: name, text: on.map(label).join(' · ') + ' 허용' }); }
        if (off.length) { out.push({ name: name, text: off.map(label).join(' · ') + ' 해제' }); }
      });
      if (S.hasManagers) {
        var has = function (l, x) { return l.some(function (y) { return y.t === x.t && y.id === x.id; }); };
        var before = saved.inherit && S.hasParent ? parentMgrsCopy() : saved.mgrs;
        draft.mgrs.filter(function (x) { return !has(before, x); }).forEach(function (x) { out.push({ name: '관리자 권한 추가', text: whoName(x) }); });
        before.filter(function (x) { return !has(draft.mgrs, x); }).forEach(function (x) { out.push({ name: '관리자 권한 빼기', text: whoName(x) }); });
      }
    }
    if (withChildren && applyChildren) { out.push({ name: '하위 메뉴', text: S.childCount + '개를 「상위 메뉴와 같게」로' }); }
    return out;
  }
  function line(c) { return c.name + ' — ' + c.text; }
  /* 화면에 보일 아이디. 저장 값 x.id 의 「member:」 · 「emp:」 는 내지 않는다(직원은 사번). 지운 회원은 빈 값이다 */
  function loginText(x) { return x.login != null ? x.login : String(x.id || '').replace(/^(member|emp):/, ''); }
  function whoName(x) {
    if (x.t === 'group') { var g = group(x.id); return g ? gname(g) : '(지운 그룹)'; }
    var login = loginText(x);
    return (x.name || login) + (login ? '(' + login + ')' : '');
  }

  /* 권한그룹 이름: 패널을 쓸 수 있으면 눌러서 명단을 연다 */
  function groupLabel(g, tip) {
    var text = esc(g.name) + (g.code ? '<small>' + esc(g.code) + '</small>' : '');
    if (!window.groupPanel) { return text; }
    return '<button type="button" class="fixlink" data-opengroup="' + esc(g.id) + '" title="' + esc(tip) + '">' + text + '</button>';
  }

  /* 역할 고정 메뉴: 실제로 여는 것은 필요 역할뿐이다. 표만 그렇게 보이고 저장값(draft · saved)은 건드리지 않는다 */
  function requiredRowId(code) { return code === 'STAFF' ? 'staff' : code; }
  function requiredEffective() {
    var res = {};
    S.requiredRoles.forEach(function (code) {
      var one = {};
      viewset.forEach(function (a) { one[a] = true; });
      res[requiredRowId(code)] = one;
    });
    return res;
  }
  function expandDirect(list) { var out = {}; (list || []).forEach(function (a) { out[a] = true; }); return out; }
  function following() { return draft.inherit && S.hasParent; }
  /* ✕ 로 줄을 빼면 남는 권한그룹(칸이 하나라도 켜진 줄)이 없는지 */
  function lastRow(gid) {
    return Object.keys(draft.rows).filter(function (g) { return g !== gid && (draft.rows[g] || []).length; }).length === 0;
  }

  function tableHtml() {
    var ro = following() || roleLock;
    var eff = roleLock ? requiredEffective() : effective(draft);
    var effB = withBase(eff);
    var savedB = roleLock ? effB : withBase(saved.inherit ? parentEffective() : effective(saved));
    var savedRows = saved.inherit ? parentEffective() : effective(saved);
    var extra = Object.keys(ro ? eff : draft.rows).filter(function (g) { return BASE_IDS.indexOf(g) < 0; });
    var order = BASE_IDS.concat(extra);
    var rows = order.map(function (gid) {
      var g = group(gid);
      var gone = !g;
      if (gone) { g = { id: gid, code: null, name: roleLock ? gid : gid + ' (지운 그룹)', kind: 'member', count: 0 }; }
      var base = g.kind === 'base';
      var direct = ro ? (eff[gid] || {}) : expandDirect(draft.rows[gid]);
      var full = effB[gid] || {};
      var rowChanged = false;
      var impliedAny = false;
      var cells = acts.map(function (a) {
        var on = !!direct[a.k], implied = !on && !!full[a.k];
        var was = !!(savedB[gid] || {})[a.k], now = !!full[a.k];
        if (was !== now) { rowChanged = true; }
        if (implied) { impliedAny = true; }
        // 막힌 칸이어도 옛 값이 켜져 있으면 끌 수는 있다(몰래 바꾸지 않고 사람이 끈다). 없어진 직원 줄은 ✕ 로만 뺀다
        var stop = blocked(g, a.k) && (!on || staffGone(gid));
        var why = implied ? (gid !== 'anyone' && BASE_IDS.indexOf(gid) >= 0 ? '윗줄 권한을 함께 받음' : '다른 칸에 포함') : '';
        var tip = g.name + ' · ' + a.l + ' — ' + (staffGone(gid) ? '없어진 줄 — ✕ 로 빼고 저장하세요'
          : blocked(g, a.k) && on ? '이 줄에는 없는 칸입니다(옛 값). 끄면 다시 켤 수 없습니다'
          : stop ? ((a.k === 'write' || a.k === 'reply') ? '관리자 권한그룹만 켭니다. 공개 글쓰기는 없습니다' : '공개 화면 칸이라 직원 · 관리자 권한그룹에는 없습니다')
          : ro ? (roleLock ? '바꿀 수 없음' : '상위 메뉴를 따름(' + (now ? '허용' : '허용 안 함') + ')')
            : on ? '직접 허용. 누르면 끕니다' : implied ? why + '해서 저절로 허용' : '허용 안 함. 누르면 켭니다')
          + (was !== now ? ' (저장 안 함: ' + (was ? '허용' : '안 함') + ' → ' + (now ? '허용' : '안 함') + ')' : '');
        return '<td><label class="cellcheck ' + (implied ? 'is-implied ' : '') + (was !== now ? 'is-changed' : '') + '" title="' + esc(tip) + '"><input type="checkbox" data-cell="' + esc(gid) + '|' + a.k + '" ' + (on ? 'checked ' : '') + (ro || implied || stop ? 'disabled ' : '') + 'aria-label="' + esc(g.name + ' ' + a.l + (implied ? ' (' + why + ')' : '')) + '"></label></td>';
      }).join('');
      var isNew = !ro && !savedRows[gid] && !!draft.rows[gid];
      var meta = staffGone(gid) ? '없어진 줄 · ✕ 로 빼고 저장' : base ? g.meta : gone && roleLock ? '' : (g.kind === 'staff' ? '관리자' : '회원') + ' 권한그룹 · ' + (g.count || 0) + '명';
      if (impliedAny && gid !== 'anyone') { meta += (meta ? ' · ' : '') + '연한 체크는 자동 허용'; }
      var canDrop = !ro && !!(draft.rows[gid] || []).length;
      var del = ro ? '' : '<button type="button" class="xbtn" data-delrow="' + esc(gid) + '" aria-label="' + esc(g.name) + ' 줄 빼기" title="' + (canDrop ? '이 권한그룹 줄을 뺍니다(저장해야 반영)' : '직접 켠 칸이 없어 뺄 것이 없습니다') + '"' + (canDrop ? '' : ' disabled') + '>' + icon('close') + '</button>';
      var nameHtml = base || gone ? esc(g.name) + (g.code ? '<small>' + esc(g.code) + '</small>' : '') : groupLabel(g, '권한그룹명단 열기');
      var metaTip = staffGone(gid) ? KIND_TIP.staffGone : gone ? '' : base ? KIND_TIP[gid] : g.kind === 'staff' ? KIND_TIP.staffGroup : KIND_TIP.memberGroup;
      var cls = (staffGone(gid) ? 'is-gone ' : '') + (newRows[gid] ? 'is-new ' : '') + (rowChanged || isNew ? 'is-unsaved' : '');
      return '<tr class="' + cls + '"><td class="ptable__who"><div class="who"><div><span class="who__name">' + nameHtml + (isNew ? '<span class="tag-new">새로 추가</span>' : '') + '</span>'
        + '<div class="who__meta"' + (metaTip ? ' title="' + esc(metaTip) + '"' : '') + '>' + esc(meta) + '</div></div></div></td>' + cells + '<td class="acc-x">' + del + '</td></tr>';
    }).join('');
    var heads = acts.map(function (a) { return '<th scope="col"><span class="th-tip" title="' + esc(a.l + ' — ' + a.h) + '">' + a.l + '</span></th>'; }).join('');
    return '<div class="ptable-wrap"><table class="ptable acc-table' + (ro ? ' ptable--ro' : '') + '"><caption class="nv-sr-only">권한그룹별 누리집 화면 접근권한</caption><thead><tr><th class="ptable__who" scope="col"><span>권한그룹</span></th>' + heads + '<th scope="col"><span class="nv-sr-only">줄 빼기</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* 찾기 목록이 달린 「추가」 버튼(.acc-add) */
  function addBox(kind, text, listLabel, tip) {
    var open = adding === kind;
    return '<div class="acc-add" data-acc-add="' + kind + '" data-open="' + open + '"><button type="button" class="nv-btn nv-btn--sm nv-btn--outline" data-acc-toggle="' + kind + '" aria-haspopup="listbox" aria-expanded="' + open + '" aria-controls="acc-' + kind + '-list"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + icon('plus') + esc(text) + '</button>'
      + '<div class="pick__list" id="acc-' + kind + '-list" aria-label="' + esc(listLabel) + '"' + (open ? '' : ' hidden') + '></div></div>';
  }
  function addGroupHtml() {
    if (roleLock) {
      var locks = S.requiredRoles.map(requiredRowId).map(group);
      var names = S.requiredRoles.map(function (code, i) { return locks[i] ? gname(locks[i]) : code; }).join(', ');
      var opens = window.groupPanel ? locks.filter(Boolean).map(function (g) {
        return ' <button type="button" class="fixlink" data-opengroup="' + esc(g.id) + '">' + (locks.length > 1 ? esc(g.name) + ' ' : '') + '명단 열기</button>';
      }).join('') : '';
      return '<p class="edx-hint">' + icon('info') + '<span><span title="연결 화면에 필요한 역할이 정해져 있어 다른 권한그룹을 더할 수 없습니다">이 화면은 ' + esc(names) + '만 엽니다.</span> 사람은 명단에서 넣고 뺍니다.' + opens + '</span></p>';
    }
    // 「상위 메뉴와 같게」를 따르는 중에도 추가할 수 있다 — 고르면 같게를 끄고 상위 줄을 옮긴 뒤 넣는다. 안내는 툴팁으로
    var tip = following() ? '지금은 「' + (S.parentName || '상위 메뉴') + '」을 따릅니다. 권한그룹을 추가하면 「상위 메뉴와 같게」가 꺼지고 이 메뉴만 따로 정합니다.' : '';
    return addBox('group', '권한그룹 추가', '권한그룹 찾기', tip);
  }
  /* 권한그룹 추가 목록 줄. 「상위 메뉴와 같게」를 따르는 중에도 고를 수 있다 — 고르면 같게를 끄고 상위 줄을 옮긴 뒤 넣는다 */
  function groupRows(q) {
    var present = following() ? Object.keys(parentEffective()) : Object.keys(draft.rows);
    var kinds = isBoard ? ['staff', 'member'] : ['member'];
    var list = (S.groups || []).filter(function (g) { return kinds.indexOf(g.kind) >= 0 && present.indexOf(g.id) < 0 && match(g, q); });
    var rows = list.map(function (g) {
      return { id: g.id, html: icon('users') + esc(g.name) + (g.code ? ' <span class="pick__id">' + esc(g.code) + '</span>' : '') + '<span class="pick__meta">' + (g.kind === 'staff' ? '관리자' : '회원') + ' · ' + (g.count || 0) + '명</span>' };
    });
    var feet = [];
    if (window.groupPanel) {
      feet.push({ foot: 'new', html: icon('plus') + '새 권한그룹 만들기<span class="pick__meta"></span>' });
      feet.push({ foot: 'manage', html: icon('settings') + '권한그룹관리<span class="pick__meta">명단 · 접근권한 보기</span>' + icon('chevron-right') });
    }
    return { rows: rows, feet: feet, empty: q ? '「' + q + '」에 맞는 권한그룹이 없습니다' : '더 넣을 권한그룹이 없습니다' };
  }
  function match(g, q) {
    if (!q) { return true; }
    var w = q.toLowerCase();
    return (g.name || '').toLowerCase().indexOf(w) >= 0 || (g.code || '').toLowerCase().indexOf(w) >= 0;
  }
  function mgrGroupRows(q) {
    var staff = (S.groups || []).filter(function (g) { return g.kind === 'staff' && match(g, q); });
    var members = (S.groups || []).filter(function (g) { return g.kind === 'member' && match(g, q); });
    var rows = staff.map(function (g) {
      var already = draft.mgrs.some(function (x) { return x.t === 'group' && x.id === g.id; });
      return { id: g.id, disabled: already, html: icon('users') + esc(g.name) + (g.code ? ' <span class="pick__id">' + esc(g.code) + '</span>' : '') + (already ? '<span class="nv-badge">이미 있음</span>' : '') + '<span class="pick__meta">관리자 · ' + (g.count || 0) + '명</span>' };
    }).concat(members.map(function (g) {
      return { id: g.id, disabled: true, tip: '회원 권한그룹은 누리집 회원만 넣는 그룹이라 관리자 권한에 넣을 수 없습니다', html: icon('users') + esc(g.name) + (g.code ? ' <span class="pick__id">' + esc(g.code) + '</span>' : '') + '<span class="pick__meta">회원 권한그룹은 추가할 수 없음</span>' };
    }));
    var feet = [{ foot: 'person', html: icon('user') + '관리자 ID로 사람 찾기<span class="pick__meta"></span>' + icon('chevron-right') }];
    if (window.groupPanel) { feet.push({ foot: 'manage', html: icon('settings') + '권한그룹관리<span class="pick__meta">명단 · 접근권한 보기</span>' + icon('chevron-right') }); }
    return { rows: rows, feet: feet, empty: q ? '「' + q + '」에 맞는 권한그룹이 없습니다' : '권한그룹이 없습니다' };
  }
  var people = [];
  var peopleQuery = '';
  function personRows() {
    var rows = people.map(function (p) {
      var owner = (S.owners || []).some(function (o) { return o.id === p.id; });
      var already = owner || draft.mgrs.some(function (x) { return x.t === 'person' && x.id === p.id; });
      return { id: p.id, person: p, disabled: already, html: icon('user') + esc(p.name) + ' <span class="pick__id">' + esc(p.login) + '</span>' + (already ? '<span class="nv-badge">이미 있음' + (owner ? ' · 담당자' : '') + '</span>' : '') + '<span class="pick__meta">' + esc(p.org || '') + '</span>' };
    });
    return { rows: rows, feet: [{ foot: 'groups', html: icon('chevron-right', 'flip') + '권한그룹 목록으로<span class="pick__meta"></span>' }],
      hint: peopleQuery ? '이름 · 부서 · 관리자 ID에 「' + peopleQuery + '」가 들어간 사람 · ' + people.length + '명' : '이름 · 부서 · 관리자 ID로 찾습니다',
      empty: peopleQuery ? '「' + peopleQuery + '」에 맞는 서브관리자가 없습니다. 회원은 고를 수 없습니다.' : '' };
  }
  var lastRows = [];
  function fillList(kind, keepQuery) {
    var list = root.querySelector('#acc-' + kind + '-list');
    if (!list) { return; }
    var input = list.querySelector('[data-acc-q]');
    var q = input ? input.value.trim() : (keepQuery || '');
    var person = kind === 'mgr' && mgrMode === 'person';
    var data = kind === 'group' ? groupRows(q) : person ? personRows() : mgrGroupRows(q);
    lastRows = data.rows;
    if (!input) {
      list.innerHTML = '<div class="pick__search"><label class="nv-sr-only" for="acc-' + kind + '-q">' + esc(person ? '관리자 ID로 사람 찾기' : '권한그룹 찾기') + '</label>'
        + '<input type="search" id="acc-' + kind + '-q" class="nv-input" data-acc-q role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="acc-' + kind + '-rows" autocomplete="off" placeholder="' + esc(person ? '관리자 ID로 사람 찾기' : '권한그룹 찾기') + '"></div>'
        + '<div class="pick__hint" data-acc-hint hidden></div><div id="acc-' + kind + '-rows" role="listbox" aria-label="' + esc(person ? '찾은 사람' : '권한그룹') + '" data-acc-rows></div>';
      input = list.querySelector('[data-acc-q]');
      if (keepQuery) { input.value = keepQuery; }
    }
    var hint = list.querySelector('[data-acc-hint]');
    hint.hidden = !data.hint;
    hint.textContent = data.hint || '';
    var html = data.rows.map(function (r, i) {
      return '<button type="button" class="pick__row" role="option" tabindex="-1" id="acc-' + kind + '-o' + i + '" data-acc-pick="' + i + '" data-acc-id="' + esc(r.id) + '" aria-selected="false"' + (r.disabled ? ' aria-disabled="true"' : '') + (r.tip ? ' title="' + esc(r.tip) + '"' : '') + '>' + r.html + '</button>';
    }).join('');
    if (!data.rows.length && data.empty) { html += '<p class="pick__row" aria-disabled="true">' + esc(data.empty) + '</p>'; }
    if (data.feet.length) {
      html += '<div class="pick__sep" role="separator"></div>' + data.feet.map(function (f) {
        return '<button type="button" class="pick__row pick__foot" role="option" tabindex="-1" id="acc-' + kind + '-f-' + f.foot + '" data-acc-foot="' + f.foot + '" aria-selected="false">' + f.html + '</button>';
      }).join('');
    }
    list.querySelector('[data-acc-rows]').innerHTML = html;
    input.removeAttribute('aria-activedescendant');
  }
  function openAdd(kind) {
    adding = kind;
    if (kind === 'mgr') { mgrMode = 'groups'; people = []; peopleQuery = ''; }
    render();
    var input = root.querySelector('#acc-' + kind + '-q');
    if (input) { input.focus(); }
  }
  function closeAdd(focusBack) {
    var kind = adding;
    if (!kind) { return; }
    adding = null;
    var box = root.querySelector('[data-acc-add="' + kind + '"]');
    if (box) {
      box.setAttribute('data-open', 'false');
      box.querySelector('[data-acc-toggle]').setAttribute('aria-expanded', 'false');
      var list = box.querySelector('.pick__list');
      list.hidden = true;
      list.innerHTML = '';
      if (focusBack) { box.querySelector('[data-acc-toggle]').focus(); }
    }
  }
  function moveIn(kind, step) {
    var list = root.querySelector('#acc-' + kind + '-list');
    var items = Array.prototype.slice.call(list.querySelectorAll('.pick__row[role="option"]:not([aria-disabled="true"])'));
    if (!items.length) { return; }
    var cur = list.querySelector('.pick__row[aria-selected="true"]');
    var i = items.indexOf(cur);
    i = step > 0 ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
    items.forEach(function (r) { r.setAttribute('aria-selected', String(r === items[i])); });
    list.querySelector('[data-acc-q]').setAttribute('aria-activedescendant', items[i].id);
    items[i].scrollIntoView({ block: 'nearest' });
  }
  function chooseIn(kind, el) {
    if (!el || el.getAttribute('aria-disabled') === 'true') { return; }
    var foot = el.getAttribute('data-acc-foot');
    if (foot === 'manage') { closeAdd(false); window.groupPanel.open({ mode: kind === 'mgr' ? 'manager' : 'access' }); return; }
    if (foot === 'new') { closeAdd(false); window.groupPanel.open({ editing: 'new' }); return; }
    if (foot === 'person' || foot === 'groups') {
      mgrMode = foot === 'person' ? 'person' : 'groups';
      people = [];
      peopleQuery = '';
      var list = root.querySelector('#acc-mgr-list');
      list.innerHTML = '';
      fillList('mgr');
      list.querySelector('[data-acc-q]').focus();
      return;
    }
    var row = lastRows[Number(el.getAttribute('data-acc-pick'))];
    if (!row) { return; }
    adding = null;
    if (kind === 'group') {
      addAccess(row.id);
    } else if (row.person) {
      var p = row.person;
      if (!draft.mgrs.some(function (x) { return x.t === 'person' && x.id === p.id; })) {
        draft.mgrs.push({ t: 'person', id: p.id, name: p.name, login: p.login, org: p.org });
      }
      newRows['mgr:person' + p.id] = true;
      render('[data-acc-toggle="mgr"]');
      toast('「' + p.name + '」을 관리자 권한에 넣었습니다. 저장해야 반영됩니다.');
    } else {
      addManager(row.id);
      var g = group(row.id);
      toast('「' + (g ? g.name : row.id) + '」을 관리자 권한에 넣었습니다. 저장해야 반영됩니다.');
    }
  }

  function mgrSection() {
    if (!S.hasManagers) {
      var why = S.noMenu ? '메뉴를 연결하면 관리자 권한을 줄 수 있습니다.' : S.kind === 'service' ? '이 화면에서 쓰는 자료는 연결 서비스가 관리합니다.' : '외부연계 메뉴는 바깥 주소로 보내기만 해서 관리할 것이 없습니다.';
      return '<section class="edx-sec" aria-labelledby="sec-mgr"><h2 class="edx-sec__title" id="sec-mgr">관리자 권한</h2><p class="edx-sec__desc">' + why + '</p></section>';
    }
    var ro = following();
    var does = isBoard ? '받으면 누리집에서 남의 글 수정·삭제, 공지 지정, 답변 지우기를 할 수 있고, 콘솔 「게시판 관리」가 자동으로 보입니다.'
      : S.kind === 'content' ? '이 콘텐츠를 맡아 관리할 사람과 권한그룹입니다. 받으면 콘솔에서 이 메뉴의 소스 수정을 할 수 있고, 콘텐츠 관리가 자동으로 보입니다.'
        : '이 묶음과 「상위 메뉴와 같게」인 하위 메뉴를 맡아 관리합니다. 하위 메뉴의 게시판 · 콘텐츠도 관리합니다.';
    var x = function (aria, attrs, tip) { return '<button type="button" class="xbtn" aria-label="' + esc(aria) + '"' + attrs + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + icon('close') + '</button>'; };
    var items = ['<li class="mgr is-fixed"><span class="mgr__icon">' + icon('shield') + '</span><div class="mgr__who"><b>최고관리자<small>G900</small></b><span title="누리지음 사이트 관리자 등급 이상 계정">콘솔 최고 등급 계정 · 언제나 관리</span></div><span class="nv-badge" title="최고관리자는 모든 게시판 · 메뉴를 항상 관리합니다. 뺄 수 없습니다.">항상</span>'
      + x('최고관리자 관리자 권한 빼기', ' disabled', '뺄 수 없습니다') + '</li>'];
    var listed = {};
    (S.owners || []).forEach(function (o) {
      listed['person|' + o.id] = true;
      items.push('<li class="mgr"><span class="mgr__icon">' + icon('user') + '</span><div class="mgr__who"><b>' + esc(o.name) + (o.login ? '<small>' + esc(o.login) + '</small>' : '') + '</b><span>' + esc((o.org ? o.org + ' · ' : '') + (o.menu && o.menu !== S.name ? '「' + o.menu + '」 담당자' : '이 메뉴 담당자')) + '</span></div>'
        + '<span class="nv-badge nv-badge--info" title="' + esc('「' + (o.menu || S.name) + '」 메뉴 정보의 담당자라 자동으로 관리합니다.') + '">담당자 · 자동</span>'
        + x(o.name + ' 관리자 권한 빼기', ' disabled', '담당자는 메뉴 정보에서 바꾸거나 비웁니다') + '</li>');
    });
    var list = ro ? (S.parentManagers || []) : draft.mgrs;
    list.forEach(function (m) {
      var g = m.t === 'group' ? group(m.id) : null;
      if ((m.t === 'group' && !g) || listed[m.t + '|' + m.id]) { return; }
      listed[m.t + '|' + m.id] = true;
      var name = g ? groupLabel(g, '권한그룹명단 열기') : esc(m.name || loginText(m)) + '<small>' + esc(loginText(m)) + '</small>';
      var sub = g ? '관리자 권한그룹 · ' + (g.count || 0) + '명' : esc((m.org ? m.org + ' · ' : '') + '관리자 ID 지정');
      var badge = ro ? '<span class="nv-badge" title="상위 메뉴 「' + esc(m.from || S.parentName) + '」의 관리자 권한을 따릅니다. 빼려면 「상위 메뉴와 같게」를 끄세요.">상위 따름</span>'
        : '<span class="nv-badge nv-badge--ok">직접 지정</span>';
      var del = ro ? x(whoName(m) + ' 관리자 권한 빼기', ' disabled', '상위 메뉴를 따르는 중에는 뺄 수 없습니다')
        : x(whoName(m) + ' 관리자 권한 빼기', ' data-delmgr="' + m.t + '|' + esc(m.id) + '"', '빼기(저장해야 반영)');
      items.push('<li class="mgr' + (newRows['mgr:' + m.t + m.id] ? ' is-new' : '') + '"><span class="mgr__icon">' + icon(g ? 'users' : 'user') + '</span><div class="mgr__who"><b>' + name + '</b><span>' + sub + '</span></div>' + badge + del + '</li>');
    });
    var add = ro ? '<p class="edx-hint">' + icon('info') + '<span>상위 메뉴를 따르는 중입니다. 관리자 권한을 따로 주려면 「상위 메뉴와 같게」를 끄세요.</span></p>'
      : addBox('mgr', '관리자 권한 추가', mgrMode === 'person' ? '관리자 ID로 사람 찾기' : '권한그룹 찾기');
    return '<section class="edx-sec" aria-labelledby="sec-mgr"><h2 class="edx-sec__title" id="sec-mgr" title="담당자 · 권한그룹 · 관리자 ID 지정">관리자 권한</h2><p class="edx-sec__desc">' + does + '</p><ul class="mgrcards">' + items.join('') + '</ul>' + add + '</section>';
  }

  /* 공유 알림의 대상: 「공지사항」 게시판 · 「서비스:화면」 화면. 게시판 수정 화면은 머리의 게시판 이름을 쓴다 */
  function sharedWhat() {
    if (!isBoard) { return S.targetId ? '「' + esc(S.targetId) + '」 화면' : '이 화면'; }
    var title = onBoardScreen ? document.getElementById('cms-page-title') : null;
    var boardName = form.getAttribute('data-board-name') || (title ? title.textContent.trim() : '');
    return boardName ? '「' + esc(boardName) + '」 게시판' : '이 게시판';
  }
  function hint(text) { return '<p class="edx-hint">' + icon('info') + '<span>' + text + '</span></p>'; }

  function viewSection() {
    var inh = following();
    var disabled = !S.hasParent || shared || roleLock;
    var why = roleLock ? '연결 화면에 필요한 역할이 정해져 있어 상위 메뉴를 따르지 않습니다.'
      : !S.hasParent ? (S.noMenu ? '메뉴에 연결하지 않은 게시판이라 따를 상위가 없습니다. 여기서 정한 접근권한은 메뉴에 연결하면 그 메뉴의 것이 됩니다.' : '최상위 메뉴라 따를 상위가 없습니다.')
        : shared ? (isBoard ? '이 게시판' : '이 화면') + '을 여러 메뉴가 함께 쓰고 있어 상위를 따르지 않고 개별로 정합니다.'
          : '고르면 아래 표가 잠기고 「' + esc(S.parentName) + '」 설정을 그대로 따릅니다.';
    var banner = '';
    if (onBoardScreen) {
      var paths = S.menuPaths || [];
      banner += paths.length
        ? hint('메뉴 ' + paths.map(function (n) { return '「' + esc(n) + '」'; }).join(', ') + '의 접근권한과 같은 설정입니다. <a class="fixlink" href="' + esc(form.getAttribute('data-search-url').replace(/manager-search$/, 'menus/' + encodeURIComponent(S.sharedIds[0]) + '/edit?tab=perm')) + '">메뉴에서 보기</a>')
        : hint('아직 메뉴에 연결하지 않은 게시판입니다. 누리집에는 보이지 않습니다. 미리 정해 둘 수 있습니다.');
    } else if (isBoard) {
      var href = form.hasAttribute('data-board-link') ? form.getAttribute('data-board-href') : null;
      var boardName = form.getAttribute('data-board-name');
      banner += hint('게시판 관리' + (boardName ? ' 「' + esc(boardName) + '」' : '') + '의 접근권한과 같은 설정입니다.' + (href ? ' <a class="fixlink" href="' + esc(href) + '" data-draft-kept>게시판에서 보기</a>' : ''));
    }
    if (shared) {
      banner += hint('이 접근권한은 ' + sharedWhat() + '을 연결한 메뉴 ' + S.shared.length + '곳(' + S.shared.map(function (n) { return '「' + esc(n) + '」'; }).join(', ') + ')에 함께 적용됩니다.');
    }
    var same = roleLock ? '' : '<div class="acc-same"><label class="nv-check"><input type="checkbox" id="inherit"' + (inh ? ' checked' : '') + (disabled ? ' disabled' : '') + ' aria-describedby="inherit-hint">'
      + (S.hasParent ? '상위 메뉴 「' + esc(S.parentName) + '」과 같게' : '상위 메뉴와 같게') + '</label><span id="inherit-hint">' + why + '</span></div>';
    var kids = S.childCount > 0 ? '<label class="nv-check acc-kids" title="저장할 때 하위 메뉴들의 접근권한을 「상위 메뉴와 같게」로 바꿉니다"><input type="checkbox" id="apply-children"' + (applyChildren ? ' checked' : '') + '>하위 메뉴 ' + S.childCount + '개도 「상위 메뉴와 같게」로</label>' : '';
    var warn = warnMin ? '<div class="acc-warn" role="alert">' + icon('info') + '<span><b>권한그룹은 1개 이상 있어야 합니다.</b> 다른 권한그룹을 먼저 추가한 뒤 빼 주세요.</span></div>' : '';
    return '<section class="edx-sec" aria-labelledby="sec-view"><h2 class="edx-sec__title" id="sec-view">누리집 화면 접근권한</h2>' + banner + same + tableHtml() + warn + addGroupHtml() + kids + '</section>';
  }

  /* 오른쪽 「적용 요약」: 상위 메뉴 · 칸별 권한그룹 · 관리자 권한 수 · 마지막 저장 */
  function namesWith(eff, keys) {
    var names = [];
    if (keys.every(function (k) { return (eff.anyone || {})[k]; })) { return '누구나'; }
    Object.keys(eff).forEach(function (g) {
      if (keys.some(function (k) { return eff[g][k]; })) { var x = group(g); names.push(x ? x.name : g); }
    });
    return names.length ? names.join(' · ') : '없음';
  }
  /* 동작별 권한그룹 이름 → [라벨, 이름] 줄. 이어진 동작의 이름이 같으면 한 줄로 묶는다(라벨 「목록 · 읽기 · 다운로드」) */
  function byAction(eff, acts) {
    var rows = [];
    acts.forEach(function (a) {
      var names = namesWith(eff, [a[0]]);
      var prev = rows[rows.length - 1];
      if (prev && prev.names === names) { prev.labels.push(a[1]); } else { rows.push({ labels: [a[1]], names: names }); }
    });
    return rows.map(function (r) { return [r.labels.join(' · '), esc(r.names)]; });
  }
  function renderSummary() {
    if (!summary) { return; }
    var eff = roleLock ? requiredEffective() : effective(draft);
    var dl = [];
    var parentHref = form.getAttribute('data-parent-href');
    var parentText = !S.hasParent ? (S.noMenu ? '메뉴 연결 없음' : '없음(최상위)') : esc(S.parentName) + ' · ' + (following() ? '같게 따름' : '다르게 설정');
    dl.push(['상위 메뉴', S.hasParent && parentHref ? '<a href="' + esc(parentHref) + '">' + parentText + '</a>' : parentText]);
    if (isBoard) {
      // 동작마다 따로 판정하고, 받는 권한그룹이 같은 동작끼리만 한 줄로 묶는다(목록은 누구나 · 읽기는 회원이면 두 줄)
      byAction(eff, [['list', '목록'], ['read', '읽기'], ['down', '다운로드']]).forEach(function (row) { dl.push(row); });
      byAction(eff, [['write', '쓰기'], ['reply', '답변']]).forEach(function (row) { dl.push(row); });
    } else {
      dl.push(['보기', esc(namesWith(eff, ['view']))]);
    }
    if (S.hasManagers) {
      var list = following() ? (S.parentManagers || []) : draft.mgrs;
      var seen = {};
      (S.owners || []).forEach(function (o) { seen['person|' + o.id] = true; });
      var groups = 0, persons = (S.owners || []).length;
      list.forEach(function (m) {
        if (seen[m.t + '|' + m.id] || (m.t === 'group' && !group(m.id))) { return; }
        seen[m.t + '|' + m.id] = true;
        if (m.t === 'group') { groups += 1; } else { persons += 1; }
      });
      dl.push(['관리자 권한', (groups + persons + 1) + '(그룹 ' + groups + ' · 사람 ' + persons + ' · 최고관리자)']);
    }
    var last = document.querySelector('[data-menu-history] tr[data-area="접근권한"]');
    dl.push(['마지막 저장', last ? esc(last.getAttribute('data-at') + ' · ' + last.getAttribute('data-actor')) : '기록 없음']);
    summary.innerHTML = dl.map(function (d) { return '<dt>' + d[0] + '</dt><dd>' + d[1] + '</dd>'; }).join('');
  }

  function render(focusOn) {
    root.innerHTML = viewSection() + mgrSection();
    if (adding) { fillList(adding); }
    newRows = {};
    renderBar();
    renderSummary();
    if (focusOn) {
      var el = root.querySelector(focusOn);
      if (el) { el.focus(); }
    }
  }
  function renderBar() {
    var own = changes(true);
    var keep = changes(false);
    if (drafts) {
      if (keep.length === 0) {
        drafts.drop(keepId, 'perm');
      } else {
        drafts.save(keepId, 'perm', keepBase, keep.length, draft, {
          site: S.siteId,
          label: keepLabel,
          also: S.sharedIds || [],
          changes: keep.map(function (c) { return keepLabel + ': ' + line(c); })
        });
      }
    }
    var others = otherDrafts();
    var chips = own.map(function (c) { return others.length ? { name: c.name, text: c.text + ' (' + keepLabel + ')' } : c; });
    others.forEach(function (entry) {
      (entry.meta.changes || []).forEach(function (text) {
        var at = text.indexOf(': ');
        chips.push(at > 0 ? { name: text.slice(0, at), text: text.slice(at + 2) } : { name: '다른 메뉴', text: text });
      });
    });
    var clean = chips.length === 0;
    if (ui()) {
      ui().paint('perm', { count: chips.length, canSave: !clean, changes: chips });
    }
    if (head) {
      var revert = head.querySelector('[data-access-revert]');
      if (revert) { revert.disabled = clean; }
    }
  }

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'inherit') {
      if (t.checked) {
        // 끄면서 가져온 상위 값은 다시 따르면 버린다
        if (saved.inherit) { draft.rows = clone(saved.rows); draft.mgrs = clone(saved.mgrs); }
        draft.inherit = true;
      } else {
        breakInherit();
      }
      warnMin = false;
      render('#inherit');
    } else if (t.id === 'apply-children') {
      applyChildren = t.checked;
      renderBar();
    } else if (t.getAttribute('data-cell')) {
      var parts = t.getAttribute('data-cell').split('|');
      var g = parts[0], a = parts[1];
      var cur = draft.rows[g] || [];
      if (t.checked) {
        draft.rows[g] = cur.concat(cur.indexOf(a) < 0 ? [a] : []);
      } else {
        // 끄는 칸을 포함하는 위 칸도 함께 끈다. 목록을 끄면 읽기 · 쓰기 · 답변 · 다운로드도 꺼진다
        draft.rows[g] = cur.filter(function (x) { return x !== a && (IMPLIES[x] || []).indexOf(a) < 0; });
      }
      if (!draft.rows[g].length && BASE_IDS.indexOf(g) >= 0) { delete draft.rows[g]; }
      warnMin = false;
      render('[data-cell="' + g + '|' + a + '"]');
    }
  });
  function addAccess(id) {
    var added = group(id);
    var broke = !roleLock && following();
    if (broke) { breakInherit(); }
    if (!draft.rows[id]) { draft.rows[id] = newCells(added); }
    newRows[id] = true;
    warnMin = false;
    render('[data-acc-toggle="group"]');
    toast((broke ? '「상위 메뉴와 같게」를 끄고 ' : '') + '「' + (added ? added.name : id) + '」을 추가했습니다. 칸을 확인하고 저장하세요.');
  }
  function addManager(id) {
    if (!draft.mgrs.some(function (x) { return x.t === 'group' && x.id === id; })) { draft.mgrs.push({ t: 'group', id: id }); }
    newRows['mgr:group' + id] = true;
    render('[data-acc-toggle="mgr"]');
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) { return; }
    if (b.getAttribute('data-acc-toggle')) {
      var kind = b.getAttribute('data-acc-toggle');
      if (adding === kind) { closeAdd(true); } else { closeAdd(false); openAdd(kind); }
    } else if (b.hasAttribute('data-acc-pick') || b.hasAttribute('data-acc-foot')) {
      chooseIn(b.closest('[data-acc-add]').getAttribute('data-acc-add'), b);
    } else if (b.getAttribute('data-opengroup')) {
      if (window.groupPanel) { window.groupPanel.open({ gid: b.getAttribute('data-opengroup'), tab: 'members', mode: b.closest('[aria-labelledby="sec-mgr"]') ? 'manager' : 'access' }); }
    } else if (b.getAttribute('data-delrow')) {
      var gid = b.getAttribute('data-delrow');
      if (lastRow(gid)) {
        warnMin = true;
        render('[data-delrow="' + gid + '"]');
        return;
      }
      warnMin = false;
      delete draft.rows[gid];
      render('[data-acc-toggle="group"]');
    } else if (b.getAttribute('data-delmgr')) {
      var p = b.getAttribute('data-delmgr').split('|');
      draft.mgrs = draft.mgrs.filter(function (x) { return !(x.t === p[0] && x.id === p[1]); });
      render('[data-acc-toggle="mgr"]');
    }
  });
  // 목록을 누르는 동안 검색 칸이 포커스를 잃지 않게
  root.addEventListener('mousedown', function (e) { if (e.target.closest('.acc-add .pick__list') && !e.target.closest('[data-acc-q]')) { e.preventDefault(); } });
  document.addEventListener('mousedown', function (e) {
    if (adding && !e.target.closest('[data-acc-add="' + adding + '"]')) { closeAdd(false); }
  });
  root.addEventListener('focusout', function (e) {
    if (!adding) { return; }
    var box = root.querySelector('[data-acc-add="' + adding + '"]');
    if (box && e.relatedTarget && !box.contains(e.relatedTarget)) { closeAdd(false); }
  });
  root.addEventListener('keydown', function (e) {
    if (!adding || !e.target.hasAttribute('data-acc-q')) { return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveIn(adding, e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter') { e.preventDefault(); chooseIn(adding, root.querySelector('#acc-' + adding + '-list .pick__row[aria-selected="true"]')); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAdd(true); }
  });
  var timer;
  root.addEventListener('input', function (e) {
    if (!adding || !e.target.hasAttribute('data-acc-q')) { return; }
    if (adding === 'mgr' && mgrMode === 'person') {
      var q = e.target.value.trim();
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        if (!q) { people = []; peopleQuery = ''; fillList('mgr'); return; }
        fetch(form.getAttribute('data-search-url') + '?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (found) { people = found; peopleQuery = q; if (adding === 'mgr') { fillList('mgr'); } })
          .catch(function () { people = []; peopleQuery = q; if (adding === 'mgr') { fillList('mgr'); } toast('사람을 찾지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
      }, 200);
      return;
    }
    fillList(adding);
  });
  var revertBtn = head ? head.querySelector('[data-access-revert]') : null;
  function revertAll(quiet) {
    // 이 탭에 보관한 같은 사이트의 다른 메뉴 초안까지 되돌린다
    otherDrafts().forEach(function (entry) { drafts.drop(entry.id, 'perm'); });
    draft = clone(saved);
    adding = null;
    warnMin = false;
    applyChildren = false;
    var reason = document.getElementById('reason-perm');
    if (reason) { reason.value = ''; }
    render();
    if (!quiet) { toast('저장된 상태로 되돌렸습니다.'); }
  }
  if (revertBtn) {
    revertBtn.addEventListener('click', function () {
      revertAll(false);
      var tab = document.querySelector('[data-mtab="perm"]');
      if (tab) { tab.focus(); }
    });
  }
  if (ui()) { ui().setDiscard('perm', function (next) { revertAll(true); ui().showTab(next, true); }); }
  function managersJson(list) {
    return JSON.stringify(list.map(function (x) { return { subjectType: x.t === 'group' ? 'GROUP' : 'PERSON', subjectId: x.id }; }));
  }
  form.addEventListener('submit', function () {
    var children = applyChildren;
    if (batchField) {
      var item = function (menuId, base, data, kids) {
        return { menuId: menuId, base: base, inherit: String(!!data.inherit), rows: JSON.stringify(data.rows), managers: managersJson(data.mgrs), applyChildren: String(kids) };
      };
      var items = changes(true).length ? [item(pageId, keepBase, draft, children)] : [];
      otherDrafts().forEach(function (entry) { items.push(item(entry.id, entry.base, entry.data, false)); });
      batchField.value = JSON.stringify(items);
      return;
    }
    form.querySelector('[data-access-field="inherit"]').value = String(!!draft.inherit && !!S.hasParent);
    form.querySelector('[data-access-field="rows"]').value = JSON.stringify(draft.rows);
    form.querySelector('[data-access-field="managers"]').value = managersJson(draft.mgrs);
    form.querySelector('[data-access-field="children"]').value = String(children);
  });

  /* 권한그룹 패널 연결. 패널이 지금 메뉴에 무엇을 더할 수 있는지 · 이미 있는지 묻는다(group-panel.js 문맥 계약: has(group, mode) · place).
   * 「상위 메뉴와 같게」를 따르는 중에도 접근권한 줄은 더할 수 있다 — 더하면 같게를 끄고 상위 줄을 옮긴다(addAccess) */
  function hasAccessRow(id) {
    if (roleLock) { return !!requiredEffective()[id]; }
    var eff = following() ? parentEffective() : effective(draft);
    // 칸이 모두 저절로 허용(윗줄에서 받음)인 줄 · 늘 보이는 기본 줄도 표에 있는 줄이다 — 권한그룹 패널의 「이 ○○에 있음」(키트 group-panel)
    if (BASE_IDS.indexOf(id) >= 0) { return true; }
    return !!eff[id] && (Object.keys(eff[id]).length > 0 || !following());
  }
  function hasManager(id) {
    var list = following() ? (S.parentManagers || []) : draft.mgrs;
    return list.some(function (x) { return x.t === 'group' && x.id === id; });
  }
  function connectPanel() {
    if (!window.groupPanel) { return; }
    window.groupPanel.setContext({
      name: S.name,
      place: isBoard ? '게시판' : '메뉴',
      has: function (g, mode) { return !!g && (mode === 'manager' ? hasManager(g.id) : hasAccessRow(g.id)); },
      canAccess: function (g) { return !!g && g.kind !== 'base' && (isBoard || g.kind === 'member') && !roleLock && !hasAccessRow(g.id); },
      canManager: function (g) { return !!g && !!S.hasManagers && g.kind === 'staff' && !following() && !hasManager(g.id); },
      addAccess: function (id) { showPermTab(); addAccess(id); },
      addManager: function (id) {
        showPermTab();
        addManager(id);
        var g = group(id);
        toast('「' + (g ? g.name : id) + '」을 관리자 권한에 넣었습니다. 저장해야 반영됩니다.');
      }
    });
    render();
  }
  function showPermTab() {
    var tab = document.querySelector('[data-mtab="perm"]');
    if (tab && tab.getAttribute('aria-selected') !== 'true') { tab.click(); }
  }
  /* 패널에서 권한그룹을 만들거나 고치거나 지웠을 때: 선택지만 새로 하고 고치던 표는 그대로 둔다 */
  document.addEventListener('group-panel:changed', function (e) {
    var detail = e.detail || {};
    var gone = [].concat(detail.deleted || []);
    var goneNames = gone.map(group).filter(Boolean).map(gname);
    if (detail.groups) { S.groups = detail.groups; }
    var strip = function (state) {
      gone.forEach(function (id) { delete state.rows[id]; });
      state.mgrs = (state.mgrs || []).filter(function (x) { return !(x.t === 'group' && gone.indexOf(x.id) >= 0); });
    };
    if (gone.length) {
      strip(draft);
      strip(saved);
      otherDrafts().forEach(function (entry) {
        strip(entry.data);
        var left = (entry.meta.changes || []).filter(function (c) { return !goneNames.some(function (n) { return c.indexOf(n) >= 0; }); });
        if (left.length) {
          drafts.save(entry.id, 'perm', entry.base, left.length, entry.data, Object.assign({}, entry.meta, { changes: left }));
        } else {
          drafts.drop(entry.id, 'perm');
        }
      });
    }
    render();
  });
  render();
  // 패널 스크립트는 이 스크립트 뒤에 올 수 있다. 수정 이력 표(마지막 저장)도 그때 다 읽혀 있다
  if (document.readyState === 'complete') { connectPanel(); } else { document.addEventListener('DOMContentLoaded', connectPanel); }
})();
