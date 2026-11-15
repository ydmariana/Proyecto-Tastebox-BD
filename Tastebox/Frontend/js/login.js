(() => {
  const form = document.getElementById("login-form");
  if (!form) return;

  const dialog = document.getElementById("login-error");
  const dialogText = document.getElementById("login-error-text");
  const okDialog = document.getElementById("login-ok");
  const { REDIRECT_MS } = window.TasteboxConfig;
  const HTTP_UNAUTHORIZED = 401;
  const INVALID_CREDENTIALS_TEXT = "La contraseña o el email son incorrectos, intente de nuevo";
  const fields = [
    {
      input: document.getElementById("email"),
      error: document.getElementById("email-error"),
      check: (v) => {
        if (!v) return "Escribe tu email.";
        if (!window.TasteboxConfig.EMAIL_PATTERN.test(v)) return "Escribe un email válido.";
        return "";
      },
    },
    {
      input: document.getElementById("password"),
      error: document.getElementById("password-error"),
      check: (v) => (v ? "" : "Escribe tu contraseña."),
    },
  ];
  const [emailField, passwordField] = fields;

  const authenticate = async (email, password) => {
    try {
      return { user: await window.TasteboxApi.login(email, password) };
    } catch (error) {
      return { error };
    }
  };

  const setError = ({ input, error }, message) => {
    error.textContent = message;
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  const validate = (field) => {
    const message = field.check(field.input.value.trim());
    setError(field, message);
    return !message;
  };

  fields.forEach((field) => {
    field.input.addEventListener("input", () => {
      if (field.input.classList.contains("is-invalid")) validate(field);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const results = fields.map(validate);
    const firstInvalid = fields.find((_, i) => !results[i]);

    if (firstInvalid) {
      firstInvalid.input.focus();
      return;
    }

    form.querySelector(".form__submit").disabled = true;
    const result = await window.TasteboxLoading.run(
      { title: "Bienvenido a tastebox", text: "Espere un momento, estamos verificando sus datos" },
      () => authenticate(emailField.input.value.trim(), passwordField.input.value)
    );
    if (result.user) {
      okDialog.showModal();
      setTimeout(() => {
        window.TasteboxSession.login(result.user);
        window.location.href = "index.html";
      }, REDIRECT_MS);
      return;
    }
    form.querySelector(".form__submit").disabled = false;
    dialogText.textContent = result.error.status === HTTP_UNAUTHORIZED ? INVALID_CREDENTIALS_TEXT : result.error.message;
    dialog.showModal();
  });

  okDialog.addEventListener("cancel", (e) => e.preventDefault());

  dialog.addEventListener("close", () => {
    passwordField.input.value = "";
    passwordField.input.focus();
  });
})();
