const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase, startApi, send } = require('./helpers/testDatabase');

const RECIPE = {
  name: 'Ajiaco santafereño',
  difficulty_level: 3,
  cuisine_type: 'Colombiana',
  description: 'Sopa de tres papas con pollo, mazorca y guascas.',
  preparation_date: '2026-10-01',
};

const setup = async () => {
  const database = createTestDatabase();
  database.raw.exec("INSERT INTO subscription (name) VALUES ('Gratuito'), ('Premium')");
  database.raw.exec("INSERT INTO user (email, password, role, subscription_id_subscription) VALUES ('ana@correo.com', 'x', 0, 1)");
  const api = await startApi(database);
  const createRecipe = (overrides = {}) => send(api.baseUrl, 'POST', '/recipes', { ...RECIPE, ...overrides });
  const createReview = async (overrides = {}) => {
    const body = {
      date: '2026-10-05',
      tags: 'sopa',
      comments: 'Quedó deliciosa',
      cook_it_again: 1,
      user_id_user: 1,
      recipe_id_recipe: 1,
      ...overrides,
    };
    return send(api.baseUrl, 'POST', '/reviews', body);
  };
  return { database, api, createRecipe, createReview };
};

test('POST /recipes creates a recipe and GET /recipes/:id returns it', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);

  const created = await createRecipe();
  assert.equal(created.status, 201);
  assert.equal(created.body.name, RECIPE.name);
  assert.equal(created.body.difficulty_level, 3);

  const fetched = await send(api.baseUrl, 'GET', `/recipes/${created.body.id_recipe}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.name, RECIPE.name);
  assert.equal(fetched.body.cuisine_type, RECIPE.cuisine_type);
});

test('POST /recipes trims text fields and defaults preparation_date when it is missing', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);

  const { preparation_date: _omitted, ...withoutDate } = RECIPE;
  const response = await send(api.baseUrl, 'POST', '/recipes', { ...withoutDate, name: '  Arepa  ' });
  assert.equal(response.status, 201);
  assert.equal(response.body.name, 'Arepa');
  assert.ok(response.body.preparation_date);
});

test('POST /recipes rejects invalid input', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);

  assert.equal((await createRecipe({ name: '' })).status, 400);
  assert.equal((await createRecipe({ name: 'x'.repeat(46) })).status, 400);
  assert.equal((await createRecipe({ difficulty_level: 0 })).status, 400);
  assert.equal((await createRecipe({ difficulty_level: 6 })).status, 400);
  assert.equal((await createRecipe({ difficulty_level: 'fácil' })).status, 400);
  assert.equal((await createRecipe({ cuisine_type: '' })).status, 400);
  assert.equal((await createRecipe({ description: 'x'.repeat(5001) })).status, 400);
  assert.equal((await createRecipe({ minutes: -5 })).status, 400);
  assert.equal((await createRecipe({ minutes: 'rápido' })).status, 400);
  assert.equal((await createRecipe({ image: '../secreto.png' })).status, 400);
  assert.equal((await createRecipe({ image: '/etc/passwd' })).status, 400);
  assert.equal((await createRecipe({ verified: 7 })).status, 400);
  assert.equal((await createRecipe({ is_premium: 'tal vez' })).status, 400);
  assert.equal((await createRecipe({ ingredients: 42 })).status, 400);
  assert.equal((await createRecipe({ preparation_date: 'no-es-fecha' })).status, 400);
  assert.equal((await send(api.baseUrl, 'POST', '/recipes', {})).status, 400);
});

test('POST /recipes stores the catalog fields and accepts a description longer than 255 characters', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);

  const created = await createRecipe({
    description: 'x'.repeat(600),
    minutes: 15,
    image: 'desayunos/pancakes.jpg',
    verified: true,
    is_premium: 1,
    ingredients: ['1 huevo', ' Sal ', ''],
  });
  assert.equal(created.status, 201);

  const fetched = await send(api.baseUrl, 'GET', `/recipes/${created.body.id_recipe}`);
  assert.equal(fetched.body.description.length, 600);
  assert.equal(fetched.body.minutes, 15);
  assert.equal(fetched.body.image, 'desayunos/pancakes.jpg');
  assert.equal(fetched.body.verified, 1);
  assert.equal(fetched.body.is_premium, 1);
  assert.equal(fetched.body.ingredients, '1 huevo\nSal');
});

test('POST /recipes without catalog fields uses the defaults', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);

  const { body } = await createRecipe();
  assert.equal(body.minutes, 0);
  assert.equal(body.image, null);
  assert.equal(body.verified, 0);
  assert.equal(body.is_premium, 0);
  assert.equal(body.ingredients, null);
  assert.equal(body.rating, null);
  assert.equal(body.review_count, 0);
});

test('PUT /recipes/:id keeps the catalog fields that the request does not send', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  const { body: created } = await createRecipe({ minutes: 30, image: 'sopas/ajiaco.jpg', verified: 1, ingredients: 'Papa\nPollo' });

  const response = await send(api.baseUrl, 'PUT', `/recipes/${created.id_recipe}`, { ...RECIPE, name: 'Ajiaco con pollo' });
  assert.equal(response.status, 200);
  assert.equal(response.body.name, 'Ajiaco con pollo');
  assert.equal(response.body.minutes, 30);
  assert.equal(response.body.image, 'sopas/ajiaco.jpg');
  assert.equal(response.body.verified, 1);
  assert.equal(response.body.ingredients, 'Papa\nPollo');

  const changed = await send(api.baseUrl, 'PUT', `/recipes/${created.id_recipe}`, { ...RECIPE, minutes: 45, image: '', ingredients: '' });
  assert.equal(changed.body.minutes, 45);
  assert.equal(changed.body.image, null);
  assert.equal(changed.body.ingredients, null);
});

test('GET /recipes and /recipes/:id return the rating as the average of the reviews', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  await createRecipe({ name: 'Bandeja paisa' });
  await createReview({ recipe_id_recipe: 1, rating: 5 });
  await createReview({ recipe_id_recipe: 1, rating: 4 });
  await createReview({ recipe_id_recipe: 1 });

  const list = await send(api.baseUrl, 'GET', '/recipes');
  assert.equal(list.body.length, 2);
  assert.equal(list.body[0].rating, 4.5);
  assert.equal(list.body[0].review_count, 2);
  assert.equal(list.body[1].rating, null);
  assert.equal(list.body[1].review_count, 0);

  const one = await send(api.baseUrl, 'GET', '/recipes/1');
  assert.equal(one.body.rating, 4.5);
  assert.equal(one.body.review_count, 2);
});

test('GET /recipes lists every stored recipe', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  await createRecipe();
  await createRecipe({ name: 'Bandeja paisa', difficulty_level: 4 });

  const list = await send(api.baseUrl, 'GET', '/recipes');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((recipe) => recipe.name), [RECIPE.name, 'Bandeja paisa']);
});

test('GET /recipes/:id answers 404 for unknown ids and 400 for invalid ones', async (t) => {
  const { api } = await setup();
  t.after(api.close);

  assert.equal((await send(api.baseUrl, 'GET', '/recipes/999')).status, 404);
  assert.equal((await send(api.baseUrl, 'GET', '/recipes/abc')).status, 400);
});

test('PUT /recipes/:id updates the stored recipe', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  const { body: created } = await createRecipe();

  const response = await send(api.baseUrl, 'PUT', `/recipes/${created.id_recipe}`, {
    ...RECIPE, name: 'Ajiaco con pollo', difficulty_level: 4,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.id_recipe, created.id_recipe);

  const fetched = await send(api.baseUrl, 'GET', `/recipes/${created.id_recipe}`);
  assert.equal(fetched.body.name, 'Ajiaco con pollo');
  assert.equal(fetched.body.difficulty_level, 4);
});

test('PUT /recipes/:id validates the input and the id', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  const { body: created } = await createRecipe();

  assert.equal((await send(api.baseUrl, 'PUT', `/recipes/${created.id_recipe}`, { ...RECIPE, difficulty_level: 9 })).status, 400);
  assert.equal((await send(api.baseUrl, 'PUT', '/recipes/999', RECIPE)).status, 404);
  assert.equal((await send(api.baseUrl, 'PUT', '/recipes/abc', RECIPE)).status, 400);
  assert.equal((await send(api.baseUrl, 'GET', `/recipes/${created.id_recipe}`)).body.difficulty_level, 3);
});

test('DELETE /recipes/:id removes the recipe', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  const { body: created } = await createRecipe();

  assert.equal((await send(api.baseUrl, 'DELETE', `/recipes/${created.id_recipe}`)).status, 204);
  assert.equal((await send(api.baseUrl, 'GET', `/recipes/${created.id_recipe}`)).status, 404);
  assert.equal((await send(api.baseUrl, 'DELETE', `/recipes/${created.id_recipe}`)).status, 404);
  assert.equal((await send(api.baseUrl, 'DELETE', '/recipes/abc')).status, 400);
});

test('DELETE /recipes/:id answers 409 when the recipe still has reviews', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  const { body: recipe } = await createRecipe();
  await createReview({ recipe_id_recipe: recipe.id_recipe });

  assert.equal((await send(api.baseUrl, 'DELETE', `/recipes/${recipe.id_recipe}`)).status, 409);
  assert.equal((await send(api.baseUrl, 'GET', `/recipes/${recipe.id_recipe}`)).status, 200);
});

test('POST /reviews creates a review and GET /reviews/:id returns it', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();

  const created = await createReview();
  assert.equal(created.status, 201);
  assert.equal(created.body.cook_it_again, 1);

  const fetched = await send(api.baseUrl, 'GET', `/reviews/${created.body.id_review}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.comments, 'Quedó deliciosa');
  assert.equal(fetched.body.user_id_user, 1);
  assert.equal(fetched.body.recipe_id_recipe, 1);
});

