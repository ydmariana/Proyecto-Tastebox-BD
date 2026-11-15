(() => {
  "use strict";

  const HTTP_CONFLICT = 409;
  const HTTP_NOT_FOUND = 404;

  const requireUserId = () => {
    const current = window.TasteboxSession.get();
    if (!current) throw new Error("Inicia sesión para guardar recetas.");
    return current.id;
  };

  const resolveRecipeId = async (recipeName) => {
    const recipe = await window.TasteboxCatalog.findByName(recipeName);
    if (!recipe) throw new Error("Esta receta aún no está disponible para guardar.");
    return recipe.id_recipe;
  };

  const ignoreStatus = (status) => (error) => {
    if (error.status !== status) throw error;
  };

  const add = async (recipeName) => {
    const userId = requireUserId();
    const recipeId = await resolveRecipeId(recipeName);
    await window.TasteboxApi.saveRecipe({ recipe_id_recipe: recipeId, user_id_user: userId }).catch(ignoreStatus(HTTP_CONFLICT));
  };

  const remove = async (recipeName) => {
    const userId = requireUserId();
    const recipe = await window.TasteboxCatalog.findByName(recipeName);
    if (!recipe) return;
    await window.TasteboxApi.unsaveRecipe(recipe.id_recipe, userId).catch(ignoreStatus(HTTP_NOT_FOUND));
  };

  const listNames = async () => {
    const saved = await window.TasteboxApi.getSavedRecipes(requireUserId());
    return new Map(saved.map((recipe) => [window.TasteboxCatalog.normalize(recipe.name), recipe.name]));
  };

  window.TasteboxSaved = { add, remove, listNames };
})();
