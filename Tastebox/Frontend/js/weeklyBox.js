(async () => {
  "use strict";

  const grid = document.querySelector(".weekly-grid");
  if (!grid) return;

  const Catalog = window.TasteboxCatalog;
  const Categories = window.TasteboxCategories;
  const esc = Catalog.escapeHtml;
  const Ui = window.TasteboxUi;
  const BOX_SIZE = 3;
  const MAX_INGREDIENTS = 8;
  const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const nextMonday = (from) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    date.setDate(date.getDate() + (((8 - date.getDay()) % 7) || 7));
    return date;
  };
  const weekNumber = (date) => Math.floor(date.getTime() / (7 * 24 * 3600 * 1000));

  const today = new Date();
  const expires = nextMonday(today);
  const dateLabel = document.querySelector(".weekly-box__date");
  if (dateLabel) dateLabel.textContent = `Vigente hasta el ${DAYS[expires.getDay()]} ${expires.getDate()} de ${MONTHS[expires.getMonth()]}`;

  const pickBox = (recipes) => {
    const eligible = recipes.filter((r) => !r.is_premium && r.image && Catalog.ingredientList(r).length);
    if (!eligible.length) return [];
    const start = (weekNumber(today) * BOX_SIZE) % eligible.length;
    return Array.from({ length: Math.min(BOX_SIZE, eligible.length) }, (_, i) => eligible[(start + i) % eligible.length]);
  };

  const weeklyHTML = (recipe) => {
    const { name, minutes, image } = recipe;
    const icon = Categories.forRecipe(recipe).icon;
    const items = Catalog.ingredientList(recipe).slice(0, MAX_INGREDIENTS).map((item) => `<li>${esc(item)}</li>`).join("");
    return `
      <article class="weekly">
        <div class="card weekly__card">
          <img src="../img/${esc(image)}" alt="${esc(name)}" loading="lazy" data-icon="${icon}">
          <div class="card__tags"><span>${Catalog.levelLabel(recipe.difficulty_level)}</span><span>${esc(recipe.cuisine_type)}</span>${Ui.minutesHtml(minutes)}</div>
          <h3><a href="recipeDetail.html?recipe=${encodeURIComponent(name)}">${esc(name)}</a></h3>
          <div class="card__foot">${Ui.starsHtml(Catalog.ratingOf(recipe))}<button class="add" aria-label="Agregar ${esc(name)}" data-recipe="${esc(name)}" data-img="../img/${esc(image)}">+</button></div>
        </div>
        <div class="weekly__list"><span>Incluye:</span><ul>${items}</ul></div>
      </article>`;
  };

  try {
    const box = pickBox(await Catalog.load());
    grid.innerHTML = box.length ? box.map(weeklyHTML).join("") : "<p>Aún no hay recetas para la caja de esta semana.</p>";
    grid.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
      Ui.swapImageForPlaceholder(img, img.dataset.icon);
    }));
  } catch (error) {
    grid.innerHTML = `<p>${esc(error.message)}</p>`;
  }
})();
