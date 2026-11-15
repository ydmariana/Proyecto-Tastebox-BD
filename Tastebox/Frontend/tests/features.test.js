const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeServer, loadPage, settle } = require('./harness');

const ANA = { id: 1, email: 'ana@correo.com', role: 0, subscriptionId: 1 };
const ADMIN = { id: 2, email: 'admin@tastebox.com', role: 1, subscriptionId: 2 };
const plain = (value) => JSON.parse(JSON.stringify(value));
const submit = (page, element) => element.dispatchEvent(new page.window.Event('submit', { cancelable: true, bubbles: true }));

const openPasswordForm = (page, current, next) => {
  const { document } = page;
  document.getElementById('pw-current').value = current;
  document.getElementById('pw-new').value = next;
  document.getElementById('pw-confirm').value = next;
  submit(page, document.getElementById('pw-form'));
};

test('cambiar contraseña: llama a PUT /users/:id/password con la actual y la nueva', async () => {
  const server = createFakeServer();
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  openPasswordForm(page, 'Clave123!', 'Nueva456$');
  await settle(10);
  const call = server.state.calls.find((c) => c.method === 'PUT' && c.path === '/users/1/password');
  assert.deepEqual(call.body, { currentPassword: 'Clave123!', newPassword: 'Nueva456$' });
  assert.equal(page.window.__digestCalls.length, 0);
  assert.equal(server.state.users[0].password, 'Nueva456$');
});

test('cambiar contraseña: si la actual es incorrecta muestra el error y no cambia nada', async () => {
  const server = createFakeServer();
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  openPasswordForm(page, 'mala', 'Nueva456$');
  await settle(10);
  assert.match(page.document.getElementById('pw-current-error').textContent, /actual no es correcta/);
  assert.equal(server.state.users[0].password, 'Clave123!');
});

test('suscripción: muestra los planes del servidor y marca el plan actual', async () => {
  const server = createFakeServer();
  const page = loadPage('suscripcion.html', ['suscripcion.js'], { server, session: ANA });
  await settle(10);
  const names = [...page.document.querySelectorAll('.plan__name')].map((n) => n.textContent);
  assert.deepEqual(names, ['Gratuito', 'Premium']);
  assert.match(page.document.getElementById('current-plan').textContent, /Gratuito – vence en 12 días/);
  assert.equal(page.document.querySelector('.plan--gratuito .plan__btn').disabled, true);
  assert.match(page.document.querySelector('.plan--premium .plan__btn').getAttribute('href'), /cambio-plan\.html\?plan=2/);
});

test('suscripción sin sesión: invita a iniciar sesión', async () => {
  const server = createFakeServer();
  const page = loadPage('suscripcion.html', ['suscripcion.js'], { server });
  await settle(10);
  assert.match(page.document.getElementById('current-plan').textContent, /Inicia sesión/);
});

test('cambio de plan: confirma con PUT /users/:id usando el correo vigente del servidor', async () => {
  const server = createFakeServer();
  const page = loadPage('cambio-plan.html', ['suscripcion.js'], { server, session: ANA });
  page.window.history.replaceState({}, '', '/pages/cambio-plan.html?plan=2');
  await settle(10);
  page.document.getElementById('confirm-btn').click();
  await settle(10);
  const call = server.state.calls.find((c) => c.method === 'PUT' && c.path === '/users/1');
  assert.deepEqual(call.body, { email: 'ana@correo.com', subscription_id_subscription: 2 });
  assert.equal(server.state.users[0].subscription_id_subscription, 2);
  assert.equal(page.window.TasteboxSession.get().subscriptionId, 2);
  assert.equal(page.window.localStorage.getItem('tastebox.plan-fechas:1'), null);
  assert.ok(server.state.users[0].subscription_renews_at);
  assert.equal(server.state.users[0].subscription_expires_at, null);
});

test('suscripción premium: la etiqueta muestra la fecha de renovación como en el prototipo', async () => {
  const server = createFakeServer();
  server.state.users[0].subscription_id_subscription = 2;
  const page = loadPage('suscripcion.html', ['suscripcion.js'], { server, session: ANA });
  await settle(10);
  assert.match(page.document.getElementById('current-plan').textContent, /Premium – se renueva el \d{2} \w{3} \d{4}/);
  assert.deepEqual([...page.document.querySelectorAll('.plan--premium .plan__features li')].map((li) => li.textContent),
    ['Recetas ilimitadas', 'Caja de ingredientes semanales', 'Seguimiento de hábitos completo']);
});

const collectionsPage = (server, session = ANA) => loadPage('colecciones.html', ['colecciones.js'], { server, session });
const seedCollections = (page, collections) => page.window.localStorage.setItem('tastebox.colecciones:ana@correo.com', JSON.stringify(collections));

test('guardar una receta: resuelve su id por nombre y llama a POST /saved-recipes', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await page.window.TasteboxSaved.add('tortilla ESPAÑOLA');
  const call = server.state.calls.find((c) => c.method === 'POST' && c.path === '/saved-recipes');
  assert.deepEqual(call.body, { recipe_id_recipe: 1, user_id_user: 1 });
});

test('guardar la misma receta dos veces no falla (409 se ignora)', async () => {
  const server = createFakeServer({ saved: [{ recipe_id_recipe: 1, user_id_user: 1 }] });
  const page = collectionsPage(server);
  await assert.doesNotReject(page.window.TasteboxSaved.add('Tortilla española'));
});

