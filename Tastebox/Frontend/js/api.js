(() => {
  const { API_URL, FREE_PLAN_ID } = window.TasteboxConfig;

  const request = async (path, { method = "GET", body } = {}) => {
    let response;
    try {
      response = await fetch(API_URL + path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      const networkError = new Error("No se pudo conectar con el servidor. Intenta de nuevo.");
      networkError.network = true;
      throw networkError;
    }
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = new Error((data && data.error) || "Ocurrió un error inesperado.");
      apiError.status = response.status;
      throw apiError;
    }
    return data;
  };

  window.TasteboxApi = {
    login: async (email, password) => {
      const { user } = await request("/sessions", { method: "POST", body: { email, password } });
      return user;
    },
    register: (email, password) =>
      request("/users", {
        method: "POST",
        body: { email, password, subscription_id_subscription: FREE_PLAN_ID },
      }),
    getUsers: () => request("/users"),
    getUser: (id) => request(`/users/${id}`),
    updateUser: (id, data) => request(`/users/${id}`, { method: "PUT", body: data }),
    changePassword: (id, currentPassword, newPassword) =>
      request(`/users/${id}/password`, { method: "PUT", body: { currentPassword, newPassword } }),

    getRecipes: () => request("/recipes"),
    getRecipe: (id) => request(`/recipes/${id}`),
    createRecipe: (data) => request("/recipes", { method: "POST", body: data }),
    updateRecipe: (id, data) => request(`/recipes/${id}`, { method: "PUT", body: data }),
    deleteRecipe: (id) => request(`/recipes/${id}`, { method: "DELETE" }),

    getReviews: (recipeId) => request(`/reviews/recipe/${recipeId}`),
    getUserReviews: (userId) => request(`/reviews/user/${userId}`),
    getReview: (id) => request(`/reviews/${id}`),
    createReview: (data) => request("/reviews", { method: "POST", body: data }),
    updateReview: (id, data) => request(`/reviews/${id}`, { method: "PUT", body: data }),
    deleteReview: (id) => request(`/reviews/${id}`, { method: "DELETE" }),

    getSavedRecipes: (userId) => request(`/saved-recipes/user/${userId}`),
    saveRecipe: (data) => request("/saved-recipes", { method: "POST", body: data }),
    unsaveRecipe: (recipeId, userId) => request(`/saved-recipes/${recipeId}/${userId}`, { method: "DELETE" }),

    getCollections: (userId) => request(`/collections/user/${userId}`),
    getCollection: (id) => request(`/collections/${id}`),
    createCollection: (data) => request("/collections", { method: "POST", body: data }),
    updateCollection: (id, data) => request(`/collections/${id}`, { method: "PUT", body: data }),
    deleteCollection: (id) => request(`/collections/${id}`, { method: "DELETE" }),
    addRecipeToCollection: (collectionId, recipeId) =>
      request(`/collections/${collectionId}/recipes`, { method: "POST", body: { recipe_id_recipe: recipeId } }),
    removeRecipeFromCollection: (collectionId, recipeId) =>
      request(`/collections/${collectionId}/recipes/${recipeId}`, { method: "DELETE" }),

    getSubscriptions: () => request("/subscriptions"),
  };
})();
