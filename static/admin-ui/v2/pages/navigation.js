/* 메뉴관리 목록 · 수정 화면 공통 스크립트 */
  // 연결 칸(fragments/menu-link): 대상유형에 맞는 대상 입력 하나만 활성화(나머지 disabled → 미전송). legacy 와 동일 함수명/훅.
  function cmsRouteTargetSync(sel) {
    var type = sel.value;
    var scope = sel.closest('form');
    if (!scope) return;
    scope.querySelectorAll('.cms-route-target__pick').forEach(function (el) {
      var types = (el.getAttribute('data-target-types') || '').split(',');
      var on = types.indexOf(type) >= 0;
      el.disabled = !on;
      el.hidden = !on;
      if (!on) { el.value = ''; }
    });
  }
  // 메뉴 유형(fragments/menu-link): 묶음 메뉴면 링크 줄 · 연결 대상을 감추고, 외부 링크면 주소 대신 URL 칸, 새 콘텐츠 페이지면
  // 주소 미리보기. 그 밖(라우트 대상)은 주소가 필수다(서버도 검사). [현재창 ▾] 은 링크 줄 맨 앞 하나.
  function menuTypeSync(sel) {
    cmsRouteTargetSync(sel);
    var form = sel.closest('form');
    var type = sel.value;
    var external = type === 'EXTERNAL_URL';
    var addressed = !!type && type !== 'NONE' && !external && type !== 'NEW_PAGE';
    var row = form.querySelector('[data-link-row]');
    var label = form.querySelector('[data-link-label]');
    var input = form.querySelector('[data-address-input]');
    var preview = form.querySelector('[data-page-preview]');
    row.hidden = !type || type === 'NONE';
    form.querySelector('[data-address-group]').hidden = !addressed;
    input.required = addressed;
    if (preview) { preview.hidden = type !== 'NEW_PAGE'; }
    label.htmlFor = external ? label.dataset.forUrl : label.dataset.forAddress;
    form.querySelectorAll('[data-pick-field]').forEach(function (field) {
      field.hidden = !field.querySelector('select.cms-route-target__pick:not([disabled]), input.cms-route-target__pick:not([disabled])');
    });
    form.querySelectorAll('[data-board-row]').forEach(function (row) { row.hidden = type !== 'BOARD'; });
    form.querySelectorAll('[data-content-row]').forEach(function (row) { row.hidden = type !== 'CONTENT'; });
  }
  // 선택 삭제 확인 문구: 고른 것 안에서 하위부터 지우고, 고르지 않은 하위가 남는 메뉴는 건너뛴다(서버가 같은 규칙으로 판정한다)
  function bulkDeleteMessage() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('[data-menu-id]'));
    var picked = {};
    rows.forEach(function (row) {
      var box = row.querySelector('[data-select-row]');
      if (box && box.checked) { picked[row.getAttribute('data-menu-id')] = true; }
    });
    var chosen = Object.keys(picked).length;
    var left = {};
    Object.keys(picked).forEach(function (id) { left[id] = true; });
    var changed = true;
    while (changed) {
      changed = false;
      rows.forEach(function (row) {
        var parent = row.getAttribute('data-parent-id');
        if (parent && !left[row.getAttribute('data-menu-id')] && left[parent]) { delete left[parent]; changed = true; }
      });
    }
    var skipped = chosen - Object.keys(left).length;
    var children = rows.filter(function (row) { return picked[row.getAttribute('data-menu-id')] && picked[row.getAttribute('data-parent-id')]; }).length;
    return '선택한 메뉴 ' + chosen + '개를 삭제할까요?'
      + (children ? ' 함께 고른 하위 메뉴 ' + children + '개를 먼저 지웁니다.' : '')
      + (skipped ? ' 고르지 않은 하위 메뉴가 남는 ' + skipped + '개는 지우지 않습니다.' : '');
  }
  // 「XML생성」: 파일을 받으면서 대기를 푼다. 페이지가 다시 그려지지 않으므로 결과를 토스트로 알리고 대기 표시를 지운다
  function downloadedName(response, fallback) {
    var header = response.headers.get('Content-Disposition') || '';
    var utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8) { try { return decodeURIComponent(utf8[1]); } catch (e) { return fallback; } }
    var plain = /filename="([^"]+)"/i.exec(header);
    return plain ? plain[1] : fallback;
  }
  function generateMenuXml(button) {
    var form = button.form;
    button.disabled = true;
    fetch(button.getAttribute('formaction'), {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: { Accept: 'application/xml' },
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) { window.nvToast(text && text.length < 200 ? text : 'XML을 만들지 못했습니다.'); });
      }
      var released = parseInt(response.headers.get('X-Menu-Released') || '0', 10);
      var name = downloadedName(response, 'menus.xml');
      return response.blob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        if (released > 0) {
          document.querySelectorAll('.mtree__tag--held, [data-held-legend]').forEach(function (el) { el.remove(); });
        }
        window.nvToast(released < 0 ? 'XML은 만들었으나 대기 중인 메뉴를 누리집에 반영하지 못했습니다.'
          : released > 0 ? 'XML을 만들고 대기 중인 메뉴 ' + released + '건을 누리집에 반영했습니다.'
          : 'XML을 만들었습니다. 대기 중인 메뉴는 없습니다.');
      });
    }).catch(function () {
      window.nvToast('XML을 만들지 못했습니다.');
    }).then(function () {
      button.disabled = false;
    });
  }
  // 목록 메뉴명 옆 「변경」: 탭에 보관한 저장 안 한 변경(menu-draft.js)과 서버의 소스 임시저장본. 있으면 「개별」 대신 보인다
  function markDirtyMenus() {
    document.querySelectorAll('[data-menu-dirty]').forEach(function (tag) {
      var counts = window.menuDraft ? window.menuDraft.counts(tag.getAttribute('data-menu-dirty')) : {};
      var serverDraft = tag.getAttribute('data-src-draft') === 'true';
      var parts = [];
      if (counts.info) { parts.push('메뉴 정보 ' + counts.info + '건'); }
      if (counts.src || serverDraft) { parts.push('소스 임시저장본'); }
      if (counts.perm) { parts.push('접근권한 ' + counts.perm + '건'); }
      tag.hidden = parts.length === 0;
      if (parts.length) {
        tag.title = '변경: 저장하지 않은 변경이 있습니다(' + parts.join(', ') + ').';
        var own = tag.parentNode.querySelector('.mtree__tag--own');
        if (own) { own.hidden = true; }
      }
    });
  }
  // 메뉴 목록 위치 옮기기: 손잡이를 끌거나(HTML 끌어 놓기) 방향키 · 눌러서 나오는 메뉴로 옮긴다. 저장 전에는 화면에서만 바뀌고, 저장 막대에서 한 번에 저장한다.
  // 쪽을 나눈 목록(admin-tables.js 5)에서 끌어 놓기는 지금 쪽 안에서만 되고, 방향키 · 메뉴로 옮기면 옮긴 메뉴가 든 쪽을 보인다.
  // 전체보기와 1단계 탭에서 쓴다. 검색 · 유형 필터가 걸리면 숨은 줄 때문에 틀어지므로 끈다. 1단계 탭에서는 그 1단계 메뉴를 옮기거나 그 밖으로 뺄 수 없다(형제가 화면에 없다).
  function initMenuReorder() {
    var bar = document.querySelector('[data-reorder-bar]');
    var section = bar ? bar.closest('[data-reorder-url]') : null;
    var tbody = section ? section.querySelector('.nv-nav-table tbody') : null;
    if (!tbody) { return; }
    var MAX_DEPTH = 5;
    var topMenu = section.getAttribute('data-reorder-top') || '';
    var endRow = tbody.querySelector('[data-menu-none]');
    var live = section.querySelector('[data-reorder-live]');
    var countEl = bar.querySelector('[data-reorder-count]');
    var reason = bar.querySelector('[name="reason"]');
    var menu = section.querySelector('[data-reorder-menu]');
    var search = document.getElementById('lt-q-menu');
    var typeFilter = document.getElementById('lt-type-menu');
    var nodes = {};
    var kids = {};
    var groupOrder = [];
    var saving = false;

    function keyOf(parent) { return parent || ''; }
    tbody.querySelectorAll('tr[data-menu-id]').forEach(function (row) {
      var id = row.getAttribute('data-menu-id');
      var parent = row.getAttribute('data-parent-id') || '';
      nodes[id] = {
        id: id, row: row, parent: parent, origParent: parent,
        sort: parseInt(row.getAttribute('data-menu-sort'), 10) || 0,
        version: parseInt(row.getAttribute('data-menu-version'), 10) || 0,
        code: row.getAttribute('data-menu-code') || '',
        name: row.getAttribute('data-menu-row') || id,
        grip: row.querySelector('[data-menu-grip]')
      };
      nodes[id].origSort = nodes[id].sort;
      nodes[id].index = Object.keys(nodes).length;
      nodes[id].grip.hidden = false;
    });
    var ids = Object.keys(nodes);
    function rebuildGroups() {
      kids = {};
      groupOrder = [];
      ids.slice().sort(function (a, b) { return nodes[a].index - nodes[b].index; }).forEach(function (id) {
        var key = keyOf(nodes[id].parent);
        if (!kids[key]) { kids[key] = []; groupOrder.push(key); }
        kids[key].push(id);
      });
    }
    rebuildGroups();
    // 처음 형제 순서 — 옮겼다가 같은 자리로 돌아오면 처음 순서값으로 되돌려 저장 대상에서 뺀다
    var origKids = {};
    Object.keys(kids).forEach(function (key) { origKids[key] = kids[key].slice(); });

    function isOrphanGroup(key) { return key !== '' && !nodes[key]; }
    function childrenOf(id) { return kids[id] || []; }
    /* 공개 테마는 3단까지 그리는 경우가 많다(krds 계열). 4단계부터는 누리집 메뉴에 안 보일 수 있다고 배지 툴팁으로만 알린다. */
    var DEEP_HINT_DEPTH = 4;
    var DEEP_HINT = ' · 테마에 따라 누리집 메뉴에 안 보일 수 있습니다(주소로는 열림)';
    function depthOf(id) {
      var depth = 1;
      for (var up = nodes[id].parent, guard = 0; up && nodes[up] && guard < 50; up = nodes[up].parent, guard++) { depth += 1; }
      return depth;
    }
    function heightOf(id) {
      var height = 1;
      childrenOf(id).forEach(function (kid) { height = Math.max(height, heightOf(kid) + 1); });
      return height;
    }
    function inBranch(id, candidate) {
      for (var at = candidate, guard = 0; at && nodes[at] && guard < 50; at = nodes[at].parent, guard++) {
        if (at === id) { return true; }
      }
      return false;
    }
    function branchOf(id, out) {
      out.push(id);
      childrenOf(id).forEach(function (kid) { branchOf(kid, out); });
      return out;
    }
    function locked() {
      return !!(search && search.value.trim()) || !!(typeFilter && typeFilter.value);
    }
    function fixedRoot(id) { return !!topMenu && id === topMenu; }
    // 그 자리에 놓을 수 없는 까닭. 놓을 수 있으면 null. 서버가 다시 검사한다.
    function placeProblem(id, parent) {
      if (parent && inBranch(id, parent)) { return '자기 자신이나 하위 메뉴 아래로 옮길 수 없습니다.'; }
      if (parent && !nodes[parent] && parent !== nodes[id].parent) { return '상위가 지워진 메뉴 곁으로 옮길 수 없습니다.'; }
      if (!parent && topMenu) { return '1단계 탭에서는 1단계로 뺄 수 없습니다. 전체보기에서 옮기세요.'; }
      if (parent && nodes[parent] && !nodes[parent].code) { return '메뉴코드가 없는 메뉴 아래로 옮길 수 없습니다.'; }
      var depth = (parent && nodes[parent] ? depthOf(parent) : 0) + heightOf(id);
      if (depth > MAX_DEPTH) { return '메뉴는 ' + MAX_DEPTH + '단까지입니다.'; }
      return null;
    }
    function pathOf(id) {
      var names = [];
      for (var at = id, guard = 0; at && nodes[at] && guard < 50; at = nodes[at].parent, guard++) { names.unshift(nodes[at].name); }
      return names.join(' › ');
    }
    function codeChanging(id) {
      for (var at = id, guard = 0; at && nodes[at] && guard < 50; at = nodes[at].parent, guard++) {
        if (nodes[at].parent !== nodes[at].origParent) { return true; }
      }
      return false;
    }
    function changedIds() {
      return ids.filter(function (id) { return nodes[id].parent !== nodes[id].origParent || nodes[id].sort !== nodes[id].origSort; });
    }
    function drawRow(id) {
      var node = nodes[id];
      var depth = depthOf(id);
      var wrap = node.row.querySelector('.nv-nav-menu');
      wrap.className = wrap.className.replace(/\bnv-nav-menu--d\d\b/, 'nv-nav-menu--d' + Math.min(depth, 4));
      var badge = wrap.querySelector('.nv-nav-menu__depth');
      badge.textContent = String(depth);
      var parent = node.parent && nodes[node.parent] ? pathOf(node.parent) : null;
      // 위치(상위 경로)는 단계 번호의 툴팁으로만 알린다 — 메뉴명 아래 경로 줄은 두지 않는다(시안 메뉴 목록)
      badge.title = depth + '단계 메뉴' + (parent ? ' — 상위: ' + parent : (node.parent ? ' — 상위 메뉴 없음' : ' — 최상위'))
        + (depth >= DEEP_HINT_DEPTH ? DEEP_HINT : '');
      var cell = node.row.querySelector('[data-menu-code-cell]');
      var pending = cell.querySelector('[data-code-pending]');
      var changing = codeChanging(id);
      Array.prototype.forEach.call(cell.children, function (el) { if (el !== pending) { el.hidden = changing; } });
      if (changing && !pending) {
        pending = document.createElement('span');
        pending.setAttribute('data-code-pending', '');
        pending.textContent = '저장 후 결정';
        pending.title = '저장하면 새 상위 아래 메뉴코드가 정해집니다. 링크URL은 그대로입니다.';
        cell.appendChild(pending);
      } else if (!changing && pending) {
        pending.remove();
      }
    }
    // reveal = 옮긴 메뉴 — 쪽을 나눈 목록에서 그 메뉴가 든 쪽을 보인다
    function draw(reveal) {
      var walk = function (id) {
        tbody.insertBefore(nodes[id].row, endRow);
        drawRow(id);
        childrenOf(id).forEach(walk);
      };
      groupOrder.filter(function (key) { return key === '' || isOrphanGroup(key); }).forEach(function (key) { (kids[key] || []).forEach(walk); });
      if (window.cmsAdminTables && window.cmsAdminTables.paginate) {
        window.cmsAdminTables.paginate(section, { reveal: reveal ? nodes[reveal].row : null });
      }
      var changed = changedIds().length;
      bar.hidden = changed === 0;
      countEl.innerHTML = '';
      countEl.append('메뉴 위치 변경 ');
      var b = document.createElement('b');
      b.textContent = changed + '건';
      countEl.append(b);
    }
    function say(text) { if (live) { live.textContent = text; } }
    function describe(id) {
      var node = nodes[id];
      var list = kids[keyOf(node.parent)];
      var parent = node.parent && nodes[node.parent] ? '상위 「' + nodes[node.parent].name + '」' : '최상위';
      return '「' + node.name + '」 ' + parent + ' ' + (list.indexOf(id) + 1) + '번째. 저장 전입니다.';
    }
    // 형제 순서가 처음과 같으면 처음 순서값으로, 달라졌을 때만 10 단위로 다시 매긴다(바꾼 메뉴만 수정 이력에 남게)
    function renumber(key) {
      var list = kids[key] || [];
      var orig = origKids[key] || [];
      var same = list.length === orig.length && list.every(function (id, i) { return id === orig[i]; });
      list.forEach(function (id, i) { nodes[id].sort = same ? nodes[id].origSort : (i + 1) * 10; });
    }
    function move(id, parent, index) {
      var node = nodes[id];
      var from = keyOf(node.parent);
      var to = keyOf(parent);
      kids[from].splice(kids[from].indexOf(id), 1);
      if (!kids[to]) { kids[to] = []; groupOrder.push(to); }
      kids[to].splice(index, 0, id);
      node.parent = parent;
      renumber(from);
      if (to !== from) { renumber(to); }
      draw(id);
    }
    function refused(text) {
      say(text);
      if (window.nvToast) { window.nvToast(text); }
    }
    // 메뉴 항목 · 방향키의 움직임. 못 하면 까닭을 돌려준다.
    function stepProblem(id, step) {
      var node = nodes[id];
      var list = kids[keyOf(node.parent)];
      var at = list.indexOf(id);
      if (step === 'up') { return at > 0 ? null : '맨 앞입니다.'; }
      if (step === 'down') { return at < list.length - 1 ? null : '맨 뒤입니다.'; }
      if (step === 'in') { return at > 0 ? placeProblem(id, list[at - 1]) : '앞에 있는 메뉴가 없어 안으로 넣을 수 없습니다.'; }
      if (!node.parent || !nodes[node.parent]) { return '이미 맨 위 단계입니다.'; }
      return placeProblem(id, nodes[node.parent].parent);
    }
    function step(id, name) {
      var problem = locked() ? '검색 · 유형 필터를 지우면 옮길 수 있습니다.' : fixedRoot(id) ? '1단계 탭에서는 이 메뉴를 옮길 수 없습니다.' : stepProblem(id, name);
      if (problem) { refused(problem); return; }
      var node = nodes[id];
      var list = kids[keyOf(node.parent)];
      var at = list.indexOf(id);
      if (name === 'up') {
        move(id, node.parent, at - 1);
      } else if (name === 'down') {
        move(id, node.parent, at + 1);
      } else if (name === 'in') {
        var prev = list[at - 1];
        move(id, prev, childrenOf(prev).length);
      } else {
        var parent = nodes[node.parent];
        var outer = kids[keyOf(parent.parent)];
        move(id, parent.parent, outer.indexOf(parent.id) + 1);
      }
      nodes[id].grip.focus();
      say(describe(id));
    }

    // 끌어 놓기
    var dragId = null;
    var marked = null;
    function clearMark() {
      if (marked) {
        marked.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-into', 'is-drop-denied');
        marked.removeAttribute('title');
        marked = null;
      }
    }
    function mark(row, kind) {
      if (marked !== row) { clearMark(); }
      marked = row;
      row.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-into', 'is-drop-denied');
      row.classList.add(kind);
    }
    // 커서가 줄의 어디에 있는지로 놓을 자리를 정한다. 위 · 아래 네 분의 일 = 줄 사이(그 자리 형제), 가운데 = 그 메뉴의 하위.
    function dropPlace(targetId, event) {
      var rect = nodes[targetId].row.getBoundingClientRect();
      var ratio = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
      var target = nodes[targetId];
      var without = function (key) { return (kids[key] || []).filter(function (x) { return x !== dragId; }); };
      if (ratio > 0.25 && ratio < 0.75) {
        return { parent: targetId, index: without(targetId).length, kind: 'is-drop-into' };
      }
      if (ratio <= 0.25) {
        return { parent: target.parent, index: without(keyOf(target.parent)).indexOf(targetId), kind: 'is-drop-before' };
      }
      // 줄 아래: 바로 아래가 그 메뉴의 하위면 첫 하위 자리, 아니면 그 메뉴 다음 형제
      if (without(targetId).length) {
        return { parent: targetId, index: 0, kind: 'is-drop-after' };
      }
      return { parent: target.parent, index: without(keyOf(target.parent)).indexOf(targetId) + 1, kind: 'is-drop-after' };
    }
    tbody.addEventListener('dragstart', function (e) {
      var grip = e.target.closest ? e.target.closest('[data-menu-grip]') : null;
      if (!grip || locked() || saving) { e.preventDefault(); return; }
      var id = grip.closest('tr').getAttribute('data-menu-id');
      if (fixedRoot(id)) { e.preventDefault(); return; }
      dragId = id;
      closeMenu();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nodes[id].name);
      e.dataTransfer.setDragImage(nodes[id].row, 16, 16);
      window.setTimeout(function () {
        if (dragId) { branchOf(dragId, []).forEach(function (x) { nodes[x].row.classList.add('is-dragging'); }); }
      }, 0);
    });
    tbody.addEventListener('dragover', function (e) {
      if (!dragId) { return; }
      var row = e.target.closest ? e.target.closest('tr[data-menu-id]') : null;
      if (!row || row.hidden) { clearMark(); return; }
      var targetId = row.getAttribute('data-menu-id');
      var place = dropPlace(targetId, e);
      var problem = inBranch(dragId, targetId) ? '자기 자신이나 하위 메뉴 아래로 옮길 수 없습니다.' : placeProblem(dragId, place.parent);
      if (problem) {
        mark(row, 'is-drop-denied');
        row.title = problem;
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      mark(row, place.kind);
    });
    // 줄 사이를 옮겨 다닐 때도 일어나므로 목록 밖으로 나갔을 때만 지운다
    tbody.addEventListener('dragleave', function (e) {
      var box = tbody.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) { clearMark(); }
    });
    tbody.addEventListener('drop', function (e) {
      if (!dragId) { return; }
      var row = e.target.closest ? e.target.closest('tr[data-menu-id]') : null;
      var id = dragId;
      clearMark();
      if (!row) { return; }
      var targetId = row.getAttribute('data-menu-id');
      var place = dropPlace(targetId, e);
      if (inBranch(id, targetId) || placeProblem(id, place.parent)) { return; }
      e.preventDefault();
      var key = keyOf(nodes[id].parent);
      if (keyOf(place.parent) !== key || kids[key].indexOf(id) !== place.index) {
        move(id, place.parent, place.index);
        say(describe(id));
      }
    });
    tbody.addEventListener('dragend', function () {
      ids.forEach(function (id) { nodes[id].row.classList.remove('is-dragging'); });
      clearMark();
      dragId = null;
    });

    // 손잡이: 방향키 · 눌러서 메뉴(터치 너비는 이 메뉴로 옮긴다)
    var menuFor = null;
    function closeMenu(focusBack) {
      if (menu.hidden) { return; }
      menu.hidden = true;
      if (focusBack && menuFor && nodes[menuFor]) { nodes[menuFor].grip.focus(); }
      menuFor = null;
    }
    function openMenu(id) {
      var problem = locked() ? '검색 · 유형 필터를 지우면 옮길 수 있습니다.' : fixedRoot(id) ? '1단계 탭에서는 이 메뉴를 옮길 수 없습니다.' : null;
      if (problem) { refused(problem); return; }
      menuFor = id;
      menu.querySelectorAll('[data-reorder-move]').forEach(function (item) {
        var why = stepProblem(id, item.getAttribute('data-reorder-move'));
        item.disabled = !!why;
        item.title = why || '';
      });
      menu.hidden = false;
      var rect = nodes[id].grip.getBoundingClientRect();
      menu.style.top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
      menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
      var first = menu.querySelector('[data-reorder-move]:not([disabled])');
      if (first) { first.focus(); }
    }
    tbody.addEventListener('click', function (e) {
      var grip = e.target.closest ? e.target.closest('[data-menu-grip]') : null;
      if (!grip) { return; }
      var id = grip.closest('tr').getAttribute('data-menu-id');
      if (menuFor === id) { closeMenu(); } else { openMenu(id); }
    });
    tbody.addEventListener('keydown', function (e) {
      var grip = e.target.closest ? e.target.closest('[data-menu-grip]') : null;
      if (!grip) { return; }
      var id = grip.closest('tr').getAttribute('data-menu-id');
      var name = { ArrowUp: 'up', ArrowDown: 'down', ArrowRight: 'in', ArrowLeft: 'out' }[e.key];
      if (name) {
        e.preventDefault();
        step(id, name);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu(id);
      }
    });
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-reorder-move]');
      if (!item || item.disabled || !menuFor) { return; }
      var id = menuFor;
      closeMenu();
      step(id, item.getAttribute('data-reorder-move'));
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') { return; }
      e.preventDefault();
      var items = Array.prototype.filter.call(menu.querySelectorAll('[data-reorder-move]'), function (x) { return !x.disabled; });
      var at = items.indexOf(document.activeElement);
      if (items.length) { items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !(e.target.closest && e.target.closest('[data-menu-grip]'))) { closeMenu(); }
    });

    // 검색 · 유형 필터가 걸리면 손잡이를 끈다
    function syncLock() {
      var off = locked();
      ids.forEach(function (id) {
        var disabled = off || fixedRoot(id);
        var grip = nodes[id].grip;
        grip.setAttribute('draggable', String(!disabled));
        if (disabled) { grip.setAttribute('aria-disabled', 'true'); } else { grip.removeAttribute('aria-disabled'); }
        grip.title = off ? '검색 · 유형 필터를 지우면 옮길 수 있습니다.'
          : fixedRoot(id) ? '1단계 탭에서는 이 메뉴를 옮길 수 없습니다. 전체보기에서 옮기세요.'
          : '끌어서 옮깁니다. 방향키나 눌러서 나오는 메뉴로도 옮길 수 있습니다.';
      });
      if (off) { closeMenu(); }
    }
    if (search) { search.addEventListener('input', syncLock); }
    syncLock();

    // 저장 막대
    function clearReasonError() {
      bar.querySelectorAll('[data-field-error]').forEach(function (el) { el.remove(); });
    }
    function reset() {
      ids.forEach(function (id) { nodes[id].parent = nodes[id].origParent; nodes[id].sort = nodes[id].origSort; });
      rebuildGroups();
      draw();
      clearReasonError();
      if (reason) { reason.value = ''; }
    }
    bar.querySelector('[data-reorder-cancel]').addEventListener('click', function () {
      reset();
      say('옮긴 위치를 되돌렸습니다.');
    });
    var saveBtn = bar.querySelector('[data-reorder-save]');
    saveBtn.addEventListener('click', function () {
      clearReasonError();
      var text = reason ? reason.value.trim() : '';
      if (Array.from(text).length < 2) {
        var err = document.createElement('span');
        err.className = 'nv-field__error';
        err.setAttribute('role', 'alert');
        err.setAttribute('data-field-error', '');
        err.textContent = '사유를 2자 이상 적으세요(수정 이력 · 접속 기록에 남습니다).';
        reason.parentNode.appendChild(err);
        reason.focus();
        return;
      }
      var items = changedIds().map(function (id) {
        var node = nodes[id];
        return { menuId: id, parentMenuId: node.parent || null, sortOrder: node.sort, versionNo: node.version };
      });
      saving = true;
      saveBtn.disabled = true;
      var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      fetch(section.getAttribute('data-reorder-url'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: window.cmsCsrf ? window.cmsCsrf.headers(headers) : headers,
        body: JSON.stringify({ items: items, reason: text, out: document.getElementById('menu-reorder-out').checked })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) { return { status: response.status, body: body }; });
      }).then(function (result) {
        if (result.status === 200) {
          try { window.sessionStorage.setItem('nv.menuReorderDone', result.body.message || '메뉴 위치를 저장했습니다.'); } catch (ignored) { /* 저장 못 해도 다시 그린다 */ }
          ids.forEach(function (id) { nodes[id].origParent = nodes[id].parent; nodes[id].origSort = nodes[id].sort; });
          window.location.reload();
          return;
        }
        window.nvToast(result.body.message || '저장하지 못했습니다. 새로고침한 뒤 다시 시도하세요.');
      }).catch(function () {
        window.nvToast('저장하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.');
      }).then(function () {
        saving = false;
        saveBtn.disabled = false;
      });
    });
    window.addEventListener('beforeunload', function (e) {
      if (changedIds().length) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    try {
      var done = window.sessionStorage.getItem('nv.menuReorderDone');
      if (done) {
        window.sessionStorage.removeItem('nv.menuReorderDone');
        if (window.nvToast) { window.nvToast(done); }
      }
    } catch (ignored) { /* 안내만 빠진다 */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    markDirtyMenus();
    initMenuReorder();
    document.querySelectorAll('[data-route-target-type]').forEach(menuTypeSync);

    // 메뉴 등록 폼이 열리면 그 위치로 스크롤 + 첫 입력 포커스
    var menuBtn = document.getElementById('nav-menu-create-btn');
    var menuPanel = document.getElementById('menu-create-panel');
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener('click', function () {
        window.setTimeout(function () {
          if (!menuPanel.hidden) {
            menuPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
            var first = menuPanel.querySelector('input, select');
            if (first) { first.focus({ preventScroll: true }); }
          }
        }, 0);
      });
    }

    // 메뉴 일괄 등록 패널: 파일 이름·크기 표시, 끌어놓기, 보고가 있으면 패널을 열어 둔다.
    // 「등록 완료」(data-bulk-mode=done)면 파일 칸·버튼이 <template data-bulk-initial> 에 들어 있다 — 「다른 파일 올리기」나 패널을
    // 닫으면 꺼내 처음 상태(파일 선택 · 등록)로 되돌린다. 결과표·오류 알림은 지운다.
    var bulkPanel = document.getElementById('menu-bulk-panel');
    if (bulkPanel) {
      var bulkForm = document.getElementById('menu-bulk-form');
      var restartBulk = function (focus) {
        var initial = bulkPanel.querySelectorAll('template[data-bulk-initial]');
        if (!initial.length) { return; }
        initial.forEach(function (tpl) { tpl.replaceWith(tpl.content.cloneNode(true)); });
        bulkPanel.querySelectorAll('[data-bulk-done-only], [data-bulk-report-section], [data-bulk-error]').forEach(function (el) { el.remove(); });
        var title = document.getElementById('menu-bulk-title');
        if (title) { title.textContent = title.getAttribute('data-initial-title') || title.textContent; }
        bulkPanel.setAttribute('data-bulk-mode', 'upload');
        bulkPanel.removeAttribute('data-bulk-report');
        if (focus) { var input = document.getElementById('menu-bulk-file'); if (input) { input.focus(); } }
      };
      bulkPanel.addEventListener('click', function (e) {
        if (e.target.closest('[data-bulk-restart]')) { e.preventDefault(); restartBulk(true); }
      });
      // 「등록 완료」를 닫으면 다음에 열 때는 처음 상태(닫기 = 이 보고를 다 봤다)
      bulkPanel.addEventListener('nv:panel-close', function () {
        if (bulkPanel.getAttribute('data-bulk-mode') === 'done') { restartBulk(false); }
      });
      bulkForm.addEventListener('submit', function (e) {
        var input = document.getElementById('menu-bulk-file');
        var f = input && input.files && input.files[0];
        var useLast = e.submitter && e.submitter.hasAttribute('data-bulk-apply-last');
        if (!f && !useLast) { e.preventDefault(); window.alert('메뉴 구조 파일(xlsx · csv · xml)을 선택하세요.'); return; }
        if (f && /\.xls$/i.test(f.name)) { e.preventDefault(); window.alert('구 엑셀 형식(.xls)은 받지 않습니다. 엑셀에서 「다른 이름으로 저장 → Excel 통합 문서(*.xlsx)」로 저장해 올려 주세요.'); }
      });
      if (bulkPanel.getAttribute('data-bulk-report') === 'true') {
        // 이름을 따로 둔다 — 아래 게시판 복귀의 var opener 와 같은 함수라, 같은 이름이면 타이머가 돌 때 그 값(null)을 누른다
        var bulkOpener = document.getElementById('nav-menu-bulk-btn');
        if (bulkOpener) { window.setTimeout(function () { bulkOpener.click(); }, 0); }
      }
    }

    var bulkMenuForm = document.getElementById('bulk-menu-form');
    if (bulkMenuForm) {
      bulkMenuForm.addEventListener('submit', function (e) {
        // 대상이 지금 고른 줄로 정해지므로 제출 때 문구를 만든다(formaction 단추는 자기 문구를 쓴다)
        if (!(e.submitter && e.submitter.hasAttribute('data-confirm'))) { bulkMenuForm.setAttribute('data-confirm', bulkDeleteMessage()); }
      });
    }
    document.querySelectorAll('[data-menu-xml]').forEach(function (button) {
      button.addEventListener('click', function (e) {
        if (!window.fetch || !window.nvToast) { return; }   // 없으면 보통 제출로 파일만 받는다
        e.preventDefault();
        generateMenuXml(button);
      });
    });

    // 행 "수정하기"(드롭메뉴 안 reveal)로 펼친 편집 행은 첫 입력에 포커스
    document.querySelectorAll('.nv-dropmenu__item[data-reveal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = document.querySelector(btn.getAttribute('data-reveal'));
        window.setTimeout(function () {
          if (row && !row.hidden) { var f = row.querySelector('input, select'); if (f) { f.focus(); } }
        }, 0);
      });
    });

    // 새 메뉴 등록 — 상위 메뉴를 바꾸면 그 아래 다음 메뉴코드(data-next-code)로 칸을 채운다. 채운 제안은 menuCodeAuto 로 함께 보내
    // 그대로 두면 서버가 그 순간의 다음 코드를 준다. 코드 없는 상위는 안내만. 새 콘텐츠 페이지의 주소 미리보기도 코드를 따른다.
    var createForm = document.getElementById('menu-create-form');
    // 「관리 ▾ › 하위 메뉴 등록」: 등록 폼을 열고 상위 메뉴를 그 메뉴로 고른다
    document.querySelectorAll('[data-new-child]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var opener = document.getElementById('nav-menu-create-btn');
        var parent = document.getElementById('mParent');
        if (!opener || !parent) { return; }
        opener.click();
        parent.value = btn.getAttribute('data-new-child');
        parent.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    if (createForm) {
      var parentSel = createForm.querySelector('[data-menu-code-parent]');
      var codeInput = createForm.querySelector('[data-menu-code-input]');
      var codeAuto = createForm.querySelector('[data-menu-code-auto]');
      var noCode = createForm.querySelector('[data-menu-code-nocode]');
      var pagePath = createForm.querySelector('[data-page-path]');
      var pagePublicPath = createForm.querySelector('[data-page-public-path]');
      var pathPrefix = createForm.getAttribute('data-path-prefix') || '';
      var codeShape = /^sub\d{2}(_\d{2}){0,4}$/;
      // 기본 경로(MenuCodes.defaultPath): 사이트 폴더가 있으면 /{사이트폴더}/{코드}(1차 포함), 없으면 /{1차코드}/{코드}(1차는 /{코드}).
      var syncPagePath = function () {
        var code = (codeInput.value || '').trim().toLowerCase();
        if (!codeShape.test(code)) { pagePath.textContent = '-'; pagePublicPath.textContent = '-'; return; }
        var cut = code.indexOf('_');
        var path = pathPrefix ? '/' + pathPrefix + '/' + code : (cut < 0 ? '/' + code : '/' + code.slice(0, cut) + '/' + code);
        pagePath.textContent = path;
        pagePublicPath.textContent = '/public' + path;
      };
      var fillCode = function () {
        var option = parentSel.options[parentSel.selectedIndex];
        var next = option ? option.getAttribute('data-next-code') : null;
        codeInput.value = next || '';
        codeAuto.value = next || '';
        noCode.hidden = !!next || !parentSel.value;
        syncPagePath();
      };
      parentSel.addEventListener('change', fillCode);
      codeInput.addEventListener('input', syncPagePath);
      fillCode();
    }

    // 연결 서비스 화면을 고르면 주소가 비어 있을 때 그 화면의 주소를 채운다(바꿀 수 있다).
    document.querySelectorAll('select.cms-route-target__pick[data-target-types="EXTENSION_PROGRAM"]').forEach(function (screen) {
      screen.addEventListener('change', function () {
        var form = screen.closest('form');
        var input = form.querySelector('[data-address-input]');
        var option = screen.options[screen.selectedIndex];
        if (!input || !option || !option.dataset.path || (input.value && input.value !== '/')) { return; }
        input.value = option.dataset.path;
      });
    });

    // 주소 칸: 있는 주소(지금 주소 · 메뉴 없는 주소) · 「직접입력」. 주소 값은 늘 텍스트 칸(name=path) 하나 — 스크립트가 없으면 텍스트
    // 칸만 보인다. 메뉴 없는 주소를 고르면 그 주소의 메뉴 유형 · 연결 대상을 채운다(바꿀 수 있다). 콘솔에 없는 유형이면 그대로 둔다.
    document.querySelectorAll('[data-address-pick]').forEach(function (pick) {
      var input = pick.parentNode.querySelector('[data-address-input]');
      var form = pick.closest('form');
      var direct = function () { return pick.options[pick.selectedIndex].hasAttribute('data-address-direct'); };
      // 「직접입력」은 「/」로 시작해 뒤를 잇게 한다. 「/」만 남으면 주소를 안 적은 것 — 주소가 필수인 유형은 막고, 아니면 비워 보낸다
      var startSlash = function () { if (direct() && !input.value) { input.value = '/'; } };
      var bareSlash = function () { return direct() && input.value.trim() === '/'; };
      input.addEventListener('input', function () { input.setCustomValidity(''); });
      form.addEventListener('submit', function () { if (bareSlash()) { input.value = ''; } });
      form.querySelectorAll('[type=submit]').forEach(function (button) {
        button.addEventListener('click', function () {
          input.setCustomValidity(input.required && bareSlash() ? '주소를 / 뒤에 이어서 입력하세요.' : '');
        });
      });
      pick.hidden = false;
      pick.disabled = false;
      input.hidden = !direct();
      startSlash();
      pick.addEventListener('change', function () {
        input.hidden = !direct();
        if (direct()) {   // 지금 값은 두고 끝에서 이어 쓴다
          startSlash();
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
          return;
        }
        input.value = pick.value;
        var option = pick.options[pick.selectedIndex];
        var type = form.querySelector('[data-route-target-type]');
        var id = option.dataset.targetId;
        if (!option.dataset.targetType || !Array.prototype.some.call(type.options, function (o) { return o.value === option.dataset.targetType; })) { return; }
        type.value = option.dataset.targetType;
        menuTypeSync(type);
        form.querySelectorAll('select.cms-route-target__pick, input.cms-route-target__pick').forEach(function (el) {
          if (el.disabled) { return; }
          // 목록에 없는 대상(목록 상한 밖 등)은 선택지로 더해 그대로 저장되게
          if (el.tagName === 'SELECT' && !Array.prototype.some.call(el.options, function (o) { return o.value === id; })) { el.add(new Option(id, id)); }
          el.value = id;
        });
      });
    });

    // 연결 대상 게시판 [추가] · [수정](#35). [추가]는 모달이고, 돌아올 곳 = 지금 쿼리 + 이 폼(editMenu=메뉴 ID · 새 메뉴면 newMenu=1).
    // [수정]은 게시판 관리 수정 화면으로 간다. 고치던 메뉴 정보는 탭에 보관돼 있어 묻지 않는다(data-draft-kept).
    var boardCreateModal = document.getElementById('board-create-modal');
    if (boardCreateModal) {
      var boardBase = boardCreateModal.getAttribute('data-base');
      var returnQuery = function (form) {
        var q = new URLSearchParams(location.search);
        ['pickBoard', 'editMenu', 'newMenu'].forEach(function (k) { q.delete(k); });
        q.set('siteId', boardCreateModal.getAttribute('data-site-id'));
        if (form.hasAttribute('data-menu-id')) { q.set('editMenu', form.getAttribute('data-menu-id')); } else { q.set('newMenu', '1'); }
        return '?' + q.toString();
      };
      // 등록 창은 저장한 곳이 없으므로 떠날 때 쓰던 값을 탭에 둔다(수정 화면은 menu-edit.js 가 따로 보관한다)
      var NEW_MENU_FIELDS = ['menuName', 'parentMenuId', 'menuCode', 'menuCodeAuto', 'linkTarget', 'path', 'targetType', 'sortOrder', 'menuVisible', 'menuActive'];
      var keepNewMenu = function (form) {
        if (form.hasAttribute('data-menu-id') || !window.menuDraft) { return; }
        var values = {};
        NEW_MENU_FIELDS.forEach(function (name) {
          var el = form.elements[name];
          if (el) { values[name] = el.value; }
        });
        window.menuDraft.keepNew(values);
      };
      var restoreNewMenu = function (form) {
        var kept = window.menuDraft ? window.menuDraft.takeNew() : null;
        if (!kept) { return; }
        var parent = form.elements.parentMenuId;
        if (Array.prototype.some.call(parent.options, function (o) { return o.value === kept.parentMenuId; })) {
          parent.value = kept.parentMenuId;
          parent.dispatchEvent(new Event('change', { bubbles: true }));   // 다음 코드를 다시 채운다. 쓰던 코드는 아래에서 다시 넣는다
        }
        ['menuName', 'menuCode', 'menuCodeAuto', 'linkTarget', 'sortOrder'].forEach(function (name) {
          if (form.elements[name] && kept[name] !== undefined) { form.elements[name].value = kept[name]; }
        });
        var type = form.elements.targetType;
        if (Array.prototype.some.call(type.options, function (o) { return o.value === kept.targetType; })) {
          type.value = kept.targetType;
          menuTypeSync(type);
        }
        var input = form.querySelector('[data-address-input]');
        var pick = form.querySelector('[data-address-pick]');
        if (input && kept.path !== undefined) {
          input.value = kept.path;
          if (pick) {
            var listed = !!kept.path && Array.prototype.some.call(pick.options, function (o) { return o.value === kept.path; });
            pick.value = listed ? kept.path : '';
            input.hidden = listed;
          }
        }
        ['menuVisible', 'menuActive'].forEach(function (name) {
          var field = form.elements[name];
          if (field && kept[name] !== undefined) {
            field.value = kept[name];
            var sw = field.nextElementSibling;
            if (sw) { sw.checked = kept[name] === 'true'; }
          }
        });
        var code = form.elements.menuCode;
        if (code) { code.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      // 게시판을 고르면 링크URL 이 비어 있을 때 게시판 코드로 제안을 채운다(바꿀 수 있다). 비어 있으면 주소 필수에 막힌다
      var suggestBoardPath = function (form, sel) {
        var input = form.querySelector('[data-address-input]');
        var option = sel.options[sel.selectedIndex];
        var code = option ? option.getAttribute('data-code') : null;
        if (!input || !code || (input.value && input.value.trim() !== '/')) { return; }
        var prefix = form.getAttribute('data-path-prefix');
        input.value = (prefix ? '/' + prefix : '') + '/' + code.toLowerCase();
      };
      document.querySelectorAll('select[data-target-types="BOARD"]').forEach(function (sel) {
        sel.addEventListener('change', function () { suggestBoardPath(sel.closest('form'), sel); });
      });
      document.querySelectorAll('[data-board-add]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          keepNewMenu(btn.closest('form'));
          boardCreateModal.querySelector('[data-board-return]').value = returnQuery(btn.closest('form'));
          window.nvAdmin.openModal(boardCreateModal, btn);
        });
      });
      document.querySelectorAll('[data-board-edit]').forEach(function (link) {
        link.addEventListener('click', function (e) {
          var sel = link.closest('[data-board-row]').querySelector('select');
          if (!sel.value) {
            e.preventDefault();
            window.nvToast('게시판을 먼저 고르세요.');
            sel.focus();
            return;
          }
          link.href = boardBase + encodeURIComponent(sel.value) + '/edit?tab=perm';
        });
      });
      // 게시판 저장 뒤 돌아왔으면 그 메뉴 폼을 다시 열고 pickBoard 를 연결 대상으로(빈 값 = 「게시판 선택」)
      var params = new URLSearchParams(location.search);
      var editForm = document.querySelector('form[data-menu-id]');
      var opener = !editForm && params.get('newMenu') ? document.getElementById('nav-menu-create-btn') : null;
      var applyPick = function (form) {
        if (!form || !params.has('pickBoard')) { return; }
        var type = form.querySelector('[data-route-target-type]');
        type.value = 'BOARD';
        menuTypeSync(type);
        var sel = form.querySelector('select[data-target-types="BOARD"]');
        var pick = params.get('pickBoard');
        if (pick && !Array.prototype.some.call(sel.options, function (o) { return o.value === pick; })) { sel.add(new Option(pick, pick)); }
        sel.value = pick;
        suggestBoardPath(form, sel);
        form.dispatchEvent(new Event('change', { bubbles: true }));
      };
      // 돌아온 표시(pickBoard · newMenu · editMenu)를 주소에서 지운다. 새로고침이 다시 적용하지 않게 한다
      var clearReturn = function () {
        var url = new URL(location.href);
        ['pickBoard', 'newMenu', 'editMenu'].forEach(function (k) { url.searchParams.delete(k); });
        window.history.replaceState(null, '', url.pathname + url.search);
      };
      if (editForm) {
        // 수정 화면: 탭 보관본을 되살린 뒤에 고른 게시판을 다시 넣어야 하므로 menu-edit.js 가 이어서 부른다
        window.menuApplyPick = function () {
          applyPick(editForm);
          clearReturn();
        };
        applyPick(editForm);
      } else if (opener) {
        window.setTimeout(function () {
          opener.click();
          var form = document.getElementById('menu-create-form');
          restoreNewMenu(form);
          applyPick(form);
          clearReturn();
        }, 0);
      }
    }

    // 메뉴 수정 — 상위 메뉴를 바꾸면 코드 칸을 닫는다. 칸이 비활성이면 코드를 보내지 않고, 저장 때 서비스가 새 상위 아래 다음 코드를 붙인다(하위도 함께).
    document.querySelectorAll('select[data-parent-select]').forEach(function (sel) {
      // 바꿀 때만 뜨는 안내(data-parent-change-hint). 칸 설명(aria-describedby)은 늘 보이는 글일 수 있어 따로 찾는다
      var field = sel.closest('.nv-field');
      var hint = (field && field.querySelector('[data-parent-change-hint]')) || document.getElementById(sel.getAttribute('aria-describedby'));
      var code = sel.form ? sel.form.querySelector('[data-menu-code-edit]') : null;
      var was = sel.value;
      var placeholder = code ? code.placeholder : '';
      var sync = function () {
        var changed = sel.value !== was;
        if (hint) { hint.hidden = !changed; }
        if (!code) { return; }
        if (changed && !code.disabled) {
          code.disabled = true;
          code.value = '';
          code.placeholder = '저장할 때 새 상위 아래로 정해집니다';
        } else if (!changed && code.disabled) {
          code.disabled = false;
          code.value = code.defaultValue;
          code.placeholder = placeholder;
        }
      };
      sel.addEventListener('change', sync);
      sync();
    });

    // 메뉴 목록 검색: 입력하는 대로 줄을 거른다. 숨은 줄은 선택에서 빠지고, 1단계 탭 · 주소는 검색어 · 검색 항목을 잇는다.
    // 검색 항목(#lt-field-menu): 메뉴명 · 메뉴코드 · 담당자명, 비우면 셋 중 어디든(서버 MenuTree.filter 와 같은 규칙)
    var menuSearch = document.getElementById('lt-q-menu');
    if (menuSearch) {
      var menuRows = document.querySelectorAll('[data-menu-row]');
      var menuTotal = document.querySelector('[data-menu-total]');
      var menuNone = document.querySelector('[data-menu-none]');
      var menuField = document.getElementById('lt-field-menu');
      var withKeyword = function (href, word, field) {
        var url = new URL(href, location.href);
        if (word) { url.searchParams.set('keywordMenu', word); } else { url.searchParams.delete('keywordMenu'); }
        if (field) { url.searchParams.set('fieldMenu', field); } else { url.searchParams.delete('fieldMenu'); }
        return url.pathname + url.search;
      };
      var FIELD_ATTRS = { name: ['data-menu-row'], code: ['data-menu-code'], manager: ['data-menu-manager'] };
      var matches = function (row, lower, field) {
        var attrs = FIELD_ATTRS[field] || ['data-menu-row', 'data-menu-code', 'data-menu-manager'];
        return attrs.some(function (attr) { return (row.getAttribute(attr) || '').toLowerCase().indexOf(lower) >= 0; });
      };
      var runSearch = function () {
        var word = menuSearch.value.trim();
        var lower = word.toLowerCase();
        var field = menuField ? menuField.value : '';
        var shown = 0;
        menuRows.forEach(function (row) {
          var on = !lower || matches(row, lower, field);
          if (row.hidden === on) {
            row.hidden = !on;
            var box = row.querySelector('[data-select-row]');
            if (box) { box.disabled = !on; box.checked = false; }
          }
          if (on) { shown += 1; }
        });
        if (menuTotal) { menuTotal.textContent = String(shown); }
        if (menuNone) { menuNone.hidden = shown > 0; }
        document.querySelectorAll('.nv-menu-top-tabs a.nv-tab').forEach(function (tab) { tab.setAttribute('href', withKeyword(tab.getAttribute('href'), word, field)); });
        window.history.replaceState(null, '', withKeyword(location.href, word, field));
        var scope = menuSearch.closest('[data-select-scope]');
        if (scope) { scope.setAttribute('data-list-page', '1'); }
        if (scope && window.cmsAdminTables && window.cmsAdminTables.paginate) { window.cmsAdminTables.paginate(scope); }
        if (scope && window.nvAdmin) { window.nvAdmin.syncSelection(scope); }
      };
      menuSearch.addEventListener('input', runSearch);
      if (menuField) { menuField.addEventListener('change', runSearch); }
    }
  });