test('guardar una receta que no está en el servidor da un error entendible y no llama al POST', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await assert.rejects(page.window.TasteboxSaved.add('Receta inventada'), /aún no está disponible/);
  assert.equal(server.state.calls.some((c) => c.method === 'POST' && c.path === '/saved-recipes'), false);
});

const collection = (overrides = {}) => ({ id_collection: 1, name: 'Mis favoritas', image: null, user_id_user: 1, recipe_ids: [], ...overrides });
const tiles = (page) => [...page.document.querySelectorAll('#collections .collection:not(.collection--new)')];
const tileNames = (page) => tiles(page).map((tile) => tile.querySelector('.collection__name').textContent);
const callsTo = (server, method, path) => server.state.calls.filter((c) => c.method === method && c.path === path);
const typeName = (page, name) => {
  const input = page.document.querySelector('.name-dialog__name');
  input.value = name;
  submit(page, input.form);
};
const addButton = (page, name = 'Tortilla española') => {
  const button = page.document.createElement('button');
  button.className = 'add';
  button.dataset.recipe = name;
  button.dataset.img = '../img/desayunos/tortilla-espanola.jpg';
  page.document.body.append(button);
  return button;
};

test('colecciones: una cuenta sin colecciones no trae ejemplos, solo el botón de crear', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await settle(10);
  assert.deepEqual(tileNames(page), []);
  assert.ok(page.document.querySelector('.collection--new'));
  assert.equal(callsTo(server, 'GET', '/collections/user/1').length, 1);
  const localKeys = Object.keys(plain(page.window.localStorage)).filter((key) => key.startsWith('tastebox.colecciones'));
  assert.deepEqual(localKeys, []);
});

test('colecciones: se muestran solo las colecciones del usuario en sesión que trae la API', async () => {
  const server = createFakeServer({ collections: [
    collection({ id_collection: 1, name: 'Postres' }),
    collection({ id_collection: 2, name: 'Ajena', user_id_user: 2 }),
    collection({ id_collection: 3, name: 'Para navidad', image: 'navidad/natilla.jpg' }),
  ] });
  const page = collectionsPage(server);
  await settle(10);
  assert.deepEqual(tileNames(page), ['Postres', 'Para navidad']);
  assert.match(tiles(page)[1].querySelector('img').getAttribute('src'), /\.\.\/img\/navidad\/natilla\.jpg$/);
});

test('colecciones: sin conexión avisa del error y deja solo el botón de crear', async () => {
  const server = createFakeServer();
  server.state.failNext = { test: (key) => key.startsWith('GET /collections'), network: true };
  const page = collectionsPage(server);
  await settle(10);
  assert.deepEqual(tileNames(page), []);
  assert.match(page.document.querySelector('.toast__text').textContent, /No se pudo conectar/);
});

test('crear una colección: POST /collections con nombre, sin portada y con el usuario en sesión', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await settle(10);
  page.document.querySelector('.collection--new').click();
  typeName(page, '  Para   navidad ');
  await settle(10);
  assert.deepEqual(callsTo(server, 'POST', '/collections')[0].body, { name: 'Para navidad', image: null, user_id_user: 1 });
  assert.deepEqual(tileNames(page), ['Para navidad']);
  assert.equal(server.state.collections.length, 1);
});

test('crear con un nombre vacío o repetido no llama a la API y marca el campo', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres' })] });
  const page = collectionsPage(server);
  await settle(10);
  for (const name of ['', 'postres']) {
    page.document.querySelector('.collection--new').click();
    typeName(page, name);
    await settle(5);
    assert.ok(page.document.querySelector('.name-dialog__name').classList.contains('is-invalid'));
  }
  assert.equal(callsTo(server, 'POST', '/collections').length, 0);
});

test('si el servidor rechaza el nombre (409) el modal sigue abierto, marca el campo y avisa', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Pudin', user_id_user: 1 })] });
  const page = collectionsPage(server);
  await settle(10);
  server.state.collections[0].name = 'Postres';
  page.window.Tastebox.openCreate();
  typeName(page, 'POSTRES');
  await settle(10);
  assert.ok(page.document.querySelector('.name-dialog__name').classList.contains('is-invalid'));
  assert.ok(page.document.querySelector('dialog.name-dialog[open]'));
  assert.match(page.document.querySelector('.toast__text').textContent, /Ya tienes una colección/);
});

test('editar una colección: PUT con el nuevo nombre, sin tocar la portada si no se cambia', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres', image: 'navidad/natilla.jpg' })] });
  const page = collectionsPage(server);
  await settle(10);
  [...tiles(page)[0].querySelectorAll('.collection__menu button')].find((b) => b.textContent === 'Editar').click();
  assert.equal(page.document.querySelector('.name-dialog__name').value, 'Postres');
  typeName(page, 'Dulces');
  await settle(10);
  assert.deepEqual(callsTo(server, 'PUT', '/collections/1')[0].body, { name: 'Dulces' });
  assert.deepEqual(tileNames(page), ['Dulces']);
  assert.equal(server.state.collections[0].image, 'navidad/natilla.jpg');
});

