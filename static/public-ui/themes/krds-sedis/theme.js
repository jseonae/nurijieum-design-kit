/* ==========================================================================
   테마 팩 krds-sedis 보조 스크립트
   - 퍼블리싱 스크립트(pub/_common/resources/js/*, 메인 pub/kr/js/main.js)는 원본 그대로 쓰고,
     퍼블리싱 확인용 kr/js/user-custom.js 대신 거기서 실제 동작인 「공유하기」만 옮겨 둔다.
   - 인라인 onclick 을 쓰지 않으려고 인쇄 버튼도 여기서 연결한다.
   - KRDS 탭의 역할 · 상태를 버튼으로 옮긴다(접근성 보정, 아래 cmTabRoles).
   ========================================================================== */

/* 공유하기 팝업(.cm-share) : SNS 공유 · 페이지 주소 복사 (원본 kr/js/user-custom.js)
   팝업 열기/닫기는 KRDS 맥락적 도움말 스크립트(ui-script.js krds_contextualHelp)가 처리합니다. */
document.addEventListener("click", (event) => {
  const button = event.target.closest(".cm-share .cm-share-btn");
  if (!button) return;

  const url = encodeURIComponent(location.href);
  const title = encodeURIComponent(document.title);
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    band: `https://band.us/plugin/share?body=${title}%0A${url}&route=${encodeURIComponent(location.hostname)}`,
    naver_blog: `https://blog.naver.com/openapi/share?url=${url}&title=${title}`,
  };
  const type = button.dataset.share;

  if (type === "url") {
    event.preventDefault();
    const done = () => window.alert("페이지 주소가 복사되었습니다.");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).then(done);
    } else {
      const input = document.createElement("textarea");
      input.value = location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      done();
    }
    return;
  }
  if (shareUrls[type]) button.setAttribute("href", shareUrls[type]);
});

/* 인쇄 버튼 */
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-cm-print]")) window.print();
});

/* KRDS 탭(.krds-tab-area.layer) 역할 보정
   KRDS ui-script.js(krds_tab)는 role="tab" · aria-selected · aria-controls 를 <li> 에 두고 그 안에 <button> 을 둔다.
   탭은 자식이 표현용인 역할이라 안에 초점 가는 버튼이 겹친다(axe nested-interactive, WCAG 4.1.2).
   KRDS 동작(누르기 · 방향키 · 패널 전환 · "선택됨" 대체 글)은 그대로 두고 역할 · 상태만 버튼으로 옮긴다.
     li → role="presentation", button → role="tab" + id(패널의 aria-labelledby 대상) · aria-controls · aria-selected
   KRDS 가 탭을 바꿀 때 li 에 다시 쓰는 aria-selected 는 바로 버튼으로 옮긴다. 메인 탭과 연결 서비스 화면의 탭에 같이 쓴다.
   반드시 KRDS 초기화 뒤에 돌아야 한다(KRDS 는 li 의 aria-controls 로 패널을 찾는다). KRDS 는 window 의 DOMContentLoaded 에
   붙으므로 여기도 window 에 붙인다 — 이 파일이 ui-script.js 보다 나중에 불러와져 수신기가 뒤에 선다(document 수신기는 window 보다 먼저 돈다). */
const cmTabRoles = {
  init() {
    document.querySelectorAll(".krds-tab-area.layer .tab > ul > li[role=tab]").forEach((li) => this.fix(li));
  },
  fix(li) {
    const button = li.querySelector(":scope > button");
    if (!button || !li.hasAttribute("aria-controls")) return;
    if (li.id) {
      button.id = li.id;
      li.removeAttribute("id");
    }
    const controls = li.getAttribute("aria-controls");
    button.setAttribute("role", "tab");
    if (controls) button.setAttribute("aria-controls", controls);
    li.setAttribute("role", "presentation");
    li.removeAttribute("aria-controls");
    const move = () => {
      if (!li.hasAttribute("aria-selected")) return;
      button.setAttribute("aria-selected", li.getAttribute("aria-selected"));
      li.removeAttribute("aria-selected");
    };
    move();
    new MutationObserver(move).observe(li, { attributes: true, attributeFilter: ["aria-selected"] });
  },
};
window.addEventListener("DOMContentLoaded", () => cmTabRoles.init());

/* 통합검색 최소 글자 수 : 헤더 검색 팝업(.cm-search-form)·결과 화면 입력 띠(.cm-search-top-form)
   - 퍼블리싱 스크립트(krds-custom.js)는 「빈 검색어」만 막는다. 여기서 설정값(data-min-length, 기본 2)보다
     짧은 검색어도 보내지 않고, 입력창 아래 안내(aria-live)로 알린다. 캡처 단계에서 먼저 실행한다. */
