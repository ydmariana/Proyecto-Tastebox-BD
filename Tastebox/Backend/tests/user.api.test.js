const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createTestDatabase, startApi, send } = require('./helpers/testDatabase');
const { isHashed, needsRehash } = require('../utils/password.utils');

const EMAIL = 'ana@correo.com';
const PASSWORD = 'Secreta1!';

const setup = async () => {
  const database = createTestDatabase();
  database.raw.exec("INSERT INTO subscription (name) VALUES ('Gratuito'), ('Premium')");
  const api = await startApi(database);
  const register = (email = EMAIL, password = PASSWORD) =>
    send(api.baseUrl, 'POST', '/users', { email, password, subscription_id_subscription: 1 });
  const storedPassword = (email = EMAIL) =>
    database.raw.prepare('SELECT password FROM user WHERE email = ?').get(email).password;
  return { database, api, register, storedPassword };
};

test('POST /users stores a hash and never returns the password', async (t) => {
  const { api, register, storedPassword } = await setup();
  t.after(api.close);

  const response = await register();
  assert.equal(response.status, 201);
  assert.equal('password' in response.body, false);
  assert.notEqual(storedPassword(), PASSWORD);
  assert.equal(isHashed(storedPassword()), true);
});

test('POST /users rejects invalid input and duplicated emails', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);

  assert.equal((await register('no-es-correo')).status, 400);
  assert.equal((await register(EMAIL, '123')).status, 400);
  assert.equal((await register()).status, 201);
  assert.equal((await register()).status, 409);
});

test('POST /sessions accepts the right password and returns only public fields', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);
  await register();

  const response = await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: PASSWORD });
  assert.equal(response.status, 200);
  assert.equal('password' in response.body.user, false);
  assert.equal('photo' in response.body.user, false);
  assert.deepEqual(
    Object.keys(response.body.user).sort(),
    ['address', 'email', 'full_name', 'id_user', 'phone', 'role', 'subscription_expires_at', 'subscription_id_subscription', 'subscription_renews_at', 'subscription_started_at', 'username'],
  );
});

test('login answers 401 with the same body for a wrong password and an unknown email', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);
  await register();

  const wrongPassword = await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: 'incorrecta' });
  const unknownEmail = await send(api.baseUrl, 'POST', '/sessions', { email: 'nadie@correo.com', password: PASSWORD });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
});

test('login answers 400 when fields are missing', async (t) => {
  const { api } = await setup();
  t.after(api.close);

  assert.equal((await send(api.baseUrl, 'POST', '/sessions', {})).status, 400);
  assert.equal((await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL })).status, 400);
});

test('a user that was not migrated yet cannot log in with the stored plain text', async (t) => {
  const { database, api } = await setup();
  t.after(api.close);
  database.raw.exec(`INSERT INTO user (email, password, role, subscription_id_subscription) VALUES ('${EMAIL}', 'clave-antigua', 0, 1)`);

  const response = await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: 'clave-antigua' });
  assert.equal(response.status, 401);
});

test('login upgrades hashes created with older cost parameters', async (t) => {
  const { database, api } = await setup();
  t.after(api.close);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(PASSWORD, salt, 64, { N: 16384, r: 8, p: 3 });
  const outdated = ['scrypt', 16384, 8, 3, salt.toString('base64'), key.toString('base64')].join('$');
  database.raw.prepare('INSERT INTO user (email, password, role, subscription_id_subscription) VALUES (?, ?, 0, 1)').run(EMAIL, outdated);

  const response = await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: PASSWORD });
  const upgraded = database.raw.prepare('SELECT password FROM user WHERE email = ?').get(EMAIL).password;
  assert.equal(response.status, 200);
  assert.equal(needsRehash(upgraded), false);
});