test('eliminar una colección: DELETE y desaparece de la pantalla', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres' }), collection({ id_collection: 2, name: 'Otra' })] });
  const page = collectionsPage(server);
  await settle(10);
  [...tiles(page)[0].querySelectorAll('.collection__menu button')].find((b) => b.textContent === 'Eliminar').click();
  page.document.querySelector('.delete-dialog__ok').click();
  await settle(10);
  assert.equal(callsTo(server, 'DELETE', '/collections/1').length, 1);
  assert.deepEqual(tileNames(page), ['Otra']);
});

test('eliminar una colección quita de las guardadas solo las recetas que no están en otra colección', async () => {
  const server = createFakeServer({
    saved: [{ recipe_id_recipe: 1, user_id_user: 1 }, { recipe_id_recipe: 2, user_id_user: 1 }],
    collections: [collection({ id_collection: 1, recipe_ids: [1, 2] }), collection({ id_collection: 2, name: 'B', recipe_ids: [1] })],
  });
  const page = collectionsPage(server);
  await settle(10);
  const first = page.window.Tastebox;
  [...tiles(page)[0].querySelectorAll('.collection__menu button')].find((b) => b.textContent === 'Eliminar').click();
  page.document.querySelector('.delete-dialog__ok').click();
  await settle(15);
  assert.deepEqual(plain(server.state.saved), [{ recipe_id_recipe: 1, user_id_user: 1 }]);
  assert.ok(first);
});

test('botón +: elige la colección, agrega la receta con POST /collections/:id/recipes y la marca como guardada', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres' })] });
  const page = collectionsPage(server);
  await settle(10);
  addButton(page).click();
  await settle(15);
  page.document.querySelector('.pick-dialog__item').click();
  await settle(15);
  assert.deepEqual(callsTo(server, 'POST', '/collections/1/recipes')[0].body, { recipe_id_recipe: 1 });
  assert.deepEqual(plain(server.state.collections[0].recipe_ids), [1]);
  assert.deepEqual(callsTo(server, 'POST', '/saved-recipes')[0].body, { recipe_id_recipe: 1, user_id_user: 1 });
  assert.match(page.document.querySelector('.toast__text').textContent, /Receta añadida/);
});

test('botón +: si la receta ya estaba en la colección lo avisa y no falla', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres', recipe_ids: [1] })] });
  const page = collectionsPage(server);
  await settle(10);
  addButton(page).click();
  await settle(15);
  assert.ok(page.document.querySelector('.pick-dialog__mark'));
  page.document.querySelector('.pick-dialog__item').click();
  await settle(15);
  assert.match(page.document.querySelector('.toast__text').textContent, /ya está en/);
  assert.deepEqual(plain(server.state.collections[0].recipe_ids), [1]);
});

test('botón +: una receta que no está en el servidor da un aviso y no abre la lista', async () => {
  const server = createFakeServer({ collections: [collection()] });
  const page = collectionsPage(server);
  await settle(10);
  addButton(page, 'Receta inventada').click();
  await settle(15);
  assert.match(page.document.querySelector('.toast__text').textContent, /aún no está disponible/);
  assert.equal(page.document.querySelector('.pick-dialog'), null);
});

test('botón + → Nueva colección: crea la colección con la portada de la receta y le agrega la receta', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await settle(10);
  addButton(page).click();
  await settle(15);
  page.document.querySelector('.pick-dialog__item--new').click();
  typeName(page, 'Desayunos');
  await settle(15);
  assert.deepEqual(callsTo(server, 'POST', '/collections')[0].body, { name: 'Desayunos', image: 'desayunos/tortilla-espanola.jpg', user_id_user: 1 });
  assert.deepEqual(callsTo(server, 'POST', '/collections/1/recipes')[0].body, { recipe_id_recipe: 1 });
  assert.deepEqual(tileNames(page), ['Desayunos']);
});

test('si no se puede agregar la receta, la colección recién creada no se queda vacía', async () => {
  const server = createFakeServer();
  const page = collectionsPage(server);
  await settle(10);
  addButton(page).click();
  await settle(15);
  page.document.querySelector('.pick-dialog__item--new').click();
  server.state.failNext = { test: (key) => key === 'POST /collections/1/recipes', status: 500, message: 'Error interno' };
  typeName(page, 'Desayunos');
  await settle(15);
  assert.equal(server.state.collections.length, 0);
  assert.deepEqual(tileNames(page), []);
  assert.ok(page.document.querySelector('dialog.name-dialog[open]'));
});

test('quitar una receta de su única colección la quita también de las guardadas', async () => {
  const server = createFakeServer({ saved: [{ recipe_id_recipe: 1, user_id_user: 1 }], collections: [collection({ recipe_ids: [1] })] });
  const page = collectionsPage(server);
  await page.window.Tastebox.load();
  assert.equal(await page.window.Tastebox.removeRecipe(1, 1), true);
  assert.equal(server.state.saved.length, 0);
  assert.deepEqual(plain(server.state.collections[0].recipe_ids), []);
});

test('quitar una receta que sigue en otra colección no la borra de las guardadas', async () => {
  const server = createFakeServer({
    saved: [{ recipe_id_recipe: 1, user_id_user: 1 }],
    collections: [collection({ id_collection: 1, recipe_ids: [1] }), collection({ id_collection: 2, name: 'B', recipe_ids: [1] })],
  });
  const page = collectionsPage(server);
  await page.window.Tastebox.load();
  await page.window.Tastebox.removeRecipe(1, 1);
  assert.equal(server.state.saved.length, 1);
  assert.deepEqual(plain(server.state.collections[1].recipe_ids), [1]);
});

