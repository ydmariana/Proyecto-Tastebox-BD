const test = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.TASTEBOX_REAL_API;
const skip = BASE ? false : 'defina TASTEBOX_REAL_API (p. ej. http://localhost:5000) con la API y MySQL en marcha';

const call = async (method, route, body) => {
  const response = await fetch(BASE + route, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const stamp = Date.now();
const created = { reviews: [], recipes: [], users: [] };

test('API real: ciclo completo de recetas y reseñas', { skip }, async (t) => {
  t.after(async () => {
    for (const id of created.reviews) await call('DELETE', `/reviews/${id}`);
    for (const id of created.recipes) await call('DELETE', `/recipes/${id}`);
    for (const id of created.users) await call('DELETE', `/users/${id}`);
  });

  const subs = await call('GET', '/subscriptions');
  assert.equal(subs.status, 200);
  const user = await call('POST', '/users', {
    email: `qa${stamp}@prueba.com`, password: 'Prueba123!', subscription_id_subscription: subs.body[0].id_subscription,
  });
  assert.equal(user.status, 201, JSON.stringify(user.body));
  const userId = user.body.id_user;
  created.users.push(userId);

  await t.test('recetas: crear, leer, listar, actualizar', async () => {
    const recipe = await call('POST', '/recipes', {
      name: `QA receta ${stamp}`.slice(0, 45), difficulty_level: 2, cuisine_type: 'Pruebas', description: 'Receta creada por la prueba real',
    });
    assert.equal(recipe.status, 201);
    created.recipes.push(recipe.body.id_recipe);
    const id = recipe.body.id_recipe;

    assert.equal((await call('GET', `/recipes/${id}`)).body.name, recipe.body.name);
    assert.ok((await call('GET', '/recipes')).body.some((r) => r.id_recipe === id));

    const updated = await call('PUT', `/recipes/${id}`, { ...recipe.body, difficulty_level: 4, description: 'Editada' });
    assert.equal(updated.status, 200);
    assert.equal((await call('GET', `/recipes/${id}`)).body.difficulty_level, 4);

    assert.equal((await call('POST', '/recipes', { name: '' })).status, 400);
    assert.equal((await call('GET', '/recipes/999999999')).status, 404);
  });

  await t.test('reseñas: crear, leer por receta y por usuario, actualizar', async () => {
    const recipeId = created.recipes[0];
    const review = await call('POST', '/reviews', {
      date: '2026-10-05', tags: 'rápida', comments: 'Quedó muy bien', rating: 4, cook_it_again: 1,
      user_id_user: userId, recipe_id_recipe: recipeId,
    });
    assert.equal(review.status, 201, JSON.stringify(review.body));
    created.reviews.push(review.body.id_review);
    const id = review.body.id_review;

    const one = await call('GET', `/reviews/${id}`);
    assert.equal(one.body.date, '2026-10-05');
    assert.equal(one.body.rating, 4);

    const byRecipe = await call('GET', `/reviews/recipe/${recipeId}`);
    assert.equal(byRecipe.body.length, 1);
    assert.equal(byRecipe.body[0].user_name, `qa${stamp}`);
    assert.equal(byRecipe.body[0].user_email, undefined);

    const byUser = await call('GET', `/reviews/user/${userId}`);
    assert.equal(byUser.body[0].recipe_name, `QA receta ${stamp}`.slice(0, 45));

    const edited = await call('PUT', `/reviews/${id}`, { ...review.body, comments: 'La haría otra vez', rating: 5 });
    assert.equal(edited.status, 200);
    const after = await call('GET', `/reviews/${id}`);
    assert.equal(after.body.comments, 'La haría otra vez');
    assert.equal(after.body.rating, 5);

    assert.equal((await call('POST', '/reviews', { ...review.body, rating: 9 })).status, 400);
    assert.equal((await call('POST', '/reviews', { ...review.body, recipe_id_recipe: 999999999 })).status, 400);
  });

  await t.test('integridad: la receta con reseñas no se borra (409) hasta quitar la reseña', async () => {
    const recipeId = created.recipes[0];
    assert.equal((await call('DELETE', `/recipes/${recipeId}`)).status, 409);
    const reviewId = created.reviews.pop();
    assert.equal((await call('DELETE', `/reviews/${reviewId}`)).status, 204);
    assert.equal((await call('GET', `/reviews/${reviewId}`)).status, 404);
    assert.equal((await call('DELETE', `/recipes/${recipeId}`)).status, 204);
    created.recipes.pop();
    assert.equal((await call('GET', `/recipes/${recipeId}`)).status, 404);
  });
});
