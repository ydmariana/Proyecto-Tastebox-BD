(() => {
  "use strict";

  const FLASH_KEY = "tastebox.plan-aviso";
  const DAY_MS = 86400000;
  const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const STAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';

  const { TasteboxSession: session, TasteboxPlans: plans, TasteboxApi: api, TasteboxLoading: loading } = window;

  const formatDate = (date) => `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  const addOneMonth = (date) => {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(date.getDate(), lastDay));
    return next;
  };

  const describeDates = (user) => {
    if (user.subscription_renews_at) return `se renueva el ${formatDate(new Date(user.subscription_renews_at))}`;
    if (!user.subscription_expires_at) return "";
    const days = Math.ceil((new Date(user.subscription_expires_at) - Date.now()) / DAY_MS);
    if (days > 1) return `vence en ${days} días`;
    return days === 1 ? "vence en 1 día" : "vence hoy";
  };

  const formatPrice = (amount) => `$${amount.toLocaleString("es-CO")}/mes`;

  const showToast = (text) => {
    const toast = document.createElement("div");
    toast.className = "toast is-visible";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    const paragraph = document.createElement("p");
    paragraph.className = "toast__text";
    paragraph.textContent = text;
    toast.append(paragraph);
    toast.insertAdjacentHTML("beforeend", CHECK_ICON);
    document.body.append(toast);
    setTimeout(() => toast.remove(), window.TasteboxConfig.TOAST_MS);
  };

  const storeNotice = (text) => {
    try { sessionStorage.setItem(FLASH_KEY, text); } catch (_) {  }
  };

  const takeNotice = () => {
    try {
      const text = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
      return text;
    } catch (_) {
      return null;
    }
  };

  const buildPlanCard = (plan, { badge = "", action = null } = {}) => {
    const card = document.createElement("article");
    card.className = `plan plan--${plan.key}`;

    if (badge) {
      const badgeElement = document.createElement("span");
      badgeElement.className = "plan__badge";
      badgeElement.textContent = badge;
      card.append(badgeElement);
    }

    const head = document.createElement("div");
    head.className = "plan__head";
    const name = document.createElement("h2");
    name.className = "plan__name";
    name.textContent = plan.name;
    const price = document.createElement("span");
    price.className = "plan__price";
    price.textContent = formatPrice(plan.price);
    head.append(name, price);

    const features = document.createElement("ul");
    features.className = "plan__features";
    plan.features.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      features.append(item);
    });

    card.append(head, features);
    if (action) card.append(action);
    return card;
  };

  const buildActionButton = (plan, currentPlan) => {
    if (currentPlan && plan.id === currentPlan.id) {
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = true;
      button.textContent = "Plan actual";
      button.className = "plan__btn";
      return button;
    }
    const link = document.createElement("a");
    link.className = "plan__btn";
    if (currentPlan) {
      link.href = `cambio-plan.html?plan=${plan.id}`;
      link.textContent = `Cambiar a ${plan.name}`;
    } else {
      link.href = "login.html";
      link.textContent = "Iniciar sesión";
    }
    return link;
  };

  const setCurrentPlanLabel = (text, withIcon) => {
    const pill = document.getElementById("current-plan");
    pill.innerHTML = withIcon ? `${STAR_ICON}<span></span>` : "<span></span>";
    pill.lastChild.textContent = text;
  };

  const plansBox = document.getElementById("plans");

  const renderSubscriptionPage = async () => {
    plansBox.replaceChildren();
    try {
      const availablePlans = await plans.list();
      const subscription = session.get() ? await plans.getCurrentSubscription() : null;
      const currentPlan = subscription ? subscription.plan : null;

      if (currentPlan) {
        const when = describeDates(subscription.user);
        setCurrentPlanLabel(when ? `${currentPlan.name} – ${when}` : currentPlan.name, true);
      } else {
        setCurrentPlanLabel("Inicia sesión para ver y cambiar tu plan", false);
      }

      availablePlans.forEach((plan) => {
        const badge = plan.key === "premium" ? "Recomendado" : "";
        plansBox.append(buildPlanCard(plan, { badge, action: buildActionButton(plan, currentPlan) }));
      });
    } catch (error) {
      setCurrentPlanLabel(error.message, false);
      window.TasteboxNotice.show(plansBox, error.message, renderSubscriptionPage);
    }
  };

  if (plansBox) {
    renderSubscriptionPage();
    const notice = takeNotice();
    if (notice) setTimeout(() => showToast(notice), 200);
    window.addEventListener("pageshow", (event) => { if (event.persisted) renderSubscriptionPage(); });
  }

  const targetBox = document.getElementById("target-plan");

  const changePlan = async (userId, newPlan) => {
    const user = await api.getUser(userId);
    await api.updateUser(userId, { email: user.email, subscription_id_subscription: newPlan.id });
    session.update({ subscriptionId: newPlan.id });
  };

  const setupChangePage = async () => {
    const current = session.get();
    const confirmButton = document.getElementById("confirm-btn");
    try {
      const [availablePlans, currentPlan] = await Promise.all([plans.list(), plans.getCurrent()]);
      const requestedId = Number(new URLSearchParams(location.search).get("plan"));
      const newPlan = availablePlans.find((plan) => plan.id === requestedId) || availablePlans.find((plan) => plan.id !== currentPlan.id);

      if (!newPlan || newPlan.id === currentPlan.id) {
        location.replace("suscripcion.html");
        return;
      }

      const today = new Date();
      document.getElementById("change-text").textContent = `Estás a punto de pasar de ${currentPlan.name} a ${newPlan.name}`;
      targetBox.append(buildPlanCard(newPlan));
      document.getElementById("since-date").textContent = formatDate(today);
      document.getElementById("next-charge").textContent = newPlan.price > 0 ? formatDate(addOneMonth(today)) : "Sin cobros";

      confirmButton.addEventListener("click", async () => {
        confirmButton.disabled = true;
        const outcome = await loading.run(
          { title: "Cambio de plan", text: "Espere un momento, estamos actualizando su suscripción" },
          () => changePlan(current.id, newPlan).then(() => ({}), (error) => ({ error }))
        );
        if (outcome.error) {
          confirmButton.disabled = false;
          showToast(outcome.error.message);
          return;
        }
        storeNotice("Plan actualizado con éxito");
        location.href = "suscripcion.html";
      });

      document.getElementById("cancel-btn").addEventListener("click", () => storeNotice("Cambio de plan cancelado"));
    } catch (error) {
      confirmButton.disabled = true;
      showToast(error.message);
    }
  };

  if (targetBox && !session.get()) location.replace("login.html");
  else if (targetBox) setupChangePage();
})();