test('si el servidor falla al quitar, la receta se queda en la colección', async () => {
  const server = createFakeServer({ saved: [{ recipe_id_recipe: 1, user_id_user: 1 }], collections: [collection({ recipe_ids: [1] })] });
  const page = collectionsPage(server);
  await page.window.Tastebox.load();
  server.state.failNext = { test: (key) => key.startsWith('DELETE /collections/1/recipes'), status: 500, message: 'Error interno' };
  assert.equal(await page.window.Tastebox.removeRecipe(1, 1), false);
  assert.deepEqual(plain(server.state.collections[0].recipe_ids), [1]);
  assert.equal(server.state.saved.length, 1);
});

test('si /saved-recipes falla, lo hecho en la colección no se interrumpe', async () => {
  const server = createFakeServer({ collections: [collection({ recipe_ids: [] })] });
  const page = collectionsPage(server);
  await page.window.Tastebox.load();
  server.state.failNext = { test: (key) => key === 'POST /saved-recipes', status: 500, message: 'Error interno' };
  addButton(page).click();
  await settle(15);
  page.document.querySelector('.pick-dialog__item').click();
  await settle(15);
  assert.deepEqual(plain(server.state.collections[0].recipe_ids), [1]);
  assert.match(page.document.querySelector('.toast__text').textContent, /Receta añadida/);
});

test('perfil: cuenta las colecciones y las recetas distintas que hay en ellas', async () => {
  const server = createFakeServer({ collections: [
    collection({ id_collection: 1, recipe_ids: [1, 2] }),
    collection({ id_collection: 2, name: 'B', recipe_ids: [2, 3] }),
    collection({ id_collection: 3, name: 'Ajena', user_id_user: 2, recipe_ids: [4] }),
  ] });
  const page = loadPage('perfil.html', ['colecciones.js', 'perfil.js'], { server, session: ANA });
  await settle(10);
  assert.equal(page.document.getElementById('stat-collections').textContent, '2');
  assert.equal(page.document.getElementById('stat-saved').textContent, '3');
});

test('perfil: sin colecciones muestra 0 y 0', async () => {
  const server = createFakeServer();
  const page = loadPage('perfil.html', ['colecciones.js', 'perfil.js'], { server, session: ANA });
  await settle(10);
  assert.equal(page.document.getElementById('stat-collections').textContent, '0');
  assert.equal(page.document.getElementById('stat-saved').textContent, '0');
});

const collectionPage = (server, id, session = ANA) =>
  loadPage('coleccion.html', ['categoryMeta.js', 'colecciones.js', 'coleccion.js'], { server, session, query: `?id=${id}` });

test('coleccion: muestra las recetas de la colección en el orden en que se agregaron', async () => {
  const server = createFakeServer({ collections: [collection({ name: 'Postres', recipe_ids: [3, 1] })] });
  const page = collectionPage(server, 1);
  await settle(15);
  assert.equal(page.document.getElementById('col-title').textContent, 'Postres');
  assert.deepEqual([...page.document.querySelectorAll('.ccard h3')].map((h) => h.textContent), ['Ajiaco santafereño', 'Tortilla española']);
});

test('coleccion: la × quita la receta con DELETE /collections/:id/recipes/:recipeId', async () => {
  const server = createFakeServer({ saved: [{ recipe_id_recipe: 1, user_id_user: 1 }], collections: [collection({ recipe_ids: [1, 3] })] });
  const page = collectionPage(server, 1);
  await settle(15);
  page.document.querySelector('.ccard .add').click();
  await settle(15);
  assert.equal(callsTo(server, 'DELETE', '/collections/1/recipes/1').length, 1);
  assert.deepEqual([...page.document.querySelectorAll('.ccard h3')].map((h) => h.textContent), ['Ajiaco santafereño']);
  assert.equal(server.state.saved.length, 0);
});

test('coleccion: una colección vacía muestra el mensaje para agregar recetas', async () => {
  const server = createFakeServer({ collections: [collection()] });
  const page = collectionPage(server, 1);
  await settle(15);
  assert.equal(page.document.getElementById('col-empty').hidden, false);
  assert.match(page.document.getElementById('col-empty').textContent, /Aún no hay recetas/);
});

test('coleccion: una colección que no existe o es de otro usuario no se muestra', async () => {
  const server = createFakeServer({ collections: [collection({ id_collection: 5, user_id_user: 2 })] });
  for (const id of ['5', '99', 'saludables']) {
    const page = collectionPage(server, id);
    await settle(15);
    assert.equal(page.document.getElementById('col-title').textContent, 'Colección no encontrada');
  }
});

test('coleccion: sin conexión avisa en vez de decir que la colección no existe', async () => {
  const server = createFakeServer({ collections: [collection()] });
  server.state.failNext = { test: (key) => key.startsWith('GET /collections'), network: true };
  const page = collectionPage(server, 1);
  await settle(15);
  assert.match(page.document.getElementById('col-empty').textContent, /No se pudo cargar/);
});

const adminPage = (server, session = ADMIN) => loadPage('administracion.html', ['admin.js'], { server, session });
const rowsOf = (page, bodyId) => [...page.document.querySelectorAll(`#${bodyId} tr`)];

