/* AI 해설 도우미(#10) — 퍼블리싱 .cm-ai 마크업(templates/cms/common/ai-helper.html)에 질문 보내기·답변을 붙인다.
   열기·닫기·Esc·말풍선 하루 숨김은 테마 krds-custom.js(cmAiHelper)가 맡는다. 질문 예시 누름·질문 보내기는 대화 창에서 capture 로
   먼저 받아 멈춘다 — 테마의 퍼블리싱 확인용 예시 답변이 붙지 않게(선례 kd-detail.js). 답변 문장·버튼은 서버가 정한다(docs/08 §9-1).
   API: {data-ai-api}/context · /ask (GET — 연결 서비스 공개 API 규약). 시계열 상세는 루트 data-ts-* 조건을 질문마다 함께 보낸다. */
(function () {
  "use strict";

  var TS_CONDITIONS = [["g", "data-ts-graph"], ["f", "data-ts-feature"], ["path", "data-ts-path"], ["y", "data-ts-year"]];
  var UNIT_SUFFIX = /\s*\([^()]*\)\s*$/;

  function init() {
    var root = document.querySelector(".cm-ai[data-ai-api]");
    if (!root) return;
    var api = root.getAttribute("data-ai-api");
    var screen = root.getAttribute("data-ai-screen");
    var table = root.getAttribute("data-ai-table");
    var view = root.closest("[data-sedis-screen]") || document;
    var panel = root.querySelector(".cm-ai-panel");
    var chat = panel.querySelector(".cm-ai-chat");
    var list = panel.querySelector(".cm-ai-list");
    var form = panel.querySelector(".cm-ai-input");
    var input = form.querySelector("input");
    var suggest = panel.querySelector(".cm-ai-suggest");
    var source = "";
    var fallback = null;
    var previous = null;
    var busy = false;

    function params(extra) {
      var p = new URLSearchParams({ screen: screen, table: table });
      if (screen === "ts_detail" && view !== document) {
        TS_CONDITIONS.forEach(function (k) {
          var v = view.getAttribute(k[1]);
          if (v) p.set(k[0], v);
        });
      }
      Object.keys(extra || {}).forEach(function (k) {
        if (extra[k]) p.set(k, extra[k]);
      });
      return p.toString();
    }

    function get(path, query) {
      return fetch(api + path + "?" + query, { headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        });
    }

    // 처음 안내: 화면마다 다른 질문 예시 3개와 출처·실패 문구
    get("/context", params()).then(function (c) {
      source = c.source || "";
      fallback = c.fail || null;
      suggest.replaceChildren.apply(suggest, (c.suggested || []).map(function (q) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button";
        b.append(q + " ");
        b.insertAdjacentHTML("beforeend", '<i class="svg-icon ico-angle right" aria-hidden="true"></i>');
        li.append(b);
        return li;
      }));
    }).catch(function () {
      suggest.hidden = true; // 질문 예시 없이도 직접 질문은 보낼 수 있다
    });

    function showChat() {
      if (panel.dataset.state !== "chat") list.replaceChildren(); // 처음 안내에서 넘어오면 새 대화(테마와 같은 규칙)
      panel.dataset.state = "chat";
    }

    function addAsk(text) {
      var li = document.createElement("li");
      li.className = "ask";
      var p = document.createElement("p");
      p.className = "bubble";
      p.innerHTML = '<span class="sr-only">질문 : </span>';
      p.append(text);
      li.append(p);
      list.append(li);
    }

    function addAnswer(sentences, buttons, src) {
      var li = document.createElement("li");
      li.className = "answer";
      var bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = '<span class="sr-only">답변 : </span>';
      sentences.forEach(function (s, i) {
        if (i) bubble.append(document.createElement("br"));
        bubble.append(s);
      });
      if (src) {
        var line = document.createElement("span");
        line.className = "cm-ai-src";
        line.textContent = src;
        bubble.append(line);
      }
      li.append(bubble);
      if (buttons && buttons.length) {
        var links = document.createElement("div");
        links.className = "cm-ai-links";
        buttons.forEach(function (b) {
          links.append(actionButton(b));
        });
        li.append(links);
      }
      list.append(li);
      chat.scrollTop = chat.scrollHeight;
      return li;
    }

    // 버튼 action 규약(docs/08 §9-4): nav:<주소> · ask:<질문> · highlight:term · focus:table · retry
    function actionButton(b) {
      var action = b.action || "";
      if (action.indexOf("nav:") === 0) {
        var a = document.createElement("a");
        a.className = "cm-ai-rate";
        a.href = action.slice(4);
        a.textContent = b.label;
        return a;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cm-ai-rate";
      btn.textContent = b.label;
      btn.setAttribute("data-ai-action", action);
      return btn;
    }

    function act(btn) {
      var action = btn.getAttribute("data-ai-action");
      var answer = btn.closest("li.answer");
      if (action.indexOf("ask:") === 0) ask(action.slice(4));
      else if (action === "retry") ask(answer && answer.getAttribute("data-ai-question"));
      else if (action === "highlight:term") showTerm(answer && answer.getAttribute("data-ai-term"));
      else if (action === "focus:table") show(view.querySelector("table[id$='_table']"));
    }

    function clearMarks() {
      view.querySelectorAll(".cm-ai-hl").forEach(function (el) {
        el.classList.remove("cm-ai-hl");
      });
    }

    function bare(s) {
      return (s || "").replace(UNIT_SUFFIX, "").trim();
    }

    // 근거 칸(F-14) — 핵심데이터 열 이름은 단위 「(%)」 를 뗀 이름으로 맞춘다
    function markCells(cells) {
      clearMarks();
      if (!cells.length) return;
      view.querySelectorAll("td[data-row][data-col]").forEach(function (td) {
        var hit = cells.some(function (c) {
          return td.getAttribute("data-row") === c.row && bare(td.getAttribute("data-col")) === bare(c.col);
        });
        if (hit) td.classList.add("cm-ai-hl");
      });
    }

    // 용어 설명이 있는 화면 자리 — 용어해설 표 → 지표정보 줄 → 지표정보 안내 → 그 밖의 설명 글 순으로 첫 일치.
    // 통계표 값 칸(td)·그래프는 설명이 아니라 보지 않는다. 화면에 없으면 null(버튼을 그리지 않는다).
    function termTarget(term) {
      if (!term) return null;
      function first(selector, hit) {
        return [].find.call(view.querySelectorAll(selector), function (el) {
          return !el.closest(".cm-ai") && hit(el);
        });
      }
      function has(el) {
        return el.textContent.indexOf(term) >= 0;
      }
      var dt;
      return first("tr[data-term]", function (tr) { return tr.getAttribute("data-term") === term; })
        || ((dt = first(".cm-indicator dt", function (el) { return el.textContent.trim() === term; })) && dt.parentElement)
        || first(".cm-refer-list li", has)
        || first(".cm-ts-section dd, .cm-ts-section li, .cm-ts-section p", has)
        || null;
    }

    function showTerm(term) {
      var el = termTarget(term);
      if (!el) return;
      clearMarks();
      el.classList.add("cm-ai-hl");
      show(el);
    }

    function show(el) {
      if (!el) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.scrollIntoView({ block: "center" });
      el.focus({ preventScroll: true });
    }

    function ask(text) {
      text = (text || "").replace(/\s+/g, " ").trim();
      if (!text || busy) return;
      busy = true;
      showChat();
      addAsk(text);
      var wait = addAnswer(["답변을 만드는 중이에요."], [], "");
      wait.setAttribute("aria-busy", "true");
      get("/ask", params({ q: text, prev: previous })).then(function (a) {
        wait.remove();
        previous = a.intent || null;
        var buttons = (a.buttons || []).filter(function (b) {
          return b.action !== "highlight:term" || termTarget(a.glossaryTerm); // 갈 곳 없는 [용어해설 보기]는 빼기
        });
        var li = addAnswer(a.sentences || [], buttons, a.source || source);
        li.setAttribute("data-ai-question", text);
        if (a.glossaryTerm) li.setAttribute("data-ai-term", a.glossaryTerm);
        markCells(a.cells || []);
      }).catch(function () {
        wait.remove();
        previous = null;
        var f = fallback || { sentences: ["답변을 만들지 못했어요."], buttons: [] };
        addAnswer(f.sentences || [], f.buttons || [], "").setAttribute("data-ai-question", text);
      }).then(function () {
        busy = false;
      });
    }

    panel.addEventListener("click", function (e) {
      var example = e.target.closest(".cm-ai-suggest button");
      if (example) {
        e.stopPropagation(); // 테마의 퍼블리싱 확인용 예시 답변 대신
        ask(example.textContent);
        input.focus();
        return;
      }
      var btn = e.target.closest("[data-ai-action]");
      if (btn) {
        e.stopPropagation();
        act(btn);
        return;
      }
      if (e.target.closest(".cm-ai-reset, .cm-ai-close")) previous = null;
    }, true);

    panel.addEventListener("submit", function (e) {
      if (e.target !== form) return;
      e.preventDefault();
      e.stopPropagation(); // 테마 submit 처리(예시 답변) 대신
      var text = input.value;
      input.value = "";
      ask(text);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
