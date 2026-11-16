/**
 * 이미지 탐색기(docs/images.md) — 이미지 폴더(images/{사이트코드}/… · images/common/…)를 폴더 나무 + 파일 격자로 보여 준다.
 * 「이미지 관리」 화면(mode=manage: 선택 삭제 · 주소 복사 · 내려받기)과 콘텐츠 편집기 「이미지 삽입」 창(mode=pick: 그림 하나 고르기)이
 * 같은 위젯을 쓴다. 서버는 ImageAdminController JSON(tree · list · upload · delete). CSRF 는 admin-shell.js 의 window.cmsCsrf.
 * pick + layout=imgmodal 은 퍼블리싱 「이미지 삽입」 모양(.imgbar 폴더 · 파일 이름 찾기 → .imggrid 썸네일 라디오, mountPick)이고, 올리기 · 새 폴더는 같은 서버 기능을 쓴다.
 *
 *   var ex = window.cmsImageExplorer.mount(el, { base, siteId, mode, folder, canWrite, onSelect, onFolder });
 *   ex.reload(); ex.open('kor/sub01'); ex.upload(files); ex.folder(); ex.selected();
 *
 * 보안: 파일 · 폴더 이름은 사용자가 정한 값이라 innerHTML 에 넣지 않고 textContent · 속성으로만 쓴다.
 */
