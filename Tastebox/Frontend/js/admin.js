(() => {
  "use strict";

  const PAGE_STEP = 4;
  const { TOAST_MS } = window.TasteboxConfig;
  const LEVELS = [
    { label: "Fácil", value: 1 },
    { label: "Intermedio", value: 3 },
    { label: "Difícil", value: 5 },
  ];
  const {
    NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, CUISINE_MAX_LENGTH,
    MINUTES_MAX, IMAGE_MAX_LENGTH, INGREDIENTS_MAX_LENGTH,
  } = window.TasteboxConfig.RECIPE_LIMITS;

  const ICON = {
    chef: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M7.5 14.5A3.8 3.8 0 0 1 7 7a4.4 4.4 0 0 1 7.8-1.4A3.8 3.8 0 0 1 17.5 14.5"/><path d="M7.5 14.5h10V20h-10z"/><path d="M10 17h5"/></svg>',
    plate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  };

  const api = window.TasteboxApi;
  const session = window.TasteboxSession;
  const byId = (id) => document.getElementById(id);
  const usersBody = byId("users-body");
  if (!usersBody) return;

  if (!session.get()) {
    window.location.replace("login.html");
    return;
  }
  if (!session.isAdmin()) {
    window.location.replace("perfil.html");
    return;
  }

  const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const levelLabel = (value) => (value <= 2 ? "Fácil" : value === 3 ? "Intermedio" : "Difícil");
  const levelValue = (label) => LEVELS.find((level) => level.label === label).value;

  const FIRST_RECIPES = ["Tortilla española", "Pancakes", "Brownies", "Tamal peruano"];

  let users = [];  let recipes = [];
  let usersError = "";
  const planNames = new Map();
  let visibleUsers = PAGE_STEP;
  let visibleRecipes = PAGE_STEP;

  const showToast = (text, isError = false) => {
    const toast = document.createElement("div");
    toast.className = `toast is-visible${isError ? " toast--error" : ""}`;
    toast.setAttribute("role", "status");
    const message = document.createElement("p");
    message.className = "toast__text";
    message.textContent = text;
    toast.append(message);
    document.body.append(toast);
    setTimeout(() => toast.remove(), TOAST_MS);
  };

  const paintPicture = (box, recipe) => {
    box.replaceChildren();
    const showPlate = () => {
      box.replaceChildren();
      box.innerHTML = ICON.plate;
    };
    if (!recipe.image) {
      showPlate();
      return;
    }
    const image = new Image();
    image.alt = recipe.name;
    image.loading = "lazy";
    image.addEventListener("error", showPlate);
    image.src = `../img/${recipe.image}`;
    box.append(image);
  };

  const buildTags = (recipe) => {
    const labels = [levelLabel(recipe.difficulty_level), recipe.cuisine_type];
    if (recipe.minutes) labels.push(`${recipe.minutes} min`);
    return labels.map((label) => {
      const tag = document.createElement("span");
      tag.textContent = label;
      return tag;
    });
  };

  const showFailure = (error) => showToast(error.message, true);

  const roleLabel = (user) => (user.role === session.adminRole ? "Administrador" : "Usuario");

  const showUsersMessage = (text) => {
    usersBody.innerHTML = '<tr><td colspan="5" class="empty"></td></tr>';
    usersBody.querySelector(".empty").textContent = text;
    byId("users-more").hidden = true;
  };

  const renderUsers = () => {
    if (users.length === 0) {
      showUsersMessage(usersError || "Todavía no hay usuarios registrados.");
      return;
    }
    usersBody.replaceChildren(...users.slice(0, visibleUsers).map((user) => {
      const isAdmin = user.role === session.adminRole;
      const row = document.createElement("tr");
      row.innerHTML = '<td></td><td><span class="avatar"></span></td><td><span class="cell-email"></span></td><td><span class="badge"></span></td><td></td>';
      const cells = row.children;
      cells[0].textContent = user.id_user;
      cells[1].firstChild.innerHTML = ICON.chef;
      cells[2].firstChild.textContent = user.email;
      cells[2].firstChild.title = user.email;
      cells[3].firstChild.textContent = roleLabel(user);
      cells[3].firstChild.className = "badge " + (isAdmin ? "badge--on" : "badge--user");
      cells[4].textContent = planNames.get(user.subscription_id_subscription) || "-";
      return row;
    }));
    byId("users-more").hidden = visibleUsers >= users.length;
  };
  byId("users-more").addEventListener("click", () => {
    visibleUsers += PAGE_STEP;
    renderUsers();
  });

  const filterInputs = [byId("f-text"), byId("f-tipo"), byId("f-dif")];
  const recipesBody = byId("recipes-body");

  const fillCuisineOptions = () => {
    const cuisines = [...new Set(recipes.map((recipe) => recipe.cuisine_type))].sort((a, b) => a.localeCompare(b, "es"));
    const selector = byId("f-tipo");
    const current = selector.value;
    selector.replaceChildren(new Option("Tipo de cocina", ""), ...cuisines.map((cuisine) => new Option(cuisine, cuisine)));
    selector.value = cuisines.includes(current) ? current : "";
    byId("tipos").replaceChildren(...cuisines.map((cuisine) => new Option(cuisine)));
  };

  const filteredRecipes = () => {
    const query = normalize(byId("f-text").value.trim());
    const cuisine = byId("f-tipo").value;
    const level = byId("f-dif").value;
    return recipes.filter((recipe) =>
      normalize(recipe.name).includes(query)
      && (!cuisine || recipe.cuisine_type === cuisine)
      && (!level || levelLabel(recipe.difficulty_level) === level));
  };

  const buildActionButton = (kind, label, icon, handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `act act--${kind}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon;
    button.addEventListener("click", handler);
    return button;
  };

  const renderRecipes = () => {
    const matches = filteredRecipes();
    recipesBody.replaceChildren();
    if (matches.length === 0) {
      recipesBody.innerHTML = '<tr><td colspan="6" class="empty">No hay recetas que coincidan.</td></tr>';
    }
    matches.slice(0, visibleRecipes).forEach((recipe) => {
      const row = document.createElement("tr");
      row.innerHTML = '<td><div class="thumb"></div></td><td class="is-left"></td><td></td><td></td><td></td><td><div class="actions"></div></td>';
      const cells = row.children;
      paintPicture(cells[0].firstChild, recipe);
      cells[1].textContent = recipe.name;
      cells[2].textContent = recipe.cuisine_type;
      cells[3].textContent = levelLabel(recipe.difficulty_level);
      cells[4].textContent = recipe.minutes ? `${recipe.minutes} minutos` : "-";
      cells[5].firstChild.append(
        buildActionButton("view", "Ver receta", ICON.eye, () => openView(recipe)),
        buildActionButton("edit", "Editar receta", ICON.pencil, () => openForm(recipe)),
        buildActionButton("del", "Eliminar receta", ICON.trash, () => openDelete(recipe)),
      );
      recipesBody.append(row);
    });
    byId("recipes-more").hidden = visibleRecipes >= matches.length;
  };

  const refreshRecipes = async () => {
    const loaded = await window.TasteboxCatalog.refresh();
    const rank = (recipe) => {
      const index = FIRST_RECIPES.findIndex((name) => normalize(name) === normalize(recipe.name));
      return index === -1 ? FIRST_RECIPES.length : index;
    };
    recipes = [...loaded].sort((a, b) => rank(a) - rank(b));    fillCuisineOptions();
    renderRecipes();
  };

  filterInputs.forEach((input) => input.addEventListener("input", () => {
    visibleRecipes = PAGE_STEP;
    renderRecipes();
  }));
  byId("recipes-more").addEventListener("click", () => {
    visibleRecipes += PAGE_STEP;
    renderRecipes();
  });

  const viewDialog = byId("view-dialog");
  const openView = (recipe) => {
    paintPicture(byId("view-pic"), recipe);
    byId("view-tags").replaceChildren(...buildTags(recipe));
    byId("view-name").textContent = recipe.name;
    byId("view-stars").hidden = !recipe.rating;
    if (recipe.rating) byId("view-stars").style.setProperty("--rating", Math.round(recipe.rating));
    const link = byId("view-link");
    link.hidden = Boolean(recipe.is_premium);
    link.href = `recipeDetail.html?recipe=${encodeURIComponent(recipe.name)}`;
    viewDialog.showModal();
  };
  byId("view-close").addEventListener("click", () => viewDialog.close());

  const formDialog = byId("form-dialog");
  const confirmDialog = byId("ok-dialog");
  const form = byId("recipe-form");
  let editingRecipe = null;

  const openForm = (recipe) => {
    editingRecipe = recipe || null;
    formDialog.classList.toggle("is-add", !recipe);
    formDialog.setAttribute("aria-label", recipe ? "Editar receta" : "Agregar receta");
    form.reset();
    Object.values(form.elements).forEach((field) => field.classList && field.classList.remove("is-invalid"));
    if (recipe) {
      form.elements.name.value = recipe.name;
      form.elements.description.value = recipe.description || "";
      form.elements.difficulty.value = levelLabel(recipe.difficulty_level);
      form.elements.cuisineType.value = recipe.cuisine_type;
      form.elements.minutes.value = recipe.minutes || 0;
      form.elements.image.value = recipe.image || "";
      form.elements.ingredients.value = recipe.ingredients || "";
    }
    formDialog.showModal();
    form.elements.name.focus();
  };
  byId("add-recipe").addEventListener("click", () => openForm(null));
  byId("form-close").addEventListener("click", () => formDialog.close());

  formDialog.querySelectorAll(".pen").forEach((button) => button.addEventListener("click", () => {
    form.elements[button.dataset.f].focus();
  }));

  const readForm = () => ({
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    cuisineType: form.elements.cuisineType.value.trim(),
    level: form.elements.difficulty.value,
    minutes: form.elements.minutes.value.trim(),
    image: form.elements.image.value.trim(),
    ingredients: form.elements.ingredients.value.trim(),
  });

  const isSafeImagePath = (value) => !value.includes("..") && !value.includes("\\") && !value.startsWith("/") && !value.includes(":");

  const validateForm = (values) => {
    const checks = [
      ["name", values.name.length > 0 && values.name.length <= NAME_MAX_LENGTH],
      ["description", values.description.length > 0 && values.description.length <= DESCRIPTION_MAX_LENGTH],
      ["cuisineType", values.cuisineType.length > 0 && values.cuisineType.length <= CUISINE_MAX_LENGTH],
      ["minutes", values.minutes === "" || (/^\d+$/.test(values.minutes) && Number(values.minutes) <= MINUTES_MAX)],
      ["image", values.image.length <= IMAGE_MAX_LENGTH && isSafeImagePath(values.image)],
      ["ingredients", values.ingredients.length <= INGREDIENTS_MAX_LENGTH],
    ];
    checks.forEach(([field, valid]) => form.elements[field].classList.toggle("is-invalid", !valid));
    return checks.every(([, valid]) => valid);
  };

  const persistRecipe = async () => {
    const values = readForm();
    const payload = {
      name: values.name,
      description: values.description,
      cuisine_type: values.cuisineType,
      difficulty_level: levelValue(values.level),
      minutes: values.minutes === "" ? 0 : Number(values.minutes),
      image: values.image || null,
      ingredients: values.ingredients || null,
    };
    if (editingRecipe) payload.preparation_date = editingRecipe.preparation_date;
    try {
      if (editingRecipe) await api.updateRecipe(editingRecipe.id_recipe, payload);
      else await api.createRecipe(payload);
      await refreshRecipes();
    } catch (error) {
      confirmDialog.close();
      showFailure(error);
      return;
    }
    showToast(editingRecipe ? "Receta modificada con éxito" : "Receta añadida con éxito");
    confirmDialog.close();
    formDialog.close();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(readForm())) {
      showToast("Revisa los campos marcados", true);
      return;
    }
    if (editingRecipe) confirmDialog.showModal();
    else persistRecipe();
  });
  byId("ok-yes").addEventListener("click", persistRecipe);
  byId("ok-no").addEventListener("click", () => confirmDialog.close());

  const deleteDialog = byId("del-dialog");
  let recipeToDelete = null;

  const openDelete = (recipe) => {
    recipeToDelete = recipe;
    byId("del-name").textContent = recipe.name;
    paintPicture(byId("del-pic"), recipe);
    byId("del-tags").replaceChildren(...buildTags(recipe));
    byId("del-card-name").textContent = recipe.name;
    byId("del-stars").hidden = !recipe.rating;
    if (recipe.rating) byId("del-stars").style.setProperty("--rating", Math.round(recipe.rating));
    deleteDialog.showModal();
  };
  byId("del-cancel").addEventListener("click", () => deleteDialog.close());
  byId("del-ok").addEventListener("click", async () => {
    try {
      await api.deleteRecipe(recipeToDelete.id_recipe);
      await refreshRecipes();
    } catch (error) {
      deleteDialog.close();
      showToast(error.status === 409
        ? "No se puede eliminar: la receta tiene reseñas o está guardada por usuarios"
        : error.message, true);
      return;
    }
    deleteDialog.close();
    showToast("Receta eliminada con éxito");
  });

  [viewDialog, formDialog, deleteDialog, confirmDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  }));

  const loadPanel = async () => {
    try {
      const [loadedUsers, subscriptions] = await Promise.all([api.getUsers(), api.getSubscriptions()]);
      users = loadedUsers;
      subscriptions.forEach((subscription) => planNames.set(subscription.id_subscription, subscription.name));
    } catch (error) {
      usersError = error.message;
    }
    renderUsers();
    try {
      await refreshRecipes();
    } catch (error) {
      recipesBody.innerHTML = '<tr><td colspan="6" class="empty"></td></tr>';
      recipesBody.querySelector(".empty").textContent = error.message;
    }
  };
  loadPanel();
})();
