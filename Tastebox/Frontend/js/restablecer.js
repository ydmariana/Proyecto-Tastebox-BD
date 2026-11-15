(() => {
  const form = document.getElementById("reset-form");
  if (!form) return;
  const token = new URLSearchParams(window.location.search).get("token");
  const passwordReset = window.TasteboxPasswordReset;

  if (!passwordReset.readReset(token)) {
    document.getElementById("reset-invalid").hidden = false;
    return;
  }
  form.hidden = false;

  const passwordInput = document.getElementById("password"), confirmInput = document.getElementById("password2");
  const hint = document.getElementById("password-hint"), confirmError = document.getElementById("password2-error");
  const mark = (input, bad) => { input.classList.toggle("is-invalid", bad); input.setAttribute("aria-invalid", String(bad)); };
  const checkPassword = () => { const bad = !passwordReset.RULE.test(passwordInput.value); hint.classList.toggle("is-error", bad); mark(passwordInput, bad); return !bad; };
  const checkConfirm = () => {
    const msg = !confirmInput.value ? "Confirma tu contraseña." : confirmInput.value !== passwordInput.value ? "Las contraseñas no coinciden." : "";
    confirmError.textContent = msg; mark(confirmInput, Boolean(msg)); return !msg;
  };
  passwordInput.addEventListener("input", () => { if (passwordInput.classList.contains("is-invalid")) checkPassword(); if (confirmInput.classList.contains("is-invalid")) checkConfirm(); });
  confirmInput.addEventListener("input", () => { if (confirmInput.classList.contains("is-invalid")) checkConfirm(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passwordOk = checkPassword(), confirmOk = checkConfirm();
    if (!passwordOk) { passwordInput.focus(); return; }
    if (!confirmOk) { confirmInput.focus(); return; }
    const saved = await window.TasteboxLoading.run(
      { title: "Nueva contraseña", text: "Espere un momento, estamos guardando su nueva contraseña" },
      () => passwordReset.useReset(token, passwordInput.value)
    );
    if (saved) {
      form.querySelector(".form__submit").disabled = true;
      document.getElementById("reset-ok").showModal();
    } else {
      form.hidden = true;
      document.getElementById("reset-invalid").hidden = false;
    }
  });
})();