test('POST /users ignores the role sent in the body and creates a regular user', async (t) => {
  const { database, api } = await setup();
  t.after(api.close);

  const response = await send(api.baseUrl, 'POST', '/users', {
    email: EMAIL, password: PASSWORD, role: 1, subscription_id_subscription: 1,
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.role, 0);
  assert.equal(database.raw.prepare('SELECT role FROM user WHERE email = ?').get(EMAIL).role, 0);
});

test('PUT /users/:id changes email and plan but never the password or the role', async (t) => {
  const { database, api, register, storedPassword } = await setup();
  t.after(api.close);
  const { body: created } = await register();
  const originalHash = storedPassword();

  const response = await send(api.baseUrl, 'PUT', `/users/${created.id_user}`, {
    email: EMAIL,
    password: 'Hackeada1!',
    role: 1,
    subscription_id_subscription: 2,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.subscription_id_subscription, 2);
  assert.equal(response.body.role, 0);
  assert.equal(storedPassword(), originalHash);
  assert.equal(database.raw.prepare('SELECT role FROM user WHERE email = ?').get(EMAIL).role, 0);
  assert.equal((await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: PASSWORD })).status, 200);
  assert.equal((await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: 'Hackeada1!' })).status, 401);
});

test('PUT /users/:id/password requires the current password', async (t) => {
  const { api, register, storedPassword } = await setup();
  t.after(api.close);
  const { body: created } = await register();
  const originalHash = storedPassword();
  const route = `/users/${created.id_user}/password`;

  const wrong = await send(api.baseUrl, 'PUT', route, { currentPassword: 'incorrecta', newPassword: 'NuevaClave9!' });
  const missing = await send(api.baseUrl, 'PUT', route, { newPassword: 'NuevaClave9!' });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 400);
  assert.equal(storedPassword(), originalHash);
});

test('PUT /users/:id/password validates the new password and the user', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);
  const { body: created } = await register();

  const tooShort = await send(api.baseUrl, 'PUT', `/users/${created.id_user}/password`, { currentPassword: PASSWORD, newPassword: '123' });
  const unknownUser = await send(api.baseUrl, 'PUT', '/users/999/password', { currentPassword: PASSWORD, newPassword: 'NuevaClave9!' });
  const invalidId = await send(api.baseUrl, 'PUT', '/users/abc/password', { currentPassword: PASSWORD, newPassword: 'NuevaClave9!' });
  assert.equal(tooShort.status, 400);
  assert.equal(unknownUser.status, 404);
  assert.equal(invalidId.status, 400);
});

test('PUT /users/:id/password stores a new hash and the old password stops working', async (t) => {
  const { api, register, storedPassword } = await setup();
  t.after(api.close);
  const { body: created } = await register();
  const originalHash = storedPassword();

  const response = await send(api.baseUrl, 'PUT', `/users/${created.id_user}/password`, {
    currentPassword: PASSWORD,
    newPassword: 'NuevaClave9!',
  });
  assert.equal(response.status, 204);
  assert.notEqual(storedPassword(), originalHash);
  assert.equal(isHashed(storedPassword()), true);
  assert.equal((await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: PASSWORD })).status, 401);
  assert.equal((await send(api.baseUrl, 'POST', '/sessions', { email: EMAIL, password: 'NuevaClave9!' })).status, 200);
});

test('GET /users and GET /users/:id never expose the password', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);
  const { body: created } = await register();

  const list = await send(api.baseUrl, 'GET', '/users');
  const single = await send(api.baseUrl, 'GET', `/users/${created.id_user}`);
  assert.equal(list.body.some((user) => 'password' in user), false);
  assert.equal('password' in single.body, false);
});

const preflight = (api, origin) => fetch(`${api.baseUrl}/sessions`, { method: 'OPTIONS', headers: { Origin: origin } });

