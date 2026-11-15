(() => {
  "use strict";

  const splitTags = (tags) => (tags ? String(tags).split(",").map((t) => t.trim()).filter(Boolean) : []);

  const fromApi = (row, sessionId) => ({
    id: row.id_review,
    recipeId: row.recipe_id_recipe,
    userId: row.user_id_user,
    user: sessionId && row.user_id_user === sessionId ? "Tú" : row.user_name || "Usuario",
    recipe: row.recipe_name,
    date: String(row.date).slice(0, 10),
    rating: Number(row.rating) || 0,
    text: row.comments || "",
    cook: Boolean(row.cook_it_again),
    tags: splitTags(row.tags),
    fromServer: true,
  });

  const toApi = (review, userId, recipeId) => ({
    date: review.date,
    tags: review.tags.length ? review.tags.join(", ") : null,
    comments: review.text || null,
    rating: review.rating || null,
    cook_it_again: review.cook ? 1 : 0,
    user_id_user: userId,
    recipe_id_recipe: recipeId,
  });

  window.TasteboxReviews = { fromApi, toApi, splitTags };
})();
