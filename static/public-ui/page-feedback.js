/*
 * 만족도 조사 위젯(templates/public/fragments/page-feedback.html) 제출.
 * - JSON + X-CSRF-Token 으로 POST /public/feedback (같은 출처). 결과 문구는 서버가 주고, aria-live 영역에 넣는다.
 * - 브라우저 층 중복 방지: 저장(또는 409) 뒤 localStorage 에 (경로, 날짜)를 적어 두고, 같은 날 다시 열면 「이미 참여」로 잠근다.
 *   서버도 같은 세션·같은 페이지·같은 날을 409 로 막는다(이 기록은 편의일 뿐 — 지워도 서버가 막는다).
 * - 스크립트가 없으면 폼이 일반 제출(_csrf)로 동작한다.
 */
(function () {
  "use strict";

  var DONE_TEXT = "이 페이지는 오늘 이미 참여하셨습니다. 참여해 주셔서 감사합니다.";

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function storageKey(path) {
    return "cms-page-feedback:" + path + ":" + today();
  }

  function remembered(path) {
    try {
      return window.localStorage.getItem(storageKey(path)) === "1";
    } catch (e) {
      return false;
    }
  }

  function remember(path) {
    try {
      window.localStorage.setItem(storageKey(path), "1");
    } catch (e) {
      /* 저장소를 못 쓰면 서버 중복 차단만 남는다 */
    }
  }

  // 잠그면 초점이 있던 평가하기 단추가 disabled 가 되어 초점이 문서(body)로 빠진다 — 키보드·화면낭독기 사용자가 자리를 잃지 않게
  // 결과 안내로 옮긴다(안내는 tabindex=-1 이라 Tab 순서에는 들지 않는다).
  function keepFocus(form, result) {
    var active = document.activeElement;
    if (active && active !== document.body && !form.contains(active)) {
      return;
    }
    result.setAttribute("tabindex", "-1");
    result.focus();
  }

  // 보내는 동안 disabled 로 빠졌던 초점을 다시 켠 평가하기 단추로 돌린다(실패 안내 뒤 바로 다시 시도할 수 있게)
  function unlockButton(button) {
    button.disabled = false;
    if (!document.activeElement || document.activeElement === document.body) {
      button.focus();
    }
  }

  function lock(form) {
    Array.prototype.forEach.call(form.querySelectorAll("input, button"), function (el) {
      if (el.type !== "hidden") {
        el.disabled = true;
      }
    });
    form.setAttribute("aria-disabled", "true");
  }

  function value(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : "";
  }

  function init(section) {
    var form = section.querySelector("form");
    var result = section.querySelector(".cm-research-result");
    if (!form || !result) {
      return;
    }
    var path = value(form, "path");
    if (remembered(path)) {
      result.textContent = DONE_TEXT;
      lock(form);
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.getAttribute("aria-disabled") === "true") {
        return;
      }
      var checked = form.querySelector('input[name="score"]:checked');
      if (!checked) {
        result.textContent = "만족도를 선택해 주세요.";
        var first = form.querySelector('input[name="score"]');
        if (first) {
          first.focus();
        }
        return;
      }
      var button = form.querySelector(".cm-research-submit");
      if (button) {
        button.disabled = true;
      }
      var token = value(form, "_csrf");
      fetch(form.getAttribute("action"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({
          path: path,
          score: Number(checked.value),
          opinion: value(form, "opinion"),
          title: value(form, "title"),
          menu: value(form, "menu"),
          hp: value(form, "hp")
        })
      })
        .then(function (response) {
          return response.json().catch(function () {
            return { result: response.status === 429 ? "limited" : "unavailable" };
          }).then(function (body) {
            return { status: response.status, body: body || {} };
          });
        })
        .then(function (res) {
          var outcome = res.body.result;
          if (res.status === 429) {
            result.textContent = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
          } else {
            result.textContent = res.body.message || "지금은 의견을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
          }
          if (outcome === "saved" || outcome === "duplicate") {
            remember(path);
            keepFocus(form, result);
            lock(form);
          } else if (button) {
            unlockButton(button);
          }
        })
        .catch(function () {
          result.textContent = "지금은 의견을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
          if (button) {
            unlockButton(button);
          }
        });
    });
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms-feedback]"), init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
