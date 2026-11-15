(() => {
  "use strict";

  const api = window.Tastebox;
  const title = document.getElementById("col-title");
  const grid = document.getElementById("col-grid");
  const empty = document.getElementById("col-empty");
  if (!api || !grid) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { location.replace("colecciones.html"); return; }

  const Ui = window.TasteboxUi;
  const esc = Ui.escapeHtml;

  const catalog = window.TasteboxCatalog;
  const recipesById = new Map();
  const find = (recipeId) => {
    const recipe = recipesById.get(recipeId);
    return recipe ? { recipe, category: window.TasteboxCategories.forRecipe(recipe), locked: Boolean(recipe.is_premium) } : null;
  };

  let collection = null;
  let loadFailed = false;

  function card({ recipe, category, locked }, onRemove) {
    const { name, minutes, image, verified } = recipe;
    const level = catalog.levelLabel(recipe.difficulty_level);
    const rating = catalog.ratingOf(recipe);
    const a = document.createElement("article");
    a.className = "ccard";
    const pic = document.createElement("div");
    pic.className = "ccard__pic";
    const img = new Image();
    img.alt = name;
    img.loading = "lazy";
    img.addEventListener("error", () => { img.remove(); pic.classList.add("is-noimg"); });
    if (image) { img.src = "../img/" + image; pic.append(img); } else pic.classList.add("is-noimg");

    const body = document.createElement("div");
    body.className = "ccard__body";
    const label = locked ? esc(name) : '<a href="recipeDetail.html?recipe=' + encodeURIComponent(name) + '">' + esc(name) + "</a>";
    body.innerHTML =
      '<div class="card__tags"><span>' + esc(level) + "</span><span>" + esc(category.label) + "</span>" +
      Ui.minutesHtml(minutes) + "</div>" +
      "<h3>" + label + "</h3>" +
      '<div class="card__foot">' +
      '<div class="rating">' + Ui.starsHtml(rating) +
      (verified ? Ui.verifiedBadgeHtml() : "") + "</div>" +
      '<button type="button" class="add" aria-label="Quitar ' + esc(name) + ' de la colección" title="Quitar de la colección">×</button>' +
      "</div>";
    body.querySelector(".add").addEventListener("click", () => onRemove(recipe.id_recipe));
    a.append(pic, body);
    return a;
  }

  function showMessage(html) {
    grid.replaceChildren();
    empty.hidden = false;
    empty.innerHTML = html;
  }

  function render() {
    if (loadFailed) {
      title.textContent = "Colección";
      showMessage('No se pudo cargar la colección. Revisa tu conexión e <a href="">intenta de nuevo</a>.');
      return;
    }
    if (!collection) {
      title.textContent = "Colección no encontrada";
      showMessage('Esa colección no existe. <a href="colecciones.html">Volver a Mis colecciones</a>');
      return;
    }
    title.textContent = collection.name;
    document.title = collection.name + " | TasteBox";

    const found = collection.recipeIds.map(find).filter(Boolean);
    grid.replaceChildren(...found.map((f) => card(f, quitar)));

    empty.hidden = found.length > 0;
    if (!found.length) {
      empty.innerHTML = 'Aún no hay recetas en esta colección. Agrégalas con el botón + desde <a href="recipeCategories.html">Recetas</a>.';
    }
  }

  async function quitar(recipeId) {
    if (!(await api.removeRecipe(collection.id, recipeId))) return;
    render();
    api.toast("Receta quitada de «" + collection.name + "»");
  }

  (async () => {
    try {
      (await catalog.load()).forEach((recipe) => recipesById.set(recipe.id_recipe, recipe));
      collection = (await api.load()).find((c) => String(c.id) === id) || null;
    } catch (error) {
      loadFailed = true;
      api.toast(error.message, "error");
    }
    render();
  })();
})();
