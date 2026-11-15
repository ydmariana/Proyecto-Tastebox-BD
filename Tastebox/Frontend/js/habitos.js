(async () => {
  if (window.TasteboxSession && !window.TasteboxSession.get()) { window.location.replace("login.html"); return; }

  const layout = document.querySelector(".profile-main") || document.querySelector("main");
  let clearError = () => {};
  const fetchActivity = async () => {
    clearError();
    try {
      await window.TasteboxActividad.load();
    } catch (error) {
      clearError = window.TasteboxNotice.show(layout.firstElementChild || layout, `No pudimos cargar tus hábitos. ${error.message}`, () => window.location.reload());
    }
  };
  await fetchActivity();

  const MONTHS = window.TasteboxUi.MONTH_NAMES;
  const { reviews, parseDate } = window.TasteboxActividad;
  const byId = (id) => document.getElementById(id);
  const esc = window.TasteboxUi.escapeHtml;
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  const cooked = reviews();
  const days = new Set(cooked.map((r) => r.date));
  const today = new Date();

  const streak = window.TasteboxActividad.streak(today);
  byId("hb-streak").textContent = streak;
  byId("hb-streak-label").textContent = streak === 1 ? "Semana de racha" : "Semanas de racha";

  const thisMonth = cooked.filter((r) => { const d = parseDate(r.date); return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(); });
  byId("hb-month").textContent = new Set(thisMonth.map((r) => r.recipe)).size;
  byId("hb-cats").textContent = new Set(cooked.map((r) => r.categoryKey).filter(Boolean)).size;

  let year = today.getFullYear();
  let month = today.getMonth();
  const cal = byId("hb-cal");
  const renderCal = () => {
    byId("hb-month-label").textContent = `${MONTHS[month]} ${year}`;
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    let html = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<span class="hb-cal__dow" role="columnheader">${d}</span>`).join("");
    html += '<span class="hb-cal__blank"></span>'.repeat(lead);
    for (let d = 1; d <= total; d++) {
      const on = days.has(iso(year, month, d));
      const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
      html += `<span class="hb-cal__day${on ? " is-on" : ""}${isToday ? " is-today" : ""}" role="gridcell"${on ? ' aria-label="' + d + ' de ' + MONTHS[month] + ': cocinaste"' : ""}>${d}</span>`;
    }
    cal.innerHTML = html;
  };
  const move = (delta) => { month += delta; if (month < 0) { month = 11; year--; } if (month > 11) { month = 0; year++; } renderCal(); };
  byId("hb-prev").addEventListener("click", () => move(-1));
  byId("hb-next").addEventListener("click", () => move(1));
  renderCal();

  const counts = {};
  cooked.forEach((r) => {
    if (!r.categoryKey) return;
    (counts[r.categoryKey] = counts[r.categoryKey] || { label: r.categoryLabel, icon: r.icon, n: 0 }).n++;
  });
  const top = Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 4);
  byId("hb-types").innerHTML = top.length
    ? top.map((t) => `<li class="hb-type"><span class="hb-type__n">${t.n}</span><span class="hb-type__icon" aria-hidden="true">${window.TasteboxUi.iconHtml(t.icon)}</span><span class="hb-type__label">${esc(t.label)}</span></li>`).join("")
    : '<li class="hb-empty">Aún no hay recetas cocinadas. Deja una reseña en una receta para empezar tu racha.</li>';
})();
