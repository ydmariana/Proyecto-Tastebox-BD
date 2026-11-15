const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase, startApi, send } = require('./helpers/testDatabase');

const TINY_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////';

const setup = async () => {
  const database = createTestDatabase();
  database.raw.exec("INSERT INTO subscription (name) VALUES ('Gratuito')");
  database.raw.exec("INSERT INTO user (email, password, role, subscription_id_subscription) VALUES ('ana@correo.com', 'x', 0, 1), ('luis@correo.com', 'x', 0, 1)");
  database.raw.exec(`INSERT INTO recipe (name, difficulty_level, cuisine_type, description) VALUES
    ('Tortilla española', 1, 'Desayunos', 'Clásica'),
    ('Pancakes', 1, 'Desayunos', 'Esponjosos'),
    ('Ajiaco', 3, 'Sopas', 'Sopa')`);
  const api = await startApi(database);
  const create = (body = {}) => send(api.baseUrl, 'POST', '/collections', { name: 'Favoritas', user_id_user: 1, ...body });
  return { database, api, create };
};

test('POST /collections crea una colección vacía y GET /collections/user/:id la lista', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);

  const created = await create({ image: TINY_IMAGE });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id_collection: 1, name: 'Favoritas', image: TINY_IMAGE, user_id_user: 1, recipe_ids: [] });

  const list = await send(api.baseUrl, 'GET', '/collections/user/1');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].name, 'Favoritas');

  const other = await send(api.baseUrl, 'GET', '/collections/user/2');
  assert.deepEqual(other.body, []);
});

test('el nombre se limpia y es único por usuario (sin distinguir mayúsculas), pero otro usuario puede repetirlo', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);

  const first = await create({ name: '  Para   navidad ' });
  assert.equal(first.body.name, 'Para navidad');

  const repeated = await create({ name: 'PARA NAVIDAD' });
  assert.equal(repeated.status, 409);
  assert.match(repeated.body.error, /Ya tienes una colección/);

  const otherUser = await create({ name: 'Para navidad', user_id_user: 2 });
  assert.equal(otherUser.status, 201);
});

test('POST /collections valida nombre, usuario e imagen', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);

  assert.equal((await create({ name: '' })).status, 400);
  assert.equal((await create({ name: 'x'.repeat(41) })).status, 400);
  assert.equal((await create({ user_id_user: 'abc' })).status, 400);
  assert.equal((await create({ user_id_user: 99 })).status, 400);
  assert.equal((await create({ image: 'data:text/html;base64,PGgxPg==' })).status, 400);
  assert.equal((await create({ image: '../../etc/passwd' })).status, 400);
  assert.equal((await create({ image: 12 })).status, 400);

  const withPath = await create({ name: 'Con ruta', image: 'desayunos/pancakes.jpg' });
  assert.equal(withPath.status, 201);
  assert.equal(withPath.body.image, 'desayunos/pancakes.jpg');
});

test('una portada de más de 100 KB entra en /collections, pero las otras rutas siguen con el límite por defecto', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);

  const bigImage = 'data:image/jpeg;base64,' + 'A'.repeat(300 * 1024);
  const created = await create({ image: bigImage });
  assert.equal(created.status, 201);
  assert.equal(created.body.image.length, bigImage.length);

  const otherRoute = await send(api.baseUrl, 'POST', '/recipes', { name: 'x', description: 'y'.repeat(300 * 1024) });
  assert.equal(otherRoute.status, 413);
});

test('un cuerpo mayor a 2 MB responde 413 en JSON', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);

  const tooBig = await create({ image: 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024) });
  assert.equal(tooBig.status, 413);
  assert.match(tooBig.body.error, /demasiado grande/);
});

