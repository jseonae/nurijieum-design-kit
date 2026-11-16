/* 디자인 키트 전용(실제 화면에 들어가지 않음): 키트에 없는 화면 링크는 알림만, 폼은 보내지 않는다 */
(function () {
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#1d2433;color:#fff;padding:10px 16px;border-radius:8px;font:14px/1.4 sans-serif;z-index:2147483647;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#kit-missing"]');
    if (a) { e.preventDefault(); toast('키트에 없는 화면입니다: ' + (a.getAttribute('data-kit-href') || '')); }
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); toast('키트에서는 저장되지 않습니다'); }, true);
})();
