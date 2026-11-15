(() => {
  const KEY = "tastebox-session";

  const ROLE_ADMIN = 1;

  const session = {
    adminRole: ROLE_ADMIN,
    get() {
      try {
        const stored = JSON.parse(localStorage.getItem(KEY));
        return stored && Number.isInteger(stored.id) ? stored : null;
      } catch (_) {
        return null;
      }
    },
    isAdmin() {
      const current = this.get();
      return Boolean(current && current.role === ROLE_ADMIN);
    },
    login(user) {
      const data = { id: user.id_user, email: user.email, role: user.role, subscriptionId: user.subscription_id_subscription };
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {  }
    },
    update(changes) {
      const current = this.get();
      if (!current) return;
      try { localStorage.setItem(KEY, JSON.stringify({ ...current, ...changes })); } catch (_) {  }
    },
    logout() {
      try { localStorage.removeItem(KEY); } catch (_) {  }
    },
  };
  window.TasteboxSession = session;

  let logoutDialog = null;
  const buildLogoutDialog = () => {
    const d = document.createElement("dialog");
    d.className = "modal modal--ok";
    d.setAttribute("aria-labelledby", "logout-title");
    d.innerHTML =
      '<h2 class="modal__title" id="logout-title">Cerrar sesión</h2>' +
      '<p class="modal__text">¿Estás seguro de que quieres cerrar sesión?</p>' +
      '<div class="modal__actions">' +
      '<button type="button" class="modal__btn" data-confirm>Confirmar</button>' +
      '<button type="button" class="modal__btn modal__btn--ghost" data-cancel autofocus>Cancelar</button>' +
      "</div>";
    d.querySelector("[data-cancel]").addEventListener("click", () => d.close());
    d.querySelector("[data-confirm]").addEventListener("click", async () => {
      d.close();
      if (window.TasteboxLoading) {
        await window.TasteboxLoading.run({ title: "Hasta pronto", text: "Espere un momento, estamos cerrando su sesión" }, () => {}, 1500);
      }
      session.logout();
      window.location.href = "index.html";
    });
    document.body.appendChild(d);
    return d;
  };
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-logout]");
    if (!trigger) return;
    e.preventDefault();
    if (!logoutDialog) logoutDialog = buildLogoutDialog();
    logoutDialog.showModal();
  });

  const link = document.getElementById("auth-link");
  if (!session.get()) return;

  const updateFooter = () => {
    const accountTitle = [...document.querySelectorAll(".footer h4")].find((h) => h.textContent.trim() === "Mi cuenta");
    if (!accountTitle) return;
    accountTitle.parentElement.innerHTML =
      "<h4>Mi cuenta</h4>" +
      '<a href="perfil.html">Mi perfil</a>' +
      '<a href="colecciones.html">Mis colecciones</a>' +
      '<a href="suscripcion.html">Mi suscripción</a>' +
      '<a href="datos.html">Datos personales</a>' +
      '<a href="index.html" data-logout>Cerrar sesión</a>';
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", updateFooter);
  else updateFooter();

  if (!link) return;

  link.className = "profile";
  link.href = "perfil.html";
  link.title = "Mi perfil";
  link.setAttribute("aria-label", "Mi perfil");
  link.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' +
    '<circle cx="8" cy="9" r="3.6"/><circle cx="12" cy="7" r="4"/><circle cx="16" cy="9" r="3.6"/>' +
    '<rect x="7" y="9" width="10" height="6"/><rect x="7" y="16" width="10" height="4.5" rx="1"/></svg>';
})();