test('POST /reviews accepts missing tags and comments', async (t) => {
  const { api, createRecipe } = await setup();
  t.after(api.close);
  await createRecipe();

  const response = await send(api.baseUrl, 'POST', '/reviews', {
    date: '2026-10-05', cook_it_again: 0, user_id_user: 1, recipe_id_recipe: 1,
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.tags, null);
  assert.equal(response.body.comments, null);
});

test('POST /reviews rejects invalid input', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();

  assert.equal((await createReview({ date: '05/10/2026' })).status, 400);
  assert.equal((await createReview({ date: undefined })).status, 400);
  assert.equal((await createReview({ tags: 'x'.repeat(46) })).status, 400);
  assert.equal((await createReview({ comments: 'x'.repeat(256) })).status, 400);
  assert.equal((await createReview({ cook_it_again: 2 })).status, 400);
  assert.equal((await createReview({ user_id_user: 'abc' })).status, 400);
  assert.equal((await createReview({ recipe_id_recipe: undefined })).status, 400);
});

test('POST /reviews answers 400 when the user or the recipe do not exist', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();

  assert.equal((await createReview({ user_id_user: 999 })).status, 400);
  assert.equal((await createReview({ recipe_id_recipe: 999 })).status, 400);
});

test('GET /reviews lists reviews with the user email and the recipe name', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  await createReview();

  const list = await send(api.baseUrl, 'GET', '/reviews');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].user_email, 'ana@correo.com');
  assert.equal(list.body[0].recipe_name, RECIPE.name);
});

