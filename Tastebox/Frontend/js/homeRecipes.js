(async () => {
  "use strict";

  const track = document.querySelector("#recipes .recipes__track");
  if (!track) return;

  const Catalog = window.TasteboxCatalog;
  const Categories = window.TasteboxCategories;
  const esc = Catalog.escapeHtml;
  const Ui = window.TasteboxUi;
  const FEATURED_COUNT = 6;

  const pickFeatured = (recipes) => recipes
    .filter((recipe) => !recipe.is_premium && recipe.image)
    .sort((a, b) => (Number(b.verified) - Number(a.verified)) || (Catalog.ratingOf(b) - Catalog.ratingOf(a)) || (a.id_recipe - b.id_recipe))
    .slice(0, FEATURED_COUNT);

  const cardHTML = (recipe) => {
    const { name, minutes, image, verified } = recipe;
    const icon = Categories.forRecipe(recipe).icon;
    const stars = Ui.starsHtml(Catalog.ratingOf(recipe));
    const check = Ui.verifiedBadgeHtml();
    return `
      <article class="card">
        <img src="../img/${esc(image)}" alt="${esc(name)}" loading="lazy" data-icon="${icon}">
        <div class="card__tags">
          <span>${Catalog.levelLabel(recipe.difficulty_level)}</span><span>${esc(recipe.cuisine_type)}</span>
          ${Ui.minutesHtml(minutes)}
        </div>
        <h3><a href="recipeDetail.html?recipe=${encodeURIComponent(name)}">${esc(name)}</a></h3>
        <div class="card__foot">
          ${verified ? `<div class="rating">${stars}${check}</div>` : stars}
          <button class="add" aria-label="Agregar ${esc(name)}" data-recipe="${esc(name)}" data-img="../img/${esc(image)}">+</button>
        </div>
      </article>`;
  };

  const showMessage = (text) => {
    track.innerHTML = `<p class="recipes__empty">${esc(text)}</p>`;
    document.querySelectorAll("#recipes .recipes__arrow").forEach((arrow) => { arrow.hidden = true; });
  };

  try {
    const featured = pickFeatured(await Catalog.load());
    if (!featured.length) return showMessage("Aún no hay recetas disponibles.");
    track.innerHTML = featured.map(cardHTML).join("");
    track.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
      Ui.swapImageForPlaceholder(img, img.dataset.icon);
    }));
  } catch (error) {
    return showMessage(error.message);
  } finally {
    document.dispatchEvent(new CustomEvent("tastebox:recipes-ready"));
  }
})();
