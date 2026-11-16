/* 메뉴 수정 화면에서 저장하지 않은 변경을 이 브라우저 탭에 보관한다. 목록으로 나갔다 돌아와도 이어서 고치고, 목록에는 「변경」으로 표시한다.
 * 보관 단위는 메뉴 · 탭(info · src · perm)이고, 열 때 서버 값이 달라졌으면(base 불일치) 버린다. 로그아웃하거나 다른 관리자로 들어오면 지운다.
 * 접근권한(perm)은 같은 사이트의 여러 메뉴 초안을 한꺼번에 세고 저장한다(entries, menu-access.js). */
(function () {
  'use strict';
  var PREFIX = 'nv.menuDraft.';
  var OWNER = PREFIX + 'owner';
  /* 메뉴 등록 창 값: 메뉴가 아직 없어 메뉴 보관과 따로 둔다(로그아웃 · 관리자 변경 때 함께 지워진다) */
  var NEW_MENU = PREFIX + 'new-menu';
  function store() {
    try { return window.sessionStorage; } catch (e) { return null; }
  }
  function read(menuId) {
    var s = store();
    if (!s) { return {}; }
    try { return JSON.parse(s.getItem(PREFIX + menuId)) || {}; } catch (e) { return {}; }
  }
  function write(menuId, entry) {
    var s = store();
    if (!s) { return; }
    try {
      if (Object.keys(entry).length) { s.setItem(PREFIX + menuId, JSON.stringify(entry)); } else { s.removeItem(PREFIX + menuId); }
    } catch (e) {
      // 저장 공간이 모자라면 보관하지 못할 뿐, 화면에서 고치고 저장하는 데는 지장이 없다
    }
  }
  function clearAll() {
    var s = store();
    if (!s) { return; }
    try {
      Object.keys(s).forEach(function (k) { if (k.indexOf(PREFIX) === 0) { s.removeItem(k); } });
    } catch (e) {
      // 지우지 못해도 다음에 들어온 관리자가 다르면 다시 지운다
    }
  }
  function menuIds() {
    var s = store();
    if (!s) { return []; }
    try {
      return Object.keys(s).filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== OWNER && k !== NEW_MENU; }).map(function (k) { return k.slice(PREFIX.length); });
    } catch (e) {
      return [];
    }
  }
  function partsOf(entry) {
    var out = {};
    ['info', 'src', 'perm'].forEach(function (p) { if (entry[p]) { out[p] = entry[p]; } });
    return out;
  }
  var script = document.currentScript;
  var owner = script ? script.getAttribute('data-owner') : null;
  var s = store();
  if (s && owner !== null) {
    try {
      if (s.getItem(OWNER) !== owner) { clearAll(); s.setItem(OWNER, owner); }
    } catch (e) {
      // 탭 보관을 쓸 수 없으면 보관 없이 동작한다
    }
  }
  window.menuDraft = {
    /* 메뉴 등록 창에서 게시판 [추가]로 떠날 때 쓰던 값을 둔다 */
    keepNew: function (values) {
      var kept = store();
      if (!kept) { return; }
      try { kept.setItem(NEW_MENU, JSON.stringify(values)); } catch (e) {
        // 저장 공간이 모자라면 돌아와서 다시 적을 뿐이다
      }
    },
    /* 돌아와서 한 번 꺼낸다 */
    takeNew: function () {
      var kept = store();
      if (!kept) { return null; }
      try {
        var values = JSON.parse(kept.getItem(NEW_MENU));
        kept.removeItem(NEW_MENU);
        return values;
      } catch (e) {
        return null;
      }
    },
    /* 서버 값이 그대로일 때만 보관본을 돌려준다 */
    load: function (menuId, part, base) {
      var entry = read(menuId);
      var kept = entry[part];
      if (!kept) { return null; }
      if (kept.base !== base) {
        delete entry[part];
        write(menuId, entry);
        return null;
      }
      return kept.data;
    },
    /* meta(접근권한 일괄 저장용): site · label(메뉴 이름) · changes(변경 문장) · also(같은 초안을 쓰는 메뉴 ID) */
    save: function (menuId, part, base, count, data, meta) {
      var entry = read(menuId);
      entry[part] = { base: base, count: count, data: data, meta: meta };
      write(menuId, entry);
    },
    drop: function (menuId, part) {
      var entry = read(menuId);
      if (entry[part]) {
        delete entry[part];
        write(menuId, entry);
      }
    },
    /* 저장을 보낼 때 표시해 두고, 돌아온 화면이 성공이면 그 탭의 보관본을 지운다. 실패면 고치던 값을 그대로 다시 보여 준다 */
    submitting: function (menuId, part) {
      var entry = read(menuId);
      entry.pending = part;
      write(menuId, entry);
    },
    settle: function (menuId, ok) {
      var entry = read(menuId);
      if (!entry.pending) { return; }
      if (ok) { delete entry[entry.pending]; }
      delete entry.pending;
      write(menuId, entry);
    },
    /* 같은 사이트에서 이 탭에 보관한 모든 메뉴의 초안: [{ id, base, count, data, meta }] */
    entries: function (part, site) {
      return menuIds().map(function (id) {
        var kept = read(id)[part];
        return kept && kept.meta && kept.meta.site === site ? { id: id, base: kept.base, count: kept.count, data: kept.data, meta: kept.meta } : null;
      }).filter(Boolean);
    },
    /* 탭별 변경 건수. 목록의 「변경」 표시가 쓴다. 게시판 · 화면을 함께 쓰는 메뉴는 초안 하나를 함께 본다 */
    counts: function (menuId) {
      var parts = partsOf(read(menuId));
      var out = {};
      Object.keys(parts).forEach(function (p) { out[p] = parts[p].count; });
      if (!out.perm) {
        menuIds().forEach(function (id) {
          var kept = read(id).perm;
          if (kept && kept.meta && (kept.meta.also || []).indexOf(menuId) >= 0) { out.perm = kept.count; }
        });
      }
      return out;
    }
  };
})();