test('un JSON mal formado responde 400 en JSON', async (t) => {
  const { api } = await setup();
  t.after(api.close);

  const response = await fetch(`${api.baseUrl}/collections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{nombre' });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /JSON válido/);
});

test('PUT /collections/:id cambia el nombre, conserva la portada si no viene y la cambia si viene', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);
  await create({ image: TINY_IMAGE });
  await create({ name: 'Postres' });

  const renamed = await send(api.baseUrl, 'PUT', '/collections/1', { name: 'Mis favoritas' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, 'Mis favoritas');
  assert.equal(renamed.body.image, TINY_IMAGE);

  const newImage = await send(api.baseUrl, 'PUT', '/collections/1', { name: 'Mis favoritas', image: 'sopas/minestrone.jpg' });
  assert.equal(newImage.body.image, 'sopas/minestrone.jpg');

  const cleared = await send(api.baseUrl, 'PUT', '/collections/1', { name: 'Mis favoritas', image: null });
  assert.equal(cleared.body.image, null);

  const clash = await send(api.baseUrl, 'PUT', '/collections/1', { name: 'postres' });
  assert.equal(clash.status, 409);

  assert.equal((await send(api.baseUrl, 'PUT', '/collections/1', { name: '' })).status, 400);
  assert.equal((await send(api.baseUrl, 'PUT', '/collections/99', { name: 'Nada' })).status, 404);
});

test('agregar y quitar recetas: se devuelven en el orden en que se agregaron', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);
  await create();

  assert.equal((await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 3 })).status, 201);
  assert.equal((await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 1 })).status, 201);

  const duplicate = await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 3 });
  assert.equal(duplicate.status, 409);
  assert.match(duplicate.body.error, /ya está en la colección/);

  assert.equal((await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 99 })).status, 400);
  assert.equal((await send(api.baseUrl, 'POST', '/collections/99/recipes', { recipe_id_recipe: 1 })).status, 400);
  assert.equal((await send(api.baseUrl, 'POST', '/collections/1/recipes', {})).status, 400);

  const one = await send(api.baseUrl, 'GET', '/collections/1');
  assert.deepEqual(one.body.recipe_ids, [3, 1]);

  assert.equal((await send(api.baseUrl, 'DELETE', '/collections/1/recipes/3')).status, 204);
  assert.equal((await send(api.baseUrl, 'DELETE', '/collections/1/recipes/3')).status, 404);
  assert.deepEqual((await send(api.baseUrl, 'GET', '/collections/1')).body.recipe_ids, [1]);
});

test('DELETE /collections/:id borra la colección y sus filas de collection_recipes, sin tocar las recetas', async (t) => {
  const { database, api, create } = await setup();
  t.after(api.close);
  await create();
  await create({ name: 'Otra' });
  await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 1 });
  await send(api.baseUrl, 'POST', '/collections/2/recipes', { recipe_id_recipe: 1 });

  assert.equal((await send(api.baseUrl, 'DELETE', '/collections/1')).status, 204);
  assert.equal((await send(api.baseUrl, 'GET', '/collections/1')).status, 404);
  assert.equal((await send(api.baseUrl, 'DELETE', '/collections/1')).status, 404);

  const rows = database.raw.prepare('SELECT collection_id_collection FROM collection_recipes').all();
  assert.deepEqual(rows.map((row) => row.collection_id_collection), [2]);
  assert.equal(database.raw.prepare('SELECT COUNT(*) AS total FROM recipe').get().total, 3);
});

test('eliminar una receta del catálogo la saca de las colecciones en vez de bloquearse', async (t) => {
  const { api, create } = await setup();
  t.after(api.close);
  await create();
  await send(api.baseUrl, 'POST', '/collections/1/recipes', { recipe_id_recipe: 2 });

  assert.equal((await send(api.baseUrl, 'DELETE', '/recipes/2')).status, 204);
  assert.deepEqual((await send(api.baseUrl, 'GET', '/collections/1')).body.recipe_ids, []);
});

test('los ids inválidos responden 400', async (t) => {
  const { api } = await setup();
  t.after(api.close);

  assert.equal((await send(api.baseUrl, 'GET', '/collections/abc')).status, 400);
  assert.equal((await send(api.baseUrl, 'GET', '/collections/user/abc')).status, 400);
  assert.equal((await send(api.baseUrl, 'DELETE', '/collections/1/recipes/abc')).status, 400);
});
