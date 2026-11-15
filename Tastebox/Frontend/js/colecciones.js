(() => {
  "use strict";

  const FLASH = "tastebox.aviso";
  const HTTP_CONFLICT = 409;
  const HTTP_NOT_FOUND = 404;

  const session = () => (window.TasteboxSession && window.TasteboxSession.get()) || null;
  const api = () => window.TasteboxApi;
  const catalog = () => window.TasteboxCatalog;

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/></svg>',
    plus: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#000"/><path d="M24 12v24M12 24h24" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>',
    image: '<svg viewBox="0 0 48 48" fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M28 8H8v32h32V20"/><path d="M8 34l10-10 8 8 5-5 9 9"/><path d="M38 4v12M32 10h12"/></svg>',
  };

  const coverSrc = (image) => (!image ? "" : /^data:/.test(image) ? image : "../img/" + image);
  const fromApi = (row) => ({
    id: row.id_collection,
    name: row.name,
    img: coverSrc(row.image),
    recipeIds: row.recipe_ids || [],
  });

  let collections = [];

  async function load() {
    const current = session();
    if (!current) {
      collections = [];
      return collections;
    }
    collections = (await api().getCollections(current.id)).map(fromApi);
    return collections;
  }

  let toastEl, toastTimer;
  const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

  function toast(text, type = "ok") {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      if (hasPopover) toastEl.setAttribute("popover", "manual");
      document.body.append(toastEl);
    }
    if (hasPopover && toastEl.matches(":popover-open")) toastEl.hidePopover();
    toastEl.className = "toast" + (type === "error" ? " toast--error" : "");
    toastEl.innerHTML = '<p class="toast__text"></p>' + (type === "error" ? ICON.warn : ICON.check);
    toastEl.firstChild.textContent = text;
    try {
      if (hasPopover) toastEl.showPopover(); else toastEl.classList.add("is-visible");
    } catch (_) {
      toastEl.removeAttribute("popover");
      toastEl.classList.add("is-visible");
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      try {
        if (toastEl.hasAttribute("popover")) toastEl.hidePopover();
      } catch (_) {  }
      toastEl.classList.remove("is-visible");
    }, window.TasteboxConfig.TOAST_MS);
  }

  const quietly = async (task) => {
    try { await task(); } catch (_) {  }
  };

  const markSaved = (recipeName) => quietly(() => window.TasteboxSaved.add(recipeName));

  const unmarkSaved = (recipeIds) => quietly(async () => {
    const recipes = await catalog().load();
    const names = recipeIds.map((id) => (recipes.find((recipe) => recipe.id_recipe === id) || {}).name).filter(Boolean);
    await Promise.all(names.map((name) => window.TasteboxSaved.remove(name)));
  });

  const recipeIdsInOtherCollections = (excludedId) =>
    new Set(collections.filter((c) => c.id !== excludedId).flatMap((c) => c.recipeIds));

  async function removeRecipe(collectionId, recipeId) {
    const target = collections.find((c) => c.id === collectionId);
    if (!target) return false;
    try {
      await api().removeRecipeFromCollection(collectionId, recipeId);
    } catch (error) {
      if (error.status !== HTTP_NOT_FOUND) {
        toast(error.message, "error");
        return false;
      }
    }
    target.recipeIds = target.recipeIds.filter((id) => id !== recipeId);
    if (!recipeIdsInOtherCollections(collectionId).has(recipeId)) await unmarkSaved([recipeId]);
    return true;
  }

  async function removeCollection(target) {
    try {
      await api().deleteCollection(target.id);
    } catch (error) {
      if (error.status !== HTTP_NOT_FOUND) {
        toast(error.message, "error");
        return false;
      }
    }
    collections = collections.filter((c) => c.id !== target.id);
    const stillSaved = new Set(collections.flatMap((c) => c.recipeIds));
    await unmarkSaved(target.recipeIds.filter((id) => !stillSaved.has(id)));
    return true;
  }

  let dlg, coverBtn, fileInput, nameInput, okBtn, ctx, busy = false;

  const resizeImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const im = new Image();
      im.onerror = reject;
      im.onload = () => {
        const scale = Math.min(1, 400 / Math.max(im.width, im.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(im.width * scale);
        canvas.height = Math.round(im.height * scale);
        canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  function setCover(src) {
    coverBtn.replaceChildren();
    if (src) {
      const img = new Image();
      img.alt = "";
      img.addEventListener("error", () => { coverBtn.innerHTML = ICON.plus; });
      img.src = src;
      coverBtn.append(img);
    } else {
      coverBtn.innerHTML = ICON.plus;
    }
  }

  function buildDialog() {
    dlg = document.createElement("dialog");
    dlg.className = "name-dialog";
    dlg.setAttribute("aria-label", "Nueva colección");
    dlg.innerHTML =
      '<form class="name-dialog__form" novalidate>' +
        '<button type="button" class="name-dialog__cover" aria-label="Elegir imagen de portada"></button>' +
        '<input type="file" accept="image/*" hidden>' +
        '<input type="text" class="name-dialog__name" placeholder="Ingrese el nombre…" maxlength="40" autocomplete="off" aria-label="Nombre de la colección">' +
        '<button type="submit" class="name-dialog__ok">Aceptar</button>' +
      "</form>";
    document.body.append(dlg);

    const form = dlg.firstChild;
    coverBtn = form.querySelector(".name-dialog__cover");
    fileInput = form.querySelector('input[type="file"]');
    nameInput = form.querySelector(".name-dialog__name");
    okBtn = form.querySelector(".name-dialog__ok");

    coverBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        ctx.custom = await resizeImage(file);
        setCover(ctx.custom);
      } catch (_) {  }
      fileInput.value = "";
    });
    nameInput.addEventListener("input", () => nameInput.classList.remove("is-invalid"));
    form.addEventListener("submit", (e) => { e.preventDefault(); accept(); });

    dlg.addEventListener("click", (e) => {
      const r = dlg.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    });
  }

  function openCreate({ recipe = null, message = "Colección creada con éxito", edit = null } = {}) {
    if (!dlg) buildDialog();
    ctx = { recipe, message, custom: "", edit };
    dlg.setAttribute("aria-label", edit ? "Editar colección" : "Nueva colección");
    nameInput.value = edit ? edit.name : "";
    nameInput.classList.remove("is-invalid");
    setCover(edit ? edit.img : recipe ? recipe.img : "");
    dlg.showModal();
    nameInput.focus();
  }

  function markInvalid() {
    nameInput.classList.add("is-invalid");
    nameInput.focus();
  }

  async function run(task) {
    busy = true;
    okBtn.disabled = true;
    try {
      await task();
      return true;
    } catch (error) {
      if (error.status === HTTP_CONFLICT) markInvalid();
      toast(error.message, "error");
      return false;
    } finally {
      busy = false;
      okBtn.disabled = false;
    }
  }

  async function accept() {
    if (busy) return;
    const name = nameInput.value.trim().replace(/\s+/g, " ");
    const found = collections.find((c) => c.name.toLowerCase() === name.toLowerCase());

    if (ctx.edit) {
      const clash = collections.some((c) => c.id !== ctx.edit.id && c.name.toLowerCase() === name.toLowerCase());
      if (!name || clash) return markInvalid();
      const saved = await run(async () => {
        const changes = { name };
        if (ctx.custom) changes.image = ctx.custom;
        const updated = fromApi(await api().updateCollection(ctx.edit.id, changes));
        collections = collections.map((c) => (c.id === updated.id ? updated : c));
      });
      if (!saved) return;
      dlg.close();
      render();
      toast(ctx.message);
      return;
    }

    if (!name || (found && !ctx.recipe)) return markInvalid();

    const saved = await run(async () => {
      let target = found;
      let created = null;
      if (!target) {
        created = fromApi(await api().createCollection({
          name,
          image: ctx.custom || (ctx.recipe && ctx.recipe.image) || null,
          user_id_user: session().id,
        }));
        target = created;
      }
      if (ctx.recipe) {
        try {
          await api().addRecipeToCollection(target.id, ctx.recipe.id);
          target.recipeIds.push(ctx.recipe.id);
        } catch (error) {
          if (error.status !== HTTP_CONFLICT) {
            if (created) await quietly(() => api().deleteCollection(created.id));
            throw error;
          }
        }
        await markSaved(ctx.recipe.name);
      }
      if (created) collections.push(created);
    });
    if (!saved) return;

    dlg.close();

    if (grid) {
      render();
      toast(ctx.message);
    } else {
      try { sessionStorage.setItem(FLASH, ctx.message); } catch (_) {  }
      location.href = "colecciones.html";
    }
  }

  let pickDlg, pickList, pickRecipe;

  function thumb(c) {
    const box = document.createElement("span");
    box.className = "pick-dialog__thumb";
    if (c && c.img) {
      const img = new Image();
      img.alt = "";
      img.addEventListener("error", () => { box.innerHTML = ICON.image; });
      img.src = c.img;
      box.append(img);
    } else {
      box.innerHTML = c ? ICON.image : ICON.plus;
    }
    return box;
  }

  function openAdd(recipe) {
    if (!pickDlg) {
      pickDlg = document.createElement("dialog");
      pickDlg.className = "name-dialog pick-dialog";
      pickDlg.setAttribute("aria-label", "Agregar a una colección");
      pickDlg.innerHTML = '<p class="pick-dialog__title">Agregar a una colección</p><div class="pick-dialog__list"></div>';
      document.body.append(pickDlg);
      pickList = pickDlg.querySelector(".pick-dialog__list");
      pickDlg.addEventListener("click", (e) => {
        const r = pickDlg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) pickDlg.close();
      });
    }
    pickRecipe = recipe;
    pickList.replaceChildren();

    collections.forEach((c) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "pick-dialog__item";
      const name = document.createElement("span");
      name.className = "pick-dialog__name";
      name.textContent = c.name;
      item.append(thumb(c), name);
      if (c.recipeIds.includes(recipe.id)) {
        const mark = document.createElement("span");
        mark.className = "pick-dialog__mark";
        mark.innerHTML = window.TasteboxUi.iconHtml("fa-solid fa-check");
        mark.title = "Ya está en esta colección";
        item.append(mark);
      }
      item.addEventListener("click", async () => {
        item.disabled = true;
        let already = false;
        try {
          await api().addRecipeToCollection(c.id, pickRecipe.id);
          c.recipeIds.push(pickRecipe.id);
        } catch (error) {
          if (error.status !== HTTP_CONFLICT) {
            item.disabled = false;
            toast(error.message, "error");
            return;
          }
          already = true;
        }
        await markSaved(pickRecipe.name);
        pickDlg.close();
        toast(already ? "La receta ya está en «" + c.name + "»" : "Receta añadida con éxito");
      });
      pickList.append(item);
    });

    const nueva = document.createElement("button");
    nueva.type = "button";
    nueva.className = "pick-dialog__item pick-dialog__item--new";
    const label = document.createElement("span");
    label.className = "pick-dialog__name";
    label.textContent = "Nueva colección";
    nueva.append(thumb(null), label);
    nueva.addEventListener("click", () => {
      pickDlg.close();
      openCreate({ recipe: pickRecipe, message: "Receta añadida con éxito" });
    });
    pickList.append(nueva);

    pickDlg.showModal();
  }

  let delDlg, delName, delCover, delTileName, delTarget;

  function confirmDelete(c) {
    if (!delDlg) {
      delDlg = document.createElement("dialog");
      delDlg.className = "delete-dialog";
      delDlg.setAttribute("aria-label", "Eliminar colección");
      delDlg.innerHTML =
        '<div class="delete-dialog__main">' +
          '<p class="delete-dialog__text">¿Está seguro que quiere eliminar la colección?</p>' +
          '<p class="delete-dialog__name"></p>' +
          '<div class="delete-dialog__actions">' +
            '<button type="button" class="delete-dialog__keep">Conservar</button>' +
            '<button type="button" class="delete-dialog__ok">Eliminar</button>' +
          "</div>" +
        "</div>" +
        '<div class="delete-dialog__tile">' +
          '<div class="delete-dialog__cover"></div>' +
          '<span class="delete-dialog__tilename"></span>' +
        "</div>";
      document.body.append(delDlg);
      delName = delDlg.querySelector(".delete-dialog__name");
      delCover = delDlg.querySelector(".delete-dialog__cover");
      delTileName = delDlg.querySelector(".delete-dialog__tilename");
      delDlg.querySelector(".delete-dialog__keep").addEventListener("click", () => delDlg.close());
      delDlg.querySelector(".delete-dialog__ok").addEventListener("click", async () => {
        const removed = await removeCollection(delTarget);
        delDlg.close();
        if (!removed) return;
        render();
        toast("Colección eliminada con éxito");
      });
      delDlg.addEventListener("click", (e) => {
        const r = delDlg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) delDlg.close();
      });
    }
    delTarget = c;
    delName.textContent = c.name;
    delTileName.textContent = c.name;
    delCover.replaceChildren();
    if (c.img) {
      const img = new Image();
      img.alt = "";
      img.addEventListener("error", () => { delCover.innerHTML = ICON.image; });
      img.src = c.img;
      delCover.append(img);
    } else {
      delCover.innerHTML = ICON.image;
    }
    delDlg.showModal();
  }

  const grid = document.getElementById("collections");

  function closeMenus() {
    document.querySelectorAll(".collection__menu").forEach((m) => {
      m.hidden = true;
      m.previousElementSibling.setAttribute("aria-expanded", "false");
    });
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".collection__options")) closeMenus();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

  function tile(c) {
    const art = document.createElement("article");
    art.className = "collection";

    const options = document.createElement("div");
    options.className = "collection__options";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "collection__menu-btn";
    menuBtn.setAttribute("aria-label", "Opciones de " + c.name);
    menuBtn.setAttribute("aria-haspopup", "menu");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML = ICON.dots;
    const menu = document.createElement("div");
    menu.className = "collection__menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.setAttribute("role", "menuitem");
    edit.textContent = "Editar";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("role", "menuitem");
    remove.className = "is-danger";
    remove.textContent = "Eliminar";
    menu.append(edit, remove);
    options.append(menuBtn, menu);

    menuBtn.addEventListener("click", () => {
      const willOpen = menu.hidden;
      closeMenus();
      menu.hidden = !willOpen;
      menuBtn.setAttribute("aria-expanded", String(willOpen));
    });
    edit.addEventListener("click", () => {
      closeMenus();
      openCreate({ edit: c, message: "Colección actualizada con éxito" });
    });
    remove.addEventListener("click", () => {
      closeMenus();
      confirmDelete(c);
    });

    const href = "coleccion.html?id=" + encodeURIComponent(c.id);
    const cover = document.createElement("a");
    cover.className = "collection__cover";
    cover.href = href;
    cover.setAttribute("aria-label", "Abrir la colección " + c.name);
    if (c.img) {
      const img = new Image();
      img.alt = "";
      img.addEventListener("error", () => { cover.innerHTML = ICON.image; });
      img.src = c.img;
      cover.append(img);
    } else {
      cover.innerHTML = ICON.image;
    }

    const name = document.createElement("a");
    name.className = "collection__name";
    name.textContent = c.name;
    name.title = c.name;
    name.href = href;

    art.append(options, cover, name);
    return art;
  }

  function render() {
    grid.replaceChildren(...collections.map(tile));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "collection collection--new";
    add.setAttribute("aria-label", "Crear nueva colección");
    add.innerHTML = ICON.plus;
    add.addEventListener("click", () => openCreate());
    grid.append(add);
  }

  if (grid) {
    load().catch((error) => toast(error.message, "error")).then(render);
    let aviso = null;
    try { aviso = sessionStorage.getItem(FLASH); sessionStorage.removeItem(FLASH); } catch (_) {  }
    if (aviso) setTimeout(() => toast(aviso), 350);
  }

  const add = async (recipe) => {
    if (!session()) { window.location.href = "login.html"; return; }
    try {
      const found = await catalog().findByName(recipe.name);
      if (!found) throw new Error("Esta receta aún no está disponible para guardar.");
      await load();
      openAdd({ id: found.id_recipe, name: found.name, img: recipe.img || coverSrc(found.image), image: found.image || "" });
    } catch (error) {
      toast(error.message, "error");
    }
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add[data-recipe]");
    if (!btn) return;
    add({ name: btn.dataset.recipe, img: btn.dataset.img || "" });
  });

  if ((grid || document.getElementById("col-grid")) && !session()) {
    window.location.replace("login.html");
  }

  window.Tastebox = { openCreate, openAdd, add, toast, load, removeRecipe };
})();
