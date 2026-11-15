(() => {
  const session = () => (window.TasteboxSession && window.TasteboxSession.get()) || null;

  const recipesByName = new Map();
  const loadCatalog = async () => {
    (await window.TasteboxCatalog.load()).forEach((recipe) => recipesByName.set(window.TasteboxCatalog.normalize(recipe.name), recipe));
  };

  const findRecipe = (name) => {
    const recipe = recipesByName.get(window.TasteboxCatalog.normalize(name));
    if (!recipe) return null;
    const category = window.TasteboxCategories.forRecipe(recipe);
    return { image: recipe.image || "", categoryKey: category.key, categoryLabel: category.label, icon: category.icon };
  };

  let server = [];

  const load = async () => {
    const current = session();
    server = [];
    if (!current) return server;
    const [catalog, mine] = await Promise.allSettled([loadCatalog(), window.TasteboxApi.getUserReviews(current.id)]);
    if (mine.status === "fulfilled") {
      server = mine.value.map((row) => {
        const r = window.TasteboxReviews.fromApi(row, current.id);
        const info = findRecipe(r.recipe) || {};
        return { ...r, image: info.image || "", categoryKey: info.categoryKey || "", categoryLabel: info.categoryLabel || "", icon: info.icon || window.TasteboxCategories.DEFAULT_ICON };
      });
    }
    const failure = [mine, catalog].find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    return server;
  };

  const reviews = () => [...server].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const parseDate = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return new Date(y, m - 1, d); };

  const weekId = (d) => {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return Math.round(monday.getTime() / 604800000);
  };

  const streak = (today = new Date()) => {
    const weeks = new Set(reviews().map((r) => weekId(parseDate(r.date))));
    let count = 0;
    let w = weekId(today);
    if (!weeks.has(w)) w -= 1;
    while (weeks.has(w)) { count++; w--; }
    return count;
  };

  window.TasteboxActividad = { reviews, load, parseDate, streak };
})();