test('GET /reviews/recipe/:recipeId returns only the reviews of that recipe', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  await createRecipe({ name: 'Bandeja paisa' });
  await createReview({ recipe_id_recipe: 1, comments: 'Ajiaco' });
  await createReview({ recipe_id_recipe: 2, comments: 'Bandeja 1' });
  await createReview({ recipe_id_recipe: 2, comments: 'Bandeja 2' });

  const first = await send(api.baseUrl, 'GET', '/reviews/recipe/1');
  const second = await send(api.baseUrl, 'GET', '/reviews/recipe/2');
  const none = await send(api.baseUrl, 'GET', '/reviews/recipe/999');
  assert.equal(first.body.length, 1);
  assert.equal(second.body.length, 2);
  assert.deepEqual(none.body, []);
  assert.equal((await send(api.baseUrl, 'GET', '/reviews/recipe/abc')).status, 400);
});

test('GET /reviews/:id answers 404 for unknown ids and 400 for invalid ones', async (t) => {
  const { api } = await setup();
  t.after(api.close);

  assert.equal((await send(api.baseUrl, 'GET', '/reviews/999')).status, 404);
  assert.equal((await send(api.baseUrl, 'GET', '/reviews/abc')).status, 400);
});

test('PUT /reviews/:id updates the stored review', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  const { body: created } = await createReview();

  const response = await send(api.baseUrl, 'PUT', `/reviews/${created.id_review}`, {
    date: '2026-10-06', tags: 'sopa, fácil', comments: 'La repetiría', cook_it_again: 0, user_id_user: 1, recipe_id_recipe: 1,
  });
  assert.equal(response.status, 200);

  const fetched = await send(api.baseUrl, 'GET', `/reviews/${created.id_review}`);
  assert.equal(fetched.body.comments, 'La repetiría');
  assert.equal(fetched.body.cook_it_again, 0);
  assert.equal(fetched.body.date, '2026-10-06');
});