(function () {
  'use strict';

  var EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  var MAX_BYTES = 25 * 1024 * 1024;
  var SEGMENT = /^[\p{L}\p{N}_-][\p{L}\p{N}._-]*$/u;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'text') node.textContent = value;
      else if (key === 'className') node.className = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function icon(id) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'nv-icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  function csrfHeaders() {
    return window.cmsCsrf ? window.cmsCsrf.headers() : {};
  }

  // 화면에 보일 주소(한글 파일 이름은 퍼센트 인코딩을 풀어 보인다 — 복사 · 삽입은 인코딩된 주소 그대로).
  function readableUrl(url) {
    try { return decodeURI(url); } catch (e) { return url; }
  }

  // 서버가 저장하는 이름(ImageAdminController.fileName — 쓸 수 없는 글자 → _) — 덮어쓰기 확인 뒤 다시 보낼 파일을 결과와 맞춘다.
  function storedName(name) {
    var n = String(name || '').normalize('NFC').replace(/\\/g, '/');
    n = n.substring(n.lastIndexOf('/') + 1).trim().replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^\.+/, '');
    return n || 'image';
  }

  function extensionOf(name) {
    var dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.substring(dot + 1).toLowerCase();
  }

  function readJson(res) {
    return res.text().then(function (text) {
      var body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }
      if (!res.ok) {
        var msg = body && body.message ? body.message
          : (res.status === 413 ? '파일이 너무 큽니다(25MB 까지).' : 'HTTP ' + res.status);
        throw new Error(msg);
      }
      return body;
    });
  }

  function mount(root, opts) {
    // 콘텐츠 「이미지 삽입」 창만 퍼블리싱 모양(layout=imgmodal). 팝업 이미지 창(popup-image-picker.js)은 나무 + 격자 그대로
    if (opts.mode === 'pick' && opts.layout === 'imgmodal') return mountPick(root, opts);
    var base = opts.base;
    var siteId = opts.siteId;
    var mode = opts.mode === 'pick' ? 'pick' : 'manage';
    var canWrite = opts.canWrite !== false;
    var current = opts.folder || '';
    var tree = [];
    var virtualFolders = {};
    var files = [];
    var picked = null;
    var siteFolder = null;

    // ── 뼈대 ─────────────────────────────────────────────────────────
    root.textContent = '';
    root.classList.add('im-explorer');
    root.setAttribute('data-mode', mode);
    var treeNav = el('nav', { className: 'im-tree', 'aria-label': '이미지 폴더' });
    var treeList = el('ul', { className: 'im-tree__list' });
    treeNav.appendChild(treeList);
    var notice = el('p', { className: 'im-notice', hidden: true });

    var crumbs = el('p', { className: 'im-crumbs' });
    var fileInput = el('input', { type: 'file', multiple: mode === 'manage', accept: EXTENSIONS.map(function (e) { return '.' + e; }).join(','),
      className: 'im-file-input', id: (root.id || 'im') + '-file', tabindex: '-1', 'aria-hidden': 'true' });
    var uploadBtn = el('button', { type: 'button', className: 'nv-btn nv-btn--sm nv-btn--primary', disabled: !canWrite }, [icon('nv-i-upload'), el('span', { text: '올리기' })]);
    var newFolderBtn = el('button', { type: 'button', className: 'nv-btn nv-btn--sm nv-btn--outline', disabled: !canWrite }, [icon('nv-i-plus'), el('span', { text: '새 폴더' })]);
    var deleteBtn = mode === 'manage'
      ? el('button', { type: 'button', className: 'nv-btn nv-btn--sm nv-btn--danger', disabled: true }, [icon('nv-i-trash'), el('span', { text: '선택 삭제' })])
      : null;
    var toolbar = el('div', { className: 'im-toolbar' }, [crumbs, el('div', { className: 'im-toolbar__actions' }, [newFolderBtn, uploadBtn, deleteBtn])]);
    var drop = el('div', { className: 'nv-dropzone im-drop', hidden: !canWrite }, [
      icon('nv-i-upload'),
      el('span', { text: '그림을 여기에 끌어 놓으면 이 폴더로 올라갑니다' }),
      el('small', { text: 'png · jpg · gif · webp · svg, 25MB 까지. 같은 이름은 덮어쓸지 묻습니다.' })
    ]);
    var status = el('p', { className: 'im-status', role: 'status', 'aria-live': 'polite' });
    var grid = el('ul', { className: 'im-grid', 'aria-label': '폴더 내용' });
    var pane = el('section', { className: 'im-pane', 'aria-label': '폴더 내용' }, [toolbar, drop, status, grid]);
    root.appendChild(el('div', { className: 'im-explorer__body' }, [treeNav, pane]));
    root.insertBefore(notice, root.firstChild);
    root.appendChild(fileInput);

    function say(text, kind) {
      status.textContent = text || '';
      status.className = 'im-status' + (kind ? ' im-status--' + kind : '');
    }

    // ── 나무 ─────────────────────────────────────────────────────────
    function loadTree() {
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/tree', { credentials: 'same-origin' })
        .then(readJson)
        .then(function (body) {
          tree = body.folders || [];
          siteFolder = body.siteFolder;
          notice.hidden = !body.message;
          notice.textContent = body.message || '';
          if (!current || !allowed(current)) current = siteFolder || 'common';
          renderTree();
        });
    }

    function allowed(path) {
      var top = path.split('/')[0];
      return top === 'common' || (siteFolder && top === siteFolder);
    }

    function allFolders() {
      var map = {};
      tree.forEach(function (f) { map[f.path] = f; });
      Object.keys(virtualFolders).forEach(function (path) {
        if (!map[path]) map[path] = { path: path, name: path.substring(path.lastIndexOf('/') + 1), label: path.substring(path.lastIndexOf('/') + 1) + ' (새 폴더)', depth: path.split('/').length - 1, fileCount: 0 };
      });
      return Object.keys(map).sort().map(function (k) { return map[k]; });
    }

    // 폴더 단추 찾기는 그 목록 안에서만 — 「이미지 관리」 바깥 상자(#image-explorer)에도 처음 폴더 data-folder 가 있어,
    // closest 가 상자까지 올라가면 그림 칸 체크를 누를 때마다 처음 폴더를 다시 열어 선택이 풀렸다(점검 11/12)
    function folderIn(container, e) {
      var btn = e.target.closest('[data-folder]');
      return btn && btn !== container && container.contains(btn) ? btn : null;
    }

    function renderTree() {
      treeList.textContent = '';
      allFolders().forEach(function (f) {
        var btn = el('button', { type: 'button', className: 'im-tree__item', 'data-folder': f.path,
          'aria-current': f.path === current ? 'true' : null, title: '/images/' + f.path + '/' });
        btn.style.setProperty('--im-depth', f.depth);
        btn.appendChild(icon('nv-i-folder'));
        btn.appendChild(el('span', { className: 'im-tree__label', text: f.label }));
        if (f.fileCount) btn.appendChild(el('span', { className: 'im-tree__count', text: String(f.fileCount) }));
        treeList.appendChild(el('li', {}, [btn]));
      });
    }

    treeList.addEventListener('click', function (e) {
      var btn = folderIn(treeList, e);
      if (btn) open(btn.getAttribute('data-folder'));
    });

    // ── 폴더 내용 ─────────────────────────────────────────────────────
    function open(path) {
      current = path;
      picked = null;
      // 아직 파일이 없는 기본 폴더(예: 팝업 {사이트}/popup)도 나무에 보이게 한다 — 첫 그림을 올리면 서버에 생긴다.
      if (tree.length && !tree.some(function (f) { return f.path === path; })) virtualFolders[path] = true;
      if (opts.onSelect) opts.onSelect(null);
      if (opts.onFolder) opts.onFolder(path);
      renderTree();
      renderCrumbs();
      say('불러오는 중…');
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/list?folder=' + encodeURIComponent(path), { credentials: 'same-origin' })
        .then(readJson)
        .then(function (body) {
          files = body.files || [];
          var folders = body.folders || [];
          renderGrid(folders);
          say(files.length || folders.length ? ''
            : '이 폴더에 그림이 없습니다.' + (canWrite ? ' 끌어 놓거나 [올리기]로 넣으세요.' : ''));
        })
        .catch(function (err) {
          files = [];
          renderGrid([]);
          say('폴더를 읽지 못했습니다: ' + err.message, 'error');
        });
    }

    function renderCrumbs() {
      crumbs.textContent = '';
      crumbs.appendChild(el('span', { className: 'im-crumbs__root', text: '/images/' }));
      var parts = current.split('/');
      parts.forEach(function (part, i) {
        var path = parts.slice(0, i + 1).join('/');
        if (i > 0) crumbs.appendChild(el('span', { className: 'im-crumbs__sep', text: '/', 'aria-hidden': 'true' }));
        if (i === parts.length - 1) {
          crumbs.appendChild(el('strong', { text: part }));
        } else {
          var b = el('button', { type: 'button', className: 'im-crumbs__link', 'data-folder': path, text: part });
          crumbs.appendChild(b);
        }
      });
    }

    crumbs.addEventListener('click', function (e) {
      var btn = folderIn(crumbs, e);
      if (btn) open(btn.getAttribute('data-folder'));
    });

    function renderGrid(folders) {
      grid.textContent = '';
      folders.forEach(function (f) {
        var btn = el('button', { type: 'button', className: 'im-tile im-tile--folder', 'data-folder': f.path }, [
          el('span', { className: 'im-tile__thumb' }, [icon('nv-i-folder')]),
          el('span', { className: 'im-tile__name', text: f.name })
        ]);
        grid.appendChild(el('li', {}, [btn]));
      });
      files.forEach(function (f) { grid.appendChild(fileTile(f)); });
      updateDelete();
    }

    function fileTile(f) {
      var thumb = el('span', { className: 'im-tile__thumb' }, [el('img', { src: f.url, alt: '', loading: 'lazy' })]);
      var name = el('span', { className: 'im-tile__name', text: f.name, title: f.name });
      var meta = el('span', { className: 'im-tile__meta', text: f.sizeLabel + (f.uploadedAt ? ' · ' + f.uploadedAt.replace('T', ' ').substring(0, 16) : '') });
      if (mode === 'pick') {
        var pick = el('button', { type: 'button', className: 'im-tile', 'data-path': f.path, 'aria-pressed': 'false',
          'aria-label': f.name + ' 고르기' }, [thumb, name, meta]);
        return el('li', {}, [pick]);
      }
      var check = el('input', { type: 'checkbox', className: 'im-tile__check', 'data-path': f.path, 'aria-label': f.name + ' 선택', disabled: !canWrite });
      var copy = el('button', { type: 'button', className: 'nv-btn nv-btn--sm nv-btn--ghost', 'data-copy': f.url, title: '주소 복사: ' + f.url }, [icon('nv-i-link'), el('span', { text: '주소 복사' })]);
      var uses = el('button', { type: 'button', className: 'nv-btn nv-btn--sm nv-btn--ghost', 'data-usage': f.path, 'aria-label': f.name + ' 쓰는 곳 보기' }, [icon('nv-i-search'), el('span', { text: '사용처' })]);
      var dl = el('a', { className: 'nv-btn nv-btn--sm nv-btn--ghost', href: base + '/images/' + encodeURIComponent(siteId) + '/download?path=' + encodeURIComponent(f.path), download: f.name, 'aria-label': f.name + ' 내려받기' }, [icon('nv-i-download')]);
      var view = el('a', { className: 'im-tile__view', href: f.url, target: '_blank', rel: 'noopener', 'aria-label': f.name + ' 새 창에서 보기' }, [thumb]);
      return el('li', {}, [el('div', { className: 'im-tile im-tile--file' }, [check, view, name, meta,
        el('span', { className: 'im-tile__url', text: readableUrl(f.url) }), el('span', { className: 'im-tile__actions' }, [copy, uses, dl])])]);
    }

    grid.addEventListener('click', function (e) {
      var folder = folderIn(grid, e);
      if (folder) { open(folder.getAttribute('data-folder')); return; }
      var copy = e.target.closest('[data-copy]');
      if (copy) { copyText(copy.getAttribute('data-copy')); return; }
      var uses = e.target.closest('[data-usage]');
      if (uses) { showUsage(uses.getAttribute('data-usage')); return; }
      var pick = mode === 'pick' && e.target.closest('.im-tile[data-path]');
      if (pick) select(pick.getAttribute('data-path'));
    });

    grid.addEventListener('change', function (e) {
      if (e.target.classList.contains('im-tile__check')) updateDelete();
    });

    function select(path) {
      picked = files.filter(function (f) { return f.path === path; })[0] || null;
      grid.querySelectorAll('.im-tile[data-path]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-path') === path ? 'true' : 'false');
      });
      if (opts.onSelect) opts.onSelect(picked);
    }

    function checkedPaths() {
      return Array.prototype.map.call(grid.querySelectorAll('.im-tile__check:checked'), function (c) { return c.getAttribute('data-path'); });
    }

    function updateDelete() {
      if (!deleteBtn) return;
      var n = checkedPaths().length;
      deleteBtn.disabled = !canWrite || n === 0;
      deleteBtn.lastChild.textContent = n ? '선택 삭제 (' + n + ')' : '선택 삭제';
    }

    function copyText(text) {
      var done = function () { say('주소를 복사했습니다: ' + text, 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { say('복사하지 못했습니다. 주소: ' + text, 'error'); });
      } else {
        say('주소: ' + text);
      }
    }

    // ── 사용처(콘텐츠 · 팝업 · 게시글 본문, docs/images.md §3) ──────────
    function fetchUsage(paths) {
      var query = paths.map(function (p) { return 'paths=' + encodeURIComponent(p); }).join('&');
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/usage?' + query, { credentials: 'same-origin' }).then(readJson);
    }

    function usageLine(ref) {
      return ref.kind + ' 「' + ref.title + '」' + (ref.status ? '(' + ref.status + ')' : '');
    }

    function showUsage(path) {
      say('쓰는 곳을 찾는 중…');
      fetchUsage([path]).then(function (report) {
        var refs = (report.usage && report.usage[path]) || [];
        status.textContent = '';
        status.className = 'im-status' + (report.complete ? '' : ' im-status--error');
        status.appendChild(document.createTextNode(path.substring(path.lastIndexOf('/') + 1) + ' — '
          + (refs.length ? '쓰는 곳 ' + refs.length + '곳: ' : '쓰는 곳 없음') + (report.complete ? '' : ' (' + report.message + ')')));
        refs.forEach(function (ref, i) {
          if (i > 0) status.appendChild(document.createTextNode(' · '));
          status.appendChild(el('a', { href: ref.href, text: usageLine(ref) }));
        });
      }).catch(function (err) { say('쓰는 곳을 찾지 못했습니다: ' + err.message, 'error'); });
    }

    // ── 올리기 ───────────────────────────────────────────────────────
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      upload(Array.prototype.slice.call(fileInput.files || []));
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.remove('is-dragover'); });
    });
    drop.addEventListener('drop', function (e) {
      upload(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []));
    });
    drop.addEventListener('click', function () { if (canWrite) fileInput.click(); });

    function upload(list, overwrite) {
      if (!canWrite || !list.length) return Promise.resolve();
      var bad = [];
      var ok = list.filter(function (f) {
        if (EXTENSIONS.indexOf(extensionOf(f.name)) < 0) { bad.push(f.name + '(형식)'); return false; }
        if (f.size > MAX_BYTES) { bad.push(f.name + '(25MB 초과)'); return false; }
        return true;
      });
      if (!ok.length) { say('올릴 수 없는 파일: ' + bad.join(', '), 'error'); return Promise.resolve(); }
      var fd = new FormData();
      fd.append('folder', current);
      fd.append('overwrite', overwrite ? 'true' : 'false');
      ok.forEach(function (f) { fd.append('files', f, f.name); });
      say('올리는 중… (' + ok.length + '개)');
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/upload', {
        method: 'POST', body: fd, credentials: 'same-origin', headers: csrfHeaders()
      }).then(readJson).then(function (report) {
        var results = report.results || [];
        var exists = results.filter(function (r) { return r.result === 'EXISTS'; });
        var errors = results.filter(function (r) { return r.result === 'ERROR'; });
        var saved = results.filter(function (r) { return r.result === 'NEW' || r.result === 'OVERWRITE' || r.result === 'UNCHANGED'; });
        var afterSave = Promise.resolve();
        if (exists.length && window.confirm('같은 이름의 그림이 이미 있습니다: ' + exists.map(function (r) { return r.fileName; }).join(', ')
            + '\n덮어쓸까요? (이전 파일은 서버에 한 세대 보관됩니다)')) {
          var names = exists.map(function (r) { return r.fileName; });
          afterSave = upload(ok.filter(function (f) { return names.indexOf(storedName(f.name)) >= 0; }), true);
        }
        delete virtualFolders[current];
        var lines = [];
        if (saved.length) lines.push('올렸습니다 ' + saved.length + '개');
        if (exists.length) lines.push('같은 이름 ' + exists.length + '개');
        errors.forEach(function (r) { lines.push(r.fileName + ': ' + r.message); });
        bad.forEach(function (b) { lines.push('건너뜀 ' + b); });
        return afterSave.then(function () {
          return loadTree().then(function () { return open(current); }).then(function () {
            say(lines.join(' · '), errors.length || bad.length ? 'error' : 'ok');
            if (mode === 'pick' && saved.length) select(saved[saved.length - 1].path);
            if (opts.onUploaded) opts.onUploaded(saved);
          });
        });
      }).catch(function (err) { say('올리지 못했습니다: ' + err.message, 'error'); });
    }

    // ── 새 폴더 · 삭제 ───────────────────────────────────────────────
    newFolderBtn.addEventListener('click', function () {
      var name = window.prompt('새 폴더 이름 (영문 · 숫자 · _ - 권장, 예: popup)\n폴더는 첫 그림을 올릴 때 서버에 만들어집니다.', '');
      if (name === null) return;
      name = name.trim();
      if (!SEGMENT.test(name) || name.length > 120) { say('폴더 이름은 글자 · 숫자 · . _ - 만 쓰고 . 으로 시작할 수 없습니다.', 'error'); return; }
      var path = current + '/' + name;
      virtualFolders[path] = true;
      open(path);
    });

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        var paths = checkedPaths();
        if (!paths.length) return;
        say('지우기 전에 쓰는 곳을 확인하는 중…');
        fetchUsage(paths).then(function (report) { return report; }, function () { return null; }).then(function (report) {
          var lines = [];
          if (report && report.usage) {
            paths.forEach(function (p) {
              var refs = report.usage[p] || [];
              if (refs.length) {
                lines.push('· ' + p.substring(p.lastIndexOf('/') + 1) + ': ' + refs.slice(0, 5).map(usageLine).join(', ')
                  + (refs.length > 5 ? ' 외 ' + (refs.length - 5) : ''));
              }
            });
          }
          var head = '그림 ' + paths.length + '개를 지웁니다(이전 파일 하나는 서버에 보관).';
          var warn = lines.length ? '\n\n이 그림을 쓰는 곳이 있습니다 — 지우면 그 화면에서 그림이 깨집니다.\n' + lines.join('\n')
            : (report && report.complete ? '\n\n쓰는 곳은 없습니다.' : '\n\n쓰는 곳을 다 확인하지 못했습니다' + (report && report.message ? '(' + report.message + ')' : '') + '.');
          say('');
          if (!window.confirm(head + warn + '\n\n계속할까요?')) return;
          removePaths(paths);
        });
      });

      function removePaths(paths) {
        var fd = new FormData();
        paths.forEach(function (p) { fd.append('paths', p); });
        fetch(base + '/images/' + encodeURIComponent(siteId) + '/delete', {
          method: 'POST', body: fd, credentials: 'same-origin', headers: csrfHeaders()
        }).then(readJson).then(function (report) {
          return loadTree().then(function () { return open(current); }).then(function () {
            var failed = report.failed || [];
            say('지웠습니다 ' + (report.deleted || []).length + '개' + (failed.length ? ' · 실패: ' + failed.join(', ') : ''), failed.length ? 'error' : 'ok');
          });
        }).catch(function (err) { say('지우지 못했습니다: ' + err.message, 'error'); });
      }
    }

    var ready = loadTree().then(function () { return open(current); })
      .catch(function (err) { say('이미지 폴더를 읽지 못했습니다: ' + err.message, 'error'); });

    return {
      ready: ready,
      reload: function () { return loadTree().then(function () { return open(current); }); },
      open: open,
      upload: function (list) { return upload(Array.prototype.slice.call(list || [])); },
      folder: function () { return current; },
      selected: function () { return picked; }
    };
  }

  /*
   * 「이미지 삽입」 창(퍼블리싱 2단계 .imgmodal): 위 줄(삽입할 그림 · 새 폴더 · 그림 올리기) → 폴더 고르기 + 파일 이름으로 찾기 →
   * 그림 수 · 최근 올린 순 → 썸네일 격자(라디오 — 화살표로 옮긴다). 격자에 끌어 놓아도 올라간다. 「전체 폴더」는 그림이 있는 폴더를 모두 읽는다.
   */
  var pickSeq = 0;
  function mountPick(root, opts) {
    var base = opts.base;
    var siteId = opts.siteId;
    var canWrite = opts.canWrite !== false;
    var start = opts.folder || '';
    var current = start;
    var ALL = '*';
    var tree = [];
    var virtualFolders = {};
    var files = [];
    var picked = null;
    var siteFolder = null;
    var rid = (root.id || 'im') + '-p' + (++pickSeq);
    var openSeq = 0;

    root.textContent = '';
    root.classList.add('im-explorer', 'im-pick');
    root.setAttribute('data-mode', 'pick');
    var notice = el('p', { className: 'im-notice', hidden: true });
    var newFolderBtn = el('button', { type: 'button', className: 'imgmodal__up', 'data-im-newfolder': true, hidden: !canWrite,
      title: '지금 폴더 아래에 새 폴더를 만듭니다(첫 그림을 올릴 때 서버에 생깁니다)' }, [icon('nv-i-plus'), el('span', { text: '새 폴더' })]);
    var uploadBtn = el('button', { type: 'button', className: 'imgmodal__up', 'data-im-upload': true, hidden: !canWrite,
      title: 'png · jpg · gif · webp · svg, 25MB 까지. 지금 폴더로 올리고 바로 고릅니다' }, [icon('nv-i-upload'), el('span', { text: '그림 올리기' })]);
    var labelRow = el('div', { className: 'imgmodal__label' }, [el('span', { id: rid + '-label', text: '삽입할 그림' }),
      el('span', { className: 'imgmodal__tools' }, [newFolderBtn, uploadBtn])]);
    var folderSel = el('select', { className: 'nv-select', id: rid + '-folder', 'data-im-folder': true });
    var search = el('input', { type: 'search', className: 'nv-input', id: rid + '-q', placeholder: '파일 이름으로 찾기', autocomplete: 'off', 'data-im-q': true });
    var bar = el('div', { className: 'imgbar', role: 'search' }, [
      el('label', { className: 'nv-sr-only', for: rid + '-folder', text: '폴더' }), folderSel,
      el('div', { className: 'nv-input-wrap' }, [el('label', { className: 'nv-sr-only', for: rid + '-q', text: '파일 이름으로 찾기' }), search,
        el('span', { className: 'nv-input-wrap__btn', 'aria-hidden': 'true' }, [icon('nv-i-search')])])
    ]);
    var count = el('p', { className: 'imgcount' });
    var status = el('p', { className: 'im-status', role: 'status', 'aria-live': 'polite' });
    var grid = el('div', { className: 'imggrid', role: 'radiogroup', 'aria-labelledby': rid + '-label' });
    var fileInput = el('input', { type: 'file', accept: EXTENSIONS.map(function (e) { return '.' + e; }).join(','),
      className: 'im-file-input', id: rid + '-file', tabindex: '-1', 'aria-hidden': 'true' });
    [notice, labelRow, bar, count, status, grid, fileInput].forEach(function (n) { root.appendChild(n); });

    function say(text, kind) {
      status.textContent = text || '';
      status.className = 'im-status' + (kind ? ' im-status--' + kind : '');
    }
    function loadTree() {
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/tree', { credentials: 'same-origin' })
        .then(readJson)
        .then(function (body) {
          tree = body.folders || [];
          siteFolder = body.siteFolder;
          notice.hidden = !body.message;
          notice.textContent = body.message || '';
          if (!start || !allowed(start)) start = siteFolder || 'common';
          if (current !== ALL && (!current || !allowed(current))) current = start;
          renderFolders();
        });
    }
    function allowed(path) {
      var top = path.split('/')[0];
      return top === 'common' || (siteFolder && top === siteFolder);
    }
    function allFolders() {
      var map = {};
      tree.forEach(function (f) { map[f.path] = f; });
      [start].concat(Object.keys(virtualFolders)).forEach(function (path) {
        if (path && !map[path]) map[path] = { path: path, fileCount: 0, depth: path.split('/').length - 1 };
      });
      return Object.keys(map).sort().map(function (k) { return map[k]; });
    }
    function renderFolders() {
      folderSel.textContent = '';
      allFolders().forEach(function (f) {
        var text = (f.path === start ? '이 메뉴 폴더 (' + f.path + ')' : '/' + f.path) + (f.fileCount ? ' · ' + f.fileCount : '');
        folderSel.appendChild(el('option', { value: f.path, text: text, selected: f.path === current }));
      });
      folderSel.appendChild(el('option', { value: ALL, text: '전체 폴더', selected: current === ALL }));
    }
    folderSel.addEventListener('change', function () { open(folderSel.value); });

    function listOf(path) {
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/list?folder=' + encodeURIComponent(path), { credentials: 'same-origin' })
        .then(readJson).then(function (body) { return body.files || []; });
    }
    function open(path) {
      current = path;
      picked = null;
      if (path !== ALL && tree.length && !tree.some(function (f) { return f.path === path; })) virtualFolders[path] = true;
      if (opts.onSelect) opts.onSelect(null);
      if (opts.onFolder) opts.onFolder(path);
      renderFolders();
      say('불러오는 중…');
      // 늦게 온 앞 폴더 응답이 방금 고른 폴더 목록을 덮지 않게, 마지막으로 연 폴더의 응답만 반영한다
      var mine = ++openSeq;
      var load = path === ALL
        ? Promise.all(tree.filter(function (f) { return f.fileCount; }).map(function (f) { return listOf(f.path); }))
          .then(function (lists) { return [].concat.apply([], lists); })
        : listOf(path);
      return load.then(function (found) {
        if (mine !== openSeq) return;
        files = found.slice().sort(function (a, b) { return String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')); });
        renderGrid();
        say('');
      }).catch(function (err) {
        if (mine !== openSeq) return;
        files = [];
        renderGrid();
        say('폴더를 읽지 못했습니다: ' + err.message, 'error');
      });
    }
    function shown() {
      var q = search.value.trim().toLowerCase();
      return files.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) >= 0; });
    }
    function renderGrid() {
      var list = shown();
      count.textContent = '';
      count.appendChild(document.createTextNode('그림 '));
      count.appendChild(el('b', { text: String(list.length) }));
      count.appendChild(document.createTextNode('개 · 최근 올린 순'));
      grid.textContent = '';
      if (!list.length) {
        var q = search.value.trim();
        grid.appendChild(el('p', { className: 'imgempty' }, [
          el('b', { text: q ? '「' + q + '」이 든 그림이 없습니다' : '이 폴더에 그림이 없습니다' }),
          el('span', { text: canWrite ? '[그림 올리기]를 누르거나 여기에 끌어 놓으면 이 폴더로 올라갑니다.' : '다른 폴더를 고르세요.' })
        ]));
        return;
      }
      list.forEach(function (f) {
        var img = el('img', { src: f.url, alt: '', loading: 'lazy' });
        var size = el('span', { className: 'imgitem__size', text: f.sizeLabel || '' });
        img.addEventListener('load', function () {
          if (img.naturalWidth) size.textContent = img.naturalWidth + '×' + img.naturalHeight + (f.sizeLabel ? ' · ' + f.sizeLabel : '');
        });
        var radio = el('input', { type: 'radio', name: rid + '-pick', value: f.path, checked: !!(picked && picked.path === f.path) });
        grid.appendChild(el('label', { className: 'imgitem', title: f.path }, [radio, el('span', { className: 'imgitem__thumb' }, [img]),
          el('span', { className: 'imgitem__name', text: f.name }), size]));
      });
    }
    var filterTimer = null;
    search.addEventListener('input', function () { window.clearTimeout(filterTimer); filterTimer = window.setTimeout(renderGrid, 120); });
    search.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    grid.addEventListener('change', function (e) { if (e.target.type === 'radio') select(e.target.value); });
    function select(path) {
      picked = files.filter(function (f) { return f.path === path; })[0] || null;
      grid.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = r.value === path; });
      if (opts.onSelect) opts.onSelect(picked);
    }

    function target() { return current === ALL ? start : current; }
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      upload(Array.prototype.slice.call(fileInput.files || []));
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      grid.addEventListener(type, function (e) { if (canWrite) { e.preventDefault(); grid.classList.add('is-dragover'); } });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      grid.addEventListener(type, function (e) { e.preventDefault(); grid.classList.remove('is-dragover'); });
    });
    grid.addEventListener('drop', function (e) { upload(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || [])); });

    function upload(list, overwrite) {
      if (!canWrite || !list.length) return Promise.resolve();
      var folder = target();
      var bad = [];
      var ok = list.filter(function (f) {
        if (EXTENSIONS.indexOf(extensionOf(f.name)) < 0) { bad.push(f.name + '(형식)'); return false; }
        if (f.size > MAX_BYTES) { bad.push(f.name + '(25MB 초과)'); return false; }
        return true;
      });
      if (!ok.length) { say('올릴 수 없는 파일: ' + bad.join(', '), 'error'); return Promise.resolve(); }
      var fd = new FormData();
      fd.append('folder', folder);
      fd.append('overwrite', overwrite ? 'true' : 'false');
      ok.forEach(function (f) { fd.append('files', f, f.name); });
      say('올리는 중… (' + ok.length + '개)');
      return fetch(base + '/images/' + encodeURIComponent(siteId) + '/upload', {
        method: 'POST', body: fd, credentials: 'same-origin', headers: csrfHeaders()
      }).then(readJson).then(function (report) {
        var results = report.results || [];
        var exists = results.filter(function (r) { return r.result === 'EXISTS'; });
        var errors = results.filter(function (r) { return r.result === 'ERROR'; });
        var saved = results.filter(function (r) { return r.result === 'NEW' || r.result === 'OVERWRITE' || r.result === 'UNCHANGED'; });
        var afterSave = Promise.resolve();
        if (exists.length && window.confirm('같은 이름의 그림이 이미 있습니다: ' + exists.map(function (r) { return r.fileName; }).join(', ')
            + '\n덮어쓸까요? (이전 파일은 서버에 한 세대 보관됩니다)')) {
          var names = exists.map(function (r) { return r.fileName; });
          afterSave = upload(ok.filter(function (f) { return names.indexOf(storedName(f.name)) >= 0; }), true);
        }
        delete virtualFolders[folder];
        var lines = [];
        if (saved.length) lines.push('올렸습니다 ' + saved.length + '개');
        if (exists.length) lines.push('같은 이름 ' + exists.length + '개');
        errors.forEach(function (r) { lines.push(r.fileName + ': ' + r.message); });
        bad.forEach(function (b) { lines.push('건너뜀 ' + b); });
        return afterSave.then(function () {
          search.value = '';
          return loadTree().then(function () { return open(folder); }).then(function () {
            say(lines.join(' · '), errors.length || bad.length ? 'error' : 'ok');
            if (saved.length) select(saved[saved.length - 1].path);
            if (opts.onUploaded) opts.onUploaded(saved);
          });
        });
      }).catch(function (err) { say('올리지 못했습니다: ' + err.message, 'error'); });
    }

    newFolderBtn.addEventListener('click', function () {
      var name = window.prompt('새 폴더 이름 (영문 · 숫자 · _ - 권장, 예: popup)\n폴더는 첫 그림을 올릴 때 서버에 만들어집니다.', '');
      if (name === null) return;
      name = name.trim();
      if (!SEGMENT.test(name) || name.length > 120) { say('폴더 이름은 글자 · 숫자 · . _ - 만 쓰고 . 으로 시작할 수 없습니다.', 'error'); return; }
      var path = target() + '/' + name;
      virtualFolders[path] = true;
      open(path);
    });

    var ready = loadTree().then(function () { return open(current); })
      .catch(function (err) { say('이미지 폴더를 읽지 못했습니다: ' + err.message, 'error'); });

    return {
      ready: ready,
      reload: function () { return loadTree().then(function () { return open(current); }); },
      open: function (path) { search.value = ''; return open(path); },
      upload: function (list) { return upload(Array.prototype.slice.call(list || [])); },
      folder: function () { return current; },
      selected: function () { return picked; }
    };
  }

  window.cmsImageExplorer = { mount: mount, readableUrl: readableUrl };
})();
