(() => {
  if (window.TasteboxSession && !window.TasteboxSession.get()) { window.location.replace("login.html"); return; }

  const FIRST = 3, STEP = 3;
  const esc = window.TasteboxUi.escapeHtml;
  const formatDate = (iso) => window.TasteboxUi.formatLongDate(window.TasteboxActividad.parseDate(iso));

  let all = [];
  const FILTERS = [
    { id: "todas", label: "Todas", test: () => true },
    { id: "comentarios", label: "Con comentarios", test: (r) => r.text.trim().length > 0 },
    { id: "calificacion", label: "Solo calificación", test: (r) => r.text.trim().length === 0 },
    { id: "etiquetas", label: "Con etiquetas", test: (r) => r.tags.length > 0 },
  ];
  let filter = "todas";
  let visible = FIRST;

  const filtersEl = document.getElementById("rv-filters");
  const listEl = document.getElementById("rv-list");
  const moreEl = document.getElementById("rv-more");

  const reviewActions = (r) => r.fromServer ? `<div class="rv__actions"><button type="button" class="rv__btn" data-edit="${r.id}">Editar</button><button type="button" class="rv__btn rv__btn--danger" data-delete="${r.id}">Eliminar</button></div>` : "";

  const card = (r) => window.TasteboxUi.reviewCardHtml(r, formatDate(r.date), reviewActions(r));

  const render = () => {
    const activeFilter = FILTERS.find((option) => option.id === filter);
    const rows = all.filter(activeFilter.test);
    filtersEl.innerHTML = FILTERS.map((option) =>
      `<button type="button" class="rv-pill${option.id === filter ? " is-on" : ""}" data-f="${option.id}" aria-pressed="${option.id === filter}">${option.label} (${all.filter(option.test).length})</button>`).join("");
    if (!rows.length) {
      listEl.innerHTML = `<p class="rv-empty">${all.length
        ? "No tienes reseñas en esta categoría."
        : "Aún no has dejado reseñas. Prepara una receta y cuéntanos qué tal te fue."}</p>`;
    } else {
      listEl.innerHTML = rows.slice(0, visible).map(card).join("");
    }
    moreEl.hidden = visible >= rows.length;
  };

  filtersEl.addEventListener("click", (e) => {
    const filterButton = e.target.closest("[data-f]");
    if (!filterButton) return;
    filter = filterButton.dataset.f;
    visible = FIRST;
    render();
  });
  moreEl.addEventListener("click", () => { visible += STEP; render(); });

  const api = window.TasteboxApi;
  const byServerId = (id) => all.find((r) => r.fromServer && r.id === Number(id));
  const reload = async () => { await window.TasteboxActividad.load(); all = window.TasteboxActividad.reviews(); render(); };

  let dialog = null;
  const editDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "modal modal--ok";
    dialog.setAttribute("aria-labelledby", "rv-edit-title");
    dialog.innerHTML =
      '<h2 class="modal__title" id="rv-edit-title">Editar reseña</h2>' +
      '<form class="rv-edit" novalidate>' +
      '<label>Calificación<select name="rating">' + [5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} ${n === 1 ? "estrella" : "estrellas"}</option>`).join("") + "</select></label>" +
      '<label>Tu experiencia (opcional)<textarea name="text" rows="4" maxlength="255"></textarea></label>' +
      '<label>¿Volverías a cocinarla?<select name="cook"><option value="1">Sí</option><option value="0">No</option></select></label>' +
      '<p class="form__status" role="status" data-status></p>' +
      '<div class="modal__actions"><button type="submit" class="modal__btn">Guardar</button><button type="button" class="modal__btn modal__btn--ghost" data-cancel>Cancelar</button></div>' +
      "</form>";
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    document.body.appendChild(dialog);
    return dialog;
  };

  const openEdit = (review) => {
    const d = editDialog();
    const form = d.querySelector("form");
    const status = d.querySelector("[data-status]");
    form.elements.rating.value = String(review.rating || 5);
    form.elements.text.value = review.text;
    form.elements.cook.value = review.cook ? "1" : "0";
    status.textContent = "";
    form.onsubmit = async (event) => {
      event.preventDefault();
      const text = form.elements.text.value.trim();
      try {
        await api.updateReview(review.id, window.TasteboxReviews.toApi(
          { ...review, rating: Number(form.elements.rating.value), text, cook: form.elements.cook.value === "1" },
          review.userId, review.recipeId));
        d.close();
        await reload();
      } catch (error) { status.textContent = error.message; }
    };
    d.showModal();
  };

  listEl.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    if (edit) { const r = byServerId(edit.dataset.edit); if (r) openEdit(r); return; }
    if (!del) return;
    const r = byServerId(del.dataset.delete);
    if (!r || !window.confirm("¿Eliminar esta reseña?")) return;
    try { await api.deleteReview(r.id); await reload(); } catch (error) { window.alert(error.message); }
  });

  let clearError = () => {};
  const fetchReviews = async () => {
    clearError();
    listEl.innerHTML = '<p class="rv-empty" role="status">Cargando tus reseñas…</p>';
    moreEl.hidden = true;
    try {
      await window.TasteboxActividad.load();
    } catch (error) {
      clearError = window.TasteboxNotice.show(listEl, `No pudimos cargar tus reseñas. ${error.message}`, fetchReviews);
    }
    all = window.TasteboxActividad.reviews();
    render();
  };
  fetchReviews();
})();
