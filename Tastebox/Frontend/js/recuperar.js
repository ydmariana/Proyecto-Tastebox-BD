(() => {
  const form = document.getElementById("forgot-form");
  if (!form) return;
  const input = document.getElementById("email");
  const error = document.getElementById("email-error");
  const dialog = document.getElementById("forgot-ok");
  const DEMO = true;

  const check = () => {
    const v = input.value.trim();
    const msg = !v ? "Escribe tu email." : !window.TasteboxConfig.EMAIL_PATTERN.test(v) ? "Escribe un email válido." : "";
    error.textContent = msg;
    input.classList.toggle("is-invalid", Boolean(msg));
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  };
  input.addEventListener("input", () => { if (input.classList.contains("is-invalid")) check(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!check()) { input.focus(); return; }
    const token = await window.TasteboxLoading.run(
      { title: "Recuperar contraseña", text: "Espere un momento, estamos enviando el enlace a su correo" },
      () => window.TasteboxPasswordReset.createReset(input.value)
    );
    const demo = document.getElementById("forgot-demo");
    demo.hidden = !(DEMO && token);
    if (token) document.getElementById("forgot-link").href = "restablecer.html?token=" + token;
    dialog.showModal();
  });
})();