test('CORS preflight is answered only for the origins listed in ALLOWED_ORIGIN', async (t) => {
  process.env.ALLOWED_ORIGIN = 'http://localhost:5500, http://127.0.0.1:5500';
  t.after(() => { delete process.env.ALLOWED_ORIGIN; });
  const { api } = await setup();
  t.after(api.close);

  const allowed = await preflight(api, 'http://127.0.0.1:5500');
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5500');
  assert.match(allowed.headers.get('access-control-allow-methods'), /PUT/);

  const denied = await preflight(api, 'http://sitio-malicioso.com');
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('without ALLOWED_ORIGIN no origin receives CORS headers', async (t) => {
  process.env.ALLOWED_ORIGIN = '';
  t.after(() => { delete process.env.ALLOWED_ORIGIN; });
  const { api } = await setup();
  t.after(api.close);

  const response = await preflight(api, 'http://localhost:5500');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

test('PUT /users/:id saves personal data, the new email and keeps the password hash', async (t) => {
  const { api, register, storedPassword } = await setup();
  t.after(api.close);
  const { body: created } = await register();
  const hashBefore = storedPassword();

  const response = await send(api.baseUrl, 'PUT', `/users/${created.id_user}`, {
    email: 'ana.nueva@correo.com',
    subscription_id_subscription: 1,
    username: 'ana',
    full_name: 'Ana Pérez',
    address: 'Calle 10 # 5-20',
    phone: '300 123 4567',
    photo: PHOTO,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.email, 'ana.nueva@correo.com');
  assert.equal(response.body.full_name, 'Ana Pérez');

  const stored = await send(api.baseUrl, 'GET', `/users/${created.id_user}`);
  assert.equal(stored.body.email, 'ana.nueva@correo.com');
  assert.equal(stored.body.phone, '300 123 4567');
  assert.equal(stored.body.photo, PHOTO);
  assert.equal(storedPassword('ana.nueva@correo.com'), hashBefore);

  const login = await send(api.baseUrl, 'POST', '/sessions', { email: 'ana.nueva@correo.com', password: PASSWORD });
  assert.equal(login.status, 200);
});

test('PUT /users/:id rejects a taken email, a bad phone and a non-image photo', async (t) => {
  const { api, register } = await setup();
  t.after(api.close);
  const { body: ana } = await register();
  await register('luis@correo.com');
  const base = { email: EMAIL, subscription_id_subscription: 1 };

  assert.equal((await send(api.baseUrl, 'PUT', `/users/${ana.id_user}`, { ...base, email: 'luis@correo.com' })).status, 409);
  assert.equal((await send(api.baseUrl, 'PUT', `/users/${ana.id_user}`, { ...base, phone: 'no-es-telefono' })).status, 400);
  assert.equal((await send(api.baseUrl, 'PUT', `/users/${ana.id_user}`, { ...base, photo: 'http://x.com/a.png' })).status, 400);
});

test('subscription dates are stored on register and recalculated when the plan changes', async (t) => {
  const { database, api, register } = await setup();
  t.after(api.close);
  database.raw.exec("UPDATE subscription SET price = 0, trial_days = 12 WHERE id_subscription = 1; UPDATE subscription SET price = 26000 WHERE id_subscription = 2");
  const { body: created } = await register();
  assert.ok(created.subscription_started_at);
  assert.ok(created.subscription_expires_at);
  assert.equal(created.subscription_renews_at, null);

  const upgraded = await send(api.baseUrl, 'PUT', `/users/${created.id_user}`, { email: EMAIL, subscription_id_subscription: 2 });
  assert.equal(upgraded.status, 200);
  assert.ok(upgraded.body.subscription_renews_at);
  assert.equal(upgraded.body.subscription_expires_at, null);

  const same = await send(api.baseUrl, 'PUT', `/users/${created.id_user}`, { email: EMAIL, subscription_id_subscription: 2 });
  assert.equal(same.body.subscription_renews_at, upgraded.body.subscription_renews_at);
});

test('GET /subscriptions returns price, features and limits from the database', async (t) => {
  const { database, api } = await setup();
  t.after(api.close);
  database.raw.exec("UPDATE subscription SET price = 26000, features = 'Recetas ilimitadas', monthly_recipe_limit = NULL WHERE id_subscription = 2; UPDATE subscription SET monthly_recipe_limit = 25 WHERE id_subscription = 1");
  const { body } = await send(api.baseUrl, 'GET', '/subscriptions');
  const premium = body.find((plan) => plan.name === 'Premium');
  assert.equal(premium.price, 26000);
  assert.equal(premium.features, 'Recetas ilimitadas');
  assert.equal(body.find((plan) => plan.name === 'Gratuito').monthly_recipe_limit, 25);
});