test('PUT /reviews/:id validates the input, the references and the id', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  const { body: created } = await createReview();
  const valid = { date: '2026-10-06', cook_it_again: 1, user_id_user: 1, recipe_id_recipe: 1 };

  assert.equal((await send(api.baseUrl, 'PUT', `/reviews/${created.id_review}`, { ...valid, date: 'ayer' })).status, 400);
  assert.equal((await send(api.baseUrl, 'PUT', `/reviews/${created.id_review}`, { ...valid, recipe_id_recipe: 999 })).status, 400);
  assert.equal((await send(api.baseUrl, 'PUT', '/reviews/999', valid)).status, 404);
  assert.equal((await send(api.baseUrl, 'PUT', '/reviews/abc', valid)).status, 400);
  assert.equal((await send(api.baseUrl, 'GET', `/reviews/${created.id_review}`)).body.date, '2026-10-05');
});

test('DELETE /reviews/:id removes the review', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  const { body: created } = await createReview();

  assert.equal((await send(api.baseUrl, 'DELETE', `/reviews/${created.id_review}`)).status, 204);
  assert.equal((await send(api.baseUrl, 'GET', `/reviews/${created.id_review}`)).status, 404);
  assert.equal((await send(api.baseUrl, 'DELETE', `/reviews/${created.id_review}`)).status, 404);
  assert.equal((await send(api.baseUrl, 'DELETE', '/reviews/abc')).status, 400);
});

test('a recipe can be deleted once its reviews are removed', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  const { body: recipe } = await createRecipe();
  const { body: review } = await createReview({ recipe_id_recipe: recipe.id_recipe });

  assert.equal((await send(api.baseUrl, 'DELETE', `/recipes/${recipe.id_recipe}`)).status, 409);
  assert.equal((await send(api.baseUrl, 'DELETE', `/reviews/${review.id_review}`)).status, 204);
  assert.equal((await send(api.baseUrl, 'DELETE', `/recipes/${recipe.id_recipe}`)).status, 204);
});

test('POST /reviews stores the rating and rejects values outside 1-5', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();

  const created = await createReview({ rating: 4 });
  assert.equal(created.status, 201);
  assert.equal(created.body.rating, 4);
  assert.equal((await send(api.baseUrl, 'GET', `/reviews/${created.body.id_review}`)).body.rating, 4);

  assert.equal((await createReview({ rating: 0 })).status, 400);
  assert.equal((await createReview({ rating: 6 })).status, 400);
  assert.equal((await createReview({ rating: 'mucho' })).status, 400);
  assert.equal((await createReview()).body.rating, null);
});

test('PUT /reviews/:id can change the rating', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  const { body: created } = await createReview({ rating: 2 });

  const response = await send(api.baseUrl, 'PUT', `/reviews/${created.id_review}`, {
    date: '2026-10-05', cook_it_again: 1, user_id_user: 1, recipe_id_recipe: 1, rating: 5,
  });
  assert.equal(response.status, 200);
  assert.equal((await send(api.baseUrl, 'GET', `/reviews/${created.id_review}`)).body.rating, 5);
});

test('GET /reviews/recipe/:recipeId shows the public user name and hides the email', async (t) => {
  const { api, createRecipe, createReview } = await setup();
  t.after(api.close);
  await createRecipe();
  await createReview();

  const { body } = await send(api.baseUrl, 'GET', '/reviews/recipe/1');
  assert.equal(body[0].user_name, 'ana');
  assert.equal(body[0].user_email, undefined);
});

test('GET /reviews/user/:userId returns only that user reviews with the recipe name, newest first', async (t) => {
  const { api, database, createRecipe, createReview } = await setup();
  t.after(api.close);
  database.raw.exec("INSERT INTO user (email, password, role, subscription_id_subscription) VALUES ('luis@correo.com', 'x', 0, 1)");
  await createRecipe();
  await createReview({ date: '2026-10-01', comments: 'vieja' });
  await createReview({ date: '2026-10-09', comments: 'nueva' });
  await createReview({ user_id_user: 2, comments: 'de Luis' });

  const mine = await send(api.baseUrl, 'GET', '/reviews/user/1');
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.body.map((r) => r.comments), ['nueva', 'vieja']);
  assert.equal(mine.body[0].recipe_name, RECIPE.name);
  assert.deepEqual((await send(api.baseUrl, 'GET', '/reviews/user/999')).body, []);
  assert.equal((await send(api.baseUrl, 'GET', '/reviews/user/abc')).status, 400);
});
