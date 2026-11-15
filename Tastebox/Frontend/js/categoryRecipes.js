(async () => {
  const params = new URLSearchParams(window.location.search);
  const searchTerm = (params.get("search") || "").trim();
  const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const byId = (id) => document.getElementById(id);
  const Catalog = window.TasteboxCatalog;
  const Categories = window.TasteboxCategories;
  const esc = Catalog.escapeHtml;
  const Ui = window.TasteboxUi;
  const FEATURED_COUNT = 6;
  const GENERIC_PREMIUM = { name: "Receta premium", difficulty_level: 1, minutes: 20, rating: 4, verified: 0, image: null };

  let recipes;
  try {
    recipes = await Catalog.load();
  } catch (error) {
    byId("category-title").textContent = "No pudimos cargar las recetas";
    byId("category-intro").textContent = error.message;
    return;
  }

  const buildSearch = () => {
    const words = norm(searchTerm).split(/\s+/).filter(Boolean);
    const hits = [];
    recipes.filter((r) => !r.is_premium).forEach((r) => {
      const inName = norm(r.name);
      const all = norm([r.name, r.cuisine_type, Catalog.levelLabel(r.difficulty_level), Catalog.ingredientList(r).join(" "), r.description || ""].join(" "));
      if (!words.every((w) => all.includes(w))) return;
      hits.push({ rank: words.every((w) => inName.includes(w)) ? 0 : 1, recipe: r });
    });
    hits.sort((a, b) => a.rank - b.rank);
    const found = hits.map((h) => h.recipe);
    return {
      label: `Resultados para “${searchTerm}”`,
      icon: "fa-solid fa-magnifying-glass",
      intro: found.length
        ? `Encontramos ${found.length} ${found.length === 1 ? "receta" : "recetas"} que coinciden con tu búsqueda.`
        : "No encontramos recetas con esa búsqueda. Prueba con otra palabra (nombre, ingrediente o categoría) o explora las categorías.",
      featured: found.slice(0, FEATURED_COUNT),
      more: found.slice(FEATURED_COUNT),
      premium: [],
      isSearch: true,
    };
  };

  const buildCategory = (info) => {
    const own = recipes.filter((r) => norm(r.cuisine_type) === norm(info.label));
    const open = own.filter((r) => !r.is_premium);
    const premium = own.filter((r) => r.is_premium);
    return {
      label: info.label,
      icon: info.icon,
      intro: info.intro,
      featured: open.slice(0, FEATURED_COUNT),
      more: open.slice(FEATURED_COUNT),
      premium: premium.length ? premium : Array.from({ length: 3 }, () => GENERIC_PREMIUM),
    };
  };

  const info = Categories.byKey(params.get("category"));
  const category = info ? buildCategory(info) : (searchTerm ? buildSearch() : null);

  if (!category) {
    window.location.replace("recipeCategories.html");
    return;
  }

  const cardHTML = (recipe, locked = false) => {
    const { name, minutes, image, verified } = recipe;
    const level = Catalog.levelLabel(recipe.difficulty_level);
    const label = recipe.cuisine_type || category.label;
    const rating = Catalog.ratingOf(recipe);
    const media = image
      ? `<img src="../img/${esc(image)}" alt="${esc(name)}" loading="lazy">`
      : `${Ui.placeholderHtml(category.icon)}`;
    const stars = Ui.starsHtml(rating);
    const check = Ui.verifiedBadgeHtml();

    return `
      <article class="card">
        ${media}
        <div class="card__tags">
          <span>${level}</span><span>${esc(label)}</span>
          ${Ui.minutesHtml(minutes)}
        </div>
        <h3><a href="recipeDetail.html?recipe=${encodeURIComponent(name)}">${esc(name)}</a></h3>
        <div class="card__foot">
          ${verified ? `<div class="rating">${stars}${check}</div>` : stars}
          <button class="add" aria-label="Agregar ${esc(name)}" ${image && !locked ? `data-recipe="${esc(name)}" data-img="../img/${esc(image)}"` : ""}>+</button>
        </div>
      </article>`;
  };

  const fallbackImages = (container) => {
    container.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        Ui.swapImageForPlaceholder(img, category.icon);
      });
    });
  };

  document.title = `${category.label} | TasteBox`;
  byId("category-title").textContent = category.label;
  byId("category-intro").textContent = category.intro;

  const track = byId("featured-track");
  const grid = byId("more-grid");
  const locked = byId("locked-grid");

  track.innerHTML = category.featured.map((r) => cardHTML(r)).join("");
  grid.innerHTML = category.more.map((r) => cardHTML(r)).join("");
  locked.innerHTML = category.premium.map((r) => cardHTML(r, true)).join("");

  [track, grid, locked].forEach(fallbackImages);

  if (category.isSearch) {
    byId("featured-title").textContent = "Resultados";
    if (!category.featured.length) byId("featured-title").parentElement.hidden = true;
    byId("more-title").parentElement.querySelector(".locked").hidden = true;
    byId("more-title").parentElement.querySelector(".see-more").hidden = true;
    if (!category.more.length) byId("more-title").hidden = true;
  }

  const box = byId("featured");
  const prev = box.querySelector(".recipes__arrow--prev");
  const next = box.querySelector(".recipes__arrow--next");
  const cards = [...track.children];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;
  let timer = null;

  const { MOBILE_MAX_WIDTH_PX, RECIPE_CAROUSEL_MS } = window.TasteboxConfig;
  const perView = () => (window.innerWidth <= MOBILE_MAX_WIDTH_PX ? 1 : 3);
  const maxIndex = () => Math.max(0, cards.length - perView());

  const update = () => {
    if (!cards.length) return;
    index = Math.min(index, maxIndex());
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.style.transform = `translateX(${-index * (cards[0].offsetWidth + gap)}px)`;
  };

  const goNext = () => { index = index >= maxIndex() ? 0 : index + 1; update(); };
  const goPrev = () => { index = index <= 0 ? maxIndex() : index - 1; update(); };

  const start = () => { if (!reduceMotion && !timer && cards.length > perView()) timer = setInterval(goNext, RECIPE_CAROUSEL_MS); };
  const stop = () => { clearInterval(timer); timer = null; };

  prev.addEventListener("click", () => { goPrev(); stop(); start(); });
  next.addEventListener("click", () => { goNext(); stop(); start(); });
  box.addEventListener("mouseenter", stop);
  box.addEventListener("mouseleave", start);
  box.addEventListener("focusin", stop);
  box.addEventListener("focusout", start);
  window.addEventListener("resize", update);

  update();
  start();

  const form = byId("search-form");
  if (searchTerm) form.elements.q.value = searchTerm;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = form.elements.q.value.trim();
    if (!query) {
      form.elements.q.focus();
      return;
    }
    window.location.href = `categoryRecipes.html?search=${encodeURIComponent(query)}`;
  });
})();
