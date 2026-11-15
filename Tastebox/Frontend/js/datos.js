(() => {
  const session = window.TasteboxSession && window.TasteboxSession.get();
  if (!session) { window.location.replace("login.html"); return; }

  const api = window.TasteboxApi;
  const byId = (id) => document.getElementById(id);
  const HTTP_CONFLICT = 409;
  const { EMAIL_PATTERN, PHONE_PATTERN } = window.TasteboxConfig;

  const CHEF = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="9" r="3.6"/><circle cx="12" cy="7" r="4"/><circle cx="16" cy="9" r="3.6"/><rect x="7" y="9" width="10" height="6"/><rect x="7" y="16" width="10" height="4.5" rx="1"/></svg>';

  const fields = { username: byId("dp-username"), email: byId("dp-email"), fullName: byId("dp-full-name"), address: byId("dp-address"), phone: byId("dp-phone") };
  const form = byId("dp-form");
  const saveButton = form.querySelector(".dp-save");

  let account = null;
  let avatar = "";
  let clearNotice = () => {};

  const setFormEnabled = (enabled) => {
    Object.values(fields).forEach((input) => { input.disabled = !enabled; });
    saveButton.disabled = !enabled;
    byId("dp-avatar-btn").disabled = !enabled;
  };

  const paintAvatar = () => {
    const box = byId("dp-avatar");
    box.innerHTML = avatar ? "" : CHEF;
    if (avatar) { const img = document.createElement("img"); img.src = avatar; img.alt = ""; box.append(img); }
  };
  const paintName = () => { byId("dp-hero-name").textContent = fields.username.value.trim() || "Usuario"; };
  fields.username.addEventListener("input", paintName);

  const fillForm = (user) => {
    account = user;
    avatar = user.photo || "";
    fields.username.value = user.username || user.email.split("@")[0] || "";
    fields.email.value = user.email;
    fields.fullName.value = user.full_name || "";
    fields.address.value = user.address || "";
    fields.phone.value = user.phone || "";
    paintAvatar();
    paintName();
  };

  const loadAccount = async () => {
    clearNotice();
    setFormEnabled(false);
    status("Cargando tus datos…", false);
    try {
      const [user, plan] = await Promise.all([api.getUser(session.id), window.TasteboxPlans.getCurrent().catch(() => undefined)]);
      fillForm(user);
      byId("dp-plan").value = plan === undefined ? "No disponible" : plan ? plan.name : "—";
      status("", false);
      setFormEnabled(true);
    } catch (error) {
      status("", false);
      clearNotice = window.TasteboxNotice.show(form, error.message, loadAccount);
    }
  };

  byId("dp-avatar-btn").addEventListener("click", () => byId("dp-file").click());
  byId("dp-file").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photo = new Image();
      photo.onload = () => {
        const size = 240, side = Math.min(photo.width, photo.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        canvas.getContext("2d").drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, 0, 0, size, size);
        avatar = canvas.toDataURL("image/jpeg", 0.85);
        paintAvatar();
        status("Foto lista. Pulsa “Guardar Cambios” para conservarla.", false);
      };
      photo.onerror = () => status("No se pudo leer esa imagen. Prueba con otra.", true);
      photo.src = reader.result;
    };
    reader.onerror = () => status("No se pudo leer esa imagen. Prueba con otra.", true);
    reader.readAsDataURL(file);
  });

  const status = (msg, bad) => { const el = byId("dp-status"); el.textContent = msg; el.classList.toggle("is-error", Boolean(bad)); };
  const setErr = (field, id, msg) => { byId(id).textContent = msg; field.classList.toggle("is-invalid", Boolean(msg)); field.setAttribute("aria-invalid", msg ? "true" : "false"); };

  byId("dp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = fields.username.value.trim();
    const mail = fields.email.value.trim();
    const phone = fields.phone.value.trim();
    setErr(fields.username, "dp-username-error", username ? "" : "Escribe un nombre de usuario.");
    const emailValid = EMAIL_PATTERN.test(mail);
    const phoneValid = !phone || PHONE_PATTERN.test(phone);
    setErr(fields.email, "dp-email-error", emailValid ? "" : "Escribe un email válido.");
    setErr(fields.phone, "dp-phone-error", phoneValid ? "" : "Escribe un teléfono válido.");
    const ok = Boolean(username) && emailValid && phoneValid;
    if (!ok) { status("Revisa los campos marcados.", true); return; }
    const outcome = await window.TasteboxLoading.run(
      { title: "Guardando cambios", text: "Espere un momento, estamos actualizando sus datos" },
      () => api.updateUser(session.id, {
        email: mail,
        subscription_id_subscription: account.subscription_id_subscription,
        username,
        full_name: fields.fullName.value.trim(),
        address: fields.address.value.trim(),
        phone,
        photo: avatar,
      }).then((user) => ({ user }), (error) => ({ error }))
    );
    if (outcome.error) {
      if (outcome.error.status === HTTP_CONFLICT) setErr(fields.email, "dp-email-error", outcome.error.message);
      status(outcome.error.message, true);
      return;
    }
    window.TasteboxSession.update({ email: outcome.user.email });
    account = { ...account, ...outcome.user };
    window.TasteboxProfile.set(account);
    if (window.TasteboxSideMenu) window.TasteboxSideMenu.refresh(account);
    status("¡Cambios guardados!", false);
  });

  const passwordRule = window.TasteboxPasswordReset.RULE;
  const HTTP_UNAUTHORIZED = 401;
  const passwordDialog = byId("pw-dialog"), pwForm = byId("pw-form");
  const currentInput = byId("pw-current"), newInput = byId("pw-new"), confirmInput = byId("pw-confirm");
  const mark = (input, bad) => { input.classList.toggle("is-invalid", bad); input.setAttribute("aria-invalid", String(bad)); };
  const msg = (id, input, text) => { byId(id).textContent = text; mark(input, Boolean(text)); return !text; };
  const chkNew = () => { const bad = !passwordRule.test(newInput.value); byId("pw-new-hint").classList.toggle("is-error", bad); mark(newInput, bad); return !bad; };
  const chkConfirm = () => msg("pw-confirm-error", confirmInput, !confirmInput.value ? "Confirma tu nueva contraseña." : confirmInput.value !== newInput.value ? "Las contraseñas no coinciden." : "");

  byId("dp-pass-btn").addEventListener("click", () => {
    pwForm.reset();
    [currentInput, newInput, confirmInput].forEach((i) => mark(i, false));
    ["pw-current-error", "pw-confirm-error"].forEach((id) => { byId(id).textContent = ""; });
    byId("pw-new-hint").classList.remove("is-error");
    passwordDialog.showModal();
  });
  byId("pw-cancel").addEventListener("click", () => passwordDialog.close());
  newInput.addEventListener("input", () => { if (newInput.classList.contains("is-invalid")) chkNew(); if (confirmInput.classList.contains("is-invalid")) chkConfirm(); });
  confirmInput.addEventListener("input", () => { if (confirmInput.classList.contains("is-invalid")) chkConfirm(); });
  currentInput.addEventListener("input", () => { if (currentInput.classList.contains("is-invalid")) msg("pw-current-error", currentInput, ""); });

  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentInput.value) { msg("pw-current-error", currentInput, "Escribe tu contraseña actual."); currentInput.focus(); return; }
    const okNew = chkNew(), okConf = chkConfirm();
    if (!okNew) { newInput.focus(); return; }
    if (!okConf) { confirmInput.focus(); return; }
    if (newInput.value === currentInput.value) { byId("pw-new-hint").classList.add("is-error"); mark(newInput, true); newInput.focus(); return; }

    const outcome = await window.TasteboxLoading.run(
      { title: "Cambiando contraseña", text: "Espere un momento, estamos guardando su nueva contraseña" },
      () => window.TasteboxApi.changePassword(session.id, currentInput.value, newInput.value).then(() => ({}), (error) => ({ error }))
    );
    if (outcome.error) {
      const message = outcome.error.status === HTTP_UNAUTHORIZED ? "La contraseña actual no es correcta." : outcome.error.message;
      msg("pw-current-error", currentInput, message);
      currentInput.focus();
      return;
    }
    passwordDialog.close();
    status("¡Contraseña actualizada!", false);
  });

  loadAccount();
})();
