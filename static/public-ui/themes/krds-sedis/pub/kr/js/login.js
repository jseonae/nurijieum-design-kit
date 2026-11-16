/* 연구원 로그인 : 비밀번호 보기 */
document.querySelectorAll("[data-login-pw-toggle]").forEach((btn) => {
  const input = document.getElementById(btn.getAttribute("aria-controls"));
  const label = btn.querySelector(".sr-only");
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", String(show));
    label.textContent = show ? "비밀번호 숨기기" : "비밀번호 보기";
  });
});