test('admin: sin sesión o sin rol de administrador no carga datos del panel', async () => {
  for (const session of [null, ANA]) {
    const server = createFakeServer();
    const page = adminPage(server, session);
    await settle(10);
    assert.equal(server.state.calls.length, 0);
    assert.equal(rowsOf(page, 'users-body').length, 0);
  }
});

test('admin: lista usuarios con su rol y nombre de plan, y recetas del servidor', async () => {
  const server = createFakeServer();
  const page = adminPage(server);
  await settle(12);
  const users = rowsOf(page, 'users-body').map((r) => [...r.children].map((c) => c.textContent));
  assert.deepEqual(users[0].filter(Boolean), ['1', 'ana@correo.com', 'Usuario', 'Gratuito']);
  assert.deepEqual(users[1].filter(Boolean), ['2', 'admin@tastebox.com', 'Administrador', 'Premium']);
  assert.equal(rowsOf(page, 'recipes-body').length, 4);
});

test('admin: un nombre de receta con HTML se muestra como texto, no se ejecuta', async () => {
  const server = createFakeServer();
  server.state.recipes[0].name = '<img src=x onerror="window.pwned=1">';
  const page = adminPage(server);
  await settle(12);
  assert.equal(page.document.querySelector('#recipes-body img[src="x"]'), null);
  assert.equal(page.window.pwned, undefined);
});

test('admin: agregar receta envía POST /recipes con dificultad numérica', async () => {
  const server = createFakeServer();
  const page = adminPage(server);
  await settle(12);
  const form = page.document.getElementById('recipe-form');
  form.elements.name.value = 'Arepas';
  form.elements.description.value = 'Con queso';
  form.elements.cuisineType.value = 'Desayunos';
  form.elements.difficulty.value = 'Difícil';
  submit(page, form);
  await settle(12);
  const call = server.state.calls.find((c) => c.method === 'POST' && c.path === '/recipes');
  assert.deepEqual(call.body, { name: 'Arepas', description: 'Con queso', cuisine_type: 'Desayunos', difficulty_level: 5, minutes: 0, image: null, ingredients: null });
  assert.equal(server.state.recipes.length, 5);
  assert.equal(rowsOf(page, 'recipes-body').length, 4);
});

test('admin: el formulario rechaza campos vacíos sin llamar al servidor', async () => {
  const server = createFakeServer();
  const page = adminPage(server);
  await settle(12);
  submit(page, page.document.getElementById('recipe-form'));
  await settle(5);
  assert.equal(server.state.calls.some((c) => c.method === 'POST' && c.path === '/recipes'), false);
});

test('admin: eliminar muestra el mensaje del 409 cuando la receta está en uso', async () => {
  const server = createFakeServer();
  const page = adminPage(server);
  await settle(12);
  server.state.failNext = { test: (key) => key.startsWith('DELETE /recipes'), status: 409, message: 'x' };
  rowsOf(page, 'recipes-body')[0].querySelector('.act--del').click();
  page.document.getElementById('del-ok').click();
  await settle(12);
  assert.match(page.document.querySelector('.toast--error').textContent, /No se puede eliminar/);
  assert.equal(server.state.recipes.length, 4);
});

const REVIEW = { id_review: 7, date: '2026-10-05', tags: '#Fácil, #Rápida', comments: 'Quedó deliciosa y muy fácil', rating: 4, cook_it_again: 1, user_id_user: 1, recipe_id_recipe: 1 };
const detailPage = (server, session) => loadPage('recipeDetail.html', ['categoryMeta.js', 'reviewStore.js', 'recipeDetail.js'], { server, session, query: '?recipe=' + encodeURIComponent('Tortilla española') });
const myReviewsPage = (server, session = ANA) => {
  const page = loadPage('resenas.html', ['categoryMeta.js', 'reviewStore.js', 'actividad.js', 'resenas.js'], { server, session });
  page.window.confirm = () => true;
  return page;
};
const fillReview = (page, text = 'Quedó muy rica y fácil de hacer') => {
  const { document } = page;
  document.querySelectorAll('.star-input button')[3].click();
  document.getElementById('review-text').value = text;
  document.querySelector('.cook-choice [data-value="yes"]').click();
  document.querySelectorAll('.tag-picker button')[0].click();
  submit(page, document.getElementById('review-form'));
};

test('detalle de receta: carga las reseñas del servidor con GET /reviews/recipe/:id', async () => {
  const server = createFakeServer({ reviews: [REVIEW] });
  const page = detailPage(server, ANA);
  await settle(12);
  assert.ok(server.state.calls.some((c) => c.method === 'GET' && c.path === '/reviews/recipe/1'));
  assert.match(page.document.getElementById('reviews-list').textContent, /Quedó deliciosa y muy fácil/);
});

