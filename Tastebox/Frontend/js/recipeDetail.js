(async () => {
  const FIRST_PAGE = 2;
  const PAGE_STEP = 3;
  const MAX_TAGS = 3;
  const MAX_CHARS = 255;

  const byId = (id) => document.getElementById(id);
  const Ui = window.TasteboxUi;
  const esc = Ui.escapeHtml;

  const requested = new URLSearchParams(window.location.search).get("recipe");
  const Catalog = window.TasteboxCatalog;

  let recipe = null;
  try {
    recipe = requested ? await Catalog.findByName(requested) : null;
  } catch (error) {
    byId("recipe-name").textContent = "No pudimos cargar la receta";
    byId("recipe-description").textContent = error.message;
    return;
  }

  if (!recipe || recipe.is_premium) {
    window.location.replace("recipeCategories.html");
    return;
  }

  const name = recipe.name;
  const level = Catalog.levelLabel(recipe.difficulty_level);
  const minutes = Number(recipe.minutes) || 0;
  const rating = Catalog.ratingOf(recipe);
  const verified = Boolean(recipe.verified);
  const image = recipe.image;
  const category = window.TasteboxCategories.forRecipe(recipe);
  const ingredients = Catalog.ingredientList(recipe);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Ui.formatLongDate(new Date(y, m - 1, d));
  };
  const todayISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const sessionNow = () => (window.TasteboxSession && window.TasteboxSession.get()) || null;
  const recipeId = recipe.id_recipe;

  let reviews = [];
  let reviewsState = "loading";
  let sort = "recent";
  let visible = FIRST_PAGE;

  document.title = `${name} | TasteBox`;
  byId("crumb-name").textContent = name;
  byId("recipe-name").textContent = name;
  if (verified) byId("recipe-verified").hidden = false;

  byId("recipe-media").innerHTML = image
    ? `<img src="../img/${esc(image)}" alt="${esc(name)}">`
    : `${Ui.placeholderHtml(category.icon, "recipe__placeholder")}`;
  const media = byId("recipe-media").querySelector("img");
  if (media) {
    media.addEventListener("error", () => {
      byId("recipe-media").innerHTML = `${Ui.placeholderHtml(category.icon, "recipe__placeholder")}`;
    });
  }

  byId("recipe-level").textContent = level;
  byId("recipe-kind").textContent = category.label;
  byId("recipe-time").textContent = `${minutes}'`;
  byId("recipe-description").textContent = recipe.description
    || `${name} es una receta de ${category.label.toLowerCase()} de nivel ${level.toLowerCase()} que puedes preparar en ${minutes} minutos.`;

  byId("ingredients").innerHTML = ingredients.length
    ? ingredients.map((item) => `<li>${esc(item)}</li>`).join("")
    : `<li class="ingredients__empty">Los ingredientes de esta receta estarán disponibles pronto.</li>`;

  const sorted = () => {
    const list = [...reviews];
    if (sort === "best") return list.sort((a, b) => b.rating - a.rating);
    if (sort === "worst") return list.sort((a, b) => a.rating - b.rating);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const stars = (value) => Ui.starsHtml(value, "rating-stars");

  const reviewHTML = (r) => `
    <article class="review">
      <div class="review__user">
        <span class="review__avatar" aria-hidden="true">${esc(r.user.charAt(0).toUpperCase())}</span>
        <strong>${esc(r.user)}</strong>
        <small>${formatDate(r.date)}</small>
      </div>
      <div class="review__body">
        <div class="review__head">${stars(r.rating)}<b>${Number(r.rating).toFixed(1)}</b></div>
        ${r.text ? `<p>${esc(r.text)}</p>` : ""}
        <div class="review__meta">
          ${Ui.cookAnswerHtml(r.cook, "review__cook")}
          ${r.tags.map((tag) => `<span class="review__tag">${esc(tag)}</span>`).join("")}
        </div>
      </div>
    </article>`;

  const renderReviews = () => {
    const list = sorted();
    const average = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;

    byId("reviews-stars").innerHTML = stars(list.length ? average.toFixed(1) : rating);
    byId("reviews-score").textContent = list.length
      ? `${average.toFixed(1)}/5 (${list.length} ${list.length === 1 ? "reseña" : "reseñas"})`
      : reviewsState === "loading" ? "Cargando reseñas…" : reviewsState === "error" ? "Reseñas no disponibles" : "Aún no hay reseñas";

    if (list.length) byId("reviews-list").innerHTML = list.slice(0, visible).map(reviewHTML).join("");
    else if (reviewsState === "loading") byId("reviews-list").innerHTML = `<p class="reviews__empty" role="status">Cargando reseñas…</p>`;
    else if (reviewsState === "error") byId("reviews-list").innerHTML = "";
    else byId("reviews-list").innerHTML = `<p class="reviews__empty">¡Sé la primera persona en reseñar esta receta!</p>`;

    byId("reviews-more").hidden = visible >= list.length;
    byId("reviews-sort").disabled = list.length < 2;
  };

  byId("reviews-sort").addEventListener("change", (event) => {
    sort = event.target.value;
    visible = FIRST_PAGE;
    renderReviews();
  });
  byId("reviews-more").addEventListener("click", () => {
    visible += PAGE_STEP;
    renderReviews();
  });

  const form = byId("review-form");
  const status = byId("review-status");
  const textarea = form.elements.text;
  const counter = byId("review-count");
  const starButtons = [...form.querySelectorAll(".star-input button")];
  const tagButtons = [...form.querySelectorAll(".tag-picker button")];
  const cookButtons = [...form.querySelectorAll(".cook-choice button")];

  let chosenRating = 0;
  let chosenCook = null;

  const paintStars = () => {
    starButtons.forEach((button, i) => {
      const on = i < chosenRating;
      button.firstElementChild.className = on ? "fa-solid fa-star" : "fa-regular fa-star";
      button.setAttribute("aria-checked", String(i + 1 === chosenRating));
    });
  };
  starButtons.forEach((button, i) => button.addEventListener("click", () => { chosenRating = i + 1; paintStars(); }));

  tagButtons.forEach((button) => button.addEventListener("click", () => {
    const active = tagButtons.filter((b) => b.getAttribute("aria-pressed") === "true");
    const isOn = button.getAttribute("aria-pressed") === "true";
    if (!isOn && active.length >= MAX_TAGS) return;
    button.setAttribute("aria-pressed", String(!isOn));
  }));

  cookButtons.forEach((button) => button.addEventListener("click", () => {
    chosenCook = button.dataset.value === "yes";
    cookButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  }));

  textarea.maxLength = MAX_CHARS;
  textarea.addEventListener("input", () => { counter.textContent = `${textarea.value.length}/${MAX_CHARS}`; });

  const showStatus = (message, isError) => {
    status.textContent = message;
    status.className = `form__status${isError ? " is-error" : ""}`;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = textarea.value.trim();

    if (!chosenRating) return showStatus("Elige una calificación de 1 a 5 estrellas.", true);
    if (chosenCook === null) return showStatus("Dinos si volverías a cocinarla.", true);

    const session = sessionNow();
    if (!session) return showStatus("Inicia sesión para dejar una reseña.", true);

    const review = {
      date: todayISO(),
      rating: chosenRating,
      text,
      cook: chosenCook,
      tags: tagButtons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent),
    };

    try {
      const saved = await window.TasteboxApi.createReview(window.TasteboxReviews.toApi(review, session.id, recipeId));
      reviews.unshift(window.TasteboxReviews.fromApi({ ...saved, user_name: "Tú" }, session.id));
      reviewsState = "ready";
      clearReviewsError();
    } catch (error) {
      return showStatus(error.message, true);
    }
    sort = "recent";
    byId("reviews-sort").value = "recent";
    visible = Math.max(visible, FIRST_PAGE);
    renderReviews();

    form.reset();
    chosenRating = 0;
    chosenCook = null;
    paintStars();
    tagButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
    cookButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
    counter.textContent = `0/${MAX_CHARS}`;
    showStatus("¡Gracias por tu reseña!", false);
  });

  paintStars();
  renderReviews();

  let clearReviewsError = () => {};
  const loadReviews = async () => {
    clearReviewsError();
    reviewsState = "loading";
    renderReviews();
    try {
      const current = sessionNow();
      const rows = await window.TasteboxApi.getReviews(recipeId);
      reviews = rows.map((row) => window.TasteboxReviews.fromApi(row, current && current.id));
      reviewsState = "ready";
    } catch (error) {
      reviewsState = "error";
      clearReviewsError = window.TasteboxNotice.show(byId("reviews-list"), `No pudimos cargar las reseñas. ${error.message}`, loadReviews);
    }
    renderReviews();
  };
  loadReviews();

  const search = byId("search-form");
  search.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = search.elements.q.value.trim();
    if (!query) {
      search.elements.q.focus();
      return;
    }
    window.location.href = `categoryRecipes.html?search=${encodeURIComponent(query)}`;
  });
})();
