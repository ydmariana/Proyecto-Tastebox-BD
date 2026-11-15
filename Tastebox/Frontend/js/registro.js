(() => {
  const form = document.getElementById("register-form");
  if (!form) return;

  const dialog = document.getElementById("register-ok");
  const { REDIRECT_MS } = window.TasteboxConfig;
  const HTTP_CONFLICT = 409;

  const fields = [
    {
      input: document.getElementById("email"),
      error: document.getElementById("email-error"),
      check: (v) => {
        v = v.trim();
        if (!v) return "Escribe tu correo.";
        if (!window.TasteboxConfig.EMAIL_PATTERN.test(v)) return "Escribe un correo válido.";
        return "";
      },
    },
    {
      input: document.getElementById("password"),
      error: document.getElementById("password-hint"),
      keepText: true,
      check: (v) => (/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(v) ? "" : "Error"),
    },
  ];

  const setError = ({ input, error, keepText }, message) => {
    if (keepText) error.classList.toggle("is-error", Boolean(message));
    else error.textContent = message;
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
  };

  const validate = (field) => {
    const message = field.check(field.input.value);
    setError(field, message);
    return !message;
  };

  fields.forEach((field) => {
    field.input.addEventListener("input", () => {
      if (field.input.classList.contains("is-invalid")) validate(field);
    });
  });

  const createAccount = async (email, password) => {
    try {
      await window.TasteboxApi.register(email, password);
      return { user: await window.TasteboxApi.login(email, password) };
    } catch (error) {
      return { error };
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const results = fields.map(validate);
    const firstInvalid = fields.find((_, i) => !results[i]);

    if (firstInvalid) {
      firstInvalid.input.focus();
      return;
    }

    form.querySelector(".form__submit").disabled = true;
    const emailField = fields[0];
    const result = await window.TasteboxLoading.run(
      { title: "Gracias por escogernos", text: "Espere un momento, se está creando su cuenta" },
      () => createAccount(emailField.input.value.trim(), fields[1].input.value)
    );
    if (result.error) {
      form.querySelector(".form__submit").disabled = false;
      setError(emailField, result.error.status === HTTP_CONFLICT ? "Este correo ya está registrado." : result.error.message);
      emailField.input.focus();
      return;
    }
    dialog.showModal();
    setTimeout(() => {
      window.TasteboxSession.login(result.user);
      window.location.href = "index.html";
    }, REDIRECT_MS);
  });

  dialog.addEventListener("cancel", (e) => e.preventDefault());
})();