document.addEventListener("submit", (event) => {
  const form = event.target.closest(".cm-search-form, .cm-search-top-form");
  if (!form) return;
  const input = form.querySelector("input[name=q]");
  if (!input) return;
  const min = Number(form.dataset.minLength || document.querySelector(".cm-search-form")?.dataset.minLength || 2);
  const value = input.value.trim();
  const hint = form.querySelector(".cm-search-hint");
  if (value === "" || value.length >= min) {
    if (hint) hint.textContent = "";
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (hint) hint.textContent = `${min === 2 ? "두" : min} 글자 이상 입력해 주세요.`;
  input.focus();
}, true);

/* ==========================================================================
   [1026 통합검색 결과] lje/nurijieum#32 · 화면 설계서 sub_search
   ========================================================================== */

/* 분류 탭 · 정렬 : 서버가 다시 그린다(주소의 tab · sort 만 바뀜). KRDS 탭 스크립트는 패널만 바꾸므로 버튼의 data-search-href 로 이동한다. */
document.addEventListener("click", (event) => {
  const button = event.target.closest(".cm-search-result .btn-tab[data-search-href]");
  if (button && !button.disabled) window.location.assign(button.dataset.searchHref);
});
document.addEventListener("change", (event) => {
  const radio = event.target.closest(".cm-search-result .cm-sort-radio input[data-search-href]");
  if (radio && radio.checked) window.location.assign(radio.dataset.searchHref);
});

/* 자동 완성(1차) : 추천 검색어(설정값) + 이 브라우저의 최근 검색어(localStorage, 최대 10). 서버 자동 완성(통계표명 · 용어명)은 2차.
   WAI-ARIA 콤보박스 : 입력창 role=combobox · aria-expanded · aria-controls · aria-activedescendant, 목록 listbox/option,
   2자 이상 입력 0.3초 뒤 펼침(최대 10), ↓↑ 이동, Enter 그 검색어로 검색, Esc 닫기(입력값 유지), Tab 닫고 다음 요소로,
   건수는 aria-live 로 읽어 준다, 일치 글자는 굵게.
   붙는 곳(#72): 통합검색 결과 화면 검색창 · 홈 히어로 검색창(#hero_keyword) · 헤더 「통합검색」 팝업(#cm_search_keyword) —
   입력에 role=combobox + aria-controls(목록 id), 폼 안에 목록 ul[role=listbox] · 건수 안내 [data-ac-status] · data-min-length. */
const cmSearchAutocomplete = {
  KEY: "cm.search.recent",
  MAX: 10,
  recent() {
    try {
      const list = JSON.parse(window.localStorage.getItem(this.KEY) || "[]");
      return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
    } catch (e) {
      return [];
    }
  },
  remember(value) {
    const v = (value || "").trim();
    if (!v) return;
    try {
      const list = [v, ...this.recent().filter((x) => x !== v)].slice(0, this.MAX);
      window.localStorage.setItem(this.KEY, JSON.stringify(list));
    } catch (e) { /* 저장소를 쓸 수 없으면 최근 검색어 없이 동작 */ }
  },
  init() {
    document.querySelectorAll("input[role=combobox][aria-controls]").forEach((input) => this.bind(input));
  },
  bind(input) {
    const list = document.getElementById(input.getAttribute("aria-controls"));
    const form = input.form;
    if (!list || !form) return;
    // 건수 안내(aria-live)는 폼마다 하나 — 결과 화면·홈 히어로·헤더 팝업(#72)
    const status = form.querySelector("[data-ac-status]");
    const min = Number(form.dataset.minLength || 2);
    const suggestions = (input.dataset.acSuggestions || "").split("|").map((v) => v.trim()).filter(Boolean);
    let options = [];
    let active = -1;
    let timer = null;

    // 결과 화면에 들어온 검색어(최소 글자 수 이상)는 최근 검색어로 남긴다
    if (input.value.trim().length >= min && document.querySelector(".cm-search-result .krds-tab-area")) {
      this.remember(input.value);
    }
    form.addEventListener("submit", () => {
      if (input.value.trim().length >= min) this.remember(input.value);
    });

    const close = () => {
      list.hidden = true;
      list.replaceChildren();
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      options = [];
      active = -1;
    };
    const highlight = (index) => {
      options.forEach((li, i) => li.setAttribute("aria-selected", i === index ? "true" : "false"));
      active = index;
      if (index >= 0) {
        input.setAttribute("aria-activedescendant", options[index].id);
        options[index].scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };
    const choose = (index) => {
      if (index < 0 || !options[index]) return;
      input.value = options[index].dataset.value;
      close();
      form.requestSubmit ? form.requestSubmit() : form.submit();
    };
    const open = () => {
      const value = input.value.trim();
      if (value.length < min) {
        close();
        return;
      }
      const needle = value.toLowerCase();
      const seen = new Set();
      const items = [];
      const add = (text, kind) => {
        const key = text.toLowerCase();
        if (seen.has(key) || !key.includes(needle) || items.length >= this.MAX) return;
        seen.add(key);
        items.push({ text, kind });
      };
      this.recent().forEach((v) => add(v, "최근"));
      suggestions.forEach((v) => add(v, "추천"));
      list.replaceChildren();
      options = items.map((item, i) => {
        const li = document.createElement("li");
        li.id = `${list.id}_opt_${i}`;
        li.className = "cm-ac-option";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.dataset.value = item.text;
        const kind = document.createElement("span");
        kind.className = "kind";
        kind.textContent = item.kind;
        const label = document.createElement("span");
        const at = item.text.toLowerCase().indexOf(needle);
        label.append(item.text.slice(0, at));
        const strong = document.createElement("strong");
        strong.textContent = item.text.slice(at, at + needle.length);
        label.append(strong, item.text.slice(at + needle.length));
        li.append(kind, label);
        li.addEventListener("mousemove", () => highlight(i));
        li.addEventListener("mousedown", (e) => e.preventDefault()); // 입력창 초점 유지
        li.addEventListener("click", () => choose(i));
        list.append(li);
        return li;
      });
      active = -1;
      list.hidden = options.length === 0;
      input.setAttribute("aria-expanded", options.length ? "true" : "false");
      input.removeAttribute("aria-activedescendant");
      if (status) status.textContent = options.length ? `자동 완성 ${options.length}건` : "";
    };

    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(open, 300);
    });
    input.addEventListener("keydown", (event) => {
      const expanded = input.getAttribute("aria-expanded") === "true";
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!expanded) {
          open();
          if (options.length) highlight(0);
          return;
        }
        highlight(active < options.length - 1 ? active + 1 : 0);
      } else if (event.key === "ArrowUp") {
        if (!expanded) return;
        event.preventDefault();
        highlight(active > 0 ? active - 1 : options.length - 1);
      } else if (event.key === "Enter") {
        if (expanded && active >= 0) {
          event.preventDefault();
          choose(active);
        }
      } else if (event.key === "Escape") {
        if (expanded) {
          event.preventDefault();
          event.stopPropagation(); // 헤더 팝업 안에서는 첫 Esc 가 목록만 닫는다(두 번째 Esc 가 팝업을 닫음)
          close();
        }
      } else if (event.key === "Tab") {
        close();
      }
    });
    input.addEventListener("blur", () => window.setTimeout(close, 150));
  },
};
document.addEventListener("DOMContentLoaded", () => cmSearchAutocomplete.init());