test('detalle de receta: enviar reseña llama a POST /reviews con el cuerpo de la API', async () => {
  const server = createFakeServer();
  const page = detailPage(server, ANA);
  await settle(12);
  fillReview(page);
  await settle(12);
  const call = server.state.calls.find((c) => c.method === 'POST' && c.path === '/reviews');
  assert.equal(call.body.user_id_user, 1);
  assert.equal(call.body.recipe_id_recipe, 1);
  assert.equal(call.body.rating, 4);
  assert.equal(call.body.cook_it_again, 1);
  assert.equal(call.body.comments, 'Quedó muy rica y fácil de hacer');
  assert.equal(call.body.tags, '#Fácil');
  assert.match(call.body.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(server.state.reviews.length, 1);
  assert.match(page.document.getElementById('reviews-list').textContent, /Quedó muy rica/);
});

test('detalle de receta: sin sesión no envía la reseña y pide iniciar sesión', async () => {
  const server = createFakeServer();
  const page = detailPage(server, null);
  await settle(12);
  fillReview(page);
  await settle(8);
  assert.equal(server.state.calls.some((c) => c.method === 'POST' && c.path === '/reviews'), false);
  assert.match(page.document.getElementById('review-status').textContent, /Inicia sesión/);
});

test('detalle de receta: si el servidor rechaza la reseña muestra su error y no la agrega', async () => {
  const server = createFakeServer();
  const page = detailPage(server, ANA);
  await settle(12);
  server.state.failNext = { test: (key) => key === 'POST /reviews', status: 400, message: 'El usuario o la receta indicados no existen' };
  fillReview(page);
  await settle(12);
  assert.match(page.document.getElementById('review-status').textContent, /no existen/);
  assert.equal(server.state.reviews.length, 0);
});

test('Mis reseñas: lista las reseñas del usuario desde GET /reviews/user/:id', async () => {
  const server = createFakeServer({ reviews: [REVIEW, { ...REVIEW, id_review: 8, user_id_user: 2, comments: 'De otra cuenta' }] });
  const page = myReviewsPage(server);
  await settle(12);
  assert.ok(server.state.calls.some((c) => c.method === 'GET' && c.path === '/reviews/user/1'));
  const text = page.document.getElementById('rv-list').textContent;
  assert.match(text, /Tortilla española/);
  assert.match(text, /Quedó deliciosa y muy fácil/);
  assert.doesNotMatch(text, /De otra cuenta/);
});

test('Mis reseñas: eliminar llama a DELETE /reviews/:id y la quita de la lista', async () => {
  const server = createFakeServer({ reviews: [REVIEW] });
  const page = myReviewsPage(server);
  await settle(12);
  page.document.querySelector('[data-delete="7"]').click();
  await settle(12);
  assert.ok(server.state.calls.some((c) => c.method === 'DELETE' && c.path === '/reviews/7'));
  assert.equal(server.state.reviews.length, 0);
  assert.equal(page.document.querySelector('[data-delete="7"]'), null);
});

test('Mis reseñas: editar llama a PUT /reviews/:id con los datos nuevos', async () => {
  const server = createFakeServer({ reviews: [REVIEW] });
  const page = myReviewsPage(server);
  await settle(12);
  page.document.querySelector('[data-edit="7"]').click();
  const form = page.document.querySelector('.rv-edit');
  form.elements.rating.value = '5';
  form.elements.text.value = 'Ahora la hago cada semana';
  form.elements.cook.value = '0';
  submit(page, form);
  await settle(12);
  const call = server.state.calls.find((c) => c.method === 'PUT' && c.path === '/reviews/7');
  assert.equal(call.body.rating, 5);
  assert.equal(call.body.comments, 'Ahora la hago cada semana');
  assert.equal(call.body.cook_it_again, 0);
  assert.equal(call.body.user_id_user, 1);
  assert.equal(call.body.recipe_id_recipe, 1);
  assert.match(page.document.getElementById('rv-list').textContent, /Ahora la hago cada semana/);
});

const categoryPage = (server, query) => loadPage('categoryRecipes.html', ['categoryMeta.js', 'categoryRecipes.js'], { server, query });
const titlesOf = (page) => [...page.document.querySelectorAll('.card h3')].map((h) => h.textContent);

test('categoría: lista las recetas de la categoría que devuelve GET /recipes y deja las premium bloqueadas', async () => {
  const server = createFakeServer();
  const page = categoryPage(server, '?category=breakfast');
  await settle(12);
  assert.ok(server.state.calls.some((c) => c.method === 'GET' && c.path === '/recipes'));
  assert.equal(page.document.getElementById('category-title').textContent, 'Desayunos');
  const open = [...page.document.querySelectorAll('#featured-track .card h3, #more-grid .card h3')].map((h) => h.textContent);
  assert.deepEqual(open, ['Tortilla española', 'Pancakes']);
  assert.match(page.document.getElementById('locked-grid').textContent, /Almojábana/);
  assert.equal(page.document.getElementById('locked-grid').querySelector('[data-recipe]'), null);
});

test('categoría: minutos, imagen, verificada y calificación salen de la receta del servidor', async () => {
  const server = createFakeServer();
  const page = categoryPage(server, '?category=breakfast');
  await settle(12);
  const first = page.document.querySelector('#featured-track .card');
  assert.match(first.textContent, /15'/);
  assert.match(first.textContent, /Fácil/);
  assert.equal(first.querySelector('img').getAttribute('src'), '../img/desayunos/tortilla-espanola.jpg');
  assert.ok(first.querySelector('.check'));
  assert.equal(first.querySelector('.stars').getAttribute('style'), '--rating:4.5');
  const second = page.document.querySelectorAll('#featured-track .card')[1];
  assert.equal(second.querySelector('.check'), null);
  assert.equal(second.querySelector('.stars').getAttribute('style'), '--rating:0');
});

test('búsqueda: encuentra por ingrediente usando los datos del servidor', async () => {
  const server = createFakeServer();
  const page = categoryPage(server, '?search=mazorca');
  await settle(12);
  assert.deepEqual(titlesOf(page).filter((t) => t !== 'Receta premium'), ['Ajiaco santafereño']);
});

test('categoría: un nombre de receta con HTML se muestra como texto', async () => {
  const server = createFakeServer();
  server.state.recipes[0].name = '<img src=x onerror="window.pwned=1">';
  const page = categoryPage(server, '?category=breakfast');
  await settle(12);
  assert.equal(page.document.querySelector('#featured-track a img'), null);
  assert.equal(page.window.pwned, undefined);
});

test('categoría: si la API falla muestra el error y no usa datos locales', async () => {
  const server = createFakeServer();
  server.state.failNext = { test: (key) => key === 'GET /recipes', network: true };
  const page = categoryPage(server, '?category=breakfast');
  await settle(12);
  assert.match(page.document.getElementById('category-title').textContent, /No pudimos cargar/);
  assert.equal(titlesOf(page).length, 0);
});

test('detalle de receta: descripción, minutos, ingredientes y calificación vienen de la API', async () => {
  const server = createFakeServer();
  const page = detailPage(server, ANA);
  await settle(12);
  const { document } = page;
  assert.equal(document.getElementById('recipe-name').textContent, 'Tortilla española');
  assert.equal(document.getElementById('recipe-description').textContent, 'Clásica');
  assert.equal(document.getElementById('recipe-time').textContent, "15'");
  assert.equal(document.getElementById('recipe-level').textContent, 'Fácil');
  assert.deepEqual([...document.querySelectorAll('#ingredients li')].map((li) => li.textContent), ['5 huevos grandes', '4 papas medianas', '1 cebolla mediana']);
  assert.equal(document.getElementById('recipe-verified').hidden, false);
});

test('detalle de receta: sin ingredientes muestra el aviso y una receta inexistente o premium vuelve a las categorías', async () => {
  const server = createFakeServer();
  const pancakes = loadPage('recipeDetail.html', ['categoryMeta.js', 'reviewStore.js', 'recipeDetail.js'], { server, query: '?recipe=Pancakes' });
  await settle(12);
  assert.match(pancakes.document.getElementById('ingredients').textContent, /estarán disponibles pronto/);
  for (const name of ['No existe', 'Almojábana']) {
    const page = loadPage('recipeDetail.html', ['categoryMeta.js', 'reviewStore.js', 'recipeDetail.js'], { server, query: '?recipe=' + encodeURIComponent(name) });
    await settle(12);
    assert.equal(page.document.getElementById('recipe-name').textContent, '');
    assert.equal(page.document.getElementById('ingredients').children.length, 0);
  }
});

test('el sitio ya no trae el catálogo de recetas en archivos del Frontend', async () => {
  const fs = require('fs');
  const path = require('path');
  const site = path.resolve(__dirname, '..');
  assert.equal(fs.existsSync(path.join(site, 'js', 'categoryData.js')), false);
  assert.equal(fs.existsSync(path.join(site, 'js', 'recipeData.js')), false);
  for (const dir of ['js', 'pages']) {
    for (const file of fs.readdirSync(path.join(site, dir))) {
      const text = fs.readFileSync(path.join(site, dir, file), 'utf8');
      assert.doesNotMatch(text, /RECIPE_DETAILS|categoryData\.js|recipeData\.js/, `${dir}/${file} usa datos estáticos de recetas`);
    }
  }
});

test('datos personales: carga los datos desde GET /users/:id, no desde el navegador', async () => {
  const server = createFakeServer();
  Object.assign(server.state.users[0], { username: 'anita', full_name: 'Ana Pérez', address: 'Calle 10 # 5-20', phone: '300 123 4567' });
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  await settle(10);
  const { document } = page;
  assert.equal(document.getElementById('dp-username').value, 'anita');
  assert.equal(document.getElementById('dp-full-name').value, 'Ana Pérez');
  assert.equal(document.getElementById('dp-address').value, 'Calle 10 # 5-20');
  assert.equal(document.getElementById('dp-phone').value, '300 123 4567');
  assert.equal(document.getElementById('dp-plan').value, 'Gratuito');
  assert.equal(page.window.localStorage.getItem('tastebox.perfil:ana@correo.com'), null);
});

test('datos personales: guardar llama a PUT /users/:id con nombre, dirección, teléfono, foto y el correo nuevo', async () => {
  const server = createFakeServer();
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  await settle(10);
  const { document } = page;
  document.getElementById('dp-username').value = 'anita';
  document.getElementById('dp-email').value = 'ana.nueva@correo.com';
  document.getElementById('dp-full-name').value = 'Ana Pérez';
  document.getElementById('dp-address').value = 'Calle 10 # 5-20';
  document.getElementById('dp-phone').value = '300 123 4567';
  submit(page, document.getElementById('dp-form'));
  await settle(10);

  const call = server.state.calls.find((c) => c.method === 'PUT' && c.path === '/users/1');
  assert.deepEqual(plain(call.body), {
    email: 'ana.nueva@correo.com', subscription_id_subscription: 1,
    username: 'anita', full_name: 'Ana Pérez', address: 'Calle 10 # 5-20', phone: '300 123 4567', photo: '',
  });
  assert.equal(server.state.users[0].email, 'ana.nueva@correo.com');
  assert.equal(page.window.TasteboxSession.get().email, 'ana.nueva@correo.com');
  assert.match(document.getElementById('dp-status').textContent, /Cambios guardados/);
});

test('datos personales: si el correo ya existe, el error del servidor se ve en el formulario', async () => {
  const server = createFakeServer();
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  await settle(10);
  page.document.getElementById('dp-email').value = 'admin@tastebox.com';
  submit(page, page.document.getElementById('dp-form'));
  await settle(10);
  assert.match(page.document.getElementById('dp-email-error').textContent, /ya está registrado/);
  assert.equal(server.state.users[0].email, 'ana@correo.com');
});

test('datos personales: si la API falla al cargar, se muestra el error con reintento y el formulario queda bloqueado', async () => {
  const server = createFakeServer();
  server.state.failNext = { test: (route) => route === 'GET /users/1', network: true };
  const page = loadPage('datos.html', ['passwordReset.js', 'datos.js'], { server, session: ANA });
  await settle(10);
  assert.match(page.document.querySelector('.api-error').textContent, /No se pudo conectar/);
  assert.equal(page.document.querySelector('.dp-save').disabled, true);
  page.document.querySelector('.api-error__retry').click();
  await settle(10);
  assert.equal(page.document.querySelector('.api-error'), null);
  assert.equal(page.document.querySelector('.dp-save').disabled, false);
});

test('suscripción: precio y características salen de la API, no del código', async () => {
  const server = createFakeServer();
  server.state.subscriptions[1].price = 31000;
  server.state.subscriptions[1].features = 'Característica uno\nCaracterística dos';
  const page = loadPage('suscripcion.html', ['suscripcion.js'], { server, session: ANA });
  await settle(10);
  assert.match(page.document.querySelector('.plan--premium .plan__price').textContent, /31\.000|31,000/);
  assert.deepEqual([...page.document.querySelectorAll('.plan--premium .plan__features li')].map((li) => li.textContent),
    ['Característica uno', 'Característica dos']);
});

test('menú lateral: el cupo mensual sale del plan en la API', async () => {
  const server = createFakeServer();
  server.state.subscriptions[0].monthly_recipe_limit = 40;
  const page = loadPage('datos.html', ['sideMenu.js'], { server, session: ANA });
  await settle(10);
  page.document.querySelector('[data-monthly]').click();
  await settle(10);
  assert.match(page.document.querySelector('.monthly-card h3').textContent, /40 recetas disponibles/);
});

const reviewRow = (overrides = {}) => ({ id_review: 1, date: '2026-11-01', tags: null, comments: 'Rica', rating: 5, cook_it_again: 1, user_id_user: 1, recipe_id_recipe: 1, ...overrides });

test('Mis reseñas: ignora las reseñas viejas de localStorage y muestra solo las de la API', async () => {
  const server = createFakeServer({ reviews: [reviewRow()] });
  const page = loadPage('resenas.html', ['categoryMeta.js', 'reviewStore.js', 'actividad.js', 'resenas.js'], { server, session: ANA });
  page.window.localStorage.setItem('tastebox:reviews:Pancakes', JSON.stringify([{ user: 'Tú', date: '2026-10-01', rating: 3, text: 'local', cook: true, tags: [] }]));
  await settle(12);
  const titles = [...page.document.querySelectorAll('.rv h3')].map((h) => h.textContent);
  assert.deepEqual(titles, ['Tortilla española']);
});

test('Mis reseñas: si la API falla, se muestra el error con reintento', async () => {
  const server = createFakeServer({ reviews: [reviewRow()] });
  server.state.failNext = { test: (route) => route === 'GET /reviews/user/1', status: 500, message: 'Error interno del servidor' };
  const page = loadPage('resenas.html', ['categoryMeta.js', 'reviewStore.js', 'actividad.js', 'resenas.js'], { server, session: ANA });
  await settle(12);
  assert.match(page.document.querySelector('.api-error').textContent, /No pudimos cargar tus reseñas/);
  page.document.querySelector('.api-error__retry').click();
  await settle(12);
  assert.equal(page.document.querySelector('.api-error'), null);
  assert.equal(page.document.querySelectorAll('.rv h3').length, 1);
});

test('detalle de receta: si fallan las reseñas, el error se ve en la página', async () => {
  const server = createFakeServer();
  server.state.failNext = { test: (route) => route === 'GET /reviews/recipe/1', network: true };
  const page = loadPage('recipeDetail.html', ['categoryMeta.js', 'reviewStore.js', 'recipeDetail.js'], { server, session: ANA, query: '?recipe=Tortilla%20espa%C3%B1ola' });
  await settle(15);
  assert.match(page.document.querySelector('.api-error').textContent, /No pudimos cargar las reseñas/);
  assert.equal(page.document.getElementById('reviews-score').textContent, 'Reseñas no disponibles');
});

test('menú lateral: las recetas disponibles descuentan las cocinadas este mes', async () => {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const row = (id, recipe, date) => ({ id_review: id, date, tags: null, comments: null, rating: 5, cook_it_again: 1, user_id_user: 1, recipe_id_recipe: recipe });
  const server = createFakeServer({ reviews: [row(1, 1, iso), row(2, 1, iso), row(3, 2, iso), row(4, 3, '2020-01-15')] });
  const page = loadPage('datos.html', ['sideMenu.js'], { server, session: ANA });
  await settle(10);
  page.document.querySelector('[data-monthly]').click();
  await settle(15);
  assert.match(page.document.querySelector('.monthly-card h3').textContent, /23 recetas disponibles/);
});
