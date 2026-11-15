(() => {
  "use strict";

  const normalize = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

  let cachedRecipes = null;

  const load = async () => {
    if (!cachedRecipes) {
      cachedRecipes = window.TasteboxApi.getRecipes().catch((error) => { cachedRecipes = null; throw error; });
    }
    return cachedRecipes;
  };

  const refresh = () => { cachedRecipes = null; return load(); };

  const findByName = async (name) => {
    const recipes = await load();
    return recipes.find((recipe) => normalize(recipe.name) === normalize(name)) || null;
  };

  const levelLabel = (value) => (Number(value) <= 2 ? "Fácil" : Number(value) === 3 ? "Intermedio" : "Difícil");

  const ingredientList = (recipe) => (recipe && recipe.ingredients
    ? String(recipe.ingredients).split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    : []);

  const ratingOf = (recipe) => Number(recipe && recipe.rating) || 0;

  const escapeHtml = window.TasteboxUi.escapeHtml;

  window.TasteboxCatalog = { normalize, load, refresh, findByName, levelLabel, ingredientList, ratingOf, escapeHtml };
})();
