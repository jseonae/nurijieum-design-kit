/**
 * TRACK 7 — 본문 에디터 라이브 미리보기 (vanilla, no framework)
 *
 * 요구사항:
 *  - 페이지 내 `.cms-admin-editor` 마다 독립 인스턴스 생성
 *  - 형식(HTML/MARKDOWN/TEXT)에 따라 샌드박스 iframe 미리보기
 *  - 디바운스 250ms + AbortController로 중복 fetch 취소
 *  - 뷰 토글(편집/분할/미리보기) — data-view 속성 + aria-pressed 관리
 *  - "이미지 삽입" 버튼 · 붙여넣기/끌어 놓기한 그림 파일은 content-image-picker.js 창에 위임,
 *    삽입 후 미리보기 갱신을 위해 textarea 'input' 이벤트 감지 +
 *    피커 버튼 클릭 시 단기 지연 후 추가 갱신 예약
 *  - .cms-admin-editor__live — aria-live 영역에 갱신 알림 후 1초 뒤 초기화
 *
 * 보안:
 *  - HTML/MARKDOWN/TEXT 모두 sandboxed iframe srcdoc 으로만 렌더
 *  - innerHTML 에 사용자 입력 직접 주입 금지
 */
(function () {
  'use strict';

  // ── 유틸: HTML 이스케이프 ─────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 샌드박스 iframe srcdoc 빌더 ──────────────────────────────────────
  // 콘솔 안 미리보기 전용 글꼴 · 본문 규칙(공개 화면 출력과 무관). 글꼴과 색은 콘솔 토큰 파일에서 가져온다 — iframe 은 바깥 글꼴을 물려받지 않는다.
  // 토큰은 [data-theme] 아래에 있으므로 화면의 테마 · 고대비 표시를 iframe 문서에도 옮긴다.
  function previewHead() {
    var tokens = document.querySelector('link[href*="nuri-tokens.css"]');
    var themed = document.querySelector('[data-theme]');
    var mode = document.querySelector('[data-krds-mode]');
    return '<html' + (themed ? ' data-theme="' + escapeHtml(themed.getAttribute('data-theme')) + '"' : '')
      + (mode ? ' data-krds-mode="' + escapeHtml(mode.getAttribute('data-krds-mode')) + '"' : '') + '>'
      + (tokens ? '<link rel="stylesheet" href="' + escapeHtml(tokens.href) + '">' : '');
  }

  // flush: 칸이 여백을 가진 편집기(data-wysiwyg-bar)는 iframe 안 여백을 두지 않는다.
  function buildSrcdoc(innerHtml, flush) {
    return '<!doctype html>' + previewHead() + '<meta charset="utf-8">'
      + '<style>body{margin:' + (flush ? '0' : '8px') + ';font-family:var(--cms-font,sans-serif);font-size:14px;line-height:1.7;color:var(--cms-text-strong,#222);overflow-wrap:anywhere}'
      + 'body *{line-height:1.5}h2{font-size:20px;margin:0 0 10px}h3{font-size:17px;margin:18px 0 8px}p{margin:0 0 10px}ul,ol{margin:0 0 10px;padding-left:20px}'
      + 'img{max-width:100%;height:auto}pre{white-space:pre-wrap;word-break:break-all}'
      + 'figure{margin:1em 0}figcaption{font-size:.9em;color:#555}table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:13px}'
      + 'th,td{border:1px solid var(--cms-border,#ccc);padding:6px 8px;text-align:left}'
      + 'caption,.sr-only,.blind{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}'
      + '.__se__float-left{float:left;margin:0 1em .5em 0}.__se__float-right{float:right;margin:0 0 .5em 1em}.__se__float-center{text-align:center}'
      + '.__se__float-center figure{display:inline-block}blockquote{margin:1em 0;padding-left:1em;border-left:3px solid #ccc;color:#555}</style>'
      + innerHtml;
  }

  // ── 에디터 인스턴스 초기화 ───────────────────────────────────────────
  function initEditor(root) {
    // 이미 바인딩된 에디터는 건너뛴다(인라인 상세 주입·details 재오픈 시 중복 방지).
    if (root.__cmsEditorBound) return;
    root.__cmsEditorBound = true;
    var previewUrl   = root.getAttribute('data-preview-url') || '';
    var textarea     = root.querySelector('.cms-admin-editor__textarea');
    var formatSelect = root.querySelector('.cms-admin-editor__format');
    var liveRegion   = root.querySelector('.cms-admin-editor__live');
    var previewWrap  = root.querySelector('.cms-admin-editor__preview');
    var viewToggleBtns = root.querySelectorAll('[data-view-set]');
    var mediaPickerBtn = root.querySelector('[data-media-picker]');

    // 필수 요소 없으면 조용히 종료
    if (!textarea || !previewWrap) return;

    var iframe = null;          // 샌드박스 iframe (최초 렌더 시 생성)
    var flushPreview = root.hasAttribute('data-wysiwyg-bar');
    var debounceTimer = null;   // 디바운스 타이머 ID
    var abortCtrl = null;       // 진행 중인 fetch AbortController

    // ── iframe 확보 ───────────────────────────────────────────────────
    function ensureIframe() {
      if (iframe) return iframe;
      iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-same-origin');
      iframe.setAttribute('title', '본문 미리보기');
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
      previewWrap.appendChild(iframe);
      return iframe;
    }

    // ── iframe srcdoc 갱신 ────────────────────────────────────────────
    function setIframeSrcdoc(srcdoc) {
      var fr = ensureIframe();
      fr.srcdoc = srcdoc;
    }

    // ── aria-live 알림 ────────────────────────────────────────────────
    function notifyLive() {
      if (!liveRegion) return;
      liveRegion.classList.add('nv-sr-only');   // 화면낭독용 알림 — 눈에 보이는 안내(그림 파일 등)만 글자로 남는다
      liveRegion.textContent = '미리보기 갱신됨';
      setTimeout(function () {
        if (liveRegion) liveRegion.textContent = '';
      }, 1000);
    }

    // ── 미리보기 오류 메시지 표시 ─────────────────────────────────────
    function showPreviewError() {
      setIframeSrcdoc(buildSrcdoc('<p style="color:#c00;font-size:13px;">미리보기를 불러올 수 없습니다.</p>', flushPreview));
    }

    // ── 실제 렌더 ─────────────────────────────────────────────────────
    function render() {
      var format = formatSelect ? formatSelect.value : 'HTML';
      var value  = textarea.value || '';

      if (format === 'HTML' || format === 'HTML_RAW') {
        // 사용자 HTML(또는 퍼블리싱 원문 HTML_RAW) → sandboxed iframe srcdoc
        setIframeSrcdoc(buildSrcdoc(value, flushPreview));
        notifyLive();

      } else if (format === 'TEXT') {
        // 일반 텍스트 → <pre> 안에 이스케이프 후 iframe
        setIframeSrcdoc(buildSrcdoc('<pre>' + escapeHtml(value) + '</pre>', flushPreview));
        notifyLive();

      } else if (format === 'MARKDOWN') {
        // MARKDOWN → 서버 사이드 렌더 (POST → HTML 반환)
        if (!previewUrl) {
          showPreviewError();
          return;
        }

        // 진행 중인 fetch 취소
        if (abortCtrl) {
          try { abortCtrl.abort(); } catch (e) { /* noop */ }
        }

        // AbortController 지원 여부 확인
        if (typeof AbortController !== 'undefined') {
          abortCtrl = new AbortController();
        } else {
          abortCtrl = null;
        }

        var fetchOptions = {
          method: 'POST',
          credentials: 'same-origin',
          headers: (window.cmsCsrf ? window.cmsCsrf.headers : function (h) { return h; })({
            'Content-Type': 'application/json',
            'Accept': 'text/html, application/json'
          }),
          body: JSON.stringify({ bodyFormat: 'MARKDOWN', body: value })
        };
        if (abortCtrl) {
          fetchOptions.signal = abortCtrl.signal;
        }

        fetch(previewUrl, fetchOptions)
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var contentType = res.headers.get('Content-Type') || '';
            if (contentType.indexOf('application/json') !== -1) {
              return res.json().then(function (data) {
                return data.html || data.content || '';
              });
            }
            return res.text();
          })
          .then(function (html) {
            setIframeSrcdoc(buildSrcdoc(html, flushPreview));
            notifyLive();
          })
          .catch(function (err) {
            // AbortError 는 정상 취소 — 오류 표시 안 함
            if (err && err.name === 'AbortError') return;
            showPreviewError();
          });
      }
    }

    // ── 디바운스 래퍼 ─────────────────────────────────────────────────
    function scheduleRender() {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(function () {
        debounceTimer = null;
        render();
      }, 250);
    }

    // ── textarea 입력 / 형식 변경 이벤트 ─────────────────────────────
    textarea.addEventListener('input', scheduleRender);
    if (formatSelect) {
      formatSelect.addEventListener('change', scheduleRender);
    }

    // ── 미디어 피커 버튼 클릭 후 단기 지연 갱신 ─────────────────────
    // content-media-picker.js 가 textarea 에 직접 값을 주입한 뒤
    // 'input' 이벤트를 dispatch 하지 않는 경우를 대비한 안전장치.
    // 피커 모달이 닫히고 textarea 로 포커스가 복원될 때도 갱신.
    if (mediaPickerBtn) {
      mediaPickerBtn.addEventListener('click', function () {
        // 피커 사용이 완료될 충분한 여유(약 800ms) 뒤 추가 갱신 예약
        setTimeout(function () {
          scheduleRender();
        }, 800);
      });
    }

    // textarea focus 시 값이 변경되었을 수 있으므로 갱신 예약
    // (피커가 닫히면 focus 가 textarea 로 돌아옴)
    textarea.addEventListener('focus', function () {
      scheduleRender();
    });

    // ── 글상자(HTML_RAW · MARKDOWN 등 위지윅이 아닌 형식)에 붙여넣기 · 끌어 놓기한 그림 파일 ──
    // 위지윅은 onImageUploadBefore 가 받는다. 글상자도 같은 「이미지 삽입」 창에 넘긴다 — 이 콘텐츠의 이미지 폴더로 올리고
    // 대체 텍스트를 받은 뒤 커서 자리에 <img src alt> / ![alt](url) 로 넣는다. 그림 파일이 아니면 브라우저 기본 동작 그대로.
    function imageFilesOf(transfer) {
      if (!transfer) return [];
      var files = Array.prototype.slice.call(transfer.files || []);
      if (!files.length && transfer.items) {
        files = Array.prototype.map.call(transfer.items, function (item) {
          return item.kind === 'file' ? item.getAsFile() : null;
        });
      }
      return files.filter(function (f) { return f && /^image\//.test(f.type); });
    }

    function handOverImages(e, transfer) {
      var files = imageFilesOf(transfer);
      if (!files.length) return;
      e.preventDefault();   // 끌어 놓은 그림을 브라우저가 열어 화면을 떠나지 않게
      if (textarea.readOnly || textarea.disabled) return;
      var handed = window.cmsImagePicker && window.cmsImagePicker.openWithFiles(textarea, files);
      if (!handed && liveRegion) {
        liveRegion.classList.remove('nv-sr-only');
        liveRegion.textContent = formatSelect && formatSelect.value === 'TEXT'
          ? 'TEXT 형식에는 그림을 넣을 수 없습니다.'
          : '그림 파일은 [이미지 삽입]으로 올려 주세요(images 폴더).';
      }
    }

    textarea.addEventListener('paste', function (e) { handOverImages(e, e.clipboardData); });
    textarea.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) e.preventDefault();
    });
    textarea.addEventListener('drop', function (e) { handOverImages(e, e.dataTransfer); });

    // ── 뷰 토글 ───────────────────────────────────────────────────────
    function setView(viewName) {
      root.setAttribute('data-view', viewName);
      for (var i = 0; i < viewToggleBtns.length; i++) {
        var btn = viewToggleBtns[i];
        var pressed = btn.getAttribute('data-view-set') === viewName;
        btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      }
    }

    for (var i = 0; i < viewToggleBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var viewName = btn.getAttribute('data-view-set');
          if (viewName) setView(viewName);
        });
      }(viewToggleBtns[i]));
    }

    // ── 위지윅(SunEditor) — data-wysiwyg 편집기의 HTML 초안만 ────────
    if (root.hasAttribute('data-wysiwyg')) {
      bindWysiwyg(root, textarea, formatSelect, scheduleRender);
    }

    // ── 초기 미리보기 렌더 ────────────────────────────────────────────
    scheduleRender();
  }

  // 편집 영역에 들어갈 수 있는 것. 목록은 허용 방식이다 — 스크립트 · 틀 · 폼과 on* 속성은 어떤 경우에도 편집 영역에 넣지 않는다.
  var EDITOR_TAGS = 'a|abbr|address|article|aside|audio|b|bdi|bdo|blockquote|br|caption|cite|code|col|colgroup|dd|del|details|dfn|div|dl|dt|em|figcaption|figure|footer'
      + '|h1|h2|h3|h4|h5|h6|header|hgroup|hr|i|img|ins|kbd|li|main|mark|nav|ol|p|picture|pre|q|rp|rt|ruby|s|samp|section|small|source|span|strong|sub|summary|sup'
      + '|table|tbody|td|tfoot|th|thead|time|tr|track|u|ul|var|video|wbr|svg|path|g|circle|rect|line|polyline|polygon|use|defs';
  var EDITOR_ATTRS = 'class|style|id|title|role|lang|dir|scope|colspan|rowspan|headers|target|rel|type|name|width|height|align|valign|loading|tabindex|hidden|download|cite|datetime|summary|open'
      + '|controls|poster|preload|srcset|sizes|media|viewBox|d|fill|stroke|stroke-width|xmlns|cx|cy|r|x|y|x1|y1|x2|y2|points|transform|aria-[a-z-]+|data-[a-z0-9-]+';
  var EDITOR_FILTER = {
    strictMode: { tagFilter: true, formatFilter: false, classFilter: false, textStyleTagFilter: false, attrFilter: true, styleFilter: false },
    elementWhitelist: EDITOR_TAGS,
    elementBlacklist: 'script|style|iframe|object|embed|applet|base|meta|link|form|input|button|select|textarea',
    attributeWhitelist: { '*': EDITOR_ATTRS }
  };
  var EDITOR_ELEMENTS = new RegExp('^(?:' + EDITOR_TAGS + ')$', 'i');
  var EDITOR_ATTRIBUTES = new RegExp('^(?:' + EDITOR_ATTRS + '|href|src|alt)$', 'i');
  var SCRIPT_URL = /^\s*(?:javascript|vbscript|data:text\/html)/i;

  /*
   * 위지윅 편집(docs/images.md §편집기): 형식이 HTML · HTML_RAW 이고 textarea 가 편집 가능할 때 SunEditor 를 띄운다. MARKDOWN · TEXT 는 textarea 그대로.
   *  - 퍼블리싱 마크업(class · 구조 · 표 설정)은 EDITOR_FILTER 로 그대로 둔다. 그래도 지워지는 본문(스크립트 · 틀 · 폼 등)은 편집 영역에 넣지 않고
   *    HTML 소스 보기로 연다 — 콘솔에서 본문 스크립트가 돌지 않고, 고치지 않으면 원문 그대로 저장된다. 편집 화면으로 바꾸려 하면 먼저 묻는다.
   *  - 원본은 언제나 textarea — 변경 · 코드 보기 전환 · 폼 제출 때 동기화하고 'input' 을 쏴 미리보기를 갱신한다.
   *    편집기는 불러온 HTML 을 제 모양으로 다듬으므로, 손대지 않았으면(처음 다듬은 모양 그대로) 원래 글을 돌려놓는다 —
   *    고친 것 없이 저장해도 본문이 바뀐 것으로 보이지 않게(새 초안이 생기지 않게).
   *  - 툴바는 구조 서식만(KRDS — 글꼴 · 크기 · 색은 테마가 정한다). 그림은 「이미지 삽입」 창(images 폴더)으로만 넣는다 —
   *    붙여넣기 · 끌어 놓기로 들어온 그림 파일도 base64 로 박지 않고 그 창에서 폴더로 올린 뒤 대체 텍스트를 받아 넣는다.
   *    image 플러그인은 넣은 그림의 크기 · 정렬 · 대체 텍스트 편집용.
   *  - textarea.__cmsWysiwyg = { insertHtml(html) } 를 두어 content-media-picker.js 가 커서 위치에 넣게 한다.
   *  - [data-wysiwyg-bar] 편집기(콘텐츠 수정 · 소스 수정): 도구 · 이미지 삽입 · 소스 · 보기 전환이 편집 칸에 붙은 한 줄이다. SunEditor 도구 모음을 칸 밖 도구 줄에
   *    두고(분할은 두 칸 위로, 미리보기에서도 보이게) 그 안으로 이미지 삽입 · 보기 전환 단추를 옮긴다. 단추의 동작은 그대로다.
   */
  function bindWysiwyg(root, textarea, formatSelect, onSynced) {
    var editor = null;
    var holder = null;
    var original = null;
    var pristine = null;
    var codeBase = null;   // 소스 보기를 연 때의 글 — 그대로면 본문이 바뀌지 않은 것
    var codeOrigin = null; // 그때의 본문
    var toggleScrollY = null; // 소스 보기를 전환하기 직전 페이지 위치
    var bar = root.hasAttribute('data-wysiwyg-bar') ? root.querySelector('.cms-admin-editor__toolbar') : null;
    var barTools = null;   // 도구 줄 안 SunEditor 도구 모음 자리
    var barMoved = null;   // 도구 모음으로 옮긴 단추 → 떼어 낼 때 돌려놓을 자리

    function wanted() {
      var format = formatSelect ? formatSelect.value : 'HTML';
      return (format === 'HTML' || format === 'HTML_RAW') && !textarea.readOnly && !textarea.disabled;
    }

    function codeArea() {
      return holder && holder.parentNode ? holder.parentNode.querySelector('.se-code-viewer') : null;
    }

    function inCodeView() {
      return !!(editor && editor.$.frameContext.get('isCodeView'));
    }

    // 소스 보기로 연 뒤 이 글을 기준으로 삼는다. 글이 그대로면 저장해도 본문은 그대로다.
    function rememberCode() {
      var area = codeArea();
      codeBase = area ? area.value : null;
      codeOrigin = textarea.value;
      // 편집기는 커서를 글 끝에 두어 긴 본문이면 페이지가 그쪽으로 밀린다 — 소스도 처음부터 보인다
      if (area) {
        area.setSelectionRange(0, 0);
        area.scrollTop = 0;
      }
    }

    // 소스 보기를 끌 때 편집기는 줄을 맞춘 소스 글로 편집 영역을 다시 쓴다(태그 사이 공백이 낀다). 글을 고치지 않았으면 켜기 전 본문으로
    // 다시 불러와 기준을 잡는다 — 본문은 원문 그대로, 변경으로 잡히지 않는다. 고쳤거나 지워질 것(스크립트 등)을 확인하고 넘어왔으면 편집기 결과를 쓴다.
    function leaveCode() {
      var area = codeArea();
      if (!area || area.value !== codeBase || filterLoses(codeOrigin)) {
        sync();
        return;
      }
      pristine = null;   // 다시 불러오는 동안의 onChange 는 본문을 건드리지 않는다
      original = codeOrigin;
      editor.$.html.set(original);
      pristine = cleanHtml(editor.$.html.get());
      sync();
    }

    function holdScroll() {
      if (toggleScrollY === null) return;
      var y = toggleScrollY;
      toggleScrollY = null;
      window.scrollTo(window.scrollX, y);
      window.requestAnimationFrame(function () { window.scrollTo(window.scrollX, y); });
    }

    // 편집 영역에 넣으면 지워지거나 실행될 수 있는 것: 허용 목록 밖의 요소 · 속성, 스크립트 주소.
    function filterLoses(html) {
      var doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
      return Array.prototype.some.call(doc.body.firstChild.querySelectorAll('*'), function (el) {
        if (!EDITOR_ELEMENTS.test(el.tagName)) return true;
        return Array.prototype.some.call(el.attributes, function (attr) {
          return !EDITOR_ATTRIBUTES.test(attr.name) || SCRIPT_URL.test(attr.value);
        });
      });
    }

    // 이미지 삽입은 소스 단추 앞에, 보기 전환은 맨 뒤에.
    function joinBar() {
      var tray = barTools.querySelector('.se-btn-tray');
      var code = tray ? tray.querySelector('[data-command="codeView"]') : null;
      var image = bar.querySelector('[data-image-picker]');
      var view = bar.querySelector('.cms-admin-editor__viewtoggle');
      if (!code || !image || !view) return;
      barMoved = [[image, image.nextSibling], [view, view.nextSibling]];
      var codeModule = code.closest('.se-btn-module') || code;
      codeModule.parentNode.insertBefore(image, codeModule);
      tray.appendChild(view);
    }

    function leaveBar() {
      if (barMoved) {
        barMoved.forEach(function (item) { bar.insertBefore(item[0], item[1]); });
        barMoved = null;
      }
      if (barTools && barTools.parentNode) barTools.parentNode.removeChild(barTools);
      barTools = null;
    }

    // 편집기는 자기가 표현하지 못하는 마크업(class · 구조 · 표 설정 · 그림 안 요소)을 불러올 때 지우고, 글자를 한 자만 쳐도 그대로 저장된다.
    // 불러온 결과가 본문을 잃으면 편집기를 띄우지 않고 HTML 원문으로 고치게 한다.
    function markupOf(html) {
      var doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
      var counts = {};
      var add = function (key) { counts[key] = (counts[key] || 0) + 1; };
      Array.prototype.forEach.call(doc.body.firstChild.querySelectorAll('*'), function (el) {
        add('<' + el.tagName);
        Array.prototype.forEach.call(el.classList, function (name) {
          if (name.indexOf('se-') !== 0) add('.' + name);
        });
        Array.prototype.forEach.call(el.attributes, function (attr) {
          if (attr.name !== 'class' && attr.name.indexOf('data-se-') !== 0) add('@' + attr.name);
        });
      });
      return { counts: counts, text: doc.body.textContent.replace(/[\s\u200b\ufeff]+/g, '') };
    }

    function losesMarkup(before, after) {
      var was = markupOf(before);
      var now = markupOf(after);
      if (was.text !== now.text) return true;
      return Object.keys(was.counts).some(function (key) { return (now.counts[key] || 0) < was.counts[key]; });
    }

    // SunEditor 가 덧붙이는 것은 본문에 남기지 않는다: 기본값(width/height="auto", 빈 style), 내부 표시(data-se-*),
    // 선택 상태 클래스(그림을 고른 채 저장하면 se-component-selected 등이 클래스로 굳는다 — 정화는 class 를 남긴다).
    function cleanHtml(html) {
      return String(html || '')
        // 커서를 넣으면 블록 밖 링크의 글자를 문단으로 감싼다(태그 묶음 등) — 넣은 적 없는 문단이다
        .replace(/<a\b([^>]*)>\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*<\/a>/g, '<a$1>$2</a>')
        // 커서가 든 링크에 편집기가 임시로 붙이는 표시
        .replace(/(<a\b[^>]*?)\sclass="on"/g, '$1')
        .replace(/\s(width|height)="auto"/g, '')
        .replace(/\sdata-se-[a-z-]+="[^"]*"/g, '')
        .replace(/\s?\b(se-component-selected|se-figure-selected|se-figure-over-selected)\b/g, '')
        .replace(/\sclass=""/g, '')
        .replace(/\sstyle=""/g, '');
    }

    function sync() {
      // pristine 은 붙이기가 끝나야 생긴다 — 붙이는 중 SunEditor 가 보내는 onChange 로 본문(정규화된 html)을 덮어쓰지 않는다
      if (!editor || pristine === null) return;
      var html;
      if (inCodeView()) {
        // 소스 보기에서는 편집기가 돌려주는 값이 소스 칸의 글이 아니다 — 칸을 직접 읽는다
        var area = codeArea();
        html = area && area.value !== codeBase ? area.value : codeOrigin;
      } else {
        html = cleanHtml(editor.$.html.get());
        if (html === pristine) html = original;
      }
      if (textarea.value !== html) {
        textarea.value = html;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (onSynced) onSynced();
    }

    function mount() {
      if (editor || !wanted() || !window.SUNEDITOR) return;
      var P = window.SUNEDITOR.plugins;
      holder = document.createElement('div');
      holder.className = 'cms-admin-wysiwyg';
      textarea.parentNode.insertBefore(holder, textarea);
      textarea.hidden = true;
      // 숨은 textarea 의 required 는 브라우저 검사에서 「포커스할 수 없는 칸」 오류를 낸다 — 붙어 있는 동안만 뗀다.
      if (textarea.required) {
        textarea.required = false;
        textarea.setAttribute('data-wysiwyg-required', '');
      }
      var barOptions = {};
      if (bar) {
        barTools = document.createElement('div');
        barTools.className = 'cms-admin-editor__setools';
        bar.insertBefore(barTools, bar.firstChild);
        barOptions = { toolbar_container: barTools, maxHeight: '62rem' };   // 아래 상태 줄 2rem 을 더해 칸 높이 64rem
      }
      editor = window.SUNEDITOR.create(holder, Object.assign(barOptions, {
        lang: window.SUNEDITOR_LANG && window.SUNEDITOR_LANG.ko,
        strictMode: EDITOR_FILTER.strictMode,
        elementWhitelist: EDITOR_FILTER.elementWhitelist,
        elementBlacklist: EDITOR_FILTER.elementBlacklist,
        attributeWhitelist: EDITOR_FILTER.attributeWhitelist,
        width: '100%',
        minHeight: textarea.getAttribute('data-wysiwyg-min-height') || '40rem',
        plugins: [P.blockStyle, P.list_numbered, P.list_bulleted, P.align, P.hr, P.table, P.link, P.blockquote, P.image],
        buttonList: [
          ['undo', 'redo'], ['blockStyle'], ['bold', 'underline', 'italic', 'strike'], ['removeFormat'],
          ['list_numbered', 'list_bulleted', 'outdent', 'indent'], ['align'], ['hr', 'table', 'link', 'blockquote'],
          ['codeView', 'fullScreen']
        ],
        // 문단 형식: 본문 · 제목 h2~h4(h1 은 페이지 제목) · 인용.
        blockStyle: { items: ['p', 'h2', 'h3', 'h4', 'blockquote'] },
        // 그림 편집 창에는 파일 올리기 칸을 두지 않는다(올리기는 「이미지 삽입」 창 → images 폴더).
        image: { createFileInput: false, createUrlInput: true, useFormatType: false },
        events: {
          onChange: sync,
          // onChange 는 편집기 기록 주기만큼 늦다 — 저장 막대가 입력 즉시 커지게 해 단추 위치가 뒤늦게 밀리지 않게 한다
          onInput: sync,
          // 전체 화면은 다른 창 · 칸 위를 덮는다 — 옮겨 둔 이미지 삽입 · 보기 전환은 그동안 숨긴다(content.css)
          onToggleFullScreen: function (params) {
            root.toggleAttribute('data-fullscreen', !!(params && params.is));
          },
          onToggleCodeView: function () {
            if (inCodeView()) rememberCode(); else leaveCode();
            holdScroll();
          },
          onBlur: sync,
          // 붙여넣기 · 끌어 놓기로 들어온 그림 파일: 본문에 base64 로 박지 않고 「이미지 삽입」 창에 넘긴다 — 그 콘텐츠의 이미지 폴더로
          // 올라가 골라진 상태로 열리고, 대체 텍스트를 쓰고 [넣기]를 누르면 /images/… 주소로 들어간다.
          onImageUploadBefore: function (params) {
            var files = params && params.info && params.info.files ? Array.prototype.slice.call(params.info.files) : [];
            var handed = files.length && window.cmsImagePicker && window.cmsImagePicker.openWithFiles(textarea, files);
            if (!handed) {
              var live = root.querySelector('.cms-admin-editor__live');
              if (live) {
                live.classList.remove('nv-sr-only');
                live.textContent = '그림 파일은 [이미지 삽입]으로 올려 주세요(images 폴더).';
              }
            }
            return false;
          }
        }
      }));
      if (bar) joinBar();
      original = textarea.value;
      var openAsCode = filterLoses(original);
      var loaded = '';
      if (!openAsCode) {
        editor.$.html.set(original);
        loaded = editor.$.html.get();
        openAsCode = !!original && losesMarkup(original, loaded);
        if (openAsCode) editor.$.html.set('');
      }
      pristine = cleanHtml(openAsCode ? editor.$.html.get() : loaded);
      if (openAsCode) {
        toggleScrollY = window.scrollY;
        editor.$.viewer.codeView(true);
        codeArea().value = original;
        rememberCode();
      }
      bindCodeArea();
      // SunEditor 는 붙인 요소 옆(형제)에 자기 틀(.sun-editor)을 만들고 도구 줄은 칸 밖에 있을 수 있다 — 편집기 전체에서 찾는다.
      labelUnnamedButtons(root);
      textarea.__cmsWysiwyg = {
        insertHtml: function (html) {
          if (inCodeView()) {
            var area = codeArea();
            area.setRangeText(html, area.selectionStart, area.selectionEnd, 'end');
          } else {
            insertAtCaret(html);
          }
          sync();
        }
      };
    }

    // 편집기의 html.insert 는 그림을 블록으로 다뤄 감싼 구조(section 등)를 쪼개고, 그림을 고른 상태에서는 멈춘다 — 커서 자리에 직접 넣는다.
    // 커서가 본문 글 안에 없으면(빈 본문 · 그림을 고른 상태) 맨 끝에 새 문단으로 넣는다.
    function insertAtCaret(html) {
      var area = holder.parentNode.querySelector('.sun-editor-editable');
      var nodes = new DOMParser().parseFromString(html, 'text/html').body.childNodes;
      var range = null;
      try { range = editor.$.selection.getRange(); } catch (e) { range = null; }
      var at = range ? range.startContainer : null;
      var inText = at && at !== area && area.contains(at) && !(at.nodeType === 1 && at.querySelector && (at.nodeName === 'IMG' || at.querySelector('img')));
      var last = null;
      if (inText) {
        range.collapse(false);
        Array.prototype.slice.call(nodes).reverse().forEach(function (node) {
          var added = document.importNode(node, true);
          range.insertNode(added);
          last = last || added;
        });
      } else {
        var line = document.createElement('p');
        Array.prototype.forEach.call(nodes, function (node) { line.appendChild(document.importNode(node, true)); });
        area.appendChild(line);
        last = line;
      }
      var after = last.parentNode;
      var index = Array.prototype.indexOf.call(after.childNodes, last) + 1;
      editor.$.selection.setRange(after, index, after, index);
      editor.$.history.push(false);
    }

    function bindCodeArea() {
      var area = codeArea();
      if (area) area.addEventListener('input', sync);
      if (root.__cmsCodeGuard) return; // 형식을 바꿔 다시 붙여도 한 번만
      root.__cmsCodeGuard = true;
      // 소스에서 편집 화면으로: 지워질 것이 있으면 먼저 묻는다. 한 번 더 누르는 것은 편집기가 그대로 처리한다.
      root.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-command="codeView"]') : null;
        if (btn) toggleScrollY = window.scrollY;
        if (!btn || !inCodeView()) return;
        var current = codeArea();
        if (!current || !filterLoses(current.value)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var message = '이 본문에는 편집 화면에서 지워지는 내용(스크립트 등)이 있습니다.';
        var ask = window.nvConfirm
          ? window.nvConfirm({ title: '편집 화면으로 바꾸기', message: message, verb: '바꾸기', danger: true })
          : Promise.resolve(window.confirm(message));
        ask.then(function (yes) {
          if (yes && editor) {
            toggleScrollY = window.scrollY;
            editor.$.viewer.codeView(false);
          }
        });
      }, true);
    }

    // SunEditor 의 목록 종류 화살표(.se-sub-arrow-btn) 같은 보조 버튼은 이름이 없다(axe button-name) — 안 보이는 툴팁 글자는 이름이
    // 되지 않으므로, 보이는 글자가 없는 버튼에 툴팁(또는 옆 주 버튼) 이름을 aria-label 로 붙인다.
    function labelUnnamedButtons(scope) {
      scope.querySelectorAll('button').forEach(function (b) {
        if (b.getAttribute('aria-label') || b.getAttribute('aria-labelledby')) return;
        var visible = Array.prototype.filter.call(b.childNodes, function (n) {
          return !(n.classList && n.classList.contains('se-tooltip-inner'));
        }).map(function (n) { return n.textContent; }).join('').trim();
        if (visible) return;
        var tip = b.querySelector('.se-tooltip-text');
        var main = b.previousElementSibling;
        var base = (tip && tip.textContent.trim()) || (main && (main.getAttribute('aria-label') || main.title))
          || b.title || b.getAttribute('data-command') || '도구';
        b.setAttribute('aria-label', base + (b.classList.contains('se-sub-arrow-btn') ? ' 종류 선택' : ''));
      });
    }

    function unmount() {
      if (!editor) return;
      sync();
      if (bar) leaveBar();
      try { editor.destroy(); } catch (e) { /* 이미 해제됨 */ }
      editor = null;
      original = null;
      pristine = null;
      codeBase = null;
      codeOrigin = null;
      if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
      holder = null;
      textarea.hidden = false;
      if (textarea.hasAttribute('data-wysiwyg-required')) {
        textarea.required = true;
        textarea.removeAttribute('data-wysiwyg-required');
      }
      delete textarea.__cmsWysiwyg;
    }

    // 숨은 칸(게시글마다 있는 수정 패널 · 닫힌 등록 패널)은 보일 때 붙인다 — 화면에 편집기 수십 개를 미리 만들지 않는다.
    function mountWhenVisible() {
      if (root.getClientRects().length > 0 || !('IntersectionObserver' in window)) {
        mount();
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          mount();
        }
      });
      io.observe(root);
    }

    if (formatSelect) {
      formatSelect.addEventListener('change', function () {
        if (wanted()) mount(); else unmount();
      });
    }
    // 폼 제출 직전 동기화 — 본문 textarea 는 form= 속성으로 폼 밖에 있을 수 있어 문서에서 잡는다.
    document.addEventListener('submit', function (e) {
      if (editor && textarea.form && e.target === textarea.form) sync();
    }, true);

    // 페이지 끝의 SunEditor 스크립트(defer)가 이 파일보다 늦게 실행되므로 없으면 DOMContentLoaded 뒤에 다시 본다.
    if (window.SUNEDITOR) {
      mountWhenVisible();
    } else {
      document.addEventListener('DOMContentLoaded', mountWhenVisible);
    }
  }

  // ── 지정 루트(기본 document) 하위 에디터 초기화 ──────────────────────
  // 인라인 상세 fragment 주입 후 재초기화(cmsContentEditor.init(panel))에 대비해
  // root 인자를 받고, 이미 바인딩된 인스턴스는 initEditor 내부 가드로 건너뛴다.
  function init(root) {
    var scope = root || document;
    var editors = scope.querySelectorAll('.cms-admin-editor');
    for (var i = 0; i < editors.length; i++) {
      initEditor(editors[i]);
    }
    // 편집기 틀(.cms-admin-editor) 없이 위지윅만 쓰는 textarea(팝업 내용 등) — 형식 선택 · 미리보기 없음, 언제나 HTML.
    var plain = scope.querySelectorAll('textarea[data-wysiwyg-textarea]');
    for (var j = 0; j < plain.length; j++) {
      if (plain[j].__cmsWysiwygBound) continue;
      plain[j].__cmsWysiwygBound = true;
      bindWysiwyg(plain[j].parentNode, plain[j], null, null);
    }
    bindUnsavedGuard(scope);
    bindPublishSetting(scope);
  }

  // ── 게시 여부 설정(콘텐츠 수정 화면 · 메뉴 수정 소스 탭) ──────────────
  // 라디오에 맞는 칸만 보인다(예약 게시 = 예약 시각). [수정하기]가 고른 방식을 수행한다 — 라디오 · 예약 시각은 저장 폼으로 함께 간다.
  // 임시저장을 고르면 [수정하기]도 임시저장이라 사유가 필요 없다(admin-interactions.js 가 data-reason-required 를 본다).
  function bindPublishSetting(scope) {
    var box = scope.querySelector ? scope.querySelector('[data-publish-setting]') : null;
    if (!box || box.__cmsPublishBound) return;
    box.__cmsPublishBound = true;
    var at = box.querySelector('input[name="publishAt"]');
    function mode() {
      var checked = box.querySelector('[data-publish-mode]:checked');
      return checked ? checked.value : '';
    }
    function sync() {
      var chosen = mode();
      box.querySelectorAll('[data-publish-action]').forEach(function (el) {
        el.hidden = el.getAttribute('data-publish-action') !== chosen;
      });
      document.querySelectorAll('button[name="publish"][form="ct-save-form"]').forEach(function (btn) {
        btn.toggleAttribute('data-reason-required', chosen !== 'draft');
      });
    }
    box.addEventListener('change', function (e) {
      if (e.target.matches('[data-publish-mode]')) sync();
    });
    // 예약 시각은 [수정하기] + 예약 게시일 때만 필수 — [임시저장]을 막지 않는다
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[type="submit"][form="ct-save-form"]') : null;
      if (btn && at) at.required = btn.name === 'publish' && mode() === 'schedule';
    }, true);
    sync();
  }

  // ── 버전 미리보기 창: 버전 표의 눈 단추. 창 열기는 admin-v2.js(data-modal-open), 여기서는 무엇을 볼지 넣는다 ──
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-version-preview]') : null;
    var box = link ? document.querySelector(link.getAttribute('data-modal-open')) : null;
    if (!box) return;
    var frame = box.querySelector('[data-version-preview-frame]');
    var title = box.querySelector('.nv-modal__title');
    if (title) title.textContent = link.getAttribute('data-version-label') + ' 미리보기';
    if (frame) frame.src = link.href;
    // 버전 카드의 ⋮ 메뉴 안에서 열었으면 메뉴를 닫고 창을 닫을 때 ⋮ 단추로 돌아간다(숨은 메뉴 항목으로 돌아가지 않게)
    var menu = link.closest('.nv-dropmenu__menu');
    var more = menu && menu.parentNode.querySelector('[data-dropmenu]');
    if (more && window.nvAdmin) {
      e.preventDefault();
      e.stopPropagation();
      more.setAttribute('aria-expanded', 'false');
      menu.setAttribute('hidden', '');
      menu.classList.remove('nv-dropmenu__menu--fixed');
      menu.style.left = '';
      menu.style.top = '';
      window.nvAdmin.openModal(box, more);
    }
  }, true);

  // ── 콘텐츠 수정 화면: 저장하지 않은 채 다른 폼을 보내면 묻기 ─────────
  // [수정하기] 폼(form[data-content-save-form])의 칸(form= 로 붙은 칸 포함)을 처음 값과 견준다. 같은 화면([data-content-editor-page])의
  // 다른 폼(게시하기 · 예약 · 검토 요청 · SEO 저장 등)은 저장된 버전만 다루므로, 고친 것이 있으면 보내기 전에 묻는다.
  // 따로 묻는 폼(삭제)은 data-unsaved-skip 으로 뺀다. 위지윅은 바뀌면 · 칸을 떠나면 글상자에 옮겨 두므로 글상자 값으로 본다.
  // 인라인 상세(innerHTML 로 넣은 조각)는 init(panel) 때 처음 값을 잡는다.
  var unsavedGuardInstalled = false;

  function saveFields(form) {
    return Array.prototype.filter.call(form.elements, function (el) {
      // 게시 방식 · 예약 시각 · 사유는 본문이 아니다 — 고른 뒤 다른 폼을 보내도 사라질 내용이 없다
      return el.name && el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' && el.type !== 'radio'
          && el.name !== 'publishAt' && !el.hasAttribute('data-save-reason');
    });
  }

  // 버전 상태 필터를 바꾸다 취소했으면 칸도 지금 보이는 표의 값으로 돌려놓는다.
  function keepFilterChoice(form) {
    if (form.hasAttribute('data-version-filter')) form.reset();
  }

  function bindUnsavedGuard(scope) {
    var forms = Array.prototype.slice.call(scope.querySelectorAll('form[data-content-save-form]'));
    if (scope.matches && scope.matches('form[data-content-save-form]')) forms.push(scope);
    forms.forEach(function (form) {
      if (!form.__cmsUnsavedInitial) {
        form.__cmsUnsavedInitial = saveFields(form).map(function (el) { return el.value; });
      }
    });
    if (unsavedGuardInstalled || !forms.length) return;
    unsavedGuardInstalled = true;
    document.addEventListener('submit', function (e) {
      var target = e.target;
      if (!target || !target.closest || target.__cmsUnsavedConfirmed || target.hasAttribute('data-content-save-form') || target.hasAttribute('data-unsaved-skip')) return;
      var page = target.closest('[data-content-editor-page]');
      var save = page && page.querySelector('form[data-content-save-form]');
      var initial = save && save.__cmsUnsavedInitial;
      if (!initial) return;
      var dirty = saveFields(save).some(function (el, i) { return el.value !== initial[i]; });
      if (!dirty) return;
      var message = '고친 내용을 아직 저장하지 않았습니다. 이대로 계속하면 고친 내용은 사라집니다. 먼저 [수정하기]로 저장하려면 [취소]를 누르세요.';
      if (!window.nvConfirm) {   // 옛 콘솔에는 공통 확인 창이 없다
        if (!window.confirm(message)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          keepFilterChoice(target);
        }
        return;
      }
      // 확인 창은 기다릴 수 없으므로 멈췄다가, 고르면 같은 단추로 다시 제출한다
      e.preventDefault();
      e.stopImmediatePropagation();
      var submitter = e.submitter;
      window.nvConfirm({ title: '저장하지 않은 내용', message: message, verb: '계속' }).then(function (yes) {
        if (!yes) {
          keepFilterChoice(target);
          return;
        }
        target.__cmsUnsavedConfirmed = true;
        if (target.requestSubmit) {
          target.requestSubmit(submitter && submitter.form === target ? submitter : undefined);
        } else {
          target.submit();
        }
        target.__cmsUnsavedConfirmed = false;
      });
    }, true);
  }

  // ── 콘텐츠 목록 선택 삭제: 고른 콘텐츠를 쓰는 메뉴를 확인 창에 보인다 ──────
  // 확인 창(admin-v2.js)보다 먼저 받아 문구를 맞춘다.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-content-bulk-delete')) return;
    if (!form.hasAttribute('data-confirm-base')) form.setAttribute('data-confirm-base', form.getAttribute('data-confirm') || '');
    var names = [];
    document.querySelectorAll('input[data-select-row][form="' + form.id + '"]:checked').forEach(function (box) {
      var used = box.getAttribute('data-menu-names');
      if (used) names.push(used);
    });
    form.setAttribute('data-confirm', form.getAttribute('data-confirm-base')
        + (names.length ? ' 「' + names.join(', ') + '」 메뉴가 쓰는 콘텐츠가 있어 그 메뉴는 준비 중으로 보입니다.' : ''));
  }, true);

  // ── 전역 노출 ─────────────────────────────────────────────────────────
  window.cmsContentEditor = { init: init };

  // ── <details> 펼침 시 내부 에디터 지연 바인딩 ────────────────────────
  // 상세는 details(예: "본문 수정") 안에 에디터를 두므로, 최초 펼침 시점에
  // 바인딩해 인라인 주입된 콘텐츠에서도 미리보기가 동작하도록 한다.
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d && d.tagName === 'DETAILS' && d.open) {
      init(d);
    }
  }, true);

  // ── DOMContentLoaded 부트스트랩 ──────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
}());
