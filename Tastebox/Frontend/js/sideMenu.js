(() => {
  const OPEN_KEY = "tastebox.menu-abierto";
  const { MOBILE_MAX_WIDTH_PX } = window.TasteboxConfig;

  const svg = (d) =>
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";

  const ITEMS = [
    { id: "perfil", href: "perfil.html", label: "Mi perfil", icon: svg('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>') },
    { id: "colecciones", href: "colecciones.html", label: "Mis colecciones", icon: svg('<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>') },
    { id: "resenas", href: "resenas.html", label: "Mis reseñas", icon: svg('<path d="M3 5h8a1 1 0 0 1 1 1v14a3 3 0 0 0-3-3H3z"/><path d="M21 5h-8a1 1 0 0 0-1 1v14a3 3 0 0 1 3-3h6z"/>') },
    { id: "habitos", href: "habitos.html", label: "Mis hábitos", icon: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>') },
    { id: "datos", href: "datos.html", label: "Datos personales", icon: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>') },
    { id: "admin", href: "administracion.html", label: "Panel de admin.", icon: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>') },
    { id: "mensuales", href: "#", label: "Recetas mensuales", icon: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>') },
  ];
  const LOGOUT_ICON = svg('<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>');
  const BARS_ICON = svg('<path d="M4 6h16M4 12h16M4 18h16"/>').replace('stroke-width="2"', 'stroke-width="2.4"');
  const CHEF_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="9" r="3.6"/><circle cx="12" cy="7" r="4"/><circle cx="16" cy="9" r="3.6"/><rect x="7" y="9" width="10" height="6"/><rect x="7" y="16" width="10" height="4.5" rx="1"/></svg>';

  const slot = document.getElementById("side-slot");
  if (!slot) return;
  const current = slot.dataset.current;

  const sesion = window.TasteboxSession && window.TasteboxSession.get();
  const email = sesion && sesion.email ? sesion.email : "";
  let profile = null;

  const side = document.createElement("aside");
  side.className = "side";
  side.id = "side";
  side.innerHTML =
    '<button class="side__toggle" id="side-toggle" type="button" aria-expanded="true" aria-controls="side-menu" aria-label="Mostrar u ocultar el menú">' + BARS_ICON + "</button>" +
    '<div class="side__avatar" id="side-avatar">' + CHEF_ICON + "</div>" +
    '<p class="side__name" id="user-name"></p>' +
    '<div class="side__panel" id="side-menu"><nav class="side__inner" aria-label="Menú de perfil"><ul>' +
    ITEMS.filter((it) => it.id !== "admin" || (window.TasteboxSession && window.TasteboxSession.isAdmin())).map((it) =>
      '<li><a href="' + it.href + '"' + (it.id === "mensuales" ? ' data-monthly aria-haspopup="dialog"' : "") + ' class="side__link' + (it.id === current ? ' is-current" aria-current="page' : "") + '">' +
      it.icon + "<span>" + it.label + "</span></a></li>"
    ).join("") +
    '</ul><a href="index.html" class="side__link side__logout" data-logout>' + LOGOUT_ICON + "<span>Cerrar Sesión</span></a></nav></div>";

  const paintUser = (user) => {
    if (user) profile = user;
    side.querySelector("#user-name").textContent = window.TasteboxProfile.displayName(profile, email);
    const avatarBox = side.querySelector("#side-avatar");
    if (profile && profile.photo) {
      avatarBox.innerHTML = "";
      const img = document.createElement("img");
      img.src = profile.photo;
      img.alt = "";
      avatarBox.append(img);
    }
  };
  paintUser();
  if (sesion) {
    window.TasteboxProfile.load().then((user) => paintUser(user)).catch(() => {
      side.querySelector("#user-name").title = "No pudimos cargar tu nombre y tu foto. Recarga la página para intentar de nuevo.";
    });
  }

  const readOpen = () => {
    try {
      const v = localStorage.getItem(OPEN_KEY);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch (_) {  }
    return window.innerWidth > MOBILE_MAX_WIDTH_PX;
  };
  const setOpen = (open, remember) => {
    side.classList.toggle("is-open", open);
    side.querySelector("#side-toggle").setAttribute("aria-expanded", String(open));
    if (remember) { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch (_) {  } }
  };
  setOpen(readOpen(), false);
  side.querySelector("#side-toggle").addEventListener("click", () => setOpen(!side.classList.contains("is-open"), true));

  let card = null;
  const closeCard = () => { if (card) { card.remove(); card = null; } };
  const countRecipesCookedThisMonth = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rows = await window.TasteboxApi.getUserReviews(sesion.id);
    return new Set(rows.filter((row) => String(row.date).startsWith(month)).map((row) => row.recipe_id_recipe)).size;
  };

  const openCard = async (anchor) => {
    let plan = null;
    let used = 0;
    let failed = false;
    try {
      plan = await window.TasteboxPlans.getCurrent();
      if (plan && plan.monthlyRecipeLimit !== null) used = await countRecipesCookedThisMonth();
    } catch (_) { failed = true; }
    closeCard();
    card = document.createElement("div");
    card.className = "monthly-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Recetas mensuales");
    const title = document.createElement("h3");
    const detail = document.createElement("p");
    if (failed || !plan) {
      title.textContent = "No pudimos cargar tu plan";
      detail.textContent = "Revisa tu conexión e intenta de nuevo.";
    } else if (plan.monthlyRecipeLimit === null) {
      title.textContent = "Este mes tienes recetas ilimitadas";
      detail.textContent = "Disfruta de todo el catálogo de tastebox.";
    } else {
      const left = Math.max(0, plan.monthlyRecipeLimit - used);
      title.textContent = left === 0
        ? `Ya usaste tus ${plan.monthlyRecipeLimit} recetas de este mes`
        : `Este mes tienes ${left} ${left === 1 ? "receta disponible" : "recetas disponibles"}`;
      const link = document.createElement("a");
      link.href = "cambio-plan.html";
      link.textContent = "Cámbiate a premium";
      detail.append(link, ` para ampliar tu catálogo (${Math.min(used, plan.monthlyRecipeLimit)} de ${plan.monthlyRecipeLimit} usadas)`);
    }
    card.append(title, detail);
    document.body.append(card);
    const anchorRect = anchor.getBoundingClientRect();
    const sideRect = side.getBoundingClientRect();
    if (window.innerWidth > MOBILE_MAX_WIDTH_PX) {
      card.style.left = sideRect.right + 12 + "px";
      card.style.top = Math.max(8, anchorRect.top - 8) + "px";
    } else {
      card.style.left = "1rem";
      card.style.right = "1rem";
      card.style.top = anchorRect.bottom + 6 + "px";
    }
  };
  side.addEventListener("click", (e) => {
    const monthlyLink = e.target.closest("[data-monthly]");
    if (!monthlyLink) return;
    e.preventDefault();
    e.stopPropagation();
    if (card) closeCard(); else openCard(monthlyLink);
  });
  document.addEventListener("click", (e) => { if (card && !card.contains(e.target)) closeCard(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });
  window.addEventListener("scroll", closeCard, { passive: true });
  window.addEventListener("resize", closeCard);

  slot.replaceWith(side);

  window.TasteboxSideMenu = { refresh: paintUser };
})();