/* ==========================================================================
   키보드 초점 보정 (SIR-001 키보드 전체 조작 점검, 2026-10-26)
   ========================================================================== */

/* 맥락적 도움말(공유하기 .krds-contextual-help) Esc : KRDS ui-script.js(krds_contextualHelp)는 Esc 로 팝오버를 display:none 으로
   닫기만 해서 팝오버 안에 있던 초점이 문서(body)로 빠진다. 팝오버 안에서 Esc 를 누르면 KRDS 가 닫기 전에(캡처 단계) 연 단추로 초점을 돌린다. */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "Esc") return;
  const popover = document.activeElement?.closest?.(".krds-contextual-help .tooltip-popover");
  if (!popover || popover.style.display !== "block") return;
  popover.closest(".tooltip-action")?.querySelector(".tooltip-btn")?.focus();
}, true);

/* 헤더 통합검색 펼침(#cm_search_popup) : 모달이 아닌 펼침 영역이라 Tab 으로 빠져나갈 수 있는데, 열린 채로 남으면 그 아래
   홈 히어로 검색창 등 다음 초점 요소를 덮는다(WCAG 2.4.11 초점이 가려지지 않음). 초점이 펼침과 여는 단추 밖으로 나가면 닫는다 —
   퍼블리싱 스크립트(krds-custom.js cmSearchPopup)의 「바깥 누름」 닫기와 같다(초점은 옮기지 않음). */
document.addEventListener("focusin", (event) => {
  const popup = document.getElementById("cm_search_popup");
  if (!popup || popup.hidden) return;
  const opener = document.querySelector('[aria-controls="cm_search_popup"]');
  if (popup.contains(event.target) || opener?.contains(event.target)) return;
  popup.hidden = true;
  opener?.setAttribute("aria-expanded", "false");
});
